package main

import (
	"context"
	"errors"
	"strings"
	"testing"

	"wildan-news-backend/internal/services"
)

// downProvider is an embedding provider that cannot be reached.
type downProvider struct{ embeds int }

func (*downProvider) Name() string { return "ollama" }
func (*downProvider) Chat(context.Context, []services.ChatMessage) (string, error) {
	return "", errors.New("unused")
}
func (p *downProvider) Embed(context.Context, string) (*services.EmbeddingResponse, error) {
	p.embeds++
	return nil, errors.New("unused")
}
func (*downProvider) Health(context.Context) error { return errors.New("connection refused") }

// jobdesk 6 Nov P1-1 (Owner option B): the seed asks the corpus worker for a refresh; with the provider down it only
// reports that the API worker will embed the data, and it neither embeds nor touches the database.
func TestRefreshCorpusSkipsWhenProviderIsDown(t *testing.T) {
	p := &downProvider{}
	got := refreshCorpus(nil, p, "data")
	if !strings.Contains(got, "corpus refresh skipped") || !strings.Contains(got, "connection refused") || p.embeds != 0 {
		t.Fatalf("message=%q embeds=%d", got, p.embeds)
	}
}
