package handlers

import (
	"errors"
	"log"

	"github.com/gofiber/fiber/v2"
	"wildan-news-backend/internal/middleware"
	"wildan-news-backend/internal/services"
)

// RecommendationHandler serves related content (Sprint 1 Tahap A, Owner 2026-11-03): GET only, no login.
type RecommendationHandler struct{ Rec *services.Recommender }

func NewRecommendationHandler(rec *services.Recommender) *RecommendationHandler {
	return &RecommendationHandler{Rec: rec}
}

const (
	recommendationDefaultLimit = 6
	recommendationMaxLimit     = 12
)

func (h *RecommendationHandler) Register(r fiber.Router) {
	// Each request reads the corpus vectors, so it is rate limited like the other computed wisata routes.
	limiter := middleware.RateLimiter(60, 60)
	r.Get("/wisata/:slug/rekomendasi", limiter, h.handle("wisata", "slug"))
	r.Get("/kuliner/:slug/rekomendasi", limiter, h.handle("kuliner", "slug"))
	r.Get("/budaya/:slug/rekomendasi", limiter, h.handle("budaya", "slug"))
	r.Get("/acara/:slug/rekomendasi", limiter, h.handle("acara", "slug"))
	r.Get("/news/:id/rekomendasi", limiter, h.handle("berita", "id"))
}

// handle answers GET …/rekomendasi?limit=6&domain=kuliner. domain picks another travel domain for a travel item
// ("kuliner dekat wisata ini"); news only recommends news.
func (h *RecommendationHandler) handle(source, param string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		limit := c.QueryInt("limit", recommendationDefaultLimit)
		if limit < 1 || limit > recommendationMaxLimit {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "limit harus 1 sampai 12"})
		}
		target := c.Query("domain", source)
		if source == "berita" && target != "berita" || source != "berita" && !services.IsTravelDomain(target) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "domain harus wisata, kuliner, budaya, atau acara (berita hanya untuk berita)"})
		}
		items, err := h.Rec.Recommend(c.UserContext(), source, c.Params(param), target, limit)
		if errors.Is(err, services.ErrRecommendSourceNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"success": false, "message": "konten tidak ditemukan"})
		}
		if err != nil {
			log.Printf("[Recommendation] %s %s → %s: %v", source, c.Params(param), target, err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "gagal memuat rekomendasi"})
		}
		return c.JSON(fiber.Map{"success": true, "domain": target, "recommendations": items})
	}
}
