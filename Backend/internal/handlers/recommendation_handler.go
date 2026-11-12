package handlers

import (
	"context"
	"errors"
	"log"
	"strconv"
	"strings"
	"time"
	"unicode"
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

// queryOffset reads ?offset= of the text recommendation routes (P4-1): empty = 0; a whole number from 0 with
// offset + limit at most textSearchWindow, otherwise refused.
func queryOffset(c *fiber.Ctx, limit int) (int, bool) {
	raw := strings.TrimSpace(c.Query("offset"))
	if raw == "" {
		return 0, true
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 || n+limit > textSearchWindow {
		return 0, false
	}
	return n, true
}

// querySort reads ?sort= of GET /recommendations/travel (jobdesk 12 Nov point 1, P1-1, Owner option A): empty or
// relevance = most similar first, popular = most viewed first among the same cards; any letter case. It returns
// false for another value, refused before the embedding call.
func querySort(c *fiber.Ctx) (popular, ok bool) {
	switch strings.ToLower(strings.TrimSpace(c.Query("sort"))) {
	case "", "relevance":
		return false, true
	case "popular":
		return true, true
	}
	return false, false
}

// emptyMessage is the message of a text recommendation without any card (jobdesk 12 Nov point 5, P5-1, Owner option A).
const emptyMessage = "Rekomendasi tidak ditemukan untuk pencarian ini."

// withEmptyHint adds message and suggestions to a text recommendation response whose first page has no card
// (P5-1, Owner option A): the response stays 200 with recommendations: [] and its other fields (P3-2), and the hint
// tells the visitor to change or widen the search. A later page (offset > 0) gets no hint: has_more of the page before
// already said that the results ended.
func withEmptyHint(body fiber.Map, cards, offset int, suggestions []string) fiber.Map {
	if cards == 0 && offset == 0 {
		body["message"] = emptyMessage
		body["suggestions"] = suggestions
	}
	return body
}

// travelEmptySuggestions names, for each filter the visitor sent, how to widen it, most specific first, then the
// search text. It reads only the request parameters, never the words of the query (AGENTS §22).
func travelEmptySuggestions(domains []string, category, district, zone string) []string {
	var out []string
	if district != "" {
		out = append(out, "Coba pilih kecamatan lain atau hapus filter kecamatan.")
	}
	if zone != "" {
		out = append(out, "Coba pilih wilayah lain atau hapus filter wilayah.")
	}
	if category != "" {
		out = append(out, "Coba hapus filter kategori.")
	}
	if len(domains) > 0 {
		out = append(out, "Coba pilih jenis konten lain atau hapus filter jenis konten.")
	}
	return append(out, "Coba gunakan kata pencarian lain yang lebih umum.")
}

// newsEmptySuggestions is travelEmptySuggestions for the news search, whose only filter is the news category.
func newsEmptySuggestions(category string) []string {
	var out []string
	if category != "" {
		out = append(out, "Coba pilih kategori berita lain atau hapus filter kategori.")
	}
	return append(out, "Coba gunakan kata pencarian lain yang lebih umum.")
}

// offsetMessage is the 400 message of an unusable offset.
const offsetMessage = "offset harus 0 atau lebih, dan offset + limit paling banyak 48"

// pagination is the page of a text recommendation response. has_more is true when a card follows the page inside the
// window; there is no total, which would need every result over the threshold counted.
type pagination struct {
	Offset  int  `json:"offset"`
	Limit   int  `json:"limit"`
	HasMore bool `json:"has_more"`
}

// page cuts one page from cards ordered from the first result. It never returns nil, so an empty page stays [] in
// JSON (the contract of an empty result, P3-2).
func page(cards []services.Recommendation, offset, limit int) ([]services.Recommendation, pagination) {
	info := pagination{Offset: offset, Limit: limit, HasMore: len(cards) > offset+limit && offset+limit < textSearchWindow}
	if offset >= len(cards) {
		return []services.Recommendation{}, info
	}
	return cards[offset:min(len(cards), offset+limit)], info
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
		r.Get(newsRecommendationPath, middleware.RateLimiter(20, 60), h.handleNews)
	}
}

// travelRecommendationPath is the travel recommendation endpoint of the frontend (jobdesk 10 Nov point 1, Owner
// 2026-11-10). It replaced GET /rekomendasi of 2026-11-09 (same handler, no consumer yet), so one path serves it.
const travelRecommendationPath = "/recommendations/travel"

// newsRecommendationPath is the news recommendation endpoint of the frontend (jobdesk 11 Nov point 2).
const newsRecommendationPath = "/recommendations/news"

// textQuery reads ?query= of the text recommendation routes (query and category since jobdesk 11 Nov point 4, P4-3,
// Owner; before: q and kategori): required, at most textQueryMaxRunes, with at least
// textQueryMinWordRunes letters or digits. It returns the Indonesian error message, "" when the query is valid. The minimum is a
// format check, not a keyword rule (AGENTS §22): "a" matched 5 unrelated news at 0.611–0.617, just above the threshold,
// while "AI", "hp", and "5G" are real searches (jobdesk 11 Nov point 3, P3-1, Owner option A); "???" or an emoji no
// longer costs an embedding call.
func textQuery(c *fiber.Ctx) (string, string) {
	q := strings.TrimSpace(c.Query("query"))
	if q == "" || utf8.RuneCountInString(q) > textQueryMaxRunes {
		return q, "query wajib diisi, paling banyak 300 karakter"
	}
	word := 0
	for _, r := range q {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			word++
		}
	}
	if word < textQueryMinWordRunes {
		return q, "query minimal berisi 2 huruf atau angka"
	}
	return q, ""
}

const (
	// textQueryMaxRunes bounds the text of GET /recommendations/travel: a keyword or a short description of a need.
	textQueryMaxRunes = 300
	// textQueryMinWordRunes is the fewest letters or digits a text query must hold (P3-1, jobdesk 11 Nov point 3).
	textQueryMinWordRunes = 2
	// textSearchPool is the number of nearest documents read before the eligibility check (drafts, finished events),
	// the merge of a destination and a culture item of one place, and the page, so the last page of the window still
	// fills and has_more can be told. 50 is the semanticSearch maximum; it was 30 before offset (P4-1). A request
	// still embeds the text once.
	textSearchPool = 50
	// textSearchWindow bounds offset + limit (P4-1, jobdesk 11 Nov point 4, Owner option B: both text routes): 4 pages
	// of 12, the page size of the frontend lists (prd: "pagination 12"). Deeper results are less similar to the query;
	// a broad query had up to 256 news over the threshold (2026-11-11), so the window, not the data, ends the pages.
	textSearchWindow = 48
	// textSearchTimeout bounds the embedding call and the queries of one request.
	textSearchTimeout = 30 * time.Second
)

// handleText answers GET /recommendations/travel?query=tempat+sejuk+di+pegunungan&domain=wisata,kuliner&zone=Pasuruan+Selatan&district=Tosari&category=Wisata+Alam&sort=popular&limit=6&offset=0:
// recommendation cards of the travel domains (wisata, kuliner, budaya, acara; empty = all) ordered by the meaning
// similarity of each item to the query, or with sort=popular by popularity among the same cards, one page at a time.
// Every filter and sort works alone or with the others; the query stays required (P1-3, Owner: a meaning search).
func (h *RecommendationHandler) handleText(c *fiber.Ctx) error {
	q, message := textQuery(c)
	if message != "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": message})
	}
	limit, ok := queryLimit(c)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "limit harus 1 sampai 12"})
	}
	offset, ok := queryOffset(c, limit)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": offsetMessage})
	}
	popular, ok := querySort(c)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "sort harus relevance atau popular"})
	}
	var domains []string
	for _, d := range strings.Split(c.Query("domain"), ",") {
		// Any letter case, like district and zone (jobdesk 10 Nov point 5, Owner): "Wisata" is wisata.
		if d = strings.ToLower(strings.TrimSpace(d)); d != "" {
			domains = append(domains, d)
		}
	}
	ctx, cancel := context.WithTimeout(c.UserContext(), textSearchTimeout)
	defer cancel()
	search := services.TravelSearch{Domains: domains, Zone: c.Query("zone"), District: c.Query("district"), Category: c.Query("category")}
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
	// The cards before the page are built too (their order places the page), and one card after it tells has_more.
	recommend := h.Rec.RecommendByText
	if popular {
		recommend = h.Rec.RecommendByTextPopular
	}
	items, err := recommend(ctx, results, offset+limit+1)
	if err != nil {
		log.Printf("[Recommendation] text cards failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "gagal memuat rekomendasi"})
	}
	cards, info := page(items, offset, limit)
	return c.JSON(withEmptyHint(fiber.Map{"success": true, "query": q, "recommendations": cards, "pagination": info}, len(cards), offset,
		travelEmptySuggestions(domains, strings.TrimSpace(search.Category), strings.TrimSpace(search.District), strings.TrimSpace(search.Zone))))
}

// handleNews answers GET /recommendations/news?query=harga+emas&category=ekonomi&limit=6&offset=0: news article cards
// ordered by the meaning similarity of each published article to the query (Retriever.SearchNews: cosine of the query and article embeddings,
// at or above the text-search threshold), optionally of one news category (categories.slug, any letter case). The
// request and response follow GET /recommendations/travel; a news card has its id (the news detail route uses it) and
// no location.
func (h *RecommendationHandler) handleNews(c *fiber.Ctx) error {
	q, message := textQuery(c)
	if message != "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": message})
	}
	limit, ok := queryLimit(c)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": "limit harus 1 sampai 12"})
	}
	offset, ok := queryOffset(c, limit)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": offsetMessage})
	}
	ctx, cancel := context.WithTimeout(c.UserContext(), textSearchTimeout)
	defer cancel()
	results, err := h.Search.SearchNews(ctx, h.LLM, q, c.Query("category"), textSearchPool)
	if errors.Is(err, services.ErrUnknownNewsCategory) {
		message := "category berita tidak dikenal"
		if categories, listErr := h.Search.NewsCategories(ctx); listErr == nil && len(categories) > 0 {
			slugs := make([]string, 0, len(categories))
			for _, category := range categories {
				slugs = append(slugs, category.Slug)
			}
			message = "category harus salah satu dari: " + strings.Join(slugs, ", ")
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"success": false, "message": message})
	}
	if err != nil {
		// The text is not logged: it is the visitor's own words.
		log.Printf("[Recommendation] news search failed: %v", err)
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"success": false, "message": "layanan rekomendasi sedang tidak tersedia, silakan coba lagi"})
	}
	// The cards before the page are built too (their order places the page), and one card after it tells has_more.
	items, err := h.Rec.RecommendByText(ctx, results, offset+limit+1)
	if err != nil {
		log.Printf("[Recommendation] news cards failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"success": false, "message": "gagal memuat rekomendasi"})
	}
	cards, info := page(items, offset, limit)
	return c.JSON(withEmptyHint(fiber.Map{"success": true, "query": q, "recommendations": cards, "pagination": info}, len(cards), offset,
		newsEmptySuggestions(strings.TrimSpace(c.Query("category")))))
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
