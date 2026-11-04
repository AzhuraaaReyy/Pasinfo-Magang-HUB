package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
)

// ---------------------------------------------------------------------------
// JWT secret — loaded lazily from env; panics if missing/short
// ---------------------------------------------------------------------------

var jwtSecret []byte

func GetJWTSecret() []byte {
	if len(jwtSecret) > 0 {
		return jwtSecret
	}
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		_ = godotenv.Load()
		secret = os.Getenv("JWT_SECRET")
	}
	if secret == "" {
		panic("[FATAL] JWT_SECRET environment variable is not set. Refusing to start.")
	}
	if len(secret) < 32 {
		panic("[FATAL] JWT_SECRET must be at least 32 characters long.")
	}
	jwtSecret = []byte(secret)
	return jwtSecret
}

// ---------------------------------------------------------------------------
// SecurityHeaders — applied globally to every response
// ---------------------------------------------------------------------------

func SecurityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		c.Set("X-XSS-Protection", "1; mode=block")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Set("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self'; "+
				"style-src 'self' 'unsafe-inline'; "+
				"img-src 'self' data: https:; "+
				"connect-src 'self' https://api.pasuruaninfo.com https://wilayah.id; "+
				"font-src 'self' https://fonts.gstatic.com; "+
				"frame-ancestors 'none'")
		if os.Getenv("HTTPS") == "true" {
			c.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		}
		return c.Next()
	}
}

// ---------------------------------------------------------------------------
// CORSConfig — strict origin allowlist (never wildcard in production)
// ---------------------------------------------------------------------------

func CORSConfig() fiber.Handler {
	allowedOrigins := map[string]struct{}{
		"https://pasuruaninfo.com":     {},
		"https://www.pasuruaninfo.com": {},
	}
	if os.Getenv("APP_ENV") != "production" {
		allowedOrigins["http://localhost:5173"] = struct{}{}
		allowedOrigins["http://localhost:3000"] = struct{}{}
	}

	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")
		if _, ok := allowedOrigins[origin]; ok {
			c.Set("Access-Control-Allow-Origin", origin)
			c.Set("Vary", "Origin")
		}
		c.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Request-ID")
		c.Set("Access-Control-Max-Age", "86400")

		if c.Method() == fiber.MethodOptions {
			return c.SendStatus(fiber.StatusNoContent)
		}
		return c.Next()
	}
}

// ---------------------------------------------------------------------------
// RateLimiter — simple in-memory per-IP bucket
// For multi-instance: replace store with Redis-backed limiter.
// ---------------------------------------------------------------------------

// rateLimitKey uses the registered route pattern (the group prefix for group
// middleware) and the client IP. Client-controlled values such as cookies or
// path parameters are excluded so they cannot be rotated to obtain a new quota.
func rateLimitKey(c *fiber.Ctx) string {
	return c.Route().Path + "|" + c.IP()
}

type rateLimitEntry struct {
	count   int
	resetAt int64
}

// rateLimitStore holds the per-key counters of one RateLimiter. Expired entries are
// swept at most once per window, so a request does not scan the whole map.
type rateLimitStore struct {
	mu        sync.Mutex
	max       int
	window    int64
	entries   map[string]*rateLimitEntry
	lastSweep int64
	sweeps    int
}

func newRateLimitStore(max int, windowSec int64) *rateLimitStore {
	return &rateLimitStore{max: max, window: windowSec, entries: make(map[string]*rateLimitEntry)}
}

// allow records a request for key at time now (unix seconds) and reports whether it
// is within the limit; when it is not, retryAfter is the seconds until the reset.
func (s *rateLimitStore) allow(key string, now int64) (ok bool, retryAfter int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.sweeps == 0 || now-s.lastSweep >= s.window {
		for k, e := range s.entries {
			if now >= e.resetAt {
				delete(s.entries, k)
			}
		}
		s.lastSweep = now
		s.sweeps++
	}
	e, exists := s.entries[key]
	if !exists || now >= e.resetAt {
		s.entries[key] = &rateLimitEntry{count: 1, resetAt: now + s.window}
		return true, 0
	}
	if e.count < s.max {
		e.count++
		return true, 0
	}
	return false, e.resetAt - now
}

func RateLimiter(max int, windowSec int64) fiber.Handler {
	return RateLimiterWithHandler(max, windowSec, func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"success": false,
			"message": "Too many requests. Please slow down.",
		})
	})
}

// RateLimiterWithHandler is RateLimiter with a custom 429 response; Retry-After is set before onLimit runs.
func RateLimiterWithHandler(max int, windowSec int64, onLimit fiber.Handler) fiber.Handler {
	store := newRateLimitStore(max, windowSec)
	return func(c *fiber.Ctx) error {
		ok, retryAfter := store.allow(rateLimitKey(c), time.Now().Unix())
		if !ok {
			c.Set("Retry-After", strconv.FormatInt(retryAfter, 10))
			return onLimit(c)
		}
		return c.Next()
	}
}

// ---------------------------------------------------------------------------
// RequestID — attach a unique trace ID to every request
// ---------------------------------------------------------------------------

func validRequestID(id string) bool {
	if id == "" || len(id) > 64 {
		return false
	}
	for _, r := range id {
		if !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '-' || r == '_' || r == '.') {
			return false
		}
	}
	return true
}

func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Get("X-Request-ID")
		// Reuse a client ID only when it is short and plain, so it is safe to echo and log
		if !validRequestID(id) {
			b := make([]byte, 8)
			_, _ = rand.Read(b)
			id = hex.EncodeToString(b)
		}
		c.Set("X-Request-ID", id)
		c.Locals("request_id", id)
		return c.Next()
	}
}

// ---------------------------------------------------------------------------
// Protected — JWT Bearer token validation
// ---------------------------------------------------------------------------

func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Missing or invalid authorization header",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, err := jwt.Parse(tokenString,
			func(t *jwt.Token) (interface{}, error) {
				// Enforce signing algorithm — reject 'none' and any non-HMAC alg
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fiber.ErrUnauthorized
				}
				return GetJWTSecret(), nil
			},
			jwt.WithValidMethods([]string{"HS256"}),
		)

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Invalid or expired token",
			})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Invalid token claims",
			})
		}

		// The token is valid for 24 hours; read the user from the database so a deleted
		// account is rejected and a changed role takes effect immediately.
		userID, ok := claims["user_id"].(float64)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Invalid token claims",
			})
		}
		var user models.User
		if err := database.DB.Select("id", "role").First(&user, uint(userID)).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Invalid or expired token",
			})
		}

		c.Locals("user_id", userID)
		c.Locals("role", user.Role)
		return c.Next()
	}
}

// ---------------------------------------------------------------------------
// RoleMiddleware — RBAC enforcement
// ---------------------------------------------------------------------------

func RoleMiddleware(allowedRoles ...string) fiber.Handler {
	roleSet := make(map[string]struct{}, len(allowedRoles))
	for _, r := range allowedRoles {
		roleSet[r] = struct{}{}
	}

	return func(c *fiber.Ctx) error {
		userRole, ok := c.Locals("role").(string)
		if !ok || userRole == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"message": "Unauthorized",
			})
		}
		if _, allowed := roleSet[userRole]; !allowed {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"message": "Forbidden: insufficient permissions",
			})
		}
		return c.Next()
	}
}
