package handlers

import (
	"encoding/json"
	"io"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"

	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"wildan-news-backend/internal/database"
)

// TestContentDetailEndpointsOnPostgres answers the detail requests of the content Postman collection (folder 6, jobdesk 14
// Nov point 4) on the development database without changing it: every successful detail adds one view, so each request
// runs in its own transaction that is rolled back (Owner option A, 2026-11-14). It checks the 200 answer, the item, the
// view counted inside the transaction, and the view count unchanged afterwards. Needs TRAVEL_SEARCH_DSN.
func TestContentDetailEndpointsOnPostgres(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if dsn == "" {
		t.Skip("TRAVEL_SEARCH_DSN not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct{ path, table, keyColumn, bodyKey string }{
		{"/news/", "news", "id", "data"},
		{"/wisata/", "destinations", "slug", "destination"},
		{"/kuliner/", "culinaries", "slug", "culinary"},
		{"/budaya/", "cultures", "slug", "culture"},
		{"/acara/", "events", "slug", "event"},
	}
	old := database.DB
	defer func() { database.DB = old }()
	for _, tc := range cases {
		var key string
		if err := db.Raw("SELECT " + tc.keyColumn + "::text FROM " + tc.table + " WHERE status = 'published' ORDER BY id LIMIT 1").Scan(&key).Error; err != nil || key == "" {
			t.Fatalf("%s: no published row (%v)", tc.table, err)
		}
		viewsOf := func(conn *gorm.DB) int64 {
			var v int64
			conn.Raw("SELECT views FROM "+tc.table+" WHERE "+tc.keyColumn+"::text = ?", key).Scan(&v)
			return v
		}
		before := viewsOf(db)
		tx := db.Begin()
		database.DB = tx
		app := fiber.New()
		app.Get("/news/:id", GetNewsDetail)
		NewWisataHandler(tx).Register(app)
		NewDomainHandler(tx).Register(app)
		res, err := app.Test(httptest.NewRequest("GET", tc.path+key, nil), -1)
		if err != nil {
			tx.Rollback()
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(res.Body)
		inside := viewsOf(tx)
		tx.Rollback()
		var body map[string]json.RawMessage
		_ = json.Unmarshal(raw, &body)
		if res.StatusCode != 200 || len(body[tc.bodyKey]) == 0 {
			t.Errorf("GET %s%s = %d, body key %q missing: %.200s", tc.path, key, res.StatusCode, tc.bodyKey, raw)
		}
		if inside != before+1 {
			t.Errorf("%s %s: views inside the transaction = %d, want %d (the detail counts one view)", tc.table, key, inside, before+1)
		}
		if after := viewsOf(db); after != before {
			t.Errorf("%s %s: views after rollback = %d, want %d unchanged", tc.table, key, after, before)
		}
		t.Logf("GET %s%s → %d, views %s→%s (dalam transaksi) → %s (sesudah rollback)", tc.path, key, res.StatusCode, strconv.FormatInt(before, 10), strconv.FormatInt(inside, 10), strconv.FormatInt(viewsOf(db), 10))
	}
}
