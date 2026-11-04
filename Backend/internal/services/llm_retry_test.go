package services

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

// flakyProvider fails with errs in order, then answers.
type flakyProvider struct {
	errs  []error
	calls int
}

func (f *flakyProvider) Name() string { return "flaky" }
func (f *flakyProvider) next() error {
	f.calls++
	if f.calls <= len(f.errs) {
		return f.errs[f.calls-1]
	}
	return nil
}
func (f *flakyProvider) Chat(context.Context, []ChatMessage) (string, error) {
	if err := f.next(); err != nil {
		return "", err
	}
	return "ok", nil
}
func (f *flakyProvider) Embed(context.Context, string) (*EmbeddingResponse, error) {
	if err := f.next(); err != nil {
		return nil, err
	}
	return &EmbeddingResponse{Vector: make([]float32, EmbeddingDimensions)}, nil
}

func fastRetry(inner LLMProvider, retries int) *RetryProvider {
	p := NewRetryProvider(inner, retries)
	p.baseDelay = time.Millisecond
	return p
}

func TestRetryProviderRepeatsOnlyTransientFailures(t *testing.T) {
	connection := &ProviderError{Provider: "ollama", Kind: "connection"}
	server := &ProviderError{Provider: "ollama", Kind: "upstream", Status: http.StatusBadGateway}
	cases := []struct {
		name      string
		errs      []error
		wantCalls int
		wantErr   bool
	}{
		{"connection then ok", []error{connection}, 2, false},
		{"5xx then ok", []error{server}, 2, false},
		{"retries exhausted", []error{connection, connection, connection}, 2, true},
		{"timeout not repeated", []error{&ProviderError{Kind: "timeout"}}, 1, true},
		{"429 not repeated", []error{&ProviderError{Kind: "rate_limit", Status: http.StatusTooManyRequests}}, 1, true},
		{"4xx not repeated", []error{&ProviderError{Kind: "upstream", Status: http.StatusNotFound}}, 1, true},
		{"format not repeated", []error{&ProviderError{Kind: "format"}}, 1, true},
		{"plain error not repeated", []error{errors.New("boom")}, 1, true},
	}
	for _, c := range cases {
		inner := &flakyProvider{errs: c.errs}
		_, err := fastRetry(inner, 1).Chat(context.Background(), nil)
		if inner.calls != c.wantCalls || (err != nil) != c.wantErr {
			t.Errorf("%s: calls=%d err=%v", c.name, inner.calls, err)
		}
	}
	inner := &flakyProvider{errs: []error{connection, connection}}
	if _, err := fastRetry(inner, 2).Embed(context.Background(), "x"); err != nil || inner.calls != 3 {
		t.Fatalf("embed with 2 retries: calls=%d err=%v", inner.calls, err)
	}
}

func TestRetryProviderBoundsAndContext(t *testing.T) {
	if p := NewRetryProvider(&flakyProvider{}, 99); p.retries != maxProviderRetries {
		t.Fatalf("retries = %d, want %d", p.retries, maxProviderRetries)
	}
	if p := NewRetryProvider(&flakyProvider{}, -1); p.retries != 0 {
		t.Fatalf("negative retries = %d", p.retries)
	}
	inner := &flakyProvider{errs: []error{&ProviderError{Kind: "connection"}, nil}}
	p := NewRetryProvider(inner, 1) // 500 ms delay
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := p.Chat(ctx, nil); err == nil || inner.calls != 1 {
		t.Fatalf("a canceled context must stop retrying: calls=%d err=%v", inner.calls, err)
	}
}

func TestRetryProviderOverHTTPRecoversFromServerError(t *testing.T) {
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if hits.Add(1) == 1 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		_, _ = w.Write([]byte(`{"message":{"role":"assistant","content":"halo"}}`))
	}))
	defer srv.Close()
	ollama := &HTTPProvider{kind: "ollama", base: srv.URL, chat: "chat", embed: "embed", client: srv.Client()}
	got, err := fastRetry(ollama, 1).Chat(context.Background(), []ChatMessage{{Role: "user", Content: "hai"}})
	if err != nil || got != "halo" || hits.Load() != 2 {
		t.Fatalf("got=%q err=%v hits=%d", got, err, hits.Load())
	}
}
