package services

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"wildan-news-backend/internal/config"
)

func ollamaAt(url string) *HTTPProvider {
	return NewProvider(config.LLMConfig{OllamaURL: url, OllamaChat: "chat", OllamaEmbed: "embed", Timeout: 1}, config.ProviderOllama)
}

func TestOllamaHealthPingsTags(t *testing.T) {
	var path string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path = r.Method + " " + r.URL.Path
		_, _ = w.Write([]byte(`{"models":[]}`))
	}))
	defer server.Close()
	if err := ProviderHealth(context.Background(), ollamaAt(server.URL)); err != nil || path != "GET /api/tags" {
		t.Fatalf("err=%v path=%q", err, path)
	}
}

func TestOllamaHealthFailsWhenUnreachableOrNon2xx(t *testing.T) {
	down := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	down.Close()
	if err := ProviderHealth(context.Background(), ollamaAt(down.URL)); err == nil {
		t.Fatal("unreachable provider reported healthy")
	}
	broken := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusInternalServerError) }))
	defer broken.Close()
	if err := ProviderHealth(context.Background(), ollamaAt(broken.URL)); err == nil {
		t.Fatal("500 provider reported healthy")
	}
}

func TestFallbackHealthFollowsThePrimaryProvider(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }))
	defer up.Close()
	down := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	down.Close()
	if err := ProviderHealth(context.Background(), &FallbackProvider{Primary: ollamaAt(up.URL), Secondary: ollamaAt(down.URL)}); err != nil {
		t.Fatalf("reachable primary: %v", err)
	}
	// The chat needs the primary for query embeddings, so a reachable secondary alone is not available.
	if err := ProviderHealth(context.Background(), &FallbackProvider{Primary: ollamaAt(down.URL), Secondary: ollamaAt(up.URL)}); err == nil {
		t.Fatal("unreachable primary reported healthy")
	}
}

func TestUnavailableProviderHealthIsNotConfigured(t *testing.T) {
	err := ProviderHealth(context.Background(), NewUnavailableProvider(errors.New("missing key")))
	if !errors.Is(err, ErrProviderNotConfigured) {
		t.Fatalf("err = %v", err)
	}
}
