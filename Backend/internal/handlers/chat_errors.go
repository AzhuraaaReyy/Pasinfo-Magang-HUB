package handlers

import (
	"context"
	"errors"
	"log"

	"github.com/gofiber/fiber/v2"
	"wildan-news-backend/internal/services"
	"wildan-news-backend/internal/utils"
)

// Error codes of the chat API contract (docs/28 Oktober 2026/api/CHAT_API_CONTRACT.md).
const (
	codeInvalidJSON      = "INVALID_JSON"
	codeMessageRequired  = "MESSAGE_REQUIRED"
	codeMessageTooLong   = "MESSAGE_TOO_LONG"
	codeInvalidSessionID = "INVALID_SESSION_ID"
	codeSessionNotFound  = "SESSION_NOT_FOUND"
	codeRateLimited      = "RATE_LIMITED"
	codeAIUnavailable    = "AI_UNAVAILABLE"
	codeAITimeout        = "AI_TIMEOUT"
	codeAIRateLimited    = "AI_RATE_LIMITED"
	codeAIBadResponse    = "AI_BAD_RESPONSE"
	codeInternalError    = "INTERNAL_ERROR"
	codeInvalidQuery     = "INVALID_QUERY"
	codeInvalidCategory  = "INVALID_CATEGORY"
	codeInvalidLimit     = "INVALID_LIMIT"
)

// chatErrorMessages holds the user-facing text for each code; clients branch on the code.
var chatErrorMessages = map[string]string{
	codeInvalidJSON:      "Body JSON tidak valid.",
	codeMessageRequired:  "Pesan wajib diisi.",
	codeMessageTooLong:   "Pesan maksimal 2000 karakter.",
	codeInvalidSessionID: "ID sesi tidak valid.",
	codeSessionNotFound:  "Sesi tidak ditemukan.",
	codeRateLimited:      "Terlalu banyak permintaan. Coba lagi sebentar lagi.",
	codeAIUnavailable:    "Layanan AI sedang tidak tersedia. Silakan coba lagi nanti.",
	codeAITimeout:        "Layanan AI terlalu lama merespons. Silakan coba lagi.",
	codeAIRateLimited:    "Layanan AI sedang sibuk. Coba lagi sebentar lagi.",
	codeAIBadResponse:    "Layanan AI memberikan respons yang tidak valid.",
	codeInternalError:    "Terjadi kesalahan pada server.",
	codeInvalidQuery:     "Query wajib diisi.",
	codeInvalidCategory:  "Kategori tidak valid.",
	codeInvalidLimit:     "Limit maksimal 50.",
}

// chatError writes the contract ErrorResponse; request_id repeats the X-Request-ID header.
func chatError(c *fiber.Ctx, status int, code string) error {
	requestID, _ := c.Locals("request_id").(string)
	return c.Status(status).JSON(fiber.Map{
		"success": false,
		"message": chatErrorMessages[code],
		"error":   fiber.Map{"code": code, "request_id": requestID},
	})
}

// chatErrorStatus maps a chat/search service error to its HTTP status and contract code.
func chatErrorStatus(err error) (int, string) {
	if errors.Is(err, services.ErrProviderNotConfigured) {
		return fiber.StatusServiceUnavailable, codeAIUnavailable
	}
	if errors.Is(err, context.DeadlineExceeded) {
		return fiber.StatusGatewayTimeout, codeAITimeout
	}
	var providerErr *services.ProviderError
	if errors.As(err, &providerErr) {
		switch providerErr.Kind {
		case "timeout":
			return fiber.StatusGatewayTimeout, codeAITimeout
		case "rate_limit":
			return fiber.StatusTooManyRequests, codeAIRateLimited
		case "upstream", "connection":
			return fiber.StatusServiceUnavailable, codeAIUnavailable
		default:
			return fiber.StatusBadGateway, codeAIBadResponse
		}
	}
	// Anything else (database, retrieval query) is a server failure, not an AI failure (GAP-07).
	return fiber.StatusInternalServerError, codeInternalError
}

// logChatError keeps internal details in the server log only, never in the response.
func logChatError(c *fiber.Ctx, err error) {
	requestID, _ := c.Locals("request_id").(string)
	log.Printf("[ERROR] request_id=%s chat: %s", utils.SafeLogValue(requestID), utils.SafeLogValue(err.Error()))
}

// ChatBodyLimitBytes is the request body limit for /chat and /search (K5-04).
const ChatBodyLimitBytes = 16 * 1024

// ChatBodyTooLarge answers a body over ChatBodyLimitBytes with the contract error.
func ChatBodyTooLarge(c *fiber.Ctx) error {
	return chatError(c, fiber.StatusRequestEntityTooLarge, codeMessageTooLong)
}

// ChatRateLimited is the contract 429 response for /chat and /search (GAP-08).
func ChatRateLimited(c *fiber.Ctx) error {
	return chatError(c, fiber.StatusTooManyRequests, codeRateLimited)
}
