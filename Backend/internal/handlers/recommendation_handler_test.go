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

// Jobdesk 9 Nov: GET /rekomendasi validates its input before any embedding call, reports a provider failure as 503,
// and exists only when the text search is wired.
func TestTextRecommendationValidatesAndReportsProviderFailure(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	app := fiber.New()
	h := NewRecommendationHandler(services.NewRecommender(db))
	h.Search, h.LLM = services.NewRetriever(db), failingChatProvider{err: errors.New("provider down")}
	h.Register(app)
	long := strings.Repeat("a", textQueryMaxRunes+1)
	for _, tc := range []struct {
		url  string
		code int
	}{
		{"/rekomendasi", 400},
		{"/rekomendasi?q=%20%20", 400},
		{"/rekomendasi?q=" + long, 400},
		{"/rekomendasi?q=pantai&limit=0", 400},
		{"/rekomendasi?q=pantai&limit=13", 400},
		{"/rekomendasi?q=pantai&domain=wisata,berita", 400},
		{"/rekomendasi?q=pantai&zona=Pasuruan%20Tengah", 400},
		{"/rekomendasi?q=pantai&domain=wisata,kuliner&kategori=Wisata%20Alam", 400},
		{"/rekomendasi?q=pantai&domain=kuliner&kategori=Wisata%20Alam", 400},
		{"/rekomendasi?q=pantai&domain=wisata", 503},
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
	if resp, _ := plain.Test(httptest.NewRequest("GET", "/rekomendasi?q=pantai", nil)); resp.StatusCode != 404 {
		t.Fatalf("route without search: status %d, want 404", resp.StatusCode)
	}
}
