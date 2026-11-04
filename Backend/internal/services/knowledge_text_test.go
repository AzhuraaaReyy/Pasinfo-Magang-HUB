package services

import (
	"strings"
	"testing"
	"time"

	"wildan-news-backend/internal/models"
)

func strP(v string) *string     { return &v }
func floatP(v float64) *float64 { return &v }

func TestCulinaryKnowledgeTextIncludesPlaceRegionAndLabelsSampleMenus(t *testing.T) {
	c := models.Culinary{
		Name: "Nasi Punel Bu Hj. Lin", ShortDescription: "Ringkas.", Description: "Deskripsi lengkap nasi punel.", CulinaryType: "tradisional",
		Place: &models.Place{Address: "Gempeng, Kec. Bangil", Latitude: -7.600565, Longitude: 112.789212},
		Menus: []models.CulinaryMenu{{Name: "Nasi Punel", Category: "Makanan", Description: strP("nasi dengan lauk"), Price: floatP(25000)}},
	}
	got := culinaryKnowledgeText(c, "Pasuruan Utara")
	for _, want := range []string{"Deskripsi lengkap nasi punel.", "\nJenis: tradisional", "\nAlamat: Gempeng, Kec. Bangil", "\nWilayah: Pasuruan Utara", "\nKoordinat: -7.6005650, 112.7892120", "\nMenu (data contoh, belum terverifikasi): Nasi Punel (Makanan) - nasi dengan lauk - Harga: 25000"} {
		if !strings.Contains(got, want) {
			t.Fatalf("missing %q in:\n%s", want, got)
		}
	}
	if strings.Contains(got, "Ringkas.") {
		t.Fatal("the full description must be used when it exists")
	}
}

func TestKnowledgeTextOmitsEmptyFields(t *testing.T) {
	got := cultureKnowledgeText(models.Culture{Name: "Tari", ShortDescription: "Tarian daerah."}, "")
	if got != "Tarian daerah." {
		t.Fatalf("got %q", got)
	}
	for _, label := range []string{"Alamat:", "Wilayah:", "Koordinat:", "Jenis:"} {
		if strings.Contains(got, label) {
			t.Fatalf("empty field produced %q", label)
		}
	}
}

func TestEventKnowledgeTextIncludesOrganizerOnlyWhenPresent(t *testing.T) {
	status := "completed"
	e := models.Event{
		Name: "Kirab", Description: "Kirab pataka.", EventType: "sejarah", OrganizerName: strP("Pemkot Pasuruan"),
		Place:       &models.Place{Address: "Kantor Wali Kota", Latitude: -7.6474192, Longitude: 112.9084766},
		Occurrences: []models.EventOccurrence{{StartsAt: time.Date(2026, 2, 1, 7, 0, 0, 0, time.UTC), Status: &status}},
		Tickets:     []models.EventTicket{{Name: "Gratis"}},
	}
	got := eventKnowledgeText(e, "Kota Pasuruan")
	for _, want := range []string{"\nJenis: sejarah", "\nPenyelenggara: Pemkot Pasuruan", "\nAlamat: Kantor Wali Kota", "\nWilayah: Kota Pasuruan", "\nJadwal: 2026-02-01T14:00:00+07:00 (status: completed)", "\nTiket: Gratis"} {
		if !strings.Contains(got, want) {
			t.Fatalf("missing %q in:\n%s", want, got)
		}
	}
	e.OrganizerName = nil
	if strings.Contains(eventKnowledgeText(e, ""), "Penyelenggara:") {
		t.Fatal("organizer label without value")
	}
}

func TestDestinationKnowledgeTextLabelsSampleFacilitiesAndPrices(t *testing.T) {
	d := models.Destination{
		Name: "Candi Jawi", Description: "Candi peninggalan Singasari.",
		Place:      models.Place{Address: "Candiwates, Prigen", Latitude: -7.66, Longitude: 112.66},
		Facilities: []models.Facility{{Name: "Parkir"}},
		Prices:     []models.DestinationPrice{{Name: "Tiket Masuk", Price: 10000}},
	}
	got := destinationKnowledgeText(d)
	for _, want := range []string{"Candi peninggalan Singasari.", "\nAlamat: Candiwates, Prigen", "\nFasilitas (data contoh, belum terverifikasi): Parkir", "\nHarga (data contoh, belum terverifikasi): Tiket Masuk 10000"} {
		if !strings.Contains(got, want) {
			t.Fatalf("missing %q in:\n%s", want, got)
		}
	}
}

// Sample data is labelled by the backend note, not by a prompt rule (owner decision 2026-10-30).
func TestSampleDataNoteExplainsSampleDataLabel(t *testing.T) {
	if !strings.Contains(sampleDataNote, "data contoh dan belum terverifikasi") {
		t.Fatal("the sample-data note must say the data is unverified sample data")
	}
}

func TestDestinationKnowledgeTextAddsLoadedCategoryAndCleanArea(t *testing.T) {
	d := models.Destination{
		Name: "Taman Kota Pasuruan", Description: "Taman kota.", OperationalStatus: "buka",
		TravelCategory: models.TravelCategory{Name: "Keluarga"},
		Place:          models.Place{Regency: "Pasuruan"},
	}
	got := destinationKnowledgeText(d)
	for _, want := range []string{"\nKategori: Keluarga", "\nStatus operasional: buka"} {
		if !strings.Contains(got, want) {
			t.Fatalf("missing %q in:\n%s", want, got)
		}
	}
	if strings.Contains(got, "Wilayah:") {
		t.Fatalf("regency-only area written: %s", got)
	}
	d.Place.District = "Kec. Pandaan"
	if got = destinationKnowledgeText(d); !strings.Contains(got, "\nWilayah: Kec. Pandaan, Pasuruan") || strings.Contains(got, ", ,") {
		t.Fatalf("area with district not written cleanly: %s", got)
	}
	if empty := destinationKnowledgeText(models.Destination{Description: "x"}); strings.Contains(empty, "Kategori:") || strings.Contains(empty, "Wilayah:") || strings.Contains(empty, "Status operasional:") {
		t.Fatalf("empty fields produced labels: %q", empty)
	}
}

func TestCultureAndEventKnowledgeTextAddPeriodAndEndDate(t *testing.T) {
	culture := cultureKnowledgeText(models.Culture{Description: "Candi.", HistoricalPeriod: "Singasari"}, "")
	if !strings.Contains(culture, "\nPeriode sejarah: Singasari") {
		t.Fatalf("period missing: %q", culture)
	}
	end := time.Date(2026, 2, 3, 17, 0, 0, 0, time.UTC)
	event := eventKnowledgeText(models.Event{Description: "Pameran.", Occurrences: []models.EventOccurrence{{StartsAt: time.Date(2026, 2, 1, 7, 0, 0, 0, time.UTC), EndsAt: &end}}}, "")
	// Written in WIB whatever the input zone or process time zone.
	if !strings.Contains(event, "\nJadwal: 2026-02-01T14:00:00+07:00 s.d. 2026-02-04T00:00:00+07:00") {
		t.Fatalf("end date missing: %q", event)
	}
}

// Missing optional fields are left out of the corpus (never filled); the answer prompt then tells
// the model to say the information is not available (plan Task 2 Step 5).
func TestKnowledgeTextNeverFillsMissingOptionalFieldsPerDomain(t *testing.T) {
	cases := map[string]struct {
		sourceType string
		text       string
		absent     []string
	}{
		"destination":                {"destination", destinationKnowledgeText(models.Destination{Description: "Taman."}), []string{"Harga", "Fasilitas", "Kategori:", "Status operasional:", "Alamat:", "Koordinat:"}},
		"culinary":                   {"culinary", culinaryKnowledgeText(models.Culinary{Description: "Warung."}, ""), []string{"Menu", "Harga", "Jenis:", "Alamat:", "Wilayah:"}},
		"culture":                    {"culture", cultureKnowledgeText(models.Culture{Description: "Tari."}, ""), []string{"Periode sejarah:", "Jenis:", "Alamat:"}},
		"event":                      {"event", eventKnowledgeText(models.Event{Description: "Pameran."}, ""), []string{"Penyelenggara:", "Jadwal:", "Tiket:", "Harga", "status:"}},
		"event ticket without price": {"event", eventKnowledgeText(models.Event{Description: "Pameran.", Tickets: []models.EventTicket{{Name: "Reguler"}}}, ""), []string{"Harga"}},
	}
	for name, c := range cases {
		for _, label := range c.absent {
			if strings.Contains(c.text, label) {
				t.Errorf("%s: missing field produced %q in %q", name, label, c.text)
			}
		}
		prompt := protectedSystemPrompt(parseIntent("Berapa harganya?"), buildRAGContext([]SemanticResult{source(c.sourceType, 1, "Sumber Uji", c.text, 0.7)}, defaultFactLimit, maxContextRunes, false), testToday)
		if !strings.Contains(prompt, "belum tersedia di database kami") || !strings.Contains(prompt, "jangan mengarang fakta, harga, jadwal") {
			t.Errorf("%s: unavailable-field rule missing from prompt", name)
		}
	}
}

func TestEventKnowledgeTextIncludesTicketDescription(t *testing.T) {
	got := eventKnowledgeText(models.Event{Description: "Pameran.", Tickets: []models.EventTicket{{Name: "Konser malam", Price: floatP(0), Description: strP("Konser musik gratis (edisi 2026).")}}}, "")
	if !strings.Contains(got, "\nTiket: Konser malam - Harga: 0 - Konser musik gratis (edisi 2026).") {
		t.Fatalf("ticket line = %q", got)
	}
}
