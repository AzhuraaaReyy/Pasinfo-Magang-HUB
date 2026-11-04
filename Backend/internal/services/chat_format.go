package services

import (
	"regexp"
	"slices"
	"strings"
)

// The frontend renders answers with textContent (CHAT_API_CONTRACT SEC-12), so markdown marks would show
// as literal characters. gemma3:4b wrote "**" or "* " bullets in 25 of 53 regression answers (jobdesk 6
// audit, 2026-11-02). plainTextAnswer runs after groundAnswer, because grounding reads bold names.
var (
	headingMarkPattern = regexp.MustCompile(`(?m)^[ \t]*#{1,6}[ \t]+`)
	boldMarkPattern    = regexp.MustCompile(`\*\*([^*\n]+?)\*\*|__([^_\n]+?)__`)
	starBulletPattern  = regexp.MustCompile(`(?m)^([ \t]*)[*•][ \t]+`)
	italicMarkPattern  = regexp.MustCompile(`(^|[\s(])\*([^\s*](?:[^*\n]*[^\s*])?)\*`)
	// danglingBulletPattern is a bullet mark with nothing after it ("Rp 10.000. -", J5-07 2026-11-02).
	danglingBulletPattern = regexp.MustCompile(`(?m)[ \t]+[-*•][ \t]*$|^[ \t]*[-*•][ \t]*\n`)
	// emptyBracketsPattern is an empty markdown placeholder ("Rp 10.000. []", J5-07 2026-11-02).
	emptyBracketsPattern = regexp.MustCompile(`[ \t]*\[[ \t]*\]`)
)

// plainTextAnswer removes markdown emphasis and headings and writes every bullet as "- "; an indented
// bullet (detail of a numbered item) keeps a three-space indent.
func plainTextAnswer(answer string) string {
	answer = headingMarkPattern.ReplaceAllString(answer, "")
	answer = boldMarkPattern.ReplaceAllString(answer, "$1$2")
	answer = starBulletPattern.ReplaceAllStringFunc(answer, func(bullet string) string {
		if strings.TrimLeft(bullet, " \t") != bullet {
			return "   - "
		}
		return "- "
	})
	answer = italicMarkPattern.ReplaceAllString(answer, "$1$2")
	answer = emptyBracketsPattern.ReplaceAllString(answer, "")
	answer = danglingBulletPattern.ReplaceAllString(answer, "")
	return strings.ReplaceAll(answer, "**", "")
}

// modelSourcePattern matches a source attribution the model wrote itself, at the start of an unindented
// line or after a sentence ("… Prigen. Sumber: Candi Jawi", "Sumber:,"); gemma3:4b did this in 11 of 53
// regression answers, so the source line appeared twice. A news detail line ("   - Sumber: Tempo") does not match.
var (
	modelSourcePattern = regexp.MustCompile(`(?mi)(^|[.!?)][ \t]+)\(?sumber[ \t]*:([^\n]*)$`)
	blankLinesPattern  = regexp.MustCompile(`\n{3,}`)
)

// withoutModelSourceLines removes the model's own attributions when they are empty or name a used source;
// any other text after "Sumber:" (a news publisher) is kept.
func withoutModelSourceLines(answer string, used []string) string {
	answer = modelSourcePattern.ReplaceAllStringFunc(answer, func(match string) string {
		parts := modelSourcePattern.FindStringSubmatch(match)
		const edge = " \t.,;:()"
		rest := strings.ToLower(strings.Trim(parts[2], edge))
		// The label is trimmed like rest: "Penanjakan Bromo (Penanjakan 1)" lost its ")" otherwise (J4-07).
		if rest != "" && !slices.ContainsFunc(used, func(label string) bool { return strings.Contains(rest, strings.ToLower(strings.Trim(label, edge))) }) {
			return match
		}
		return strings.TrimRight(parts[1], " \t")
	})
	return blankLinesPattern.ReplaceAllString(answer, "\n\n")
}

// withSourceLine ends the answer with the names of the sources it used (Owner jobdesk 6 option B,
// 2026-11-02). Only names that appear in the answer are listed, never every context document (R-8).
func withSourceLine(answer string, used []string) string {
	if len(used) == 0 {
		return answer
	}
	answer = strings.TrimRight(withoutModelSourceLines(answer, used), " \n")
	return answer + "\n\nSumber: " + strings.Join(used, "; ")
}
