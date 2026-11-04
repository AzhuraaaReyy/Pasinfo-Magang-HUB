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
