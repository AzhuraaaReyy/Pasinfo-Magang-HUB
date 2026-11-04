package services

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"wildan-news-backend/internal/models"
)

// Tahap D (Owner decisions 1–3, 2026-11-03): a chat recommendation is ordered by the recommendation engine — the
// kecamatan named in the question is a bonus, not a filter — and ineligible items (past events) are dropped.
func TestRankChatCandidatesUsesKecamatanBonusAndDropsPastEvents(t *testing.T) {
	r := NewRecommender(newRecommendationTestDB(t))
	docs := []SemanticResult{
		source("destination", 3, "Sezona", "Beji.", 0.70),
		source("destination", 2, "Sekecamatan", "Bangil.", 0.60),
		source("destination", 4, "Jauh Pilihan", "Tosari.", 0.65),
		source("event", 1, "Sudah Lewat", "Selesai.", 0.80),
		source("event", 2, "Akan Datang", "Mendatang.", 0.50),
		source("region", 1, "Pasuruan Utara", "Zona.", 0.40),
	}
	ranked, info, err := r.RankChatCandidates(context.Background(), docs, "Bangil", "", recNow)
	if err != nil {
		t.Fatal(err)
	}
	var labels []string
	for _, d := range ranked {
		labels = append(labels, retrievalPointerString(d.SourceLabel))
	}
	got := strings.Join(labels, ", ")
	if info.Dropped != 1 || strings.Contains(got, "Sudah Lewat") {
		t.Fatalf("past event must be dropped: dropped=%d order=%s", info.Dropped, got)
	}
	if labels[0] != "Sekecamatan" || labels[1] != "Sezona" {
		t.Fatalf("kecamatan, then zone, must lead: %s", got)
	}
	if !strings.Contains(got, "Jauh Pilihan") || !strings.Contains(got, "Pasuruan Utara") {
		t.Fatalf("other places stay (bonus, not filter): %s", got)
	}
}

func TestDistrictInTextFindsKecamatan(t *testing.T) {
	for text, want := range map[string]string{
		"Rekomendasikan kuliner di Bangil?":      "Bangil",
		"wisata dekat bugul kidul, dong":         "Bugul Kidul",
		"Rekomendasi wisata alam di Pasuruan":    "",
		"tempat makan enak di Pandaan.":          "Pandaan",
		"Rekomendasikan wisata di Kota Pasuruan": "",
	} {
		if got := DistrictInText(text); got != want {
			t.Errorf("%q = %q, want %q", text, got, want)
		}
	}
}

// fakeRanker reverses the context and records its calls.
type fakeRanker struct {
	calls    int
	district string
}

func (f *fakeRanker) RankChatCandidates(_ context.Context, docs []SemanticResult, district, _ string, _ time.Time) ([]SemanticResult, ChatRanking, error) {
	f.calls++
	f.district = district
	out := make([]SemanticResult, 0, len(docs))
	for i := len(docs) - 1; i >= 0; i-- {
		out = append(out, docs[i])
	}
	return out, ChatRanking{District: district}, nil
}

// Only a recommendation question is ranked (Owner decision 3); the ranked order reaches the answer model.
func TestAskRanksOnlyRecommendationQuestions(t *testing.T) {
	results := []SemanticResult{source("culinary", 1, "Rawon Pertama", "Bangil.", 0.80), source("culinary", 2, "Soto Kedua", "Bangil.", 0.75)}
	ranker := &fakeRanker{}
	service := NewChatService(newChatTestDB(t), &recordingProvider{stubProvider: stubProvider{name: "ollama:chat"}}, time.Second, &fakeRetriever{results: results})
	service.Recommender = ranker
	provider := service.LLM.(*recordingProvider)
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 60}, "Rekomendasikan kuliner di Bangil")
	if err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if ranker.calls != 1 || ranker.district != "Bangil" || strings.Index(system, "NAMA: Soto Kedua") > strings.Index(system, "NAMA: Rawon Pertama") {
		t.Fatalf("calls=%d district=%q prompt:\n%s", ranker.calls, ranker.district, system)
	}
	var meta map[string]any
	_ = json.Unmarshal(result.Assistant.Metadata, &meta)
	if _, ok := meta["judge"].(map[string]any)["recommendation_ranked"]; !ok {
		t.Fatalf("ranking not recorded in metadata: %v", meta["judge"])
	}
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 61}, "Di mana alamat Rawon Pertama?"); err != nil {
		t.Fatal(err)
	}
	if ranker.calls != 1 {
		t.Fatalf("a fact question must not be ranked: calls=%d", ranker.calls)
	}
}

// A yearly event recommended for its next date shows that date only; an event with only past dates keeps them.
func TestUpcomingSchedulesOnlyKeepsTheNextDate(t *testing.T) {
	today := time.Date(2026, 11, 3, 0, 0, 0, 0, wib)
	yearly := source("event", 1, "Kirab", "Kirab.\nJadwal: 2026-02-07T00:00:00+07:00 s.d. 2026-02-08T00:00:00+07:00 (status: completed)\nJadwal: 2027-02-07T00:00:00+07:00 s.d. 2027-02-08T00:00:00+07:00 (status: expected)", 0.7)
	pastOnly := source("event", 2, "Lama", "Lama.\nJadwal: 2025-01-01T00:00:00+07:00 (status: completed)", 0.6)
	out := upcomingSchedulesOnly([]SemanticResult{yearly, pastOnly}, today)
	if strings.Contains(out[0].Answer, "2026-02-07") || !strings.Contains(out[0].Answer, "2027-02-07") || !strings.Contains(out[0].Answer, "Kirab.") {
		t.Fatalf("yearly event = %q", out[0].Answer)
	}
	if out[1].Answer != pastOnly.Answer {
		t.Fatalf("past-only event changed: %q", out[1].Answer)
	}
}

// Option B (Owner 2026-11-03): in chat a past event stays eligible for a week after its last date.
func TestRankChatCandidatesKeepsPastEventsForAWeek(t *testing.T) {
	r := NewRecommender(newRecommendationTestDB(t))
	docs := []SemanticResult{source("event", 1, "Sudah Lewat", "Selesai.", 0.80)}
	end := recNow.AddDate(0, -1, 0)
	for _, c := range []struct {
		now  time.Time
		kept bool
	}{{end.Add(3 * 24 * time.Hour), true}, {end.Add(8 * 24 * time.Hour), false}} {
		ranked, _, err := r.RankChatCandidates(context.Background(), docs, "", "", c.now)
		if err != nil {
			t.Fatal(err)
		}
		if (len(ranked) == 1) != c.kept {
			t.Fatalf("now=%s kept=%d, want kept=%v", c.now, len(ranked), c.kept)
		}
	}
}

// dropAllRanker drops every candidate, as RankChatCandidates does for events past the grace week.
type dropAllRanker struct{}

func (dropAllRanker) RankChatCandidates(_ context.Context, docs []SemanticResult, district, _ string, _ time.Time) ([]SemanticResult, ChatRanking, error) {
	return nil, ChatRanking{Dropped: len(docs), District: district}, nil
}

// regionScheduleRetriever lists upcoming events by zone ("" = every zone).
type regionScheduleRetriever struct {
	fakeRetriever
	byRegion map[string][]SemanticResult
	regions  []string
}

func (r *regionScheduleRetriever) EventsInPeriod(_ context.Context, _, _ time.Time, region string, _ int) ([]SemanticResult, error) {
	r.regions = append(r.regions, region)
	return r.byRegion[region], nil
}

// When every matching event ended more than a week ago, the answer says so and offers the upcoming events, from
// every zone when the asked zone has none (Owner 2026-11-03, option B).
func TestAskOffersUpcomingEventsWhenMatchingEventsArePast(t *testing.T) {
	retriever := &regionScheduleRetriever{
		fakeRetriever: fakeRetriever{results: []SemanticResult{source("event", 1, "Nguling Nyawiji", "Nguling.\nJadwal: 2026-03-01T00:00:00+07:00 (status: completed)", 0.80)}},
		byRegion:      map[string][]SemanticResult{"": {eventDoc(2, "Kirab Pataka", "Kirab.\nJadwal: 2027-02-07T00:00:00+07:00 (status: expected)")}},
	}
	provider := &recordingProvider{stubProvider: stubProvider{name: "ollama:chat"}}
	service := NewChatService(newChatTestDB(t), provider, time.Second, retriever)
	service.Recommender = dropAllRanker{}
	service.Now = func() time.Time { return testToday }
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 62}, "Rekomendasikan acara di Pasuruan Timur")
	if err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if !strings.Contains(system, "HASIL_ACARA") || !strings.Contains(system, "di luar wilayah") || !strings.Contains(system, "NAMA: Kirab Pataka") || strings.Contains(system, "NAMA: Nguling Nyawiji") {
		t.Fatalf("prompt:\n%s", system)
	}
	if strings.Join(retriever.regions, ",") != "Pasuruan Timur," {
		t.Fatalf("regions asked = %q", retriever.regions)
	}
	if !strings.HasPrefix(pointerString(result.Assistant.Content), "Acara yang cocok di wilayah yang Anda tanyakan dalam data kami sudah lewat.") {
		t.Fatalf("answer = %q", pointerString(result.Assistant.Content))
	}
	var meta map[string]any
	_ = json.Unmarshal(result.Assistant.Metadata, &meta)
	if past, ok := meta["judge"].(map[string]any)["events_past"].(map[string]any); !ok || past["upcoming"] != float64(1) || meta["retrieval_status"] != "relevant" {
		t.Fatalf("metadata = %v", meta)
	}
}

// The fixed sentence is not repeated when the model already wrote it (Gemini, runtime 2026-11-04).
func TestPastEventsNoteIsNotRepeated(t *testing.T) {
	rag := ragContext{EventsPast: true}
	if pastEventsNote(rag, "Sayangnya acara itu sudah lewat.") != "" || pastEventsNote(rag, "Kirab Pataka.") == "" || pastEventsNote(ragContext{}, "x") != "" {
		t.Fatal("note rule broken")
	}
}
