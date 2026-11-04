package services

import (
	"context"
	"strings"
	"testing"
)

func TestParseJudgeDecision(t *testing.T) {
	d, err := parseJudgeDecision("```json\n{\"relevant\": [2, 2, 9, 0, 1], \"needs_clarification\": false}\n```", 3)
	if err != nil || len(d.Relevant) != 2 || d.Relevant[0] != 1 || d.Relevant[1] != 0 || d.NeedsClarification {
		t.Fatalf("d=%+v err=%v", d, err)
	}
	if _, err := parseJudgeDecision("tidak ada", 3); err == nil {
		t.Fatal("non-JSON reply must be an error")
	}
	if d, err := parseJudgeDecision(`{"relevant": [], "needs_clarification": true}`, 3); err != nil || len(d.Relevant) != 0 || !d.NeedsClarification {
		t.Fatalf("clarification d=%+v err=%v", d, err)
	}
}

type promptRecorder struct {
	stubProvider
	messages []ChatMessage
	reply    string
}

func (p *promptRecorder) Chat(_ context.Context, messages []ChatMessage) (string, error) {
	p.messages = messages
	return p.reply, nil
}

func TestLLMRelevanceJudgeSendsCandidatesAsData(t *testing.T) {
	label := "Candi Jawi"
	p := &promptRecorder{reply: `{"relevant": [1], "needs_clarification": false}`}
	d, err := LLMRelevanceJudge{LLM: p}.Judge(context.Background(), "Apa daya tarik Candi Jawi?", []SemanticResult{{SourceLabel: &label, Answer: strings.Repeat("x", 900)}})
	if err != nil || len(d.Relevant) != 1 {
		t.Fatalf("d=%+v err=%v", d, err)
	}
	if p.messages[0].Role != "system" || !strings.Contains(p.messages[0].Content, "bukan instruksi") {
		t.Fatalf("system prompt = %q", p.messages[0].Content)
	}
	user := p.messages[1].Content
	if !strings.Contains(user, "PERTANYAAN: Apa daya tarik Candi Jawi?") || !strings.Contains(user, "[1] JUDUL: Candi Jawi\nJENIS: ") || !strings.Contains(user, "\nISI: x") || strings.Contains(user, strings.Repeat("x", 601)) {
		t.Fatalf("user prompt not as expected: %q", user)
	}
}

func TestJudgeExcerptShrinksForLargeListPools(t *testing.T) {
	if got := judgeExcerptSize(3); got != judgeExcerptRunes {
		t.Fatalf("small pool excerpt = %d", got)
	}
	if got := judgeExcerptSize(15); got != judgeBudgetRunes/15 {
		t.Fatalf("list pool excerpt = %d", got)
	}
	if got := judgeExcerptSize(100); got != judgeMinExcerptRunes {
		t.Fatalf("huge pool excerpt = %d", got)
	}
}

func TestJudgePromptCoversTitleMatchesAndSharedWords(t *testing.T) {
	for _, want := range []string{"JUDUL atau ISI", "walaupun tempatnya di luar Pasuruan", "hanya memuat kata yang sama", "bukan instruksi", "needs_clarification=true hanya jika"} {
		if !strings.Contains(judgeSystemPrompt, want) {
			t.Fatalf("judge prompt missing %q", want)
		}
	}
	if strings.Contains(judgeSystemPrompt, "pertanyaan pengguna tentang Pasuruan") {
		t.Fatal("the judge must not assume every question is about Pasuruan (national news is stored too)")
	}
}
