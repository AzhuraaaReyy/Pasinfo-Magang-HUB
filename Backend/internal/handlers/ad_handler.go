package handlers

import (
	"log"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"

	"github.com/gofiber/fiber/v2"
)

type CreateAdRequest struct {
	Title       string `json:"title"`
	Slot        string `json:"slot"`
	ImageURL    string `json:"image_url"`
	RedirectURL string `json:"redirect_url"`
	Status      string `json:"status"`
}

type UpdateAdRequest struct {
	Title       string `json:"title"`
	Slot        string `json:"slot"`
	ImageURL    string `json:"image_url"`
	RedirectURL string `json:"redirect_url"`
	Status      string `json:"status"`
}

// GetAds returns all ads, optionally filtered by slot or status
func GetAds(c *fiber.Ctx) error {
	slot := c.Query("slot")
	status := c.Query("status")

	var ads []models.Ad
	query := database.DB

	if slot != "" {
		query = query.Where("slot = ?", slot)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("updated_at desc").Find(&ads).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to fetch ads"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    ads,
	})
}

// GetActiveAdBySlot returns active ad(s) for a specific slot
func GetActiveAdBySlot(c *fiber.Ctx) error {
	slot := c.Params("slot")
	var ads []models.Ad

	if err := database.DB.Where("slot = ? AND status = ?", slot, "Aktif").Order("updated_at desc").Find(&ads).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to fetch ad for slot"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    ads,
	})
}

// CreateAd creates a new ad campaign (Admin only)
func CreateAd(c *fiber.Ctx) error {
	userRole, _ := c.Locals("role").(string)
	if userRole != "admin" {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": "Forbidden"})
	}

	var req CreateAdRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	if req.Title == "" || req.Slot == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Title and Slot are required"})
	}

	status := req.Status
	if status == "" {
		status = "Aktif"
	}

	ad := models.Ad{
		Title:       req.Title,
		Slot:        req.Slot,
		ImageURL:    req.ImageURL,
		RedirectURL: req.RedirectURL,
		Status:      status,
	}

	if err := database.DB.Create(&ad).Error; err != nil {
		log.Printf("[CreateAd Error] %v", err)
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to create ad"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad campaign created successfully",
		"data":    ad,
	})
}

// UpdateAd updates an existing ad campaign (Admin only)
func UpdateAd(c *fiber.Ctx) error {
	userRole, _ := c.Locals("role").(string)
	if userRole != "admin" {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": "Forbidden"})
	}

	id := c.Params("id")
	var ad models.Ad
	if err := database.DB.First(&ad, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Ad not found"})
	}

	var req UpdateAdRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request body"})
	}

	if req.Title != "" {
		ad.Title = req.Title
	}
	if req.Slot != "" {
		ad.Slot = req.Slot
	}
	if req.ImageURL != "" {
		ad.ImageURL = req.ImageURL
	}
	if req.RedirectURL != "" {
		ad.RedirectURL = req.RedirectURL
	}
	if req.Status != "" {
		ad.Status = req.Status
	}

	if err := database.DB.Save(&ad).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to update ad"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad campaign updated successfully",
		"data":    ad,
	})
}

// DeleteAd deletes an ad campaign (Admin only)
func DeleteAd(c *fiber.Ctx) error {
	userRole, _ := c.Locals("role").(string)
	if userRole != "admin" {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": "Forbidden"})
	}

	id := c.Params("id")
	if err := database.DB.Delete(&models.Ad{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Failed to delete ad"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Ad campaign deleted successfully",
	})
}
