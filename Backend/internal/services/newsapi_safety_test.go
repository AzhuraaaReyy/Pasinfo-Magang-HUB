package services

import (
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

// Article links come from a third-party API, so the server must not fetch
// internal addresses with them (audit M6, SSRF).
func TestSafeArticleURL(t *testing.T) {
	for raw, wantOK := range map[string]bool{
		"https://www.tempo.co/berita/123":    true,
		"http://example.com/a":               true,
		"ftp://example.com/a":                false,
		"file:///etc/passwd":                 false,
		"http://localhost:8080/admin":        false,
		"http://127.0.0.1/":                  false,
		"http://10.0.0.5/":                   false,
		"http://192.168.1.1/":                false,
		"http://169.254.169.254/latest/meta": false,
		"http://[::1]/":                      false,
		"https:///no-host":                   false,
		"not a url":                          false,
	} {
		_, err := safeArticleURL(raw)
		if (err == nil) != wantOK {
			t.Errorf("safeArticleURL(%q) err=%v, want ok=%v", raw, err, wantOK)
		}
	}
}

func TestBlockedIP(t *testing.T) {
	for ip, want := range map[string]bool{
		"127.0.0.1": true, "10.1.2.3": true, "172.16.0.1": true, "192.168.0.1": true,
		"169.254.1.1": true, "::1": true, "0.0.0.0": true, "fc00::1": true,
		"8.8.8.8": false, "1.1.1.1": false,
	} {
		if got := blockedIP(net.ParseIP(ip)); got != want {
			t.Errorf("blockedIP(%s) = %v, want %v", ip, got, want)
		}
	}
}

// The dialer re-checks the resolved address, so a public-looking host that
// resolves to a private IP (or a redirect to one) is still refused.
func TestArticleClientRefusesPrivateAddress(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("internal"))
	}))
	defer srv.Close()
	_, err := newArticleClient().Get(srv.URL)
	if err == nil || !strings.Contains(err.Error(), "blocked") {
		t.Fatalf("expected blocked dial to %s, got %v", srv.URL, err)
	}
}

// Jobdesk 13 Nov point 4 (P4-1, Owner option C): an article with the title and text of a saved news item is a duplicate
// whatever its URL; the same title with another text is another article.
func TestDuplicateNews(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.Category{}, &models.News{}); err != nil {
		t.Fatal(err)
	}
	if err := db.Create(&models.News{Title: "PT Pertamina Buka Tender", Slug: "tender", Content: "Isi artikel yang sama.", Status: "published", SourceURL: "https://contoh/1"}).Error; err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		title, content string
		want           bool
	}{
		{"PT Pertamina Buka Tender", "Isi artikel yang sama.", true},
		{"  pt pertamina buka TENDER ", "Isi artikel yang sama.\n", true},
		{"PT Pertamina Buka Tender", "Isi artikel yang lain.", false},
		{"Judul lain", "Isi artikel yang sama.", false},
	} {
		got, err := duplicateNews(db, tc.title, tc.content)
		if err != nil || got != tc.want {
			t.Fatalf("duplicateNews(%q, %q) = %v, err %v, want %v", tc.title, tc.content, got, err, tc.want)
		}
	}
}
