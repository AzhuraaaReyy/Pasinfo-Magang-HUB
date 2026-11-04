package services

import (
	"regexp"
	"strings"
)

// Location of a place (T1, jobdesk 2 Nov, 2026-11-03, Owner option A): the kecamatan is stored in places.district,
// and the map zone of culinary, culture, and event content is derived from it instead of only from the seed files.

// Regency names of places.regency; "Pasuruan" alone did not tell Kota from Kabupaten.
const (
	RegencyKota      = "Kota Pasuruan"
	RegencyKabupaten = "Kabupaten Pasuruan"
)

// kecamatanZones lists the kecamatan of each map zone (regions.name). It follows the frontend map rule
// (classifyKecamatan) and the zone descriptions in regions.short_description; TestKecamatanZonesMatchRegionDescriptions
// keeps it equal to the seed descriptions.
var kecamatanZones = map[string][]string{
	"Kota Pasuruan":    {"Bugul Kidul", "Gadingrejo", "Panggungrejo", "Purworejo"},
	"Pasuruan Timur":   {"Gondangwetan", "Grati", "Lekok", "Lumbang", "Nguling", "Rejoso", "Winongan"},
	"Pasuruan Barat":   {"Gempol", "Pandaan", "Prigen", "Purwodadi", "Purwosari", "Sukorejo", "Wonorejo"},
	"Pasuruan Utara":   {"Bangil", "Beji", "Kejayan", "Kraton", "Pohjentrek", "Rembang"},
	"Pasuruan Selatan": {"Pasrepan", "Puspo", "Tosari", "Tutur"},
}

// zoneByKecamatan maps a lower-case kecamatan name to its zone; kecamatanNames keeps the spelling of the list.
var zoneByKecamatan, kecamatanNames = func() (map[string]string, map[string]string) {
	zones, names := map[string]string{}, map[string]string{}
	for zone, list := range kecamatanZones {
		for _, name := range list {
			zones[strings.ToLower(name)] = zone
			names[strings.ToLower(name)] = name
		}
	}
	return zones, names
}()

// kecamatanPattern finds "Kec. Bangil" or "Kecamatan Nguling" in an address.
var kecamatanPattern = regexp.MustCompile(`(?i)\bkec(?:amatan|\.)\s*([a-z]+(?: [a-z]+)?)`)

// villagePrefix strips "Desa", "Kel.", "Kelurahan", or "Dusun" from the part before ", Kec.".
var villagePrefix = regexp.MustCompile(`(?i)^(?:desa|kel\.|kelurahan|dusun)\s+`)

// ParseLocation returns the village and kecamatan written in an address such as "Gempeng, Kec. Bangil" or
// "Museum …, Jl. Raya Kasri No. 1, Petungasri, Kec. Pandaan". The kecamatan is returned only when it is one of
// the 28 kecamatan of Kota and Kabupaten Pasuruan; the village is the last comma part before it, without a
// "Desa"/"Kel." prefix, and only when that part is not a street or a place name with digits.
func ParseLocation(address string) (village, district string) {
	loc := kecamatanPattern.FindStringSubmatchIndex(address)
	if loc == nil {
		return "", ""
	}
	name := strings.ToLower(address[loc[2]:loc[3]])
	if _, ok := kecamatanNames[name]; !ok {
		// "Bugul Kidul" has two words; other matches may have caught one word too many.
		name = strings.Fields(name)[0]
	}
	district = kecamatanNames[name]
	if district == "" {
		return "", ""
	}
	parts := strings.Split(strings.TrimRight(strings.TrimSpace(address[:loc[0]]), ","), ",")
	last := villagePrefix.ReplaceAllString(strings.TrimSpace(parts[len(parts)-1]), "")
	lower := strings.ToLower(last)
	if last != "" && !strings.HasPrefix(lower, "jl") && !strings.HasPrefix(lower, "jalan") && !strings.ContainsAny(last, "0123456789;:()") && len(strings.Fields(last)) <= 3 {
		village = last
	}
	return village, district
}

// ZoneOfDistrict returns the map zone (regions.name) of a kecamatan, or "".
func ZoneOfDistrict(district string) string {
	return zoneByKecamatan[strings.ToLower(strings.TrimSpace(district))]
}

// RegencyOfZone returns Kota or Kabupaten Pasuruan for a map zone name, or "".
func RegencyOfZone(zone string) string {
	switch {
	case zone == "":
		return ""
	case zone == "Kota Pasuruan":
		return RegencyKota
	default:
		return RegencyKabupaten
	}
}

// DistrictInText returns the kecamatan a text names ("kuliner di Bangil" → "Bangil"), or "". Used as a ranking bonus
// for chat recommendations (Tahap D, 2026-11-03), never as a filter.
func DistrictInText(text string) string {
	words := strings.Fields(strings.ToLower(strings.Map(func(r rune) rune {
		if r == ',' || r == '.' || r == '?' || r == '!' || r == '(' || r == ')' {
			return ' '
		}
		return r
	}, text)))
	for i := range words {
		if i+1 < len(words) {
			if name, ok := kecamatanNames[words[i]+" "+words[i+1]]; ok {
				return name
			}
		}
		if name, ok := kecamatanNames[words[i]]; ok {
			return name
		}
	}
	return ""
}
