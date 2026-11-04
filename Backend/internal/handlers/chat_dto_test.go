package handlers

import (
	"encoding/json"
	"sort"
	"testing"
	"time"

	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/services"
)

func jsonKeys(t *testing.T, value any) []string {
	t.Helper()
	raw, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	var object map[string]any
	if err := json.Unmarshal(raw, &object); err != nil {
		t.Fatal(err)
	}
	keys := make([]string, 0, len(object))
	for key := range object {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func TestToSessionDTOOmitsVisitorAndUsesUTC(t *testing.T) {
	jakarta := time.FixedZone("WIB", 7*3600)
	dto := toSessionDTO(models.ChatSession{ID: 5, VisitorID: visitorA, Status: "active", CreatedAt: time.Date(2026, 10, 29, 9, 0, 0, 0, jakarta)})
	if got := jsonKeys(t, dto); len(got) != 5 || got[0] != "created_at" || got[1] != "id" || got[2] != "last_message_at" || got[3] != "status" || got[4] != "title" {
		t.Fatalf("keys = %v", got)
	}
	raw, _ := json.Marshal(dto)
	var body map[string]any
	_ = json.Unmarshal(raw, &body)
	if body["created_at"] != "2026-10-29T02:00:00Z" {
		t.Fatalf("created_at = %v", body["created_at"])
	}
}

func TestToMessageDTOExposesMinimalMetadataWithCard(t *testing.T) {
	content := "Jawaban\n\nSumber: Budaya A"
	stored := `{"model":"ollama:gemma3:4b","retrieval_status":"relevant","retrieval_k":5,"context_k":1,"context_similarity_min":0.61,"retrieval_candidates":[],"total_latency_ms":10,"sources":[{"source_type":"culture","source_id":1,"source_label":"Budaya A","embedding_model":"embeddinggemma","retrieval_method":"semantic","distance":0.39,"similarity":0.61}]}`
	message := models.ChatMessage{ID: 2, SessionID: 5, Role: "assistant", Status: "complete", Content: &content, Metadata: json.RawMessage(stored), CreatedAt: time.Now()}
	slug := "budaya-a"
	dto := toMessageDTO(message, map[services.SourceKey]services.SourceCard{{Type: "culture", ID: 1}: {Slug: &slug}})
	if dto.Metadata == nil {
		t.Fatal("metadata missing")
	}
	if got := jsonKeys(t, dto.Metadata); len(got) != 4 || got[0] != "context_k" || got[1] != "error_kind" || got[2] != "retrieval_status" || got[3] != "sources" {
		t.Fatalf("metadata keys = %v", got)
	}
	if len(dto.Metadata.Sources) != 1 {
		t.Fatalf("sources = %+v", dto.Metadata.Sources)
	}
	source := dto.Metadata.Sources[0]
	if got := jsonKeys(t, source); len(got) != 8 {
		t.Fatalf("source keys = %v", got)
	}
	if source.SourceType != "culture" || source.SourceID != 1 || source.SourceLabel != "Budaya A" || source.Similarity != 0.61 || source.Slug == nil || *source.Slug != "budaya-a" || source.CategoryLabel != nil {
		t.Fatalf("source = %+v", source)
	}
}

func TestToMessageDTOFailedAssistantKeepsEmptySourcesArray(t *testing.T) {
	stored := `{"model":"x","retrieval_k":0,"context_k":0,"context_similarity_min":0,"sources":[],"error_kind":"retrieval_or_provider"}`
	dto := toMessageDTO(models.ChatMessage{ID: 3, SessionID: 5, Role: "assistant", Status: "failed", Metadata: json.RawMessage(stored)}, nil)
	raw, _ := json.Marshal(dto)
	var body map[string]any
	_ = json.Unmarshal(raw, &body)
	metadata := body["metadata"].(map[string]any)
	sources, isArray := metadata["sources"].([]any)
	if body["content"] != nil || metadata["retrieval_status"] != nil || metadata["error_kind"] != "retrieval_or_provider" || !isArray || len(sources) != 0 {
		t.Fatalf("failed message = %v", body)
	}
}

func TestToMessageDTOUserHasNullMetadata(t *testing.T) {
	question := "Halo"
	dto := toMessageDTO(models.ChatMessage{ID: 1, SessionID: 5, Role: "user", Status: "complete", Content: &question}, nil)
	if dto.Metadata != nil {
		t.Fatalf("user metadata = %+v", dto.Metadata)
	}
	if got := jsonKeys(t, dto); len(got) != 7 {
		t.Fatalf("message keys = %v", got)
	}
}
