package services

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// SourceKey identifies a knowledge-base source row (faq_knowledge_bases.source_type/source_id).
type SourceKey struct {
	Type string
	ID   int64
}

// SourceCard holds the recommendation-card fields read from the source table (K1-04).
// A field is nil when the database has no value; nothing is derived (K2-03).
type SourceCard struct {
	Slug, CategoryLabel, ThumbnailURL, Summary *string
}

type sourceCardRow struct {
	ID            int64
	Slug          *string
	CategoryLabel *string
	Summary       *string
	TypeCode      *string
}

// typeLabels are the category names of the approved frontend pages (Frontend/public/js data-kuliner.js
// KULINER_CATEGORIES, data-budaya.js, data-acara.js ACARA_CATEGORIES) for the stored *_type codes
// (Owner jobdesk 28 Okt poin 2, option B, 2026-11-02). A code without a frontend name stays null.
var typeLabels = map[string]map[string]string{
	"culinary": {"tradisional": "Tradisional", "camilan-oleh-oleh": "Camilan & Oleh-oleh", "kopi-minuman": "Kopi & Minuman", "seafood": "Seafood"},
	"culture":  {"tradisi": "Tradisi", "kesenian": "Kesenian", "situs-sejarah": "Situs & Sejarah", "museum": "Museum"},
	"event":    {"kesenian": "Kesenian", "tradisi": "Tradisi", "sejarah": "Sejarah", "museum": "Museum"},
}

// typeLabel returns the frontend category name of a stored type code, or nil.
func typeLabel(sourceType string, code *string) *string {
	if code == nil {
		return nil
	}
	if label, ok := typeLabels[sourceType][*code]; ok {
		return &label
	}
	return nil
}

type sourceThumbnailRow struct {
	ID  int64
	URL *string
}

var sourceCardQueries = map[string]string{
	"destination": `SELECT d.id AS id, NULLIF(d.slug, '') AS slug, NULLIF(tc.name, '') AS category_label, NULLIF(d.short_description, '') AS summary FROM destinations d LEFT JOIN travel_categories tc ON tc.id = d.category_id WHERE d.id IN ?`,
	"culinary":    `SELECT id, NULLIF(slug, '') AS slug, NULLIF(culinary_type, '') AS type_code, NULLIF(short_description, '') AS summary FROM culinaries WHERE id IN ?`,
	"culture":     `SELECT id, NULLIF(slug, '') AS slug, NULLIF(culture_type, '') AS type_code, NULLIF(short_description, '') AS summary FROM cultures WHERE id IN ?`,
	"event":       `SELECT id, NULLIF(slug, '') AS slug, NULLIF(event_type, '') AS type_code, NULLIF(short_description, '') AS summary FROM events WHERE id IN ?`,
	"news":        `SELECT n.id AS id, NULLIF(n.slug, '') AS slug, NULLIF(c.name, '') AS category_label, NULL AS summary FROM news n LEFT JOIN categories c ON c.id = n.category_id WHERE n.id IN ?`,
	"region":      `SELECT id, NULLIF(slug, '') AS slug, NULL AS category_label, NULLIF(short_description, '') AS summary FROM regions WHERE id IN ?`,
}

// Rows are ordered so the first row per id is the card image.
var sourceThumbnailQueries = map[string]string{
	"destination": `SELECT mediable_id AS id, thumbnail_url AS url FROM media WHERE mediable_type = 'Destination' AND mediable_id IN ? AND thumbnail_url <> '' ORDER BY mediable_id, sort_order, id`,
	// Culinary, culture, and event photos come from the seed file (Owner 2026-11-10), stored like destination media.
	"culinary": `SELECT mediable_id AS id, thumbnail_url AS url FROM media WHERE mediable_type = 'Culinary' AND mediable_id IN ? AND thumbnail_url <> '' ORDER BY mediable_id, sort_order, id`,
	"culture":  `SELECT mediable_id AS id, thumbnail_url AS url FROM media WHERE mediable_type = 'Culture' AND mediable_id IN ? AND thumbnail_url <> '' ORDER BY mediable_id, sort_order, id`,
	"event":    `SELECT mediable_id AS id, thumbnail_url AS url FROM media WHERE mediable_type = 'Event' AND mediable_id IN ? AND thumbnail_url <> '' ORDER BY mediable_id, sort_order, id`,
	"news":     `SELECT news_id AS id, image_path AS url FROM news_images WHERE news_id IN ? AND image_path <> '' ORDER BY news_id, id`,
}

// LoadSourceCards reads card fields for the given sources with at most two queries per
// source type. Unknown source types and missing rows yield no card.
func LoadSourceCards(ctx context.Context, db *gorm.DB, keys []SourceKey) (map[SourceKey]SourceCard, error) {
	cards := make(map[SourceKey]SourceCard)
	ids := make(map[string][]int64)
	for _, key := range keys {
		if _, ok := sourceCardQueries[key.Type]; ok {
			ids[key.Type] = append(ids[key.Type], key.ID)
		}
	}
	for sourceType, list := range ids {
		var rows []sourceCardRow
		if err := db.WithContext(ctx).Raw(sourceCardQueries[sourceType], list).Scan(&rows).Error; err != nil {
			return nil, fmt.Errorf("load %s cards: %w", sourceType, err)
		}
		for _, row := range rows {
			label := row.CategoryLabel
			if row.TypeCode != nil {
				label = typeLabel(sourceType, row.TypeCode)
			}
			cards[SourceKey{sourceType, row.ID}] = SourceCard{Slug: row.Slug, CategoryLabel: label, Summary: row.Summary}
		}
		query, ok := sourceThumbnailQueries[sourceType]
		if !ok {
			continue
		}
		var thumbnails []sourceThumbnailRow
		if err := db.WithContext(ctx).Raw(query, list).Scan(&thumbnails).Error; err != nil {
			return nil, fmt.Errorf("load %s thumbnails: %w", sourceType, err)
		}
		for _, thumbnail := range thumbnails {
			key := SourceKey{sourceType, thumbnail.ID}
			card, exists := cards[key]
			if !exists || card.ThumbnailURL != nil {
				continue
			}
			card.ThumbnailURL = thumbnail.URL
			cards[key] = card
		}
	}
	return cards, nil
}
