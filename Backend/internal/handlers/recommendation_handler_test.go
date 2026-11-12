package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/services"
)

func recommendationTestApp(t *testing.T) (*fiber.App, *gorm.DB) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.Region{}, &models.TravelCategory{}, &models.Place{}, &models.Destination{}, &models.Culinary{}, &models.Culture{},
		&models.Verification{}, &models.TravelSource{}, &models.Sourceable{}, &models.Media{}, &models.CulinaryMenu{}, &models.DestinationPrice{},
		&models.Facility{}, &models.DestinationWeather{}, &models.OpeningHour{}); err != nil {
		t.Fatal(err)
	}
	place := models.Place{Name: "P", District: "Bangil"}
	db.Create(&place)
	db.Create(&models.Destination{Name: "Asal", Slug: "asal", PlaceID: place.ID, Status: "published"})
	db.Create(&models.Destination{Name: "Lain", Slug: "lain", PlaceID: place.ID, Status: "published"})
	rec := services.NewRecommender(db)
	rec.Similar = func(context.Context, string, int64, string, int) (map[int64]float64, error) {
		return map[int64]float64{2: 0.5}, nil
	}
	app := fiber.New()
	NewRecommendationHandler(rec).Register(app)
	return app, db
}

func TestRecommendationEndpointValidatesAndAnswers(t *testing.T) {
	app, _ := recommendationTestApp(t)
	for path, want := range map[string]int{
		"/wisata/asal/rekomendasi":                200,
		"/wisata/asal/rekomendasi?domain=kuliner": 200,
		"/wisata/asal/rekomendasi?limit=13":       400,
		"/wisata/asal/rekomendasi?limit=0":        400,
		"/wisata/asal/rekomendasi?limit=abc":      400, // jobdesk 10 Nov point 5: not silently the default
		"/wisata/asal/rekomendasi?limit=1.5":      400,
		"/wisata/asal/rekomendasi?limit=2":        200,
		"/wisata/asal/rekomendasi?domain=Kuliner": 200, // any letter case, like /recommendations/travel
		"/wisata/asal/rekomendasi?domain=event":   400,
		"/wisata/asal/rekomendasi?domain=berita":  400,
		"/news/1/rekomendasi?domain=wisata":       400,
		"/wisata/tidak-ada/rekomendasi":           404,
	} {
		resp, err := app.Test(httptest.NewRequest("GET", path, nil))
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != want {
			raw, _ := io.ReadAll(resp.Body)
			t.Errorf("%s = %d %s, want %d", path, resp.StatusCode, raw, want)
		}
	}
	resp, _ := app.Test(httptest.NewRequest("GET", "/wisata/asal/rekomendasi", nil))
	var body struct {
		Success         bool                      `json:"success"`
		Domain          string                    `json:"domain"`
		Recommendations []services.Recommendation `json:"recommendations"`
	}
	raw, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(raw, &body); err != nil || !body.Success || body.Domain != "wisata" || len(body.Recommendations) != 1 || body.Recommendations[0].Name != "Lain" {
		t.Fatalf("body = %s (%v)", raw, err)
	}
}

// Tahap B (Owner 2026-11-03): a detail page view is counted in the GET detail.
func TestDetailCountsViews(t *testing.T) {
	_, db := recommendationTestApp(t)
	app := fiber.New()
	NewDomainHandler(db).Register(app)
	NewWisataHandler(db).Register(app)
	db.Create(&models.Culinary{Name: "Nasi", Slug: "nasi", Status: "published"})
	for i := 0; i < 2; i++ {
		for _, path := range []string{"/kuliner/nasi", "/wisata/asal"} {
			if resp, err := app.Test(httptest.NewRequest("GET", path, nil)); err != nil || resp.StatusCode != 200 {
				t.Fatalf("%s: %v %v", path, resp.StatusCode, err)
			}
		}
	}
	var culinary models.Culinary
	var destination models.Destination
	db.Where("slug = ?", "nasi").First(&culinary)
	db.Where("slug = ?", "asal").First(&destination)
	if culinary.Views != 2 || destination.Views != 2 {
		t.Fatalf("views culinary=%d destination=%d, want 2", culinary.Views, destination.Views)
	}
}

// Owner 2026-11-10: a missing or unpublished travel item answers 404 with a polite Indonesian message.
func TestDomainDetailNotFoundIsIndonesian(t *testing.T) {
	_, db := recommendationTestApp(t)
	if err := db.AutoMigrate(&models.Event{}, &models.EventOccurrence{}, &models.EventTicket{}); err != nil {
		t.Fatal(err)
	}
	db.Create(&models.Culinary{Name: "Draf", Slug: "draf", Status: "draft"})
	app := fiber.New()
	NewDomainHandler(db).Register(app)
	NewWisataHandler(db).Register(app)
	for path, want := range map[string]string{
		"/kuliner/draf":      "Kuliner tidak ditemukan",
		"/kuliner/tidak-ada": "Kuliner tidak ditemukan",
		"/budaya/tidak-ada":  "Budaya tidak ditemukan",
		"/acara/tidak-ada":   "Acara tidak ditemukan",
		"/wisata/tidak-ada":  "Destinasi tidak ditemukan",
	} {
		resp, err := app.Test(httptest.NewRequest("GET", path, nil))
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(resp.Body)
		var body map[string]any
		if json.Unmarshal(raw, &body); resp.StatusCode != 404 || body["message"] != want {
			t.Errorf("%s = %d %s, want 404 %q", path, resp.StatusCode, raw, want)
		}
	}
}

// Jobdesk 9 Nov: GET /recommendations/travel (path of jobdesk 10 Nov) validates its input before any embedding call, reports a provider failure as 503,
// and exists only when the text search is wired.
func TestTextRecommendationValidatesAndReportsProviderFailure(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.TravelCategory{}, &models.Category{}, &models.News{}); err != nil {
		t.Fatal(err)
	}
	db.Create(&models.TravelCategory{Name: "Wisata Alam"})
	db.Create(&models.Category{Name: "TEKNOLOGI", Slug: "teknologi"})
	app := fiber.New()
	h := NewRecommendationHandler(services.NewRecommender(db))
	h.Search, h.LLM = services.NewRetriever(db), failingChatProvider{err: errors.New("provider down")}
	h.Register(app)
	long := strings.Repeat("a", textQueryMaxRunes+1)
	for _, tc := range []struct {
		url  string
		code int
	}{
		{travelRecommendationPath, 400},
		{travelRecommendationPath + "?query=%20%20", 400},
		{travelRecommendationPath + "?query=" + long, 400},
		{travelRecommendationPath + "?query=pantai&limit=0", 400},
		{travelRecommendationPath + "?query=pantai&limit=13", 400},
		{travelRecommendationPath + "?query=pantai&domain=wisata,berita", 400},
		{travelRecommendationPath + "?query=pantai&zone=Pasuruan%20Tengah", 400},
		{travelRecommendationPath + "?query=pantai&domain=wisata,kuliner&category=Wisata%20Alam", 400},
		{travelRecommendationPath + "?query=pantai&domain=kuliner&category=Wisata%20Alam", 400},
		{travelRecommendationPath + "?query=pantai&domain=wisata", 503},
		// Jobdesk 10 Nov point 5 (Owner): a strict limit; domain, zona, and a destination category in any letter case
		// (503 = valid, it reached the provider); no "event" alias; an unknown kecamatan or destination category is refused.
		{travelRecommendationPath + "?query=pantai&limit=abc", 400},
		{travelRecommendationPath + "?query=pantai&limit=1.5", 400},
		{travelRecommendationPath + "?query=pantai&domain=WISATA&zone=kota%20pasuruan", 503},
		{travelRecommendationPath + "?query=pantai&domain=event", 400},
		{travelRecommendationPath + "?query=pantai&district=Bandung", 400},
		{travelRecommendationPath + "?query=pantai&district=grati", 503},
		{travelRecommendationPath + "?query=pantai&domain=wisata&category=Pizza", 400},
		{travelRecommendationPath + "?query=pantai&domain=wisata&category=wisata%20alam", 503},
		// The 2026-11-09 path was replaced by the jobdesk 10 Nov path, not kept as a second one.
		{"/rekomendasi?query=pantai", 404},
		// Jobdesk 11 Nov point 2: GET /recommendations/news validates like the travel route before any embedding call;
		// a news category in any letter case is valid (503 = it reached the provider).
		{newsRecommendationPath, 400},
		{newsRecommendationPath + "?query=%20", 400},
		{newsRecommendationPath + "?query=" + long, 400},
		{newsRecommendationPath + "?query=hp&limit=0", 400},
		{newsRecommendationPath + "?query=hp&limit=13", 400},
		{newsRecommendationPath + "?query=hp&limit=abc", 400},
		{newsRecommendationPath + "?query=hp&category=gosip", 400},
		{newsRecommendationPath + "?query=hp", 503},
		{newsRecommendationPath + "?query=hp&category=TEKNOLOGI&limit=12", 503},
		// Jobdesk 11 Nov point 3, P3-1 (Owner option A): at least 2 letters or digits in any script; punctuation and emoji
		// do not count. 503 = valid, it reached the provider. The travel route shares textQuery; it is checked below with the
		// message, since its rate limit (20 per minute) is already used by the cases above.
		{newsRecommendationPath + "?query=a", 400},
		{newsRecommendationPath + "?query=%20a%20", 400},
		{newsRecommendationPath + "?query=%3F%3F%3F", 400},
		{newsRecommendationPath + "?query=%F0%9F%98%80%F0%9F%98%80", 400},
		{newsRecommendationPath + "?query=a.", 400},
		{newsRecommendationPath + "?query=AI", 503},
		{newsRecommendationPath + "?query=5G", 503},
		{newsRecommendationPath + "?query=%C3%A9t", 503},
	} {
		resp, err := app.Test(httptest.NewRequest("GET", tc.url, nil))
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != tc.code {
			body, _ := io.ReadAll(resp.Body)
			t.Fatalf("%s: status %d, want %d (%s)", tc.url, resp.StatusCode, tc.code, body)
		}
	}
	plain := fiber.New()
	NewRecommendationHandler(services.NewRecommender(db)).Register(plain)
	for _, path := range []string{travelRecommendationPath, newsRecommendationPath} {
		if resp, _ := plain.Test(httptest.NewRequest("GET", path+"?query=pantai", nil)); resp.StatusCode != 404 {
			t.Fatalf("%s without search: status %d, want 404", path, resp.StatusCode)
		}
	}
	// A query without 2 letters or digits gets its own message (P3-1).
	for _, path := range []string{travelRecommendationPath, newsRecommendationPath} {
		resp, _ := app.Test(httptest.NewRequest("GET", path+"?query=a", nil))
		raw, _ := io.ReadAll(resp.Body)
		var body map[string]any
		if json.Unmarshal(raw, &body); body["success"] != false || body["message"] != "query minimal berisi 2 huruf atau angka" {
			t.Fatalf("%s short query body = %s", path, raw)
		}
	}
	// An unknown news category names the allowed ones, in Indonesian.
	resp, _ := app.Test(httptest.NewRequest("GET", newsRecommendationPath+"?query=hp&category=gosip", nil))
	raw, _ := io.ReadAll(resp.Body)
	var body map[string]any
	if json.Unmarshal(raw, &body); body["success"] != false || body["message"] != "category harus salah satu dari: teknologi" {
		t.Fatalf("unknown category body = %s", raw)
	}
}

// Jobdesk 11 Nov point 4 (Owner P4-1 option B, P4-3): both text routes take query, category, limit, and offset with
// offset + limit at most 48; the old names q and kategori are no longer read. A fresh app keeps these requests under the
// per-route rate limit (20 per minute) the test above already uses. 503 = valid, it reached the provider.
func TestTextRecommendationOffsetAndParameterNames(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.TravelCategory{}, &models.Category{}, &models.News{}); err != nil {
		t.Fatal(err)
	}
	app := fiber.New()
	h := NewRecommendationHandler(services.NewRecommender(db))
	h.Search, h.LLM = services.NewRetriever(db), failingChatProvider{err: errors.New("provider down")}
	h.Register(app)
	for _, path := range []string{travelRecommendationPath, newsRecommendationPath} {
		for _, tc := range []struct {
			query string
			code  int
		}{
			{"?query=pantai&offset=-1", 400},
			{"?query=pantai&offset=abc", 400},
			{"?query=pantai&offset=1.5", 400},
			{"?query=pantai&limit=12&offset=37", 400},
			{"?query=pantai&offset=43", 400},
			{"?query=pantai&limit=12&offset=36", 503},
			{"?query=pantai&offset=42", 503},
			{"?query=pantai&offset=", 503},
			{"?q=pantai", 400},
		} {
			resp, err := app.Test(httptest.NewRequest("GET", path+tc.query, nil))
			if err != nil {
				t.Fatal(err)
			}
			if resp.StatusCode != tc.code {
				body, _ := io.ReadAll(resp.Body)
				t.Fatalf("%s%s: status %d, want %d (%s)", path, tc.query, resp.StatusCode, tc.code, body)
			}
		}
		resp, _ := app.Test(httptest.NewRequest("GET", path+"?query=pantai&offset=60", nil))
		raw, _ := io.ReadAll(resp.Body)
		var body map[string]any
		if json.Unmarshal(raw, &body); body["message"] != "offset harus 0 atau lebih, dan offset + limit paling banyak 48" {
			t.Fatalf("%s offset body = %s", path, raw)
		}
	}
	// Owner 2026-11-11 (G1): the travel filters are zone and district; the old zona and kecamatan are no longer read, so a
	// bad value there is not refused (503 = it reached the provider), and the messages name the new parameters.
	for _, tc := range []struct {
		query, message string
		code           int
	}{
		{"?query=pantai&zona=Pasuruan%20Tengah", "", 503},
		{"?query=pantai&kecamatan=Bandung", "", 503},
		{"?query=pantai&zone=Pasuruan%20Tengah", "zone harus Kota Pasuruan, Pasuruan Barat, Pasuruan Timur, Pasuruan Utara, atau Pasuruan Selatan", 400},
		{"?query=pantai&district=Bandung", "district tidak dikenal, isi kecamatan di Kota atau Kabupaten Pasuruan", 400},
	} {
		resp, _ := app.Test(httptest.NewRequest("GET", travelRecommendationPath+tc.query, nil))
		raw, _ := io.ReadAll(resp.Body)
		var body map[string]any
		json.Unmarshal(raw, &body)
		if resp.StatusCode != tc.code || (tc.message != "" && body["message"] != tc.message) {
			t.Fatalf("%s: status %d body %s, want %d %q", tc.query, resp.StatusCode, raw, tc.code, tc.message)
		}
	}
}

func TestPageCutsTheWindow(t *testing.T) {
	cards := make([]services.Recommendation, 13)
	for i := range cards {
		cards[i].Name = string(rune('a' + i))
	}
	for _, tc := range []struct {
		n, offset, limit int
		want             string
		more             bool
	}{
		{13, 0, 6, "abcdef", true},
		{13, 6, 6, "ghijkl", true},
		{12, 6, 6, "ghijkl", false},
		{13, 12, 6, "m", false},
		{13, 20, 6, "", false},
		{0, 0, 6, "", false},
		// The last page of the window has no next page, even when more cards were built.
		{49, 42, 6, "", false},
	} {
		in := cards
		if tc.n <= len(cards) {
			in = cards[:tc.n]
		} else {
			in = make([]services.Recommendation, tc.n)
		}
		got, info := page(in, tc.offset, tc.limit)
		names := ""
		for _, c := range got {
			names += c.Name
		}
		if tc.n <= len(cards) && names != tc.want || got == nil || info.HasMore != tc.more || info.Offset != tc.offset || info.Limit != tc.limit {
			t.Errorf("page(%d cards, %d, %d) = %q %+v (nil=%v), want %q has_more=%v", tc.n, tc.offset, tc.limit, names, info, got == nil, tc.want, tc.more)
		}
	}
}

// Jobdesk 12 Nov point 1 (P1-1, Owner option A): sort is relevance (empty, any letter case) or popular on the travel
// route; another value is refused before the embedding call (503 = it reached the provider). P1-4: the news route does
// not read sort.
func TestTravelRecommendationSort(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.TravelCategory{}, &models.Category{}, &models.News{}); err != nil {
		t.Fatal(err)
	}
	app := fiber.New()
	h := NewRecommendationHandler(services.NewRecommender(db))
	h.Search, h.LLM = services.NewRetriever(db), failingChatProvider{err: errors.New("provider down")}
	h.Register(app)
	for _, tc := range []struct {
		path string
		code int
	}{
		{travelRecommendationPath + "?query=pantai&sort=popular", 503},
		{travelRecommendationPath + "?query=pantai&sort=Popular", 503},
		{travelRecommendationPath + "?query=pantai&sort=relevance", 503},
		{travelRecommendationPath + "?query=pantai&sort=", 503},
		{travelRecommendationPath + "?query=pantai&domain=wisata&district=Prigen&sort=popular", 503},
		{travelRecommendationPath + "?query=pantai&sort=views", 400},
		{travelRecommendationPath + "?query=pantai&sort=populer", 400},
		{newsRecommendationPath + "?query=pantai&sort=views", 503},
	} {
		resp, err := app.Test(httptest.NewRequest("GET", tc.path, nil))
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != tc.code {
			t.Fatalf("%s: status %d, want %d (%s)", tc.path, resp.StatusCode, tc.code, raw)
		}
		var body map[string]any
		if json.Unmarshal(raw, &body); tc.code == 400 && body["message"] != "sort harus relevance atau popular" {
			t.Fatalf("%s: body %s", tc.path, raw)
		}
	}
}

// Jobdesk 12 Nov point 5 (P5-1, Owner option A): a first page without cards keeps 200, recommendations: [] and the
// other fields, and adds a message and suggestions built from the filters the visitor sent; a later page and a page
// with cards get none.
func TestEmptyRecommendationHint(t *testing.T) {
	body := func() fiber.Map { return fiber.Map{"success": true, "recommendations": []services.Recommendation{}} }
	got := withEmptyHint(body(), 0, 0, []string{"a"})
	if got["message"] != "Rekomendasi tidak ditemukan untuk pencarian ini." || strings.Join(got["suggestions"].([]string), "|") != "a" || got["success"] != true {
		t.Fatalf("empty first page = %+v", got)
	}
	for _, tc := range []struct{ cards, offset int }{{0, 6}, {3, 0}} {
		if got := withEmptyHint(body(), tc.cards, tc.offset, []string{"a"}); got["message"] != nil || got["suggestions"] != nil {
			t.Fatalf("cards %d offset %d = %+v, want no hint", tc.cards, tc.offset, got)
		}
	}
	query := "Coba gunakan kata pencarian lain yang lebih umum."
	for _, tc := range []struct {
		got  []string
		want []string
	}{
		{travelEmptySuggestions(nil, "", "", ""), []string{query}},
		{travelEmptySuggestions([]string{"kuliner"}, "", "Kraton", ""), []string{"Coba pilih kecamatan lain atau hapus filter kecamatan.", "Coba pilih jenis konten lain atau hapus filter jenis konten.", query}},
		{travelEmptySuggestions([]string{"wisata"}, "Wisata Alam", "", "Pasuruan Selatan"), []string{"Coba pilih wilayah lain atau hapus filter wilayah.", "Coba hapus filter kategori.", "Coba pilih jenis konten lain atau hapus filter jenis konten.", query}},
		{newsEmptySuggestions(""), []string{query}},
		{newsEmptySuggestions("lokal"), []string{"Coba pilih kategori berita lain atau hapus filter kategori.", query}},
	} {
		if strings.Join(tc.got, "|") != strings.Join(tc.want, "|") {
			t.Fatalf("suggestions = %q, want %q", tc.got, tc.want)
		}
	}
}
