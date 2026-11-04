package services

import (
	"context"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

type recordingEmbedder struct {
	stubProvider
	inputs []string
}

func (p *recordingEmbedder) Embed(_ context.Context, text string) (*EmbeddingResponse, error) {
	p.inputs = append(p.inputs, text)
	return &EmbeddingResponse{Vector: make([]float32, EmbeddingDimensions), Model: "embeddinggemma"}, nil
}

func TestDocumentEmbeddingTextUsesGemmaDocumentPrompt(t *testing.T) {
	if got := documentEmbeddingText("Candi Jawi", "Candi peninggalan Singasari."); got != "title: Candi Jawi | text: Candi peninggalan Singasari." {
		t.Fatalf("got %q", got)
	}
}

func TestUpsertTravelKnowledgeEmbedsDocumentPromptAndKeepsInactiveRows(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:retrieval_format?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	statements := []string{
		`CREATE TABLE IF NOT EXISTS faq_knowledge_bases (id INTEGER PRIMARY KEY, question TEXT, answer TEXT, category TEXT, source_type TEXT, source_id INTEGER, source_label TEXT, source_url TEXT, is_active NUMERIC, embedding TEXT, embedding_model TEXT, embedding_updated_at DATETIME, metadata BLOB, created_at DATETIME, updated_at DATETIME)`,
		`INSERT INTO faq_knowledge_bases (id, question, answer, category, source_type, source_id, source_label, is_active) VALUES (7, 'Festival Seni Mock', 'lama', 'acara', 'event', 1, 'Festival Seni Mock', 0)`,
	}
	for _, statement := range statements {
		if err := db.Exec(statement).Error; err != nil {
			t.Fatal(err)
		}
	}
	p := &recordingEmbedder{}
	if err := NewRetriever(db).upsertTravelKnowledge(context.Background(), p, "acara", "event", 1, "Festival Seni Mock", "baru", ""); err != nil {
		t.Fatal(err)
	}
	if len(p.inputs) != 1 || p.inputs[0] != "title: Festival Seni Mock | text: baru" {
		t.Fatalf("embedded inputs = %q", p.inputs)
	}
	var active bool
	db.Raw(`SELECT is_active FROM faq_knowledge_bases WHERE id = 7`).Scan(&active)
	if active {
		t.Fatal("re-embedding must keep a deactivated document inactive")
	}
}

func TestSemanticSearchEmbedsQueryWithGemmaQueryPrompt(t *testing.T) {
	p := &recordingEmbedder{}
	// The pgvector query fails on SQLite; only the embedded query text is asserted.
	db, _ := gorm.Open(sqlite.Open("file:retrieval_query?mode=memory&cache=shared"), &gorm.Config{})
	_, _ = NewRetriever(db).SemanticSearch(context.Background(), p, "Di mana Candi Jawi?", "", 5)
	if len(p.inputs) != 1 || p.inputs[0] != "task: search result | query: Di mana Candi Jawi?" {
		t.Fatalf("embedded query = %q", p.inputs)
	}
}

// wrongDimsEmbedder returns a vector that does not fit faq_knowledge_bases.embedding vector(768).
type wrongDimsEmbedder struct{ stubProvider }

func (*wrongDimsEmbedder) Embed(context.Context, string) (*EmbeddingResponse, error) {
	return &EmbeddingResponse{Vector: make([]float32, 1536), Model: "other-model"}, nil
}

// Jobdesk "Mengubah Pertanyaan Menjadi Embedding": a question embedding whose size does not match the
// vector(768) column is refused before any pgvector query, and an empty question is not embedded.
func TestSemanticSearchRefusesWrongDimensionAndEmptyQuestion(t *testing.T) {
	db, _ := gorm.Open(sqlite.Open("file:retrieval_dims?mode=memory&cache=shared"), &gorm.Config{})
	r := NewRetriever(db)
	if _, err := r.SemanticSearch(context.Background(), &wrongDimsEmbedder{}, "Di mana Candi Jawi?", "", 5); err == nil || !strings.Contains(err.Error(), "expected 768") {
		t.Fatalf("wrong dimension: err = %v", err)
	}
	p := &recordingEmbedder{}
	if _, err := r.SemanticSearch(context.Background(), p, "   ", "", 5); err == nil || len(p.inputs) != 0 {
		t.Fatalf("empty question: err = %v, embedded %d", err, len(p.inputs))
	}
}
