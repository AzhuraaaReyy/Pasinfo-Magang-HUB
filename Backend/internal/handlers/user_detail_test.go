package handlers

import (
	"fmt"
	"net/http/httptest"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

func TestGetUserDetailAccess(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.User{}); err != nil {
		t.Fatal(err)
	}
	previous := database.DB
	database.DB = db
	t.Cleanup(func() { database.DB = previous })

	users := map[string]*models.User{
		"member": {Name: "Member", Email: "m@example.com", Role: "member"},
		"target": {Name: "Target", Email: "t@example.com", Role: "member", Phone: "0800", Alamat: "Jl. Contoh"},
		"editor": {Name: "Editor", Email: "e@example.com", Role: "editor"},
		"admin":  {Name: "Admin", Email: "a@example.com", Role: "admin"},
	}
	for _, u := range users {
		if err := db.Create(u).Error; err != nil {
			t.Fatal(err)
		}
	}

	cases := []struct {
		caller string
		target string
		want   int
	}{
		{"member", "target", fiber.StatusForbidden},
		{"member", "member", fiber.StatusOK},
		{"editor", "target", fiber.StatusOK},
		{"admin", "target", fiber.StatusOK},
	}
	for _, tc := range cases {
		t.Run(tc.caller+"->"+tc.target, func(t *testing.T) {
			caller := users[tc.caller]
			app := fiber.New()
			app.Get("/users/:id", func(c *fiber.Ctx) error {
				c.Locals("user_id", float64(caller.ID))
				c.Locals("role", caller.Role)
				return c.Next()
			}, GetUserDetail)
			resp, err := app.Test(httptest.NewRequest("GET", fmt.Sprintf("/users/%d", users[tc.target].ID), nil))
			if err != nil {
				t.Fatal(err)
			}
			if resp.StatusCode != tc.want {
				t.Fatalf("status = %d, want %d", resp.StatusCode, tc.want)
			}
		})
	}
}
