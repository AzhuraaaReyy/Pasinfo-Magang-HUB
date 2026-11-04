package handlers

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

// XP changes are applied with an atomic column update instead of reading the user
// and saving the whole row (audit L10: lost updates and overwritten columns).
func TestHistoryXPUsesAtomicUpdate(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.Category{}, &models.News{}, &models.History{}); err != nil {
		t.Fatal(err)
	}
	previous := database.DB
	database.DB = db
	t.Cleanup(func() { database.DB = previous })
	u := models.User{Name: "Pembaca", Email: "p@example.com", Role: "member", Password: "hash-asli"}
	db.Create(&u)
	db.Create(&models.News{Title: "A", Slug: "a", Content: "x", CategoryID: 1, AuthorID: u.ID, Status: "published", SourceURL: "a"})

	var fullRowSaves int
	db.Callback().Update().Before("gorm:update").Register("detect_full_save", func(tx *gorm.DB) {
		// Save(&user) passes the whole struct; an atomic update passes a single column value
		if _, whole := tx.Statement.Dest.(*models.User); whole {
			fullRowSaves++
		}
	})

	app := fiber.New()
	as := func(c *fiber.Ctx) error {
		c.Locals("user_id", float64(u.ID))
		c.Locals("role", "member")
		return c.Next()
	}
	app.Post("/histories", as, CreateHistory)
	app.Delete("/histories", as, DeleteHistory)
	post := func(body string) {
		req := httptest.NewRequest("POST", "/histories", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if _, err := app.Test(req); err != nil {
			t.Fatal(err)
		}
	}
	post(`{"news_id":1,"activity_type":"read"}`)
	post(`{"news_id":1,"activity_type":"bookmark"}`)
	if _, err := app.Test(httptest.NewRequest("DELETE", "/histories?news_id=1&activity_type=bookmark", nil)); err != nil {
		t.Fatal(err)
	}
	if _, err := app.Test(httptest.NewRequest("DELETE", "/histories?news_id=1&activity_type=read", nil)); err != nil {
		t.Fatal(err)
	}

	var got models.User
	db.First(&got, u.ID)
	if got.TotalXP != 10 {
		t.Fatalf("total_xp = %d, want 10 (read +10, bookmark +20, bookmark removed -20)", got.TotalXP)
	}
	if got.Password != "hash-asli" {
		t.Fatalf("password column was overwritten: %q", got.Password)
	}
	if fullRowSaves != 0 {
		t.Fatalf("user row saved in full %d time(s); want only total_xp updates", fullRowSaves)
	}
}
