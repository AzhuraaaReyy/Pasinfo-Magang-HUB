package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http/httptest"
	"os"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"wildan-news-backend/internal/config"
	"wildan-news-backend/internal/handlers"
	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/services"
)

// demoSlug is the real culinary item of the demo (cmd/seed/data/domains/data-kuliner.json), a warung on the Bromo road via
// Tosari, Kabupaten Pasuruan.
const demoSlug = "warung-pak-slamet-bromo"

// demoQuery is what a visitor might type for it.
const demoQuery = "warung makan rumahan di jalur Bromo"

// guardedProvider counts the embedding calls and stops the demo when there are more than expected, so a demo that
// would re-embed the whole corpus costs no quota (one corpus document and a few query embeddings are expected).
type guardedProvider struct {
	inner   services.LLMProvider
	calls   int
	max     int
	onEmbed func(n int)
}

func (g *guardedProvider) Name() string { return g.inner.Name() }
func (g *guardedProvider) Chat(ctx context.Context, m []services.ChatMessage) (string, error) {
	return g.inner.Chat(ctx, m)
}
func (g *guardedProvider) Embed(ctx context.Context, text string) (*services.EmbeddingResponse, error) {
	g.calls++
	if g.calls > g.max {
		return nil, fmt.Errorf("demo guard: more than %d embedding calls", g.max)
	}
	if g.onEmbed != nil {
		g.onEmbed(g.calls)
	}
	return g.inner.Embed(ctx, text)
}
func (g *guardedProvider) EmbeddingModel() string { return services.EmbeddingModelOf(g.inner) }

// TestDemoIngestionToRecommendation is the demonstration of jobdesk 14 Nov point 5: one real Pasuruan culinary item goes
// from the seed data through the corpus, the embedding, and the recommendation engine to the HTTP endpoint, with the
// production code of each step (seed, Retriever.UpsertTravelDomains, Gemini embedding, SearchTravelContent,
// RecommendByText, RecommendationHandler). Everything runs in one transaction that is rolled back, so the development
// database is the same afterwards (checked at the end). Run on demand only:
//
//	DEMO_INGESTION=1 TRAVEL_SEARCH_DSN="host=127.0.0.1 port=5433 …" go test -run TestDemoIngestionToRecommendation -v ./cmd/seed/
func TestDemoIngestionToRecommendation(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if os.Getenv("DEMO_INGESTION") != "1" || dsn == "" {
		t.Skip("demo: set DEMO_INGESTION=1 and TRAVEL_SEARCH_DSN")
	}
	wd, _ := os.Getwd()
	if err := os.Chdir("../.."); err != nil { // seed() and the region files read cmd/seed/data from the backend root
		t.Fatal(err)
	}
	defer os.Chdir(wd)
	_ = godotenv.Load() // the embedding provider key, from .env (never printed)
	c := config.LoadLLM()
	if err := c.Validate(); err != nil {
		t.Fatalf("embedding provider not configured: %v", err)
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	var corpusBefore, viewsBefore int64
	db.Raw("SELECT count(*) FROM faq_knowledge_bases WHERE is_active AND embedding IS NOT NULL").Scan(&corpusBefore)
	var original models.Culinary
	if err := db.Where("slug = ?", demoSlug).First(&original).Error; err != nil {
		t.Fatalf("demo item %s not in the database: %v", demoSlug, err)
	}
	viewsBefore = original.Views

	tx := db.Begin()
	defer tx.Rollback()
	step := func(n int, title string) { t.Logf("\n========== TAHAP %d — %s ==========", n, title) }

	// ---- 0. Starting point --------------------------------------------------------------------------------------
	t.Logf("Data uji: %s (slug %s), kuliner nyata dari cmd/seed/data/domains/data-kuliner.json; DB pasinfo_travel_gemini; semua langkah di dalam SATU transaksi yang di-rollback.", "Warung Pak Slamet Bromo", demoSlug)
	t.Logf("Sebelum demo: culinaries.id=%d ada, korpus aktif ber-embedding = %d dokumen.", original.ID, corpusBefore)
	// The item is removed inside the transaction so the seed can bring it in as new data.
	for _, q := range []string{
		"DELETE FROM faq_knowledge_bases WHERE source_type = 'culinary' AND source_id = ?",
		"DELETE FROM opening_hours WHERE openable_type = 'Culinary' AND openable_id = ?",
		"DELETE FROM sourceables WHERE sourceable_type = 'Culinary' AND sourceable_id = ?",
		"DELETE FROM verifications WHERE verifiable_type = 'Culinary' AND verifiable_id = ?",
		"DELETE FROM media WHERE mediable_type = 'Culinary' AND mediable_id = ?",
		"DELETE FROM culinary_menus WHERE culinary_id = ?",
		"DELETE FROM culinaries WHERE id = ?",
	} {
		if err := tx.Exec(q, original.ID).Error; err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	t.Logf("Persiapan (dalam transaksi): item dan dokumen korpusnya dihapus, sehingga sistem melihatnya sebagai data baru.")

	// ---- 1. Data enters the system -------------------------------------------------------------------------------
	step(1, "DATA MASUK KE SISTEM (ingestion dari file seed)")
	if err := seed(tx); err != nil {
		t.Fatalf("seed: %v", err)
	}
	// The second step of the travel ingestion, `go run ./cmd/seed -backfill` (runBackfill): it fills the empty real fields
	// (operational status, price range, …) of rows the seed created.
	var src backfillSource
	var wisata struct {
		Destinations []backfillItem `json:"destinations"`
	}
	var kuliner struct {
		Culinaries []backfillItem `json:"culinaries"`
	}
	var budaya struct {
		Cultures []backfillItem `json:"cultures"`
	}
	var acara struct {
		Events []backfillItem `json:"events"`
	}
	for name, target := range map[string]any{"wisata.json": &wisata, "domains/data-kuliner.json": &kuliner, "domains/data-budaya.json": &budaya, "domains/data-acara.json": &acara} {
		if err := loadSeedFile("cmd/seed/data", name, target); err != nil {
			t.Fatal(err)
		}
	}
	src.Destinations, src.Culinaries, src.Cultures, src.Events = wisata.Destinations, kuliner.Culinaries, budaya.Cultures, acara.Events
	report, err := applyBackfill(tx, src)
	if err != nil {
		t.Fatalf("backfill: %v", err)
	}
	var filled []string
	for key, n := range report {
		if n > 0 {
			filled = append(filled, fmt.Sprintf("%s=%d", key, n))
		}
	}
	sort.Strings(filled)
	t.Logf("applyBackfill(tx) — tahap kedua ingestion (`go run ./cmd/seed -backfill`) — mengisi kolom yang masih kosong: %s", strings.Join(filled, ", "))
	var item models.Culinary
	if err := tx.Preload("Place").Where("slug = ?", demoSlug).First(&item).Error; err != nil {
		t.Fatalf("seed did not bring %s in: %v", demoSlug, err)
	}
	count := func(q string) int64 { var n int64; tx.Raw(q, item.ID).Scan(&n); return n }
	t.Logf("Hasil seed(tx) — kode seed produksi (cmd/seed/main.go), membaca data-kuliner.json — ditambah backfill:")
	t.Logf("  culinaries.id=%d (baru), name=%q, culinary_type=%s, status=%s, operational_status=%s, price_range=%s", item.ID, item.Name, item.CulinaryType, item.Status, item.OperationalStatus, item.PriceRange)
	t.Logf("  tempat: places.id=%d, kecamatan=%s, %s", item.Place.ID, item.Place.District, item.Place.Regency)
	t.Logf("  data turunan: menu=%d, jam buka=%d, sumber=%d, verifikasi=%d (status %s)",
		count("SELECT count(*) FROM culinary_menus WHERE culinary_id = ?"),
		count("SELECT count(*) FROM opening_hours WHERE openable_type='Culinary' AND openable_id = ?"),
		count("SELECT count(*) FROM sourceables WHERE sourceable_type='Culinary' AND sourceable_id = ?"),
		count("SELECT count(*) FROM verifications WHERE verifiable_type='Culinary' AND verifiable_id = ?"),
		func() string {
			var s string
			tx.Raw("SELECT status FROM verifications WHERE verifiable_type='Culinary' AND verifiable_id = ?", item.ID).Scan(&s)
			return s
		}())
	if n := count("SELECT count(*) FROM faq_knowledge_bases WHERE source_type='culinary' AND source_id = ?"); n != 0 {
		t.Fatalf("a corpus row exists before the refresh: %d", n)
	}
	t.Logf("  dokumen korpus untuk item ini: belum ada (embedding belum dibuat).")

	// ---- 2. Processing and preparation for embedding -------------------------------------------------------------
	step(2, "DATA DIPROSES DAN DISIAPKAN UNTUK EMBEDDING")
	regions, problems := services.LoadSeedRegions("cmd/seed/data")
	if len(problems) > 0 {
		t.Fatalf("seed region files: %v", problems)
	}
	newRetriever := func(dry bool) *services.Retriever {
		r := services.NewRetriever(tx)
		r.Regions, r.DryRun = regions, dry
		// The verification line of each document, as the corpus refresh reads it (Retriever.loadVerifications).
		var rows []models.Verification
		tx.Select("verifiable_type", "verifiable_id", "status").Find(&rows)
		r.Verifications = map[string]string{}
		for _, row := range rows {
			r.Verifications[fmt.Sprintf("%s:%d", row.VerifiableType, row.VerifiableID)] = row.Status
		}
		return r
	}
	base := services.NewRetryProvider(services.NewEmbedProvider(c, c.Embed), c.Retries)
	dry := newRetriever(true)
	if err := dry.UpsertTravelDomains(ctx, base); err != nil {
		t.Fatalf("dry run: %v", err)
	}
	t.Logf("Pemeriksaan korpus (dry run, fungsi yang sama dengan worker): %d dokumen kuliner/budaya/acara tidak berubah, %d dokumen baru perlu di-embed.", dry.Stats.Skipped, dry.Stats.Pending)
	if dry.Stats.Pending != 1 {
		t.Fatalf("want exactly the demo item to embed, got %d", dry.Stats.Pending)
	}

	// ---- 3. Embedding generated and stored -----------------------------------------------------------------------
	step(3, "EMBEDDING DIHASILKAN DAN DISIMPAN KE DATABASE")
	var processing string
	guard := &guardedProvider{inner: base, max: 4, onEmbed: func(n int) {
		if n == 1 { // the row already exists while the provider is called: pending → processing, no vector yet
			var row struct {
				Status    string
				HasVector bool
			}
			tx.Raw("SELECT embedding_status AS status, embedding IS NOT NULL AS has_vector FROM faq_knowledge_bases WHERE source_type='culinary' AND source_id = ?", item.ID).Scan(&row)
			processing = fmt.Sprintf("status=%s, embedding ada=%v", row.Status, row.HasVector)
		}
	}}
	live := newRetriever(false)
	started := time.Now()
	if err := live.UpsertTravelDomains(ctx, guard); err != nil {
		t.Fatalf("embedding: %v", err)
	}
	t.Logf("Saat provider dipanggil, baris korpus sudah ada: %s (antrean pending → processing).", processing)
	t.Logf("Hasil refresh: embedded=%d, tidak berubah=%d, gagal=%d; panggilan embedding=%d; waktu %s.", live.Stats.Embedded, live.Stats.Skipped, live.Stats.Failed, guard.calls, time.Since(started).Round(time.Millisecond))
	var doc struct {
		ID                 int64
		Question, Category string
		Answer             string
		Status, Model      string
		Dims               int
		Head               string
		Metadata           string
	}
	tx.Raw(`SELECT id, question, category, answer, embedding_status AS status, embedding_model AS model, vector_dims(embedding) AS dims,
		(embedding::real[])[1:4]::text AS head, metadata::text AS metadata FROM faq_knowledge_bases WHERE source_type='culinary' AND source_id = ?`, item.ID).Scan(&doc)
	t.Logf("Baris korpus faq_knowledge_bases.id=%d: category=%s, question=%q, metadata=%s", doc.ID, doc.Category, doc.Question, doc.Metadata)
	t.Logf("  embedding_status=%s, embedding_model=%s, dimensi vektor=%d, 4 nilai pertama=%s", doc.Status, doc.Model, doc.Dims, doc.Head)
	t.Logf("  teks dokumen yang di-embed (disusun dari tabel domain):\n%s", indent(doc.Answer))
	if live.Stats.Embedded != 1 || doc.Status != "completed" || doc.Dims != config.EmbeddingDimensions {
		t.Fatalf("embedding not stored as expected")
	}

	// ---- 4. Recommendation engine --------------------------------------------------------------------------------
	step(4, "RECOMMENDATION ENGINE MEMPROSES KEBUTUHAN PENGGUNA")
	search := services.NewRetriever(tx)
	results, err := search.SearchTravelContent(ctx, guard, demoQuery, services.TravelSearch{Domains: []string{"kuliner"}}, 50)
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	t.Logf("Query pengguna: %q, filter domain=kuliner. Query di-embed (1 panggilan), lalu cosine similarity terhadap vektor korpus (exact scan):", demoQuery)
	for i, r := range results {
		if i == 5 {
			break
		}
		mark := ""
		if r.SourceID != nil && *r.SourceID == int64(item.ID) {
			mark = "  ← data yang baru masuk"
		}
		label := r.Question
		if r.SourceLabel != nil {
			label = *r.SourceLabel
		}
		t.Logf("  %d. %-45s similarity %.3f%s", i+1, label, r.Similarity, mark)
	}
	cards, err := services.NewRecommender(tx).RecommendByText(ctx, results, 3)
	if err != nil {
		t.Fatalf("cards: %v", err)
	}
	t.Logf("Sesudah ambang 0,61, batas relatif 0,04, dan satu kartu per tempat: %d kartu.", len(cards))

	// ---- 5. Endpoint ---------------------------------------------------------------------------------------------
	step(5, "REKOMENDASI DIAKSES MELALUI ENDPOINT")
	h := handlers.NewRecommendationHandler(services.NewRecommender(tx))
	h.Search, h.LLM = services.NewRetriever(tx), guard
	app := fiber.New()
	h.Register(app)
	path := "/recommendations/travel?query=" + strings.ReplaceAll(demoQuery, " ", "%20") + "&domain=kuliner&limit=3"
	res, err := app.Test(httptest.NewRequest("GET", path, nil), -1)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(res.Body)
	var body struct {
		Recommendations []struct {
			Type, Name string
			Slug       *string
			Similarity float64
			Location   *struct{ District string }
		}
	}
	_ = json.Unmarshal(raw, &body)
	t.Logf("GET /api/v1%s → HTTP %d (handler produksi RecommendationHandler)", path, res.StatusCode)
	found := false
	for i, card := range body.Recommendations {
		district := ""
		if card.Location != nil {
			district = card.Location.District
		}
		mark := ""
		if card.Slug != nil && *card.Slug == demoSlug {
			mark, found = "  ← data yang baru masuk", true
		}
		t.Logf("  kartu %d: %s %q, kecamatan %s, similarity %.3f%s", i+1, card.Type, card.Name, district, card.Similarity, mark)
	}
	t.Logf("Respons JSON (dipotong 700 karakter):\n%.700s", raw)
	if res.StatusCode != 200 || !found {
		t.Fatalf("the new item is not on the endpoint")
	}

	// ---- Afterwards: the development database is unchanged -------------------------------------------------------
	tx.Rollback()
	var corpusAfter int64
	var after models.Culinary
	db.Raw("SELECT count(*) FROM faq_knowledge_bases WHERE is_active AND embedding IS NOT NULL").Scan(&corpusAfter)
	db.Where("slug = ?", demoSlug).First(&after)
	t.Logf("\n========== SESUDAH ROLLBACK ==========\nculinaries.id=%d (sama), views=%d (sebelum %d), korpus aktif ber-embedding=%d (sebelum %d). Panggilan embedding total: %d.", after.ID, after.Views, viewsBefore, corpusAfter, corpusBefore, guard.calls)
	if after.ID != original.ID || corpusAfter != corpusBefore || after.Views != viewsBefore {
		t.Fatalf("the development database changed")
	}
}

func indent(s string) string { return "    " + strings.ReplaceAll(s, "\n", "\n    ") }
