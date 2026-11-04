package services

import (
	"errors"
	"fmt"
	"net/url"
)

// withoutRequestURL drops the request URL from net/http client errors. Some
// providers require the API key in the query string, and *url.Error prints the
// full URL, so returning it unchanged would put the key into logs.
func withoutRequestURL(err error) error {
	var urlErr *url.Error
	if errors.As(err, &urlErr) {
		return fmt.Errorf("%s request failed: %w", urlErr.Op, urlErr.Err)
	}
	return err
}
