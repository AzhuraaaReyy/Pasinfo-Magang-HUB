package handlers

import (
	"net/http/httptest"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/services"
)

// Live wisata endpoints only serve published destinations (audit L15).
func TestWisataLiveIgnoresUnpublishedDestinations(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.Place{}, &models.Destination{}, &models.DestinationWeather{}); err != nil {
		t.Fatal(err)
	}
	p := models.Place{Name: "Tempat", Latitude: -7.6, Longitude: 112.9}
	db.Create(&p)
	db.Create(&models.Destination{PlaceID: p.ID, Name: "Draf", Slug: "draf", Status: "draft"})
	db.Create(&models.Destination{PlaceID: p.ID, Name: "Terbit", Slug: "terbit", Status: "published"})

	app := fiber.New()
	NewWisataLiveHandler(db, services.NewOpenWeatherClient(""), services.NewGoogleMapsClient("")).Register(app)
	for path, want := range map[string]int{
		"/wisata/draf/cuaca":                   404,
		"/wisata/draf/info-tempat":             404,
		"/wisata/rute?from=-7.6,112.9&to=draf": 404,
		// The old names dari and ke are no longer read (Owner 2026-11-11).
		"/wisata/rute?dari=-7.6,112.9&ke=terbit": 400,
		"/wisata/terbit/info-tempat":             200,
	} {
		resp, err := app.Test(httptest.NewRequest("GET", path, nil))
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != want {
			t.Errorf("%s status = %d, want %d", path, resp.StatusCode, want)
		}
	}
}
