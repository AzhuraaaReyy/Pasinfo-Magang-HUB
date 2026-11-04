package services

import (
	"encoding/json"
	"os"
)

// seedRegionFiles lists the seed files that carry regionId for domains without a region column.
var seedRegionFiles = map[string]string{
	"culinary": "domains/data-kuliner.json",
	"culture":  "domains/data-budaya.json",
	"event":    "domains/data-acara.json",
}

type seedRegionFile struct {
	Regions []struct {
		ID   string `json:"id"`
		Slug string `json:"slug"`
		Name string `json:"name"`
	} `json:"regions"`
	Culinaries []seedRegionItem `json:"culinaries"`
	Cultures   []seedRegionItem `json:"cultures"`
	Events     []seedRegionItem `json:"events"`
}

type seedRegionItem struct {
	Slug     string `json:"slug"`
	RegionID string `json:"regionId"`
}

// LoadSeedRegions returns source_type → slug → region name (moved from cmd/embed-faq on 2026-10-31).
// A missing or unreadable file is reported in the problems; RefreshKnowledge and embed-faq refuse to
// run then, so documents do not lose their map zone.
func LoadSeedRegions(root string) (map[string]map[string]string, []error) {
	out := make(map[string]map[string]string)
	var problems []error
	scope, err := os.OpenRoot(root)
	if err != nil {
		return out, []error{err}
	}
	defer scope.Close()
	for sourceType, name := range seedRegionFiles {
		b, err := scope.ReadFile(name)
		if err != nil {
			problems = append(problems, err)
			continue
		}
		var file seedRegionFile
		if err := json.Unmarshal(b, &file); err != nil {
			problems = append(problems, err)
			continue
		}
		names := make(map[string]string)
		for _, r := range file.Regions {
			names[r.ID], names[r.Slug] = r.Name, r.Name
		}
		items := append(append(append([]seedRegionItem{}, file.Culinaries...), file.Cultures...), file.Events...)
		bySlug := make(map[string]string)
		for _, item := range items {
			if name := names[item.RegionID]; name != "" {
				bySlug[item.Slug] = name
			}
		}
		out[sourceType] = bySlug
	}
	return out, problems
}
