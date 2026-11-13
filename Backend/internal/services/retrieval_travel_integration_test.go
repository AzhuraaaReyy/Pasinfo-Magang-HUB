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
		// Jobdesk 10 Nov point 3: the category and location filters combined (the source type is checked below).
		{"kategori + kecamatan", TravelSearch{Domains: []string{"wisata"}, District: "prigen"}, SearchFilter{District: "prigen"}, `SELECT pl.district ILIKE 'prigen' FROM %s x JOIN places pl ON pl.id = x.place_id WHERE ? <> '' AND x.id = ?`},
		{"dua kategori + kecamatan", TravelSearch{Domains: []string{"kuliner", "budaya"}, District: "Panggungrejo"}, SearchFilter{District: "Panggungrejo"}, `SELECT pl.district ILIKE 'Panggungrejo' FROM %s x JOIN places pl ON pl.id = x.place_id WHERE ? <> '' AND x.id = ?`},
		{"kategori + zona", TravelSearch{Domains: []string{"wisata"}, Zone: "Pasuruan Selatan"}, SearchFilter{Region: "Pasuruan Selatan"}, `SELECT metadata->>'region' = 'Pasuruan Selatan' FROM faq_knowledge_bases WHERE source_type = ? AND source_id = ? AND is_active`},
		{"kategori + sub-kategori + kecamatan", TravelSearch{Domains: []string{"wisata"}, Category: "Wisata Alam", District: "Prigen"}, SearchFilter{SourceType: "destination", TravelCategory: "Wisata Alam", District: "Prigen"}, `SELECT pl.district ILIKE 'Prigen' AND tc.name = 'Wisata Alam' FROM destinations x JOIN places pl ON pl.id = x.place_id JOIN travel_categories tc ON tc.id = x.category_id WHERE ? <> '' AND x.id = ?`},
		// Jobdesk 10 Nov point 5: a lower-case category and zone mean the stored names.
		{"kategori + zona huruf kecil", TravelSearch{Domains: []string{"wisata"}, Category: "wisata alam", Zone: "pasuruan barat"}, SearchFilter{SourceType: "destination", TravelCategory: "Wisata Alam", Region: "Pasuruan Barat"}, `SELECT tc.name = 'Wisata Alam' AND fk.metadata->>'region' = 'Pasuruan Barat' FROM destinations x JOIN travel_categories tc ON tc.id = x.category_id JOIN faq_knowledge_bases fk ON fk.source_type = 'destination' AND fk.source_id = x.id AND fk.is_active WHERE ? <> '' AND x.id = ?`},
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
			if len(tc.search.Domains) > 0 && !slices.ContainsFunc(travelSearchDomains, func(d struct{ Name, SourceType string }) bool {
				return d.SourceType == st && slices.Contains(tc.search.Domains, d.Name)
			}) {
				t.Fatalf("%s: result %d is %s, outside the categories %v", tc.name, i, st, tc.search.Domains)
			}
		}
		if len(got) == 0 {
			t.Fatalf("%s: no result; the case must exercise the filter", tc.name)
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

// errRollbackTravelTest ends the transaction of a test that must leave the database unchanged.
var errRollbackTravelTest = fmt.Errorf("rollback")

// Jobdesk 10 Nov point 2 on a real corpus (TRAVEL_SEARCH_DSN): a document whose embedding is not available yet, or was
// made by another embedding model, is skipped without an error, and a corpus without any embedding gives an empty
// result, not an error. The test works on a TEMP copy of faq_knowledge_bases (it shadows the real table inside the
// transaction, which is rolled back), so the real corpus is never written.
func TestTravelSearchSkipsDocumentsWithoutEmbedding(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if dsn == "" {
		t.Skip("TRAVEL_SEARCH_DSN not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`CREATE TEMP TABLE faq_knowledge_bases ON COMMIT DROP AS SELECT * FROM public.faq_knowledge_bases`).Error; err != nil {
			return err
		}
		var doc struct {
			ID             int64
			SourceLabel    string
			Embedding      pgvector.Vector
			EmbeddingModel string
		}
		if err := tx.Raw(`SELECT k.id, k.source_label, k.embedding, k.embedding_model FROM faq_knowledge_bases k JOIN destinations d ON d.id = k.source_id WHERE k.source_type = 'destination' AND k.is_active AND k.embedding IS NOT NULL AND d.status = 'published' ORDER BY k.source_id LIMIT 1`).Scan(&doc).Error; err != nil || doc.ID == 0 {
			return fmt.Errorf("no embedded destination: %v", err)
		}
		query := &vectorEmbedder{vector: doc.Embedding.Slice(), model: doc.EmbeddingModel}
		r := NewRetriever(tx)
		search := func() ([]SemanticResult, error) {
			return r.SearchTravelContent(context.Background(), query, doc.SourceLabel, TravelSearch{}, 10)
		}
		got, err := search()
		if err != nil || len(got) == 0 || got[0].ID != doc.ID {
			return fmt.Errorf("with its embedding %s must come first: %d results, err %v", doc.SourceLabel, len(got), err)
		}
		for _, step := range []struct{ name, sql string }{
			{"embedding not available", `UPDATE faq_knowledge_bases SET embedding = NULL WHERE id = ?`},
			{"embedding of another model", `UPDATE faq_knowledge_bases SET embedding = (SELECT embedding FROM public.faq_knowledge_bases WHERE id = ?), embedding_model = 'model-lain' WHERE id = ?`},
		} {
			args := []any{doc.ID}
			if strings.Contains(step.sql, "model-lain") {
				args = []any{doc.ID, doc.ID}
			}
			if err := tx.Exec(step.sql, args...).Error; err != nil {
				return err
			}
			got, err := search()
			if err != nil {
				return fmt.Errorf("%s: error %v", step.name, err)
			}
			for _, res := range got {
				if res.ID == doc.ID {
					return fmt.Errorf("%s: %s still returned", step.name, doc.SourceLabel)
				}
			}
			t.Logf("%s: %s skipped, %d other results, no error", step.name, doc.SourceLabel, len(got))
		}
		if err := tx.Exec(`UPDATE faq_knowledge_bases SET embedding = NULL`).Error; err != nil {
			return err
		}
		if got, err := search(); err != nil || len(got) != 0 {
			return fmt.Errorf("corpus without embeddings: %d results, err %v (want 0, no error)", len(got), err)
		}
		t.Log("corpus without any embedding: 0 results, no error")
		return errRollbackTravelTest
	})
	if err != errRollbackTravelTest {
		t.Fatal(err)
	}
	var stillEmbedded int64
	db.Raw(`SELECT count(*) FROM faq_knowledge_bases WHERE embedding IS NOT NULL`).Scan(&stillEmbedded)
	if stillEmbedded == 0 {
		t.Fatal("the real corpus lost its embeddings")
	}
}

// Jobdesk 11 Nov point 5, extended to the travel domains (Owner 2026-11-11): a destination, culinary place, culture item,
// or event that is not published reaches no chat path and no saved-answer card, also while its corpus row is still
// active. In a rolled-back transaction TEMP tables shadow the four source tables; one embedded item per domain (with
// coordinates, and for an event an upcoming occurrence) is set to draft in the shadow only.
func TestTravelPublicationRuleOnPostgres(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if dsn == "" {
		t.Skip("TRAVEL_SEARCH_DSN not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	tables := map[string]string{"destination": "destinations", "culinary": "culinaries", "culture": "cultures", "event": "events"}
	categories := map[string]string{"destination": "wisata", "culinary": "kuliner", "culture": "budaya", "event": "acara"}
	for sourceType, table := range tables {
		for _, status := range []string{"published", "draft"} {
			err := db.Transaction(func(tx *gorm.DB) error {
				if err := tx.Exec(`CREATE TEMP TABLE ` + table + ` ON COMMIT DROP AS SELECT * FROM public.` + table).Error; err != nil {
					return err
				}
				var doc struct {
					SourceID       int64
					SourceLabel    string
					Embedding      pgvector.Vector
					EmbeddingModel string
					Lat, Lng       float64
				}
				upcoming := ""
				if sourceType == "event" {
					upcoming = ` AND EXISTS (SELECT 1 FROM event_occurrences o WHERE o.event_id = x.id AND (o.ends_at >= now() OR (o.ends_at IS NULL AND o.starts_at >= now())))`
				}
				if err := tx.Raw(`SELECT k.source_id, k.source_label, k.embedding, k.embedding_model, p.latitude AS lat, p.longitude AS lng FROM faq_knowledge_bases k JOIN `+table+` x ON x.id = k.source_id JOIN places p ON p.id = x.place_id WHERE k.source_type = ? AND k.is_active AND k.embedding IS NOT NULL AND x.status = 'published' AND p.latitude <> 0 AND p.longitude <> 0`+upcoming+` ORDER BY k.source_id LIMIT 1`, sourceType).Scan(&doc).Error; err != nil || doc.SourceID == 0 {
					return fmt.Errorf("%s: no embedded published item with a place: %v", sourceType, err)
				}
				if err := tx.Exec(`UPDATE `+table+` SET status = ? WHERE id = ?`, status, doc.SourceID).Error; err != nil {
					return err
				}
				want := status == "published"
				query := &vectorEmbedder{vector: doc.Embedding.Slice(), model: doc.EmbeddingModel}
				r, ctx, ref := NewRetriever(tx), context.Background(), SourceRef{SourceType: sourceType, SourceID: doc.SourceID}
				has := func(rs []SemanticResult) bool {
					for _, x := range rs {
						if pointerString(x.SourceType) == sourceType && pointerInt64Value(x.SourceID) == doc.SourceID {
							return true
						}
					}
					return false
				}
				paths := map[string]func() ([]SemanticResult, error){
					"SemanticSearch all": func() ([]SemanticResult, error) { return r.SemanticSearch(ctx, query, doc.SourceLabel, "", 10) },
					"SemanticSearch category": func() ([]SemanticResult, error) {
						return r.SemanticSearch(ctx, query, doc.SourceLabel, categories[sourceType], 10)
					},
					"LoadSources": func() ([]SemanticResult, error) { return r.LoadSources(ctx, []SourceRef{ref}) },
					"NearestContent": func() ([]SemanticResult, error) {
						return r.NearestContent(ctx, sourceType, GeoPoint{Lat: doc.Lat, Lng: doc.Lng}, nil, time.Now(), 0.01, 50)
					},
				}
				if sourceType == "event" {
					paths["EventsInPeriod"] = func() ([]SemanticResult, error) {
						return r.EventsInPeriod(ctx, time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC), time.Date(2100, 1, 1, 0, 0, 0, 0, time.UTC), "", 1000)
					}
				}
				for name, path := range paths {
					got, err := path()
					if err != nil {
						return fmt.Errorf("%s %s: %w", sourceType, name, err)
					}
					if has(got) != want {
						return fmt.Errorf("%s %s (%s): returns the item = %v, want %v", sourceType, name, status, has(got), want)
					}
				}
				origin, err := r.ContentPlace(ctx, "", &ref, "")
				if err != nil {
					return err
				}
				if (origin != nil) != want {
					return fmt.Errorf("%s ContentPlace (%s) = %v, want found %v", sourceType, status, origin != nil, want)
				}
				cards, err := LoadSourceCards(ctx, tx, []SourceKey{{sourceType, doc.SourceID}})
				if err != nil {
					return err
				}
				if _, ok := cards[SourceKey{sourceType, doc.SourceID}]; ok != want {
					return fmt.Errorf("%s card (%s) = %v, want %v", sourceType, status, ok, want)
				}
				t.Logf("%s %q %s: chat paths and card follow the status", sourceType, doc.SourceLabel, status)
				return errRollbackTravelTest
			})
			if err != errRollbackTravelTest {
				t.Fatal(err)
			}
		}
	}
	// A region document has no publication status: it still passes every chat path that applies the rule.
	var region struct {
		SourceID       int64
		SourceLabel    string
		Embedding      pgvector.Vector
		EmbeddingModel string
	}
	if err := db.Raw(`SELECT source_id, source_label, embedding, embedding_model FROM faq_knowledge_bases WHERE source_type = 'region' AND is_active AND embedding IS NOT NULL ORDER BY source_id LIMIT 1`).Scan(&region).Error; err != nil || region.SourceID == 0 {
		t.Fatalf("no region document: %v", err)
	}
	r, ctx := NewRetriever(db), context.Background()
	loaded, err := r.LoadSources(ctx, []SourceRef{{SourceType: "region", SourceID: region.SourceID}})
	if err != nil || len(loaded) != 1 {
		t.Fatalf("region LoadSources = %d, err %v", len(loaded), err)
	}
	found, err := r.SemanticSearch(ctx, &vectorEmbedder{vector: region.Embedding.Slice(), model: region.EmbeddingModel}, region.SourceLabel, "", 5)
	if err != nil || len(found) == 0 || pointerString(found[0].SourceType) != "region" || pointerInt64Value(found[0].SourceID) != region.SourceID {
		t.Fatalf("region semantic search: %d results, err %v", len(found), err)
	}
}

// Jobdesk 12 Nov point 3 (P3-1, Owner option A) on a real corpus (read-only, TRAVEL_SEARCH_DSN): a small LIMIT made the
// planner walk the approximate HNSW index, which missed the nearest documents of a filtered search ("candi", LIMIT 10).
// The query here is the semanticSearch query of a travel search with LIMIT 10. Without exactVectorScan the planner
// takes the HNSW index; with it, a sequential scan, so the setting, not the data, keeps the index out. When the planner
// no longer takes the index even without the setting, the test cannot show anything and is skipped.
func TestVectorSearchesUseAnExactScan(t *testing.T) {
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
	if err := db.Raw(`SELECT embedding, embedding_model FROM faq_knowledge_bases WHERE source_type = 'culture' AND is_active AND embedding IS NOT NULL ORDER BY source_id LIMIT 1`).Scan(&doc).Error; err != nil || doc.Embedding.Slice() == nil {
		t.Fatalf("no culture vector: %v", err)
	}
	filter := SearchFilter{SourceTypes: []string{"destination", "culinary", "culture", "event"}, EligibleAt: time.Now()}
	relation, relationArgs := filter.relationClause()
	plan := func(exact bool) string {
		var lines []string
		err := db.Transaction(func(tx *gorm.DB) error {
			if exact {
				if err := exactVectorScan(tx); err != nil {
					return err
				}
			}
			args := []any{doc.Embedding, "", "", "", "", "", "", doc.EmbeddingModel, doc.EmbeddingModel}
			args = append(append(args, relationArgs...), doc.Embedding, 10)
			return tx.Raw(`EXPLAIN SELECT id,embedding <=> ? distance FROM faq_knowledge_bases WHERE is_active=true AND embedding IS NOT NULL AND (?='' OR category=?) AND (?='' OR metadata->>'region'=?) AND (?='' OR metadata->>'news_category'=?) AND (?='' OR embedding_model=?)`+publishedSourceSQL("")+relation+` ORDER BY embedding <=> ? LIMIT ?`, args...).Scan(&lines).Error
		})
		if err != nil {
			t.Fatal(err)
		}
		return strings.Join(lines, "\n")
	}
	if p := plan(false); !strings.Contains(p, "hnsw") {
		t.Skipf("the planner does not take the HNSW index even without exactVectorScan:\n%s", p)
	}
	if p := plan(true); strings.Contains(p, "hnsw") || !strings.Contains(p, "Seq Scan on faq_knowledge_bases") {
		t.Fatalf("exactVectorScan still plans the HNSW index:\n%s", p)
	}
}

// Jobdesk 13 Nov point 3 on a real corpus (read-only, TRAVEL_SEARCH_DSN): content whose corpus row has no embedding yet
// (a new source is saved pending, without a vector, until the refresh embeds it; knowledge_refresh.go). It works on a
// TEMP copy of faq_knowledge_bases inside a rolled-back transaction, so the real corpus does not change. By design:
//   - the text recommendations (travel and news) and the chat's latest news skip it, without an error;
//   - the item recommendations still recommend it through the other signals (location, category, editor) with
//     similarity 0, and an item without an embedding still gets travel recommendations the same way; a news item
//     without an embedding gets none (news candidates are its vector neighbours only), again without an error.
func TestRecommendationsWithoutEmbeddingOnPostgres(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if dsn == "" {
		t.Skip("TRAVEL_SEARCH_DSN not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	type corpusDoc struct {
		ID             int64
		SourceID       int64
		SourceLabel    string
		Slug           string
		Embedding      pgvector.Vector
		EmbeddingModel string
	}
	pending := `UPDATE faq_knowledge_bases SET embedding = NULL, embedding_model = NULL, embedding_status = 'pending' WHERE id = ?`
	ctx := context.Background()
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`CREATE TEMP TABLE faq_knowledge_bases ON COMMIT DROP AS SELECT * FROM public.faq_knowledge_bases`).Error; err != nil {
			return err
		}
		pick := func(sql string) (corpusDoc, error) {
			var d corpusDoc
			err := tx.Raw(sql).Scan(&d).Error
			if err == nil && d.ID == 0 {
				err = fmt.Errorf("no row for %s", sql)
			}
			return d, err
		}
		r, rec := NewRetriever(tx), NewRecommender(tx)
		has := func(cards []Recommendation, name string) *Recommendation {
			for i := range cards {
				if cards[i].Name == name {
					return &cards[i]
				}
			}
			return nil
		}
		embeddedDestinations := `SELECT k.id, k.source_id, k.source_label, d.slug, k.embedding, k.embedding_model FROM faq_knowledge_bases k JOIN destinations d ON d.id = k.source_id WHERE k.source_type = 'destination' AND k.is_active AND k.embedding IS NOT NULL AND d.status = 'published' ORDER BY k.source_id`

		// A. Travel text recommendation: a destination found first by its own vector is skipped once pending.
		dest, err := pick(embeddedDestinations + ` LIMIT 1`)
		if err != nil {
			return err
		}
		// The origin of the item recommendations (C, F) keeps its embedding.
		origin, err := pick(embeddedDestinations + ` OFFSET 1 LIMIT 1`)
		if err != nil {
			return err
		}
		destQuery := &vectorEmbedder{vector: dest.Embedding.Slice(), model: dest.EmbeddingModel}
		travelCards := func() ([]Recommendation, error) {
			results, err := r.SearchTravelContent(ctx, destQuery, dest.SourceLabel, TravelSearch{Domains: []string{"wisata"}}, 50)
			if err != nil {
				return nil, err
			}
			return rec.RecommendByText(ctx, results, 12)
		}
		if cards, err := travelCards(); err != nil || len(cards) == 0 || cards[0].Name != dest.SourceLabel {
			return fmt.Errorf("A: with its embedding %s must be the first card: %d cards, err %v", dest.SourceLabel, len(cards), err)
		}

		// B. News text recommendation: the same for a news article (the newest, so G checks the latest list too).
		news, err := pick(`SELECT k.id, k.source_id, k.source_label, '' AS slug, k.embedding, k.embedding_model FROM faq_knowledge_bases k JOIN news n ON n.id = k.source_id WHERE k.source_type = 'news' AND k.is_active AND k.embedding IS NOT NULL AND n.status = 'published' ORDER BY n.created_at DESC, k.id DESC LIMIT 1`)
		if err != nil {
			return err
		}
		newsQuery := &vectorEmbedder{vector: news.Embedding.Slice(), model: news.EmbeddingModel}
		newsCards := func() ([]Recommendation, error) {
			results, err := r.SearchNews(ctx, newsQuery, news.SourceLabel, "", 50)
			if err != nil {
				return nil, err
			}
			return rec.RecommendByText(ctx, results, 12)
		}
		if cards, err := newsCards(); err != nil || len(cards) == 0 || cards[0].ID != news.SourceID {
			return fmt.Errorf("B: with its embedding news %d must be the first card: %d cards, err %v", news.SourceID, len(cards), err)
		}
		if latest, err := r.LatestNews(ctx, "", 1); err != nil || len(latest) == 0 || latest[0].ID != news.ID {
			return fmt.Errorf("G: the newest news must lead the latest list before: %v", err)
		}

		// C. A culinary item that is about to lose its embedding.
		food, err := pick(`SELECT k.id, k.source_id, k.source_label, c.slug, k.embedding, k.embedding_model FROM faq_knowledge_bases k JOIN culinaries c ON c.id = k.source_id WHERE k.source_type = 'culinary' AND k.is_active AND k.embedding IS NOT NULL AND c.status = 'published' ORDER BY k.source_id LIMIT 1`)
		if err != nil {
			return err
		}

		for _, id := range []int64{dest.ID, news.ID, food.ID} {
			if err := tx.Exec(pending, id).Error; err != nil {
				return err
			}
		}
		if cards, err := travelCards(); err != nil || has(cards, dest.SourceLabel) != nil {
			return fmt.Errorf("A: pending %s must be skipped without an error: err %v", dest.SourceLabel, err)
		}
		t.Logf("A travel text: pending %q skipped, no error", dest.SourceLabel)
		cards, err := newsCards()
		if err != nil {
			return fmt.Errorf("B: %v", err)
		}
		for _, c := range cards {
			if c.ID == news.SourceID {
				return fmt.Errorf("B: pending news %d still a card", news.SourceID)
			}
		}
		t.Logf("B news text: pending news %d skipped, %d other cards, no error", news.SourceID, len(cards))
		latest, err := r.LatestNews(ctx, "", 5)
		if err != nil {
			return fmt.Errorf("G: %v", err)
		}
		for _, l := range latest {
			if l.ID == news.ID {
				return fmt.Errorf("G: pending news still in the latest list")
			}
		}
		t.Logf("G chat latest news: pending news %d skipped, no error", news.SourceID)

		foods, err := rec.Recommend(ctx, "wisata", origin.Slug, "kuliner", 100)
		if err != nil {
			return fmt.Errorf("C: %v", err)
		}
		if c := has(foods, food.SourceLabel); c == nil || c.Similarity != 0 {
			return fmt.Errorf("C: culinary %s without an embedding must stay an item recommendation with similarity 0: %+v", food.SourceLabel, c)
		}
		t.Logf("C item recommendation: %q without an embedding still recommended (similarity 0) among %d", food.SourceLabel, len(foods))

		// D. The pending destination as the origin: still travel recommendations, all with similarity 0.
		places, err := rec.Recommend(ctx, "wisata", dest.Slug, "wisata", 6)
		if err != nil || len(places) == 0 {
			return fmt.Errorf("D: origin without an embedding: %d cards, err %v", len(places), err)
		}
		for _, p := range places {
			if p.Similarity != 0 {
				return fmt.Errorf("D: %s similarity %v, want 0 (no origin vector)", p.Name, p.Similarity)
			}
		}
		t.Logf("D item recommendation: origin %q without an embedding → %d cards by location/category/editor, no error", dest.SourceLabel, len(places))

		// E. The pending news article as the origin: no news recommendation, no error.
		if items, err := rec.Recommend(ctx, "berita", fmt.Sprint(news.SourceID), "berita", 6); err != nil || len(items) != 0 {
			return fmt.Errorf("E: news origin without an embedding: %d cards, err %v (want 0, no error)", len(items), err)
		}
		t.Logf("E item recommendation: news %d without an embedding → 0 cards, no error", news.SourceID)

		// F. No embedding at all: the text recommendations answer empty, the item recommendations still answer.
		if err := tx.Exec(`UPDATE faq_knowledge_bases SET embedding = NULL, embedding_status = 'pending'`).Error; err != nil {
			return err
		}
		if cards, err := travelCards(); err != nil || len(cards) != 0 {
			return fmt.Errorf("F: travel text without any embedding: %d cards, err %v", len(cards), err)
		}
		if cards, err := newsCards(); err != nil || len(cards) != 0 {
			return fmt.Errorf("F: news text without any embedding: %d cards, err %v", len(cards), err)
		}
		if places, err := rec.Recommend(ctx, "wisata", origin.Slug, "wisata", 6); err != nil || len(places) == 0 {
			return fmt.Errorf("F: item recommendation without any embedding: %d cards, err %v", len(places), err)
		}
		t.Log("F no embedding at all: text recommendations 0 cards, item recommendations still answer, no error")
		return errRollbackTravelTest
	})
	if err != errRollbackTravelTest {
		t.Fatal(err)
	}
	var stillEmbedded int64
	db.Raw(`SELECT count(*) FROM faq_knowledge_bases WHERE embedding IS NOT NULL`).Scan(&stillEmbedded)
	if stillEmbedded == 0 {
		t.Fatal("the real corpus lost its embeddings")
	}
}
