package services

import (
	"context"
	"errors"
	"slices"
	"strings"
	"testing"
	"time"
)

// Jobdesk 9 Nov point 1: an unknown domain is refused before the query is embedded (no provider call).
func TestSearchTravelContentRefusesAnUnknownDomain(t *testing.T) {
	p := &recordingEmbedder{}
	_, err := NewRetriever(nil).SearchTravelContent(context.Background(), p, "pantai", TravelSearch{Domains: []string{"wisata", "berita"}}, 5)
	if !errors.Is(err, ErrUnknownTravelDomain) || len(p.inputs) != 0 {
		t.Fatalf("err = %v, embedded %d", err, len(p.inputs))
	}
}

// The source types reach the SQL as one bound IN list; no other filter is added.
func TestSourceTypesFilterIsABoundInList(t *testing.T) {
	clause, args := SearchFilter{SourceTypes: []string{"destination", "event"}}.relationClause()
	if clause != " AND source_type IN ?" || len(args) != 1 || !slices.Equal(args[0].([]string), []string{"destination", "event"}) {
		t.Fatalf("clause %q args %v", clause, args)
	}
	if clause, args := (SearchFilter{}).relationClause(); clause != "" || len(args) != 0 {
		t.Fatalf("empty filter: clause %q args %v", clause, args)
	}
}

// Empty domains search all four travel domains, never news or region documents.
func TestTravelSearchDomainsAreTheFourContentDomains(t *testing.T) {
	var types []string
	for _, d := range travelSearchDomains {
		types = append(types, d.SourceType)
	}
	if strings.Join(types, ",") != "destination,culinary,culture,event" {
		t.Fatalf("types = %v", types)
	}
}

// Jobdesk 9 Nov point 5: an unusable zone, kecamatan, or category is refused before the query is embedded.
func TestSearchTravelContentRefusesInvalidFilters(t *testing.T) {
	cases := []TravelSearch{
		{Zone: "Pasuruan Tengah"},
		{District: strings.Repeat("x", travelSearchDistrictMaxRunes+1)},
		{Category: "Wisata Alam"}, // all four domains
		{Domains: []string{"wisata", "kuliner"}, Category: "Wisata Alam"},
		{Domains: []string{"kuliner"}, Category: "Wisata Alam"}, // not a kuliner category
	}
	for i, s := range cases {
		p := &recordingEmbedder{}
		if _, err := NewRetriever(nil).SearchTravelContent(context.Background(), p, "pantai", s, 5); !errors.Is(err, ErrInvalidTravelFilter) || len(p.inputs) != 0 {
			t.Fatalf("case %d %+v: err = %v, embedded %d", i, s, err, len(p.inputs))
		}
	}
}

// A kecamatan over several domains matches each source type in its own table; a category code is matched in its
// domain's type column; eligibility adds the published/upcoming check with its two time arguments.
func TestTravelFilterClauses(t *testing.T) {
	clause, args := SearchFilter{SourceTypes: []string{"destination", "event"}, District: "Bangil"}.relationClause()
	if !strings.Contains(clause, "(source_type = ? AND EXISTS (SELECT 1 FROM destinations x JOIN places pl") || !strings.Contains(clause, " OR (source_type = ? AND EXISTS (SELECT 1 FROM events x") || len(args) != 5 {
		t.Fatalf("district over domains: %q %v", clause, args)
	}
	clause, args = SearchFilter{SourceTypes: []string{"culinary"}, SourceType: "culinary", TypeCode: "seafood"}.relationClause()
	if !strings.Contains(clause, "FROM culinaries x WHERE x.id = source_id AND x.culinary_type = ?") || args[len(args)-1] != "seafood" {
		t.Fatalf("type code: %q %v", clause, args)
	}
	at := time.Date(2026, 11, 9, 10, 0, 0, 0, wib)
	clause, args = SearchFilter{EligibleAt: at}.relationClause()
	if clause != eligibleSourceSQL || len(args) != 2 || args[0] != at || !strings.Contains(clause, "x.status = 'published'") || !strings.Contains(clause, "event_occurrences") {
		t.Fatalf("eligibility: %q %v", clause, args)
	}
}
