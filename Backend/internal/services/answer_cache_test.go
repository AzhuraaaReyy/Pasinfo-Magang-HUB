package services

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"wildan-news-backend/internal/models"
)

func cacheHit(t *testing.T, m *models.ChatMessage) bool {
	t.Helper()
	var meta map[string]any
	if err := json.Unmarshal(m.Metadata, &meta); err != nil {
		t.Fatal(err)
	}
	return meta["cache_hit"] == true
}

func askFirst(t *testing.T, s *ChatService, id int64, question string, location *GeoPoint) *AskResult {
	t.Helper()
	result, err := s.AskWithLocation(context.Background(), &models.ChatSession{ID: id, VisitorID: "v1"}, question, location)
	if err != nil {
		t.Fatal(err)
	}
	return result
}

// T03 stage 2: the same standalone first question gets the stored answer without a model call; the stored reply keeps
// the sources, so a follow-up in that session works as after the original answer.
func TestRepeatedFirstQuestionComesFromTheAnswerCache(t *testing.T) {
	question := "kuliner terdekat dari Bromo apa?"
	router := &fakeRouter{enabled: true}
	service, _, provider := nearbyService(t, map[string]QuestionPlan{question: {Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Bromo"}}, router)
	first := askFirst(t, service, 601, question, nil)
	provider.messages = nil
	routes := router.calls.Load()
	second := askFirst(t, service, 602, "  Kuliner terdekat dari BROMO apa ", nil)
	if cacheHit(t, first.Assistant) || !cacheHit(t, second.Assistant) {
		t.Fatalf("cache_hit first=%v second=%v", cacheHit(t, first.Assistant), cacheHit(t, second.Assistant))
	}
	if provider.messages != nil || router.calls.Load() != routes {
		t.Fatalf("model called again (%v), routes %d→%d", provider.messages != nil, routes, router.calls.Load())
	}
	if *second.Assistant.Content != *first.Assistant.Content || len(sourceLabels(second.Assistant.Metadata)) == 0 ||
		len(sourceLabels(second.Assistant.Metadata)) != len(sourceLabels(first.Assistant.Metadata)) {
		t.Fatalf("cached reply differs:\n%s\n%s", second.Assistant.Metadata, first.Assistant.Metadata)
	}
}

// The user's location is never kept, and a later question in a session can depend on its history: neither is cached.
func TestAnswerCacheSkipsLocationAndHistory(t *testing.T) {
	question := "kuliner dekat lokasi saya apa?"
	other := "kuliner terdekat dari Bromo apa?"
	plans := map[string]QuestionPlan{
		question: {Domain: "culinary", Kind: "list", Sort: nearestSort, NearUser: true},
		other:    {Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Bromo"},
	}
	service, _, _ := nearbyService(t, plans, &fakeRouter{enabled: true})
	askFirst(t, service, 611, question, userPoint)
	if len(service.answerCache.items) != 0 {
		t.Fatal("an answer from the user's location was cached")
	}
	askFirst(t, service, 612, question, nil)
	askFirst(t, service, 612, other, nil)
	if _, ok := service.answerCache.get(other, service.today()); ok {
		t.Fatal("a question with history was cached")
	}
	askFirst(t, service, 613, other, nil)
	if _, ok := service.answerCache.get(other, service.today()); !ok {
		t.Fatal("a standalone first question was not cached")
	}
	if got := askFirst(t, service, 614, other, userPoint); cacheHit(t, got.Assistant) {
		t.Fatal("a question with a shared location used the cache")
	}
}

func TestAnswerCacheIsDroppedOnACorpusChangeOrANewDay(t *testing.T) {
	now := time.Date(2026, 11, 8, 10, 0, 0, 0, wib)
	c := newAnswerCache()
	c.now = func() time.Time { return now }
	c.put("Kuliner di Bangil?", now, "jawaban", []byte(`{}`))
	if _, ok := c.get("kuliner di bangil", now); !ok {
		t.Fatal("fresh answer missing")
	}
	if _, ok := c.get("kuliner di bangil", now.Add(14*time.Hour)); ok {
		t.Fatal("answer of yesterday returned")
	}
	c.put("Kuliner di Bangil?", now, "jawaban", []byte(`{}`))
	markCorpusChanged()
	if _, ok := c.get("kuliner di bangil", now); ok {
		t.Fatal("answer from before the corpus change returned")
	}
	c.put("Kuliner di Bangil?", now, "jawaban", []byte(`{}`))
	now = now.Add(answerCacheTTL)
	if _, ok := c.get("kuliner di bangil", now); ok {
		t.Fatal("expired answer returned")
	}
}

func TestOnlyGroundedStandaloneAnswersAreCacheable(t *testing.T) {
	ok := relevanceOutcome{Status: "relevant"}
	grounded := map[string]any{"fallback": false}
	cases := []struct {
		name      string
		plan      QuestionPlan
		reader    string
		outcome   relevanceOutcome
		grounding map[string]any
		fixed     bool
		want      bool
	}{
		{"grounded", QuestionPlan{Domain: "culinary"}, "", ok, grounded, false, true},
		{"reader failed", QuestionPlan{}, "timeout", ok, grounded, false, false},
		{"fixed text", QuestionPlan{}, "", ok, grounded, true, false},
		{"no source", QuestionPlan{}, "", relevanceOutcome{Status: "no_source"}, grounded, false, false},
		{"fallback answer", QuestionPlan{}, "", ok, map[string]any{"fallback": true}, false, false},
		{"follow-up", QuestionPlan{FollowUp: true}, "", ok, grounded, false, false},
		{"relative period", QuestionPlan{Domain: "event", Period: "this_week"}, "", ok, grounded, false, false},
		{"user location", QuestionPlan{NearUser: true}, "", ok, grounded, false, false},
		{"most read news", QuestionPlan{Domain: "news"}, "", relevanceOutcome{Status: "relevant", Judge: map[string]any{"skipped": "news_popular"}}, grounded, false, false},
	}
	for _, tc := range cases {
		if got := cacheableAnswer(tc.plan, tc.reader, tc.outcome, tc.grounding, tc.fixed); got != tc.want {
			t.Errorf("%s: cacheable = %v, want %v", tc.name, got, tc.want)
		}
	}
}
