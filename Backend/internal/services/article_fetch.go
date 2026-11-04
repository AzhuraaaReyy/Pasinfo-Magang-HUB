package services

import (
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"syscall"
	"time"

	"github.com/go-shiori/go-readability"
)

// maxArticleBytes bounds how much of a scraped article page is read.
const maxArticleBytes = 5 << 20

// maxNewsAPIBytes bounds the news list response read from the news API.
const maxNewsAPIBytes = 10 << 20

var errBlockedAddress = errors.New("blocked address")

// blockedIP reports addresses the server must never fetch on behalf of third-party
// data: loopback, private, link-local (incl. cloud metadata), unspecified, multicast.
func blockedIP(ip net.IP) bool {
	return ip == nil || ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() ||
		ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.IsMulticast() || ip.IsInterfaceLocalMulticast()
}

// safeArticleURL accepts only absolute http(s) URLs whose host is not local.
func safeArticleURL(raw string) (*url.URL, error) {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return nil, err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, fmt.Errorf("unsupported scheme %q", u.Scheme)
	}
	host := u.Hostname()
	if host == "" {
		return nil, errors.New("missing host")
	}
	if strings.EqualFold(host, "localhost") || strings.HasSuffix(strings.ToLower(host), ".localhost") {
		return nil, errBlockedAddress
	}
	if ip := net.ParseIP(host); ip != nil && blockedIP(ip) {
		return nil, errBlockedAddress
	}
	return u, nil
}

// newArticleClient returns an HTTP client whose dialer re-checks the resolved IP,
// so DNS names or redirects that point to internal addresses are refused too.
func newArticleClient() *http.Client {
	dialer := &net.Dialer{
		Timeout: 10 * time.Second,
		Control: func(_, address string, _ syscall.RawConn) error {
			host, _, err := net.SplitHostPort(address)
			if err != nil {
				return err
			}
			if blockedIP(net.ParseIP(host)) {
				return fmt.Errorf("%w: %s", errBlockedAddress, host)
			}
			return nil
		},
	}
	return &http.Client{
		Timeout:   20 * time.Second,
		Transport: &http.Transport{DialContext: dialer.DialContext, TLSHandshakeTimeout: 10 * time.Second},
	}
}

// scrapeArticleText downloads one article page and extracts its readable text.
// It returns "" on any failure; the caller falls back to the API content.
func scrapeArticleText(client *http.Client, link string) string {
	u, err := safeArticleURL(link)
	if err != nil {
		return ""
	}
	req, err := http.NewRequest(http.MethodGet, u.String(), nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	resp, err := client.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ""
	}
	scraped, err := readability.FromReader(io.LimitReader(resp.Body, maxArticleBytes), u)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(scraped.TextContent)
}
