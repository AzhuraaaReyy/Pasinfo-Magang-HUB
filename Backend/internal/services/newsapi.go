package services

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"gorm.io/gorm"
	"wildan-news-backend/internal/config"
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
		if newsSourceURLSaved(article.Link) {
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
		// Gambar: prioritas large → small → fallback (saveFetchedNews)
		imageURL := article.Image.Large
		if imageURL == "" {
			imageURL = article.Image.Small
		}
		saveFetchedNews(fetchedNews{Title: article.Title, Link: article.Link, Content: content, ImageURL: imageURL,
			PublishedAt: pubTime, Published: published, Source: sourceName(apiURL), Log: "[BeritaIndo]"}, categoryID, sysUser, result)
	}
}

// fetchedNews is one article of a news source, ready to be saved (berita-indo-api or freenewsapi.io).
type fetchedNews struct {
	Title, Link, Content, ImageURL, Source string
	PublishedAt                            time.Time
	Published                              bool   // PublishedAt is the source's publication time
	Log                                    string // log prefix of the source
}

// defaultNewsImage is the image of an article whose source has none.
const defaultNewsImage = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800"

// saveFetchedNews saves one fetched article as published news, unless the same title and text are already saved. The
// caller has checked source_url. Shared by both news sources (2026-11-14, freenewsapi.io, Owner).
func saveFetchedNews(a fetchedNews, categoryID uint, sysUser models.User, result *FetchResult) {
	// The same article under another URL (P4-1, Owner option C): same title and same text as a saved news item.
	if duplicate, err := duplicateNews(database.DB, a.Title, a.Content); err != nil {
		log.Printf("%s Gagal cek duplikat %s: %v", a.Log, a.Title, err)
		result.Errors++
		return
	} else if duplicate {
		result.Skipped++
		return
	}
	if a.ImageURL == "" {
		a.ImageURL = defaultNewsImage
	}
	slug, err := utils.UniqueNewsSlug(database.DB, a.Title)
	if err != nil {
		log.Printf("%s Gagal membuat slug: %v", a.Log, err)
		result.Errors++
		return
	}
	news := models.News{
		Title:      a.Title,
		Slug:       slug,
		CategoryID: categoryID,
		Content:    a.Content,
		Images:     []models.NewsImage{{ImagePath: a.ImageURL}},
		AuthorID:   sysUser.ID,
		Views:      0,
		Status:     "published",
		SourceURL:  a.Link,
		Source:     a.Source,
	}
	news.CreatedAt = a.PublishedAt
	// The source's publication time is also the published date; an unparsable one stays empty instead of using the
	// fetch time (Owner 2026-11-01, audit L2).
	if a.Published {
		news.PublishedAt = &a.PublishedAt
	}
	if err := database.DB.Create(&news).Error; err != nil {
		log.Printf("%s Gagal simpan '%s': %v", a.Log, a.Title, err)
		result.Errors++
		return
	}
	result.Saved++
}

// newsSourceURLSaved reports whether a news item with this source URL is already saved.
func newsSourceURLSaved(link string) bool {
	var existing models.News
	return database.DB.Where("source_url = ?", link).First(&existing).Error == nil
}

// duplicateNews reports whether a news item with this title and this text is already saved, whatever its URL and
// status: Tempo published one article under 9 URLs (ids 56–78, August 2026), which the source_url check let through
// (jobdesk 13 Nov point 4, P4-1, Owner option C). The title is compared without letter case and outer spaces, the text
// without outer white space and without the source link line of a freenewsapi article (newsTextWithoutSourceLink); a
// different text under the same title is another article and is saved.
func duplicateNews(db *gorm.DB, title, content string) (bool, error) {
	var contents []string
	if err := db.Model(&models.News{}).Where("lower(trim(title)) = lower(?)", strings.TrimSpace(title)).Pluck("content", &contents).Error; err != nil {
		return false, err
	}
	for _, saved := range contents {
		if newsTextWithoutSourceLink(saved) == newsTextWithoutSourceLink(content) {
			return true, nil
		}
	}
	return false, nil
}

// newsSourceLinkLine starts the last line of a freenewsapi article (freeNewsContent).
const newsSourceLinkLine = "\n\nBaca selengkapnya di "

// newsTextWithoutSourceLink is the article text without its source link line: the same article under two URLs (Kompas
// with and without "?open_from=…", 2026-11-14 run) has the same text but another link, and was saved twice.
func newsTextWithoutSourceLink(content string) string {
	if i := strings.LastIndex(content, newsSourceLinkLine); i >= 0 {
		content = content[:i]
	}
	return strings.TrimSpace(content)
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

// FetchAndSaveNews fetches news from the primary news source and saves it; when the primary fails completely (no
// article read and at least one error: down, key refused, quota), the other source is tried in the same run (Owner
// 2026-11-14: freenewsapi.io and berita-indo-api back each other up). NEWS_PRIMARY_SOURCE picks the primary
// (freenewsapi or berita-indo); empty = freenewsapi when FREENEWSAPI_KEY is set. Without a key only berita-indo-api runs.
func FetchAndSaveNews() (FetchResult, error) {
	sysUser, err := getOrCreateNewsAPIUser()
	if err != nil {
		return FetchResult{}, err
	}
	key := config.Env("FREENEWSAPI_KEY")
	sources := map[string]func(*FetchResult){
		newsSourceFreeNews:   func(r *FetchResult) { fetchFreeNews(freeNewsClient(), freeNewsBaseURL, key, sysUser, r, freeNewsPause) },
		newsSourceBeritaIndo: func(r *FetchResult) { fetchBeritaIndo(sysUser, r) },
	}
	result := fetchWithFallback(newsSourceOrder(config.Env("NEWS_PRIMARY_SOURCE"), key != ""), sources)
	if result.Saved > 0 {
		// New news reaches the AI corpus now instead of at the next scheduled refresh (F3, 2026-11-03).
		RequestKnowledgeRefresh()
	}
	return result, nil
}

// News source names of NEWS_PRIMARY_SOURCE.
const (
	newsSourceFreeNews   = "freenewsapi"
	newsSourceBeritaIndo = "berita-indo"
)

// newsSourceOrder is the order the news sources are tried in: the primary first, then the other one. freenewsapi.io
// needs a key, so without one only berita-indo-api is tried.
func newsSourceOrder(primary string, hasKey bool) []string {
	if !hasKey {
		return []string{newsSourceBeritaIndo}
	}
	if strings.EqualFold(strings.TrimSpace(primary), newsSourceBeritaIndo) {
		return []string{newsSourceBeritaIndo, newsSourceFreeNews}
	}
	return []string{newsSourceFreeNews, newsSourceBeritaIndo}
}

// fetchWithFallback runs the sources in order and stops at the first that did not fail completely. A source that read
// articles but saved none (all already saved) has not failed.
func fetchWithFallback(order []string, sources map[string]func(*FetchResult)) FetchResult {
	var result FetchResult
	for i, name := range order {
		result = FetchResult{}
		sources[name](&result)
		log.Printf("[News] sumber %s: fetched=%d saved=%d skipped=%d errors=%d", name, result.Fetched, result.Saved, result.Skipped, result.Errors)
		if !(result.Fetched == 0 && result.Errors > 0) {
			return result
		}
		if i+1 < len(order) {
			log.Printf("[News] sumber %s gagal, beralih ke cadangan %s", name, order[i+1])
		}
	}
	return result
}

// fetchBeritaIndo fetches every feed of berita-indo-api (Tempo and Antara, no API key).
func fetchBeritaIndo(sysUser models.User, result *FetchResult) {
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
			fetchFromBeritaIndo(client, articleClient, ep.url, cat.ID, sysUser, result)
		}
	}

	log.Printf("[BeritaIndo] Selesai — fetched=%d saved=%d skipped=%d errors=%d",
		result.Fetched, result.Saved, result.Skipped, result.Errors)
}
