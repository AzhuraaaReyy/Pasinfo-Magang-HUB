package services

import (
	"bytes"
	"context"
	"log"
	"strings"
	"testing"
	"time"

	"gorm.io/gorm/logger"
)

// T01 (audit 2026-11-08): the user's coordinates reached the container log through the SQL log of NearestContent. With
// the SQL log at its most verbose, neither the coordinates nor the query may be printed.
func TestNearestContentDoesNotLogTheOrigin(t *testing.T) {
	var out bytes.Buffer
	db := newKnowledgeTestDB(t)
	db.Logger = logger.New(log.New(&out, "", 0), logger.Config{LogLevel: logger.Info})
	r := NewRetriever(db)
	// SQLite has no asin(); the query may fail here. Either way it must not be logged, and its error is returned.
	_, _ = r.NearestContent(context.Background(), "culinary", GeoPoint{Lat: -7.6411111, Lng: 112.9122222}, nil, time.Now(), 50, 3)
	if logged := out.String(); strings.Contains(logged, "112.9122222") || strings.Contains(logged, "7.6411111") || strings.Contains(logged, "straight_km") {
		t.Fatalf("origin logged:\n%s", logged)
	}
	// The same logger still prints other queries, so the test would notice a logger that prints nothing.
	db.Exec("SELECT 1")
	if !strings.Contains(out.String(), "SELECT 1") {
		t.Fatalf("test logger prints nothing: %q", out.String())
	}
}
