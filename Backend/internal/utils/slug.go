package utils

import (
	"fmt"
	"strings"

	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

const maxNewsSlugLen = 180

// NewsSlugBase turns a title into a lowercase ASCII slug (letters, digits, dashes).
func NewsSlugBase(title string) string {
	var b strings.Builder
	dash := false
	for _, r := range strings.ToLower(title) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			dash = false
		} else if b.Len() > 0 && !dash {
			b.WriteByte('-')
			dash = true
		}
	}
	slug := strings.TrimRight(b.String(), "-")
	if len(slug) > maxNewsSlugLen {
		slug = strings.TrimRight(slug[:maxNewsSlugLen], "-")
	}
	if slug == "" {
		return "berita"
	}
	return slug
}

// UniqueNewsSlug returns a slug for a new article that is not yet used in news.slug,
// appending -2, -3, ... when needed. Existing rows are never modified.
func UniqueNewsSlug(db *gorm.DB, title string) (string, error) {
	base := NewsSlugBase(title)
	slug := base
	for i := 2; ; i++ {
		var count int64
		if err := db.Model(&models.News{}).Where("slug = ?", slug).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return slug, nil
		}
		slug = fmt.Sprintf("%s-%d", base, i)
	}
}
