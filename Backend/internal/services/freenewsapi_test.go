package services

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

// freeNewsTestDB points database.DB at an empty in-memory database with the news tables.
func freeNewsTestDB(t *testing.T) models.User {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.Category{}, &models.News{}, &models.NewsImage{}); err != nil {
		t.Fatal(err)
	}
	old := database.DB
	database.DB = db
	t.Cleanup(func() { database.DB = old })
	user := models.User{Name: "Berita Indo Bot", Email: "newsapi@pasuruaninfo.com", Role: "penulis"}
	if err := db.Create(&user).Error; err != nil {
		t.Fatal(err)
	}
	return user
}

// freeNewsServer answers like freenewsapi.io (format checked with live calls on 2026-11-14): two economy articles,
// no article for the other topics, and 401 for a wrong key.
func freeNewsServer(t *testing.T, body string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-api-key") != "kunci-uji" {
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"Invalid API key"}`))
			return
		}
		switch r.URL.Path {
		case "/news":
			if r.URL.Query().Get("country") != "id" || r.URL.Query().Get("language") != "id" {
				t.Errorf("list without country=id&language=id: %s", r.URL.RawQuery)
			}
			data := []map[string]string{}
			if r.URL.Query().Get("topic") == "economy" {
				data = []map[string]string{
					{"uuid": "u-1", "title": "Harga emas naik", "published_at": "2026-11-14T10:00:00.000Z", "publisher": "ANTARA News"},
					{"uuid": "u-2", "title": "Rupiah menguat", "published_at": "2026-11-14T09:00:00.000Z", "publisher": "CNBC Indonesia"},
				}
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"data": data, "meta": map[string]any{"page_size": 10, "returned": len(data)}})
		case "/details":
			uuid := r.URL.Query().Get("uuid")
			_ = json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{
				"uuid": uuid, "title": map[string]string{"u-1": "Harga emas naik", "u-2": "Rupiah menguat"}[uuid],
				"thumbnail": "https://img.contoh/" + uuid + ".jpg", "publisher": map[string]string{"u-1": "ANTARA News", "u-2": "CNBC Indonesia"}[uuid],
				"published_at": "2026-11-14T10:00:00.000Z", "original_url": "https://berita.contoh/" + uuid,
				"incipit": "Pembuka singkat...", "body": body,
			}})
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
}

func TestFetchFreeNewsSavesAnExcerptWithTheSourceLink(t *testing.T) {
	user := freeNewsTestDB(t)
	long := "Harga emas naik " + strings.Repeat("Kalimat isi berita yang cukup panjang untuk diuji. ", 30)
	srv := freeNewsServer(t, long)
	defer srv.Close()

	var result FetchResult
	fetchFreeNews(srv.Client(), srv.URL, "kunci-uji", user, &result, 0)
	if result.Fetched != 2 || result.Saved != 2 || result.Errors != 0 {
		t.Fatalf("result = %+v, want 2 fetched, 2 saved", result)
	}
	var saved []models.News
	database.DB.Preload("Category").Preload("Images").Order("source_url").Find(&saved)
	n := saved[0]
	if n.Category.Name != "EKONOMI" || n.Status != "published" || n.Source != "ANTARA News" || n.SourceURL != "https://berita.contoh/u-1" {
		t.Errorf("saved news = category %q status %q source %q url %q", n.Category.Name, n.Status, n.Source, n.SourceURL)
	}
	if len(n.Images) != 1 || n.Images[0].ImagePath != "https://img.contoh/u-1.jpg" || n.PublishedAt == nil {
		t.Errorf("image or published date missing: %+v %v", n.Images, n.PublishedAt)
	}
	excerpt, link, found := strings.Cut(n.Content, "\n\nBaca selengkapnya di ")
	if !found || link != "ANTARA News: https://berita.contoh/u-1" {
		t.Fatalf("content has no publisher link: %q", n.Content)
	}
	if utf8.RuneCountInString(excerpt) > freeNewsExcerptRunes || !strings.HasSuffix(excerpt, ".") || strings.HasPrefix(excerpt, "Harga emas naik") {
		t.Errorf("excerpt not cut at a sentence within %d runes without the title: %q", freeNewsExcerptRunes, excerpt)
	}

	// The same articles again: skipped by source_url, nothing saved twice.
	var again FetchResult
	fetchFreeNews(srv.Client(), srv.URL, "kunci-uji", user, &again, 0)
	var count int64
	database.DB.Model(&models.News{}).Count(&count)
	if again.Saved != 0 || again.Skipped != 2 || count != 2 {
		t.Errorf("second run = %+v, %d news saved, want 0 saved, 2 skipped, 2 news", again, count)
	}
}

func TestFetchFreeNewsWithAWrongKeyFailsWithoutSaving(t *testing.T) {
	user := freeNewsTestDB(t)
	srv := freeNewsServer(t, "isi")
	defer srv.Close()
	var result FetchResult
	fetchFreeNews(srv.Client(), srv.URL, "kunci-salah", user, &result, 0)
	if result.Fetched != 0 || result.Saved != 0 || result.Errors != len(freeNewsTopics) {
		t.Fatalf("result = %+v, want 0 fetched and one error per topic", result)
	}
}

func TestNewsExcerpt(t *testing.T) {
	// Limit 22 runes: "Kalimat satu. Kalimat dua." is 26 runes, so it is cut after the first sentence.
	for _, tc := range []struct{ title, body, want string }{
		{"Judul", "Judul Kalimat satu. Dua.", "Kalimat satu. Dua."},
		{"Judul", "Judul Kalimat satu. Kalimat dua.", "Kalimat satu."},
		{"", "Kalimat satu. Kalimat dua yang panjang sekali.", "Kalimat satu."},
		{"", strings.Repeat("kata ", 10), "kata kata kata kata…"},
		{"", "  Pendek   saja  ", "Pendek saja"},
	} {
		if got := newsExcerpt(tc.title, tc.body, 22); got != tc.want {
			t.Errorf("newsExcerpt(%q, %q) = %q, want %q", tc.title, tc.body, got, tc.want)
		}
	}
}

func TestNewsSourceOrder(t *testing.T) {
	for _, tc := range []struct {
		primary string
		hasKey  bool
		want    string
	}{
		{"", true, "freenewsapi,berita-indo"},
		{"freenewsapi", true, "freenewsapi,berita-indo"},
		{"Berita-Indo", true, "berita-indo,freenewsapi"},
		{"freenewsapi", false, "berita-indo"},
	} {
		if got := strings.Join(newsSourceOrder(tc.primary, tc.hasKey), ","); got != tc.want {
			t.Errorf("newsSourceOrder(%q, %v) = %s, want %s", tc.primary, tc.hasKey, got, tc.want)
		}
	}
}

// Owner 2026-11-14: the two sources back each other up. A source that fails completely hands over to the other; one
// that read articles but saved none (all saved already) does not.
func TestFetchWithFallback(t *testing.T) {
	var ran []string
	source := func(name string, r FetchResult) func(*FetchResult) {
		return func(out *FetchResult) { ran = append(ran, name); *out = r }
	}
	down := FetchResult{Errors: 7}
	ok := FetchResult{Fetched: 10, Saved: 3}
	nothingNew := FetchResult{Fetched: 10, Skipped: 10}
	for _, tc := range []struct {
		name               string
		primary, secondary FetchResult
		wantRan            string
		want               FetchResult
	}{
		{"primary works", ok, down, "a", ok},
		{"primary down", down, ok, "a,b", ok},
		{"primary has nothing new", nothingNew, ok, "a", nothingNew},
		{"both down", down, down, "a,b", down},
	} {
		ran = nil
		got := fetchWithFallback([]string{"a", "b"}, map[string]func(*FetchResult){"a": source("a", tc.primary), "b": source("b", tc.secondary)})
		if strings.Join(ran, ",") != tc.wantRan || got != tc.want {
			t.Errorf("%s: ran %v, result %+v, want ran %s, result %+v", tc.name, ran, got, tc.wantRan, tc.want)
		}
	}
}

// The 2026-11-14 run saved one Kompas article twice: its URL came with and without "?open_from=…", and the source link
// line made the two texts differ. The duplicate check now ignores that line.
func TestDuplicateNewsIgnoresTheSourceLinkLine(t *testing.T) {
	freeNewsTestDB(t)
	saved := freeNewsContent("APBN 2026", "Pembuka artikel. Kalimat kedua.", "", "Kompas.id", "https://www.kompas.id/artikel/a")
	if err := database.DB.Create(&models.News{Title: "APBN 2026", Slug: "apbn", Content: saved, Status: "published", SourceURL: "https://www.kompas.id/artikel/a"}).Error; err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		content string
		want    bool
	}{
		{freeNewsContent("APBN 2026", "Pembuka artikel. Kalimat kedua.", "", "Kompas.id", "https://www.kompas.id/artikel/a?open_from=undefined_Page"), true},
		{freeNewsContent("APBN 2026", "Isi lain sama sekali.", "", "Kompas.id", "https://www.kompas.id/artikel/b"), false},
		{"Pembuka artikel. Kalimat kedua.", true},
	} {
		got, err := duplicateNews(database.DB, " apbn 2026 ", tc.content)
		if err != nil || got != tc.want {
			t.Errorf("duplicateNews(%q) = %v, err %v, want %v", tc.content, got, err, tc.want)
		}
	}
}
