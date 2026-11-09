package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"
)

// GeoPoint is a WGS84 coordinate (latitude, longitude).
type GeoPoint struct {
	Lat, Lng float64
}

// Travel modes of a route estimate (Geoapify Routing API "mode" values).
const (
	RouteModeCar        = "drive"
	RouteModeMotorcycle = "motorcycle"
)

// RouteEstimate is the road distance and travel time of one route.
type RouteEstimate struct {
	DistanceMeters float64
	Seconds        float64
}

// TravelRouter estimates road routes between two points (Owner 2026-11-07: car and motorcycle times).
type TravelRouter interface {
	Enabled() bool
	Route(ctx context.Context, from, to GeoPoint, mode string) (RouteEstimate, error)
}

// geoapifyRoutingURL is the Geoapify Routing API (apidocs.geoapify.com/docs/routing, checked 2026-11-07).
const geoapifyRoutingURL = "https://api.geoapify.com/v1/routing"

// geoapifyMinInterval spaces the starts of two routing requests. The free plan allows "up to 5 requests/second" per
// account (geoapify.com/pricing, checked 2026-11-08) and may restrict an account that keeps exceeding it; one nearest
// answer asked 6 routes at once, up to 20 (T02, audit 2026-11-08). 250 ms keeps 4 per second for the whole API.
const geoapifyMinInterval = 250 * time.Millisecond

// GeoapifyClient calls the Geoapify Routing API with GEOAPIFY_API_KEY. traffic=approximated slows roads that are
// usually busy; it is an estimate, not live traffic. One client serves every user, so its pacing holds for the account.
type GeoapifyClient struct {
	APIKey      string
	BaseURL     string
	HTTP        *http.Client
	MinInterval time.Duration // 0 = no pacing (tests)

	mu   sync.Mutex
	next time.Time // earliest start of the next request
}

func NewGeoapifyClient(key string) *GeoapifyClient {
	return &GeoapifyClient{APIKey: key, BaseURL: geoapifyRoutingURL, HTTP: &http.Client{Timeout: 5 * time.Second}, MinInterval: geoapifyMinInterval}
}

// waitTurn takes the next start slot and waits for it, or returns the context error when ctx ends first; a request
// that gave up keeps its slot, so the pace never speeds up.
func (c *GeoapifyClient) waitTurn(ctx context.Context) error {
	if c.MinInterval <= 0 {
		return nil
	}
	c.mu.Lock()
	start := time.Now()
	if c.next.After(start) {
		start = c.next
	}
	c.next = start.Add(c.MinInterval)
	c.mu.Unlock()
	return sleepContext(ctx, time.Until(start))
}

func (c *GeoapifyClient) Enabled() bool { return c != nil && c.APIKey != "" }

// Route returns the road distance and time of the first route. Errors never contain the request URL, which holds the key.
func (c *GeoapifyClient) Route(ctx context.Context, from, to GeoPoint, mode string) (RouteEstimate, error) {
	if !c.Enabled() {
		return RouteEstimate{}, fmt.Errorf("GEOAPIFY_API_KEY belum diisi")
	}
	if err := c.waitTurn(ctx); err != nil {
		return RouteEstimate{}, err
	}
	q := url.Values{
		"waypoints": {fmt.Sprintf("%.6f,%.6f|%.6f,%.6f", from.Lat, from.Lng, to.Lat, to.Lng)},
		"mode":      {mode},
		"traffic":   {"approximated"},
		"apiKey":    {c.APIKey},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"?"+q.Encode(), nil)
	if err != nil {
		return RouteEstimate{}, withoutRequestURL(err)
	}
	res, err := c.HTTP.Do(req)
	if err != nil {
		return RouteEstimate{}, withoutRequestURL(err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return RouteEstimate{}, fmt.Errorf("geoapify routing HTTP %d", res.StatusCode)
	}
	var body struct {
		Features []struct {
			Properties struct {
				Distance float64 `json:"distance"`
				Time     float64 `json:"time"`
			} `json:"properties"`
		} `json:"features"`
	}
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		return RouteEstimate{}, fmt.Errorf("geoapify routing: %w", err)
	}
	if len(body.Features) == 0 || body.Features[0].Properties.Time <= 0 {
		return RouteEstimate{}, fmt.Errorf("geoapify routing: respons tanpa rute")
	}
	p := body.Features[0].Properties
	return RouteEstimate{DistanceMeters: p.Distance, Seconds: p.Time}, nil
}
