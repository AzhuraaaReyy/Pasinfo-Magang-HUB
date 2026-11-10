package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

// T3 (jobdesk 10 Nov point 5, Owner 2026-11-10): the app error handler answers polite Indonesian in the
// {success:false, message} shape, keeps the status code, hides server error details, and keeps a handler's own
// 4xx message.
func TestAppErrorHandlerAnswersIndonesian(t *testing.T) {
	app := fiber.New(fiber.Config{ErrorHandler: AppErrorHandler, BodyLimit: 16})
	app.Get("/ada", func(c *fiber.Ctx) error { return c.SendString("ok") })
	app.Post("/kirim", func(c *fiber.Ctx) error { return c.SendString("ok") })
	app.Get("/rusak", func(c *fiber.Ctx) error { return errors.New("pq: password authentication failed for user x") })
	app.Get("/panik", func(c *fiber.Ctx) error { return fiber.ErrInternalServerError })
	app.Get("/pesan-sendiri", func(c *fiber.Ctx) error { return fiber.NewError(fiber.StatusBadRequest, "slug wajib diisi") })
	app.Get("/teks-bawaan", func(c *fiber.Ctx) error { return fiber.ErrBadRequest })
	for _, tc := range []struct {
		method, path, body string
		code               int
		message            string
	}{
		{"GET", "/tidak-ada", "", 404, msgNotFound},
		{"DELETE", "/ada", "", 405, msgMethodNotAllowed},
		{"GET", "/rusak", "", 500, msgServerError},
		{"GET", "/panik", "", 500, msgServerError},
		{"GET", "/pesan-sendiri", "", 400, "slug wajib diisi"},
		{"GET", "/teks-bawaan", "", 400, msgBadRequest},
		{"POST", "/kirim", "kecil", 200, ""},
	} {
		req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
		resp, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(resp.Body)
		if tc.code == 200 {
			if resp.StatusCode != 200 {
				t.Errorf("%s %s = %d %s, want 200", tc.method, tc.path, resp.StatusCode, raw)
			}
			continue
		}
		var body map[string]any
		if err := json.Unmarshal(raw, &body); err != nil {
			t.Fatalf("%s %s: not JSON: %s", tc.method, tc.path, raw)
		}
		if resp.StatusCode != tc.code || body["success"] != false || body["message"] != tc.message || len(body) != 2 {
			t.Errorf("%s %s = %d %s, want %d %q", tc.method, tc.path, resp.StatusCode, raw, tc.code, tc.message)
		}
	}
	// Errors Fiber raises itself with its English status text (a body over BodyLimit reaches the handler as
	// ErrRequestEntityTooLarge; app.Test cannot send one) and a wrapped server error.
	for _, tc := range []struct {
		err     error
		code    int
		message string
	}{
		{fiber.ErrRequestEntityTooLarge, 413, "Ukuran data permintaan terlalu besar."},
		{fiber.ErrRequestTimeout, 408, "Waktu permintaan habis. Silakan coba lagi."},
		{fiber.ErrUnsupportedMediaType, 415, msgBadRequest},
		{fiber.ErrServiceUnavailable, 503, msgServerError},
	} {
		if code, msg := publicError(tc.err); code != tc.code || msg != tc.message {
			t.Errorf("%v = %d %q, want %d %q", tc.err, code, msg, tc.code, tc.message)
		}
	}
}
