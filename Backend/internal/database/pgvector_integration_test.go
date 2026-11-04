package database

import (
	"os"
	"strings"
	"testing"

	"github.com/pgvector/pgvector-go"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// TestPgvectorStoreReadAndHNSW proves the PostgreSQL in use supports pgvector (jobdesk 2026-10-22, point 2):
// the extension is installed, a vector(768) column stores and reads an embedding unchanged, and a cosine
// search uses an HNSW index. It runs only with PGVECTOR_TEST_DSN set, and everything happens in a
// transaction that is rolled back, so the database keeps no test data.
func TestPgvectorStoreReadAndHNSW(t *testing.T) {
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

	var version string
	if err := tx.Raw("SELECT extversion FROM pg_extension WHERE extname = 'vector'").Scan(&version).Error; err != nil || version == "" {
		t.Fatalf("pgvector extension not installed (version %q, err %v)", version, err)
	}
	t.Logf("pgvector %s", version)

	if err := tx.Exec("CREATE TEMP TABLE pgvector_check (id int PRIMARY KEY, embedding vector(768)) ON COMMIT DROP").Error; err != nil {
		t.Fatal(err)
	}
	if err := tx.Exec("CREATE INDEX ON pgvector_check USING hnsw (embedding vector_cosine_ops)").Error; err != nil {
		t.Fatal(err)
	}
	stored := make([]float32, 768)
	for i := range stored {
		stored[i] = float32(i%7) / 7
	}
	stored[0] = 1
	other := make([]float32, 768)
	other[767] = 1
	if err := tx.Exec("INSERT INTO pgvector_check VALUES (1, ?), (2, ?)", pgvector.NewVector(stored), pgvector.NewVector(other)).Error; err != nil {
		t.Fatal(err)
	}

	var read pgvector.Vector
	if err := tx.Raw("SELECT embedding FROM pgvector_check WHERE id = 1").Row().Scan(&read); err != nil {
		t.Fatal(err)
	}
	if got := read.Slice(); len(got) != 768 || got[0] != stored[0] || got[767] != stored[767] {
		t.Fatalf("embedding changed on read: len %d", len(got))
	}

	var nearest int
	if err := tx.Raw("SELECT id FROM pgvector_check ORDER BY embedding <=> ? LIMIT 1", pgvector.NewVector(stored)).Scan(&nearest).Error; err != nil || nearest != 1 {
		t.Fatalf("cosine search returned %d (err %v), want 1", nearest, err)
	}

	if err := tx.Exec("SET LOCAL enable_seqscan = off").Error; err != nil {
		t.Fatal(err)
	}
	var plan []string
	if err := tx.Raw("EXPLAIN SELECT id FROM pgvector_check ORDER BY embedding <=> ? LIMIT 1", pgvector.NewVector(stored)).Scan(&plan).Error; err != nil {
		t.Fatal(err)
	}
	usesIndex := false
	for _, line := range plan {
		if strings.Contains(line, "Index Scan") {
			usesIndex = true
		}
	}
	if !usesIndex {
		t.Fatalf("cosine search does not use the HNSW index: %v", plan)
	}

	// A filtered search through HNSW: 100 vectors spread on an arc; the filter keeps every 25th row, all
	// farther from the query than the 10 nearest. With hnsw.ef_search = 10 the index alone returns none of
	// them; iterative scan (as internal/services/retrieval.go semanticSearch sets it) returns all 4.
	if err := tx.Exec("CREATE TEMP TABLE pgvector_filter (id int PRIMARY KEY, zone text, embedding vector(3)) ON COMMIT DROP").Error; err != nil {
		t.Fatal(err)
	}
	if err := tx.Exec("CREATE INDEX ON pgvector_filter USING hnsw (embedding vector_cosine_ops)").Error; err != nil {
		t.Fatal(err)
	}
	if err := tx.Exec("INSERT INTO pgvector_filter SELECT i, CASE WHEN i % 25 = 0 THEN 'selatan' ELSE 'other' END, ('[' || cos(i * 0.03) || ',' || sin(i * 0.03) || ',0.5]')::vector FROM generate_series(1, 100) i").Error; err != nil {
		t.Fatal(err)
	}
	if err := tx.Exec("SET LOCAL hnsw.ef_search = 10").Error; err != nil {
		t.Fatal(err)
	}
	filtered := func() int {
		var n int
		if err := tx.Raw("SELECT count(*) FROM (SELECT id FROM pgvector_filter WHERE zone = 'selatan' ORDER BY embedding <=> '[1,0,0.5]' LIMIT 5) x").Scan(&n).Error; err != nil {
			t.Fatal(err)
		}
		return n
	}
	if err := tx.Exec("SET LOCAL hnsw.iterative_scan = off").Error; err != nil {
		t.Fatal(err)
	}
	without := filtered()
	if err := tx.Exec("SET LOCAL hnsw.iterative_scan = strict_order").Error; err != nil {
		t.Fatal(err)
	}
	if without != 0 {
		t.Fatalf("test setup: filtered HNSW search without iterative scan returned %d rows, want 0", without)
	}
	if with := filtered(); with != 4 {
		t.Fatalf("filtered HNSW search with iterative scan returned %d rows, want 4", with)
	}
	t.Log("filtered HNSW search: 0 rows without iterative scan, 4 with strict_order")
}
