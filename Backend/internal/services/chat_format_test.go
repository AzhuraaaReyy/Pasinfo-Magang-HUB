package services

import (
	"context"
	"strings"
	"testing"
)

func TestPlainTextAnswerRemovesMarkdownAndKeepsListStructure(t *testing.T) {
	answer := "### Agenda\nTentu, berikut agendanya:\n\n* **Pekan Raya Pasuruan**\n    * Tanggal: 21–27 September 2026\n    * Lokasi: Pandaan\n1. **Candi Jawi** – *peninggalan* Singasari.\n__Catatan__: 5 * 3 bukan markdown."
	want := "Agenda\nTentu, berikut agendanya:\n\n- Pekan Raya Pasuruan\n   - Tanggal: 21–27 September 2026\n   - Lokasi: Pandaan\n1. Candi Jawi – peninggalan Singasari.\nCatatan: 5 * 3 bukan markdown."
	if got := plainTextAnswer(answer); got != want {
		t.Fatalf("plain text:\n%q\nwant\n%q", got, want)
	}
}

func TestPlainTextAnswerDropsDanglingBullets(t *testing.T) {
	if got := plainTextAnswer("Tiket masuk Candi Jawi adalah Rp 10.000. -\n*\n- Parkir"); got != "Tiket masuk Candi Jawi adalah Rp 10.000.\n- Parkir" {
		t.Fatalf("got %q", got)
	}
	if got := plainTextAnswer("Tiket masuk Rp 10.000. [] Mau tahu lagi?"); got != "Tiket masuk Rp 10.000. Mau tahu lagi?" {
		t.Fatalf("empty brackets: %q", got)
	}
}

func TestPlainTextAnswerLeavesPlainAnswerUnchanged(t *testing.T) {
	answer := "Candi Jawi beralamat di Candi Wates, Kec. Prigen.\n\n1. Taman Kota Pasuruan\n   - Alamat: Jl. Pahlawan"
	if got := plainTextAnswer(answer); got != answer {
		t.Fatalf("changed a plain answer: %q", got)
	}
}

func TestSourceLineListsOnlyUsedSourcesAndReplacesModelLine(t *testing.T) {
	got := withSourceLine("Candi Jawi ada di Prigen.\nSumber: Candi Jawi, Candi Belahan", []string{"Candi Jawi"})
	if got != "Candi Jawi ada di Prigen.\n\nSumber: Candi Jawi" {
		t.Fatalf("source line: %q", got)
	}
	if got := withSourceLine("Informasi itu belum tersedia di database kami.", nil); strings.Contains(got, "Sumber") {
		t.Fatalf("source line without used sources: %q", got)
	}
}

// Final regression 2026-11-02 (Ollama): the model wrote its own "Sumber:" in 11 answers.
func TestSourceLineRemovesModelAttributionsButKeepsPublisher(t *testing.T) {
	cases := map[string]string{
		"Candi Jawi ada di Prigen. Sumber: Candi Jawi\n\nCatatan: cek lagi.":                   "Candi Jawi ada di Prigen.\n\nCatatan: cek lagi.\n\nSumber: Candi Jawi",
		"Candi Jawi peninggalan Singasari.\nSumber: Candi Jawi (Budaya)\n\nCatatan: cek lagi.": "Candi Jawi peninggalan Singasari.\n\nCatatan: cek lagi.\n\nSumber: Candi Jawi",
		"Candi Jawi ada di Prigen. Sumber:\n\nCatatan: cek lagi.":                              "Candi Jawi ada di Prigen.\n\nCatatan: cek lagi.\n\nSumber: Candi Jawi",
		"Candi Jawi ada di Prigen. Sumber:,":                                                   "Candi Jawi ada di Prigen.\n\nSumber: Candi Jawi",
		"1. Candi Jawi\n   - Sumber: Tempo\n   - Lokasi: Desa Sumber Rejo":                     "1. Candi Jawi\n   - Sumber: Tempo\n   - Lokasi: Desa Sumber Rejo\n\nSumber: Candi Jawi",
		"Candi Jawi diberitakan ulang. Sumber: Antara News":                                    "Candi Jawi diberitakan ulang. Sumber: Antara News\n\nSumber: Candi Jawi",
	}
	for in, want := range cases {
		if got := withSourceLine(in, []string{"Candi Jawi"}); got != want {
			t.Errorf("%q\n got %q\nwant %q", in, got, want)
		}
	}
	// J4-07: a label ending in ")" is still recognised in the model's own line.
	label := "Penanjakan Bromo (Penanjakan 1)"
	if got := withSourceLine("- Parkir\n\nSumber: "+label+"\n\nCatatan: cek lagi.", []string{label}); got != "- Parkir\n\nCatatan: cek lagi.\n\nSumber: "+label {
		t.Errorf("label with parenthesis: %q", got)
	}
}

func TestMentionedLabelsDoesNotCountRegionInsideLongerName(t *testing.T) {
	included := []SemanticResult{
		source("region", 1, "Kota Pasuruan", "Kota otonom.", 0.7),
		source("destination", 35, "Taman Kota Pasuruan", "Taman kota.", 0.7),
	}
	if got := mentionedLabels("Taman Kota Pasuruan cocok untuk keluarga.", included); len(got) != 1 || got[0] != "Taman Kota Pasuruan" {
		t.Fatalf("used = %v", got)
	}
	// Answer order, not context order (BUD-01: the source line started with the third list item).
	if got := mentionedLabels("Taman Kota Pasuruan ada di Kota Pasuruan.", included); len(got) != 2 || got[0] != "Taman Kota Pasuruan" || got[1] != "Kota Pasuruan" {
		t.Fatalf("used = %v", got)
	}
}

// BRT-06 (jobdesk 6, F4 option B): a judge pick never leaves out a same-type candidate with a higher score.
func TestJudgePickKeepsHigherScoredCandidatesOfTheSameType(t *testing.T) {
	news := func(id int64, label string, sim float64) SemanticResult {
		r := source("news", id, label, label+" isi", sim)
		r.RelevanceStatus = "low_confidence"
		return r
	}
	culture := candidate("Situs budaya", 0.45)
	pool := []SemanticResult{news(2, "Banjir Aceh Utara", 0.432), culture, news(164, "Banjir Solok", 0.387), news(7, "Aceh Tenggara TKD", 0.377)}
	accepted, promoted := rankConsistent(pool, []int{2})
	if len(accepted) != 2 || accepted[0] != 0 || accepted[1] != 2 || promoted != 1 {
		t.Fatalf("accepted=%v promoted=%d (want Aceh + Solok; other type and lower score left out)", accepted, promoted)
	}
	if accepted, promoted := rankConsistent(pool, nil); len(accepted) != 0 || promoted != 0 {
		t.Fatalf("no pick must accept nothing: %v %d", accepted, promoted)
	}
	// Owner option B: gemini-embedding-001 scores are too close together, so only the judge's picks count.
	gemini := append([]SemanticResult(nil), pool...)
	for i := range gemini {
		gemini[i].EmbeddingModel = "gemini-embedding-001"
	}
	if accepted, promoted := rankConsistent(gemini, []int{2}); len(accepted) != 1 || accepted[0] != 2 || promoted != 0 {
		t.Fatalf("gemini embeddings: accepted=%v promoted=%d", accepted, promoted)
	}
	judge := &fakeJudge{decision: JudgeDecision{Relevant: []int{2}}}
	service := &ChatService{Judge: judge}
	outcome := service.classify(context.Background(), "Ada berita tentang banjir Aceh?", pool, 5, false)
	if outcome.Status != "relevant" || len(outcome.Context) != 2 || pointerString(outcome.Context[0].SourceLabel) != "Banjir Aceh Utara" || outcome.Judge["rank_promoted_k"] != 1 {
		t.Fatalf("outcome = %+v", outcome)
	}
}

// BUD-07 (jobdesk 3/6): gemma3:4b answered the previous comparison question again instead of "who founded it".
func TestPromptAnswersOnlyTheLastQuestion(t *testing.T) {
	prompt := protectedSystemPrompt(ChatIntent{Kind: intentFollowUp, FollowUp: true}, ragContext{}, testToday)
	if !strings.Contains(prompt, "Jawab hanya PERTANYAAN terakhir") || !strings.Contains(prompt, "jangan menjawab ulang pertanyaan di RIWAYAT") {
		t.Fatal("prompt misses the last-question rule")
	}
	turns := []HistoryTurn{{Question: "Bandingkan dua situs sejarah itu", Sources: []string{"Societeit Harmonie"}}}
	user := generationUserMessage("Siapa tokoh yang mendirikan situs tersebut?", "Siapa pendiri Societeit Harmonie?", turns, ChatIntent{Kind: intentFollowUp, FollowUp: true}, true)
	if !strings.HasSuffix(user, "jangan mengulang jawaban sebelumnya.)") {
		t.Fatalf("follow-up message misses the reminder: %q", user)
	}
	if plain := generationUserMessage("Apa itu Candi Jawi?", "Apa itu Candi Jawi?", nil, factIntent(""), true); plain != "Apa itu Candi Jawi?" {
		t.Fatalf("a first question must stay the user's own text: %q", plain)
	}
}

// The prompt asks for structure only; bold is not forbidden, because grounding uses bold names to catch
// places invented without context (hasBoldName).
func TestPromptAsksForPlainStructureWithoutForbiddingBold(t *testing.T) {
	prompt := protectedSystemPrompt(ChatIntent{Kind: intentList, Requested: 3}, ragContext{}, testToday)
	for _, want := range []string{"daftar bernomor (1., 2., 3.)", `diawali "- "`, "lebih dari tiga item", "jangan digabung dalam satu daftar", "teks biasa"} {
		if !strings.Contains(prompt, want) {
			t.Fatalf("prompt misses %q", want)
		}
	}
	if strings.Contains(strings.ToLower(prompt), "tanda bintang") {
		t.Fatal("prompt must not forbid bold marks")
	}
}
