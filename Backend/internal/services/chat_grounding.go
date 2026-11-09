package services

import (
	"fmt"
	"regexp"
	"slices"
	"sort"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"
)

// noSourceFallbackAnswer replaces a no-source reply that named a place absent from the context.
const noSourceFallbackAnswer = "Mohon maaf, informasi tersebut belum tersedia di database kami. Saya siap membantu mencari informasi wisata, kuliner, budaya, acara, atau berita di Pasuruan berdasarkan nama tempat, kategori, atau wilayahnya."

// sampleDataNote is appended when sample prices, facilities, or menus were given to the model.
const sampleDataNote = "\n\nCatatan: informasi harga, fasilitas, atau menu di atas masih data contoh dan belum terverifikasi, jadi sebaiknya dicek kembali ke pengelola tempat."

// openingHoursUnavailable replaces opening-time claims that the context does not support.
const openingHoursUnavailable = "Informasi jam buka tempat ini belum tersedia di database kami."

// unverifiedPlaceNote is appended when the answer names a place whose verification status is still
// pending (corpus line "Status verifikasi: belum terverifikasi"; Owner 2026-11-02, option 1A).
const unverifiedPlaceNote = "\n\nCatatan: informasi tempat di atas belum terverifikasi, jadi sebaiknya dicek kembali ke pengelola sebelum berkunjung."

// unverifiedSampleNote combines unverifiedPlaceNote and sampleDataNote.
const unverifiedSampleNote = "\n\nCatatan: informasi tempat di atas belum terverifikasi, dan harga, fasilitas, atau menu masih data contoh, jadi sebaiknya dicek kembali ke pengelola sebelum berkunjung."

// itineraryNote is appended to an itinerary answer: the database has no travel times (Owner 2026-11-02,
// option 2A; smart itinerary planning is out of scope, AGENTS.md §13).
const itineraryNote = "\n\nCatatan: waktu tempuh antar lokasi belum tersedia di database kami, jadi sesuaikan urutan dan jam kunjungan dengan perjalanan Anda."

var itineraryPattern = regexp.MustCompile(`(?i)\b(itinerary|itinerari|rencana perjalanan|jadwal perjalanan|rute perjalanan|rute wisata)\b`)

// unverifiedStatusLine is the corpus line of a pending record (Retriever.verificationLine).
const unverifiedStatusLine = "Status verifikasi: belum terverifikasi"

// mentionsUnverifiedPlace reports whether the answer names a context document whose status is pending.
func mentionsUnverifiedPlace(answer string, included []SemanticResult) bool {
	for _, doc := range included {
		if strings.Contains(doc.Answer, unverifiedStatusLine) && namesSource(answer, "", doc) {
			return true
		}
	}
	return false
}

// withItineraryNote adds itineraryNote to a grounded itinerary answer built from context documents.
func withItineraryNote(answer, question string, grounding map[string]any, hasContext bool) string {
	if !hasContext || grounding == nil || grounding["fallback"] == true || !itineraryPattern.MatchString(question) || strings.Contains(answer, strings.TrimSpace(itineraryNote)) {
		return answer
	}
	grounding["itinerary_note"] = true
	return answer + itineraryNote
}

// withoutUnsupportedFacilities answers a facility question with "not available" when no context document has
// a Fasilitas line: gemma3:4b listed a menu as facilities despite the prompt rule (J4-10, 2026-11-02). The
// note offers the fields the documents do hold. asksFacility is the reader plan's info=facility (T15, audit 2026-11-08):
// the former keyword "fasilitas" missed 7 facility questions in the DB and matched 6 pasted answers that were not.
func withoutUnsupportedFacilities(answer string, asksFacility bool, included []SemanticResult, grounding map[string]any) string {
	if len(included) == 0 || !asksFacility {
		return answer
	}
	var names []string
	hasMenu := false
	for _, doc := range included {
		if strings.Contains(doc.Answer, "\nFasilitas") {
			return answer
		}
		hasMenu = hasMenu || strings.Contains(doc.Answer, "\nMenu")
		if name := pointerString(doc.SourceLabel); name != "" && !slices.Contains(names, name) {
			names = append(names, name)
		}
	}
	reply := "Informasi fasilitas " + strings.Join(names, ", ") + " belum tersedia di database kami."
	if hasMenu {
		reply += " Yang tercatat antara lain alamat dan menu (data contoh, belum terverifikasi); silakan tanyakan bila ingin tahu."
	} else {
		reply += " Anda bisa menanyakan informasi lain yang tercatat, misalnya alamat atau deskripsi tempatnya."
	}
	if grounding != nil {
		grounding["facility_unavailable"] = true
	}
	return reply
}

// fallbackSummaryRunes bounds the database excerpt per item of a grounded fallback answer.
const fallbackSummaryRunes = 200

var (
	sourceIDPattern     = regexp.MustCompile(`(?i)[\[(]?\s*source[_ -]?id\s*[:=#]?\s*\d+\s*[\])]?|\bsource\s*:\s*\d+\b|\(\s*dokumen\s+\d+\s*\)`)
	markdownLinkPattern = regexp.MustCompile(`\[([^\]]+)\]\((https?://[^)\s]+)\)`)
	bareURLPattern      = regexp.MustCompile(`https?://[^\s)\]]+`)
	numberedItemPattern = regexp.MustCompile(`^\s*\**\d+[.)]\s+`)
	bulletItemPattern   = regexp.MustCompile(`^[-*•]\s+`)
	countClaimPattern   = regexp.MustCompile(`(?i)\b(\d{1,3})\s+(rekomendasi|pilihan|tempat|destinasi|wisata|kuliner|warung|acara|event|budaya|berita)\b`)
	// countExplanationPattern marks a sentence that explains a shortfall ("Anda meminta 10 …, namun hanya 3").
	countExplanationPattern = regexp.MustCompile(`(?i)\b(hanya|namun|tetapi|meminta|minta|belum)\b`)
	sentenceSplit           = regexp.MustCompile(`[.!?\n]`)
	// technicalLinePattern matches answer lines that only repeat a context label, in any case and
	// markdown ("* DOMAIN: Kuliner", "* **Domain:** Kuliner").
	technicalLinePattern = regexp.MustCompile(`(?im)^[ \t]*(?:[-*•][ \t]*)?\**(?:DOMAIN|DATA_TERPOTONG|AKHIR_DOKUMEN|DOKUMEN \d+)\**[ \t]*:\**[^\n]*\n?`)
	// emptyDataLinePattern matches a line holding only the DATA or NAMA label; dataLabelPattern matches
	// the label in front of real content ("* DATA: Buka setiap hari", "* **NAMA:** <judul>" in session
	// 213), so only the label is removed.
	emptyDataLinePattern = regexp.MustCompile(`(?im)^[ \t]*(?:[-*•][ \t]*)?\**(?:DATA|NAMA)\**[ \t]*:\**[ \t]*(?:\n|$)`)
	dataLabelPattern     = regexp.MustCompile(`(?im)^([ \t]*(?:[-*•][ \t]*)?)\**(?:DATA|NAMA)\**[ \t]*:\**[ \t]*`)
	// documentReferencePattern removes in-sentence references to context blocks ("… pada DOKUMEN 1").
	documentReferencePattern = regexp.MustCompile(`(?i)[ \t]*\(?\b(?:pada|di|dalam|lihat|menurut|berdasarkan)[ \t]+dokumen[ \t]+\d+\)?|[ \t]*\(?\bDOKUMEN[ \t]+\d+\b\)?`)
	// contextTermPattern finds the prompt's own word for the database excerpts; a sentence using it
	// repeats a prompt rule ("CONTEXT berisi …", runtime 2026-10-30) and is removed whole.
	contextTermPattern = regexp.MustCompile(`\bCONTEXT\b`)
	// inlineDomainLabelPattern matches the context's DOMAIN label repeated inside a sentence
	// ("Pura Sasana Siwa Murti: (DOMAIN: Budaya) Situs …", runtime 2026-11-01); the values are domainLabels.
	// gemma3:4b also misspells it ("(DOMIN: Wisata (destinasi))", runtime 2026-11-02).
	inlineDomainLabelPattern = regexp.MustCompile(`[ \t]*\(?\**(?i:DOMA?I?N)\**[ \t]*:\**[ \t]*(?:Wisata \(destinasi\)|Informasi umum \(wilayah\)|Kuliner|Budaya|Acara|Berita|Informasi)\**\)?`)
	// openingClaimPattern finds a statement of when a place is open ("buka setiap hari", "buka pada
	// pagi hari", "beroperasi mulai pukul …").
	// "Jam buka … 08.00 hingga 16.00" (gemma3:4b, shadow test 2026-11-06) states the hours as a time range.
	openingClaimPattern = regexp.MustCompile(`(?i)\b(?:buka|beroperasi|tutup)\s+(?:setiap|tiap|pada|mulai|sejak|dari|pukul|jam|sampai|hingga|24|sepanjang|hanya)\b|\bjam\s+(?:buka|operasional)\b[^.\n]*\b\d{1,2}[.:]\d{2}\b`)
	// spaceRun closes gaps left inside a line by removed IDs; leading indentation is kept.
	spaceRun = regexp.MustCompile(`(\S)[ \t]{2,}`)
)

// groundAnswer checks a generated answer against the documents the backend selected. It removes
// source IDs and URLs that are not in the allowed text, and replaces the answer with one built
// from database excerpts when it names an unselected source or breaks the list contract.
// The LLM text is never treated as a source of facts.
func groundAnswer(answer string, intent ChatIntent, rag ragContext, candidates []SemanticResult, allowedText string) (string, map[string]any) {
	included := rag.Included
	cleaned := []string{}
	if stripped := sourceIDPattern.ReplaceAllString(answer, ""); stripped != answer {
		answer = stripped
		cleaned = append(cleaned, "source_id_removed")
	}
	if stripped := removeUnsupportedURLs(answer, allowedText); stripped != answer {
		answer = stripped
		cleaned = append(cleaned, "unsupported_url_removed")
	}
	stripped := technicalLinePattern.ReplaceAllString(answer, "")
	stripped = emptyDataLinePattern.ReplaceAllString(stripped, "")
	stripped = dataLabelPattern.ReplaceAllString(stripped, "$1")
	stripped = inlineDomainLabelPattern.ReplaceAllString(stripped, "")
	if stripped != answer {
		answer = stripped
		cleaned = append(cleaned, "technical_label_removed")
	}
	if stripped := removeDocumentReferences(answer); stripped != answer {
		answer = stripped
		cleaned = append(cleaned, "document_reference_removed")
	}
	if stripped := removeContextSentences(answer); stripped != answer {
		answer = stripped
		cleaned = append(cleaned, "prompt_rule_removed")
	}
	if stripped := removeUnsupportedOpeningHours(answer, rag.Text); stripped != answer {
		answer = stripped
		cleaned = append(cleaned, "unsupported_opening_hours_removed")
	}
	answer = strings.TrimSpace(spaceRun.ReplaceAllString(answer, "$1 "))
	answer = strings.TrimSpace(strings.TrimRight(answer, "` \n"))

	problems := groundingProblems(answer, intent, included, candidates, allowedText, rag.Found)
	report := map[string]any{"valid": len(problems) == 0, "problems": problems, "cleaned": cleaned, "fallback": false}
	if len(problems) > 0 {
		answer = groundedFallback(intent, rag)
		report["fallback"] = true
	} else {
		// The model may not repeat the sample-data label or the verification status, so the backend adds
		// the note itself; one combined note when both apply.
		lower := strings.ToLower(answer)
		sample := rag.HasSampleData && !strings.Contains(lower, "data contoh")
		unverified := mentionsUnverifiedPlace(answer, included) && !strings.Contains(lower, "belum terverifikasi")
		switch {
		case sample && unverified:
			answer += unverifiedSampleNote
		case sample:
			answer += sampleDataNote
		case unverified:
			answer += unverifiedPlaceNote
		}
		if sample {
			report["sample_note"] = true
		}
		if unverified {
			report["unverified_note"] = true
		}
	}
	used := mentionedLabels(answer, included)
	// A grounded answer from a context with one source states that source's facts even when it names it only as "di
	// sana" or "upacara ini" (74 such DB answers, T14 option, Owner 2026-11-08). An answer that says the information is
	// missing is not given a source line: the source did not hold it.
	if label := singleSourceLabel(included); len(used) == 0 && report["fallback"] == false && label != "" && !saysUnavailable(answer) {
		used = []string{label}
		report["single_source"] = true
	}
	report["used_sources"] = used
	return answer, report
}

// singleSourceLabel is the one source name of the context ("Candi Jawi" twice counts once), or "".
func singleSourceLabel(included []SemanticResult) string {
	label := ""
	for _, doc := range included {
		switch name := pointerString(doc.SourceLabel); {
		case name == "" || name == label:
		case label == "":
			label = name
		default:
			return ""
		}
	}
	return label
}

// saysUnavailable reports an answer that apologizes for or reports missing information (systemRules BAHASA asks for
// "Mohon maaf," then; "belum tersedia" is the BATASAN wording).
func saysUnavailable(answer string) bool {
	lower := strings.ToLower(strings.TrimSpace(answer))
	return strings.HasPrefix(lower, "mohon maaf") || strings.Contains(lower, "belum tersedia")
}

// danglingEndPattern matches a sentence left without its object after a document reference was
// removed ("Informasi ini terdapat pada DOKUMEN 1." → "Informasi ini terdapat.").
var danglingEndPattern = regexp.MustCompile(`(?i)\b(terdapat|ditemukan|tercantum|dicantumkan|disebutkan|dijelaskan|tertulis|dilihat)\s*[.!?]?\s*$`)

var (
	// leftoverLeadPattern is the punctuation a removed opening reference leaves ("Berdasarkan DOKUMEN 1, Satgas …"
	// → ", Satgas …"); leftoverGapPattern is a space or empty brackets left before punctuation inside the sentence.
	leftoverLeadPattern = regexp.MustCompile(`^[ \t]*[,;:][ \t]*`)
	leftoverGapPattern  = regexp.MustCompile(`[ \t]*\([ \t]*\)|[ \t]+([,.;:!?])`)
	// leftoverJoinPattern is a reference removed together with the space after the previous sentence
	// ("ada. Berdasarkan DOKUMEN 1, Satgas" → "ada., Satgas").
	leftoverJoinPattern = regexp.MustCompile(`([.!?])[,;:][ \t]*(\pL)`)
)

// tidyRemovedReference removes the punctuation a document reference leaves behind in its sentence and
// capitalizes the sentence when its opening words were removed (2026-10-31: "Tentu, ada., Satgas …").
func tidyRemovedReference(sentence string) string {
	sentence = leftoverGapPattern.ReplaceAllString(sentence, "$1")
	sentence = leftoverJoinPattern.ReplaceAllStringFunc(sentence, func(m string) string {
		last, _ := utf8.DecodeLastRuneInString(m)
		return m[:1] + " " + string(unicode.ToUpper(last))
	})
	trimmed := leftoverLeadPattern.ReplaceAllString(sentence, "")
	if trimmed == sentence {
		return sentence
	}
	first, size := utf8.DecodeRuneInString(trimmed)
	return string(unicode.ToUpper(first)) + trimmed[size:]
}

// removeDocumentReferences removes "DOKUMEN n" references from the sentences that contain them.
// A sentence that only pointed at the document, and dangles without it, is removed whole; so is one
// whose subject was the document ("DOKUMEN 1 menjelaskan …" left "menjelaskan …", BUD-07 2026-11-02).
// Other sentences are not touched. The first reference is searched again after each sentence, because
// cleaning a sentence with two references moves the later offsets.
func removeDocumentReferences(answer string) string {
	for {
		match := documentReferencePattern.FindStringIndex(answer)
		if match == nil {
			return answer
		}
		// The pattern takes the spaces before the reference; bounds start after them, or a reference that
		// opens a sentence would be read as part of the previous one.
		start, end := sentenceBounds(answer, skipSpaces(answer, match[0]), match[1])
		sentence := answer[start:end]
		cleaned := tidyRemovedReference(documentReferencePattern.ReplaceAllString(sentence, ""))
		if documentReferencePattern.MatchString(cleaned) {
			return answer // no progress possible; never loop
		}
		if danglingEndPattern.MatchString(cleaned) || lostSubject(sentence, cleaned) {
			cleaned = ""
			end = skipSpaces(answer, end)
		}
		answer = answer[:start] + cleaned + answer[end:]
	}
}

// lostSubject reports a sentence that started with a capital letter and now starts in lower case.
func lostSubject(sentence, cleaned string) bool {
	before, _ := utf8.DecodeRuneInString(strings.TrimSpace(sentence))
	after, _ := utf8.DecodeRuneInString(strings.TrimSpace(cleaned))
	return unicode.IsUpper(before) && unicode.IsLower(after)
}

// removeContextSentences removes each sentence that names the prompt's CONTEXT block.
func removeContextSentences(answer string) string {
	return removeSentencesMatching(answer, contextTermPattern)
}

// removeUnsupportedOpeningHours removes opening-time claims when the context states no opening time:
// the model filled the missing field itself (runtime 2026-11-01: "Candi Jawi buka setiap hari"; the
// opening_hours table had no rows). The answer then says the information is not available.
func removeUnsupportedOpeningHours(answer, contextText string) string {
	if openingClaimPattern.MatchString(contextText) || !openingClaimPattern.MatchString(answer) {
		return answer
	}
	answer = strings.TrimSpace(removeSentencesMatching(answer, openingClaimPattern))
	if !strings.Contains(strings.ToLower(answer), "jam buka") {
		answer = strings.TrimSpace(answer + " " + openingHoursUnavailable)
	}
	return answer
}

// removeSentencesMatching removes each sentence that contains a match of pattern.
func removeSentencesMatching(answer string, pattern *regexp.Regexp) string {
	for {
		match := pattern.FindStringIndex(answer)
		if match == nil {
			return answer
		}
		start, end := sentenceBounds(answer, match[0], match[1])
		before, after := answer[:start], answer[skipSpaces(answer, end):]
		if after == "" || after[0] == '\n' {
			before = strings.TrimRight(before, " \t")
		}
		answer = before + after
	}
}

// sentenceBounds returns the sentence around [from, to): from after the previous ". ", "! ", "? "
// or line break, to after the next terminal punctuation or before the next line break. The period
// of a list number at the start of a line ("1. ") does not end a sentence.
func sentenceBounds(text string, from, to int) (int, int) {
	start := from
	for start > 0 {
		c := text[start-1]
		if c == '\n' {
			break
		}
		if (c == ' ' || c == '\t') && start >= 2 && strings.ContainsRune(".!?", rune(text[start-2])) && !isListNumberDot(text, start-2) {
			break
		}
		start--
	}
	end := to
	for end < len(text) && text[end] != '\n' {
		// The period of a time or number ("08.00") does not end a sentence: cutting there left "00." as the answer
		// (regression 2026-11-06).
		innerDot := text[end] == '.' && end > 0 && end+1 < len(text) && isASCIIDigit(text[end-1]) && isASCIIDigit(text[end+1])
		if !innerDot && strings.ContainsRune(".!?", rune(text[end])) && !isListNumberDot(text, end) {
			end++
			break
		}
		end++
	}
	return start, end
}

func isASCIIDigit(c byte) bool { return c >= '0' && c <= '9' }

// isListNumberDot reports whether text[dot] is the period of a line-leading list number ("  12.").
func isListNumberDot(text string, dot int) bool {
	if text[dot] != '.' {
		return false
	}
	i := dot - 1
	for i >= 0 && text[i] >= '0' && text[i] <= '9' {
		i--
	}
	if i == dot-1 {
		return false
	}
	for i >= 0 && (text[i] == ' ' || text[i] == '\t' || text[i] == '*') {
		i--
	}
	return i < 0 || text[i] == '\n'
}

func skipSpaces(text string, i int) int {
	for i < len(text) && (text[i] == ' ' || text[i] == '\t') {
		i++
	}
	return i
}

func removeUnsupportedURLs(answer, allowedText string) string {
	answer = markdownLinkPattern.ReplaceAllStringFunc(answer, func(link string) string {
		parts := markdownLinkPattern.FindStringSubmatch(link)
		if strings.Contains(allowedText, parts[2]) {
			return link
		}
		return parts[1]
	})
	return bareURLPattern.ReplaceAllStringFunc(answer, func(url string) string {
		if strings.Contains(allowedText, url) {
			return url
		}
		return ""
	})
}

// boldPattern reads bold spans left to right, so the text between two spans is never read as one.
var boldPattern = regexp.MustCompile(`\*\*([^*\n]{3,80}?)\*\*`)

// hasBoldName reports a bold name in an answer ("**Rumah Informasi Wisata Pasuruan**"). A bold text
// with a digit is a date or period ("**tahun 2028**") and is allowed (audit K3, 2026-10-31).
func hasBoldName(answer string) bool {
	for _, match := range boldPattern.FindAllStringSubmatch(answer, -1) {
		if !strings.ContainsAny(match[1], "0123456789") {
			return true
		}
	}
	return false
}

// found is the number of relevant documents the system found (ragContext.Found); the prompt states it as
// JUMLAH_DOKUMEN_DITEMUKAN, so a count up to it is no overclaim even when fewer documents were sent (T08 F3).
func groundingProblems(answer string, intent ChatIntent, included, candidates []SemanticResult, allowedText string, found int) []string {
	var problems []string
	if answer == "" {
		return []string{"empty_answer"}
	}
	lowerAnswer, lowerAllowed := strings.ToLower(answer), strings.ToLower(allowedText)
	selected := make(map[string]bool)
	for _, result := range included {
		selected[sourceKey(result)] = true
	}
	for _, candidate := range candidates {
		label := strings.ToLower(strings.TrimSpace(pointerString(candidate.SourceLabel)))
		// Region names appear in addresses; labels the user or the context already contain are grounded.
		if selected[sourceKey(candidate)] || pointerString(candidate.SourceType) == "region" || len(label) < 4 || strings.Contains(lowerAllowed, label) {
			continue
		}
		if strings.Contains(lowerAnswer, label) {
			problems = append(problems, "unselected_source_mentioned")
			break
		}
	}
	if len(included) == 0 && (len(listItems(answer)) > 0 || hasBoldName(answer)) {
		// Without context, any listed or bold-named place came from the model itself (regression #5
		// BUD-04 named two "rumah informasi" that are not in the database).
		problems = append(problems, "no_source_items")
	}
	if !intent.isList() {
		return problems
	}
	items := listItems(answer)
	if len(items) > len(included) {
		problems = append(problems, "too_many_items")
	}
	if len(included) > 0 && unknownNumberedItem(answer, included) {
		problems = append(problems, "unknown_item")
	}
	for _, result := range included {
		label := strings.ToLower(pointerString(result.SourceLabel))
		hits := 0
		for _, item := range items {
			if label != "" && strings.Contains(strings.ToLower(item), label) {
				hits++
			}
		}
		if hits > 1 {
			problems = append(problems, "duplicate_item")
			break
		}
	}
	for _, sentence := range sentenceSplit.Split(answer, -1) {
		match := countClaimPattern.FindStringSubmatch(sentence)
		if match == nil || countExplanationPattern.MatchString(sentence) {
			continue
		}
		if n, _ := strconv.Atoi(match[1]); n > max(len(included), found) {
			problems = append(problems, "count_overclaim")
			break
		}
	}
	return problems
}

// coreLabel is a source name without its trailing part after " (" or ": " ("Bangil Carnival (Pasuruan Carnival)" →
// "Bangil Carnival"), so a list item that shortens the name still counts as naming the source.
func coreLabel(label string) string {
	for _, sep := range []string{" (", ": "} {
		if i := strings.Index(label, sep); i > 0 {
			label = label[:i]
		}
	}
	return strings.TrimSpace(label)
}

// unknownNumberedItem reports a numbered item of a list answer that names none of the selected sources (Owner
// jobdesk 30 Okt T1 option B, 2026-11-02): gemma3:4b listed "Ini alasan mengapa HP tidak bisa menerima SMS …", a
// title merged from two real news titles, next to the real one, and no other check caught it.
func unknownNumberedItem(answer string, included []SemanticResult) bool {
	for _, line := range strings.Split(answer, "\n") {
		if !numberedItemPattern.MatchString(line) {
			continue
		}
		item := strings.ToLower(line)
		named := slices.ContainsFunc(included, func(result SemanticResult) bool {
			label := strings.ToLower(pointerString(result.SourceLabel))
			core := strings.ToLower(coreLabel(pointerString(result.SourceLabel)))
			return label != "" && (strings.Contains(item, label) || (utf8.RuneCountInString(core) >= 4 && strings.Contains(item, core)))
		})
		if !named {
			return true
		}
	}
	return false
}

// listItems returns the top-level items of a list answer: numbered lines, or unindented bullets
// when nothing is numbered. Indented detail bullets under an item are not items.
func listItems(answer string) []string {
	var numbered, bullets []string
	for _, line := range strings.Split(answer, "\n") {
		switch {
		case numberedItemPattern.MatchString(line):
			numbered = append(numbered, line)
		case bulletItemPattern.MatchString(line):
			bullets = append(bullets, line)
		}
	}
	if len(numbered) > 0 {
		return numbered
	}
	return bullets
}

func sourceKey(result SemanticResult) string {
	return pointerString(result.SourceType) + ":" + pointerInt64(result.SourceID)
}

// mentionedLabels lists the selected sources whose label appears in the answer, in the order the answer
// names them. Longer labels are matched first and blanked, so "Taman Kota Pasuruan" does not also count as
// the region "Kota Pasuruan" (the list feeds the answer's source line, jobdesk 6).
func mentionedLabels(answer string, included []SemanticResult) []string {
	lower := strings.ToLower(answer)
	order := make([]int, len(included))
	for i := range order {
		order[i] = i
	}
	sort.SliceStable(order, func(a, b int) bool {
		return len(pointerString(included[order[a]].SourceLabel)) > len(pointerString(included[order[b]].SourceLabel))
	})
	at := make(map[int]int) // included index → byte offset of its first mention
	mark := func(i int, name string) {
		if pos := strings.Index(lower, name); name != "" && pos >= 0 {
			at[i] = pos
			lower = strings.ReplaceAll(lower, name, strings.Repeat(" ", len(name)))
		}
	}
	for _, i := range order {
		mark(i, strings.ToLower(pointerString(included[i].SourceLabel)))
	}
	// A name the answer shortens ("Bangil Carnival" for "Bangil Carnival (Pasuruan Carnival)") still names its source: 202
	// of 704 grounded answers without a source line named such a short form (T14, audit 2026-11-08).
	for _, i := range order {
		if _, ok := at[i]; !ok {
			// At least two words: a one-word short form ("Update" of "Update: banjir …") is too common to name a source.
			if label, core := pointerString(included[i].SourceLabel), coreLabel(pointerString(included[i].SourceLabel)); core != label && len(strings.Fields(core)) >= 2 {
				mark(i, strings.ToLower(core))
			}
		}
	}
	found := make([]int, 0, len(at))
	for i := range at {
		found = append(found, i)
	}
	sort.Slice(found, func(a, b int) bool { return at[found[a]] < at[found[b]] })
	labels := []string{}
	for _, i := range found {
		labels = append(labels, pointerString(included[i].SourceLabel))
	}
	return labels
}

// groundedFallback builds a friendly answer only from the labels and stored text of the selected
// records. It says "found only N" only when the search really found no more than it shows.
func groundedFallback(intent ChatIntent, rag ragContext) string {
	included := rag.Included
	if len(included) == 0 {
		return noSourceFallbackAnswer
	}
	var b strings.Builder
	switch {
	case intent.isList() && !intent.DefaultCount && intent.Requested > len(included) && rag.Found <= len(included):
		fmt.Fprintf(&b, "Saya baru menemukan %d pilihan yang sesuai dari %d yang Anda minta. Berikut pilihannya:\n", len(included), intent.Requested)
	case intent.isList() && intent.Requested > len(included) && rag.Found > len(included):
		fmt.Fprintf(&b, "Berikut %d pilihan yang bisa saya tampilkan dulu:\n", len(included))
	case intent.isList():
		fmt.Fprintf(&b, "Tentu, berikut %d pilihan yang bisa dipertimbangkan:\n", len(included))
	default:
		b.WriteString("Berikut informasi yang saya temukan:\n")
	}
	for i, result := range included {
		fmt.Fprintf(&b, "%d. %s (%s)", i+1, pointerString(result.SourceLabel), domainLabel(pointerString(result.SourceType)))
		if summary := firstSentence(result.Answer, fallbackSummaryRunes); summary != "" {
			b.WriteString(" — " + summary)
		}
		b.WriteString("\n")
	}
	if rag.Found > len(included) {
		b.WriteString("\nMasih ada pilihan lain yang sesuai. Apakah Anda ingin saya carikan lagi, atau saya jelaskan lebih detail salah satunya?")
	} else {
		b.WriteString("\nApakah Anda ingin saya jelaskan lebih detail salah satunya?")
	}
	return b.String()
}
