package main

import (
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

func TestParseOpeningHoursReadsTheSeedFormat(t *testing.T) {
	cases := []struct {
		text, opens, closes string
		ok                  bool
	}{
		{"08.00 - 17.00 WIB", "08.00", "17.00", true},
		{"05.30 - 11.00 WIB", "05.30", "11.00", true},
		{"17.00 - 01.00 WIB", "17.00", "01.00", true}, // ends after midnight
		{"9:00-21:30", "09.00", "21.30", true},
		{"setiap hari", "", "", false},
		{"25.00 - 17.00 WIB", "", "", false},
	}
	for _, tc := range cases {
		opens, closes, err := parseOpeningHours(tc.text)
		if (err == nil) != tc.ok {
			t.Fatalf("%q: err = %v", tc.text, err)
		}
		if tc.ok && (opens.Format("15.04") != tc.opens || closes.Format("15.04") != tc.closes) {
			t.Fatalf("%q: %s–%s", tc.text, opens.Format("15.04"), closes.Format("15.04"))
		}
	}
}

// Owner 2026-11-09: the seed hours are stored for every day; running the seed again updates them, so an edited seed file
// replaces the old hours without duplicates.
func TestSeedOpeningHoursWritesEveryDayAndUpdatesOnRerun(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.OpeningHour{}); err != nil {
		t.Fatal(err)
	}
	if err := seedOpeningHours(db, "Destination", 7, "08.00 - 17.00 WIB"); err != nil {
		t.Fatal(err)
	}
	if err := seedOpeningHours(db, "Destination", 7, "06.00 - 18.00 WIB"); err != nil {
		t.Fatal(err)
	}
	if err := seedOpeningHours(db, "Culinary", 7, "bukan jam"); err != nil {
		t.Fatal(err) // an unreadable value is skipped, not an error
	}
	var rows []models.OpeningHour
	db.Order("openable_type, day_of_week").Find(&rows)
	if len(rows) != 7 {
		t.Fatalf("rows = %d, want 7 (no duplicates, nothing for the unreadable value)", len(rows))
	}
	for i, row := range rows {
		if row.DayOfWeek != i || row.OpensAt.In(seedWIB).Format("15.04") != "06.00" || row.ClosesAt.In(seedWIB).Format("15.04") != "18.00" {
			t.Fatalf("row %d = day %d %s–%s", i, row.DayOfWeek, row.OpensAt.In(seedWIB).Format("15.04"), row.ClosesAt.In(seedWIB).Format("15.04"))
		}
	}
}

// Audit 2026-11-09 (MEDIUM): an empty Google place id matched place 1 for every new item. Existing content keeps its
// place, a new item reuses the place with its Google id, and a new item without one gets its own place.
func TestPlaceMatchesByGoogleIDAndNeverByAnEmptyOne(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.Place{}, &models.Culinary{}); err != nil {
		t.Fatal(err)
	}
	bromo := models.Place{Name: "Penanjakan Bromo", Latitude: -7.9, Longitude: 112.95}
	alun := models.Place{Name: "Alun-Alun", GooglePlaceID: "ChIJ-alun", Latitude: -7.64, Longitude: 112.9}
	db.Create(&bromo)
	db.Create(&alun)
	db.Create(&models.Culinary{Slug: "warung-lama", Name: "Warung Lama", PlaceID: &alun.ID})

	newItem := func(slug, placeID string, lat float64) item {
		x := item{Slug: slug, Name: slug, PlaceID: placeID, Address: "Tosari, Kec. Tosari"}
		x.Place.Latitude, x.Place.Longitude = lat, 112.9
		return x
	}
	if p, err := place(db, "culinaries", newItem("warung-lama", "ChIJ-lain", -7.5)); err != nil || p.ID != alun.ID {
		t.Fatalf("existing content: place %d err %v, want %d", p.ID, err, alun.ID)
	}
	if p, err := place(db, "culinaries", newItem("warung-baru-di-alun", "ChIJ-alun", -7.64)); err != nil || p.ID != alun.ID {
		t.Fatalf("same Google id: place %d err %v, want %d", p.ID, err, alun.ID)
	}
	p, err := place(db, "culinaries", newItem("warung-tosari", "", -7.88))
	if err != nil || p.ID == bromo.ID || p.ID == alun.ID || p.Latitude != -7.88 || p.Address != "Tosari, Kec. Tosari" || p.District == "" {
		t.Fatalf("new item without Google id: %+v err %v", p, err)
	}
	var count int64
	db.Model(&models.Place{}).Count(&count)
	if count != 3 {
		t.Fatalf("places = %d, want 3", count)
	}
}
