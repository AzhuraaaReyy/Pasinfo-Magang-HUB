package services

import (
	"context"
	"errors"
	"fmt"
	"math"
	"os"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/pgvector/pgvector-go"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"wildan-news-backend/internal/models"
)

// Jobdesk 11 Nov point 1: an unknown news category is refused before the embedding call (no quota spent); a call to
// failingEmbedder would return its own error instead.
func TestSearchNewsRefusesUnknownCategoryBeforeEmbedding(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.Category{}); err != nil {
		t.Fatal(err)
	}
	db.Create(&models.Category{Name: "TEKNOLOGI", Slug: "teknologi"})
	_, err = NewRetriever(db).SearchNews(context.Background(), &failingEmbedder{}, "smartphone", "tidak-ada", 6)
	if !errors.Is(err, ErrUnknownNewsCategory) {
		t.Fatalf("err = %v, want ErrUnknownNewsCategory", err)
	}
	// Jobdesk 13 Nov point 2 (P2-2): a NUL byte or invalid UTF-8 is an unknown category, refused before the database
	// (nil DB) instead of a database error.
	for _, category := range []string{"teknologi" + string([]byte{0}), "teknologi" + string([]byte{0xff})} {
		if _, err := NewRetriever(nil).SearchNews(context.Background(), &failingEmbedder{}, "smartphone", category, 6); !errors.Is(err, ErrUnknownNewsCategory) {
			t.Fatalf("category %q: err = %v, want ErrUnknownNewsCategory", category, err)
		}
	}
}

// Jobdesk 11 Nov point 1 on a real corpus (TRAVEL_SEARCH_DSN): SearchNews compares the query embedding with the stored
// article embeddings (similarity = cosine, exact-scan order), keeps only articles at or above the threshold, filters by
// category in any letter case, and never returns a news item that is no longer published (N1), also through
// SemanticSearchNews. The test works on a TEMP copy of news (it shadows the real table inside the transaction, which is
// rolled back), so no real row is written.
func TestNewsSearchOnPostgres(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if dsn == "" {
		t.Skip("TRAVEL_SEARCH_DSN not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec(`CREATE TEMP TABLE news ON COMMIT DROP AS SELECT * FROM public.news`).Error; err != nil {
			return err
		}
		var doc struct {
			ID             int64
			SourceID       int64
			SourceLabel    string
			Category       string
			Embedding      pgvector.Vector
			EmbeddingModel string
		}
		if err := tx.Raw(`SELECT k.id, k.source_id, k.source_label, k.metadata->>'news_category' AS category, k.embedding, k.embedding_model FROM faq_knowledge_bases k JOIN news n ON n.id = k.source_id WHERE k.source_type = 'news' AND k.is_active AND k.embedding IS NOT NULL AND n.status = 'published' ORDER BY k.source_id LIMIT 1`).Scan(&doc).Error; err != nil || doc.ID == 0 {
			return fmt.Errorf("no embedded published news: %v", err)
		}
		query := &vectorEmbedder{vector: doc.Embedding.Slice(), model: doc.EmbeddingModel}
		r := NewRetriever(tx)
		search := func(category string) ([]SemanticResult, error) {
			return r.SearchNews(context.Background(), query, doc.SourceLabel, category, 10)
		}

		got, err := search("")
		if err != nil || len(got) == 0 || got[0].ID != doc.ID {
			return fmt.Errorf("the article's own vector must find it first: %d results, err %v", len(got), err)
		}
		var exact []struct {
			ID        int64
			Embedding pgvector.Vector
		}
		if err := tx.Exec("SET LOCAL enable_indexscan = off").Error; err != nil {
			return err
		}
		if err := tx.Raw(`SELECT k.id, k.embedding FROM faq_knowledge_bases k JOIN news n ON n.id = k.source_id AND n.status = 'published' WHERE k.is_active AND k.embedding IS NOT NULL AND k.category = 'berita' AND k.embedding_model = ? ORDER BY k.embedding <=> ? LIMIT 10`, doc.EmbeddingModel, pgvector.NewVector(query.vector)).Scan(&exact).Error; err != nil {
			return err
		}
		if err := tx.Exec("SET LOCAL enable_indexscan = on").Error; err != nil {
			return err
		}
		threshold := recommendThreshold()
		for i, res := range got {
			if res.Similarity < threshold {
				return fmt.Errorf("rank %d similarity %.3f below the threshold %.2f", i+1, res.Similarity, threshold)
			}
			if i >= len(exact) || exact[i].ID != res.ID {
				return fmt.Errorf("rank %d is not the exact-scan rank", i+1)
			}
			if want := cosine(query.vector, exact[i].Embedding.Slice()); math.Abs(res.Similarity-want) > 1e-5 {
				return fmt.Errorf("rank %d similarity %.6f, cosine %.6f", i+1, res.Similarity, want)
			}
			if pointerString(res.SourceType) != "news" {
				return fmt.Errorf("rank %d is %s, not news", i+1, pointerString(res.SourceType))
			}
		}
		t.Logf("%s: %d articles ≥ %.2f in exact-scan order, similarity = cosine", doc.SourceLabel, len(got), threshold)

		// The threshold cuts: at 0.999 only the article itself (similarity 1) is left.
		t.Setenv("RECOMMEND_RELEVANCE_THRESHOLD", "0.999")
		strict, err := search("")
		if err != nil || len(strict) != 1 || strict[0].ID != doc.ID {
			return fmt.Errorf("threshold 0.999: %d results (want only the article itself), err %v", len(strict), err)
		}
		t.Setenv("RECOMMEND_RELEVANCE_THRESHOLD", "")

		inCategory, err := search(strings.ToUpper(doc.Category))
		if err != nil || len(inCategory) == 0 {
			return fmt.Errorf("category %s: %d results, err %v", doc.Category, len(inCategory), err)
		}
		for _, res := range inCategory {
			var category string
			tx.Raw(`SELECT metadata->>'news_category' FROM faq_knowledge_bases WHERE id = ?`, res.ID).Scan(&category)
			if category != doc.Category {
				return fmt.Errorf("category filter %s returned an article of %s", doc.Category, category)
			}
		}
		t.Logf("category %s (upper case): %d articles, all of the category", doc.Category, len(inCategory))

		for _, step := range []struct{ name, sql string }{
			{"draft", `UPDATE news SET status = 'draft' WHERE id = ?`},
			{"deleted", `DELETE FROM news WHERE id = ?`},
		} {
			if err := tx.Exec(step.sql, doc.SourceID).Error; err != nil {
				return err
			}
			viaSearch, err := search("")
			if err != nil {
				return err
			}
			viaChat, err := r.SemanticSearchNews(context.Background(), query, doc.SourceLabel, "", 10)
			if err != nil {
				return err
			}
			for _, res := range append(viaSearch, viaChat...) {
				if res.ID == doc.ID {
					return fmt.Errorf("%s: %s is still returned", step.name, doc.SourceLabel)
				}
			}
			t.Logf("%s: %s no longer returned (SearchNews %d, SemanticSearchNews %d results)", step.name, doc.SourceLabel, len(viaSearch), len(viaChat))
		}
		return errRollbackTravelTest
	})
	if err != errRollbackTravelTest {
		t.Fatal(err)
	}
	var published int64
	db.Raw(`SELECT count(*) FROM news WHERE status = 'published'`).Scan(&published)
	if published == 0 {
		t.Fatal("the real news table lost its published rows")
	}
}

// Jobdesk 11 Nov point 5 (Owner P5-1, P5-2): only published articles reach visitors, through every path that can return
// news, also while the corpus row is still active (the refresh deactivates it later). In a rolled-back transaction a TEMP
// news table shadows the real one; one embedded article gets each other status (archived is not used by the backend
// today and is refused all the same). Other source types keep their results.
func TestNewsPublicationRuleOnPostgres(t *testing.T) {
	dsn := os.Getenv("TRAVEL_SEARCH_DSN")
	if dsn == "" {
		t.Skip("TRAVEL_SEARCH_DSN not set")
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	for _, status := range []string{"published", "draft", "pending", "revision", "archived"} {
		err := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec(`CREATE TEMP TABLE news ON COMMIT DROP AS SELECT * FROM public.news`).Error; err != nil {
				return err
			}
			var doc struct {
				SourceID       int64
				SourceLabel    string
				Embedding      pgvector.Vector
				EmbeddingModel string
			}
			if err := tx.Raw(`SELECT k.source_id, k.source_label, k.embedding, k.embedding_model FROM faq_knowledge_bases k JOIN news n ON n.id = k.source_id WHERE k.source_type = 'news' AND k.is_active AND k.embedding IS NOT NULL AND n.status = 'published' ORDER BY n.created_at DESC, k.id DESC LIMIT 1`).Scan(&doc).Error; err != nil || doc.SourceID == 0 {
				return fmt.Errorf("no embedded published news: %v", err)
			}
			// The newest article, read most (popular list), with the status under test: in the shadow only.
			if err := tx.Exec(`UPDATE news SET status = ?, views = 1000000 WHERE id = ?`, status, doc.SourceID).Error; err != nil {
				return err
			}
			want := status == "published"
			query := &vectorEmbedder{vector: doc.Embedding.Slice(), model: doc.EmbeddingModel}
			r, ctx := NewRetriever(tx), context.Background()
			has := func(rs []SemanticResult) bool {
				for _, x := range rs {
					if pointerString(x.SourceType) == "news" && pointerInt64Value(x.SourceID) == doc.SourceID {
						return true
					}
				}
				return false
			}
			paths := map[string]func() ([]SemanticResult, error){
				"SearchNews":         func() ([]SemanticResult, error) { return r.SearchNews(ctx, query, doc.SourceLabel, "", 10) },
				"SemanticSearchNews": func() ([]SemanticResult, error) { return r.SemanticSearchNews(ctx, query, doc.SourceLabel, "", 10) },
				"SemanticSearch berita": func() ([]SemanticResult, error) {
					return r.SemanticSearch(ctx, query, doc.SourceLabel, "berita", 10)
				},
				"SemanticSearch all": func() ([]SemanticResult, error) { return r.SemanticSearch(ctx, query, doc.SourceLabel, "", 10) },
				"LatestNews":         func() ([]SemanticResult, error) { return r.LatestNews(ctx, "", 1) },
				"PopularNews":        func() ([]SemanticResult, error) { return r.PopularNews(ctx, "", 1) },
				"LoadSources": func() ([]SemanticResult, error) {
					return r.LoadSources(ctx, []SourceRef{{SourceType: "news", SourceID: doc.SourceID}})
				},
			}
			for name, path := range paths {
				got, err := path()
				if err != nil {
					return fmt.Errorf("%s: %w", name, err)
				}
				if has(got) != want {
					return fmt.Errorf("status %s: %s returns the article = %v, want %v", status, name, has(got), want)
				}
			}
			// The other source types still fill the general search.
			all, err := r.SemanticSearch(ctx, query, doc.SourceLabel, "", 10)
			if err != nil || len(all) != 10 {
				return fmt.Errorf("status %s: general search has %d results, err %v", status, len(all), err)
			}
			cards, err := LoadSourceCards(ctx, tx, []SourceKey{{"news", doc.SourceID}})
			if err != nil {
				return err
			}
			if _, ok := cards[SourceKey{"news", doc.SourceID}]; ok != want {
				return fmt.Errorf("status %s: card = %v, want %v", status, ok, want)
			}
			return errRollbackTravelTest
		})
		if !errors.Is(err, errRollbackTravelTest) {
			t.Fatal(err)
		}
	}
}
