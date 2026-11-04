package handlers

import (
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

type newsTestEnv struct {
	app             *fiber.App
	writer, other   models.User
	editor          models.User
	writerArticleID uint
	otherArticleID  uint
}

func setupNewsTest(t *testing.T) newsTestEnv {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.Category{}, &models.News{}, &models.NewsImage{}, &models.Notification{}); err != nil {
		t.Fatal(err)
	}
	previous := database.DB
	database.DB = db
	t.Cleanup(func() { database.DB = previous })

	env := newsTestEnv{
		writer: models.User{Name: "Penulis A", Email: "a@example.com", Role: "penulis"},
		other:  models.User{Name: "Penulis B", Email: "b@example.com", Role: "penulis"},
		editor: models.User{Name: "Editor", Email: "e@example.com", Role: "editor"},
	}
	for _, u := range []*models.User{&env.writer, &env.other, &env.editor} {
		if err := db.Create(u).Error; err != nil {
			t.Fatal(err)
		}
	}
	db.Create(&models.Category{Name: "LOKAL", Slug: "lokal"})
	// Unique slugs: news.slug has a unique index (see audit note on empty slugs)
	mine := models.News{Title: "Milik A", Slug: "milik-a", Content: "x", CategoryID: 1, AuthorID: env.writer.ID, Status: "draft", SourceURL: "manual-a"}
	theirs := models.News{Title: "Milik B", Slug: "milik-b", Content: "x", CategoryID: 1, AuthorID: env.other.ID, Status: "pending", SourceURL: "manual-b"}
	db.Create(&mine)
	db.Create(&theirs)
	env.writerArticleID, env.otherArticleID = mine.ID, theirs.ID

	app := fiber.New()
	as := func(c *fiber.Ctx) error {
		var u models.User
		database.DB.Where("email = ?", c.Get("X-Test-User")).First(&u)
		c.Locals("user_id", float64(u.ID))
		c.Locals("role", u.Role)
		return c.Next()
	}
	app.Post("/news", as, CreateNews)
	app.Put("/news/:id/status", as, UpdateNewsStatus)
	app.Put("/news/:id", as, UpdateNews)
	env.app = app
	return env
}

func (e newsTestEnv) do(t *testing.T, method, path, user, body string) int {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User", user)
	resp, err := e.app.Test(req, 10000)
	if err != nil {
		t.Fatal(err)
	}
	return resp.StatusCode
}

func TestCreateNewsWriterCannotPublish(t *testing.T) {
	env := setupNewsTest(t)
	if s := env.do(t, "POST", "/news", "a@example.com", `{"title":"T","content":"C","category_id":1,"status":"published"}`); s != fiber.StatusForbidden {
		t.Fatalf("publish by writer status = %d, want 403", s)
	}
	if s := env.do(t, "POST", "/news", "a@example.com", `{"title":"T","content":"C","category_id":1,"status":"pending"}`); s != fiber.StatusCreated {
		t.Fatalf("pending by writer status = %d, want 201", s)
	}
}

func TestUpdateNewsWriterCannotPublish(t *testing.T) {
	env := setupNewsTest(t)
	path := fmt.Sprintf("/news/%d", env.writerArticleID)
	if s := env.do(t, "PUT", path, "a@example.com", `{"title":"T","content":"C","category_id":1,"status":"published"}`); s != fiber.StatusForbidden {
		t.Fatalf("publish by writer status = %d, want 403", s)
	}
	if s := env.do(t, "PUT", path, "a@example.com", `{"title":"T","content":"C","category_id":1,"status":"pending"}`); s != fiber.StatusOK {
		t.Fatalf("pending by writer status = %d, want 200", s)
	}
}

func TestUpdateNewsStatusRules(t *testing.T) {
	env := setupNewsTest(t)
	mine := fmt.Sprintf("/news/%d/status", env.writerArticleID)
	theirs := fmt.Sprintf("/news/%d/status", env.otherArticleID)
	cases := []struct {
		name, path, user, body string
		want                   int
	}{
		{"writer changes other writer's article", theirs, "a@example.com", `{"status":"draft"}`, fiber.StatusForbidden},
		{"writer publishes own article", mine, "a@example.com", `{"status":"published"}`, fiber.StatusForbidden},
		{"writer submits own article", mine, "a@example.com", `{"status":"pending"}`, fiber.StatusOK},
		{"editor publishes", theirs, "e@example.com", `{"status":"published"}`, fiber.StatusOK},
		{"unknown status", theirs, "e@example.com", `{"status":"hapus"}`, fiber.StatusBadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if s := env.do(t, "PUT", tc.path, tc.user, tc.body); s != tc.want {
				t.Fatalf("status = %d, want %d", s, tc.want)
			}
		})
	}
	var other models.News
	database.DB.First(&other, env.otherArticleID)
	if other.Status != "published" {
		t.Fatalf("other article status = %q; writer must not have changed it", other.Status)
	}
}

// P4-1 (jobdesk 3 Nov, 2026-11-03): every successful admin news write asks the AI corpus for an early refresh; a
// refused write does not.
func TestAdminNewsWritesRequestCorpusRefresh(t *testing.T) {
	env := setupNewsTest(t)
	if err := database.DB.AutoMigrate(&models.History{}); err != nil { // DeleteNews also removes histories
		t.Fatal(err)
	}
	env.app.Delete("/news/:id", func(c *fiber.Ctx) error {
		c.Locals("role", "admin")
		return DeleteNews(c)
	})
	calls := 0
	previous := requestCorpusRefresh
	requestCorpusRefresh = func() { calls++ }
	t.Cleanup(func() { requestCorpusRefresh = previous })
	steps := []struct {
		method, path, user, body string
		want                     int
		refresh                  bool
	}{
		{"PUT", fmt.Sprintf("/news/%d/status", env.otherArticleID), "a@example.com", `{"status":"draft"}`, fiber.StatusForbidden, false},
		{"POST", "/news", "a@example.com", `{"title":"T","content":"C","category_id":1,"status":"pending"}`, fiber.StatusCreated, true},
		{"PUT", fmt.Sprintf("/news/%d/status", env.otherArticleID), "e@example.com", `{"status":"published"}`, fiber.StatusOK, true},
		{"PUT", fmt.Sprintf("/news/%d", env.writerArticleID), "a@example.com", `{"title":"T2","content":"C","category_id":1,"status":"pending"}`, fiber.StatusOK, true},
		{"DELETE", fmt.Sprintf("/news/%d", env.otherArticleID), "e@example.com", ``, fiber.StatusOK, true},
	}
	for _, step := range steps {
		before := calls
		if s := env.do(t, step.method, step.path, step.user, step.body); s != step.want {
			t.Fatalf("%s %s = %d, want %d", step.method, step.path, s, step.want)
		}
		if got := calls > before; got != step.refresh {
			t.Fatalf("%s %s: refresh requested = %v, want %v", step.method, step.path, got, step.refresh)
		}
	}
}
