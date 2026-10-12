/**
 * MOCK DATA — Pasuruan Info Homepage
 * ==================================
 *
 * STATUS : OWNER-SUPPLIED HOMEPAGE NEWS (2026-10-10) + MOCK SCAFFOLD
 *
 * 4 item berita (id 303–306: judul, slug, tanggal, konten, alt) diberikan
 * Product Owner dan disalin verbatim ke MOCK_HERO / MOCK_PILIHAN /
 * MOCK_KATEGORI_GROUPS di bawah. Kategori per slot MENCERMINKAN badge yang
 * terpasang di index.html (tidak diubah pada sync ini).
 *
 * place / sources / verification tetap null/[] karena backend Laravel
 * (sources, verifications) belum diimplementasikan — lihat schema.md §69.
 * media.url tetap null mengikuti data Owner; file gambar riil dipakai langsung
 * oleh markup index.html (public/assets/images/news/).
 *
 * Bagian JELAJAH, iklan, navigasi, dan footer tetap MOCK / PLACEHOLDER.
 *
 * Bentuk data mengikuti kontrak API Resource pada `schema.md` §28 dan §61,
 * agar transisi mock data → API response tidak memerlukan perubahan component.
 *
 * CATATAN ANTI-HALUSINASI:
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
    id: 303,
    slug: "kolaborasi-warga-dan-petugas-dalam-aksi-bersih-lingkungan",
    title: "Kolaborasi Warga dan Petugas dalam Aksi Bersih Lingkungan",
    excerpt:
      "Kegiatan bersih lingkungan menjadi salah satu bentuk kepedulian masyarakat terhadap kebersihan dan kelestarian kawasan sekitar. Dalam gambar terlihat sejumlah warga dan petugas bekerja bersama mengumpulkan sampah di area terbuka yang berlumpur.",
    category: MOCK_CATEGORIES.lokal,
    published_at: "2026-10-09T22:00:00Z",
    published_label: "10 Okt 2026",
    time_label: "05:00 WIB",
    featured: true,
    status: "published",
    author: { id: 1, name: "Redaksi" },
    media: [{ type: "image", url: null, alt: "Warga dan petugas bekerja sama dalam kegiatan bersih lingkungan" }],
    place: null,
    short_description: null,
    prices: [],
    opening_hours: [],
    sources: [],
    verification: { status: null, verified_at: null },
  },
  secondary: [
    {
      id: 305,
      slug: "koordinasi-pejabat-pemerintah-dalam-mendukung-program-pembangunan",
      title: "Koordinasi Pejabat Pemerintah Jadi Bagian Penting dalam Program Pembangunan",
      excerpt: null,
      category: MOCK_CATEGORIES.wisata,
      published_at: "2026-10-07T23:00:00Z",
      published_label: "08 Okt 2026",
      time_label: "06:00 WIB",
      featured: false,
      status: "published",
      author: { id: 1, name: "Redaksi" },
      media: [{ type: "image", url: null, alt: "Sejumlah pejabat pemerintah berjalan bersama dalam sebuah kegiatan" }],
      place: null,
      short_description: null,
      prices: [],
      opening_hours: [],
      sources: [],
      verification: { status: null, verified_at: null },
    },
    {
      id: 306,
      slug: "pentingnya-sinergi-pemerintah-dan-masyarakat-dalam-pembangunan",
      title: "Sinergi Pemerintah dan Masyarakat Berperan dalam Mendukung Pembangunan",
      excerpt: null,
      category: MOCK_CATEGORIES.nasional,
      published_at: "2026-10-06T23:30:00Z",
      published_label: "07 Okt 2026",
      time_label: "06:30 WIB",
      featured: false,
      status: "published",
      author: { id: 1, name: "Redaksi" },
      media: [{ type: "image", url: null, alt: "Pejabat negara menyampaikan pidato resmi di podium" }],
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
      id: 303,
      slug: "kolaborasi-warga-dan-petugas-dalam-aksi-bersih-lingkungan",
      title: "Kolaborasi Warga dan Petugas dalam Aksi Bersih Lingkungan",
      category: MOCK_CATEGORIES.nasional,
      published_at: "2026-10-09T22:00:00Z",
      published_label: "10 Okt 2026",
      time_label: "05:00 WIB",
      media: [{ type: "image", url: null, alt: "Warga dan petugas bekerja sama dalam kegiatan bersih lingkungan" }],
    },
    {
      id: 304,
      slug: "peran-media-dalam-menyampaikan-informasi-kepada-masyarakat",
      title: "Peran Media dalam Menyampaikan Informasi kepada Masyarakat",
      category: MOCK_CATEGORIES.nasional,
      published_at: "2026-10-08T22:30:00Z",
      published_label: "09 Okt 2026",
      time_label: "05:30 WIB",
      media: [{ type: "image", url: null, alt: "Presenter berita menyampaikan informasi di studio televisi" }],
    },
    {
      id: 305,
      slug: "koordinasi-pejabat-pemerintah-dalam-mendukung-program-pembangunan",
      title: "Koordinasi Pejabat Pemerintah Jadi Bagian Penting dalam Program Pembangunan",
      category: MOCK_CATEGORIES.nasional,
      published_at: "2026-10-07T23:00:00Z",
      published_label: "08 Okt 2026",
      time_label: "06:00 WIB",
      media: [{ type: "image", url: null, alt: "Sejumlah pejabat pemerintah berjalan bersama dalam sebuah kegiatan" }],
    },
    {
      id: 306,
      slug: "pentingnya-sinergi-pemerintah-dan-masyarakat-dalam-pembangunan",
      title: "Sinergi Pemerintah dan Masyarakat Berperan dalam Mendukung Pembangunan",
      category: MOCK_CATEGORIES.nasional,
      published_at: "2026-10-06T23:30:00Z",
      published_label: "07 Okt 2026",
      time_label: "06:30 WIB",
      media: [{ type: "image", url: null, alt: "Pejabat negara menyampaikan pidato resmi di podium" }],
    },
  ],
};

const MOCK_PILIHAN = [
  {
    id: 303,
    slug: "kolaborasi-warga-dan-petugas-dalam-aksi-bersih-lingkungan",
    title: "Kolaborasi Warga dan Petugas dalam Aksi Bersih Lingkungan",
    excerpt:
      "Kegiatan bersih lingkungan menjadi salah satu bentuk kepedulian masyarakat terhadap kebersihan dan kelestarian kawasan sekitar.",
    category: MOCK_CATEGORIES.lokal,
    published_at: "2026-10-09T22:00:00Z",
    published_label: "10 Okt 2026",
    time_label: "05:00 WIB",
    status: "published",
    author: { id: 1, name: "Redaksi" },
    media: [{ type: "image", url: null, alt: "Warga dan petugas bekerja sama dalam kegiatan bersih lingkungan" }],
    place: null,
    short_description: null,
    prices: [],
    opening_hours: [],
    sources: [],
    verification: { status: null, verified_at: null },
  },
  {
    id: 304,
    slug: "peran-media-dalam-menyampaikan-informasi-kepada-masyarakat",
    title: "Peran Media dalam Menyampaikan Informasi kepada Masyarakat",
    excerpt: "Media memiliki peran penting dalam menyampaikan informasi mengenai berbagai peristiwa kepada masyarakat.",
    category: MOCK_CATEGORIES.lokal,
    published_at: "2026-10-08T22:30:00Z",
    published_label: "09 Okt 2026",
    time_label: "05:30 WIB",
    status: "published",
    author: { id: 1, name: "Redaksi" },
    media: [{ type: "image", url: null, alt: "Presenter berita menyampaikan informasi di studio televisi" }],
    place: null,
    short_description: null,
    prices: [],
    opening_hours: [],
    sources: [],
    verification: { status: null, verified_at: null },
  },
  {
    id: 305,
    slug: "koordinasi-pejabat-pemerintah-dalam-mendukung-program-pembangunan",
    title: "Koordinasi Pejabat Pemerintah Jadi Bagian Penting dalam Program Pembangunan",
    excerpt: "Koordinasi antarpemangku kepentingan merupakan salah satu aspek penting dalam mendukung pelaksanaan program pembangunan.",
    category: MOCK_CATEGORIES.lokal,
    published_at: "2026-10-07T23:00:00Z",
    published_label: "08 Okt 2026",
    time_label: "06:00 WIB",
    status: "published",
    author: { id: 1, name: "Redaksi" },
    media: [{ type: "image", url: null, alt: "Sejumlah pejabat pemerintah berjalan bersama dalam sebuah kegiatan" }],
    place: null,
    short_description: null,
    prices: [],
    opening_hours: [],
    sources: [],
    verification: { status: null, verified_at: null },
  },
  {
    id: 306,
    slug: "pentingnya-sinergi-pemerintah-dan-masyarakat-dalam-pembangunan",
    title: "Sinergi Pemerintah dan Masyarakat Berperan dalam Mendukung Pembangunan",
    excerpt: "Pembangunan yang berkelanjutan membutuhkan kerja sama berbagai pihak, termasuk pemerintah, masyarakat, dan sektor terkait.",
    category: MOCK_CATEGORIES.lokal,
    published_at: "2026-10-06T23:30:00Z",
    published_label: "07 Okt 2026",
    time_label: "06:30 WIB",
    status: "published",
    author: { id: 1, name: "Redaksi" },
    media: [{ type: "image", url: null, alt: "Pejabat negara menyampaikan pidato resmi di podium" }],
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
        id: 303,
        slug: "kolaborasi-warga-dan-petugas-dalam-aksi-bersih-lingkungan",
        title: "Kolaborasi Warga dan Petugas dalam Aksi Bersih Lingkungan",
        published_at: "2026-10-09T22:00:00Z",
        published_label: "10 Okt 2026",
        time_label: "05:00 WIB",
        media: [{ type: "image", url: null, alt: "Warga dan petugas bekerja sama dalam kegiatan bersih lingkungan" }],
      },
      {
        id: 304,
        slug: "peran-media-dalam-menyampaikan-informasi-kepada-masyarakat",
        title: "Peran Media dalam Menyampaikan Informasi kepada Masyarakat",
        published_at: "2026-10-08T22:30:00Z",
        published_label: "09 Okt 2026",
        time_label: "05:30 WIB",
        media: [{ type: "image", url: null, alt: "Presenter berita menyampaikan informasi di studio televisi" }],
      },
      {
        id: 305,
        slug: "koordinasi-pejabat-pemerintah-dalam-mendukung-program-pembangunan",
        title: "Koordinasi Pejabat Pemerintah Jadi Bagian Penting dalam Program Pembangunan",
        published_at: "2026-10-07T23:00:00Z",
        published_label: "08 Okt 2026",
        time_label: "06:00 WIB",
        media: [{ type: "image", url: null, alt: "Sejumlah pejabat pemerintah berjalan bersama dalam sebuah kegiatan" }],
      },
    ],
  },
  {
    category: MOCK_CATEGORIES.nasional,
    items: [
      {
        id: 306,
        slug: "pentingnya-sinergi-pemerintah-dan-masyarakat-dalam-pembangunan",
        title: "Sinergi Pemerintah dan Masyarakat Berperan dalam Mendukung Pembangunan",
        published_at: "2026-10-06T23:30:00Z",
        published_label: "07 Okt 2026",
        time_label: "06:30 WIB",
        media: [{ type: "image", url: null, alt: "Pejabat negara menyampaikan pidato resmi di podium" }],
      },
      {
        id: 303,
        slug: "kolaborasi-warga-dan-petugas-dalam-aksi-bersih-lingkungan",
        title: "Kolaborasi Warga dan Petugas dalam Aksi Bersih Lingkungan",
        published_at: "2026-10-09T22:00:00Z",
        published_label: "10 Okt 2026",
        time_label: "05:00 WIB",
        media: [{ type: "image", url: null, alt: "Warga dan petugas bekerja sama dalam kegiatan bersih lingkungan" }],
      },
      {
        id: 304,
        slug: "peran-media-dalam-menyampaikan-informasi-kepada-masyarakat",
        title: "Peran Media dalam Menyampaikan Informasi kepada Masyarakat",
        published_at: "2026-10-08T22:30:00Z",
        published_label: "09 Okt 2026",
        time_label: "05:30 WIB",
        media: [{ type: "image", url: null, alt: "Presenter berita menyampaikan informasi di studio televisi" }],
      },
    ],
  },
  {
    category: MOCK_CATEGORIES.internasional,
    items: [
      {
        id: 305,
        slug: "koordinasi-pejabat-pemerintah-dalam-mendukung-program-pembangunan",
        title: "Koordinasi Pejabat Pemerintah Jadi Bagian Penting dalam Program Pembangunan",
        published_at: "2026-10-07T23:00:00Z",
        published_label: "08 Okt 2026",
        time_label: "06:00 WIB",
        media: [{ type: "image", url: null, alt: "Sejumlah pejabat pemerintah berjalan bersama dalam sebuah kegiatan" }],
      },
      {
        id: 306,
        slug: "pentingnya-sinergi-pemerintah-dan-masyarakat-dalam-pembangunan",
        title: "Sinergi Pemerintah dan Masyarakat Berperan dalam Mendukung Pembangunan",
        published_at: "2026-10-06T23:30:00Z",
        published_label: "07 Okt 2026",
        time_label: "06:30 WIB",
        media: [{ type: "image", url: null, alt: "Pejabat negara menyampaikan pidato resmi di podium" }],
      },
      {
        id: 303,
        slug: "kolaborasi-warga-dan-petugas-dalam-aksi-bersih-lingkungan",
        title: "Kolaborasi Warga dan Petugas dalam Aksi Bersih Lingkungan",
        published_at: "2026-10-09T22:00:00Z",
        published_label: "10 Okt 2026",
        time_label: "05:00 WIB",
        media: [{ type: "image", url: null, alt: "Warga dan petugas bekerja sama dalam kegiatan bersih lingkungan" }],
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
