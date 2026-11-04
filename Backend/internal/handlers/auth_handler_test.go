package handlers

import (
	"path/filepath"
	"testing"
)

func TestResolveUploadDir(t *testing.T) {
	got, err := resolveUploadDir("")
	if err != nil {
		t.Fatal(err)
	}
	if got != filepath.Clean("/app/uploads/images") {
		t.Fatalf("default=%q", got)
	}

	if _, err := resolveUploadDir("relative/uploads"); err == nil {
		t.Fatal("expected relative upload directory to be rejected")
	}
	if _, err := resolveUploadDir("bad\x00path"); err == nil {
		t.Fatal("expected NUL upload directory to be rejected")
	}
}

func TestUploadDestinationStaysInsideRoot(t *testing.T) {
	root := filepath.Join(t.TempDir(), "uploads")
	got, err := uploadDestination(root, "safe-image.png")
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(root, "safe-image.png")
	if got != want {
		t.Fatalf("destination=%q, want %q", got, want)
	}

	if _, err := uploadDestination(root, ".."+string(filepath.Separator)+"outside.png"); err == nil {
		t.Fatal("expected traversal destination to be rejected")
	}
	if _, err := uploadDestination(root, ".."+string(filepath.Separator)+".."+string(filepath.Separator)+"outside.png"); err == nil {
		t.Fatal("expected escape destination to be rejected")
	}
	if _, err := uploadDestination(root, "bad"+string(filepath.Separator)+".."+string(filepath.Separator)+"outside.png"); err == nil {
		t.Fatal("expected separator traversal destination to be rejected")
	}
	if _, err := uploadDestination(root, "bad\x00.png"); err == nil {
		t.Fatal("expected NUL destination to be rejected")
	}
}
