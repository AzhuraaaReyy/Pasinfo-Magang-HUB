package services

import (
	"strings"
	"testing"
)

// Real schedule lines from the knowledge layer (2026-10-30), today = 30 Oktober 2026.
func TestHumanizeScheduleUsesReadableDatesAndRelativeStatus(t *testing.T) {
	cases := map[string]string{
		"Jadwal: 2026-02-08T00:00:00+07:00 s.d. 2026-02-08T23:59:00+07:00 (status: completed)":        "Jadwal: 8 Februari 2026 (sudah selesai)",
		"Jadwal: 2027-02-08T00:00:00+07:00 s.d. 2027-02-08T23:59:00+07:00 (status: expected)":         "Jadwal: 8 Februari 2027 (akan datang, jadwal belum pasti)",
		"Jadwal: 2026-09-21T00:00:00+07:00 s.d. 2026-09-27T23:59:00+07:00 (status: completed)":        "Jadwal: 21–27 September 2026 (sudah selesai)",
		"Jadwal: 2025-08-31T00:00:00+07:00 s.d. 2025-09-01T23:59:00+07:00 (status: past_unconfirmed)": "Jadwal: 31 Agustus – 1 September 2025 (sudah lewat, pelaksanaannya belum terkonfirmasi)",
		"Jadwal: 2025-01-09T00:00:00+07:00 (status: ongoing)":                                         "Jadwal: sejak 9 Januari 2025 (sedang berlangsung)",
		"Jadwal: 2026-10-29T00:00:00+07:00 s.d. 2026-11-01T23:59:00+07:00":                            "Jadwal: 29 Oktober – 1 November 2026 (sedang berlangsung)",
		"Jadwal: 2026-12-30T00:00:00+07:00 s.d. 2027-01-02T23:59:00+07:00 (status: expected)":         "Jadwal: 30 Desember 2026 – 2 Januari 2027 (akan datang, jadwal belum pasti)",
		"Jadwal: bukan-tanggal": "Jadwal: bukan-tanggal",
	}
	for in, want := range cases {
		if got := humanizeSchedule(in, testToday); got != want {
			t.Errorf("%q\n got %q\nwant %q", in, got, want)
		}
	}
}

func TestHumanizeEventSchedulesOnlyTouchesEventDocuments(t *testing.T) {
	line := "Jadwal: 2027-02-08T00:00:00+07:00 s.d. 2027-02-08T23:59:00+07:00 (status: expected)"
	results := []SemanticResult{source("event", 1, "Kirab", "Kirab pataka.\n"+line, 0.7), source("news", 2, "Berita", line, 0.7)}
	out := humanizeEventSchedules(results, testToday)
	if !strings.Contains(out[0].Answer, "8 Februari 2027 (akan datang") || out[1].Answer != line || results[0].Answer != "Kirab pataka.\n"+line {
		t.Fatalf("event=%q news=%q original=%q", out[0].Answer, out[1].Answer, results[0].Answer)
	}
}
