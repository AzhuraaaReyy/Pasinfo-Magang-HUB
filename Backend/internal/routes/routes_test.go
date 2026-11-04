package routes

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func TestSemanticSearchEnabled(t *testing.T) {
	for env, want := range map[string]bool{"production": false, "development": true, "": true, "staging": true} {
		if got := semanticSearchEnabled(env); got != want {
			t.Fatalf("APP_ENV=%q: %v", env, got)
		}
	}
}

func TestReadyHandlerReportsDatabaseReachability(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:ready?mode=memory"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	app := fiber.New()
	app.Get("/ready", readyHandler(db))
	app.Get("/nil", readyHandler(nil))
	check := func(path string, want int, body string) {
		t.Helper()
		resp, err := app.Test(httptest.NewRequest("GET", path, nil))
		if err != nil {
			t.Fatal(err)
		}
		got, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != want || !strings.Contains(string(got), body) {
			t.Fatalf("%s: %d %s", path, resp.StatusCode, got)
		}
	}
	check("/ready", 200, `"ready"`)
	check("/nil", 503, `"not_ready"`)
	sqlDB, _ := db.DB()
	sqlDB.Close()
	check("/ready", 503, `"not_ready"`)
}
