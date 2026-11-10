package handlers

import (
	"context"
	"errors"
	"log"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"wildan-news-backend/internal/middleware"
	"wildan-news-backend/internal/services"
)

// RecommendationHandler serves related content (Sprint 1 Tahap A, Owner 2026-11-03): GET only, no login.
// Search and LLM, when set, also serve recommendations for a text (jobdesk 9 Nov, Owner): the search embeds the
// text with the chat provider, so its concurrency limit (SEC-07) covers these requests too.
type RecommendationHandler struct {
	Rec    *services.Recommender
	Search *services.Retriever
	LLM    services.LLMProvider
}

func NewRecommendationHandler(rec *services.Recommender) *RecommendationHandler {
	return &RecommendationHandler{Rec: rec}
}

const (
	recommendationDefaultLimit = 6
	recommendationMaxLimit     = 12
)

// queryLimit reads ?limit= of the recommendation routes (jobdesk 10 Nov point 5, Owner): empty = the default; a value
// that is not a whole number from 1 to 12 ("abc", "1.5", "0") is refused instead of silently becoming the default.
func queryLimit(c *fiber.Ctx) (int, bool) {
	raw := strings.TrimSpace(c.Query("limit"))
	if raw == "" {
		return recommendationDefaultLimit, true
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 1 || n > recommendationMaxLimit {
		return 0, false
	}
	return n, true
}

func (h *RecommendationHandler) Register(r fiber.Router) {
	// Each request reads the corpus vectors, so it is rate limited like the other computed wisata routes.
	limiter := middleware.RateLimiter(60, 60)
	r.Get("/wisata/:slug/rekomendasi", limiter, h.handle("wisata", "slug"))
	r.Get("/kuliner/:slug/rekomendasi", limiter, h.handle("kuliner", "slug"))
	r.Get("/budaya/:slug/rekomendasi", limiter, h.handle("budaya", "slug"))
	r.Get("/acara/:slug/rekomendasi", limiter, h.handle("acara", "slug"))
	r.Get("/news/:id/rekomendasi", limiter, h.handle("berita", "id"))
	if h.Search != nil && h.LLM != nil {
		// Every request embeds the text with the embedding provider (quota), so it is limited like the chat.
		r.Get(travelRecommendationPath, middleware.RateLimiter(20, 60), h.handleText)
	}
}

// travelRecommendationPath is the travel recommendation endpoint of the frontend (jobdesk 10 Nov point 1, Owner
// 2026-11-10). It replaced GET /rekomendasi of 2026-11-09 (same handler, no consumer yet), so one path serves it.
const travelRecommendationPath = "/recommendations/travel"

const (
	// textQueryMaxRunes bounds the text of GET /recommendations/travel: a keyword or a short description of a need.
	textQueryMaxRunes = 300
	// textSearchPool is the number of nearest documents read before the eligibility check (drafts, finished events)
	// and the limit, so a filtered result still fills the asked count.
	textSearchPool = 30
	// textSearchTimeout bounds the embedding call and the queries of one request.
	textSearchTimeout = 30 * time.Second
)

// handleText answers GET /recommendations/travel?q=tempat+sejuk+di+pegunungan&domain=wisata,kuliner&zona=Pasuruan+Selatan&kecamatan=Tosari&kategori=Wisata+Alam&limit=6: recommendation
// cards of the travel domains (wisata, kuliner, budaya, acara; empty = all) ordered by the meaning similarity of each
// item to q.
func (h *RecommendationHandler) handleText(c *fiber.Ctx) error {
	q := strings.TrimSpace(c.Query("q"))
	if q == "" || utf8.RuneCountInString(q) > textQueryMaxRunes {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "q wajib diisi, paling banyak 300 karakter"})
	}
	limit, ok := queryLimit(c)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "limit harus 1 sampai 12"})
	}
	var domains []string
	for _, d := range strings.Split(c.Query("domain"), ",") {
		// Any letter case, like kecamatan and zona (jobdesk 10 Nov point 5, Owner): "Wisata" is wisata.
		if d = strings.ToLower(strings.TrimSpace(d)); d != "" {
			domains = append(domains, d)
		}
	}
	ctx, cancel := context.WithTimeout(c.UserContext(), textSearchTimeout)
	defer cancel()
	search := services.TravelSearch{Domains: domains, Zone: c.Query("zona"), District: c.Query("kecamatan"), Category: c.Query("kategori")}
	results, err := h.Search.SearchTravelContent(ctx, h.LLM, q, search, textSearchPool)
	if errors.Is(err, services.ErrUnknownTravelDomain) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "domain harus wisata, kuliner, budaya, atau acara"})
	}
	if errors.Is(err, services.ErrInvalidTravelFilter) {
		// The message names the filter and the allowed values only, never the visitor's text.
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": strings.TrimPrefix(err.Error(), services.ErrInvalidTravelFilter.Error()+": ")})
	}
	if err != nil {
		// The text is not logged: it is the visitor's own words.
		log.Printf("[Recommendation] text search failed: %v", err)
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"success": false, "message": "layanan rekomendasi sedang tidak tersedia, silakan coba lagi"})
	}
	items, err := h.Rec.RecommendByText(ctx, results, limit)
	if err != nil {
		log.Printf("[Recommendation] text cards failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "gagal memuat rekomendasi"})
	}
	return c.JSON(fiber.Map{"success": true, "query": q, "recommendations": items})
}

// handle answers GET …/rekomendasi?limit=6&domain=kuliner. domain picks another travel domain for a travel item
// ("kuliner dekat wisata ini"); news only recommends news.
func (h *RecommendationHandler) handle(source, param string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		limit, ok := queryLimit(c)
		if !ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "limit harus 1 sampai 12"})
		}
		// Any letter case, like GET /recommendations/travel (jobdesk 10 Nov point 5, Owner): "Kuliner" is kuliner.
		target := strings.ToLower(strings.TrimSpace(c.Query("domain", source)))
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
