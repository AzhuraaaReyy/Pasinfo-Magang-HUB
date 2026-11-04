package services

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"wildan-news-backend/internal/config"
)

func testProvider(t *testing.T, handler http.HandlerFunc) *HTTPProvider {
	t.Helper()
	srv := httptest.NewServer(handler)
	t.Cleanup(srv.Close)
	p := NewProvider(config.LLMConfig{OllamaURL: srv.URL, OllamaChat: "chat", OllamaEmbed: "embed", Timeout: 1}, config.ProviderOllama)
	return p
}

func TestProviderResponseMessage(t *testing.T) {
	message := providerResponseMessage([]byte(`{"error":{"message":"Quota exceeded","status":"RESOURCE_EXHAUSTED"}}`))
	if message != "Quota exceeded (RESOURCE_EXHAUSTED)" {
		t.Fatalf("message = %q", message)
	}
}

func TestHTTPProviderChatSuccess(t *testing.T) {
	p := testProvider(t, func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"message": map[string]string{"content": "jawaban"}})
	})
	got, err := p.Chat(context.Background(), []ChatMessage{{Role: "user", Content: "halo"}})
	if err != nil || got != "jawaban" {
		t.Fatalf("got=%q err=%v", got, err)
	}
}

func TestHTTPProviderUpstreamError(t *testing.T) {
	p := testProvider(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("upstream failed"))
	})
	_, err := p.Chat(context.Background(), nil)
	var pe *ProviderError
	if !errors.As(err, &pe) || pe.Status != http.StatusInternalServerError {
		t.Fatalf("expected provider status 500, got %v", err)
	}
}

func TestHTTPProviderTimeout(t *testing.T) {
	p := testProvider(t, func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		_, _ = w.Write([]byte(`{"message":{"content":"late"}}`))
	})
	p.client.Timeout = 10 * time.Millisecond
	_, err := p.Chat(context.Background(), nil)
	if err == nil || !strings.Contains(strings.ToLower(err.Error()), "timeout") {
		t.Fatalf("expected timeout, got %v", err)
	}
}

func TestHTTPProviderInvalidJSON(t *testing.T) {
	p := testProvider(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("not-json"))
	})
	_, err := p.Chat(context.Background(), nil)
	if err == nil {
		t.Fatal("expected invalid JSON error")
	}
}

func TestHTTPProviderEmptyResponse(t *testing.T) {
	p := testProvider(t, func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"message":{"content":"   "}}`))
	})
	_, err := p.Chat(context.Background(), nil)
	var pe *ProviderError
	if !errors.As(err, &pe) || pe.Kind != "empty" {
		t.Fatalf("expected empty provider error, got %v", err)
	}
}

func TestHTTPProviderRateLimit(t *testing.T) {
	p := testProvider(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	})
	_, err := p.Chat(context.Background(), nil)
	var pe *ProviderError
	if !errors.As(err, &pe) || pe.Kind != "rate_limit" || pe.Status != http.StatusTooManyRequests {
		t.Fatalf("expected rate limit provider error, got %v", err)
	}
}

func TestFallbackProviderUsesSecondary(t *testing.T) {
	primary := &stubProvider{name: "primary", chatErr: &ProviderError{Provider: "primary", Kind: "upstream"}}
	secondary := &stubProvider{name: "secondary", chatOut: "fallback"}
	got, err := (&FallbackProvider{Primary: primary, Secondary: secondary}).Chat(context.Background(), nil)
	if err != nil || got != "fallback" {
		t.Fatalf("got=%q err=%v", got, err)
	}
}

func TestFallbackProviderNeverFallsBackForEmbeddings(t *testing.T) {
	primary := &embedErrorProvider{err: &ProviderError{Provider: "primary", Kind: "connection"}}
	secondary := &stubProvider{name: "secondary"}
	got, err := (&FallbackProvider{Primary: primary, Secondary: secondary}).Embed(context.Background(), "candi")
	if err == nil || got != nil {
		t.Fatalf("an embedding from another model must not be used: got=%v err=%v", got, err)
	}
}

// embedErrorProvider fails every embedding.
type embedErrorProvider struct {
	stubProvider
	err error
}

func (p *embedErrorProvider) Embed(context.Context, string) (*EmbeddingResponse, error) {
	return nil, p.err
}

type stubProvider struct {
	name    string
	chatOut string
	chatErr error
}

func (s *stubProvider) Name() string { return s.name }
func (s *stubProvider) Chat(context.Context, []ChatMessage) (string, error) {
	return s.chatOut, s.chatErr
}
func (s *stubProvider) Embed(context.Context, string) (*EmbeddingResponse, error) {
	return &EmbeddingResponse{Vector: make([]float32, EmbeddingDimensions)}, nil
}

func TestOllamaEmbedInvalidResponseIsFormatError(t *testing.T) {
	for _, payload := range []string{`not-json`, `{"embeddings":[]}`} {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(payload)) }))
		_, err := NewProvider(config.LLMConfig{OllamaURL: server.URL, OllamaEmbed: "embed", Timeout: 1}, config.ProviderOllama).Embed(context.Background(), "x")
		server.Close()
		var providerErr *ProviderError
		if !errors.As(err, &providerErr) || providerErr.Kind != "format" {
			t.Fatalf("payload %q: err = %v", payload, err)
		}
	}
}

func TestGeminiChatSendsSystemPromptAsSystemInstruction(t *testing.T) {
	var body map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body = nil // Decode merges into an existing map; each request starts empty
		_ = json.NewDecoder(r.Body).Decode(&body)
		_, _ = w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}`))
	}))
	t.Cleanup(srv.Close)
	gemini := &HTTPProvider{kind: "gemini", base: srv.URL, chat: "chat", embed: "embed", client: srv.Client()}
	msgs := []ChatMessage{{Role: "system", Content: "ATURAN"}, {Role: "system", Content: "CONTEXT"}, {Role: "user", Content: "hai"}, {Role: "assistant", Content: "halo"}}
	if _, err := gemini.Chat(context.Background(), msgs); err != nil {
		t.Fatal(err)
	}
	instruction, _ := body["systemInstruction"].(map[string]any)
	parts, _ := instruction["parts"].([]any)
	if len(parts) != 1 || parts[0].(map[string]any)["text"] != "ATURAN\n\nCONTEXT" {
		t.Fatalf("systemInstruction = %v", body["systemInstruction"])
	}
	contents, _ := body["contents"].([]any)
	if len(contents) != 2 || contents[0].(map[string]any)["role"] != "user" || contents[1].(map[string]any)["role"] != "model" {
		t.Fatalf("contents = %v", body["contents"])
	}
	if _, err := gemini.Chat(context.Background(), []ChatMessage{{Role: "user", Content: "hai"}}); err != nil {
		t.Fatal(err)
	}
	if _, set := body["systemInstruction"]; set {
		t.Fatalf("no system message must send no systemInstruction: %v", body)
	}
}

func TestHTTPProviderSendsTemperatureOnlyWhenSet(t *testing.T) {
	var bodies []map[string]any
	handler := func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		bodies = append(bodies, body)
		if strings.Contains(r.URL.Path, "generateContent") {
			_, _ = w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":"ok"}]}}]}`))
			return
		}
		_, _ = w.Write([]byte(`{"message":{"role":"assistant","content":"ok"}}`))
	}
	ollama := testProvider(t, handler)
	if _, err := ollama.Chat(context.Background(), []ChatMessage{{Role: "user", Content: "hai"}}); err != nil {
		t.Fatal(err)
	}
	if _, err := ollama.Chat(WithTemperature(context.Background(), 0.4), []ChatMessage{{Role: "user", Content: "hai"}}); err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(http.HandlerFunc(handler))
	t.Cleanup(srv.Close)
	gemini := &HTTPProvider{kind: "gemini", base: srv.URL, chat: "chat", embed: "embed", client: srv.Client()}
	if _, err := gemini.Chat(WithTemperature(context.Background(), 0), []ChatMessage{{Role: "user", Content: "hai"}}); err != nil {
		t.Fatal(err)
	}
	if _, set := bodies[0]["options"]; set {
		t.Fatalf("default call must not send options: %v", bodies[0])
	}
	if options, _ := bodies[1]["options"].(map[string]any); options["temperature"] != 0.4 {
		t.Fatalf("ollama options = %v", bodies[1]["options"])
	}
	if config, _ := bodies[2]["generationConfig"].(map[string]any); config["temperature"] != float64(0) {
		t.Fatalf("gemini generationConfig = %v", bodies[2]["generationConfig"])
	}
}

// H1 (2026-10-31): LLM_OLLAMA_NUM_GPU is a local Ollama setting. It is sent only when set, 0 is a real
// value (CPU only), and it never reaches another provider.
func TestOllamaNumGPUIsSentOnlyWhenSet(t *testing.T) {
	var bodies []map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		bodies = append(bodies, body)
		_, _ = w.Write([]byte(`{"message":{"role":"assistant","content":"ok"}}`))
	}))
	t.Cleanup(srv.Close)
	thirty, zero := 30, 0
	for _, layers := range []*int{nil, &thirty, &zero} {
		p := NewProvider(config.LLMConfig{OllamaURL: srv.URL, OllamaChat: "chat", OllamaEmbed: "embed", Timeout: 1, OllamaNumGPU: layers}, config.ProviderOllama)
		if _, err := p.Chat(context.Background(), []ChatMessage{{Role: "user", Content: "hai"}}); err != nil {
			t.Fatal(err)
		}
	}
	if _, set := bodies[0]["options"]; set {
		t.Fatalf("unset num_gpu sent options: %v", bodies[0])
	}
	for i, want := range []float64{30, 0} {
		options, _ := bodies[i+1]["options"].(map[string]any)
		if options["num_gpu"] != want {
			t.Fatalf("num_gpu = %v, want %v", options["num_gpu"], want)
		}
	}
	if gemini := NewProvider(config.LLMConfig{GeminiKey: "k", OllamaNumGPU: &thirty}, config.ProviderGemini); gemini.numGPU != nil {
		t.Fatal("num_gpu must never be set for a non-Ollama provider")
	}
}

// Jobdesk 2026-10-23 (PoC LLM API): Gemini requests follow the provider docs — key in the x-goog-api-key
// header (never in the URL), POST /models/<model>:generateContent and :embedContent, JSON body — and the
// answer and the embedding are read from the response.
func TestGeminiRequestsUseHeaderKeyAndDocumentedEndpoints(t *testing.T) {
	const key = "test-gemini-key"
	var paths, keys, queries []string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		paths = append(paths, r.Method+" "+r.URL.Path)
		keys = append(keys, r.Header.Get("x-goog-api-key"))
		queries = append(queries, r.URL.RawQuery)
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("Content-Type = %q", r.Header.Get("Content-Type"))
		}
		if strings.HasSuffix(r.URL.Path, ":embedContent") {
			_, _ = w.Write([]byte(`{"embedding":{"values":[0.1,0.2]}}`))
			return
		}
		_, _ = w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":"Candi Jawi"}]}}]}`))
	}))
	t.Cleanup(srv.Close)
	gemini := NewProvider(config.LLMConfig{GeminiKey: key, GeminiChat: "gemini-chat", GeminiEmbed: "gemini-embed", Timeout: 5}, config.ProviderGemini)
	gemini.base, gemini.client = srv.URL, srv.Client()
	answer, err := gemini.Chat(context.Background(), []ChatMessage{{Role: "user", Content: "Sebutkan satu destinasi"}})
	if err != nil || answer != "Candi Jawi" {
		t.Fatalf("answer %q, err %v", answer, err)
	}
	embedding, err := gemini.Embed(context.Background(), "Candi Jawi")
	if err != nil || len(embedding.Vector) != 2 || embedding.Model != "gemini-embed" {
		t.Fatalf("embedding %+v, err %v", embedding, err)
	}
	want := []string{"POST /models/gemini-chat:generateContent", "POST /models/gemini-embed:embedContent"}
	for i := range want {
		if paths[i] != want[i] || keys[i] != key || strings.Contains(queries[i], key) {
			t.Fatalf("request %d: %s key=%q query=%q", i, paths[i], keys[i], queries[i])
		}
	}
}

// Gemini review 2026-11-02: gemini-embedding-001 gets taskType (+ title for documents) and plain text;
// embeddinggemma keeps the exact prefixed text, so the stored Ollama vectors stay valid.
func TestEmbeddingInputPerModel(t *testing.T) {
	gemma := &HTTPProvider{kind: "ollama", embed: "embeddinggemma"}
	ctx, input := queryEmbeddingInput(context.Background(), gemma, "Candi Jawi")
	if _, set := embedTaskFrom(ctx); set || input != "task: search result | query: Candi Jawi" {
		t.Fatalf("embeddinggemma query changed: %q", input)
	}
	ctx, input = documentEmbeddingInput(context.Background(), gemma, "Candi Jawi", "Candi.")
	if _, set := embedTaskFrom(ctx); set || input != "title: Candi Jawi | text: Candi." {
		t.Fatalf("embeddinggemma document changed: %q", input)
	}
	gemini := &HTTPProvider{kind: "gemini", embed: "gemini-embedding-001"}
	ctx, input = queryEmbeddingInput(context.Background(), gemini, "Candi Jawi")
	if task, _ := embedTaskFrom(ctx); task.Type != geminiTaskQuery || input != "Candi Jawi" {
		t.Fatalf("gemini query: %+v %q", task, input)
	}
	ctx, input = documentEmbeddingInput(context.Background(), gemini, "Candi Jawi", "Candi.")
	if task, _ := embedTaskFrom(ctx); task != (EmbedTask{Type: geminiTaskDocument, Title: "Candi Jawi"}) || input != "Candi." {
		t.Fatalf("gemini document: %+v %q", task, input)
	}
}

func TestGeminiEmbedSendsTaskTypeAndTitle(t *testing.T) {
	var bodies []map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		_ = json.NewDecoder(r.Body).Decode(&body)
		bodies = append(bodies, body)
		_, _ = w.Write([]byte(`{"embedding":{"values":[0.1]}}`))
	}))
	t.Cleanup(srv.Close)
	gemini := &HTTPProvider{kind: "gemini", base: srv.URL, embed: "gemini-embedding-001", client: srv.Client()}
	_, _ = gemini.Embed(WithEmbedTask(context.Background(), EmbedTask{Type: geminiTaskDocument, Title: "Candi Jawi"}), "Candi.")
	_, _ = gemini.Embed(WithEmbedTask(context.Background(), EmbedTask{Type: geminiTaskQuery, Title: "ignored"}), "q")
	_, _ = gemini.Embed(context.Background(), "plain")
	if bodies[0]["taskType"] != geminiTaskDocument || bodies[0]["title"] != "Candi Jawi" {
		t.Fatalf("document body: %v", bodies[0])
	}
	if _, title := bodies[1]["title"]; bodies[1]["taskType"] != geminiTaskQuery || title {
		t.Fatalf("query body: %v", bodies[1])
	}
	if _, task := bodies[2]["taskType"]; task {
		t.Fatalf("no task in context must send no taskType: %v", bodies[2])
	}
}

// Gemini can split the answer into several parts; every text part except thought summaries is the answer (e2e 2026-11-04).
func TestGeminiChatJoinsAllAnswerParts(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"candidates":[{"content":{"parts":[{"text":"rencana","thought":true},{"text":"Halo!"},{"text":" Kirab Pataka digelar 8 Februari."}]}}]}`))
	}))
	t.Cleanup(srv.Close)
	gemini := &HTTPProvider{kind: "gemini", base: srv.URL, chat: "chat", embed: "embed", client: srv.Client()}
	got, err := gemini.Chat(context.Background(), []ChatMessage{{Role: "user", Content: "hai"}})
	if err != nil || got != "Halo! Kirab Pataka digelar 8 Februari." {
		t.Fatalf("answer = %q, err = %v", got, err)
	}
}
