package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

type DomainHandler struct{ DB *gorm.DB }

func NewDomainHandler(db *gorm.DB) *DomainHandler { return &DomainHandler{db} }
func (h *DomainHandler) list(model any, key string, preload ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		q := h.DB
		for _, p := range preload {
			q = q.Preload(p)
		}
		var v any
		var err error
		switch model.(type) {
		case *models.Culinary:
			var rows []models.Culinary
			err = q.Where("status=?", "published").Find(&rows).Error
			v = rows
		case *models.Culture:
			var rows []models.Culture
			err = q.Where("status=?", "published").Find(&rows).Error
			v = rows
		case *models.Event:
			var rows []models.Event
			err = q.Where("status=?", "published").Find(&rows).Error
			v = rows
		default:
			return fiber.ErrInternalServerError
		}
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "gagal memuat data"})
		}
		return c.JSON(fiber.Map{key: v})
	}
}
func (h *DomainHandler) detail(model any, key string, preload ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		q := h.DB
		for _, p := range preload {
			q = q.Preload(p)
		}
		switch model.(type) {
		case *models.Culinary:
			var v models.Culinary
			if e := q.Where("slug=? AND status=?", c.Params("slug"), "published").First(&v).Error; e != nil {
				return c.Status(404).JSON(fiber.Map{"message": "not found"})
			}
			countView(h.DB, &v, v.ID)
			return c.JSON(fiber.Map{key: v})
		case *models.Culture:
			var v models.Culture
			if e := q.Where("slug=? AND status=?", c.Params("slug"), "published").First(&v).Error; e != nil {
				return c.Status(404).JSON(fiber.Map{"message": "not found"})
			}
			countView(h.DB, &v, v.ID)
			return c.JSON(fiber.Map{key: v})
		case *models.Event:
			var v models.Event
			if e := q.Where("slug=? AND status=?", c.Params("slug"), "published").First(&v).Error; e != nil {
				return c.Status(404).JSON(fiber.Map{"message": "not found"})
			}
			countView(h.DB, &v, v.ID)
			return c.JSON(fiber.Map{key: v})
		}
		return fiber.ErrInternalServerError
	}
}

// countView adds one detail page view (Sprint 1 Tahap B, Owner 2026-11-03: counted in the GET detail, no extra
// endpoint). The counter is a popularity signal only; a failed update does not fail the page.
func countView(db *gorm.DB, model any, id uint) {
	if err := db.Model(model).Where("id = ?", id).UpdateColumn("views", gorm.Expr("views + 1")).Error; err != nil {
		log.Printf("[Views] count failed: %v", err)
	}
}

func (h *DomainHandler) Register(r fiber.Router) {
	r.Get("/kuliner", h.list(&models.Culinary{}, "culinaries", "Place", "Menus"))
	r.Get("/kuliner/:slug", h.detail(&models.Culinary{}, "culinary", "Place", "Menus"))
	r.Get("/budaya", h.list(&models.Culture{}, "cultures", "Place"))
	r.Get("/budaya/:slug", h.detail(&models.Culture{}, "culture", "Place"))
	r.Get("/acara", h.list(&models.Event{}, "events", "Place", "Occurrences", "Tickets"))
	r.Get("/acara/:slug", h.detail(&models.Event{}, "event", "Place", "Occurrences", "Tickets"))
}
