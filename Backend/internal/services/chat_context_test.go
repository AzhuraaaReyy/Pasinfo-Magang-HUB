package services

import (
	"fmt"
	"strings"
	"testing"
	"unicode/utf8"
)

func source(sourceType string, id int64, label, answer string, similarity float64) SemanticResult {
	status := "low_confidence"
	if similarity >= DefaultRelevanceThreshold {
		status = "relevant"
	}
	return SemanticResult{SourceType: &sourceType, SourceID: &id, SourceLabel: &label, Answer: answer, Similarity: similarity, RelevanceStatus: status}
}

func TestRAGContextLabelsFieldsAndSkipsLowConfidence(t *testing.T) {
	results := []SemanticResult{
		source("destination", 35, "Taman Kota Pasuruan", "Taman kota untuk bersantai.\nKategori: Keluarga", 0.7),
		source("culinary", 4, "Warung Lain", "Isi warung yang tidak cocok.", 0.4),
	}
	rag := buildRAGContext(results, len(results), maxContextRunes, false)
	text, included, truncated := rag.Text, rag.Included, rag.Truncated
	for _, want := range []string{"DOKUMEN 1", "NAMA: Taman Kota Pasuruan", "DOMAIN: Wisata (destinasi)", "DATA:\nTaman kota untuk bersantai.\nKategori: Keluarga", "AKHIR_DOKUMEN"} {
		if !strings.Contains(text, want) {
			t.Fatalf("context missing %q:\n%s", want, text)
		}
	}
	if strings.Contains(text, "Warung Lain") || strings.Contains(text, "35") || len(included) != 1 || truncated {
		t.Fatalf("low-confidence data or source ID leaked: %s (included=%d)", text, len(included))
	}
}

func TestRAGContextPreservesDomainOfEachSource(t *testing.T) {
	results := []SemanticResult{
		source("culinary", 1, "Nasi Punel", "Kuliner khas Bangil.", 0.7),
		source("culture", 2, "Tari Terbang", "Kesenian.", 0.7),
		source("event", 3, "Pekan Raya", "Pameran.", 0.7),
		source("news", 4, "Berita Banjir", "Isi berita.", 0.7),
		source("region", 5, "Kota Pasuruan", "Wilayah.", 0.7),
	}
	text := buildRAGContext(results, maxListCount, maxContextRunes, false).Text
	for _, want := range []string{"NAMA: Nasi Punel\nDOMAIN: Kuliner", "NAMA: Tari Terbang\nDOMAIN: Budaya", "NAMA: Pekan Raya\nDOMAIN: Acara", "NAMA: Berita Banjir\nDOMAIN: Berita", "NAMA: Kota Pasuruan\nDOMAIN: Informasi umum (wilayah)"} {
		if !strings.Contains(text, want) {
			t.Fatalf("context missing %q:\n%s", want, text)
		}
	}
}

func TestRAGContextKeepsCompleteBlocksWithinBudget(t *testing.T) {
	var results []SemanticResult
	long := strings.Repeat("Deskripsi panjang destinasi. ", 60) + "\nAlamat: Jalan Raya\nKategori: Alam"
	for i := 1; i <= 20; i++ {
		results = append(results, source("destination", int64(i), fmt.Sprintf("Destinasi %d", i), long, 0.7))
	}
	rag := buildRAGContext(results, len(results), maxContextRunes, false)
	text, included, truncated := rag.Text, rag.Included, rag.Truncated
	if utf8.RuneCountInString(text) > maxContextRunes || !truncated {
		t.Fatalf("budget not enforced: %d runes, truncated=%v", utf8.RuneCountInString(text), truncated)
	}
	if strings.Count(text, "DOKUMEN ") != len(included) || strings.Count(text, "AKHIR_DOKUMEN") != len(included) || len(included) == 0 {
		t.Fatalf("incomplete blocks: %d included", len(included))
	}
	for _, result := range included {
		if !strings.Contains(text, "NAMA: "+*result.SourceLabel+"\n") {
			t.Fatalf("label split for %s", *result.SourceLabel)
		}
	}
}

func TestFitDocumentCutsAtLinesOrSentences(t *testing.T) {
	text := "Kalimat satu. Kalimat dua.\nAlamat: Jalan A\nHarga: 10000"
	if got, cut := fitDocument(text, 1000); got != text || cut {
		t.Fatalf("short text changed: %q", got)
	}
	if got, cut := fitDocument(text, 43); got != "Kalimat satu. Kalimat dua.\nAlamat: Jalan A" || !cut {
		t.Fatalf("line cut = %q", got)
	}
	if got, _ := fitDocument(text, 20); got != "Kalimat satu." {
		t.Fatalf("sentence cut = %q", got)
	}
}

// Session 213 (2026-10-31): a long news body pushed its trailing field lines out of the context and
// the model invented the date. The field lines are kept and the body is shortened instead.
func TestFitDocumentKeepsTrailingFieldLinesOfLongBody(t *testing.T) {
	text := strings.Repeat("Kalimat isi berita yang panjang. ", 60) + "\nKategori berita: Lokal\nSumber: Antara News\nDitambahkan ke database: 24 Oktober 2026"
	got, cut := fitDocument(text, 400)
	if !cut || utf8.RuneCountInString(got) > 400 {
		t.Fatalf("cut=%v len=%d", cut, utf8.RuneCountInString(got))
	}
	for _, want := range []string{"Kalimat isi berita yang panjang.", "\nKategori berita: Lokal", "\nSumber: Antara News", "\nDitambahkan ke database: 24 Oktober 2026"} {
		if !strings.Contains(got, want) {
			t.Fatalf("missing %q in %q", want, got)
		}
	}
	if strings.HasPrefix(got, "Kategori") {
		t.Fatalf("body must come first: %q", got)
	}
}

func TestRAGContextDropsDuplicateSources(t *testing.T) {
	first := source("destination", 1, "Candi Jawi", "Candi.", 0.7)
	included := buildRAGContext([]SemanticResult{first, first, source("culture", 1, "Candi Jawi Budaya", "Budaya.", 0.7)}, maxListCount, maxContextRunes, false).Included
	if len(included) != 2 {
		t.Fatalf("included = %d, want 2 distinct sources", len(included))
	}
}

// Runtime case 2026-10-30: six relevant culinary documents of ~2,600 runes (15 sample menus each),
// three requested. All three must be sent, with shorter data, and Found must stay 6.
func TestRAGContextFitsRequestedLongDocuments(t *testing.T) {
	long := "Warung nasi punel khas Bangil. " + strings.Repeat("\nMenu (data contoh, belum terverifikasi): Nasi Punel Komplit (Makanan) - nasi dengan aneka lauk khas - Harga: 25000", 23)
	var results []SemanticResult
	for i := 1; i <= 6; i++ {
		results = append(results, source("culinary", int64(i), fmt.Sprintf("Warung Bangil %d", i), long, 0.7))
	}
	if utf8.RuneCountInString(long) < 2500 {
		t.Fatalf("fixture too short: %d runes", utf8.RuneCountInString(long))
	}
	rag := buildRAGContext(results, 3, maxContextRunes, false)
	if rag.Shown() != 3 || rag.Found != 6 || utf8.RuneCountInString(rag.Text) > maxContextRunes {
		t.Fatalf("shown=%d found=%d runes=%d", rag.Shown(), rag.Found, utf8.RuneCountInString(rag.Text))
	}
	prompt := protectedSystemPrompt(recommendIntent(3, "kuliner"), rag, testToday)
	if strings.Contains(prompt, "baru menemukan") || strings.Contains(prompt, "hanya memiliki") {
		t.Fatalf("a met request must not report a shortfall:\n%s", prompt)
	}
}

func sampleDestination() SemanticResult {
	text := "Taman kota untuk keluarga.\nKategori: Keluarga\nFasilitas (data contoh, belum terverifikasi): Parkir\nHarga (data contoh, belum terverifikasi): Tiket Masuk 10000"
	return source("destination", 35, "Taman Kota Pasuruan", text, 0.7)
}

func TestRAGContextSendsSampleDataOnlyWhenAsked(t *testing.T) {
	without := buildRAGContext([]SemanticResult{sampleDestination()}, 5, maxContextRunes, false)
	if strings.Contains(without.Text, "Tiket Masuk 10000") || strings.Contains(without.Text, "Parkir") || without.HasSampleData {
		t.Fatalf("sample data sent although not asked:\n%s", without.Text)
	}
	if !strings.Contains(without.Text, "Kategori: Keluarga") {
		t.Fatalf("real fields must stay:\n%s", without.Text)
	}
	with := buildRAGContext([]SemanticResult{sampleDestination()}, 5, maxContextRunes, true)
	if !strings.Contains(with.Text, "Harga (data contoh, belum terverifikasi): Tiket Masuk 10000") || !with.HasSampleData {
		t.Fatalf("asked sample data missing:\n%s", with.Text)
	}
}
