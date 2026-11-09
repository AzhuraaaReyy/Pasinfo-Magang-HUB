package services

import (
	"context"
	"errors"
	"math"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"wildan-news-backend/internal/models"
)

// fakeNearbyRetriever serves nearest documents per source type and content places by name or source.
type fakeNearbyRetriever struct {
	fakeRetriever
	places  []NearbyOrigin
	nearest map[string][]SemanticResult
	sources map[string]SemanticResult
	exclude []SourceRef
	maxKm   float64
	calls   int
}

func (r *fakeNearbyRetriever) NearestContent(_ context.Context, sourceType string, _ GeoPoint, exclude []SourceRef, _ time.Time, maxKm float64, limit int) ([]SemanticResult, error) {
	r.calls++
	r.exclude, r.maxKm = exclude, maxKm
	var out []SemanticResult
	for _, doc := range r.nearest[sourceType] {
		if doc.Nearby.StraightKm <= maxKm && len(out) < limit {
			info := *doc.Nearby
			doc.Nearby = &info
			out = append(out, doc)
		}
	}
	return out, nil
}

func (r *fakeNearbyRetriever) ContentPlace(_ context.Context, name string, ref *SourceRef, _ string) (*NearbyOrigin, error) {
	for _, place := range r.places {
		if ref != nil && place.SourceType == ref.SourceType && place.SourceID == ref.SourceID {
			p := place
			return &p, nil
		}
		if ref == nil && name != "" && strings.Contains(strings.ToLower(place.Label), strings.ToLower(name)) {
			p := place
			return &p, nil
		}
	}
	return nil, nil
}

func (r *fakeNearbyRetriever) LoadSources(_ context.Context, refs []SourceRef) ([]SemanticResult, error) {
	var out []SemanticResult
	for _, ref := range refs {
		if doc, ok := r.sources[ref.SourceType+":"+pointerInt64(&ref.SourceID)]; ok {
			doc.RelevanceStatus = "relevant"
			out = append(out, doc)
		}
	}
	return out, nil
}

// fakeRouter answers every route with fixed values, or with err.
type fakeRouter struct {
	enabled bool
	err     error
	calls   atomic.Int32 // routes run in parallel
}

func (r *fakeRouter) Enabled() bool { return r.enabled }
func (r *fakeRouter) Route(_ context.Context, _, _ GeoPoint, mode string) (RouteEstimate, error) {
	r.calls.Add(1)
	if r.err != nil {
		return RouteEstimate{}, r.err
	}
	if mode == RouteModeCar {
		return RouteEstimate{DistanceMeters: 31200, Seconds: 2400}, nil
	}
	return RouteEstimate{DistanceMeters: 30800, Seconds: 2100}, nil
}

func nearDoc(sourceType string, id int64, label string, km float64) SemanticResult {
	doc := source(sourceType, id, label, label+" adalah tempat makan.", 0.9)
	doc.Nearby = &NearbyInfo{StraightKm: km, Point: GeoPoint{Lat: labelLat(label), Lng: 112.9}}
	return doc
}

var bromo = NearbyOrigin{SourceType: "destination", SourceID: 55, Label: "Penanjakan Bromo (Penanjakan 1)", Lat: -7.9, Lng: 112.96}

func nearbyService(t *testing.T, plans map[string]QuestionPlan, router *fakeRouter) (*ChatService, *fakeNearbyRetriever, *recordingProvider) {
	t.Helper()
	retriever := &fakeNearbyRetriever{
		places: []NearbyOrigin{bromo, {SourceType: "culinary", SourceID: 7, Label: "Warung Rawon Sate Komo Nguling", Lat: -7.71, Lng: 113.01}},
		nearest: map[string][]SemanticResult{"culinary": {
			nearDoc("culinary", 7, "Warung Rawon Sate Komo Nguling", 25.0),
			nearDoc("culinary", 8, "Ayam Kirana Purwodadi", 26.4),
			nearDoc("culinary", 9, "Bakso Cak'Eb Pasuruan", 26.5),
			nearDoc("culinary", 10, "Warung ARTOMORO", 27.3),
		}},
	}
	retriever.sources = map[string]SemanticResult{"culinary:7": retriever.nearest["culinary"][0]}
	provider := &recordingProvider{stubProvider: stubProvider{name: "ollama:chat"}, reply: "Dari Penanjakan Bromo (Penanjakan 1):\n1. Warung Rawon Sate Komo Nguling\n2. Ayam Kirana Purwodadi\n3. Bakso Cak'Eb Pasuruan"}
	service := NewChatService(newChatTestDB(t), provider, time.Second, retriever)
	service.Reader = &fakeReader{plans: plans}
	if router != nil {
		service.Router = router
	}
	return service, retriever, provider
}

// Session 799 (2026-11-07): "terdekat dari Bromo" got culinaries that only read alike. The nearest three come from the
// distance search, with the origin, the radius step and the travel times in the prompt.
func TestNearestContentFromANamedPlace(t *testing.T) {
	question := "kuliner terdekat dari Bromo apa?"
	router := &fakeRouter{enabled: true}
	service, retriever, provider := nearbyService(t, map[string]QuestionPlan{question: {Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Bromo"}}, router)
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 401}, question)
	if err != nil {
		t.Fatal(err)
	}
	if retriever.called {
		t.Fatal("a nearest question must not use the text similarity search")
	}
	if retriever.maxKm != 50 || len(retriever.exclude) != 1 || retriever.exclude[0] != (SourceRef{SourceType: "destination", SourceID: 55}) {
		t.Fatalf("maxKm=%v exclude=%v", retriever.maxKm, retriever.exclude)
	}
	system := provider.messages[0].Content
	for _, want := range []string{"ASAL_JARAK: Penanjakan Bromo (Penanjakan 1)", "HASIL_RADIUS: tidak ada dalam radius 15 km garis lurus dari asal; yang terdekat berada dalam radius 25 km garis lurus.", "diurutkan sistem dari jarak lewat jalan yang terdekat", "JARAK: 31,2 km lewat jalan dari Penanjakan Bromo (Penanjakan 1); perkiraan waktu tempuh: mobil sekitar 40 menit, motor sekitar 35 menit", "paling banyak 3 item"} {
		if !strings.Contains(system, want) {
			t.Fatalf("prompt missing %q:\n%s", want, system)
		}
	}
	if strings.Contains(system, "Warung ARTOMORO") || router.calls.Load() != 6 {
		t.Fatalf("only the 3 nearest are sent and routed; routes=%d", router.calls.Load())
	}
	answer := *result.Assistant.Content
	if !strings.HasSuffix(answer, "\n"+routeAttribution) || !strings.Contains(answer, "Sumber: Warung Rawon Sate Komo Nguling") {
		t.Fatalf("answer = %q", answer)
	}
	nearby := askMeta(t, result)["nearby"].(map[string]any)
	if nearby["origin"] != bromo.Label || nearby["user_location"] != false || nearby["first_radius_km"] != 25.0 || nearby["radius_km"] != 35.0 || len(nearby["results"].([]any)) != 3 {
		t.Fatalf("nearby = %v", nearby)
	}
}

// The user's location is used for one question only: never in the stored messages or metadata (Owner 2026-11-07).
func TestNearestFromTheUserLocationIsNotStored(t *testing.T) {
	question := "kuliner yang dekat dari lokasi saya apa?"
	service, _, provider := nearbyService(t, map[string]QuestionPlan{question: {Domain: "culinary", Kind: "list", Sort: nearestSort, NearUser: true}}, &fakeRouter{enabled: true})
	result, err := service.AskWithLocation(context.Background(), &models.ChatSession{ID: 402}, question, &GeoPoint{Lat: -7.6474192, Lng: 112.9084766})
	if err != nil {
		t.Fatal(err)
	}
	if system := provider.messages[0].Content; !strings.Contains(system, "ASAL_JARAK: lokasi pengguna") || !strings.Contains(system, "Jangan menulis koordinat pengguna") || strings.Contains(system, "112.908") || strings.Contains(system, "-7.647") {
		t.Fatalf("prompt:\n%s", system)
	}
	var rows []models.ChatMessage
	service.DB.Where("session_id = ?", 402).Find(&rows)
	for _, row := range rows {
		if strings.Contains(string(row.Metadata), "112.908") || strings.Contains(string(row.Metadata), "-7.647") || strings.Contains(pointerString(row.Content), "112.908") {
			t.Fatalf("location stored in message %d: %s", row.ID, row.Metadata)
		}
	}
	if nearby := askMeta(t, result)["nearby"].(map[string]any); nearby["user_location"] != true || nearby["origin_source"] != nil {
		t.Fatalf("nearby = %v", nearby)
	}
}

func TestNearestWithoutAnOriginAsksForIt(t *testing.T) {
	cases := []struct {
		name, question string
		plan           QuestionPlan
		want           string
	}{
		{"location not shared", "wisata dekat sini apa?", QuestionPlan{Domain: "destination", Kind: "list", Sort: nearestSort, NearUser: true}, "izinkan aplikasi membagikan lokasi Anda"},
		{"no origin", "kuliner terdekat apa?", QuestionPlan{Domain: "culinary", Kind: "list", Sort: nearestSort}, "Boleh tahu jaraknya mau dihitung dari tempat mana?"},
		{"unknown place", "kuliner terdekat dari Atlantis?", QuestionPlan{Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Atlantis"}, `saya belum menemukan "Atlantis" di database Pasuruan Info`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			service, retriever, provider := nearbyService(t, map[string]QuestionPlan{c.question: c.plan}, nil)
			result, err := service.Ask(context.Background(), &models.ChatSession{ID: 403}, c.question)
			if err != nil {
				t.Fatal(err)
			}
			if answer := *result.Assistant.Content; !strings.Contains(answer, c.want) || provider.messages != nil || retriever.calls != 0 {
				t.Fatalf("answer=%q model=%v nearest=%d", answer, provider.messages != nil, retriever.calls)
			}
		})
	}
}

func TestNearestNothingWithinTheLastRadius(t *testing.T) {
	question := "budaya terdekat dari Bromo?"
	service, _, provider := nearbyService(t, map[string]QuestionPlan{question: {Domain: "culture", Kind: "list", Sort: nearestSort, Near: "Bromo"}}, nil)
	result, err := service.Ask(context.Background(), &models.ChatSession{ID: 404}, question)
	if err != nil {
		t.Fatal(err)
	}
	if answer := *result.Assistant.Content; answer != "Mohon maaf, belum ada budaya dalam jarak 50 km dari Penanjakan Bromo (Penanjakan 1) di database Pasuruan Info. Boleh coba dari tempat lain atau cari jenis tempat yang lain?" || provider.messages != nil {
		t.Fatalf("answer = %q", answer)
	}
}

// Without a route the straight-line distance is labelled as such, no time is given, and no attribution is added.
func TestNearestWithoutRoutesKeepsTheStraightLineDistance(t *testing.T) {
	question := "kuliner terdekat dari Bromo apa?"
	for name, router := range map[string]*fakeRouter{"no key": {enabled: false}, "provider error": {enabled: true, err: errors.New("geoapify routing HTTP 401")}} {
		t.Run(name, func(t *testing.T) {
			service, _, provider := nearbyService(t, map[string]QuestionPlan{question: {Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Bromo"}}, router)
			result, err := service.Ask(context.Background(), &models.ChatSession{ID: 405}, question)
			if err != nil {
				t.Fatal(err)
			}
			system := provider.messages[0].Content
			if !strings.Contains(system, "JARAK: sekitar 25 km garis lurus dari Penanjakan Bromo (Penanjakan 1); jarak jalan dan waktu tempuh belum tersedia") || strings.Contains(system, "menit") {
				t.Fatalf("prompt:\n%s", system)
			}
			if strings.Contains(*result.Assistant.Content, routeAttribution) {
				t.Fatal("attribution without a route")
			}
		})
	}
}

// "Berapa menit dari sana ke yang pertama?" after a nearest answer: the origin comes from that answer's metadata.
func TestDistanceFollowUpUsesThePreviousOrigin(t *testing.T) {
	first, second := "kuliner terdekat dari Bromo apa?", "berapa menit dari sana ke yang pertama?"
	service, _, provider := nearbyService(t, map[string]QuestionPlan{
		first:  {Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Bromo"},
		second: {Kind: "fact", Info: "distance", FollowUp: true, Position: 1},
	}, &fakeRouter{enabled: true})
	session := &models.ChatSession{ID: 406}
	if _, err := service.Ask(context.Background(), session, first); err != nil {
		t.Fatal(err)
	}
	provider.reply = "Dari Penanjakan Bromo (Penanjakan 1) ke Warung Rawon Sate Komo Nguling sekitar 40 menit dengan mobil."
	result, err := service.Ask(context.Background(), session, second)
	if err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	if !strings.Contains(system, "ASAL_JARAK: Penanjakan Bromo (Penanjakan 1)") || !strings.Contains(system, "JARAK: 31,2 km lewat jalan") || strings.Contains(system, "HASIL_RADIUS") {
		t.Fatalf("prompt:\n%s", system)
	}
	if nearby := askMeta(t, result)["nearby"].(map[string]any); nearby["status"] != nearbyOK || len(nearby["results"].([]any)) != 1 {
		t.Fatalf("nearby = %v", nearby)
	}
}

// N1 (jobdesk 7 Nov): the reader wrote the origin without the brackets of its label; the words decide, not the spelling.
func TestCheckKeepsAnOriginWrittenWithOtherPunctuation(t *testing.T) {
	plan := QuestionPlan{Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Air Terjun UJI 7 NOV"}
	if dropped, _ := plan.check("kuliner terdekat dari Air Terjun [UJI 7 NOV] apa?", nil, nil); plan.Near != "Air Terjun UJI 7 NOV" || len(dropped) != 0 {
		t.Fatalf("plan=%+v dropped=%v", plan, dropped)
	}
	partly := QuestionPlan{Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Air Terjun Sumber Pitu"}
	if partly.check("kuliner terdekat dari air terjun apa?", nil, nil); partly.Near != "" {
		t.Fatalf("a word the user did not write must drop the origin: %+v", partly)
	}
}

// N1 (jobdesk 7 Nov): an origin the check dropped is not replaced by the previous answer's place.
func TestDroppedOriginAsksInsteadOfUsingThePreviousPlace(t *testing.T) {
	first, second := "kuliner terdekat dari Bromo apa?", "kuliner terdekat dari situ yang lain apa?"
	service, retriever, provider := nearbyService(t, map[string]QuestionPlan{
		first:  {Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Bromo"},
		second: {Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Air Terjun Sumber Pitu", FollowUp: true, Position: 1},
	}, nil)
	session := &models.ChatSession{ID: 408}
	if _, err := service.Ask(context.Background(), session, first); err != nil {
		t.Fatal(err)
	}
	calls := retriever.calls
	provider.messages = nil
	result, err := service.Ask(context.Background(), session, second)
	if err != nil {
		t.Fatal(err)
	}
	if answer := *result.Assistant.Content; !strings.Contains(answer, "Boleh tahu jaraknya mau dihitung dari tempat mana?") || retriever.calls != calls || provider.messages != nil {
		t.Fatalf("answer=%q nearest calls=%d→%d model=%v", answer, calls, retriever.calls, provider.messages != nil)
	}
}

// N1 (jobdesk 7 Nov, live retest): the reader shortened "Air Terjun [UJI 7 NOV]" to "Air Terjun" and the shortest
// matching label was another waterfall; a label the user wrote in full wins.
func TestPickWrittenPlacePrefersTheLabelTheUserWrote(t *testing.T) {
	rows := []NearbyOrigin{{Label: "Air Terjun Kakek Bodo"}, {Label: "Air Terjun [UJI 7 NOV]"}, {Label: "Air Terjun Coban Binangun"}}
	evidence := conversationEvidence("kuliner terdekat dari Air Terjun [UJI 7 NOV] apa?", nil)
	if got := pickWrittenPlace(rows, evidence); got != 1 {
		t.Fatalf("picked %q", rows[got].Label)
	}
	if got := pickWrittenPlace(rows, conversationEvidence("kuliner terdekat dari air terjun apa?", nil)); got != 0 {
		t.Fatalf("without a full label the database order stays: %q", rows[got].Label)
	}
	history := []HistoryTurn{{Question: "Ada wisata air terjun?", Sources: []string{"Air Terjun Coban Binangun"}}}
	if got := pickWrittenPlace(rows, conversationEvidence("kuliner dekat air terjun tadi apa?", history)); got != 2 {
		t.Fatalf("a label from the previous answer counts: %q", rows[got].Label)
	}
}

// N2 (regression 2026-11-07): "berapa menit dari Bromo ke yang kedua?" read as a nearest search must still answer the
// second item of the previous answer, not a new nearest list.
func TestDistanceToAnEarlierItemIsNotANewNearestSearch(t *testing.T) {
	first, second := "kuliner terdekat dari Bromo apa?", "berapa menit dari Bromo ke yang kedua?"
	service, retriever, provider := nearbyService(t, map[string]QuestionPlan{
		first:  {Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Bromo"},
		second: {Domain: "culinary", Kind: "fact", Info: "distance", Sort: nearestSort, Near: "Bromo", FollowUp: true, Position: 2},
	}, &fakeRouter{enabled: true})
	retriever.sources["culinary:8"] = retriever.nearest["culinary"][1]
	retriever.places = append(retriever.places, NearbyOrigin{SourceType: "culinary", SourceID: 8, Label: "Ayam Kirana Purwodadi", Lat: -7.72, Lng: 112.70})
	session := &models.ChatSession{ID: 409}
	if _, err := service.Ask(context.Background(), session, first); err != nil {
		t.Fatal(err)
	}
	calls := retriever.calls
	provider.reply = "Dari Penanjakan Bromo (Penanjakan 1) ke Ayam Kirana Purwodadi kira-kira 40 menit naik mobil."
	result, err := service.Ask(context.Background(), session, second)
	if err != nil {
		t.Fatal(err)
	}
	if retriever.calls != calls {
		t.Fatalf("a new nearest search ran: calls %d→%d", calls, retriever.calls)
	}
	nearby := askMeta(t, result)["nearby"].(map[string]any)
	results := nearby["results"].([]any)
	if nearby["origin"] != bromo.Label || len(results) != 1 || results[0].(map[string]any)["source_label"] != "Ayam Kirana Purwodadi" {
		t.Fatalf("nearby = %v", nearby)
	}
}

func TestCheckKeepsOnlyTheOriginTheUserNamed(t *testing.T) {
	invented := QuestionPlan{Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Coban Rondo"}
	if dropped, _ := invented.check("kuliner terdekat dari sini", nil, nil); invented.Near != "" || !strings.Contains(strings.Join(dropped, ","), "near") {
		t.Fatalf("plan=%+v dropped=%v", invented, dropped)
	}
	user := QuestionPlan{Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Bromo", NearUser: true}
	if user.check("kuliner dekat lokasi saya, saya habis dari bromo", nil, nil); user.Near != "" || !user.NearUser {
		t.Fatalf("the user's position replaces a named origin: %+v", user)
	}
	news := QuestionPlan{Domain: "news", Kind: "list", Sort: nearestSort, Near: "Bromo"}
	if news.check("berita terdekat dari Bromo", nil, nil); news.Sort != "relevance" || news.Near != "" {
		t.Fatalf("news has no place: %+v", news)
	}
	plain := QuestionPlan{Domain: "destination", Kind: "fact", Near: "Bromo", NearUser: true}
	if plain.check("di mana Bromo?", nil, nil); plain.Near != "" || plain.NearUser {
		t.Fatalf("an origin only belongs to a distance question: %+v", plain)
	}
	named := QuestionPlan{Domain: "destination", Kind: "list", Sort: nearestSort, Near: "Coban Waru", FollowUp: true}
	history := []HistoryTurn{{Question: "Di mana Coban Waru?", Sources: []string{"Coban Waru"}}}
	if named.check("selain itu wisata apa yang dekat sana?", history, nil); named.Near != "Coban Waru" {
		t.Fatalf("an origin from the history is kept: %+v", named)
	}
}

// The road route decides the order once it is known (live test 2026-11-07: 47 km by road came after 51 km).
func TestNearestIsOrderedByRoadDistance(t *testing.T) {
	question := "kuliner terdekat dari Bromo apa?"
	service, _, provider := nearbyService(t, map[string]QuestionPlan{question: {Domain: "culinary", Kind: "list", Sort: nearestSort, Near: "Bromo"}}, nil)
	service.Router = roadRouter{"Ayam Kirana Purwodadi": 50.8, "Bakso Cak'Eb Pasuruan": 47.2, "Warung Rawon Sate Komo Nguling": 51.0}
	if _, err := service.Ask(context.Background(), &models.ChatSession{ID: 407}, question); err != nil {
		t.Fatal(err)
	}
	system := provider.messages[0].Content
	bakso, ayam, rawon := strings.Index(system, "NAMA: Bakso"), strings.Index(system, "NAMA: Ayam"), strings.Index(system, "NAMA: Warung Rawon")
	if !(bakso >= 0 && bakso < ayam && ayam < rawon) {
		t.Fatalf("order by road km wanted:\n%s", system)
	}
}

// roadRouter returns a road distance per destination point label (the fake points differ by latitude only).
type roadRouter map[string]float64

func (roadRouter) Enabled() bool { return true }
func (r roadRouter) Route(_ context.Context, _, to GeoPoint, _ string) (RouteEstimate, error) {
	for label, km := range r {
		if to.Lat == labelLat(label) {
			return RouteEstimate{DistanceMeters: km * 1000, Seconds: km * 90}, nil
		}
	}
	return RouteEstimate{}, errors.New("no route")
}

// labelLat gives each fake document its own latitude, so a route can be told apart by its destination.
func labelLat(label string) float64 {
	sum := 0
	for i, r := range label {
		sum += (i + 1) * int(r)
	}
	return -7 - float64(sum%10000)/100000
}

// C3 (jobdesk 7 Nov): a result at the origin's own place has no route; it is named as such and comes first.
func TestResultAtTheOriginsPlaceComesFirst(t *testing.T) {
	same := NearbyInfo{Origin: "Air Terjun", StraightKm: 0.02}
	road := NearbyInfo{Origin: "Air Terjun", StraightKm: 1.6, RoadKm: 1.9, CarMinutes: 5}
	far := NearbyInfo{Origin: "Air Terjun", StraightKm: 4}
	if same.line() != "berada di lokasi yang sama atau bersebelahan dengan Air Terjun" || !(same.orderKm() < road.orderKm() && road.orderKm() < far.orderKm()) {
		t.Fatalf("line=%q order=%v %v %v", same.line(), same.orderKm(), road.orderKm(), far.orderKm())
	}
	if !strings.Contains(far.line(), "sekitar 4 km garis lurus") {
		t.Fatalf("far = %q", far.line())
	}
}

func TestNearbyHelpers(t *testing.T) {
	for km, want := range map[float64]float64{0.4: 5, 5: 5, 5.1: 15, 25: 25, 34.9: 35, 49: 50, 60: 50} {
		if got := radiusStep(km); got != want {
			t.Errorf("radiusStep(%v) = %v, want %v", km, got, want)
		}
	}
	if formatKm(25) != "25" || formatKm(26.44) != "26,4" || formatMinutes(45) != "45 menit" || formatMinutes(60) != "1 jam" || formatMinutes(65) != "1 jam 5 menit" {
		t.Fatal("format")
	}
	// One degree of longitude on the equator is 111.19 km.
	if got := straightKm(GeoPoint{0, 0}, GeoPoint{0, 1}); math.Abs(got-111.19) > 0.01 {
		t.Fatalf("straightKm = %v", got)
	}
}

// T12 (audit 2026-11-08): the previous answer's sources and the search results may hold the same document; it is looked up
// and routed once.
func TestDistanceOutcomeRoutesARepeatedDocumentOnce(t *testing.T) {
	router := &fakeRouter{enabled: true}
	service, retriever, _ := nearbyService(t, nil, router)
	warung := retriever.nearest["culinary"][0]
	plan := QuestionPlan{Domain: "culinary", Kind: "fact", Info: "distance", Near: "Bromo"}
	answer, out, err := service.distanceOutcome(context.Background(), 9705, 1, plan, originHint{Evidence: "berapa jauh dari bromo"}, []SemanticResult{warung, warung}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if answer.Status != nearbyOK || len(answer.Docs) != 1 || router.calls.Load() != 2 || len(out) != 2 || out[1].Nearby == nil {
		t.Fatalf("status=%s docs=%d router calls=%d out=%d", answer.Status, len(answer.Docs), router.calls.Load(), len(out))
	}
}
