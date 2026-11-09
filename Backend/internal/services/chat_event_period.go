package services

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"
)

// eventPeriod is a date window read from an event question ("akhir pekan ini", "bulan depan").
// From is inclusive and To exclusive, both at WIB midnight; a zero To means no end ("yang akan datang").
type eventPeriod struct {
	Label string
	From  time.Time
	To    time.Time
}

// Description is the period as written into the prompt, with its dates.
func (p eventPeriod) Description() string {
	if p.To.IsZero() {
		return fmt.Sprintf("%s (mulai %s)", p.Label, indonesianDate(p.From))
	}
	last := p.To.AddDate(0, 0, -1)
	return fmt.Sprintf("%s (%s)", p.Label, dateRange(p.From, &last))
}

// overlaps uses the same rule as Retriever.EventsInPeriod: an occurrence without an end date counts
// on its start day, or from its start onward while its status is "ongoing" (as scheduleLabel reads it).
func (p eventPeriod) overlaps(start time.Time, end *time.Time, status string) bool {
	if !p.To.IsZero() && !start.Before(p.To) {
		return false
	}
	if end != nil {
		return !end.Before(p.From)
	}
	return !start.Before(p.From) || status == "ongoing"
}

// keepSchedules drops the stored schedule lines of an event document that fall outside the period,
// so the model does not report another year's date. The document is kept unchanged when no line
// would remain or a line does not parse. dated reports whether a kept occurrence is dated in the
// period: an ongoing occurrence without an end that started before it runs through every later
// period, so on its own it does not make the period scheduled.
func (p eventPeriod) keepSchedules(answer string) (kept string, dated bool) {
	lines := strings.Split(answer, "\n")
	out := make([]string, 0, len(lines))
	inside := 0
	for _, line := range lines {
		match := scheduleLinePattern.FindStringSubmatch(line)
		if match == nil {
			out = append(out, line)
			continue
		}
		start, err := time.Parse(time.RFC3339, match[1])
		if err != nil {
			return answer, false
		}
		var end *time.Time
		if match[2] != "" {
			parsed, err := time.Parse(time.RFC3339, match[2])
			if err != nil {
				return answer, false
			}
			end = &parsed
		}
		if p.overlaps(start, end, match[3]) {
			out = append(out, line)
			inside++
			dated = dated || end != nil || !start.Before(p.From)
		}
	}
	if inside == 0 {
		return answer, false
	}
	return strings.Join(out, "\n"), dated
}

var monthNumbers = map[string]time.Month{
	"januari": time.January, "februari": time.February, "maret": time.March, "april": time.April,
	"mei": time.May, "juni": time.June, "juli": time.July, "agustus": time.August,
	"september": time.September, "oktober": time.October, "november": time.November, "desember": time.December,
}

// periodWindows gives the dates of each plan period, relative to today in WIB. The model only names the period:
// gemma3:4b computed "bulan depan" as the current month (probe 2026-11-06).
var periodWindows = map[string]func(today time.Time) eventPeriod{
	"next_weekend": func(today time.Time) eventPeriod {
		from := weekendStart(today).AddDate(0, 0, 7)
		return eventPeriod{Label: "akhir pekan depan", From: from, To: from.AddDate(0, 0, 2)}
	},
	"this_weekend": func(today time.Time) eventPeriod {
		from := weekendStart(today)
		to := from.AddDate(0, 0, 2)
		if today.Weekday() == time.Sunday {
			from = today
		}
		return eventPeriod{Label: "akhir pekan ini", From: from, To: to}
	},
	"next_week": func(today time.Time) eventPeriod {
		from := nextMonday(today)
		return eventPeriod{Label: "minggu depan", From: from, To: from.AddDate(0, 0, 7)}
	},
	"this_week": func(today time.Time) eventPeriod {
		return eventPeriod{Label: "minggu ini", From: today, To: nextMonday(today)}
	},
	"next_month": func(today time.Time) eventPeriod {
		from := monthStart(today).AddDate(0, 1, 0)
		return eventPeriod{Label: "bulan depan", From: from, To: from.AddDate(0, 1, 0)}
	},
	"this_month": func(today time.Time) eventPeriod {
		from := monthStart(today)
		return eventPeriod{Label: "bulan ini", From: from, To: from.AddDate(0, 1, 0)}
	},
	"next_year": func(today time.Time) eventPeriod { return yearPeriod("tahun depan", today.Year()+1) },
	"this_year": func(today time.Time) eventPeriod { return yearPeriod("tahun ini", today.Year()) },
	"today": func(today time.Time) eventPeriod {
		return eventPeriod{Label: "hari ini", From: today, To: today.AddDate(0, 0, 1)}
	},
	"tomorrow": func(today time.Time) eventPeriod {
		return eventPeriod{Label: "besok", From: today.AddDate(0, 0, 1), To: today.AddDate(0, 0, 2)}
	},
	"day_after_tomorrow": func(today time.Time) eventPeriod {
		return eventPeriod{Label: "lusa", From: today.AddDate(0, 0, 2), To: today.AddDate(0, 0, 3)}
	},
	"now": func(today time.Time) eventPeriod {
		return eventPeriod{Label: "saat ini", From: today, To: today.AddDate(0, 0, 1)}
	},
	"upcoming": func(today time.Time) eventPeriod {
		return eventPeriod{Label: "yang akan datang", From: today}
	},
}

// eventPeriod returns the time window of a checked plan, or nil: a named month first (without a year it is its next
// occurrence, the current month counts, for trip planning), then a named year, then the relative period.
func (p QuestionPlan) eventPeriod(now time.Time) *eventPeriod {
	today := dayOf(now.In(wib))
	if month, ok := monthNumbers[p.Month]; ok {
		year := p.Year
		if year == 0 {
			year = today.Year()
			if month < today.Month() {
				year++
			}
		}
		from := time.Date(year, month, 1, 0, 0, 0, 0, wib)
		return &eventPeriod{Label: fmt.Sprintf("%s %d", indonesianMonths[month-1], year), From: from, To: from.AddDate(0, 1, 0)}
	}
	if p.Year != 0 {
		period := yearPeriod(fmt.Sprintf("tahun %d", p.Year), p.Year)
		return &period
	}
	if window, ok := periodWindows[p.Period]; ok {
		period := window(today)
		return &period
	}
	return nil
}

// weekendStart is the Saturday of the current week (the previous day on a Sunday).
func weekendStart(today time.Time) time.Time {
	if today.Weekday() == time.Sunday {
		return today.AddDate(0, 0, -1)
	}
	return today.AddDate(0, 0, int(time.Saturday-today.Weekday()))
}

// nextMonday is the first Monday after today.
func nextMonday(today time.Time) time.Time {
	days := (8 - int(today.Weekday())) % 7
	if days == 0 {
		days = 7
	}
	return today.AddDate(0, 0, days)
}

func monthStart(today time.Time) time.Time {
	return time.Date(today.Year(), today.Month(), 1, 0, 0, 0, 0, wib)
}

func yearPeriod(label string, year int) eventPeriod {
	from := time.Date(year, time.January, 1, 0, 0, 0, 0, wib)
	return eventPeriod{Label: label, From: from, To: from.AddDate(1, 0, 0)}
}

// eventPeriodResult describes how the events of a time question were selected.
type eventPeriodResult struct {
	Period  eventPeriod
	Nearest bool // nothing was dated in the period; the next events after it were added
	// Continuing is true when an event that started earlier still runs in the period (a permanent
	// exhibition): the period is then not empty (J4-03, 2026-11-02).
	Continuing bool
	Named      int // events the user named, sent although their dates are outside the period
	// NamedOnly is a "when" question about named events: only they are sent (namedEventSchedule).
	NamedOnly bool
}

// eventPeriodOutcome selects the event documents of a time question by their schedules. It returns a
// nil result, and the caller keeps the semantic classification, when the question names no period and does not ask
// when a named event takes place, or the retriever cannot list schedules. results are the semantic candidates;
// an event the user names among them is kept first even when its dates are outside the period.
func (s *ChatService) eventPeriodOutcome(ctx context.Context, period *eventPeriod, asksSchedule bool, text, region string, results []SemanticResult) (relevanceOutcome, *eventPeriodResult, error) {
	scheduler, ok := s.Retriever.(EventScheduleRetriever)
	if !ok {
		return relevanceOutcome{}, nil, nil
	}
	if period == nil {
		if !asksSchedule {
			return relevanceOutcome{}, nil, nil
		}
		return s.namedEventSchedule(text, results)
	}
	named := namedEvents(text, results)
	info := &eventPeriodResult{Period: *period}
	scheduled, err := scheduler.EventsInPeriod(ctx, period.From, period.To, region, maxListCount)
	if err != nil {
		return relevanceOutcome{}, nil, err
	}
	// Events dated in the period come first, by date; continuing ones (a permanent exhibition) follow,
	// so they do not take the place of a dated event when the answer limit cuts the list.
	var datedEvents, continuing []SemanticResult
	for _, event := range scheduled {
		var inPeriod bool
		event.Answer, inPeriod = period.keepSchedules(event.Answer)
		if inPeriod {
			datedEvents = append(datedEvents, event)
		} else {
			continuing = append(continuing, event)
		}
	}
	dated := len(datedEvents) > 0
	info.Continuing = len(continuing) > 0
	scheduled = append(datedEvents, continuing...)
	position := map[string]int{}
	for i := range scheduled {
		position[sourceKey(scheduled[i])] = i
	}
	// Only a continuing event (or nothing) in a closed period: the next scheduled events are added, so
	// the answer can say the period has no event and offer the nearest one.
	if !dated && !period.To.IsZero() {
		after := eventPeriod{From: period.To}
		next, err := scheduler.EventsInPeriod(ctx, after.From, after.To, region, maxListCount)
		if err != nil {
			return relevanceOutcome{}, nil, err
		}
		for _, event := range next {
			if _, present := position[sourceKey(event)]; present {
				continue
			}
			event.Answer, _ = after.keepSchedules(event.Answer)
			position[sourceKey(event)] = len(scheduled)
			scheduled = append(scheduled, event)
			info.Nearest = true
		}
	}
	var selected []SemanticResult
	used := map[string]bool{}
	for _, event := range named {
		key := sourceKey(event)
		if used[key] {
			continue
		}
		used[key] = true
		if i, ok := position[key]; ok {
			selected = append(selected, scheduled[i])
			continue
		}
		selected = append(selected, event)
		info.Named++
	}
	for _, event := range scheduled {
		if !used[sourceKey(event)] {
			selected = append(selected, event)
		}
	}
	status := "no_source"
	if len(selected) > 0 {
		status = "relevant"
	}
	return relevanceOutcome{Status: status, Context: selected, Judge: map[string]any{"skipped": "event_period", "pool_k": 0, "picked_k": 0}}, info, nil
}

// namedEventSchedule answers "when" questions about events the user names without a period: only
// those events are sent, with their schedule lines limited to the ones from today on, so the model
// does not present a past edition as upcoming (regression 2026-10-30: "Kapan Kirab Pataka…?" called
// the completed 2026 edition "akan dilaksanakan"). An event without an upcoming date keeps all its
// lines with their status. Other questions return a nil result.
func (s *ChatService) namedEventSchedule(text string, results []SemanticResult) (relevanceOutcome, *eventPeriodResult, error) {
	named := namedEvents(text, results)
	if len(named) == 0 {
		return relevanceOutcome{}, nil, nil
	}
	upcoming := eventPeriod{Label: "jadwal berikutnya", From: dayOf(s.today().In(wib))}
	for i := range named {
		named[i].Answer = upcoming.nextOrLatestSchedule(named[i].Answer)
	}
	return relevanceOutcome{Status: "relevant", Context: named, Judge: map[string]any{"skipped": "event_named_schedule", "pool_k": 0, "picked_k": 0}}, &eventPeriodResult{Period: upcoming, NamedOnly: true}, nil
}

// nextOrLatestSchedule keeps the schedule lines in the period; when none is, it keeps only the line
// that starts last, so the model does not pick an older edition (runtime 2026-10-30: "Festival Dayung
// digelar tanggal berapa?" was answered with 2025 although 1 September 2026 is stored).
func (p eventPeriod) nextOrLatestSchedule(answer string) string {
	lines := strings.Split(answer, "\n")
	latest, latestAt := -1, time.Time{}
	for i, line := range lines {
		match := scheduleLinePattern.FindStringSubmatch(line)
		if match == nil {
			continue
		}
		start, err := time.Parse(time.RFC3339, match[1])
		if err != nil {
			return answer
		}
		var end *time.Time
		if match[2] != "" {
			parsed, err := time.Parse(time.RFC3339, match[2])
			if err != nil {
				return answer
			}
			end = &parsed
		}
		if p.overlaps(start, end, match[3]) {
			kept, _ := p.keepSchedules(answer)
			return kept
		}
		if latest < 0 || start.After(latestAt) {
			latest, latestAt = i, start
		}
	}
	if latest < 0 {
		return answer
	}
	out := make([]string, 0, len(lines))
	for i, line := range lines {
		if i == latest || !scheduleLinePattern.MatchString(line) {
			out = append(out, line)
		}
	}
	return strings.Join(out, "\n")
}

var nameWordSplit = regexp.MustCompile(`[^\p{L}\p{N}]+`)

// nameBigrams returns the pairs of consecutive words of a text, lower-cased. Pairs with "pasuruan"
// are skipped: "kota pasuruan" names a zone, not an event.
func nameBigrams(text string) []string {
	words := strings.Fields(nameWordSplit.ReplaceAllString(strings.ToLower(text), " "))
	var pairs []string
	for i := 0; i+1 < len(words); i++ {
		if words[i] == "pasuruan" || words[i+1] == "pasuruan" {
			continue
		}
		pairs = append(pairs, words[i]+" "+words[i+1])
	}
	return pairs
}

// namedEvents returns the event results whose name the text contains (two consecutive words of the
// label, e.g. "Pekan Raya", "Festival Dayung"). Similarity cannot show this: "akhir pekan ini"
// scored 0.613 against "Pekan Raya Pasuruan" in the 2026-10-30 runtime check.
func namedEvents(text string, results []SemanticResult) []SemanticResult {
	textPairs := map[string]bool{}
	for _, pair := range nameBigrams(text) {
		textPairs[pair] = true
	}
	var named []SemanticResult
	for _, result := range results {
		if pointerString(result.SourceType) != "event" {
			continue
		}
		for _, pair := range nameBigrams(pointerString(result.SourceLabel)) {
			if textPairs[pair] {
				result.RelevanceStatus = "relevant"
				result.RetrievalMethod = "semantic+event_name"
				named = append(named, result)
				break
			}
		}
	}
	return named
}
