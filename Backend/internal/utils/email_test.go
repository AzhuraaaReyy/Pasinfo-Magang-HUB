package utils

import (
	"crypto/tls"
	"testing"
)

func TestSMTPTLSConfigRequiresModernTLS(t *testing.T) {
	cfg := smtpTLSConfig("smtp.example.test")
	if cfg.ServerName != "smtp.example.test" {
		t.Fatalf("ServerName=%q, want smtp.example.test", cfg.ServerName)
	}
	if cfg.MinVersion != tls.VersionTLS13 {
		t.Fatalf("MinVersion=%d, want TLS 1.3", cfg.MinVersion)
	}
}
