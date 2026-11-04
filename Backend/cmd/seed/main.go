package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/gorm"

	"wildan-news-backend/internal/database"
	"wildan-news-backend/internal/models"
	"wildan-news-backend/internal/services"
)

type item struct {
	// PlaceID stays untagged: tagging it would change how existing places are matched.
	Slug, Name, Status, PlaceID, Source string
	ShortDescription                    string `json:"short_description"`
	CulinaryType                        string `json:"culinary_type"`
	CultureType                         string `json:"culture_type"`
	HistoricalPeriod                    string `json:"historical_period"`
	Keyakinan                           string `json:"keyakinan"`
	EventType                           string `json:"event_type"`
	Description                         json.RawMessage
	RegionID, CategoryID                string
	Featured                            bool

	Place struct {
		Name, Address, MapURL string
		Latitude, Longitude   float64
	} `json:"place"`
	Verification      struct{ Status *string }   `json:"verification"`
	OpeningHours      string                     `json:"opening_hours"`
	Prices            []string                   `json:"prices"`
	DestinationPrices []models.DestinationPrice  `json:"destination_prices"`
	Facilities        []json.RawMessage          `json:"facilities"`
	Media             []models.Media             `json:"media"`
	Weather           *models.DestinationWeather `json:"weather"`
	Occurrences       []struct {
		StartsAt time.Time  `json:"starts_at"`
		EndsAt   *time.Time `json:"ends_at"`
		Status   *string
		Notes    *string
	} `json:"occurrences"`
	Tickets []struct {
		Name        string
		Price       *float64
		Description *string
		TicketURL   *string
		Available   bool
	} `json:"tickets"`
}

var approvedSeedFiles = map[string]struct{}{
	"wisata.json":                     {},
	"berita.json":                     {},
	"domains/data-kuliner.json":       {},
	"domains/data-kuliner-menus.json": {},
	"domains/data-budaya.json":        {},
	"domains/data-acara.json":         {},
	"domains/kuliner-overrides.json":  {},
}

func loadSeedFile(root, relativeName string, target any) error {
	if _, ok := approvedSeedFiles[relativeName]; !ok {
		return fmt.Errorf("seed file is not approved")
	}
	if strings.ContainsRune(root, '\x00') || strings.ContainsRune(relativeName, '\x00') {
		return fmt.Errorf("seed path contains NUL byte")
	}
	if filepath.IsAbs(relativeName) {
		return fmt.Errorf("seed path must be relative")
	}
	root, err := filepath.Abs(filepath.Clean(root))
	if err != nil {
		return err
	}
	path := filepath.Join(root, filepath.Clean(relativeName))
	rel, err := filepath.Rel(root, path)
	if err != nil || filepath.IsAbs(rel) || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return fmt.Errorf("seed path escapes root")
	}
	scope, err := os.OpenRoot(root)
	if err != nil {
		return err
	}
	defer scope.Close()
	b, err := scope.ReadFile(rel)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, target)
}
func main() {
	if err := godotenv.Load(); err != nil {
		fmt.Println("[Info] File .env tidak ditemukan — memakai environment variable sistem")
	}
	backfill := flag.Bool("backfill", false, "fill empty real fields of existing rows from the seed files")
	dryRun := flag.Bool("dry-run", false, "with -backfill: print the report and roll the transaction back")
	flag.Parse()
	database.ConnectDB()
	if *backfill {
		runBackfill(*dryRun)
		return
	}
	if e := database.DB.Transaction(seed); e != nil {
		panic(e)
	}
	fmt.Println("seed completed")
}

func runBackfill(dryRun bool) {
	root := filepath.Join("cmd", "seed", "data")
	var src backfillSource
	var wisata struct {
		Destinations []backfillItem `json:"destinations"`
	}
	var kuliner struct {
		Culinaries []backfillItem `json:"culinaries"`
	}
	var budaya struct {
		Cultures []backfillItem `json:"cultures"`
	}
	var acara struct {
		Events []backfillItem `json:"events"`
	}
	for name, target := range map[string]any{"wisata.json": &wisata, "domains/data-kuliner.json": &kuliner, "domains/data-budaya.json": &budaya, "domains/data-acara.json": &acara} {
		if e := loadSeedFile(root, name, target); e != nil {
			panic(e)
		}
	}
	src.Destinations, src.Culinaries, src.Cultures, src.Events = wisata.Destinations, kuliner.Culinaries, budaya.Cultures, acara.Events
	var report backfillReport
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var e error
		if report, e = applyBackfill(tx, src); e != nil {
			return e
		}
		if dryRun {
			return errDryRun
		}
		return nil
	})
	keys := make([]string, 0, len(report))
	for key := range report {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		fmt.Printf("%s=%d\n", key, report[key])
	}
	switch {
	case dryRun && errors.Is(err, errDryRun):
		fmt.Println("backfill dry run: rolled back")
	case err != nil:
		panic(err)
	default:
		fmt.Println("backfill committed")
	}
}
func seed(tx *gorm.DB) error {
	seedRoot := filepath.Join("cmd", "seed", "data")
	var base struct {
		Regions []struct {
			Slug, Name, Color string
			Center            struct{ Latitude, Longitude float64 }
			Zoom              int
			ShortDescription  string `json:"short_description"`
		} `json:"regions"`
		Categories   []struct{ Slug, Name string } `json:"categories"`
		Destinations []item                        `json:"destinations"`
	}
	if e := loadSeedFile(seedRoot, "wisata.json", &base); e != nil {
		return e
	}
	for _, x := range base.Regions {
		if e := tx.Where("slug=?", x.Slug).FirstOrCreate(&models.Region{Slug: x.Slug, Name: x.Name, Color: x.Color, CenterLatitude: x.Center.Latitude, CenterLongitude: x.Center.Longitude, Zoom: x.Zoom, ShortDescription: x.ShortDescription}).Error; e != nil {
			return e
		}
	}
	for _, x := range base.Categories {
		if e := tx.Where("domain=? AND slug=?", "wisata", x.Slug).FirstOrCreate(&models.TravelCategory{Domain: "wisata", Slug: x.Slug, Name: x.Name}).Error; e != nil {
			return e
		}
	}
	var regs []models.Region
	tx.Find(&regs)
	rm := map[string]uint{}
	for _, x := range regs {
		rm[x.Slug] = x.ID
	}
	var cats []models.TravelCategory
	tx.Find(&cats)
	cm := map[string]uint{}
	for _, x := range cats {
		cm[x.Slug] = x.ID
	}
	for _, x := range base.Destinations {
		p, e := place(tx, x)
		if e != nil {
			return e
		}
		row := models.Destination{PlaceID: p.ID, RegionID: rm[x.RegionID], CategoryID: cm[x.CategoryID], Name: x.Name, Slug: x.Slug, ShortDescription: x.ShortDescription, Description: descriptionText(x.Description), Status: "published", Featured: x.Featured, Source: x.Source}
		if e = tx.Where("slug=?", x.Slug).FirstOrCreate(&row).Error; e != nil {
			return e
		}
		for _, p := range x.DestinationPrices {
			p.DestinationID = row.ID
			if e = tx.Where("destination_id = ? AND name = ?", row.ID, p.Name).FirstOrCreate(&p).Error; e != nil {
				return e
			}
		}
		for i, raw := range x.Facilities {
			var name string
			if json.Unmarshal(raw, &name) != nil {
				var value struct {
					Name string `json:"name"`
				}
				if json.Unmarshal(raw, &value) == nil {
					name = value.Name
				}
			}
			facility := models.Facility{DestinationID: row.ID, Name: name, SortOrder: i}
			if e = tx.Where("destination_id = ? AND name = ?", row.ID, name).FirstOrCreate(&facility).Error; e != nil {
				return e
			}
		}
		for i, m := range x.Media {
			m.MediableType = "Destination"
			m.MediableID = row.ID
			m.SortOrder = i
			if e = tx.Where("mediable_type = ? AND mediable_id = ? AND url = ?", "Destination", row.ID, m.URL).FirstOrCreate(&m).Error; e != nil {
				return e
			}
		}
		if x.Weather != nil {
			x.Weather.DestinationID = row.ID
			if e = tx.Where("destination_id = ?", row.ID).FirstOrCreate(x.Weather).Error; e != nil {
				return e
			}
		}
		if e = link(tx, "Destination", row.ID, x.Source, x.Verification.Status); e != nil {
			return e
		}
	}
	// data-acara.json is editorial research (meta "riset-editorial", 2026-10-27), no longer mock data: it is
	// labelled like the wisata seed file (Owner 2026-11-01).
	var files = []struct{ Path, Key, Source, Type string }{{"cmd/seed/data/domains/data-kuliner.json", "culinaries", "kuliner", "frontend_data"}, {"cmd/seed/data/domains/data-budaya.json", "cultures", "budaya", "frontend_data"}, {"cmd/seed/data/domains/data-acara.json", "events", "data-acara.json", "seed"}}
	for _, f := range files {
		var d struct{ Culinaries, Cultures, Events []item }
		if e := loadSeedFile(seedRoot, strings.TrimPrefix(f.Path, "cmd/seed/data/"), &d); e != nil {
			return e
		}
		var xs []item
		switch f.Key {
		case "culinaries":
			xs = d.Culinaries
		case "cultures":
			xs = d.Cultures
		default:
			xs = d.Events
		}
		var menuData map[string][]struct {
			Name        string
			Category    string
			Description *string
			Price       *float64
			IsFeatured  bool
			SortOrder   int `json:"sort_order"`
		}
		if f.Key == "culinaries" {
			if e := loadSeedFile(seedRoot, "domains/data-kuliner-menus.json", &menuData); e != nil {
				return e
			}
		}
		src := models.TravelSource{Name: f.Source, SourceType: f.Type}
		if e := tx.Where("name=? AND source_type=?", src.Name, src.SourceType).FirstOrCreate(&src).Error; e != nil {
			return e
		}
		for _, x := range xs {
			p, e := place(tx, x)
			if e != nil {
				return e
			}
			switch f.Key {
			case "culinaries":
				var v models.Culinary
				e = tx.Where("slug=?", x.Slug).First(&v).Error
				if e == gorm.ErrRecordNotFound {
					v = models.Culinary{Name: x.Name, Slug: x.Slug, ShortDescription: x.ShortDescription, Description: descriptionText(x.Description), CulinaryType: x.CulinaryType, Keyakinan: x.Keyakinan, Status: "published", Featured: x.Featured, PlaceID: &p.ID, PublishedAt: now()}
					e = tx.Create(&v).Error
				}
				if e == nil {
					if v.ID == 0 {
						e = tx.Where("slug=?", x.Slug).First(&v).Error
					}
					if e == nil {
						for _, m := range menuData[x.Slug] {
							if e = tx.Where("culinary_id=? AND name=?", v.ID, m.Name).First(&models.CulinaryMenu{}).Error; e == gorm.ErrRecordNotFound {
								e = tx.Create(&models.CulinaryMenu{CulinaryID: v.ID, Name: m.Name, Category: m.Category, Description: m.Description, Price: m.Price}).Error
							} else if e == nil {
								continue
							}
							if e != nil {
								break
							}
						}
						if e == nil {
							e = linkID(tx, src, "Culinary", v.ID, x.Verification.Status)
						}
					}
				}
			case "cultures":
				var v models.Culture
				e = tx.Where("slug=?", x.Slug).First(&v).Error
				if e == gorm.ErrRecordNotFound {
					e = tx.Create(&models.Culture{Name: x.Name, Slug: x.Slug, ShortDescription: x.ShortDescription, Description: descriptionText(x.Description), CultureType: x.CultureType, HistoricalPeriod: x.HistoricalPeriod, Keyakinan: x.Keyakinan, Status: "published", Featured: x.Featured, PlaceID: &p.ID}).Error
				}
				if e == nil {
					if v.ID == 0 {
						e = tx.Where("slug=?", x.Slug).First(&v).Error
					}
					if e == nil {
						e = linkID(tx, src, "Culture", v.ID, x.Verification.Status)
					}
				}
			default:
				var v models.Event
				e = tx.Where("slug=?", x.Slug).First(&v).Error
				if e == gorm.ErrRecordNotFound {
					e = tx.Create(&models.Event{Name: x.Name, Slug: x.Slug, ShortDescription: x.ShortDescription, Description: descriptionText(x.Description), EventType: x.EventType, Status: "published", Featured: x.Featured, PlaceID: &p.ID}).Error
				}
				if e == nil {
					if v.ID == 0 {
						e = tx.Where("slug=?", x.Slug).First(&v).Error
					}
					if e == nil {
						e = linkID(tx, src, "Event", v.ID, x.Verification.Status)
					}
					for _, o := range x.Occurrences {
						if e == nil {
							e = tx.Where("event_id=? AND starts_at=?", v.ID, o.StartsAt).FirstOrCreate(&models.EventOccurrence{EventID: v.ID, StartsAt: o.StartsAt, EndsAt: o.EndsAt, Status: o.Status, Notes: o.Notes}).Error
						}
					}
					for _, t := range x.Tickets {
						if e == nil {
							e = tx.Where("event_id=? AND name=?", v.ID, t.Name).FirstOrCreate(&models.EventTicket{EventID: v.ID, Name: t.Name, Price: t.Price, Description: t.Description, TicketURL: t.TicketURL, Available: t.Available}).Error
						}
					}
				}
			}
			if e != nil {
				return e
			}
		}
	}
	return nil
}
func descriptionText(raw json.RawMessage) string {
	var parts []string
	if json.Unmarshal(raw, &parts) == nil {
		return strings.Join(parts, "\n\n")
	}
	var text string
	if json.Unmarshal(raw, &text) == nil {
		return text
	}
	return ""
}

func now() *time.Time { t := time.Now(); return &t }
func place(tx *gorm.DB, x item) (models.Place, error) {
	var p models.Place
	// A new place gets its village, kecamatan, and Kota/Kabupaten from the address (T1, 2026-11-03).
	village, district := services.ParseLocation(x.Place.Address)
	regency := services.RegencyOfZone(services.ZoneOfDistrict(district))
	if regency == "" {
		regency = regencyOfRegionID(x.RegionID)
	}
	e := tx.Where("google_place_id=?", x.PlaceID).FirstOrCreate(&p, models.Place{GooglePlaceID: x.PlaceID, Name: x.Place.Name, Address: x.Place.Address, Village: village, District: district, Regency: regency, Latitude: x.Place.Latitude, Longitude: x.Place.Longitude, MapURL: x.Place.MapURL}).Error
	return p, e
}
func link(tx *gorm.DB, typ string, id uint, name string, status *string) error {
	var s models.TravelSource
	if e := tx.Where("name=?", name).FirstOrCreate(&s, models.TravelSource{Name: name, SourceType: "seed"}).Error; e != nil {
		return e
	}
	return linkID(tx, s, typ, id, status)
}
func linkID(tx *gorm.DB, s models.TravelSource, typ string, id uint, status any) error {
	if e := tx.Where("source_id=? AND sourceable_type=? AND sourceable_id=?", s.ID, typ, id).FirstOrCreate(&models.Sourceable{SourceID: s.ID, SourceableType: typ, SourceableID: id}).Error; e != nil {
		return e
	}
	v := models.Verification{VerifiableType: typ, VerifiableID: id, Status: "pending"}
	if status != nil {
		if value, ok := status.(*string); ok && value != nil {
			v.Status = *value
		}
	}
	return tx.Where("verifiable_type=? AND verifiable_id=?", typ, id).FirstOrCreate(&v).Error
}
