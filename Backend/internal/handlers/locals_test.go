package handlers

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"gorm.io/gorm"
	"wildan-news-backend/internal/database"
)

// Handlers behind Protected() must answer 401 instead of panicking when the
// identity locals are missing (audit L4).
func TestHandlersWithoutIdentityLocalsReturn401(t *testing.T) {
	app := fiber.New()
	app.Use(recover.New())
	app.Get("/histories", GetMyHistories)
	app.Post("/histories", CreateHistory)
	app.Delete("/histories", DeleteHistory)
	app.Get("/notifications", GetNotifications)
	app.Put("/notifications/:id/read", MarkNotificationRead)
	app.Get("/news/mine", GetMyNews)
	app.Post("/news", CreateNews)
	app.Put("/news/:id", UpdateNews)
	for _, r := range [][2]string{
		{"GET", "/histories"}, {"POST", "/histories"}, {"DELETE", "/histories"},
		{"GET", "/notifications"}, {"PUT", "/notifications/1/read"},
		{"GET", "/news/mine"}, {"POST", "/news"}, {"PUT", "/news/1"},
	} {
		resp, err := app.Test(httptest.NewRequest(r[0], r[1], nil))
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != fiber.StatusUnauthorized {
			t.Errorf("%s %s status = %d, want 401", r[0], r[1], resp.StatusCode)
		}
	}
}

// Internal database errors must not be sent to the client (audit L3).
func TestDeleteAllNewsHidesDatabaseError(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	previous := database.DB
	database.DB = db // no tables: every statement fails
	t.Cleanup(func() { database.DB = previous })
	app := fiber.New()
	app.Delete("/news/all", DeleteAllNews)
	resp, err := app.Test(httptest.NewRequest("DELETE", "/news/all", nil))
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 500 || strings.Contains(string(raw), "no such table") {
		t.Fatalf("status=%d body=%s; want 500 without internal error text", resp.StatusCode, raw)
	}
}
