/**
 * DATA ACARA — Pasuruan Info (MOCK / PLACEHOLDER)
 * ==============================================
 * STATUS: MOCK. Seluruh isi file ini adalah placeholder untuk pengembangan
 * dan pengujian layout frontend. BUKAN informasi acara nyata.
 *
 * - Nama, jadwal, venue, penyelenggara, harga tiket, dan URL adalah nilai
 *   generik placeholder (atau null); JANGAN tampilkan sebagai fakta nyata.
 * - `occurrences[].starts_at/ends_at` bernilai null → UI memakai label
 *   "Jadwal menyusul (MOCK)". Jangan mengarang tanggal/jam nyata.
 * - `tickets[].price/ticket_url/registration_url` bernilai null → UI hanya
 *   menampilkan INFORMASI tiket (teks + tautan placeholder nonaktif).
 *   Booking/payment TIDAK termasuk scope (lihat prd.md §19.2).
 * - `place` bernilai null karena belum ada koordinat terverifikasi.
 * - `media[].url` bernilai null → UI memakai placeholder (tanpa foto).
 * - `organizer_name/organizer_phone/website_url` null (belum terverifikasi).
 * - `verification.status` null dan `source: "mock"` menandai belum
 *   terverifikasi.
 *
 * Bentuk data mengikuti konsep `events` + `event_occurrences` +
 * `event_tickets` pada `schema.md` (§15–§17) agar transisi mock → API tidak
 * mengubah component.Label kategori mengikuti tab filter pada mockup
 * `public/assets/mockup/acara.png` (Semua, Kesenian, Tradisi, Sejarah,
 * Museum) sebagai label UI mock — bukan taksonomi terverifikasi.
 *
 * Konvensi file mengikuti `public/js/data-wisata.js` dan
 * `public/js/data-kuliner.js`:
 * window.PASINFO_ACARA = { categories, events, regions, eventsToday }.
 */

const ACARA_REGIONS = [
  {
    "id": "kota-pasuruan",
    "slug": "kota-pasuruan",
    "name": "Kota Pasuruan",
    "color": "#7c3aed",
    "center": {
      "latitude": -7.645,
      "longitude": 112.907
    },
    "zoom": 13,
    "short_description": "Wilayah administrasi Kota Pasuruan."
  },
  {
    "id": "pasuruan-timur",
    "slug": "pasuruan-timur",
    "name": "Pasuruan Timur",
    "color": "#dc2626",
    "center": {
      "latitude": -7.636,
      "longitude": 112.951
    },
    "zoom": 12,
    "short_description": "Wilayah timur Kabupaten Pasuruan."
  },
  {
    "id": "pasuruan-barat",
    "slug": "pasuruan-barat",
    "name": "Pasuruan Barat",
    "color": "#16a34a",
    "center": {
      "latitude": -7.662,
      "longitude": 112.862
    },
    "zoom": 12,
    "short_description": "Wilayah barat Kabupaten Pasuruan."
  },
  {
    "id": "pasuruan-utara",
    "slug": "pasuruan-utara",
    "name": "Pasuruan Utara",
    "color": "#2563eb",
    "center": {
      "latitude": -7.595,
      "longitude": 112.907
    },
    "zoom": 12,
    "short_description": "Wilayah utara Kabupaten Pasuruan."
  },
  {
    "id": "pasuruan-selatan",
    "slug": "pasuruan-selatan",
    "name": "Pasuruan Selatan",
    "color": "#ea580c",
    "center": {
      "latitude": -7.719,
      "longitude": 112.919
    },
    "zoom": 12,
    "short_description": "Wilayah selatan Kabupaten Pasuruan."
  }
];

const ACARA_CATEGORIES = [
  { id: "kesenian", slug: "kesenian", name: "Kesenian" },
  { id: "tradisi", slug: "tradisi", name: "Tradisi" },
  { id: "sejarah", slug: "sejarah", name: "Sejarah" },
  { id: "museum", slug: "museum", name: "Museum" },
];

/* Nilai generik SAMA untuk semua item (DUMMY — lihat header). */
const ACARA_MOCK = {
  venue_address: "Lokasi menyusul (MOCK), Pasuruan",
  schedule_label: "Jadwal menyusul (MOCK)",
  ticket_label: "Informasi tiket menyusul (MOCK)",
  verification: { status: null, verified_at: null },
  source: "mock",
};

function acaraItem(id, slug, name, categoryId, regionId, short_description, ticket_type, featured) {
  // Dapatkan koordinat region untuk fallback lokasi
  var region = ACARA_REGIONS.find(function (r) { return r.id === regionId; });
  var latitude = region ? region.center.latitude : -7.751;
  var longitude = region ? region.center.longitude : 112.838;

  return {
    id: id,
    slug: slug,
    name: name,
    categoryId: categoryId,
    regionId: regionId,
    event_type: categoryId,
    short_description: short_description,
    description: null,
    status: "published",
    featured: !!featured,
    venue_name: null,
    venue_address: ACARA_MOCK.venue_address,
    place: { latitude: latitude, longitude: longitude },
    occurrences: [
      {
        id: slug + "-occ-1",
        starts_at: null,
        ends_at: null,
        label: ACARA_MOCK.schedule_label,
        status: null,
        notes: null,
      },
    ],
    tickets: [
      {
        id: slug + "-tiket-1",
        name: "Info tiket (MOCK)",
        ticket_type: ticket_type,
        price: null,
        price_label: ACARA_MOCK.ticket_label,
        description: null,
        ticket_url: null,
        registration_url: null,
        available: true,
      },
    ],
    organizer_name: null,
    organizer_phone: null,
    website_url: null,
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto " + name + " (belum tersedia)",
      },
    ],
    googleMapsUrl: null,
    source: ACARA_MOCK.source,
    verification: {
      status: ACARA_MOCK.verification.status,
      verified_at: ACARA_MOCK.verification.verified_at,
    },
  };
}

const ACARA_EVENTS = [
  acaraItem("festival-seni-mock", "festival-seni-mock", "Festival Seni Mock", "kesenian", "pasuruan-timur", "pertunjukan seni komunitas dengan penampilan dari berbagai grup seni lokal (mock)", "Gratis", true),
  acaraItem("konser-komunitas-mock", "konser-komunitas-mock", "Konser Komunitas Mock", "kesenian", "pasuruan-barat", "panggung musik komunitas untuk musisi independen dan grup band lokal (mock)", "Berbayar", false),
  acaraItem("kirab-tradisi-mock", "kirab-tradisi-mock", "Kirab Tradisi Mock", "tradisi", "kota-pasuruan", "arak-arakan tradisi tahunan dengan kostum dan musik tradisional Pasuruan (mock)", "Gratis", true),
  acaraItem("ritual-panen-mock", "ritual-panen-mock", "Ritual Panen Mock", "tradisi", "pasuruan-selatan", "syukuran panen warga dengan acara gotong royong dan makan bersama komunitas (mock)", "Gratis", false),
  acaraItem("pawai-sejarah-mock", "pawai-sejarah-mock", "Pawai Sejarah Mock", "sejarah", "pasuruan-utara", "pawai napak tilas mengikuti jejak sejarah kota Pasuruan dari abad lampau (mock)", "Gratis", false),
  acaraItem("jelajah-sejarah-mock", "jelajah-sejarah-mock", "Jelajah Sejarah Mock", "sejarah", "pasuruan-barat", "tur edukasi sejarah dengan pemandu berpengalaman mengunjungi situs-situs bersejarah (mock)", "Berbayar", false),
  acaraItem("pameran-museum-mock", "pameran-museum-mock", "Pameran Museum Mock", "museum", "kota-pasuruan", "pameran koleksi artefak dan benda bersejarah dari koleksi privat dan publik (mock)", "Gratis", true),
  acaraItem("workshop-koleksi-mock", "workshop-koleksi-mock", "Workshop Koleksi Mock", "museum", "pasuruan-timur", "lokakarya kurasi untuk pemula yang ingin belajar pengelolaan koleksi museum (mock)", "Berbayar", false),
  acaraItem("pasar-seni-mock", "pasar-seni-mock", "Pasar Seni Mock", "kesenian", "pasuruan-barat", "bazar karya perupa menampilkan lukisan, patung, dan kerajinan dari seniman lokal (mock)", "Gratis", false),
  acaraItem("gelar-wayang-mock", "gelar-wayang-mock", "Gelar Wayang Kulit Mock", "tradisi", "pasuruan-selatan", "pertunjukan wayang kulit tradisional dengan cerita dari kitab Ramayana dan Mahabharata (mock)", "Gratis", true),
  acaraItem("seminar-budaya-mock", "seminar-budaya-mock", "Seminar Budaya Lokal Mock", "sejarah", "pasuruan-utara", "seminar diskusi tentang pelestarian warisan budaya Pasuruan untuk generasi mendatang (mock)", "Gratis", false),
  acaraItem("festival-kuliner-mock", "festival-kuliner-mock", "Festival Makanan Tradisional Mock", "kesenian", "kota-pasuruan", "festival kuliner menampilkan masakan tradisional dan inovasi food dari chef lokal (mock)", "Berbayar", false),
  acaraItem("pameran-fotografi-mock", "pameran-fotografi-mock", "Pameran Fotografi Sejarah Mock", "museum", "pasuruan-timur", "pameran fotografi dokumenter tentang transformasi kota Pasuruan selama satu abad terakhir (mock)", "Gratis", false),
  acaraItem("konser-musik-tradisional-mock", "konser-musik-tradisional-mock", "Konser Musik Tradisional Mock", "tradisi", "pasuruan-barat", "pertunjukan gamelan dan musik tradisional dengan orkestra musik klasik Indonesia penuh (mock)", "Berbayar", true),
  acaraItem("festival-teater-mock", "festival-teater-mock", "Festival Teater Pelajar Mock", "kesenian", "kota-pasuruan", "kompetisi dan pameran teater dari sekolah-sekolah dengan berbagai genre pertunjukan (mock)", "Gratis", false),
  acaraItem("jelajah-museum-malam-mock", "jelajah-museum-malam-mock", "Jelajah Museum Malam Mock", "museum", "pasuruan-selatan", "tur museum khusus malam hari dengan suasana penuh misteri dan pencerahan sejarah (mock)", "Berbayar", false),
];

/* Event "Hari Ini" — dummy data untuk featured section */
const ACARA_HARI_INI = [
  {
    id: "konser-musik-hari-ini-mock",
    slug: "konser-musik-hari-ini-mock",
    name: "Konser Musik Hari Ini Mock",
    categoryId: "kesenian",
    regionId: "kota-pasuruan",
    short_description: "Konser musik live dengan musisi lokal Pasuruan (mock, hari ini)",
    schedule_label: "Hari Ini (MOCK) · 19:00 WIB",
    location: "Alun-Alun Kota Pasuruan",
    ticket_type: "Gratis",
    ticket_info: "Gratis (Hari Ini)",
    media: [
      {
        type: "image",
        url: null,
        alt: "Konser Musik Hari Ini (placeholder)",
      },
    ],
  },
  {
    id: "pameran-seni-hari-ini-mock",
    slug: "pameran-seni-hari-ini-mock",
    name: "Pameran Seni Hari Ini Mock",
    categoryId: "kesenian",
    regionId: "pasuruan-barat",
    short_description: "Pameran seni visual dari seniman lokal Prigen (mock, hari ini)",
    schedule_label: "Hari Ini (MOCK) · 10:00 - 18:00 WIB",
    location: "Galeri Seni Prigen",
    ticket_type: "Berbayar",
    ticket_info: "Rp 25.000 (Hari Ini)",
    media: [
      {
        type: "image",
        url: null,
        alt: "Pameran Seni Hari Ini (placeholder)",
      },
    ],
  },
  {
    id: "festival-makanan-hari-ini-mock",
    slug: "festival-makanan-hari-ini-mock",
    name: "Festival Makanan Hari Ini Mock",
    categoryId: "kesenian",
    regionId: "pasuruan-timur",
    short_description: "Festival kuliner tradisional dengan cita rasa Pasuruan (mock, hari ini)",
    schedule_label: "Hari Ini (MOCK) · 16:00 - 22:00 WIB",
    location: "Lapangan Grati",
    ticket_type: "Gratis",
    ticket_info: "Gratis - bayar untuk makanan (Hari Ini)",
    media: [
      {
        type: "image",
        url: null,
        alt: "Festival Makanan Hari Ini (placeholder)",
      },
    ],
  },
  {
    id: "workshop-seni-hari-ini-mock",
    slug: "workshop-seni-hari-ini-mock",
    name: "Workshop Seni Rupa Hari Ini Mock",
    categoryId: "museum",
    regionId: "pasuruan-selatan",
    short_description: "Workshop melukis dan kerajinan untuk pemula (mock, hari ini)",
    schedule_label: "Hari Ini (MOCK) · 14:00 - 17:00 WIB",
    location: "Komunitas Seni Tutur",
    ticket_type: "Berbayar",
    ticket_info: "Rp 50.000 (Hari Ini)",
    media: [
      {
        type: "image",
        url: null,
        alt: "Workshop Seni Hari Ini (placeholder)",
      },
    ],
  },
  {
    id: "pertunjukan-wayang-hari-ini-mock",
    slug: "pertunjukan-wayang-hari-ini-mock",
    name: "Pertunjukan Wayang Kulit Hari Ini Mock",
    categoryId: "tradisi",
    regionId: "pasuruan-utara",
    short_description: "Pertunjukan wayang kulit tradisional dengan cerita Mahabharata (mock, hari ini)",
    schedule_label: "Hari Ini (MOCK) · 20:00 WIB",
    location: "Pendopo Bangil",
    ticket_type: "Gratis",
    ticket_info: "Gratis (Hari Ini)",
    media: [
      {
        type: "image",
        url: null,
        alt: "Pertunjukan Wayang Hari Ini (placeholder)",
      },
    ],
  },
];

const PASINFO_ACARA = { 
  categories: ACARA_CATEGORIES, 
  events: ACARA_EVENTS,
  regions: ACARA_REGIONS,
  eventsToday: ACARA_HARI_INI,
};
if (typeof window !== "undefined") {
  window.PASINFO_ACARA = PASINFO_ACARA;
}
