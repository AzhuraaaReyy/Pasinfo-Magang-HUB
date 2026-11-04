package utils

import (
	"strings"
	"testing"
)

func captureEmail(t *testing.T) *string {
	t.Helper()
	var body string
	previous := deliverHTMLEmail
	deliverHTMLEmail = func(_ string, _ string, htmlBody string) error {
		body = htmlBody
		return nil
	}
	t.Cleanup(func() { deliverHTMLEmail = previous })
	return &body
}

const injected = `<a href="https://phishing.example">klik di sini</a>`

func assertEscaped(t *testing.T, body string) {
	t.Helper()
	if strings.Contains(body, injected) {
		t.Fatal("raw user-supplied HTML must not appear in the email body")
	}
	if !strings.Contains(body, "&lt;a href=&#34;https://phishing.example&#34;&gt;") {
		t.Fatal("user-supplied HTML must appear escaped")
	}
}

func TestRegisterOTPEmailEscapesName(t *testing.T) {
	body := captureEmail(t)
	if err := SendRegisterOTPEmail("user@example.com", injected, "123456"); err != nil {
		t.Fatal(err)
	}
	assertEscaped(t, *body)
}

func TestNewsRevisionEmailEscapesTitleAndNotes(t *testing.T) {
	body := captureEmail(t)
	if err := SendNewsReviewRevisionEmail("user@example.com", "Penulis", injected, "LOKAL", "28 Oktober 2026", injected); err != nil {
		t.Fatal(err)
	}
	assertEscaped(t, *body)
}

func TestWelcomeEmailEscapesDisplayedAddress(t *testing.T) {
	body := captureEmail(t)
	if err := SendWelcomeRegistrationEmail(`x"<b>@example.com`, "Nama", "member", "28 Oktober 2026"); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(*body, `x"<b>@example.com`) {
		t.Fatal("displayed address must be escaped")
	}
}
