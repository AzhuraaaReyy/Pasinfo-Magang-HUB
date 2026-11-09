package main

import (
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"wildan-news-backend/internal/models"
)

func backfillTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.Place{}, &models.Culinary{}, &models.Culture{}, &models.Event{}); err != nil {
		t.Fatal(err)
	}
	places := []models.Place{{ID: 1, Name: "Nasi Punel"}, {ID: 2, Name: "Warung Isi"}, {ID: 3, Name: "Alun-Alun"}, {ID: 4, Name: "Mock"}}
	if err := db.Create(&places).Error; err != nil {
		t.Fatal(err)
	}
	existing := "Sudah terisi."
	rows := []any{
		&models.Culinary{ID: 1, Slug: "nasi-punel", Name: "Nasi Punel", PlaceID: uintPtr(1)},
		&models.Culinary{ID: 2, Slug: "warung-isi", Name: "Warung Isi", ShortDescription: existing, CulinaryType: "kopi", PlaceID: uintPtr(2)},
		&models.Event{ID: 17, Slug: "kirab", Name: "Kirab", PlaceID: uintPtr(3)},
		&models.Event{ID: 18, Slug: "parade", Name: "Parade", PlaceID: uintPtr(3)},
		&models.Event{ID: 1, Slug: "festival-mock", Name: "Festival Mock", PlaceID: uintPtr(4)},
	}
	for _, row := range rows {
		if err := db.Create(row).Error; err != nil {
			t.Fatal(err)
		}
	}
	return db
}

func uintPtr(v uint) *uint    { return &v }
func strPtr(v string) *string { return &v }

func TestApplyBackfillFillsOnlyEmptyRealFields(t *testing.T) {
	db := backfillTestDB(t)
	src := backfillSource{
		Culinaries: []backfillItem{
			{Slug: "nasi-punel", ShortDescription: "Nasi khas Bangil.", CulinaryType: "tradisional", Address: "Gempeng, Kec. Bangil"},
			{Slug: "warung-isi", ShortDescription: "Teks lain.", CulinaryType: "tradisional", Address: "Jl. Isi"},
			{Slug: "tidak-ada", ShortDescription: "x"},
		},
		Events: []backfillItem{
			{Slug: "kirab", ShortDescription: "Kirab hari jadi.", EventType: "sejarah", VenueAddress: "Kantor Wali Kota", OrganizerName: strPtr("Pemkot Pasuruan")},
			{Slug: "parade", ShortDescription: "Parade budaya.", EventType: "seni", VenueAddress: "Taman Harmoni"},
			{Slug: "festival-mock", ShortDescription: "jangan diisi", EventType: "seni"},
		},
	}
	var placesBefore int64
	db.Model(&models.Place{}).Count(&placesBefore)

	report, err := applyBackfill(db, src)
	if err != nil {
		t.Fatal(err)
	}

	var punel, isi models.Culinary
	db.First(&punel, 1)
	db.First(&isi, 2)
	if punel.ShortDescription != "Nasi khas Bangil." || punel.CulinaryType != "tradisional" {
		t.Fatalf("empty culinary fields not filled: %+v", punel)
	}
	if isi.ShortDescription != "Sudah terisi." || isi.CulinaryType != "kopi" {
		t.Fatalf("filled culinary fields must not change: %+v", isi)
	}
	var place1, place2, place3 models.Place
	db.First(&place1, 1)
	db.First(&place2, 2)
	db.First(&place3, 3)
	if place1.Address != "Gempeng, Kec. Bangil" || place2.Address != "Jl. Isi" {
		t.Fatalf("own-place addresses not filled: %q %q", place1.Address, place2.Address)
	}
	if place3.Address != "" || report["skip:shared_place"] != 2 {
		t.Fatalf("shared place with different addresses must be skipped: %q report=%v", place3.Address, report)
	}
	var kirab, mock models.Event
	db.First(&kirab, 17)
	db.First(&mock, 1)
	if kirab.EventType != "sejarah" || kirab.OrganizerName == nil || *kirab.OrganizerName != "Pemkot Pasuruan" {
		t.Fatalf("event fields not filled: %+v", kirab)
	}
	if mock.ShortDescription != "" || mock.EventType != "" {
		t.Fatalf("mock event must not change: %+v", mock)
	}
	if report["culinaries.short_description"] != 1 || report["events.organizer_name"] != 1 || report["skip:not_found"] != 1 || report["skip:mock"] != 1 {
		t.Fatalf("report = %v", report)
	}
	var placesAfter int64
	db.Model(&models.Place{}).Count(&placesAfter)
	if placesAfter != placesBefore {
		t.Fatalf("places count changed %d -> %d", placesBefore, placesAfter)
	}
}

// T1 (jobdesk 2 Nov, 2026-11-03): places get village, kecamatan, and Kota/Kabupaten Pasuruan; a place whose
// address names no kecamatan takes the regency from the seed zone of its content.
func TestApplyBackfillFillsPlaceLocation(t *testing.T) {
	db := backfillTestDB(t)
	if err := db.Model(&models.Place{}).Where("id IN ?", []uint{1, 2, 3}).Update("regency", "Pasuruan").Error; err != nil {
		t.Fatal(err)
	}
	src := backfillSource{
		Culinaries: []backfillItem{
			{Slug: "nasi-punel", Address: "Gempeng, Kec. Bangil", RegionID: "pasuruan-utara"},
			{Slug: "warung-isi", Address: "Jl. Isi"},
		},
		Events: []backfillItem{
			{Slug: "kirab", VenueAddress: "Kantor Wali Kota", RegionID: "kota-pasuruan"},
			{Slug: "parade", VenueAddress: "Taman Harmoni", RegionID: "kota-pasuruan"},
			{Slug: "festival-mock", RegionID: "pasuruan-barat"},
		},
	}
	report, err := applyBackfill(db, src)
	if err != nil {
		t.Fatal(err)
	}
	var places []models.Place
	db.Order("id").Find(&places)
	got := map[uint][3]string{}
	for _, p := range places {
		got[p.ID] = [3]string{p.Village, p.District, p.Regency}
	}
	want := map[uint][3]string{
		1: {"Gempeng", "Bangil", "Kabupaten Pasuruan"},
		2: {"", "", "Pasuruan"},      // no kecamatan, no seed zone: left as it was
		3: {"", "", "Kota Pasuruan"}, // route events: regency from the seed zone
		4: {"", "", ""},              // mock event: untouched
	}
	for id, w := range want {
		if got[id] != w {
			t.Errorf("place %d = %v, want %v", id, got[id], w)
		}
	}
	if report["places.district"] != 1 || report["places.regency"] != 2 {
		t.Fatalf("report = %v", report)
	}

	t.Run("zone conflict", func(t *testing.T) {
		conflict := backfillTestDB(t)
		conflict.Model(&models.Place{}).Where("id = ?", 1).Update("address", "Gempeng, Kec. Bangil")
		report, err := applyBackfill(conflict, backfillSource{Culinaries: []backfillItem{{Slug: "nasi-punel", RegionID: "kota-pasuruan"}}})
		if err != nil {
			t.Fatal(err)
		}
		var p models.Place
		conflict.First(&p, 1)
		if report["skip:zone_conflict"] != 1 || p.District != "" {
			t.Fatalf("zone conflict must be skipped: report=%v place=%+v", report, p)
		}
	})
}

// R2 (jobdesk 2 Nov, 2026-11-03): the seed confidence of a destination fills an empty keyakinan, never a set one.
func TestApplyBackfillFillsDestinationKeyakinan(t *testing.T) {
	db := backfillTestDB(t)
	if err := db.AutoMigrate(&models.Destination{}); err != nil {
		t.Fatal(err)
	}
	rows := []models.Destination{{ID: 1, Slug: "candi-jawi", Name: "Candi Jawi", PlaceID: 1}, {ID: 2, Slug: "bromo", Name: "Bromo", PlaceID: 2, Keyakinan: "sedang"}}
	if err := db.Create(&rows).Error; err != nil {
		t.Fatal(err)
	}
	report, err := applyBackfill(db, backfillSource{Destinations: []backfillItem{{Slug: "candi-jawi", Keyakinan: "tinggi"}, {Slug: "bromo", Keyakinan: "tinggi"}}})
	if err != nil {
		t.Fatal(err)
	}
	var got []models.Destination
	db.Order("id").Find(&got)
	if got[0].Keyakinan != "tinggi" || got[1].Keyakinan != "sedang" || report["destinations.keyakinan"] != 1 {
		t.Fatalf("keyakinan = %q/%q report=%v", got[0].Keyakinan, got[1].Keyakinan, report)
	}
}

// R2 (jobdesk 2 Nov, 2026-11-03): the destination backfill fills the editorial confidence from the seed.
func TestBackfillTargetsFillDestinationKeyakinan(t *testing.T) {
	columns := backfillTargets(backfillSource{})[0].columns(backfillItem{Keyakinan: "tinggi"})
	if columns["keyakinan"] != "tinggi" {
		t.Fatalf("destination columns = %v", columns)
	}
	for _, i := range []int{1, 2} { // culinaries, cultures (Owner 2026-11-03)
		if got := backfillTargets(backfillSource{})[i].columns(backfillItem{Keyakinan: "rendah"})["keyakinan"]; got != "rendah" {
			t.Fatalf("target %d keyakinan = %q", i, got)
		}
	}
}

func TestSharedSeedLocationNeedsOneKecamatan(t *testing.T) {
	if v, d := sharedSeedLocation(map[string]bool{"Amphiteater Taman, Sumber Gedang, Kec. Pandaan": true, "Taman Candra, Sumber Gedang, Kec. Pandaan": true}); d != "Pandaan" || v != "Sumber Gedang" {
		t.Fatalf("same kecamatan = %q %q", v, d)
	}
	if _, d := sharedSeedLocation(map[string]bool{"X, Kec. Pandaan": true, "Y, Kec. Bangil": true}); d != "" {
		t.Fatalf("different kecamatan = %q", d)
	}
}

// Owner 2026-11-09: the seed price range, reviews label, Google place id, and map link are filled into empty columns; a
// place shared by contents with different seed links is skipped, and nothing is overwritten.
func TestBackfillFillsSeedLinksAndSampleFields(t *testing.T) {
	db := backfillTestDB(t)
	if err := db.Model(&models.Place{}).Where("id = ?", 2).Update("map_url", "https://maps/lama").Error; err != nil {
		t.Fatal(err)
	}
	src := backfillSource{
		Culinaries: []backfillItem{
			{Slug: "nasi-punel", PriceRange: "Rp 15.000 - Rp 30.000", PlaceID: "ChIJ-punel", GoogleMapsURL: "https://maps/punel"},
			{Slug: "warung-isi", PriceRange: "Rp 5.000", PlaceID: "ChIJ-isi", GoogleMapsURL: "https://maps/baru"},
		},
		Events: []backfillItem{
			{Slug: "kirab", GoogleMapsURL: "https://maps/kirab"},
			{Slug: "parade", GoogleMapsURL: "https://maps/parade"}, // same place 3, different link
		},
	}
	report, err := applyBackfill(db, src)
	if err != nil {
		t.Fatal(err)
	}
	var places []models.Place
	db.Order("id").Find(&places)
	var punel models.Culinary
	db.First(&punel, 1)
	if punel.PriceRange != "Rp 15.000 - Rp 30.000" || places[0].GooglePlaceID != "ChIJ-punel" || places[0].MapURL != "https://maps/punel" {
		t.Fatalf("punel = %q, place 1 = %+v", punel.PriceRange, places[0])
	}
	if places[1].MapURL != "https://maps/lama" || places[1].GooglePlaceID != "ChIJ-isi" {
		t.Fatalf("place 2 overwritten or not filled: %+v", places[1])
	}
	if places[2].MapURL != "" || report["skip:shared_place_map_url"] != 1 {
		t.Fatalf("shared place 3 = %q, report %v", places[2].MapURL, report)
	}
	if got := backfillTargets(backfillSource{})[0].columns(backfillItem{ReviewsLabel: "100 Ulasan"}); got["reviews_label"] != "100 Ulasan" {
		t.Fatalf("destination columns = %v", got)
	}
}
