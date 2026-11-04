package services

import (
	"fmt"
	"regexp"
	"strings"
	"time"
)

var indonesianMonths = [...]string{"Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}

// scheduleLinePattern reads the event schedule lines written by eventKnowledgeText.
var scheduleLinePattern = regexp.MustCompile(`^Jadwal: (\S+)(?: s\.d\. (\S+))?(?: \(status: ([^)]+)\))?$`)

func indonesianDate(t time.Time) string {
	return fmt.Sprintf("%d %s %d", t.Day(), indonesianMonths[t.Month()-1], t.Year())
}

func dateRange(start time.Time, end *time.Time) string {
	if end == nil || sameDay(start, *end) {
		return indonesianDate(start)
	}
	switch {
	case start.Year() == end.Year() && start.Month() == end.Month():
		return fmt.Sprintf("%d–%s", start.Day(), indonesianDate(*end))
	case start.Year() == end.Year():
		return fmt.Sprintf("%d %s – %s", start.Day(), indonesianMonths[start.Month()-1], indonesianDate(*end))
	default:
		return indonesianDate(start) + " – " + indonesianDate(*end)
	}
}

func sameDay(a, b time.Time) bool {
	return a.Year() == b.Year() && a.YearDay() == b.YearDay()
}

func dayOf(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, wib)
}

// scheduleLabel compares the occurrence dates with today and keeps the stored occurrence status
// meaning, so the model does not have to reason about dates or raw status codes.
func scheduleLabel(start time.Time, end *time.Time, status string, today time.Time) string {
	first, last := dayOf(start), dayOf(start)
	if end != nil {
		last = dayOf(*end)
	}
	now := dayOf(today)
	switch {
	case end == nil && status == "ongoing" && !first.After(now):
		return "sedang berlangsung"
	case last.Before(now) && status == "completed":
		return "sudah selesai"
	case last.Before(now) && status == "past_unconfirmed":
		return "sudah lewat, pelaksanaannya belum terkonfirmasi"
	case last.Before(now):
		return "sudah lewat"
	case first.After(now) && status == "expected":
		return "akan datang, jadwal belum pasti"
	case first.After(now):
		return "akan datang"
	default:
		return "sedang berlangsung"
	}
}

// humanizeSchedule rewrites one stored schedule line ("Jadwal: 2027-02-08T00:00:00+07:00 s.d. …
// (status: expected)") as "Jadwal: 8 Februari 2027 (akan datang, jadwal belum pasti)".
// Lines that do not parse are kept unchanged.
func humanizeSchedule(line string, today time.Time) string {
	match := scheduleLinePattern.FindStringSubmatch(line)
	if match == nil {
		return line
	}
	start, err := time.Parse(time.RFC3339, match[1])
	if err != nil {
		return line
	}
	start = start.In(wib)
	var end *time.Time
	if match[2] != "" {
		parsed, err := time.Parse(time.RFC3339, match[2])
		if err != nil {
			return line
		}
		parsed = parsed.In(wib)
		end = &parsed
	}
	label := scheduleLabel(start, end, match[3], today)
	if end == nil && label == "sedang berlangsung" {
		return fmt.Sprintf("Jadwal: sejak %s (%s)", indonesianDate(start), label)
	}
	return fmt.Sprintf("Jadwal: %s (%s)", dateRange(start, end), label)
}

// humanizeEventSchedules returns copies of the event results with readable, dated schedule lines.
// Other results are returned unchanged.
func humanizeEventSchedules(results []SemanticResult, today time.Time) []SemanticResult {
	out := make([]SemanticResult, len(results))
	for i, result := range results {
		out[i] = result
		if pointerString(result.SourceType) != "event" || !strings.Contains(result.Answer, "Jadwal: ") {
			continue
		}
		lines := strings.Split(result.Answer, "\n")
		for j, line := range lines {
			lines[j] = humanizeSchedule(line, today)
		}
		out[i].Answer = strings.Join(lines, "\n")
	}
	return out
}

// upcomingSchedulesOnly drops the past schedule lines of event documents that still have an upcoming or ongoing
// one, so a recommendation presents the next date (Tahap D, Owner decision 1, 2026-11-03: the 2026 date of a
// yearly event was given although 2027 was in the context). An event with only past lines keeps them.
func upcomingSchedulesOnly(results []SemanticResult, today time.Time) []SemanticResult {
	out := make([]SemanticResult, len(results))
	for i, result := range results {
		out[i] = result
		if pointerString(result.SourceType) != "event" {
			continue
		}
		lines := strings.Split(result.Answer, "\n")
		kept := make([]string, 0, len(lines))
		upcoming := false
		for _, line := range lines {
			if past, ok := pastScheduleLine(line, today); ok {
				if past {
					continue
				}
				upcoming = true
			}
			kept = append(kept, line)
		}
		if upcoming && len(kept) < len(lines) {
			out[i].Answer = strings.Join(kept, "\n")
		}
	}
	return out
}

// pastScheduleLine reports whether a stored schedule line lies before today; ok is false for other lines.
func pastScheduleLine(line string, today time.Time) (past, ok bool) {
	match := scheduleLinePattern.FindStringSubmatch(line)
	if match == nil {
		return false, false
	}
	start, err := time.Parse(time.RFC3339, match[1])
	if err != nil {
		return false, false
	}
	var end *time.Time
	if match[2] != "" {
		parsed, err := time.Parse(time.RFC3339, match[2])
		if err != nil {
			return false, false
		}
		end = &parsed
	}
	return strings.HasPrefix(scheduleLabel(start.In(wib), end, match[3], today), "sudah"), true
}
