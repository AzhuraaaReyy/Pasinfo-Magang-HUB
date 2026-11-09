package main

import (
	"fmt"
	"log"
	"regexp"
	"strconv"
	"time"

	"gorm.io/gorm"
	"wildan-news-backend/internal/models"
)

// Opening hours from the seed files (Owner 2026-11-09): "08.00 - 17.00 WIB" means every day from 08.00 to 17.00. The
// opening_hours table holds one row per day; the times are kept on a fixed date in WIB, only the clock time is read.
var (
	openingHoursPattern = regexp.MustCompile(`^\s*(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})\s*(WIB)?\s*$`)
	seedWIB             = time.FixedZone("WIB", 7*60*60)
)

// parseOpeningHours reads "HH.MM - HH.MM WIB". A closing time before the opening time ends after midnight
// ("17.00 - 01.00").
func parseOpeningHours(text string) (opens, closes time.Time, err error) {
	m := openingHoursPattern.FindStringSubmatch(text)
	if m == nil {
		return time.Time{}, time.Time{}, fmt.Errorf("format jam buka tidak dikenali: %q", text)
	}
	clock := func(h, mm string) (time.Time, error) {
		hour, _ := strconv.Atoi(h)
		minute, _ := strconv.Atoi(mm)
		if hour > 24 || minute > 59 || (hour == 24 && minute > 0) {
			return time.Time{}, fmt.Errorf("jam tidak valid: %s.%s", h, mm)
		}
		return time.Date(2000, 1, 1, hour, minute, 0, 0, seedWIB), nil
	}
	if opens, err = clock(m[1], m[2]); err != nil {
		return
	}
	closes, err = clock(m[3], m[4])
	return
}

// seedOpeningHours writes the same hours for every day (0 = Sunday … 6 = Saturday). Running the seed again updates the
// rows, so an edited seed file replaces the old hours. An empty value writes nothing; an unreadable one is logged and
// skipped, so one bad value does not stop the seed.
func seedOpeningHours(tx *gorm.DB, openableType string, openableID uint, text string) error {
	if text == "" {
		return nil
	}
	opens, closes, err := parseOpeningHours(text)
	if err != nil {
		log.Printf("[Seed] %s %d: %v; jam buka dilewati", openableType, openableID, err)
		return nil
	}
	for day := 0; day < 7; day++ {
		row := models.OpeningHour{OpenableType: openableType, OpenableID: openableID, DayOfWeek: day}
		values := models.OpeningHour{OpensAt: opens, ClosesAt: closes, SortOrder: day}
		if err := tx.Where("openable_type = ? AND openable_id = ? AND day_of_week = ?", openableType, openableID, day).
			Assign(map[string]any{"opens_at": values.OpensAt, "closes_at": values.ClosesAt, "is_closed": false, "is24_hours": false, "sort_order": day}).
			FirstOrCreate(&row).Error; err != nil {
			return err
		}
	}
	return nil
}
