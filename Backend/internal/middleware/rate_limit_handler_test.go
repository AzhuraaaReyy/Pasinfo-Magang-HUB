package middleware

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestRateLimiterWithHandlerUsesCustomResponseAndRetryAfter(t *testing.T) {
	app := fiber.New()
	app.Use(RateLimiterWithHandler(1, 60, func(c *fiber.Ctx) error { return c.Status(fiber.StatusTooManyRequests).SendString("custom") }))
	app.Get("/x", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })
	_, _ = app.Test(httptest.NewRequest("GET", "/x", nil))
	response, err := app.Test(httptest.NewRequest("GET", "/x", nil))
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(response.Body)
	if response.StatusCode != fiber.StatusTooManyRequests || string(body) != "custom" || response.Header.Get("Retry-After") == "" {
		t.Fatalf("status=%d body=%q retry=%q", response.StatusCode, body, response.Header.Get("Retry-After"))
	}
}

// F10, jobdesk 9 Nov point 6: the default 429 of RateLimiter (wisata, rekomendasi, and the other public routes) speaks the
// same polite Indonesian as the chat 429.
func TestRateLimiterAnswersInIndonesian(t *testing.T) {
	app := fiber.New()
	app.Use(RateLimiter(1, 60))
	app.Get("/x", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })
	_, _ = app.Test(httptest.NewRequest("GET", "/x", nil))
	response, err := app.Test(httptest.NewRequest("GET", "/x", nil))
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(response.Body)
	if response.StatusCode != fiber.StatusTooManyRequests || string(body) != `{"message":"Terlalu banyak permintaan. Coba lagi sebentar lagi.","success":false}` {
		t.Fatalf("status=%d body=%s", response.StatusCode, body)
	}
}
