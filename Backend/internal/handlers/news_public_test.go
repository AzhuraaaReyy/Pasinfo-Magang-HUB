package handlers

import (
	"encoding/json"
	"io"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gofiber/fiber/v2"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

// Public news endpoints must only expose published articles (audit M3).
func setupPublicNewsTest(t *testing.T) (*fiber.App, map[string]uint) {
	t.Helper()
	env := setupNewsTest(t)
	ids := map[string]uint{"draft": env.writerArticleID, "pending": env.otherArticleID}
	for _, status := range []string{"revision", "published"} {
		n := models.News{Title: "Status " + status, Slug: "status-" + status, Content: "x", CategoryID: 1, AuthorID: env.writer.ID, Status: status, SourceURL: "manual-" + status}
		if err := database.DB.Create(&n).Error; err != nil {
			t.Fatal(err)
		}
		ids[status] = n.ID
	}
	app := fiber.New()
	app.Get("/news", GetNews)
	app.Get("/news/category/:category", GetNewsByCategory)
	app.Get("/news/:id", GetNewsDetail)
	return app, ids
}

func listedIDs(t *testing.T, app *fiber.App, path string) map[uint]bool {
	t.Helper()
	resp, err := app.Test(httptest.NewRequest("GET", path, nil))
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	var body struct {
		Data []struct {
			ID uint `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		t.Fatalf("decode %s: %v (%s)", path, err, raw)
	}
	out := map[uint]bool{}
	for _, d := range body.Data {
		out[d.ID] = true
	}
	return out
}

func TestPublicNewsListsOnlyPublished(t *testing.T) {
	app, ids := setupPublicNewsTest(t)
	for _, path := range []string{"/news", "/news/category/lokal"} {
		got := listedIDs(t, app, path)
		if !got[ids["published"]] {
			t.Errorf("%s: published article missing", path)
		}
		for _, status := range []string{"draft", "pending", "revision"} {
			if got[ids[status]] {
				t.Errorf("%s: %s article must not be public", path, status)
			}
		}
	}
}

func TestPublicNewsDetailHidesUnpublished(t *testing.T) {
	app, ids := setupPublicNewsTest(t)
	for status, want := range map[string]int{"draft": 404, "pending": 404, "revision": 404, "published": 200} {
		resp, err := app.Test(httptest.NewRequest("GET", "/news/"+strconv.Itoa(int(ids[status])), nil))
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != want {
			t.Errorf("%s detail status = %d, want %d", status, resp.StatusCode, want)
		}
	}
	var draft models.News
	database.DB.First(&draft, ids["draft"])
	if draft.Views != 0 {
		t.Fatalf("draft views = %d; reading an unpublished article must not count", draft.Views)
	}
}

// P4-2 (jobdesk 14 Nov, Owner): the public news routes answer in Indonesian, like the travel routes (before: "News not
// found", "Category not found").
func TestPublicNewsMessagesAreIndonesian(t *testing.T) {
	app, _ := setupPublicNewsTest(t)
	for path, want := range map[string]string{
		"/news/999999":             "Berita tidak ditemukan",
		"/news/bukan-angka":        "Berita tidak ditemukan",
		"/news/category/tidak-ada": "Kategori berita tidak ditemukan",
	} {
		resp, err := app.Test(httptest.NewRequest("GET", path, nil))
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(resp.Body)
		var body struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(raw, &body)
		if resp.StatusCode != 404 || body.Message != want {
			t.Errorf("GET %s = %d %q, want 404 %q", path, resp.StatusCode, body.Message, want)
		}
	}
}
