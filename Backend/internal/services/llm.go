package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"wildan-news-backend/internal/config"
)

const EmbeddingDimensions = 768

var ErrProviderNotConfigured = errors.New("provider not configured")

type ChatMessage struct{ Role, Content string }
type EmbeddingResponse struct {
	Vector []float32
	Model  string
}
type LLMProvider interface {
	Name() string
	Chat(context.Context, []ChatMessage) (string, error)
	Embed(context.Context, string) (*EmbeddingResponse, error)
}
type ProviderError struct {
	Provider, Kind string
	Status         int
	Message        string
}

func (e *ProviderError) Error() string { return fmt.Sprintf("provider %s: %s", e.Provider, e.Message) }

type temperatureKey struct{}

// WithTemperature asks the chat model for a sampling temperature for calls made with ctx
// (Ollama options.temperature, Gemini generationConfig.temperature). Without it the model
// default applies (gemma3:4b: 1). Passing it in the context keeps the LLMProvider interface
// and its wrappers unchanged.
func WithTemperature(ctx context.Context, temperature float64) context.Context {
	return context.WithValue(ctx, temperatureKey{}, temperature)
}

func temperatureFrom(ctx context.Context) (float64, bool) {
	temperature, ok := ctx.Value(temperatureKey{}).(float64)
	return temperature, ok
}

type responseSchemaKey struct{}

// WithResponseSchema asks the chat model for JSON that follows schema, for calls made with ctx (Ollama format, Gemini
// responseSchema, OpenAI response_format). Like WithTemperature it travels in the context, so the LLMProvider interface
// and its wrappers stay unchanged.
func WithResponseSchema(ctx context.Context, schema map[string]any) context.Context {
	return context.WithValue(ctx, responseSchemaKey{}, schema)
}

func responseSchemaFrom(ctx context.Context) map[string]any {
	schema, _ := ctx.Value(responseSchemaKey{}).(map[string]any)
	return schema
}

type embedTaskKey struct{}

// EmbedTask is the Gemini embedContent taskType ("RETRIEVAL_QUERY" or "RETRIEVAL_DOCUMENT") and, for a
// document, its title. Only the Gemini provider sends it; like WithTemperature it travels in the context.
type EmbedTask struct{ Type, Title string }

func WithEmbedTask(ctx context.Context, task EmbedTask) context.Context {
	return context.WithValue(ctx, embedTaskKey{}, task)
}

func embedTaskFrom(ctx context.Context) (EmbedTask, bool) {
	task, ok := ctx.Value(embedTaskKey{}).(EmbedTask)
	return task, ok
}

type HTTPProvider struct {
	kind, base, key, chat, embed string
	client                       *http.Client
	// numGPU is sent as Ollama options.num_gpu for chat calls (LLM_OLLAMA_NUM_GPU); nil = not sent, so
	// Ollama decides. A pointer, because 0 is a real value (CPU only). Never sent to another provider.
	numGPU *int
	// embedDims is the OpenAI-compatible "dimensions" of an embedding (768 = the DB column).
	embedDims int
}

// kindOpenAICompatible is the HTTPProvider kind for config.ProviderOpenAICompatible.
const kindOpenAICompatible = "openai-compatible"

// NewChatProvider builds the chat side of provider p. An OpenAI-compatible chat uses LLM_API_*.
func NewChatProvider(c config.LLMConfig, p config.Provider) *HTTPProvider {
	if p == config.ProviderOpenAICompatible {
		return &HTTPProvider{kind: kindOpenAICompatible, base: c.APIURL, key: c.APIKey, chat: c.APIChat, client: &http.Client{Timeout: time.Duration(c.Timeout) * time.Second}}
	}
	return NewProvider(c, p)
}

// NewEmbedProvider builds the embedding side of provider p. An OpenAI-compatible embedding uses
// EMBED_API_* (defaulting to LLM_API_*), EMBED_MODEL, and EMBED_DIMENSIONS.
func NewEmbedProvider(c config.LLMConfig, p config.Provider) *HTTPProvider {
	if p == config.ProviderOpenAICompatible {
		return &HTTPProvider{kind: kindOpenAICompatible, base: c.EmbedURL, key: c.EmbedKey, embed: c.EmbedModel, embedDims: c.EmbedDims, client: &http.Client{Timeout: time.Duration(c.Timeout) * time.Second}}
	}
	return NewProvider(c, p)
}

// NewProvider builds an Ollama or Gemini provider serving chat and embeddings. For an OpenAI-compatible
// provider it returns the chat side; use NewEmbedProvider for its embeddings.
func NewProvider(c config.LLMConfig, p config.Provider) *HTTPProvider {
	client := &http.Client{Timeout: time.Duration(c.Timeout) * time.Second}
	if p == config.ProviderOpenAICompatible {
		return NewChatProvider(c, p)
	}
	if p == config.ProviderGemini {
		return &HTTPProvider{kind: "gemini", base: "https://generativelanguage.googleapis.com/v1beta", key: c.GeminiKey, chat: c.GeminiChat, embed: c.GeminiEmbed, client: client}
	}
	provider := &HTTPProvider{kind: "ollama", base: c.OllamaURL, chat: c.OllamaChat, embed: c.OllamaEmbed, client: client}
	if c.OllamaNumGPU != nil {
		layers := *c.OllamaNumGPU
		provider.numGPU = &layers
	}
	return provider
}

// ollamaOptions returns the options of an Ollama chat call, or nil when none is set.
func (p *HTTPProvider) ollamaOptions(ctx context.Context) map[string]any {
	options := map[string]any{}
	if temperature, ok := temperatureFrom(ctx); ok {
		options["temperature"] = temperature
	}
	if p.numGPU != nil {
		options["num_gpu"] = *p.numGPU
	}
	if len(options) == 0 {
		return nil
	}
	return options
}
func (p *HTTPProvider) Name() string { return p.kind + ":" + p.chat }

// setAuth adds the API key the way the provider expects it; the key is never logged.
func (p *HTTPProvider) setAuth(req *http.Request) {
	switch {
	case p.key == "":
	case p.kind == kindOpenAICompatible:
		req.Header.Set("Authorization", "Bearer "+p.key)
	default:
		req.Header.Set("x-goog-api-key", p.key)
	}
}

// EmbeddingModeler reports the embedding model a provider uses. Each wrapper forwards it, so the corpus
// refresh can see a provider or model change and re-embed the documents of the old model.
type EmbeddingModeler interface {
	EmbeddingModel() string
}

// EmbeddingModelOf returns the embedding model of p, or "" when p cannot tell.
func EmbeddingModelOf(p LLMProvider) string {
	if m, ok := p.(EmbeddingModeler); ok {
		return m.EmbeddingModel()
	}
	return ""
}

// EmbeddingModel is the value stored in faq_knowledge_bases.embedding_model (EmbeddingResponse.Model).
func (p *HTTPProvider) EmbeddingModel() string { return p.embed }

// EmbeddingModel follows the primary: embeddings never fall back (see Embed).
func (f *FallbackProvider) EmbeddingModel() string { return EmbeddingModelOf(f.Primary) }
func (p *HTTPProvider) call(ctx context.Context, path string, body any) ([]byte, error) {
	b, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.base+path, bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	p.setAuth(req)
	res, err := p.client.Do(req)
	if err != nil {
		kind := "connection"
		if errors.Is(err, context.DeadlineExceeded) || strings.Contains(strings.ToLower(err.Error()), "timeout") {
			kind = "timeout"
		}
		return nil, &ProviderError{Provider: p.kind, Kind: kind, Message: err.Error()}
	}
	defer res.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode/100 != 2 {
		kind := "upstream"
		if res.StatusCode == http.StatusTooManyRequests {
			kind = "rate_limit"
		}
		message := providerResponseMessage(data)
		return nil, &ProviderError{Provider: p.kind, Kind: kind, Status: res.StatusCode, Message: message}
	}
	return data, nil
}
func providerResponseMessage(data []byte) string {
	var payload struct {
		Error struct {
			Message string `json:"message"`
			Status  string `json:"status"`
		} `json:"error"`
	}
	if json.Unmarshal(data, &payload) == nil {
		message := strings.TrimSpace(payload.Error.Message)
		if payload.Error.Status != "" {
			message = strings.TrimSpace(message + " (" + payload.Error.Status + ")")
		}
		if message != "" {
			if len(message) > 300 {
				message = message[:300]
			}
			return message
		}
	}
	return "upstream request failed"
}

func (p *HTTPProvider) Chat(ctx context.Context, msgs []ChatMessage) (string, error) {
	temperature, hasTemperature := temperatureFrom(ctx)
	if p.kind == kindOpenAICompatible {
		return p.openAIChat(ctx, msgs)
	}
	if p.kind == "ollama" {
		body := map[string]any{"model": p.chat, "messages": msgs, "stream": false}
		if options := p.ollamaOptions(ctx); options != nil {
			body["options"] = options
		}
		if schema := responseSchemaFrom(ctx); schema != nil {
			body["format"] = schema
		}
		d, e := p.call(ctx, "/api/chat", body)
		if e != nil {
			return "", e
		}
		var x struct {
			Message ChatMessage `json:"message"`
		}
		e = json.Unmarshal(d, &x)
		if e != nil {
			return "", &ProviderError{Provider: p.kind, Kind: "format", Message: "invalid JSON response"}
		}
		if strings.TrimSpace(x.Message.Content) == "" {
			return "", &ProviderError{Provider: p.kind, Kind: "empty", Message: "empty model response"}
		}
		return x.Message.Content, nil
	}
	// Gemini takes system text in systemInstruction, not in contents. Dropping it lost the protected
	// prompt (safety rules and database CONTEXT) whenever the Gemini fallback answered.
	contents := make([]map[string]any, 0, len(msgs))
	var system []string
	for _, m := range msgs {
		if m.Role == "system" {
			system = append(system, m.Content)
			continue
		}
		contents = append(contents, map[string]any{"role": map[bool]string{true: "model", false: "user"}[m.Role == "assistant"], "parts": []map[string]string{{"text": m.Content}}})
	}
	body := map[string]any{"contents": contents}
	if len(system) > 0 {
		body["systemInstruction"] = map[string]any{"parts": []map[string]string{{"text": strings.Join(system, "\n\n")}}}
	}
	generation := map[string]any{}
	if hasTemperature {
		generation["temperature"] = temperature
	}
	if schema := responseSchemaFrom(ctx); schema != nil {
		generation["responseMimeType"] = "application/json"
		generation["responseSchema"] = schema
	}
	if len(generation) > 0 {
		body["generationConfig"] = generation
	}
	d, e := p.call(ctx, "/models/"+p.chat+":generateContent", body)
	if e != nil {
		return "", e
	}
	var x struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text    string `json:"text"`
					Thought bool   `json:"thought"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	e = json.Unmarshal(d, &x)
	if e != nil {
		return "", &ProviderError{Provider: p.kind, Kind: "format", Message: "invalid JSON response"}
	}
	// The answer text can come in several parts; reading only the first cut answers to "Halo!" or "B" (e2e
	// 2026-11-04). Thought summaries are not part of the answer.
	var answer strings.Builder
	if len(x.Candidates) > 0 {
		for _, part := range x.Candidates[0].Content.Parts {
			if !part.Thought {
				answer.WriteString(part.Text)
			}
		}
	}
	if strings.TrimSpace(answer.String()) == "" {
		return "", &ProviderError{Provider: p.kind, Kind: "empty", Message: "empty model response"}
	}
	return answer.String(), nil
}
func (p *HTTPProvider) Embed(ctx context.Context, text string) (*EmbeddingResponse, error) {
	if p.kind == kindOpenAICompatible {
		return p.openAIEmbed(ctx, text)
	}
	if p.kind == "ollama" {
		d, e := p.call(ctx, "/api/embed", map[string]string{"model": p.embed, "input": text})
		if e != nil {
			return nil, e
		}
		var x struct {
			Embeddings [][]float32 `json:"embeddings"`
		}
		if e = json.Unmarshal(d, &x); e != nil || len(x.Embeddings) == 0 {
			return nil, &ProviderError{Provider: p.kind, Kind: "format", Message: "invalid embedding response"}
		}
		return &EmbeddingResponse{x.Embeddings[0], p.embed}, nil
	}
	body := map[string]any{"model": "models/" + p.embed, "content": map[string]any{"parts": []map[string]string{{"text": text}}}, "outputDimensionality": EmbeddingDimensions}
	if task, ok := embedTaskFrom(ctx); ok && task.Type != "" {
		body["taskType"] = task.Type
		if task.Type == geminiTaskDocument && task.Title != "" {
			body["title"] = task.Title
		}
	}
	d, e := p.call(ctx, "/models/"+p.embed+":embedContent", body)
	if e != nil {
		return nil, e
	}
	var x struct {
		Embedding struct {
			Values []float32 `json:"values"`
		} `json:"embedding"`
	}
	if e = json.Unmarshal(d, &x); e != nil || len(x.Embedding.Values) == 0 {
		return nil, &ProviderError{Provider: p.kind, Kind: "format", Message: "invalid embedding response"}
	}
	return &EmbeddingResponse{x.Embedding.Values, p.embed}, nil
}

type FallbackProvider struct{ Primary, Secondary LLMProvider }

func (f *FallbackProvider) Name() string { return f.Primary.Name() }
func (f *FallbackProvider) Chat(c context.Context, m []ChatMessage) (string, error) {
	v, e := f.Primary.Chat(c, m)
	if e == nil || f.Secondary == nil {
		return v, e
	}
	return f.Secondary.Chat(c, m)
}

// Embed uses only the primary provider. The stored corpus vectors come from one embedding model;
// a query vector from another model (same 768 dimensions, different vector space) would make pgvector
// return unrelated documents without any error, so a primary failure is returned as is.
func (f *FallbackProvider) Embed(c context.Context, t string) (*EmbeddingResponse, error) {
	return f.Primary.Embed(c, t)
}
func NewLLMFromEnv() (LLMProvider, error) {
	c := config.LoadLLM()
	if e := c.Validate(); e != nil {
		return nil, e
	}
	// Each provider repeats its own transient failures (LLM_MAX_RETRIES); the concurrency limit is
	// added around the whole provider in routes.go. Chat (LLM_PROVIDER, optional LLM_FALLBACK_PROVIDER)
	// and embeddings (EMBED_PROVIDER, never a fallback) are separate, so production can mix providers.
	chat := LLMProvider(NewRetryProvider(NewChatProvider(c, c.Primary), c.Retries))
	if c.Fallback != "" && c.Fallback != c.Primary {
		chat = &FallbackProvider{chat, NewRetryProvider(NewChatProvider(c, c.Fallback), c.Retries)}
	}
	return &SplitProvider{Chatter: chat, Embedder: NewRetryProvider(NewEmbedProvider(c, c.Embed), c.Retries)}, nil
}

// SplitProvider answers chat with one provider and embeddings with another (EMBED_PROVIDER). When both
// are the same kind, behaviour is unchanged from a single provider.
type SplitProvider struct{ Chatter, Embedder LLMProvider }

func (s *SplitProvider) Name() string { return s.Chatter.Name() }
func (s *SplitProvider) Chat(ctx context.Context, m []ChatMessage) (string, error) {
	return s.Chatter.Chat(ctx, m)
}
func (s *SplitProvider) Embed(ctx context.Context, t string) (*EmbeddingResponse, error) {
	return s.Embedder.Embed(ctx, t)
}
func (s *SplitProvider) EmbeddingModel() string { return EmbeddingModelOf(s.Embedder) }

// Health is available only when both sides respond: every question needs an embedding and a chat.
func (s *SplitProvider) Health(ctx context.Context) error {
	if err := ProviderHealth(ctx, s.Chatter); err != nil {
		return err
	}
	return ProviderHealth(ctx, s.Embedder)
}

type UnavailableProvider struct{ reason error }

func NewUnavailableProvider(reason error) *UnavailableProvider {
	return &UnavailableProvider{reason: reason}
}
func (p *UnavailableProvider) Name() string { return "unavailable" }
func (p *UnavailableProvider) Chat(context.Context, []ChatMessage) (string, error) {
	return "", fmt.Errorf("%w: %v", ErrProviderNotConfigured, p.reason)
}
func (p *UnavailableProvider) Embed(context.Context, string) (*EmbeddingResponse, error) {
	return nil, fmt.Errorf("%w: %v", ErrProviderNotConfigured, p.reason)
}

func EnsureDims(v []float32) error {
	if len(v) != EmbeddingDimensions {
		return fmt.Errorf("embedding dimension %d, expected %d", len(v), EmbeddingDimensions)
	}
	return nil
}
