package services

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadSeedRegionsMapsSlugToRegionName(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "domains"), 0750); err != nil {
		t.Fatal(err)
	}
	kuliner := `{"regions":[{"id":"pasuruan-utara","slug":"pasuruan-utara","name":"Pasuruan Utara"}],"culinaries":[{"slug":"nasi-punel","regionId":"pasuruan-utara"},{"slug":"tanpa-region","regionId":"tidak-ada"}]}`
	if err := os.WriteFile(filepath.Join(root, "domains", "data-kuliner.json"), []byte(kuliner), 0600); err != nil {
		t.Fatal(err)
	}
	regions, problems := LoadSeedRegions(root)
	if regions["culinary"]["nasi-punel"] != "Pasuruan Utara" {
		t.Fatalf("regions = %v", regions)
	}
	if _, ok := regions["culinary"]["tanpa-region"]; ok {
		t.Fatal("unknown regionId must not produce a name")
	}
	if len(problems) != 2 {
		t.Fatalf("missing budaya/acara files must be reported, got %v", problems)
	}
}
