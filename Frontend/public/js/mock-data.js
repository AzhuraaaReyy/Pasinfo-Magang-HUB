/**
 * MOCK DATA — Pasuruan Info Homepage
 * ==================================
 *
 * STATUS : MOCK / PLACEHOLDER
 *
 * Belum ada backend. Seluruh isi file ini adalah placeholder untuk keperluan
 * pengembangan dan pengujian layout. Tidak ada satupun data di bawah yang
 * merupakan informasi nyata tentang Pasuruan, perusahaan, acara, atau berita.
 *
 * Bentuk data mengikuti kontrak API Resource pada `schema.md` §28 dan §61,
 * agar transisi mock data → API response tidak memerlukan perubahan component.
 *
 * CATATAN ANTI-HALUSINASI:
 * - Tidak ada koordinat, harga, jam buka, atau statistik nyata.
 * - `place` bernilai null karena belum ada data lokasi terverifikasi.
 * - `sources` kosong karena belum ada sumber terverifikasi.
 * - URL akun social media tidak dicantumkan (lihat design.md §27.1).
 * - `short_description`, `prices`, dan `opening_hours` sengaja tetap ada sebagai
 *   key bernilai null/[] pada item koji. Bentuk key mengikuti schema.md §61
 *   sehingga transisi mock → API tidak mengubah struktur component, tanpa
 *   mengarang nilai yang belum terverifikasi.
 */

const MOCK_CATEGORIES = {
  lokal: { id: 1, slug: "lokal", name: "Lokal" },
  nasional: { id: 2, slug: "nasional", name: "Nasional" },
  internasional: { id: 3, slug: "internasional", name: "Internasional" },
  wisata: { id: 4, slug: "wisata", name: "Wisata" },
  kuliner: { id: 5, slug: "kuliner", name: "Kuliner" },
  budaya: { id: 6, slug: "budaya", name: "Budaya" },
  acara: { id: 7, slug: "acara", name: "Acara" },
  politik: { id: 8, slug: "politik", name: "Politik" },
};

const MOCK_NAVIGATION = [
  { label: "Beranda", slug: "beranda", current: true },
  { label: "Lokal", slug: "lokal", current: false },
  { label: "Nasional", slug: "nasional", current: false },
  { label: "Internasional", slug: "internasional", current: false },
  { label: "Inspiratif", slug: "inspiratif", current: false },
  { label: "Politik", slug: "politik", current: false },
];

const MOCK_HERO = {
  featured: {
    id: 101,
    slug: "mock-berita-utama",
    title: "Judul Berita Utama Mock — Placeholder Developmental",
    excerpt:
      "Ringkasan placeholder untuk menguji panjang teks dan line clamp pada kartu utama. Seluruh isi halaman ini merupakan data mock.",
    category: MOCK_CATEGORIES.lokal,
    published_at: "2026-09-25T03:24:00Z",
    published_label: "25 Sep 2026",
    time_label: "10:24 WIB",
    featured: true,
    status: "published",
    author: { id: 1, name: "MOCK Redaksi" },
    media: [{ type: "image", url: null, alt: "Placeholder gambar berita utama" }],
    place: null,
    short_description: null,
    prices: [],
    opening_hours: [],
    sources: [],
    verification: { status: null, verified_at: null },
  },
  secondary: [
    {
      id: 102,
      slug: "mock-berita-dukungan-1",
      title: "Judul Berita Pendukung Mock Satu",
      excerpt: null,
      category: MOCK_CATEGORIES.wisata,
      published_at: "2026-09-25T02:10:00Z",
      published_label: "25 Sep 2026",
      time_label: "09:10 WIB",
      featured: false,
      status: "published",
      author: { id: 1, name: "MOCK Redaksi" },
      media: [{ type: "image", url: null, alt: "Placeholder gambar berita pendukung satu" }],
      place: null,
      short_description: null,
      prices: [],
      opening_hours: [],
      sources: [],
      verification: { status: null, verified_at: null },
    },
    {
      id: 103,
      slug: "mock-berita-dukungan-2",
      title: "Judul Berita Pendukung Mock Dua",
      excerpt: null,
      category: MOCK_CATEGORIES.lokal,
      published_at: "2026-09-24T23:45:00Z",
      published_label: "24 Sep 2026",
      time_label: "06:45 WIB",
      featured: false,
      status: "published",
      author: { id: 1, name: "MOCK Redaksi" },
      media: [{ type: "image", url: null, alt: "Placeholder gambar berita pendukung dua" }],
      place: null,
      short_description: null,
      prices: [],
      opening_hours: [],
      sources: [],
      verification: { status: null, verified_at: null },
    },
  ],
  latest: [
    {
      id: 111,
      slug: "mock-terbaru-1",
      title: "Judul Berita Terbaru Mock Satu",
      category: MOCK_CATEGORIES.nasional,
      published_at: "2026-09-25T03:00:00Z",
      published_label: "25 Sep 2026",
      time_label: "10:00 WIB",
      media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita terbaru satu" }],
    },
    {
      id: 112,
      slug: "mock-terbaru-2",
      title: "Judul Berita Terbaru Mock Dua",
      category: MOCK_CATEGORIES.nasional,
      published_at: "2026-09-25T02:35:00Z",
      published_label: "25 Sep 2026",
      time_label: "09:35 WIB",
      media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita terbaru dua" }],
    },
    {
      id: 113,
      slug: "mock-terbaru-3",
      title: "Judul Berita Terbaru Mock Tiga",
      category: MOCK_CATEGORIES.nasional,
      published_at: "2026-09-25T02:05:00Z",
      published_label: "25 Sep 2026",
      time_label: "09:05 WIB",
      media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita terbaru tiga" }],
    },
    {
      id: 114,
      slug: "mock-terbaru-4",
      title: "Judul Berita Terbaru Mock Empat",
      category: MOCK_CATEGORIES.nasional,
      published_at: "2026-09-25T01:40:00Z",
      published_label: "25 Sep 2026",
      time_label: "08:40 WIB",
      media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita terbaru empat" }],
    },
  ],
};

const MOCK_PILIHAN = [
  {
    id: 201,
    slug: "mock-pilihan-1",
    title: "Judul Berita Pilihan Mock Satu Dengan Teks Agak Panjang Untuk Menguji Line Clamp Dua Baris",
    excerpt:
      "Ringkasan placeholder dua baris untuk memverifikasi line clamp bekerja dan tinggi card tetap konsisten.",
    category: MOCK_CATEGORIES.lokal,
    published_at: "2026-09-25T01:20:00Z",
    published_label: "25 Sep 2026",
    time_label: "08:20 WIB",
    status: "published",
    author: { id: 1, name: "MOCK Redaksi" },
    media: [{ type: "image", url: null, alt: "Placeholder gambar berita pilihan satu" }],
    place: null,
    short_description: null,
    prices: [],
    opening_hours: [],
    sources: [],
    verification: { status: null, verified_at: null },
  },
  {
    id: 202,
    slug: "mock-pilihan-2",
    title: "Judul Berita Pilihan Mock Dua",
    excerpt: "Ringkasan singkat placeholder untuk menguji tinggi card.",
    category: MOCK_CATEGORIES.lokal,
    published_at: "2026-09-25T01:00:00Z",
    published_label: "25 Sep 2026",
    time_label: "08:00 WIB",
    status: "published",
    author: { id: 1, name: "MOCK Redaksi" },
    media: [{ type: "image", url: null, alt: "Placeholder gambar berita pilihan dua" }],
    place: null,
    short_description: null,
    prices: [],
    opening_hours: [],
    sources: [],
    verification: { status: null, verified_at: null },
  },
  {
    id: 203,
    slug: "mock-pilihan-3",
    title: "Judul Berita Pilihan Mock Tiga",
    excerpt: "Ringkasan placeholder dengan panjang sedang agar line clamp konsisten antar kartu.",
    category: MOCK_CATEGORIES.lokal,
    published_at: "2026-09-24T23:00:00Z",
    published_label: "24 Sep 2026",
    time_label: "06:00 WIB",
    status: "published",
    author: { id: 1, name: "MOCK Redaksi" },
    media: [{ type: "image", url: null, alt: "Placeholder gambar berita pilihan tiga" }],
    place: null,
    short_description: null,
    prices: [],
    opening_hours: [],
    sources: [],
    verification: { status: null, verified_at: null },
  },
  {
    id: 204,
    slug: "mock-pilihan-4",
    title: "Judul Berita Pilihan Mock Empat",
    excerpt: "Ringkasan placeholder standar.",
    category: MOCK_CATEGORIES.lokal,
    published_at: "2026-09-24T22:30:00Z",
    published_label: "24 Sep 2026",
    time_label: "05:30 WIB",
    status: "published",
    author: { id: 1, name: "MOCK Redaksi" },
    media: [{ type: "image", url: null, alt: "Placeholder gambar berita pilihan empat" }],
    place: null,
    short_description: null,
    prices: [],
    opening_hours: [],
    sources: [],
    verification: { status: null, verified_at: null },
  },
];

const MOCK_KATEGORI_GROUPS = [
  {
    category: MOCK_CATEGORIES.lokal,
    items: [
      {
        id: 301,
        slug: "mock-lokal-1",
        title: "Judul Berita Lokal Mock Satu",
        published_at: "2026-09-25T00:50:00Z",
        published_label: "25 Sep 2026",
        time_label: "07:50 WIB",
        media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita lokal satu" }],
      },
      {
        id: 302,
        slug: "mock-lokal-2",
        title: "Judul Berita Lokal Mock Dua",
        published_at: "2026-09-24T22:00:00Z",
        published_label: "24 Sep 2026",
        time_label: "05:00 WIB",
        media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita lokal dua" }],
      },
      {
        id: 303,
        slug: "mock-lokal-3",
        title: "Judul Berita Lokal Mock Tiga",
        published_at: "2026-09-24T20:15:00Z",
        published_label: "24 Sep 2026",
        time_label: "03:15 WIB",
        media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita lokal tiga" }],
      },
    ],
  },
  {
    category: MOCK_CATEGORIES.nasional,
    items: [
      {
        id: 311,
        slug: "mock-nasional-1",
        title: "Judul Berita Nasional Mock Satu",
        published_at: "2026-09-25T00:40:00Z",
        published_label: "25 Sep 2026",
        time_label: "07:40 WIB",
        media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita nasional satu" }],
      },
      {
        id: 312,
        slug: "mock-nasional-2",
        title: "Judul Berita Nasional Mock Dua",
        published_at: "2026-09-24T21:30:00Z",
        published_label: "24 Sep 2026",
        time_label: "04:30 WIB",
        media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita nasional dua" }],
      },
      {
        id: 313,
        slug: "mock-nasional-3",
        title: "Judul Berita Nasional Mock Tiga",
        published_at: "2026-09-24T19:45:00Z",
        published_label: "24 Sep 2026",
        time_label: "02:45 WIB",
        media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita nasional tiga" }],
      },
    ],
  },
  {
    category: MOCK_CATEGORIES.internasional,
    items: [
      {
        id: 321,
        slug: "mock-internasional-1",
        title: "Judul Berita Internasional Mock Satu",
        published_at: "2026-09-25T00:30:00Z",
        published_label: "25 Sep 2026",
        time_label: "07:30 WIB",
        media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita internasional satu" }],
      },
      {
        id: 322,
        slug: "mock-internasional-2",
        title: "Judul Berita Internasional Mock Dua",
        published_at: "2026-09-24T20:50:00Z",
        published_label: "24 Sep 2026",
        time_label: "03:50 WIB",
        media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita internasional dua" }],
      },
      {
        id: 323,
        slug: "mock-internasional-3",
        title: "Judul Berita Internasional Mock Tiga",
        published_at: "2026-09-24T18:20:00Z",
        published_label: "24 Sep 2026",
        time_label: "01:20 WIB",
        media: [{ type: "image", url: null, alt: "Placeholder thumbnail berita internasional tiga" }],
      },
    ],
  },
];

const MOCK_JELAJAH = [
  {
    id: 401,
    slug: "mock-jelajah-wisata",
    title: "Mock Destinasi Wisata",
    category: MOCK_CATEGORIES.wisata,
    cta_label: "Jelajah Wisata",
    state: "active",
    media: [{ type: "image", url: null, alt: "Placeholder gambar card wisata" }],
  },
  {
    id: 402,
    slug: "mock-jelajah-kuliner",
    title: "Mock Jelajah Kuliner",
    category: MOCK_CATEGORIES.kuliner,
    cta_label: "Jelajah Kuliner",
    state: "standard",
    media: null,
  },
  {
    id: 403,
    slug: "mock-jelajah-budaya",
    title: "Mock Jelajah Budaya",
    category: MOCK_CATEGORIES.budaya,
    cta_label: "Jelajah Budaya",
    state: "standard",
    media: null,
  },
  {
    id: 404,
    slug: "mock-jelajah-acara",
    title: "Mock Jelajah Acara",
    category: MOCK_CATEGORIES.acara,
    cta_label: "Jelajah Acara",
    state: "standard",
    media: null,
  },
];

const MOCK_ADVERTISEMENT = {
  id: 1,
  slot: "homepage-full-width",
  label: "Space Iklan",
  height_class: "h-32 md:h-40",
};

const MOCK_FOOTER = {
  brand: {
    name: "Pasuruan Info",
    tagline: "Mock deskripsi portal berita dan platform jelajah destinasi.",
  },
  social: {
    title: "Ikuti Kami",
    items: ["whatsapp", "instagram", "facebook", "x", "tiktok"],
  },
  contact: {
    title: "Kontak",
    email: "pasuruaninfo234@gmail.com",
    email_status: "user-supplied, belum diverifikasi sebagai kontak publik resmi",
    phone: null,
    address: null,
  },
};

const MOCK_HOME = {
  navigation: MOCK_NAVIGATION,
  hero: MOCK_HERO,
  pilihan: MOCK_PILIHAN,
  kategori_groups: MOCK_KATEGORI_GROUPS,
  jelajah: MOCK_JELAJAH,
  advertisement: MOCK_ADVERTISEMENT,
  footer: MOCK_FOOTER,
};
