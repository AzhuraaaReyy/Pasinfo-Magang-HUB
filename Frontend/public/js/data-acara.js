/**
 * DATA ACARA — Pasuruan Info (DATA ASLI)
 * ======================================
 * STATUS: 16 event asli, disalin dari Backend/cmd/seed/data/domains/data-acara.json
 * (meta.generated_at 2026-10-27, sumber "riset-editorial") — sama dengan tabel
 * events di database (keputusan Owner 2026-10-28: data acara = 16 event ini). Disinkronkan
 * 2026-11-02 (Owner K6-04 opsi X1) agar tautan kartu chatbot `detail_acara.html?slug=` cocok
 * dengan slug dari API. Data mock lama (16 event "*-mock", jangkar "hari ini", venue mock)
 * dihapus.
 *
 * - `occurrences[]`: jadwal asli; `status` = completed (terlaksana), past_unconfirmed
 *   (tanggal kalender tanpa laporan), ongoing (pameran tetap), expected (perkiraan).
 *   Status tampilan (berlangsung/akan datang/selesai) dihitung UI dari tanggal.
 * - `tickets[].price` 0 atau null = Gratis (UI); booking/payment di luar scope (prd.md §19.2).
 * - `media[].url` null → UI memakai foto sementara bergilir (belum ada foto asli).
 * - `verification.status`: terverifikasi / jadwal-resmi / jadwal-terdaftar (nilai dari seed
 *   dan database; label tampilan di pages/detail-acara.js).
 * - `sources[]` dibentuk dari `references` seed (penerbit + URL artikel), bukan sumber default.
 * - `googleMapsUrl` diisi dari koordinat place bila kosong (pencarian Maps, fungsional).
 *
 * ACARA_REGIONS dan ACARA_CATEGORIES di bawah tetap milik frontend (peta zona dan tab
 * kategori mockup `public/assets/mockup/acara.png`); id-nya sama dengan seed.
 *
 * Konvensi file mengikuti `public/js/data-wisata.js` dan
 * `public/js/data-kuliner.js`:
 * window.PASINFO_ACARA = { categories, events, regions }.
 */

const ACARA_REGIONS = [
  {
    id: "kota-pasuruan",
    slug: "kota-pasuruan",
    name: "Kota Pasuruan",
    color: "#7c3aed",
    center: {
      latitude: -7.645,
      longitude: 112.907,
    },
    zoom: 13,
    short_description: "Wilayah administrasi Kota Pasuruan.",
  },
  {
    id: "pasuruan-timur",
    slug: "pasuruan-timur",
    name: "Pasuruan Timur",
    color: "#dc2626",
    center: {
      latitude: -7.636,
      longitude: 112.951,
    },
    zoom: 12,
    short_description: "Wilayah timur Kabupaten Pasuruan.",
  },
  {
    id: "pasuruan-barat",
    slug: "pasuruan-barat",
    name: "Pasuruan Barat",
    color: "#16a34a",
    center: {
      latitude: -7.662,
      longitude: 112.862,
    },
    zoom: 12,
    short_description: "Wilayah barat Kabupaten Pasuruan.",
  },
  {
    id: "pasuruan-utara",
    slug: "pasuruan-utara",
    name: "Pasuruan Utara",
    color: "#2563eb",
    center: {
      latitude: -7.595,
      longitude: 112.907,
    },
    zoom: 12,
    short_description: "Wilayah utara Kabupaten Pasuruan.",
  },
  {
    id: "pasuruan-selatan",
    slug: "pasuruan-selatan",
    name: "Pasuruan Selatan",
    color: "#ea580c",
    center: {
      latitude: -7.719,
      longitude: 112.919,
    },
    zoom: 12,
    short_description: "Wilayah selatan Kabupaten Pasuruan.",
  },
];

const ACARA_CATEGORIES = [
  { id: "kesenian", slug: "kesenian", name: "Kesenian" },
  { id: "tradisi", slug: "tradisi", name: "Tradisi" },
  { id: "sejarah", slug: "sejarah", name: "Sejarah" },
  { id: "museum", slug: "museum", name: "Museum" },
];
/* 16 event asli (lihat header). */
const ACARA_EVENTS = [
  {
    "id": "kirab-hari-jadi-kota-pasuruan",
    "slug": "kirab-hari-jadi-kota-pasuruan",
    "name": "Kirab Pataka Hari Jadi Kota Pasuruan",
    "categoryId": "sejarah",
    "regionId": "kota-pasuruan",
    "event_type": "sejarah",
    "short_description": "kirab pataka tahunan setiap 8 Februari untuk memperingati hari jadi Kota Pasuruan",
    "description": "Kirab Pataka adalah puncak peringatan Hari Jadi Kota Pasuruan yang jatuh setiap 8 Februari. Pada peringatan ke-340 tahun 2026, iring-iringan berangkat dari depan Kantor Wali Kota dan berakhir di Taman Harmoni, lalu ditutup dengan penyerahan bumbung pataka dan pembacaan naskah pataka sebagai penghormatan pada sejarah kota.\n\nKirab 2026 dimeriahkan atraksi barongsai, pencak silat, dan tari tradisional, dengan hiburan penutup dari pelawak Kirun dan Kadir. Pada momen yang sama, Pemerintah Kota Pasuruan menetapkan nama baru untuk dua ruang publik, yaitu Taman Harmoni dan Gedung Groedo. Setahun sebelumnya, peringatan ke-339 (8 Februari 2025) dipusatkan di Gedung Kesenian Darmoyudo dan juga diisi Festival Lansia.\n\nPeringatan ke-341 diperkirakan jatuh pada 8 Februari 2027 karena tanggal hari jadi bersifat tetap. Rute dan susunan acaranya belum diumumkan, jadi pantau pengumuman resmi Pemerintah Kota Pasuruan.",
    "status": "published",
    "featured": true,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Start: Kantor Wali Kota Pasuruan, Jl. Pahlawan No. 28; finish: Taman Harmoni, Kota Pasuruan",
    "place": {
      "latitude": -7.6474192,
      "longitude": 112.9084766,
      "precision": "start-point"
    },
    "occurrences": [
      {
        "id": "kirab-hari-jadi-kota-pasuruan-occ-1",
        "starts_at": "2025-02-08T00:00:00+07:00",
        "ends_at": "2025-02-08T23:59:00+07:00",
        "status": "completed",
        "all_day": true,
        "notes": "Hari Jadi ke-339. Acara dipusatkan di Gedung Kesenian Darmoyudo; jam tidak tercantum."
      },
      {
        "id": "kirab-hari-jadi-kota-pasuruan-occ-2",
        "starts_at": "2026-02-08T00:00:00+07:00",
        "ends_at": "2026-02-08T23:59:00+07:00",
        "status": "completed",
        "all_day": true,
        "notes": "Hari Jadi ke-340. Rute Kantor Wali Kota → Taman Harmoni; jam tidak tercantum."
      },
      {
        "id": "kirab-hari-jadi-kota-pasuruan-occ-3",
        "starts_at": "2027-02-08T00:00:00+07:00",
        "ends_at": "2027-02-08T23:59:00+07:00",
        "status": "expected",
        "all_day": true,
        "notes": "Hari Jadi ke-341. PERKIRAAN berdasarkan tanggal hari jadi tetap; jadwal resmi belum diumumkan."
      }
    ],
    "tickets": [],
    "organizer_name": "Pemerintah Kota Pasuruan (Disparpora Kota Pasuruan)",
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Kirab Pataka Hari Jadi Kota Pasuruan (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.6474192,112.9084766&query_place_id=ChIJex3ZdQnG1y0RzI87Rjxo-hc",
    "source": "riset-editorial",
    "verification": {
      "status": "terverifikasi",
      "verified_at": "2026-10-27",
      "note": "Edisi 2025 & 2026 terverifikasi. Occurrence 2027 berstatus 'expected' (perkiraan, belum diumumkan). Pin = titik start."
    },
    "sources": [
      {
        "id": "kirab-hari-jadi-kota-pasuruan-ref-1",
        "name": "Disparpora Kota Pasuruan",
        "title": "Peringatan Hari Jadi Kota Pasuruan ke-340",
        "source_type": "reference",
        "url": "https://disparpora.pasuruankota.go.id/2026/02/10/hari-jadi-kota-pasuruan/",
        "published_at": "2026-02-10"
      },
      {
        "id": "kirab-hari-jadi-kota-pasuruan-ref-2",
        "name": "beritajatim.com",
        "title": "Kirab budaya Hari Jadi ke-340 Kota Pasuruan",
        "source_type": "reference",
        "url": "https://beritajatim.com/?p=1473640",
        "published_at": "2026-02-08"
      },
      {
        "id": "kirab-hari-jadi-kota-pasuruan-ref-3",
        "name": "Disparpora Kota Pasuruan",
        "title": "Perayaan Hari Jadi Kota Pasuruan ke-339",
        "source_type": "reference",
        "url": "https://disparpora.pasuruankota.go.id/2025/02/10/perayaan-hari-jadi-kota-pasuruan-ke-339/",
        "published_at": "2025-02-10"
      }
    ]
  },
  {
    "id": "pameran-tetap-museum-cunggrang",
    "slug": "pameran-tetap-museum-cunggrang",
    "name": "Pameran Tetap Museum Cunggrang: Diorama Sejarah Pasuruan",
    "categoryId": "museum",
    "regionId": "pasuruan-barat",
    "event_type": "museum",
    "short_description": "pameran tetap koleksi dan diorama sejarah Pasuruan di Museum Cunggrang, kawasan Masjid Cheng Hoo Pandaan",
    "description": "Museum Cunggrang adalah museum daerah Kabupaten Pasuruan yang dikelola Dinas Pendidikan dan Kebudayaan dan diresmikan pada 5 Juli 2019. Museum ini berada di kawasan Pasar Wisata Cheng Hoo, Pandaan, dan menyimpan sekitar 480 benda, mulai dari artefak, replika, keris, umpak, lingga-yoni, hingga foto dan dokumen sejarah.\n\nSejak awal 2025, lantai dua museum menampilkan enam diorama sejarah Pasuruan: Prasasti Cunggrang, Surapati dan Kapiten Tack, Kapiten Cina, Pelantikan Bupati Pasuruan, Pabrik Gula Kedawung, dan Pasar 1930. Koleksi juga bertambah dengan Kepala Kala dan Makara dari Candi Kebo Ireng, serta arca Ganesha temuan di halaman eks Kantor Kawedanan Bangil yang resmi menjadi koleksi pada September 2026.\n\nPameran ini bersifat tetap, bukan acara satu hari. Informasi kunjungan dari Tugujatim (2024) menyebut jam buka Senin–Jumat 08.00–16.00 WIB dan tiket masuk gratis; jam buka di Google Maps berbeda, jadi sebaiknya konfirmasi ke pengelola sebelum datang.",
    "status": "published",
    "featured": true,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Museum Cunggrang (Museum Kabupaten Pasuruan), Jl. Raya Kasri No. 1, Petungasri, Kec. Pandaan, Kab. Pasuruan",
    "place": {
      "latitude": -7.652506,
      "longitude": 112.6867461,
      "precision": "exact"
    },
    "occurrences": [
      {
        "id": "pameran-tetap-museum-cunggrang-occ-1",
        "starts_at": "2025-01-09T08:00:00+07:00",
        "ends_at": null,
        "status": "ongoing",
        "all_day": false,
        "notes": "Pameran tetap. Tanggal mulai = tanggal berita display diorama (Jan 2025). Jam kunjungan: Senin–Jumat 08.00–16.00 WIB (sumber 2024, perlu konfirmasi)."
      }
    ],
    "tickets": [
      {
        "id": "pameran-tetap-museum-cunggrang-masuk",
        "name": "Tiket masuk",
        "price": 0,
        "description": "Gratis (Tugujatim, 2024; perlu konfirmasi).",
        "ticket_url": null,
        "registration_url": null,
        "available": true
      }
    ],
    "organizer_name": "Dinas Pendidikan dan Kebudayaan Kabupaten Pasuruan",
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Pameran Tetap Museum Cunggrang: Diorama Sejarah Pasuruan (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.652506,112.6867461&query_place_id=ChIJ0-H1dEzZ1y0RIajPrbcyF9g",
    "source": "riset-editorial",
    "verification": {
      "status": "terverifikasi",
      "verified_at": "2026-10-27",
      "note": "Isi koleksi & diorama terverifikasi. Jam buka dan tiket dari sumber 2024 dan berbeda dengan Google Maps; perlu konfirmasi."
    },
    "sources": [
      {
        "id": "pameran-tetap-museum-cunggrang-ref-1",
        "name": "Radar Bromo",
        "title": "Koleksi Museum Cungrang di Kawasan Pasar Wisata Cheng Hoo Pandaan Bertambah, Tengok Apa Saja",
        "source_type": "reference",
        "url": "https://radarbromo.jawapos.com/pandaan/1005506200/koleksi-museum-cungrang-di-kawasan-pasar-wisata-cheng-hoo-pandaan-bertambah-tengok-apa-saja",
        "published_at": "2025-01-09"
      },
      {
        "id": "pameran-tetap-museum-cunggrang-ref-2",
        "name": "Radar Bromo",
        "title": "Arca Ganesha Jadi Koleksi Baru di Museum Cunggrang Pandaan",
        "source_type": "reference",
        "url": "https://radarbromo.jawapos.com/pandaan/2609250015/arca-ganesha-jadi-koleksi-baru-di-museum-cunggrang-pandaan",
        "published_at": "2026-09-25"
      },
      {
        "id": "pameran-tetap-museum-cunggrang-ref-3",
        "name": "Sistem Registrasi Nasional Museum (Kemenbud)",
        "title": "Museum Cunggrang Kabupaten Pasuruan",
        "source_type": "reference",
        "url": "https://museum.kemenbud.go.id/museum/profile/museum+cunggrang+kabupaten+pasuruan",
        "published_at": null
      },
      {
        "id": "pameran-tetap-museum-cunggrang-ref-4",
        "name": "Tugu Jatim",
        "title": "Wisata Edukasi: Menyelami Sejarah Pasuruan di Museum Cunggrang",
        "source_type": "reference",
        "url": "https://tugujatim.id/wisata-edukasi-sejarah-pasuruan-museum-cunggrang/",
        "published_at": "2024-12"
      }
    ]
  },
  {
    "id": "pekan-raya-pasuruan",
    "slug": "pekan-raya-pasuruan",
    "name": "Pekan Raya Pasuruan",
    "categoryId": "kesenian",
    "regionId": "pasuruan-barat",
    "event_type": "kesenian",
    "short_description": "pekan raya tahunan di Taman Candra Wilwatikta, Pandaan, berisi konser gratis, kuliner, dan pameran UMKM",
    "description": "Pekan Raya Pasuruan adalah festival tahunan Kabupaten Pasuruan yang memadukan pameran pembangunan, UMKM, seni budaya, dan hiburan rakyat. Edisi 2026 digelar selama sepekan, 21–27 September 2026, di Amphiteater Taman Candra Wilwatikta, Pandaan.\n\nPengunjung edisi 2026 bisa menikmati konser musik gratis dengan bintang tamu berbeda setiap malam; malam pembukaannya diisi Ndarboy Genk. Area pameran ditata dalam enam zona dan diisi 118 peserta, mulai dari UMKM, perusahaan swasta, perbankan, hingga instansi pemerintah.\n\nUntuk edisi 2025, sumber tidak sepakat: kalender event Jatim versi detikJatim mencantumkan 24–30 September 2025, sedangkan SIDITA Disbudpar Jatim mencantumkan 24–30 Desember 2025. Jadwal edisi 2027 belum diumumkan.",
    "status": "published",
    "featured": true,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Amphiteater Taman Candra Wilwatikta, Jl. Dr. Soetomo No. 2, Sumber Gedang, Kec. Pandaan, Kab. Pasuruan",
    "place": {
      "latitude": -7.6581814,
      "longitude": 112.6750356,
      "precision": "exact"
    },
    "occurrences": [
      {
        "id": "pekan-raya-pasuruan-occ-1",
        "starts_at": "2025-09-24T00:00:00+07:00",
        "ends_at": "2025-09-30T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Tanggal versi kalender detikJatim. SIDITA mencantumkan 24–30 Desember 2025."
      },
      {
        "id": "pekan-raya-pasuruan-occ-2",
        "starts_at": "2026-09-21T00:00:00+07:00",
        "ends_at": "2026-09-27T23:59:00+07:00",
        "status": "completed",
        "all_day": true,
        "notes": "Jam operasional tidak tercantum di sumber."
      }
    ],
    "tickets": [
      {
        "id": "pekan-raya-pasuruan-konser",
        "name": "Konser malam",
        "price": 0,
        "description": "Konser musik gratis (edisi 2026).",
        "ticket_url": null,
        "registration_url": null,
        "available": false
      }
    ],
    "organizer_name": "Pemerintah Kabupaten Pasuruan (panitia Pekan Raya Pasuruan)",
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Pekan Raya Pasuruan (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.6581814,112.6750356&query_place_id=ChIJMwDuP8nZ1y0RL2hMiE_PmnA",
    "source": "riset-editorial",
    "verification": {
      "status": "terverifikasi",
      "verified_at": "2026-10-27",
      "note": "Edisi 2026 terverifikasi (detikJatim). Tanggal 2025 berbeda antar sumber. Penyelenggara disimpulkan dari status acara pemkab; nama dinas pelaksana belum dicek."
    },
    "sources": [
      {
        "id": "pekan-raya-pasuruan-ref-1",
        "name": "detikJatim",
        "title": "Pekan Raya Pasuruan 2026: Konser Gratis, Kuliner hingga Expo UMKM",
        "source_type": "reference",
        "url": "https://www.detik.com/jatim/wisata/d-8675961/pekan-raya-pasuruan-2026-konser-gratis-kuliner-hingga-expo-umkm",
        "published_at": "2026-09"
      },
      {
        "id": "pekan-raya-pasuruan-ref-2",
        "name": "SIDITA Disbudpar Jatim",
        "title": "Pekan Raya Pasuruan",
        "source_type": "reference",
        "url": "https://sidita.disbudpar.jatimprov.go.id/event/detail/4c60a290b9726523fd31b4b82b0488e4bc54ad81f5bca97f0305d498d156bf7ea781cacaf10bad26e16e348e5b28bf7e258b8a42c6e52150d1e94b548e7ae668",
        "published_at": null
      },
      {
        "id": "pekan-raya-pasuruan-ref-3",
        "name": "detikJatim",
        "title": "Agenda Seru di Jawa Timur September 2025, Catat Tanggalnya!",
        "source_type": "reference",
        "url": "https://www.detik.com/jatim/budaya/d-8107583/agenda-seru-di-jawa-timur-september-2025-catat-tanggalnya",
        "published_at": "2025-09-12"
      }
    ]
  },
  {
    "id": "bangil-carnival",
    "slug": "bangil-carnival",
    "name": "Bangil Carnival (Pasuruan Carnival)",
    "categoryId": "kesenian",
    "regionId": "pasuruan-utara",
    "event_type": "kesenian",
    "short_description": "karnaval budaya tahunan peringatan Hari Jadi Kabupaten Pasuruan yang berakhir di Alun-Alun Bangil",
    "description": "Bangil Carnival, yang pada 2026 juga disebut Pasuruan Carnival, adalah parade karnaval seni dan budaya untuk memperingati Hari Jadi Kabupaten Pasuruan. Pesertanya datang dari berbagai kecamatan, instansi, sekolah, dan komunitas seni dengan kreasi kostum, tarian, dan atraksi bertema mata pencaharian, budaya, serta legenda lokal.\n\nEdisi 2026 mengusung tema \"Maha Karya Pesona Budaya Nusantara\" dan berpusat di Alun-Alun Bangil, gratis untuk penonton. Pada edisi 2025, rute karnaval tercatat dimulai dari Bangkodir dan berakhir di Alun-Alun Bangil.\n\nTanggal edisi 2026 sedikit berbeda antar sumber resmi: situs OnTrip Pemkab Pasuruan mencantumkan 20 September 2026, sedangkan SIDITA Disbudpar Jatim mencantumkan 21 September 2026. Jam mulai tidak tercantum.",
    "status": "published",
    "featured": true,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Alun-Alun Bangil, Jl. Alun-Alun Barat, Kauman, Kec. Bangil, Kab. Pasuruan (edisi 2025: start Bangkodir)",
    "place": {
      "latitude": -7.5978314,
      "longitude": 112.7846005,
      "precision": "finish-point"
    },
    "occurrences": [
      {
        "id": "bangil-carnival-occ-1",
        "starts_at": "2025-09-21T00:00:00+07:00",
        "ends_at": "2025-09-21T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Dari kalender event Jatim (detikJatim)."
      },
      {
        "id": "bangil-carnival-occ-2",
        "starts_at": "2026-09-20T00:00:00+07:00",
        "ends_at": "2026-09-20T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Tanggal versi OnTrip Pemkab Pasuruan; SIDITA mencantumkan 21 Sep 2026."
      }
    ],
    "tickets": [
      {
        "id": "bangil-carnival-penonton",
        "name": "Penonton umum",
        "price": 0,
        "description": "Gratis (OnTrip Pemkab Pasuruan, edisi 2026).",
        "ticket_url": null,
        "registration_url": null,
        "available": false
      }
    ],
    "organizer_name": "Pemerintah Kabupaten Pasuruan",
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Bangil Carnival (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.5978314,112.7846005&query_place_id=ChIJkVpsd2jb1y0RceLYnqVdsFg",
    "source": "riset-editorial",
    "verification": {
      "status": "jadwal-resmi",
      "verified_at": "2026-10-27",
      "note": "Edisi 2026 tercantum di dua kanal resmi pemerintah (tanggal berbeda 1 hari). Laporan berita pelaksanaan 2026 belum dicek."
    },
    "sources": [
      {
        "id": "bangil-carnival-ref-1",
        "name": "OnTrip Pemkab Pasuruan",
        "title": "Pasuruan Carnival 2026",
        "source_type": "reference",
        "url": "https://ontrip.pasuruankab.go.id/event/pasuruan-carnival-2026",
        "published_at": null
      },
      {
        "id": "bangil-carnival-ref-2",
        "name": "SIDITA Disbudpar Jatim",
        "title": "Bangil Carnival 2026",
        "source_type": "reference",
        "url": "https://sidita.disbudpar.jatimprov.go.id/event/detail/3cb4f567379deb5238615753ead3e165e8a6e10a5eefc0385915c84a5b9a01b990e4f9718f3917ea755dd2b0bdba2395cc683704bfae322e7252aa315ed07246",
        "published_at": null
      },
      {
        "id": "bangil-carnival-ref-3",
        "name": "detikJatim",
        "title": "Agenda Seru di Jawa Timur September 2025, Catat Tanggalnya!",
        "source_type": "reference",
        "url": "https://www.detik.com/jatim/budaya/d-8107583/agenda-seru-di-jawa-timur-september-2025-catat-tanggalnya",
        "published_at": "2025-09-12"
      }
    ]
  },
  {
    "id": "dream-desire-fest",
    "slug": "dream-desire-fest",
    "name": "Dream Desire Fest (DD Fest)",
    "categoryId": "kesenian",
    "regionId": "pasuruan-barat",
    "event_type": "kesenian",
    "short_description": "festival musik berskala besar di Taman Candra Wilwatikta dengan Sal Priadi, Coldiac, Ndarboy Genk, dan Neova",
    "description": "Dream Desire Fest adalah festival musik yang digelar promotor swasta di Kabupaten Pasuruan. Edisi kedua berlangsung pada 12 September 2026 di Taman Candra Wilwatikta, Pandaan.\n\nDeretan penampil edisi 2026 meliputi Sal Priadi, Coldiac, Ndarboy Genk, dan Neova, dengan target 5.000–7.000 penonton. Menjelang acara, promotor berkoordinasi dengan pemerintah daerah dan kepolisian untuk penataan venue dan keamanan.\n\nHarga tiket dan jam pertunjukan tidak tercantum di sumber yang ditemukan, dan jadwal edisi berikutnya belum diumumkan.",
    "status": "published",
    "featured": false,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Taman Candra Wilwatikta, Jl. Dr. Soetomo No. 2, Sumber Gedang, Kec. Pandaan, Kab. Pasuruan",
    "place": {
      "latitude": -7.6581814,
      "longitude": 112.6750356,
      "precision": "exact"
    },
    "occurrences": [
      {
        "id": "dream-desire-fest-occ-1",
        "starts_at": "2026-09-12T00:00:00+07:00",
        "ends_at": "2026-09-12T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Jam tidak tercantum di sumber (artikel pra-acara, Juli 2026)."
      }
    ],
    "tickets": [],
    "organizer_name": "Promotor Dream Desire Fest",
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Dream Desire Fest (DD Fest) (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.6581814,112.6750356&query_place_id=ChIJMwDuP8nZ1y0RL2hMiE_PmnA",
    "source": "riset-editorial",
    "verification": {
      "status": "jadwal-terdaftar",
      "verified_at": "2026-10-27",
      "note": "Sumber berupa artikel pra-acara; laporan pelaksanaan belum dicek. Nama perusahaan promotor tidak disebut di sumber."
    },
    "sources": [
      {
        "id": "dream-desire-fest-ref-1",
        "name": "beritajatim.com",
        "title": "Dream Desire Fest 2026 Siap Guncang Pasuruan, Sal Priadi hingga Ndarboy Genk Bakal Tampil",
        "source_type": "reference",
        "url": "https://beritajatim.com/dream-desire-fest-2026-siap-guncang-pasuruan-sal-priadi-hingga-ndarboy-genk-bakal-tampil",
        "published_at": "2026-07-25"
      }
    ]
  },
  {
    "id": "festival-perahu-dayung-kedunglarangan",
    "slug": "festival-perahu-dayung-kedunglarangan",
    "name": "Festival Dayung dan Perahu Naga Kali Kedunglarangan",
    "categoryId": "tradisi",
    "regionId": "pasuruan-utara",
    "event_type": "tradisi",
    "short_description": "festival perahu dayung selama dua hari di Kali Kedunglarangan, Bangil",
    "description": "Festival Dayung dan Perahu Naga adalah lomba balap perahu tradisional di Kali Kedunglarangan, Kecamatan Bangil. Menurut sistem event Disbudpar Jawa Timur (SIDITA), festival ini bertujuan melestarikan budaya maritim pesisir sekaligus memperkenalkan olahraga perahu naga.\n\nFestival serupa pernah digelar pada 2019 dan direncanakan masuk kalender wisata tahunan Kabupaten Pasuruan. Kalender event Jatim mencatat edisi 27–28 September 2025, sedangkan SIDITA mencantumkan edisi 1 September 2026.\n\nTitik lomba yang persis di sepanjang sungai belum diketahui, sehingga pin peta hanya menunjukkan aliran sungainya. Jam, peserta, dan laporan pelaksanaan kedua edisi belum terverifikasi.",
    "status": "published",
    "featured": false,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Kali Kedunglarangan, Kec. Bangil, Kab. Pasuruan (titik lomba belum terverifikasi)",
    "place": {
      "latitude": -7.5718629,
      "longitude": 112.8009309,
      "precision": "approximate"
    },
    "occurrences": [
      {
        "id": "festival-perahu-dayung-kedunglarangan-occ-1",
        "starts_at": "2025-09-27T00:00:00+07:00",
        "ends_at": "2025-09-28T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Jam tidak tercantum di sumber."
      },
      {
        "id": "festival-perahu-dayung-kedunglarangan-occ-2",
        "starts_at": "2026-09-01T00:00:00+07:00",
        "ends_at": "2026-09-01T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Dari SIDITA Disbudpar Jatim; laporan pelaksanaan belum ditemukan."
      }
    ],
    "tickets": [],
    "organizer_name": null,
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Festival Perahu Dayung Kali Kedunglarangan (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.5718629,112.8009309&query_place_id=ChIJlTDp0bDc1y0RHxFZlRlhbP8",
    "source": "riset-editorial",
    "verification": {
      "status": "jadwal-terdaftar",
      "verified_at": "2026-10-27",
      "note": "Dua edisi hanya tercatat di kalender/sistem event (sebelum acara). Laporan pelaksanaan belum ditemukan."
    },
    "sources": [
      {
        "id": "festival-perahu-dayung-kedunglarangan-ref-1",
        "name": "detikJatim",
        "title": "Agenda Seru di Jawa Timur September 2025, Catat Tanggalnya!",
        "source_type": "reference",
        "url": "https://www.detik.com/jatim/budaya/d-8107583/agenda-seru-di-jawa-timur-september-2025-catat-tanggalnya",
        "published_at": "2025-09-12"
      },
      {
        "id": "festival-perahu-dayung-kedunglarangan-ref-2",
        "name": "SIDITA Disbudpar Jatim",
        "title": "Festival Dayung Dan Prahu Naga",
        "source_type": "reference",
        "url": "https://sidita.disbudpar.jatimprov.go.id/event/detail/588ef11c1e6f144309f188a8f61b02e489aeeeb6a1cbed2442416f908681b3704ce6c6bccfd8dff4d66646530e660857af8c6c0e8096d4d83121f29772474900",
        "published_at": null
      }
    ]
  },
  {
    "id": "pasuruan-street-art-fashion-carnival",
    "slug": "pasuruan-street-art-fashion-carnival",
    "name": "Pasuruan Street Art Fashion Carnival",
    "categoryId": "kesenian",
    "regionId": "kota-pasuruan",
    "event_type": "kesenian",
    "short_description": "karnaval busana adat Nusantara yang diikuti 34 kelurahan se-Kota Pasuruan dalam rangka semarak kemerdekaan",
    "description": "Pasuruan Street Art Fashion Carnival adalah karnaval busana yang digelar dalam rangka semarak kemerdekaan di Kota Pasuruan. Edisi 2026 berlangsung pada 1 September 2026 dan diikuti 34 kelurahan se-Kota Pasuruan.\n\nPeserta menampilkan kreasi busana adat Nusantara, dan acaranya juga diisi hiburan dari pelawak Percil dan kawan-kawan yang difasilitasi Disparpora Kota Pasuruan. Kegiatan ini diharapkan menjadi ruang bagi warga untuk mengenal keberagaman budaya Nusantara.\n\nRute dan titik pusat karnaval tidak disebutkan di sumber, sehingga pin peta hanya menandai pusat Kota Pasuruan (Alun-Alun). Jam dan informasi edisi berikutnya belum terverifikasi.",
    "status": "published",
    "featured": false,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Kota Pasuruan (rute belum terverifikasi)",
    "place": {
      "latitude": -7.6419164,
      "longitude": 112.9066933,
      "precision": "city-center"
    },
    "occurrences": [
      {
        "id": "pasuruan-street-art-fashion-carnival-occ-1",
        "starts_at": "2026-09-01T00:00:00+07:00",
        "ends_at": "2026-09-01T23:59:00+07:00",
        "status": "completed",
        "all_day": true,
        "notes": "Jam dan rute tidak tercantum di sumber."
      }
    ],
    "tickets": [],
    "organizer_name": "Pemerintah Kota Pasuruan (Disparpora Kota Pasuruan)",
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Pasuruan Street Art Fashion Carnival (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.6419164,112.9066933&query_place_id=ChIJm-BusArG1y0RsS1j739ftjI",
    "source": "riset-editorial",
    "verification": {
      "status": "terverifikasi",
      "verified_at": "2026-10-27",
      "note": "Pelaksanaan terverifikasi. Pin = pusat kota (placeholder), bukan lokasi acara."
    },
    "sources": [
      {
        "id": "pasuruan-street-art-fashion-carnival-ref-1",
        "name": "Potretkota.com",
        "title": "Anggaran Street Art Fashion Carnival Pasuruan Jadi Sorotan",
        "source_type": "reference",
        "url": "https://potretkota.com/news-6938-anggaran-street-art-fashion-carnival-pasuruan-jadi-sorotan",
        "published_at": "2026-09"
      }
    ]
  },
  {
    "id": "yadnya-kasada-wonokitri",
    "slug": "yadnya-kasada-wonokitri",
    "name": "Upacara Yadnya Kasada (Sisi Pasuruan, Wonokitri)",
    "categoryId": "tradisi",
    "regionId": "pasuruan-selatan",
    "event_type": "tradisi",
    "short_description": "upacara adat tahunan Suku Tengger di kawasan Bromo, dengan Desa Wonokitri sebagai titik sisi Pasuruan",
    "description": "Yadnya Kasada adalah upacara adat tahunan masyarakat Suku Tengger yang digelar di kawasan Gunung Bromo. Rangkaian ritual dilaksanakan pada bulan Kasada menurut penanggalan Tengger dan berpuncak di Pura Luhur Poten, lautan pasir Bromo.\n\nDi wilayah Kabupaten Pasuruan, Desa Wonokitri, Kecamatan Tosari, menjadi salah satu pintu masuk Bromo. Pada pelaksanaan 2025, Polres Pasuruan menyebut Pendopo Wonokitri sebagai lokasi puncak acara di sisi Pasuruan, sehingga pengamanan dipusatkan di sana.\n\nSelama ritual berlangsung, Balai Besar TNBTS menutup kawasan Bromo untuk aktivitas wisata; akses hanya untuk warga yang mengikuti upacara. Pada 2026 penutupan berlaku 30 Mei–2 Juni, dengan 2 Juni dipakai untuk pembersihan kawasan. Wisatawan disarankan memeriksa pengumuman resmi TNBTS sebelum berkunjung.",
    "status": "published",
    "featured": true,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Pendopo Agung Wonokitri, Desa Wonokitri, Kec. Tosari, Kab. Pasuruan",
    "place": {
      "latitude": -7.892917,
      "longitude": 112.9113243,
      "precision": "exact"
    },
    "occurrences": [
      {
        "id": "yadnya-kasada-wonokitri-occ-1",
        "starts_at": "2025-06-10T00:00:00+07:00",
        "ends_at": "2025-06-11T23:59:00+07:00",
        "status": "completed",
        "all_day": true,
        "notes": "Ritual 10–11 Juni 2025; kawasan TNBTS ditutup 10–13 Juni 2025."
      },
      {
        "id": "yadnya-kasada-wonokitri-occ-2",
        "starts_at": "2026-05-30T00:00:00+07:00",
        "ends_at": "2026-06-01T23:59:00+07:00",
        "status": "completed",
        "all_day": true,
        "notes": "Ritual 30 Mei–1 Juni 2026; kawasan Bromo ditutup untuk wisata 30 Mei–2 Juni 2026."
      }
    ],
    "tickets": [
      {
        "id": "yadnya-kasada-wonokitri-akses",
        "name": "Akses kawasan",
        "price": null,
        "description": "Bukan acara bertiket. Selama ritual, kawasan Bromo ditutup untuk wisatawan dan hanya dibuka bagi peserta upacara.",
        "ticket_url": null,
        "registration_url": null,
        "available": false
      }
    ],
    "organizer_name": "Masyarakat Suku Tengger (Paruman Dukun Pandita Kawasan Tengger)",
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Upacara Yadnya Kasada (Sisi Pasuruan, Wonokitri) (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.892917,112.9113243&query_place_id=ChIJn9rT3Kw11i0RmAVFqkfX45c",
    "source": "riset-editorial",
    "verification": {
      "status": "terverifikasi",
      "verified_at": "2026-10-27",
      "note": "Tanggal 2025 & 2026 dan lokasi Wonokitri dari berita. Lokasi puncak sisi Pasuruan (Pendopo Wonokitri) terkonfirmasi untuk 2025; untuk 2026 belum ada sumber spesifik."
    },
    "sources": [
      {
        "id": "yadnya-kasada-wonokitri-ref-1",
        "name": "detikJatim",
        "title": "Polres Pasuruan Tingkatkan Pengamanan Jelang Yadnya Kasada di Bromo",
        "source_type": "reference",
        "url": "https://www.detik.com/jatim/budaya/d-7957412/polres-pasuruan-tingkatkan-pengamanan-jelang-yadnya-kasada-di-bromo",
        "published_at": "2025-06-10"
      },
      {
        "id": "yadnya-kasada-wonokitri-ref-2",
        "name": "Antara Jatim",
        "title": "Aktivitas wisata di Gunung Bromo ditutup saat peringatan Yadnya Kasada",
        "source_type": "reference",
        "url": "https://jatim.antaranews.com/berita/1068108/aktivitas-wisata-di-gunung-bromo-ditutup-saat-peringatan-yadnya-kasada",
        "published_at": "2026-05-24"
      },
      {
        "id": "yadnya-kasada-wonokitri-ref-3",
        "name": "JatimTIMES",
        "title": "Bromo Ditutup Total Mulai Besok! Wisatawan Dilarang Masuk hingga 2 Juni 2026",
        "source_type": "reference",
        "url": "https://jatimtimes.com/baca/3331344519/20260529/184600/privacy",
        "published_at": "2026-05-29"
      }
    ]
  },
  {
    "id": "nguling-nyawiji",
    "slug": "nguling-nyawiji",
    "name": "Nguling Nyawiji",
    "categoryId": "kesenian",
    "regionId": "pasuruan-timur",
    "event_type": "kesenian",
    "short_description": "parade budaya komunal bertajuk \"Bergulir Bersama\" di Kecamatan Nguling dengan tari, gamelan, dan busana adat",
    "description": "Nguling Nyawiji adalah parade budaya komunal di Kecamatan Nguling yang bertajuk \"Bergulir Bersama\". Menurut SIDITA Disbudpar Jawa Timur, acara ini memadukan tradisi lokal dengan seni pertunjukan jalanan untuk mempromosikan kebersamaan dan pelestarian budaya.\n\nParade menampilkan puluhan kelompok peserta dengan tarian tradisional, busana adat, musik gamelan, dan dekorasi bunga di sepanjang rute sekitar 4 kilometer. Acara juga dilengkapi stan UMKM kuliner dan hiburan rakyat.\n\nSIDITA mencantumkan tanggal 1 Maret 2026 tanpa jam yang jelas, dan laporan pelaksanaannya belum ditemukan, jadi tanggal ini perlu dikonfirmasi. Rute persisnya juga tidak disebutkan, sehingga pin peta hanya menandai Kantor Kecamatan Nguling.",
    "status": "published",
    "featured": false,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Kecamatan Nguling, Kab. Pasuruan (rute ±4 km, belum terverifikasi)",
    "place": {
      "latitude": -7.7123386,
      "longitude": 113.0796959,
      "precision": "district-office"
    },
    "occurrences": [
      {
        "id": "nguling-nyawiji-occ-1",
        "starts_at": "2026-03-01T00:00:00+07:00",
        "ends_at": "2026-03-01T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Tanggal dari SIDITA (format jam 00:00–00:00, kemungkinan placeholder)."
      }
    ],
    "tickets": [],
    "organizer_name": null,
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Nguling Nyawiji (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.7123386,113.0796959&query_place_id=ChIJ9wflW8e21y0RCnpxc59XE9I",
    "source": "riset-editorial",
    "verification": {
      "status": "jadwal-terdaftar",
      "verified_at": "2026-10-27",
      "note": "Hanya dari SIDITA. Tanggal perlu konfirmasi; pin = kantor kecamatan, bukan rute."
    },
    "sources": [
      {
        "id": "nguling-nyawiji-ref-1",
        "name": "SIDITA Disbudpar Jatim",
        "title": "Nguling Nyawiji",
        "source_type": "reference",
        "url": "https://sidita.disbudpar.jatimprov.go.id/event/detail/0269593c411aaa2f096fd74c0a7f435e72342ba12cb3c2e264d9d8d723a4b4e8045c94e9eb8ec0c59114cded6cfda07eca41075f6ea559ee00fc732813acf86b",
        "published_at": null
      }
    ]
  },
  {
    "id": "pramesty-winongan",
    "slug": "pramesty-winongan",
    "name": "Pramesty Winongan",
    "categoryId": "tradisi",
    "regionId": "pasuruan-timur",
    "event_type": "tradisi",
    "short_description": "acara menyambut Ramadan di Pemandian Alam Banyu Biru, Winongan, yang mengangkat sejarah dan wajah baru Banyu Biru",
    "description": "Pramesty Winongan adalah acara menyambut bulan Ramadan yang tercatat di situs pariwisata resmi Pemkab Pasuruan (OnTrip). Edisi 2026 digelar pada 17 Februari 2026 di Pemandian Alam Banyu Biru, Desa Sumber Rejo, Kecamatan Winongan.\n\nTema yang diusung menyandingkan suasana menyambut Ramadan dengan nilai sejarah Banyu Biru dan tampilan baru kawasan pemandian tersebut. Acara ini tercatat gratis untuk pengunjung.\n\nSusunan acara, jam, dan penyelenggara pelaksana tidak dirinci di sumber. Karena mengikuti datangnya Ramadan, tanggal edisi berikutnya akan bergeser mengikuti kalender Hijriah.",
    "status": "published",
    "featured": false,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Pemandian Alam Banyu Biru, Desa Sumber Rejo, Kec. Winongan, Kab. Pasuruan",
    "place": {
      "latitude": -7.7475924,
      "longitude": 112.9681085,
      "precision": "exact"
    },
    "occurrences": [
      {
        "id": "pramesty-winongan-occ-1",
        "starts_at": "2026-02-17T00:00:00+07:00",
        "ends_at": "2026-02-17T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Jam tidak tercantum di sumber."
      }
    ],
    "tickets": [
      {
        "id": "pramesty-winongan-masuk",
        "name": "Pengunjung umum",
        "price": 0,
        "description": "Gratis (OnTrip Pemkab Pasuruan).",
        "ticket_url": null,
        "registration_url": null,
        "available": false
      }
    ],
    "organizer_name": null,
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Pramesty Winongan (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.7475924,112.9681085&query_place_id=ChIJQaUrISXK1y0RpU3ypDF7EZM",
    "source": "riset-editorial",
    "verification": {
      "status": "jadwal-resmi",
      "verified_at": "2026-10-27",
      "note": "Tercatat di kanal resmi Pemkab; laporan pelaksanaan belum ditemukan."
    },
    "sources": [
      {
        "id": "pramesty-winongan-ref-1",
        "name": "OnTrip Pemkab Pasuruan",
        "title": "Pramesty Winongan 2026",
        "source_type": "reference",
        "url": "https://ontrip.pasuruankab.go.id/event/pramesty-winongan-2026",
        "published_at": null
      }
    ]
  },
  {
    "id": "nongkojajar-culture-festival",
    "slug": "nongkojajar-culture-festival",
    "name": "Nongkojajar Culture Festival",
    "categoryId": "tradisi",
    "regionId": "pasuruan-selatan",
    "event_type": "tradisi",
    "short_description": "festival budaya di sepanjang jalan poros Nongkojajar, Kecamatan Tutur",
    "description": "Nongkojajar Culture Festival tercatat dalam kalender event Jawa Timur September 2025 untuk Kabupaten Pasuruan. Acara ini dijadwalkan berlangsung di sepanjang jalan poros Nongkojajar, Kecamatan Tutur.\n\nNongkojajar berada di dataran tinggi Kabupaten Pasuruan dan dikenal sebagai kawasan agrowisata, sehingga festival di ruas jalan utamanya mudah diakses warga maupun wisatawan.\n\nData ini berasal dari kalender event yang dirilis sebelum acara. Bentuk acara, titik pusat, jam, dan penyelenggara belum terverifikasi, begitu pula laporan pelaksanaannya.",
    "status": "published",
    "featured": false,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Sepanjang Jl. Raya Wonosari–Nongkojajar, Kec. Tutur, Kab. Pasuruan",
    "place": {
      "latitude": -7.8876438,
      "longitude": 112.8140733,
      "precision": "approximate"
    },
    "occurrences": [
      {
        "id": "nongkojajar-culture-festival-occ-1",
        "starts_at": "2025-09-25T00:00:00+07:00",
        "ends_at": "2025-09-25T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Jam tidak tercantum di sumber."
      }
    ],
    "tickets": [],
    "organizer_name": null,
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Nongkojajar Culture Festival (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.8876438,112.8140733&query_place_id=ChIJs_KdKw4y1i0RImQfrlX5yCI",
    "source": "riset-editorial",
    "verification": {
      "status": "jadwal-terdaftar",
      "verified_at": "2026-10-27",
      "note": "Tanggal & lokasi diambil dari kalender event Pemprov Jatim yang dirangkum detikJatim (sebelum acara). Laporan pelaksanaan belum ditemukan."
    },
    "sources": [
      {
        "id": "nongkojajar-culture-festival-ref-1",
        "name": "detikJatim",
        "title": "Agenda Seru di Jawa Timur September 2025, Catat Tanggalnya!",
        "source_type": "reference",
        "url": "https://www.detik.com/jatim/budaya/d-8107583/agenda-seru-di-jawa-timur-september-2025-catat-tanggalnya",
        "published_at": "2025-09-12"
      }
    ]
  },
  {
    "id": "festival-jalur-rempah-tosari",
    "slug": "festival-jalur-rempah-tosari",
    "name": "Festival Jalur Rempah: Pagelaran Warisan Budaya Tak Benda",
    "categoryId": "tradisi",
    "regionId": "pasuruan-selatan",
    "event_type": "tradisi",
    "short_description": "pagelaran warisan budaya tak benda bertema jalur rempah di Rest Area Tosari",
    "description": "Festival Jalur Rempah dalam Pagelaran Warisan Budaya Tak Benda tercatat dalam kalender event Jawa Timur September 2025. Acara ini dijadwalkan di Rest Area Kecamatan Tosari, kawasan dataran tinggi Tengger di Kabupaten Pasuruan.\n\nRest Area Tosari dikenal sebagai titik transit wisatawan yang hendak menuju Bromo dari sisi Pasuruan, sehingga mudah dijangkau pengunjung yang sedang berwisata di kawasan tersebut.\n\nData ini berasal dari kalender event yang dirilis sebelum acara. Isi pagelaran, jam, dan penyelenggara belum terverifikasi, begitu pula laporan pelaksanaannya.",
    "status": "published",
    "featured": false,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Rest Area Desa Wisata Tosari, Jl. Bromo No. 01, Tlogosari, Kec. Tosari, Kab. Pasuruan",
    "place": {
      "latitude": -7.8815004,
      "longitude": 112.9014445,
      "precision": "exact"
    },
    "occurrences": [
      {
        "id": "festival-jalur-rempah-tosari-occ-1",
        "starts_at": "2025-09-20T00:00:00+07:00",
        "ends_at": "2025-09-20T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Jam tidak tercantum di sumber."
      }
    ],
    "tickets": [],
    "organizer_name": null,
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Festival Jalur Rempah: Pagelaran Warisan Budaya Tak Benda (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.8815004,112.9014445&query_place_id=ChIJc_t-ERQz1i0REcrQNWj7ztY",
    "source": "riset-editorial",
    "verification": {
      "status": "jadwal-terdaftar",
      "verified_at": "2026-10-27",
      "note": "Tanggal & lokasi diambil dari kalender event Pemprov Jatim yang dirangkum detikJatim (sebelum acara). Laporan pelaksanaan belum ditemukan."
    },
    "sources": [
      {
        "id": "festival-jalur-rempah-tosari-ref-1",
        "name": "detikJatim",
        "title": "Agenda Seru di Jawa Timur September 2025, Catat Tanggalnya!",
        "source_type": "reference",
        "url": "https://www.detik.com/jatim/budaya/d-8107583/agenda-seru-di-jawa-timur-september-2025-catat-tanggalnya",
        "published_at": "2025-09-12"
      }
    ]
  },
  {
    "id": "lomba-pacuan-kuda-prigen",
    "slug": "lomba-pacuan-kuda-prigen",
    "name": "Lomba Pacuan Kuda Prigen",
    "categoryId": "tradisi",
    "regionId": "pasuruan-barat",
    "event_type": "tradisi",
    "short_description": "lomba pacuan kuda di Lapangan Pacuan Kuda Ledug, Prigen, sebagai olahraga tradisional dan daya tarik wisata budaya",
    "description": "Lomba Pacuan Kuda digelar di Lapangan Pacuan Kuda, Kelurahan Ledug, Kecamatan Prigen. SIDITA Disbudpar Jawa Timur menggambarkannya sebagai perayaan olahraga tradisional yang memadukan kompetisi, seni, dan ekonomi kreatif.\n\nLapangan ini berada di kawasan pegunungan Prigen dan juga dipakai untuk kegiatan olahraga serta acara umum di luar musim lomba. Edisi 2025 tercatat berlangsung 20–21 September 2025.\n\nData ini berasal dari kalender dan sistem event yang dirilis sebelum acara. Jam, kelas lomba, harga tiket, dan penyelenggara belum terverifikasi, begitu pula laporan pelaksanaannya.",
    "status": "published",
    "featured": false,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Lapangan Pacuan Kuda, Kel. Ledug, Kec. Prigen, Kab. Pasuruan",
    "place": {
      "latitude": -7.6944366,
      "longitude": 112.6466598,
      "precision": "exact"
    },
    "occurrences": [
      {
        "id": "lomba-pacuan-kuda-prigen-occ-1",
        "starts_at": "2025-09-20T00:00:00+07:00",
        "ends_at": "2025-09-21T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Jam tidak tercantum di sumber."
      }
    ],
    "tickets": [],
    "organizer_name": null,
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Lomba Pacuan Kuda Prigen (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.6944366,112.6466598&query_place_id=ChIJtfmLB5XX1y0RIafbbcJiwXo",
    "source": "riset-editorial",
    "verification": {
      "status": "jadwal-terdaftar",
      "verified_at": "2026-10-27",
      "note": "Tanggal & lokasi diambil dari kalender event Pemprov Jatim yang dirangkum detikJatim (sebelum acara). Laporan pelaksanaan belum ditemukan."
    },
    "sources": [
      {
        "id": "lomba-pacuan-kuda-prigen-ref-1",
        "name": "SIDITA Disbudpar Jatim",
        "title": "Lomba Pacuan Kuda",
        "source_type": "reference",
        "url": "https://sidita.disbudpar.jatimprov.go.id/event/detail/e7de4b9d144b87b6d1ee6be2e96049c357f25c4a20828fecee82d49db00aa5ce7f1b4c5abc1df15becbb4e28c874bec2208d5e7103215f6f0291cb0f242918e6",
        "published_at": null
      },
      {
        "id": "lomba-pacuan-kuda-prigen-ref-2",
        "name": "detikJatim",
        "title": "Agenda Seru di Jawa Timur September 2025, Catat Tanggalnya!",
        "source_type": "reference",
        "url": "https://www.detik.com/jatim/budaya/d-8107583/agenda-seru-di-jawa-timur-september-2025-catat-tanggalnya",
        "published_at": "2025-09-12"
      }
    ]
  },
  {
    "id": "parade-budaya-wayang-cungrang",
    "slug": "parade-budaya-wayang-cungrang",
    "name": "Parade Budaya dan Wayang Dalang Muda",
    "categoryId": "kesenian",
    "regionId": "pasuruan-barat",
    "event_type": "kesenian",
    "short_description": "parade budaya dan pergelaran wayang oleh dalang muda di situs Prasasti Cungrang, Gempol",
    "description": "Parade Budaya dan Wayang dengan Dalang Muda tercatat dalam kalender event Jawa Timur September 2025 untuk Kabupaten Pasuruan. Lokasinya di kawasan Prasasti Cungrang, Desa Bulusari, Kecamatan Gempol.\n\nPrasasti Cungrang adalah prasasti dari masa Mataram Kuno yang menjadi salah satu rujukan sejarah awal Pasuruan, sehingga acara ini memadukan pertunjukan seni dengan situs bersejarah.\n\nData ini berasal dari kalender event yang dirilis sebelum acara. Susunan acara, jam, dan penyelenggara belum terverifikasi, begitu pula laporan pelaksanaannya.",
    "status": "published",
    "featured": false,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Situs Prasasti Cungrang, Dusun Sukci, Desa Bulusari, Kec. Gempol, Kab. Pasuruan",
    "place": {
      "latitude": -7.5797994,
      "longitude": 112.6849551,
      "precision": "exact"
    },
    "occurrences": [
      {
        "id": "parade-budaya-wayang-cungrang-occ-1",
        "starts_at": "2025-09-18T00:00:00+07:00",
        "ends_at": "2025-09-18T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Jam tidak tercantum di sumber."
      }
    ],
    "tickets": [],
    "organizer_name": null,
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Parade Budaya dan Wayang Dalang Muda (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.5797994,112.6849551&query_place_id=ChIJO4o_L8Te1y0RDXdBiRa2Lgk",
    "source": "riset-editorial",
    "verification": {
      "status": "jadwal-terdaftar",
      "verified_at": "2026-10-27",
      "note": "Tanggal & lokasi diambil dari kalender event Pemprov Jatim yang dirangkum detikJatim (sebelum acara). Laporan pelaksanaan belum ditemukan."
    },
    "sources": [
      {
        "id": "parade-budaya-wayang-cungrang-ref-1",
        "name": "detikJatim",
        "title": "Agenda Seru di Jawa Timur September 2025, Catat Tanggalnya!",
        "source_type": "reference",
        "url": "https://www.detik.com/jatim/budaya/d-8107583/agenda-seru-di-jawa-timur-september-2025-catat-tanggalnya",
        "published_at": "2025-09-12"
      }
    ]
  },
  {
    "id": "haul-kh-abdul-hamid",
    "slug": "haul-kh-abdul-hamid",
    "name": "Haul KH Abdul Hamid (Mbah Hamid) Pasuruan",
    "categoryId": "tradisi",
    "regionId": "kota-pasuruan",
    "event_type": "tradisi",
    "short_description": "peringatan haul tahunan KH Abdul Hamid di Ponpes Salafiyah Kebonsari yang dihadiri jemaah dari berbagai daerah",
    "description": "Haul KH Abdul Hamid bin Abdullah Umar, yang dikenal sebagai Mbah Hamid, adalah peringatan tahunan untuk mengenang ulama kharismatik Kota Pasuruan. Pusat acaranya berada di Pondok Pesantren Salafiyah, Kelurahan Kebonsari, dan jemaah biasanya meluber hingga Masjid Jami' Al Anwar dan alun-alun.\n\nRangkaian haul umumnya berlangsung beberapa hari, antara lain khataman Al-Qur'an, majelis haul pada pagi hari, dan Lailatul Hadrah ISHARI pada malam harinya. Haul ke-43 digelar 14 September 2024, sedangkan haul ke-44 digelar 2 September 2025, keduanya dengan majelis haul mulai pukul 07.00 WIB.\n\nTanggal haul mengikuti kalender Hijriah sehingga bergeser setiap tahun dalam kalender Masehi. Jadwal edisi berikutnya perlu dicek dari pengumuman PCNU Kota Pasuruan atau pihak pesantren.",
    "status": "published",
    "featured": true,
    "capacity": null,
    "venue_name": null,
    "venue_address": "Pondok Pesantren Salafiyah, Jl. KH Abdul Hamid Gg. VIII No. 14, Kebonsari, Kec. Panggungrejo, Kota Pasuruan",
    "place": {
      "latitude": -7.6432396,
      "longitude": 112.9030287,
      "precision": "exact"
    },
    "occurrences": [
      {
        "id": "haul-kh-abdul-hamid-occ-1",
        "starts_at": "2024-09-14T07:00:00+07:00",
        "ends_at": null,
        "status": "completed",
        "all_day": false,
        "notes": "Haul ke-43. Majelis haul 07.00 WIB; Lailatul Hadrah ISHARI malam harinya."
      },
      {
        "id": "haul-kh-abdul-hamid-occ-2",
        "starts_at": "2025-09-02T07:00:00+07:00",
        "ends_at": null,
        "status": "completed",
        "all_day": false,
        "notes": "Haul ke-44. Majelis haul 07.00 WIB; Lailatul Hadrah ISHARI pukul 19.30 WIB."
      }
    ],
    "tickets": [],
    "organizer_name": "PCNU Kota Pasuruan & Pondok Pesantren Salafiyah",
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Haul KH Abdul Hamid (Mbah Hamid) Pasuruan (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.6432396,112.9030287&query_place_id=ChIJjQnsH-HF1y0RPj9Hc4k7QhA",
    "source": "riset-editorial",
    "verification": {
      "status": "terverifikasi",
      "verified_at": "2026-10-27",
      "note": "Edisi 2024 & 2025 terverifikasi. Edisi 2026 (haul ke-45) belum dicek. Jam selesai tidak tercantum di sumber."
    },
    "sources": [
      {
        "id": "haul-kh-abdul-hamid-ref-1",
        "name": "NU Online",
        "title": "Haul Ke-44 KH Abdul Hamid Pasuruan, Ini Rangkaian Acaranya",
        "source_type": "reference",
        "url": "https://nu.or.id/daerah/haul-ke-44-kh-abdul-hamid-pasuruan-ini-rangkaian-acaranya-VHCK3",
        "published_at": "2025-08-31"
      },
      {
        "id": "haul-kh-abdul-hamid-ref-2",
        "name": "detikJatim",
        "title": "Catat Lokasi Istirahat Jemaah Haul ke-43 KH Abdul Hamid Pasuruan",
        "source_type": "reference",
        "url": "https://www.detik.com/jatim/berita/d-7538566/catat-lokasi-istirahat-jemaah-haul-ke-43-kh-abdul-hamid-pasuruan",
        "published_at": "2024-09-13"
      }
    ]
  },
  {
    "id": "pasuruan-creative-fest-wasikon",
    "slug": "pasuruan-creative-fest-wasikon",
    "name": "Pasuruan Creative Fest: WasikOn Festivale",
    "categoryId": "kesenian",
    "regionId": "kota-pasuruan",
    "event_type": "kesenian",
    "short_description": "festival ekonomi kreatif Kota Pasuruan berisi pertunjukan seni, teater, pemutaran film, fashion show, dan pop-up market",
    "description": "Pasuruan Creative Fest adalah festival ekonomi kreatif yang diselenggarakan Dinas Pariwisata, Pemuda, dan Olahraga Kota Pasuruan. Edisi 2024 mengusung tema WasikOn Festivale dan digelar di TIC Alun-Alun Utara pada 2–3 Desember 2024.\n\nFestival ini memberi panggung bagi 11 subsektor ekonomi kreatif, mulai dari pameran, fashion show, pemutaran film, teater, musik, hingga kuliner. Ada juga pertunjukan Sanggar Seni Ghandes Luwes, mini talkshow, dan pop-up market berisi 20 tenant UMKM lokal.\n\nNama WasikOn diambil dari ungkapan khas warga Pasuruan untuk menyebut sesuatu yang seru atau luar biasa. Edisi 2025 tercatat di sistem event Disbudpar Jawa Timur (SIDITA), tetapi laporan pelaksanaannya belum ditemukan. Informasi tiket tidak tercantum di sumber.",
    "status": "published",
    "featured": true,
    "capacity": null,
    "venue_name": null,
    "venue_address": "TIC Kota Pasuruan, Jl. Alun-Alun Utara, Kec. Panggungrejo, Kota Pasuruan",
    "place": {
      "latitude": -7.6409823,
      "longitude": 112.9075328,
      "precision": "exact"
    },
    "occurrences": [
      {
        "id": "pasuruan-creative-fest-wasikon-occ-1",
        "starts_at": "2024-12-02T00:00:00+07:00",
        "ends_at": "2024-12-03T23:59:00+07:00",
        "status": "completed",
        "all_day": true,
        "notes": "Jam operasional tidak tercantum di sumber."
      },
      {
        "id": "pasuruan-creative-fest-wasikon-occ-2",
        "starts_at": "2025-09-01T00:00:00+07:00",
        "ends_at": "2025-09-01T23:59:00+07:00",
        "status": "past_unconfirmed",
        "all_day": true,
        "notes": "Tercatat di SIDITA Disbudpar Jatim untuk 1 Sep 2025; laporan pelaksanaan belum ditemukan."
      }
    ],
    "tickets": [],
    "organizer_name": "Dinas Pariwisata, Pemuda, dan Olahraga Kota Pasuruan",
    "organizer_phone": null,
    "website_url": null,
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Pasuruan Creative Fest: WasikOn Festivale (belum tersedia)"
      }
    ],
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.6409823,112.9075328&query_place_id=ChIJZZc2odLH1y0RQvuUIktPbek",
    "source": "riset-editorial",
    "verification": {
      "status": "terverifikasi",
      "verified_at": "2026-10-27",
      "note": "Edisi 2024 dari tulisan kontributor GNFI (bukan rilis resmi). Edisi 2025 hanya tercatat di SIDITA."
    },
    "sources": [
      {
        "id": "pasuruan-creative-fest-wasikon-ref-1",
        "name": "Good News From Indonesia (Kawan GNFI)",
        "title": "Pasuruan Creative Fest, Menghidupkan Ekonomi Kreatif Lewat WasikOn Festivale 2024",
        "source_type": "reference",
        "url": "https://www.goodnewsfromindonesia.id/2024/12/05/pasuruan-creative-fest-menghidupkan-ekonomi-kreatif-lewat-wasikon-festivale-2024",
        "published_at": "2024-12-05"
      },
      {
        "id": "pasuruan-creative-fest-wasikon-ref-2",
        "name": "SIDITA Disbudpar Jatim",
        "title": "Pasuruan Creative Fest (WasikOn Festivale)",
        "source_type": "reference",
        "url": "https://sidita.disbudpar.jatimprov.go.id/event/detail/38fbfba556d92f909cb50e92e9683874b68230ab2ae6818e97db8b8f48c05f2ca62607df2ee56788435a92814da67c3c833d51143aa118a1c46d28568ad56984",
        "published_at": null
      }
    ]
  }
];

ACARA_EVENTS.forEach(function (it) {
  if (!it.googleMapsUrl && it.place && Number.isFinite(it.place.latitude) && Number.isFinite(it.place.longitude)) {
    it.googleMapsUrl =
      "https://www.google.com/maps/search/?api=1&query=" + it.place.latitude + "," + it.place.longitude;
  }
});

const PASINFO_ACARA = {
  categories: ACARA_CATEGORIES,
  events: ACARA_EVENTS,
  regions: ACARA_REGIONS,
};
if (typeof window !== "undefined") {
  window.PASINFO_ACARA = PASINFO_ACARA;
}
