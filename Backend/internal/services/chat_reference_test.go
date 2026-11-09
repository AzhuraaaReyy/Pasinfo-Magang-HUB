package services

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"wildan-news-backend/internal/models"
)

// J5-03 (2026-11-02): a first message that only points back gets the fixed clarification, without a
// search, sources, or an answer-model call; one that names its subject is searched as usual.
func TestFirstMessageReferenceWithoutHistoryAsksWhatIsMeant(t *testing.T) {
	for i, question := range []string{"Berapa harganya?", "Tempat itu buka jam berapa?"} {
		retriever := &loaderRetriever{fakeRetriever: fakeRetriever{results: []SemanticResult{source("news", 1, "Harga tiket festival", "Harga.", 0.7)}}}
		provider := &recordingProvider{stubProvider: stubProvider{name: "ollama:chat"}}
		service := testChatService(newChatTestDB(t), provider, time.Second, retriever)
		result, err := service.Ask(context.Background(), &models.ChatSession{ID: int64(900 + i)}, question)
		if err != nil {
			t.Fatal(err)
		}
		var meta map[string]any
		_ = json.Unmarshal(result.Assistant.Metadata, &meta)
		sources, _ := meta["sources"].([]any)
		if *result.Assistant.Content != noReferenceAnswer || meta["retrieval_status"] != "low_confidence" || retriever.searches != 0 || len(sources) != 0 || len(provider.messages) != 0 {
			t.Fatalf("%q: answer=%q status=%v searches=%d sources=%d llm=%d", question, *result.Assistant.Content, meta["retrieval_status"], retriever.searches, len(sources), len(provider.messages))
		}
	}
}

// J5-09 (2026-11-02): "Alamat yang pertama?" after a list uses only the first item of the previous answer.
func TestOrdinalFollowUpUsesThatItemOfThePreviousAnswer(t *testing.T) {
	service, provider, retriever := followUpService(t, "Alamat yang pertama di mana?")
	session := &models.ChatSession{ID: 91}
	if _, err := service.Ask(context.Background(), session, "Sebutkan 2 wisata di Kota Pasuruan"); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Ask(context.Background(), session, "Alamat yang pertama di mana?"); err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if !strings.Contains(system, "NAMA: Hutan Mangrove Kota Pasuruan") || strings.Contains(system, "NAMA: Taman Kota Pasuruan") || retriever.searches != 1 {
		t.Fatalf("searches=%d context:\n%s", retriever.searches, system)
	}
}

// E2E-F3 (2026-11-03): a question about the assistant itself gets the fixed capability reply, without a search,
// sources, or an answer-model call; a question that names a domain or place is searched as usual.
func TestCapabilityQuestionGetsFixedReply(t *testing.T) {
	for i, question := range []string{"Apa saja yang bisa kamu bantu?", "Kamu bisa apa saja?", "Siapa kamu?", "Bisa bantu apa?", "Fitur kamu apa aja?"} {
		retriever := &loaderRetriever{fakeRetriever: fakeRetriever{results: []SemanticResult{source("destination", 1, "Candi Jawi", "Candi.", 0.7)}}}
		provider := &recordingProvider{stubProvider: stubProvider{name: "ollama:chat"}}
		service := testChatService(newChatTestDB(t), provider, time.Second, retriever)
		result, err := service.Ask(context.Background(), &models.ChatSession{ID: int64(950 + i)}, question)
		if err != nil {
			t.Fatal(err)
		}
		var meta map[string]any
		_ = json.Unmarshal(result.Assistant.Metadata, &meta)
		sources, _ := meta["sources"].([]any)
		if *result.Assistant.Content != capabilityAnswer || meta["retrieval_status"] != "no_source" || retriever.searches != 0 || len(sources) != 0 || len(provider.messages) != 0 {
			t.Fatalf("%q: answer=%q status=%v searches=%d sources=%d llm=%d", question, *result.Assistant.Content, meta["retrieval_status"], retriever.searches, len(sources), len(provider.messages))
		}
	}
	if strings.Contains(capabilityAnswer, "belum tersedia") || strings.Contains(capabilityAnswer, "**") {
		t.Fatal("the capability reply must not open with an apology or use markdown")
	}
}
