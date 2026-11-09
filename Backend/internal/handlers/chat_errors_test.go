package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"wildan-news-backend/internal/middleware"
	"wildan-news-backend/internal/services"
)

func TestChatErrorWritesContractEnvelope(t *testing.T) {
	app := fiber.New()
	app.Use(middleware.RequestID())
	app.Get("/x", func(c *fiber.Ctx) error { return chatError(c, fiber.StatusNotFound, codeSessionNotFound) })
	request := httptest.NewRequest("GET", "/x", nil)
	request.Header.Set("X-Request-ID", "req-1")
	response, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	var body struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
		Error   struct {
			Code      string `json:"code"`
			RequestID string `json:"request_id"`
		} `json:"error"`
	}
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusNotFound || body.Success || body.Message != "Sesi tidak ditemukan." || body.Error.Code != "SESSION_NOT_FOUND" || body.Error.RequestID != "req-1" {
		t.Fatalf("status=%d body=%+v", response.StatusCode, body)
	}
}

func TestChatErrorMessagesCoverAllContractCodes(t *testing.T) {
	codes := []string{"INVALID_JSON", "MESSAGE_REQUIRED", "MESSAGE_TOO_LONG", "INVALID_SESSION_ID", "SESSION_NOT_FOUND", "RATE_LIMITED", "AI_UNAVAILABLE", "AI_TIMEOUT", "AI_RATE_LIMITED", "AI_BAD_RESPONSE", "INTERNAL_ERROR", "INVALID_QUERY", "INVALID_CATEGORY", "INVALID_LIMIT", "INVALID_LOCATION"}
	if len(chatErrorMessages) != len(codes) {
		t.Fatalf("catalog size = %d, want %d", len(chatErrorMessages), len(codes))
	}
	for _, code := range codes {
		if chatErrorMessages[code] == "" {
			t.Fatalf("message missing for %s", code)
		}
	}
}

func TestChatErrorStatus(t *testing.T) {
	cases := []struct {
		name       string
		err        error
		wantStatus int
		wantCode   string
	}{
		{"not configured", services.ErrProviderNotConfigured, fiber.StatusServiceUnavailable, "AI_UNAVAILABLE"},
		{"timeout", &services.ProviderError{Kind: "timeout"}, fiber.StatusGatewayTimeout, "AI_TIMEOUT"},
		{"rate limit", &services.ProviderError{Kind: "rate_limit"}, fiber.StatusTooManyRequests, "AI_RATE_LIMITED"},
		{"upstream", &services.ProviderError{Kind: "upstream"}, fiber.StatusServiceUnavailable, "AI_UNAVAILABLE"},
		{"connection", &services.ProviderError{Kind: "connection"}, fiber.StatusServiceUnavailable, "AI_UNAVAILABLE"},
		{"format", &services.ProviderError{Kind: "format"}, fiber.StatusBadGateway, "AI_BAD_RESPONSE"},
		{"empty model response", &services.ProviderError{Kind: "empty"}, fiber.StatusBadGateway, "AI_BAD_RESPONSE"},
		{"context deadline", fmt.Errorf("embed: %w", context.DeadlineExceeded), fiber.StatusGatewayTimeout, "AI_TIMEOUT"},
		{"other", errors.New("db down"), fiber.StatusInternalServerError, "INTERNAL_ERROR"},
		{"unknown provider kind", &services.ProviderError{Kind: "canceled"}, fiber.StatusBadGateway, "AI_BAD_RESPONSE"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			status, code := chatErrorStatus(tc.err)
			if status != tc.wantStatus || code != tc.wantCode {
				t.Fatalf("got %d %s, want %d %s", status, code, tc.wantStatus, tc.wantCode)
			}
		})
	}
}

func TestChatBodyTooLarge(t *testing.T) {
	app := fiber.New()
	app.Post("/x", ChatBodyTooLarge)
	response, err := app.Test(httptest.NewRequest("POST", "/x", nil))
	if err != nil {
		t.Fatal(err)
	}
	var body struct {
		Error struct{ Code string } `json:"error"`
	}
	_ = json.NewDecoder(response.Body).Decode(&body)
	if response.StatusCode != fiber.StatusRequestEntityTooLarge || body.Error.Code != "MESSAGE_TOO_LONG" || ChatBodyLimitBytes != 16384 {
		t.Fatalf("status=%d code=%s", response.StatusCode, body.Error.Code)
	}
}

func TestChatRateLimited(t *testing.T) {
	app := fiber.New()
	app.Get("/x", ChatRateLimited)
	response, err := app.Test(httptest.NewRequest("GET", "/x", nil))
	if err != nil {
		t.Fatal(err)
	}
	var body struct {
		Message string                `json:"message"`
		Error   struct{ Code string } `json:"error"`
	}
	_ = json.NewDecoder(response.Body).Decode(&body)
	if response.StatusCode != fiber.StatusTooManyRequests || body.Error.Code != "RATE_LIMITED" || body.Message != "Terlalu banyak permintaan. Coba lagi sebentar lagi." {
		t.Fatalf("status=%d body=%+v", response.StatusCode, body)
	}
}
