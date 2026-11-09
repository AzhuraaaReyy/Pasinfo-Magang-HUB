package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"reflect"
	"strings"
	"time"

	"github.com/pgvector/pgvector-go"
	"gorm.io/gorm"
	"wildan-news-backend/internal/config"
	"wildan-news-backend/internal/models"
)

// knowledgeDoc is one corpus document built from the domain tables.
type knowledgeDoc struct {
	Category, SourceType string
	SourceID             int64
	Label, Answer        string
	Metadata             []byte
}

// RefreshStats counts the documents of one corpus refresh.
type RefreshStats struct {
	Embedded int // new or changed documents that were embedded and saved
	Skipped  int // unchanged documents, left as they are
	Pending  int // changed documents not embedded because the refresh is a dry run
	// Deactivated counts active rows whose source is no longer published or no longer exists
	// (in a dry run: rows that would be deactivated).
	Deactivated int
	// Failed counts documents the provider could not embed (input refused, empty or malformed vector); they were
	// skipped so the rest of the refresh went on (F1, jobdesk 2 Nov p4, 2026-11-03). They are tried again next run.
	Failed int
	// Deferred counts failed rows left for later: their retry time has not come, or they used every allowed attempt.
	Deferred int
}

// Embedding status of a corpus row (embedding_status; W3, jobdesk 5 Nov p4, Owner option B, 2026-11-05).
const (
	embeddingPending    = "pending"    // new or changed, waiting in this run's queue (or left by a stopped run)
	embeddingProcessing = "processing" // being embedded now
	embeddingCompleted  = "completed"  // vector matches the stored text
	embeddingFailed     = "failed"     // last attempt failed; embedding_error holds the cause
)

// Retry policy of a failed document (jobdesk 5 Nov p5): after the n-th failure the row waits embeddingRetryDelay(n)
// (15 min, 30 min, 1 h, 2 h); after maxEmbeddingAttempts failures it is not retried automatically any more, until its
// source text changes or embed-faq -force runs. Retries inside one call (connection, 5xx) stay with RetryProvider.
const maxEmbeddingAttempts = 5

func embeddingRetryDelay(attempts int) time.Duration { return 15 * time.Minute << (attempts - 1) }

// retryDue reports whether a failed row may be tried again now; nil = no automatic retry left.
func retryDue(next *time.Time, now time.Time) bool { return next != nil && !now.Before(*next) }

// maxEmbeddingErrorRunes bounds embedding_error; provider messages are already cut to 300 characters.
const maxEmbeddingErrorRunes = 500

// queuedDoc is a corpus row waiting to be embedded in this run.
type queuedDoc struct {
	ID         int64
	Key, Label string
	Text       string        // embedding input text (normalized)
	Doc        *knowledgeDoc // nil for a manual FAQ row
	Attempts   int           // failures counted before this run
	KeepActive bool          // is_active written with a sourced document
	// FAQMetadata is the metadata a manual FAQ row gets on success (its text fingerprint); nil for a sourced document.
	FAQMetadata []byte
}

// faqTextKey holds, in the metadata of a manual FAQ row, the fingerprint of the text its vector was made from (A2,
// jobdesk 5 Nov audit, 2026-11-05): an edit by plain SQL does not touch updated_at (no trigger, no FAQ API), so the
// worker compares the text itself.
const faqTextKey = "embedded_text_sha256"

func faqTextFingerprint(question, answer string) string {
	sum := sha256.Sum256([]byte(question + "\x00" + answer))
	return hex.EncodeToString(sum[:])
}

// errInvalidEmbedding marks an embedding of the wrong shape for one document.
var errInvalidEmbedding = errors.New("invalid embedding")

// documentFailure reports an embedding error that belongs to one document: the provider refused the input (400, 413,
// 422), returned an empty or malformed vector, or embedding it panicked. Provider outages (connection, timeout, 5xx,
// quota) and setup errors (401/403 key, 404 model not found) are not: they stop the run, since every following
// document would fail the same way, and they do not count against the document's attempts (A1, jobdesk 5 Nov audit,
// 2026-11-05: a missing model failed 6/6 documents, and 5 outages left a healthy document without automatic retry).
func documentFailure(err error) bool {
	if errors.Is(err, errInvalidEmbedding) || errors.Is(err, errDocumentPanic) {
		return true
	}
	var pe *ProviderError
	if !errors.As(err, &pe) {
		return false
	}
	switch pe.Kind {
	case "format", "empty":
		return true
	case "upstream":
		return pe.Status == 400 || pe.Status == 413 || pe.Status == 422
	}
	return false
}

// sourceUnpublishedKey marks in metadata a row the refresh deactivated because its source left the published
// set (K2, jobdesk 31 Okt, 2026-11-03). Only such rows are reactivated when the source is published again; a
// row deactivated by an operator has no marker and stays inactive.
const sourceUnpublishedKey = "source_unpublished"

// corpusKey identifies the source of one corpus row.
func corpusKey(sourceType string, sourceID int64) string {
	return fmt.Sprintf("%s:%d", sourceType, sourceID)
}

// saveKnowledge embeds and saves a document only when it is new or changed, so a refresh with no data
// change makes no embedding call and no write. A document deactivated by an operator stays inactive.
func (r *Retriever) saveKnowledge(ctx context.Context, p LLMProvider, doc knowledgeDoc) error {
	if r.published == nil {
		r.published = map[string]bool{}
	}
	r.published[corpusKey(doc.SourceType, doc.SourceID)] = true
	doc.Label, doc.Answer = strings.TrimSpace(knowledgeSpaces.ReplaceAllString(doc.Label, " ")), normalizeKnowledgeText(doc.Answer)
	var old models.FAQKnowledgeBase
	err := r.DB.WithContext(ctx).Where("source_type = ? AND source_id = ?", doc.SourceType, doc.SourceID).First(&old).Error
	found := err == nil
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("reading corpus row %s: %w", corpusKey(doc.SourceType, doc.SourceID), err)
	}
	unpublished := found && hasUnpublishedMarker(old.Metadata)
	if unpublished {
		// The source is published again: compare without the marker, so an unchanged text is not re-embedded.
		old.Metadata = withoutUnpublishedMarker(old.Metadata)
	}
	key := corpusKey(doc.SourceType, doc.SourceID)
	if found && !r.Force && vectorMatchesText(old) && unchangedKnowledge(old, doc, EmbeddingModelOf(p)) {
		r.Stats.Skipped++
		if r.DryRun {
			return nil
		}
		columns := map[string]any{}
		if old.EmbeddingStatus != embeddingCompleted {
			// Left pending by a stopped run although its vector still fits: no new embedding is needed (audit
			// 2026-11-05: a wrong model name, then fixed, re-embedded all 366 documents).
			columns["embedding_status"] = embeddingCompleted
		}
		if unpublished {
			columns["is_active"], columns["metadata"] = true, doc.Metadata
		}
		if len(columns) == 0 {
			return nil
		}
		return r.DB.WithContext(ctx).Model(&models.FAQKnowledgeBase{}).Where("id = ?", old.ID).Updates(columns).Error
	}
	// The attempts of an unchanged text carry over (also through a provider outage, which leaves the row pending); a
	// failed row follows the retry policy; a changed text starts the count again.
	attempts := 0
	if found && !r.Force && sameDocText(old, doc) {
		if old.EmbeddingStatus == embeddingFailed && !retryDue(old.EmbeddingNextRetryAt, time.Now()) {
			r.Stats.Deferred++
			return nil
		}
		attempts = old.EmbeddingAttempts
	}
	if r.DryRun {
		r.Stats.Pending++
		return nil
	}
	item := queuedDoc{ID: old.ID, Key: key, Label: doc.Label, Text: doc.Answer, Doc: &doc, Attempts: attempts, KeepActive: !found || old.IsActive || unpublished}
	if found {
		// The row keeps its previous text and vector (still searchable) until the new embedding is saved.
		if err := r.setEmbeddingStatus(ctx, old.ID, embeddingPending); err != nil {
			return fmt.Errorf("saving %s: %w", key, err)
		}
	} else {
		// A new source gets its row now, without a vector: the search and the other corpus reads skip it until it
		// is completed (embedding IS NOT NULL).
		sourceType, sourceID, label := doc.SourceType, doc.SourceID, doc.Label
		row := models.FAQKnowledgeBase{Question: doc.Label, Answer: doc.Answer, Category: doc.Category, SourceType: &sourceType, SourceID: &sourceID, SourceLabel: &label, IsActive: true, EmbeddingStatus: embeddingPending, Metadata: doc.Metadata}
		if err := r.DB.WithContext(ctx).Omit("Embedding").Create(&row).Error; err != nil {
			return fmt.Errorf("saving %s: %w", key, err)
		}
		item.ID = row.ID
	}
	return r.enqueue(ctx, p, item)
}

// enqueue adds a pending row to this run's queue; outside UpsertSources (a single domain upsert) it is processed at once.
func (r *Retriever) enqueue(ctx context.Context, p LLMProvider, item queuedDoc) error {
	if r.queueing {
		r.queue = append(r.queue, item)
		return nil
	}
	return r.processQueued(ctx, p, item)
}

// processQueue embeds the queued rows in order. A document failure is recorded and the queue goes on; a provider
// outage or a database error stops the run, and the rows not reached stay pending for the next run.
func (r *Retriever) processQueue(ctx context.Context, p LLMProvider) error {
	queue := r.queue
	r.queue, r.queueing = nil, false
	for _, item := range queue {
		if err := r.processQueued(ctx, p, item); err != nil {
			return err
		}
	}
	return nil
}

// processQueued embeds one pending row: processing → completed, or failed with its cause and next retry time.
func (r *Retriever) processQueued(ctx context.Context, p LLMProvider, item queuedDoc) error {
	if err := r.setEmbeddingStatus(ctx, item.ID, embeddingProcessing); err != nil {
		return fmt.Errorf("saving %s: %w", item.Key, err)
	}
	v, err := r.embedQueued(ctx, p, item)
	if err != nil {
		return r.recordEmbeddingFailure(ctx, item, err)
	}
	// Both timestamps get the same value, so a manual FAQ reads as embedded after its last edit.
	now := time.Now()
	columns := map[string]any{"embedding": pgvector.NewVector(v.Vector), "embedding_model": v.Model, "embedding_updated_at": now, "updated_at": now,
		"embedding_status": embeddingCompleted, "embedding_attempts": 0, "embedding_error": nil, "embedding_next_retry_at": nil}
	if item.Doc != nil {
		item.Doc.textColumns(columns)
		columns["is_active"] = item.KeepActive
	} else if item.FAQMetadata != nil {
		columns["metadata"] = item.FAQMetadata
	}
	if err := r.DB.WithContext(ctx).Model(&models.FAQKnowledgeBase{}).Where("id = ?", item.ID).UpdateColumns(columns).Error; err != nil {
		return fmt.Errorf("saving %s: %w", item.Key, err)
	}
	// The log names every document that was embedded, as it already does for a failed one (jobdesk 7 Nov p4: the counts
	// alone did not tell which data was processed).
	log.Printf("[Knowledge] embedded %s (%s), model %s, row %d", item.Key, item.Label, v.Model, item.ID)
	r.Stats.Embedded++
	return nil
}

// errDocumentPanic marks a panic while embedding one document (jobdesk 5 Nov p5): it is that document's failure, so
// the queue goes on instead of the same row stopping every later run.
var errDocumentPanic = errors.New("panic while embedding")

func (r *Retriever) embedQueued(ctx context.Context, p LLMProvider, item queuedDoc) (v *EmbeddingResponse, err error) {
	defer func() {
		if value := recover(); value != nil {
			v, err = nil, fmt.Errorf("%w: %v", errDocumentPanic, value)
		}
	}()
	return r.embedDocument(ctx, p, item.Label, item.Text)
}

// recordEmbeddingFailure stores the failure on the row and logs it. A sourced row takes the new text, so a later
// change of the source is noticed; its previous vector stays until a retry succeeds. A failure that belongs to the
// document is counted (failed, attempts + 1, next retry time) and the run goes on. A provider outage or setup error
// stops the run: the row goes back to pending with the cause in embedding_error and its attempts unchanged, so the next
// run tries it again at once (A1, jobdesk 5 Nov audit).
func (r *Retriever) recordEmbeddingFailure(ctx context.Context, item queuedDoc, cause error) error {
	message := []rune(cause.Error())
	if len(message) > maxEmbeddingErrorRunes {
		message = message[:maxEmbeddingErrorRunes]
	}
	documentError := documentFailure(cause)
	attempts := item.Attempts
	columns := map[string]any{"embedding_status": embeddingPending, "embedding_error": string(message), "embedding_next_retry_at": nil}
	retry := "pending again for the next run"
	if documentError {
		attempts++
		var next *time.Time
		retry = "no automatic retry left"
		if attempts < maxEmbeddingAttempts {
			t := time.Now().Add(embeddingRetryDelay(attempts))
			next, retry = &t, "next retry after "+t.Format(time.RFC3339)
		}
		columns["embedding_status"], columns["embedding_attempts"], columns["embedding_next_retry_at"] = embeddingFailed, attempts, next
	}
	if item.Doc != nil {
		item.Doc.textColumns(columns)
		columns["is_active"] = item.KeepActive
	} else if item.FAQMetadata != nil {
		// The fingerprint of the tried text: the next run sees no edit and follows the retry policy.
		columns["metadata"] = item.FAQMetadata
	}
	if err := r.DB.WithContext(ctx).Model(&models.FAQKnowledgeBase{}).Where("id = ?", item.ID).UpdateColumns(columns).Error; err != nil {
		return fmt.Errorf("saving %s: %w", item.Key, err)
	}
	if !documentError {
		// A provider outage or timeout stops the run; the log names the document it stopped at (jobdesk 4 Nov p5).
		log.Printf("[Knowledge] stopped at %s (%s), provider unavailable, %s: %v", item.Key, item.Label, retry, cause)
		return fmt.Errorf("embedding %s (%s): %w", item.Key, item.Label, cause)
	}
	log.Printf("[Knowledge] failed %s (%s), attempt %d/%d, %s: %v", item.Key, item.Label, attempts, maxEmbeddingAttempts, retry, cause)
	r.Stats.Failed++
	return nil
}

// textColumns adds the document text columns of a sourced row to an update.
func (doc *knowledgeDoc) textColumns(columns map[string]any) {
	columns["question"], columns["answer"], columns["category"], columns["source_label"], columns["metadata"] = doc.Label, doc.Answer, doc.Category, doc.Label, doc.Metadata
}

func (r *Retriever) setEmbeddingStatus(ctx context.Context, id int64, status string) error {
	return r.DB.WithContext(ctx).Model(&models.FAQKnowledgeBase{}).Where("id = ?", id).UpdateColumn("embedding_status", status).Error
}

// resetStaleProcessing puts back to pending the rows a stopped run left in processing; the advisory lock of
// UpsertSources means no other run is processing them.
func (r *Retriever) resetStaleProcessing(ctx context.Context) error {
	res := r.DB.WithContext(ctx).Model(&models.FAQKnowledgeBase{}).Where("embedding_status = ?", embeddingProcessing).UpdateColumn("embedding_status", embeddingPending)
	if res.Error != nil {
		return fmt.Errorf("resetting stale processing rows: %w", res.Error)
	}
	if res.RowsAffected > 0 {
		log.Printf("[Knowledge] %d rows left in processing by a stopped run are pending again", res.RowsAffected)
	}
	return nil
}

// embedDocument embeds one corpus document and checks the vector; a missing or wrongly sized vector is errInvalidEmbedding.
func (r *Retriever) embedDocument(ctx context.Context, p LLMProvider, title, text string) (*EmbeddingResponse, error) {
	embedCtx, input := documentEmbeddingInput(ctx, p, title, text)
	v, err := r.embedForCorpus(embedCtx, p, input)
	if err == nil && v == nil {
		err = fmt.Errorf("%w: empty embedding", errInvalidEmbedding)
	}
	if err == nil {
		if dimErr := EnsureDims(v.Vector); dimErr != nil {
			err = fmt.Errorf("%w: %v", errInvalidEmbedding, dimErr)
		}
	}
	return v, err
}

// embedManualFAQ embeds the active corpus rows without a source (a FAQ added directly to faq_knowledge_bases, category
// umum/layanan): they have no domain row to compare with, so a row is processed when it has no embedding, was embedded
// with another model, is not completed, or its text differs from the fingerprint stored in metadata (faqTextKey). Its
// text is stored as written; only the embedding input is normalized. W2, jobdesk 5 Nov p2, Owner option A (2026-11-05):
// before this such a row was never embedded and so never found by the search. A2 (audit, 2026-11-05): the fingerprint
// replaces updated_at > embedding_updated_at, which a plain SQL UPDATE left untouched; an edit starts the attempts
// again, an unedited failed row follows the retry policy.
func (r *Retriever) embedManualFAQ(ctx context.Context, p LLMProvider) error {
	var rows []struct {
		models.FAQKnowledgeBase
		HasVector bool
	}
	// Manual FAQ rows are few, so every active one is read and the decision is made here.
	if err := r.DB.WithContext(ctx).Model(&models.FAQKnowledgeBase{}).
		Select("id, question, answer, metadata, embedding_model, embedding_updated_at, updated_at, embedding_status, embedding_attempts, embedding_next_retry_at, embedding IS NOT NULL AS has_vector").
		Where("source_type IS NULL AND is_active = ?", true).Find(&rows).Error; err != nil {
		return fmt.Errorf("reading manual FAQ rows: %w", err)
	}
	model := EmbeddingModelOf(p)
	for _, row := range rows {
		key := fmt.Sprintf("faq:%d", row.ID)
		meta := metadataMap(row.Metadata)
		fingerprint := faqTextFingerprint(row.Question, row.Answer)
		// The fingerprint finds every edit, with or without updated_at; a row embedded before it existed is embedded once.
		edited := meta[faqTextKey] != fingerprint
		stale := !row.HasVector || row.EmbeddingStatus != embeddingCompleted || pointerString(row.EmbeddingModel) == "" ||
			(model != "" && pointerString(row.EmbeddingModel) != model) || row.EmbeddingUpdatedAt == nil
		if !r.Force && !edited && !stale {
			continue
		}
		attempts := 0
		if !r.Force && !edited {
			if row.EmbeddingStatus == embeddingFailed && !retryDue(row.EmbeddingNextRetryAt, time.Now()) {
				r.Stats.Deferred++
				continue
			}
			attempts = row.EmbeddingAttempts
		}
		if r.DryRun {
			r.Stats.Pending++
			continue
		}
		if err := r.setEmbeddingStatus(ctx, row.ID, embeddingPending); err != nil {
			return fmt.Errorf("saving %s: %w", key, err)
		}
		meta[faqTextKey] = fingerprint
		withFingerprint, _ := json.Marshal(meta)
		label := strings.TrimSpace(knowledgeSpaces.ReplaceAllString(row.Question, " "))
		if err := r.enqueue(ctx, p, queuedDoc{ID: row.ID, Key: key, Label: label, Text: normalizeKnowledgeText(row.Answer), Attempts: attempts, FAQMetadata: withFingerprint}); err != nil {
			return err
		}
	}
	return nil
}

// deactivateUnpublished deactivates the active corpus rows whose source was not saved in this run: the source
// was unpublished or deleted, so the chatbot must not use it any more. It runs only after every source was
// saved, so a failed run never deactivates anything.
func (r *Retriever) deactivateUnpublished(ctx context.Context) error {
	var rows []models.FAQKnowledgeBase
	if err := r.DB.WithContext(ctx).Select("id", "source_type", "source_id", "metadata").Where("is_active = ? AND source_type IS NOT NULL AND source_id IS NOT NULL", true).Find(&rows).Error; err != nil {
		return err
	}
	for _, row := range rows {
		if r.published[corpusKey(*row.SourceType, *row.SourceID)] {
			continue
		}
		r.Stats.Deactivated++
		if r.DryRun {
			continue
		}
		log.Printf("[Knowledge] deactivating %s: source no longer published", corpusKey(*row.SourceType, *row.SourceID))
		if err := r.DB.WithContext(ctx).Model(&models.FAQKnowledgeBase{}).Where("id = ?", row.ID).Updates(map[string]any{"is_active": false, "metadata": withUnpublishedMarker(row.Metadata)}).Error; err != nil {
			return err
		}
	}
	return nil
}

func metadataMap(metadata []byte) map[string]any {
	m := map[string]any{}
	if len(metadata) > 0 {
		_ = json.Unmarshal(metadata, &m)
	}
	return m
}

func hasUnpublishedMarker(metadata []byte) bool {
	return metadataMap(metadata)[sourceUnpublishedKey] == true
}

func withUnpublishedMarker(metadata []byte) []byte {
	m := metadataMap(metadata)
	m[sourceUnpublishedKey] = true
	out, _ := json.Marshal(m)
	return out
}

// withoutUnpublishedMarker returns the metadata without the marker; nil when nothing else is left.
func withoutUnpublishedMarker(metadata []byte) []byte {
	m := metadataMap(metadata)
	delete(m, sourceUnpublishedKey)
	if len(m) == 0 {
		return nil
	}
	out, _ := json.Marshal(m)
	return out
}

// Defaults for a provider quota error during a corpus refresh (Gemini free tier refused after 66 embeddings
// in about 35 s, 2026-11-01; a request succeeded again a few minutes later).
const (
	defaultRateLimitWait    = 65 * time.Second
	defaultRateLimitRetries = 5
)

// embedForCorpus embeds one corpus document. It keeps EmbedInterval between two calls, and on a quota
// error (ProviderError kind rate_limit) it waits and tries again, so a refresh finishes in one run.
func (r *Retriever) embedForCorpus(ctx context.Context, p LLMProvider, text string) (*EmbeddingResponse, error) {
	wait, retries := r.RateLimitWait, r.RateLimitRetries
	if wait <= 0 {
		wait = defaultRateLimitWait
	}
	if retries <= 0 {
		retries = defaultRateLimitRetries
	}
	for attempt := 0; ; attempt++ {
		if r.EmbedInterval > 0 && !r.lastEmbed.IsZero() {
			if err := sleepContext(ctx, time.Until(r.lastEmbed.Add(r.EmbedInterval))); err != nil {
				return nil, err
			}
		}
		r.lastEmbed = time.Now()
		v, err := p.Embed(ctx, text)
		var pe *ProviderError
		if err == nil || !errors.As(err, &pe) || pe.Kind != "rate_limit" || attempt >= retries {
			return v, err
		}
		log.Printf("[Knowledge] provider quota reached; waiting %s before continuing (%d/%d)", wait, attempt+1, retries)
		if err := sleepContext(ctx, wait); err != nil {
			return nil, err
		}
	}
}

// sleepContext waits d, or returns the context error when ctx ends first.
func sleepContext(ctx context.Context, d time.Duration) error {
	if d <= 0 {
		return nil
	}
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-timer.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// unchangedKnowledge compares the stored row with a freshly built document. Metadata is compared as
// JSON values: PostgreSQL returns jsonb as {"region": "X"}, Go writes {"region":"X"}. A row embedded with
// another model than the active one (provider or model change, e.g. Ollama in development and an API
// provider in production) is changed, so the refresh re-embeds it; "" = the provider cannot tell.
func unchangedKnowledge(old models.FAQKnowledgeBase, doc knowledgeDoc, model string) bool {
	if model != "" && pointerString(old.EmbeddingModel) != model {
		return false
	}
	return sameDocText(old, doc) && pointerString(old.EmbeddingModel) != "" && len(old.Embedding.Slice()) == EmbeddingDimensions
}

// vectorMatchesText reports whether the stored vector was made from the stored text: true for a completed row, and for
// a row only marked pending or processing by a run that stopped before it (no error, no attempt). A failed row, or the
// row a run stopped at, may hold a newer text than its vector.
func vectorMatchesText(old models.FAQKnowledgeBase) bool {
	switch old.EmbeddingStatus {
	case embeddingCompleted:
		return true
	case embeddingPending, embeddingProcessing:
		return old.EmbeddingError == nil && old.EmbeddingAttempts == 0
	}
	return false
}

// sameDocText reports whether the stored row holds the document's text, label, category, and metadata.
func sameDocText(old models.FAQKnowledgeBase, doc knowledgeDoc) bool {
	return old.Question == doc.Label && old.Answer == doc.Answer && old.Category == doc.Category &&
		pointerString(old.SourceLabel) == doc.Label && sameJSON(old.Metadata, doc.Metadata)
}

func sameJSON(a, b []byte) bool {
	var x, y any
	if len(a) > 0 && json.Unmarshal(a, &x) != nil {
		return false
	}
	if len(b) > 0 && json.Unmarshal(b, &y) != nil {
		return false
	}
	return reflect.DeepEqual(x, y)
}

// KnowledgeRefreshInterval is how often the API checks the corpus against the domain tables, so news
// fetched later and changed data are embedded without a manual run. Travel data has no write API (seed or SQL only),
// so this check is what brings its changes in: 15 minutes since jobdesk 6 Nov (P1-1, Owner option D, 2026-11-06; was 1
// hour). A run without changes reads the corpus only (about 1 s, no embedding call).
const KnowledgeRefreshInterval = 15 * time.Minute

// refreshRequests asks the refresh job to run before its next scheduled turn (F3, 2026-11-03: new news reaches the
// corpus right after the fetch). One pending request is enough, so extra requests are dropped.
var refreshRequests = make(chan struct{}, 1)

// RequestKnowledgeRefresh asks the background job for an early refresh. It never blocks.
func RequestKnowledgeRefresh() {
	select {
	case refreshRequests <- struct{}{}:
	default:
	}
}

// knowledgeProviderWait is how often the job checks whether the embedding provider is reachable.
const knowledgeProviderWait = 30 * time.Second

// RefreshKnowledge builds the corpus from the domain tables and embeds only new or changed documents.
// It refuses to run when a seed region file cannot be read: culinary, culture, and event documents
// would lose their map zone.
func RefreshKnowledge(ctx context.Context, db *gorm.DB, p LLMProvider, seedRoot string) (RefreshStats, error) {
	regions, problems := LoadSeedRegions(seedRoot)
	if len(problems) > 0 {
		return RefreshStats{}, fmt.Errorf("seed region files: %v", problems)
	}
	r := NewRetriever(db)
	r.Regions = regions
	r.EmbedInterval = config.LoadLLM().EmbedInterval()
	err := r.UpsertSources(ctx, p)
	// Cached chat answers may name what changed (T03 stage 2); a run that stopped early may still have embedded some.
	if r.Stats.Embedded > 0 || r.Stats.Deactivated > 0 {
		markCorpusChanged()
	}
	return r.Stats, err
}

// refreshOnce runs one corpus refresh. A panic during the run (a provider or a document the code did not expect) is
// returned as an error: the worker goroutine has no other recover, and an unrecovered panic stopped the whole API
// process (W1, jobdesk 5 Nov p1, 2026-11-05: exit status 2 in a subprocess test). Nothing is deactivated by a run that
// stops early, since deactivateUnpublished runs only after every source was saved.
func refreshOnce(db *gorm.DB, p LLMProvider, seedRoot string) (stats RefreshStats, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()
	defer func() {
		if v := recover(); v != nil {
			err = fmt.Errorf("refresh panicked: %v", v)
		}
	}()
	return RefreshKnowledge(ctx, db, p, seedRoot)
}

// StartKnowledgeRefreshJob refreshes the corpus in the background: once the embedding provider is
// reachable after startup, then every KnowledgeRefreshInterval. Owner instruction 2026-10-31: no
// manual embed-faq run is needed when Docker and Ollama are running.
func StartKnowledgeRefreshJob(db *gorm.DB, p LLMProvider, seedRoot string) {
	go func() {
		for {
			for ProviderHealth(context.Background(), p) != nil {
				time.Sleep(knowledgeProviderWait)
			}
			started := time.Now()
			stats, err := refreshOnce(db, p, seedRoot)
			took := time.Since(started).Round(time.Millisecond)
			switch {
			case errors.Is(err, ErrRefreshInProgress):
				log.Printf("[Knowledge] corpus refresh skipped: another refresh is running")
			case err != nil:
				log.Printf("[Knowledge] corpus refresh failed after %s (embedded=%d failed=%d before the stop): %v", took, stats.Embedded, stats.Failed, err)
			default:
				log.Printf("[Knowledge] corpus refreshed in %s: embedded=%d unchanged=%d deactivated=%d failed=%d deferred=%d", took, stats.Embedded, stats.Skipped, stats.Deactivated, stats.Failed, stats.Deferred)
			}
			select {
			case <-time.After(KnowledgeRefreshInterval):
			case <-refreshRequests:
			}
		}
	}()
}
