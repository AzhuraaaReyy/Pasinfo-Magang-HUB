package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"wildan-news-backend/internal/services"
)

// FetchNewsFromAPI adalah handler untuk trigger fetch berita dari NewsAPI secara manual.
// POST /api/v1/news/fetch
func FetchNewsFromAPI(c *fiber.Ctx) error {
	result, err := services.FetchAndSaveNews()
	if err != nil {
		log.Printf("[FetchNews Error] %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Gagal mengambil berita",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Berita berhasil diambil dari NewsAPI",
		"data": fiber.Map{
			"fetched": result.Fetched,
			"saved":   result.Saved,
			"skipped": result.Skipped,
			"errors":  result.Errors,
		},
	})
}
