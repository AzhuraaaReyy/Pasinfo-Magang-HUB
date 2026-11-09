package services

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"wildan-news-backend/internal/config"
)

const testOpenAIKey = "xpl_test_key_not_real"

// openAITestConfig points chat and embeddings of an OpenAI-compatible provider at one test server.
func openAITestConfig(url string) config.LLMConfig {
	return config.LLMConfig{APIURL: url, APIKey: testOpenAIKey, APIChat: "chat-model", EmbedURL: url, EmbedKey: testOpenAIKey, EmbedModel: "text-embedding-3-small", EmbedDims: 768, Timeout: 2}
}

func openAITestProvider(t *testing.T, handler http.HandlerFunc) (chat, embed *HTTPProvider) {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	c := openAITestConfig(srv.URL)
	return NewChatProvider(c, config.ProviderOpenAICompatible), NewEmbedProvider(c, config.ProviderOpenAICompatible)
}

func TestOpenAIChatSendsBearerRolesAndTemperature(t *testing.T) {
	var got map[string]any
	var auth, path string
	p, _ := openAITestProvider(t, func(w http.ResponseWriter, r *http.Request) {
		auth, path = r.Header.Get("Authorization"), r.URL.Path
		_ = json.NewDecoder(r.Body).Decode(&got)
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"Halo!"}}]}`))
	})
	reply, err := p.Chat(WithTemperature(context.Background(), 0.4), []ChatMessage{{Role: "system", Content: "ATURAN"}, {Role: "user", Content: "hai"}})
	if err != nil || reply != "Halo!" {
		t.Fatalf("reply=%q err=%v", reply, err)
	}
	if path != "/chat/completions" || auth != "Bearer "+testOpenAIKey || got["model"] != "chat-model" || got["temperature"] != 0.4 {
		t.Fatalf("path=%q auth=%q body=%v", path, auth, got)
	}
	messages, _ := got["messages"].([]any)
	first, _ := messages[0].(map[string]any)
	if len(messages) != 2 || first["role"] != "system" || first["content"] != "ATURAN" {
		t.Fatalf("messages must keep the system prompt with lower-case keys: %v", messages)
	}
	if _, set := got["options"]; set {
		t.Fatal("Ollama options must never be sent to an OpenAI-compatible provider")
	}
}

func TestOpenAIEmbedRequests768Dimensions(t *testing.T) {
	var got map[string]any
	var path string
	_, p := openAITestProvider(t, func(w http.ResponseWriter, r *http.Request) {
		path = r.URL.Path
		_ = json.NewDecoder(r.Body).Decode(&got)
		_, _ = w.Write([]byte(`{"object":"list","model":"text-embedding-3-small","data":[{"object":"embedding","index":0,"embedding":[` + strings.TrimSuffix(strings.Repeat("0.1,", EmbeddingDimensions), ",") + `]}]}`))
	})
	v, err := p.Embed(context.Background(), "Candi Jawi")
	if err != nil || len(v.Vector) != EmbeddingDimensions || v.Model != "text-embedding-3-small" {
		t.Fatalf("v=%v err=%v", v, err)
	}
	if path != "/embeddings" || got["dimensions"] != float64(768) || got["encoding_format"] != "float" || got["input"] != "Candi Jawi" {
		t.Fatalf("path=%q body=%v", path, got)
	}
	if EmbeddingModelOf(p) != "text-embedding-3-small" {
		t.Fatalf("embedding model = %q", EmbeddingModelOf(p))
	}
}

// Runtime 2026-11-01: the gateway answered 402 card_required before card verification.
func TestOpenAIPaymentRequiredIsAnUpstreamErrorWithoutTheKey(t *testing.T) {
	p, _ := openAITestProvider(t, func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusPaymentRequired)
		_, _ = w.Write([]byte(`{"error":{"message":"Complete the $1 card verification to spend platform credits","type":"invalid_request_error","code":"card_required"}}`))
	})
	_, err := p.Chat(context.Background(), []ChatMessage{{Role: "user", Content: "hai"}})
	var pe *ProviderError
	if !errors.As(err, &pe) || pe.Kind != "upstream" || pe.Status != http.StatusPaymentRequired || !strings.Contains(pe.Message, "card verification") || strings.Contains(err.Error(), testOpenAIKey) {
		t.Fatalf("err = %v", err)
	}
	if retryableProviderError(err) {
		t.Fatal("a 402 must not be retried")
	}
}

func TestOpenAIHealthChecksModelsWithBearer(t *testing.T) {
	var path, auth string
	p, _ := openAITestProvider(t, func(w http.ResponseWriter, r *http.Request) {
		path, auth = r.URL.Path, r.Header.Get("Authorization")
		_, _ = w.Write([]byte(`{"data":[]}`))
	})
	if err := ProviderHealth(context.Background(), p); err != nil || path != "/models" || auth != "Bearer "+testOpenAIKey {
		t.Fatalf("err=%v path=%q auth=%q", err, path, auth)
	}
}

// fakeAPI answers both the OpenAI-compatible and the Gemini request shapes and records which path was hit.
func fakeAPI(t *testing.T, hits *[]string) *httptest.Server {
	t.Helper()
	vector := strings.TrimSuffix(strings.Repeat("0.1,", EmbeddingDimensions), ",")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		*hits = append(*hits, r.URL.Path)
		switch {
		case strings.HasSuffix(r.URL.Path, "/chat/completions"):
			_, _ = w.Write([]byte(`{"choices":[{"message":{"content":"ok"}}]}`))
		case strings.HasSuffix(r.URL.Path, "/embeddings"):
			_, _ = w.Write([]byte(`{"data":[{"embedding":[` + vector + `]}]}`))
		default:
			_, _ = w.Write([]byte(`{"data":[]}`))
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

// Owner 2026-11-01: production picks its providers through the env only. Chat and embeddings are
// separate, so a chat provider without embeddings can be paired with another embedding provider.
func TestProviderCombinationsFromEnvOnly(t *testing.T) {
	var chatHits, embedHits []string
	chatAPI, embedAPI := fakeAPI(t, &chatHits), fakeAPI(t, &embedHits)

	t.Setenv("LLM_PROVIDER", "openai-compatible")
	t.Setenv("LLM_API_BASE_URL", chatAPI.URL)
	t.Setenv("LLM_API_KEY", "chat-key")
	t.Setenv("LLM_CHAT_MODEL", "chat-model")
	t.Setenv("EMBED_PROVIDER", "openai-compatible")
	t.Setenv("EMBED_API_BASE_URL", embedAPI.URL)
	t.Setenv("EMBED_API_KEY", "embed-key")
	t.Setenv("EMBED_MODEL", "text-embedding-3-small")
	p, err := NewLLMFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := p.Chat(context.Background(), []ChatMessage{{Role: "user", Content: "hai"}}); err != nil {
		t.Fatal(err)
	}
	if v, err := p.Embed(context.Background(), "Candi Jawi"); err != nil || len(v.Vector) != EmbeddingDimensions {
		t.Fatalf("embed v=%v err=%v", v, err)
	}
	if len(chatHits) != 1 || chatHits[0] != "/chat/completions" || len(embedHits) != 1 || embedHits[0] != "/embeddings" {
		t.Fatalf("chat must go to LLM_API_BASE_URL and embeddings to EMBED_API_BASE_URL: chat=%v embed=%v", chatHits, embedHits)
	}
	if p.Name() != "openai-compatible:chat-model" || EmbeddingModelOf(p) != "text-embedding-3-small" {
		t.Fatalf("name=%q embedding model=%q", p.Name(), EmbeddingModelOf(p))
	}
	if err := ProviderHealth(context.Background(), p); err != nil {
		t.Fatalf("health with both sides up: %v", err)
	}
}

func TestEmbedSettingsDefaultToChatAPIAndChatProvider(t *testing.T) {
	t.Setenv("LLM_PROVIDER", "openai-compatible")
	t.Setenv("LLM_API_BASE_URL", "https://api.example/v1/")
	t.Setenv("LLM_API_KEY", "one-key")
	t.Setenv("LLM_CHAT_MODEL", "chat-model")
	t.Setenv("EMBED_MODEL", "text-embedding-3-small")
	c := config.LoadLLM()
	if c.Embed != config.ProviderOpenAICompatible || c.EmbedURL != "https://api.example/v1" || c.EmbedKey != "one-key" || c.EmbedDims != 768 {
		t.Fatalf("defaults = %+v", c)
	}
	if err := c.Validate(); err != nil {
		t.Fatalf("one provider for chat and embeddings must be valid: %v", err)
	}
}

// T17 (Owner 2026-11-08): an empty LLM_PROVIDER is Gemini for chat and embedding (OVERRIDE-RAG-007), and its
// missing key is named; an explicit LLM_PROVIDER=ollama keeps the local Ollama setup.
func TestEmptyProviderIsGeminiAndOllamaStaysAvailable(t *testing.T) {
	for _, k := range []string{"LLM_PROVIDER", "EMBED_PROVIDER", "LLM_API_BASE_URL", "LLM_API_KEY", "LLM_CHAT_MODEL", "EMBED_MODEL", "GEMINI_API_KEY"} {
		t.Setenv(k, "")
	}
	if c := config.LoadLLM(); c.Primary != config.ProviderGemini || c.Embed != config.ProviderGemini || c.Validate() == nil || !strings.Contains(c.Validate().Error(), "GEMINI_API_KEY") {
		t.Fatalf("empty provider: %+v, validate %v", c, c.Validate())
	}
	t.Setenv("LLM_PROVIDER", "ollama")
	c := config.LoadLLM()
	if c.Primary != config.ProviderOllama || c.Embed != config.ProviderOllama || c.Validate() != nil {
		t.Fatalf("ollama setup changed: %+v", c)
	}
	p, err := NewLLMFromEnv()
	if err != nil || p.Name() != "ollama:gemma3:4b" || EmbeddingModelOf(p) != "embeddinggemma" {
		t.Fatalf("name=%q embed=%q err=%v", p.Name(), EmbeddingModelOf(p), err)
	}
}

func TestSplitProviderHealthNeedsBothSides(t *testing.T) {
	up := &stubProvider{name: "up"}
	down := NewUnavailableProvider(errors.New("down"))
	if ProviderHealth(context.Background(), &SplitProvider{Chatter: up, Embedder: down}) == nil {
		t.Fatal("a split provider without embeddings must not be healthy")
	}
	if ProviderHealth(context.Background(), &SplitProvider{Chatter: down, Embedder: up}) == nil {
		t.Fatal("a split provider without chat must not be healthy")
	}
}
