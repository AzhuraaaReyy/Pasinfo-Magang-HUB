package services

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"wildan-news-backend/internal/config"
	"wildan-news-backend/internal/models"
)

// newKnowledgeTestDB creates the domain tables with GORM and faq_knowledge_bases by hand
// (the pgvector column type does not exist in SQLite), like retrieval_format_test.go.
func newKnowledgeTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.News{}, &models.Region{}, &models.TravelCategory{}, &models.Place{}, &models.Destination{}, &models.DestinationPrice{}, &models.Facility{},
		&models.Culinary{}, &models.CulinaryMenu{}, &models.Culture{}, &models.Event{}, &models.EventOccurrence{}, &models.EventTicket{}, &models.Verification{}); err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`CREATE TABLE faq_knowledge_bases (id INTEGER PRIMARY KEY, question TEXT, answer TEXT, category TEXT, source_type TEXT, source_id INTEGER, source_label TEXT, source_url TEXT, is_active NUMERIC, embedding TEXT, embedding_model TEXT, embedding_updated_at DATETIME, metadata BLOB, created_at DATETIME, updated_at DATETIME)`).Error; err != nil {
		t.Fatal(err)
	}
	return db
}

func seedKnowledgeSources(t *testing.T, db *gorm.DB) {
	t.Helper()
	place := models.Place{Name: "Lokasi Uji", Address: "Jl. Uji"}
	region := models.Region{Name: "Pasuruan Utara", Slug: "pasuruan-utara"}
	category := models.TravelCategory{Name: "Keluarga"}
	for _, row := range []any{&place, &region, &category} {
		if err := db.Create(row).Error; err != nil {
			t.Fatal(err)
		}
	}
	rows := []any{
		&models.News{Title: "Berita Uji", Slug: "berita-uji", SourceURL: "uji:berita-uji", Content: "Isi berita.", Status: "published"},
		&models.News{Title: "Berita Draf", Slug: "berita-draf", SourceURL: "uji:berita-draf", Content: "Belum terbit.", Status: "draft"},
		&models.Destination{Name: "Taman Kota Pasuruan", Slug: "taman-kota", Description: "Taman kota.", Status: "published", PlaceID: place.ID, RegionID: region.ID, CategoryID: category.ID},
		&models.Destination{Name: "Destinasi Draf", Slug: "destinasi-draf", Description: "Draf.", Status: "draft", PlaceID: place.ID, RegionID: region.ID, CategoryID: category.ID},
		&models.Culinary{Name: "Nasi Punel", Slug: "nasi-punel", Description: "Kuliner.", Status: "published", PlaceID: &place.ID},
		&models.Culture{Name: "Tari Terbang", Slug: "tari-terbang", Description: "Kesenian.", Status: "published", PlaceID: &place.ID},
		&models.Event{Name: "Pekan Raya", Slug: "pekan-raya", Description: "Pameran.", Status: "published", PlaceID: &place.ID},
	}
	for _, row := range rows {
		if err := db.Create(row).Error; err != nil {
			t.Fatal(err)
		}
	}
}

type knowledgeRow struct {
	ID          int64
	Category    string
	SourceType  string
	SourceID    int64
	SourceLabel string
	Answer      string
	IsActive    bool
}

func knowledgeRows(t *testing.T, db *gorm.DB) map[string]knowledgeRow {
	t.Helper()
	var rows []knowledgeRow
	if err := db.Raw(`SELECT id, category, source_type, source_id, source_label, answer, is_active FROM faq_knowledge_bases`).Scan(&rows).Error; err != nil {
		t.Fatal(err)
	}
	out := make(map[string]knowledgeRow)
	for _, row := range rows {
		key := row.SourceType + ":" + row.SourceLabel
		if _, duplicate := out[key]; duplicate {
			t.Fatalf("duplicate knowledge row for %s", key)
		}
		out[key] = row
	}
	return out
}

func TestUpsertSourcesMapsEachPublishedSourceToOneKnowledgeRow(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	if err := NewRetriever(db).UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	rows := knowledgeRows(t, db)
	want := map[string]string{
		"news:Berita Uji":                 "berita",
		"destination:Taman Kota Pasuruan": "wisata",
		"culinary:Nasi Punel":             "kuliner",
		"culture:Tari Terbang":            "budaya",
		"event:Pekan Raya":                "acara",
		"region:Pasuruan Utara":           "umum",
	}
	if len(rows) != len(want) {
		t.Fatalf("rows = %v, want only published sources %v", rows, want)
	}
	for key, category := range want {
		row, ok := rows[key]
		if !ok || row.Category != category || row.SourceID == 0 || !row.IsActive {
			t.Fatalf("%s = %+v, want category %s", key, row, category)
		}
	}
	if !strings.Contains(rows["destination:Taman Kota Pasuruan"].Answer, "Kategori: Keluarga") {
		t.Fatalf("destination text = %q", rows["destination:Taman Kota Pasuruan"].Answer)
	}
}

func TestUpsertSourcesRerunUpdatesInPlaceWithoutDuplicates(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	retriever := NewRetriever(db)
	if err := retriever.UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	before := knowledgeRows(t, db)
	if err := db.Model(&models.Destination{}).Where("slug = ?", "taman-kota").Update("description", "Taman kota yang diperbarui.").Error; err != nil {
		t.Fatal(err)
	}
	if err := retriever.UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	after := knowledgeRows(t, db)
	if len(after) != len(before) {
		t.Fatalf("rerun changed row count: %d → %d", len(before), len(after))
	}
	for key, row := range before {
		if after[key].ID != row.ID || after[key].SourceID != row.SourceID || after[key].Category != row.Category {
			t.Fatalf("%s mapping changed: %+v → %+v", key, row, after[key])
		}
	}
	if !strings.Contains(after["destination:Taman Kota Pasuruan"].Answer, "Taman kota yang diperbarui.") {
		t.Fatalf("changed description not refreshed: %q", after["destination:Taman Kota Pasuruan"].Answer)
	}
}

func TestUpsertNewsReturnsLookupErrorInsteadOfCreatingRow(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	lookupFailure := errors.New("koneksi terputus")
	if err := db.Callback().Query().Before("gorm:query").Register("fail_knowledge_lookup", func(tx *gorm.DB) {
		if tx.Statement.Table == "faq_knowledge_bases" {
			_ = tx.AddError(lookupFailure)
		}
	}); err != nil {
		t.Fatal(err)
	}
	if err := NewRetriever(db).UpsertNews(context.Background(), &recordingEmbedder{}); !errors.Is(err, lookupFailure) {
		t.Fatalf("err = %v, want lookup failure", err)
	}
	var count int64
	db.Raw(`SELECT count(*) FROM faq_knowledge_bases`).Scan(&count)
	if count != 0 {
		t.Fatalf("a failed lookup created %d knowledge rows", count)
	}
}

func TestUpsertSourcesAddsVerificationStatusToCorpus(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	var destination models.Destination
	var event models.Event
	db.Where("slug = ?", "taman-kota").First(&destination)
	db.Where("slug = ?", "pekan-raya").First(&event)
	for _, v := range []models.Verification{{VerifiableType: "Destination", VerifiableID: destination.ID, Status: "pending"}, {VerifiableType: "Event", VerifiableID: event.ID, Status: "jadwal-resmi"}} {
		if err := db.Create(&v).Error; err != nil {
			t.Fatal(err)
		}
	}
	if err := NewRetriever(db).UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	rows := knowledgeRows(t, db)
	if !strings.Contains(rows["destination:Taman Kota Pasuruan"].Answer, "\nStatus verifikasi: belum terverifikasi") {
		t.Fatalf("destination = %q", rows["destination:Taman Kota Pasuruan"].Answer)
	}
	if !strings.Contains(rows["event:Pekan Raya"].Answer, "\nStatus verifikasi: jadwal resmi") {
		t.Fatalf("event = %q", rows["event:Pekan Raya"].Answer)
	}
	if strings.Contains(rows["culinary:Nasi Punel"].Answer, "Status verifikasi") {
		t.Fatalf("no verification row must give no line: %q", rows["culinary:Nasi Punel"].Answer)
	}
}

func TestLoadSourcesReturnsActiveDocumentsInOrder(t *testing.T) {
	db := newKnowledgeTestDB(t)
	for _, stmt := range []string{
		`INSERT INTO faq_knowledge_bases (id, question, answer, category, source_type, source_id, source_label, is_active) VALUES (1, 'Taman Kota Pasuruan', 'Taman.', 'wisata', 'destination', 35, 'Taman Kota Pasuruan', 1)`,
		`INSERT INTO faq_knowledge_bases (id, question, answer, category, source_type, source_id, source_label, is_active) VALUES (2, 'Hutan Mangrove', 'Mangrove.', 'wisata', 'destination', 36, 'Hutan Mangrove Kota Pasuruan', 1)`,
		`INSERT INTO faq_knowledge_bases (id, question, answer, category, source_type, source_id, source_label, is_active) VALUES (3, 'Festival Mock', 'Mock.', 'acara', 'event', 1, 'Festival Mock', 0)`,
	} {
		if err := db.Exec(stmt).Error; err != nil {
			t.Fatal(err)
		}
	}
	got, err := NewRetriever(db).LoadSources(context.Background(), []SourceRef{{"destination", 36}, {"event", 1}, {"destination", 99}, {"destination", 35}})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || *got[0].SourceLabel != "Hutan Mangrove Kota Pasuruan" || *got[1].SourceLabel != "Taman Kota Pasuruan" {
		t.Fatalf("got %+v", got)
	}
	if got[0].RelevanceStatus != "relevant" || got[0].RetrievalMethod != "follow_up_previous_sources" || got[0].Answer != "Mangrove." {
		t.Fatalf("loaded document = %+v", got[0])
	}
}

func TestUpsertSourcesStoresRegionInMetadata(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	retriever := NewRetriever(db)
	retriever.Regions = map[string]map[string]string{"culinary": {"nasi-punel": "Pasuruan Barat"}}
	if err := retriever.UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	var rows []struct {
		SourceType string
		Metadata   string
	}
	db.Raw(`SELECT source_type, CAST(metadata AS TEXT) AS metadata FROM faq_knowledge_bases ORDER BY source_type`).Scan(&rows)
	got := map[string]string{}
	for _, row := range rows {
		got[row.SourceType] = row.Metadata
	}
	if got["destination"] != `{"region":"Pasuruan Utara"}` || got["region"] != `{"region":"Pasuruan Utara"}` || got["culinary"] != `{"region":"Pasuruan Barat"}` {
		t.Fatalf("metadata = %v", got)
	}
	if got["culture"] != "" || got["news"] != "" {
		t.Fatalf("sources without a zone must have no region metadata: %v", got)
	}
}

// Owner instruction 2026-10-31: the corpus refreshes automatically, so a rerun without data changes
// must not embed or write anything; only new or changed documents are embedded.
func TestUpsertSourcesEmbedsOnlyNewOrChangedDocuments(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	first := NewRetriever(db)
	embedder := &recordingEmbedder{}
	if err := first.UpsertSources(context.Background(), embedder); err != nil {
		t.Fatal(err)
	}
	if first.Stats.Embedded != 6 || first.Stats.Skipped != 0 || len(embedder.inputs) != 6 {
		t.Fatalf("first run stats=%+v embeds=%d", first.Stats, len(embedder.inputs))
	}
	var stamped int64
	db.Raw(`SELECT count(*) FROM faq_knowledge_bases WHERE embedding_updated_at IS NOT NULL`).Scan(&stamped)
	if stamped != 6 {
		t.Fatalf("embedding_updated_at set on %d rows, want 6", stamped)
	}

	rerun := NewRetriever(db)
	embedder = &recordingEmbedder{}
	if err := rerun.UpsertSources(context.Background(), embedder); err != nil {
		t.Fatal(err)
	}
	if rerun.Stats.Embedded != 0 || rerun.Stats.Skipped != 6 || len(embedder.inputs) != 0 {
		t.Fatalf("unchanged rerun stats=%+v embeds=%d", rerun.Stats, len(embedder.inputs))
	}

	if err := db.Model(&models.Destination{}).Where("slug = ?", "taman-kota").Update("description", "Taman kota yang diperbarui.").Error; err != nil {
		t.Fatal(err)
	}
	dry := NewRetriever(db)
	dry.DryRun = true
	embedder = &recordingEmbedder{}
	if err := dry.UpsertSources(context.Background(), embedder); err != nil {
		t.Fatal(err)
	}
	if dry.Stats.Pending != 1 || dry.Stats.Embedded != 0 || len(embedder.inputs) != 0 || strings.Contains(knowledgeRows(t, db)["destination:Taman Kota Pasuruan"].Answer, "diperbarui") {
		t.Fatalf("dry run must count and write nothing: stats=%+v embeds=%d", dry.Stats, len(embedder.inputs))
	}

	changed := NewRetriever(db)
	embedder = &recordingEmbedder{}
	if err := changed.UpsertSources(context.Background(), embedder); err != nil {
		t.Fatal(err)
	}
	if changed.Stats.Embedded != 1 || changed.Stats.Skipped != 5 || len(embedder.inputs) != 1 || !strings.Contains(embedder.inputs[0], "Taman kota yang diperbarui.") {
		t.Fatalf("changed rerun stats=%+v embeds=%v", changed.Stats, embedder.inputs)
	}

	forced := NewRetriever(db)
	forced.Force = true
	if err := forced.UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	if forced.Stats.Embedded != 6 {
		t.Fatalf("force stats=%+v", forced.Stats)
	}
}

func TestSameJSONIgnoresPostgresFormatting(t *testing.T) {
	if !sameJSON([]byte(`{"region": "Kota Pasuruan"}`), regionMetadata("Kota Pasuruan")) {
		t.Fatal("jsonb formatting read as a change")
	}
	if sameJSON([]byte(`{"region": "Kota Pasuruan"}`), regionMetadata("Pasuruan Barat")) || !sameJSON(nil, nil) || sameJSON(nil, regionMetadata("Kota Pasuruan")) {
		t.Fatal("sameJSON compares values")
	}
}

func TestRefreshKnowledgeRefusesWithoutSeedRegions(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	embedder := &recordingEmbedder{}
	if _, err := RefreshKnowledge(context.Background(), db, embedder, t.TempDir()); err == nil || len(embedder.inputs) != 0 {
		t.Fatalf("refresh without seed region files must not run: err=%v embeds=%d", err, len(embedder.inputs))
	}
}

// modelEmbedder is an embedder that reports its model, like HTTPProvider and its wrappers.
type modelEmbedder struct {
	recordingEmbedder
	model string
}

func (p *modelEmbedder) Embed(ctx context.Context, text string) (*EmbeddingResponse, error) {
	_, _ = p.recordingEmbedder.Embed(ctx, text)
	return &EmbeddingResponse{Vector: make([]float32, EmbeddingDimensions), Model: p.model}, nil
}

func (p *modelEmbedder) EmbeddingModel() string { return p.model }

// Owner instruction 2026-11-01: development uses Ollama and production an API provider, so a refresh
// must notice the embedding model change and re-embed every document of the old model, once.
func TestRefreshReembedsDocumentsOfAnotherEmbeddingModel(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	if err := NewRetriever(db).UpsertSources(context.Background(), &modelEmbedder{model: "embeddinggemma"}); err != nil {
		t.Fatal(err)
	}
	switched := NewRetriever(db)
	embedder := &modelEmbedder{model: "provider-embed-v1"}
	if err := switched.UpsertSources(context.Background(), embedder); err != nil {
		t.Fatal(err)
	}
	if switched.Stats.Embedded != 6 || switched.Stats.Skipped != 0 || len(embedder.inputs) != 6 {
		t.Fatalf("model change stats=%+v embeds=%d", switched.Stats, len(embedder.inputs))
	}
	var stale int64
	db.Raw(`SELECT count(*) FROM faq_knowledge_bases WHERE embedding_model <> ?`, "provider-embed-v1").Scan(&stale)
	if stale != 0 {
		t.Fatalf("%d rows still carry the old embedding model", stale)
	}
	again := NewRetriever(db)
	if err := again.UpsertSources(context.Background(), &modelEmbedder{model: "provider-embed-v1"}); err != nil {
		t.Fatal(err)
	}
	if again.Stats.Embedded != 0 || again.Stats.Skipped != 6 {
		t.Fatalf("second run after the switch must embed nothing: %+v", again.Stats)
	}
}

func TestEmbeddingModelIsForwardedByEveryWrapper(t *testing.T) {
	inner := NewProvider(config.LLMConfig{OllamaURL: "http://127.0.0.1:9", OllamaChat: "chat", OllamaEmbed: "embeddinggemma"}, config.ProviderOllama)
	wrapped := NewConcurrencyLimitedProvider(&FallbackProvider{Primary: NewRetryProvider(inner, 1), Secondary: &stubProvider{name: "other"}}, 1)
	if got := EmbeddingModelOf(wrapped); got != "embeddinggemma" {
		t.Fatalf("EmbeddingModelOf = %q", got)
	}
	if got := EmbeddingModelOf(&stubProvider{name: "x"}); got != "" {
		t.Fatalf("a provider that cannot tell must give \"\", got %q", got)
	}
}

// quotaEmbedder refuses the calls listed in refuse (1-based) with a provider quota error, like Gemini's 429.
type quotaEmbedder struct {
	recordingEmbedder
	calls  int
	refuse map[int]bool
}

func (p *quotaEmbedder) Embed(ctx context.Context, text string) (*EmbeddingResponse, error) {
	p.calls++
	if p.refuse[p.calls] {
		return nil, &ProviderError{Provider: "gemini", Kind: "rate_limit", Status: 429, Message: "You exceeded your current quota"}
	}
	return p.recordingEmbedder.Embed(ctx, text)
}

// Runtime 2026-11-01: the Gemini free tier refused after 66 embeddings and the refresh stopped until the
// next hourly run. A quota error must now pause and continue the same run.
func TestRefreshWaitsOnProviderQuotaAndContinues(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	r := NewRetriever(db)
	r.RateLimitWait, r.RateLimitRetries = time.Millisecond, 3
	embedder := &quotaEmbedder{refuse: map[int]bool{3: true, 4: true}}
	if err := r.UpsertSources(context.Background(), embedder); err != nil {
		t.Fatalf("refresh must continue after a quota error: %v", err)
	}
	if r.Stats.Embedded != 6 || embedder.calls != 8 {
		t.Fatalf("stats=%+v calls=%d (6 documents + 2 refused calls)", r.Stats, embedder.calls)
	}
}

func TestRefreshStopsWhenQuotaStaysExhausted(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	r := NewRetriever(db)
	r.RateLimitWait, r.RateLimitRetries = time.Millisecond, 2
	embedder := &quotaEmbedder{refuse: map[int]bool{1: true, 2: true, 3: true}}
	err := r.UpsertSources(context.Background(), embedder)
	var pe *ProviderError
	if !errors.As(err, &pe) || pe.Kind != "rate_limit" || embedder.calls != 3 {
		t.Fatalf("err=%v calls=%d (1 call + 2 retries)", err, embedder.calls)
	}
	// A cancelled run does not wait for the quota.
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	r2 := NewRetriever(db)
	r2.RateLimitWait, r2.RateLimitRetries = time.Hour, 1
	if err := r2.UpsertSources(ctx, &quotaEmbedder{refuse: map[int]bool{1: true}}); !errors.Is(err, context.Canceled) {
		t.Fatalf("cancelled refresh err = %v", err)
	}
}

func TestRefreshPacesEmbeddings(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	r := NewRetriever(db)
	r.EmbedInterval = 15 * time.Millisecond
	start := time.Now()
	if err := r.UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	if elapsed := time.Since(start); elapsed < 5*r.EmbedInterval {
		t.Fatalf("6 paced embeddings took %s, want >= %s", elapsed, 5*r.EmbedInterval)
	}
}

func TestRelevanceThresholdFromEnv(t *testing.T) {
	// Unset or invalid keeps the embeddinggemma default; a valid value replaces it (Owner 2026-11-01).
	for value, want := range map[string]float64{"": DefaultRelevanceThreshold, "0.66": 0.66, "0.3": DefaultRelevanceThreshold, "abc": DefaultRelevanceThreshold} {
		t.Setenv("EMBED_RELEVANCE_THRESHOLD", value)
		if got := relevanceThreshold(); got != want {
			t.Errorf("EMBED_RELEVANCE_THRESHOLD=%q → %v, want %v", value, got, want)
		}
	}
	t.Setenv("EMBED_RELEVANCE_THRESHOLD", "0.66")
	if isRelevant(SemanticResult{Similarity: 0.63}) || !isRelevant(SemanticResult{Similarity: 0.67}) {
		t.Fatal("isRelevant must use the configured threshold")
	}
}

// K2 (jobdesk 31 Okt, 2026-11-03): a source that is unpublished or deleted leaves the chatbot's corpus, and
// comes back when it is published again; a row an operator deactivated stays inactive.
func TestUpsertSourcesDeactivatesUnpublishedSourcesAndReactivatesThem(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	if err := NewRetriever(db).UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	operator := knowledgeRows(t, db)["culture:Tari Terbang"]
	if err := db.Exec(`UPDATE faq_knowledge_bases SET is_active = false WHERE id = ?`, operator.ID).Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&models.Destination{}).Where("slug = ?", "taman-kota").Update("status", "draft").Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Where("slug = ?", "berita-uji").Delete(&models.News{}).Error; err != nil {
		t.Fatal(err)
	}

	dry := NewRetriever(db)
	dry.DryRun = true
	if err := dry.UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	if dry.Stats.Deactivated != 2 || !knowledgeRows(t, db)["destination:Taman Kota Pasuruan"].IsActive {
		t.Fatalf("dry run must only count: stats=%+v", dry.Stats)
	}

	run := NewRetriever(db)
	if err := run.UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	rows := knowledgeRows(t, db)
	if run.Stats.Deactivated != 2 || rows["destination:Taman Kota Pasuruan"].IsActive || rows["news:Berita Uji"].IsActive {
		t.Fatalf("unpublished and deleted sources must be deactivated: stats=%+v rows=%+v", run.Stats, rows)
	}
	if !rows["event:Pekan Raya"].IsActive || rows["culture:Tari Terbang"].IsActive {
		t.Fatalf("published row deactivated or operator row reactivated: %+v", rows)
	}

	if err := db.Model(&models.Destination{}).Where("slug = ?", "taman-kota").Update("status", "published").Error; err != nil {
		t.Fatal(err)
	}
	embedder := &recordingEmbedder{}
	again := NewRetriever(db)
	if err := again.UpsertSources(context.Background(), embedder); err != nil {
		t.Fatal(err)
	}
	rows = knowledgeRows(t, db)
	if !rows["destination:Taman Kota Pasuruan"].IsActive || len(embedder.inputs) != 0 || again.Stats.Deactivated != 0 {
		t.Fatalf("republished source must be reactivated without re-embedding: stats=%+v embeds=%d", again.Stats, len(embedder.inputs))
	}
	if rows["culture:Tari Terbang"].IsActive || rows["news:Berita Uji"].IsActive {
		t.Fatalf("operator row or deleted news reactivated: %+v", rows)
	}
	var marked int64
	db.Raw(`SELECT count(*) FROM faq_knowledge_bases WHERE CAST(metadata AS TEXT) LIKE '%source_unpublished%'`).Scan(&marked)
	if marked != 1 {
		t.Fatalf("marker rows = %d, want only the deleted news", marked)
	}
}

// A refresh that fails before every source is saved must not deactivate anything.
func TestUpsertSourcesFailureDeactivatesNothing(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	if err := NewRetriever(db).UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	if err := db.Model(&models.Culinary{}).Where("slug = ?", "nasi-punel").Update("description", "Berubah.").Error; err != nil {
		t.Fatal(err)
	}
	if err := db.Where("slug = ?", "berita-uji").Delete(&models.News{}).Error; err != nil {
		t.Fatal(err)
	}
	failing := NewRetriever(db)
	if err := failing.UpsertSources(context.Background(), &failingEmbedder{}); err == nil {
		t.Fatal("want embedding error")
	}
	if !knowledgeRows(t, db)["news:Berita Uji"].IsActive || failing.Stats.Deactivated != 0 {
		t.Fatalf("failed run deactivated rows: %+v", failing.Stats)
	}
}

type failingEmbedder struct{ stubProvider }

func (failingEmbedder) Embed(context.Context, string) (*EmbeddingResponse, error) {
	return nil, errors.New("embedding provider down")
}

// T1 (jobdesk 2 Nov, 2026-11-03): the zone of culinary, culture, and event documents comes from the kecamatan of
// their place; the seed file zone is only the fallback.
func TestUpsertSourcesTakesZoneFromPlaceKecamatan(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	if err := db.Model(&models.Place{}).Where("name = ?", "Lokasi Uji").Updates(map[string]any{"district": "Bangil", "regency": RegencyKabupaten}).Error; err != nil {
		t.Fatal(err)
	}
	r := NewRetriever(db)
	r.Regions = map[string]map[string]string{"event": {"pekan-raya": "Kota Pasuruan"}}
	if err := r.UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	var rows []struct {
		SourceType string
		Metadata   string
		Answer     string
	}
	db.Raw(`SELECT source_type, CAST(metadata AS TEXT) AS metadata, answer FROM faq_knowledge_bases WHERE source_type IN ('culinary','culture','event')`).Scan(&rows)
	if len(rows) != 3 {
		t.Fatalf("rows = %d", len(rows))
	}
	for _, row := range rows {
		if !strings.Contains(row.Metadata, "Pasuruan Utara") || !strings.Contains(row.Answer, "Wilayah: Pasuruan Utara") {
			t.Errorf("%s: zone not taken from the place kecamatan: %s / %q", row.SourceType, row.Metadata, row.Answer)
		}
	}
}

// F1 (jobdesk 2 Nov p4, 2026-11-03): a document the provider refuses is skipped and counted; the rest is saved. A
// provider outage still stops the run.
type refusingEmbedder struct {
	recordingEmbedder
	err error
}

func (p *refusingEmbedder) Embed(ctx context.Context, text string) (*EmbeddingResponse, error) {
	if strings.Contains(text, "Berita Uji") {
		return nil, p.err
	}
	return p.recordingEmbedder.Embed(ctx, text)
}

func TestUpsertSourcesSkipsDocumentTheProviderRefuses(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	r := NewRetriever(db)
	if err := r.UpsertSources(context.Background(), &refusingEmbedder{err: &ProviderError{Provider: "ollama", Kind: "upstream", Status: 400, Message: "input refused"}}); err != nil {
		t.Fatalf("refused document must not stop the refresh: %v", err)
	}
	rows := knowledgeRows(t, db)
	if r.Stats.Failed != 1 || r.Stats.Embedded != 5 || len(rows) != 5 {
		t.Fatalf("stats=%+v rows=%d", r.Stats, len(rows))
	}
	if _, ok := rows["news:Berita Uji"]; ok {
		t.Fatal("refused document saved")
	}
	for _, outage := range []error{&ProviderError{Kind: "connection"}, &ProviderError{Kind: "upstream", Status: 503}, &ProviderError{Kind: "rate_limit", Status: 429}, &ProviderError{Kind: "timeout"}} {
		if documentFailure(outage) {
			t.Errorf("%+v must stop the run", outage)
		}
	}
}

// F2 (jobdesk 2 Nov p4, 2026-11-03): the corpus keeps one row per source even when two refreshes run together.
func TestCorpusSourceIsUniqueUnderConcurrentRefresh(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	if err := db.Exec(`CREATE UNIQUE INDEX idx_faq_knowledge_source ON faq_knowledge_bases (source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL`).Error; err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = NewRetriever(db).UpsertSources(context.Background(), &recordingEmbedder{})
		}()
	}
	wg.Wait()
	var rows, duplicated int64
	db.Raw(`SELECT count(*) FROM faq_knowledge_bases`).Scan(&rows)
	db.Raw(`SELECT count(*) FROM (SELECT source_type, source_id FROM faq_knowledge_bases GROUP BY 1, 2 HAVING count(*) > 1) d`).Scan(&duplicated)
	if duplicated != 0 || rows > 6 {
		t.Fatalf("rows=%d duplicated sources=%d", rows, duplicated)
	}
}

// F3 (jobdesk 2 Nov p4, 2026-11-03): an early refresh request never blocks, and several requests count as one.
func TestRequestKnowledgeRefreshNeverBlocks(t *testing.T) {
	for len(refreshRequests) > 0 {
		<-refreshRequests
	}
	RequestKnowledgeRefresh()
	RequestKnowledgeRefresh()
	if len(refreshRequests) != 1 {
		t.Fatalf("pending requests = %d", len(refreshRequests))
	}
	<-refreshRequests
}

// jobdesk 4 Nov p5: a provider that cannot be reached stops the refresh with a ProviderError that names the document,
// never the API key, and writes nothing.
func TestRefreshStopsOnUnreachableProviderWithoutLeakingKey(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	srv := httptest.NewServer(http.NotFoundHandler())
	base := srv.URL
	srv.Close() // nothing listens any more: connection refused
	gemini := &HTTPProvider{kind: "gemini", base: base, key: "SECRET-TEST-KEY", chat: "chat", embed: "gemini-embedding-001", client: &http.Client{Timeout: time.Second}}
	r := NewRetriever(db)
	err := r.UpsertSources(context.Background(), gemini)
	var pe *ProviderError
	if !errors.As(err, &pe) || pe.Kind != "connection" || !strings.Contains(err.Error(), "embedding news:") || strings.Contains(err.Error(), "SECRET-TEST-KEY") {
		t.Fatalf("err = %v", err)
	}
	var count int64
	db.Raw(`SELECT count(*) FROM faq_knowledge_bases`).Scan(&count)
	if count != 0 || r.Stats.Embedded != 0 {
		t.Fatalf("rows=%d stats=%+v", count, r.Stats)
	}
}

// A database error while saving stops the refresh and names the document.
func TestRefreshReportsDatabaseSaveFailure(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	saveFailure := errors.New("disk penuh")
	if err := db.Callback().Create().Before("gorm:create").Register("fail_knowledge_save", func(tx *gorm.DB) {
		if tx.Statement.Table == "faq_knowledge_bases" {
			_ = tx.AddError(saveFailure)
		}
	}); err != nil {
		t.Fatal(err)
	}
	err := NewRetriever(db).UpsertSources(context.Background(), &recordingEmbedder{})
	if !errors.Is(err, saveFailure) || !strings.Contains(err.Error(), "saving news:") {
		t.Fatalf("err = %v", err)
	}
}
