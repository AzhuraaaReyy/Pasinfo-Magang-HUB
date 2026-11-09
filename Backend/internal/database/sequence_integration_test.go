package database

import (
	"os"
	"testing"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// W1 (jobdesk 6 Nov, 2026-11-06): the id sequence catches up with copied rows and never moves back after the newest row
// is deleted. It runs only with PGVECTOR_TEST_DSN set, on a temporary table in a transaction that is rolled back.
func TestSequenceCatchUpNeverMovesBack(t *testing.T) {
	dsn := os.Getenv("PGVECTOR_TEST_DSN")
	if dsn == "" {
		t.Skip("PGVECTOR_TEST_DSN not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	tx := db.Begin()
	defer tx.Rollback()
	if err := tx.Exec("CREATE TEMP TABLE seq_check (id bigserial PRIMARY KEY, title text) ON COMMIT DROP").Error; err != nil {
		t.Fatal(err)
	}
	insert := func() (id int64) {
		t.Helper()
		if err := tx.Raw("INSERT INTO seq_check (title) VALUES ('x') RETURNING id").Scan(&id).Error; err != nil {
			t.Fatal(err)
		}
		return id
	}
	catchUp := func() {
		t.Helper()
		if err := tx.Exec(sequenceCatchUpSQL("seq_check")).Error; err != nil {
			t.Fatal(err)
		}
	}
	catchUp()
	first := insert()
	second := insert()
	if second != first+1 {
		t.Fatalf("ids = %d, %d", first, second)
	}
	// The newest row is deleted and the process restarts: its id is not given out again.
	if err := tx.Exec("DELETE FROM seq_check WHERE id = ?", second).Error; err != nil {
		t.Fatal(err)
	}
	catchUp()
	if next := insert(); next <= second {
		t.Fatalf("id %d of the deleted row reused: next = %d", second, next)
	}
	// Rows copied in with explicit ids: the sequence catches up.
	if err := tx.Exec("INSERT INTO seq_check (id, title) VALUES (500, 'copied')").Error; err != nil {
		t.Fatal(err)
	}
	catchUp()
	if next := insert(); next != 501 {
		t.Fatalf("after copied rows next = %d, want 501", next)
	}
}

func TestSequenceCatchUpSQLNamesTheTable(t *testing.T) {
	want := "SELECT setval(pg_get_serial_sequence('news', 'id'), GREATEST(coalesce(max(id), 1), coalesce(pg_sequence_last_value(pg_get_serial_sequence('news', 'id')::regclass), 1))) FROM news;"
	if got := sequenceCatchUpSQL("news"); got != want {
		t.Fatalf("got  %s\nwant %s", got, want)
	}
}
