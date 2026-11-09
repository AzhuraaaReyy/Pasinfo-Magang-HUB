package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"
)

// geoapifyTestServer answers every routing request with one route and records when each request arrived.
func geoapifyTestServer(t *testing.T) (*httptest.Server, func() []time.Time) {
	t.Helper()
	var mu sync.Mutex
	var arrivals []time.Time
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		arrivals = append(arrivals, time.Now())
		mu.Unlock()
		_, _ = w.Write([]byte(`{"features":[{"properties":{"distance":31200,"time":2400}}]}`))
	}))
	t.Cleanup(srv.Close)
	return srv, func() []time.Time {
		mu.Lock()
		defer mu.Unlock()
		out := append([]time.Time(nil), arrivals...)
		sort.Slice(out, func(i, j int) bool { return out[i].Before(out[j]) })
		return out
	}
}

// T02 (audit 2026-11-08): the free plan allows up to 5 requests per second per account; one nearest answer sent 6 at once.
func TestGeoapifyPacesRequestsForTheWholeAccount(t *testing.T) {
	srv, arrivals := geoapifyTestServer(t)
	c := &GeoapifyClient{APIKey: "test-key", BaseURL: srv.URL, HTTP: srv.Client(), MinInterval: 100 * time.Millisecond}
	var wg sync.WaitGroup
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := c.Route(context.Background(), GeoPoint{-7.9, 112.9}, GeoPoint{-7.7, 112.9}, RouteModeCar); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	got := arrivals()
	if len(got) != 6 {
		t.Fatalf("arrivals = %d", len(got))
	}
	for i := 1; i < len(got); i++ {
		// Measured from the first arrival: one request held up by the scheduler shortens only its gap to the next one
		// (66 ms under a full test run, 2026-11-09), while the paced start times keep the total. Without pacing all six
		// arrive within a few milliseconds.
		if since := got[i].Sub(got[0]); since < time.Duration(i)*100*time.Millisecond-40*time.Millisecond {
			t.Fatalf("request %d arrived %s after the first, want at least %s", i, since, time.Duration(i)*100*time.Millisecond-40*time.Millisecond)
		}
	}
}

// A request waiting for its turn gives up with its context, so a slow answer never waits past routeTimeout.
func TestGeoapifyWaitEndsWithTheContext(t *testing.T) {
	srv, arrivals := geoapifyTestServer(t)
	c := &GeoapifyClient{APIKey: "test-key", BaseURL: srv.URL, HTTP: srv.Client(), MinInterval: time.Hour}
	if _, err := c.Route(context.Background(), GeoPoint{-7.9, 112.9}, GeoPoint{-7.7, 112.9}, RouteModeCar); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	started := time.Now()
	_, err := c.Route(ctx, GeoPoint{-7.9, 112.9}, GeoPoint{-7.7, 112.9}, RouteModeCar)
	if err == nil || time.Since(started) > time.Second || len(arrivals()) != 1 {
		t.Fatalf("err=%v waited=%s arrivals=%d", err, time.Since(started), len(arrivals()))
	}
	if strings.Contains(err.Error(), "test-key") {
		t.Fatalf("error carries the key: %v", err)
	}
}

func TestNewGeoapifyClientUsesThePlanPace(t *testing.T) {
	if c := NewGeoapifyClient("k"); c.MinInterval != geoapifyMinInterval || geoapifyMinInterval < 200*time.Millisecond {
		t.Fatalf("interval = %s (free plan: at most 5 per second)", c.MinInterval)
	}
}
