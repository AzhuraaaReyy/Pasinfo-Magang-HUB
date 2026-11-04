package services

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestParseLocationReadsVillageAndKecamatan(t *testing.T) {
	for address, want := range map[string][2]string{
		"Gempeng, Kec. Bangil":     {"Gempeng", "Bangil"},
		"Keduwung, Kec. Puspo":     {"Keduwung", "Puspo"},
		"Trajeng, Kec. Gadingrejo": {"Trajeng", "Gadingrejo"},
		"Kecamatan Nguling, Kab. Pasuruan (rute ±4 km, belum terverifikasi)": {"", "Nguling"},
		"Sebani, Kec. Bugul Kidul":                                                                     {"Sebani", "Bugul Kidul"},
		"Jl. Pahlawan No. 28, Kota Pasuruan":                                                           {"", ""},
		"Pendopo Agung Wonokitri, Desa Wonokitri, Kec. Tosari, Kab. Pasuruan":                          {"Wonokitri", "Tosari"},
		"Lapangan Pacuan Kuda, Kel. Ledug, Kec. Prigen, Kab. Pasuruan":                                 {"Ledug", "Prigen"},
		"Museum Cunggrang (Museum Kabupaten Pasuruan), Jl. Raya Kasri No. 1, Petungasri, Kec. Pandaan": {"Petungasri", "Pandaan"},
		"TIC Kota Pasuruan, Jl. Alun-Alun Utara, Kec. Panggungrejo, Kota Pasuruan":                     {"", "Panggungrejo"},
		"Sepanjang Jl. Raya Wonosari–Nongkojajar, Kec. Tutur, Kab. Pasuruan":                           {"", "Tutur"},
		"Desa X, Kec. Sukolilo":                                                                        {"", ""}, // not a Pasuruan kecamatan
		"":                                                                                             {"", ""},
	} {
		village, district := ParseLocation(address)
		if village != want[0] || district != want[1] {
			t.Errorf("%q = (%q, %q), want %v", address, village, district, want)
		}
	}
	if ZoneOfDistrict("bangil") != "Pasuruan Utara" || ZoneOfDistrict("Gadingrejo") != "Kota Pasuruan" || ZoneOfDistrict("x") != "" {
		t.Fatal("ZoneOfDistrict")
	}
	if RegencyOfZone("Kota Pasuruan") != RegencyKota || RegencyOfZone("Pasuruan Barat") != RegencyKabupaten || RegencyOfZone("") != "" {
		t.Fatal("RegencyOfZone")
	}
}

// The kecamatan list must match the zone descriptions and the Owner's seed data: every seed address that names a
// kecamatan must give the zone of its regionId (audit 2026-11-03: 121/121).
func TestKecamatanZonesMatchRegionDescriptions(t *testing.T) {
	root := filepath.Join("..", "..", "cmd", "seed", "data")
	var wisata struct {
		Regions []struct {
			Slug, Name       string
			ShortDescription string `json:"short_description"`
		} `json:"regions"`
	}
	readSeed(t, filepath.Join(root, "wisata.json"), &wisata)
	nameBySlug := map[string]string{}
	count := 0
	for _, r := range wisata.Regions {
		nameBySlug[r.Slug] = r.Name
		for _, kecamatan := range kecamatanZones[r.Name] {
			count++
			if !strings.Contains(r.ShortDescription, kecamatan) {
				t.Errorf("zone %s description does not name %s", r.Name, kecamatan)
			}
		}
	}
	if count != 28 {
		t.Fatalf("kecamatan in seed zones = %d, want 28", count)
	}
	type seedItem struct {
		Slug, RegionID, Address string
		VenueAddress            string `json:"venue_address"`
	}
	for file, key := range map[string]string{"wisata.json": "destinations", "domains/data-kuliner.json": "culinaries", "domains/data-budaya.json": "cultures", "domains/data-acara.json": "events"} {
		var data map[string]json.RawMessage
		readSeed(t, filepath.Join(root, file), &data)
		var items []seedItem
		if err := json.Unmarshal(data[key], &items); err != nil {
			t.Fatal(err)
		}
		for _, item := range items {
			address := item.Address
			if address == "" {
				address = item.VenueAddress
			}
			if _, district := ParseLocation(address); district != "" && ZoneOfDistrict(district) != nameBySlug[item.RegionID] {
				t.Errorf("%s %s: kecamatan %s is in %s, seed regionId %s", key, item.Slug, district, ZoneOfDistrict(district), item.RegionID)
			}
		}
	}
}

func readSeed(t *testing.T, path string, target any) {
	t.Helper()
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(raw, target); err != nil {
		t.Fatal(err)
	}
}
