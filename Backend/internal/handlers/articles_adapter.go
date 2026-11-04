package handlers

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

type ArticleHandler struct{ DB *gorm.DB }

func NewArticleHandler(db *gorm.DB) *ArticleHandler { return &ArticleHandler{DB: db} }

func (h *ArticleHandler) Categories(c *fiber.Ctx) error {
	var rows []models.ArticleCategory
	if err := h.DB.Order("name").Find(&rows).Error; err != nil {
		return fiber.ErrInternalServerError
	}
	return c.JSON(fiber.Map{"categories": rows})
}

func (h *ArticleHandler) List(c *fiber.Ctx) error {
	var rows []models.Article
	q := h.DB.Preload("Category").Where("status = ?", "published").Order("published_at DESC NULLS LAST, id DESC")
	if category := c.Query("category"); category != "" {
		q = q.Joins("JOIN article_categories ON article_categories.id = articles.category_id").Where("article_categories.slug = ?", category)
	}
	if c.Query("featured") == "true" {
		q = q.Where("featured = ?", true)
	}
	if err := q.Find(&rows).Error; err != nil {
		return fiber.ErrInternalServerError
	}
	return c.JSON(fiber.Map{"articles": rows})
}

func (h *ArticleHandler) Detail(c *fiber.Ctx) error {
	var row models.Article
	if err := h.DB.Preload("Category").Where("slug = ? AND status = ?", c.Params("slug"), "published").First(&row).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "artikel tidak ditemukan"})
	}
	return c.JSON(fiber.Map{"article": row})
}
