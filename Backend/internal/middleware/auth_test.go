package middleware

import (
	"fmt"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestRateLimitKeySeparatesRoutes(t *testing.T) {
	app := fiber.New()
	var keys []string
	app.Get("/one", func(c *fiber.Ctx) error { keys = append(keys, rateLimitKey(c)); return nil })
	app.Get("/two", func(c *fiber.Ctx) error { keys = append(keys, rateLimitKey(c)); return nil })
	for _, path := range []string{"/one", "/two"} {
		if _, err := app.Test(httptest.NewRequest("GET", path, nil)); err != nil {
			t.Fatal(err)
		}
	}
	if len(keys) != 2 || keys[0] == keys[1] {
		t.Fatalf("keys = %v", keys)
	}
}

func TestRateLimiterIgnoresVisitorCookie(t *testing.T) {
	app := fiber.New()
	app.Post("/x", RateLimiter(1, 60), func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusNoContent) })
	statuses := make([]int, 0, 3)
	for _, cookie := range []string{"visitor-a", "visitor-b", "visitor-c"} {
		req := httptest.NewRequest("POST", "/x", nil)
		req.Header.Set("Cookie", "pasinfo_visitor="+cookie)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		statuses = append(statuses, resp.StatusCode)
	}
	if statuses[1] != fiber.StatusTooManyRequests || statuses[2] != fiber.StatusTooManyRequests {
		t.Fatalf("statuses = %v, want rotated cookies to be limited", statuses)
	}
}

func TestRateLimiterSharesQuotaAcrossGroupPaths(t *testing.T) {
	app := fiber.New()
	chat := app.Group("/chat", RateLimiter(1, 60))
	chat.Post("/sessions/:id/messages", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusNoContent) })
	first, err := app.Test(httptest.NewRequest("POST", "/chat/sessions/1/messages", nil))
	if err != nil {
		t.Fatal(err)
	}
	second, err := app.Test(httptest.NewRequest("POST", "/chat/sessions/2/messages", nil))
	if err != nil {
		t.Fatal(err)
	}
	if first.StatusCode != fiber.StatusNoContent || second.StatusCode != fiber.StatusTooManyRequests {
		t.Fatalf("statuses = %d, %d; want session IDs to share one quota", first.StatusCode, second.StatusCode)
	}
}

func TestRateLimiterConcurrentRequests(t *testing.T) {
	app := fiber.New()
	app.Use(RateLimiter(10, 60))
	app.Get("/limited", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusNoContent) })
	var wg sync.WaitGroup
	statuses := make(chan int, 100)
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			resp, err := app.Test(httptest.NewRequest("GET", "/limited", nil))
			if err != nil {
				t.Errorf("request: %v", err)
				return
			}
			statuses <- resp.StatusCode
		}()
	}
	wg.Wait()
	close(statuses)
	allowed, limited := 0, 0
	for status := range statuses {
		switch status {
		case fiber.StatusNoContent:
			allowed++
		case fiber.StatusTooManyRequests:
			limited++
		default:
			t.Fatalf("unexpected status %d", status)
		}
	}
	if allowed != 10 || limited != 90 {
		t.Fatalf("allowed=%d limited=%d", allowed, limited)
	}
}

// Expired entries are swept at most once per window instead of on every request (audit M9).
func TestRateLimitStoreSweepsOncePerWindow(t *testing.T) {
	s := newRateLimitStore(5, 60)
	for i := 0; i < 100; i++ {
		s.allow(fmt.Sprintf("k%d", i), 1000)
	}
	if s.sweeps != 1 {
		t.Fatalf("sweeps after burst within one window = %d, want 1", s.sweeps)
	}
	if ok, _ := s.allow("late", 1061); !ok {
		t.Fatal("new key after window must be allowed")
	}
	if s.sweeps != 2 || len(s.entries) != 1 {
		t.Fatalf("after window: sweeps=%d entries=%d, want 2 and 1 (expired keys removed)", s.sweeps, len(s.entries))
	}
}

func TestRateLimitStoreLimitsAndResets(t *testing.T) {
	s := newRateLimitStore(2, 60)
	if ok, _ := s.allow("ip", 1000); !ok {
		t.Fatal("1st request must pass")
	}
	if ok, _ := s.allow("ip", 1001); !ok {
		t.Fatal("2nd request must pass")
	}
	ok, retry := s.allow("ip", 1002)
	if ok || retry != 58 {
		t.Fatalf("3rd request ok=%v retry=%d, want false and 58", ok, retry)
	}
	if ok, _ := s.allow("ip", 1060); !ok {
		t.Fatal("request after reset must pass")
	}
}

// Client-supplied request IDs are reused only when short and plain (audit L11).
func TestRequestIDRejectsUnsafeValues(t *testing.T) {
	app := fiber.New()
	app.Use(RequestID())
	app.Get("/", func(c *fiber.Ctx) error { return c.SendStatus(204) })
	for value, keep := range map[string]bool{
		"abc-123_DEF.9":         true,
		strings.Repeat("a", 65): false,
		"bad value with spaces": false,
		"inject\u2028line":      false,
	} {
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("X-Request-ID", value)
		resp, err := app.Test(req)
		if err != nil {
			t.Fatal(err)
		}
		got := resp.Header.Get("X-Request-ID")
		if keep && got != value {
			t.Errorf("valid id %q replaced by %q", value, got)
		}
		if !keep && (got == value || len(got) != 16) {
			t.Errorf("unsafe id %q echoed as %q; want a 16-char server id", value, got)
		}
	}
}
