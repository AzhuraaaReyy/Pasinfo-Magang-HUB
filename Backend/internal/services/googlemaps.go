package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

type GoogleMapsClient struct {
	APIKey string
	HTTP   *http.Client
}

func NewGoogleMapsClient(key string) *GoogleMapsClient {
	return &GoogleMapsClient{APIKey: key, HTTP: &http.Client{Timeout: 10 * time.Second}}
}
func (c *GoogleMapsClient) Enabled() bool { return c != nil && c.APIKey != "" }

type PlaceInfo struct {
	Name, FormattedAddress                        string
	Rating                                        float64
	UserRatingsTotal                              int
	BusinessStatus, Website, Phone, GoogleMapsURI string
	OpenNow                                       *bool
	Lat, Lng                                      float64
}

func (c *GoogleMapsClient) PlaceDetails(ctx context.Context, id string) (*PlaceInfo, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("GOOGLE_MAPS_SERVER_KEY belum diisi")
	}
	req, e := http.NewRequestWithContext(ctx, http.MethodGet, "https://places.googleapis.com/v1/places/"+url.PathEscape(id)+"?languageCode=id", nil)
	if e != nil {
		return nil, e
	}
	req.Header.Set("X-Goog-Api-Key", c.APIKey)
	req.Header.Set("X-Goog-FieldMask", "displayName,formattedAddress,rating,userRatingCount,businessStatus,websiteUri,nationalPhoneNumber,googleMapsUri,currentOpeningHours,location")
	res, e := c.HTTP.Do(req)
	if e != nil {
		return nil, e
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return nil, fmt.Errorf("places HTTP %d", res.StatusCode)
	}
	var r struct {
		DisplayName struct {
			Text string `json:"text"`
		} `json:"displayName"`
		FormattedAddress string                                `json:"formattedAddress"`
		Rating           float64                               `json:"rating"`
		UserRatingCount  int                                   `json:"userRatingCount"`
		BusinessStatus   string                                `json:"businessStatus"`
		Website          string                                `json:"websiteUri"`
		Phone            string                                `json:"nationalPhoneNumber"`
		URI              string                                `json:"googleMapsUri"`
		Location         struct{ Latitude, Longitude float64 } `json:"location"`
	}
	if e = json.NewDecoder(res.Body).Decode(&r); e != nil {
		return nil, e
	}
	return &PlaceInfo{Name: r.DisplayName.Text, FormattedAddress: r.FormattedAddress, Rating: r.Rating, UserRatingsTotal: r.UserRatingCount, BusinessStatus: r.BusinessStatus, Website: r.Website, Phone: r.Phone, GoogleMapsURI: r.URI, Lat: r.Location.Latitude, Lng: r.Location.Longitude}, nil
}

type RouteInfo struct {
	DistanceMeters, DurationSeconds, DurationTrafficSecond int
	HasTraffic                                             bool
}

func (c *GoogleMapsClient) Directions(ctx context.Context, a, b, x, y float64) (*RouteInfo, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("GOOGLE_MAPS_SERVER_KEY belum diisi")
	}
	q := url.Values{"origin": {fmt.Sprintf("%.6f,%.6f", a, b)}, "destination": {fmt.Sprintf("%.6f,%.6f", x, y)}, "departure_time": {"now"}, "key": {c.APIKey}}
	req, e := http.NewRequestWithContext(ctx, http.MethodGet, "https://maps.googleapis.com/maps/api/directions/json?"+q.Encode(), nil)
	if e != nil {
		return nil, e
	}
	res, e := c.HTTP.Do(req)
	if e != nil {
		return nil, withoutRequestURL(e)
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		return nil, fmt.Errorf("directions HTTP %d", res.StatusCode)
	}
	var r struct {
		Routes []struct {
			Legs []struct {
				Distance struct {
					Value int `json:"value"`
				}
				Duration struct {
					Value int `json:"value"`
				}
				Traffic struct {
					Value int `json:"value"`
				} `json:"duration_in_traffic"`
			} `json:"legs"`
		} `json:"routes"`
	}
	if e = json.NewDecoder(res.Body).Decode(&r); e != nil {
		return nil, e
	}
	if len(r.Routes) == 0 || len(r.Routes[0].Legs) == 0 {
		return nil, fmt.Errorf("directions: respons tanpa rute")
	}
	l := r.Routes[0].Legs[0]
	return &RouteInfo{DistanceMeters: l.Distance.Value, DurationSeconds: l.Duration.Value, DurationTrafficSecond: l.Traffic.Value, HasTraffic: l.Traffic.Value > 0}, nil
}
