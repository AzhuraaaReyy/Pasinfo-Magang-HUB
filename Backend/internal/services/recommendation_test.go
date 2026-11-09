package services

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

var recNow = time.Date(2026, 11, 3, 10, 0, 0, 0, time.UTC)

// newRecommendationTestDB builds a small catalogue: destinations in Bangil (Utara), Beji (Utara), and Tosari
// (Selatan), a culinary place in Bangil, a past and an upcoming event, and two news items.
func newRecommendationTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.Category{}, &models.News{}, &models.NewsImage{}, &models.Region{}, &models.TravelCategory{}, &models.Place{}, &models.Destination{},
		&models.Culinary{}, &models.Culture{}, &models.Event{}, &models.EventOccurrence{}, &models.Verification{}, &models.TravelSource{}, &models.Sourceable{}, &models.Media{}); err != nil {
		t.Fatal(err)
	}
	must := func(v any) {
		if err := db.Create(v).Error; err != nil {
			t.Fatal(err)
		}
	}
	utara, selatan := models.Region{Name: "Pasuruan Utara", Slug: "pasuruan-utara"}, models.Region{Name: "Pasuruan Selatan", Slug: "pasuruan-selatan"}
	must(&utara)
	must(&selatan)
	alam, religi := models.TravelCategory{Domain: "wisata", Slug: "alam", Name: "Wisata Alam"}, models.TravelCategory{Domain: "wisata", Slug: "religi", Name: "Wisata Religi"}
	must(&alam)
	must(&religi)
	places := []models.Place{
		{Name: "A", District: "Bangil", Regency: RegencyKabupaten},
		{Name: "B", District: "Bangil", Regency: RegencyKabupaten},
		{Name: "C", District: "Beji", Regency: RegencyKabupaten},
		{Name: "D", District: "Tosari", Regency: RegencyKabupaten},
		{Name: "K", District: "Bangil", Regency: RegencyKabupaten},
		{Name: "E", District: "Puspo", Regency: RegencyKabupaten},
	}
	for i := range places {
		must(&places[i])
	}
	dest := func(name, slug string, place models.Place, region models.Region, cat models.TravelCategory, featured bool, keyakinan, status string) {
		must(&models.Destination{Name: name, Slug: slug, PlaceID: place.ID, RegionID: region.ID, CategoryID: cat.ID, Featured: featured, Keyakinan: keyakinan, Status: status})
	}
	dest("Asal", "asal", places[0], utara, alam, false, "", "published")
	dest("Sekecamatan", "sekecamatan", places[1], utara, alam, false, "sedang", "published")
	dest("Sezona", "sezona", places[2], utara, religi, false, "", "published")
	dest("Jauh Pilihan", "jauh-pilihan", places[3], selatan, alam, true, "", "published")
	dest("Draf", "draf", places[1], utara, alam, false, "", "draft")
	must(&models.Culinary{Name: "Nasi Punel", Slug: "nasi-punel", PlaceID: &places[4].ID, CulinaryType: "tradisional", Status: "published"})
	must(&models.Culinary{Name: "Bebek Tosari", Slug: "bebek-tosari", PlaceID: &places[3].ID, CulinaryType: "tradisional", Status: "published"})
	past, upcoming := models.Event{Name: "Sudah Lewat", Slug: "lewat", PlaceID: &places[5].ID, EventType: "tradisi", Status: "published"}, models.Event{Name: "Akan Datang", Slug: "datang", PlaceID: &places[5].ID, EventType: "tradisi", Status: "published"}
	must(&past)
	must(&upcoming)
	end := recNow.AddDate(0, -1, 0)
	must(&models.EventOccurrence{EventID: past.ID, StartsAt: end.AddDate(0, 0, -1), EndsAt: &end})
	must(&models.EventOccurrence{EventID: upcoming.ID, StartsAt: recNow.AddDate(0, 0, 10)})
	must(&models.Verification{VerifiableType: "Event", VerifiableID: upcoming.ID, Status: "terverifikasi"})
	src := models.TravelSource{Name: "wisata.json", SourceType: "seed"}
	must(&src)
	must(&models.Sourceable{SourceID: src.ID, SourceableType: "Destination", SourceableID: 2})
	user := models.User{Name: "sistem", Email: "s@x"}
	must(&user)
	cat := models.Category{Name: "TEKNOLOGI", Slug: "teknologi"}
	must(&cat)
	must(&models.News{Title: "Berita Asal", Slug: "berita-asal", Status: "published", CategoryID: cat.ID, AuthorID: user.ID, Source: "Antara News", SourceURL: "u1"})
	must(&models.News{Title: "Berita Lain", Slug: "berita-lain", Status: "published", CategoryID: cat.ID, AuthorID: user.ID, Source: "Tempo", SourceURL: "u2"})
	db.Model(&models.News{}).Where("1 = 1").Update("created_at", recNow.AddDate(0, 0, -2))
	return db
}

func stubSimilar(values map[string]map[int64]float64) func(context.Context, string, int64, string, int) (map[int64]float64, error) {
	return func(_ context.Context, _ string, _ int64, target string, _ int) (map[int64]float64, error) {
		return values[target], nil
	}
}

func TestRecommendRanksByLocationCategoryAndEditorSignal(t *testing.T) {
	db := newRecommendationTestDB(t)
	r := &Recommender{DB: db, Now: func() time.Time { return recNow }, Similar: stubSimilar(map[string]map[int64]float64{"destination": {2: 0.6, 3: 0.6, 4: 0.6}})}
	got, err := r.Recommend(context.Background(), "wisata", "asal", "wisata", 6)
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, g := range got {
		names = append(names, g.Name)
	}
	if strings.Join(names, ",") != "Sekecamatan,Jauh Pilihan,Sezona" {
		t.Fatalf("order = %v (self and drafts must be left out)", names)
	}
	first := got[0]
	if strings.Join(first.Reasons, ",") != "kecamatan sama,kategori sama" || first.Location == nil || first.Location.District != "Bangil" || first.Location.Zone != "Pasuruan Utara" {
		t.Fatalf("first = %+v", first)
	}
	if first.Source == nil || *first.Source != "wisata.json" || first.VerificationStatus != "" {
		t.Fatalf("source/verification = %+v", first)
	}
	if strings.Join(got[1].Reasons, ",") != "kategori sama,pilihan editor" || strings.Join(got[2].Reasons, ",") != "zona sama" {
		t.Fatalf("reasons = %v / %v", got[1].Reasons, got[2].Reasons)
	}
	if got[0].Score <= got[1].Score || got[1].Score <= got[2].Score {
		t.Fatalf("scores not descending: %v %v %v", got[0].Score, got[1].Score, got[2].Score)
	}
}

func TestRecommendAcrossDomainsAndOnlyRunningEvents(t *testing.T) {
	db := newRecommendationTestDB(t)
	r := &Recommender{DB: db, Now: func() time.Time { return recNow }, Similar: stubSimilar(map[string]map[int64]float64{"culinary": {1: 0.3, 2: 0.3}})}
	got, err := r.Recommend(context.Background(), "wisata", "asal", "kuliner", 6)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[0].Name != "Nasi Punel" || got[0].Type != "kuliner" || strings.Contains(strings.Join(got[0].Reasons, ","), "kategori") {
		t.Fatalf("cross-domain = %+v (same kecamatan first, no category bonus across domains)", got)
	}
	events, err := (&Recommender{DB: db, Now: func() time.Time { return recNow }, Similar: stubSimilar(nil)}).Recommend(context.Background(), "wisata", "asal", "acara", 6)
	if err != nil {
		t.Fatal(err)
	}
	if len(events) != 1 || events[0].Name != "Akan Datang" || events[0].VerificationStatus != "terverifikasi" {
		t.Fatalf("events = %+v, want only the upcoming one", events)
	}
}

// F12, jobdesk 9 Nov point 6: a destination's culture recommendations leave out the culture item on the same place (the
// same site); a culinary business on that place is still recommended.
func TestRecommendLeavesOutTheSameSiteInTheOtherDomain(t *testing.T) {
	db := newRecommendationTestDB(t)
	var place uint
	db.Raw(`SELECT place_id FROM destinations WHERE slug = 'asal'`).Scan(&place)
	for _, c := range []models.Culture{{Name: "Situs Asal", Slug: "situs-asal", PlaceID: &place, CultureType: "situs-sejarah", Status: "published"}, {Name: "Situs Lain", Slug: "situs-lain", CultureType: "situs-sejarah", Status: "published"}} {
		if err := db.Create(&c).Error; err != nil {
			t.Fatal(err)
		}
	}
	if err := db.Create(&models.Culinary{Name: "Warung Asal", Slug: "warung-asal", PlaceID: &place, CulinaryType: "tradisional", Status: "published"}).Error; err != nil {
		t.Fatal(err)
	}
	r := &Recommender{DB: db, Now: func() time.Time { return recNow }, Similar: stubSimilar(map[string]map[int64]float64{"culture": {1: 0.9, 2: 0.5}, "culinary": {3: 0.9}})}
	got, err := r.Recommend(context.Background(), "wisata", "asal", "budaya", 6)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].Name != "Situs Lain" {
		t.Fatalf("budaya = %+v, want only Situs Lain", got)
	}
	food, err := r.Recommend(context.Background(), "wisata", "asal", "kuliner", 6)
	if err != nil {
		t.Fatal(err)
	}
	if len(food) == 0 || food[0].Name != "Warung Asal" {
		t.Fatalf("kuliner = %+v, want Warung Asal first", food)
	}
}

func TestRecommendNewsUsesCategoryAndRecency(t *testing.T) {
	db := newRecommendationTestDB(t)
	r := &Recommender{DB: db, Now: func() time.Time { return recNow }, Similar: stubSimilar(map[string]map[int64]float64{"news": {1: 1, 2: 0.7}})}
	got, err := r.Recommend(context.Background(), "berita", "1", "berita", 6)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 || got[0].ID != 2 || got[0].Location != nil || got[0].Source == nil || *got[0].Source != "Tempo" {
		t.Fatalf("news = %+v", got)
	}
	if strings.Join(got[0].Reasons, ",") != "berita terbaru,kategori sama" {
		t.Fatalf("reasons = %v", got[0].Reasons)
	}
}

func TestRecommendUnknownOrUnpublishedSource(t *testing.T) {
	db := newRecommendationTestDB(t)
	r := &Recommender{DB: db, Similar: stubSimilar(nil)}
	for _, c := range [][2]string{{"wisata", "draf"}, {"wisata", "tidak-ada"}, {"berita", "abc"}, {"berita", "999"}} {
		if _, err := r.Recommend(context.Background(), c[0], c[1], c[0], 6); !errors.Is(err, ErrRecommendSourceNotFound) {
			t.Errorf("%v: err = %v", c, err)
		}
	}
}

// searchHit is one semantic search result of source type st and id with the given similarity.
func searchHit(st string, id int64, sim float64) SemanticResult {
	return SemanticResult{SourceType: &st, SourceID: &id, Similarity: sim}
}

// Jobdesk 9 Nov point 3: semantic search results become cards of the four domains, ordered by similarity only (equal
// similarity by name); a draft and a finished event are not shown, whatever their similarity.
func TestRecommendByTextOrdersCardsBySimilarity(t *testing.T) {
	db := newRecommendationTestDB(t)
	r := &Recommender{DB: db, Now: func() time.Time { return recNow }}
	results := []SemanticResult{
		searchHit("event", 1, 0.95),       // Sudah Lewat: finished
		searchHit("destination", 5, 0.90), // Draf: not published
		searchHit("culinary", 1, 0.70),    // Nasi Punel
		searchHit("event", 2, 0.65),       // Akan Datang
		searchHit("destination", 2, 0.62), // Sekecamatan
		searchHit("destination", 4, 0.62), // Jauh Pilihan (featured: no bonus here)
		searchHit("destination", 2, 0.10), // repeated source: the first hit counts
	}
	got, err := r.RecommendByText(context.Background(), results, 10)
	if err != nil {
		t.Fatal(err)
	}
	var order []string
	for _, g := range got {
		order = append(order, g.Type+":"+g.Name)
	}
	if strings.Join(order, ",") != "kuliner:Nasi Punel,acara:Akan Datang,wisata:Jauh Pilihan,wisata:Sekecamatan" {
		t.Fatalf("order = %v", order)
	}
	for _, g := range got {
		if g.Score != g.Similarity || g.Slug == nil || g.Location == nil || g.Reasons == nil {
			t.Fatalf("card %+v", g)
		}
	}
	if got[1].VerificationStatus != "terverifikasi" || got[3].Source == nil || *got[3].Source != "wisata.json" || got[3].Location.District != "Bangil" || got[3].Similarity != 0.62 {
		t.Fatalf("card fields = %+v / %+v", got[1], got[3])
	}
	if top, _ := r.RecommendByText(context.Background(), results, 2); len(top) != 2 || top[0].Name != "Nasi Punel" {
		t.Fatalf("limit 2 = %+v", top)
	}
	if none, err := r.RecommendByText(context.Background(), nil, 6); err != nil || len(none) != 0 {
		t.Fatalf("no results = %+v err %v", none, err)
	}
}

// F2, jobdesk 9 Nov point 6: a place that is both a destination and a culture item gets one card, the most similar one;
// a culinary business on that place stays, and two events at one venue both stay.
func TestRecommendByTextShowsOnePlaceOnce(t *testing.T) {
	db := newRecommendationTestDB(t)
	var place uint
	db.Raw(`SELECT place_id FROM destinations WHERE slug = 'jauh-pilihan'`).Scan(&place)
	if err := db.Create(&models.Culture{Name: "Situs Jauh", Slug: "situs-jauh", PlaceID: &place, CultureType: "situs-sejarah", Status: "published"}).Error; err != nil {
		t.Fatal(err)
	}
	// Both events at the fixture venue are upcoming here.
	if err := db.Create(&models.EventOccurrence{EventID: 1, StartsAt: recNow.AddDate(0, 0, 5)}).Error; err != nil {
		t.Fatal(err)
	}
	r := &Recommender{DB: db, Now: func() time.Time { return recNow }}
	results := []SemanticResult{
		searchHit("culture", 1, 0.80),     // Situs Jauh
		searchHit("destination", 4, 0.75), // Jauh Pilihan: same place, less similar → no card
		searchHit("culinary", 2, 0.70),    // Bebek Tosari: a business on that place → stays
		searchHit("event", 1, 0.68),       // Sudah Lewat (now upcoming too)
		searchHit("event", 2, 0.65),       // Akan Datang: same venue → stays
		searchHit("destination", 2, 0.62), // Sekecamatan: another place
	}
	got, err := r.RecommendByText(context.Background(), results, 10)
	if err != nil {
		t.Fatal(err)
	}
	var order []string
	for _, g := range got {
		order = append(order, g.Type+":"+g.Name)
	}
	if strings.Join(order, ",") != "budaya:Situs Jauh,kuliner:Bebek Tosari,acara:Sudah Lewat,acara:Akan Datang,wisata:Sekecamatan" {
		t.Fatalf("order = %v", order)
	}
	// The place filter runs before the limit, so the asked count is still filled from the next items.
	if top, _ := r.RecommendByText(context.Background(), results, 2); len(top) != 2 || top[1].Name != "Bebek Tosari" {
		t.Fatalf("limit 2 = %+v", top)
	}
}

// Owner 2026-11-09: a closed or temporarily closed destination or culinary place is not recommended (text search and
// content recommendations); open, unknown, and empty statuses are.
func TestClosedPlacesAreNotRecommended(t *testing.T) {
	db := newRecommendationTestDB(t)
	db.Exec(`UPDATE culinaries SET operational_status = 'closed' WHERE slug = 'nasi-punel'`)
	db.Exec(`UPDATE destinations SET operational_status = 'temporarily_closed' WHERE slug = 'sekecamatan'`)
	db.Exec(`UPDATE destinations SET operational_status = 'unknown' WHERE slug = 'jauh-pilihan'`)
	r := &Recommender{DB: db, Now: func() time.Time { return recNow }, Similar: stubSimilar(map[string]map[int64]float64{"destination": {2: 0.6, 3: 0.6, 4: 0.6}, "culinary": {1: 0.9, 2: 0.3}})}
	got, err := r.RecommendByText(context.Background(), []SemanticResult{searchHit("culinary", 1, 0.9), searchHit("culinary", 2, 0.8), searchHit("destination", 2, 0.7), searchHit("destination", 4, 0.65)}, 10)
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, g := range got {
		names = append(names, g.Name)
	}
	if strings.Join(names, ",") != "Bebek Tosari,Jauh Pilihan" {
		t.Fatalf("text = %v", names)
	}
	food, err := r.Recommend(context.Background(), "wisata", "asal", "kuliner", 6)
	if err != nil || len(food) != 1 || food[0].Name != "Bebek Tosari" {
		t.Fatalf("content kuliner = %+v err %v", food, err)
	}
	places, err := r.Recommend(context.Background(), "wisata", "asal", "wisata", 6)
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range places {
		if p.Name == "Sekecamatan" {
			t.Fatalf("temporarily closed destination recommended: %+v", places)
		}
	}
}

// Jobdesk 9 Nov point 4: a result below the recommendation threshold gets no card; the default is 0.61, and
// RECOMMEND_RELEVANCE_THRESHOLD replaces it.
func TestRecommendByTextDropsResultsBelowTheThreshold(t *testing.T) {
	db := newRecommendationTestDB(t)
	r := &Recommender{DB: db, Now: func() time.Time { return recNow }}
	results := []SemanticResult{searchHit("culinary", 1, 0.70), searchHit("destination", 2, 0.61), searchHit("destination", 4, 0.609)}
	names := func() string {
		got, err := r.RecommendByText(context.Background(), results, 10)
		if err != nil {
			t.Fatal(err)
		}
		var out []string
		for _, g := range got {
			out = append(out, g.Name)
		}
		return strings.Join(out, ",")
	}
	t.Setenv("RECOMMEND_RELEVANCE_THRESHOLD", "")
	if got := names(); got != "Nasi Punel,Sekecamatan" {
		t.Fatalf("default 0.61: %s", got)
	}
	t.Setenv("RECOMMEND_RELEVANCE_THRESHOLD", "0.65")
	if got := names(); got != "Nasi Punel" {
		t.Fatalf("0.65: %s", got)
	}
	t.Setenv("RECOMMEND_RELEVANCE_THRESHOLD", "2")
	if got := names(); got != "Nasi Punel,Sekecamatan" {
		t.Fatalf("invalid value must keep the default: %s", got)
	}
}
