package services

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/utils"
)

// --- Berita Indo API Response Types ---

type beritaArticleImage struct {
	Small string
	Large string
}

// UnmarshalJSON menangani dua format image:
// - object: {"small":"...","large":"..."} (CNN, CNBC, Tempo)
// - string:  "https://..." (Antara)
func (img *beritaArticleImage) UnmarshalJSON(data []byte) error {
	// Coba sebagai string dulu
	var s string
	if json.Unmarshal(data, &s) == nil {
		img.Small = s
		img.Large = s
		return nil
	}
	// Coba sebagai object
	var obj struct {
		Small string `json:"small"`
		Large string `json:"large"`
	}
	if json.Unmarshal(data, &obj) == nil {
		img.Small = obj.Small
		img.Large = obj.Large
	}
	return nil // abaikan error parse image
}

type beritaArticle struct {
	Title          string             `json:"title"`
	Link           string             `json:"link"`
	Content        string             `json:"content"`
	ContentSnippet string             `json:"contentSnippet"`
	IsoDate        string             `json:"isoDate"`
	Image          beritaArticleImage `json:"image"`
}

type beritaAPIResponse struct {
	Data     []beritaArticle `json:"data"`
	Messages string          `json:"messages"`
	Total    int             `json:"total"`
}

// FetchResult berisi statistik hasil fetch
type FetchResult struct {
	Fetched int
	Saved   int
	Skipped int
	Errors  int
}

const beritaBaseURL = "https://berita-indo-api-next.vercel.app/api"

// getOrCreateSystemUser memastikan ada system user untuk artikel yang difetch
func getOrCreateNewsAPIUser() (models.User, error) {
	var user models.User
	result := database.DB.Where("email = ?", "newsapi@pasuruaninfo.com").First(&user)
	if result.Error == nil {
		return user, nil
	}
	user = models.User{
		Name:     "Berita Indo Bot",
		Email:    "newsapi@pasuruaninfo.com",
		Password: "",
		Role:     "penulis",
	}
	if err := database.DB.Create(&user).Error; err != nil {
		return user, fmt.Errorf("gagal membuat system user: %w", err)
	}
	log.Println("[BeritaIndo] System user dibuat")
	return user, nil
}

// fetchFromBeritaIndo mengambil artikel dari satu endpoint berita-indo-api
func fetchFromBeritaIndo(client, articleClient *http.Client, apiURL string, categoryID uint, sysUser models.User, result *FetchResult) {
	resp, err := client.Get(apiURL)
	if err != nil {
		log.Printf("[BeritaIndo] Gagal fetch %s: %v", apiURL, err)
		result.Errors++
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[BeritaIndo] HTTP %d dari %s", resp.StatusCode, apiURL)
		result.Errors++
		return
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxNewsAPIBytes))
	if err != nil {
		log.Printf("[BeritaIndo] Gagal baca response: %v", err)
		result.Errors++
		return
	}

	var apiResp beritaAPIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		log.Printf("[BeritaIndo] Gagal parse JSON dari %s: %v", apiURL, err)
		result.Errors++
		return
	}

	result.Fetched += len(apiResp.Data)

	for _, article := range apiResp.Data {
		// Lewati artikel tanpa judul atau URL
		if strings.TrimSpace(article.Title) == "" || strings.TrimSpace(article.Link) == "" {
			result.Skipped++
			continue
		}

		// Cek duplikasi berdasarkan SourceURL
		var existing models.News
		if database.DB.Where("source_url = ?", article.Link).First(&existing).Error == nil {
			result.Skipped++
			continue
		}

		// Parse waktu publikasi (ISO 8601)
		pubTime, err := time.Parse(time.RFC3339, article.IsoDate)
		published := err == nil
		if err != nil {
			pubTime = time.Now()
		}

		// Scrape full article content using readability instead of snippet.
		// The link comes from a third-party API: fetched with an SSRF-safe client,
		// size-limited, and its body is closed before the next article.
		content := scrapeArticleText(articleClient, article.Link)

		if content == "" {
			content = strings.TrimSpace(article.Content)
		}
		if content == "" {
			content = strings.TrimSpace(article.ContentSnippet)
		}
		if content == "" {
			content = article.Title
		}

		// Gambar: prioritas large → small → fallback
		imageURL := article.Image.Large
		if imageURL == "" {
			imageURL = article.Image.Small
		}
		if imageURL == "" {
			imageURL = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800"
		}

		slug, err := utils.UniqueNewsSlug(database.DB, article.Title)
		if err != nil {
			log.Printf("[BeritaIndo] Gagal membuat slug: %v", err)
			result.Errors++
			continue
		}

		news := models.News{
			Title:      article.Title,
			Slug:       slug,
			CategoryID: categoryID,
			Content:    content,
			Images:     []models.NewsImage{{ImagePath: imageURL}},
			AuthorID:   sysUser.ID,
			Views:      0,
			Status:     "published",
			SourceURL:  article.Link,
			Source:     sourceName(apiURL),
		}
		news.CreatedAt = pubTime
		// The source's publication time (isoDate) is also the published date; an unparsable one stays
		// empty instead of using the fetch time (Owner 2026-11-01, audit L2).
		if published {
			news.PublishedAt = &pubTime
		}

		if err := database.DB.Create(&news).Error; err != nil {
			log.Printf("[BeritaIndo] Gagal simpan '%s': %v", article.Title, err)
			result.Errors++
			continue
		}
		result.Saved++
	}
}

// sourceName mengekstrak nama sumber dari URL endpoint
func sourceName(endpointURL string) string {
	parts := strings.Split(endpointURL, "/api/")
	if len(parts) < 2 {
		return "berita-indo-api"
	}
	// Ambil bagian pertama sebelum '/'
	name := strings.Split(parts[1], "/")[0]
	// Mapping ke nama manusiawi
	switch {
	case strings.HasPrefix(name, "cnn"):
		return "CNN Indonesia"
	case strings.HasPrefix(name, "cnbc"):
		return "CNBC Indonesia"
	case strings.HasPrefix(name, "republika"):
		return "Republika"
	case strings.HasPrefix(name, "tempo"):
		return "Tempo"
	case strings.HasPrefix(name, "antara"):
		return "Antara News"
	case strings.HasPrefix(name, "kumparan"):
		return "Kumparan"
	case strings.HasPrefix(name, "okezone"):
		return "Okezone"
	default:
		return "Berita Indo"
	}
}

// FetchAndSaveNews mengambil berita dari berita-indo-api dan menyimpannya ke database.
// Tidak memerlukan API key — gratis dan terbuka.
func FetchAndSaveNews() (FetchResult, error) {
	var result FetchResult

	sysUser, err := getOrCreateNewsAPIUser()
	if err != nil {
		return result, err
	}

	// Daftar endpoint berita-indo-api (Hanya Tempo & Antara)
	endpoints := []struct {
		url      string
		category string
	}{
		// Each feed is stored under the category that matches its content (2026-10-31: bisnis was stored
		// as POLITIK and ekonomi/olahraga as LOKAL). tempo-news/metro, travel, and cantik were removed:
		// they answer HTTP 400.
		// TEMPO
		{url: beritaBaseURL + "/tempo-news/nasional", category: "NASIONAL"},
		{url: beritaBaseURL + "/tempo-news/bisnis", category: "EKONOMI"},

		// ANTARA
		{url: beritaBaseURL + "/antara-news/ekonomi", category: "EKONOMI"},
		{url: beritaBaseURL + "/antara-news/olahraga", category: "OLAHRAGA"},
		{url: beritaBaseURL + "/antara-news/humaniora", category: "INSPIRATIF"},
		{url: beritaBaseURL + "/antara-news/politik", category: "POLITIK"},
		// Added 2026-10-31 for empty categories after a feed check (content matched, HTTP 200). No feed
		// carries Pasuruan news, so LOKAL stays without a feed (2026-11-11: 22 feeds checked, no Pasuruan title); WISATA
		// has no current feed (tempo/tribun travel answer HTTP 400; republika-news/leisure stopped in January 2018), so
		// both are filled by the editors through POST /news.
		{url: beritaBaseURL + "/antara-news/tekno", category: "TEKNOLOGI"},
		{url: beritaBaseURL + "/antara-news/hiburan", category: "HIBURAN"},
		// Added 2026-11-11 for the INTERNASIONAL category (jobdesk 11 Nov point 4, P4-2, Owner): world news, HTTP 200 with
		// 20 articles; tempo-news/dunia answers HTTP 400.
		{url: beritaBaseURL + "/antara-news/dunia", category: "INTERNASIONAL"},
		// Added 2026-11-11 for the empty KESEHATAN category (Owner, option A): current health articles (about 17 of 20
		// titles on health on 2026-11-11); the feed is named lifestyle, so a few other lifestyle articles are labelled
		// Kesehatan too, as the backend keeps the feed's category instead of sorting articles by their words.
		{url: beritaBaseURL + "/antara-news/lifestyle", category: "KESEHATAN"},
	}

	client := &http.Client{Timeout: 20 * time.Second}
	articleClient := newArticleClient()

	for _, ep := range endpoints {
		// find or create category
		var cat models.Category
		if err := database.DB.Where("name = ?", ep.category).FirstOrCreate(&cat, models.Category{Name: ep.category, Slug: strings.ToLower(ep.category)}).Error; err == nil {
			fetchFromBeritaIndo(client, articleClient, ep.url, cat.ID, sysUser, &result)
		}
	}

	log.Printf("[BeritaIndo] Selesai — fetched=%d saved=%d skipped=%d errors=%d",
		result.Fetched, result.Saved, result.Skipped, result.Errors)

	if result.Saved > 0 {
		// New news reaches the AI corpus now instead of at the next scheduled refresh (F3, 2026-11-03).
		RequestKnowledgeRefresh()
	}
	return result, nil
}
