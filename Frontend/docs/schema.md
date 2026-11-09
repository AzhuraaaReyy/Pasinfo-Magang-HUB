# DATABASE SCHEMA & DATA MODEL ARCHITECTURE (GOLANG · GORM · POSTGRESQL)

**Project:** Pasuruan Info — News & Travel Tech Platform
**Schema Version:** 2.3 (revisi 2026-10-26 — sinkronisasi teknologi & status backend; 2026-10-28 — sinkronisasi as-built dengan kode dan database, §61.7; MENUNGGU REVIEW OWNER)
**Status:** DESIGN COMPLETE · IMPLEMENTATION IN PROGRESS (staging di backend aktif `Backend/`; `Backend/devbackend` referensi) — deviasi implementasi (drift No. 1–17) belum disahkan (§61.7)
**Current Phase:** FRONTEND COMPLETE (mock data; Owner declared "selesai" 2026-10-16) · BACKEND IN PROGRESS (plan implementasi tertua 2026-10-20; fokus 2026-10-28: AI Travel Assistant; prd.md §72); frontend belum terhubung ke API
**Backend:** Golang (Fiber v2) — IN PROGRESS (v2.2: Laravel 12)
**ORM:** GORM — IN PROGRESS (v2.2: Eloquent)
**Database:** PostgreSQL 16 + pgvector — IN PROGRESS (v2.2: MySQL)
**API:** REST API (`/api/v1`) — IN PROGRESS
**Target Architecture:** Frontend → REST API → Golang (Fiber) → GORM → PostgreSQL

> ⚠ Dokumen ini adalah blueprint arsitektur data. Perubahan struktur data tetap harus dicek
> terhadap `prd.md` dan diperbarui di sini sebelum dianggap kontrak resmi (§69).
> Status implementasi backend: §61.7 dan prd.md §72.

## Catatan Teknologi v2.3

Schema v2.2 ditulis untuk Laravel 12 · Eloquent · MySQL. Mulai v2.3 backend memakai
Golang · GORM · PostgreSQL (arahan mentor; prd.md §72.1). **Aturan data, tabel, kolom, dan
relasi konseptual pada dokumen ini tidak diubah**; yang diperbarui hanya penyebutan
teknologi. Padanan istilah:

| v2.2 (Laravel/MySQL) | v2.3 (Golang/PostgreSQL) |
|---|---|
| Eloquent Model | Model data (struct GORM) |
| Eloquent relationship (`belongsTo`, `hasMany`, `morphMany`, `morphOne`, `morphToMany`) | Relasi GORM; notasi pada dokumen ini dipertahankan sebagai **notasi relasi konseptual** |
| API Resource | Response DTO (struktur respons JSON yang ditentukan eksplisit) |
| Laravel Controller | Handler (Fiber) |
| Laravel migration | Backend aktif `Backend/`: GORM AutoMigrate (semua tabel, termasuk AI) + SQL idempotent (ekstensi `vector`, indeks HNSW). `devbackend`: AutoMigrate + goose (tabel AI) — as-built |
| Seeder / Factory | Command seed Go |
| `LONGTEXT` | `TEXT` |
| `DATETIME` / `TIMESTAMP` | `TIMESTAMPTZ` |
| `TINYINT` | `SMALLINT` (usulan padanan; belum diverifikasi di DB) |
| `ST_Distance_Sphere()` (MySQL) | belum diputuskan — haversine (sudah dipakai frontend dan fallback rute) atau PostGIS (tidak tercatat di plan) |

Blok kode relasi bergaya PHP pada v2.2 dipertahankan sebagai notasi konseptual (fence
`text`), **bukan** kode implementasi. Implementasi Go berada di `internal/models/models.go`.
Tipe kolom pada tabel di dokumen ini adalah padanan PostgreSQL; tipe aktual hasil
GORM AutoMigrate belum dibandingkan kolom per kolom (§61.7).

---

# 1. Document Purpose

Dokumen ini mendefinisikan struktur data, relasi database, migration order, model data (GORM), API data contract, dan aturan data untuk platform **Pasuruan Info — News & Travel Tech**.

Schema ini harus menjadi turunan teknis dari `prd.md`.

Hubungan dokumentasi:

```text
prd.md
  ↓
Feature Requirement
  ↓
schema.md
  ↓
Database Migration
  ↓
Model Data (GORM)
  ↓
Response DTO
  ↓
REST API
  ↓
Frontend
```

`schema.md` tidak boleh membuat fitur baru yang tidak memiliki dasar dari `prd.md`.

Sebaliknya, setiap fitur yang membutuhkan persistence/data structure harus dapat ditelusuri kembali ke schema.

---

# 2. Core Architecture

Arsitektur data utama:

```text
                    ┌───────────────┐
                    │     User      │
                    └───────┬───────┘
                            │
             ┌──────────────┼──────────────┐
             ↓              ↓              ↓
         Bookmark        Review        Trip Plan
                                             │
                                             ↓
                                       Trip Plan Item


                    ┌───────────────┐
                    │     Place     │
                    │   Location    │
                    └───────┬───────┘
                            │
          ┌─────────────────┼──────────────────┐
          ↓                 ↓                  ↓
    Destination         Culinary            Event
          │                 │                  │
          │                 │                  ├── Event Occurrence
          │                 │                  └── Event Ticket
          │                 │
          │                 └── Culinary Menu
          │
          └── Destination Price


                    ┌───────────────┐
                    │     Media     │
                    └───────┬───────┘
                            │
                  polymorphic relation
                            │
          ┌─────────────────┼──────────────────┐
          ↓                 ↓                  ↓
    Destination         Culinary            Culture
                            │                  │
                            └──── Event ───────┘


     Source ───── polymorphic ───── Content

     Verification ── polymorphic ── Content

     Tag ───── polymorphic many-to-many ───── Content

     Content Relation
     Content A ───────────────→ Content B
```

---

# 3. Design Principles

Schema mengikuti prinsip berikut:

1. Tidak membuat tabel untuk fitur yang sebenarnya dapat dihitung secara dinamis.
2. Tidak menyimpan data turunan yang dapat dihitung dari data utama.
3. Location disentralisasi melalui `places`.
4. Domain content tetap memiliki foreign key `place_id` masing-masing.
5. `place_id` tidak dibuat unique pada domain content.
6. Relasi `Place → Content` tidak diperlakukan sebagai `hasOne`.
7. Nearby dihitung berdasarkan koordinat.
8. Similar/recommendation berbasis metadata atau editorial relation.
9. Source dan Verification dipisahkan.
10. Publication status dipisahkan secara konsep dari operational status.
11. Ticket information tidak sama dengan booking/payment.
12. Gallery menggunakan `media`, bukan tabel gallery terpisah.
13. Response DTO harus mengekspos data yang memang dibutuhkan frontend.
14. Advanced/future features tidak boleh memaksa implementasi penuh pada current stage.
15. Mock data harus mengikuti bentuk data yang nantinya dikonsumsi API.

---

# 4. Database Tables

## 4.1 Core Tables

| Table                | Purpose                          |
| -------------------- | -------------------------------- |
| `users`              | User account                     |
| `places`             | Physical location                |
| `destinations`       | Wisata                           |
| `culinaries`         | Kuliner                          |
| `cultures`           | Budaya                           |
| `events`             | Acara                            |
| `news`               | Berita (as-built; §18)           |
| `categories`         | Kategori berita (as-built; §19)  |
| `destination_prices` | Informasi harga/tiket wisata     |
| `culinary_menus`     | Menu dan harga kuliner           |
| `event_occurrences`  | Jadwal pelaksanaan event         |
| `event_tickets`      | Informasi tiket/registrasi event |
| `media`              | Foto/video                       |
| `opening_hours`      | Jam operasional                  |
| `sources`            | Sumber informasi                 |
| `sourceables`        | Relasi source dengan content     |
| `verifications`      | Status verifikasi                |
| `tags`               | Metadata/tag                     |
| `taggables`          | Relasi tag                       |
| `reviews`            | Review user                      |
| `bookmarks`          | Bookmark user                    |
| `trip_plans`         | Rencana perjalanan               |
| `trip_plan_items`    | Item dalam trip plan             |
| `event_reminders`    | Reminder event                   |
| `content_relations`  | Relasi editorial antar-content   |
| `advertisements`     | Iklan                            |

---

# 5. Users

## Table: `users`

Purpose:

* authentication
* review
* bookmark
* trip plan
* event reminder
* contribution jika fitur tersebut diaktifkan

### Columns

| Column              | Type      | Rule                |
| ------------------- | --------- | ------------------- |
| `id`                | BIGINT    | PK                  |
| `name`              | VARCHAR   | required            |
| `email`             | VARCHAR   | unique              |
| `password`          | VARCHAR   | nullable jika OAuth |
| `email_verified_at` | TIMESTAMPTZ | nullable            |
| `remember_token`    | VARCHAR   | nullable            |
| `created_at`        | TIMESTAMPTZ |                     |
| `updated_at`        | TIMESTAMPTZ |                     |

Authentication detail bukan bagian dari schema travel content.

---

# 6. Places

## Table: `places`

`places` menjadi sumber utama informasi lokasi fisik.

Location tidak diulang pada setiap domain content.

### Columns

| Column        | Type          | Rule                              |
| ------------- | ------------- | --------------------------------- |
| `id`          | BIGINT        | PK                                |
| `name`        | VARCHAR       | required                          |
| `address`     | TEXT          | nullable                          |
| `village`     | VARCHAR       | nullable                          |
| `district`    | VARCHAR       | nullable                          |
| `regency`     | VARCHAR       | default Pasuruan jika sesuai data |
| `province`    | VARCHAR       |                                   |
| `postal_code` | VARCHAR       | nullable                          |
| `latitude`    | DECIMAL(10,7) | nullable                          |
| `longitude`   | DECIMAL(10,7) | nullable                          |
| `map_url`     | TEXT          | nullable                          |
| `created_at`  | TIMESTAMPTZ     |                                   |
| `updated_at`  | TIMESTAMPTZ     |                                   |

### Coordinate Contract

```text
latitude  = Y
longitude = X
```

Jika digunakan sebagai spatial point:

```text
POINT(longitude, latitude)
```

Jangan menukar latitude dan longitude.

---

# 7. Place Relationship Rule

Ini merupakan perubahan penting dari schema sebelumnya.

## Jangan menggunakan:

```text
Place -> hasOne(Destination::class)
Place -> hasOne(Culinary::class)
Place -> hasOne(Culture::class)
```

dan jangan membuat:

```text
UNIQUE(place_id)
```

pada setiap domain hanya karena satu content memiliki satu lokasi.

Hal tersebut terlalu ketat.

## Relationship yang digunakan:

### Destination

```text
public function place()
{
    return $this->belongsTo(Place::class);
}
```

### Culinary

```text
public function place()
{
    return $this->belongsTo(Place::class);
}
```

### Culture

```text
public function place()
{
    return $this->belongsTo(Place::class);
}
```

### Event

```text
public function place()
{
    return $this->belongsTo(Place::class);
}
```

Pada sisi `Place`, relasi boleh menggunakan:

```text
public function destinations()
{
    return $this->hasMany(Destination::class);
}

public function culinaries()
{
    return $this->hasMany(Culinary::class);
}

public function cultures()
{
    return $this->hasMany(Culture::class);
}

public function events()
{
    return $this->hasMany(Event::class);
}
```

Tidak ada unique constraint yang memaksa satu `Place` hanya boleh dimiliki satu content.

### Alasan

Satu lokasi dapat secara realistis memiliki:

```text
Place
 ├── Destination
 ├── Culinary
 ├── Event
 └── Culture
```

Contoh konseptual:

```text
Kawasan wisata
 ├── Destination: lokasi wisata
 ├── Culinary: warung/restoran
 ├── Culture: situs budaya
 └── Event: acara yang berlangsung di lokasi tersebut
```

Namun setiap content tetap hanya memiliki satu `place_id`.

---

# 8. Nearby, Location & Proximity

Nearby **tidak disimpan sebagai tabel**.

Nearby dihitung berdasarkan:

```text
current content
      ↓
place_id
      ↓
latitude + longitude
      ↓
distance calculation
      ↓
radius filter
      ↓
nearest-first
```

Contoh:

```text
Destination A
    ↓
Place A
    ↓
coordinates
    ↓
find Culinary/Event/Culture/Destination
within radius
```

Dengan PostgreSQL (v2.2: MySQL `ST_Distance_Sphere()`), metode perhitungan jarak
**belum diputuskan**. Laporan Analisis Kebutuhan Backend §4.5 mengusulkan PostGIS atau
rumus haversine. Plan hanya mencatat ekstensi `pgvector`; PostGIS tidak tercatat.
Haversine sudah dipakai pada frontend (Explore Around) dan pada fallback endpoint rute
backend (`haversineM`). Endpoint nearby backend **belum** diimplementasikan.

Distance dikembalikan dalam meter.

### Nearby Rules

1. Gunakan koordinat dari `places`.
2. Jangan membuat `nearby_destinations` table.
3. Jangan menyimpan jarak secara permanen.
4. Exclude current content.
5. Filter berdasarkan radius.
6. Sort berdasarkan jarak ascending.
7. Batasi jumlah hasil.

Contoh:

```text
radius = 5 km

Destination A
    ↓
Nearby:
    1. Culinary B — 0.8 km
    2. Culture C   — 1.4 km
    3. Event D     — 2.1 km
```

Radius sebaiknya disimpan sebagai configuration, bukan sebagai data destination.

Contoh:

```text
konfigurasi backend (usulan: variabel environment NEARBY_RADIUS_KM — Laporan §5.4) — v2.2: config/travel.php
```

---

# 8.1 Frontend Location Calculations

Frontend menggunakan koordinat dari `places` untuk menghitung field yang ditampilkan pada detail page:

## Frontend-Calculated Fields

| Field              | Source           | Calculation                                          |
| ------------------ | ---------------- | ---------------------------------------------------- |
| `distance_km`      | Geolocation API  | Haversine distance: user location → destination     |
| `estimated_time`   | `distance_km`    | `distance_km / 30` (km/h average speed)             |
| `user_location`    | Geolocation API  | Browser Geolocation coordinates only (not persisted) |

## Backend Requirements

API must expose:

```json
{
  "place": {
    "name": "...",
    "address": "...",
    "latitude": -7.1234567,
    "longitude": 112.1234567
  }
}
```

Frontend akan:

1. Memanggil Geolocation API untuk user coordinates
2. Menggunakan haversine formula untuk menghitung jarak
3. Membagi jarak dengan 30 km/h untuk estimasi waktu
4. Menampilkan hasil pada detail page

## Data NOT Persisted

User location (dari Geolocation API) tidak disimpan ke database.

Distance dan estimated time dihitung secara real-time, tidak disimpan.

---

# 9. Nearby vs Similar

Kedua konsep ini harus tetap dipisahkan.

## Nearby

Berdasarkan:

```text
latitude
longitude
distance
radius
```

## Similar

Berdasarkan:

```text
category
type
tags
editorial relation
content relevance
```

Contoh:

```text
Nearby:
"Tempat A berjarak 800 meter"

Similar:
"Tempat A memiliki tipe wisata alam yang mirip"
```

Jangan menggunakan `content_relations` untuk menyimpan seluruh hasil nearby.

---

# 10. Destinations

## Table: `destinations`

### Columns

| Column               | Type         | Rule               |
| -------------------- | ------------ | ------------------ |
| `id`                 | BIGINT       | PK                 |
| `place_id`           | BIGINT       | FK → places.id     |
| `name`               | VARCHAR      | required           |
| `slug`               | VARCHAR      | unique             |
| `short_description`  | TEXT         | nullable           |
| `description`        | TEXT     | nullable           |
| `destination_type`   | VARCHAR      | nullable           |
| `status`             | VARCHAR/ENUM | publication status |
| `operational_status` | VARCHAR/ENUM | nullable           |
| `website_url`        | TEXT         | nullable           |
| `contact_phone`      | VARCHAR      | nullable           |
| `featured`           | BOOLEAN      | default false      |
| `published_at`       | TIMESTAMPTZ    | nullable           |
| `created_at`         | TIMESTAMPTZ    |                    |
| `updated_at`         | TIMESTAMPTZ    |                    |

### Important

`status` dan `operational_status` memiliki fungsi berbeda.

```text
status
→ draft / published / archived

operational_status
→ open / closed / temporarily_closed / unknown
```

Jika status operasional dapat dihitung dari opening hours, nilai `operational_status` tidak harus digunakan.

Jangan menggunakan satu field `status` untuk dua konsep berbeda.

---

# 11. Destination Prices

## Table: `destination_prices`

Table ini memiliki model data khusus:

```text
struct GORM DestinationPrice — internal/models/models.go (as-built devbackend)
v2.2: app/Models/DestinationPrice.php
```

### Columns

| Column           | Type          | Rule                 |
| ---------------- | ------------- | -------------------- |
| `id`             | BIGINT        | PK                   |
| `destination_id` | BIGINT        | FK → destinations.id |
| `name`           | VARCHAR       | required             |
| `price`          | DECIMAL(12,2) | nullable             |
| `min_price`      | DECIMAL(12,2) | nullable             |
| `max_price`      | DECIMAL(12,2) | nullable             |
| `description`    | TEXT          | nullable             |
| `external_url`   | TEXT          | nullable             |
| `created_at`     | TIMESTAMPTZ     |                      |
| `updated_at`     | TIMESTAMPTZ     |                      |

### Relationship

Destination:

```text
public function prices()
{
    return $this->hasMany(DestinationPrice::class);
}
```

DestinationPrice:

```text
public function destination()
{
    return $this->belongsTo(Destination::class);
}
```

### Rule

Gunakan `destination_prices` untuk:

```text
Tiket masuk
Parkir
Wahana
Kategori tiket
Harga anak
Harga dewasa
Harga khusus
```

Tidak digunakan untuk internal payment.

---

# 12. Culinaries

## Table: `culinaries`

### Columns

| Column               | Type         | Rule               |
| -------------------- | ------------ | ------------------ |
| `id`                 | BIGINT       | PK                 |
| `place_id`           | BIGINT       | FK                 |
| `name`               | VARCHAR      | required           |
| `slug`               | VARCHAR      | unique             |
| `short_description`  | TEXT         | nullable           |
| `description`        | TEXT     | nullable           |
| `culinary_type`      | VARCHAR      | nullable           |
| `price_range`        | VARCHAR      | nullable           |
| `status`             | VARCHAR/ENUM | publication status |
| `operational_status` | VARCHAR/ENUM | nullable           |
| `featured`           | BOOLEAN      | default false      |
| `website_url`        | TEXT         | nullable           |
| `contact_phone`      | VARCHAR      | nullable           |
| `published_at`       | TIMESTAMPTZ    | nullable           |
| `created_at`         | TIMESTAMPTZ    |                    |
| `updated_at`         | TIMESTAMPTZ    |                    |

### Relationship

```text
public function place()
{
    return $this->belongsTo(Place::class);
}

public function menus()
{
    return $this->hasMany(CulinaryMenu::class);
}
```

---

# 13. Culinary Menus

## Table: `culinary_menus`

### Columns

| Column           | Type          | Rule          |
| ---------------- | ------------- | ------------- |
| `id`             | BIGINT        | PK            |
| `culinary_id`    | BIGINT        | FK            |
| `name`           | VARCHAR       | required      |
| `category`       | VARCHAR       | nullable      |
| `description`    | TEXT          | nullable      |
| `price`          | DECIMAL(12,2) | nullable      |
| `image_media_id` | BIGINT        | nullable      |
| `is_featured`    | BOOLEAN       | default false |
| `sort_order`     | INT           | default 0     |
| `created_at`     | TIMESTAMPTZ     |               |
| `updated_at`     | TIMESTAMPTZ     |               |

### Category Rule

`category` mengelompokkan menu untuk kebutuhan filter UI. Nilai yang
disepakati pada fase frontend (mock data): `Makanan`, `Minuman`, `Cemilan`.
Selaras dengan tombol filter pada `menu_kuliner.html`.

### Relationship

```text
public function culinary()
{
    return $this->belongsTo(Culinary::class);
}

public function image()
{
    return $this->belongsTo(Media::class, 'image_media_id');
}
```

---

# 14. Cultures

## Table: `cultures`

Culture memiliki `place_id` nullable.

Alasannya:

Tidak semua budaya/tradisi memiliki satu lokasi fisik permanen.

### Columns

| Column              | Type         | Rule               |
| ------------------- | ------------ | ------------------ |
| `id`                | BIGINT       | PK                 |
| `place_id`          | BIGINT       | nullable FK        |
| `name`              | VARCHAR      | required           |
| `slug`              | VARCHAR      | unique             |
| `short_description` | TEXT         | nullable           |
| `description`       | TEXT     | nullable           |
| `culture_type`      | VARCHAR      | nullable           |
| `historical_period` | VARCHAR      | nullable           |
| `status`            | VARCHAR/ENUM | publication status |
| `featured`          | BOOLEAN      | default false      |
| `published_at`      | TIMESTAMPTZ    | nullable           |
| `created_at`        | TIMESTAMPTZ    |                    |
| `updated_at`        | TIMESTAMPTZ    |                    |

### Relationship

```text
public function place()
{
    return $this->belongsTo(Place::class);
}
```

Jika `place_id = null`, content tetap valid.

---

# 15. Events

## Table: `events`

### Columns

| Column              | Type         | Rule               |
| ------------------- | ------------ | ------------------ |
| `id`                | BIGINT       | PK                 |
| `place_id`          | BIGINT       | nullable FK        |
| `name`              | VARCHAR      | required           |
| `slug`              | VARCHAR      | unique             |
| `short_description` | TEXT         | nullable           |
| `description`       | TEXT     | nullable           |
| `event_type`        | VARCHAR      | nullable           |
| `status`            | VARCHAR/ENUM | publication status |
| `organizer_name`    | VARCHAR      | nullable           |
| `organizer_phone`   | VARCHAR      | nullable           |
| `website_url`       | TEXT         | nullable           |
| `featured`          | BOOLEAN      | default false      |
| `capacity`          | INTEGER      | nullable           |
| `published_at`      | TIMESTAMPTZ    | nullable           |
| `created_at`        | TIMESTAMPTZ    |                    |
| `updated_at`        | TIMESTAMPTZ    |                    |

### Relationship

```text
public function place()
{
    return $this->belongsTo(Place::class);
}

public function occurrences()
{
    return $this->hasMany(EventOccurrence::class);
}

public function tickets()
{
    return $this->hasMany(EventTicket::class);
}
```

### Kuota Peserta (kontrak data — ditambahkan atas instruksi Owner 2026-10-18)

`events.capacity` = batas kuota peserta event (INTEGER nullable; `NULL` = tanpa
batas / "Tanpa Batas"). Frontend mock (`data-acara.js`) sudah memakai field ini
dan menampilkannya pada kolom "Kuota Peserta" di detail acara serta kartu
"Event Lain dari Penyelenggara" dan "Rekomendasi Event" (`detail-acara.js`).

Pemetaan frontend → backend:

| Field frontend (mock) | Sumber backend |
| --------------------- | -------------- |
| `capacity` ("N peserta" / "Tanpa Batas") | `events.capacity` (INT nullable) |

Catatan: "kuota tersedia" / "kuota terisi" BELUM dipetakan — bila nanti
dibutuhkan, hitung dari jumlah registrasi (mis. tabel registrations) atau
tambahkan kolom terpisah. Ticket ≠ booking/payment tetap berlaku (§17).

---

# 16. Event Occurrences

## Table: `event_occurrences`

Digunakan untuk calendar dan event yang memiliki lebih dari satu jadwal.

### Columns

| Column       | Type         | Rule     |
| ------------ | ------------ | -------- |
| `id`         | BIGINT       | PK       |
| `event_id`   | BIGINT       | FK       |
| `starts_at`  | TIMESTAMPTZ     | required |
| `ends_at`    | TIMESTAMPTZ     | nullable |
| `status`     | VARCHAR/ENUM | nullable |
| `notes`      | TEXT         | nullable |
| `created_at` | TIMESTAMPTZ    |          |
| `updated_at` | TIMESTAMPTZ    |          |

### Relationship

```text
public function event()
{
    return $this->belongsTo(Event::class);
}
```

### Example

```text
Event:
Festival Budaya Pasuruan

Occurrences:
2026-10-10 09:00
2026-10-11 09:00
2026-10-12 09:00
```

Hal ini lebih fleksibel daripada menyimpan satu tanggal langsung pada `events`.

### Widget Kalender Agenda (frontend Budaya — kontrak data, ditambahkan Owner 2026-10-18)

Widget "Kalender Agenda Pasuruan" pada halaman agenda budaya menampilkan
event ber-tanggal dari `events` + `event_occurrences`. Pemetaan field frontend
→ backend:

| Field widget frontend | Sumber backend |
| --------------------- | -------------- |
| `title`                | `events.name` |
| `day_label`, `month_label`, jam ("10:00–12:00 WIB") | `event_occurrences.starts_at` dialamat: tanggal → hari/bulan, jam → `DATE_FORMAT` |
| `date_label`           | gabungan tanggal + jam occurrence (label UI) |
| `location`             | `events.place_id` → `places` (`name`) |
| `organizer`            | `events.organizer_name` |
| `ticket_info`          | `event_tickets` (tipe/keterangan/registrar) |
| `url`                  | `events.website_url` |
| `status` (`akan-datang` / `berlangsung` / `selesai`) | dihitung dari `starts_at`/`ends_at` vs waktu server; simpan juga pada `event_occurrences.status` bila ingin override |
| kalender per bulan     | grup kasar dari `starts_at` (bulan + tahun) |

Filter kategori chip pada daftar agenda: memakai `events.event_type`
(tradisi / kesenian / situs-sejarah / dll.) — frontend saat ini menyimpulkan
dari kata kunci judul karena dataset mock tidak membawa `event_type`.
`events.culture_id` untuk menautkan agenda pada budaya tertentu Belum
di-dokumentasikan pada tabel `events` di atas (frontend mock memakai
`cultureId` untuk foto & tautan detail) — relasi tambahan ini menunggu
keputusan backend (PENDING) dan Belum jadi kontrak resmi tabel.

---

# 17. Event Tickets & Registration

## Table: `event_tickets`

Digunakan untuk informasi tiket/registrasi.

### Columns

| Column             | Type          | Rule         |
| ------------------ | ------------- | ------------ |
| `id`               | BIGINT        | PK           |
| `event_id`         | BIGINT        | FK           |
| `name`             | VARCHAR       | required     |
| `price`            | DECIMAL(12,2) | nullable     |
| `description`      | TEXT          | nullable     |
| `ticket_url`       | TEXT          | nullable     |
| `registration_url` | TEXT          | nullable     |
| `available`        | BOOLEAN       | default true |
| `created_at`       | TIMESTAMPTZ     |              |
| `updated_at`       | TIMESTAMPTZ     |              |

### Important Scope Rule

Current schema:

```text
Informasi tiket
+
External ticket URL
+
External registration URL
```

Bukan:

```text
Payment
Booking Engine
Order
Transaction
Payment Gateway
```

Booking dan payment tetap future feature.

---

# 18. Articles

> **As-built (Owner 2026-11-09): tabel `articles` tidak dipakai dan sudah dihapus.** Berita disimpan di tabel
> `news` (kolom utama: `title`, `slug`, `excerpt`, `content`, `category_id` → `categories.id`, `status`, `published_at`,
> `views`, `source`, `source_url` unik, `author_id`, wilayah `province_id`…`village_id`) dan dilayani route `/news`. Route
> `/articles` dan `/article-categories`, model, dan tabelnya dihapus; backend men-drop tabel yang masih kosong saat
> start. Kontrak di bawah adalah rancangan awal dan tidak berlaku untuk backend aktif. Lihat §61.7 DRIFT No. 13.

## Table: `articles`

### Columns

| Column         | Type         | Rule                       |
| -------------- | ------------ | -------------------------- |
| `id`           | BIGINT       | PK                         |
| `author_id`    | BIGINT       | FK → users.id              |
| `category_id`  | BIGINT       | FK → article_categories.id |
| `title`        | VARCHAR      | required                   |
| `slug`         | VARCHAR      | unique                     |
| `excerpt`      | TEXT         | nullable                   |
| `content`      | TEXT     | required                   |
| `status`       | VARCHAR/ENUM | publication status         |
| `featured`     | BOOLEAN      | default false              |
| `published_at` | TIMESTAMPTZ    | nullable                   |
| `created_at`   | TIMESTAMPTZ    |                            |
| `updated_at`   | TIMESTAMPTZ    |                            |

### Category Rule

`category_id` adalah **primary category**.

Current scope tidak membutuhkan many-to-many article categories.

Jika di masa depan satu artikel wajib memiliki banyak kategori, schema dapat diubah menjadi pivot.

Untuk current implementation:

```text
Article
   ↓
one primary category
```

---

# 19. Article Categories

> **As-built (Owner 2026-11-09): tabel `article_categories` tidak dipakai dan sudah dihapus.** Kategori berita disimpan
> di tabel `categories` (`name` unik, `slug` unik). Lihat §18 dan §61.7 DRIFT No. 13.

## Table: `article_categories`

### Columns

| Column       | Type           |
| ------------ | -------------- |
| `id`         | BIGINT         |
| `name`       | VARCHAR        |
| `slug`       | VARCHAR UNIQUE |
| `created_at` | TIMESTAMPTZ      |
| `updated_at` | TIMESTAMPTZ      |

Contoh:

```text
Lokal
Nasional
Internasional
Inspiratif
Politik
Olahraga
Ekonomi
```

Kategori berita tidak dicampur dengan domain:

```text
Wisata
Kuliner
Budaya
Acara
```

Karena keduanya memiliki fungsi berbeda dalam information architecture.

---

# 20. Media

## Table: `media`

Media bersifat polymorphic.

### Columns

| Column          | Type         | Rule          |
| --------------- | ------------ | ------------- |
| `id`            | BIGINT       | PK            |
| `mediable_type` | VARCHAR      | required      |
| `mediable_id`   | BIGINT       | required      |
| `type`          | VARCHAR/ENUM | image/video   |
| `url`           | TEXT         | required      |
| `thumbnail_url` | TEXT         | nullable      |
| `alt_text`      | TEXT         | nullable      |
| `caption`       | TEXT         | nullable      |
| `sort_order`    | INT          | default 0     |
| `is_featured`   | BOOLEAN      | default false |
| `created_at`    | TIMESTAMPTZ    |               |
| `updated_at`    | TIMESTAMPTZ    |               |

### Supported Content

```text
Destination
Culinary
Culture
Event
Article
```

### Relationship

Content:

```text
public function media()
{
    return $this->morphMany(Media::class, 'mediable');
}
```

Media:

```text
public function mediable()
{
    return $this->morphTo();
}
```

---

# 21. Gallery Rule

Tidak dibuat:

```text
galleries
gallery_items
```

Karena gallery cukup direpresentasikan oleh:

```text
media
+
sort_order
+
is_featured
```

Contoh:

```text
Destination
 ├── Media 1
 ├── Media 2
 ├── Media 3
 └── Media 4
```

Frontend dapat mengubah kumpulan media tersebut menjadi gallery.

---

# 22. Opening Hours

## Table: `opening_hours`

Polymorphic relationship.

### Columns

| Column          | Type      |
| --------------- | --------- |
| `id`            | BIGINT    |
| `openable_type` | VARCHAR   |
| `openable_id`   | BIGINT    |
| `day_of_week`   | SMALLINT   |
| `opens_at`      | TIME      |
| `closes_at`     | TIME      |
| `is_closed`     | BOOLEAN   |
| `is_24_hours`   | BOOLEAN   |
| `sort_order`    | INT       |
| `created_at`    | TIMESTAMPTZ |
| `updated_at`    | TIMESTAMPTZ |

### Supported

```text
Destination
Culinary
```

Dapat diperluas jika domain lain membutuhkan jam operasional.

### Split Hours

Dapat mendukung:

```text
10:00–14:00
17:00–22:00
```

dengan lebih dari satu row pada hari yang sama.

---

# 23. Operational Status

Operational status tidak boleh disamakan dengan publication status.

### Publication Status

Contoh:

```text
draft
published
archived
```

### Operational Status

Contoh:

```text
open
closed
temporarily_closed
unknown
```

Namun:

```text
open / closed
```

sebisa mungkin dihitung dari:

```text
opening_hours
+
current datetime
```

bukan disimpan sebagai data statis jika tidak diperlukan.

`temporarily_closed` dapat digunakan ketika ada kondisi editorial khusus.

---

# 24. Sources

## Table: `sources`

### Columns

| Column        | Type      |
| ------------- | --------- |
| `id`          | BIGINT    |
| `name`        | VARCHAR   |
| `url`         | TEXT      |
| `source_type` | VARCHAR   |
| `description` | TEXT      |
| `created_at`  | TIMESTAMPTZ |
| `updated_at`  | TIMESTAMPTZ |

Contoh source:

```text
Website resmi
Dinas terkait
Pengelola destinasi
Media partner
Sumber komunitas
```

---

# 25. Sourceables

## Table: `sourceables`

Polymorphic many-to-many style relation.

### Columns

| Column            | Type      |
| ----------------- | --------- |
| `id`              | BIGINT    |
| `source_id`       | BIGINT    |
| `sourceable_type` | VARCHAR   |
| `sourceable_id`   | BIGINT    |
| `created_at`      | TIMESTAMPTZ |
| `updated_at`      | TIMESTAMPTZ |

Unique:

```text
source_id
sourceable_type
sourceable_id
```

### Supported

```text
Destination
Culinary
Culture
Event
Article
```

---

# 26. Verifications

## Table: `verifications`

Digunakan untuk status verifikasi content.

### Columns

| Column            | Type               |
| ----------------- | ------------------ |
| `id`              | BIGINT             |
| `verifiable_type` | VARCHAR            |
| `verifiable_id`   | BIGINT             |
| `status`          | VARCHAR/ENUM       |
| `verified_by`     | BIGINT nullable    |
| `verified_at`     | TIMESTAMPTZ nullable |
| `notes`           | TEXT nullable      |
| `created_at`      | TIMESTAMPTZ          |
| `updated_at`      | TIMESTAMPTZ          |

### Verification Status

Contoh:

```text
pending
verified
rejected
expired
```

### Current Relationship

Untuk current scope:

```text
public function verification()
{
    return $this->morphOne(Verification::class, 'verifiable');
}
```

Jika di masa depan membutuhkan history/audit:

```text
morphMany()
```

dapat digunakan.

Current schema tidak membutuhkan verification history.

---

# 27. Source + Verification Data Flow

Ini merupakan bagian yang **wajib dikunci** agar data tidak berhenti hanya di database.

Architecture:

```text
Database
   ↓
Model Data (GORM)
   ↓
Relationship
   ↓
Response DTO
   ↓
REST API
   ↓
Frontend
```

Contoh notasi relasi (konseptual):

```text
public function sources()
{
    return $this->morphToMany(
        Source::class,
        'sourceable'
    );
}

public function verification()
{
    return $this->morphOne(
        Verification::class,
        'verifiable'
    );
}
```

Response DTO harus mengekspos informasi yang relevan.

Contoh contract:

```json
{
  "id": 1,
  "name": "Bromo Tengger Semeru",
  "source": {
    "name": "Sumber Resmi",
    "url": "https://example.com"
  },
  "verification": {
    "status": "verified",
    "verified_at": "2026-10-01T10:00:00Z"
  }
}
```

Frontend kemudian dapat menampilkan:

```text
Sumber:
Sumber Resmi

Status:
✓ Terverifikasi

Diverifikasi:
1 Oktober 2026
```

### Mandatory Rule

Untuk content yang mendukung source dan verification:

```text
Schema
   ↓
relasi model (GORM)
   ↓
Response DTO
   ↓
Frontend UI
```

Tidak boleh berhenti hanya pada:

```text
Database → Model GORM
```

---

# 28. Response DTO Contract

Response DTO bertanggung jawab menentukan data yang dikirim ke frontend.

Jangan mengandalkan:

```text
serialisasi langsung struct model GORM ke JSON
(v2.2: $model->toArray())
```

sebagai kontrak API utama untuk seluruh aplikasi.

Gunakan Response DTO untuk struktur response yang stabil.

Contoh:

```text
DestinationResource
CulinaryResource
CultureResource
EventResource
ArticleResource
```

Contoh struktur Destination:

```json
{
  "id": 1,
  "name": "...",
  "slug": "...",
  "description": "...",
  "status": "published",
  "featured": true,

  "place": {
    "name": "...",
    "address": "...",
    "latitude": -7.1234567,
    "longitude": 112.1234567,
    "map_url": "..."
  },

  "media": [],

  "opening_hours": [],

  "prices": [],

  "sources": [],

  "verification": {
    "status": "verified",
    "verified_at": "..."
  }
}
```

---

# 29. Tags

## Table: `tags`

### Columns

| Column       | Type           |
| ------------ | -------------- |
| `id`         | BIGINT         |
| `name`       | VARCHAR        |
| `slug`       | VARCHAR UNIQUE |
| `created_at` | TIMESTAMPTZ      |
| `updated_at` | TIMESTAMPTZ      |

---

# 30. Taggables

## Table: `taggables`

### Columns

| Column          | Type    |
| --------------- | ------- |
| `tag_id`        | BIGINT  |
| `taggable_type` | VARCHAR |
| `taggable_id`   | BIGINT  |

Unique:

```text
tag_id
taggable_type
taggable_id
```

### Supported Content

```text
Destination
Culinary
Culture
Event
Article
```

Tags dapat digunakan untuk:

```text
Kuliner khas Pasuruan
Wisata alam
Wisata keluarga
Budaya tradisional
Sejarah
Event tahunan
```

Tidak perlu membuat tabel khusus untuk setiap jenis metadata tersebut.

---

# 31. Reviews

## Table: `reviews`

### Columns

| Column            | Type             |
| ----------------- | ---------------- |
| `id`              | BIGINT           |
| `user_id`         | BIGINT           |
| `reviewable_type` | VARCHAR          |
| `reviewable_id`   | BIGINT           |
| `rating`          | SMALLINT          |
| `title`           | VARCHAR nullable |
| `body`            | TEXT             |
| `status`          | VARCHAR/ENUM     |
| `created_at`      | TIMESTAMPTZ        |
| `updated_at`      | TIMESTAMPTZ        |

Rating:

```text
1–5
```

### Relationship

```text
public function reviewable()
{
    return $this->morphTo();
}
```

Review bersifat advanced feature.

---

# 32. Bookmarks

## Table: `bookmarks`

### Columns

| Column              | Type      |
| ------------------- | --------- |
| `id`                | BIGINT    |
| `user_id`           | BIGINT    |
| `bookmarkable_type` | VARCHAR   |
| `bookmarkable_id`   | BIGINT    |
| `created_at`        | TIMESTAMPTZ |
| `updated_at`        | TIMESTAMPTZ |

Unique:

```text
user_id
bookmarkable_type
bookmarkable_id
```

---

# 33. Trip Plans

## Table: `trip_plans`

### Columns

| Column        | Type          |
| ------------- | ------------- |
| `id`          | BIGINT        |
| `user_id`     | BIGINT        |
| `name`        | VARCHAR       |
| `description` | TEXT nullable |
| `start_date`  | DATE nullable |
| `end_date`    | DATE nullable |
| `status`      | VARCHAR/ENUM  |
| `created_at`  | TIMESTAMPTZ     |
| `updated_at`  | TIMESTAMPTZ     |

Trip Plan merupakan advanced feature.

---

# 34. Trip Plan Items

## Table: `trip_plan_items`

Polymorphic item.

### Columns

| Column          | Type          |
| --------------- | ------------- |
| `id`            | BIGINT        |
| `trip_plan_id`  | BIGINT        |
| `itemable_type` | VARCHAR       |
| `itemable_id`   | BIGINT        |
| `planned_date`  | DATE nullable |
| `sort_order`    | INT           |
| `notes`         | TEXT nullable |
| `created_at`    | TIMESTAMPTZ     |
| `updated_at`    | TIMESTAMPTZ     |

Contoh:

```text
Trip Plan
 ├── Destination
 ├── Culinary
 ├── Culture
 └── Event
```

---

# 35. Event Reminders

## Table: `event_reminders`

### Columns

| Column                | Type         |
| --------------------- | ------------ |
| `id`                  | BIGINT       |
| `user_id`             | BIGINT       |
| `event_occurrence_id` | BIGINT       |
| `remind_at`           | TIMESTAMPTZ     |
| `status`              | VARCHAR/ENUM |
| `created_at`          | TIMESTAMPTZ    |
| `updated_at`          | TIMESTAMPTZ    |

Unique:

```text
user_id
event_occurrence_id
```

Reminder menggunakan `event_occurrences`, bukan hanya `events`, karena satu event dapat memiliki beberapa jadwal.

---

# 36. Content Relations

## Table: `content_relations`

Digunakan untuk hubungan editorial eksplisit.

### Columns

| Column          | Type      |
| --------------- | --------- |
| `id`            | BIGINT    |
| `source_type`   | VARCHAR   |
| `source_id`     | BIGINT    |
| `target_type`   | VARCHAR   |
| `target_id`     | BIGINT    |
| `relation_type` | VARCHAR   |
| `sort_order`    | INT       |
| `created_at`    | TIMESTAMPTZ |
| `updated_at`    | TIMESTAMPTZ |

Contoh:

```text
Destination A
   ↓
related_culinary
   ↓
Culinary B
```

atau:

```text
Event A
   ↓
related_destination
   ↓
Destination B
```

### Important

`content_relations` bukan untuk:

```text
nearby
distance
routing
weather
```

Nearby dihitung berdasarkan location.

---

# 37. Advertisements

## Table: `advertisements`

### Columns

| Column       | Type              |
| ------------ | ----------------- |
| `id`         | BIGINT            |
| `name`       | VARCHAR           |
| `image_url`  | TEXT              |
| `target_url` | TEXT              |
| `placement`  | VARCHAR           |
| `status`     | VARCHAR/ENUM      |
| `starts_at`  | TIMESTAMPTZ nullable |
| `ends_at`    | TIMESTAMPTZ nullable |
| `created_at` | TIMESTAMPTZ         |
| `updated_at` | TIMESTAMPTZ         |

Placement dapat berupa:

```text
homepage_hero
homepage_news
homepage_entertainment
content_inline
footer
```

Tidak perlu membuat tabel advertisement berbeda untuk setiap placement.

---

# 38. User Contribution

User Contribution merupakan advanced feature.

Current schema tidak langsung membuat CMS atau sistem user-generated-content penuh.

Contribution harus didefinisikan lebih dahulu sebagai workflow.

Jika contribution berarti:

```text
user mengirim usulan informasi
```

maka implementasi dapat ditambahkan kemudian menggunakan tabel khusus:

```text
contributions
```

Namun tabel tersebut **tidak diwajibkan pada current core schema** sampai workflow contribution benar-benar ditetapkan dalam PRD.

Current schema sudah mendukung:

```text
Review
Bookmark
Trip Plan
Reminder
```

sehingga tidak boleh menganggap semua interaksi user sebagai `contribution`.

### Rule

Jangan membuat `contributions` table hanya untuk mengisi schema jika belum ada workflow yang jelas.

---

# 39. Weather

Weather bukan tabel permanent content.

Data weather berasal dari external weather service.

Architecture:

```text
Frontend
   ↓
Backend API (Golang)
   ↓
Weather Service
   ↓
External Weather API
```

Jangan membuat:

```text
weather_destinations
```

untuk current architecture.

> **Catatan as-built v2.3 (DRIFT — menunggu review Owner, §61.7):** atas instruksi Owner
> (2026-10-13 dan 2026-10-20) backend membuat tabel `destination_weather` yang dipakai
> sebagai cache respons OpenWeatherMap (TTL 30 menit via `expires_at`) dan baris seed mock.
> Aturan di atas tidak dihapus; deviasi ini dicatat untuk disahkan atau disesuaikan.

Weather dapat menggunakan:

```text
places.latitude
places.longitude
```

sebagai input.

---

# 40. Route & Navigation

Route tidak disimpan sebagai database entity.

Data minimum:

```text
latitude
longitude
map_url
```

digunakan untuk membuka navigation service.

Architecture:

```text
Place
 ↓
Coordinates
 ↓
Map / Navigation Provider
```

Tidak membutuhkan:

```text
routes
navigation_paths
```

untuk current scope.

---

# 41. Search & Filter

Search tidak membutuhkan tabel khusus.

Search menggunakan field existing:

```text
name
description
type
status
tags
place
category
event date
price
```

Filter dilakukan melalui query GORM/API (v2.2: Eloquent).

---

# 42. Recommendation

Recommendation dibagi menjadi:

## Core Recommendation

Menggunakan:

```text
location
category
type
tags
content relations
time
editorial relevance
```

Tidak membutuhkan AI.

## Future Personalized Recommendation

Dapat menggunakan:

```text
user behavior
bookmark
review
trip plan
history
preferences
```

Tidak perlu diimplementasikan pada current stage.

---

# 43. Museum & Historical Sites

Tidak dibuat tabel khusus:

```text
museums
historical_sites
```

Museum atau situs sejarah dapat direpresentasikan melalui domain yang sesuai:

```text
Destination
atau
Culture
```

dengan:

```text
destination_type
culture_type
tags
```

Contoh:

```text
culture_type = historical_site
```

atau:

```text
destination_type = museum
```

Pemilihan domain ditentukan secara editorial.

---

# 44. Cultural Calendar

Tidak dibuat tabel:

```text
culture_calendar
```

Calendar budaya dapat menggunakan:

```text
events
+
event_occurrences
+
event_type/tag
```

Contoh:

```text
Event
Festival Tradisi Pasuruan

event_type:
cultural

Occurrence:
10 Oktober 2026
```

Dengan demikian kalender event dan kalender budaya tidak memiliki dua sumber data yang berbeda.

> **Catatan status badge (frontend, mock — sync 2026-10-16):** Frontend menandai
> item kalender budaya dengan field tampilan `status`:
>
> ```text
> akan-datang  → turunan: tanggal occurrence di masa depan (≈ occurrence_status "scheduled")
> berlangsung  → turunan: "sekarang" berada di dalam rentang occurrence
> selesai      → turunan: tanggal occurrence di masa lalu (≈ occurrence_status "completed")
> ```
>
> Nilai ini **MOCK (tampilan)** — BUKAN kolom enum baru. Pada backend, badge
> dihitung dari `event_occurrences.start`/`end` (lihat §45 "Event Occurrence":
> `scheduled` / `cancelled` / `completed`), bukan disimpan sebagai kolom terpisah.

---

# 45. Data Status Convention

Status harus dibedakan berdasarkan konteks.

## Content Publication

```text
draft
published
archived
```

## Verification

```text
pending
verified
rejected
expired
```

## Operational

```text
open
closed
temporarily_closed
unknown
```

## Event Occurrence

```text
scheduled
cancelled
completed
```

## Review

```text
pending
approved
rejected
```

Jangan membuat satu global status table untuk semua kebutuhan tersebut.

---

# 46. Model Directory (GORM)

Model minimal (nama model). As-built: seluruh struct berada dalam satu file
`internal/models/models.go`, mengikuti pola backend referensi (v2.2: satu file
`.php` per model di `app/Models/`).

```text
User
Place

Destination
DestinationPrice

Culinary
CulinaryMenu

Culture

Event
EventOccurrence
EventTicket

Article
ArticleCategory

Media
OpeningHour
Source
Verification

Tag
Review
Bookmark

TripPlan
TripPlanItem
EventReminder

ContentRelation
Advertisement
```

`DestinationPrice` wajib ada dan tidak boleh hanya dianggap sebagai child table tanpa model.

Status tabel yang sudah dibuat dan yang belum: §61.7.

---

# 47. Core Model Relationships

> Notasi di bawah adalah notasi relasi konseptual dari v2.2 (gaya Eloquent), dipertahankan
> sebagai kontrak relasi. Implementasi memakai relasi GORM (`belongs to`, `has many`,
> polymorphic dengan `polymorphicValue` PascalCase — lihat §61.7).

## User

```text
public function reviews()
{
    return $this->hasMany(Review::class);
}

public function bookmarks()
{
    return $this->hasMany(Bookmark::class);
}

public function tripPlans()
{
    return $this->hasMany(TripPlan::class);
}

public function eventReminders()
{
    return $this->hasMany(EventReminder::class);
}
```

---

## Place

```text
public function destinations()
{
    return $this->hasMany(Destination::class);
}

public function culinaries()
{
    return $this->hasMany(Culinary::class);
}

public function cultures()
{
    return $this->hasMany(Culture::class);
}

public function events()
{
    return $this->hasMany(Event::class);
}
```

Tidak ada `hasOne()` untuk domain content.

---

## Destination

```text
public function place()
{
    return $this->belongsTo(Place::class);
}

public function prices()
{
    return $this->hasMany(DestinationPrice::class);
}

public function media()
{
    return $this->morphMany(Media::class, 'mediable');
}

public function openingHours()
{
    return $this->morphMany(OpeningHour::class, 'openable');
}

public function sources()
{
    return $this->morphToMany(
        Source::class,
        'sourceable'
    );
}

public function verification()
{
    return $this->morphOne(
        Verification::class,
        'verifiable'
    );
}

public function tags()
{
    return $this->morphToMany(
        Tag::class,
        'taggable'
    );
}

public function reviews()
{
    return $this->morphMany(
        Review::class,
        'reviewable'
    );
}

public function bookmarks()
{
    return $this->morphMany(
        Bookmark::class,
        'bookmarkable'
    );
}
```

---

## DestinationPrice

```text
public function destination()
{
    return $this->belongsTo(Destination::class);
}
```

---

## Culinary

```text
public function place()
{
    return $this->belongsTo(Place::class);
}

public function menus()
{
    return $this->hasMany(CulinaryMenu::class);
}

public function media()
{
    return $this->morphMany(Media::class, 'mediable');
}

public function openingHours()
{
    return $this->morphMany(OpeningHour::class, 'openable');
}

public function sources()
{
    return $this->morphToMany(
        Source::class,
        'sourceable'
    );
}

public function verification()
{
    return $this->morphOne(
        Verification::class,
        'verifiable'
    );
}

public function tags()
{
    return $this->morphToMany(
        Tag::class,
        'taggable'
    );
}

public function reviews()
{
    return $this->morphMany(
        Review::class,
        'reviewable'
    );
}
```

---

## CulinaryMenu

```text
public function culinary()
{
    return $this->belongsTo(Culinary::class);
}

public function image()
{
    return $this->belongsTo(
        Media::class,
        'image_media_id'
    );
}
```

---

## Culture

```text
public function place()
{
    return $this->belongsTo(
        Place::class
    );
}

public function media()
{
    return $this->morphMany(
        Media::class,
        'mediable'
    );
}

public function sources()
{
    return $this->morphToMany(
        Source::class,
        'sourceable'
    );
}

public function verification()
{
    return $this->morphOne(
        Verification::class,
        'verifiable'
    );
}

public function tags()
{
    return $this->morphToMany(
        Tag::class,
        'taggable'
    );
}
```

---

## Event

```text
public function place()
{
    return $this->belongsTo(
        Place::class
    );
}

public function occurrences()
{
    return $this->hasMany(
        EventOccurrence::class
    );
}

public function tickets()
{
    return $this->hasMany(
        EventTicket::class
    );
}

public function media()
{
    return $this->morphMany(
        Media::class,
        'mediable'
    );
}

public function sources()
{
    return $this->morphToMany(
        Source::class,
        'sourceable'
    );
}

public function verification()
{
    return $this->morphOne(
        Verification::class,
        'verifiable'
    );
}

public function tags()
{
    return $this->morphToMany(
        Tag::class,
        'taggable'
    );
}
```

---

## EventOccurrence

```text
public function event()
{
    return $this->belongsTo(
        Event::class
    );
}

public function reminders()
{
    return $this->hasMany(
        EventReminder::class
    );
}
```

---

## Article

```text
public function author()
{
    return $this->belongsTo(
        User::class,
        'author_id'
    );
}

public function category()
{
    return $this->belongsTo(
        ArticleCategory::class,
        'category_id'
    );
}

public function media()
{
    return $this->morphMany(
        Media::class,
        'mediable'
    );
}

public function tags()
{
    return $this->morphToMany(
        Tag::class,
        'taggable'
    );
}
```

---

# 48. Migration Order

Migration order harus mengikuti dependency.

```text
01  users

02  places
03  tags
04  sources
05  article_categories

06  destinations
07  culinaries
08  cultures
09  events
10  articles

11  destination_prices
12  culinary_menus

13  event_occurrences
14  event_tickets

15  media
16  opening_hours

17  verifications

18  reviews
19  bookmarks

20  taggables
21  sourceables

22  content_relations

23  trip_plans
24  trip_plan_items

25  event_reminders

26  advertisements
```

Alasan:

```text
Parent table
   ↓
Domain table
   ↓
Child table
   ↓
Polymorphic/supporting table
```

Foreign key harus dibuat setelah referenced table tersedia.

> **As-built v2.3:** tabel domain dibuat dengan GORM AutoMigrate (aturan delete FK
> diterapkan dengan SQL fix-up setelah AutoMigrate), sedangkan 3 tabel AI Assistant dibuat
> dengan migrasi berversi goose. Urutan dependency di atas tetap menjadi aturan.

---

# 49. Foreign Key Rules

## Required Parent

Contoh:

```text
destination.place_id
```

Jika destination selalu membutuhkan location:

```text
NOT NULL
```

## Optional Parent

Contoh:

```text
culture.place_id
event.place_id
```

dapat:

```text
NULL
```

karena content tidak selalu memiliki lokasi fisik.

## Delete Rule

### Dependent Child

Gunakan:

```text
CASCADE
```

contoh:

```text
destination
    ↓
destination_prices
```

Jika destination dihapus, price tidak boleh menjadi orphan.

### Optional Relation

Gunakan:

```text
SET NULL
```

jika content masih valid tanpa parent tersebut.

### Master Data

Gunakan:

```text
RESTRICT / NO ACTION
```

jika penghapusan parent tidak boleh merusak data historis.

---

# 50. Index Strategy

Index minimal:

```text
users.email UNIQUE

places.latitude
places.longitude

destinations.slug UNIQUE
destinations.status
destinations.featured
destinations.published_at
destinations.place_id

culinaries.slug UNIQUE
culinaries.status
culinaries.featured
culinaries.published_at
culinaries.place_id

cultures.slug UNIQUE
cultures.status
cultures.featured
cultures.published_at
cultures.place_id

events.slug UNIQUE
events.status
events.featured
events.published_at
events.place_id

event_occurrences.event_id
event_occurrences.starts_at

articles.slug UNIQUE
articles.status
articles.category_id
articles.published_at
articles.author_id

destination_prices.destination_id
culinary_menus.culinary_id

reviews.user_id
reviews.reviewable_type
reviews.reviewable_id

bookmarks.user_id
bookmarks.bookmarkable_type
bookmarks.bookmarkable_id

taggables.tag_id
taggables.taggable_type
taggables.taggable_id

sourceables.source_id
sourceables.sourceable_type
sourceables.sourceable_id
```

Polymorphic relation sebaiknya menggunakan composite index:

```text
type + id
```

---

# 51. Soft Deletes

Soft delete tidak wajib untuk semua table.

Prioritas penggunaan jika diperlukan:

```text
Destination
Culinary
Culture
Event
Article
```

Supporting data seperti:

```text
media
destination_prices
culinary_menus
```

mengikuti lifecycle parent.

Jangan menambahkan soft delete (kolom `deleted_at`; v2.2: trait SoftDeletes) hanya karena tersedia.

---

# 52. API Architecture

Current architecture:

```text
Frontend
   ↓
REST API
   ↓
Handler (Fiber)
   ↓
Service / Query Logic
   ↓
GORM
   ↓
PostgreSQL
```

Response DTO:

```text
DestinationResource
CulinaryResource
CultureResource
EventResource
ArticleResource
```

Nested data harus digunakan secara terkontrol.

Contoh:

```text
Destination
 ├── place
 ├── media
 ├── prices
 ├── opening_hours
 ├── sources
 └── verification
```

Gunakan eager loading (GORM `Preload`) atau query join agar tidak menimbulkan N+1 query.
Pada join tabel pivot polymorphic, kolom wajib dipilih eksplisit (pelajaran Tahap 1:
`SELECT *` menyebabkan kolom `id` pivot bentrok dengan `id` tabel induk).

Contoh konseptual (v2.2, gaya Eloquent):

```text
Destination::with([
    'place',
    'media',
    'prices',
    'openingHours',
    'sources',
    'verification',
])->paginate();
```

---

# 53. API Data Flow for Verification

Mandatory contract:

```text
sources
     ↓
Source Model
     ↓
Destination/Culinary/Culture/Event
     ↓
Response DTO
     ↓
Frontend
```

dan:

```text
verifications
     ↓
Verification Model
     ↓
Destination/Culinary/Culture/Event
     ↓
Response DTO
     ↓
Frontend
```

Frontend harus dapat mengetahui minimal:

```json
{
  "status": "verified",
  "verified_at": "2026-10-01T10:00:00Z"
}
```

dan source:

```json
{
  "name": "Sumber Resmi",
  "url": "https://example.com"
}
```

---

# 54. Conceptual API Endpoints

Endpoint berikut merupakan direction, bukan final contract.

## News

```text
GET /api/articles
GET /api/articles/{slug}
GET /api/article-categories
```

## Destination

```text
GET /api/destinations
GET /api/destinations/{slug}
GET /api/destinations/{id}/nearby
GET /api/destinations/{id}/similar
```

## Culinary

```text
GET /api/culinaries
GET /api/culinaries/{slug}
GET /api/culinaries/{id}/nearby
```

## Culture

```text
GET /api/cultures
GET /api/cultures/{slug}
GET /api/cultures/{id}/nearby
```

## Event

```text
GET /api/events
GET /api/events/{slug}
GET /api/events/upcoming
GET /api/events/today
GET /api/events/calendar
```

Endpoint dapat berkembang sesuai kebutuhan frontend.

---

# 55. Query Rules

## Published Content

Frontend public hanya menerima:

```text
status = published
```

kecuali endpoint admin/internal.

## Featured Content

Gunakan:

```text
featured = true
```

bukan tabel featured terpisah.

## Latest

Gunakan:

```text
published_at DESC
```

bukan field:

```text
is_latest
```

## Upcoming Event

Gunakan:

```text
event_occurrences.starts_at >= NOW()
```

bukan field:

```text
is_upcoming
```

## Nearby

Hitung dari:

```text
places.latitude
places.longitude
```

## Similar

Gunakan:

```text
tags
type
category
content_relations
```

---

# 56. Data That Should NOT Be Persisted

Current architecture tidak membutuhkan table khusus untuk:

```text
Nearby distance
Route
Navigation result
Current weather
Latest weather forecast
Search result
Recommendation result
Latest event result
Open/closed calculation
Chatbot riwayat & rekomendasi (Stage 1 rule-based, client-side — §61.6)
```

Karena data tersebut dapat dihitung atau berasal dari external service.

> **Catatan as-built v2.3:** daftar di atas tidak diubah. Dua hal yang kini disimpan
> berdasarkan keputusan Owner: (1) cache cuaca di `destination_weather` (DRIFT, §39,
> §61.7); (2) riwayat percakapan **AI Assistant backend** di `chat_sessions` /
> `chat_messages` (ERD AI disetujui Owner 2026-10-21, purge 90 hari). Riwayat Chatbot
> Stage 1 di frontend tetap tidak disimpan.

---

# 57. Data That MUST Be Persisted

Data berikut membutuhkan persistence:

```text
User
Place
Destination
Destination Price
Culinary
Culinary Menu
Culture
Event
Event Occurrence
Event Ticket
Article
Media
Opening Hours
Source
Verification
Tag
Review
Bookmark
Trip Plan
Trip Plan Item
Event Reminder
Content Relation
Advertisement
```

---

# 58. PRD → Schema Mapping

| PRD Feature     | Schema                            |
| --------------- | --------------------------------- |
| News            | `articles`                        |
| News Category   | `article_categories`              |
| Wisata          | `destinations`                    |
| Kuliner         | `culinaries`                      |
| Budaya          | `cultures`                        |
| Acara           | `events`                          |
| Location        | `places`                          |
| Map             | `places.latitude/longitude`       |
| Route           | coordinates + external navigation |
| Nearby          | dynamic proximity query           |
| Similar         | tags + content relations          |
| Gallery         | `media`                           |
| Video           | `media`                           |
| Opening Hours   | `opening_hours`                   |
| Ticket Wisata   | `destination_prices`              |
| Menu Kuliner    | `culinary_menus`                  |
| Event Ticket    | `event_tickets`                   |
| Event Calendar  | `event_occurrences`               |
| Source          | `sources` + `sourceables`         |
| Verification    | `verifications`                   |
| Search          | query layer                       |
| Filter          | query layer                       |
| Review          | `reviews`                         |
| Bookmark        | `bookmarks`                       |
| Trip Plan       | `trip_plans` + `trip_plan_items`  |
| Event Reminder  | `event_reminders`                 |
| Recommendation  | tags + relations + location       |
| Advertisement   | `advertisements`                  |
| Weather         | external service                  |
| Booking         | future                            |
| Payment         | future                            |
| AI Assistant    | future                            |
| Smart Itinerary | future                            |
| Travel Package  | future                            |

---

# 59. Features That Do Not Require a Table

Beberapa fitur PRD tidak boleh dipaksa menjadi tabel:

### Search

```text
query database
```

### Filter

```text
query database
```

### Nearby

```text
coordinate calculation
```

### Route

```text
external navigation
```

### Weather

```text
external API
```

### Share

```text
frontend/browser capability
```

### Similar

```text
metadata/editorial relation
```

### Latest

```text
sort by published_at
```

### Upcoming

```text
event_occurrences.starts_at
```

---

# 60. Backend Scope Boundary

Status keseluruhan: **backend IN PROGRESS** (plan implementasi tertua 2026-10-20; development dan staging;
production cutover belum). (v2.2: backend belum dimulai; fokus frontend.)

Dokumen ini tetap menjadi blueprint arsitektur data. Status implementasi per tabel: §61.7.

## Current/Core Schema

Dirancang pada dokumen ini:

```text
Content
Location
Media
Price
Opening Hours
Source
Verification
Tags
Event Calendar
Reviews
Bookmarks
Trip Plan
Reminder
Advertisement
Relations
```

Status: sebagian sudah diimplementasikan (Content, Location, Media, Price, Opening Hours,
Source, Verification, Event Calendar). Tags, Reviews, Bookmarks, Trip Plan, Reminder,
dan Relations belum dibuat di devbackend maupun backend aktif `Backend/`. Advertisement:
backend aktif memakai tabel legacy `ads` (kesetaraan dengan §37 belum diaudit). Rincian: §61.7.
## Planned Backend

```text
Golang (Fiber v2)
GORM
PostgreSQL 16 + pgvector
REST API
Response DTO
Query Layer
```

Status: **IN PROGRESS** — development (`Backend/devbackend`) dan staging (backend lama
`Backend/`). (v2.2: Laravel 12 · Eloquent · MySQL — PLANNED, NOT STARTED.)

## Tidak termasuk current implementation

```text
Payment Gateway
Internal Booking
Travel Package Engine
AI Travel Assistant
Smart Itinerary
Personalized AI Recommendation
Dynamic Travel Planning
Full CMS
Advanced User Generated Content
```

> **Catatan v2.3 — [OWNER_OVERRIDE] AI Travel Assistant:** daftar di atas tidak diubah.
> Owner menyetujui ERD AI Assistant (2026-10-21) sehingga tabel `faq_knowledge_bases`,
> `chat_sessions`, `chat_messages` dan endpoint chat/semantic search sudah dibuat di
> development/staging (prd.md §22, §72). Item lain pada daftar tetap tidak dikerjakan.

---

# 61. Frontend-First Compatibility

Frontend Phase 1 tetap dapat menggunakan mock data.

Namun bentuk mock data harus menyerupai API.

Contoh:

```javascript
const destination = {
    id: 1,
    name: "Nama Destinasi",
    slug: "nama-destinasi",

    place: {
        name: "Nama Lokasi",
        address: "Alamat",
        latitude: -7.1234567,
        longitude: 112.1234567
    },

    media: [],

    prices: [],

    opening_hours: [],

    sources: [],

    verification: {
        status: "verified",
        verified_at: "2026-10-01T10:00:00Z"
    }
};
```

Dengan demikian transisi:

```text
Mock Data
   ↓
API Response
```

tidak membutuhkan perubahan besar pada component frontend.

## 61.1 Homepage — Data Contract Status (sync 2026-10-14)

Ronde revisi presentasi homepage REV#15–#17 (Owner APPROVED 2026-10-14) adalah
perubahan **presentasi murni** → **TIDAK ADA dampak pada schema/data contract**:
tidak ada tabel, kolom, relasi, endpoint, atau bentuk mock data yang berubah.

Pemetaan as-built homepage → schema (blueprint; belum diimplementasikan):

```text
"Berita Pilihan"  (4 kartu) → articles (+ article_categories, satu primary category)
"Berita Terbaru"  (8 item)  → articles, urut published_at (lihat §55 "Latest")
Slot iklan ×2               → advertisements.placement: homepage_hero (setelah hero)
                              dan homepage_news (setelah Jelajah)
```

Status konten homepage saat ini: **belum berasal dari backend**. Sebagian teks
dan kartu ditulis statis di markup (`Frontend/index.html`) dan sebagian
disinkronkan dari `public/js/mock-data.js` oleh `public/js/homepage-sync.js`.

Item terbuka (bukan keputusan schema): jumlah pada markup (8 item "Berita
Terbaru" / 4 kartu "Berita Pilihan" / 3 grup kategori) belum sama dengan
`mock-data.js` (10 / 10 / 4). **DITUTUP 2026-10-16** — diterima sebagai kondisi
final saat Owner mendeklarasikan frontend selesai (tanpa perubahan kode; jumlah
konten kelak dikontrol backend, bukan markup).

## 61.2 Aset & Detail Pages — Data Contract Status (sync 2026-10-15)

Ronde optimasi aset WebP + polish detail Wisata/Kuliner (2026-10-15 —
TASK-WIS-PERF-001, TASK-WIS-DETAIL-HERO-001, TASK-WIS-DETAIL-RECO-HREF-001,
polish Kuliner) → **TIDAK ADA dampak pada schema/data contract**: tidak ada tabel,
kolom, relasi, atau endpoint baru. Bentuk mock data (121 items) tidak berubah.

```text
- `media.thumbnail_url` (kolom nullable) SUDAH ada di schema (§ media, L959).
  Kini benar-benar dipakai: data-wisata.js buildMedia() mengisi
  `media[0].thumbnail_url = url.replace(/\.webp$/, ".thumb.webp")`.
  Varian `.webp` / `.thumb.webp` hanyalah NAMA FILE aset — bukan kolom baru.
- Format/ukuran file (WebP + thumbnail) = keputusan aset, bukan struktur data.
- Detail Kuliner: konsumsi field yang sudah ada (menus, facilities,
  gallery_description, operational_status, place) — tanpa field baru.
```

## 61.3 Menu & Ulasan Kuliner — Data Contract Status (sync 2026-10-15)

Tambah data mock Menu & Harga (15 item/tempat) dan Ulasan (5/tempat) untuk
`menu_kuliner.html` & `ulasan.html`, disinkronkan per `?slug`. **Satu penambahan
kolom schema:** `culinary_menus.category` (§13) untuk filter Makanan/Minuman/
Cemilan. Selebihnya memakai tabel yang sudah ada.

Mock → tabel (kontrak transisi):

```text
window.PASINFO_KULINER_MENUS[slug][n]
  → culinary_menus : culinary_id (via slug), name, category, price,
                     description, image_media_id (via image), is_featured,
                     sort_order

window.PASINFO_KULINER_ULASAN[slug][n]
  → reviews : reviewable_type = "Culinary", reviewable_id (via slug),
              rating (1-5), body, created_at (via date)
```

```text
Catatan:
- Ulasan di data mock bersifat tampilan (nama/avatar inisial). Pada backend,
  `reviews.user_id` mengacu ke `users`; ulasan form saat ini in-memory dan
  TIDAK dipersistensi (review backend = Tier 2 / out of scope).
- `culinary_menus.category` = kolom baru (VARCHAR, nullable) — lihat §13.
- Ulasan & menu yang tampil tetap MOCK (bukan data terverifikasi).
```

---

## 61.4 Budaya & Sub-pages — Data Contract Status (sync 2026-10-16)

Ronde adaptasi Budaya ke pola Kuliner (design.md §66.11) memakai data yang SUDAH
ada; hanya menambah satu **field tampilan** pada mock kalender dan menurunkan
Cerita/Galeri dari budaya REAL. TANPA tabel/kolom/relasi/endpoint baru.

Mock → tabel (kontrak transisi):

```text
window.PASINFO_BUDAYA.calendar[n]
  → events + event_occurrences : title, desc, date (via date_label/month_label/
                                 day_label), location, organizer, ticket_info,
                                 url; event_type = "cultural"
    + field TAMPILAN `status` (akan-datang | berlangsung | selesai)
      → TIDAK ada kolom enum; dihitung dari event_occurrences (§44, §45)

window.PASINFO_BUDAYA.stories[n]   (Cerita di Balik Budaya)
  → turunan konten REAL: culture_id (via cultureId/slug)
    title   = "Cerita di Balik <culture.name>"
    excerpt = culture.short_description
    body    = culture.description
    media   → culture.media (§12: gallery = media, tanpa tabel gallery baru)
```

```text
Catatan:
- BUDAYA_CALENDAR.status = field MOCK tampilan (BUKAN kolom schema). Backend:
  compute dari event_occurrences.start/end (§44). Lihat §45 "Event Occurrence".
- BUDAYA_STORIES tidak menyimpan narasi baru (nol fabrikasi); seluruh teks
  diturunkan dari `cultures` (nama/short_description/description) + aset media.
- Foto memakai aset lokal (public/assets/images/budaya/optimized/*.webp);
  bukan data terverifikasi — tetap MOCK.
```

```text
Ronde B (design.md §66.12, sync 2026-10-16):
- TANPA tabel/kolom/relasi/endpoint baru.
- galeri_budaya.html membaca window.PASINFO_BUDAYA.cultures (turunan cultures,
  §12: gallery = media) — filter kategori = kolom `category` yang sudah ada.
- dua halaman galeri BARU (galeri_wisata.html + galeri_kuliner.html) membaca
  window.PASINFO_WISATA.destinations / window.PASINFO_KULINER.culinaries yang
  SUDAH ada → kontrak transisi sama dengan listing Wisata/Kuliner.
- Aksen warna (ungu/merah/biru) = presentasi (CSS scoped per halaman), bukan
  data/kolom.
```

```text
Ronde C (design.md §66.13, sync 2026-10-16):
- TANPA tabel/kolom/relasi/endpoint baru.
- Kartu rekomendasi galeri memakai field yang SUDAH ada: name, categoryId,
  rating, short_description, address (semua domain). Badge kategori = categoryId
  yang sudah ada; warna badge = presentasi (domain item).
- Foto hero/kartu galeri = aset lokal deterministik (media[0].url bila terisi),
  sama dengan helper listing/detail — bukan data terverifikasi (MOCK).
```

## 61.5 Frontend Completion — Data Contract Status (sync FINAL 2026-10-16)

Owner mendeklarasikan **FRONTEND SELESAI** (2026-10-16). Ronde-ronde sejak sync
terakhir (Ronde B/C + lanjutan Budaya & galeri, §61.4) seluruhnya **presentasi/UX**:

```text
- TANPA tabel/kolom/relasi/endpoint baru.
- Bentuk data mock TIDAK berubah: 121 items (Wisata 55 + Kuliner 25 +
  Budaya 25 + Acara 16) — dihitung ulang 2026-10-16 via window.PASINFO_*.
- Field tampilan tambahan yang sudah tercatat: culinary_menus.category (§61.3),
  BUDAYA_CALENDAR.status (§61.4) — keduanya tetap field MOCK (bukan kolom baru).
- Budaya tanpa rating: mock `PASINFO_BUDAYA.cultures` tidak memakai rating →
  kartu Budaya tidak merender badge rating (Kuliner/Wisata tetap). Keputusan
  Owner 2026-10-16; bukan kolom/tabel baru.
- Seluruh halaman (18: index + 17 views) memakai bentuk mock yang sudah
  schema-compliant → transisi Mock → API Response (§61) tanpa restrukturisasi.
```

Status dokumen **TIDAK berubah: NOT READY — FRONTEND PHASE** (backend tetap
belum diotorisasi; lihat §69).

---

## 61.6 Chatbot Stage 1 & Ronde 10-17/18 — Data Contract Status (sync 2026-10-18)

Ronde pasca-final 2026-10-17/18 (as-built: design.md §66.14; PRD §68/§71)
berdampak pada schema sebagai berikut:

```text
- Sumber data chatbot : public/js/data-wisata.js (lazy load; DOMAIN WISATA
  SAJA). Mesin = Stage 1 rule-based (BUKAN AI — PRD §22 tetap FUTURE; reco
  mengikuti PRD §26).
- TANPA tabel/kolom/relasi/endpoint BARU dari chatbot.
- TANPA persistensi chatbot: riwayat percakapan in-memory (hilang saat
  reload); bila kelak diizinkan, skema mengikuti §56/§57 — keputusan Owner.
- events.capacity (kuota peserta, §15) = 1 kolom MOCK BARU pada dataset
  acara (INT nullable; NULL = "Tanpa Batas") — kandidat kolom backend
  sudah tercatat pada kontrak §15; bukan migration.
- Widget Kalender Agenda (§16) memakai bentuk BUDAYA_CALENDAR yang sudah
  ada; semua tanggal aktif = perilaku frontend, tanpa field baru.
- Halaman ke-19: semua_cerita_budaya.html memakai mock BUDAYA_CALENDAR/
  cerita yang schema-compliant (§61.4); tanpa bentuk data baru.
- Bentuk data mock LAIN tidak berubah: tetap 121 items (Wisata 55 +
  Kuliner 25 + Budaya 25 + Acara 16).
- Seluruh ronde 2026-10-17/18 BELUM commit (working tree per 2026-10-18).
```

Status dokumen **TIDAK berubah: NOT READY — FRONTEND PHASE** (backend tetap
belum diotorisasi; lihat §69).

---

## 61.7 Backend As-Built — Data Contract Status (sync 2026-10-26, sinkronisasi as-built 2026-10-28, diperbarui 2026-11-03, dicek 2026-11-09)

> **Pengecekan 2026-11-09 (instruksi Owner, T29):** sejak drift No. 24 (2026-11-05) tidak ada tabel, kolom, index, atau
> constraint baru [KODE `internal/models/models.go`, `internal/database/database.go`; DB `pg_indexes`]. Fitur terdekat,
> cache rute, dan cache jawaban (2026-11-07/08) memakai kolom `places.latitude`/`longitude` yang sudah ada dan memori
> proses, tanpa tabel baru. Database dev aktif sejak 2026-11-07 adalah `pasinfo_travel_gemini` (OVERRIDE-RAG-007,
> embedding `gemini-embedding-001` 768 dimensi); angka baris di bawah yang bertanggal sebelum itu berasal dari `pasinfo_travel`.
> FAQ manual (`source_type` NULL) sengaja tanpa unique index sampai ada fitur admin FAQ (T18, Owner 2026-11-09; 0 baris).

Backend dikerjakan (plan implementasi tertua 2026-10-20; setup awal sudah ada sebelumnya,
tanggalnya tidak tercatat) dengan Golang (Fiber v2) + GORM + PostgreSQL 16 + pgvector 0.8.7
(prd.md §72). Bagian ini mencatat tabel yang sudah dibuat dan deviasi terhadap kontrak schema
ini. Deviasi dicatat sebagai **DRIFT — MENUNGGU REVIEW OWNER** dan belum menjadi kontrak resmi
sebelum disahkan (aturan §69).

> **Sinkronisasi 2026-10-28 (instruksi Owner):** isi bagian ini dicocokkan langsung dengan
> proyek. Label bukti: **[KODE]** = source code/file · **[DB]** = query read-only (staging
> `pasinfo_travel` dan devbackend `pasinfo_dev`) · **[DOK]** = plan/dokumen. Backend aktif
> adalah backend lama `Backend/`; `Backend/devbackend` hanya referensi read-only. Sinkronisasi
> ini **tidak menambah tabel atau kolom**; hanya mencatat kondisi aktual.

### Tabel di database staging backend aktif (`Backend/`, DB `pasinfo_travel`) [DB; KODE `internal/database/database.go`]

| Tabel | Bagian schema | Mekanisme | Baris (2026-10-28) |
|---|---|---|---|
| `places`, `destinations`, `destination_prices`, `media`, `opening_hours`, `sources`, `sourceables`, `verifications` | §6, §10, §11, §20, §22, §24–§26 | GORM AutoMigrate | 116 · 55 · 165 · 330 · **0** · 4 · 137 · 137 |
| `regions`, `travel_categories`, `facilities`, `destination_weather` | tidak ada di schema (DRIFT No. 1, No. 12) | GORM AutoMigrate | 5 · 4 · 220 · 55 |
| `culinaries`, `culinary_menus`, `cultures`, `events`, `event_occurrences`, `event_tickets` | §12–§17 | GORM AutoMigrate (hanya di PostgreSQL + pgvector) | 25 · 375 · 25 · **32** · 40 · 21 (2026-11-01 setelah event mock dihapus: events 16 · occurrences 24 · tickets 5) |
| `articles`, `article_categories` | §18, §19 | **Dihapus 2026-11-09 (Owner)**: model dan AutoMigrate dicabut, tabel di-drop di `pasinfo_travel` dan `pasinfo_travel_gemini`; backend men-drop tabel yang masih kosong saat start | — |
| `faq_knowledge_bases`, `chat_sessions`, `chat_messages` | tidak ada di schema; ERD AI terpisah | GORM AutoMigrate + SQL idempotent (`CREATE EXTENSION vector`, kolom tambahan FAQ, indeks HNSW) | 258 (242 aktif) · 228 · 1.905 (sinkron 2026-10-31) |
| Tabel legacy: `users`, `news`, `categories`, `news_images`, `notifications`, `histories`, `ads`, `verify_otps`, `provinces`, `regencies`, `districts`, `villages` | `users` §5; `ads` setara konsep `advertisements` §37 (belum diaudit); lainnya tidak ada di schema | GORM AutoMigrate (backend lama) | `users` 5 · `news` 116 · `categories` 10 · `ads` 0 · `villages` 83.762 |

### Tabel di database development (`Backend/devbackend`, DB `pasinfo_dev`) — referensi

| Tabel | Bagian schema | Mekanisme | Keterangan |
|---|---|---|---|
| `places`, `destinations`, `destination_prices`, `media`, `opening_hours`, `sources`, `sourceables`, `verifications` | §6, §10, §11, §20, §22, §24–§26 | GORM AutoMigrate | Tahap 1 Wisata (2026-10-20/21) |
| `regions`, `categories`, `facilities`, `destination_weather` | tidak ada di schema | GORM AutoMigrate | **DRIFT** (instruksi Owner 2026-10-13 dan 2026-10-20) |
| `articles`, `article_categories` | §18, §19 | GORM AutoMigrate | 33 · 9 baris [DB] |
| `culinaries`, `culinary_menus`, `cultures`, `events`, `event_occurrences`, `event_tickets` | §12–§17 | GORM AutoMigrate | events 16 baris [DB] |
| `faq_knowledge_bases`, `chat_sessions`, `chat_messages` | tidak ada di schema; ERD AI terpisah | goose (5 migrasi termasuk ekstensi dan indeks) | APPROVED Owner 2026-10-21 (`plans/2026-10-21-erd-ai-assistant.md`); FAQ 88 baris [DB] |

Belum dibuat di kedua database: `tags`, `taggables`, `reviews`, `bookmarks`, `trip_plans`,
`trip_plan_items`, `event_reminders`, `content_relations`. Tabel `advertisements` tidak ada;
backend lama memakai tabel `ads` (0 baris). Kesetaraan `users`/`ads` legacy dengan kontrak
§5/§37 belum diaudit.

### Deviasi (DRIFT)

| No | Deviasi | Sumber |
|---|---|---|
| 1 | Tabel baru `regions`, `categories`, `facilities`, `destination_weather` (definisi kolom belum ada di schema) | Tahap 1 — Drift Register |
| 2 | Kolom baru `destinations`: `region_id`, `category_id`, `rating`, `reviews_label`, `keyakinan`, `source` | Tahap 1 — Drift Register |
| 3 | Kolom baru `places.google_place_id` | Tahap 1 — Drift Register |
| 4 | `destinations.destination_type` (§10) tidak dibuat; perannya digantikan `category_id` | Tahap 1 — Drift Register |
| 5 | `tags` / `taggables` tidak dibuat (mock frontend tidak memakai tags) | Tahap 1 — Drift Register |
| 6 | `articles.author_name` dan `articles.source` ditambahkan; `author_id` nullable (tabel users belum ada); `content` = TEXT paragraf dipisah `\n\n`; FK kategori `ON DELETE RESTRICT` | Tahap 1 — Domain Berita |
| 7 | Cache cuaca disimpan di `destination_weather` (bertentangan dengan §39/§56) | Tahap 1 — Integrasi API key |
| 8 | Riwayat chat AI disimpan (`chat_sessions`/`chat_messages`); purge 90 hari disetujui di ERD. **Diimplementasikan 2026-10-28** (backend aktif): aktivitas sesi = `COALESCE(last_message_at, MAX(chat_messages.created_at), chat_sessions.created_at)`; `last_message_at` kini diisi setiap pesan pengguna (sebelumnya selalu NULL); retensi via env `CHAT_RETENTION_DAYS` (default 90) | ERD AI (APPROVED) + keputusan Owner 2026-10-28 |
| 9 | `place_id` kuliner/budaya/acara hanya diisi bila cocok dengan `places` existing, selain itu NULL (§12 `culinaries.place_id` tertulis FK tanpa keterangan nullable). Di staging per 2026-10-28 tidak ada `place_id` NULL pada ketiga tabel [DB] | Domain Data Migration & Seed |
| 10 | Respons API Wisata dan Berita mengikuti bentuk mock frontend (Wisata: field turunan `prices[]`, `fasilitas[]`, label `opening_hours`), bukan bentuk contoh §28. Bentuk respons Kuliner/Budaya/Acara tidak dirinci di plan | Tahap 1 |
| 11 | **Sebagian teratasi 2026-11-01 (instruksi Owner, opsi A).** ERD AI §6.3 menetapkan `chat_sessions → chat_messages` **ON DELETE CASCADE**. Kini FK `fk_chat_sessions_messages` (`chat_messages.session_id → chat_sessions.id`) ada di `pasinfo_travel`, dibuat GORM AutoMigrate (relasi `ChatSession.Messages`, `OnDelete: NO ACTION`). Sisa deviasi: tanpa CASCADE, sesuai keputusan Owner 2026-10-28; purge menghapus pesan secara eksplisit sebelum sesinya dalam transaksi yang sama | [DB; KODE `internal/models/models.go`, `internal/services/chat_retention.go`] |
| 12 | Backend aktif memakai nama tabel `travel_categories` untuk kategori wisata (di devbackend: `categories`), karena `categories` sudah dipakai kategori berita legacy | [DB; KODE `models.TravelCategory`] |
| 13 | **Teratasi 2026-11-09 (Owner): `news` + `categories` adalah tabel berita; `articles`/`article_categories` dihapus (route, handler, model, AutoMigrate, tabel).** Catatan lama: Berita di backend aktif disimpan di tabel legacy `news` (116 baris) + `categories` (10), bukan kontrak `articles`/`article_categories` (§18–§19). Tabel `articles` ada tetapi kosong; seed mengizinkan `berita.json` namun file tidak ada di `Backend/cmd/seed/data`. Korpus AI memakai `news` (`source_type='news'`) | [DB; KODE] |
| 14 | **Teratasi di `pasinfo_travel` 2026-11-01 (instruksi Owner).** Sebelumnya: 32 event (16 mock lama slug `*-mock` dari 2026-10-24 + 16 seed editorial 2026-10-27), semua berlabel sumber `acara` / `source_type=mock`. Kini: 16 event mock beserta tiket, jadwal, sourceables, verifications, dokumen FAQ nonaktif, dan 5 places tanpa nama dihapus (satu transaksi); 16 event editorial (id 17–32) bersumber `data-acara.json` / `source_type=seed` (nilai yang sudah dipakai sumber wisata); sumber `acara`/`mock` dihapus; seed diperbaiki. DB uji `pasinfo_travel_gemini` belum dibersihkan | [DB; KODE `Backend/cmd/seed/main.go`] + keputusan Owner 2026-10-28 dan 2026-11-01 |
| 15 | Nilai status di luar daftar §26/§45: verifikasi event `terverifikasi` (7), `jadwal-resmi` (2), `jadwal-terdaftar` (7) — schema: `pending`/`verified`/`rejected`/`expired`; status occurrence `expected` (1), `ongoing` (1), `past_unconfirmed` (13) — schema: `scheduled`/`cancelled`/`completed` | [DB] |
| 16 | `faq_knowledge_bases.source_type` di staging bernilai `destination`, `culinary`, `culture`, `event`, `news`, `region` — ERD AI §3 hanya `manual`/`article`/`destination`. **Sebagian teratasi 2026-11-03:** indeks `idx_faq_knowledge_source (source_type, source_id)` dibuat, lalu dijadikan UNIQUE parsial (`WHERE source_type IS NOT NULL AND source_id IS NOT NULL`, satu dokumen korpus per sumber) — lebih ketat dari ERD; indeks tunggal `idx_chat_sessions_visitor_id` dan `idx_chat_messages_session_id` dihapus (tercakup indeks komposit ERD) | [DB; KODE `models.go`, `database.go`] |
| 17 | FK tabel anak di staging **tanpa `ON DELETE CASCADE`** (default NO ACTION): `destination_prices`, `facilities`, `destination_weather`, `culinary_menus`, `event_occurrences`, `event_tickets`; `sourceables` tidak memiliki FK ke `sources`. Di devbackend, `destination_prices`, `facilities`, `destination_weather`, dan `sourceables.source_id` memakai CASCADE sesuai §49 | [DB, kedua database] |
| 18 | `events` (§15): `organizer_name` **diimplementasikan 2026-10-29** (keputusan Owner KR-08; VARCHAR(255) nullable lewat GORM AutoMigrate; terisi 9 dari 16 event asli dari seed). Kolom §15 lain belum ada di staging: `organizer_phone`, `website_url`, `capacity`, `published_at` | [DB `information_schema.columns` 2026-10-29; KODE `models.Event`] |
| 19 | Backfill 2026-10-29 (keputusan Owner KR-06, `go run ./cmd/seed -backfill`, hanya mengisi kolom kosong dari file seed, tanpa baris baru): `short_description` destinasi 55 · kuliner 25 · budaya 25 · acara 16; `culinary_type` 25; `culture_type` 25; `event_type` 16; `places.address` 55. Alamat `places` id 104 (dipakai `pekan-raya-pasuruan` dan `dream-desire-fest` dengan alamat sumber berbeda) sengaja tidak diisi. `places.village`/`district` kosong di 116/116 baris; jam buka, rating, `price_range` tidak diisi (data dummy) | [DB pra/pasca-cek 2026-10-29] |
| 20 | `faq_knowledge_bases.metadata` (jsonb, kolom sudah ada; ERD AI tidak mendefinisikan isinya) kini diisi saat upsert korpus (2026-11-03: juga penanda `"source_unpublished": true` pada dokumen yang dinonaktifkan karena sumbernya tidak lagi published/terhapus; hilang saat sumber terbit lagi): `{"region": "<nama zona>"}` untuk destinasi 55, kuliner 25, budaya 25, acara aktif 16, wilayah 5; `{"news_category": "<categories.slug>"}` untuk berita 116. Dipakai filter pencarian (OVERRIDE-RAG-003). Teks korpus berita kini memuat baris Kategori berita / Sumber / Ditambahkan ke database. **DRIFT — MENUNGGU REVIEW OWNER** | [DB 2026-10-31; KODE `retrieval.go`, `knowledge_text.go`] |

| 21 | Kolom `keyakinan` varchar(30) nullable di `culinaries` dan `cultures` (pola `destinations.keyakinan`, No. 2), diisi dari seed lewat `cmd/seed -backfill` (wisata 55, kuliner 25, budaya 25); tidak ada di §12/§13. **DRIFT — MENUNGGU REVIEW OWNER** (disetujui untuk dibuat 2026-11-03, OVERRIDE-RECO-001) | [DB; KODE `models.go`, `cmd/seed`] |
| 22 | Kolom `views` bigint NOT NULL DEFAULT 0 (tidak tampil di respons) di `destinations`, `culinaries`, `cultures`, `events`; bertambah 1 tiap GET detail; sinyal popularitas rekomendasi (bobot 0 sampai ada data nyata); tidak ada di §10–§15. **DRIFT — MENUNGGU REVIEW OWNER** (OVERRIDE-RECO-001) | [DB; KODE `domain_handler.go`, `wisata_handler.go`] |
| 23 | `places.district`/`village` (kolom §6 yang sudah ada) kini terisi dari alamat (109/111, 106/111) dan `places.regency` bernilai `Kota Pasuruan`/`Kabupaten Pasuruan` (sebelumnya `Pasuruan` untuk semua); zona peta kuliner/budaya/acara diturunkan dari kecamatan (bukan kolom). Bukan kolom baru — dicatat karena nilai `regency` berubah (Owner opsi A, 2026-11-03) | [DB; KODE `location.go`, `cmd/seed/backfill.go`] |
| 24 | Kolom status pemrosesan embedding di `faq_knowledge_bases` (jobdesk 5 Nov p4, Owner opsi B, 2026-11-05): `embedding_status` varchar(20) NOT NULL DEFAULT `completed` CHECK (`pending`,`processing`,`completed`,`failed`), `embedding_attempts` bigint NOT NULL DEFAULT 0, `embedding_error` text, `embedding_next_retry_at` timestamptz. Ditambahkan lewat tag model (AutoMigrate); 366 baris dev dan 357 baris DB uji Gemini menjadi `completed`. Worker menandai dokumen baru/berubah `pending`, lalu `processing` → `completed` atau `failed` (penyebab, maksimal 5 percobaan, jeda 15 menit–2 jam). Baris sumber baru dibuat tanpa vektor sampai selesai; pembacaan korpus non-vektor kini memakai `embedding IS NOT NULL`. ERD AI tidak mendefinisikan status ini. **DISAHKAN Owner 2026-11-09 (T30)**: keempat kolom, nilai status, dan aturan percobaan di atas kini bagian kontrak skema `faq_knowledge_bases`; dipakai worker sejak 2026-11-05, 390/390 baris `completed` di `pasinfo_travel_gemini` (2026-11-08) | [KODE `models.go`, `knowledge_refresh.go`; DB 2026-11-05, 2026-11-08] |

Migrasi backend aktif tetap GORM AutoMigrate + SQL idempoten (keputusan Owner 2026-11-03); riwayat versi skema:
`Backend/docs/3 November 2026/MIGRASI_SKEMA_VERSI.md`.

### Aturan schema yang tercatat dipatuhi pada implementasi

* Konten domain Wisata merujuk ke `places` (seed Tahap 1: satu baris `places` per destinasi).
* Tidak ada indeks UNIQUE pada `place_id` di staging [DB].
* Source dan Verification tetap tabel polimorfik terpisah; nilai type polymorphic
  PascalCase. Di staging: `Destination`, `Culinary`, `Culture`, `Event` [DB].
* Child dependen memakai `ON DELETE CASCADE` (§49) — **hanya di devbackend**; di staging
  backend aktif tidak (drift No. 17).
* Tabel AI (`faq_knowledge_bases`, `chat_sessions`, `chat_messages`) — **2026-11-01 (instruksi Owner, opsi B)**:
  NOT NULL, CHECK, dan indeks dari ERD AI diterapkan lewat tag GORM AutoMigrate + SQL idempotent
  `SET NOT NULL` (AutoMigrate tidak mengubah kolom nullable yang sudah ada). CHECK: kategori FAQ
  (`wisata`,`berita`,`kuliner`,`budaya`,`acara`,`umum`,`layanan`), `source_type` FAQ mengikuti korpus aktif
  (drift No. 16), status sesi, role dan status pesan. Indeks: `idx_chat_messages_session_created`,
  `idx_chat_sessions_visitor_last`, `idx_faq_knowledge_category` [DB; KODE `internal/models/models.go`,
  `internal/database/database.go`]. FK `chat_messages.session_id` NO ACTION ada sejak 2026-11-01 (drift No. 11).
* Tidak ada tabel booking/registration/payment (Ticket ≠ Booking).
* `events.culture_id` tidak dibuat (relasi masih pending).
* Tidak ada tabel nearby yang dibuat.
* Data kuliner, budaya, dan destinasi berstatus verifikasi `pending` di staging [DB]. Status
  data event: drift No. 14–15.

### Yang masih terbuka

* Pengesahan drift No. 1–23 oleh Owner.
* Pembersihan 16 event mock lama: **selesai** di `pasinfo_travel` (2026-11-01) dan DB uji `pasinfo_travel_gemini`
  (2026-11-03) (drift No. 14).
* Tipe kolom aktual hasil GORM AutoMigrate belum dibandingkan kolom per kolom dengan
  dokumen ini; verifikasi via `\d <tabel>` diperlukan sebelum kontrak final.
* Kolom aktual tabel kuliner/budaya/acara belum disinkronkan ke §12–§17.
* Definisi kolom tabel AI mengacu pada `plans/2026-10-21-erd-ai-assistant.md`; belum
  disalin ke dokumen ini.
* `opening_hours` kosong (0 baris).
* Frontend masih memakai mock data; §61.1–§61.6 tetap berlaku sebagai kontrak bentuk data.

---

# 62. Migration Definition of Done

Migration dianggap selesai jika:

* [ ] Nama table sesuai schema.
* [ ] Semua required column tersedia.
* [ ] Nullable field jelas.
* [ ] Foreign key benar.
* [ ] Delete behavior benar.
* [ ] Unique constraint hanya digunakan jika memang diperlukan.
* [ ] Tidak ada unique `place_id` pada domain content.
* [ ] Index tersedia untuk query utama.
* [ ] Polymorphic index tersedia.
* [ ] Migration dapat dijalankan dari database kosong.
* [ ] Migration dapat di-rollback.
* [ ] Tidak ada dependency migration yang salah.

---

# 63. Model (GORM) Definition of Done

Model dianggap selesai jika:

* [ ] Semua model tersedia.
* [ ] `DestinationPrice` memiliki model khusus.
* [ ] Foreign key relationship benar.
* [ ] Polymorphic relationship benar.
* [ ] `Place` menggunakan `hasMany`, bukan `hasOne`.
* [ ] Domain content menggunakan `belongsTo Place`.
* [ ] Relationship tidak membuat constraint bisnis yang belum disepakati.
* [ ] Cast tanggal/waktu sesuai kebutuhan.
* [ ] Query tidak menghasilkan N+1.
* [ ] Eager loading digunakan pada API.
* [ ] Response DTO tersedia untuk public content.

---

# 64. Response DTO Definition of Done

Untuk content yang memiliki source/verification:

* [ ] Source tersedia pada model/relasi GORM.
* [ ] Verification tersedia pada model/relasi GORM.
* [ ] Response DTO mengekspos source.
* [ ] Response DTO mengekspos verification.
* [ ] Verification status dapat dibaca frontend.
* [ ] `verified_at` dapat ditampilkan frontend.
* [ ] Source URL dapat diakses frontend.
* [ ] Tidak perlu frontend melakukan query langsung ke database.
* [ ] Struktur JSON konsisten.

Target:

```text
Database
   ↓
Model GORM
   ↓
Response DTO
   ↓
JSON
   ↓
Frontend
```

---

# 65. Documentation Consolidation Rule

Dokumentasi schema harus menghindari pengulangan konsep yang sama.

## Location

Didefinisikan utama di:

```text
§6 Places
§7 Place Relationship Rule
```

## Nearby

Didefinisikan utama di:

```text
§8 Nearby, Location & Proximity
```

## Nearby vs Similar

Didefinisikan utama di:

```text
§9 Nearby vs Similar
```

## Source & Verification

Didefinisikan utama di:

```text
§24 Sources
§25 Sourceables
§26 Verifications
§27 Source + Verification Data Flow
```

## API

Didefinisikan utama di:

```text
§52 API Architecture
§53 API Data Flow for Verification
§54 Conceptual API Endpoints
```

Bagian lain hanya boleh merujuk ke aturan tersebut, bukan mengulang penjelasan lengkap.

Tujuannya:

```text
Satu konsep
    ↓
Satu sumber dokumentasi utama
    ↓
Referensi dari section lain
```

bukan:

```text
Satu konsep
    ↓
ditulis 4–5 kali
```

---

# 66. Schema Integrity Rules

Aturan yang harus dianggap mandatory:

### Rule 1 — Location

```text
Domain Content → belongsTo Place
Place → hasMany Domain Content
```

Tidak ada unique `place_id` kecuali business rule baru secara eksplisit mengharuskannya.

### Rule 2 — Destination Price

```text
Destination
   ↓ hasMany
DestinationPrice
```

`DestinationPrice` adalah model resmi.

### Rule 3 — Nearby

```text
Nearby = calculated
```

bukan stored relation.

### Rule 4 — Similar

```text
Similar = metadata/editorial relation
```

bukan distance.

### Rule 5 — Source

```text
Source = origin of information
```

### Rule 6 — Verification

```text
Verification = trust/status information
```

Source dan verification tidak digabung menjadi satu table.

### Rule 7 — API

```text
Backend data ≠ automatically frontend contract
```

Response DTO harus secara eksplisit menentukan data public.

### Rule 8 — Status

```text
publication status
≠
operational status
≠
verification status
```

### Rule 9 — Ticket

```text
Ticket information
≠
Booking
≠
Payment
```

### Rule 10 — Future Feature

Feature future tidak boleh dipaksakan menjadi current database implementation tanpa kebutuhan yang jelas.

---

# 67. Final Relationship Overview

```text
USER
 │
 ├── reviews
 ├── bookmarks
 ├── trip_plans
 │      └── trip_plan_items
 │
 └── event_reminders
          │
          └── event_occurrence


PLACE
 │
 ├── destinations
 │      └── destination_prices
 │
 ├── culinaries
 │      └── culinary_menus
 │
 ├── cultures
 │
 └── events
        ├── event_occurrences
        │       └── event_reminders
        │
        └── event_tickets


DESTINATION
 ├── media
 ├── opening_hours
 ├── sources
 ├── verification
 ├── tags
 ├── reviews
 ├── bookmarks
 └── content_relations


CULINARY
 ├── media
 ├── opening_hours
 ├── menus
 ├── sources
 ├── verification
 ├── tags
 ├── reviews
 └── bookmarks


CULTURE
 ├── media
 ├── sources
 ├── verification
 ├── tags
 ├── reviews
 └── bookmarks


EVENT
 ├── media
 ├── occurrences
 ├── tickets
 ├── sources
 ├── verification
 ├── tags
 ├── reviews
 └── bookmarks


ARTICLE
 ├── category
 ├── author
 ├── media
 └── tags
```

---

# 68. Final Architecture

```text
                    PASURUAN INFO
                         │
             ┌───────────┴───────────┐
             │                       │
           NEWS                 DISCOVERY
             │                       │
         Articles        ┌───────────┼───────────┐
                         │           │           │
                      Wisata      Kuliner      Budaya
                         │           │           │
                         └───────────┼───────────┘
                                     │
                                   Acara


                     LOCATION LAYER
                           │
                         Places
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      Destination       Culinary          Event
          │                │                │
          └────────────────┼────────────────┘
                           │
                        Culture


                     SHARED LAYER
                           │
        ┌──────────┬───────┼───────┬──────────┐
        │          │       │       │          │
      Media      Source   Verify  Tags    Opening Hours
        │
        └───────────────────────────────────────┐
                                                │
                                          Response DTO
                                                │
                                              REST API
                                                │
                                            Frontend


                     USER LAYER
                           │
        ┌─────────┬────────┼────────┬─────────┐
        │         │        │        │         │
     Review   Bookmark  Trip Plan Reminder  Contribution*
```

`* Contribution` tetap advanced dan membutuhkan workflow tersendiri sebelum tabel persistence dibuat.

---

# 69. Final Schema Status

Setelah revisi ini:

```text
PRD
 ↓
Feature Requirement
 ↓
Schema
 ↓
Migration
 ↓
Model GORM
 ↓
Response DTO
 ↓
Frontend
```

telah memiliki alur yang konsisten.

### Core Domain

```text
✓ News
✓ Wisata
✓ Kuliner
✓ Budaya
✓ Acara
```

### Location

```text
✓ Central Place
✓ Coordinates
✓ Nearby
✓ Map
✓ Route-ready
```

### Content

```text
✓ Media
✓ Gallery
✓ Price
✓ Menu
✓ Opening Hours
✓ Event Calendar
✓ Ticket Information
```

### Trust

```text
✓ Source
✓ Verification
✓ API exposure
```

### User

```text
✓ Review
✓ Bookmark
✓ Trip Plan
✓ Event Reminder
```

### Advanced / Future

```text
✓ Contribution boundary
✓ Booking boundary
✓ Payment boundary
✓ Weather boundary
✓ AI boundary
✓ Smart itinerary boundary
```

### Critical Integrity Rules

```text
✓ Place tidak memaksa hasOne
✓ place_id tidak unique
✓ DestinationPrice memiliki model
✓ Nearby tidak disimpan
✓ Similar tidak disamakan dengan Nearby
✓ Gallery tidak membutuhkan table baru
✓ Weather tidak disimpan permanent
✓ Route tidak membutuhkan table
✓ Source ≠ Verification
✓ Publication Status ≠ Operational Status
✓ Ticket ≠ Booking
✓ Response DTO wajib mengekspos verification/source
✓ Article memiliki satu primary category
✓ Migration order mengikuti dependency
```

**Status dokumen: IMPLEMENTATION IN PROGRESS — BACKEND PHASE (v2.3, menunggu review Owner)**

(v2.2: NOT READY — FRONTEND PHASE)

```text
┌────────────────────────────────────────────────────────────┐
│ SCHEMA DOCUMENT                                            │
│                                                            │
│ Design completeness   : COMPLETE (blueprint architecture)  │
│ Implementation status : IN PROGRESS (dev + staging)        │
│                                                            │
│ YANG SUDAH DIJALANKAN (prd.md §72, schema §61.7) :         │
│   Frontend HTML5 + Tailwind + Vanilla JS (mock data)       │
│   Golang · Fiber v2 · GORM · PostgreSQL 16 + pgvector      │
│   AutoMigrate + goose · Seed · REST API GET · AI chat      │
│                                                            │
│ YANG BELUM :                                               │
│   Integrasi frontend → API · Production cutover            │
│   Pengesahan drift schema (§61.7) · API Contract final     │
│                                                            │
│ ⚠ Perubahan struktur data tetap wajib dicek ke prd.md     │
│   dan disahkan di dokumen ini.                             │
│                                                            │
│ Lihat : AGENTS.md §6 (Out of Scope), §31 (Schema Rule)     │
└────────────────────────────────────────────────────────────┘
```

Schema ini menjadi acuan database dan model data (GORM) untuk backend Golang yang
sudah dikerjakan (plan implementasi tertua 2026-10-20) (v2.2: "acuan Eloquent ketika backend Laravel
mulai dikerjakan").

Setiap perubahan terhadap struktur data harus terlebih dahulu dicek terhadap
`prd.md` dan diperbarui di `schema.md` sebelum migration/model diimplementasikan.

> **Sync 2026-10-14:** ronde revisi presentasi homepage REV#15–#17 (Owner
> APPROVED, `design.md` §66.6) **tidak mengubah struktur data apa pun** — tidak
> ada tabel/kolom/relasi/endpoint yang ditambah atau diubah. Status dokumen
> tetap **NOT READY — FRONTEND PHASE**. Status data contract homepage: §61.1.
>
> **Sync 2026-10-16 — FINAL:** Owner mendeklarasikan **FRONTEND SELESAI**.
> Seluruh ronde presentasi/UX + aset/performa (Ronde B/C + lanjutan Budaya &
> galeri, homepage REV#10–#17, detail Wisata/Kuliner) terverifikasi **tanpa
> dampak schema**: tidak ada tabel/kolom/relasi/endpoint baru; data mock tetap
> 121 items. Data contract status: §61.1–§61.5. Status dokumen **tetap
> NOT READY — FRONTEND PHASE** (backend belum diotorisasi).

## Penggunaan pada fase ini — apa yang BOLEH dan TIDAK BOLEH

`KNOWN` — diizinkan pada fase frontend:

```text
Mengambil bentuk field untuk mock data
Mengikuti struktur Response DTO (§28) sebagai pola mock data
Menentukan nesting: place, media, prices, opening_hours, sources, verification
Menjaga mock data tetap konsisten dengan bentuk schema
```

`UNKNOWN` — TIDAK diizinkan pada fase ini:

```text
Menulis migration
Menulis model data (v2.2: model Eloquent)
Menulis controller / handler
Menulis endpoint API
Membuat tabel di database
Menjalankan query
```

> Catatan v2.3: daftar `KNOWN`/`UNKNOWN` di atas adalah aturan **fase frontend**. Fase
> backend sudah berjalan (plan implementasi tertua 2026-10-20, keputusan Owner tercatat di plan Tahap 1); item `UNKNOWN`
> sudah dikerjakan pada fase backend (§61.7).

## Urutan aktivasi

```text
SELESAI       → Frontend + mock data          (Phase 1–6, 2026-10-16)
SEKARANG      → Backend Golang                (prd.md §54, §72 — plan tertua 2026-10-20)
                    ↓
                  Migration (§48)             → AutoMigrate + goose  ✓ (dev)
                                                AutoMigrate + SQL idempotent ✓ (staging, backend aktif)
                    ↓
                  Model GORM (§46, §47)       → ✓ sebagian (§61.7)
                    ↓
                  Seeder                      → ✓ (dev + staging)
                    ↓
                  REST API + Response DTO     → ✓ GET publik + AI (dev + staging)
                    (§52, §28)
                    ↓
                  AI Travel Assistant         → SEDANG BERJALAN (fokus Owner 2026-10-28;
                                                prd.md §72.3–§72.4)
NANTI         → Integrasi frontend → API, cutover produksi
```

Status `NOT READY` pada dokumen ini berubah menjadi `READY FOR IMPLEMENTATION`
hanya setelah:

```text
[x] Seluruh halaman frontend stabil (prd.md §53 Phase 1–6)
    → TERPENUHI 2026-10-08: Kuliner/Budaya/Acara Owner APPROVED ("selesai")
    → FINAL 2026-10-16: Owner mendeklarasikan FRONTEND SELESAI (audit: 18
      halaman, 121 items, seluruh ronde ditutup, ter-commit de697d3)
[x] Data mock proven stabil dan tidak perlu perubahan bentuk
    → TERPENUHI 2026-10-09: 121 items terverifikasi schema-compliant
    (Wisata 55 + Kuliner 25 + Budaya 25 JSON real Owner + Acara 16 mock;
    place/media null hanya di Acara; source filename + verification pending
    untuk data real; enrichment via opening-hours-util.js + add-sources-data.js)
    → KONSUMSI 2026-10-09: tabel `sources` + `verifications` kini dirender
    di 4 detail pages (section Sumber & Verifikasi, Tier 1.7) — tanpa
    perubahan struktur schema, hanya konsumsi mock sesuai §28.
    → AUDIT 2026-10-13 (TASK-WIS-HERO-001 rev.5–rev.8): revisi visual hero Wisata
    (gradient overlay, warna teks lokasi mengikuti warna badge, text-shadow kartu)
    = CSS/presentasi saja → TIDAK ada dampak schema: tanpa tabel/kolom/relasi/endpoint
    baru, tanpa perubahan bentuk mock data (121 items tetap). Status dokumen tetap
    `NOT READY` sesuai AGENTS.md §6/§31.
    → AUDIT 2026-10-15 (TASK-WIS-PERF-001 + detail Wisata/Kuliner): optimasi aset
    WebP + thumbnail (4 domain + kartu homepage), anti-flash transisi, preload hero
    detail, dan polish detail/listing Kuliner = presentasi/aset/performa saja →
    TIDAK ada dampak schema: tanpa tabel/kolom/relasi/endpoint baru; pemakaian
    `media.thumbnail_url` sudah ada (lihat §61.2). Status dokumen tetap `NOT READY`.
    → AUDIT 2026-10-15 (data Menu & Ulasan Kuliner): tambah data mock
    `PASINFO_KULINER_MENUS` (15 item/tempat) + `PASINFO_KULINER_ULASAN`
    (5/tempat) dan WIRING halaman. Satu penambahan schema: kolom
    `culinary_menus.category` (§13) untuk filter UI. Selain itu hanya konsumsi
    tabel yang sudah ada (`culinary_menus`, `reviews`); bentuk 121 items tidak
    berubah. Status dokumen tetap `NOT READY`.
    → AUDIT 2026-10-16 (adaptasi Budaya ronde 7-item): hero foto asli, peta flyTo +
    default peringatan, badge status kalender (3 warna), Cerita turunan data REAL,
    Rekomendasi coverflow (paritas Kuliner). Presentasi + struktur mock saja →
    TIDAK ada tabel/kolom/relasi/endpoint baru; `BUDAYA_CALENDAR.status` = field
    tampilan mock (lihat §44/§61.4). Status dokumen tetap `NOT READY`.
    → AUDIT 2026-10-16 (Ronde B/C + lanjutan Budaya & galeri): 2 halaman galeri baru
    (galeri_wisata/galeri_kuliner), aksen ungu Budaya, transisi halaman, kartu reco
    galeri/detail/agenda, badge rating Budaya dilepas, ukuran teks section seragam.
    Presentasi/UX saja → TIDAK ada dampak schema; memakai field yang sudah ada
    (lihat §61.4/§61.5). Status dokumen tetap `NOT READY`.
    → AUDIT 2026-10-16 (FINAL — Owner mendeklarasikan FRONTEND SELESAI): audit
    menyeluruh terverifikasi dari repo — 18 halaman (index + 17 views, semua
    tertaut), 121 items (re-hitung 2026-10-16), `Backend/` ada tapi KOSONG, seluruh
    ronde pasca-approval sudah ter-commit (`de697d3`, 2026-10-16). Tidak ada tabel/
    kolom/relasi/endpoint baru. Lihat §61.5. Status dokumen tetap `NOT READY`.
    → AUDIT 2026-10-18 (ronde pasca-final 2026-10-17/18 + Chatbot Stage 1):
    frontend kini **19 halaman** (index + 18 views; + `semua_cerita_budaya.html`),
    widget chatbot FAB rule-based domain Wisata (§61.6), `events.capacity`
    (kuota — kolom mock baru, kontrak §15), kalender agenda aktif (§16, tanpa
    field baru). Presentasi/UX + 1 kolom mock acara → TIDAK ada tabel/endpoint
    baru; 121 items tetap. Seluruh ronde **BELUM commit** (working tree).
    Lihat §61.6. Status dokumen tetap `NOT READY`.
[x] User mengesahkan dimulainya fase backend
    → Fase backend sudah berjalan; plan tertua 2026-10-20 (keputusan Product Owner tercatat di
      plan Tahap 1: "backend dulu, frontend menyusul"); dikonfirmasi Owner
      pada sinkronisasi 2026-10-26
[ ] prd.md disetujui final
    → prd.md v2.2 (sinkronisasi teknologi & status backend) MENUNGGU REVIEW Owner
```

> **Update v2.3 (2026-10-26):** syarat 3 kini TERPENUHI; syarat 4 menunggu review Owner
> atas prd.md v2.2. Implementasi backend sudah berjalan (§61.7). Paragraf di bawah adalah
> catatan historis per 2026-10-18.

Saat ini **2 dari 4 syarat terpenuhi (final 2026-10-16; audit terakhir 2026-10-18)**.
Syarat 1 & 2 TERPENUHI final (frontend dinyatakan selesai Owner 2026-10-16;
audit 2026-10-18: 19 halaman, 121 items, ronde 10-17/18 + chatbot tercatat §61.5–§61.6,
**belum commit**). Syarat 3 (Owner mengesahkan fase
backend) & 4 (prd.md final untuk backend) BELUM. Backend tetap **NOT STARTED**
(`Backend/` ada namun kosong, belum ada migration/model/API) sehingga status
dokumen ini tetap `NOT READY` — benar sesuai AGENTS.md §6/§31.