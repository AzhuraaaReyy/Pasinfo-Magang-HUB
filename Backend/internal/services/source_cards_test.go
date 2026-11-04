package services

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func newSourceCardTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	// One in-memory database per test, so the fixed rows below are inserted once per database.
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	statements := []string{
		`CREATE TABLE IF NOT EXISTS travel_categories (id INTEGER PRIMARY KEY, name TEXT)`,
		`CREATE TABLE IF NOT EXISTS destinations (id INTEGER PRIMARY KEY, slug TEXT, short_description TEXT, category_id INTEGER)`,
		`CREATE TABLE IF NOT EXISTS media (id INTEGER PRIMARY KEY, mediable_type TEXT, mediable_id INTEGER, thumbnail_url TEXT, sort_order INTEGER)`,
		`CREATE TABLE IF NOT EXISTS culinaries (id INTEGER PRIMARY KEY, slug TEXT, short_description TEXT, culinary_type TEXT)`,
		`CREATE TABLE IF NOT EXISTS cultures (id INTEGER PRIMARY KEY, slug TEXT, short_description TEXT, culture_type TEXT)`,
		`CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, slug TEXT, short_description TEXT, event_type TEXT)`,
		`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY, name TEXT)`,
		`CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY, slug TEXT, category_id INTEGER)`,
		`CREATE TABLE IF NOT EXISTS news_images (id INTEGER PRIMARY KEY, news_id INTEGER, image_path TEXT)`,
		`CREATE TABLE IF NOT EXISTS regions (id INTEGER PRIMARY KEY, slug TEXT, short_description TEXT)`,
		`INSERT INTO travel_categories VALUES (2, 'Wisata Sejarah')`,
		`INSERT INTO destinations VALUES (1, 'destinasi-a', '', 2)`,
		`INSERT INTO media VALUES (10, 'Destination', 1, 'b.thumb.webp', 1), (11, 'Destination', 1, 'a.thumb.webp', 0), (12, 'Destination', 1, '', 0)`,
		`INSERT INTO cultures VALUES (1, 'budaya-a', '', ''), (2, 'budaya-b', 'Ringkasan budaya', 'situs-sejarah'), (3, 'budaya-c', '', 'lainnya')`,
		`INSERT INTO culinaries VALUES (5, 'kuliner-a', '', 'camilan-oleh-oleh')`,
		`INSERT INTO events VALUES (6, 'acara-a', '', 'sejarah')`,
		`INSERT INTO categories VALUES (3, 'Lokal')`,
		`INSERT INTO news VALUES (7, NULL, 3)`,
		`INSERT INTO news_images VALUES (20, 7, 'https://img.example/x.jpg'), (21, 7, 'https://img.example/y.jpg')`,
		`INSERT INTO regions VALUES (4, 'wilayah-a', 'Ringkasan wilayah')`,
	}
	for _, statement := range statements {
		if err := db.Exec(statement).Error; err != nil {
			t.Fatalf("%s: %v", statement, err)
		}
	}
	return db
}

func strValue(p *string) string {
	if p == nil {
		return "<nil>"
	}
	return *p
}

func TestLoadSourceCardsReadsOnlyDatabaseValues(t *testing.T) {
	db := newSourceCardTestDB(t)
	keys := []SourceKey{{"destination", 1}, {"culture", 1}, {"news", 7}, {"region", 4}, {"destination", 99}, {"manual", 1}}
	cards, err := LoadSourceCards(context.Background(), db, keys)
	if err != nil {
		t.Fatal(err)
	}
	dest := cards[SourceKey{"destination", 1}]
	if strValue(dest.Slug) != "destinasi-a" || strValue(dest.CategoryLabel) != "Wisata Sejarah" || strValue(dest.ThumbnailURL) != "a.thumb.webp" || dest.Summary != nil {
		t.Fatalf("destination card = slug:%s cat:%s thumb:%s summary:%s", strValue(dest.Slug), strValue(dest.CategoryLabel), strValue(dest.ThumbnailURL), strValue(dest.Summary))
	}
	culture := cards[SourceKey{"culture", 1}]
	if strValue(culture.Slug) != "budaya-a" || culture.CategoryLabel != nil || culture.ThumbnailURL != nil || culture.Summary != nil {
		t.Fatalf("culture card unexpected: %+v", culture)
	}
	news := cards[SourceKey{"news", 7}]
	if news.Slug != nil || strValue(news.CategoryLabel) != "Lokal" || strValue(news.ThumbnailURL) != "https://img.example/x.jpg" || news.Summary != nil {
		t.Fatalf("news card unexpected: slug:%s cat:%s thumb:%s", strValue(news.Slug), strValue(news.CategoryLabel), strValue(news.ThumbnailURL))
	}
	region := cards[SourceKey{"region", 4}]
	if strValue(region.Slug) != "wilayah-a" || strValue(region.Summary) != "Ringkasan wilayah" || region.CategoryLabel != nil || region.ThumbnailURL != nil {
		t.Fatalf("region card unexpected: %+v", region)
	}
	if _, ok := cards[SourceKey{"destination", 99}]; ok {
		t.Fatal("missing row must not produce a card")
	}
	if _, ok := cards[SourceKey{"manual", 1}]; ok {
		t.Fatal("unknown source type must be ignored")
	}
}

// Owner 28 Okt poin 2 option B: culinary/culture/event cards carry the frontend category name of their type code.
func TestLoadSourceCardsNamesTypeWithFrontendCategory(t *testing.T) {
	db := newSourceCardTestDB(t)
	cards, err := LoadSourceCards(context.Background(), db, []SourceKey{{"culture", 2}, {"culture", 3}, {"culinary", 5}, {"event", 6}})
	if err != nil {
		t.Fatal(err)
	}
	for key, want := range map[SourceKey]string{{"culture", 2}: "Situs & Sejarah", {"culinary", 5}: "Camilan & Oleh-oleh", {"event", 6}: "Sejarah"} {
		if got := strValue(cards[key].CategoryLabel); got != want {
			t.Errorf("%v category = %s, want %s", key, got, want)
		}
	}
	if label := cards[SourceKey{"culture", 3}].CategoryLabel; label != nil {
		t.Fatalf("a code without a frontend name must stay null, got %q", *label)
	}
	if strValue(cards[SourceKey{"culture", 2}].Summary) != "Ringkasan budaya" {
		t.Fatal("summary must still be read")
	}
}

func TestLoadSourceCardsWithoutKeysRunsNoQuery(t *testing.T) {
	cards, err := LoadSourceCards(context.Background(), nil, nil)
	if err != nil || len(cards) != 0 {
		t.Fatalf("cards=%v err=%v", cards, err)
	}
}
