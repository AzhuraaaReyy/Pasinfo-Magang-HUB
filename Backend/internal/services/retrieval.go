package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"

	"github.com/pgvector/pgvector-go"
	"gorm.io/gorm"

	"strings"
	"time"
	"wildan-news-backend/internal/config"
	"wildan-news-backend/internal/models"
)

type SemanticResult struct {
	ID              int64           `json:"id"`
	Question        string          `json:"question"`
	Answer          string          `json:"answer"`
	Category        string          `json:"category"`
	SourceType      *string         `json:"source_type"`
	SourceID        *int64          `json:"source_id"`
	SourceLabel     *string         `json:"source_label"`
	Metadata        json.RawMessage `json:"metadata"`
	Distance        float64         `json:"distance"`
	Similarity      float64         `json:"similarity"`
	EmbeddingModel  string          `json:"embedding_model"`
	RetrievalMethod string          `json:"retrieval_method"`
	RelevanceStatus string          `json:"relevance_status"`
}

const DefaultRelevanceThreshold = 0.60

// EmbeddingGemma task prompts: queries and documents are embedded with different prefixes
// (model card format); stored answers stay unchanged.
const queryEmbeddingPrefix = "task: search result | query: "

func documentEmbeddingText(title, text string) string {
	return "title: " + title + " | text: " + text
}

// Gemini embedContent task types (ai.google.dev/gemini-api/docs/embeddings): gemini-embedding-001 takes the
// task as a request field instead of a text prefix.
const (
	geminiTaskQuery    = "RETRIEVAL_QUERY"
	geminiTaskDocument = "RETRIEVAL_DOCUMENT"
)

// usesGeminiTaskType reports whether the embedding model takes taskType (gemini-embedding-001). Other models
// keep the EmbeddingGemma prefixes, so their stored vectors stay valid.
func usesGeminiTaskType(model string) bool { return model == "gemini-embedding-001" }

// queryEmbeddingInput returns the context and text for embedding a search query with p.
func queryEmbeddingInput(ctx context.Context, p LLMProvider, q string) (context.Context, string) {
	if usesGeminiTaskType(EmbeddingModelOf(p)) {
		return WithEmbedTask(ctx, EmbedTask{Type: geminiTaskQuery}), q
	}
	return ctx, queryEmbeddingPrefix + q
}

// documentEmbeddingInput returns the context and text for embedding a corpus document with p.
func documentEmbeddingInput(ctx context.Context, p LLMProvider, title, text string) (context.Context, string) {
	if usesGeminiTaskType(EmbeddingModelOf(p)) {
		return WithEmbedTask(ctx, EmbedTask{Type: geminiTaskDocument, Title: title}), text
	}
	return ctx, documentEmbeddingText(title, text)
}

// relevanceThreshold is EMBED_RELEVANCE_THRESHOLD when it is valid, otherwise DefaultRelevanceThreshold
// (tuned for embeddinggemma). Other embedding models score unrelated text higher (gemini-embedding-001:
// median 0.632 for unrelated candidates, 2026-11-01), so each deploy sets it with its embedding model.
func relevanceThreshold() float64 {
	if t := config.RelevanceThreshold(); t > judgeCandidateFloor && t < 1 {
		return t
	}
	return DefaultRelevanceThreshold
}

type Retriever struct {
	DB *gorm.DB
	// Regions maps source_type ("culinary", "culture", "event") → slug → region name, loaded from
	// the seed files when building the corpus (these domains have no region column). Nil = none.
	Regions map[string]map[string]string
	// Verifications maps "VerifiableType:id" (PascalCase, schema.md §66) → verification status,
	// loaded by UpsertSources. Nil = no verification line in the corpus text.
	Verifications map[string]string
	// Force embeds every document even when unchanged; DryRun only counts what would be embedded.
	Force, DryRun bool
	// Stats counts the documents of the last upsert run.
	Stats RefreshStats
	// EmbedInterval paces corpus embeddings (EMBED_REQUESTS_PER_MINUTE); 0 = no pause.
	EmbedInterval time.Duration
	// RateLimitWait and RateLimitRetries: on a provider quota error (429) the corpus refresh waits and
	// continues instead of stopping until the next hourly run. 0 = defaults (65 s, 5 waits).
	RateLimitWait    time.Duration
	RateLimitRetries int
	lastEmbed        time.Time
	// published holds the sources saved in this run (corpusKey), for deactivateUnpublished.
	published map[string]bool
}

func NewRetriever(db *gorm.DB) *Retriever { return &Retriever{DB: db} }

// region returns the map zone of a culinary, culture, or event row: from the kecamatan of its place (places.district,
// T1 jobdesk 2 Nov, 2026-11-03), Kota Pasuruan from places.regency, or else the seed file zone (Regions).
func (r *Retriever) region(sourceType, slug string, place *models.Place) string {
	if place != nil {
		if zone := ZoneOfDistrict(place.District); zone != "" {
			return zone
		}
		if place.Regency == RegencyKota {
			return "Kota Pasuruan"
		}
	}
	return r.Regions[sourceType][slug]
}

// loadVerifications reads the verification status of every verifiable record.
func (r *Retriever) loadVerifications(ctx context.Context) error {
	var rows []models.Verification
	if err := r.DB.WithContext(ctx).Select("verifiable_type", "verifiable_id", "status").Find(&rows).Error; err != nil {
		return err
	}
	r.Verifications = make(map[string]string, len(rows))
	for _, row := range rows {
		r.Verifications[fmt.Sprintf("%s:%d", row.VerifiableType, row.VerifiableID)] = row.Status
	}
	return nil
}

// verificationLine is the corpus line for a record's verification status, or "" when it has none.
// "pending" is shown as unverified (AGENTS.md §20); other codes are written as words.
func (r *Retriever) verificationLine(verifiableType string, id uint) string {
	status, ok := r.Verifications[fmt.Sprintf("%s:%d", verifiableType, id)]
	if !ok || strings.TrimSpace(status) == "" {
		return ""
	}
	if status == "pending" {
		status = "belum terverifikasi"
	}
	return "\nStatus verifikasi: " + strings.ReplaceAll(status, "-", " ")
}

func retrievalPointerString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func pointerInt64Value(value *int64) int64 {
	if value == nil {
		return 0
	}
	return *value
}

// LoadSources returns the active knowledge documents of the given sources in the given order;
// sources that are missing or inactive are skipped. No embedding is needed.
func (r *Retriever) LoadSources(ctx context.Context, refs []SourceRef) ([]SemanticResult, error) {
	var out []SemanticResult
	for _, ref := range refs {
		var rows []SemanticResult
		if err := r.DB.WithContext(ctx).Raw(`SELECT id,question,answer,category,source_type,source_id,source_label,metadata,embedding_model FROM faq_knowledge_bases WHERE is_active=true AND source_type=? AND source_id=? LIMIT 1`, ref.SourceType, ref.SourceID).Scan(&rows).Error; err != nil {
			return nil, err
		}
		for _, row := range rows {
			row.RetrievalMethod = "follow_up_previous_sources"
			row.RelevanceStatus = "relevant"
			out = append(out, row)
		}
	}
	return out, nil
}

// EventsInPeriod returns the active event documents with an occurrence in [from, to), earliest first;
// a zero to means no end. An occurrence without an end date counts on its start day, or from its start
// onward while its status is "ongoing". region ("" = any) uses the zone metadata of SemanticSearchInRegion.
func (r *Retriever) EventsInPeriod(ctx context.Context, from, to time.Time, region string, limit int) ([]SemanticResult, error) {
	if limit < 1 {
		limit = defaultListCount
	}
	query := `SELECT k.id,k.question,k.answer,k.category,k.source_type,k.source_id,k.source_label,k.metadata,k.embedding_model FROM faq_knowledge_bases k JOIN event_occurrences o ON o.event_id = k.source_id WHERE k.is_active=true AND k.source_type='event' AND (?='' OR k.metadata->>'region'=?) AND (o.ends_at >= ? OR (o.ends_at IS NULL AND (o.starts_at >= ? OR o.status='ongoing')))`
	args := []any{region, region, from.UTC(), from.UTC()}
	if !to.IsZero() {
		query += ` AND o.starts_at < ?`
		args = append(args, to.UTC())
	}
	query += ` GROUP BY k.id ORDER BY MIN(o.starts_at), k.id LIMIT ?`
	args = append(args, limit)
	var out []SemanticResult
	if err := r.DB.WithContext(ctx).Raw(query, args...).Scan(&out).Error; err != nil {
		return nil, err
	}
	for i := range out {
		out[i].RetrievalMethod = "event_schedule"
		out[i].RelevanceStatus = "relevant"
	}
	return out, nil
}

// regionMetadata is the knowledge row metadata that names the map zone of its source ("" = none).
func regionMetadata(region string) []byte {
	if strings.TrimSpace(region) == "" {
		return nil
	}
	b, _ := json.Marshal(map[string]string{"region": region})
	return b
}

// newsMetadata is the knowledge row metadata that names the categories.slug of a news item ("" = none).
func newsMetadata(slug string) []byte {
	if strings.TrimSpace(slug) == "" {
		return nil
	}
	b, _ := json.Marshal(map[string]string{"news_category": slug})
	return b
}

// RegionDocuments returns every active map-zone document (source_type "region"), in id order.
func (r *Retriever) RegionDocuments(ctx context.Context) ([]SemanticResult, error) {
	var out []SemanticResult
	if err := r.DB.WithContext(ctx).Raw(`SELECT id,question,answer,category,source_type,source_id,source_label,metadata,embedding_model FROM faq_knowledge_bases WHERE is_active=true AND source_type='region' ORDER BY source_id`).Scan(&out).Error; err != nil {
		return nil, err
	}
	for i := range out {
		out[i].RetrievalMethod = "region_overview"
		out[i].RelevanceStatus = "relevant"
	}
	return out, nil
}

// LatestNews returns the active news documents most recently added to the database (news.created_at;
// published_at is empty in staging), optionally of one categories.slug.
func (r *Retriever) LatestNews(ctx context.Context, newsCategory string, limit int) ([]SemanticResult, error) {
	if limit < 1 {
		limit = defaultListCount
	}
	var out []SemanticResult
	if err := r.DB.WithContext(ctx).Raw(`SELECT k.id,k.question,k.answer,k.category,k.source_type,k.source_id,k.source_label,k.metadata,k.embedding_model FROM faq_knowledge_bases k JOIN news n ON n.id = k.source_id WHERE k.is_active=true AND k.source_type='news' AND (?='' OR k.metadata->>'news_category'=?) ORDER BY n.created_at DESC, k.id DESC LIMIT ?`, newsCategory, newsCategory, limit).Scan(&out).Error; err != nil {
		return nil, err
	}
	for i := range out {
		out[i].RetrievalMethod = "news_latest"
		out[i].RelevanceStatus = "relevant"
	}
	return out, nil
}

// PopularNews returns the active news documents with readers (news.views > 0), most read first,
// optionally of one categories.slug. It is empty while no news has been read through the API.
func (r *Retriever) PopularNews(ctx context.Context, newsCategory string, limit int) ([]SemanticResult, error) {
	if limit < 1 {
		limit = defaultListCount
	}
	var out []SemanticResult
	if err := r.DB.WithContext(ctx).Raw(`SELECT k.id,k.question,k.answer,k.category,k.source_type,k.source_id,k.source_label,k.metadata,k.embedding_model FROM faq_knowledge_bases k JOIN news n ON n.id = k.source_id WHERE k.is_active=true AND k.source_type='news' AND n.views > 0 AND (?='' OR k.metadata->>'news_category'=?) ORDER BY n.views DESC, n.created_at DESC LIMIT ?`, newsCategory, newsCategory, limit).Scan(&out).Error; err != nil {
		return nil, err
	}
	for i := range out {
		out[i].RetrievalMethod = "news_popular"
		out[i].RelevanceStatus = "relevant"
	}
	return out, nil
}

// NewsCategories returns the categories table with the number of published news items in each.
func (r *Retriever) NewsCategories(ctx context.Context) ([]NewsCategory, error) {
	var out []NewsCategory
	err := r.DB.WithContext(ctx).Raw(`SELECT c.slug, c.name, COUNT(n.id) AS news_count FROM categories c LEFT JOIN news n ON n.category_id = c.id AND n.status = 'published' GROUP BY c.id, c.slug, c.name ORDER BY c.id`).Scan(&out).Error
	return out, err
}

func (r *Retriever) SemanticSearch(ctx context.Context, p LLMProvider, q, cat string, limit int) ([]SemanticResult, error) {
	return r.semanticSearch(ctx, p, q, cat, "", "", limit)
}

// SemanticSearchInRegion is SemanticSearch restricted to sources of one map zone
// (faq_knowledge_bases.metadata->>'region', written by the upsert).
func (r *Retriever) SemanticSearchInRegion(ctx context.Context, p LLMProvider, q, cat, region string, limit int) ([]SemanticResult, error) {
	return r.semanticSearch(ctx, p, q, cat, region, "", limit)
}

// SemanticSearchNews is SemanticSearch restricted to the news of one categories.slug
// (faq_knowledge_bases.metadata->>'news_category', written by UpsertNews).
func (r *Retriever) SemanticSearchNews(ctx context.Context, p LLMProvider, q, newsCategory string, limit int) ([]SemanticResult, error) {
	return r.semanticSearch(ctx, p, q, "berita", "", newsCategory, limit)
}

func (r *Retriever) semanticSearch(ctx context.Context, p LLMProvider, q, cat, region, newsCategory string, limit int) ([]SemanticResult, error) {
	if strings.TrimSpace(q) == "" {
		return nil, fmt.Errorf("query required")
	}
	if limit < 1 {
		limit = 5
	}
	if limit > 50 {
		limit = 50
	}
	embedCtx, input := queryEmbeddingInput(ctx, p, q)
	v, e := p.Embed(embedCtx, input)
	if e != nil {
		return nil, e
	}
	if v == nil {
		return nil, fmt.Errorf("empty embedding")
	}
	if e = EnsureDims(v.Vector); e != nil {
		return nil, e
	}
	vec := pgvector.NewVector(v.Vector)
	var out []SemanticResult
	// Only documents embedded with the same model as the query are compared: vectors of another model
	// (after a provider change, before the refresh re-embeds them) live in another space and would
	// return unrelated documents without any error.
	// HNSW reads only hnsw.ef_search (40) neighbours before the WHERE filters; without iterative scan a
	// filtered search (zone, news category, model) can return no rows once the planner uses the index
	// (2026-11-02: forced HNSW, zone "Pasuruan Selatan" → 0 of 15 rows). SET LOCAL lasts for this query only.
	e = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if tx.Dialector.Name() == "postgres" {
			if err := tx.Exec("SET LOCAL hnsw.iterative_scan = strict_order").Error; err != nil {
				return err
			}
		}
		return tx.Raw(`SELECT id,question,answer,category,source_type,source_id,source_label,metadata,embedding_model,embedding <=> ? distance FROM faq_knowledge_bases WHERE is_active=true AND embedding IS NOT NULL AND (?='' OR category=?) AND (?='' OR metadata->>'region'=?) AND (?='' OR metadata->>'news_category'=?) AND (?='' OR embedding_model=?) ORDER BY embedding <=> ? LIMIT ?`, vec, cat, cat, region, region, newsCategory, newsCategory, v.Model, v.Model, vec, limit).Scan(&out).Error
	})
	if e != nil {
		return nil, e
	}
	filtered := out[:0]
	seenSources := make(map[string]struct{})
	threshold := relevanceThreshold()
	for i := range out {
		out[i].Similarity = 1 - out[i].Distance
		out[i].RetrievalMethod = "semantic"
		if out[i].Similarity >= threshold {
			out[i].RelevanceStatus = "relevant"
		} else {
			out[i].RelevanceStatus = "low_confidence"
		}
		sourceKey := fmt.Sprintf("%s:%d", retrievalPointerString(out[i].SourceType), pointerInt64Value(out[i].SourceID))
		if _, exists := seenSources[sourceKey]; exists {
			continue
		}
		seenSources[sourceKey] = struct{}{}
		filtered = append(filtered, out[i])
	}
	return filtered, nil
}

// corpusRefreshLock is the PostgreSQL advisory lock key held during a corpus refresh (F2, 2026-11-03), so the API job
// and a manual embed-faq (or two API instances) never refresh the same corpus at once.
const corpusRefreshLock = 772031103

// ErrRefreshInProgress means another process is refreshing the corpus; this run did nothing.
var ErrRefreshInProgress = errors.New("corpus refresh already running")

// UpsertSources refreshes the corpus from the domain tables. On PostgreSQL it holds corpusRefreshLock on one
// connection for the whole run and returns ErrRefreshInProgress when another process holds it.
func (r *Retriever) UpsertSources(ctx context.Context, p LLMProvider) error {
	if r.DB.Dialector.Name() != "postgres" {
		return r.upsertSources(ctx, p)
	}
	return r.DB.Connection(func(conn *gorm.DB) error {
		var locked bool
		if err := conn.WithContext(ctx).Raw("SELECT pg_try_advisory_lock(?)", corpusRefreshLock).Scan(&locked).Error; err != nil {
			return err
		}
		if !locked {
			return ErrRefreshInProgress
		}
		// Unlock with a fresh context: the connection goes back to the pool and must not keep the lock.
		defer conn.WithContext(context.Background()).Exec("SELECT pg_advisory_unlock(?)", corpusRefreshLock)
		db := r.DB
		r.DB = conn
		defer func() { r.DB = db }()
		return r.upsertSources(ctx, p)
	})
}

func (r *Retriever) upsertSources(ctx context.Context, p LLMProvider) error {
	r.published = map[string]bool{}
	if err := r.loadVerifications(ctx); err != nil {
		return err
	}
	if err := r.UpsertNews(ctx, p); err != nil {
		return err
	}
	if err := r.UpsertTravelDomains(ctx, p); err != nil {
		return err
	}
	if err := r.UpsertRegions(ctx, p); err != nil {
		return err
	}
	var rows []models.Destination
	if err := r.DB.WithContext(ctx).Preload("Place").Preload("Region").Preload("Prices").Preload("Facilities").Preload("TravelCategory").Where("status=?", "published").Find(&rows).Error; err != nil {
		return err
	}
	for _, d := range rows {
		answer := destinationKnowledgeText(d) + r.verificationLine("Destination", d.ID)
		id, err := safeInt64(d.ID)
		if err != nil {
			return err
		}
		if err := r.saveKnowledge(ctx, p, knowledgeDoc{Category: "wisata", SourceType: "destination", SourceID: id, Label: d.Name, Answer: answer, Metadata: regionMetadata(d.Region.Name)}); err != nil {
			return err
		}
	}
	return r.deactivateUnpublished(ctx)
}

func (r *Retriever) UpsertRegions(ctx context.Context, p LLMProvider) error {
	var regions []models.Region
	if err := r.DB.WithContext(ctx).Find(&regions).Error; err != nil {
		return err
	}
	for _, region := range regions {
		answer := "Wilayah Pasuruan: " + region.Name + "\nNama wilayah Pasuruan: " + region.Name
		if region.Slug != "" {
			answer += "\nSlug: " + region.Slug
		}
		if region.ShortDescription != "" {
			answer += "\nDeskripsi: " + region.ShortDescription
		}
		if region.CenterLatitude != 0 || region.CenterLongitude != 0 {
			answer += fmt.Sprintf("\nKoordinat pusat: %.7f, %.7f", region.CenterLatitude, region.CenterLongitude)
		}
		if err := r.upsertTravelKnowledge(ctx, p, "umum", "region", region.ID, region.Name, answer, region.Name); err != nil {
			return err
		}
	}
	return nil
}

func (r *Retriever) UpsertTravelDomains(ctx context.Context, p LLMProvider) error {
	var culinaires []models.Culinary
	if err := r.DB.WithContext(ctx).Preload("Place").Preload("Menus").Where("status = ?", "published").Find(&culinaires).Error; err != nil {
		return err
	}
	for _, item := range culinaires {
		answer := culinaryKnowledgeText(item, r.region("culinary", item.Slug, item.Place)) + r.verificationLine("Culinary", item.ID)
		if err := r.upsertTravelKnowledge(ctx, p, "kuliner", "culinary", item.ID, item.Name, answer, r.region("culinary", item.Slug, item.Place)); err != nil {
			return err
		}
	}
	var cultures []models.Culture
	if err := r.DB.WithContext(ctx).Preload("Place").Where("status = ?", "published").Find(&cultures).Error; err != nil {
		return err
	}
	for _, item := range cultures {
		answer := cultureKnowledgeText(item, r.region("culture", item.Slug, item.Place)) + r.verificationLine("Culture", item.ID)
		if err := r.upsertTravelKnowledge(ctx, p, "budaya", "culture", item.ID, item.Name, answer, r.region("culture", item.Slug, item.Place)); err != nil {
			return err
		}
	}
	var events []models.Event
	if err := r.DB.WithContext(ctx).Preload("Place").Preload("Occurrences").Preload("Tickets").Where("status = ?", "published").Find(&events).Error; err != nil {
		return err
	}
	for _, item := range events {
		answer := eventKnowledgeText(item, r.region("event", item.Slug, item.Place)) + r.verificationLine("Event", item.ID)
		if err := r.upsertTravelKnowledge(ctx, p, "acara", "event", item.ID, item.Name, answer, r.region("event", item.Slug, item.Place)); err != nil {
			return err
		}
	}
	return nil
}

func (r *Retriever) upsertTravelKnowledge(ctx context.Context, p LLMProvider, category, sourceType string, sourceID uint, label, answer, region string) error {
	id, err := safeInt64(sourceID)
	if err != nil {
		return err
	}
	return r.saveKnowledge(ctx, p, knowledgeDoc{Category: category, SourceType: sourceType, SourceID: id, Label: label, Answer: answer, Metadata: regionMetadata(region)})
}

func safeInt64(value uint) (int64, error) {
	if uint64(value) > math.MaxInt64 {
		return 0, fmt.Errorf("id %d melebihi kapasitas int64", value)
	}
	return int64(value), nil
}

func (r *Retriever) UpsertNews(ctx context.Context, p LLMProvider) error {
	var rows []models.News
	if e := r.DB.WithContext(ctx).Preload("Category").Where("status = ?", "published").Find(&rows).Error; e != nil {
		return e
	}
	for _, n := range rows {
		id, err := safeInt64(n.ID)
		if err != nil {
			return err
		}
		if err := r.saveKnowledge(ctx, p, knowledgeDoc{Category: "berita", SourceType: "news", SourceID: id, Label: n.Title, Answer: newsKnowledgeText(n), Metadata: newsMetadata(n.Category.Slug)}); err != nil {
			return err
		}
	}
	return nil
}
