package handlers

import "testing"

// The static mount must serve exactly the directory UploadImage writes to, under
// the URL prefix UploadImage returns (audit M7).
func TestUploadStaticMountMatchesSaveLocation(t *testing.T) {
	if UploadPublicPrefix != "/uploads/images" {
		t.Fatalf("prefix = %q", UploadPublicPrefix)
	}
	saved, err := resolveUploadDir("")
	if err != nil {
		t.Fatal(err)
	}
	if got := UploadRootPath(""); got != saved {
		t.Fatalf("default static root %q != save root %q", got, saved)
	}
	dir := t.TempDir()
	saved, err = resolveUploadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	if got := UploadRootPath(dir); got != saved {
		t.Fatalf("static root %q != save root %q", got, saved)
	}
}
