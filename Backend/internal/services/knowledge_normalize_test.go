package services

import (
	"context"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// jobdesk 4 Nov p2 (Owner option A, 2026-11-04): a corpus document is normalized before it is embedded.
func TestNormalizeKnowledgeTextCleansWithoutLosingFacts(t *testing.T) {
	in := "  Jakarta (ANTARA) -  Pertandingan  ramai.Ada yang\u00a0bilang\u200b pick and roll.\r\n\r\n\r\n\r\nHarga Rp15.000, rating 4.5, dr.Hasan hadir.\nAlamat:   Jl. Raya   Kasri No. 1  \nKategori berita: Olahraga\ufeff"
	want := "Jakarta (ANTARA) - Pertandingan ramai. Ada yang bilang pick and roll.\n\nHarga Rp15.000, rating 4.5, dr. Hasan hadir.\nAlamat: Jl. Raya Kasri No. 1\nKategori berita: Olahraga"
	got := normalizeKnowledgeText(in)
	if got != want {
		t.Fatalf("got  %q\nwant %q", got, want)
	}
	if again := normalizeKnowledgeText(got); again != got {
		t.Fatalf("not idempotent: %q", again)
	}
}

// A long news item keeps its Kategori/Sumber/Tanggal lines: the embedding model reads only its first 2048 tokens.
func TestNormalizeKnowledgeTextKeepsFieldLinesOfLongNews(t *testing.T) {
	body := strings.Repeat("Kalimat panjang tentang pertandingan basket di Jakarta. ", 300)
	text := body + "\nKategori berita: Olahraga\nSumber: Antara News\nTanggal terbit: 15 Oktober 2026"
	got := normalizeKnowledgeText(text)
	if utf8.RuneCountInString(got) > maxEmbeddingRunes || !strings.HasSuffix(got, "Kategori berita: Olahraga\nSumber: Antara News\nTanggal terbit: 15 Oktober 2026") || !strings.HasPrefix(got, "Kalimat panjang") {
		t.Fatalf("len=%d tail=%q", utf8.RuneCountInString(got), got[len(got)-120:])
	}
	if again := normalizeKnowledgeText(got); again != got {
		t.Fatal("long news not idempotent")
	}
}

// The stored row holds the normalized text, so the next refresh finds it unchanged and makes no embedding call.
func TestSaveKnowledgeStoresNormalizedTextOnce(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:knowledge_normalize?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Exec(`CREATE TABLE IF NOT EXISTS faq_knowledge_bases (id INTEGER PRIMARY KEY, question TEXT, answer TEXT, category TEXT, source_type TEXT, source_id INTEGER, source_label TEXT, source_url TEXT, is_active NUMERIC, embedding TEXT, embedding_model TEXT, embedding_updated_at DATETIME, metadata BLOB, created_at DATETIME, updated_at DATETIME)`).Error; err != nil {
		t.Fatal(err)
	}
	p := &recordingEmbedder{}
	doc := knowledgeDoc{Category: "berita", SourceType: "news", SourceID: 9, Label: "Judul  Berita", Answer: "Isi  berita.Lanjut di sini.\nSumber: Antara"}
	r := NewRetriever(db)
	if err := r.saveKnowledge(context.Background(), p, doc); err != nil {
		t.Fatal(err)
	}
	var answer string
	db.Raw(`SELECT answer FROM faq_knowledge_bases WHERE source_id = 9`).Scan(&answer)
	if answer != "Isi berita. Lanjut di sini.\nSumber: Antara" || len(p.inputs) != 1 || p.inputs[0] != "title: Judul Berita | text: "+answer {
		t.Fatalf("answer=%q inputs=%q", answer, p.inputs)
	}
	r = NewRetriever(db)
	if err := r.saveKnowledge(context.Background(), p, doc); err != nil {
		t.Fatal(err)
	}
	if len(p.inputs) != 1 || r.Stats.Skipped != 1 {
		t.Fatalf("unchanged document re-embedded: inputs=%d skipped=%d", len(p.inputs), r.Stats.Skipped)
	}
}
