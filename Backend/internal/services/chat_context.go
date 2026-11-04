package services

import (
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

// maxContextRunes bounds the CONTEXT block sent to the answer model. The backend does not set
// Ollama's num_ctx, so the budget stays well below a 4096-token window together with the rules.
const maxContextRunes = 6000

// minDocumentRunes is the smallest data excerpt kept per document when a list shares the budget.
const minDocumentRunes = 300

var domainLabels = map[string]string{
	"destination": "Wisata (destinasi)",
	"culinary":    "Kuliner",
	"culture":     "Budaya",
	"event":       "Acara",
	"news":        "Berita",
	"region":      "Informasi umum (wilayah)",
}

func domainLabel(sourceType string) string {
	if label, ok := domainLabels[sourceType]; ok {
		return label
	}
	return "Informasi"
}

func isRelevant(result SemanticResult) bool {
	return result.RelevanceStatus == "relevant" || (result.RelevanceStatus == "" && result.Similarity >= relevanceThreshold())
}

// limitResults keeps the first n results; retrieval already removed duplicate sources.
func limitResults(results []SemanticResult, n int) []SemanticResult {
	if len(results) <= n {
		return results
	}
	return results[:n]
}

const (
	truncatedNote = "DATA_TERPOTONG: ya (sebagian data dokumen ini tidak dikirim)\n"
	blockEnd      = "AKHIR_DOKUMEN\n"
)

// ragContext is the context sent to the answer model. Found counts the distinct relevant
// documents retrieval produced (before the requested limit); Shown is how many were sent.
// Shown < Found means the limit or the prompt budget, not the database, bounded the answer.
type ragContext struct {
	Text      string
	Included  []SemanticResult
	Truncated bool
	Found     int
	// HasSampleData is true when lines marked sampleDataLabel were sent to the model.
	HasSampleData bool
	// Zone is the map zone the search was restricted to, with its regions.short_description.
	Zone            string
	ZoneDescription string
	// RegionSummary states the city/regency split and district counts for a region overview answer.
	RegionSummary string
	// Period describes the date window events were selected for ("" = no time question).
	// PeriodNearest is true when nothing fell in it and the next events after it were sent;
	// PeriodNamed counts events the user named that are sent although their dates are outside it.
	// NewsCategory is the news category the question named; NewsEmpty is true when it has no news
	// (NewsAvailable lists the categories that do); NewsLatest is true when the context lists the most
	// recently added news instead of search results.
	NewsCategory  string
	NewsEmpty     bool
	NewsLatest    bool
	NewsAvailable string
	// NewsClarify is true for a news recommendation without category or topic: the model asks which
	// category the user wants instead of answering.
	NewsClarify bool
	// NewsPopular is true when the context lists the most read news; NewsPopularUnavailable when popular
	// news were asked for but no news has readers yet (news.views = 0).
	NewsPopular            bool
	NewsPopularUnavailable bool
	// NewsTopicMissing is true when the question named a topic that no news matched, so the newest
	// news of the category stand in for it.
	NewsTopicMissing bool
	Period           string
	PeriodNearest    bool
	// PeriodContinuing is true when an event that started earlier still runs in the period.
	PeriodContinuing bool
	PeriodNamed      int
	// PeriodNamedOnly marks a "when" question about named events; Period is then "from today".
	PeriodNamedOnly bool
	// EventsPast is true when every event matching a recommendation ended more than a week ago; the context then
	// holds the upcoming events, from another zone when EventsElsewhere is true.
	EventsPast      bool
	EventsElsewhere bool
}

// withoutSampleLines drops the knowledge lines marked as sample data (one field per line).
func withoutSampleLines(text string) string {
	if !strings.Contains(text, sampleDataLabel) {
		return text
	}
	var kept []string
	for _, line := range strings.Split(text, "\n") {
		if !strings.Contains(line, sampleDataLabel) {
			kept = append(kept, line)
		}
	}
	return strings.Join(kept, "\n")
}

func (c ragContext) Shown() int { return len(c.Included) }

// buildRAGContext formats relevant documents as labelled blocks. The block headers are measured
// first and the rest of the budget is shared by the data, so every document normally fits with
// shorter data; a whole block is dropped only as a last resort. At most limit documents are sent.
// Sample-data lines are sent only when includeSample is set (the user asked for those fields).
// Low-confidence documents are never sent, a source appears once even if a retriever returns it
// twice, and source IDs stay out of the text.
func buildRAGContext(results []SemanticResult, limit, maxRunes int, includeSample bool) ragContext {
	var relevant []SemanticResult
	seen := make(map[string]bool)
	for _, result := range results {
		if isRelevant(result) && !seen[sourceKey(result)] {
			seen[sourceKey(result)] = true
			relevant = append(relevant, result)
		}
	}
	out := ragContext{Found: len(relevant)}
	relevant = limitResults(relevant, limit)
	if len(relevant) == 0 {
		return out
	}
	headers := make([]string, len(relevant))
	overhead := 0
	for i, result := range relevant {
		headers[i] = fmt.Sprintf("DOKUMEN %d\nNAMA: %s\nDOMAIN: %s\nDATA:\n", i+1, pointerString(result.SourceLabel), domainLabel(pointerString(result.SourceType)))
		// +1 for the newline after the data; the truncation note is counted as if always present.
		overhead += utf8.RuneCountInString(headers[i]) + 1 + utf8.RuneCountInString(truncatedNote) + utf8.RuneCountInString(blockEnd)
	}
	perDocument := max((maxRunes-overhead)/len(relevant), minDocumentRunes)
	var b strings.Builder
	used := 0
	for i, result := range relevant {
		answer := result.Answer
		if !includeSample {
			answer = withoutSampleLines(answer)
		}
		data, cut := fitDocument(answer, perDocument)
		block := headers[i] + data + "\n"
		if cut {
			block += truncatedNote
		}
		block += blockEnd
		size := utf8.RuneCountInString(block)
		if used+size > maxRunes && len(out.Included) > 0 {
			out.Truncated = true
			break
		}
		b.WriteString(block)
		used += size
		out.Included = append(out.Included, result)
		out.Truncated = out.Truncated || cut
		out.HasSampleData = out.HasSampleData || strings.Contains(data, sampleDataLabel)
	}
	out.Text = b.String()
	return out
}

// factLinePattern matches a short "Label: value" field line written by the knowledge text builders.
var factLinePattern = regexp.MustCompile(`^\pL[\pL\pN ()/,.-]{0,44}: \S`)

// fitDocument shortens knowledge text at line boundaries (one field per line). The field lines after
// the body ("Kategori berita: …", "Jadwal: …") get up to half of the budget first, so a long body no
// longer pushes them out (2026-10-31: long news lost their date line and the model invented one);
// the body fills the rest, and a body line longer than that is cut after its last full sentence.
func fitDocument(text string, maxRunes int) (string, bool) {
	text = strings.TrimSpace(text)
	if utf8.RuneCountInString(text) <= maxRunes {
		return text, false
	}
	lines := strings.Split(text, "\n")
	var body, facts []string
	used := 0
	for i, line := range lines {
		if i == 0 || !factLinePattern.MatchString(line) {
			body = append(body, line)
			continue
		}
		if size := utf8.RuneCountInString(line) + 1; used+size <= maxRunes/2 {
			facts = append(facts, line)
			used += size
		}
	}
	var kept []string
	for _, line := range body {
		size := utf8.RuneCountInString(line) + 1
		if used+size > maxRunes {
			break
		}
		kept = append(kept, line)
		used += size
	}
	if room := maxRunes - used - 1; len(kept) == 0 && room > 0 {
		if first := cutAtSentence(body[0], room); strings.TrimSpace(first) != "" {
			kept = []string{first}
		}
	}
	return strings.Join(append(kept, facts...), "\n"), true
}

func cutAtSentence(text string, maxRunes int) string {
	runes := []rune(text)
	if len(runes) <= maxRunes {
		return text
	}
	head := string(runes[:maxRunes])
	if i := strings.LastIndex(head, ". "); i > 0 {
		return head[:i+1]
	}
	if i := strings.LastIndex(head, " "); i > 0 {
		return head[:i]
	}
	return head
}

// firstSentence is a short database excerpt used by the grounded fallback answer.
func firstSentence(text string, maxRunes int) string {
	line := strings.TrimSpace(strings.SplitN(strings.TrimSpace(text), "\n", 2)[0])
	if i := strings.Index(line, ". "); i > 0 {
		line = line[:i+1]
	}
	return cutAtSentence(line, maxRunes)
}
