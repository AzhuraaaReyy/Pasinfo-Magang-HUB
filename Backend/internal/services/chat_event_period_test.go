package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"

	"wildan-news-backend/internal/models"
)

func wibDate(year int, month time.Month, day int) time.Time {
	return time.Date(year, month, day, 0, 0, 0, 0, wib)
}

func TestPlanEventPeriod(t *testing.T) {
	// testToday is Friday 30 October 2026.
	cases := []struct {
		period   string
		label    string
		from, to time.Time
	}{
		{"this_weekend", "akhir pekan ini", wibDate(2026, 10, 31), wibDate(2026, 11, 2)},
		{"next_weekend", "akhir pekan depan", wibDate(2026, 11, 7), wibDate(2026, 11, 9)},
		{"this_week", "minggu ini", wibDate(2026, 10, 30), wibDate(2026, 11, 2)},
		{"next_week", "minggu depan", wibDate(2026, 11, 2), wibDate(2026, 11, 9)},
		{"next_month", "bulan depan", wibDate(2026, 11, 1), wibDate(2026, 12, 1)},
		{"this_month", "bulan ini", wibDate(2026, 10, 1), wibDate(2026, 11, 1)},
		{"next_year", "tahun depan", wibDate(2027, 1, 1), wibDate(2028, 1, 1)},
		{"today", "hari ini", wibDate(2026, 10, 30), wibDate(2026, 10, 31)},
		{"tomorrow", "besok", wibDate(2026, 10, 31), wibDate(2026, 11, 1)},
		{"now", "saat ini", wibDate(2026, 10, 30), wibDate(2026, 10, 31)},
		{"upcoming", "yang akan datang", wibDate(2026, 10, 30), time.Time{}},
	}
	for _, c := range cases {
		got := planPeriod(c.period, testToday)
		if got == nil || got.Label != c.label || !got.From.Equal(c.from) || !got.To.Equal(c.to) {
			t.Errorf("%q = %+v, want %s %v–%v", c.period, got, c.label, c.from, c.to)
		}
	}
	sunday := time.Date(2026, 11, 1, 10, 0, 0, 0, wib)
	if got := planPeriod("this_weekend", sunday); !got.From.Equal(wibDate(2026, 11, 1)) || !got.To.Equal(wibDate(2026, 11, 2)) {
		t.Errorf("Sunday weekend = %+v", got)
	}
}

func planPeriod(period string, today time.Time) *eventPeriod {
	return QuestionPlan{Period: period}.eventPeriod(today)
}

func TestEventPeriodDescription(t *testing.T) {
	weekend := planPeriod("this_weekend", testToday)
	if got := weekend.Description(); got != "akhir pekan ini (31 Oktober – 1 November 2026)" {
		t.Fatalf("description = %q", got)
	}
	if got := planPeriod("upcoming", testToday).Description(); got != "yang akan datang (mulai 30 Oktober 2026)" {
		t.Fatalf("open description = %q", got)
	}
}

const kirabDoc = "Kirab budaya.\nJadwal: 2026-02-08T00:00:00+07:00 s.d. 2026-02-08T23:59:00+07:00 (status: completed)\nJadwal: 2027-02-08T00:00:00+07:00 s.d. 2027-02-08T23:59:00+07:00 (status: expected)\nTiket: Gratis"

func TestKeepSchedulesDropsLinesOutsideThePeriod(t *testing.T) {
	next := planPeriod("next_year", testToday)
	got, dated := next.keepSchedules(kirabDoc)
	if !dated || strings.Contains(got, "2026-02-08") || !strings.Contains(got, "2027-02-08") || !strings.Contains(got, "Tiket: Gratis") || !strings.Contains(got, "Kirab budaya.") {
		t.Fatalf("filtered = %q dated=%v", got, dated)
	}
	if got, dated := planPeriod("next_month", testToday).keepSchedules(kirabDoc); got != kirabDoc || dated {
		t.Fatalf("a document with no line in the period must stay unchanged: %q dated=%v", got, dated)
	}
	museum := "Pameran tetap.\nJadwal: 2025-01-09T08:00:00+07:00 (status: ongoing)"
	if got, dated := planPeriod("next_month", testToday).keepSchedules(museum); got != museum || dated {
		t.Fatalf("a continuing occurrence is kept but not dated in the period: %q dated=%v", got, dated)
	}
}

func TestEventPeriodOverlapsOngoingWithoutEnd(t *testing.T) {
	weekend := planPeriod("this_weekend", testToday)
	started := wibDate(2025, 1, 9)
	if !weekend.overlaps(started, nil, "ongoing") || weekend.overlaps(started, nil, "completed") {
		t.Fatal("an ongoing occurrence without an end runs on; a completed one counts on its start day only")
	}
}

func TestNamedEventsMatchesNameNotSharedWords(t *testing.T) {
	results := []SemanticResult{
		source("event", 19, "Pekan Raya Pasuruan", "Pameran.", 0.61),
		source("event", 17, "Kirab Pataka Hari Jadi Kota Pasuruan", "Kirab.", 0.58),
		source("destination", 35, "Taman Kota Pasuruan", "Taman.", 0.7),
	}
	if got := namedEvents("Ada acara apa akhir pekan ini di Kota Pasuruan?", results); len(got) != 0 {
		t.Fatalf("shared words read as a name: %v", got)
	}
	got := namedEvents("Apakah Pekan Raya Pasuruan ada bulan ini?", results)
	if len(got) != 1 || pointerString(got[0].SourceLabel) != "Pekan Raya Pasuruan" || got[0].RelevanceStatus != "relevant" {
		t.Fatalf("named = %v", got)
	}
}

// scheduleRetriever is a fake that lists events by period: byWindow is keyed by the From date.
type scheduleRetriever struct {
	fakeRetriever
	byWindow map[string][]SemanticResult
	windows  []eventPeriod
	region   string
}

func (r *scheduleRetriever) EventsInPeriod(_ context.Context, from, to time.Time, region string, _ int) ([]SemanticResult, error) {
	r.windows = append(r.windows, eventPeriod{From: from, To: to})
	r.region = region
	return append([]SemanticResult(nil), r.byWindow[from.Format("2006-01-02")]...), nil
}

func eventDoc(id int64, label, answer string) SemanticResult {
	doc := source("event", id, label, answer, 0)
	doc.RelevanceStatus = "relevant"
	doc.RetrievalMethod = "event_schedule"
	return doc
}

func periodService(t *testing.T, retriever *scheduleRetriever) (*ChatService, *recordingProvider, *fakeJudge) {
	t.Helper()
	provider := &recordingProvider{stubProvider: stubProvider{name: "ollama:chat"}}
	service := testChatService(newChatTestDB(t), provider, time.Second, retriever)
	judge := &fakeJudge{}
	service.Judge = judge
	service.Now = func() time.Time { return testToday }
	return service, provider, judge
}

func TestEventTimeQuestionUsesSchedules(t *testing.T) {
	retriever := &scheduleRetriever{
		fakeRetriever: fakeRetriever{results: []SemanticResult{source("event", 19, "Pekan Raya Pasuruan", "Pameran.\nJadwal: 2026-09-21T00:00:00+07:00 (status: completed)", 0.613)}},
		byWindow:      map[string][]SemanticResult{"2026-10-31": {eventDoc(23, "Pasuruan Street Art Fashion Carnival", "Karnaval.\nJadwal: 2025-09-01T00:00:00+07:00 (status: completed)\nJadwal: 2026-10-31T00:00:00+07:00 s.d. 2026-10-31T23:59:00+07:00 (status: expected)")}},
	}
	service, provider, judge := periodService(t, retriever)
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 120}, "Ada acara apa akhir pekan ini di Pasuruan?")
	if err != nil {
		t.Fatal(err)
	}
	if judge.calls != 0 || len(retriever.windows) != 1 {
		t.Fatalf("judge calls=%d windows=%v", judge.calls, retriever.windows)
	}
	system := provider.messages[0].Content
	for _, want := range []string{"PERIODE_DITANYA: akhir pekan ini (31 Oktober – 1 November 2026)", "ATURAN_PERIODE", "NAMA: Pasuruan Street Art Fashion Carnival", "Jadwal: 31 Oktober 2026 (akan datang, jadwal belum pasti)"} {
		if !strings.Contains(system, want) {
			t.Fatalf("prompt missing %q:\n%s", want, system)
		}
	}
	if strings.Contains(system, "NAMA: Pekan Raya Pasuruan") || strings.Contains(system, "HASIL_PERIODE") || strings.Contains(system, "ACARA_DISEBUT") {
		t.Fatalf("a similar but unrelated event or a wrong rule was sent:\n%s", system)
	}
	var meta map[string]any
	_ = json.Unmarshal(result.Assistant.Metadata, &meta)
	if meta["retrieval_status"] != "relevant" || meta["event_period"] != "akhir pekan ini (31 Oktober – 1 November 2026)" || meta["judge"].(map[string]any)["skipped"] != "event_period" {
		t.Fatalf("metadata = %v", meta)
	}
}

func TestEventTimeQuestionFallsBackToNearestEvents(t *testing.T) {
	retriever := &scheduleRetriever{byWindow: map[string][]SemanticResult{"2026-12-01": {eventDoc(17, "Kirab Pataka Hari Jadi Kota Pasuruan", kirabDoc)}}}
	service, provider, _ := periodService(t, retriever)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 121}, "Festival apa saja bulan depan?"); err != nil {
		t.Fatal(err)
	}
	if len(retriever.windows) != 2 || !retriever.windows[1].From.Equal(wibDate(2026, 12, 1)) || !retriever.windows[1].To.IsZero() {
		t.Fatalf("windows = %v", retriever.windows)
	}
	system := provider.messages[0].Content
	for _, want := range []string{"PERIODE_DITANYA: bulan depan (1–30 November 2026)", "HASIL_PERIODE: tidak ada acara terjadwal pada periode ini.\nATURAN_PERIODE: Jelaskan bahwa waktu yang ditanyakan belum punya acara terjadwal", "8 Februari 2027 (akan datang, jadwal belum pasti)"} {
		if !strings.Contains(system, want) {
			t.Fatalf("prompt missing %q:\n%s", want, system)
		}
	}
	if strings.Contains(system, "8 Februari 2026") {
		t.Fatalf("schedule outside the nearest window kept:\n%s", system)
	}
}

func TestContinuingEventAloneAddsNearestScheduledEvents(t *testing.T) {
	museum := eventDoc(18, "Pameran Tetap Museum Cunggrang", "Pameran tetap.\nJadwal: 2025-01-09T08:00:00+07:00 (status: ongoing)")
	retriever := &scheduleRetriever{byWindow: map[string][]SemanticResult{
		"2026-11-01": {museum},
		"2026-12-01": {museum, eventDoc(17, "Kirab Pataka Hari Jadi Kota Pasuruan", kirabDoc)},
	}}
	service, provider, _ := periodService(t, retriever)
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 126}, "Festival apa saja bulan depan?")
	if err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if strings.Count(system, "NAMA: Pameran Tetap Museum Cunggrang") != 1 || !strings.Contains(system, "NAMA: Kirab Pataka Hari Jadi Kota Pasuruan") || !strings.Contains(system, "HASIL_PERIODE: tidak ada acara baru yang dijadwalkan pada periode ini, tetapi ada acara yang masih berlangsung") || strings.Contains(system, "dipilih sistem dari jadwal") {
		t.Fatalf("prompt:\n%s", system)
	}
	var meta map[string]any
	_ = json.Unmarshal(result.Assistant.Metadata, &meta)
	if meta["event_period_nearest"] != true {
		t.Fatalf("metadata = %v", meta)
	}
}

func TestPeriodQuestionSendsEveryEventDatedFirst(t *testing.T) {
	var events []SemanticResult
	events = append(events, eventDoc(18, "Pameran Tetap Museum Cunggrang", "Pameran tetap.\nJadwal: 2025-01-09T08:00:00+07:00 (status: ongoing)"))
	for i, day := range []string{"01", "05", "12", "20", "21", "25"} {
		events = append(events, eventDoc(int64(30+i), fmt.Sprintf("Acara September %d", i+1), "Acara.\nJadwal: 2026-09-"+day+"T00:00:00+07:00 s.d. 2026-09-"+day+"T23:59:00+07:00 (status: completed)"))
	}
	retriever := &scheduleRetriever{byWindow: map[string][]SemanticResult{"2026-09-01": events}}
	service, provider, _ := periodService(t, retriever)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 127}, "Agenda acara bulan September 2026"); err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if strings.Count(system, "NAMA: ") != 7 || strings.Index(system, "NAMA: Acara September 6") > strings.Index(system, "NAMA: Pameran Tetap") || !strings.Contains(system, "Sebutkan setiap acara di CONTEXT") {
		t.Fatalf("every event, dated first, expected:\n%s", system)
	}
	listed := &scheduleRetriever{byWindow: map[string][]SemanticResult{"2026-09-01": events}}
	service, provider, _ = periodService(t, listed)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 128}, "Rekomendasikan 3 acara bulan September 2026"); err != nil {
		t.Fatal(err)
	}
	if got := strings.Count(provider.messages[0].Content, "NAMA: "); got != 3 {
		t.Fatalf("a requested count must be kept, got %d documents", got)
	}
}

func TestWhenQuestionAboutNamedEventSendsOnlyItsNextSchedule(t *testing.T) {
	kirab := source("event", 17, "Kirab Pataka Hari Jadi Kota Pasuruan", kirabDoc, 0.62)
	bangil := source("event", 20, "Bangil Carnival (Pasuruan Carnival)", "Karnaval.\nJadwal: 2026-09-20T00:00:00+07:00 (status: past_unconfirmed)", 0.61)
	retriever := &scheduleRetriever{fakeRetriever: fakeRetriever{results: []SemanticResult{kirab, bangil}}}
	service, provider, judge := periodService(t, retriever)
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 129}, "Kapan Kirab Pataka Hari Jadi Kota Pasuruan?")
	if err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if len(retriever.windows) != 0 || judge.calls != 0 || strings.Contains(system, "NAMA: Bangil Carnival") || strings.Contains(system, "8 Februari 2026") || !strings.Contains(system, "8 Februari 2027 (akan datang, jadwal belum pasti)") || !strings.Contains(system, "PERIODE_DITANYA: jadwal berikutnya (mulai 30 Oktober 2026)") || !strings.Contains(system, "Baris Jadwal memuat jadwal mulai hari ini") {
		t.Fatalf("windows=%v judge=%d prompt:\n%s", retriever.windows, judge.calls, system)
	}
	var meta map[string]any
	_ = json.Unmarshal(result.Assistant.Metadata, &meta)
	if meta["judge"].(map[string]any)["skipped"] != "event_named_schedule" {
		t.Fatalf("judge = %v", meta["judge"])
	}
}

func TestWhenQuestionAboutPastEventSendsOnlyTheLatestSchedule(t *testing.T) {
	dayung := source("event", 22, "Festival Dayung dan Perahu Naga Kali Kedunglarangan", "Lomba perahu.\nJadwal: 2026-09-01T00:00:00+07:00 s.d. 2026-09-01T23:59:00+07:00 (status: past_unconfirmed)\nJadwal: 2025-09-27T00:00:00+07:00 s.d. 2025-09-28T23:59:00+07:00 (status: past_unconfirmed)\nTiket: Gratis", 0.66)
	retriever := &scheduleRetriever{fakeRetriever: fakeRetriever{results: []SemanticResult{dayung}}}
	service, provider, _ := periodService(t, retriever)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 130}, "Festival Dayung digelar tanggal berapa?"); err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if strings.Contains(system, "2025") || !strings.Contains(system, "1 September 2026 (sudah lewat, pelaksanaannya belum terkonfirmasi)") || !strings.Contains(system, "Tiket: Gratis") {
		t.Fatalf("only the latest past schedule, with its status, must be sent:\n%s", system)
	}
}

func TestWhenQuestionWithoutNamedEventKeepsSemanticPath(t *testing.T) {
	retriever := &scheduleRetriever{fakeRetriever: fakeRetriever{results: []SemanticResult{source("destination", 1, "Gunung Bromo", "Gunung.", 0.7)}}}
	service, provider, _ := periodService(t, retriever)
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 131}, "Kapan waktu terbaik mengunjungi Gunung Bromo?")
	if err != nil {
		t.Fatal(err)
	}
	var meta map[string]any
	_ = json.Unmarshal(result.Assistant.Metadata, &meta)
	if strings.Contains(provider.messages[0].Content, "PERIODE_DITANYA") || meta["event_period"] != "" {
		t.Fatalf("a non-event when question must keep the semantic path: %v", meta["event_period"])
	}
}

func TestEventTimeQuestionWithoutAnyEventIsNoSource(t *testing.T) {
	retriever := &scheduleRetriever{}
	service, provider, _ := periodService(t, retriever)
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 122}, "Ada acara hari ini?")
	if err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if !strings.Contains(system, "HASIL_PERIODE: tidak ada acara terjadwal pada periode ini.\n") || !strings.Contains(system, "ATURAN NO-RESULT") {
		t.Fatalf("prompt:\n%s", system)
	}
	var meta map[string]any
	_ = json.Unmarshal(result.Assistant.Metadata, &meta)
	if meta["retrieval_status"] != "no_source" {
		t.Fatalf("status = %v", meta["retrieval_status"])
	}
}

func TestNamedEventIsKeptOutsideThePeriod(t *testing.T) {
	pekanRaya := source("event", 19, "Pekan Raya Pasuruan", "Pameran.\nJadwal: 2026-09-21T00:00:00+07:00 s.d. 2026-09-27T23:59:00+07:00 (status: completed)", 0.67)
	retriever := &scheduleRetriever{
		fakeRetriever: fakeRetriever{results: []SemanticResult{pekanRaya}},
		byWindow:      map[string][]SemanticResult{"2026-10-01": {eventDoc(18, "Pameran Tetap Museum Cunggrang", "Pameran tetap.\nJadwal: 2025-01-09T08:00:00+07:00 (status: ongoing)")}},
	}
	service, provider, _ := periodService(t, retriever)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 123}, "Apakah Pekan Raya Pasuruan ada bulan ini?"); err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	first := strings.Index(system, "NAMA: Pekan Raya Pasuruan")
	if first < 0 || first > strings.Index(system, "NAMA: Pameran Tetap Museum Cunggrang") || !strings.Contains(system, "ACARA_DISEBUT") || !strings.Contains(system, "21–27 September 2026 (sudah selesai)") {
		t.Fatalf("named event not first or rule missing:\n%s", system)
	}
}

func TestTimeQuestionNotAboutEventsKeepsSemanticSearch(t *testing.T) {
	retriever := &scheduleRetriever{fakeRetriever: fakeRetriever{results: []SemanticResult{source("news", 1, "Berita Pasuruan", "Isi berita.", 0.7)}}}
	service, provider, _ := periodService(t, retriever)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 124}, "Berita Pasuruan hari ini apa?"); err != nil {
		t.Fatal(err)
	}
	if len(retriever.windows) != 0 || strings.Contains(provider.messages[0].Content, "PERIODE_DITANYA") || !strings.Contains(provider.messages[0].Content, "NAMA: Berita Pasuruan") {
		t.Fatalf("windows=%v prompt:\n%s", retriever.windows, provider.messages[0].Content)
	}
}

func TestEventTimeQuestionKeepsZoneFilter(t *testing.T) {
	retriever := &scheduleRetriever{byWindow: map[string][]SemanticResult{"2026-11-01": {eventDoc(23, "Pasuruan Street Art Fashion Carnival", "Karnaval.\nJadwal: 2026-11-14T00:00:00+07:00 (status: expected)")}}}
	service, _, _ := periodService(t, retriever)
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 125}, "Acara apa bulan depan di Kota Pasuruan?"); err != nil {
		t.Fatal(err)
	}
	if retriever.region != "Kota Pasuruan" {
		t.Fatalf("region = %q", retriever.region)
	}
}

func TestRetrieverEventsInPeriod(t *testing.T) {
	db := newKnowledgeTestDB(t)
	utc := func(y int, m time.Month, d int) time.Time { return time.Date(y, m, d, 0, 0, 0, 0, wib).UTC() }
	end := func(y int, m time.Month, d int) *time.Time {
		v := utc(y, m, d).Add(23*time.Hour + 59*time.Minute)
		return &v
	}
	status := func(s string) *string { return &s }
	occurrences := []models.EventOccurrence{
		{EventID: 17, StartsAt: utc(2026, 2, 8), EndsAt: end(2026, 2, 8), Status: status("completed")},
		{EventID: 17, StartsAt: utc(2027, 2, 8), EndsAt: end(2027, 2, 8), Status: status("expected")},
		{EventID: 18, StartsAt: utc(2025, 1, 9), Status: status("ongoing")},
		{EventID: 19, StartsAt: utc(2026, 9, 21), EndsAt: end(2026, 9, 27), Status: status("completed")},
		{EventID: 31, StartsAt: utc(2026, 9, 2), Status: status("completed")},
		{EventID: 40, StartsAt: utc(2026, 9, 25), EndsAt: end(2026, 9, 25)},
	}
	if err := db.Create(&occurrences).Error; err != nil {
		t.Fatal(err)
	}
	for _, row := range []struct {
		id     int
		label  string
		active bool
		region string
	}{{17, "Kirab Pataka", true, "Kota Pasuruan"}, {18, "Pameran Tetap", true, "Pasuruan Barat"}, {19, "Pekan Raya", true, "Pasuruan Utara"}, {31, "Haul", true, ""}, {40, "Acara mock", false, ""}} {
		// A source without a zone has NULL metadata, as written by the upsert (regionMetadata).
		var metadata any
		if row.region != "" {
			metadata = regionMetadata(row.region)
		}
		if err := db.Exec(`INSERT INTO faq_knowledge_bases (question, answer, category, source_type, source_id, source_label, is_active, metadata, embedding) VALUES (?, ?, 'acara', 'event', ?, ?, ?, ?, '[0.1]')`, row.label, row.label, row.id, row.label, row.active, metadata).Error; err != nil {
			t.Fatal(err)
		}
	}
	r := NewRetriever(db)
	labels := func(results []SemanticResult) string {
		var out []string
		for _, result := range results {
			out = append(out, pointerString(result.SourceLabel))
		}
		return strings.Join(out, ",")
	}
	september, err := r.EventsInPeriod(context.Background(), wibDate(2026, 9, 1), wibDate(2026, 10, 1), "", 10)
	if err != nil {
		t.Fatal(err)
	}
	if got := labels(september); got != "Pameran Tetap,Haul,Pekan Raya" {
		t.Fatalf("September 2026 = %s", got)
	}
	if september[0].RetrievalMethod != "event_schedule" || september[0].RelevanceStatus != "relevant" {
		t.Fatalf("result marks = %+v", september[0])
	}
	upcoming, _ := r.EventsInPeriod(context.Background(), wibDate(2026, 10, 30), time.Time{}, "", 10)
	if got := labels(upcoming); got != "Pameran Tetap,Kirab Pataka" {
		t.Fatalf("upcoming = %s", got)
	}
	zone, _ := r.EventsInPeriod(context.Background(), wibDate(2026, 10, 30), time.Time{}, "Kota Pasuruan", 10)
	if got := labels(zone); got != "Kirab Pataka" {
		t.Fatalf("zone = %s", got)
	}
}

// J4-03 (2026-11-02): a period with only an ongoing event must not be told "no event"; the prompt says an
// event is still running and asks for it first.
func TestPeriodPromptMentionsOngoingEvents(t *testing.T) {
	intent := factIntent("acara")
	ongoing := protectedSystemPrompt(intent, ragContext{Text: "x", Period: "hari ini", PeriodNearest: true, PeriodContinuing: true}, testToday)
	if strings.Contains(ongoing, "HASIL_PERIODE: tidak ada acara terjadwal pada periode ini.") || !strings.Contains(ongoing, "ada acara yang masih berlangsung") {
		t.Fatalf("ongoing period prompt:\n%s", ongoing)
	}
	empty := protectedSystemPrompt(intent, ragContext{Text: "x", Period: "hari ini", PeriodNearest: true}, testToday)
	if !strings.Contains(empty, "HASIL_PERIODE: tidak ada acara terjadwal pada periode ini.") {
		t.Fatalf("empty period prompt:\n%s", empty)
	}
}
