package handlers

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"wildan-news-backend/internal/services"
)

// Live wisata endpoints can call paid Google APIs, so they are rate limited (audit M4).
func TestWisataLiveRoutesAreRateLimited(t *testing.T) {
	app := fiber.New()
	h := NewWisataLiveHandler(nil, services.NewOpenWeatherClient(""), services.NewGoogleMapsClient(""))
	h.Register(app)
	last := 0
	for i := 0; i < 21; i++ {
		// Missing query parameters: the handler answers 400 without touching the database.
		resp, err := app.Test(httptest.NewRequest("GET", "/wisata/rute", nil))
		if err != nil {
			t.Fatal(err)
		}
		last = resp.StatusCode
	}
	if last != fiber.StatusTooManyRequests {
		t.Fatalf("21st request status = %d, want 429", last)
	}
}
