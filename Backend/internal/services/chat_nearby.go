package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

// Nearest content and travel times (Owner 2026-11-07, option B). Distances come from places coordinates (schema.md §8:
// calculated, never stored); road distance and car/motorcycle times come from the TravelRouter for the few results
// only. The user's location is used for one question and never stored.

// nearbyRadiiKm are the radius steps of a nearest search; the last one is the limit (Owner 2026-11-07: 50 km).
var nearbyRadiiKm = []float64{5, 15, 25, 35, 50}

// nearbyDefaultCount is the number of nearest results without a number from the user (Owner 2026-11-07).
const nearbyDefaultCount = 3

// routeTimeout bounds all route calls of one answer.
const routeTimeout = 8 * time.Second

// nearbyTypes are the place-based domains a nearest search covers.
var nearbyTypes = []string{"destination", "culinary", "culture", "event"}

// NearbyInfo is the distance of one document from the origin. Road values are 0 when unknown.
type NearbyInfo struct {
	Origin       string
	StraightKm   float64
	Point        GeoPoint
	RoadKm       float64
	CarMinutes   int
	MotorMinutes int
}

// NearbyOrigin is the point distances are measured from: a content place, or the user's shared location.
type NearbyOrigin struct {
	SourceType string
	SourceID   int64
	Label      string
	Lat, Lng   float64
	User       bool `gorm:"-"`
}

func (o NearbyOrigin) point() GeoPoint { return GeoPoint{Lat: o.Lat, Lng: o.Lng} }

// name is how the answer names the origin.
func (o NearbyOrigin) name() string {
	if o.User {
		return "lokasi Anda"
	}
	return o.Label
}

// NearbyRetriever finds content near a point and the place of a content (implemented by *Retriever).
type NearbyRetriever interface {
	NearestContent(ctx context.Context, sourceType string, from GeoPoint, exclude []SourceRef, today time.Time, maxKm float64, limit int) ([]SemanticResult, error)
	ContentPlace(ctx context.Context, name string, ref *SourceRef, evidence string) (*NearbyOrigin, error)
}

// originHint is what a named origin is checked against (N1, jobdesk 7 Nov): Dropped is true when check() removed the
// reader's origin, and Evidence is the lower-case conversation (conversationEvidence).
type originHint struct {
	Dropped  bool
	Evidence string
}

// Outcomes of a distance question that are answered with a fixed text.
const (
	nearbyOK             = "ok"
	nearbyNeedLocation   = "need_location"
	nearbyNeedOrigin     = "need_origin"
	nearbyOriginNotFound = "origin_not_found"
	nearbyNoneWithin     = "none_within"
)

// nearbyAnswer is the result of a distance question.
type nearbyAnswer struct {
	Status string
	Origin *NearbyOrigin
	// NotFound is the place name the user gave that is not in the database.
	NotFound string
	// Domain is the source type searched ("" = every place-based domain).
	Domain string
	// Radius is the smallest radius step holding every result; FirstRadius the one holding the nearest.
	Radius, FirstRadius float64
	Docs                []SemanticResult
	Routed              bool
}

// fixedText is the answer for an outcome without documents, or "".
func (n *nearbyAnswer) fixedText() string {
	switch n.Status {
	case nearbyNeedLocation:
		return "Untuk mencari yang terdekat dari posisi Anda, izinkan aplikasi membagikan lokasi Anda terlebih dahulu. Lokasi hanya dipakai untuk pertanyaan ini dan tidak disimpan. Anda juga bisa menyebutkan nama tempat sebagai titik awal, misalnya \"kuliner terdekat dari Candi Jawi\"."
	case nearbyNeedOrigin:
		return "Boleh tahu jaraknya mau dihitung dari tempat mana? Silakan sebutkan nama tempatnya, misalnya \"wisata terdekat dari Coban Waru\", atau izinkan aplikasi membagikan lokasi Anda."
	case nearbyOriginNotFound:
		return fmt.Sprintf("Mohon maaf, saya belum menemukan \"%s\" di database Pasuruan Info, jadi jaraknya belum bisa dihitung. Boleh sebutkan nama tempat lain di Pasuruan, atau izinkan aplikasi membagikan lokasi Anda?", n.NotFound)
	case nearbyNoneWithin:
		return fmt.Sprintf("Mohon maaf, belum ada %s dalam jarak %s km dari %s di database Pasuruan Info. Boleh coba dari tempat lain atau cari jenis tempat yang lain?", nearbyDomainWord(n.Domain), formatKm(nearbyRadiiKm[len(nearbyRadiiKm)-1]), n.Origin.name())
	}
	return ""
}

func nearbyDomainWord(sourceType string) string {
	switch sourceType {
	case "destination":
		return "wisata"
	case "culinary":
		return "kuliner"
	case "culture":
		return "budaya"
	case "event":
		return "acara mendatang"
	}
	return "wisata, kuliner, budaya, atau acara"
}

// metadata describes the answer for chat_messages.metadata. The user's location is never part of it.
func (n *nearbyAnswer) metadata() map[string]any {
	out := map[string]any{"status": n.Status, "domain": n.Domain, "radius_km": n.Radius, "first_radius_km": n.FirstRadius, "routed": n.Routed}
	if n.Origin != nil {
		out["origin"] = n.Origin.name()
		out["user_location"] = n.Origin.User
		if !n.Origin.User {
			out["origin_source"] = SourceRef{SourceType: n.Origin.SourceType, SourceID: n.Origin.SourceID}
		}
	}
	var results []map[string]any
	for _, doc := range n.Docs {
		if doc.Nearby == nil {
			continue
		}
		results = append(results, map[string]any{"source_label": pointerString(doc.SourceLabel), "straight_km": round1(doc.Nearby.StraightKm), "road_km": round1(doc.Nearby.RoadKm), "car_minutes": doc.Nearby.CarMinutes, "motorcycle_minutes": doc.Nearby.MotorMinutes})
	}
	out["results"] = results
	return out
}

// nearestOutcome answers a nearest-content question: it resolves the origin, searches the radius steps, and adds the
// road distance and travel times of the results.
func (s *ChatService) nearestOutcome(ctx context.Context, plan QuestionPlan, hint originHint, carried []SemanticResult, location *GeoPoint, limit int) (*nearbyAnswer, error) {
	finder, ok := s.Retriever.(NearbyRetriever)
	if !ok {
		return nil, errors.New("nearest: retriever without coordinates")
	}
	answer := &nearbyAnswer{Domain: filterSourceTableDomain(plan.Domain)}
	origin, status, err := s.nearbyOrigin(ctx, finder, plan, hint, carried, location, nil)
	if err != nil || origin == nil {
		answer.Status, answer.NotFound = status, plan.Near
		return answer, err
	}
	answer.Origin = origin
	exclude := []SourceRef{}
	if !origin.User {
		exclude = append(exclude, SourceRef{SourceType: origin.SourceType, SourceID: origin.SourceID})
	}
	if plan.Others {
		for _, doc := range carried {
			exclude = append(exclude, SourceRef{SourceType: pointerString(doc.SourceType), SourceID: pointerInt64Value(doc.SourceID)})
		}
	}
	types := nearbyTypes
	if answer.Domain != "" {
		types = []string{answer.Domain}
	}
	maxKm := nearbyRadiiKm[len(nearbyRadiiKm)-1]
	var docs []SemanticResult
	for _, sourceType := range types {
		found, err := finder.NearestContent(ctx, sourceType, origin.point(), exclude, s.today(), maxKm, limit)
		if err != nil {
			return nil, err
		}
		docs = append(docs, found...)
	}
	// One query per domain up to the last step gives the same nearest results as searching step by step; the steps
	// are reported to the user (Owner 2026-11-07: nothing within 5 km, the nearest within 25 km).
	sort.SliceStable(docs, func(i, j int) bool { return docs[i].Nearby.StraightKm < docs[j].Nearby.StraightKm })
	docs = limitResults(docs, limit)
	if len(docs) == 0 {
		answer.Status = nearbyNoneWithin
		return answer, nil
	}
	answer.Status = nearbyOK
	answer.FirstRadius = radiusStep(docs[0].Nearby.StraightKm)
	answer.Radius = radiusStep(docs[len(docs)-1].Nearby.StraightKm)
	answer.Docs, answer.Routed = s.addRoutes(ctx, origin, docs)
	if answer.Routed {
		// The road distance is what the user travels: the model reordered a straight-line list by it (live test
		// 2026-11-07, Bromo), so the backend orders by it. A result without a route follows the routed ones.
		sort.SliceStable(answer.Docs, func(i, j int) bool { return answer.Docs[i].Nearby.orderKm() < answer.Docs[j].Nearby.orderKm() })
	}
	return answer, nil
}

// distanceOutcome adds the distance from the origin to the documents of a distance question ("berapa menit dari Bromo
// ke sana"). The origin is the place the question names, the user's location, or the origin of the previous nearest answer.
func (s *ChatService) distanceOutcome(ctx context.Context, sessionID, beforeID int64, plan QuestionPlan, hint originHint, docs []SemanticResult, location *GeoPoint) (*nearbyAnswer, []SemanticResult, error) {
	finder, ok := s.Retriever.(NearbyRetriever)
	if !ok {
		return nil, docs, nil
	}
	previous, err := s.previousNearbyOrigin(ctx, sessionID, beforeID)
	if err != nil {
		return nil, docs, err
	}
	answer := &nearbyAnswer{}
	origin, status, err := s.nearbyOrigin(ctx, finder, plan, hint, nil, location, previous)
	if err != nil || origin == nil {
		answer.Status, answer.NotFound = status, plan.Near
		return answer, docs, err
	}
	answer.Origin, answer.Status = origin, nearbyOK
	out := append([]SemanticResult(nil), docs...)
	var targets []SemanticResult
	// The previous answer's sources come before the search results and may repeat one of them (buildRAGContext drops
	// the duplicates later): a repeated document would be looked up and routed twice and take a second target (T12).
	seen := map[string]bool{}
	for i, doc := range out {
		if len(targets) == nearbyDefaultCount {
			break
		}
		if seen[sourceKey(doc)] || filterSourceTables[pointerString(doc.SourceType)] == "" || (!origin.User && pointerString(doc.SourceType) == origin.SourceType && pointerInt64Value(doc.SourceID) == origin.SourceID) {
			continue
		}
		seen[sourceKey(doc)] = true
		ref := SourceRef{SourceType: pointerString(doc.SourceType), SourceID: pointerInt64Value(doc.SourceID)}
		place, err := finder.ContentPlace(ctx, "", &ref, "")
		if err != nil {
			return nil, docs, err
		}
		if place == nil {
			continue
		}
		out[i].Nearby = &NearbyInfo{StraightKm: straightKm(origin.point(), place.point()), Point: place.point()}
		targets = append(targets, out[i])
	}
	routed, ok2 := s.addRoutes(ctx, origin, targets)
	answer.Docs, answer.Routed = routed, ok2
	for _, doc := range routed {
		for i := range out {
			if sourceKey(out[i]) == sourceKey(doc) {
				out[i].Nearby = doc.Nearby
			}
		}
	}
	return answer, out, nil
}

// nearbyOrigin resolves where distances start: the user's location, a named place, the single earlier answer the question
// points at (carried), or the origin of the previous nearest answer. hint.Dropped means the reader named an origin that
// check() could not find in the conversation: the user asked from a place, so no earlier place stands in for it (N1,
// jobdesk 7 Nov: distances were given from the previous answer's place).
func (s *ChatService) nearbyOrigin(ctx context.Context, finder NearbyRetriever, plan QuestionPlan, hint originHint, carried []SemanticResult, location *GeoPoint, previous *nearbyPrevious) (*NearbyOrigin, string, error) {
	if plan.NearUser {
		if location == nil {
			return nil, nearbyNeedLocation, nil
		}
		return &NearbyOrigin{Lat: location.Lat, Lng: location.Lng, User: true}, nearbyOK, nil
	}
	if plan.Near == "" && hint.Dropped {
		return nil, nearbyNeedOrigin, nil
	}
	if plan.Near != "" {
		origin, err := finder.ContentPlace(ctx, plan.Near, nil, hint.Evidence)
		if err != nil || origin != nil {
			return origin, nearbyOK, err
		}
		origin, err = s.semanticOrigin(ctx, finder, plan.Near)
		if err != nil || origin != nil {
			return origin, nearbyOK, err
		}
		return nil, nearbyOriginNotFound, nil
	}
	if len(carried) == 1 {
		ref := SourceRef{SourceType: pointerString(carried[0].SourceType), SourceID: pointerInt64Value(carried[0].SourceID)}
		origin, err := finder.ContentPlace(ctx, "", &ref, "")
		if err != nil || origin != nil {
			return origin, nearbyOK, err
		}
	}
	if previous != nil {
		if previous.UserLocation {
			if location == nil {
				return nil, nearbyNeedLocation, nil
			}
			return &NearbyOrigin{Lat: location.Lat, Lng: location.Lng, User: true}, nearbyOK, nil
		}
		if previous.Source != nil {
			origin, err := finder.ContentPlace(ctx, "", previous.Source, "")
			if err != nil || origin != nil {
				return origin, nearbyOK, err
			}
		}
	}
	return nil, nearbyNeedOrigin, nil
}

// semanticOrigin finds a named place whose label differs from the user's spelling: the most similar relevant document
// of a place-based domain.
func (s *ChatService) semanticOrigin(ctx context.Context, finder NearbyRetriever, name string) (*NearbyOrigin, error) {
	results, err := s.Retriever.SemanticSearch(ctx, s.LLM, name, "", defaultFactLimit)
	if err != nil {
		return nil, err
	}
	for _, result := range results {
		if !isRelevant(result) || filterSourceTables[pointerString(result.SourceType)] == "" {
			continue
		}
		ref := SourceRef{SourceType: pointerString(result.SourceType), SourceID: pointerInt64Value(result.SourceID)}
		return finder.ContentPlace(ctx, "", &ref, "")
	}
	return nil, nil
}

// nearbyPrevious is the origin stored in the previous answer's metadata.
type nearbyPrevious struct {
	Source       *SourceRef `json:"origin_source"`
	UserLocation bool       `json:"user_location"`
}

func (s *ChatService) previousNearbyOrigin(ctx context.Context, sessionID, beforeID int64) (*nearbyPrevious, error) {
	var previous models.ChatMessage
	err := s.DB.WithContext(ctx).Where("session_id = ? AND role = ? AND id < ?", sessionID, "assistant", beforeID).Order("id DESC").First(&previous).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var stored struct {
		Nearby *nearbyPrevious `json:"nearby"`
	}
	if len(previous.Metadata) == 0 || json.Unmarshal(previous.Metadata, &stored) != nil || stored.Nearby == nil {
		return nil, nil
	}
	if stored.Nearby.Source == nil && !stored.Nearby.UserLocation {
		return nil, nil
	}
	return stored.Nearby, nil
}

// addRoutes adds the road distance and the car and motorcycle times of the first routedResults documents, bounded by
// routeTimeout. A route between two places comes from the route cache when it is there; the user's location is never
// cached. When the visitor is over its route limit, only cached routes are used. A missing route keeps the straight-line
// distance; routed is true when any time was found (T03, audit 2026-11-08).
func (s *ChatService) addRoutes(ctx context.Context, origin *NearbyOrigin, docs []SemanticResult) ([]SemanticResult, bool) {
	out := make([]SemanticResult, len(docs))
	for i, doc := range docs {
		out[i] = doc
		info := *doc.Nearby
		info.Origin = origin.name()
		out[i].Nearby = &info
	}
	if s.Router == nil || !s.Router.Enabled() {
		return out, false
	}
	cache := s.routeCache
	if origin.User {
		cache = nil
	}
	var mu sync.Mutex
	routed := false
	apply := func(i int, mode string, route RouteEstimate) {
		mu.Lock()
		defer mu.Unlock()
		info := out[i].Nearby
		minutes := int(math.Ceil(route.Seconds / 60))
		if mode == RouteModeCar {
			info.CarMinutes, info.RoadKm = minutes, route.DistanceMeters/1000
		} else {
			info.MotorMinutes = minutes
			if info.RoadKm == 0 {
				info.RoadKm = route.DistanceMeters / 1000
			}
		}
		routed = true
	}
	type routeJob struct {
		i    int
		mode string
	}
	var jobs []routeJob
	for i := range out {
		if i == routedResults {
			break
		}
		for _, mode := range []string{RouteModeCar, RouteModeMotorcycle} {
			if cache != nil {
				if route, ok := cache.get(routeKey(origin.point(), out[i].Nearby.Point, mode)); ok {
					apply(i, mode, route)
					continue
				}
			}
			jobs = append(jobs, routeJob{i, mode})
		}
	}
	if len(jobs) > 0 && s.routeLimit != nil && !s.routeLimit.allow(visitorFrom(ctx)) {
		log.Printf("[Chat] nearby routes not requested: visitor over %d routed answers per minute; straight-line distance used", routeAnswersPerMinute)
		return out, routed
	}
	routeCtx, cancel := context.WithTimeout(ctx, routeTimeout)
	defer cancel()
	var wg sync.WaitGroup
	for _, job := range jobs {
		wg.Add(1)
		go func(job routeJob) {
			defer wg.Done()
			from, to := origin.point(), out[job.i].Nearby.Point
			route, err := s.Router.Route(routeCtx, from, to, job.mode)
			if err != nil {
				return
			}
			if cache != nil {
				cache.put(routeKey(from, to, job.mode), route)
			}
			apply(job.i, job.mode, route)
		}(job)
	}
	wg.Wait()
	return out, routed
}

// line is the JARAK line of a document in the context: the only source of distance and time the model may use.
// samePlaceKm is the straight-line distance below which a result is at the origin's own place: a router has no route
// between one point and itself (live test 2026-11-07: "0 km", no time, and the model reordered the list).
const samePlaceKm = 0.1

func (n NearbyInfo) samePlace() bool { return n.RoadKm == 0 && n.StraightKm < samePlaceKm }

// orderKm orders a routed answer: the origin's own place first, then road distance, then results without a route.
func (n NearbyInfo) orderKm() float64 {
	switch {
	case n.samePlace():
		return 0
	case n.RoadKm > 0:
		return n.RoadKm
	}
	return math.MaxFloat64
}

func (n NearbyInfo) line() string {
	if n.samePlace() {
		return fmt.Sprintf("berada di lokasi yang sama atau bersebelahan dengan %s", n.Origin)
	}
	if n.CarMinutes == 0 && n.MotorMinutes == 0 {
		return fmt.Sprintf("sekitar %s km garis lurus dari %s; jarak jalan dan waktu tempuh belum tersedia", formatKm(n.StraightKm), n.Origin)
	}
	car, motor := "belum tersedia", "belum tersedia"
	if n.CarMinutes > 0 {
		car = "sekitar " + formatMinutes(n.CarMinutes)
	}
	if n.MotorMinutes > 0 {
		motor = "sekitar " + formatMinutes(n.MotorMinutes)
	}
	return fmt.Sprintf("%s km lewat jalan dari %s; perkiraan waktu tempuh: mobil %s, motor %s", formatKm(n.RoadKm), n.Origin, car, motor)
}

// radiusStep is the smallest radius step holding km.
func radiusStep(km float64) float64 {
	for _, step := range nearbyRadiiKm {
		if km <= step {
			return step
		}
	}
	return nearbyRadiiKm[len(nearbyRadiiKm)-1]
}

// straightKm is the haversine distance in km, the same formula as straightKmSQL.
func straightKm(a, b GeoPoint) float64 {
	rad := math.Pi / 180
	h := math.Pow(math.Sin((b.Lat-a.Lat)*rad/2), 2) + math.Cos(a.Lat*rad)*math.Cos(b.Lat*rad)*math.Pow(math.Sin((b.Lng-a.Lng)*rad/2), 2)
	return 6371 * 2 * math.Asin(math.Min(1, math.Sqrt(h)))
}

// filterSourceTableDomain returns the plan domain when a nearest search can be limited to it, else "".
func filterSourceTableDomain(domain string) string {
	if filterSourceTables[domain] != "" {
		return domain
	}
	return ""
}

func round1(v float64) float64 { return math.Round(v*10) / 10 }

// formatKm writes a distance the Indonesian way ("25,3"; whole numbers without decimals).
func formatKm(km float64) string {
	if km == math.Trunc(km) {
		return fmt.Sprintf("%.0f", km)
	}
	return strings.Replace(fmt.Sprintf("%.1f", km), ".", ",", 1)
}

func formatMinutes(minutes int) string {
	if minutes < 60 {
		return fmt.Sprintf("%d menit", minutes)
	}
	if minutes%60 == 0 {
		return fmt.Sprintf("%d jam", minutes/60)
	}
	return fmt.Sprintf("%d jam %d menit", minutes/60, minutes%60)
}

// nearbyPrompt holds the distance rules of the answer prompt.
func nearbyPrompt(n *nearbyAnswer) string {
	if n == nil || n.Origin == nil {
		return ""
	}
	var b strings.Builder
	origin := n.Origin.name()
	if n.Origin.User {
		origin = "lokasi pengguna (dibagikan pengguna untuk pertanyaan ini)"
	}
	fmt.Fprintf(&b, "ASAL_JARAK: %s\n", origin)
	if n.FirstRadius > nearbyRadiiKm[0] {
		fmt.Fprintf(&b, "HASIL_RADIUS: tidak ada dalam radius %s km garis lurus dari asal; yang terdekat berada dalam radius %s km garis lurus.\n", formatKm(previousRadius(n.FirstRadius)), formatKm(n.FirstRadius))
	} else if n.Radius > 0 {
		fmt.Fprintf(&b, "HASIL_RADIUS: semua hasil berada dalam radius %s km garis lurus dari asal.\n", formatKm(n.Radius))
	}
	b.WriteString("ATURAN_JARAK: Sebut asal jaraknya. Ambil jarak dan waktu tempuh hanya dari baris JARAK dokumen itu, dan jangan menghitung atau mengarang jarak atau waktu sendiri. Tulis jaraknya dengan kalimat sederhana.")
	if n.Routed {
		// Live test 2026-11-07: the estimate note was repeated under every item.
		b.WriteString(" Tulis waktu tempuh dengan kalimat sederhana, misalnya \"kira-kira 1 jam 5 menit naik mobil\", dan sebutkan satu kali saja di akhir bahwa waktunya perkiraan dan bisa berbeda tergantung kondisi jalan.")
	}
	if n.Radius > 0 {
		b.WriteString(" Radius adalah jarak garis lurus dan jarak lewat jalan bisa lebih jauh; bila tidak ada tempat dalam radius tertentu, sampaikan dengan kalimat sederhana, misalnya \"belum ada kuliner dalam jarak 15 km, jadi berikut pilihan terdekatnya\".")
		order := "jarak garis lurus"
		if n.Routed {
			order = "jarak lewat jalan"
		}
		fmt.Fprintf(&b, " Dokumen di CONTEXT sudah diurutkan sistem dari %s yang terdekat; sajikan dalam urutan itu dan jangan menyebut tempat sebagai terbaik.", order)
	}
	if n.Origin.User {
		b.WriteString(" Jangan menulis koordinat pengguna.")
	}
	b.WriteString("\n")
	return b.String()
}

// previousRadius is the radius step before step (the radius that held nothing).
func previousRadius(step float64) float64 {
	for i, r := range nearbyRadiiKm {
		if r == step && i > 0 {
			return nearbyRadiiKm[i-1]
		}
	}
	return nearbyRadiiKm[0]
}

// routeAttribution is the line a routed answer ends with (Geoapify free plan terms).
const routeAttribution = "Perkiraan rute: Geoapify"
