package services

import (
	"context"
	"errors"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/pgvector/pgvector-go"
	"gorm.io/gorm"
	"wildan-news-backend/internal/config"
)

// Recommendation engine, Sprint 1 Tahap A (Owner 2026-11-03, plan docs/2 November 2026/RENCANA_MESIN_REKOMENDASI_SPRINT1.md):
// related content for one item, scored from content similarity (corpus vectors), location (kecamatan/zone), category,
// and editor signals. No LLM call. Popularity is not scored yet: there is no real visitor data (R1).

// Score weights of the plan. For news, location is replaced by recency.
const (
	recWeightSimilarity = 0.5
	recWeightLocation   = 0.25
	recWeightCategory   = 0.15
	recWeightEditor     = 0.10
	// recVectorPool is how many nearest corpus documents are read per request.
	recVectorPool = 200
	// recNewsRecencyDays: a news item older than this gets no recency score.
	recNewsRecencyDays = 90.0
)

// ErrRecommendSourceNotFound means the item asked for does not exist or is not published.
var ErrRecommendSourceNotFound = errors.New("recommendation source not found")

// recDomain describes one content domain: its URL name, corpus source type, verifiable type, table, and category column.
type recDomain struct {
	Name, SourceType, VerifiableType, Table, CategoryColumn string
}

var recDomains = map[string]recDomain{
	"wisata":  {"wisata", "destination", "Destination", "destinations", "category_id"},
	"kuliner": {"kuliner", "culinary", "Culinary", "culinaries", "culinary_type"},
	"budaya":  {"budaya", "culture", "Culture", "cultures", "culture_type"},
	"acara":   {"acara", "event", "Event", "events", "event_type"},
	"berita":  {"berita", "news", "", "news", "category_id"},
}

// IsTravelDomain reports a recommendation domain other than news.
func IsTravelDomain(name string) bool {
	d, ok := recDomains[name]
	return ok && d.SourceType != "news"
}

// RecommendationLocation is the place location of a recommended item.
type RecommendationLocation struct {
	District string `json:"district"`
	Regency  string `json:"regency"`
	Zone     string `json:"zone"`
}

// Recommendation is one related item (response DTO: public fields only, with source and verification, schema §64).
type Recommendation struct {
	Type               string                  `json:"type"`
	ID                 int64                   `json:"id,omitempty"` // news only: the news detail route uses the id
	Slug               *string                 `json:"slug"`
	Name               string                  `json:"name"`
	Summary            *string                 `json:"summary"`
	Category           *string                 `json:"category"`
	ThumbnailURL       *string                 `json:"thumbnail_url"`
	Location           *RecommendationLocation `json:"location"`
	Source             *string                 `json:"source"`
	VerificationStatus string                  `json:"verification_status"`
	Score              float64                 `json:"score"`
	Similarity         float64                 `json:"similarity"`
	Reasons            []string                `json:"reasons"`
}

// recRow holds the scoring fields of one item.
type recRow struct {
	ID          int64
	Slug        string
	Name        string
	CategoryKey string
	Featured    bool
	Keyakinan   string
	District    string
	Regency     string
	RegionName  string
	SourceName  string
	CreatedAt   time.Time
	PlaceID     int64 // places.id of a travel item; 0 for news or an item without a place
}

func (r recRow) zone() string {
	if zone := ZoneOfDistrict(r.District); zone != "" {
		return zone
	}
	if r.RegionName != "" {
		return r.RegionName
	}
	if r.Regency == RegencyKota {
		return "Kota Pasuruan"
	}
	return ""
}

// Recommender builds recommendations. Similar returns corpus similarity per target source id; nil uses pgvector.
type Recommender struct {
	DB      *gorm.DB
	Similar func(ctx context.Context, sourceType string, sourceID int64, targetType string, limit int) (map[int64]float64, error)
	Now     func() time.Time
}

func NewRecommender(db *gorm.DB) *Recommender { return &Recommender{DB: db} }

// Recommend returns up to limit items of domain target related to the published item key (slug, or id for news) of
// domain source. The source item itself is never returned; events are only those still running or upcoming.
func (r *Recommender) Recommend(ctx context.Context, source, key, target string, limit int) ([]Recommendation, error) {
	src, ok := recDomains[source]
	dst, ok2 := recDomains[target]
	if !ok || !ok2 {
		return nil, ErrRecommendSourceNotFound
	}
	now := time.Now()
	if r.Now != nil {
		now = r.Now()
	}
	origin, err := r.loadSource(ctx, src, key)
	if err != nil {
		return nil, err
	}
	similar := r.Similar
	if similar == nil {
		similar = r.vectorSimilarity
	}
	sims, err := similar(ctx, src.SourceType, origin.ID, dst.SourceType, recVectorPool)
	if err != nil {
		return nil, err
	}
	candidates, err := r.loadCandidates(ctx, dst, sims, now)
	if err != nil {
		return nil, err
	}
	verifications, err := r.verificationStatuses(ctx, dst, candidates)
	if err != nil {
		return nil, err
	}
	var list []rankedItem
	for _, c := range candidates {
		if source == target && c.ID == origin.ID {
			continue
		}
		// The same site in the other domain is not a recommendation for it (F12, jobdesk 9 Nov point 6: Candi Jawi
		// wisata → Candi Jawi budaya); samePlaceDomains as in onePlaceCard.
		if source != target && samePlaceDomains[src.SourceType] && samePlaceDomains[dst.SourceType] && origin.PlaceID != 0 && c.PlaceID == origin.PlaceID {
			continue
		}
		sim := sims[c.ID]
		score, reasons := scoreRecommendation(origin, c, sim, source == target, dst.SourceType == "news", verifications[c.ID], now)
		list = append(list, rankedItem{dst, c, score, sim, verifications[c.ID], reasons})
	}
	sortRanked(list)
	if len(list) > limit {
		list = list[:limit]
	}
	return r.buildCards(ctx, list)
}

// rankedItem is one scored candidate of a domain, before its card is built.
type rankedItem struct {
	domain       recDomain
	row          recRow
	score, sim   float64
	verification string
	reasons      []string
}

// sortRanked orders by score, highest first; equal scores by name, so the order is stable.
func sortRanked(list []rankedItem) {
	sort.SliceStable(list, func(i, j int) bool {
		if list[i].score != list[j].score {
			return list[i].score > list[j].score
		}
		return list[i].row.Name < list[j].row.Name
	})
}

// buildCards turns ranked items, of one or several domains, into recommendation cards in the same order.
func (r *Recommender) buildCards(ctx context.Context, list []rankedItem) ([]Recommendation, error) {
	keys := make([]SourceKey, 0, len(list))
	byDomain := map[string][]recRow{}
	domains := map[string]recDomain{}
	for _, s := range list {
		keys = append(keys, SourceKey{s.domain.SourceType, s.row.ID})
		byDomain[s.domain.SourceType] = append(byDomain[s.domain.SourceType], s.row)
		domains[s.domain.SourceType] = s.domain
	}
	cards, err := LoadSourceCards(ctx, r.DB, keys)
	if err != nil {
		return nil, err
	}
	sources := map[string]map[int64]string{}
	for sourceType, rows := range byDomain {
		if sources[sourceType], err = r.sourceNames(ctx, domains[sourceType], rows); err != nil {
			return nil, err
		}
	}
	out := make([]Recommendation, 0, len(list))
	for _, s := range list {
		d := s.domain
		card := cards[SourceKey{d.SourceType, s.row.ID}]
		item := Recommendation{Type: d.Name, Slug: card.Slug, Name: s.row.Name, Summary: card.Summary, Category: card.CategoryLabel, ThumbnailURL: card.ThumbnailURL, VerificationStatus: s.verification, Score: round3(s.score), Similarity: round3(s.sim), Reasons: s.reasons}
		if d.SourceType == "news" {
			item.ID = s.row.ID
		} else {
			item.Location = &RecommendationLocation{District: s.row.District, Regency: s.row.Regency, Zone: s.row.zone()}
		}
		if name := sources[d.SourceType][s.row.ID]; name != "" {
			item.Source = &name
		}
		if item.Reasons == nil {
			item.Reasons = []string{}
		}
		out = append(out, item)
	}
	return out, nil
}

// DefaultRecommendThreshold is the similarity a text recommendation needs when RECOMMEND_RELEVANCE_THRESHOLD is unset:
// chosen for gemini-embedding-001, the primary embedding model (OVERRIDE-RAG-007), by TestTravelRecommendationThreshold
// Evaluation on 2026-11-09 (17 queries, labels from the category, type, and name columns). At 0.61 the 5 off-topic
// queries got no card (highest 0.604) and keyword precision was 100%; the chat threshold 0.66 left 5 of 12 relevant
// queries empty, and 0.60 or lower let off-topic cards through. Only "candi" (top 0.599) stayed empty.
const DefaultRecommendThreshold = 0.61

// recommendThreshold is RECOMMEND_RELEVANCE_THRESHOLD when it is valid, otherwise DefaultRecommendThreshold.
func recommendThreshold() float64 {
	if t := config.RecommendThreshold(); t > 0 && t < 1 {
		return t
	}
	return DefaultRecommendThreshold
}

// RecommendByText turns the results of a travel semantic search (Retriever.SearchTravelContent) into recommendation
// cards, ordered by the cosine similarity of each item to the user's text, highest first (jobdesk 9 Nov point 3; Owner:
// order by similarity only). Each card reads the item's own published row, so it carries the same public fields as
// the item recommendations (name, slug, summary, category, thumbnail, location, source, verification). Only items that
// loadCandidates accepts are kept: published content, events still running or upcoming. A place that is both a
// destination and a culture item gets one card (onePlaceCard).
func (r *Recommender) RecommendByText(ctx context.Context, results []SemanticResult, limit int) ([]Recommendation, error) {
	now := time.Now()
	if r.Now != nil {
		now = r.Now()
	}
	threshold := recommendThreshold()
	sims := map[string]map[int64]float64{}
	for _, res := range results {
		if res.Similarity < threshold {
			continue
		}
		sourceType, id := pointerString(res.SourceType), pointerInt64Value(res.SourceID)
		if sims[sourceType] == nil {
			sims[sourceType] = map[int64]float64{}
		}
		if _, seen := sims[sourceType][id]; !seen {
			sims[sourceType][id] = res.Similarity
		}
	}
	var list []rankedItem
	for _, d := range travelSearchDomains {
		domain := recDomains[d.Name]
		found := sims[domain.SourceType]
		if len(found) == 0 {
			continue
		}
		candidates, err := r.loadCandidates(ctx, domain, found, now)
		if err != nil {
			return nil, err
		}
		verifications, err := r.verificationStatuses(ctx, domain, candidates)
		if err != nil {
			return nil, err
		}
		for _, c := range candidates {
			if sim, ok := found[c.ID]; ok {
				list = append(list, rankedItem{domain, c, sim, sim, verifications[c.ID], nil})
			}
		}
	}
	sortRanked(list)
	list = onePlaceCard(list)
	// The count bound is set by the caller (point 4); a limit below 1 cuts nothing rather than panicking.
	if limit > 0 && len(list) > limit {
		list = list[:limit]
	}
	return r.buildCards(ctx, list)
}

// samePlaceDomains are the domains that describe a place itself: one site can be both a destination and a culture
// item on the same places row (F2, jobdesk 9 Nov point 6: 9 published pairs, e.g. Candi Keboireng). A culinary business
// or an event at a place is something else, and two events can share a venue, so those are never merged.
var samePlaceDomains = map[string]bool{"destination": true, "culture": true}

// onePlaceCard keeps, of the destination and culture items on one place, only the first of list (ordered, so the most
// similar); the other items keep their order.
func onePlaceCard(list []rankedItem) []rankedItem {
	seen := map[int64]bool{}
	out := list[:0]
	for _, s := range list {
		if samePlaceDomains[s.domain.SourceType] && s.row.PlaceID != 0 {
			if seen[s.row.PlaceID] {
				continue
			}
			seen[s.row.PlaceID] = true
		}
		out = append(out, s)
	}
	return out
}

func round3(v float64) float64 { return math.Round(v*1000) / 1000 }

// scoreRecommendation scores one candidate against the origin item and names the reasons a visitor can read.
func scoreRecommendation(origin, c recRow, similarity float64, sameDomain, news bool, verification string, now time.Time) (float64, []string) {
	var reasons []string
	score := recWeightSimilarity * math.Max(0, similarity)
	if news {
		if !c.CreatedAt.IsZero() {
			days := now.Sub(c.CreatedAt).Hours() / 24
			score += recWeightLocation * math.Max(0, 1-days/recNewsRecencyDays)
			if days <= 7 {
				reasons = append(reasons, "berita terbaru")
			}
		}
	} else if origin.District != "" && strings.EqualFold(origin.District, c.District) {
		score += recWeightLocation
		reasons = append(reasons, "kecamatan sama")
	} else if zone := origin.zone(); zone != "" && zone == c.zone() {
		score += recWeightLocation * 0.6
		reasons = append(reasons, "zona sama")
	}
	if sameDomain && origin.CategoryKey != "" && origin.CategoryKey == c.CategoryKey {
		score += recWeightCategory
		reasons = append(reasons, "kategori sama")
	}
	editor := 0.0
	switch {
	case c.Featured:
		editor = 1
		reasons = append(reasons, "pilihan editor")
	case verification == "terverifikasi" || verification == "verified":
		editor = 0.7
		reasons = append(reasons, "terverifikasi")
	case verification == "jadwal-resmi":
		editor = 0.5
	case c.Keyakinan == "tinggi":
		editor = 0.5
	case c.Keyakinan == "sedang":
		editor = 0.3
	}
	return score + recWeightEditor*editor, reasons
}

// recSelect returns the scoring columns of a domain table aliased t.
func recSelect(d recDomain) string {
	if d.SourceType == "news" {
		return `SELECT t.id, COALESCE(t.slug,'') AS slug, t.title AS name, CAST(t.category_id AS TEXT) AS category_key, false AS featured, '' AS keyakinan, '' AS district, '' AS regency, '' AS region_name, COALESCE(t.source,'') AS source_name, t.created_at, 0 AS place_id FROM news t WHERE t.status = 'published'`
	}
	keyakinan, region, join := "COALESCE(t.keyakinan,'')", "''", ""
	switch d.SourceType {
	case "event":
		keyakinan = "''"
	case "destination":
		region, join = "COALESCE(r.name,'')", " LEFT JOIN regions r ON r.id = t.region_id"
	}
	return `SELECT t.id, t.slug, t.name, CAST(t.` + d.CategoryColumn + ` AS TEXT) AS category_key, t.featured, ` + keyakinan + ` AS keyakinan, COALESCE(p.district,'') AS district, COALESCE(p.regency,'') AS regency, ` + region + ` AS region_name, '' AS source_name, t.created_at, COALESCE(t.place_id, 0) AS place_id FROM ` + d.Table + ` t LEFT JOIN places p ON p.id = t.place_id` + join + ` WHERE t.status = 'published'`
}

func (r *Recommender) loadSource(ctx context.Context, d recDomain, key string) (recRow, error) {
	var rows []recRow
	q := recSelect(d) + ` AND t.slug = ?`
	arg := any(key)
	if d.SourceType == "news" {
		id, err := strconv.ParseInt(key, 10, 64)
		if err != nil {
			return recRow{}, ErrRecommendSourceNotFound
		}
		q, arg = recSelect(d)+` AND t.id = ?`, id
	}
	if err := r.DB.WithContext(ctx).Raw(q+` LIMIT 1`, arg).Scan(&rows).Error; err != nil {
		return recRow{}, err
	}
	if len(rows) == 0 {
		return recRow{}, ErrRecommendSourceNotFound
	}
	return rows[0], nil
}

// loadCandidates reads the published items of the target domain: news only among the nearest vectors (the table
// grows every fetch), travel domains completely (tens of rows). Events must still run or be upcoming; destinations and
// culinary places must not be closed (operatingSQL).
func (r *Recommender) loadCandidates(ctx context.Context, d recDomain, sims map[int64]float64, now time.Time) ([]recRow, error) {
	q := recSelect(d)
	var args []any
	switch d.SourceType {
	case "news":
		ids := make([]int64, 0, len(sims))
		for id := range sims {
			ids = append(ids, id)
		}
		if len(ids) == 0 {
			return nil, nil
		}
		q += ` AND t.id IN ?`
		args = append(args, ids)
	case "event":
		q += ` AND ` + upcomingOccurrenceSQL("t.id")
		args = append(args, now, now)
	case "destination", "culinary":
		q += ` AND ` + operatingSQL("t")
	}
	var rows []recRow
	err := r.DB.WithContext(ctx).Raw(q, args...).Scan(&rows).Error
	return rows, err
}

func (r *Recommender) verificationStatuses(ctx context.Context, d recDomain, rows []recRow) (map[int64]string, error) {
	out := map[int64]string{}
	if d.VerifiableType == "" || len(rows) == 0 {
		return out, nil
	}
	var found []struct {
		VerifiableID int64
		Status       string
	}
	idList := make([]int64, 0, len(rows))
	for _, x := range rows {
		idList = append(idList, x.ID)
	}
	if err := r.DB.WithContext(ctx).Raw(`SELECT verifiable_id, status FROM verifications WHERE verifiable_type = ? AND verifiable_id IN ?`, d.VerifiableType, idList).Scan(&found).Error; err != nil {
		return nil, err
	}
	for _, f := range found {
		out[f.VerifiableID] = f.Status
	}
	return out, nil
}

// sourceNames returns the data source per item: news keep it in news.source, travel items in sources/sourceables.
func (r *Recommender) sourceNames(ctx context.Context, d recDomain, rows []recRow) (map[int64]string, error) {
	out := map[int64]string{}
	if len(rows) == 0 {
		return out, nil
	}
	ids := make([]int64, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.ID)
		if row.SourceName != "" {
			out[row.ID] = row.SourceName
		}
	}
	if d.VerifiableType == "" {
		return out, nil
	}
	var found []struct {
		SourceableID int64
		Name         string
	}
	if err := r.DB.WithContext(ctx).Raw(`SELECT x.sourceable_id, s.name FROM sourceables x JOIN sources s ON s.id = x.source_id WHERE x.sourceable_type = ? AND x.sourceable_id IN ? ORDER BY x.id`, d.VerifiableType, ids).Scan(&found).Error; err != nil {
		return nil, err
	}
	for _, f := range found {
		if _, ok := out[f.SourceableID]; !ok {
			out[f.SourceableID] = f.Name
		}
	}
	return out, nil
}

// vectorSimilarity compares the corpus document of the source item with the documents of the target source type
// (cosine, HNSW, same embedding model). A source without an active embedded document gives no similarity.
func (r *Recommender) vectorSimilarity(ctx context.Context, sourceType string, sourceID int64, targetType string, limit int) (map[int64]float64, error) {
	out := map[int64]float64{}
	if r.DB.Dialector.Name() != "postgres" {
		return out, nil
	}
	err := r.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := setHNSWSearch(tx); err != nil {
			return err
		}
		var origin []struct {
			Embedding      pgvector.Vector
			EmbeddingModel string
		}
		if err := tx.Raw(`SELECT embedding, COALESCE(embedding_model,'') AS embedding_model FROM faq_knowledge_bases WHERE source_type = ? AND source_id = ? AND is_active = true AND embedding IS NOT NULL LIMIT 1`, sourceType, sourceID).Scan(&origin).Error; err != nil {
			return err
		}
		if len(origin) == 0 {
			return nil
		}
		var rows []struct {
			SourceID int64
			Distance float64
		}
		vec := origin[0].Embedding
		if err := tx.Raw(`SELECT source_id, embedding <=> ? AS distance FROM faq_knowledge_bases WHERE is_active = true AND embedding IS NOT NULL AND source_type = ? AND COALESCE(embedding_model,'') = ? ORDER BY embedding <=> ? LIMIT ?`, vec, targetType, origin[0].EmbeddingModel, vec, limit).Scan(&rows).Error; err != nil {
			return err
		}
		for _, row := range rows {
			out[row.SourceID] = 1 - row.Distance
		}
		return nil
	})
	return out, err
}

// chatEventGrace is how long after its last date an event is still recommended in chat (Owner 2026-11-03).
const chatEventGrace = 7 * 24 * time.Hour

// ChatRanking describes how RankChatCandidates reordered a chat recommendation context (stored as diagnostics).
type ChatRanking struct {
	Dropped  int    `json:"dropped"`
	District string `json:"district,omitempty"`
	Zone     string `json:"zone,omitempty"`
}

// RankChatCandidates orders the relevant documents of a chat recommendation with the recommendation engine (Tahap D,
// Owner 2026-11-03): similarity is the semantic similarity to the question, location is the kecamatan or zone the
// question names, plus the editor signals; documents that are not eligible (unpublished, past events: rules A1/A3)
// are dropped. Documents of other source types (regions) keep their similarity score. In chat an event stays eligible
// until chatEventGrace after its last date (Owner 2026-11-03, option B): it is then labelled as finished.
func (r *Recommender) RankChatCandidates(ctx context.Context, docs []SemanticResult, district, zone string, now time.Time) ([]SemanticResult, ChatRanking, error) {
	info := ChatRanking{District: district, Zone: zone}
	byType := map[string]recDomain{}
	for _, d := range recDomains {
		byType[d.SourceType] = d
	}
	ids := map[string]map[int64]float64{}
	for _, doc := range docs {
		st := retrievalPointerString(doc.SourceType)
		if _, ok := byType[st]; ok && doc.SourceID != nil {
			if ids[st] == nil {
				ids[st] = map[int64]float64{}
			}
			ids[st][*doc.SourceID] = doc.Similarity
		}
	}
	rows := map[string]map[int64]recRow{}
	statuses := map[string]map[int64]string{}
	for st, sims := range ids {
		d := byType[st]
		cutoff := now
		if st == "event" {
			cutoff = now.Add(-chatEventGrace)
		}
		candidates, err := r.loadCandidates(ctx, d, sims, cutoff)
		if err != nil {
			return nil, info, err
		}
		verifications, err := r.verificationStatuses(ctx, d, candidates)
		if err != nil {
			return nil, info, err
		}
		rows[st], statuses[st] = map[int64]recRow{}, verifications
		for _, c := range candidates {
			rows[st][c.ID] = c
		}
	}
	origin := recRow{District: district, RegionName: zone}
	type scored struct {
		doc   SemanticResult
		score float64
	}
	var list []scored
	for _, doc := range docs {
		st := retrievalPointerString(doc.SourceType)
		if _, ok := byType[st]; !ok || doc.SourceID == nil {
			list = append(list, scored{doc, recWeightSimilarity * math.Max(0, doc.Similarity)})
			continue
		}
		row, eligible := rows[st][*doc.SourceID]
		if !eligible {
			info.Dropped++
			continue
		}
		score, _ := scoreRecommendation(origin, row, doc.Similarity, false, st == "news", statuses[st][row.ID], now)
		list = append(list, scored{doc, score})
	}
	sort.SliceStable(list, func(i, j int) bool { return list[i].score > list[j].score })
	out := make([]SemanticResult, 0, len(list))
	for _, s := range list {
		out = append(out, s.doc)
	}
	return out, info, nil
}
