package services

import (
	"context"
	"fmt"
	"regexp"
	"strings"
)

// Region overview path (OVERRIDE-RAG-005, Owner 2026-11-01): a question about Pasuruan's areas as a
// whole ("Apa perbedaan Kota Pasuruan dan Kabupaten Pasuruan?", "area yang didukung aplikasi ini") is
// answered from every map-zone document. The semantic search mixed the five zones with places and the
// judge kept only some, so answers named two of the four Kabupaten zones (runtime 2026-11-01, UMM-01)
// or one zone only (UMM-05).

// RegionOverviewRetriever lists every active map-zone document.
type RegionOverviewRetriever interface {
	RegionDocuments(ctx context.Context) ([]SemanticResult, error)
}

var (
	// cityAndRegencyPattern names both the city and the regency ("Kota … Kabupaten …", "masuk kota atau kabupaten").
	cityAndRegencyPattern = regexp.MustCompile(`(?i)\bkota\b.*\bkabupaten\b|\bkabupaten\b.*\bkota\b`)
	// areaCoveragePattern asks which areas exist ("Wilayah Pasuruan apa saja yang tersedia", "area yang didukung").
	areaCoveragePattern = regexp.MustCompile(`(?i)\b(?:wilayah|area|zona|daerah|kawasan)\b[^.?!]*\b(?:tersedia|didukung|dicakup|tercakup|apa saja|mana saja)\b`)
)

// isRegionOverview reports whether the user's own question asks about the areas as a whole. A question
// that names one zone keeps the zone filter, one that names a domain ("wisata di Kabupaten Pasuruan")
// keeps its search, and a follow-up ("wilayah yang kamu sebutkan") keeps the previous sources.
func isRegionOverview(question string, intent ChatIntent) bool {
	if intent.Region != "" || intent.Domain != "" || backReferencePattern.MatchString(question) {
		return false
	}
	return cityAndRegencyPattern.MatchString(question) || areaCoveragePattern.MatchString(question)
}

// regionOverviewOutcome returns every zone document as the context of a region overview question.
func (s *ChatService) regionOverviewOutcome(ctx context.Context, question string, intent ChatIntent) (relevanceOutcome, bool, error) {
	retriever, ok := s.Retriever.(RegionOverviewRetriever)
	if !ok || !isRegionOverview(question, intent) {
		return relevanceOutcome{}, false, nil
	}
	regions, err := retriever.RegionDocuments(ctx)
	if err != nil || len(regions) == 0 {
		return relevanceOutcome{}, false, err
	}
	return relevanceOutcome{Status: "relevant", Context: regions, Judge: map[string]any{"skipped": "region_overview", "pool_k": 0, "picked_k": 0}}, true, nil
}

// regionSummary states the facts the model got wrong from the zone texts alone (runtime 2026-11-01:
// "Kabupaten … 9 kecamatan", "lima wilayah di Kabupaten Pasuruan: Kota Pasuruan, …"). District counts come
// from regencies/districts (Owner 2026-11-01); the zones are the map rule: the "Kota Pasuruan" zone is the
// city, the other zones divide the regency. Without the tables the counts are left out.
func (s *ChatService) regionSummary(ctx context.Context, zones []SemanticResult) string {
	var rows []struct {
		Name      string
		Districts int
	}
	counts := make(map[string]int)
	if s.DB.WithContext(ctx).Raw(`SELECT r.name AS name, count(d.code) AS districts FROM regencies r JOIN districts d ON d.regency_code = r.code WHERE r.name IN ('Kota Pasuruan', 'Kabupaten Pasuruan') GROUP BY r.name`).Scan(&rows).Error == nil {
		for _, row := range rows {
			counts[row.Name] = row.Districts
		}
	}
	var regencyZones []string
	for _, zone := range zones {
		if name := pointerString(zone.SourceLabel); name != "" && name != "Kota Pasuruan" {
			regencyZones = append(regencyZones, name)
		}
	}
	city := "Kota Pasuruan: wilayah tersendiri, bukan bagian Kabupaten Pasuruan; zona peta Kota Pasuruan"
	if n := counts["Kota Pasuruan"]; n > 0 {
		city += fmt.Sprintf("; %d kecamatan", n)
	}
	regency := "Kabupaten Pasuruan"
	if n := counts["Kabupaten Pasuruan"]; n > 0 {
		regency += fmt.Sprintf(": %d kecamatan", n)
	}
	if len(regencyZones) > 0 {
		regency += fmt.Sprintf("; dibagi menjadi %d zona peta: %s", len(regencyZones), strings.Join(regencyZones, ", "))
	}
	return city + ". " + regency + "."
}
