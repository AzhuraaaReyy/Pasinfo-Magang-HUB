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
	if err := db.AutoMigrate(&models.TravelCategory{}); err != nil {
		t.Fatal(err)
	}
	db.Create(&models.TravelCategory{Name: "Wisata Alam"})
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
		{travelRecommendationPath + "?q=%20%20", 400},
		{travelRecommendationPath + "?q=" + long, 400},
		{travelRecommendationPath + "?q=pantai&limit=0", 400},
		{travelRecommendationPath + "?q=pantai&limit=13", 400},
		{travelRecommendationPath + "?q=pantai&domain=wisata,berita", 400},
		{travelRecommendationPath + "?q=pantai&zona=Pasuruan%20Tengah", 400},
		{travelRecommendationPath + "?q=pantai&domain=wisata,kuliner&kategori=Wisata%20Alam", 400},
		{travelRecommendationPath + "?q=pantai&domain=kuliner&kategori=Wisata%20Alam", 400},
		{travelRecommendationPath + "?q=pantai&domain=wisata", 503},
		// Jobdesk 10 Nov point 5 (Owner): a strict limit; domain, zona, and a destination category in any letter case
		// (503 = valid, it reached the provider); no "event" alias; an unknown kecamatan or destination category is refused.
		{travelRecommendationPath + "?q=pantai&limit=abc", 400},
		{travelRecommendationPath + "?q=pantai&limit=1.5", 400},
		{travelRecommendationPath + "?q=pantai&domain=WISATA&zona=kota%20pasuruan", 503},
		{travelRecommendationPath + "?q=pantai&domain=event", 400},
		{travelRecommendationPath + "?q=pantai&kecamatan=Bandung", 400},
		{travelRecommendationPath + "?q=pantai&kecamatan=grati", 503},
		{travelRecommendationPath + "?q=pantai&domain=wisata&kategori=Pizza", 400},
		{travelRecommendationPath + "?q=pantai&domain=wisata&kategori=wisata%20alam", 503},
		// The 2026-11-09 path was replaced by the jobdesk 10 Nov path, not kept as a second one.
		{"/rekomendasi?q=pantai", 404},
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
	if resp, _ := plain.Test(httptest.NewRequest("GET", travelRecommendationPath+"?q=pantai", nil)); resp.StatusCode != 404 {
		t.Fatalf("route without search: status %d, want 404", resp.StatusCode)
	}
}
