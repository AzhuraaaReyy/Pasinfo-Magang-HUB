package services

import (
	"context"
	"errors"
	"time"
)

// maxProviderRetries bounds LLM_MAX_RETRIES, as in the devbackend reference (resilience.go).
const maxProviderRetries = 3

// RetryProvider repeats a chat or embedding call that failed in a way that is safe to repeat: the
// provider could not be reached, or it answered 5xx (Ollama recovers after a model crash or restart).
// Timeouts, rate limits (429), 4xx, and format errors are returned at once: repeating a 120-second
// timeout would double the wait, and a 4xx fails again. It wraps one provider, so a fallback provider
// runs only after the primary's retries.
type RetryProvider struct {
	inner     LLMProvider
	retries   int
	baseDelay time.Duration
}

func (p *RetryProvider) EmbeddingModel() string { return EmbeddingModelOf(p.inner) }

func NewRetryProvider(inner LLMProvider, retries int) *RetryProvider {
	retries = max(0, min(retries, maxProviderRetries))
	return &RetryProvider{inner: inner, retries: retries, baseDelay: 500 * time.Millisecond}
}

func (p *RetryProvider) Name() string { return p.inner.Name() }

func (p *RetryProvider) Chat(ctx context.Context, msgs []ChatMessage) (string, error) {
	var out string
	err := p.retry(ctx, func() error {
		var e error
		out, e = p.inner.Chat(ctx, msgs)
		return e
	})
	return out, err
}

func (p *RetryProvider) Embed(ctx context.Context, text string) (*EmbeddingResponse, error) {
	var out *EmbeddingResponse
	err := p.retry(ctx, func() error {
		var e error
		out, e = p.inner.Embed(ctx, text)
		return e
	})
	return out, err
}

// Health is not retried, so /chat/health stays fast.
func (p *RetryProvider) Health(ctx context.Context) error {
	return ProviderHealth(ctx, p.inner)
}

func (p *RetryProvider) retry(ctx context.Context, call func() error) error {
	err := call()
	for attempt := 1; attempt <= p.retries && retryableProviderError(err); attempt++ {
		select {
		case <-time.After(p.baseDelay * time.Duration(1<<(attempt-1))):
		case <-ctx.Done():
			return err
		}
		err = call()
	}
	return err
}

func retryableProviderError(err error) bool {
	var pe *ProviderError
	if !errors.As(err, &pe) {
		return false
	}
	return pe.Kind == "connection" || (pe.Kind == "upstream" && pe.Status >= 500)
}
