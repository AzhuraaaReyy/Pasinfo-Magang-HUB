package handlers

import (
	"errors"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/utils"
)

// Visitor messages of the app error handler (T3, jobdesk 10 Nov point 5, Owner 2026-11-10: every message is polite
// Indonesian; English is only for database names).
const (
	msgServerError      = "Terjadi kesalahan pada server. Silakan coba lagi."
	msgNotFound         = "Halaman atau endpoint tidak ditemukan."
	msgMethodNotAllowed = "Metode permintaan tidak diizinkan."
	msgBadRequest       = "Permintaan tidak dapat diproses."
)

// defaultStatusMessages replaces the English status text that Fiber itself sets (for example a body over the limit).
var defaultStatusMessages = map[int]string{
	fiber.StatusRequestEntityTooLarge: "Ukuran data permintaan terlalu besar.",
	fiber.StatusRequestTimeout:        "Waktu permintaan habis. Silakan coba lagi.",
	fiber.StatusTooManyRequests:       "Terlalu banyak permintaan. Coba lagi sebentar lagi.",
}

// publicError returns the status and the visitor message of an error that reached the app error handler: a server
// error never exposes its details, an unknown route or method has a fixed message, and Fiber's own English status
// text becomes Indonesian. A message a handler wrote itself for a 4xx error is kept.
func publicError(err error) (int, string) {
	code, msg := fiber.StatusInternalServerError, ""
	var e *fiber.Error
	if errors.As(err, &e) {
		code, msg = e.Code, e.Message
	}
	switch {
	case code >= fiber.StatusInternalServerError:
		return code, msgServerError
	case code == fiber.StatusNotFound:
		return code, msgNotFound
	case code == fiber.StatusMethodNotAllowed:
		return code, msgMethodNotAllowed
	case msg == "" || msg == utils.StatusMessage(code):
		if text, ok := defaultStatusMessages[code]; ok {
			return code, text
		}
		return code, msgBadRequest
	}
	return code, msg
}

// AppErrorHandler is the central Fiber error handler: it logs the error with the request id and answers
// {success:false, message} without internal details.
func AppErrorHandler(c *fiber.Ctx, err error) error {
	code, msg := publicError(err)
	requestID, _ := c.Locals("request_id").(string)
	log.Printf("[ERROR] request_id=%s status=%d error=%v", requestID, code, err)
	return c.Status(code).JSON(fiber.Map{"success": false, "message": msg})
}
