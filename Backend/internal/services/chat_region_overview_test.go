package services

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"wildan-news-backend/internal/models"
)

func TestRegionOverviewDetection(t *testing.T) {
	cases := map[string]bool{
		"Apa perbedaan Kota Pasuruan dan Kabupaten Pasuruan?":                                        true,  // UMM-01
		"Wilayah Pasuruan apa saja yang tersedia dalam basis data?":                                  true,  // UMM-02
		"Pasuruan itu masuk kota atau kabupaten?":                                                    true,  // UMM-03
		"Saya sedang menyusun rencana perjalanan dan ingin tahu area yang didukung aplikasi ini.":    true,  // UMM-05
		"Saya ingin mencari wisata di bagian selatan Pasuruan. Informasi wilayah apa yang tersedia?": false, // UMM-04: one zone
		"Dari wilayah yang kamu sebutkan, mana yang memiliki data kuliner dan budaya?":               false, // UMM-06: follow-up
		"Wisata apa saja di Kabupaten Pasuruan?":                                                     false, // a domain
		"Berapa jumlah penduduk Pasuruan saat ini?":                                                  false, // UMM-07
		"Di mana lokasi Candi Jawi?":                                                                 false,
	}
	for question, want := range cases {
		if got := isRegionOverview(question, parseIntent(question)); got != want {
			t.Errorf("%q: overview=%v, want %v", question, got, want)
		}
	}
}

// overviewRetriever is a fake retriever whose semantic search returns one zone and one place, and
// which lists every zone document.
type overviewRetriever struct {
	fakeRetriever
	zones []SemanticResult
}

func (r *overviewRetriever) RegionDocuments(context.Context) ([]SemanticResult, error) {
	return r.zones, nil
}

// Runtime 2026-11-01 (UMM-01): only two of the four Kabupaten zones reached the context.
func TestRegionOverviewUsesEveryZone(t *testing.T) {
	var zones []SemanticResult
	for i, name := range []string{"Kota Pasuruan", "Pasuruan Timur", "Pasuruan Barat", "Pasuruan Utara", "Pasuruan Selatan"} {
		zone := source("region", int64(i+1), name, "Zona "+name+".", 0.7)
		zone.RelevanceStatus = "relevant"
		zones = append(zones, zone)
	}
	retriever := &overviewRetriever{fakeRetriever: fakeRetriever{results: []SemanticResult{zones[0], source("destination", 35, "Taman Kota Pasuruan", "Taman.", 0.5)}}, zones: zones}
	provider := &recordingProvider{stubProvider: stubProvider{name: "ollama:chat"}}
	service := NewChatService(newChatTestDB(t), provider, time.Second, retriever)
	service.Now = func() time.Time { return testToday }
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 89}, "Apa perbedaan Kota Pasuruan dan Kabupaten Pasuruan?")
	if err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	for _, zone := range zones {
		if !strings.Contains(system, "NAMA: "+pointerString(zone.SourceLabel)) {
			t.Fatalf("zone %s missing:\n%s", pointerString(zone.SourceLabel), system)
		}
	}
	if !strings.Contains(system, "RINGKASAN_WILAYAH (data): Kota Pasuruan: wilayah tersendiri") {
		t.Fatalf("region summary missing from the prompt:\n%s", system)
	}
	if strings.Contains(system, "Taman Kota Pasuruan") {
		t.Fatalf("a place is not part of a region overview:\n%s", system)
	}
	var meta map[string]any
	_ = json.Unmarshal(result.Assistant.Metadata, &meta)
	if judge, _ := meta["judge"].(map[string]any); judge["skipped"] != "region_overview" || meta["context_k"] != float64(5) {
		t.Fatalf("meta=%v", meta)
	}
}

// Runtime 2026-11-01: the model counted "9 kecamatan" for the regency and put the city inside it.
func TestRegionSummaryUsesDistrictCountsAndZoneSplit(t *testing.T) {
	db := newChatTestDB(t)
	if err := db.AutoMigrate(&models.Regency{}, &models.District{}); err != nil {
		t.Fatal(err)
	}
	db.Create(&[]models.Regency{{Code: "35.14", Name: "Kabupaten Pasuruan"}, {Code: "35.75", Name: "Kota Pasuruan"}})
	db.Create(&[]models.District{{Code: "35.14.01", Name: "Bangil", RegencyCode: "35.14"}, {Code: "35.14.02", Name: "Pandaan", RegencyCode: "35.14"}, {Code: "35.75.01", Name: "Gadingrejo", RegencyCode: "35.75"}})
	service := NewChatService(db, &recordingProvider{stubProvider: stubProvider{name: "test"}}, time.Second, &fakeRetriever{})
	zones := []SemanticResult{source("region", 1, "Kota Pasuruan", "", 0.7), source("region", 4, "Pasuruan Utara", "", 0.7), source("region", 3, "Pasuruan Barat", "", 0.7)}
	got := service.regionSummary(context.Background(), zones)
	want := "Kota Pasuruan: wilayah tersendiri, bukan bagian Kabupaten Pasuruan; zona peta Kota Pasuruan; 1 kecamatan. Kabupaten Pasuruan: 2 kecamatan; dibagi menjadi 2 zona peta: Pasuruan Utara, Pasuruan Barat."
	if got != want {
		t.Fatalf("summary =\n%s\nwant\n%s", got, want)
	}
}

func TestInlineDomainLabelIsRemoved(t *testing.T) {
	answer := "1. **Pura Sasana Siwa Murti:** (DOMAIN: Budaya) Situs sejarah.\n2. **Sedaeng:** (DOMAIN: Wisata (destinasi)) Kampung budaya."
	included := []SemanticResult{source("culture", 22, "Pura Sasana Siwa Murti", "Situs.", 0.7), source("destination", 55, "Sedaeng", "Kampung.", 0.7)}
	got, _ := groundAnswer(answer, parseIntent("Mana yang punya budaya?"), ragContext{Included: included}, included, "")
	if strings.Contains(got, "DOMAIN") || strings.Contains(got, "(destinasi)") || !strings.Contains(got, "Situs sejarah.") {
		t.Fatalf("got %q", got)
	}
}

// Runtime 2026-11-02 (jobdesk 23 Okt point 4, itinerary): the label came back misspelled.
func TestMisspelledInlineDomainLabelIsRemoved(t *testing.T) {
	answer := "1. **Pagi:** Kunjungi **Prasasti Pendirian Pasuruan** (DOMIN: Wisata (destinasi)). Lokasinya di Gempol."
	included := []SemanticResult{source("destination", 52, "Prasasti Pendirian Pasuruan", "Monumen.", 0.7)}
	got, _ := groundAnswer(answer, parseIntent("Bagaimana menyusun itinerary wisata satu hari di Pasuruan?"), ragContext{Included: included}, included, "")
	if strings.Contains(got, "DOMIN") || strings.Contains(got, "(destinasi)") || !strings.Contains(got, "**Prasasti Pendirian Pasuruan**. Lokasinya di Gempol.") {
		t.Fatalf("got %q", got)
	}
}
