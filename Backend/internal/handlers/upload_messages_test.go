package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

// T5 (Owner 2026-11-10): the image upload answers the admin in polite Indonesian, with the same status codes.
func TestUploadImageAnswersIndonesian(t *testing.T) {
	t.Setenv("UPLOAD_DIR", t.TempDir())
	app := fiber.New(fiber.Config{BodyLimit: 50 * 1024 * 1024}) // cmd/api default BODY_LIMIT_MB
	app.Post("/upload", UploadImage)
	upload := func(name string, content []byte) (*multipart.Writer, *bytes.Buffer) {
		var buf bytes.Buffer
		w := multipart.NewWriter(&buf)
		if name != "" {
			part, _ := w.CreateFormFile("image", name)
			part.Write(content)
		}
		w.Close()
		return w, &buf
	}
	png := append([]byte("\x89PNG\r\n\x1a\n"), make([]byte, 64)...)
	for _, tc := range []struct {
		name, file string
		content    []byte
		code       int
		message    string
	}{
		{"tanpa berkas", "", nil, 400, "Berkas gambar belum dipilih."},
		{"ekstensi", "a.gif", png, 415, "Format berkas tidak didukung. Gunakan jpg, jpeg, png, atau webp."},
		{"isi bukan gambar", "a.png", []byte("bukan gambar sama sekali"), 415, "Isi berkas bukan gambar JPG, PNG, atau WEBP."},
		{"terlalu besar", "a.png", append(png, make([]byte, 5*1024*1024)...), 413, "Ukuran gambar terlalu besar. Maksimal 5 MB."},
		{"gambar sah", "a.png", png, 201, ""},
	} {
		w, buf := upload(tc.file, tc.content)
		req := httptest.NewRequest("POST", "/upload", buf)
		req.Header.Set("Content-Type", w.FormDataContentType())
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(resp.Body)
		var body map[string]any
		json.Unmarshal(raw, &body)
		if resp.StatusCode != tc.code || (tc.message != "" && body["message"] != tc.message) {
			t.Errorf("%s = %d %s, want %d %q", tc.name, resp.StatusCode, raw, tc.code, tc.message)
		}
	}
}
