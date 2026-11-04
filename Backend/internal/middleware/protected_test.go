package middleware

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

func setupProtectedTest(t *testing.T) (*fiber.App, *gorm.DB) {
	t.Helper()
	t.Setenv("JWT_SECRET", "test-secret-test-secret-test-secret-123")
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
	app := fiber.New()
	app.Get("/me", Protected(), func(c *fiber.Ctx) error {
		role, _ := c.Locals("role").(string)
		return c.SendString(role)
	})
	return app, db
}

func tokenFor(t *testing.T, userID uint, role string) string {
	t.Helper()
	tok, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID, "role": role, "exp": time.Now().Add(time.Hour).Unix(), "iat": time.Now().Unix(),
	}).SignedString(GetJWTSecret())
	if err != nil {
		t.Fatal(err)
	}
	return tok
}

func callMe(t *testing.T, app *fiber.App, token string) (int, string) {
	t.Helper()
	req := httptest.NewRequest("GET", "/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	buf := make([]byte, 64)
	n, _ := resp.Body.Read(buf)
	return resp.StatusCode, string(buf[:n])
}

// A token for a deleted user is rejected, and the role comes from the database
// rather than the 24-hour token (audit L2).
func TestProtectedRejectsDeletedUser(t *testing.T) {
	app, db := setupProtectedTest(t)
	u := models.User{Name: "Hilang", Email: "hilang@example.com", Role: "penulis"}
	db.Create(&u)
	token := tokenFor(t, u.ID, "penulis")
	db.Delete(&u)
	if code, _ := callMe(t, app, token); code != fiber.StatusUnauthorized {
		t.Fatalf("deleted user status = %d, want 401", code)
	}
}

func TestProtectedUsesCurrentRoleFromDatabase(t *testing.T) {
	app, db := setupProtectedTest(t)
	u := models.User{Name: "Turun", Email: "turun@example.com", Role: "admin"}
	db.Create(&u)
	token := tokenFor(t, u.ID, "admin")
	db.Model(&u).Update("role", "member")
	code, role := callMe(t, app, token)
	if code != 200 || role != "member" {
		t.Fatalf("status=%d role=%q, want 200 and member (role from DB)", code, role)
	}
}
