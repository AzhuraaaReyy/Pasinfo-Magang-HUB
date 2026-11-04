package services

import (
	"regexp"
	"strconv"
	"strings"
)

// noReferenceAnswer is the fixed clarification for a first message that points back to something
// ("Berapa harganya?", "Tempat itu buka jam berapa?") while the conversation has nothing before it.
const noReferenceAnswer = "Maaf, saya belum tahu tempat, acara, atau topik yang Anda maksud karena belum ada percakapan sebelumnya. Boleh sebutkan namanya? Saya bisa membantu informasi wisata, kuliner, budaya, acara, dan berita di Pasuruan."

// capabilityAnswer is the fixed reply to a question about the assistant itself ("Apa saja yang bisa kamu bantu?").
// The model listed its domains as numbered items without context, so grounding replaced the answer with "Maaf,
// informasi tersebut belum tersedia…" (E2E-F3, jobdesk 30 Okt, 2026-11-03).
const capabilityAnswer = "Saya Pasinfo Travel Assistant. Saya bisa membantu Anda mencari informasi seputar Pasuruan dari database Pasuruan Info:\n1. Destinasi wisata\n2. Kuliner\n3. Budaya dan tradisi\n4. Jadwal acara\n5. Informasi wilayah Kota dan Kabupaten Pasuruan\n6. Berita\n\nCoba tanyakan, misalnya, \"Rekomendasikan wisata alam di Pasuruan\" atau \"Ada acara apa bulan ini?\""

// capabilityPattern matches questions about what the assistant can do or who it is.
var capabilityPattern = regexp.MustCompile(`(?i)\b(?:apa(?:\s+saja)?\s+yang\s+(?:bisa|dapat)\s+(?:kamu|anda|kau)\s+(?:bantu|lakukan)|(?:kamu|anda|kau)\s+bisa\s+(?:bantu\s+|membantu\s+)?apa(?:\s+saja)?|bisa\s+(?:bantu|membantu)\s+apa(?:\s+saja)?|siapa\s+(?:kamu|anda)|(?:kamu|anda)\s+(?:itu\s+)?siapa)\b`)

// asksCapability reports a question about the assistant itself that names no domain, zone, or place.
func asksCapability(question string, intent ChatIntent) bool {
	return capabilityPattern.MatchString(question) && intent.Domain == "" && intent.Region == "" && !namesPlace(question)
}

// ordinalPattern finds a position in the previous answer's list: "yang pertama", "nomor 2", "yang terakhir".
var ordinalPattern = regexp.MustCompile(`(?i)\b(?:yang|nomor|no\.?)\s*(pertama|kedua|ketiga|keempat|kelima|keenam|ketujuh|kedelapan|kesembilan|kesepuluh|terakhir|\d{1,2})\b`)

// ordinalLast marks "yang terakhir" for ordinalIndex.
const ordinalLast = 1 << 20

var ordinalWords = map[string]int{"pertama": 0, "kedua": 1, "ketiga": 2, "keempat": 3, "kelima": 4, "keenam": 5, "ketujuh": 6, "kedelapan": 7, "kesembilan": 8, "kesepuluh": 9, "terakhir": ordinalLast}

// ordinalIndex returns the zero-based list position the question names, ordinalLast, or -1.
func ordinalIndex(question string) int {
	match := ordinalPattern.FindStringSubmatch(question)
	if match == nil {
		return -1
	}
	word := strings.ToLower(match[1])
	if n, ok := ordinalWords[word]; ok {
		return n
	}
	if n, err := strconv.Atoi(word); err == nil && n >= 1 {
		return n - 1
	}
	return -1
}

// unresolvedReference reports a question that only points back (back-reference, "-nya" field, "tempat itu",
// list position) and names no domain, zone, or place of its own, so without history it has no subject.
func unresolvedReference(question string, intent ChatIntent) bool {
	if intent.Domain != "" || intent.Region != "" || namesPlace(question) {
		return false
	}
	if backReferencePattern.MatchString(question) || previousFieldPattern.MatchString(question) || ordinalPattern.MatchString(question) {
		return true
	}
	return demonstrativePattern.MatchString(question)
}

// namesPlace reports a capitalized word after the first one ("Berapa harga tiket Candi Jawi?").
func namesPlace(question string) bool {
	for i, field := range strings.Fields(question) {
		word := strings.TrimFunc(field, notWordRune)
		if i > 0 && word != "" && word[0] >= 'A' && word[0] <= 'Z' {
			return true
		}
	}
	return false
}
