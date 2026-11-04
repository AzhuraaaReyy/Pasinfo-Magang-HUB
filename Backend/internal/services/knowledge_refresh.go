package services

import (
	"context"
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
}

// errInvalidEmbedding marks an embedding of the wrong shape for one document.
var errInvalidEmbedding = errors.New("invalid embedding")

// documentFailure reports an embedding error that belongs to one document: the provider refused the input (4xx other
// than 429) or returned an empty or malformed vector. Provider outages (connection, timeout, 5xx, quota) and database
// errors are not: they stop the run, since every following document would fail the same way.
func documentFailure(err error) bool {
	if errors.Is(err, errInvalidEmbedding) {
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
		return pe.Status >= 400 && pe.Status < 500 && pe.Status != 429
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
	if found && !r.Force && unchangedKnowledge(old, doc, EmbeddingModelOf(p)) {
		r.Stats.Skipped++
		if !unpublished || r.DryRun {
			return nil
		}
		return r.DB.WithContext(ctx).Model(&models.FAQKnowledgeBase{}).Where("id = ?", old.ID).Updates(map[string]any{"is_active": true, "metadata": doc.Metadata}).Error
	}
	if r.DryRun {
		r.Stats.Pending++
		return nil
	}
	embedCtx, input := documentEmbeddingInput(ctx, p, doc.Label, doc.Answer)
	v, err := r.embedForCorpus(embedCtx, p, input)
	if err == nil && v == nil {
		err = fmt.Errorf("%w: empty embedding", errInvalidEmbedding)
	}
	if err == nil {
		if dimErr := EnsureDims(v.Vector); dimErr != nil {
			err = fmt.Errorf("%w: %v", errInvalidEmbedding, dimErr)
		}
	}
	if err != nil {
		if !documentFailure(err) {
			// A provider outage or timeout stops the run; the log names the document it stopped at (jobdesk 4 Nov p5).
			return fmt.Errorf("embedding %s (%s): %w", corpusKey(doc.SourceType, doc.SourceID), doc.Label, err)
		}
		// The stored row (if any) keeps its previous text and vector; the source counts as published, so it is
		// not deactivated.
		r.Stats.Failed++
		log.Printf("[Knowledge] skipped %s (%s): %v", corpusKey(doc.SourceType, doc.SourceID), doc.Label, err)
		return nil
	}
	sourceType, sourceID, label, model, now := doc.SourceType, doc.SourceID, doc.Label, v.Model, time.Now()
	row := models.FAQKnowledgeBase{Question: doc.Label, Answer: doc.Answer, Category: doc.Category, SourceType: &sourceType, SourceID: &sourceID, SourceLabel: &label, IsActive: true, Embedding: pgvector.NewVector(v.Vector), EmbeddingModel: &model, EmbeddingUpdatedAt: &now, Metadata: doc.Metadata}
	if found {
		row.ID = old.ID
		row.CreatedAt = old.CreatedAt
		row.IsActive = old.IsActive || unpublished
		err = r.DB.WithContext(ctx).Save(&row).Error
	} else {
		err = r.DB.WithContext(ctx).Create(&row).Error
	}
	if err != nil {
		return fmt.Errorf("saving %s: %w", corpusKey(doc.SourceType, doc.SourceID), err)
	}
	r.Stats.Embedded++
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
	return old.Question == doc.Label && old.Answer == doc.Answer && old.Category == doc.Category &&
		pointerString(old.SourceLabel) == doc.Label && pointerString(old.EmbeddingModel) != "" &&
		len(old.Embedding.Slice()) == EmbeddingDimensions && sameJSON(old.Metadata, doc.Metadata)
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
// fetched later and changed data are embedded without a manual run.
const KnowledgeRefreshInterval = time.Hour

// refreshRequests asks the refresh job to run before its next hourly turn (F3, 2026-11-03: new news reaches the
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
	return r.Stats, err
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
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
			stats, err := RefreshKnowledge(ctx, db, p, seedRoot)
			cancel()
			switch {
			case errors.Is(err, ErrRefreshInProgress):
				log.Printf("[Knowledge] corpus refresh skipped: another refresh is running")
			case err != nil:
				log.Printf("[Knowledge] corpus refresh failed: %v", err)
			default:
				log.Printf("[Knowledge] corpus refreshed: embedded=%d unchanged=%d deactivated=%d failed=%d", stats.Embedded, stats.Skipped, stats.Deactivated, stats.Failed)
			}
			select {
			case <-time.After(KnowledgeRefreshInterval):
			case <-refreshRequests:
			}
		}
	}()
}
