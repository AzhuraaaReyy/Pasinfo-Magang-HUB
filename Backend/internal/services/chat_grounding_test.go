package services

import (
	"fmt"
	"slices"
	"strings"
	"testing"
)

func threeDestinations() []SemanticResult {
	return []SemanticResult{
		source("destination", 35, "Taman Kota Pasuruan", "Taman kota untuk bersantai keluarga. Ada area bermain.", 0.7),
		source("destination", 36, "Candi Jawi", "Candi peninggalan Singasari.", 0.7),
		source("destination", 37, "Kebun Raya Purwodadi", "Kebun raya dengan koleksi tanaman.", 0.7),
	}
}

func TestGroundAnswerKeepsValidNaturalAnswer(t *testing.T) {
	answer := "Salah satu pilihan adalah Taman Kota Pasuruan karena cocok untuk bersantai. Mau saya carikan tempat lain di sekitarnya?"
	got, report := groundAnswer(answer, factIntent(""), ragOf(threeDestinations()[:1]), threeDestinations(), "konteks")
	if got != answer || report["fallback"] != false {
		t.Fatalf("valid answer changed: %q %v", got, report)
	}
	if used := report["used_sources"].([]string); len(used) != 1 || used[0] != "Taman Kota Pasuruan" {
		t.Fatalf("used sources = %v", used)
	}
}

func TestGroundAnswerRemovesSourceIDsAndUnknownURLs(t *testing.T) {
	answer := "Taman Kota Pasuruan [SOURCE_ID: 18] cocok untuk keluarga ([detail](https://example.com/source_id_18)). SOURCE: 35 `"
	got, report := groundAnswer(answer, factIntent(""), ragOf(threeDestinations()[:1]), nil, "Taman Kota Pasuruan")
	for _, banned := range []string{"SOURCE", "18", "35", "example.com", "`"} {
		if strings.Contains(got, banned) {
			t.Fatalf("%q left in %q", banned, got)
		}
	}
	if !strings.Contains(got, "cocok untuk keluarga") || report["fallback"] != false {
		t.Fatalf("answer = %q report=%v", got, report)
	}
}

func TestGroundAnswerReplacesTenItemsWhenOnlyThreeSourcesExist(t *testing.T) {
	var b strings.Builder
	b.WriteString("Berikut 10 rekomendasi wisata di Pasuruan:\n")
	for i := 1; i <= 10; i++ {
		fmt.Fprintf(&b, "%d. Taman Kota Pasuruan\n", i)
	}
	intent := recommendIntent(10, "wisata")
	got, report := groundAnswer(b.String(), intent, ragOf(threeDestinations()), threeDestinations(), "konteks")
	if report["fallback"] != true {
		t.Fatalf("overclaim accepted: %v", report)
	}
	for _, want := range []string{"baru menemukan 3 pilihan yang sesuai dari 10", "1. Taman Kota Pasuruan", "2. Candi Jawi", "3. Kebun Raya Purwodadi", "Taman kota untuk bersantai keluarga."} {
		if !strings.Contains(got, want) {
			t.Fatalf("fallback missing %q:\n%s", want, got)
		}
	}
	if strings.Contains(got, "4.") || strings.Contains(got, "35") || strings.Count(got, "Taman Kota Pasuruan") != 1 {
		t.Fatalf("fallback invented or duplicated items:\n%s", got)
	}
}

func TestGroundAnswerRejectsDuplicateItems(t *testing.T) {
	answer := "1. Candi Jawi - candi.\n2. Candi Jawi - lagi.\n3. Taman Kota Pasuruan - taman."
	_, report := groundAnswer(answer, recommendIntent(3, "wisata"), ragOf(threeDestinations()), threeDestinations(), "konteks")
	if report["fallback"] != true {
		t.Fatalf("duplicate accepted: %v", report)
	}
}

func TestGroundAnswerAllowsShortfallExplanation(t *testing.T) {
	answer := "Anda meminta 10 rekomendasi, namun database kami hanya memiliki 3 hasil yang relevan:\n1. Taman Kota Pasuruan\n2. Candi Jawi\n3. Kebun Raya Purwodadi"
	got, report := groundAnswer(answer, recommendIntent(10, "wisata"), ragOf(threeDestinations()), threeDestinations(), "konteks")
	if got != answer || report["fallback"] != false {
		t.Fatalf("honest shortfall replaced: %v", report)
	}
}

func TestGroundAnswerRejectsUnselectedCandidate(t *testing.T) {
	all := threeDestinations()
	answer := "Candi Jawi bisa dipertimbangkan, begitu juga Kebun Raya Purwodadi."
	got, report := groundAnswer(answer, factIntent(""), ragOf(all[1:2]), all, "NAMA: Candi Jawi")
	if report["fallback"] != true || strings.Contains(got, "Kebun Raya Purwodadi") {
		t.Fatalf("unselected source kept: %q %v", got, report)
	}
}

func TestGroundAnswerNoSourceDoesNotNameRetrievedPlaces(t *testing.T) {
	answer := "Coba kunjungi Candi Jawi."
	got, report := groundAnswer(answer, factIntent("wisata"), ragOf(nil), threeDestinations(), "Wisata di bulan?")
	if got != noSourceFallbackAnswer || report["fallback"] != true {
		t.Fatalf("no-source answer named a place: %q", got)
	}
}

// Regression #5 BUD-04 (2026-10-31): without context the model listed two invented places.
func TestGroundAnswerNoSourceRejectsInventedItems(t *testing.T) {
	question := "Saya ingin mengunjungi tempat yang punya rumah informasi. Apa pilihannya?"
	invented := []string{
		"Tentu saja! Ada dua pilihan:\n\n1. **Rumah Informasi Wisata Pasuruan** – di Alun-Alun.\n2. **Rumah Informasi Desa** – di beberapa desa.",
		"Anda bisa mengunjungi **Rumah Informasi Wisata Pasuruan** di Alun-Alun.",
	}
	for _, answer := range invented {
		got, report := groundAnswer(answer, factIntent(""), ragOf(nil), nil, question)
		if got != noSourceFallbackAnswer || report["fallback"] != true {
			t.Fatalf("invented items kept: %q (%v)", got, report)
		}
	}
	honest := "Informasi mengenai jumlah penduduk Pasuruan saat ini belum tersedia di database kami."
	if got, report := groundAnswer(honest, factIntent(""), ragOf(nil), nil, "Berapa jumlah penduduk Pasuruan?"); got != honest || report["fallback"] != false {
		t.Fatalf("honest no-source answer replaced: %q", got)
	}
}

func TestGroundAnswerCountsOnlyTopLevelItems(t *testing.T) {
	answer := "Berikut pilihannya:\n1. **Taman Kota Pasuruan**\n   - Kategori: Keluarga\n   - Ada area bermain\n2. Candi Jawi\n   - Peninggalan Singasari\n3. Kebun Raya Purwodadi\n   * Koleksi tanaman"
	got, report := groundAnswer(answer, recommendIntent(3, "wisata"), ragOf(threeDestinations()), threeDestinations(), "konteks")
	if got != answer || report["fallback"] != false {
		t.Fatalf("detail bullets counted as items: %v", report)
	}
}

// ragOf wraps selected sources as a context in which every relevant document was shown.
func ragOf(included []SemanticResult) ragContext {
	return ragContext{Included: included, Found: len(included)}
}

func TestGroundedFallbackDoesNotClaimDatabaseShortfallWhenMoreWereFound(t *testing.T) {
	rag := ragContext{Included: threeDestinations()[:2], Found: 6}
	got := groundedFallback(recommendIntent(3, "wisata"), rag)
	if strings.Contains(got, "hanya memiliki") || strings.Contains(got, "baru menemukan") || !strings.Contains(got, "bisa saya tampilkan dulu") || !strings.Contains(got, "Masih ada pilihan lain") {
		t.Fatalf("fallback = %q", got)
	}
	short := groundedFallback(recommendIntent(3, "wisata"), ragContext{Included: threeDestinations()[:2], Found: 2})
	if !strings.Contains(short, "Saya baru menemukan 2 pilihan yang sesuai dari 3") {
		t.Fatalf("search shortfall fallback = %q", short)
	}
}

func TestGroundAnswerAddsSampleNoteOnlyWhenNeeded(t *testing.T) {
	rag := ragContext{Included: []SemanticResult{sampleDestination()}, Found: 1, HasSampleData: true}
	got, report := groundAnswer("Tiket masuk Taman Kota Pasuruan Rp10.000.", ChatIntent{Kind: intentFact, SampleFields: true}, rag, nil, "konteks")
	if !strings.HasSuffix(got, sampleDataNote) || report["sample_note"] != true {
		t.Fatalf("note missing: %q", got)
	}
	labelled := "Tiket masuk Rp10.000 (data contoh, belum terverifikasi)."
	if got, _ := groundAnswer(labelled, ChatIntent{Kind: intentFact, SampleFields: true}, rag, nil, "konteks"); got != labelled {
		t.Fatalf("note added twice: %q", got)
	}
	rag.HasSampleData = false
	if got, _ := groundAnswer("Taman Kota Pasuruan cocok untuk keluarga.", factIntent(""), rag, nil, "konteks"); strings.Contains(got, "Catatan") {
		t.Fatalf("note without sample data: %q", got)
	}
}

func TestGroundAnswerRemovesTechnicalLabelLines(t *testing.T) {
	answer := "Berikut pilihannya:\n1. **Nasi Punel Bu Hj. Lin**\n    * DOMAIN: Kuliner\n    * Alamat: Gempeng, Kec. Bangil\nDATA_TERPOTONG: ya\nMau tahu lebih lanjut?"
	rag := ragOf([]SemanticResult{source("culinary", 1, "Nasi Punel Bu Hj. Lin", "Kuliner.", 0.7)})
	got, report := groundAnswer(answer, recommendIntent(1, "kuliner"), rag, nil, "konteks")
	want := "Berikut pilihannya:\n1. **Nasi Punel Bu Hj. Lin**\n    * Alamat: Gempeng, Kec. Bangil\nMau tahu lebih lanjut?"
	if got != want || report["fallback"] != false {
		t.Fatalf("got %q (report %v)", got, report)
	}
}

func TestGroundAnswerRemovesSentencesRepeatingPromptContext(t *testing.T) {
	answer := "Tidak ada acara yang dijadwalkan khusus pada periode ini di database. CONTEXT berisi acara yang masih berlangsung (bila ada) dan jadwal terdekat sesudah periode ini.\n\nAnda bisa mengunjungi Candi Jawi. Konteks lokalnya menarik."
	got, report := groundAnswer(answer, factIntent("acara"), ragOf(threeDestinations()[1:2]), nil, "konteks")
	want := "Tidak ada acara yang dijadwalkan khusus pada periode ini di database.\n\nAnda bisa mengunjungi Candi Jawi. Konteks lokalnya menarik."
	if got != want || report["fallback"] != false {
		t.Fatalf("got %q (report %v)", got, report)
	}
	if cleaned := report["cleaned"].([]string); len(cleaned) != 1 || cleaned[0] != "prompt_rule_removed" {
		t.Fatalf("cleaned = %v", cleaned)
	}
}

func TestGroundAnswerStripsDataLabelButKeepsContent(t *testing.T) {
	answer := "1. **Candi Jawi**\n    * DATA: Candi peninggalan Singasari.\n    * **Data:**\nDATA:\nMau tahu lebih lanjut? Data contoh belum tersedia."
	rag := ragOf(threeDestinations()[1:2])
	got, report := groundAnswer(answer, factIntent(""), rag, nil, "konteks")
	want := "1. **Candi Jawi**\n    * Candi peninggalan Singasari.\nMau tahu lebih lanjut? Data contoh belum tersedia."
	if got != want || report["fallback"] != false {
		t.Fatalf("got %q (report %v)", got, report)
	}
	if cleaned := report["cleaned"].([]string); len(cleaned) != 1 || cleaned[0] != "technical_label_removed" {
		t.Fatalf("cleaned = %v", cleaned)
	}
}

func TestGroundAnswerStripsNamaLabelButKeepsTitle(t *testing.T) {
	answer := "Berita terbaru:\n* **NAMA:** Candi Jawi\n* Nama: Candi Jawi"
	got, _ := groundAnswer(answer, factIntent(""), ragOf(threeDestinations()[1:2]), nil, "konteks")
	if got != "Berita terbaru:\n* Candi Jawi\n* Candi Jawi" {
		t.Fatalf("got %q", got)
	}
}

func TestGroundAnswerRemovesMarkdownDomainLabelInAnyCase(t *testing.T) {
	answer := "1. **Cairo Restaurant Bangil**\n    * **Alamat:** Bendomungal, Kec. Bangil\n    * **Domain:** Kuliner\n    * Alasan: masakan Timur Tengah.\nMau tahu lebih lanjut?"
	rag := ragOf([]SemanticResult{source("culinary", 2, "Cairo Restaurant Bangil", "Kuliner.", 0.7)})
	got, _ := groundAnswer(answer, recommendIntent(1, "kuliner"), rag, nil, "konteks")
	want := "1. **Cairo Restaurant Bangil**\n    * **Alamat:** Bendomungal, Kec. Bangil\n    * Alasan: masakan Timur Tengah.\nMau tahu lebih lanjut?"
	if got != want {
		t.Fatalf("got %q", got)
	}
}

func TestGroundAnswerRemovesInSentenceDocumentReferences(t *testing.T) {
	answer := "Informasi harga tiket bisa ditemukan pada DOKUMEN 1. Detailnya (lihat dokumen 2) juga tersedia."
	rag := ragOf(threeDestinations()[:1])
	got, report := groundAnswer(answer, factIntent(""), rag, nil, "konteks")
	if got != "Detailnya juga tersedia." {
		t.Fatalf("got %q (%v)", got, report["cleaned"])
	}
}

// Regression #2 UMM-03 (2026-10-30): "Informasi ini terdapat pada DOKUMEN 1." became the dangling
// "Informasi ini terdapat." — a sentence that only points at a document is removed whole.
func TestRemoveDocumentReferencesDropsDanglingSentencesOnly(t *testing.T) {
	cases := map[string]string{
		"Pasuruan adalah Kota Pasuruan, yang merupakan wilayah administrasi. Informasi ini terdapat pada DOKUMEN 1.": "Pasuruan adalah Kota Pasuruan, yang merupakan wilayah administrasi. ",
		"Informasi ini tercantum di dokumen 2. Candi Jawi berada di Prigen.":                                         "Candi Jawi berada di Prigen.",
		"1. Taman Kota Pasuruan (DOKUMEN 1)\n2. Candi Jawi":                                                          "1. Taman Kota Pasuruan\n2. Candi Jawi",
		"Candi ini pertama kali ditemukan pada abad ke-19.":                                                          "Candi ini pertama kali ditemukan pada abad ke-19.",
		"Candi Jawi berada di Prigen menurut DOKUMEN 3, dekat Tretes.":                                               "Candi Jawi berada di Prigen, dekat Tretes.",
		// Session 205 (2026-10-31): an opening reference left "Tentu, ada., Satgas …".
		"Tentu, ada. Berdasarkan DOKUMEN 1, Satgas PRR membangun sumur bor.": "Tentu, ada. Satgas PRR membangun sumur bor.",
		"Tentu, ada. Menurut dokumen 2: data ini lengkap.":                   "Tentu, ada. Data ini lengkap.",
		"Satgas PRR membangun sumur bor (DOKUMEN 1).":                        "Satgas PRR membangun sumur bor.",
		"Satgas PRR membangun sumur bor ( DOKUMEN 1 ), sebanyak 1.198.":      "Satgas PRR membangun sumur bor, sebanyak 1.198.",
		// BUD-07 (2026-11-02): the document was the subject, twice in one sentence.
		"Pendirinya belum tersedia. DOKUMEN 1 menjelaskan museum, sedangkan DOKUMEN 2 menjelaskan prasasti. Mau tahu lagi?": "Pendirinya belum tersedia. Mau tahu lagi?",
		"Candi Jawi (DOKUMEN 1) dan Candi Belahan (DOKUMEN 2) ada di Prigen.":                                               "Candi Jawi dan Candi Belahan ada di Prigen.",
	}
	for in, want := range cases {
		if got := removeDocumentReferences(in); got != want {
			t.Errorf("%q\n got %q\nwant %q", in, got, want)
		}
	}
}

// Runtime 2026-11-01: "Candi Jawi buka setiap hari." was not in the context (no opening hours stored).
func TestUnsupportedOpeningHoursAreRemoved(t *testing.T) {
	invented := "Ya, di Candi Jawi ada rumah informasi. Candi Jawi buka setiap hari. Ada lagi yang ingin ditanyakan?"
	got := removeUnsupportedOpeningHours(invented, "Candi Jawi\nAlamat: Candiwates, Kec. Prigen")
	if strings.Contains(got, "setiap hari") || !strings.Contains(got, "rumah informasi") || !strings.Contains(got, openingHoursUnavailable) {
		t.Fatalf("got %q", got)
	}
	supported := "Warung ini buka pada pagi hari."
	if got := removeUnsupportedOpeningHours(supported, "Warung Rawon Sate Komo. Warung ini buka pada pagi hari."); got != supported {
		t.Fatalf("supported claim changed: %q", got)
	}
	honest := "Informasi jam buka Candi Jawi belum tersedia di database kami."
	if got := removeUnsupportedOpeningHours(honest, "Candi Jawi"); got != honest {
		t.Fatalf("answer without a claim changed: %q", got)
	}
}

// Owner 2026-11-02 (option 1A): an answer naming a place whose status is pending says so; with sample
// prices too, one combined note; a verified place gets no note.
func TestUnverifiedPlaceNote(t *testing.T) {
	pending := source("destination", 46, "Candi Jawi", "Candi.\nStatus verifikasi: belum terverifikasi", 0.7)
	verified := source("event", 18, "Pameran Tetap", "Pameran.\nStatus verifikasi: terverifikasi", 0.7)
	intent := factIntent("")
	got, report := groundAnswer("Candi Jawi ada di Prigen.", intent, ragContext{Included: []SemanticResult{pending}}, nil, "")
	if !strings.HasSuffix(got, unverifiedPlaceNote) || report["unverified_note"] != true {
		t.Fatalf("pending place: %q", got)
	}
	got, _ = groundAnswer("Candi Jawi tiketnya Rp10.000.", intent, ragContext{Included: []SemanticResult{pending}, HasSampleData: true}, nil, "")
	if !strings.HasSuffix(got, unverifiedSampleNote) || strings.Count(got, "Catatan:") != 1 {
		t.Fatalf("pending place + sample data: %q", got)
	}
	got, _ = groundAnswer("Pameran Tetap buka hari ini.", factIntent(""), ragContext{Included: []SemanticResult{verified}}, nil, "")
	if strings.Contains(got, "belum terverifikasi") {
		t.Fatalf("verified place got the note: %q", got)
	}
}

// Owner 2026-11-02 (option 2A): an itinerary answer says travel times are not available.
func TestItineraryNote(t *testing.T) {
	grounding := map[string]any{"fallback": false}
	got := withItineraryNote("Pagi: Candi Jawi. Siang: Taman Kota.", "Bagaimana menyusun itinerary wisata satu hari di Pasuruan?", grounding, true)
	if !strings.HasSuffix(got, itineraryNote) || grounding["itinerary_note"] != true {
		t.Fatalf("itinerary: %q", got)
	}
	for name, c := range map[string]struct {
		question string
		fallback bool
		context  bool
	}{
		"not an itinerary": {"Di mana Candi Jawi?", false, true},
		"fallback answer":  {"Buat itinerary satu hari", true, true},
		"no context":       {"Buat itinerary satu hari", false, false},
	} {
		if got := withItineraryNote("Jawaban.", c.question, map[string]any{"fallback": c.fallback}, c.context); got != "Jawaban." {
			t.Errorf("%s: %q", name, got)
		}
	}
}

// J4-10 (2026-11-02): a facility question about a place without a Fasilitas line is answered as not
// available, also when the model listed the menu; a place with facilities keeps the model answer.
func TestFacilityQuestionWithoutFacilityData(t *testing.T) {
	punel := source("culinary", 1, "Nasi Punel Bu Hj. Lin", "Nasi punel.\nMenu (data contoh, belum terverifikasi): Es Cincau", 0.7)
	grounding := map[string]any{}
	got := withoutUnsupportedFacilities("Fasilitas: * Es Cincau", true, []SemanticResult{punel}, grounding)
	if !strings.HasPrefix(got, "Informasi fasilitas Nasi Punel Bu Hj. Lin belum tersedia") || strings.Contains(got, "Es Cincau") || grounding["facility_unavailable"] != true {
		t.Fatalf("got %q", got)
	}
	bromo := source("destination", 1, "Penanjakan Bromo", "Bromo.\nFasilitas (data contoh, belum terverifikasi): Parkir", 0.7)
	if got := withoutUnsupportedFacilities("Fasilitas: Parkir.", true, []SemanticResult{bromo}, nil); got != "Fasilitas: Parkir." {
		t.Fatalf("place with facilities changed: %q", got)
	}
	if got := withoutUnsupportedFacilities("Menu: Es Cincau.", false, []SemanticResult{punel}, nil); got != "Menu: Es Cincau." {
		t.Fatalf("non-facility question changed: %q", got)
	}
}

// T08 F3 (12 replies since 2026-11-06, e2e N1): the prompt says JUMLAH_DOKUMEN_DITEMUKAN: 10 while 5 news are sent; "Ada
// 10 berita teknologi" is the system's own count and must not replace the answer. A count above it stays an overclaim.
func TestCountUpToTheFoundDocumentsIsNoOverclaim(t *testing.T) {
	var news []SemanticResult
	var list strings.Builder
	for i := 1; i <= 5; i++ {
		label := fmt.Sprintf("Berita Teknologi Uji %d", i)
		news = append(news, source("news", int64(900+i), label, "Isi berita.", 0.7))
		fmt.Fprintf(&list, "%d. %s\n", i, label)
	}
	rag := ragContext{Included: news, Found: 10}
	intent := ChatIntent{Kind: intentList, Requested: defaultListCount, DefaultCount: true, Domain: "berita"}
	for _, tc := range []struct {
		claim     string
		overclaim bool
	}{
		{"Ada 10 berita teknologi terbaru di database kami.", false},
		{"Ada 12 berita teknologi terbaru di database kami.", true},
	} {
		problems := groundingProblems(tc.claim+" Berikut 5 di antaranya:\n"+list.String(), intent, rag.Included, news, "konteks", rag.Found)
		if got := slices.Contains(problems, "count_overclaim"); got != tc.overclaim {
			t.Errorf("%q: count_overclaim=%v, problems=%v", tc.claim, got, problems)
		}
	}
}

// T14 (audit 2026-11-08): 202 of 704 grounded answers without a source line named a source by its short form.
func TestMentionedLabelsAcceptsTheShortFormOfAName(t *testing.T) {
	included := []SemanticResult{
		source("event", 20, "Bangil Carnival (Pasuruan Carnival)", "Karnaval.", 0.7),
		source("event", 18, "Pameran Tetap Museum Cunggrang: Diorama Sejarah Pasuruan", "Pameran.", 0.7),
		source("news", 5, "Update: banjir di Pasuruan surut", "Banjir surut.", 0.7),
		source("culture", 9, "Candi Jawi", "Candi.", 0.7),
	}
	answer := "1. Pameran Tetap Museum Cunggrang buka setiap hari.\n2. Bangil Carnival digelar tiap tahun.\nUpdate jadwal akan diumumkan."
	got := mentionedLabels(answer, included)
	want := []string{"Pameran Tetap Museum Cunggrang: Diorama Sejarah Pasuruan", "Bangil Carnival (Pasuruan Carnival)"}
	if !slices.Equal(got, want) {
		t.Fatalf("labels = %v, want %v", got, want)
	}
	// The full name is still found first, and its mention is not counted twice.
	if got := mentionedLabels("Bangil Carnival (Pasuruan Carnival) dan Candi Jawi.", included); !slices.Equal(got, []string{"Bangil Carnival (Pasuruan Carnival)", "Candi Jawi"}) {
		t.Fatalf("full names = %v", got)
	}
}

// T14 single source (Owner 2026-11-08): a grounded answer from one source gets that source line even when it names the
// place only as "upacara ini"; a duplicate label counts once; an answer about missing information gets none.
func TestSingleSourceAnswerGetsTheSourceLine(t *testing.T) {
	kasada := source("culture", 31, "Upacara Yadnya Kasada (Sisi Pasuruan, Wonokitri)", "Upacara adat Tengger.", 0.7)
	jawi := source("destination", 9, "Candi Jawi", "Candi.\nTiket Masuk: 10000", 0.7)
	jawiCulture := source("culture", 9, "Candi Jawi", "Candi Singasari.", 0.7)
	intent := ChatIntent{Kind: intentFact}
	cases := []struct {
		name   string
		answer string
		docs   []SemanticResult
		want   []string
	}{
		{"short name", "Yadnya Kasada adalah upacara adat tahunan masyarakat Tengger.", []SemanticResult{kasada}, []string{"Upacara Yadnya Kasada (Sisi Pasuruan, Wonokitri)"}},
		{"duplicate label", "Tiket Masuk Rp10.000.", []SemanticResult{jawi, jawiCulture}, []string{"Candi Jawi"}},
		{"missing information", "Mohon maaf, informasi jam buka belum tersedia di database kami.", []SemanticResult{jawi}, []string{}},
		{"two sources", "Masjid ini dibangun untuk mengenang Cheng Ho.", []SemanticResult{kasada, jawi}, []string{}},
	}
	for _, tc := range cases {
		_, report := groundAnswer(tc.answer, intent, ragOf(tc.docs), tc.docs, "konteks")
		if got := report["used_sources"].([]string); !slices.Equal(got, tc.want) {
			t.Errorf("%s: used_sources = %v, want %v", tc.name, got, tc.want)
		}
	}
}
