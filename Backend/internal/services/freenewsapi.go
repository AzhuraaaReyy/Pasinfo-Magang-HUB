package services

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

// freenewsapi.io is the primary news source since 2026-11-14 (Owner: berita-indo-api answered 402 DEPLOYMENT_DISABLED
// from 2026-11-13). Facts checked with live calls before this code (docs/14 November 2026/freenewsapi/
// hasil-uji-coba-api.md): GET /v1/news lists 10 articles (uuid, title, published_at, publisher; page size cannot be
// changed); GET /v1/details?uuid= gives body, thumbnail, original_url, topics; the key goes in the x-api-key header;
// errors are {"error": "..."} (401 wrong key, 400 bad uuid); 5,000 requests a day and 2 a second; word search (q,
// in_body, in_title) does not work, so news is fetched per topic.
const freeNewsBaseURL = "https://api.freenewsapi.io/v1"

// freeNewsPause keeps two calls at least this far apart (limit: 2 requests a second).
const freeNewsPause = 600 * time.Millisecond

// freeNewsTopics maps a freenewsapi topic to the news category it is saved under (Owner 2026-11-14, option A: these 7
// only). LOKAL and INSPIRATIF have no matching topic. "travel" (WISATA) and the list without a topic (NASIONAL) exist but
// were left out: checked live, travel held mostly transport news and the list without a topic mixed promotions and tips.
// Topic "business" is not used: it held online gambling spam. The other categories are filled by berita-indo-api (the
// backup) and the editors. Topic labels are
// broad (a politics article can be labelled economy too); the category is the topic it was fetched with, as the
// berita-indo feeds do.
var freeNewsTopics = []struct{ Topic, Category string }{
	{"economy", "EKONOMI"},
	{"politics", "POLITIK"},
	{"sports", "OLAHRAGA"},
	{"technology", "TEKNOLOGI"},
	{"entertainment", "HIBURAN"},
	{"health", "KESEHATAN"},
	{"world", "INTERNASIONAL"},
}

// freeNewsExcerptRunes bounds the saved text: the terms (§4) forbid republishing full articles in a way that replaces
// the publisher, so the news keeps the opening sentences and links to the original (Owner 2026-11-14, option A).
const freeNewsExcerptRunes = 600

type freeNewsListResponse struct {
	Data []struct {
		UUID        string `json:"uuid"`
		Title       string `json:"title"`
		PublishedAt string `json:"published_at"`
		Publisher   string `json:"publisher"`
	} `json:"data"`
	Error string `json:"error"`
}

type freeNewsDetailResponse struct {
	Data struct {
		UUID        string `json:"uuid"`
		Title       string `json:"title"`
		Thumbnail   string `json:"thumbnail"`
		Publisher   string `json:"publisher"`
		PublishedAt string `json:"published_at"`
		OriginalURL string `json:"original_url"`
		Incipit     string `json:"incipit"`
		Body        string `json:"body"`
	} `json:"data"`
	Error string `json:"error"`
}

func freeNewsClient() *http.Client { return &http.Client{Timeout: 20 * time.Second} }

// fetchFreeNews fetches the latest Indonesian articles of every topic of freeNewsTopics and saves the new ones. pause
// runs before each call after the first.
func fetchFreeNews(client *http.Client, baseURL, key string, sysUser models.User, result *FetchResult, pause time.Duration) {
	calls := 0
	get := func(path string, out any) error {
		if calls > 0 && pause > 0 {
			time.Sleep(pause)
		}
		calls++
		return freeNewsGet(client, baseURL+path, key, out)
	}
	for _, t := range freeNewsTopics {
		var cat models.Category
		if err := database.DB.Where("name = ?", t.Category).FirstOrCreate(&cat, models.Category{Name: t.Category, Slug: strings.ToLower(t.Category)}).Error; err != nil {
			log.Printf("[FreeNewsAPI] Gagal membaca kategori %s: %v", t.Category, err)
			result.Errors++
			continue
		}
		var list freeNewsListResponse
		if err := get("/news?country=id&language=id&topic="+t.Topic, &list); err != nil {
			log.Printf("[FreeNewsAPI] Gagal mengambil daftar topik %s: %v", t.Topic, err)
			result.Errors++
			continue
		}
		result.Fetched += len(list.Data)
		for _, item := range list.Data {
			if strings.TrimSpace(item.Title) == "" || strings.TrimSpace(item.UUID) == "" {
				result.Skipped++
				continue
			}
			var detail freeNewsDetailResponse
			if err := get("/details?uuid="+item.UUID, &detail); err != nil {
				log.Printf("[FreeNewsAPI] Gagal mengambil detail %s: %v", item.UUID, err)
				result.Errors++
				continue
			}
			d := detail.Data
			if strings.TrimSpace(d.OriginalURL) == "" {
				result.Skipped++
				continue
			}
			if newsSourceURLSaved(d.OriginalURL) {
				result.Skipped++
				continue
			}
			title := strings.TrimSpace(d.Title)
			if title == "" {
				title = strings.TrimSpace(item.Title)
			}
			publishedAt, err := time.Parse(time.RFC3339, firstNonEmpty(d.PublishedAt, item.PublishedAt))
			published := err == nil
			if !published {
				publishedAt = time.Now()
			}
			publisher := strings.TrimSpace(firstNonEmpty(d.Publisher, item.Publisher))
			saveFetchedNews(fetchedNews{Title: title, Link: d.OriginalURL, Content: freeNewsContent(title, d.Body, d.Incipit, publisher, d.OriginalURL),
				ImageURL: strings.TrimSpace(d.Thumbnail), PublishedAt: publishedAt, Published: published, Source: publisher, Log: "[FreeNewsAPI]"}, cat.ID, sysUser, result)
		}
	}
	log.Printf("[FreeNewsAPI] Selesai — fetched=%d saved=%d skipped=%d errors=%d", result.Fetched, result.Saved, result.Skipped, result.Errors)
}

// freeNewsGet calls one freenewsapi endpoint and decodes the answer; a status other than 200 is an error with the
// provider's message (never the key).
func freeNewsGet(client *http.Client, url, key string, out any) error {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("x-api-key", key)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxNewsAPIBytes))
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		var e struct {
			Error string `json:"error"`
		}
		_ = json.Unmarshal(body, &e)
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, firstNonEmpty(e.Error, http.StatusText(resp.StatusCode)))
	}
	return json.Unmarshal(body, out)
}

// freeNewsContent is the saved text of a freenewsapi article: its opening sentences (at most freeNewsExcerptRunes,
// cut at the end of a sentence) and a line naming the publisher with the link to the full article.
func freeNewsContent(title, body, incipit, publisher, link string) string {
	text := newsExcerpt(title, body, freeNewsExcerptRunes)
	if text == "" {
		text = strings.TrimSpace(strings.TrimRight(strings.TrimSpace(incipit), ".… "))
	}
	if text == "" {
		text = title
	}
	if publisher == "" {
		publisher = "sumber asli"
	}
	return text + newsSourceLinkLine + publisher + ": " + link
}

// newsExcerpt returns the first sentences of body that fit in max runes, without a leading copy of the title. A body
// whose first sentence is already longer is cut at the last space before max and ends with "…".
func newsExcerpt(title, body string, max int) string {
	text := strings.Join(strings.Fields(body), " ")
	if t := strings.Join(strings.Fields(title), " "); t != "" && strings.HasPrefix(text, t) {
		text = strings.TrimSpace(strings.TrimPrefix(text, t))
	}
	if utf8.RuneCountInString(text) <= max {
		return text
	}
	runes := []rune(text)
	cut := string(runes[:max])
	if i := strings.LastIndexAny(cut, ".!?"); i > 0 {
		return strings.TrimSpace(cut[:i+1])
	}
	if i := strings.LastIndex(cut, " "); i > 0 {
		cut = cut[:i]
	}
	return strings.TrimSpace(cut) + "…"
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
