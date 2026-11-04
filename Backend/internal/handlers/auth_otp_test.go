package handlers

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

func setupAuthTestDB(t *testing.T) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.VerifyOTP{}); err != nil {
		t.Fatal(err)
	}
	previous := database.DB
	database.DB = db
	t.Cleanup(func() { database.DB = previous })
	resetOTPFailures("")
}

func createTestOTP(t *testing.T, email, code string) models.VerifyOTP {
	t.Helper()
	record := models.VerifyOTP{Email: email, OTP: code, ExpiresAt: time.Now().Add(5 * time.Minute)}
	if err := database.DB.Create(&record).Error; err != nil {
		t.Fatal(err)
	}
	return record
}

func authTestApp() *fiber.App {
	app := fiber.New()
	app.Post("/register", Register)
	app.Post("/verify-otp", VerifyOTP)
	app.Post("/reset-password", ResetPassword)
	return app
}

func postJSON(t *testing.T, app *fiber.App, path, body string) int {
	t.Helper()
	req := httptest.NewRequest("POST", path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, 10000)
	if err != nil {
		t.Fatal(err)
	}
	return resp.StatusCode
}

func countUsers(t *testing.T, email string) int64 {
	t.Helper()
	var n int64
	database.DB.Model(&models.User{}).Where("email = ?", email).Count(&n)
	return n
}

func TestRegisterRequiresOTP(t *testing.T) {
	setupAuthTestDB(t)
	createTestOTP(t, "baru@example.com", "123456")
	status := postJSON(t, authTestApp(), "/register", `{"name":"Baru","email":"baru@example.com","password":"rahasia123"}`)
	if status != fiber.StatusBadRequest {
		t.Fatalf("status = %d, want 400", status)
	}
	if countUsers(t, "baru@example.com") != 0 {
		t.Fatal("user must not be created without OTP")
	}
}

func TestRegisterWithValidOTP(t *testing.T) {
	setupAuthTestDB(t)
	record := createTestOTP(t, "penulis@example.com", "654321")
	status := postJSON(t, authTestApp(), "/register", `{"name":"Penulis","email":"penulis@example.com","password":"rahasia123","role":"penulis","otp":"654321"}`)
	if status != fiber.StatusCreated {
		t.Fatalf("status = %d, want 201", status)
	}
	var user models.User
	if err := database.DB.Where("email = ?", "penulis@example.com").First(&user).Error; err != nil {
		t.Fatal(err)
	}
	if user.Role != "penulis" {
		t.Fatalf("role = %q, want penulis (existing flow kept)", user.Role)
	}
	var stored models.VerifyOTP
	database.DB.First(&stored, record.ID)
	if !stored.IsUsed {
		t.Fatal("OTP must be marked as used after registration")
	}
}

func TestRegisterRejectsWrongOTP(t *testing.T) {
	setupAuthTestDB(t)
	createTestOTP(t, "salah@example.com", "111111")
	status := postJSON(t, authTestApp(), "/register", `{"name":"Salah","email":"salah@example.com","password":"rahasia123","otp":"999999"}`)
	if status != fiber.StatusBadRequest {
		t.Fatalf("status = %d, want 400", status)
	}
	if countUsers(t, "salah@example.com") != 0 {
		t.Fatal("user must not be created with a wrong OTP")
	}
}

func TestVerifyOTPLocksAfterMaxAttempts(t *testing.T) {
	setupAuthTestDB(t)
	createTestOTP(t, "target@example.com", "246810")
	app := authTestApp()
	for i := 0; i < maxOTPAttempts; i++ {
		postJSON(t, app, "/verify-otp", `{"email":"target@example.com","otp":"000000"}`)
	}
	if status := postJSON(t, app, "/verify-otp", `{"email":"target@example.com","otp":"246810"}`); status == fiber.StatusOK {
		t.Fatal("correct OTP must be rejected after too many failed attempts")
	}
}

func TestVerifyOTPDoesNotConsumeCode(t *testing.T) {
	setupAuthTestDB(t)
	createTestOTP(t, "alur@example.com", "135790")
	app := authTestApp()
	if status := postJSON(t, app, "/verify-otp", `{"email":"alur@example.com","otp":"135790"}`); status != fiber.StatusOK {
		t.Fatalf("verify status = %d, want 200", status)
	}
	if status := postJSON(t, app, "/register", `{"name":"Alur","email":"alur@example.com","password":"rahasia123","otp":"135790"}`); status != fiber.StatusCreated {
		t.Fatalf("register after verify status = %d, want 201 (verify-otp -> register flow)", status)
	}
}

func TestResetPasswordUsesOTPGuard(t *testing.T) {
	setupAuthTestDB(t)
	if err := database.DB.Create(&models.User{Name: "Lama", Email: "lama@example.com", Password: "x", Role: "member"}).Error; err != nil {
		t.Fatal(err)
	}
	createTestOTP(t, "lama@example.com", "975310")
	app := authTestApp()
	for i := 0; i < maxOTPAttempts; i++ {
		postJSON(t, app, "/reset-password", `{"email":"lama@example.com","otp":"000000","password":"barubaru123"}`)
	}
	if status := postJSON(t, app, "/reset-password", `{"email":"lama@example.com","otp":"975310","password":"barubaru123"}`); status == fiber.StatusOK {
		t.Fatal("reset with correct OTP must be rejected after too many failed attempts")
	}
}
