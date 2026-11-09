package services

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// The plan's schema must reach each provider in that provider's own field, and an answer call must not carry one.
func TestResponseSchemaReachesEveryProvider(t *testing.T) {
	schema := map[string]any{"type": "object"}
	var body map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		data, _ := io.ReadAll(r.Body)
		body = nil
		_ = json.Unmarshal(data, &body)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"message":{"role":"assistant","content":"{}"},"candidates":[{"content":{"parts":[{"text":"{}"}]}}],"choices":[{"message":{"content":"{}"}}]}`))
	}))
	defer server.Close()
	for _, c := range []struct {
		kind  string
		field func(map[string]any) any
	}{
		{"ollama", func(b map[string]any) any { return b["format"] }},
		{"gemini", func(b map[string]any) any {
			generation, _ := b["generationConfig"].(map[string]any)
			if generation == nil {
				return nil
			}
			if generation["responseMimeType"] != "application/json" {
				return nil
			}
			return generation["responseSchema"]
		}},
		{kindOpenAICompatible, func(b map[string]any) any {
			format, _ := b["response_format"].(map[string]any)
			if format == nil {
				return nil
			}
			inner, _ := format["json_schema"].(map[string]any)
			return inner["schema"]
		}},
	} {
		provider := &HTTPProvider{kind: c.kind, base: server.URL, chat: "model", client: server.Client()}
		if _, err := provider.Chat(WithResponseSchema(context.Background(), schema), []ChatMessage{{Role: "user", Content: "q"}}); err != nil {
			t.Fatalf("%s: %v", c.kind, err)
		}
		if got, _ := json.Marshal(c.field(body)); !strings.Contains(string(got), `"object"`) {
			t.Errorf("%s: schema not sent: %v", c.kind, body)
		}
		if _, err := provider.Chat(context.Background(), []ChatMessage{{Role: "user", Content: "q"}}); err != nil {
			t.Fatalf("%s: %v", c.kind, err)
		}
		if c.field(body) != nil {
			t.Errorf("%s: an answer call must not carry a schema: %v", c.kind, body)
		}
	}
}
