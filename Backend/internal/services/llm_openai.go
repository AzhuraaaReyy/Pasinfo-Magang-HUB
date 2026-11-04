package services

import (
	"context"
	"encoding/json"
	"strings"
)

// OpenAI-compatible provider (LLM_PROVIDER / EMBED_PROVIDER = openai-compatible): POST /chat/completions
// and POST /embeddings with a Bearer key. Any API with this format (OpenAI, OpenRouter, Groq, DeepSeek,
// Mistral, ...) works by changing LLM_API_* / EMBED_* in the env only (Owner 2026-11-01).

func (p *HTTPProvider) openAIChat(ctx context.Context, msgs []ChatMessage) (string, error) {
	// ChatMessage has no JSON tags, so the roles are mapped explicitly ("role"/"content" in lower case).
	messages := make([]map[string]string, 0, len(msgs))
	for _, m := range msgs {
		messages = append(messages, map[string]string{"role": m.Role, "content": m.Content})
	}
	body := map[string]any{"model": p.chat, "messages": messages, "stream": false}
	if temperature, ok := temperatureFrom(ctx); ok {
		body["temperature"] = temperature
	}
	d, err := p.call(ctx, "/chat/completions", body)
	if err != nil {
		return "", err
	}
	var x struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if json.Unmarshal(d, &x) != nil {
		return "", &ProviderError{Provider: p.kind, Kind: "format", Message: "invalid JSON response"}
	}
	if len(x.Choices) == 0 || strings.TrimSpace(x.Choices[0].Message.Content) == "" {
		return "", &ProviderError{Provider: p.kind, Kind: "empty", Message: "empty model response"}
	}
	return x.Choices[0].Message.Content, nil
}

func (p *HTTPProvider) openAIEmbed(ctx context.Context, text string) (*EmbeddingResponse, error) {
	body := map[string]any{"model": p.embed, "input": text, "encoding_format": "float"}
	if p.embedDims > 0 {
		body["dimensions"] = p.embedDims
	}
	d, err := p.call(ctx, "/embeddings", body)
	if err != nil {
		return nil, err
	}
	var x struct {
		Data []struct {
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
	}
	if json.Unmarshal(d, &x) != nil || len(x.Data) == 0 || len(x.Data[0].Embedding) == 0 {
		return nil, &ProviderError{Provider: p.kind, Kind: "format", Message: "invalid embedding response"}
	}
	return &EmbeddingResponse{x.Data[0].Embedding, p.embed}, nil
}
