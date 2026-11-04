package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

type WisataHandler struct{ DB *gorm.DB }

func NewWisataHandler(db *gorm.DB) *WisataHandler { return &WisataHandler{DB: db} }

func (h *WisataHandler) Register(r fiber.Router) {
	r.Get("/wisata/regions", h.Regions)
	r.Get("/wisata/categories", h.Categories)
	r.Get("/wisata", h.List)
	r.Get("/wisata/:slug", h.Detail)
}

func (h *WisataHandler) Regions(c *fiber.Ctx) error {
	var rows []models.Region
	if err := h.DB.Order("id").Find(&rows).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "gagal memuat wilayah"})
	}
	out := make([]fiber.Map, 0, len(rows))
	for _, r := range rows {
		out = append(out, fiber.Map{"id": r.Slug, "slug": r.Slug, "name": r.Name, "color": r.Color, "center": fiber.Map{"latitude": r.CenterLatitude, "longitude": r.CenterLongitude}, "zoom": r.Zoom, "short_description": r.ShortDescription})
	}
	return c.JSON(fiber.Map{"regions": out})
}

func (h *WisataHandler) Categories(c *fiber.Ctx) error {
	var rows []models.TravelCategory
	if err := h.DB.Where("domain = ?", "wisata").Order("id").Find(&rows).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "gagal memuat kategori"})
	}
	out := make([]fiber.Map, 0, len(rows))
	for _, r := range rows {
		out = append(out, fiber.Map{"id": r.Slug, "slug": r.Slug, "name": r.Name})
	}
	return c.JSON(fiber.Map{"categories": out})
}

func (h *WisataHandler) query(slug string) *gorm.DB {
	q := h.DB.Preload("Place").Preload("Region").Preload("TravelCategory").Preload("Prices").Preload("Facilities").Preload("Weather").Preload("Media").Preload("Hours").Preload("Verification").Where("status = ?", "published")
	if slug != "" {
		q = q.Where("slug = ?", slug)
	}
	return q.Order("id")
}

func wisataJSON(d models.Destination) fiber.Map {
	media := make([]fiber.Map, 0, len(d.Media))
	for _, m := range d.Media {
		media = append(media, fiber.Map{"type": m.Type, "url": m.URL, "thumbnail_url": m.ThumbnailURL, "alt_text": m.AltText, "caption": m.Caption, "sort_order": m.SortOrder, "is_featured": m.IsFeatured})
	}
	facilities := make([]string, 0, len(d.Facilities))
	for _, f := range d.Facilities {
		facilities = append(facilities, f.Name)
	}
	prices := make([]fiber.Map, 0, len(d.Prices))
	for _, p := range d.Prices {
		prices = append(prices, fiber.Map{"name": p.Name, "price": p.Price, "min_price": p.MinPrice, "max_price": p.MaxPrice, "description": p.Description, "external_url": p.ExternalURL})
	}
	status := "pending"
	var verifiedAt any
	if d.Verification != nil {
		status = d.Verification.Status
		verifiedAt = d.Verification.VerifiedAt
	}
	return fiber.Map{"id": d.Slug, "slug": d.Slug, "name": d.Name, "regionId": d.Region.Slug, "categoryId": d.TravelCategory.Slug, "place": d.Place, "media": media, "short_description": d.ShortDescription, "description": strings.Split(d.Description, "\n\n"), "description_text": d.Description, "destination_prices": prices, "facilities": d.Facilities, "fasilitas": facilities, "weather": d.Weather, "verification": fiber.Map{"status": status, "verified_at": verifiedAt}, "keyakinan": d.Keyakinan, "source": d.Source, "featured": d.Featured, "status": d.Status, "operational_status": d.OperationalStatus}
}

func (h *WisataHandler) List(c *fiber.Ctx) error {
	var rows []models.Destination
	if err := h.query("").Find(&rows).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "gagal memuat destinasi"})
	}
	out := make([]fiber.Map, 0, len(rows))
	for _, r := range rows {
		out = append(out, wisataJSON(r))
	}
	return c.JSON(fiber.Map{"destinations": out})
}
func (h *WisataHandler) Detail(c *fiber.Ctx) error {
	var row models.Destination
	if err := h.query(c.Params("slug")).First(&row).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"message": "Destinasi tidak ditemukan"})
	}
	countView(h.DB, &models.Destination{}, row.ID)
	return c.JSON(fiber.Map{"destination": wisataJSON(row)})
}
