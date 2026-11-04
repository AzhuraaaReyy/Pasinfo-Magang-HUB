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

func setupUserAdminTest(t *testing.T) (*fiber.App, models.User) {
	t.Helper()
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
	admin := models.User{Name: "Admin", Email: "admin@example.com", Role: "admin"}
	db.Create(&admin)
	db.Create(&models.User{Name: "Ada", Email: "ada@example.com", Role: "member"})
	app := fiber.New()
	as := func(c *fiber.Ctx) error {
		c.Locals("user_id", float64(admin.ID))
		c.Locals("role", "admin")
		return c.Next()
	}
	app.Post("/users", as, CreateUser)
	app.Put("/users/:id", as, UpdateUser)
	return app, admin
}

func send(t *testing.T, app *fiber.App, method, path, body string) int {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, 10000)
	if err != nil {
		t.Fatal(err)
	}
	return resp.StatusCode
}

// CreateUser validates role, email, and password (audit L8).
func TestCreateUserValidatesInput(t *testing.T) {
	app, _ := setupUserAdminTest(t)
	for name, body := range map[string]string{
		"invalid role":   `{"name":"X","email":"x@example.com","password":"rahasia123","role":"superadmin"}`,
		"invalid email":  `{"name":"X","email":"bukan-email","password":"rahasia123","role":"member"}`,
		"short password": `{"name":"X","email":"x@example.com","password":"123","role":"member"}`,
		"empty name":     `{"name":" ","email":"x@example.com","password":"rahasia123","role":"member"}`,
	} {
		if code := send(t, app, "POST", "/users", body); code < 400 || code >= 500 {
			t.Errorf("%s: status = %d, want 4xx", name, code)
		}
	}
	if code := send(t, app, "POST", "/users", `{"name":"Ada 2","email":"ada@example.com","password":"rahasia123","role":"member"}`); code != fiber.StatusConflict {
		t.Errorf("duplicate email status = %d, want 409", code)
	}
	if code := send(t, app, "POST", "/users", `{"name":"Valid","email":"valid@example.com","password":"rahasia123","role":"penulis"}`); code != fiber.StatusOK {
		t.Errorf("valid create status = %d, want 200", code)
	}
}

// Changing the email to one that is already used returns 409, not 500 (audit L9).
func TestUpdateUserDuplicateEmailConflict(t *testing.T) {
	app, admin := setupUserAdminTest(t)
	if code := send(t, app, "PUT", fmt.Sprintf("/users/%d", admin.ID), `{"email":"ada@example.com"}`); code != fiber.StatusConflict {
		t.Fatalf("duplicate email update status = %d, want 409", code)
	}
	if code := send(t, app, "PUT", fmt.Sprintf("/users/%d", admin.ID), `{"email":"bukan-email"}`); code != fiber.StatusUnprocessableEntity {
		t.Fatalf("invalid email update status = %d, want 422", code)
	}
}
