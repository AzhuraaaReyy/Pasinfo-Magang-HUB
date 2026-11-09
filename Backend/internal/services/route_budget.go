package services

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Route budget of nearest answers (T03, audit 2026-11-08, Owner stage 1): one Geoapify account serves every user, the free
// plan has 3,000 credits a day, and one nearest answer asked 6 routes (20 for ten results). Places do not move, so a
// route between two places is kept; the user's location is never kept (Owner 2026-11-07).
const (
	// routeCacheTTL keeps a route between two places; traffic=approximated has no live component that would age.
	routeCacheTTL = 24 * time.Hour
	// routeCacheMax bounds the cache; 55 destinations × 3 nearest × 2 modes is far below it.
	routeCacheMax = 2000
	// routedResults is the number of nearest results that get a road route; the others keep the straight-line distance.
	routedResults = 5
	// routeAnswersPerMinute is the number of answers per visitor and minute that may call the router.
	routeAnswersPerMinute = 5
)

type routeCacheItem struct {
	route   RouteEstimate
	expires time.Time
}

// routeCache keeps road routes between two places in memory. It is lost on restart, which only costs a route call.
type routeCache struct {
	mu    sync.Mutex
	items map[string]routeCacheItem
	now   func() time.Time
}

func newRouteCache() *routeCache {
	return &routeCache{items: map[string]routeCacheItem{}, now: time.Now}
}

func routeKey(from, to GeoPoint, mode string) string {
	return fmt.Sprintf("%.6f,%.6f>%.6f,%.6f|%s", from.Lat, from.Lng, to.Lat, to.Lng, mode)
}

func (c *routeCache) get(key string) (RouteEstimate, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	item, ok := c.items[key]
	if !ok || !c.now().Before(item.expires) {
		delete(c.items, key)
		return RouteEstimate{}, false
	}
	return item.route, true
}

func (c *routeCache) put(key string, route RouteEstimate) {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := c.now()
	if len(c.items) >= routeCacheMax {
		for k, item := range c.items {
			if !now.Before(item.expires) {
				delete(c.items, k)
			}
		}
	}
	if len(c.items) >= routeCacheMax {
		// Still full of live routes: start again rather than keep an unbounded map.
		c.items = map[string]routeCacheItem{}
	}
	c.items[key] = routeCacheItem{route: route, expires: now.Add(routeCacheTTL)}
}

// visitorLimiter allows each visitor a number of events per window (a sliding minute).
type visitorLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	limit  int
	window time.Duration
	now    func() time.Time
}

func newVisitorLimiter(limit int, window time.Duration) *visitorLimiter {
	return &visitorLimiter{hits: map[string][]time.Time{}, limit: limit, window: window, now: time.Now}
}

// allow records one event for visitor when it is under the limit. A request without a visitor (tests, internal calls) is
// not limited; every chat request has one (session ownership by cookie).
func (l *visitorLimiter) allow(visitor string) bool {
	if visitor == "" {
		return true
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	kept := l.hits[visitor][:0]
	for _, t := range l.hits[visitor] {
		if now.Sub(t) < l.window {
			kept = append(kept, t)
		}
	}
	if len(kept) >= l.limit {
		l.hits[visitor] = kept
		return false
	}
	l.hits[visitor] = append(kept, now)
	if len(l.hits) > 10000 {
		// Forget visitors without a recent event, so the map stays small.
		for v, times := range l.hits {
			if len(times) == 0 || now.Sub(times[len(times)-1]) >= l.window {
				delete(l.hits, v)
			}
		}
	}
	return true
}

type visitorKey struct{}

// withVisitor names the visitor of a chat request for the route limit.
func withVisitor(ctx context.Context, visitor string) context.Context {
	return context.WithValue(ctx, visitorKey{}, visitor)
}

func visitorFrom(ctx context.Context) string {
	visitor, _ := ctx.Value(visitorKey{}).(string)
	return visitor
}
