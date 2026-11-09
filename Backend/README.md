# Pasuruan Info Backend

Backend API untuk platform Pasuruan Info — News & Travel Tech Platform. Backend ini menyediakan REST API berbasis Go/Fiber untuk berita, wisata, kuliner, budaya, acara, autentikasi, wilayah, dan AI Travel Assistant berbasis semantic RAG.

Backend aktif berada di direktori `Backend/`. Direktori `Backend/devbackend/` hanya referensi dan bukan runtime aktif.

## Arsitektur Singkat

```text
Client
  -> Fiber REST API (/api/v1)
  -> Handler
  -> Service
  -> GORM
  -> PostgreSQL 16 + pgvector

AI Travel Assistant (RAG):
  request chat
  -> validasi visitor cookie, session, dan pesan
  -> LLM membaca pertanyaan menjadi rencana JSON (domain, kategori, zona, kecamatan, periode, pertanyaan lanjutan), backend memvalidasi lalu menyusun SQL
  -> embedding query + semantic search pgvector pada faq_knowledge_bases
     (jalur khusus: zona peta, ikhtisar wilayah, jadwal acara, berita terbaru/populer)
  -> penilai relevansi LLM -> relevant / low_confidence / no_source
  -> prompt terlindungi berisi CONTEXT dari dokumen relevant saja
  -> LLM (Ollama / Gemini / OpenAI-compatible)
  -> grounding (fakta hanya dari CONTEXT) + format teks biasa dan baris "Sumber:"
  -> simpan user message dan assistant message (metadata sumber, status retrieval)
```

Chat anonim menggunakan cookie HttpOnly `pasinfo_visitor`. Kepemilikan session diperiksa dari cookie tersebut.

## Struktur Direktori Utama

```text
Backend/
├── cmd/
│   ├── api/                 Entry point API aktif
│   ├── embed-faq/           Refresh manual knowledge corpus AI
│   ├── migrate_sqlite_to_pg/ Migrasi data lama SQLite ke PostgreSQL (sekali pakai)
│   ├── poc-llm/             Uji langsung provider chat dan embedding
│   ├── seed/                Seed domain dan backfill data
│   ├── seed_users/          Seed user
│   └── seed_wilayah/        Seed data wilayah dari CSV
├── internal/
│   ├── config/              Pembacaan environment
│   ├── database/            Koneksi database dan AutoMigrate
│   ├── handlers/            HTTP handler dan DTO
│   ├── middleware/          Auth, rate limit, CORS, security, body limit
│   ├── models/              Model GORM
│   ├── routes/              Registrasi endpoint
│   ├── services/            Chat, retrieval, LLM, news, retention, dan integrasi
│   └── utils/               Utility umum
├── data/wilayah/            Dataset CSV wilayah
├── docker/postgres/init.sql Aktivasi ekstensi pgvector
├── docs/                    Dokumentasi backend, kontrak API (OpenAPI), hasil pengujian per jobdesk
├── scripts/                 Skrip pengujian/evaluasi RAG (Node.js, PowerShell) dan hasilnya
├── Dockerfile
├── docker-compose.yml
├── go.mod
└── .env.example
```

## Teknologi dan Dependencies

- Go `1.25.x` sesuai `go.mod` (`go 1.25.0`) dan `Dockerfile` (`golang:1.25-alpine`); seluruh modul sudah kompatibel dengan Go 1.25 (modul `golang.org/x/*` disesuaikan 2026-11-03)
- Fiber v2 untuk HTTP API
- GORM untuk ORM dan AutoMigrate
- PostgreSQL 16 dengan image `pgvector/pgvector:pg16`
- pgvector untuk semantic search berbasis cosine distance
- Gemini sebagai provider utama untuk chat dan embedding, dikonfigurasi melalui environment
- Provider chat dapat diganti lewat environment: OpenAI-compatible (OpenAI, OpenRouter, Groq, gateway seperti 9router, dan sejenisnya) atau Ollama lokal
- JWT untuk autentikasi legacy
- SQLite tersedia sebagai fallback teknis ketika konfigurasi PostgreSQL tidak dipakai; tabel travel dan AI hanya dibuat pada PostgreSQL + pgvector
- Docker dan Docker Compose untuk menjalankan PostgreSQL dan, bila diperlukan, API
- Node.js untuk skrip pengujian/evaluasi di `scripts/` dan Postman CLI untuk koleksi uji endpoint (keduanya hanya untuk pengujian)

Dependency Go diambil dari `go.mod` dan dikunci melalui `go.sum`.

## Persyaratan Instalasi

Untuk menjalankan API langsung dari source:

1. Go `1.25.x` (versi baru juga dapat membangun proyek; untuk memakai tepat 1.25 seperti image Docker, pasang Go 1.25 atau set `GOTOOLCHAIN=go1.25.14`).
2. Docker Desktop atau Docker Engine + Docker Compose plugin.
3. Provider LLM yang dapat diakses:
   - Gemini dengan `GEMINI_API_KEY`; atau
   - provider OpenAI-compatible atau Ollama lokal untuk chat, dengan embedding tetap sesuai `EMBED_PROVIDER`.
4. Git.
5. PostgreSQL tidak perlu dipasang secara manual jika menggunakan Docker Compose.
6. Opsional untuk pengujian: Node.js dan Postman CLI (`postman`).

Jika memakai Ollama lokal, model default dapat diunduh dengan:

```powershell
ollama pull gemma3:4b
ollama pull embeddinggemma
```

## Langkah Cepat (Development Lokal)

Ringkasan urutan; detail tiap langkah ada di bagian berikutnya. Jalankan dari direktori `Backend/`.

1. `Copy-Item .env.example .env`, lalu isi nilai lokal (lihat **Konfigurasi Environment**).
2. `docker compose up -d --build` menjalankan PostgreSQL + pgvector dan API (mode, image, dan arsitektur dibaca dari `.env`). Saat start, API menjalankan migrasi (AutoMigrate + SQL idempoten).
3. `go run ./cmd/seed` lalu `go run ./cmd/seed -backfill` mengisi data wisata, kuliner, budaya, dan acara dari `cmd/seed/data` (menulis database lokal). Backfill melengkapi alamat tempat serta lokasi `places` (desa, kecamatan, Kota/Kabupaten Pasuruan) dari alamat; tambahkan `-dry-run` untuk melihat laporannya tanpa menulis.
4. Tunggu refresh corpus otomatis (log `[Knowledge] corpus refreshed`) atau jalankan `go run ./cmd/embed-faq`.
5. Cek `http://localhost:8080/api/v1/health/ready` dan `/api/v1/chat/health`, lalu uji chat (lihat **Pengujian Provider dan PoC RAG**).

Layanan di Windows, seperti Ollama atau gateway LLM, dipanggil dari container lewat `host.docker.internal`. Atur alamatnya di `.env`, misalnya `OLLAMA_BASE_URL=http://host.docker.internal:11434`.

## Konfigurasi Environment

Salin template environment:

```powershell
Copy-Item .env.example .env
```

Edit `.env` dan isi nilai lokal Anda. Jangan commit `.env`, API key, password, atau secret.

Konfigurasi minimum untuk runtime API:

```dotenv
APP_ENV=development
PORT=8080
HTTPS=false
JWT_SECRET=buat-secret-random-minimal-32-karakter

DB_DRIVER=postgres
DB_HOST=localhost
DB_PORT=5433
DB_USER=pasinfo
DB_PASSWORD=isi_password_sendiri
DB_NAME=pasinfo_travel
DB_SSLMODE=disable

LLM_PROVIDER=gemini
EMBED_PROVIDER=gemini
GEMINI_API_KEY=isi_key_sendiri
EMBED_RELEVANCE_THRESHOLD=0.66
EMBED_REQUESTS_PER_MINUTE=50
LLM_HTTP_TIMEOUT_SEC=120
LLM_MAX_RETRIES=1
LLM_MAX_CONCURRENCY=1
CHAT_RETENTION_DAYS=90
```

Catatan konfigurasi:

- `JWT_SECRET` wajib diisi. API menolak startup jika nilainya kosong.
- `LLM_PROVIDER` mendukung `gemini`, `openai-compatible`, atau `ollama`. Tanpa nilai, kode memakai `gemini` (perlu `GEMINI_API_KEY`); isi `ollama` untuk Ollama lokal.
- Untuk mengganti provider chat, ubah `LLM_PROVIDER`, lalu untuk `openai-compatible` isi `LLM_API_BASE_URL`, `LLM_API_KEY`, dan `LLM_CHAT_MODEL`. Embedding dan corpus tidak berubah selama `EMBED_PROVIDER` dan modelnya tetap.
- Mengganti model embedding berarti seluruh corpus di-embed ulang dan `EMBED_RELEVANCE_THRESHOLD` perlu dikalibrasi. Satu database hanya boleh memakai satu model embedding.
- `GEMINI_API_KEY` wajib disediakan melalui environment selama chat atau embedding memakai Gemini. Jangan menuliskan key asli pada README atau repository.
- `LLM_FALLBACK_PROVIDER` opsional.
- `CHAT_RETENTION_DAYS=0` menonaktifkan job purge riwayat chat.
- Pool koneksi database: `DB_MAX_OPEN_CONNS` (default `20`), `DB_MAX_IDLE_CONNS` (default `10`), `DB_CONN_MAX_LIFETIME_MIN` (default `30`). Saat semua koneksi terpakai, request berikutnya menunggu koneksi bebas, tidak membuka koneksi baru sampai PostgreSQL menolak (`max_connections`, default 100). Total koneksi semua instance API harus di bawah batas itu.
- `RUN_STARTUP_SEED`, `RUN_WILAYAH_SEED`, dan `RUN_STARTUP_NEWS_FETCH` default-nya tidak aktif.
- `WEATHER_API_KEY` dan `GOOGLE_MAPS_SERVER_KEY` hanya diperlukan untuk integrasi live terkait wisata.
- `UPLOAD_DIR` menentukan lokasi penyimpanan upload; default container pada Compose adalah `/app/uploads/images`.

Variabel AI Travel Assistant (default dari `internal/config/config.go`; key/secret tidak punya default dan hanya diisi di `.env`):

| Variabel | Default | Keterangan |
|---|---|---|
| `LLM_PROVIDER` | `gemini` | Provider chat: `gemini`, `openai-compatible`, `ollama` |
| `LLM_FALLBACK_PROVIDER` | kosong | Provider chat cadangan (opsional) |
| `EMBED_PROVIDER` | sama dengan `LLM_PROVIDER` | Provider embedding; mengganti model embedding berarti corpus di-embed ulang |
| `OLLAMA_BASE_URL` / `OLLAMA_CHAT_MODEL` / `OLLAMA_EMBED_MODEL` | `http://localhost:11434` / `gemma3:4b` / `embeddinggemma` | Ollama lokal |
| `GEMINI_API_KEY` / `GEMINI_CHAT_MODEL` / `GEMINI_EMBED_MODEL` | — / `gemini-3.5-flash-lite` / `gemini-embedding-001` | Key wajib bila Gemini dipakai |
| `LLM_API_BASE_URL`, `LLM_API_KEY`, `LLM_CHAT_MODEL`, `EMBED_API_BASE_URL`, `EMBED_API_KEY`, `EMBED_MODEL` | — | Wajib bila memakai `openai-compatible` |
| `EMBED_DIMENSIONS` | `768` | Harus 768 (kolom `vector(768)`) |
| `EMBED_RELEVANCE_THRESHOLD` | kosong = `0.60` | Ambang relevansi per model embedding (Gemini: `0.66`); harus > 0.35 dan < 1 |
| `EMBED_REQUESTS_PER_MINUTE` | `0` (tanpa jeda) | Jeda embedding saat refresh corpus (kuota provider API) |
| `LLM_HTTP_TIMEOUT_SEC` / `LLM_MAX_RETRIES` / `LLM_MAX_CONCURRENCY` | `120` / `1` / `1` | Timeout, retry, dan batas panggilan LLM bersamaan |
| `LLM_OLLAMA_NUM_GPU` | kosong | Jumlah layer gemma3 di GPU (hanya Ollama lokal) |
| `CHAT_RETENTION_DAYS` | `90` | Retensi riwayat chat anonim; `0` menonaktifkan purge |

API memvalidasi konfigurasi ini saat start dan menolak nilai yang tidak valid dengan pesan yang menyebut nama variabelnya.

## Menjalankan PostgreSQL melalui Docker

Jalankan perintah dari direktori `Backend/`.

Compose menggunakan image PostgreSQL 16 yang sudah memiliki pgvector. Konfigurasi default lokal pada `docker-compose.yml` adalah:

- Container: `pasinfo-legacy-postgres`
- Host port: `5433`
- Container port: `5432`
- Database: `pasinfo_travel`
- User: `pasinfo`
- Password: wajib diisi lewat `DB_PASSWORD` di `.env` (Compose tidak punya nilai default)

Compose memakai network eksternal `shared-network`. Di setiap mesin, buat sekali bila belum ada:

```powershell
docker network create shared-network
```

Jalankan PostgreSQL saja:

```powershell
docker compose up -d postgres
```

Periksa status service:

```powershell
docker compose ps
docker compose logs -f postgres
```

Hentikan service tanpa menghapus volume:

```powershell
docker compose stop postgres
```

Jangan menggunakan `docker compose down -v` kecuali memang ingin menghapus data PostgreSQL pada volume lokal.

## Migrasi dan Inisialisasi Database

Backend tidak memiliki perintah migrasi SQL terpisah. Saat `cmd/api` dijalankan, `internal/database/database.go` melakukan:

1. koneksi ke PostgreSQL;
2. `AutoMigrate` model legacy;
3. aktivasi extension `vector` pada PostgreSQL;
4. `AutoMigrate` model travel dan AI;
5. penambahan kolom FAQ yang diperlukan melalui SQL idempotent;
6. pembuatan indeks HNSW untuk kolom embedding.

Dengan demikian, jalankan API setelah PostgreSQL sehat untuk membuat atau memperbarui struktur database:

```powershell
go run ./cmd/api
```

Perhatian: proses startup dapat melakukan perubahan skema melalui AutoMigrate. Jalankan hanya pada database yang memang ditujukan untuk development/staging dan pastikan konfigurasi `.env` menunjuk ke database yang benar.

Seed tidak dijalankan otomatis kecuali diaktifkan. Untuk seed startup secara eksplisit, gunakan environment berikut sesuai kebutuhan:

```dotenv
RUN_STARTUP_SEED=true
RUN_WILAYAH_SEED=true
RUN_STARTUP_NEWS_FETCH=false
SEED_USER_PASSWORD=buat-password-seed-lokal
```

Alternatifnya, gunakan command seed yang tersedia setelah memahami data yang akan ditulis:

```powershell
go run ./cmd/seed
go run ./cmd/seed_wilayah
```

Akun seed (admin, penulis, editor, member) dan kategori dibuat dari `SEED_USER_PASSWORD` lewat `RUN_STARTUP_SEED=true`; cara yang sama menyamakan password akun seed bila nilai di `.env` diganti, misalnya `$env:RUN_STARTUP_SEED="true"; go run ./cmd/embed-faq -dry-run; Remove-Item Env:RUN_STARTUP_SEED`. `cmd/seed_users` hanya menulis ke file SQLite lama, bukan PostgreSQL.

Lokasi tempat: `places.district` (kecamatan), `village`, dan `regency` (`Kota Pasuruan` / `Kabupaten Pasuruan`) diisi dari alamat (`Desa X, Kec. Y`) oleh seed dan `go run ./cmd/seed -backfill`. Zona peta kuliner, budaya, dan acara pada corpus AI diturunkan dari kecamatan tempat (daftar kecamatan per zona sama dengan peta frontend); file seed hanya cadangan.

Command seed menulis data ke database. Jangan menjalankannya terhadap database staging/production tanpa persetujuan dan verifikasi target database.

Setelah seed, `cmd/seed` langsung menjalankan refresh corpus AI bila provider embedding terjangkau (bila tidak, job refresh API mengambilnya: saat start dan tiap 15 menit) dari wisata, kuliner, budaya, acara, dan zona wilayah. Database baru belum berisi berita: berita masuk lewat fetch berita (`RUN_STARTUP_NEWS_FETCH=true`, job 12 jam, atau `POST /api/v1/news/fetch` dengan token admin) dan langsung memicu refresh corpus.

## Menjalankan API dari Source

Pastikan PostgreSQL dan provider LLM sudah aktif, kemudian dari direktori `Backend/`:

```powershell
go mod download
go mod verify
go run ./cmd/api
```

API secara default berjalan pada port `8080`.

Uji health check:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
```

Respons yang diharapkan:

```json
{"status":"ok"}
```

Untuk menjalankan build binary:

```powershell
go build ./cmd/api
```

## Menjalankan API melalui Docker Compose

Hanya ada satu file Compose, dan nilainya dibaca dari `.env`: `APP_ENV`, `HTTPS`, `BACKEND_IMAGE`, dan `TARGETARCH` (default `amd64`). Untuk lokal, pakai `APP_ENV=development`, `HTTPS=false`, dan `BACKEND_IMAGE=pasinfo-backend:local`.

Jalankan PostgreSQL dan API sekaligus:

```powershell
docker compose up -d --build backend
```

Periksa status dan log:

```powershell
docker compose ps
docker compose logs -f backend
```

Health check API:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
```

Jika hanya ingin membangun ulang API setelah perubahan kode:

```powershell
docker compose up -d --build backend
```

Tanpa nilai di `.env`, Compose memakai `APP_ENV=production` dan `HTTPS=true`, yang berbeda dari runtime development lokal.

## AI Travel Assistant

### Alur RAG

AI Travel Assistant menggunakan semantic retrieval pada `faq_knowledge_bases`:

1. pesan diterima melalui endpoint chat;
2. session dan visitor cookie divalidasi;
3. query dibuat menjadi embedding;
4. semantic search menggunakan pgvector;
5. hasil diklasifikasikan menjadi `relevant`, `low_confidence`, atau `no_source`;
6. hanya context yang relevan dikirim ke model jawaban;
7. jawaban disimpan bersama metadata sumber dan status retrieval.

Threshold relevance diatur lewat `EMBED_RELEVANCE_THRESHOLD` (kosong = `0.60` untuk `embeddinggemma`); kandidat dengan similarity ≥ 0.35 dinilai oleh penilai relevansi LLM. Retrieval utama bersifat semantic. Pengecualian yang sudah tersedia adalah filter zona, ikhtisar wilayah, jadwal acara, dan jalur berita berdasarkan kategori/terbaru/populer. Jawaban berupa teks biasa yang diakhiri baris `Sumber:` berisi sumber yang dipakai.

### Refresh Knowledge Corpus

API menjalankan refresh corpus otomatis ketika provider embedding tersedia, lalu memeriksa ulang tiap 15 menit; tulis berita (admin, fetch) dan ubah kategori memicu refresh segera, `cmd/seed` menjalankan refresh setelah seed. Refresh hanya meng-embed dokumen baru atau berubah. Dokumen yang sumbernya tidak lagi `published` atau sudah dihapus dinonaktifkan (ditandai `source_unpublished` di metadata) dan aktif kembali bila sumbernya dipublikasikan lagi; dokumen yang dinonaktifkan manual tetap nonaktif.

`cmd/embed-faq` membaca `.env` seperti API: variabel yang di-set di shell menang, misalnya `$env:DB_NAME="pasinfo_travel_gemini"` untuk menargetkan database lain.

Refresh manual:

```powershell
go run ./cmd/embed-faq
```

Simulasi tanpa menulis database:

```powershell
go run ./cmd/embed-faq -dry-run
```

Embed ulang semua dokumen:

```powershell
go run ./cmd/embed-faq -force
```

`-force` memanggil provider embedding dan menulis ulang embedding seluruh corpus. Gunakan hanya jika memang diperlukan, misalnya setelah perubahan model embedding.

Status pemrosesan setiap dokumen tersimpan di `faq_knowledge_bases.embedding_status` (`pending` → `processing` → `completed` atau `failed`), bersama `embedding_attempts`, `embedding_error`, dan `embedding_next_retry_at`. Kegagalan milik dokumen (input ditolak 400/413/422, vektor tidak valid) dicoba ulang setelah 15 menit, 30 menit, 1 jam, lalu 2 jam; setelah 5 kali tidak dicoba otomatis sampai teksnya berubah atau `-force`. Gangguan provider (koneksi, timeout, 5xx, kuota, key ditolak, model tidak ditemukan) menghentikan run tanpa menambah percobaan; dokumennya tetap `pending` untuk run berikutnya. FAQ manual (baris tanpa `source_type`) ikut di-embed; editnya dikenali dari sidik jari teks di `metadata`.

Memantau status (baca-saja):

```sql
SELECT embedding_status, count(*) FROM faq_knowledge_bases GROUP BY 1;
SELECT id, source_type, source_id, embedding_attempts, embedding_error, embedding_next_retry_at
FROM faq_knowledge_bases WHERE embedding_status <> 'completed';
```

Log worker: `docker logs pasinfo-backend 2>&1 | Select-String "\[Knowledge\]"`. Tutorial langkah demi langkah (menjalankan, memantau, uji data manual, troubleshooting): `docs/5 November 2026/TUTORIAL_MENJALANKAN_WORKER.md`. Rincian desain dan hasil uji: `docs/5 November 2026/BACKGROUND_WORKER_DATA_INGESTION.md`.

### Endpoint Chat

Base URL lokal:

```text
http://localhost:8080/api/v1
```

Buat session:

```powershell
$sessionResponse = Invoke-WebRequest `
  -Uri http://localhost:8080/api/v1/chat/sessions `
  -Method Post `
  -UseBasicParsing `
  -SessionVariable chatSession

$sessionId = ($sessionResponse.Content | ConvertFrom-Json).session.id
```

Kirim pesan menggunakan session dan cookie yang sama (jawaban Ollama lokal dapat memerlukan puluhan detik):

```powershell
$body = @{ message = 'Apa rekomendasi wisata di Pasuruan?' } | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/chat/sessions/$sessionId/messages" `
  -Method Post `
  -WebSession $chatSession `
  -ContentType 'application/json' `
  -Body $body `
  -TimeoutSec 240
```

Cookie visitor harus dipertahankan; request tanpa cookie atau dari visitor lain mendapat `404 SESSION_NOT_FOUND`.

Dokumentasi lengkap (parameter, format request/response, kode error, contoh): `docs/28 Oktober 2026/api/openapi.yaml` dan `docs/28 Oktober 2026/api/CHAT_API_CONTRACT.md`.

Ambil riwayat pesan:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:8080/api/v1/chat/sessions/$sessionId/messages" `
  -WebSession $chatSession
```

Periksa ketersediaan provider AI:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/chat/health
```

### Endpoint Semantic Search

Endpoint ini tersedia pada environment selain production:

```powershell
$body = @{
  query = 'destinasi wisata di Pasuruan'
  category = 'wisata'
  limit = 5
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri http://localhost:8080/api/v1/search/semantic `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body
```

Nilai `category` yang diterima adalah `wisata`, `berita`, `kuliner`, `budaya`, `acara`, `umum`, atau `layanan`. `limit` maksimal `50`.

## Pengujian Provider dan PoC RAG

### Uji Provider LLM Langsung

Command ini tidak menjalankan pipeline chat lengkap dan tidak membaca knowledge corpus. Command ini hanya menguji koneksi provider chat atau embedding.

Uji dengan pertanyaan default:

```powershell
go run ./cmd/poc-llm
```

Uji satu pertanyaan:

```powershell
go run ./cmd/poc-llm Apa rekomendasi kuliner khas Pasuruan?
```

Uji embedding dan validasi dimensi vector:

```powershell
go run ./cmd/poc-llm --embed
```

Embedding yang digunakan oleh pipeline saat ini diharapkan memiliki dimensi `768`.

### Uji RAG melalui API

Urutan pengujian yang benar:

1. PostgreSQL dengan pgvector berjalan.
2. Model embedding tersedia pada provider.
3. API sudah dijalankan sehingga AutoMigrate selesai.
4. Data domain sudah tersedia.
5. Knowledge corpus sudah di-refresh dan memiliki embedding.
6. Session dibuat melalui `POST /api/v1/chat/sessions`.
7. Pesan dikirim melalui `POST /api/v1/chat/sessions/:id/messages` dengan cookie session yang sama.

Jika corpus belum tersedia, request chat mungkin menghasilkan `no_source`, error provider, atau jawaban yang tidak dapat diuji sebagai RAG. Gunakan `go run ./cmd/embed-faq -dry-run` untuk memeriksa jumlah dokumen yang akan di-embed sebelum menjalankan refresh.

### Uji Endpoint dengan Postman CLI

Koleksi kontrak 5 endpoint AI (17 request: alur valid, validasi 400/404/413, semantic search) ada di `docs/29 Oktober 2026/testing/`. Jalankan terhadap API lokal:

```powershell
$t = "docs/29 Oktober 2026/testing"
postman collection run "$t/pasinfo-ai-chat.postman_collection.json" `
  -e "$t/pasinfo-ai-chat.postman_environment.json" `
  --env-var baseUrl=http://localhost:8080/api/v1 `
  --env-var baseUrlNoCookie=http://127.0.0.1:8080/api/v1 `
  --no-report-events
```

`baseUrlNoCookie` memakai host berbeda agar cookie visitor tidak ikut terkirim (uji akses tanpa cookie). Koleksi ini menulis session dan pesan uji ke database yang dituju; gunakan database lokal.

### Uji Alur RAG End-to-End

```powershell
node scripts/e2e-flow-check.js http://localhost:8080/api/v1 pasinfo_travel
```

Skrip mengirim 13 pertanyaan (wisata, kuliner, budaya, acara, wilayah, berita, termasuk pertanyaan lanjutan) dan memeriksa per kasus: respons API, validasi input, sumber retrieval, context ke LLM, grounding jawaban, dan data tersimpan (membaca DB read-only lewat container `pasinfo-legacy-postgres`). Jeda antar request diatur `E2E_PAUSE_MS` (default 4000 ms) karena rate limit 20 request / 60 detik.

Evaluasi kualitas retrieval (53 skenario berlabel):

```powershell
./scripts/jobdesk1-run.ps1 -BatchSize 5 -WindowSeconds 60
node scripts/evaluate-rag-quality.js scripts/jobdesk1-results/jobdesk1-<waktu>-raw.jsonl docs/RETRIEVAL_EVALUATION_LABELS.md
```

Hasilnya recall, precision, dan false positive kritis per skenario. Threshold hanya diubah berdasarkan hasil run ini.

## Pengujian Otomatis

Jalankan test Go:

```powershell
go test ./...
```

Pada mesin dengan RAM terbatas (misalnya saat Ollama aktif), gunakan `go test -p 1 ./...`. Tes integrasi pgvector hanya berjalan bila `PGVECTOR_TEST_DSN` diisi (tabel TEMP, di-rollback).

Jalankan static analysis:

```powershell
go vet ./...
```

Build API:

```powershell
go build ./cmd/api
```

Pengujian race detector, vulnerability scanner, dan regression script tersedia di repository, tetapi memerlukan toolchain, provider, database, atau konfigurasi tambahan sesuai script masing-masing. Jangan menganggap hasil pengujian sebelumnya sebagai hasil run saat ini.

## Endpoint Utama

Semua endpoint menggunakan prefix `/api/v1`.

AI:

- `POST /chat/sessions`
- `GET /chat/sessions/:id/messages`
- `POST /chat/sessions/:id/messages`
- `GET /chat/health`
- `POST /search/semantic` pada environment non-production

Health:

- `GET /health`
- `GET /health/ready` (readiness: ping database ≤ 2 detik → 200 `{"status":"ready"}` / 503 `{"status":"not_ready"}`; `/health` tetap liveness untuk healthcheck container)

Rekomendasi (Sprint 1, tanpa LLM; skor = kemiripan konten 0,5 + lokasi kecamatan/zona 0,25 + kategori 0,15 + sinyal editor 0,10; berita: lokasi diganti kebaruan):

- `GET /wisata/:slug/rekomendasi`, `/kuliner/:slug/rekomendasi`, `/budaya/:slug/rekomendasi`, `/acara/:slug/rekomendasi` — `?limit=1..12` (default 6), `?domain=wisata|kuliner|budaya|acara` untuk lintas domain
- `GET /news/:id/rekomendasi`

GET detail wisata/kuliner/budaya/acara menambah penghitung `views` internal (sinyal popularitas, belum dipakai skor).

Domain publik yang tersedia antara lain wisata, kuliner, budaya, acara, articles, news, wilayah, dan ads. Endpoint lengkap dan middleware-nya adalah sumber kebenaran di `internal/routes/routes.go`.

## Troubleshooting

### API gagal startup karena `JWT_SECRET`

Isi `JWT_SECRET` dengan secret lokal minimal 32 karakter. Jangan gunakan secret production di komputer development. Dengan `APP_ENV=production`, API menolak start bila `JWT_SECRET` masih placeholder `.env.example` (`REPLACE_…`); buat nilai acak dengan `openssl rand -hex 32`.

### PostgreSQL tidak dapat terhubung

Periksa:

```powershell
docker compose ps postgres
docker compose logs postgres
```

Pastikan nilai `.env` sesuai port host Compose. Konfigurasi default Compose memakai port host `5433`, bukan `5432`.

### Provider Ollama tidak terjangkau

Pastikan Ollama berjalan dan model yang dikonfigurasi tersedia. Saat API berjalan langsung dari host gunakan `OLLAMA_BASE_URL=http://localhost:11434`; saat API berjalan di container, gunakan `OLLAMA_BASE_URL=http://host.docker.internal:11434`.

### Semantic search tidak tersedia

Pada `APP_ENV=production`, route `/api/v1/search/semantic` sengaja tidak didaftarkan. Gunakan `APP_ENV=development` untuk pengujian lokal.

### Chat mengembalikan `no_source`

Pastikan corpus knowledge sudah dibuat dan embedding tersedia. Jalankan `go run ./cmd/embed-faq -dry-run`, lalu refresh corpus jika diperlukan.

## Batasan dan Status Pengembangan

- Frontend masih menggunakan mock data dan belum terhubung ke API.
- Production cutover belum dilakukan.
- `Backend/devbackend/` bukan runtime aktif.
- Schema drift yang tercatat pada dokumentasi belum seluruhnya disahkan sebagai kontrak final.
- API contract final belum ditetapkan; endpoint as-built adalah sumber kebenaran.
- Jangan menghapus data event mock, menjalankan seed pada staging/production, atau mengubah schema tanpa instruksi dan verifikasi target yang jelas.

## Keamanan

- Jangan commit `.env`, API key, password, JWT secret, atau credential database.
- Jangan menyalin nilai credential asli ke issue, log, test fixture, atau dokumentasi.
- Gunakan database lokal untuk eksperimen seed dan embedding.
- Validasi environment sebelum menjalankan command yang menulis database.
