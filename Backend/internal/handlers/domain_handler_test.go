package handlers

import (
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

// A database error must surface as 500, not as an empty 200 list (audit M8).
func TestDomainListReturns500OnDatabaseError(t *testing.T) {
	// Empty in-memory DB: the domain tables do not exist, so every query fails.
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	app := fiber.New()
	NewDomainHandler(db).Register(app)
	for _, path := range []string{"/kuliner", "/budaya", "/acara"} {
		resp, err := app.Test(httptest.NewRequest("GET", path, nil))
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != fiber.StatusInternalServerError {
			t.Errorf("%s status = %d, want 500", path, resp.StatusCode)
		}
	}
}

func TestDomainListReturnsPublishedRows(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.Place{}, &models.Culture{}); err != nil {
		t.Fatal(err)
	}
	db.Create(&models.Culture{Name: "Candi Jawi", Slug: "candi-jawi", Status: "published"})
	db.Create(&models.Culture{Name: "Draf", Slug: "draf", Status: "draft"})
	app := fiber.New()
	app.Get("/budaya", NewDomainHandler(db).list(&models.Culture{}, "cultures", "Place"))
	resp, err := app.Test(httptest.NewRequest("GET", "/budaya", nil))
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	var body struct {
		Cultures []struct {
			Slug string `json:"slug"`
		} `json:"cultures"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		t.Fatalf("decode: %v (%s)", err, raw)
	}
	if resp.StatusCode != 200 || len(body.Cultures) != 1 || body.Cultures[0].Slug != "candi-jawi" {
		t.Fatalf("status=%d body=%s; want 1 published culture", resp.StatusCode, raw)
	}
}
