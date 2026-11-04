package handlers

import (
	"encoding/json"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

// Listing news resolves regency names with one query, not one per article (audit L7).
func TestGetNewsResolvesRegenciesInOneQuery(t *testing.T) {
	env := setupNewsTest(t)
	database.DB.AutoMigrate(&models.Regency{})
	database.DB.Create(&models.Regency{Code: "35.14", Name: "KABUPATEN PASURUAN"})
	database.DB.Create(&models.Regency{Code: "35.75", Name: "KOTA PASURUAN"})
	for i, code := range []string{"35.14", "35.75", "35.14", ""} {
		n := models.News{Title: "Kab " + code, Slug: "kab-" + string(rune('a'+i)), Content: "x", CategoryID: 1, AuthorID: env.writer.ID, Status: "published", SourceURL: "src-" + string(rune('a'+i)), RegencyID: code}
		if err := database.DB.Create(&n).Error; err != nil {
			t.Fatal(err)
		}
	}
	regencyQueries := 0
	database.DB.Callback().Query().After("gorm:query").Register("count_regencies", func(db *gorm.DB) {
		if strings.Contains(db.Statement.SQL.String(), "regencies") {
			regencyQueries++
		}
	})
	t.Cleanup(func() { database.DB.Callback().Query().Remove("count_regencies") })

	app := fiber.New()
	app.Get("/news", GetNews)
	resp, err := app.Test(httptest.NewRequest("GET", "/news", nil))
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	var body struct {
		Data []struct {
			Judul string `json:"judul"`
			Kota  string `json:"kota"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		t.Fatal(err)
	}
	if regencyQueries != 1 {
		t.Fatalf("regency queries = %d, want 1", regencyQueries)
	}
	for _, d := range body.Data {
		if d.Kota != "PASURUAN" {
			t.Errorf("%s kota = %q, want PASURUAN", d.Judul, d.Kota)
		}
	}
}
