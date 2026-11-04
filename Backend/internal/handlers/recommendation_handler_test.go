package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
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
