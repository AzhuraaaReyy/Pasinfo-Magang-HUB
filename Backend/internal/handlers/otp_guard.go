package handlers

import (
	"errors"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

// maxOTPAttempts is the number of wrong OTP submissions allowed per email before
// every active OTP for that email is invalidated and a new code must be requested.
const maxOTPAttempts = 5

// otpAttemptWindow bounds how long failed attempts are remembered.
const otpAttemptWindow = 15 * time.Minute

var (
	errOTPInvalid = errors.New("otp invalid or expired")
	errOTPLocked  = errors.New("too many otp attempts")
)

type otpAttempt struct {
	count   int
	resetAt time.Time
}

// Failed attempts are kept in memory (single-instance deployment, like the rate
// limiter). The lock itself is persisted by marking the OTP rows as used.
var otpAttempts = struct {
	sync.Mutex
	byEmail map[string]*otpAttempt
}{byEmail: make(map[string]*otpAttempt)}

// recordOTPFailure counts a wrong attempt and reports whether the limit is reached.
func recordOTPFailure(email string) bool {
	otpAttempts.Lock()
	defer otpAttempts.Unlock()
	now := time.Now()
	a, ok := otpAttempts.byEmail[email]
	if !ok || now.After(a.resetAt) {
		a = &otpAttempt{resetAt: now.Add(otpAttemptWindow)}
		otpAttempts.byEmail[email] = a
	}
	a.count++
	return a.count >= maxOTPAttempts
}

// resetOTPFailures clears the counter for an email, or for every email when empty.
func resetOTPFailures(email string) {
	otpAttempts.Lock()
	defer otpAttempts.Unlock()
	if email == "" {
		otpAttempts.byEmail = make(map[string]*otpAttempt)
		return
	}
	delete(otpAttempts.byEmail, email)
}

// otpErrorResponse maps consumeOTP errors to the client response.
func otpErrorResponse(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, errOTPLocked):
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"success": false, "message": "Terlalu banyak percobaan kode OTP. Silakan minta kode OTP baru.",
		})
	case errors.Is(err, errOTPInvalid):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "message": "Kode OTP tidak valid atau telah kadaluwarsa",
		})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false, "message": "Gagal memverifikasi kode OTP",
		})
	}
}

// consumeOTP validates an active OTP for the email. markUsed consumes the code;
// verify-only callers pass false so the verify-otp -> register flow keeps working.
func consumeOTP(email, otp string, markUsed bool) (*models.VerifyOTP, error) {
	var record models.VerifyOTP
	err := database.DB.Where("email = ? AND otp = ? AND is_used = ? AND expires_at > ?", email, otp, false, time.Now()).First(&record).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if recordOTPFailure(email) {
			if err := database.DB.Model(&models.VerifyOTP{}).
				Where("email = ? AND is_used = ?", email, false).
				Update("is_used", true).Error; err != nil {
				return nil, err
			}
			return nil, errOTPLocked
		}
		return nil, errOTPInvalid
	}
	if err != nil {
		return nil, err
	}
	resetOTPFailures(email)
	if markUsed {
		if err := database.DB.Model(&record).Update("is_used", true).Error; err != nil {
			return nil, err
		}
	}
	return &record, nil
}
