package database

import "testing"

// P2-4 (jobdesk 14 Nov): every DSN value is quoted, so a password with a space, a quote, or a backslash reaches
// PostgreSQL whole (unquoted, "pa ss word" was cut at the space).
func TestPostgresDSNQuotesEveryValue(t *testing.T) {
	got := postgresDSN("db-host", "pasinfo", `pa ss 'wo\rd`, "pasinfo_travel", "5432", "disable")
	want := `host='db-host' user='pasinfo' password='pa ss \'wo\\rd' dbname='pasinfo_travel' port='5432' sslmode='disable'`
	if got != want {
		t.Fatalf("postgresDSN = %s\nwant          %s", got, want)
	}
}

// P2-1 (jobdesk 14 Nov): production refuses the SQLite fallback; development keeps it.
func TestSQLiteFallbackIsRefusedInProduction(t *testing.T) {
	for env, refused := range map[string]bool{"production": true, "development": false, "staging": false, "": false} {
		if sqliteRefused(env) != refused {
			t.Errorf("sqliteRefused(%q) = %v, want %v", env, !refused, refused)
		}
	}
}
