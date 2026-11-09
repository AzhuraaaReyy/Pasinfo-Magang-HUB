package services

import (
	"context"
	"fmt"
	"math"
	"os"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/pgvector/pgvector-go"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// vectorEmbedder returns a fixed vector, so the pgvector query is checked without an embedding provider call.
type vectorEmbedder struct {
	stubProvider
	vector []float32
	model  string
}

func (p *vectorEmbedder) Embed(context.Context, string) (*EmbeddingResponse, error) {
	return &EmbeddingResponse{Vector: p.vector, Model: p.model}, nil
}

func (p *vectorEmbedder) EmbeddingModel() string { return p.model }

// Jobdesk 9 Nov point 1 on a real corpus (read-only): TRAVEL_SEARCH_DSN points at a PostgreSQL + pgvector database with
// an embedded corpus. The query vector is a stored document's own vector, so that document must come first with a
// similarity of about 1, and every result must belong to the asked domains. With TRAVEL_SEARCH_LIVE_EMBED=1 the
// configured embedding provider also embeds a keyword and a description.
func TestSearchTravelContentOnPostgres(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if dsn == "" {
		t.Skip("TRAVEL_SEARCH_DSN not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	var doc struct {
		SourceID       int64
		SourceLabel    string
		Embedding      pgvector.Vector
		EmbeddingModel string
	}
	if err := db.Raw(`SELECT source_id, source_label, embedding, embedding_model FROM faq_knowledge_bases WHERE source_type = 'destination' AND is_active AND embedding IS NOT NULL ORDER BY source_id LIMIT 1`).Scan(&doc).Error; err != nil || doc.SourceID == 0 {
		t.Fatalf("no embedded destination: %v", err)
	}
	r := NewRetriever(db)
	p := &vectorEmbedder{vector: doc.Embedding.Slice(), model: doc.EmbeddingModel}

	all, err := r.SearchTravelContent(context.Background(), p, doc.SourceLabel, TravelSearch{}, 10)
	if err != nil || len(all) == 0 {
		t.Fatalf("all domains: %d results, err %v", len(all), err)
	}
	if pointerString(all[0].SourceType) != "destination" || pointerInt64Value(all[0].SourceID) != doc.SourceID || all[0].Similarity < 0.999 {
		t.Fatalf("first = %s:%d sim %.4f, want destination:%d sim ≈ 1", pointerString(all[0].SourceType), pointerInt64Value(all[0].SourceID), all[0].Similarity, doc.SourceID)
	}
	for i, res := range all {
		if !slices.Contains([]string{"destination", "culinary", "culture", "event"}, pointerString(res.SourceType)) {
			t.Fatalf("result %d has source type %q", i, pointerString(res.SourceType))
		}
		if i > 0 && res.Similarity > all[i-1].Similarity+1e-9 {
			t.Fatalf("results not ordered by similarity at %d", i)
		}
	}
	culinary, err := r.SearchTravelContent(context.Background(), p, doc.SourceLabel, TravelSearch{Domains: []string{"kuliner"}}, 5)
	if err != nil || len(culinary) == 0 {
		t.Fatalf("kuliner: %d results, err %v", len(culinary), err)
	}
	for _, res := range culinary {
		if pointerString(res.SourceType) != "culinary" {
			t.Fatalf("kuliner search returned %q", pointerString(res.SourceType))
		}
	}

	if os.Getenv("TRAVEL_SEARCH_LIVE_EMBED") != "1" {
		return
	}
	live, err := NewLLMFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	for _, q := range []string{"pantai", "tempat wisata dengan suasana sejuk dan pemandangan pegunungan"} {
		res, err := r.SearchTravelContent(context.Background(), live, q, TravelSearch{}, 5)
		if err != nil || len(res) == 0 {
			t.Fatalf("%q: %d results, err %v", q, len(res), err)
		}
		for _, x := range res {
			t.Logf("%q → %s %s %.3f", q, pointerString(x.SourceType), pointerString(x.SourceLabel), x.Similarity)
		}
	}
}

// cosine is the textbook cosine similarity, computed apart from pgvector to check its <=> operator.
func cosine(a, b []float32) float64 {
	var dot, na, nb float64
	for i := range a {
		dot += float64(a[i]) * float64(b[i])
		na += float64(a[i]) * float64(a[i])
		nb += float64(b[i]) * float64(b[i])
	}
	return dot / (math.Sqrt(na) * math.Sqrt(nb))
}

// Jobdesk 9 Nov point 2 on a real corpus (read-only, TRAVEL_SEARCH_DSN): the similarity of every result equals the
// cosine similarity computed here from the stored vectors (the corpus vectors are not unit length, so only cosine gives
// this order), and the HNSW index returns the same top results in the same order as an exact scan without the index.
func TestTravelSimilarityIsTheCosineOfTheStoredVectors(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if dsn == "" {
		t.Skip("TRAVEL_SEARCH_DSN not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	queries := map[string]*vectorEmbedder{}
	var doc struct {
		Embedding      pgvector.Vector
		EmbeddingModel string
	}
	db.Raw(`SELECT embedding, embedding_model FROM faq_knowledge_bases WHERE source_type = 'culture' AND is_active AND embedding IS NOT NULL ORDER BY source_id LIMIT 1`).Scan(&doc)
	queries["stored culture vector"] = &vectorEmbedder{vector: doc.Embedding.Slice(), model: doc.EmbeddingModel}
	if os.Getenv("TRAVEL_SEARCH_LIVE_EMBED") == "1" {
		live, err := NewLLMFromEnv()
		if err != nil {
			t.Fatal(err)
		}
		// "pantai" and "candi": short keywords whose nearest document the index missed with hnsw.ef_search 40 (F1, point 6).
		for _, q := range []string{"Rekomendasi kuliner khas Pasuruan", "Tempat bersejarah dan peninggalan kerajaan", "pantai", "candi"} {
			ctx, input := queryEmbeddingInput(context.Background(), live, q)
			v, err := live.Embed(ctx, input)
			if err != nil {
				t.Fatal(err)
			}
			queries[q] = &vectorEmbedder{vector: v.Vector, model: v.Model}
		}
	}
	r := NewRetriever(db)
	types := []string{"destination", "culinary", "culture", "event"}
	for name, q := range queries {
		got, err := r.SearchTravelContent(context.Background(), q, name, TravelSearch{}, 10)
		if err != nil || len(got) == 0 {
			t.Fatalf("%s: %d results, err %v", name, len(got), err)
		}
		var exact []struct {
			ID        int64
			Embedding pgvector.Vector
		}
		vec := pgvector.NewVector(q.vector)
		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec("SET LOCAL enable_indexscan = off").Error; err != nil {
				return err
			}
			now := time.Now()
			return tx.Raw(`SELECT id, embedding FROM faq_knowledge_bases WHERE is_active AND embedding IS NOT NULL AND embedding_model = ? AND source_type IN ?`+eligibleSourceSQL+` ORDER BY embedding <=> ? LIMIT 10`, q.model, types, now, now, vec).Scan(&exact).Error
		})
		if err != nil {
			t.Fatal(err)
		}
		stored := map[int64][]float32{}
		for i, row := range exact {
			stored[row.ID] = row.Embedding.Slice()
			if i < len(got) && got[i].ID != row.ID {
				t.Fatalf("%s: rank %d is row %d with the index, %d in an exact scan", name, i+1, got[i].ID, row.ID)
			}
		}
		for i, res := range got {
			want := cosine(q.vector, stored[res.ID])
			if math.Abs(res.Similarity-want) > 1e-5 {
				t.Fatalf("%s: rank %d similarity %.6f, cosine %.6f", name, i+1, res.Similarity, want)
			}
		}
		t.Logf("%s: top %s %.4f = cosine %.4f; %d results in exact-scan order", name, pointerString(got[0].SourceLabel), got[0].Similarity, cosine(q.vector, stored[got[0].ID]), len(got))
	}
}

// Jobdesk 9 Nov point 3 on a real corpus (read-only, TRAVEL_SEARCH_DSN + TRAVEL_SEARCH_LIVE_EMBED=1): the cards of a
// keyword and a description come from the four domains, ordered by similarity, with the fields a frontend card needs.
func TestRecommendByTextOnPostgres(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if dsn == "" || os.Getenv("TRAVEL_SEARCH_LIVE_EMBED") != "1" {
		t.Skip("TRAVEL_SEARCH_DSN and TRAVEL_SEARCH_LIVE_EMBED=1 not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	live, err := NewLLMFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	r, rec := NewRetriever(db), NewRecommender(db)
	for _, q := range []string{"kuliner", "kegiatan budaya atau acara menarik di Pasuruan"} {
		results, err := r.SearchTravelContent(context.Background(), live, q, TravelSearch{}, 20)
		if err != nil {
			t.Fatal(err)
		}
		cards, err := rec.RecommendByText(context.Background(), results, 6)
		if err != nil || len(cards) == 0 {
			t.Fatalf("%q: %d cards, err %v", q, len(cards), err)
		}
		for i, c := range cards {
			if c.Slug == nil || c.Name == "" || c.Location == nil || !slices.Contains([]string{"wisata", "kuliner", "budaya", "acara"}, c.Type) {
				t.Fatalf("%q card %d incomplete: %+v", q, i, c)
			}
			if i > 0 && c.Similarity > cards[i-1].Similarity {
				t.Fatalf("%q: not ordered by similarity at %d", q, i)
			}
			t.Logf("%q → %s %s sim %.3f | kategori=%v ringkasan=%t thumbnail=%t zona=%s sumber=%v verifikasi=%q", q, c.Type, c.Name, c.Similarity, deref(c.Category), c.Summary != nil && *c.Summary != "", c.ThumbnailURL != nil && *c.ThumbnailURL != "", c.Location.Zone, deref(c.Source), c.VerificationStatus)
		}
	}
}

func deref(s *string) string {
	if s == nil {
		return "-"
	}
	return *s
}

// Jobdesk 9 Nov point 5 on a real corpus (read-only, TRAVEL_SEARCH_DSN): every result of a filtered travel search meets
// its filter and is shown-able (checked with separate queries on the source tables), and the filtered results come in
// the same order as an exact scan without the HNSW index, so the filters do not disturb the semantic search.
func TestTravelFiltersOnPostgres(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if dsn == "" {
		t.Skip("TRAVEL_SEARCH_DSN not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	var doc struct {
		Embedding      pgvector.Vector
		EmbeddingModel string
	}
	db.Raw(`SELECT embedding, embedding_model FROM faq_knowledge_bases WHERE source_type = 'destination' AND is_active AND embedding IS NOT NULL ORDER BY source_id LIMIT 1`).Scan(&doc)
	p := &vectorEmbedder{vector: doc.Embedding.Slice(), model: doc.EmbeddingModel}
	r := NewRetriever(db)
	tables := map[string]string{"destination": "destinations", "culinary": "culinaries", "culture": "cultures", "event": "events"}
	cases := []struct {
		name   string
		search TravelSearch
		filter SearchFilter // the same filter, built by hand for the exact scan
		check  string       // SQL true for a row that meets the filter; args: source id
	}{
		{"zona", TravelSearch{Zone: "Pasuruan Selatan"}, SearchFilter{Region: "Pasuruan Selatan"}, `SELECT metadata->>'region' = 'Pasuruan Selatan' FROM faq_knowledge_bases WHERE source_type = ? AND source_id = ? AND is_active`},
		{"kecamatan", TravelSearch{District: "bangil"}, SearchFilter{District: "bangil"}, `SELECT pl.district ILIKE 'bangil' FROM %s x JOIN places pl ON pl.id = x.place_id WHERE ? <> '' AND x.id = ?`},
		{"kategori wisata", TravelSearch{Domains: []string{"wisata"}, Category: "Wisata Alam"}, SearchFilter{SourceType: "destination", TravelCategory: "Wisata Alam"}, `SELECT tc.name = 'Wisata Alam' FROM destinations x JOIN travel_categories tc ON tc.id = x.category_id WHERE ? <> '' AND x.id = ?`},
		{"kategori kuliner", TravelSearch{Domains: []string{"kuliner"}, Category: "Seafood"}, SearchFilter{SourceType: "culinary", TypeCode: "seafood"}, `SELECT x.culinary_type = 'seafood' FROM culinaries x WHERE ? <> '' AND x.id = ?`},
		{"acara", TravelSearch{Domains: []string{"acara"}}, SearchFilter{}, `SELECT EXISTS (SELECT 1 FROM event_occurrences o WHERE o.event_id = ? :: bigint * 0 + ? AND (o.ends_at >= now() OR (o.ends_at IS NULL AND (o.starts_at >= now() OR o.status = 'ongoing'))))`},
	}
	for _, tc := range cases {
		got, err := r.SearchTravelContent(context.Background(), p, tc.name, tc.search, 10)
		if err != nil {
			t.Fatalf("%s: %v", tc.name, err)
		}
		// Each result meets its filter and its source row is published.
		for i, res := range got {
			st, id := pointerString(res.SourceType), pointerInt64Value(res.SourceID)
			var published bool
			db.Raw(`SELECT status = 'published' FROM `+tables[st]+` WHERE id = ?`, id).Scan(&published)
			check := tc.check
			if strings.Contains(check, "%s") {
				check = fmt.Sprintf(check, tables[st])
			}
			var ok bool
			if strings.Contains(check, "event_occurrences") {
				db.Raw(check, 0, id).Scan(&ok)
			} else {
				db.Raw(check, st, id).Scan(&ok)
			}
			if !published || !ok {
				t.Fatalf("%s: result %d (%s:%d %s) published=%v meets filter=%v", tc.name, i, st, id, pointerString(res.SourceLabel), published, ok)
			}
		}
		// Same order as an exact scan with the same filters and the eligibility check.
		var types []string
		for _, d := range travelSearchDomains {
			if len(tc.search.Domains) == 0 || slices.Contains(tc.search.Domains, d.Name) {
				types = append(types, d.SourceType)
			}
		}
		f := tc.filter
		f.SourceTypes, f.EligibleAt = types, time.Now()
		relation, relArgs := f.relationClause()
		vec := pgvector.NewVector(p.vector)
		var exact []int64
		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec("SET LOCAL enable_indexscan = off").Error; err != nil {
				return err
			}
			args := append([]any{p.model, f.Region, f.Region}, relArgs...)
			args = append(args, vec)
			return tx.Raw(`SELECT id FROM faq_knowledge_bases WHERE is_active AND embedding IS NOT NULL AND embedding_model = ? AND (?='' OR metadata->>'region'=?)`+relation+` ORDER BY embedding <=> ? LIMIT 10`, args...).Scan(&exact).Error
		})
		if err != nil {
			t.Fatal(err)
		}
		if len(exact) != len(got) {
			t.Fatalf("%s: %d results with the index, %d in an exact scan", tc.name, len(got), len(exact))
		}
		for i := range got {
			if got[i].ID != exact[i] {
				t.Fatalf("%s: rank %d is row %d with the index, %d in an exact scan", tc.name, i+1, got[i].ID, exact[i])
			}
		}
		t.Logf("%s: %d hasil, semua memenuhi filter, urutan = pemindaian eksak", tc.name, len(got))
	}
}
