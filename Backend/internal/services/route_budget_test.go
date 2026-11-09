package services

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"wildan-news-backend/internal/models"
)

var userPoint = &GeoPoint{Lat: -7.6474192, Lng: 112.9084766}

// T03 stage 1: a route between two places is asked once; the second answer takes it from the cache.
func TestRouteBetweenPlacesComesFromTheCache(t *testing.T) {
	question := "kuliner terdekat dari Bromo apa?"
	router := &fakeRouter{enabled: true}
	service, _, provider := nearbyService(t, map[string]QuestionPlan{question: {Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Bromo"}}, router)
	service.answerCache = nil // the second answer must be built again, so only the route cache can save its routes
	for i := int64(0); i < 2; i++ {
		if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 501 + i, VisitorID: "v1"}, question); err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(provider.messages[0].Content, "JARAK: 31,2 km lewat jalan") {
			t.Fatalf("answer %d lost its route:\n%s", i+1, provider.messages[0].Content)
		}
	}
	if got := router.calls.Load(); got != 6 {
		t.Fatalf("router calls = %d, want 6 (second answer from the cache)", got)
	}
}

// The user's own location is never kept, so each answer from it asks its routes again.
func TestRouteFromTheUserLocationIsNotCached(t *testing.T) {
	question := "kuliner dekat lokasi saya apa?"
	router := &fakeRouter{enabled: true}
	service, _, _ := nearbyService(t, map[string]QuestionPlan{question: {Domain: "culinary", Kind: "list", Sort: nearestSort, NearUser: true}}, router)
	for i := int64(0); i < 2; i++ {
		if _, err := service.AskWithLocation(context.Background(), &models.ChatSession{ID: 511 + i, VisitorID: "v1"}, question, userPoint); err != nil {
			t.Fatal(err)
		}
	}
	if got := router.calls.Load(); got != 12 {
		t.Fatalf("router calls = %d, want 12", got)
	}
	for key := range service.routeCache.items {
		if strings.Contains(key, "112.908477") || strings.Contains(key, "7.647419") {
			t.Fatalf("user location cached: %s", key)
		}
	}
}

// Only the first routedResults results get a road route; the others keep the straight-line distance.
func TestOnlyTheFirstResultsGetARoute(t *testing.T) {
	question := "sebutkan 10 kuliner terdekat dari Bromo"
	router := &fakeRouter{enabled: true}
	service, retriever, provider := nearbyService(t, map[string]QuestionPlan{question: {Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Bromo", Count: 10}}, router)
	var docs []SemanticResult
	for i := 0; i < 10; i++ {
		docs = append(docs, nearDoc("culinary", int64(100+i), fmt.Sprintf("Warung Uji %02d", i+1), 20+float64(i)))
	}
	retriever.nearest["culinary"] = docs
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 521, VisitorID: "v1"}, question); err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if got := router.calls.Load(); got != int32(routedResults*2) {
		t.Fatalf("router calls = %d, want %d", got, routedResults*2)
	}
	if strings.Count(system, "km lewat jalan dari Penanjakan") != routedResults || strings.Count(system, "km garis lurus dari Penanjakan") != 10-routedResults {
		t.Fatalf("routed/straight lines:\n%s", system)
	}
}

// A visitor over the route limit still gets an answer, with straight-line distances; another visitor is not affected.
func TestVisitorOverTheRouteLimitKeepsTheStraightLineDistance(t *testing.T) {
	question := "kuliner dekat lokasi saya apa?"
	router := &fakeRouter{enabled: true}
	service, _, provider := nearbyService(t, map[string]QuestionPlan{question: {Domain: "culinary", Kind: "list", Sort: nearestSort, NearUser: true}}, router)
	for i := 0; i < routeAnswersPerMinute; i++ {
		if _, err := service.AskWithLocation(context.Background(), &models.ChatSession{ID: int64(531 + i), VisitorID: "heavy"}, question, userPoint); err != nil {
			t.Fatal(err)
		}
	}
	before := router.calls.Load()
	result, err := service.AskWithLocation(context.Background(), &models.ChatSession{ID: 540, VisitorID: "heavy"}, question, userPoint)
	if err != nil {
		t.Fatal(err)
	}
	if router.calls.Load() != before || !strings.Contains(provider.messages[0].Content, "garis lurus dari lokasi Anda") || result.Assistant.Status != "complete" {
		t.Fatalf("limit not applied: calls %d→%d\n%s", before, router.calls.Load(), provider.messages[0].Content)
	}
	if _, err := service.AskWithLocation(context.Background(), &models.ChatSession{ID: 541, VisitorID: "other"}, question, userPoint); err != nil {
		t.Fatal(err)
	}
	if router.calls.Load() != before+6 {
		t.Fatalf("another visitor was limited: calls %d→%d", before, router.calls.Load())
	}
}

func TestRouteCacheExpires(t *testing.T) {
	now := time.Date(2026, 11, 8, 10, 0, 0, 0, wib)
	c := newRouteCache()
	c.now = func() time.Time { return now }
	key := routeKey(GeoPoint{-7.9, 112.9}, GeoPoint{-7.7, 112.9}, RouteModeCar)
	c.put(key, RouteEstimate{DistanceMeters: 1000, Seconds: 60})
	if _, ok := c.get(key); !ok {
		t.Fatal("fresh route missing")
	}
	now = now.Add(routeCacheTTL)
	if _, ok := c.get(key); ok {
		t.Fatal("expired route returned")
	}
}

func TestVisitorLimiterWindowSlides(t *testing.T) {
	now := time.Date(2026, 11, 8, 10, 0, 0, 0, wib)
	l := newVisitorLimiter(2, time.Minute)
	l.now = func() time.Time { return now }
	if !l.allow("a") || !l.allow("a") || l.allow("a") {
		t.Fatal("limit of 2 not applied")
	}
	if !l.allow("b") || !l.allow("") {
		t.Fatal("other visitor or no visitor limited")
	}
	now = now.Add(time.Minute)
	if !l.allow("a") {
		t.Fatal("window did not slide")
	}
}
