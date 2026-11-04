package handlers

import (
	"encoding/json"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

func forgotPassword(t *testing.T, email string) (int, string) {
	t.Helper()
	app := fiber.New()
	app.Post("/forgot-password", ForgotPassword)
	req := httptest.NewRequest("POST", "/forgot-password", strings.NewReader(`{"email":"`+email+`"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, 10000)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(resp.Body)
	var body struct {
		Message string `json:"message"`
	}
	_ = json.Unmarshal(raw, &body)
	return resp.StatusCode, body.Message
}

// forgot-password must not reveal whether an email is registered (audit L1).
func TestForgotPasswordSameResponseForUnknownEmail(t *testing.T) {
	setupAuthTestDB(t)
	database.DB.Create(&models.User{Name: "Ada", Email: "ada@example.com", Role: "member"})
	knownCode, knownMsg := forgotPassword(t, "ada@example.com")
	unknownCode, unknownMsg := forgotPassword(t, "tidakada@example.com")
	if knownCode != 200 || unknownCode != 200 || knownMsg != unknownMsg {
		t.Fatalf("known=(%d %q) unknown=(%d %q); want identical 200 responses", knownCode, knownMsg, unknownCode, unknownMsg)
	}
	var otps int64
	database.DB.Model(&models.VerifyOTP{}).Where("email = ?", "tidakada@example.com").Count(&otps)
	if otps != 0 {
		t.Fatalf("OTP created for an unregistered email (%d)", otps)
	}
}

// The dummy hash used for unknown emails must be a real bcrypt hash so the
// comparison costs the same time as for existing users (audit L1).
func TestLoginDummyHashIsValidBcrypt(t *testing.T) {
	if _, err := bcrypt.Cost(dummyPasswordHash()); err != nil {
		t.Fatalf("dummy hash is not a valid bcrypt hash: %v", err)
	}
}

// Passwords longer than bcrypt's 72-byte limit are rejected as input errors, not 500 (audit L6).
func TestPasswordLongerThan72BytesRejected(t *testing.T) {
	setupAuthTestDB(t)
	long := strings.Repeat("a", 73)
	createTestOTP(t, "panjang@example.com", "111111")
	if code := postJSON(t, authTestApp(), "/register", `{"name":"P","email":"panjang@example.com","password":"`+long+`","otp":"111111"}`); code == fiber.StatusInternalServerError || code < 400 {
		t.Fatalf("register with 73-byte password status = %d, want 4xx", code)
	}
	database.DB.Create(&models.User{Name: "R", Email: "reset@example.com", Role: "member"})
	createTestOTP(t, "reset@example.com", "222222")
	if code := postJSON(t, authTestApp(), "/reset-password", `{"email":"reset@example.com","otp":"222222","password":"`+long+`"}`); code != fiber.StatusBadRequest {
		t.Fatalf("reset with 73-byte password status = %d, want 400", code)
	}
}
