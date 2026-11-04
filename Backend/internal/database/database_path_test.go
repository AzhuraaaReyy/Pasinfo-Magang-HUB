package database

import (
	"path/filepath"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestSafeWilayahPath(t *testing.T) {
	root := t.TempDir()
	for _, name := range []string{"provinces.csv", "regencies.csv", "districts.csv", "villages.csv"} {
		got, err := safeWilayahPath(root, name)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if got != filepath.Join(root, name) {
			t.Fatalf("path=%q, want %q", got, filepath.Join(root, name))
		}
	}
	for _, name := range []string{"../.env", "..", filepath.Join(root, "outside.csv"), "unknown.csv"} {
		if _, err := safeWilayahPath(root, name); err == nil {
			t.Fatalf("expected %q to be rejected", name)
		}
	}
}

// Audit 2026-11-02: production must not log every SQL statement (chat content, embeddings).
func TestSQLLogLevelHidesStatementsInProduction(t *testing.T) {
	if got := sqlLogLevel("production"); got != logger.Warn {
		t.Fatalf("production level = %v, want Warn", got)
	}
	for _, env := range []string{"", "development", "staging"} {
		if got := sqlLogLevel(env); got != logger.Info {
			t.Errorf("%q level = %v, want Info", env, got)
		}
	}
}

// E1 (jobdesk 2 Nov, 2026-11-03): the pool is limited by env, with defaults for empty or invalid values.
func TestConfigurePoolLimitsConnections(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:pool?mode=memory"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	t.Setenv("DB_MAX_OPEN_CONNS", "")
	if err := configurePool(db); err != nil {
		t.Fatal(err)
	}
	if got := sqlDB.Stats().MaxOpenConnections; got != defaultMaxOpenConns {
		t.Fatalf("default max open = %d, want %d", got, defaultMaxOpenConns)
	}
	t.Setenv("DB_MAX_OPEN_CONNS", "7")
	if err := configurePool(db); err != nil {
		t.Fatal(err)
	}
	if got := sqlDB.Stats().MaxOpenConnections; got != 7 {
		t.Fatalf("env max open = %d, want 7", got)
	}
	if got := poolSetting("DB_TEST_POOL", 5); got != 5 {
		t.Fatalf("unset = %d", got)
	}
	for _, bad := range []string{"0", "-3", "banyak"} {
		t.Setenv("DB_TEST_POOL", bad)
		if got := poolSetting("DB_TEST_POOL", 5); got != 5 {
			t.Fatalf("%q = %d, want default 5", bad, got)
		}
	}
}
