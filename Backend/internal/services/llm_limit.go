package services

import (
	"context"
	"errors"
)

// ConcurrencyLimitedProvider bounds simultaneous chat and embedding calls (SEC-07).
// A caller waits for a free slot until its context ends.
type ConcurrencyLimitedProvider struct {
	inner LLMProvider
	slots chan struct{}
}

func NewConcurrencyLimitedProvider(inner LLMProvider, limit int) *ConcurrencyLimitedProvider {
	if limit < 1 {
		limit = 1
	}
	return &ConcurrencyLimitedProvider{inner: inner, slots: make(chan struct{}, limit)}
}

func (p *ConcurrencyLimitedProvider) acquire(ctx context.Context) error {
	select {
	case p.slots <- struct{}{}:
		return nil
	case <-ctx.Done():
		kind := "canceled"
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			kind = "timeout"
		}
		return &ProviderError{Provider: p.inner.Name(), Kind: kind, Message: "waiting for provider slot: " + ctx.Err().Error()}
	}
}

func (p *ConcurrencyLimitedProvider) Name() string { return p.inner.Name() }

func (p *ConcurrencyLimitedProvider) EmbeddingModel() string { return EmbeddingModelOf(p.inner) }

func (p *ConcurrencyLimitedProvider) Chat(ctx context.Context, msgs []ChatMessage) (string, error) {
	if err := p.acquire(ctx); err != nil {
		return "", err
	}
	defer func() { <-p.slots }()
	return p.inner.Chat(ctx, msgs)
}

func (p *ConcurrencyLimitedProvider) Embed(ctx context.Context, text string) (*EmbeddingResponse, error) {
	if err := p.acquire(ctx); err != nil {
		return nil, err
	}
	defer func() { <-p.slots }()
	return p.inner.Embed(ctx, text)
}

// Health does not take a slot, so it stays fast while generations are running.
func (p *ConcurrencyLimitedProvider) Health(ctx context.Context) error {
	return ProviderHealth(ctx, p.inner)
}
