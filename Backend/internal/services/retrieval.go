package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"slices"

	"github.com/pgvector/pgvector-go"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"strings"
	"time"
	"unicode/utf8"
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
	// Nearby holds the distance from the origin of a nearest-content question; nil otherwise. Never sent as JSON.
	Nearby *NearbyInfo `json:"-" gorm:"-"`
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
	// continues instead of stopping until the next scheduled run. 0 = defaults (65 s, 5 waits).
	RateLimitWait    time.Duration
	RateLimitRetries int
	lastEmbed        time.Time
	// published holds the sources saved in this run (corpusKey), for deactivateUnpublished.
	published map[string]bool
	// queueing collects the pending rows of an UpsertSources run in queue, processed after every source was read.
	queueing bool
	queue    []queuedDoc
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
		if err := r.DB.WithContext(ctx).Raw(`SELECT id,question,answer,category,source_type,source_id,source_label,metadata,embedding_model FROM faq_knowledge_bases WHERE is_active=true AND embedding IS NOT NULL AND source_type=? AND source_id=? LIMIT 1`, ref.SourceType, ref.SourceID).Scan(&rows).Error; err != nil {
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
	query := `SELECT k.id,k.question,k.answer,k.category,k.source_type,k.source_id,k.source_label,k.metadata,k.embedding_model FROM faq_knowledge_bases k JOIN event_occurrences o ON o.event_id = k.source_id WHERE k.is_active=true AND k.embedding IS NOT NULL AND k.source_type='event' AND (?='' OR k.metadata->>'region'=?) AND (o.ends_at >= ? OR (o.ends_at IS NULL AND (o.starts_at >= ? OR o.status='ongoing')))`
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
	if err := r.DB.WithContext(ctx).Raw(`SELECT id,question,answer,category,source_type,source_id,source_label,metadata,embedding_model FROM faq_knowledge_bases WHERE is_active=true AND embedding IS NOT NULL AND source_type='region' ORDER BY source_id`).Scan(&out).Error; err != nil {
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
	if err := r.DB.WithContext(ctx).Raw(`SELECT k.id,k.question,k.answer,k.category,k.source_type,k.source_id,k.source_label,k.metadata,k.embedding_model FROM faq_knowledge_bases k JOIN news n ON n.id = k.source_id WHERE k.is_active=true AND k.embedding IS NOT NULL AND k.source_type='news' AND (?='' OR k.metadata->>'news_category'=?) ORDER BY n.created_at DESC, k.id DESC LIMIT ?`, newsCategory, newsCategory, limit).Scan(&out).Error; err != nil {
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
	if err := r.DB.WithContext(ctx).Raw(`SELECT k.id,k.question,k.answer,k.category,k.source_type,k.source_id,k.source_label,k.metadata,k.embedding_model FROM faq_knowledge_bases k JOIN news n ON n.id = k.source_id WHERE k.is_active=true AND k.embedding IS NOT NULL AND k.source_type='news' AND n.views > 0 AND (?='' OR k.metadata->>'news_category'=?) ORDER BY n.views DESC, n.created_at DESC LIMIT ?`, newsCategory, newsCategory, limit).Scan(&out).Error; err != nil {
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
	return r.semanticSearch(ctx, p, q, SearchFilter{Category: cat}, limit)
}

// SemanticSearchInRegion is SemanticSearch restricted to sources of one map zone
// (faq_knowledge_bases.metadata->>'region', written by the upsert).
func (r *Retriever) SemanticSearchInRegion(ctx context.Context, p LLMProvider, q, cat, region string, limit int) ([]SemanticResult, error) {
	return r.semanticSearch(ctx, p, q, SearchFilter{Category: cat, Region: region}, limit)
}

// SemanticSearchNews is SemanticSearch restricted to the news of one categories.slug
// (faq_knowledge_bases.metadata->>'news_category', written by UpsertNews).
func (r *Retriever) SemanticSearchNews(ctx context.Context, p LLMProvider, q, newsCategory string, limit int) ([]SemanticResult, error) {
	return r.semanticSearch(ctx, p, q, SearchFilter{Category: "berita", NewsCategory: newsCategory}, limit)
}

// SearchFilter narrows a semantic search. The values are always bound as SQL parameters; the table names come only
// from filterSourceTables.
type SearchFilter struct {
	Category       string // faq_knowledge_bases.category
	Region         string // metadata region, the map zone
	NewsCategory   string // metadata news_category, a categories.slug
	SourceType     string // destination, culinary, culture, or event; needed by TravelCategory and District
	TravelCategory string // travel_categories.name of a destination
	District       string // places.district of the source
	// SourceTypes limits the search to these corpus source types (travel content search, jobdesk 9 Nov); empty = any.
	SourceTypes []string
	// TypeCode is the *_type code of a culinary, culture, or event source (with SourceType).
	TypeCode string
	// EligibleAt, when set, keeps only shown-able sources (eligibleSourceSQL) at that time.
	EligibleAt time.Time
}

// filterSourceTables lists the corpus source types whose rows have a place, with their table.
var filterSourceTables = map[string]string{"destination": "destinations", "culinary": "culinaries", "culture": "cultures", "event": "events"}

// straightKmSQL is the haversine distance in km from the bound point (lat, lat, lng) to places p (schema.md §8: nearby is
// calculated from places coordinates, never stored). least(1, …) keeps asin defined against rounding.
const straightKmSQL = `6371 * 2 * asin(least(1, sqrt(power(sin(radians(p.latitude - ?) / 2), 2) + cos(radians(?)) * cos(radians(p.latitude)) * power(sin(radians(p.longitude - ?) / 2), 2))))`

// NearestContent returns the active documents of one source type whose place lies within maxKm of from, nearest first,
// with the straight-line distance in Nearby. Excluded sources (the origin, earlier choices) are skipped, and an event
// counts only with an occurrence that is ongoing or ends today or later.
func (r *Retriever) NearestContent(ctx context.Context, sourceType string, from GeoPoint, exclude []SourceRef, today time.Time, maxKm float64, limit int) ([]SemanticResult, error) {
	table := filterSourceTables[sourceType]
	if table == "" {
		return nil, fmt.Errorf("nearest: unsupported source type %q", sourceType)
	}
	query := `SELECT k.id,k.question,k.answer,k.category,k.source_type,k.source_id,k.source_label,k.metadata,k.embedding_model, d.km AS straight_km, d.lat, d.lng FROM faq_knowledge_bases k JOIN (SELECT x.id, p.latitude AS lat, p.longitude AS lng, ` + straightKmSQL + ` AS km FROM ` + table + ` x JOIN places p ON p.id = x.place_id WHERE p.latitude <> 0 AND p.longitude <> 0) d ON d.id = k.source_id WHERE k.is_active = true AND k.embedding IS NOT NULL AND k.source_type = ? AND d.km <= ?`
	args := []any{from.Lat, from.Lat, from.Lng, sourceType, maxKm}
	var excluded []int64
	for _, ref := range exclude {
		if ref.SourceType == sourceType {
			excluded = append(excluded, ref.SourceID)
		}
	}
	if len(excluded) > 0 {
		query += ` AND k.source_id NOT IN ?`
		args = append(args, excluded)
	}
	if sourceType == "event" {
		start := time.Date(today.In(wib).Year(), today.In(wib).Month(), today.In(wib).Day(), 0, 0, 0, 0, wib).UTC()
		query += ` AND ` + upcomingOccurrenceSQL("k.source_id")
		args = append(args, start, start)
	}
	query += ` ORDER BY d.km, k.id LIMIT ?`
	args = append(args, limit)
	var rows []struct {
		SemanticResult
		StraightKm, Lat, Lng float64
	}
	// The origin may be the user's own location, which is never stored, also not in logs (Owner 2026-11-07). The SQL log
	// prints every bound value outside production and slow queries in production, so this query is not logged (T01, audit
	// 2026-11-08: the coordinates of a test location appeared in the container log). Its error is still returned.
	quiet := r.DB.WithContext(ctx).Session(&gorm.Session{Logger: r.DB.Logger.LogMode(logger.Silent)})
	if err := quiet.Raw(query, args...).Scan(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]SemanticResult, 0, len(rows))
	for _, row := range rows {
		doc := row.SemanticResult
		doc.RetrievalMethod = "nearest"
		doc.RelevanceStatus = "relevant"
		doc.Nearby = &NearbyInfo{StraightKm: row.StraightKm, Point: GeoPoint{Lat: row.Lat, Lng: row.Lng}}
		out = append(out, doc)
	}
	return out, nil
}

// contentPlaceSQL joins the active documents of the place-based domains to their place coordinates.
const contentPlaceSQL = `SELECT k.source_type, k.source_id, k.source_label AS label, p.latitude AS lat, p.longitude AS lng FROM faq_knowledge_bases k JOIN (SELECT 'destination' AS t, id, place_id FROM destinations UNION ALL SELECT 'culinary', id, place_id FROM culinaries UNION ALL SELECT 'culture', id, place_id FROM cultures UNION ALL SELECT 'event', id, place_id FROM events) x ON x.t = k.source_type AND x.id = k.source_id JOIN places p ON p.id = x.place_id WHERE k.is_active = true AND p.latitude <> 0 AND p.longitude <> 0`

// ContentPlace returns the place of a named content ("Bromo"), or of ref when ref is set; nil when none matches. A name
// matches a document label exactly, then as its start, then anywhere; the shortest label wins (Owner 2026-11-07: the
// closest match to the name, which the answer names). A label the user wrote in full (every word in evidence, the
// lower-case conversation) goes before that order: the reader shortened "Air Terjun [UJI 7 NOV]" to "Air Terjun", and
// the shortest label was another waterfall (N1, jobdesk 7 Nov).
func (r *Retriever) ContentPlace(ctx context.Context, name string, ref *SourceRef, evidence string) (*NearbyOrigin, error) {
	query, args := contentPlaceSQL, []any{}
	if ref != nil {
		query += ` AND k.source_type = ? AND k.source_id = ? LIMIT 1`
		args = append(args, ref.SourceType, ref.SourceID)
	} else {
		// The words of the name in their order, whatever lies between them: "Air Terjun UJI 7 NOV" finds "Air Terjun [UJI 7
		// NOV]" (N1, jobdesk 7 Nov). Words hold only letters and digits, so they carry no LIKE wildcard.
		words := nameWords(name)
		if len(words) == 0 {
			return nil, nil
		}
		like := strings.Join(words, "%")
		query += ` AND k.source_label ILIKE ? ORDER BY (lower(k.source_label) = lower(?)) DESC, (k.source_label ILIKE ?) DESC, length(k.source_label), k.id LIMIT ?`
		args = append(args, "%"+like+"%", strings.TrimSpace(name), like+"%", contentPlaceCandidates)
	}
	var rows []NearbyOrigin
	if err := r.DB.WithContext(ctx).Raw(query, args...).Scan(&rows).Error; err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, nil
	}
	return &rows[pickWrittenPlace(rows, evidence)], nil
}

// contentPlaceCandidates bounds the labels a name lookup compares with the conversation.
const contentPlaceCandidates = 20

// pickWrittenPlace returns the first candidate whose label the user wrote in full, else the first candidate.
func pickWrittenPlace(rows []NearbyOrigin, evidence string) int {
	if evidence == "" {
		return 0
	}
	for i, row := range rows {
		if wordsNamed(row.Label, evidence) {
			return i
		}
	}
	return 0
}

// relationClause returns the extra WHERE condition for the filters that need the domain tables. The corpus text
// already holds the related data, so these tables are read only to filter.
func (f SearchFilter) relationClause() (string, []any) {
	var clause strings.Builder
	var args []any
	if len(f.SourceTypes) > 0 {
		clause.WriteString(" AND source_type IN ?")
		args = append(args, f.SourceTypes)
	}
	if table := filterSourceTables[f.SourceType]; table != "" && (f.TravelCategory != "" || f.District != "" || f.TypeCode != "") {
		clause.WriteString(" AND source_type = ?")
		args = append(args, f.SourceType)
		if f.TravelCategory != "" && f.SourceType == "destination" {
			clause.WriteString(" AND EXISTS (SELECT 1 FROM destinations d JOIN travel_categories tc ON tc.id = d.category_id WHERE d.id = source_id AND tc.name = ?)")
			args = append(args, f.TravelCategory)
		}
		if column := typeColumns[f.SourceType]; f.TypeCode != "" && column != "" {
			clause.WriteString(" AND EXISTS (SELECT 1 FROM " + table + " x WHERE x.id = source_id AND x." + column + " = ?)")
			args = append(args, f.TypeCode)
		}
		if f.District != "" {
			clause.WriteString(" AND EXISTS (SELECT 1 FROM " + table + " x JOIN places pl ON pl.id = x.place_id WHERE x.id = source_id AND pl.district ILIKE ?)")
			args = append(args, f.District)
		}
	} else if f.District != "" && f.SourceType == "" && len(f.SourceTypes) > 0 {
		// A kecamatan over several domains: each source type is matched against its own table (T5-4, jobdesk 9 Nov).
		var parts []string
		for _, sourceType := range f.SourceTypes {
			if table := filterSourceTables[sourceType]; table != "" {
				parts = append(parts, "(source_type = ? AND EXISTS (SELECT 1 FROM "+table+" x JOIN places pl ON pl.id = x.place_id WHERE x.id = source_id AND pl.district ILIKE ?))")
				args = append(args, sourceType, f.District)
			}
		}
		if len(parts) > 0 {
			clause.WriteString(" AND (" + strings.Join(parts, " OR ") + ")")
		}
	}
	if !f.EligibleAt.IsZero() {
		clause.WriteString(eligibleSourceSQL)
		args = append(args, f.EligibleAt, f.EligibleAt)
	}
	return clause.String(), args
}

// upcomingOccurrenceSQL is the condition "the event of eventID still runs or is upcoming" with two time arguments (now,
// now); the recommendation candidates, the travel content search, and the nearest content use the same rule.
func upcomingOccurrenceSQL(eventID string) string {
	return `EXISTS (SELECT 1 FROM event_occurrences o WHERE o.event_id = ` + eventID + ` AND (o.ends_at >= ? OR (o.ends_at IS NULL AND (o.starts_at >= ? OR o.status = 'ongoing'))))`
}

// operatingSQL is the condition "the destination or culinary row alias is not closed" (schema.md §12 operational_status,
// Owner 2026-11-09): closed and temporarily_closed places are not recommended; open, unknown, and empty are. The chat
// still finds a closed place by its name, so it can tell that it is closed.
func operatingSQL(alias string) string {
	return `COALESCE(` + alias + `.operational_status, '') NOT IN ('closed', 'temporarily_closed')`
}

// eligibleSourceSQL keeps the corpus documents whose source row may be shown (jobdesk 9 Nov point 5): published content,
// and for an event a schedule still running or upcoming. It is checked in the search itself, before the ordering, so a
// finished event or a draft never takes a place among the nearest results; it takes the two time arguments of
// upcomingOccurrenceSQL.
var eligibleSourceSQL = ` AND CASE source_type` +
	` WHEN 'destination' THEN EXISTS (SELECT 1 FROM destinations x WHERE x.id = source_id AND x.status = 'published' AND ` + operatingSQL("x") + `)` +
	` WHEN 'culinary' THEN EXISTS (SELECT 1 FROM culinaries x WHERE x.id = source_id AND x.status = 'published' AND ` + operatingSQL("x") + `)` +
	` WHEN 'culture' THEN EXISTS (SELECT 1 FROM cultures x WHERE x.id = source_id AND x.status = 'published')` +
	` WHEN 'event' THEN EXISTS (SELECT 1 FROM events x WHERE x.id = source_id AND x.status = 'published' AND ` + upcomingOccurrenceSQL("x.id") + `)` +
	` ELSE false END`

// typeColumns are the category code columns of the domains whose card category comes from typeLabels.
var typeColumns = map[string]string{"culinary": "culinary_type", "culture": "culture_type", "event": "event_type"}

// TravelSearch narrows a travel content search (jobdesk 9 Nov points 1 and 5). Every filter is applied in the SQL of the
// semantic search, so the nearest documents are looked for among the matching ones only.
type TravelSearch struct {
	Domains  []string // wisata, kuliner, budaya, acara; empty = all four
	Zone     string   // map zone (metadata region): Kota Pasuruan, Pasuruan Barat, Timur, Utara, Selatan
	District string   // kecamatan of the place (places.district), any case
	Category string   // category name shown on the card ("Wisata Alam", "Tradisional"); needs exactly one domain
}

// ErrInvalidTravelFilter means a zone, kecamatan, or category of a travel search is not usable.
var ErrInvalidTravelFilter = errors.New("filter tidak valid")

// travelSearchDistrictMaxRunes bounds the kecamatan filter.
const travelSearchDistrictMaxRunes = 50

// travelSearchDomains are the content domains of the travel semantic search, in their default order (jobdesk 9 Nov
// point 1: destinations, culinary, culture, events). The names are the ones of the recommendation routes.
var travelSearchDomains = []struct{ Name, SourceType string }{
	{"wisata", "destination"}, {"kuliner", "culinary"}, {"budaya", "culture"}, {"acara", "event"},
}

// ErrUnknownTravelDomain means a domain other than wisata, kuliner, budaya, or acara was asked for.
var ErrUnknownTravelDomain = errors.New("domain harus wisata, kuliner, budaya, atau acara")

// SearchTravelContent finds the travel content whose meaning is closest to a keyword or a description of what a
// traveller needs ("pantai", "tempat sejuk dengan pemandangan gunung"): one query embedding, compared by cosine distance
// (pgvector <=>) with the corpus documents of the given domains; empty domains = all four. It reuses semanticSearch, so
// only active documents of the query's embedding model are compared, and each source appears once.
// Only published content (and events still running or upcoming) is compared, and the TravelSearch filters narrow it;
// invalid filters are refused before the query is embedded.
func (r *Retriever) SearchTravelContent(ctx context.Context, p LLMProvider, query string, s TravelSearch, limit int) ([]SemanticResult, error) {
	var types []string
	for _, d := range travelSearchDomains {
		if len(s.Domains) == 0 || slices.Contains(s.Domains, d.Name) {
			types = append(types, d.SourceType)
		}
	}
	for _, name := range s.Domains {
		if !slices.ContainsFunc(travelSearchDomains, func(d struct{ Name, SourceType string }) bool { return d.Name == name }) {
			return nil, fmt.Errorf("%w: %q", ErrUnknownTravelDomain, name)
		}
	}
	filter := SearchFilter{SourceTypes: types, EligibleAt: time.Now()}
	if s.Zone = strings.TrimSpace(s.Zone); s.Zone != "" {
		if !slices.Contains(planZones[1:], s.Zone) {
			return nil, fmt.Errorf("%w: zona harus Kota Pasuruan, Pasuruan Barat, Pasuruan Timur, Pasuruan Utara, atau Pasuruan Selatan", ErrInvalidTravelFilter)
		}
		filter.Region = s.Zone
	}
	if s.District = strings.TrimSpace(s.District); s.District != "" {
		if utf8.RuneCountInString(s.District) > travelSearchDistrictMaxRunes {
			return nil, fmt.Errorf("%w: kecamatan paling banyak %d karakter", ErrInvalidTravelFilter, travelSearchDistrictMaxRunes)
		}
		filter.District = s.District
	}
	if s.Category = strings.TrimSpace(s.Category); s.Category != "" {
		if len(types) != 1 {
			return nil, fmt.Errorf("%w: kategori hanya bisa dipakai dengan satu domain", ErrInvalidTravelFilter)
		}
		filter.SourceType = types[0]
		if types[0] == "destination" {
			filter.TravelCategory = s.Category
		} else {
			for code, label := range typeLabels[types[0]] {
				if strings.EqualFold(label, s.Category) {
					filter.TypeCode = code
				}
			}
			if filter.TypeCode == "" {
				return nil, fmt.Errorf("%w: kategori %q tidak ada di domain ini", ErrInvalidTravelFilter, s.Category)
			}
		}
	}
	return r.semanticSearch(ctx, p, query, filter, limit)
}

// SemanticSearchFiltered is SemanticSearch restricted by SearchFilter, including the table relations.
func (r *Retriever) SemanticSearchFiltered(ctx context.Context, p LLMProvider, q string, filter SearchFilter, limit int) ([]SemanticResult, error) {
	return r.semanticSearch(ctx, p, q, filter, limit)
}

func (r *Retriever) semanticSearch(ctx context.Context, p LLMProvider, q string, filter SearchFilter, limit int) ([]SemanticResult, error) {
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
	e = r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if tx.Dialector.Name() == "postgres" {
			if err := setHNSWSearch(tx); err != nil {
				return err
			}
		}
		relation, relationArgs := filter.relationClause()
		args := []any{vec, filter.Category, filter.Category, filter.Region, filter.Region, filter.NewsCategory, filter.NewsCategory, v.Model, v.Model}
		args = append(append(args, relationArgs...), vec, limit)
		return tx.Raw(`SELECT id,question,answer,category,source_type,source_id,source_label,metadata,embedding_model,embedding <=> ? distance FROM faq_knowledge_bases WHERE is_active=true AND embedding IS NOT NULL AND (?='' OR category=?) AND (?='' OR metadata->>'region'=?) AND (?='' OR metadata->>'news_category'=?) AND (?='' OR embedding_model=?)`+relation+` ORDER BY embedding <=> ? LIMIT ?`, args...).Scan(&out).Error
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

// hnswEfSearch is hnsw.ef_search for the vector searches (F1, jobdesk 9 Nov point 6). With the default 40 the live
// index missed the nearest document of short keywords ("pantai": Pantai Lekok 0.642 by exact scan, not returned; "candi"
// 0.599 → 0.545); with 100 every measured query (5 scenarios, 6 keywords) returned the exact-scan result.
const hnswEfSearch = 100

// setHNSWSearch sets the HNSW search of the current transaction (SET LOCAL lasts for this transaction only; PostgreSQL
// only). HNSW reads only hnsw.ef_search neighbours before the WHERE filters; without iterative scan a filtered search
// (zone, news category, model) can return no rows once the planner uses the index (2026-11-02: forced HNSW, zone
// "Pasuruan Selatan" → 0 of 15 rows).
func setHNSWSearch(tx *gorm.DB) error {
	if err := tx.Exec("SET LOCAL hnsw.iterative_scan = strict_order").Error; err != nil {
		return err
	}
	return tx.Exec(fmt.Sprintf("SET LOCAL hnsw.ef_search = %d", hnswEfSearch)).Error
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
	if !r.DryRun {
		if err := r.resetStaleProcessing(ctx); err != nil {
			return err
		}
	}
	// Every new or changed document is marked pending first, then embedded one by one (jobdesk 5 Nov p4).
	r.queueing, r.queue = true, nil
	defer func() { r.queueing, r.queue = false, nil }()
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
	if err := r.DB.WithContext(ctx).Preload("Place").Preload("Region").Preload("Prices").Preload("Facilities").Preload("TravelCategory").Preload("Hours").Where("status=?", "published").Find(&rows).Error; err != nil {
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
	if err := r.embedManualFAQ(ctx, p); err != nil {
		return err
	}
	if err := r.processQueue(ctx, p); err != nil {
		return err
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
	if err := r.DB.WithContext(ctx).Preload("Place").Preload("Menus").Preload("Hours").Where("status = ?", "published").Find(&culinaires).Error; err != nil {
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
