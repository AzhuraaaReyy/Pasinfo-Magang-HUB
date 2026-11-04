package services

import (
	"regexp"
	"strconv"
	"strings"
)

// Intent kinds; internal only, never sent to the frontend.
const (
	intentFact           = "fact"
	intentList           = "list"
	intentRecommendation = "recommendation"
	intentFollowUp       = "follow_up"
)

const (
	// defaultFactLimit is the retrieval size of a single-answer question (unchanged from before).
	defaultFactLimit = 5
	// defaultListCount is used when a list or recommendation request names no number.
	defaultListCount = 5
	// maxListCount bounds the items of one answer. It protects the prompt size of the local
	// model; it is not a relevance target.
	maxListCount = 10
	// listCandidateExtra is retrieved on top of a list limit so the judge can reject some candidates.
	listCandidateExtra = 5
	// maxRequestedCount caps the stored requested number against absurd input.
	maxRequestedCount = 99
)

// ChatIntent is the server's reading of a question. It holds only what the user wrote and
// never contains database facts.
type ChatIntent struct {
	Kind      string // fact, list, recommendation, follow_up
	Requested int    // number of items asked for; 0 = not a list request
	Domain    string // faq_knowledge_bases.category hint ("wisata", "kuliner", ...) or ""
	FollowUp  bool   // the question refers to an earlier turn
	// SampleFields is true when the user asks about prices, facilities, or menus — the fields
	// that are sample data in the seed. Only then are sample-data lines sent to the model.
	SampleFields bool
	// Region is the map zone the question names ("Pasuruan Barat", "Kota Pasuruan"), or "".
	Region string
}

// zonePattern reads a map zone from the question. "Kota Pasuruan" needs a preceding place word,
// so a place name such as "Taman Kota Pasuruan" is not read as the zone.
var zonePattern = regexp.MustCompile(`(?i)\bpasuruan\s+(barat|timur|utara|selatan)\b|\b(?:bagian|wilayah|daerah|kawasan|zona|area)\s+(barat|timur|utara|selatan)\s+(?:kabupaten\s+)?pasuruan\b|\b(?:di|wilayah|daerah|kawasan|zona|area)\s+(kota\s+pasuruan)\b`)

// detectRegion returns the zone name as stored in regions.name, or "".
func detectRegion(text string) string {
	match := zonePattern.FindStringSubmatch(text)
	if match == nil {
		return ""
	}
	if match[3] != "" {
		return "Kota Pasuruan"
	}
	direction := strings.ToLower(match[1] + match[2])
	return "Pasuruan " + strings.ToUpper(direction[:1]) + direction[1:]
}

func (i ChatIntent) isList() bool { return i.Requested > 0 }

// Limit is the number of distinct sources one answer may present.
func (i ChatIntent) Limit() int {
	if !i.isList() {
		return defaultFactLimit
	}
	return min(i.Requested, maxListCount)
}

// RetrievalLimit is the number of semantic candidates fetched for this intent.
func (i ChatIntent) RetrievalLimit() int {
	if !i.isList() {
		return defaultFactLimit
	}
	return i.Limit() + listCandidateExtra
}

// RetrievalCategory filters a list request to one clearly named domain; "" searches all domains.
func (i ChatIntent) RetrievalCategory() string {
	if !i.isList() {
		return ""
	}
	return i.Domain
}

func (i ChatIntent) metadata() map[string]any {
	return map[string]any{"kind": i.Kind, "requested": i.Requested, "limit": i.Limit(), "domain": i.Domain, "follow_up": i.FollowUp, "sample_fields": i.SampleFields, "region": i.Region}
}

// sampleFieldPattern matches questions about the fields that hold sample data (destination prices
// and facilities, culinary menus). "berapa" alone is not enough ("Jam berapa …?" asks for hours).
var sampleFieldPattern = regexp.MustCompile(`(?i)\b(harga|harganya|tiket|tiketnya|biaya|tarif|bayar|fasilitas|fasilitasnya|parkir|toilet|musholla|mushola|menu|menunya|hidangan)\b`)

var countWords = map[string]int{
	"satu": 1, "dua": 2, "tiga": 3, "empat": 4, "lima": 5, "enam": 6, "tujuh": 7,
	"delapan": 8, "sembilan": 9, "sepuluh": 10, "sebelas": 11, "beberapa": defaultListCount,
}

// countPattern reads a number only when it counts items ("10 rekomendasi", "tiga warung"), so
// years or prices ("2030", "25000 rupiah") are not read as a requested count.
var countPattern = regexp.MustCompile(`(?i)\b(\d{1,3}|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|beberapa)\s+(?:buah\s+|macam\s+|jenis\s+)?(rekomendasi|saran|pilihan|tempat|destinasi|wisata|objek|lokasi|kuliner|makanan|minuman|warung|rumah makan|restoran|kafe|acara|event|festival|agenda|budaya|tradisi|kesenian|berita|artikel|candi|pantai|taman)\b`)

// allItemsPattern reads "semua <tempat/kuliner/acara …>" as a list of the system bound (J4-04, 2026-11-02:
// "koordinat lengkap semua tempat kuliner" listed one place). "semua" alone ("Abaikan semua aturan") is not.
var allItemsPattern = regexp.MustCompile(`(?i)\b(semua|seluruh)\s+(?:\p{L}+\s+){0,2}?(tempat|destinasi|wisata|objek|kuliner|makanan|warung|restoran|rumah makan|kafe|acara|event|festival|agenda|budaya|tradisi|kesenian|candi|museum|pantai|taman|berita|wilayah|zona)\b`)

var listPattern = regexp.MustCompile(`(?i)\b(rekomendasi|rekomendasikan|sarankan|saran|daftar|apa saja|mana saja|pilihan)\b`)

// fieldItemsPattern asks for the items of one place's field ("Fasilitasnya apa saja?"), not for a list of
// places (runtime 2026-11-01: answered as "2 pilihan dari 5 yang Anda minta" instead of the facilities).
var fieldItemsPattern = regexp.MustCompile(`(?i)\b(fasilitas|menu|harga|tiket|tarif|biaya|wahana|jadwal)(?:nya)?\s+(?:apa|mana)\s+saja\b`)

var recommendationPattern = regexp.MustCompile(`(?i)\b(rekomendasi|rekomendasikan|sarankan|saran|cocok untuk|yang cocok)\b`)

// singleEntityPattern marks yes/no questions about one named thing ("Apakah Candi Jawi cocok untuk anak?").
var singleEntityPattern = regexp.MustCompile(`(?i)^\s*(apakah|apa benar)\b`)

var followUpPattern = regexp.MustCompile(`(?i)\b(tadi|tersebut|lokasinya|fasilitasnya|harganya|jadwalnya|alamatnya|koordinatnya)\b`)

type domainRule struct {
	category string
	pattern  *regexp.Regexp
}

var domainRules = []domainRule{
	{"kuliner", regexp.MustCompile(`(?i)\b(kuliner|makan|makanan|minuman|warung|rumah makan|restoran|resto|kafe|cafe|jajanan|oleh-oleh)\b`)},
	{"acara", regexp.MustCompile(`(?i)\b(acara|event|festival|agenda|karnaval|pertunjukan|konser)\b`)},
	{"budaya", regexp.MustCompile(`(?i)\b(budaya|tradisi|kesenian|tarian|adat)\b`)},
	{"berita", regexp.MustCompile(`(?i)\b(berita|artikel)\b`)},
	{"wisata", regexp.MustCompile(`(?i)\b(wisata|destinasi|objek wisata|tempat liburan|pantai|air terjun|gunung|taman)\b`)},
}

// detectDomain returns one category only when the question names exactly one domain.
// "wisata kuliner" is culinary; any other mix is ambiguous and searches all domains.
func detectDomain(text string) string {
	var found []string
	for _, rule := range domainRules {
		if rule.pattern.MatchString(text) {
			found = append(found, rule.category)
		}
	}
	if len(found) == 2 && found[0] == "kuliner" && found[1] == "wisata" {
		return "kuliner"
	}
	if len(found) != 1 {
		return ""
	}
	return found[0]
}

// parseIntent reads kind, requested count, and domain from the user's own words.
func parseIntent(question string) ChatIntent {
	intent := ChatIntent{Kind: intentFact, Domain: detectDomain(question), FollowUp: followUpPattern.MatchString(question) || ordinalPattern.MatchString(question), SampleFields: sampleFieldPattern.MatchString(question), Region: detectRegion(question)}
	recommendation := recommendationPattern.MatchString(question) && !singleEntityPattern.MatchString(question)
	if match := countPattern.FindStringSubmatch(question); match != nil {
		word := strings.ToLower(match[1])
		count, ok := countWords[word]
		if !ok {
			count, _ = strconv.Atoi(word)
		}
		if count >= 1 {
			intent.Requested = min(count, maxRequestedCount)
		}
	}
	if intent.Requested == 0 && allItemsPattern.MatchString(question) {
		intent.Requested = maxListCount
	}
	if intent.Requested == 0 && (recommendation || (listPattern.MatchString(question) && !fieldItemsPattern.MatchString(question))) {
		intent.Requested = defaultListCount
	}
	switch {
	case intent.isList() && recommendation:
		intent.Kind = intentRecommendation
	case intent.isList():
		intent.Kind = intentList
	case intent.FollowUp:
		intent.Kind = intentFollowUp
	}
	return intent
}
