package main

import (
	"errors"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"wildan-news-backend/internal/services"
)

// backfillItem holds the seed fields that the original seed did not store (audit D-01). Owner 2026-11-09: the sample
// values of the seed files (price range, reviews label, map link, Google place id) are used during development and
// replaced by the Owner later; rating stays unread.
type backfillItem struct {
	Slug          string `json:"slug"`
	ReviewsLabel  string `json:"reviews_label"`
	PriceRange    string `json:"price_range"`
	PlaceID       string `json:"place_id"`
	GoogleMapsURL string `json:"googleMapsUrl"`
	Place         struct {
		MapURL string `json:"map_url"`
	} `json:"place"`
	ShortDescription string  `json:"short_description"`
	CulinaryType     string  `json:"culinary_type"`
	CultureType      string  `json:"culture_type"`
	EventType        string  `json:"event_type"`
	Address          string  `json:"address"`
	VenueAddress     string  `json:"venue_address"`
	OrganizerName    *string `json:"organizer_name"`
	RegionID         string  `json:"regionId"`
	// Keyakinan is the seed confidence of a destination (tinggi, sedang, rendah, perlu_cek); R2, jobdesk 2 Nov.
	Keyakinan string `json:"keyakinan"`
}

type backfillSource struct {
	Destinations []backfillItem
	Culinaries   []backfillItem
	Cultures     []backfillItem
	Events       []backfillItem
}

// backfillReport counts updated values per "table.column" and skipped rows per "skip:<reason>".
type backfillReport map[string]int

// errDryRun rolls the backfill transaction back after the report is built.
var errDryRun = errors.New("dry run: transaction rolled back")

type backfillTarget struct {
	table   string
	items   []backfillItem
	columns func(backfillItem) map[string]string
	address func(backfillItem) string
}

func backfillTargets(src backfillSource) []backfillTarget {
	organizer := func(x backfillItem) string {
		if x.OrganizerName == nil {
			return ""
		}
		return *x.OrganizerName
	}
	return []backfillTarget{
		{"destinations", src.Destinations, func(x backfillItem) map[string]string {
			return map[string]string{"short_description": x.ShortDescription, "keyakinan": x.Keyakinan, "reviews_label": x.ReviewsLabel}
		}, nil},
		{"culinaries", src.Culinaries, func(x backfillItem) map[string]string {
			return map[string]string{"short_description": x.ShortDescription, "culinary_type": x.CulinaryType, "keyakinan": x.Keyakinan, "price_range": x.PriceRange}
		}, func(x backfillItem) string { return x.Address }},
		{"cultures", src.Cultures, func(x backfillItem) map[string]string {
			return map[string]string{"short_description": x.ShortDescription, "culture_type": x.CultureType, "keyakinan": x.Keyakinan}
		}, func(x backfillItem) string { return x.Address }},
		{"events", src.Events, func(x backfillItem) map[string]string {
			return map[string]string{"short_description": x.ShortDescription, "event_type": x.EventType, "organizer_name": organizer(x)}
		}, func(x backfillItem) string { return x.VenueAddress }},
	}
}

type backfillRow struct {
	ID      uint
	PlaceID *uint
}

// applyBackfill fills empty columns of existing rows from the seed files. It never
// overwrites a value, never creates rows and leaves mock events untouched. A place shared
// by rows whose seed addresses differ is skipped.
func applyBackfill(tx *gorm.DB, src backfillSource) (backfillReport, error) {
	report := backfillReport{}
	targets := backfillTargets(src)
	type pending struct {
		placeID uint
		address string
	}
	var addresses []pending
	placeAddresses := make(map[uint]map[string]bool)
	placeRegencies := make(map[uint]map[string]bool)
	placeLinks := make(map[uint]map[string]map[string]bool) // place → column → seed values
	now := time.Now()

	for _, target := range targets {
		for _, item := range target.items {
			if strings.HasSuffix(item.Slug, "-mock") {
				report["skip:mock"]++
				continue
			}
			var row backfillRow
			if err := tx.Table(target.table).Select("id, place_id").Where("slug = ?", item.Slug).Limit(1).Scan(&row).Error; err != nil {
				return nil, err
			}
			if row.ID == 0 {
				report["skip:not_found"]++
				continue
			}
			for column, value := range target.columns(item) {
				if strings.TrimSpace(value) == "" {
					continue
				}
				res := tx.Table(target.table).
					Where("id = ?", row.ID).
					Where(gorm.Expr("COALESCE(?, '') = ''", clause.Column{Name: column})).
					Updates(map[string]any{column: value, "updated_at": now})
				if res.Error != nil {
					return nil, res.Error
				}
				report[target.table+"."+column] += int(res.RowsAffected)
			}
			if row.PlaceID != nil {
				addPlaceLink(placeLinks, *row.PlaceID, "google_place_id", item.PlaceID)
				mapURL := item.Place.MapURL
				if mapURL == "" {
					mapURL = item.GoogleMapsURL
				}
				addPlaceLink(placeLinks, *row.PlaceID, "map_url", mapURL)
				if placeRegencies[*row.PlaceID] == nil {
					placeRegencies[*row.PlaceID] = make(map[string]bool)
				}
				if regency := regencyOfRegionID(item.RegionID); regency != "" {
					placeRegencies[*row.PlaceID][regency] = true
				}
			}
			if target.address == nil || row.PlaceID == nil {
				continue
			}
			if address := strings.TrimSpace(target.address(item)); address != "" {
				if placeAddresses[*row.PlaceID] == nil {
					placeAddresses[*row.PlaceID] = make(map[string]bool)
				}
				placeAddresses[*row.PlaceID][address] = true
				addresses = append(addresses, pending{*row.PlaceID, address})
			}
		}
	}

	for _, p := range addresses {
		if len(placeAddresses[p.placeID]) > 1 {
			report["skip:shared_place"]++
			continue
		}
		res := tx.Table("places").
			Where("id = ?", p.placeID).
			Where("COALESCE(address, '') = ''").
			Updates(map[string]any{"address": p.address, "updated_at": now})
		if res.Error != nil {
			return nil, res.Error
		}
		report["places.address"] += int(res.RowsAffected)
	}
	if err := backfillPlaceLinks(tx, placeLinks, report, now); err != nil {
		return nil, err
	}
	return report, backfillPlaceLocations(tx, placeRegencies, placeAddresses, report, now)
}

func addPlaceLink(links map[uint]map[string]map[string]bool, placeID uint, column, value string) {
	if value = strings.TrimSpace(value); value == "" {
		return
	}
	if links[placeID] == nil {
		links[placeID] = make(map[string]map[string]bool)
	}
	if links[placeID][column] == nil {
		links[placeID][column] = make(map[string]bool)
	}
	links[placeID][column][value] = true
}

// backfillPlaceLinks writes the Google place id and map link of the seed into places that have none (Owner 2026-11-09):
// the seed read neither field, so every place had both empty. A place used by contents whose seed values differ is
// skipped, like a shared address.
func backfillPlaceLinks(tx *gorm.DB, links map[uint]map[string]map[string]bool, report backfillReport, now time.Time) error {
	ids := make([]uint, 0, len(links))
	for id := range links {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	for _, id := range ids {
		for _, column := range []string{"google_place_id", "map_url"} {
			values := links[id][column]
			if len(values) == 0 {
				continue
			}
			if len(values) > 1 {
				report["skip:shared_place_"+column]++
				continue
			}
			for value := range values {
				res := tx.Table("places").Where("id = ?", id).
					Where(gorm.Expr("COALESCE(?, '') = ''", clause.Column{Name: column})).
					Updates(map[string]any{column: value, "updated_at": now})
				if res.Error != nil {
					return res.Error
				}
				report["places."+column] += int(res.RowsAffected)
			}
		}
	}
	return nil
}

// regencyOfRegionID returns Kota or Kabupaten Pasuruan for a seed regionId (zone slug), or "".
func regencyOfRegionID(regionID string) string {
	switch regionID {
	case "":
		return ""
	case "kota-pasuruan":
		return services.RegencyKota
	default:
		return services.RegencyKabupaten
	}
}

// backfillPlaceLocations fills the location of every place used by seeded content (T1, jobdesk 2 Nov, 2026-11-03,
// Owner option A): village and kecamatan from the stored address, regency Kota or Kabupaten Pasuruan from the
// kecamatan or, when the address names none (route events), from the seed zone of the content using the place.
// Only empty values and the old ambiguous regency "Pasuruan" are written; a kecamatan whose zone disagrees with
// the seed zone is skipped.
func backfillPlaceLocations(tx *gorm.DB, placeRegencies, seedAddresses map[uint]map[string]bool, report backfillReport, now time.Time) error {
	ids := make([]uint, 0, len(placeRegencies))
	for id := range placeRegencies {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	for _, id := range ids {
		var place struct{ Address, Village, District, Regency string }
		if err := tx.Table("places").Select("address, village, district, regency").Where("id = ?", id).Scan(&place).Error; err != nil {
			return err
		}
		village, district := services.ParseLocation(place.Address)
		if place.Address == "" {
			// A shared place keeps an empty address when its contents name it differently (2 events at place 104);
			// the kecamatan is still used when every seed address names the same one.
			village, district = sharedSeedLocation(seedAddresses[id])
		}
		regency := services.RegencyOfZone(services.ZoneOfDistrict(district))
		seeded := placeRegencies[id]
		if regency == "" && len(seeded) == 1 {
			for value := range seeded {
				regency = value
			}
		}
		if regency != "" && len(seeded) > 0 && !seeded[regency] {
			report["skip:zone_conflict"]++
			continue
		}
		updates := map[string]any{}
		if place.District == "" && district != "" {
			updates["district"] = district
		}
		if place.Village == "" && village != "" {
			updates["village"] = village
		}
		if (place.Regency == "" || place.Regency == "Pasuruan") && regency != "" {
			updates["regency"] = regency
		}
		if len(updates) == 0 {
			continue
		}
		for column := range updates {
			report["places."+column]++
		}
		updates["updated_at"] = now
		if err := tx.Table("places").Where("id = ?", id).Updates(updates).Error; err != nil {
			return err
		}
	}
	return nil
}

// sharedSeedLocation returns the village and kecamatan named by every seed address of a place, or "" where they differ.
func sharedSeedLocation(addresses map[string]bool) (village, district string) {
	first := true
	for address := range addresses {
		v, d := services.ParseLocation(address)
		if first {
			village, district, first = v, d, false
			continue
		}
		if v != village {
			village = ""
		}
		if d != district {
			return "", ""
		}
	}
	return village, district
}
