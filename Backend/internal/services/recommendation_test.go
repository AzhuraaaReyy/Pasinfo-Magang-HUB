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
