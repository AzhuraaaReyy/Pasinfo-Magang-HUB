package handlers

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/utils"
)

// New articles get a unique slug derived from the title (audit N1: empty slugs
// collided with the unique index on news.slug).
func TestCreateNewsGeneratesUniqueSlugs(t *testing.T) {
	env := setupNewsTest(t)
	body := `{"title":"Festival Bromo 2026!","content":"x","category_id":1,"status":"draft"}`
	for i := 0; i < 2; i++ {
		if code := env.do(t, "POST", "/news", env.writer.Email, body); code != 201 {
			t.Fatalf("create #%d status = %d, want 201", i+1, code)
		}
	}
	var slugs []string
	database.DB.Model(&models.News{}).Where("title = ?", "Festival Bromo 2026!").Order("id").Pluck("slug", &slugs)
	if len(slugs) != 2 || slugs[0] != "festival-bromo-2026" || slugs[1] != "festival-bromo-2026-2" {
		t.Fatalf("slugs = %v, want [festival-bromo-2026 festival-bromo-2026-2]", slugs)
	}
}

func TestNewsSlugFromTitleFallback(t *testing.T) {
	if got := utils.NewsSlugBase("!!! ???"); got != "berita" {
		t.Fatalf("empty title slug = %q, want berita", got)
	}
	long := utils.NewsSlugBase(strings.Repeat("kata ", 100))
	if len(long) > 180 || strings.HasSuffix(long, "-") {
		t.Fatalf("long slug len=%d suffix=%q", len(long), long[len(long)-1:])
	}
}

// A token whose user no longer exists must not post as someone else (audit M12).
func TestCreateNewsRejectsUnknownTokenUser(t *testing.T) {
	env := setupNewsTest(t)
	app := fiber.New()
	app.Post("/news", func(c *fiber.Ctx) error {
		c.Locals("user_id", float64(9999))
		c.Locals("role", "penulis")
		return c.Next()
	}, CreateNews)
	req := httptest.NewRequest("POST", "/news", strings.NewReader(`{"title":"Yatim","content":"x","category_id":1}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}
	var count int64
	database.DB.Model(&models.News{}).Where("title = ?", "Yatim").Count(&count)
	if count != 0 {
		t.Fatalf("article was created for another user (%d rows)", count)
	}
	_ = env
}
