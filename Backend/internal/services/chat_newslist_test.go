package services

import (
	"strings"
	"testing"
)

func techNews() []SemanticResult {
	return []SemanticResult{
		source("news", 188, "8 penyebab HP tidak bisa menerima SMS dan cara mengatasinya", "Sinyal penuh tidak selalu menjamin SMS masuk.", 0),
		source("news", 190, "Ini alasan mengapa laptop lemot saat buka whatsapp", "WhatsApp bisa membuat laptop lemot.", 0),
		source("news", 191, "Ini alasan mengapa laptop Anda lemot saat streaming", "Streaming bisa membuat laptop lemot.", 0),
	}
}

// newsListIntent is the intent the latest/popular news path sets (chat.go: a news list is a list answer).
var newsListIntent = ChatIntent{Kind: intentList, Requested: 3, Domain: "berita"}

// Jobdesk 30 Okt T1 option B: run 3 of the raw-reply probe listed a title merged from two real ones.
func TestGroundingRejectsListItemWithMergedTitle(t *testing.T) {
	answer := "Berikut berita teknologi terbaru:\n1. Ini alasan mengapa laptop lemot saat buka whatsapp\n2. Ini alasan mengapa HP tidak bisa menerima SMS dan cara mengatasinya\n3. 8 penyebab HP tidak bisa menerima SMS dan cara mengatasinya"
	got, report := groundAnswer(answer, newsListIntent, ragOf(techNews()), techNews(), "konteks")
	if report["fallback"] != true || !strings.Contains(strings.Join(report["problems"].([]string), ","), "unknown_item") {
		t.Fatalf("merged title must fall back: %v\n%s", report, got)
	}
}

func TestGroundingKeepsListThatNamesEverySource(t *testing.T) {
	answer := "Berikut berita teknologi terbaru:\n1. **8 penyebab HP tidak bisa menerima SMS dan cara mengatasinya**\n   - Tanggal terbit: 24 Oktober 2026\n2. Ini alasan mengapa laptop lemot saat buka whatsapp\n3. Ini alasan mengapa laptop Anda lemot saat streaming"
	if _, report := groundAnswer(answer, newsListIntent, ragOf(techNews()), techNews(), "konteks"); report["fallback"] != false {
		t.Fatalf("valid list rejected: %v", report)
	}
}

func TestGroundingAcceptsShortenedSourceName(t *testing.T) {
	events := []SemanticResult{
		source("event", 20, "Bangil Carnival (Pasuruan Carnival)", "Karnaval.", 0.7),
		source("event", 21, "Pasuruan Creative Fest: WasikOn Festivale", "Festival.", 0.7),
	}
	answer := "1. Bangil Carnival - parade seni\n2. Pasuruan Creative Fest - festival kreatif"
	if _, report := groundAnswer(answer, listIntent(2, "acara"), ragOf(events), events, "konteks"); report["fallback"] != false {
		t.Fatalf("shortened names rejected: %v", report)
	}
}

// Jobdesk 30 Okt T1 option C: latest/popular news lists send the first sentence and the field lines only.
func TestNewsListExcerptsKeepFirstSentenceAndFields(t *testing.T) {
	article := source("news", 187, "Cara menambah anggota keluarga di KK secara online",
		"Jakarta (ANTARA) - Penambahan anggota keluarga kini dapat diajukan online. Layanan ini memudahkan warga.\n\nDilarang keras mengambil konten tanpa izin.\nKategori berita: Teknologi\nSumber: Antara News\nTanggal terbit: 25 Oktober 2026", 0)
	got := newsListExcerpts([]SemanticResult{article})[0].Answer
	want := "Ringkasan: Jakarta (ANTARA) - Penambahan anggota keluarga kini dapat diajukan online.\nKategori berita: Teknologi\nSumber: Antara News\nTanggal terbit: 25 Oktober 2026"
	if got != want {
		t.Fatalf("excerpt:\n%q\nwant\n%q", got, want)
	}
	if article.Answer == got {
		t.Fatal("the input result must not be changed")
	}
}

// Jobdesk 11 Nov point 2: the news fetch joins paragraphs without a space ("masyarakat.Namun"); the first sentence still
// ends there, while an initial, a number, or an acronym inside a sentence does not end it.
func TestFirstSentenceEndsAtGluedSentence(t *testing.T) {
	for text, want := range map[string]string{
		"Jakarta (ANTARA) - Bansos untuk masyarakat.Namun, ada syaratnya. Lagi.":      "Jakarta (ANTARA) - Bansos untuk masyarakat.",
		"Program BAZNAS.Jika memenuhi syarat, zakat dibayar.":                         "Program BAZNAS.",
		"Pernahkah melihat takraw tanpa tangan?Itu adalah Sepak Takraw.":              "Pernahkah melihat takraw tanpa tangan?",
		"Pesan K.H. Hasan dibacakan di Gontor. Lalu acara ditutup.":                   "Pesan K.H. Hasan dibacakan di Gontor.",
		"Harga naik Rp1.000 per gram hari ini":                                        "Harga naik Rp1.000 per gram hari ini",
		"Thailand menjadi tuan rumah.SEA Games merupakan ajang terbesar.":             "Thailand menjadi tuan rumah.",
		"Kantor di Jalan A.Yani nomor 5. Kedua.":                                      "Kantor di Jalan A.Yani nomor 5.",
		"Tokoh A.W dari Jakarta hadir. Kedua.":                                        "Tokoh A.W dari Jakarta hadir.",
		"Penambahan anggota keluarga kini dapat diajukan online. Layanan memudahkan.": "Penambahan anggota keluarga kini dapat diajukan online.",
	} {
		if got := firstSentence(text, newsListSummaryRunes); got != want {
			t.Errorf("firstSentence(%q) = %q, want %q", text, got, want)
		}
	}
}

// Jobdesk 30 Okt T1: gemma3:4b used the Ringkasan sentence as the item name of national news lists.
func TestNewsListPromptAsksForTitles(t *testing.T) {
	prompt := protectedSystemPrompt(newsListIntent, ragContext{NewsLatest: true}, testToday)
	if !strings.Contains(prompt, "ATURAN_DAFTAR_BERITA: Setiap nomor diawali judul berita persis seperti NAMA") {
		t.Fatal("latest news list prompt misses the title rule")
	}
	if strings.Contains(protectedSystemPrompt(newsListIntent, ragContext{NewsCategory: "Politik"}, testToday), "ATURAN_DAFTAR_BERITA") {
		t.Fatal("a topic search of one category must not get the list rule")
	}
}
