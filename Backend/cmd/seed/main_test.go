package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadSeedFileBoundary(t *testing.T) {
	root := t.TempDir()
	for name := range approvedSeedFiles {
		path := filepath.Join(root, filepath.FromSlash(name))
		if err := os.MkdirAll(filepath.Dir(path), 0750); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(`{}`), 0600); err != nil {
			t.Fatal(err)
		}
		var value map[string]any
		if err := loadSeedFile(root, name, &value); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
	}
	for _, name := range []string{"../.env", "../../Backend/.env", filepath.Join(root, "outside.json"), "unknown.json"} {
		if err := loadSeedFile(root, name, &map[string]any{}); err == nil {
			t.Fatalf("expected %q to be rejected", name)
		}
	}
}
