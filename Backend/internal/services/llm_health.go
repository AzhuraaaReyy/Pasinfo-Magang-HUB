package services

import (
	"context"
	"fmt"
	"io"
	"net/http"
)

// HealthChecker is implemented by providers that can check connectivity cheaply.
type HealthChecker interface {
	Health(context.Context) error
}

// ProviderHealth reports whether p can be reached; a provider without a check counts as available.
func ProviderHealth(ctx context.Context, p LLMProvider) error {
	if checker, ok := p.(HealthChecker); ok {
		return checker.Health(ctx)
	}
	return nil
}

// Health pings a lightweight read endpoint: Ollama /api/tags, Gemini models/{chat model}, OpenAI-compatible
// /models. It checks reachability and the key, not the account balance.
func (p *HTTPProvider) Health(ctx context.Context) error {
	path := "/api/tags"
	switch p.kind {
	case "gemini":
		path = "/models/" + p.chat
	case kindOpenAICompatible:
		path = "/models"
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, p.base+path, nil)
	if err != nil {
		return err
	}
	p.setAuth(req)
	res, err := p.client.Do(req)
	if err != nil {
		return &ProviderError{Provider: p.kind, Kind: "connection", Message: "health check failed"}
	}
	defer res.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(res.Body, 1<<16))
	if res.StatusCode/100 != 2 {
		return &ProviderError{Provider: p.kind, Kind: "upstream", Status: res.StatusCode, Message: "health check failed"}
	}
	return nil
}

// Health follows the primary provider: every chat question needs a query embedding, and embeddings
// never fall back (FallbackProvider.Embed), so without the primary the chat cannot answer even when
// the secondary responds. The secondary only takes over failed chat generations.
func (f *FallbackProvider) Health(ctx context.Context) error {
	return ProviderHealth(ctx, f.Primary)
}

func (p *UnavailableProvider) Health(context.Context) error {
	return fmt.Errorf("%w: %v", ErrProviderNotConfigured, p.reason)
}
