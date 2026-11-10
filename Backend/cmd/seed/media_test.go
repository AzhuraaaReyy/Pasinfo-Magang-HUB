package main

import (
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

// Owner 2026-11-10: seed photos of culinary, culture, and event items are stored by position; a changed url replaces the
// stored photo on the next run (no duplicate), and a photo without url is skipped.
func TestSeedDomainMediaReplacesPhotoOnRerun(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.AutoMigrate(&models.Media{}); err != nil {
		t.Fatal(err)
	}
	first := []models.Media{{Type: "image", URL: "a.webp", ThumbnailURL: "a.thumb.webp", AltText: "Foto A"}, {Type: "image"}}
	if err := seedDomainMedia(db, "Event", 7, first); err != nil {
		t.Fatal(err)
	}
	if err := seedDomainMedia(db, "Event", 7, []models.Media{{Type: "image", URL: "b.webp", ThumbnailURL: "b.thumb.webp", AltText: "Foto B"}}); err != nil {
		t.Fatal(err)
	}
	var rows []models.Media
	db.Where("mediable_type = ? AND mediable_id = ?", "Event", 7).Find(&rows)
	if len(rows) != 1 || rows[0].URL != "b.webp" || rows[0].ThumbnailURL != "b.thumb.webp" || rows[0].AltText != "Foto B" || !rows[0].IsFeatured || rows[0].SortOrder != 0 {
		t.Fatalf("rows = %+v, want one replaced photo", rows)
	}
}
