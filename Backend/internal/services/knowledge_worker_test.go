package services

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

// panicOnceEmbedder panics on its first embedding call, then embeds like recordingEmbedder.
type panicOnceEmbedder struct {
	recordingEmbedder
	calls atomic.Int32
}

func (p *panicOnceEmbedder) Embed(ctx context.Context, text string) (*EmbeddingResponse, error) {
	if p.calls.Add(1) == 1 {
		panic("unexpected document")
	}
	return p.recordingEmbedder.Embed(ctx, text)
}

// panicModelOnce panics the first time the worker asks for its embedding model: a panic outside one document's
// embedding, which only the per-run recover of refreshOnce catches.
type panicModelOnce struct {
	recordingEmbedder
	calls atomic.Int32
}

func (p *panicModelOnce) EmbeddingModel() string {
	if p.calls.Add(1) == 1 {
		panic("unexpected state")
	}
	return "embeddinggemma"
}

// W1 (jobdesk 5 Nov p1, 2026-11-05): a panic in one refresh run is returned as an error instead of stopping the
// process. The rows of that run keep no vector and stay pending; the next run embeds them.
func TestRefreshOnceTurnsPanicIntoError(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	p := &panicModelOnce{}
	_, err := refreshOnce(db, p, "../../cmd/seed/data")
	if err == nil || !strings.Contains(err.Error(), "refresh panicked: unexpected state") {
		t.Fatalf("err = %v", err)
	}
	if got := embeddingStatuses(t, db); got != "pending=6" {
		t.Fatalf("statuses after the panic: %s", got)
	}
	if _, err := refreshOnce(db, p, "../../cmd/seed/data"); err != nil {
		t.Fatal(err)
	}
	if got := embeddingStatuses(t, db); got != "completed=6" {
		t.Fatalf("statuses after the next run: %s", got)
	}
}

// jobdesk 5 Nov p5: a panic while embedding one document fails that document only; the rest of the queue is embedded.
func TestDocumentPanicFailsOnlyThatDocument(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	r := NewRetriever(db)
	if err := r.UpsertSources(context.Background(), &panicOnceEmbedder{}); err != nil {
		t.Fatalf("a document panic must not stop the run: %v", err)
	}
	var cause string
	db.Raw(`SELECT embedding_error FROM faq_knowledge_bases WHERE embedding_status = 'failed'`).Scan(&cause)
	if r.Stats.Failed != 1 || r.Stats.Embedded != 5 || embeddingStatuses(t, db) != "completed=5 failed=1" || !strings.Contains(cause, "panic while embedding: unexpected document") {
		t.Fatalf("stats=%+v statuses=%s cause=%q", r.Stats, embeddingStatuses(t, db), cause)
	}
}

// embeddingStatuses summarizes the embedding_status column ("completed=5 failed=1"), with the rows that have a vector
// counted as such only when completed.
func embeddingStatuses(t *testing.T, db *gorm.DB) string {
	t.Helper()
	var rows []struct {
		Status string
		N      int
		Vector int
	}
	if err := db.Raw(`SELECT embedding_status AS status, count(*) AS n, count(embedding) AS vector FROM faq_knowledge_bases GROUP BY embedding_status ORDER BY embedding_status`).Scan(&rows).Error; err != nil {
		t.Fatal(err)
	}
	var parts []string
	for _, row := range rows {
		if row.Status == embeddingCompleted && row.Vector != row.N {
			t.Fatalf("completed rows without a vector: %+v", row)
		}
		parts = append(parts, fmt.Sprintf("%s=%d", row.Status, row.N))
	}
	return strings.Join(parts, " ")
}

// The worker goroutine survives the panic and the next run embeds the corpus. Without the recover the whole test
// binary stops here.
func TestKnowledgeWorkerKeepsRunningAfterPanic(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	p := &panicModelOnce{}
	StartKnowledgeRefreshJob(db, p, "../../cmd/seed/data")
	deadline := time.Now().Add(10 * time.Second)
	for p.calls.Load() == 0 && time.Now().Before(deadline) {
		time.Sleep(20 * time.Millisecond)
	}
	RequestKnowledgeRefresh()
	var count int64
	for time.Now().Before(deadline) {
		db.Raw(`SELECT count(*) FROM faq_knowledge_bases WHERE embedding_status = 'completed' AND embedding IS NOT NULL`).Scan(&count)
		if count == 6 {
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatalf("worker did not run again after the panic: calls=%d rows=%d", p.calls.Load(), count)
}

// jobdesk 5 Nov p2: a sourced corpus row without an embedding is re-embedded by the next run; the other rows are not.
func TestWorkerEmbedsSourcedRowWithoutEmbedding(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	if err := NewRetriever(db).UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`UPDATE faq_knowledge_bases SET embedding = NULL WHERE source_type = 'news'`).Error; err != nil {
		t.Fatal(err)
	}
	p := &recordingEmbedder{}
	r := NewRetriever(db)
	if err := r.UpsertSources(context.Background(), p); err != nil {
		t.Fatal(err)
	}
	if r.Stats.Embedded != 1 || r.Stats.Skipped != 5 || len(p.inputs) != 1 || !strings.Contains(p.inputs[0], "Berita Uji") {
		t.Fatalf("stats=%+v inputs=%q", r.Stats, p.inputs)
	}
}

// jobdesk 7 Nov p4: the log names each embedded document and each failed one, with the cause and the next retry.
func TestWorkerLogNamesProcessedAndFailedDocuments(t *testing.T) {
	var out bytes.Buffer
	log.SetOutput(&out)
	defer log.SetOutput(os.Stderr)
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	if err := NewRetriever(db).UpsertSources(context.Background(), &refusingEmbedder{err: &ProviderError{Provider: "gemini", Kind: "upstream", Status: 400, Message: "input refused"}}); err != nil {
		t.Fatal(err)
	}
	logged := out.String()
	if !strings.Contains(logged, "[Knowledge] embedded destination:") || !strings.Contains(logged, ", model ") {
		t.Fatalf("success not named:\n%s", logged)
	}
	if !strings.Contains(logged, "[Knowledge] failed news:") || !strings.Contains(logged, "attempt 1/5, next retry after") || !strings.Contains(logged, "input refused") {
		t.Fatalf("failure not named:\n%s", logged)
	}
}

// jobdesk 5 Nov p2/p4/p5: a refused document is stored as failed with its cause, waits for its retry time, and is
// embedded by the first run after it.
func TestWorkerRetriesFailedDocumentOnNextRun(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	first := NewRetriever(db)
	if err := first.UpsertSources(context.Background(), &refusingEmbedder{err: &ProviderError{Provider: "ollama", Kind: "upstream", Status: 400, Message: "input refused"}}); err != nil {
		t.Fatal(err)
	}
	var failed struct {
		Attempts int
		Error    string
		Next     *time.Time
		Vector   *string
	}
	db.Raw(`SELECT embedding_attempts AS attempts, embedding_error AS error, embedding_next_retry_at AS next, embedding AS vector FROM faq_knowledge_bases WHERE source_type = 'news'`).Scan(&failed)
	if first.Stats.Failed != 1 || failed.Attempts != 1 || !strings.Contains(failed.Error, "input refused") || failed.Next == nil || failed.Vector != nil || embeddingStatuses(t, db) != "completed=5 failed=1" {
		t.Fatalf("first=%+v failed=%+v statuses=%s", first.Stats, failed, embeddingStatuses(t, db))
	}
	// Before the retry time the row is left alone.
	p := &recordingEmbedder{}
	early := NewRetriever(db)
	if err := early.UpsertSources(context.Background(), p); err != nil || early.Stats.Deferred != 1 || len(p.inputs) != 0 {
		t.Fatalf("early=%+v inputs=%q err=%v", early.Stats, p.inputs, err)
	}
	if err := db.Exec(`UPDATE faq_knowledge_bases SET embedding_next_retry_at = '2000-01-01 00:00:00' WHERE source_type = 'news'`).Error; err != nil {
		t.Fatal(err)
	}
	next := NewRetriever(db)
	if err := next.UpsertSources(context.Background(), p); err != nil {
		t.Fatal(err)
	}
	if next.Stats.Embedded != 1 || next.Stats.Skipped != 5 || !strings.Contains(p.inputs[0], "Berita Uji") || embeddingStatuses(t, db) != "completed=6" {
		t.Fatalf("next=%+v inputs=%q statuses=%s", next.Stats, p.inputs, embeddingStatuses(t, db))
	}
	var cleared struct {
		Attempts int
		Error    *string
	}
	db.Raw(`SELECT embedding_attempts AS attempts, embedding_error AS error FROM faq_knowledge_bases WHERE source_type = 'news'`).Scan(&cleared)
	if cleared.Attempts != 0 || cleared.Error != nil {
		t.Fatalf("success must clear the failure: %+v", cleared)
	}
}

// jobdesk 5 Nov p5: after maxEmbeddingAttempts failures a row is not retried automatically; a changed source text
// starts the count again.
func TestWorkerStopsRetryingAfterMaxAttempts(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	refusing := &refusingEmbedder{err: &ProviderError{Provider: "ollama", Kind: "upstream", Status: 400, Message: "input refused"}}
	for attempt := 1; attempt <= maxEmbeddingAttempts; attempt++ {
		if err := NewRetriever(db).UpsertSources(context.Background(), refusing); err != nil {
			t.Fatal(err)
		}
		if err := db.Exec(`UPDATE faq_knowledge_bases SET embedding_next_retry_at = '2000-01-01 00:00:00' WHERE source_type = 'news' AND embedding_next_retry_at IS NOT NULL`).Error; err != nil {
			t.Fatal(err)
		}
	}
	var last struct {
		Attempts int
		Next     *time.Time
	}
	db.Raw(`SELECT embedding_attempts AS attempts, embedding_next_retry_at AS next FROM faq_knowledge_bases WHERE source_type = 'news'`).Scan(&last)
	if last.Attempts != maxEmbeddingAttempts || last.Next != nil {
		t.Fatalf("after %d failures: %+v", maxEmbeddingAttempts, last)
	}
	p := &recordingEmbedder{}
	stopped := NewRetriever(db)
	if err := stopped.UpsertSources(context.Background(), p); err != nil || stopped.Stats.Deferred != 1 || len(p.inputs) != 0 {
		t.Fatalf("stopped=%+v inputs=%q err=%v", stopped.Stats, p.inputs, err)
	}
	if err := db.Model(&models.News{}).Where("slug = ?", "berita-uji").Update("content", "Isi berita yang diperbaiki.").Error; err != nil {
		t.Fatal(err)
	}
	edited := NewRetriever(db)
	if err := edited.UpsertSources(context.Background(), p); err != nil || edited.Stats.Embedded != 1 || embeddingStatuses(t, db) != "completed=6" {
		t.Fatalf("edited=%+v statuses=%s err=%v", edited.Stats, embeddingStatuses(t, db), err)
	}
}

// W2 (jobdesk 5 Nov p2, Owner option A): a FAQ row added directly to faq_knowledge_bases is embedded once, again only
// after an edit or a model change, and an inactive one is left alone.
func TestWorkerEmbedsManualFAQRows(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	for _, stmt := range []string{
		`INSERT INTO faq_knowledge_bases (id, question, answer, category, is_active, created_at, updated_at) VALUES (900, 'Jam  layanan pusat informasi?', 'Buka 08.00-16.00  WIB.', 'layanan', 1, '2026-11-05 08:00:00', '2026-11-05 08:00:00')`,
		`INSERT INTO faq_knowledge_bases (id, question, answer, category, is_active, created_at, updated_at) VALUES (901, 'FAQ nonaktif', 'Tidak dipakai.', 'umum', 0, '2026-11-05 08:00:00', '2026-11-05 08:00:00')`,
	} {
		if err := db.Exec(stmt).Error; err != nil {
			t.Fatal(err)
		}
	}
	run := func(p LLMProvider) (*Retriever, error) {
		r := NewRetriever(db)
		return r, r.UpsertSources(context.Background(), p)
	}
	faqInputs := func(p *recordingEmbedder) (n int) {
		for _, in := range p.inputs {
			if strings.Contains(in, "pusat informasi") || strings.Contains(in, "FAQ nonaktif") {
				n++
			}
		}
		return n
	}
	p := &recordingEmbedder{}
	if _, err := run(p); err != nil {
		t.Fatal(err)
	}
	var row struct {
		Embedding *string
		Model     *string
		Answer    string
	}
	db.Raw(`SELECT embedding, embedding_model AS model, answer FROM faq_knowledge_bases WHERE id = 900`).Scan(&row)
	if faqInputs(p) != 1 || row.Embedding == nil || pointerString(row.Model) != "embeddinggemma" || row.Answer != "Buka 08.00-16.00  WIB." {
		t.Fatalf("first run: faq embeds=%d row=%+v inputs=%q", faqInputs(p), row, p.inputs)
	}
	if !strings.Contains(strings.Join(p.inputs, "\n"), "title: Jam layanan pusat informasi? | text: Buka 08.00-16.00 WIB.") {
		t.Fatalf("embedding input not normalized: %q", p.inputs)
	}
	var inactive *string
	db.Raw(`SELECT embedding FROM faq_knowledge_bases WHERE id = 901`).Scan(&inactive)
	if inactive != nil {
		t.Fatal("inactive FAQ row embedded")
	}

	p = &recordingEmbedder{}
	if r, err := run(p); err != nil || len(p.inputs) != 0 || r.Stats.Embedded != 0 {
		t.Fatalf("unchanged rerun: err=%v inputs=%q", err, p.inputs)
	}

	if err := db.Exec(`UPDATE faq_knowledge_bases SET answer = 'Buka 07.00-15.00 WIB.', updated_at = '2999-01-01 00:00:00' WHERE id = 900`).Error; err != nil {
		t.Fatal(err)
	}
	p = &recordingEmbedder{}
	if r, err := run(p); err != nil || faqInputs(p) != 1 || r.Stats.Embedded != 1 || !strings.Contains(p.inputs[0], "07.00-15.00") {
		t.Fatalf("edited FAQ: err=%v inputs=%q", err, p.inputs)
	}

	// A provider that reports another embedding model re-embeds the FAQ (and every sourced document).
	switched := &modelEmbedder{model: "provider-embed-v1"}
	if _, err := run(switched); err != nil || faqInputs(&switched.recordingEmbedder) != 1 {
		t.Fatalf("model change: err=%v inputs=%q", err, switched.inputs)
	}
	db.Raw(`SELECT embedding, embedding_model AS model, answer FROM faq_knowledge_bases WHERE id = 900`).Scan(&row)
	if pointerString(row.Model) != "provider-embed-v1" {
		t.Fatalf("model not stored: %+v", row)
	}
}

// A manual FAQ the provider refuses keeps its row unembedded, does not stop the run, and is tried again next run.
func TestWorkerRetriesRefusedManualFAQ(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	if err := db.Exec(`INSERT INTO faq_knowledge_bases (id, question, answer, category, is_active, created_at, updated_at) VALUES (900, 'Berita Uji FAQ', 'Isi FAQ.', 'umum', 1, '2026-11-05 08:00:00', '2026-11-05 08:00:00')`).Error; err != nil {
		t.Fatal(err)
	}
	first := NewRetriever(db)
	// refusingEmbedder refuses every text containing "Berita Uji": the news item and this FAQ.
	if err := first.UpsertSources(context.Background(), &refusingEmbedder{err: &ProviderError{Provider: "ollama", Kind: "upstream", Status: 400, Message: "input refused"}}); err != nil {
		t.Fatalf("refused FAQ must not stop the run: %v", err)
	}
	var embedding *string
	db.Raw(`SELECT embedding FROM faq_knowledge_bases WHERE id = 900`).Scan(&embedding)
	if first.Stats.Failed != 2 || embedding != nil || embeddingStatuses(t, db) != "completed=5 failed=2" {
		t.Fatalf("first=%+v embedding=%v statuses=%s", first.Stats, embedding, embeddingStatuses(t, db))
	}
	if err := db.Exec(`UPDATE faq_knowledge_bases SET embedding_next_retry_at = '2000-01-01 00:00:00' WHERE embedding_status = 'failed'`).Error; err != nil {
		t.Fatal(err)
	}
	next := NewRetriever(db)
	if err := next.UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	db.Raw(`SELECT embedding FROM faq_knowledge_bases WHERE id = 900`).Scan(&embedding)
	if next.Stats.Embedded != 2 || embedding == nil {
		t.Fatalf("next=%+v embedding=%v", next.Stats, embedding)
	}
}

// A1 (jobdesk 5 Nov audit, 2026-11-05): only errors of one document count against its attempts; setup errors and
// outages stop the run.
func TestDocumentFailureClassification(t *testing.T) {
	for _, c := range []struct {
		err  error
		want bool
	}{
		{&ProviderError{Kind: "upstream", Status: 400}, true},
		{&ProviderError{Kind: "upstream", Status: 413}, true},
		{&ProviderError{Kind: "upstream", Status: 422}, true},
		{&ProviderError{Kind: "format"}, true},
		{fmt.Errorf("%w: dims", errInvalidEmbedding), true},
		{fmt.Errorf("%w: x", errDocumentPanic), true},
		{&ProviderError{Kind: "upstream", Status: 401}, false},
		{&ProviderError{Kind: "upstream", Status: 403}, false},
		{&ProviderError{Kind: "upstream", Status: 404}, false},
		{&ProviderError{Kind: "upstream", Status: 503}, false},
		{&ProviderError{Kind: "rate_limit", Status: 429}, false},
		{&ProviderError{Kind: "connection"}, false},
		{&ProviderError{Kind: "timeout"}, false},
	} {
		if got := documentFailure(c.err); got != c.want {
			t.Errorf("documentFailure(%v) = %v, want %v", c.err, got, c.want)
		}
	}
}

// A1: a missing embedding model (Ollama 404 while /api/tags answers 200) stops the run at the first document instead of
// failing every document, and no document loses an attempt.
func TestMissingModelStopsRunWithoutUsingAttempts(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	calls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"error":"model \"embeddinggemma-typo\" not found, try pulling it first"}`))
	}))
	t.Cleanup(srv.Close)
	ollama := &HTTPProvider{kind: "ollama", base: srv.URL, embed: "embeddinggemma-typo", client: srv.Client()}
	err := NewRetriever(db).UpsertSources(context.Background(), ollama)
	var attempts int64
	db.Raw(`SELECT count(*) FROM faq_knowledge_bases WHERE embedding_attempts > 0`).Scan(&attempts)
	if err == nil || calls != 1 || attempts != 0 || embeddingStatuses(t, db) != "pending=6" {
		t.Fatalf("err=%v calls=%d attempts=%d statuses=%s", err, calls, attempts, embeddingStatuses(t, db))
	}
}

// A1: repeated outages never leave a healthy document without automatic retry; the first healthy run embeds all.
func TestOutagesDoNotUseDocumentAttempts(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	srv := httptest.NewServer(http.NotFoundHandler())
	base := srv.URL
	srv.Close()
	down := &HTTPProvider{kind: "ollama", base: base, embed: "embeddinggemma", client: &http.Client{Timeout: time.Second}}
	for i := 0; i < maxEmbeddingAttempts+1; i++ {
		if err := NewRetriever(db).UpsertSources(context.Background(), down); err == nil {
			t.Fatal("an outage must stop the run")
		}
	}
	up := NewRetriever(db)
	if err := up.UpsertSources(context.Background(), &recordingEmbedder{}); err != nil || up.Stats.Embedded != 6 || embeddingStatuses(t, db) != "completed=6" {
		t.Fatalf("after outages: err=%v stats=%+v statuses=%s", err, up.Stats, embeddingStatuses(t, db))
	}
}

// A2 (jobdesk 5 Nov audit): a manual FAQ edited by plain SQL, updated_at untouched, is embedded again.
func TestManualFAQEditBySQLIsReembedded(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	if err := db.Exec(`INSERT INTO faq_knowledge_bases (id, question, answer, category, is_active, created_at, updated_at) VALUES (900, 'Jam layanan?', 'Buka 08.00.', 'layanan', 1, '2026-11-05 08:00:00', '2026-11-05 08:00:00')`).Error; err != nil {
		t.Fatal(err)
	}
	if err := NewRetriever(db).UpsertSources(context.Background(), &recordingEmbedder{}); err != nil {
		t.Fatal(err)
	}
	var metadata string
	db.Raw(`SELECT metadata FROM faq_knowledge_bases WHERE id = 900`).Scan(&metadata)
	if !strings.Contains(metadata, faqTextFingerprint("Jam layanan?", "Buka 08.00.")) {
		t.Fatalf("fingerprint not stored: %q", metadata)
	}
	unchanged := &recordingEmbedder{}
	if err := NewRetriever(db).UpsertSources(context.Background(), unchanged); err != nil || len(unchanged.inputs) != 0 {
		t.Fatalf("unchanged FAQ re-embedded: %q err=%v", unchanged.inputs, err)
	}
	if err := db.Exec(`UPDATE faq_knowledge_bases SET answer = 'Buka 07.00.' WHERE id = 900`).Error; err != nil {
		t.Fatal(err)
	}
	p := &recordingEmbedder{}
	r := NewRetriever(db)
	if err := r.UpsertSources(context.Background(), p); err != nil || r.Stats.Embedded != 1 || len(p.inputs) != 1 || p.inputs[0] != "title: Jam layanan? | text: Buka 07.00." {
		t.Fatalf("SQL edit: err=%v stats=%+v inputs=%q", err, r.Stats, p.inputs)
	}
}

// A2: a refused manual FAQ keeps its retry delay and counts its attempts (the fingerprint is stored on failure too).
func TestRefusedManualFAQFollowsRetryPolicy(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	if err := db.Exec(`INSERT INTO faq_knowledge_bases (id, question, answer, category, is_active, created_at, updated_at) VALUES (900, 'Berita Uji FAQ', 'Isi FAQ.', 'umum', 1, '2026-11-05 08:00:00', '2026-11-05 08:00:00')`).Error; err != nil {
		t.Fatal(err)
	}
	refusing := &refusingEmbedder{err: &ProviderError{Provider: "ollama", Kind: "upstream", Status: 400, Message: "input refused"}}
	for want := 1; want <= 2; want++ {
		if err := NewRetriever(db).UpsertSources(context.Background(), refusing); err != nil {
			t.Fatal(err)
		}
		var attempts int
		db.Raw(`SELECT embedding_attempts FROM faq_knowledge_bases WHERE id = 900`).Scan(&attempts)
		if attempts != want {
			t.Fatalf("run %d: attempts=%d", want, attempts)
		}
		early := NewRetriever(db)
		if err := early.UpsertSources(context.Background(), refusing); err != nil || early.Stats.Deferred != 2 {
			t.Fatalf("run %d: retry delay ignored: %+v err=%v", want, early.Stats, err)
		}
		db.Exec(`UPDATE faq_knowledge_bases SET embedding_next_retry_at = '2000-01-01 00:00:00' WHERE embedding_status = 'failed'`)
	}
}

// missingModelEmbedder reports a model the provider does not have and answers 404, like Ollama with a wrong name.
type missingModelEmbedder struct{ recordingEmbedder }

func (*missingModelEmbedder) EmbeddingModel() string { return "embeddinggemma-typo" }
func (p *missingModelEmbedder) Embed(context.Context, string) (*EmbeddingResponse, error) {
	return nil, &ProviderError{Provider: "ollama", Kind: "upstream", Status: 404, Message: "model not found"}
}

// Audit 2026-11-05: a wrong model name marks every document pending (another model), the run stops at the first one;
// after the name is fixed only the stopped document is embedded again, the others are completed without a call.
func TestFixedModelNameDoesNotReembedPendingRows(t *testing.T) {
	db := newKnowledgeTestDB(t)
	seedKnowledgeSources(t, db)
	if err := NewRetriever(db).UpsertSources(context.Background(), &modelEmbedder{model: "embeddinggemma"}); err != nil {
		t.Fatal(err)
	}
	if err := NewRetriever(db).UpsertSources(context.Background(), &missingModelEmbedder{}); err == nil {
		t.Fatal("a missing model must stop the run")
	}
	if got := embeddingStatuses(t, db); got != "pending=6" {
		t.Fatalf("after the wrong model: %s", got)
	}
	fixed := &modelEmbedder{model: "embeddinggemma"}
	r := NewRetriever(db)
	if err := r.UpsertSources(context.Background(), fixed); err != nil {
		t.Fatal(err)
	}
	if r.Stats.Embedded != 1 || r.Stats.Skipped != 5 || len(fixed.inputs) != 1 || embeddingStatuses(t, db) != "completed=6" {
		t.Fatalf("after the fix: stats=%+v embeds=%d statuses=%s", r.Stats, len(fixed.inputs), embeddingStatuses(t, db))
	}
}
