package main

import (
	"strings"
	"testing"
)

func TestModeWarnings(t *testing.T) {
	cases := []struct {
		appEnv, https, want string
	}{
		{"development", "false", "development mode"},
		{"", "true", "development mode"},
		{"production", "false", "without Secure"},
		{"production", "", "without Secure"},
		{"production", "true", ""},
	}
	for _, tc := range cases {
		got := strings.Join(modeWarnings(tc.appEnv, tc.https), "\n")
		if (tc.want == "") != (got == "") || !strings.Contains(got, tc.want) {
			t.Errorf("APP_ENV=%q HTTPS=%q: warnings %q, want %q", tc.appEnv, tc.https, got, tc.want)
		}
	}
}
