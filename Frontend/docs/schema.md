# DATABASE SCHEMA & ELOQUENT ARCHITECTURE

**Project:** Pasuruan Info — News & Travel Tech Platform
**Schema Version:** 2.2
**Status:** DESIGN COMPLETE · IMPLEMENTATION NOT READY
**Current Phase:** FRONTEND COMPLETE (mock data only; Owner declared "selesai" 2026-10-16; ronde pasca-final 2026-10-17/18 + Chatbot Stage 1 sinkron 2026-10-18 — belum commit) — backend/data masih NOT STARTED
**Backend:** Laravel 12 — Planned, NOT STARTED
**ORM:** Eloquent — Planned
**Database:** MySQL — Planned
**API:** REST API — Planned
**Target Architecture:** Frontend → REST API → Laravel → Eloquent → MySQL

> ⚠ Dokumen ini adalah blueprint arsitektur data, **bukan izin implementasi backend**.
> Fase sekarang adalah frontend dengan mock data. Lihat §69 — Final Schema Status.

---

# 1. Document Purpose

Dokumen ini mendefinisikan struktur data, relasi database, migration order, Eloquent model, API data contract, dan aturan data untuk platform **Pasuruan Info — News & Travel Tech**.

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
Eloquent Model
  ↓
API Resource
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
13. API Resource harus mengekspos data yang memang dibutuhkan frontend.
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
| `articles`           | Berita                           |
| `article_categories` | Kategori berita                  |
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
| `email_verified_at` | TIMESTAMP | nullable            |
| `remember_token`    | VARCHAR   | nullable            |
| `created_at`        | TIMESTAMP |                     |
| `updated_at`        | TIMESTAMP |                     |

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
| `created_at`  | TIMESTAMP     |                                   |
| `updated_at`  | TIMESTAMP     |                                   |

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

```php
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

```php
public function place()
{
    return $this->belongsTo(Place::class);
}
```

### Culinary

```php
public function place()
{
    return $this->belongsTo(Place::class);
}
```

### Culture

```php
public function place()
{
    return $this->belongsTo(Place::class);
}
```

### Event

```php
public function place()
{
    return $this->belongsTo(Place::class);
}
```

Pada sisi `Place`, relasi boleh menggunakan:

```php
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

Dengan MySQL, perhitungan jarak dapat menggunakan:

```sql
ST_Distance_Sphere()
```

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
config/travel.php
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
| `description`        | LONGTEXT     | nullable           |
| `destination_type`   | VARCHAR      | nullable           |
| `status`             | VARCHAR/ENUM | publication status |
| `operational_status` | VARCHAR/ENUM | nullable           |
| `website_url`        | TEXT         | nullable           |
| `contact_phone`      | VARCHAR      | nullable           |
| `featured`           | BOOLEAN      | default false      |
| `published_at`       | TIMESTAMP    | nullable           |
| `created_at`         | TIMESTAMP    |                    |
| `updated_at`         | TIMESTAMP    |                    |

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

Table ini memiliki Eloquent Model khusus:

```text
app/Models/DestinationPrice.php
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
| `created_at`     | TIMESTAMP     |                      |
| `updated_at`     | TIMESTAMP     |                      |

### Relationship

Destination:

```php
public function prices()
{
    return $this->hasMany(DestinationPrice::class);
}
```

DestinationPrice:

```php
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
| `description`        | LONGTEXT     | nullable           |
| `culinary_type`      | VARCHAR      | nullable           |
| `price_range`        | VARCHAR      | nullable           |
| `status`             | VARCHAR/ENUM | publication status |
| `operational_status` | VARCHAR/ENUM | nullable           |
| `featured`           | BOOLEAN      | default false      |
| `website_url`        | TEXT         | nullable           |
| `contact_phone`      | VARCHAR      | nullable           |
| `published_at`       | TIMESTAMP    | nullable           |
| `created_at`         | TIMESTAMP    |                    |
| `updated_at`         | TIMESTAMP    |                    |

### Relationship

```php
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
| `created_at`     | TIMESTAMP     |               |
| `updated_at`     | TIMESTAMP     |               |

### Category Rule

`category` mengelompokkan menu untuk kebutuhan filter UI. Nilai yang
disepakati pada fase frontend (mock data): `Makanan`, `Minuman`, `Cemilan`.
Selaras dengan tombol filter pada `menu_kuliner.html`.

### Relationship

```php
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
| `description`       | LONGTEXT     | nullable           |
| `culture_type`      | VARCHAR      | nullable           |
| `historical_period` | VARCHAR      | nullable           |
| `status`            | VARCHAR/ENUM | publication status |
| `featured`          | BOOLEAN      | default false      |
| `published_at`      | TIMESTAMP    | nullable           |
| `created_at`        | TIMESTAMP    |                    |
| `updated_at`        | TIMESTAMP    |                    |

### Relationship

```php
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
| `description`       | LONGTEXT     | nullable           |
| `event_type`        | VARCHAR      | nullable           |
| `status`            | VARCHAR/ENUM | publication status |
| `organizer_name`    | VARCHAR      | nullable           |
| `organizer_phone`   | VARCHAR      | nullable           |
| `website_url`       | TEXT         | nullable           |
| `featured`          | BOOLEAN      | default false      |
| `capacity`          | INTEGER      | nullable           |
| `published_at`      | TIMESTAMP    | nullable           |
| `created_at`        | TIMESTAMP    |                    |
| `updated_at`        | TIMESTAMP    |                    |

### Relationship

```php
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
| `starts_at`  | DATETIME     | required |
| `ends_at`    | DATETIME     | nullable |
| `status`     | VARCHAR/ENUM | nullable |
| `notes`      | TEXT         | nullable |
| `created_at` | TIMESTAMP    |          |
| `updated_at` | TIMESTAMP    |          |

### Relationship

```php
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
| `created_at`       | TIMESTAMP     |              |
| `updated_at`       | TIMESTAMP     |              |

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
| `content`      | LONGTEXT     | required                   |
| `status`       | VARCHAR/ENUM | publication status         |
| `featured`     | BOOLEAN      | default false              |
| `published_at` | TIMESTAMP    | nullable                   |
| `created_at`   | TIMESTAMP    |                            |
| `updated_at`   | TIMESTAMP    |                            |

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

## Table: `article_categories`

### Columns

| Column       | Type           |
| ------------ | -------------- |
| `id`         | BIGINT         |
| `name`       | VARCHAR        |
| `slug`       | VARCHAR UNIQUE |
| `created_at` | TIMESTAMP      |
| `updated_at` | TIMESTAMP      |

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
| `created_at`    | TIMESTAMP    |               |
| `updated_at`    | TIMESTAMP    |               |

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

```php
public function media()
{
    return $this->morphMany(Media::class, 'mediable');
}
```

Media:

```php
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
| `day_of_week`   | TINYINT   |
| `opens_at`      | TIME      |
| `closes_at`     | TIME      |
| `is_closed`     | BOOLEAN   |
| `is_24_hours`   | BOOLEAN   |
| `sort_order`    | INT       |
| `created_at`    | TIMESTAMP |
| `updated_at`    | TIMESTAMP |

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
| `created_at`  | TIMESTAMP |
| `updated_at`  | TIMESTAMP |

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
| `created_at`      | TIMESTAMP |
| `updated_at`      | TIMESTAMP |

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
| `verified_at`     | TIMESTAMP nullable |
| `notes`           | TEXT nullable      |
| `created_at`      | TIMESTAMP          |
| `updated_at`      | TIMESTAMP          |

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

```php
public function verification()
{
    return $this->morphOne(Verification::class, 'verifiable');
}
```

Jika di masa depan membutuhkan history/audit:

```php
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
Eloquent Model
   ↓
Relationship
   ↓
API Resource
   ↓
REST API
   ↓
Frontend
```

Contoh Eloquent:

```php
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

API Resource harus mengekspos informasi yang relevan.

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
Eloquent relationship
   ↓
API Resource
   ↓
Frontend UI
```

Tidak boleh berhenti hanya pada:

```text
Database → Eloquent
```

---

# 28. API Resource Contract

API Resource bertanggung jawab menentukan data yang dikirim ke frontend.

Jangan mengandalkan:

```php
$model->toArray()
```

sebagai kontrak API utama untuk seluruh aplikasi.

Gunakan API Resource untuk struktur response yang stabil.

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
| `created_at` | TIMESTAMP      |
| `updated_at` | TIMESTAMP      |

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
| `rating`          | TINYINT          |
| `title`           | VARCHAR nullable |
| `body`            | TEXT             |
| `status`          | VARCHAR/ENUM     |
| `created_at`      | TIMESTAMP        |
| `updated_at`      | TIMESTAMP        |

Rating:

```text
1–5
```

### Relationship

```php
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
| `created_at`        | TIMESTAMP |
| `updated_at`        | TIMESTAMP |

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
| `created_at`  | TIMESTAMP     |
| `updated_at`  | TIMESTAMP     |

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
| `created_at`    | TIMESTAMP     |
| `updated_at`    | TIMESTAMP     |

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
| `remind_at`           | DATETIME     |
| `status`              | VARCHAR/ENUM |
| `created_at`          | TIMESTAMP    |
| `updated_at`          | TIMESTAMP    |

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
| `created_at`    | TIMESTAMP |
| `updated_at`    | TIMESTAMP |

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
| `starts_at`  | DATETIME nullable |
| `ends_at`    | DATETIME nullable |
| `created_at` | TIMESTAMP         |
| `updated_at` | TIMESTAMP         |

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
Laravel API
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

Filter dilakukan melalui query Eloquent/API.

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

# 46. Eloquent Model Directory

Struktur model minimal:

```text
app/
└── Models/
    ├── User.php
    ├── Place.php
    │
    ├── Destination.php
    ├── DestinationPrice.php
    │
    ├── Culinary.php
    ├── CulinaryMenu.php
    │
    ├── Culture.php
    │
    ├── Event.php
    ├── EventOccurrence.php
    ├── EventTicket.php
    │
    ├── Article.php
    ├── ArticleCategory.php
    │
    ├── Media.php
    ├── OpeningHour.php
    ├── Source.php
    ├── Verification.php
    │
    ├── Tag.php
    ├── Review.php
    ├── Bookmark.php
    │
    ├── TripPlan.php
    ├── TripPlanItem.php
    ├── EventReminder.php
    │
    ├── ContentRelation.php
    └── Advertisement.php
```

`DestinationPrice.php` wajib ada dan tidak boleh hanya dianggap sebagai child table tanpa model.

---

# 47. Core Eloquent Relationships

## User

```php
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

```php
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

```php
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

```php
public function destination()
{
    return $this->belongsTo(Destination::class);
}
```

---

## Culinary

```php
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

```php
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

```php
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

```php
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

```php
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

```php
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

Jangan menambahkan SoftDeletes hanya karena tersedia.

---

# 52. API Architecture

Current architecture:

```text
Frontend
   ↓
REST API
   ↓
Laravel Controller
   ↓
Service / Query Logic
   ↓
Eloquent
   ↓
MySQL
```

API Resource:

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

Gunakan eager loading agar tidak menimbulkan N+1 query.

Contoh konseptual:

```php
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
API Resource
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
API Resource
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

Status keseluruhan: **backend belum dimulai**. Fokus sekarang adalah frontend.

Dokumen ini tetap written sebagai blueprint arsitektur data (sudah selesai dan
diverifikasi secara internal), tetapi status implementasinya `NOT READY` sampai
user mengesahkan dimulainya fase backend.

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

Status: **DESIGNED — NOT IMPLEMENTED**. Belum ada tabel, migration, atau model.
## Planned Backend

```text
Laravel 12
Eloquent
MySQL
REST API
API Resource
Query Layer
```

Status: **PLANNED — NOT STARTED**. Belum ada satu baris kode backend pun di repository.

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

# 63. Eloquent Definition of Done

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
* [ ] API Resource tersedia untuk public content.

---

# 64. API Resource Definition of Done

Untuk content yang memiliki source/verification:

* [ ] Source tersedia pada Eloquent.
* [ ] Verification tersedia pada Eloquent.
* [ ] API Resource mengekspos source.
* [ ] API Resource mengekspos verification.
* [ ] Verification status dapat dibaca frontend.
* [ ] `verified_at` dapat ditampilkan frontend.
* [ ] Source URL dapat diakses frontend.
* [ ] Tidak perlu frontend melakukan query langsung ke database.
* [ ] Struktur JSON konsisten.

Target:

```text
Database
   ↓
Eloquent
   ↓
Resource
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

API Resource harus secara eksplisit menentukan data public.

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
                                          API Resource
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
Eloquent
 ↓
API Resource
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
✓ API Resource wajib mengekspos verification/source
✓ Article memiliki satu primary category
✓ Migration order mengikuti dependency
```

**Status dokumen: NOT READY — FRONTEND PHASE**

```text
┌────────────────────────────────────────────────────────────┐
│ SCHEMA DOCUMENT                                              │
│                                                            │
│ Design completeness   : COMPLETE (blueprint architecture)  │
│ Implementation status : NOT READY                          │
│                                                            │
│ Reason : Project sedang berada pada FRONTEND PHASE.        │
│          User menetapkan fokus pada pembangunan halaman     │
│          frontend sebelum backend.                         │
│                                                            │
│ YANG DIJALANKAN :                                           │
│   Frontend HTML5 + Tailwind + Vanilla JavaScript            │
│   Mock / placeholder data lokal                             │
│                                                            │
│ YANG TIDAK DIJALANKAN :                                     │
│   Laravel · Migration · Eloquent · MySQL · REST API         │
│   · API Resource · Seeder · Factory                         │
│                                                            │
│ ⚠ Dokumen ini HANYA acuan arsitektur data.                 │
│ ⚠ Dokumen ini BUKAN izin implementasi backend.             │
│                                                            │
│ Lihat : AGENTS.md §6 (Out of Scope), §31 (Schema Rule)     │
└────────────────────────────────────────────────────────────┘
```

Schema ini menjadi acuan database dan Eloquent **ketika** backend Laravel mulai
dikerjakan. Saat ini belum diimplementasikan.

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
Mengikuti struktur API Resource (§28) sebagai pola mock data
Menentukan nesting: place, media, prices, opening_hours, sources, verification
Menjaga mock data tetap konsisten dengan bentuk schema
```

`UNKNOWN` — TIDAK diizinkan pada fase ini:

```text
Menulis migration
Menulis model Eloquent
Menulis controller
Menulis endpoint API
Membuat tabel di database
Menjalankan query
```

## Urutan aktivasi

```text
SEKARANG      → Frontend + mock data          (Phase 1)
NANTI         → Backend Laravel               (Phase 7 / §48 prd.md)
                    ↓
                  Migration (§48)
                    ↓
                  Eloquent model (§46, §47)
                    ↓
                  Seeder / Factory
                    ↓
                  REST API + API Resource (§52, §28)
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
[ ] User mengesahkan dimulainya fase backend
[ ] prd.md disetujui final
```

Saat ini **2 dari 4 syarat terpenuhi (final 2026-10-16; audit terakhir 2026-10-18)**.
Syarat 1 & 2 TERPENUHI final (frontend dinyatakan selesai Owner 2026-10-16;
audit 2026-10-18: 19 halaman, 121 items, ronde 10-17/18 + chatbot tercatat §61.5–§61.6,
**belum commit**). Syarat 3 (Owner mengesahkan fase
backend) & 4 (prd.md final untuk backend) BELUM. Backend tetap **NOT STARTED**
(`Backend/` ada namun kosong, belum ada migration/model/API) sehingga status
dokumen ini tetap `NOT READY` — benar sesuai AGENTS.md §6/§31.
