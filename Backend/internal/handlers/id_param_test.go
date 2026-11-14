package handlers

import (
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gofiber/fiber/v2"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

// injectedIDs were SQL in the WHERE clause before idParam (P4-1, jobdesk 14 Nov): "(0)OR(1=1)" answered 200 on SQLite,
// "(0=1)OR(1=1)" on PostgreSQL, and a subquery could read the users table one yes/no question at a time.
var injectedIDs = []string{"(0)OR(1=1)", "(0=1)OR(1=1)", "(0)OR((SELECT(count(*))FROM(users))>0)", "0", "-1", "abc", "1.5"}

func TestNewsDetailRefusesAnIDThatIsNotANumber(t *testing.T) {
	app, ids := setupPublicNewsTest(t)
	if code := status(t, app, "GET", "/news/"+strconv.FormatUint(uint64(ids["published"]), 10)); code != 200 {
		t.Fatalf("published news by its id = %d, want 200", code)
	}
	for _, id := range injectedIDs {
		if code := status(t, app, "GET", "/news/"+id); code != 404 {
			t.Errorf("GET /news/%s = %d, want 404", id, code)
		}
	}
	var views int64
	database.DB.Model(&models.News{}).Where("id <> ?", ids["published"]).Select("coalesce(sum(views), 0)").Scan(&views)
	if views != 0 {
		t.Errorf("an injected id still counted %d views on another news", views)
	}
}

func TestDeleteAdRefusesAnIDThatIsNotANumber(t *testing.T) {
	setupNewsTest(t)
	if err := database.DB.AutoMigrate(&models.Ad{}); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"Iklan A", "Iklan B"} {
		if err := database.DB.Create(&models.Ad{Title: name}).Error; err != nil {
			t.Fatal(err)
		}
	}
	app := fiber.New()
	app.Delete("/ads/:id", func(c *fiber.Ctx) error { c.Locals("role", "admin"); return c.Next() }, DeleteAd)
	for _, id := range []string{"(1=1)", "(0)OR(1=1)", "abc"} {
		if code := status(t, app, "DELETE", "/ads/"+id); code != 404 {
			t.Errorf("DELETE /ads/%s = %d, want 404", id, code)
		}
	}
	var left int64
	database.DB.Model(&models.Ad{}).Count(&left)
	if left != 2 {
		t.Fatalf("ads left = %d, want 2: an injected id deleted ads", left)
	}
}

func status(t *testing.T, app *fiber.App, method, path string) int {
	t.Helper()
	res, err := app.Test(httptest.NewRequest(method, path, nil), -1)
	if err != nil {
		t.Fatal(err)
	}
	return res.StatusCode
}
