/**
 * MOCK DATA — Pasuruan Info Homepage (versi 10 data per section)
 * ==============================================================
 *
 * Section yang tersedia (masing-masing 10 data berbeda):
 *   1. lokal          → kategori Lokal          (id 101–110)
 *   2. nasional       → kategori Nasional       (id 201–210)
 *   3. internasional  → kategori Internasional  (id 301–310)
 *   4. inspiratif     → kategori Inspiratif     (id 401–410)
 *   5. terbaru        → 10 berita paling baru dari semua kategori (otomatis
 *                       diurutkan berdasarkan published_at)
 *   6. pilihan        → 10 berita pilihan redaksi (dipilih manual lewat id,
 *                       sengaja TIDAK ada yang sama dengan "terbaru")
 *
 * Pasinfo Jelajah: hanya 4 kartu → Wisata, Kuliner, Budaya, Acara.
 *
 * Field tiap berita:
 *   id, slug, title, description, categories,
 *   published_at, published_date, published_year, published_label, time_label,
 *   source
 *
 * CATATAN:
 * - source = pasuruan.com; article_url masih null (belum ada URL artikel asli).
 * - Semua judul & deskripsi hanyalah contoh (dummy) untuk kebutuhan tampilan.
 */

/* ---------- HELPER ---------- */

const BULAN_SINGKAT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** buildTime("2026-10-10", "05:00") → published_at "2026-10-10T05:00:00+07:00",
 *  published_label "10 Okt 2026", time_label "05:00 WIB", published_year 2026 */
function buildTime(date, time) {
  const [y, m, d] = date.split("-").map(Number);
  return {
    published_at: `${date}T${time}:00+07:00`,
    published_date: date,
    published_year: y,
    published_label: `${String(d).padStart(2, "0")} ${BULAN_SINGKAT[m - 1]} ${y}`,
    time_label: `${time} WIB`,
  };
}

/** "Judul Berita!" → "judul-berita" */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, "dan")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* ---------- KATEGORI & SUMBER ---------- */

const MOCK_CATEGORIES = {
  lokal: { id: 1, slug: "lokal", name: "Lokal" },
  nasional: { id: 2, slug: "nasional", name: "Nasional" },
  internasional: { id: 3, slug: "internasional", name: "Internasional" },
  inspiratif: { id: 4, slug: "inspiratif", name: "Inspiratif" },
  // kategori khusus Pasinfo Jelajah
  wisata: { id: 5, slug: "wisata", name: "Wisata" },
  kuliner: { id: 6, slug: "kuliner", name: "Kuliner" },
  budaya: { id: 7, slug: "budaya", name: "Budaya" },
  acara: { id: 8, slug: "acara", name: "Acara" },
};

const MOCK_SOURCE = {
  name: "Pasuruan.com",
  domain: "pasuruan.com",
  url: "https://pasuruan.com",
  article_url: null,
};

/** Membuat satu berita lengkap. */
function makeNews(id, categoryKey, title, description, date, time) {
  return {
    id,
    slug: slugify(title),
    title,
    description,
    categories: [MOCK_CATEGORIES[categoryKey]],
    ...buildTime(date, time),
    source: MOCK_SOURCE,
  };
}

/* ---------- 1. LOKAL (10) ---------- */

const MOCK_LOKAL = [
  makeNews(
    101,
    "lokal",
    "Pemkot Pasuruan Perluas Layanan Administrasi Kependudukan Digital",
    "Warga kini dapat mengurus sejumlah dokumen kependudukan secara daring tanpa harus antre di kantor layanan.",
    "2026-10-14",
    "06:30",
  ),
  makeNews(
    102,
    "lokal",
    "Harga Cabai di Pasar Pasuruan Mulai Turun Jelang Akhir Pekan",
    "Pasokan dari petani sekitar yang kembali lancar membuat harga cabai di sejumlah pasar tradisional berangsur turun.",
    "2026-10-13",
    "17:00",
  ),
  makeNews(
    103,
    "lokal",
    "Normalisasi Saluran Drainase di Bugul Kidul Ditargetkan Rampung November",
    "Pengerjaan drainase dilakukan untuk mengurangi genangan yang kerap muncul di permukiman saat musim hujan.",
    "2026-10-13",
    "08:00",
  ),
  makeNews(
    104,
    "lokal",
    "Kampung Tematik Pasuruan Raih Penghargaan Kebersihan Lingkungan",
    "Kekompakan warga dalam mengelola sampah dan menata lingkungan menjadi nilai utama dalam penilaian.",
    "2026-10-12",
    "10:15",
  ),
  makeNews(
    105,
    "lokal",
    "Dinas Pendidikan Pasuruan Gelar Pelatihan Guru Berbasis Teknologi",
    "Ratusan guru mengikuti pelatihan pemanfaatan perangkat digital untuk mendukung kegiatan belajar mengajar.",
    "2026-10-09",
    "09:00",
  ),
  makeNews(
    106,
    "lokal",
    "Pelabuhan Pasuruan Tingkatkan Kapasitas Bongkar Muat",
    "Penambahan fasilitas diharapkan mempercepat arus barang dan menunjang pertumbuhan ekonomi daerah.",
    "2026-10-08",
    "13:45",
  ),
  makeNews(
    107,
    "lokal",
    "Pembinaan UMKM Kerajinan Lokal Pasuruan Libatkan Pelaku Usaha Muda",
    "Pelatihan mencakup pengemasan produk, pemasaran digital, dan pengelolaan keuangan sederhana.",
    "2026-10-06",
    "11:20",
  ),
  makeNews(
    108,
    "lokal",
    "Puskesmas Keliling Jangkau Desa-Desa yang Jauh dari Fasilitas Kesehatan",
    "Layanan pemeriksaan gratis disambut antusias warga yang selama ini kesulitan menjangkau puskesmas.",
    "2026-10-05",
    "08:30",
  ),
  makeNews(
    109,
    "lokal",
    "Warga Bergotong Royong Perbaiki Jalan Desa Pascahujan",
    "Kerja bakti dilakukan secara swadaya agar akses jalan kembali aman dilalui kendaraan.",
    "2026-10-03",
    "07:40",
  ),
  makeNews(
    110,
    "lokal",
    "Jadwal Perbaikan Jalur Pantura Pasuruan Diumumkan, Pengendara Diminta Waspada",
    "Pengaturan lalu lintas akan diberlakukan secara bergantian selama pekerjaan berlangsung.",
    "2026-10-02",
    "15:10",
  ),
];

/* ---------- 2. NASIONAL (10) ---------- */

const MOCK_NASIONAL = [
  makeNews(
    201,
    "nasional",
    "Pemerintah Dorong Percepatan Digitalisasi Layanan Publik di Seluruh Daerah",
    "Integrasi layanan digital ditargetkan memudahkan masyarakat mengakses pelayanan pemerintah.",
    "2026-10-14",
    "07:15",
  ),
  makeNews(
    202,
    "nasional",
    "Pemerintah Siapkan Penyesuaian Kalender Akademik Semester Genap",
    "Penyesuaian dilakukan agar pelaksanaan pembelajaran di berbagai daerah berjalan lebih efektif.",
    "2026-10-13",
    "19:00",
  ),
  makeNews(
    203,
    "nasional",
    "Inflasi Nasional Terjaga, Pemerintah Pastikan Stok Pangan Aman",
    "Pemantauan harga kebutuhan pokok terus dilakukan untuk menjaga daya beli masyarakat.",
    "2026-10-13",
    "12:30",
  ),
  makeNews(
    204,
    "nasional",
    "Program Penghijauan Nasional Targetkan Jutaan Bibit Pohon Ditanam",
    "Kegiatan melibatkan pemerintah daerah, komunitas, dan pelajar di berbagai provinsi.",
    "2026-10-12",
    "09:30",
  ),
  makeNews(
    205,
    "nasional",
    "Jalur Kereta Api Baru Tingkatkan Konektivitas Antarkota di Pulau Jawa",
    "Pengembangan jalur diharapkan memangkas waktu tempuh dan mendorong pertumbuhan ekonomi wilayah.",
    "2026-10-11",
    "14:00",
  ),
  makeNews(
    206,
    "nasional",
    "Akses Internet Desa di Wilayah 3T Terus Diperluas",
    "Perluasan jaringan bertujuan membuka akses pendidikan, informasi, dan peluang usaha bagi warga desa.",
    "2026-10-10",
    "10:45",
  ),
  makeNews(
    207,
    "nasional",
    "Penguatan Energi Terbarukan Jadi Prioritas Pembangunan Nasional",
    "Pemanfaatan tenaga surya dan air didorong untuk mengurangi ketergantungan pada energi fosil.",
    "2026-10-08",
    "08:20",
  ),
  makeNews(
    208,
    "nasional",
    "BMKG Imbau Masyarakat Waspadai Cuaca Ekstrem di Masa Pancaroba",
    "Hujan lebat disertai angin kencang berpotensi terjadi di sejumlah wilayah dalam beberapa hari ke depan.",
    "2026-10-07",
    "16:30",
  ),
  makeNews(
    209,
    "nasional",
    "Ekspor Produk UMKM Meningkat Berkat Pendampingan Pemerintah",
    "Pendampingan kualitas dan perizinan membantu pelaku usaha menembus pasar luar negeri.",
    "2026-10-05",
    "11:00",
  ),
  makeNews(
    210,
    "nasional",
    "Rencana Pembangunan Infrastruktur Pendidikan Dibahas Lintas Kementerian",
    "Pembahasan mencakup pemerataan fasilitas sekolah di daerah yang masih tertinggal.",
    "2026-10-04",
    "13:15",
  ),
];

/* ---------- 3. INTERNASIONAL (10) ---------- */

const MOCK_INTERNASIONAL = [
  makeNews(
    301,
    "internasional",
    "Pertemuan Para Pemimpin Dunia Bahas Kerja Sama Penanganan Perubahan Iklim",
    "Sejumlah negara menyepakati langkah bersama untuk menekan emisi dan memperkuat energi bersih.",
    "2026-10-14",
    "05:45",
  ),
  makeNews(
    302,
    "internasional",
    "Pasar Global Bergerak Hati-Hati di Tengah Ketidakpastian Ekonomi Dunia",
    "Para investor mencermati arah kebijakan ekonomi sejumlah negara besar dalam beberapa pekan ke depan.",
    "2026-10-13",
    "21:00",
  ),
  makeNews(
    303,
    "internasional",
    "Negara-Negara ASEAN Perkuat Kerja Sama Perdagangan Regional",
    "Kesepakatan baru diharapkan memperlancar arus barang dan jasa antarnegara anggota.",
    "2026-10-12",
    "15:20",
  ),
  makeNews(
    304,
    "internasional",
    "Riset Baterai Generasi Baru Diumumkan Tim Peneliti Internasional",
    "Teknologi tersebut diklaim lebih tahan lama dan lebih ramah lingkungan dibanding generasi sebelumnya.",
    "2026-10-11",
    "18:10",
  ),
  makeNews(
    305,
    "internasional",
    "Festival Kebudayaan Antarbangsa Digelar di Eropa, Libatkan Puluhan Negara",
    "Berbagai pertunjukan seni dan kuliner tradisional dari penjuru dunia ditampilkan kepada pengunjung.",
    "2026-10-09",
    "20:30",
  ),
  makeNews(
    306,
    "internasional",
    "Upaya Global Menekan Sampah Plastik di Lautan Terus Diperluas",
    "Kolaborasi antarnegara difokuskan pada pengurangan plastik sekali pakai dan peningkatan daur ulang.",
    "2026-10-08",
    "09:50",
  ),
  makeNews(
    307,
    "internasional",
    "Organisasi Kesehatan Dunia Serukan Penguatan Layanan Kesehatan Primer",
    "Layanan di tingkat dasar dinilai menjadi kunci untuk menjangkau lebih banyak masyarakat.",
    "2026-10-06",
    "17:40",
  ),
  makeNews(
    308,
    "internasional",
    "Perkembangan Kecerdasan Buatan Jadi Sorotan dalam Forum Teknologi Dunia",
    "Para pakar membahas peluang, tantangan, dan perlunya aturan penggunaan yang bertanggung jawab.",
    "2026-10-05",
    "22:00",
  ),
  makeNews(
    309,
    "internasional",
    "Tren Pariwisata Dunia Menguat, Asia Tenggara Jadi Tujuan Favorit",
    "Peningkatan kunjungan wisatawan mancanegara membawa dampak positif bagi sektor jasa dan ekonomi kreatif.",
    "2026-10-03",
    "12:25",
  ),
  makeNews(
    310,
    "internasional",
    "Kolaborasi Ilmuwan Dunia Pantau Perubahan Tinggi Muka Air Laut",
    "Data satelit dan pengamatan lapangan digabungkan untuk memperkirakan dampaknya pada kawasan pesisir.",
    "2026-10-01",
    "08:05",
  ),
];

/* ---------- 4. INSPIRATIF (10) ---------- */

const MOCK_INSPIRATIF = [
  makeNews(
    401,
    "inspiratif",
    "Guru Honorer di Pasuruan Sulap Kelas Sederhana Jadi Ruang Belajar Kreatif",
    "Dengan bahan bekas dan semangat tinggi, ia membuat pembelajaran terasa menyenangkan bagi murid-muridnya.",
    "2026-10-14",
    "08:00",
  ),
  makeNews(
    402,
    "inspiratif",
    "Pemuda Desa Rintis Usaha Daur Ulang Sampah Menjadi Kerajinan Bernilai Jual",
    "Usaha kecil tersebut kini membuka lapangan kerja bagi warga sekitar.",
    "2026-10-13",
    "15:30",
  ),
  makeNews(
    403,
    "inspiratif",
    "Kisah Penjual Jamu Keliling yang Mengantar Anaknya hingga Sarjana",
    "Ketekunan berjualan setiap hari menjadi bekal perjuangan menyekolahkan anak ke jenjang tinggi.",
    "2026-10-12",
    "06:50",
  ),
  makeNews(
    404,
    "inspiratif",
    "Komunitas Relawan Rutin Mengajar Anak-Anak di Kawasan Pesisir",
    "Kegiatan akhir pekan tersebut membuka akses belajar tambahan bagi anak-anak nelayan.",
    "2026-10-11",
    "09:10",
  ),
  makeNews(
    405,
    "inspiratif",
    "Pelajar Pasuruan Raih Juara Olimpiade Sains Tingkat Provinsi",
    "Prestasi diraih lewat latihan konsisten dan dukungan guru serta orang tua.",
    "2026-10-10",
    "14:20",
  ),
  makeNews(
    406,
    "inspiratif",
    "Petani Muda Kembangkan Pertanian Organik di Lahan Sempit",
    "Teknik tanam sederhana terbukti menghasilkan sayuran sehat dengan biaya yang terjangkau.",
    "2026-10-09",
    "07:30",
  ),
  makeNews(
    407,
    "inspiratif",
    "Penyandang Disabilitas Sukses Bangun Usaha Kuliner Rumahan",
    "Berawal dari dapur kecil, usahanya kini memiliki pelanggan tetap dari berbagai kalangan.",
    "2026-10-07",
    "10:00",
  ),
  makeNews(
    408,
    "inspiratif",
    "Perpustakaan Keliling Gerakan Warga Tumbuhkan Minat Baca Anak",
    "Koleksi buku dibawa berkeliling kampung menggunakan kendaraan sederhana secara sukarela.",
    "2026-10-06",
    "16:15",
  ),
  makeNews(
    409,
    "inspiratif",
    "Ibu Rumah Tangga Ubah Limbah Dapur Menjadi Pupuk Bernilai Jual",
    "Kreativitasnya memberi tambahan penghasilan sekaligus mengurangi sampah rumah tangga.",
    "2026-10-04",
    "09:40",
  ),
  makeNews(
    410,
    "inspiratif",
    "Mahasiswa Ciptakan Aplikasi Bantu Pedagang Kecil Mencatat Keuangan",
    "Aplikasi sederhana tersebut dirancang agar mudah digunakan oleh pelaku usaha yang baru mengenal teknologi.",
    "2026-10-02",
    "11:35",
  ),
];

/* ---------- LOOKUP SEMUA BERITA (per id) ---------- */

const ALL_NEWS = [
  ...MOCK_LOKAL,
  ...MOCK_NASIONAL,
  ...MOCK_INTERNASIONAL,
  ...MOCK_INSPIRATIF,
];

const NEWS = Object.fromEntries(ALL_NEWS.map((n) => [n.id, n]));

/** Ambil berita berdasarkan id. */
function getNews(id, overrides = {}) {
  return { ...NEWS[id], ...overrides };
}

/** Versi tanpa deskripsi (untuk list/kolom kecil). */
function getNewsBrief(id) {
  return getNews(id, { description: null });
}

/* ---------- 5. TERBARU (10, otomatis dari tanggal & jam terbaru) ---------- */

const MOCK_TERBARU = [...ALL_NEWS]
  .sort((a, b) => b.published_at.localeCompare(a.published_at))
  .slice(0, 10);

/* ---------- 6. BERITA PILIHAN (10, dipilih manual — tidak ada di Terbaru) ---------- */

const PILIHAN_IDS = [104, 106, 205, 207, 304, 306, 403, 405, 406, 408];
const MOCK_PILIHAN = PILIHAN_IDS.map((id) => getNews(id));

/* ---------- NAVIGASI ---------- */

const MOCK_NAVIGATION = [
  { label: "Terbaru", slug: "terbaru", current: true },
  { label: "Lokal", slug: "lokal", current: false },
  { label: "Nasional", slug: "nasional", current: false },
  { label: "Internasional", slug: "internasional", current: false },
  { label: "Inspiratif", slug: "inspiratif", current: false },
];

/* ---------- HERO ---------- */

const MOCK_HERO = {
  featured: MOCK_TERBARU[0],
  secondary: [
    getNewsBrief(MOCK_TERBARU[1].id),
    getNewsBrief(MOCK_TERBARU[2].id),
  ],
  // Berita Terbaru (kolom kanan, 10 item)
  latest: MOCK_TERBARU.map((n) => getNewsBrief(n.id)),
};

/* ---------- KOLOM KATEGORI ---------- */

const MOCK_KATEGORI_GROUPS = [
  { category: MOCK_CATEGORIES.lokal, items: MOCK_LOKAL },
  { category: MOCK_CATEGORIES.nasional, items: MOCK_NASIONAL },
  { category: MOCK_CATEGORIES.internasional, items: MOCK_INTERNASIONAL },
  { category: MOCK_CATEGORIES.inspiratif, items: MOCK_INSPIRATIF },
];

/* ---------- PASINFO JELAJAH (hanya 4) ---------- */

const MOCK_JELAJAH_SECTION = {
  title: "Pasinfo Jelajah",
  subtitle:
    "Temukan keindahan alam, cita rasa kuliner, kekayaan budaya, dan berbagai acara menarik di Pasuruan.",
};

const MOCK_JELAJAH = [
  {
    id: 501,
    slug: "jelajah-wisata",
    title: "Jelajah Destinasi Wisata Pasuruan",
    description:
      "Nikmati kesegaran alam dan suasana asri di salah satu destinasi wisata unggulan Pasuruan.",
    category: MOCK_CATEGORIES.wisata,
    cta_label: "Lihat Destinasi",
  },
  {
    id: 502,
    slug: "jelajah-kuliner",
    title: "Jelajah Destinasi Kuliner Pasuruan",
    description:
      "Rasakan cita rasa khas Pasuruan yang melegenda, pedasnya bikin nagih!",
    category: MOCK_CATEGORIES.kuliner,
    cta_label: "Lihat Kuliner",
  },
  {
    id: 503,
    slug: "jelajah-budaya",
    title: "Jelajah Destinasi Budaya Pasuruan",
    description:
      "Seni tradisional yang menjadi warisan budaya dan kebanggaan masyarakat Pasuruan.",
    category: MOCK_CATEGORIES.budaya,
    cta_label: "Lihat Budaya",
  },
  {
    id: 504,
    slug: "jelajah-acara",
    title: "Jelajah Destinasi Acara Pasuruan",
    description:
      "Ragam acara menarik mulai dari festival budaya, musik, hingga pameran UMKM.",
    category: MOCK_CATEGORIES.acara,
    cta_label: "Lihat Acara",
  },
];

/* ---------- IKLAN ---------- */

const MOCK_ADVERTISEMENT = {
  id: 1,
  slot: "homepage-full-width",
  label: "Space Iklan",
  height_class: "h-32 md:h-40",
};

/* ---------- FOOTER ---------- */

const MOCK_FOOTER = {
  brand: {
    name: "Pasuruan Info",
    tagline:
      "Portal informasi digital yang menyajikan berita terkini dan terpercaya seputar Pasuruan, meliputi peristiwa, cek fakta, ekonomi, pemerintahan, hiburan, kuliner, gaya hidup, pariwisata, serta dinamika lokal yang relevan bagi masyarakat.",
  },
  social: {
    title: "Ikuti Kami",
    items: ["whatsapp", "instagram", "tiktok", "youtube", "x", "threads"],
  },
  contact: {
    title: "Kontak",
    address: "Jl. KH. Samanhudi No. 29, Bugul Kidul, Kota Pasuruan",
    phone: "0851-6161-8669",
    email: "pasuruaninfo93@gmail.com",
  },
  links: [
    { label: "Kebijakan Privasi", slug: "kebijakan-privasi" },
    { label: "Syarat & Ketentuan", slug: "syarat-dan-ketentuan" },
    { label: "Redaksi", slug: "redaksi" },
  ],
  copyright: "© 2026 Pasuruan Info. All rights reserved.",
};

/* ---------- ROOT ---------- */

const MOCK_HOME = {
  navigation: MOCK_NAVIGATION,
  hero: MOCK_HERO,
  terbaru: MOCK_TERBARU,
  pilihan: MOCK_PILIHAN,
  lokal: MOCK_LOKAL,
  nasional: MOCK_NASIONAL,
  internasional: MOCK_INTERNASIONAL,
  inspiratif: MOCK_INSPIRATIF,
  kategori_groups: MOCK_KATEGORI_GROUPS,
  jelajah_section: MOCK_JELAJAH_SECTION,
  jelajah: MOCK_JELAJAH,
  advertisement: MOCK_ADVERTISEMENT,
  footer: MOCK_FOOTER,
};
