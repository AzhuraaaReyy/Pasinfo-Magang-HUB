package handlers

import (
	"github.com/gofiber/fiber/v2"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

func GetCategories(c *fiber.Ctx) error {
	var categories []models.Category
	if err := database.DB.Find(&categories).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Kategori gagal dimuat",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    categories,
	})
}

func CreateCategory(c *fiber.Ctx) error {
	type Request struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format data permintaan tidak valid"})
	}
	if req.Name == "" || req.Slug == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Nama dan slug kategori wajib diisi"})
	}
	cat := models.Category{Name: req.Name, Slug: req.Slug}
	if err := database.DB.Create(&cat).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Kategori gagal dibuat"})
	}
	return c.JSON(fiber.Map{"success": true, "data": cat})
}

func UpdateCategory(c *fiber.Ctx) error {
	id, ok := idParam(c)
	var cat models.Category
	if !ok || database.DB.First(&cat, id).Error != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kategori berita tidak ditemukan"})
	}
	type Request struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format data permintaan tidak valid"})
	}
	if req.Name != "" {
		cat.Name = req.Name
	}
	if req.Slug != "" {
		cat.Slug = req.Slug
	}
	if err := database.DB.Save(&cat).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Kategori gagal diperbarui"})
	}
	// The category name and slug are part of the AI corpus text and metadata of its news (jobdesk 6 Nov p1).
	requestCorpusRefresh()
	return c.JSON(fiber.Map{"success": true, "data": cat})
}

func DeleteCategory(c *fiber.Ctx) error {
	id, ok := idParam(c)
	var cat models.Category
	if !ok || database.DB.First(&cat, id).Error != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kategori berita tidak ditemukan"})
	}

	// Refuse instead of cascading: news must be moved or deleted first
	var newsCount int64
	if err := database.DB.Model(&models.News{}).Where("category_id = ?", cat.ID).Count(&newsCount).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Kategori gagal dihapus"})
	}
	if newsCount > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success":    false,
			"message":    "Kategori masih berisi berita. Pindahkan atau hapus beritanya terlebih dahulu.",
			"news_count": newsCount,
		})
	}

	if err := database.DB.Delete(&cat).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Kategori gagal dihapus"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Kategori berhasil dihapus"})
}
