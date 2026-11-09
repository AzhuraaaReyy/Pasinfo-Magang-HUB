package services

import (
	"context"
	"testing"
)

// Intents as they come out of a checked plan, for tests of the code after the reader.
func factIntent(domain string) ChatIntent { return ChatIntent{Kind: intentFact, Domain: domain} }
func listIntent(requested int, domain string) ChatIntent {
	return ChatIntent{Kind: intentList, Requested: requested, Domain: domain}
}
func recommendIntent(requested int, domain string) ChatIntent {
	return ChatIntent{Kind: intentRecommendation, Requested: requested, Domain: domain}
}

// fakeReader answers with the plan of the question, or an empty plan (the plain semantic search).
type fakeReader struct {
	plans   map[string]QuestionPlan
	err     error
	calls   int
	history []HistoryTurn
}

func (r *fakeReader) Read(_ context.Context, history []HistoryTurn, question string, _ []string) (QuestionPlan, error) {
	r.calls++
	r.history = history
	return r.plans[question], r.err
}

func TestIntentFromPlanReadsListRequests(t *testing.T) {
	cases := []struct {
		plan QuestionPlan
		want ChatIntent
	}{
		{QuestionPlan{Domain: "destination", Kind: "recommendation", Count: 3}, recommendIntent(3, "wisata")},
		{QuestionPlan{Domain: "culinary", Kind: "list"}, ChatIntent{Kind: intentList, Requested: defaultListCount, DefaultCount: true, Domain: "kuliner"}},
		{QuestionPlan{Domain: smalltalkDomain, Kind: "list", Info: "price"}, ChatIntent{Kind: intentSmalltalk}},
		{QuestionPlan{Domain: "event", Kind: "list", Count: 500}, listIntent(maxRequestedCount, "acara")},
		{QuestionPlan{Domain: "destination", Kind: "fact", Count: 3, Name: "Candi Jawi"}, factIntent("wisata")},
		{QuestionPlan{Domain: "destination", Kind: "fact", Count: 1}, listIntent(1, "wisata")},
		{QuestionPlan{}, factIntent("")},
	}
	for _, c := range cases {
		if got := intentFromPlan(c.plan); got != c.want {
			t.Errorf("intentFromPlan(%+v) = %+v, want %+v", c.plan, got, c.want)
		}
	}
	if got := intentFromPlan(QuestionPlan{Kind: "fact", FollowUp: true}); got.Kind != intentFollowUp || !got.FollowUp {
		t.Errorf("follow-up intent = %+v", got)
	}
	if got := intentFromPlan(QuestionPlan{Kind: "list", Zone: "Kota Pasuruan"}); got.Region != "Kota Pasuruan" {
		t.Errorf("zone = %q", got.Region)
	}
}

func TestIntentRetrievalLimitsAreBounded(t *testing.T) {
	fact := factIntent("wisata")
	if fact.RetrievalLimit() != defaultFactLimit || fact.RetrievalCategory() != "" {
		t.Fatalf("fact retrieval = %d %q", fact.RetrievalLimit(), fact.RetrievalCategory())
	}
	list := recommendIntent(50, "wisata")
	if list.RetrievalLimit() != maxListCount+listCandidateExtra || list.RetrievalCategory() != "wisata" {
		t.Fatalf("list retrieval = %d %q", list.RetrievalLimit(), list.RetrievalCategory())
	}
}

// "HTM" and "ongkos masuk" got no price line under the keyword rules (audit 2026-11-06): the plan's info decides.
func TestSampleFieldsFollowTheInfoOfThePlan(t *testing.T) {
	for info, want := range map[string]bool{"price": true, "facility": true, "menu": true, "ticket": true, "hours": false, "location": false, "general": false, "history": false} {
		if got := intentFromPlan(QuestionPlan{Info: info}).SampleFields; got != want {
			t.Errorf("info %q: sample fields = %v, want %v", info, got, want)
		}
	}
}
