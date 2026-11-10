package main

import (
	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

// seedDomainMedia stores the photos of a culinary, culture, or event item (Owner 2026-11-10: photos of the seed file,
// used until the data is complete). Each photo is kept by its position, so a changed url in the seed file replaces the
// stored photo on the next run instead of adding one; an empty url (a photo not available yet) is skipped. Destinations
// keep their own media loop.
func seedDomainMedia(tx *gorm.DB, mediableType string, id uint, media []models.Media) error {
	for i, m := range media {
		if m.URL == "" {
			continue
		}
		row := models.Media{MediableType: mediableType, MediableID: id, SortOrder: i}
		values := map[string]any{"type": m.Type, "url": m.URL, "thumbnail_url": m.ThumbnailURL, "alt_text": m.AltText, "is_featured": i == 0}
		if err := tx.Where("mediable_type = ? AND mediable_id = ? AND sort_order = ?", mediableType, id, i).Assign(values).FirstOrCreate(&row).Error; err != nil {
			return err
		}
	}
	return nil
}
