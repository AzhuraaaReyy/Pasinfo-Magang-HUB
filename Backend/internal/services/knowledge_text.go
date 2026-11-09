package services

import (
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"

	"wildan-news-backend/internal/models"
)

// maxEmbeddingRunes bounds a corpus document. embeddinggemma reads at most 2048 tokens and cut the rest without an
// error, so the Kategori/Sumber/Tanggal lines of 21 long news never reached their vectors (jobdesk 4 Nov p2,
// 2026-11-04); fitDocument keeps those lines and cuts the body after a full sentence. The chat context has the
// same bound (maxContextRunes), so the model loses nothing it was given before.
const maxEmbeddingRunes = 6000

var (
	knowledgeSpaces = regexp.MustCompile(`[ \t]+`)
	// joinedSentence finds two sentences without a space, as scraped news paragraphs are joined ("bahasanya.Ada").
	joinedSentence = regexp.MustCompile(`([a-z0-9][.!?])([A-Z][a-z])`)
	blankLines     = regexp.MustCompile(`\n{3,}`)
)

// normalizeKnowledgeText makes a corpus document consistent before it is embedded (jobdesk 4 Nov p2, Owner option A):
// invisible characters and non-breaking spaces become plain, every line is trimmed with single spaces, joined sentences
// get their space back, at most one blank line remains, and a long document is fitted to maxEmbeddingRunes. Words,
// numbers, and field labels are kept as they are.
func normalizeKnowledgeText(text string) string {
	text = strings.NewReplacer("\r\n", "\n", "\r", "\n", "\u00a0", " ", "\u200b", "", "\ufeff", "").Replace(text)
	lines := strings.Split(text, "\n")
	for i, line := range lines {
		lines[i] = joinedSentence.ReplaceAllString(strings.TrimSpace(knowledgeSpaces.ReplaceAllString(line, " ")), "$1 $2")
	}
	text = strings.TrimSpace(blankLines.ReplaceAllString(strings.Join(lines, "\n"), "\n\n"))
	text, _ = fitDocument(text, maxEmbeddingRunes)
	return text
}

// sampleDataLabel marks seed values that are dummy data (Frontend data-wisata.js / data-kuliner.js
// headers): destination prices and facilities, culinary menus.
const sampleDataLabel = "(data contoh, belum terverifikasi)"

// bodyText prefers the full description; short_description is only an excerpt of it.
func bodyText(shortDescription, description string) string {
	if strings.TrimSpace(description) != "" {
		return description
	}
	return shortDescription
}

// operationalStatusLabels are the Indonesian words of the schema.md operational status codes (§12, Owner 2026-11-09):
// the corpus feeds the answers, which use plain Indonesian without codes. "unknown" and other values give no line.
var operationalStatusLabels = map[string]string{"open": "Buka", "temporarily_closed": "Tutup sementara", "closed": "Tutup permanen"}

func operationalStatusLabel(code string) string {
	return operationalStatusLabels[strings.TrimSpace(code)]
}

func appendLine(b *strings.Builder, label, value string) {
	if strings.TrimSpace(value) != "" {
		b.WriteString("\n" + label + ": " + value)
	}
}

func appendPlace(b *strings.Builder, place *models.Place, region string) {
	if place != nil {
		appendLine(b, "Alamat", place.Address)
	}
	appendLine(b, "Wilayah", region)
	if place != nil && (place.Latitude != 0 || place.Longitude != 0) {
		fmt.Fprintf(b, "\nKoordinat: %.7f, %.7f", place.Latitude, place.Longitude)
	}
}

var indonesianWeekdays = [7]string{"Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"}

// openingHoursText writes the opening_hours rows as one line: "setiap hari 08.00–17.00 WIB" when every day is the same,
// else one part per day ("Senin 08.00–17.00 WIB, Minggu tutup"). Owner 2026-11-09: the seed hours are used as they are,
// without a sample-data label, until the Owner replaces them.
func openingHoursText(hours []models.OpeningHour) string {
	if len(hours) == 0 {
		return ""
	}
	sorted := append([]models.OpeningHour(nil), hours...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].DayOfWeek < sorted[j].DayOfWeek })
	day := func(h models.OpeningHour) string {
		switch {
		case h.IsClosed:
			return "tutup"
		case h.Is24Hours:
			return "24 jam"
		default:
			return h.OpensAt.In(wib).Format("15.04") + "–" + h.ClosesAt.In(wib).Format("15.04") + " WIB"
		}
	}
	same := len(sorted) == 7
	for _, h := range sorted[1:] {
		same = same && day(h) == day(sorted[0])
	}
	if same {
		return "setiap hari " + day(sorted[0])
	}
	// Monday first, Sunday last, as Indonesian schedules are read.
	var parts []string
	for _, i := range []int{1, 2, 3, 4, 5, 6, 0} {
		for _, h := range sorted {
			if h.DayOfWeek == i {
				parts = append(parts, indonesianWeekdays[i]+" "+day(h))
			}
		}
	}
	return strings.Join(parts, ", ")
}

func culinaryKnowledgeText(c models.Culinary, region string) string {
	var b strings.Builder
	b.WriteString(bodyText(c.ShortDescription, c.Description))
	appendLine(&b, "Jenis", c.CulinaryType)
	appendLine(&b, "Status operasional", operationalStatusLabel(c.OperationalStatus))
	appendPlace(&b, c.Place, region)
	appendLine(&b, "Jam buka", openingHoursText(c.Hours))
	// The seed price range is used as it is during development (Owner 2026-11-09), like the opening hours.
	appendLine(&b, "Kisaran harga", c.PriceRange)
	for _, menu := range c.Menus {
		b.WriteString("\nMenu " + sampleDataLabel + ": " + menu.Name)
		if menu.Category != "" {
			b.WriteString(" (" + menu.Category + ")")
		}
		if menu.Description != nil {
			b.WriteString(" - " + *menu.Description)
		}
		if menu.Price != nil {
			fmt.Fprintf(&b, " - Harga: %.0f", *menu.Price)
		}
	}
	return b.String()
}

func cultureKnowledgeText(c models.Culture, region string) string {
	var b strings.Builder
	b.WriteString(bodyText(c.ShortDescription, c.Description))
	appendLine(&b, "Jenis", c.CultureType)
	appendLine(&b, "Periode sejarah", c.HistoricalPeriod)
	appendPlace(&b, c.Place, region)
	return b.String()
}

func eventKnowledgeText(e models.Event, region string) string {
	var b strings.Builder
	b.WriteString(bodyText(e.ShortDescription, e.Description))
	appendLine(&b, "Jenis", e.EventType)
	if e.OrganizerName != nil {
		appendLine(&b, "Penyelenggara", *e.OrganizerName)
	}
	appendPlace(&b, e.Place, region)
	for _, occurrence := range e.Occurrences {
		// Always in WIB: the text must not depend on the process time zone (a UTC container wrote
		// "2025-02-07T17:00:00Z" for the same instant and re-embedded every event, 2026-10-31).
		b.WriteString("\nJadwal: " + occurrence.StartsAt.In(wib).Format(time.RFC3339))
		if occurrence.EndsAt != nil {
			b.WriteString(" s.d. " + occurrence.EndsAt.In(wib).Format(time.RFC3339))
		}
		if occurrence.Status != nil {
			b.WriteString(" (status: " + *occurrence.Status + ")")
		}
	}
	for _, ticket := range e.Tickets {
		b.WriteString("\nTiket: " + ticket.Name)
		if ticket.Price != nil {
			fmt.Fprintf(&b, " - Harga: %.0f", *ticket.Price)
		}
		if ticket.Description != nil && strings.TrimSpace(*ticket.Description) != "" {
			b.WriteString(" - " + strings.TrimSpace(*ticket.Description))
		}
	}
	return b.String()
}

func destinationKnowledgeText(d models.Destination) string {
	var b strings.Builder
	b.WriteString(bodyText(d.ShortDescription, d.Description))
	appendLine(&b, "Kategori", d.TravelCategory.Name)
	appendLine(&b, "Status operasional", operationalStatusLabel(d.OperationalStatus))
	appendLine(&b, "Jam buka", openingHoursText(d.Hours))
	appendLine(&b, "Alamat", d.Place.Address)
	var area []string
	for _, part := range []string{d.Place.Village, d.Place.District, d.Place.Regency} {
		if strings.TrimSpace(part) != "" {
			area = append(area, strings.TrimSpace(part))
		}
	}
	// A regency alone ("Pasuruan") says nothing the Region line does not, so it is not written.
	if strings.TrimSpace(d.Place.Village) != "" || strings.TrimSpace(d.Place.District) != "" {
		appendLine(&b, "Wilayah", strings.Join(area, ", "))
	}
	appendLine(&b, "Region", d.Region.Name)
	if d.Place.Latitude != 0 || d.Place.Longitude != 0 {
		fmt.Fprintf(&b, "\nKoordinat: %.7f, %.7f", d.Place.Latitude, d.Place.Longitude)
	}
	for _, facility := range d.Facilities {
		b.WriteString("\nFasilitas " + sampleDataLabel + ": " + facility.Name)
		if facility.Note != nil && *facility.Note != "" {
			b.WriteString(" - " + *facility.Note)
		}
	}
	for _, price := range d.Prices {
		fmt.Fprintf(&b, "\nHarga %s: %s %.0f", sampleDataLabel, price.Name, price.Price)
		if price.Description != nil && *price.Description != "" {
			b.WriteString(" - " + *price.Description)
		}
	}
	return b.String()
}

// newsKnowledgeText is the body of a news item (the excerpt when set, else the content) with its
// category and source. published_at is empty in staging, so the date is the one the item was added
// to the database, labelled as such (Owner decision 2026-10-31, option 1A).
func newsKnowledgeText(n models.News) string {
	var b strings.Builder
	if n.Excerpt != nil && strings.TrimSpace(*n.Excerpt) != "" {
		b.WriteString(*n.Excerpt)
	} else {
		b.WriteString(n.Content)
	}
	appendLine(&b, "Kategori berita", newsCategoryLabel(n.Category.Name))
	appendLine(&b, "Sumber", n.Source)
	// The news fetch stores the source's publication time (isoDate) in created_at, and since 2026-11-01
	// also in published_at; the date is the publication date, not the time it was added (Owner 2026-11-01).
	published := n.CreatedAt
	if n.PublishedAt != nil && !n.PublishedAt.IsZero() {
		published = *n.PublishedAt
	}
	if !published.IsZero() {
		appendLine(&b, "Tanggal terbit", indonesianDate(published.In(wib)))
	}
	return b.String()
}

// newsCategoryLabel writes a categories.name ("POLITIK") as a word ("Politik").
func newsCategoryLabel(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	if name == "" {
		return ""
	}
	return strings.ToUpper(name[:1]) + name[1:]
}
