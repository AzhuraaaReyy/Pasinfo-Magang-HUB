package handlers

import (
	cryptorand "crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"math/big"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/middleware"
	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/utils"
)

// ---------------------------------------------------------------------------
// Input structs
// ---------------------------------------------------------------------------

type RegisterInput struct {
	Name       string `json:"name"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
	Password   string `json:"password"`
	Role       string `json:"role"`
	Provinsi   string `json:"provinsi"`
	KotaKab    string `json:"kota_kab"`
	Kecamatan  string `json:"kecamatan"`
	Kelurahan  string `json:"kelurahan"`
	Alamat     string `json:"alamat"`
	IsVerified int    `json:"is_verified"`
	OTP        string `json:"otp"` // code sent by /auth/send-register-otp
}

type LoginInput struct {
	Email        string `json:"email"`
	Password     string `json:"password"`
	ExpectedRole string `json:"expected_role"`
}

type ForgotPasswordInput struct {
	Email string `json:"email"`
}

type VerifyOTPInput struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

type ResetPasswordInput struct {
	Email    string `json:"email"`
	OTP      string `json:"otp"`
	Password string `json:"password"`
}

type SendRegisterOTPInput struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

func validateRegisterInput(input RegisterInput) string {
	if strings.TrimSpace(input.Name) == "" {
		return "Name is required"
	}
	if utf8.RuneCountInString(input.Name) > 100 {
		return "Name is too long (max 100 chars)"
	}
	if !isValidEmail(input.Email) {
		return "Invalid email address"
	}
	return validatePassword(input.Password)
}

// validatePassword enforces 8–72 bytes; bcrypt rejects passwords longer than 72 bytes.
func validatePassword(password string) string {
	if len(password) < 8 {
		return "Password must be at least 8 characters"
	}
	if len(password) > 72 {
		return "Password is too long (max 72 bytes)"
	}
	return ""
}

var (
	dummyHashOnce sync.Once
	dummyHash     []byte
)

// dummyPasswordHash is a real bcrypt hash (cost 12) compared when the email is
// unknown, so login takes the same time whether or not the account exists.
func dummyPasswordHash() []byte {
	dummyHashOnce.Do(func() {
		dummyHash, _ = bcrypt.GenerateFromPassword([]byte(randomHex(16)), 12)
	})
	return dummyHash
}

func isValidEmail(email string) bool {
	email = strings.TrimSpace(email)
	if len(email) == 0 || len(email) > 254 {
		return false
	}
	at := strings.LastIndex(email, "@")
	if at < 1 || at >= len(email)-1 {
		return false
	}
	domain := email[at+1:]
	return strings.Contains(domain, ".")
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

func Register(c *fiber.Ctx) error {
	var input RegisterInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Invalid request body",
		})
	}

	if msg := validateRegisterInput(input); msg != "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"success": false, "message": msg,
		})
	}

	// Sanitize strings
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	input.Phone = strings.TrimSpace(input.Phone)

	// Check for duplicate email
	var existing models.User
	if err := database.DB.Where("email = ?", input.Email).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false, "message": "Email already registered",
		})
	}

	// The email must be proven with the OTP sent by /auth/send-register-otp
	otp := strings.TrimSpace(input.OTP)
	if otp == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Kode OTP wajib diisi",
		})
	}
	if _, err := consumeOTP(input.Email, otp, true); err != nil {
		return otpErrorResponse(c, err)
	}

	// Use bcrypt cost 12 (higher than DefaultCost=10 for production hardening)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), 12)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Registration failed",
		})
	}

	role := "member"
	if input.Role == "penulis" {
		role = "penulis"
	}

	user := models.User{
		Name:       input.Name,
		Email:      input.Email,
		Phone:      input.Phone,
		Password:   string(hashedPassword),
		Role:       role,
		Provinsi:   input.Provinsi,
		KotaKab:    input.KotaKab,
		Kecamatan:  input.Kecamatan,
		Kelurahan:  input.Kelurahan,
		Alamat:     input.Alamat,
		IsVerified: 1, // OTP checked above
	}

	if err := database.DB.Create(&user).Error; err != nil {
		// Do not leak DB error details to client
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Registration failed",
		})
	}

	// Send Welcome Registration Notification Email asynchronously
	go func(toEmail, name, role string) {
		wibTime := utils.FormatWIB(time.Now())
		if err := utils.SendWelcomeRegistrationEmail(toEmail, name, role, wibTime); err != nil {
			log.Printf("[Email Error] Failed to send welcome registration email to %s: %v", toEmail, err)
		} else {
			log.Printf("[Email Success] Welcome registration email successfully sent to %s", toEmail)
		}
	}(user.Email, user.Name, user.Role)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "Registration successful",
		"data": fiber.Map{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

func Login(c *fiber.Ctx) error {
	var input LoginInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Invalid request body",
		})
	}

	input.Email = strings.ToLower(strings.TrimSpace(input.Email))

	if !isValidEmail(input.Email) || len(input.Password) == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false, "message": "Invalid credentials",
		})
	}

	var user models.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		// Constant-time response to prevent user enumeration
		_ = bcrypt.CompareHashAndPassword(dummyPasswordHash(), []byte(input.Password))
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false, "message": "Invalid credentials",
		})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"success": false, "message": "Invalid credentials",
		})
	}

	// Strict Role Check for specific login portals
	if input.ExpectedRole != "" && user.Role != input.ExpectedRole {
		roleTitleMap := map[string]string{
			"member":  "Member / Pembaca",
			"penulis": "Penulis",
			"editor":  "Editor",
			"admin":   "Administrator",
		}
		userRoleTitle := roleTitleMap[user.Role]
		if userRoleTitle == "" {
			userRoleTitle = user.Role
		}
		expectedRoleTitle := roleTitleMap[input.ExpectedRole]
		if expectedRoleTitle == "" {
			expectedRoleTitle = input.ExpectedRole
		}
		loginUrlMap := map[string]string{
			"member":  "/login",
			"penulis": "/login-penulis",
			"editor":  "/login-editor",
			"admin":   "/login-admin",
		}
		targetLoginURL := loginUrlMap[user.Role]

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Akses ditolak: Akun Anda terdaftar sebagai %s. Halaman ini khusus untuk %s. Silakan masuk melalui halaman login %s (%s).", userRoleTitle, expectedRoleTitle, userRoleTitle, targetLoginURL),
		})
	}

	// JWT with short expiry (24h) — implement refresh tokens for production
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
		"iat":     time.Now().Unix(),
	})

	t, err := token.SignedString(middleware.GetJWTSecret())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Authentication failed",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Login successful",
		"data": fiber.Map{
			"token": t,
			"user": fiber.Map{
				"id":          user.ID,
				"name":        user.Name,
				"email":       user.Email,
				"role":        user.Role,
				"photo":       user.Photo,
				"is_verified": user.IsVerified,
			},
		},
	})
}

// UploadPublicPrefix is the URL prefix of uploaded images; cmd/api serves it from
// UploadRootPath so the returned URLs point at the directory files are saved in.
const UploadPublicPrefix = "/uploads/images"

const defaultUploadDir = "/app/uploads/images"

// UploadRootPath returns the directory uploads are saved to (UPLOAD_DIR or the default).
func UploadRootPath(raw string) string {
	if raw == "" {
		return filepath.Clean(defaultUploadDir)
	}
	if root, err := filepath.Abs(filepath.Clean(raw)); err == nil {
		return root
	}
	return filepath.Clean(raw)
}

func resolveUploadDir(raw string) (string, error) {
	if strings.IndexByte(raw, 0) >= 0 {
		return "", fmt.Errorf("upload directory contains NUL byte")
	}
	if raw == "" {
		return filepath.Clean(defaultUploadDir), nil
	}
	if !filepath.IsAbs(raw) {
		return "", fmt.Errorf("upload directory must be absolute")
	}
	root, err := filepath.Abs(filepath.Clean(raw))
	if err != nil {
		return "", err
	}
	scope, err := os.OpenRoot(root)
	if err != nil {
		return "", fmt.Errorf("upload root unavailable: %w", err)
	}
	defer scope.Close()
	info, err := scope.Stat(".")
	if err != nil || !info.IsDir() {
		return "", fmt.Errorf("upload path is not a directory")
	}
	return root, nil
}

func uploadDestination(root, name string) (string, error) {
	if strings.IndexByte(root, 0) >= 0 || strings.IndexByte(name, 0) >= 0 || strings.ContainsAny(name, `/\\`) {
		return "", fmt.Errorf("invalid upload destination")
	}
	root, err := filepath.Abs(filepath.Clean(root))
	if err != nil {
		return "", err
	}
	dest, err := filepath.Abs(filepath.Join(root, name))
	if err != nil {
		return "", err
	}
	rel, err := filepath.Rel(root, dest)
	if err != nil || rel == "." || rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) || filepath.IsAbs(rel) {
		return "", fmt.Errorf("invalid upload destination")
	}
	return dest, nil
}

// ---------------------------------------------------------------------------
// UploadImage — secure file upload endpoint
// POST /api/v1/upload/image
// Accepts: multipart/form-data, field name: "image"
// Returns: { "success": true, "url": "/uploads/images/<safe-filename>" }
// ---------------------------------------------------------------------------

func UploadImage(c *fiber.Ctx) error {
	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Berkas gambar belum dipilih.",
		})
	}

	// Delegate to the security validator
	if err := validateImageFile(file); err != nil {
		return c.Status(err.(*fiber.Error).Code).JSON(fiber.Map{
			"success": false, "message": err.Error(),
		})
	}

	// Generate a safe, unique filename — never trust the client filename
	ext := strings.ToLower(filepath.Ext(file.Filename))
	safeName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), randomHex(8), ext)

	// Resolve upload directory — configurable via env
	uploadDir, err := resolveUploadDir(os.Getenv("UPLOAD_DIR"))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Gambar belum dapat disimpan. Silakan coba lagi.",
		})
	}
	if err := os.MkdirAll(uploadDir, 0750); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Gambar belum dapat disimpan. Silakan coba lagi.",
		})
	}

	// Construct the absolute destination path and verify it stays inside uploadDir
	destPath, err := uploadDestination(uploadDir, safeName)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Nama berkas tidak valid.",
		})
	}

	if err := c.SaveFile(file, destPath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Gambar gagal disimpan. Silakan coba lagi.",
		})
	}

	// Relative URL served from UploadRootPath by cmd/api (or by a reverse proxy)
	relURL := UploadPublicPrefix + "/" + safeName
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"url":     relURL,
	})
}

// validateImageFile performs multi-layer validation on a multipart file:
// 1. Size limit (5 MB)
// 2. Extension allowlist
// 3. Magic bytes MIME detection
func validateImageFile(fh *multipart.FileHeader) error {
	const maxSize = 5 * 1024 * 1024 // 5 MB

	if fh.Size > maxSize {
		return fiber.NewError(fiber.StatusRequestEntityTooLarge,
			"Ukuran gambar terlalu besar. Maksimal 5 MB.")
	}

	ext := strings.ToLower(filepath.Ext(fh.Filename))
	allowedExt := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowedExt[ext] {
		return fiber.NewError(fiber.StatusUnsupportedMediaType,
			"Format berkas tidak didukung. Gunakan jpg, jpeg, png, atau webp.")
	}

	// Magic bytes check — open and read first 512 bytes
	f, err := fh.Open()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Berkas gambar tidak dapat dibuka. Silakan coba lagi.")
	}
	defer f.Close()

	buf := make([]byte, 512)
	n, err := io.ReadFull(f, buf)
	if err != nil && err != io.ErrUnexpectedEOF {
		return fiber.NewError(fiber.StatusBadRequest, "Berkas gambar tidak dapat dibaca.")
	}

	detected := detectMIME(buf[:n])
	allowedMIME := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
	}
	if !allowedMIME[detected] {
		return fiber.NewError(fiber.StatusUnsupportedMediaType,
			"Isi berkas bukan gambar JPG, PNG, atau WEBP.")
	}

	return nil
}

// detectMIME reads magic bytes and returns the MIME type string.
func detectMIME(buf []byte) string {
	if len(buf) < 4 {
		return "application/octet-stream"
	}
	// JPEG: FF D8 FF
	if buf[0] == 0xFF && buf[1] == 0xD8 && buf[2] == 0xFF {
		return "image/jpeg"
	}
	// PNG: 89 50 4E 47 0D 0A 1A 0A
	if buf[0] == 0x89 && buf[1] == 0x50 && buf[2] == 0x4E && buf[3] == 0x47 {
		return "image/png"
	}
	// WebP: RIFF????WEBP
	if len(buf) >= 12 &&
		buf[0] == 0x52 && buf[1] == 0x49 && buf[2] == 0x46 && buf[3] == 0x46 &&
		buf[8] == 0x57 && buf[9] == 0x45 && buf[10] == 0x42 && buf[11] == 0x50 {
		return "image/webp"
	}
	// Standard library MIME inspection fallback
	contentType := http.DetectContentType(buf)
	return contentType
}

// randomHex returns n cryptographically-random hex bytes as a string.
func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = cryptorand.Read(b)
	return hex.EncodeToString(b)
}

// ---------------------------------------------------------------------------
// SendRegisterOTP
// POST /api/v1/auth/send-register-otp
// ---------------------------------------------------------------------------

func SendRegisterOTP(c *fiber.Ctx) error {
	var input SendRegisterOTPInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Format request tidak valid",
		})
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	if !isValidEmail(email) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Format email tidak valid",
		})
	}

	// Check if already registered
	var existing models.User
	if err := database.DB.Where("email = ?", email).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false, "message": "Email sudah terdaftar. Silakan gunakan email lain atau masuk.",
		})
	}

	// Check if there is an active OTP created recently (60s resend cooldown)
	var lastOTP models.VerifyOTP
	if err := database.DB.Where("email = ? AND is_used = ? AND created_at > ?", email, false, time.Now().Add(-60*time.Second)).Order("created_at desc").First(&lastOTP).Error; err == nil {
		diff := time.Until(lastOTP.CreatedAt.Add(60 * time.Second))
		secs := int(diff.Seconds())
		if secs > 0 {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success":             false,
				"message":             fmt.Sprintf("Mohon tunggu %d detik lagi sebelum meminta kode OTP baru.", secs),
				"retry_after_seconds": secs,
				"active_otp_exists":   true,
			})
		}
	}

	// Generate 6-digit numeric OTP
	// No time-based fallback: a predictable OTP is worse than failing the request
	randNum, err := cryptorand.Int(cryptorand.Reader, big.NewInt(1000000))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Gagal membuat kode OTP",
		})
	}
	otpStr := fmt.Sprintf("%06d", randNum.Int64())

	// Invalidate any previous OTPs for this email; an old code must not stay valid
	if err := database.DB.Model(&models.VerifyOTP{}).
		Where("email = ? AND is_used = ?", email, false).
		Update("is_used", true).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Gagal membuat kode OTP",
		})
	}

	otpRecord := models.VerifyOTP{
		Email:     email,
		OTP:       otpStr,
		ExpiresAt: time.Now().Add(5 * time.Minute),
		IsUsed:    false,
	}

	if err := database.DB.Create(&otpRecord).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Gagal membuat kode OTP verifikasi",
		})
	}
	resetOTPFailures(email)

	userName := strings.TrimSpace(input.Name)
	if userName == "" {
		userName = "Calon Pengguna Pasuruan Info"
	}

	// Send OTP email asynchronously (the code itself is never logged)
	go func(toEmail, name, otpCode string) {
		log.Printf("[EMAIL REGISTER OTP] target=%s time=%s", toEmail, time.Now().Format(time.RFC3339))
		if err := utils.SendRegisterOTPEmail(toEmail, name, otpCode); err != nil {
			log.Printf("[Email Error] Failed to deliver registration OTP to %s: %v", toEmail, err)
		} else {
			log.Printf("[Email Success] Registration OTP successfully delivered to %s", toEmail)
		}
	}(email, userName, otpStr)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Kode OTP verifikasi telah dikirim ke email Anda (berlaku 5 menit). Silakan periksa inbox atau spam.",
	})
}

// ---------------------------------------------------------------------------
// ForgotPassword
// POST /api/v1/auth/forgot-password
// ---------------------------------------------------------------------------

const resetCodeSentMessage = "Jika email terdaftar, kode OTP telah dikirim ke email tersebut. Silakan periksa inbox atau folder spam."

func ForgotPassword(c *fiber.Ctx) error {
	var input ForgotPasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Format request tidak valid",
		})
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	if !isValidEmail(email) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Format email tidak valid",
		})
	}

	// Same response whether or not the email is registered (no account enumeration)
	var user models.User
	if err := database.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return c.JSON(fiber.Map{"success": true, "message": resetCodeSentMessage})
	}

	// Check if there is an active OTP created recently (60s resend cooldown)
	var lastOTP models.VerifyOTP
	if err := database.DB.Where("email = ? AND is_used = ? AND created_at > ?", email, false, time.Now().Add(-60*time.Second)).Order("created_at desc").First(&lastOTP).Error; err == nil {
		diff := time.Until(lastOTP.CreatedAt.Add(60 * time.Second))
		secs := int(diff.Seconds())
		if secs > 0 {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success":             false,
				"message":             fmt.Sprintf("Mohon tunggu %d detik lagi sebelum meminta kode OTP baru.", secs),
				"retry_after_seconds": secs,
				"active_otp_exists":   true,
			})
		}
	}

	// Generate 6-digit numeric OTP
	// No time-based fallback: a predictable OTP is worse than failing the request
	randNum, err := cryptorand.Int(cryptorand.Reader, big.NewInt(1000000))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Gagal membuat kode OTP",
		})
	}
	otpStr := fmt.Sprintf("%06d", randNum.Int64())

	// Invalidate any previous OTPs for this email; an old code must not stay valid
	if err := database.DB.Model(&models.VerifyOTP{}).
		Where("email = ? AND is_used = ?", email, false).
		Update("is_used", true).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Gagal membuat kode OTP",
		})
	}

	otpRecord := models.VerifyOTP{
		Email:     email,
		OTP:       otpStr,
		ExpiresAt: time.Now().Add(5 * time.Minute),
		IsUsed:    false,
	}

	if err := database.DB.Create(&otpRecord).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Gagal membuat kode OTP pemulihan",
		})
	}
	resetOTPFailures(email)

	// Send OTP email asynchronously (the code itself is never logged)
	go func(toEmail, userName, otpCode string) {
		log.Printf("[EMAIL PASSWORD RESET OTP] target=%s time=%s", toEmail, time.Now().Format(time.RFC3339))
		if err := utils.SendOTPEmail(toEmail, userName, otpCode); err != nil {
			log.Printf("[Email Error] Failed to send OTP to %s: %v", toEmail, err)
		} else {
			log.Printf("[Email Success] Password Reset OTP successfully delivered to %s", toEmail)
		}
	}(user.Email, user.Name, otpStr)

	return c.JSON(fiber.Map{"success": true, "message": resetCodeSentMessage})
}

// ---------------------------------------------------------------------------
// VerifyOTP
// POST /api/v1/auth/verify-otp
// ---------------------------------------------------------------------------

func VerifyOTP(c *fiber.Ctx) error {
	var input VerifyOTPInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Format request tidak valid",
		})
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	otp := strings.TrimSpace(input.OTP)

	// Verify only — the code is consumed later by /auth/register or /auth/reset-password
	if _, err := consumeOTP(email, otp, false); err != nil {
		return otpErrorResponse(c, err)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Kode OTP valid",
	})
}

// ---------------------------------------------------------------------------
// ResetPassword
// POST /api/v1/auth/reset-password
// ---------------------------------------------------------------------------

func ResetPassword(c *fiber.Ctx) error {
	var input ResetPasswordInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Format request tidak valid",
		})
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	otp := strings.TrimSpace(input.OTP)

	if msg := validatePassword(input.Password); msg != "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Password harus 8–72 byte",
		})
	}

	// Consumed before the password changes so the same code cannot be reused
	if _, err := consumeOTP(email, otp, true); err != nil {
		return otpErrorResponse(c, err)
	}

	var user models.User
	if err := database.DB.Where("email = ?", email).First(&user).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"success": false, "message": "Akun tidak ditemukan dalam database",
		})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), 12)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Gagal memperbarui password",
		})
	}

	user.Password = string(hashedPassword)
	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Gagal menyimpan password baru",
		})
	}

	formattedWibTime := formatWIBTime(time.Now())

	// Send password reset notification email asynchronously
	go func(toEmail, userName, wibTime string) {
		if err := utils.SendPasswordChangedEmail(toEmail, userName, wibTime); err != nil {
			log.Printf("[Email Error] Failed to send password reset notification to %s: %v", toEmail, err)
		}
	}(user.Email, user.Name, formattedWibTime)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Password berhasil diubah. Silakan login kembali dengan password baru Anda.",
	})
}

// formatWIBTime formats time into Indonesian WIB date/time format (GMT+7)
func formatWIBTime(t time.Time) string {
	wibLocation := time.FixedZone("WIB", 7*3600)
	tWib := t.In(wibLocation)

	months := map[time.Month]string{
		time.January:   "Januari",
		time.February:  "Februari",
		time.March:     "Maret",
		time.April:     "April",
		time.May:       "Mei",
		time.June:      "Juni",
		time.July:      "Juli",
		time.August:    "Agustus",
		time.September: "September",
		time.October:   "Oktober",
		time.November:  "November",
		time.December:  "Desember",
	}

	return fmt.Sprintf("%d %s %d, %02d:%02d:%02d WIB",
		tWib.Day(), months[tWib.Month()], tWib.Year(),
		tWib.Hour(), tWib.Minute(), tWib.Second())
}
