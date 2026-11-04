package services

import (
	"context"
	"errors"
	"testing"
	"time"
)

type gateProvider struct {
	stubProvider
	release chan struct{}
}

func (p *gateProvider) Chat(ctx context.Context, _ []ChatMessage) (string, error) {
	select {
	case <-p.release:
		return "ok", nil
	case <-ctx.Done():
		return "", ctx.Err()
	}
}

func TestConcurrencyLimitedProviderWaitsForSlot(t *testing.T) {
	inner := &gateProvider{stubProvider: stubProvider{name: "inner"}, release: make(chan struct{})}
	limited := NewConcurrencyLimitedProvider(inner, 1)
	done := make(chan error, 1)
	go func() {
		_, err := limited.Chat(context.Background(), nil)
		done <- err
	}()
	time.Sleep(20 * time.Millisecond)
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	_, err := limited.Chat(ctx, nil)
	var providerErr *ProviderError
	if !errors.As(err, &providerErr) || providerErr.Kind != "timeout" {
		t.Fatalf("second call err = %v, want timeout while slot is held", err)
	}
	close(inner.release)
	if err := <-done; err != nil {
		t.Fatalf("first call err = %v", err)
	}
	if out, err := limited.Chat(context.Background(), nil); err != nil || out != "ok" {
		t.Fatalf("after release out=%q err=%v", out, err)
	}
}

func TestConcurrencyLimitedProviderDelegatesNameAndHealth(t *testing.T) {
	limited := NewConcurrencyLimitedProvider(NewUnavailableProvider(errors.New("x")), 0)
	if limited.Name() != "unavailable" || !errors.Is(limited.Health(context.Background()), ErrProviderNotConfigured) {
		t.Fatal("name/health not delegated")
	}
	if cap(limited.slots) != 1 {
		t.Fatalf("slots = %d, want minimum 1", cap(limited.slots))
	}
}
