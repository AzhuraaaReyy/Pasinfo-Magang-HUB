package services

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"
)

type failingTransport struct{}

func (failingTransport) RoundTrip(*http.Request) (*http.Response, error) {
	return nil, errors.New("connection refused")
}

const secretTestKey = "SECRET_TEST_KEY_123"

func TestOpenWeatherErrorDoesNotLeakKey(t *testing.T) {
	c := NewOpenWeatherClient(secretTestKey)
	c.HTTP = &http.Client{Transport: failingTransport{}}
	_, err := c.Current(context.Background(), -7.6, 112.9)
	if err == nil {
		t.Fatal("expected an error")
	}
	if strings.Contains(err.Error(), secretTestKey) {
		t.Fatalf("error leaks API key: %v", err)
	}
}

func TestGoogleDirectionsErrorDoesNotLeakKey(t *testing.T) {
	c := NewGoogleMapsClient(secretTestKey)
	c.HTTP = &http.Client{Transport: failingTransport{}}
	_, err := c.Directions(context.Background(), -7.6, 112.9, -7.7, 112.8)
	if err == nil {
		t.Fatal("expected an error")
	}
	if strings.Contains(err.Error(), secretTestKey) {
		t.Fatalf("error leaks API key: %v", err)
	}
}
