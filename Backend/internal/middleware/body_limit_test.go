package middleware

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestMaxBodyBytes(t *testing.T) {
	app := fiber.New()
	app.Use(MaxBodyBytes(10, func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusRequestEntityTooLarge) }))
	app.Post("/x", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })
	for body, want := range map[string]int{strings.Repeat("a", 10): fiber.StatusOK, strings.Repeat("a", 11): fiber.StatusRequestEntityTooLarge} {
		response, err := app.Test(httptest.NewRequest("POST", "/x", strings.NewReader(body)))
		if err != nil {
			t.Fatal(err)
		}
		if response.StatusCode != want {
			t.Fatalf("len %d: status %d, want %d", len(body), response.StatusCode, want)
		}
	}
}
