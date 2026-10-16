/**
 * DATA BUDAYA — Pasuruan Info (DATA REAL Owner, BUKAN mock).
 * ========================================================
 * Sumber: public/data/destinasi-budaya-pasuruan.json (25 destinasi).
 * Koordinat Google Places (keyakinan "sedang"); BELUM diverifikasi
 * terhadap poligon batas wilayah — verification.status = "pending".
 *
 * - Kategori halaman dipertahankan (tradisi/kesenian/situs/museum).
 * - CALENDAR/GALLERY teaser mock dipertahankan (di luar scope data ini).
 *
 * Dibangkitkan: node tools/build-kuliner-budaya.js (jangan edit manual).
 */

const BUDAYA_REGIONS = [
  {
    id: "kota-pasuruan",
    slug: "kota-pasuruan",
    name: "Kota Pasuruan",
    color: "#7c3aed",
    center: { latitude: -7.645, longitude: 112.907 },
    zoom: 13,
    short_description: "Wilayah administrasi Kota Pasuruan.",
  },
  {
    id: "pasuruan-timur",
    slug: "pasuruan-timur",
    name: "Pasuruan Timur",
    color: "#dc2626",
    center: { latitude: -7.636, longitude: 112.951 },
    zoom: 12,
    short_description: "Wilayah timur Kabupaten Pasuruan.",
  },
  {
    id: "pasuruan-barat",
    slug: "pasuruan-barat",
    name: "Pasuruan Barat",
    color: "#16a34a",
    center: { latitude: -7.662, longitude: 112.862 },
    zoom: 12,
    short_description: "Wilayah barat Kabupaten Pasuruan.",
  },
  {
    id: "pasuruan-utara",
    slug: "pasuruan-utara",
    name: "Pasuruan Utara",
    color: "#2563eb",
    center: { latitude: -7.595, longitude: 112.907 },
    zoom: 12,
    short_description: "Wilayah utara Kabupaten Pasuruan.",
  },
  {
    id: "pasuruan-selatan",
    slug: "pasuruan-selatan",
    name: "Pasuruan Selatan",
    color: "#ea580c",
    center: { latitude: -7.719, longitude: 112.919 },
    zoom: 12,
    short_description: "Wilayah selatan Kabupaten Pasuruan.",
  },
];

const BUDAYA_CATEGORIES = [
  { id: "tradisi", slug: "tradisi", name: "Tradisi" },
  { id: "kesenian", slug: "kesenian", name: "Kesenian" },
  { id: "situs-sejarah", slug: "situs-sejarah", name: "Situs & Sejarah" },
  { id: "museum", slug: "museum", name: "Museum" },
];

const BUDAYA_CULTURES = [
  {
    id: "candi-jawi",
    slug: "candi-jawi",
    name: "Candi Jawi",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.662501,
      longitude: 112.66975,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Candi Jawi (belum tersedia)",
      },
    ],
    short_description:
      "Candi bercorak Hindu-Buddha dari era Singasari-Majapahit; ada rumah informasi di lokasi. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Candi Jawi merupakan candi bercorak Hindu-Buddha yang berasal dari era Singasari-Majapahit. Perpaduan dua corak keagamaan ini menjadikannya salah satu peninggalan bersejarah yang menarik untuk dikenali di wilayah Pasuruan bagian barat.\n\nDi lokasi terdapat rumah informasi yang dapat dimanfaatkan pengunjung untuk memahami latar belakang candi. Keberadaan fasilitas ini membantu wisatawan umum, pelajar, maupun pemerhati sejarah agar kunjungan tidak hanya sebatas melihat bangunan.\n\nCandi ini beralamat di Candi Wates, Kec. Prigen. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Candi Wates, Kec. Prigen",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.662501,112.66975",
    place_id: "ChIJEdbzFs3Z1y0RkM8ggTvGKKE",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "candi-belahan",
    slug: "candi-belahan",
    name: "Candi Belahan",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.607547,
      longitude: 112.651368,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Candi Belahan (belum tersedia)",
      },
    ],
    short_description:
      "Petirtaan kuno dengan sumber air yang masih dianggap sakral; alamat menyebut Belahan Jowo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Candi Belahan adalah petirtaan kuno, yaitu tempat pemandian yang dahulu berkaitan dengan kegiatan keagamaan. Sumber airnya masih dianggap sakral oleh sebagian masyarakat, sehingga situs ini bukan sekadar peninggalan masa lalu tetapi juga masih memiliki makna bagi warga sekitar.\n\nAlamat lokasi menyebut nama Belahan Jowo, yang juga dikenal sebagai sebutan setempat untuk kawasan ini. Pengunjung yang datang sebaiknya menjaga sikap dan kebersihan, mengingat air dan area situs dipandang suci.\n\nSitus ini berada di Wonosunyo, Kec. Gempol. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Wonosunyo, Kec. Gempol",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.607547,112.651368",
    place_id: "ChIJP9puZNrY1y0RDbO52VODE8Q",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "candi-gunung-gangsir",
    slug: "candi-gunung-gangsir",
    name: "Candi Gunung Gangsir",
    regionId: "pasuruan-utara",
    place: {
      latitude: -7.58685,
      longitude: 112.733475,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Candi Gunung Gangsir (belum tersedia)",
      },
    ],
    short_description:
      "Situs candi dengan satu bangunan utama; dikelola warga setempat. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Candi Gunung Gangsir adalah situs candi dengan satu bangunan utama. Skalanya yang sederhana membuat situs ini cocok bagi pengunjung yang ingin melihat peninggalan sejarah secara lebih tenang dan tidak ramai.\n\nSitus ini dikelola oleh warga setempat. Pengelolaan oleh masyarakat menunjukkan adanya kepedulian lokal dalam menjaga dan merawat peninggalan budaya di lingkungan mereka.\n\nCandi ini berada di Gunung Gangsir, Kec. Beji. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Gunung Gangsir, Kec. Beji",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.58685,112.733475",
    place_id: "ChIJVVVVlQ3c1y0RfJBQ_hyC7Z8",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "candi-keboireng",
    slug: "candi-keboireng",
    name: "Candi Keboireng",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.599954,
      longitude: 112.698589,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Candi Keboireng (belum tersedia)",
      },
    ],
    short_description:
      "Situs di lahan pertanian; ditemukan 1983, sebagian temuan disimpan di Museum Trowulan menurut ulasan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Candi Keboireng adalah situs bersejarah yang berada di tengah lahan pertanian. Suasananya berbeda dari candi yang dikelola sebagai objek wisata besar, karena situs ini berbaur dengan aktivitas warga di sekitarnya.\n\nMenurut ulasan, situs ini ditemukan pada tahun 1983 dan sebagian temuannya disimpan di Museum Trowulan. Informasi ini masih bersumber dari ulasan pengunjung sehingga perlu dikonfirmasi lebih lanjut sebelum dijadikan rujukan resmi.\n\nSitus ini berada di Ngerong, Kec. Gempol. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Ngerong, Kec. Gempol",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.599954,112.698589",
    place_id: "ChIJ0fIkFNbZ1y0RufYMgxxSRS8",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "candi-sepilar",
    slug: "candi-sepilar",
    name: "Candi Sepilar",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.769912,
      longitude: 112.618294,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Candi Sepilar (belum tersedia)",
      },
    ],
    short_description:
      "Berada di jalur pendakian Gunung Arjuno via Purwosari (pos 6); tanpa fasilitas penginapan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Candi Sepilar berada di jalur pendakian Gunung Arjuno melalui Purwosari, tepatnya di sekitar pos 6. Letaknya di jalur pendakian membuat situs ini lebih mudah ditemui oleh pendaki dibandingkan wisatawan biasa.\n\nDi lokasi tidak tersedia fasilitas penginapan. Pengunjung perlu merencanakan perjalanan dan perbekalan dengan baik, serta menyesuaikan kunjungan dengan kondisi jalur pendakian.\n\nCandi ini berada di Tambaksari, Kec. Purwodadi. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Tambaksari, Kec. Purwodadi",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.769912,112.618294",
    place_id: "ChIJ5dfqPVh_eC4RZtFyxCb_D-I",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "pertapan-indrokilo",
    slug: "pertapan-indrokilo",
    name: "Pertapan Indrokilo",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.737725,
      longitude: 112.63479,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Pertapan Indrokilo (belum tersedia)",
      },
    ],
    short_description:
      "Situs pertapaan di lereng gunung; akses jalan setapak berpaving, sekitar dua jam dari titik awal menurut ulasan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Pertapan Indrokilo adalah situs pertapaan yang berada di lereng gunung. Lokasinya yang terpencil dan dikelilingi alam memberi suasana tenang yang sesuai dengan fungsinya sebagai tempat bertapa.\n\nAkses menuju situs berupa jalan setapak yang sudah berpaving. Menurut ulasan, perjalanan dari titik awal memakan waktu sekitar dua jam, sehingga pengunjung disarankan menyiapkan stamina, alas kaki yang nyaman, dan bekal secukupnya.\n\nSitus ini berada di Dayurejo, Kec. Prigen. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Dayurejo, Kec. Prigen",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.737725,112.63479",
    place_id: "ChIJn5yPdADX1y0RsYsFDb37spc",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "museum-kabupaten-pasuruan",
    slug: "museum-kabupaten-pasuruan",
    name: "Museum Kabupaten Pasuruan",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.652506,
      longitude: 112.686746,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Museum Kabupaten Pasuruan (belum tersedia)",
      },
    ],
    short_description:
      "Museum di kawasan Masjid Cheng Hoo; koleksi arca dan benda logam menurut ulasan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Museum Kabupaten Pasuruan berada di kawasan Masjid Cheng Hoo. Lokasinya yang berdekatan dengan masjid membuat museum ini mudah dikombinasikan dalam satu rute kunjungan wisata budaya di Pandaan.\n\nMenurut ulasan, koleksi yang dapat dilihat antara lain arca dan benda-benda logam. Koleksi tersebut memberi gambaran tentang peninggalan sejarah dan budaya yang berkaitan dengan wilayah Pasuruan.\n\nMuseum ini berada di Petungasri, Kec. Pandaan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Petungasri, Kec. Pandaan",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.652506,112.686746",
    place_id: "ChIJ0-H1dEzZ1y0RIajPrbcyF9g",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "museum",
    culture_type: "museum",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "masjid-muhammad-cheng-hoo-pandaan",
    slug: "masjid-muhammad-cheng-hoo-pandaan",
    name: "Masjid Muhammad Cheng Hoo Pandaan",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.651513,
      longitude: 112.68751,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Masjid Muhammad Cheng Hoo Pandaan (belum tersedia)",
      },
    ],
    short_description:
      "Masjid bernuansa arsitektur Tionghoa; dekat pasar oleh-oleh dan kuliner. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Masjid Muhammad Cheng Hoo Pandaan adalah masjid bernuansa arsitektur Tionghoa. Perpaduan unsur Islam dan gaya bangunan Tionghoa menjadikannya tampil berbeda dan menarik sebagai contoh akulturasi budaya.\n\nMasjid ini berdekatan dengan pasar oleh-oleh dan kuliner, sehingga nyaman dikunjungi sambil beribadah, berfoto, atau berbelanja. Letaknya juga bersebelahan dengan kawasan Museum Kabupaten Pasuruan.\n\nMasjid ini berada di Petungasri, Kec. Pandaan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Petungasri, Kec. Pandaan",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.651513,112.68751",
    place_id: "ChIJJWgjoprZ1y0RgQ8NzzM1hoM",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "klenteng-tjoe-tik-kiong",
    slug: "klenteng-tjoe-tik-kiong",
    name: "Klenteng Tjoe Tik Kiong",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.636724,
      longitude: 112.905345,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Klenteng Tjoe Tik Kiong (belum tersedia)",
      },
    ],
    short_description:
      "Klenteng tua yang dekat Stasiun Pasuruan; foto dari luar diperbolehkan dengan izin penjaga menurut ulasan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Klenteng Tjoe Tik Kiong adalah klenteng tua yang menjadi bagian dari jejak budaya Tionghoa di Kota Pasuruan. Lokasinya dekat dengan Stasiun Pasuruan sehingga mudah dijangkau, termasuk bagi pengunjung yang datang menggunakan kereta.\n\nMenurut ulasan, pengunjung diperbolehkan mengambil foto dari luar dengan izin penjaga. Karena klenteng merupakan tempat ibadah, pengunjung diharapkan menjaga sopan santun dan meminta izin terlebih dahulu.\n\nKlenteng ini berada di Trajeng, Kec. Gadingrejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Trajeng, Kec. Gadingrejo",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.636724,112.905345",
    place_id: "ChIJrakG7hnF1y0RiFk-DsC6_hU",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "masjid-agung-al-anwar",
    slug: "masjid-agung-al-anwar",
    name: "Masjid Agung Al-Anwar",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.641466,
      longitude: 112.905601,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Masjid Agung Al-Anwar (belum tersedia)",
      },
    ],
    short_description:
      "Data Google bertipe alamat tanpa rating; koordinat dan kecamatan perlu dicek ke poligon batas. Terletak di sisi alun-alun. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Masjid Agung Al-Anwar terletak di sisi alun-alun Kota Pasuruan. Posisinya di pusat kota menjadikan masjid ini mudah dikenali dan menjadi bagian dari kawasan yang ramai dikunjungi warga maupun peziarah.\n\nData Google untuk lokasi ini bertipe alamat dan belum memiliki rating. Koordinat dan kecamatan masih perlu dicek ke poligon batas wilayah, sehingga tingkat keyakinan datanya masih rendah.\n\nMasjid ini berada di Kebonsari, Kec. Panggungrejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Kebonsari, Kec. Panggungrejo",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.641466,112.905601",
    place_id: "ChIJwYB0_9_F1y0RM4SDUWrrCyc",
    keyakinan: "rendah",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "alun-alun-pasuruan",
    slug: "alun-alun-pasuruan",
    name: "Alun-Alun Pasuruan",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.641916,
      longitude: 112.906693,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Alun-Alun Pasuruan (belum tersedia)",
      },
    ],
    short_description:
      "Alun-alun kota di samping masjid agung; ramai pedagang jajanan pada sore dan malam. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Alun-Alun Pasuruan adalah alun-alun kota yang berada di samping masjid agung. Seperti alun-alun pada umumnya di Jawa, kawasan ini menjadi ruang publik tempat warga berkumpul, bersantai, dan beraktivitas bersama.\n\nSuasana alun-alun semakin ramai pada sore dan malam hari, ketika para pedagang jajanan mulai berjualan. Waktu tersebut cocok bagi pengunjung yang ingin menikmati suasana kota sambil mencicipi jajanan setempat.\n\nAlun-alun ini berada di Kebonsari, Kec. Panggungrejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Kebonsari, Kec. Panggungrejo",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.641916,112.906693",
    place_id: "ChIJm-BusArG1y0RsS1j739ftjI",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "makam-kh-abdul-hamid",
    slug: "makam-kh-abdul-hamid",
    name: "Makam KH. Abdul Hamid",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.64131,
      longitude: 112.905317,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Makam KH. Abdul Hamid (belum tersedia)",
      },
    ],
    short_description:
      "Makam ulama di belakang kawasan masjid agung. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Makam KH. Abdul Hamid adalah makam seorang ulama yang berada di belakang kawasan masjid agung. Lokasinya yang menyatu dengan area masjid membuat makam ini mudah ditemukan oleh peziarah yang berkunjung ke pusat kota.\n\nTempat ini menjadi bagian dari tradisi ziarah yang masih hidup di tengah masyarakat Pasuruan. Pengunjung diharapkan menjaga ketertiban, berpakaian sopan, dan menghormati peziarah lain yang sedang berdoa.\n\nMakam ini berada di Kebonsari, Kec. Panggungrejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Kebonsari, Kec. Panggungrejo",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.64131,112.905317",
    place_id: "ChIJWSUAl1fF1y0RM2jLISJgEUY",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "makam-mbah-slagah",
    slug: "makam-mbah-slagah",
    name: "Makam Mbah Slagah",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.649078,
      longitude: 112.907851,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Makam Mbah Slagah (belum tersedia)",
      },
    ],
    short_description:
      "Dekat Stadion Untung Suropati. Kecamatan untuk Pekuncen berbeda antar sumber; perlu dicek ke poligon batas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Makam Mbah Slagah adalah salah satu makam yang dikenal di Kota Pasuruan dan menjadi bagian dari jejak tradisi ziarah di wilayah ini. Lokasinya dekat dengan Stadion Untung Suropati sehingga cukup mudah dijadikan patokan arah.\n\nKecamatan untuk wilayah Pekuncen berbeda antar sumber, sehingga posisi administratif lokasi ini perlu dicek ke poligon batas wilayah. Karena itu, tingkat keyakinan datanya masih rendah dan statusnya belum diverifikasi.\n\nMakam ini berada di Pekuncen, Kec. Panggungrejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Pekuncen, Kec. Panggungrejo",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.649078,112.907851",
    place_id: "ChIJOQ1xUQjG1y0R1cxEOlw5ByM",
    keyakinan: "rendah",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "makam-mbah-sayyid-arif-segoropuro",
    slug: "makam-mbah-sayyid-arif-segoropuro",
    name: "Makam Mbah Sayyid Arif Segoropuro",
    regionId: "pasuruan-timur",
    place: {
      latitude: -7.676085,
      longitude: 112.976121,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Makam Mbah Sayyid Arif Segoropuro (belum tersedia)",
      },
    ],
    short_description:
      "Makam di perbukitan Segoropuro; akses melalui tangga naik. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Makam Mbah Sayyid Arif Segoropuro terletak di perbukitan Segoropuro, di wilayah timur Kabupaten Pasuruan. Posisinya di ketinggian memberi suasana yang berbeda dari makam di tengah kota.\n\nUntuk mencapai makam, pengunjung perlu menaiki tangga. Peziarah sebaiknya menyiapkan stamina dan mengenakan alas kaki yang nyaman, terutama bagi lansia atau pengunjung yang membawa anak.\n\nMakam ini berada di Segoropuro, Kec. Rejoso. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Segoropuro, Kec. Rejoso",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.676085,112.976121",
    place_id: "ChIJ0WRBHmvI1y0RL31QvEHBnFA",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "makam-mbah-jauhari-umar",
    slug: "makam-mbah-jauhari-umar",
    name: "Makam Mbah Jauhari Umar",
    regionId: "pasuruan-selatan",
    place: {
      latitude: -7.711924,
      longitude: 112.866021,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Makam Mbah Jauhari Umar (belum tersedia)",
      },
    ],
    short_description:
      "Ramai saat haul; ulasan menyarankan waspada barang bawaan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Makam Mbah Jauhari Umar merupakan makam tokoh yang menjadi tujuan ziarah di wilayah selatan Kabupaten Pasuruan. Tempat ini tidak hanya menjadi lokasi berdoa, tetapi juga bagian dari tradisi keagamaan masyarakat sekitar.\n\nKawasan ini ramai pada saat haul, yaitu peringatan wafatnya tokoh yang dimakamkan. Menurut ulasan, pengunjung disarankan untuk waspada terhadap barang bawaan, terutama ketika suasana sedang padat.\n\nMakam ini berada di Tanggulangin, Kec. Kejayan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Tanggulangin, Kec. Kejayan",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.711924,112.866021",
    place_id: "ChIJ04v7wm3P1y0RtgA_3rcM-xk",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "masjid-semendi",
    slug: "masjid-semendi",
    name: "Masjid Semendi",
    regionId: "pasuruan-utara",
    place: {
      latitude: -7.617486,
      longitude: 112.858785,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Masjid Semendi (belum tersedia)",
      },
    ],
    short_description:
      "Dikaitkan dengan Mbah Semendi dan peziarah makam Semendi menurut ulasan; belum diverifikasi. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Masjid Semendi adalah masjid yang dikaitkan dengan sosok Mbah Semendi. Menurut ulasan, tempat ini juga didatangi peziarah yang berkunjung ke makam Semendi, sehingga masjid ini memiliki nilai religi sekaligus historis bagi warga sekitar.\n\nInformasi mengenai keterkaitan masjid dengan Mbah Semendi dan makamnya masih bersumber dari ulasan pengunjung. Karena belum diverifikasi, informasi ini perlu dikonfirmasi lebih lanjut sebelum dijadikan rujukan resmi.\n\nMasjid ini berada di Pulokerto, Kec. Kraton. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Pulokerto, Kec. Kraton",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.617486,112.858785",
    place_id: "ChIJtZfXCVfE1y0R8a0hepXU2qQ",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "pondok-pesantren-sidogiri",
    slug: "pondok-pesantren-sidogiri",
    name: "Pondok Pesantren Sidogiri",
    regionId: "pasuruan-utara",
    place: {
      latitude: -7.667979,
      longitude: 112.837753,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Pondok Pesantren Sidogiri (belum tersedia)",
      },
    ],
    short_description:
      "Pesantren besar di Kraton; kawasan pesantren memiliki beberapa titik (balai tamu, daerah/asrama). Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Pondok Pesantren Sidogiri adalah pesantren besar di Kecamatan Kraton yang menjadi bagian penting dari tradisi keilmuan dan keagamaan di Pasuruan. Kehidupan santri sehari-hari di sini mencerminkan budaya pesantren yang telah lama tumbuh di tengah masyarakat.\n\nKawasan pesantren memiliki beberapa titik lokasi, di antaranya balai tamu dan daerah atau asrama. Pengunjung yang datang disarankan mengikuti aturan setempat dan menyesuaikan diri dengan lingkungan pesantren.\n\nPesantren ini berada di Sidogiri, Kec. Kraton. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Sidogiri, Kec. Kraton",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.667979,112.837753",
    place_id: "ChIJ7UG6VYrP1y0RGMkrKEzhopU",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisi",
    culture_type: "tradisi",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "gpib-pniel-pasuruan",
    slug: "gpib-pniel-pasuruan",
    name: "GPIB Pniel Pasuruan",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.640939,
      longitude: 112.914481,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto GPIB Pniel Pasuruan (belum tersedia)",
      },
    ],
    short_description:
      "Gereja era kolonial yang disebut tertua di Pasuruan menurut ulasan; pagar sering terkunci di luar jam ibadah. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "GPIB Pniel Pasuruan adalah gereja peninggalan era kolonial. Menurut ulasan, gereja ini disebut sebagai yang tertua di Pasuruan, sehingga menjadi salah satu saksi keberagaman dan sejarah kota.\n\nPagar gereja sering terkunci di luar jam ibadah. Pengunjung yang ingin melihat bangunannya sebaiknya mengamati dari luar atau menyesuaikan waktu kunjungan dengan jadwal ibadah.\n\nGereja ini berada di Kandangsapi, Kec. Panggungrejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Kandangsapi, Kec. Panggungrejo",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.640939,112.914481",
    place_id: "ChIJA1Mq4A3G1y0RNN504aQ6ds4",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "gereja-katolik-st-antonius-padua",
    slug: "gereja-katolik-st-antonius-padua",
    name: "Gereja Katolik Paroki St. Antonius Padua",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.640363,
      longitude: 112.912661,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Gereja Katolik Paroki St. Antonius Padua (belum tersedia)",
      },
    ],
    short_description:
      "Gereja dengan arsitektur khas dan bangunan tua yang terawat menurut ulasan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Gereja Katolik Paroki St. Antonius Padua adalah gereja dengan arsitektur khas yang menarik perhatian pengunjung. Bangunannya menjadi bagian dari kekayaan bangunan bersejarah dan keberagaman rumah ibadah di Kota Pasuruan.\n\nMenurut ulasan, bangunan tuanya masih terawat dengan baik. Kondisi ini membuat gereja nyaman dikunjungi oleh mereka yang tertarik pada arsitektur dan sejarah kota.\n\nGereja ini berada di Kandangsapi, Kec. Panggungrejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Kandangsapi, Kec. Panggungrejo",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.640363,112.912661",
    place_id: "ChIJydf1WAvG1y0RgW1OQvn4v5c",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "pura-dharma-widya-tosari",
    slug: "pura-dharma-widya-tosari",
    name: "Pura Dharma Widya Tosari",
    regionId: "pasuruan-selatan",
    place: {
      latitude: -7.889977,
      longitude: 112.903622,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Pura Dharma Widya Tosari (belum tersedia)",
      },
    ],
    short_description:
      "Ulasan menyebut tempat doa penari Sodoran saat Karo dan lokasi sanggar leluhur Tosari; belum diverifikasi. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Pura Dharma Widya Tosari adalah pura di wilayah Tosari yang berkaitan erat dengan budaya masyarakat setempat. Tosari dikenal sebagai kawasan dengan tradisi Hindu yang masih terjaga di lereng pegunungan.\n\nMenurut ulasan, pura ini disebut sebagai tempat doa para penari Sodoran saat perayaan Karo, sekaligus lokasi sanggar leluhur Tosari. Informasi ini masih bersumber dari ulasan dan belum diverifikasi, sehingga perlu dikonfirmasi sebelum dijadikan rujukan resmi.\n\nPura ini berada di Tosari, Kec. Tosari. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Tosari, Kec. Tosari",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.889977,112.903622",
    place_id: "ChIJe5_Md_Yz1i0RaCjjXMcswkM",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "pura-dhang-khayangan-kerti-jaya-bhuana",
    slug: "pura-dhang-khayangan-kerti-jaya-bhuana",
    name: "Pura Dhang Khayangan Kerti Jaya Bhuana",
    regionId: "pasuruan-selatan",
    place: {
      latitude: -7.890226,
      longitude: 112.911682,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Pura Dhang Khayangan Kerti Jaya Bhuana (belum tersedia)",
      },
    ],
    short_description:
      "Pura besar di Desa Wonokitri. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Pura Dhang Khayangan Kerti Jaya Bhuana adalah pura besar yang berada di Desa Wonokitri. Ukurannya yang luas dan keberadaannya di kawasan pegunungan Tosari menjadikannya salah satu tempat ibadah umat Hindu yang menonjol di wilayah ini.\n\nPura ini menjadi bagian dari kehidupan budaya dan keagamaan masyarakat Hindu setempat. Pengunjung yang datang diharapkan berpakaian sopan serta mengikuti tata krama yang berlaku di area pura.\n\nPura ini berada di Wonokitri, Kec. Tosari. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Wonokitri, Kec. Tosari",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.890226,112.911682",
    place_id: "ChIJk3O4SlY11i0R7JPyT2PTF7s",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "pura-sasana-siwa-murti",
    slug: "pura-sasana-siwa-murti",
    name: "Pura Sasana Siwa Murti",
    regionId: "pasuruan-selatan",
    place: {
      latitude: -7.881587,
      longitude: 112.90096,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Pura Sasana Siwa Murti (belum tersedia)",
      },
    ],
    short_description:
      "Dekat rest area Tosari; pengunjung diterima untuk melihat atau belajar tata ibadah menurut ulasan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Pura Sasana Siwa Murti adalah pura yang berada di dekat rest area Tosari. Lokasinya yang mudah dijangkau membuatnya cocok dijadikan titik singgah bagi wisatawan yang melintasi kawasan Tosari.\n\nMenurut ulasan, pengunjung diterima untuk melihat atau belajar mengenai tata ibadah di pura ini. Sikap terbuka tersebut memberi kesempatan untuk mengenal budaya dan keyakinan masyarakat Hindu setempat, dengan tetap menghormati aturan di area pura.\n\nPura ini berada di Tlogosari, Kec. Tosari. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Tlogosari, Kec. Tosari",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.881587,112.90096",
    place_id: "ChIJW93CcS0z1i0Rw-zoLsgYZdw",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "sanggar-seni-dharma-budaya",
    slug: "sanggar-seni-dharma-budaya",
    name: "Sanggar Seni Dharma Budaya",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.647798,
      longitude: 112.909016,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Sanggar Seni Dharma Budaya (belum tersedia)",
      },
    ],
    short_description:
      "Sanggar berdiri 1981 menurut ulasan. Ada juga titik LKP Sanggar Seni Dharma Budaya di Kebonagung (diduga entitas yang sama, tidak dimasukkan). Kecamatan untuk Pekuncen berbeda antar sumber. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Sanggar Seni Dharma Budaya adalah sanggar seni di Kota Pasuruan yang berperan dalam menjaga dan mengembangkan kesenian daerah. Menurut ulasan, sanggar ini berdiri pada tahun 1981, sehingga sudah cukup lama berkiprah di dunia seni setempat.\n\nTerdapat juga titik LKP Sanggar Seni Dharma Budaya di Kebonagung yang diduga merupakan entitas yang sama, namun tidak dimasukkan ke dalam data ini. Selain itu, kecamatan untuk wilayah Pekuncen berbeda antar sumber, sehingga tingkat keyakinan datanya masih rendah.\n\nSanggar ini berada di Pekuncen, Kec. Panggungrejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Pekuncen, Kec. Panggungrejo",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.647798,112.909016",
    place_id: "ChIJizf7CgnG1y0RsmCFlZkGrII",
    keyakinan: "rendah",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "kesenian",
    culture_type: "kesenian",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "sanggar-seni-cuciotak-rahmatalam",
    slug: "sanggar-seni-cuciotak-rahmatalam",
    name: "Sanggar Seni Cuciotak Rahmatalam",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.653926,
      longitude: 112.9027,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Sanggar Seni Cuciotak Rahmatalam (belum tersedia)",
      },
    ],
    short_description:
      "Sanggar seni rupa dengan karya dari bahan bekas; janji kunjungan perlu dikonfirmasi. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Sanggar Seni Cuciotak Rahmatalam adalah sanggar seni rupa yang menghasilkan karya dari bahan bekas. Pendekatan ini menunjukkan sisi kreatif seniman lokal yang mengolah barang tak terpakai menjadi karya yang bernilai seni.\n\nSebagai ruang kreatif yang tidak selalu terbuka untuk umum, janji kunjungan perlu dikonfirmasi terlebih dahulu. Pengunjung disarankan menghubungi pihak sanggar sebelum datang agar kunjungan berjalan lancar.\n\nSanggar ini berada di Purworejo, Kec. Purworejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Purworejo, Kec. Purworejo",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.653926,112.9027",
    place_id: "ChIJWzUQD5_F1y0Rh3hpyt6mmqY",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "kesenian",
    culture_type: "kesenian",
    historical_period: null,
    status: "published",
    gallery: [],
  },
  {
    id: "pura-kerta-bumi-sari",
    slug: "pura-kerta-bumi-sari",
    name: "Pura Kerta Bumi Sari Buanagung Dewa Putra",
    regionId: "pasuruan-selatan",
    place: {
      latitude: -7.878699,
      longitude: 112.911316,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Pura Kerta Bumi Sari Buanagung Dewa Putra (belum tersedia)",
      },
    ],
    short_description:
      "Pura di Desa Sedaeng. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Pura Kerta Bumi Sari Buanagung Dewa Putra adalah pura yang berada di Desa Sedaeng. Keberadaannya di kawasan Tosari menambah kekayaan tempat ibadah umat Hindu yang menjadi bagian dari budaya masyarakat pegunungan ini.\n\nPura ini dapat dikunjungi sebagai bagian dari rute wisata budaya dan religi di Tosari, bersama pura-pura lain yang berada di sekitarnya. Pengunjung diharapkan menjaga sopan santun dan mengikuti aturan yang berlaku di area pura.\n\nPura ini berada di Sedaeng, Kec. Tosari. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    rating: null,
    reviews_label: null,
    address: "Sedaeng, Kec. Tosari",
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.878699,112.911316",
    place_id: "ChIJGQ-4sXY01i0Rqonztj-xVrc",
    keyakinan: "sedang",
    source: "destinasi-budaya-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "situs-sejarah",
    culture_type: "situs-sejarah",
    historical_period: null,
    status: "published",
    gallery: [],
  },
];

const BUDAYA_CALENDAR = [
  {
    id: "agenda-mock-1",
    title: "Festival Batik Pasuruan",
    desc: "Perayaan kain batik khas Pasuruan dengan pameran motif dan peragaan busana.",
    month_label: "Agu",
    day_label: "12",
    date_label: "12 Agu 2027 \u2022 10:00\u201312:00 WIB",
    location: "Alun-alun Pasuruan",
    cultureId: "sanggar-seni-dharma-budaya",
    status: "selesai",
    organizer: null,
    ticket_info: null,
    url: null,
    source: "mock",
  },
  {
    id: "agenda-mock-2",
    title: "Gelar Seni Tradisi",
    desc: "Pentas seni tradisi warga dengan tari dan musik khas daerah.",
    month_label: "Sep",
    day_label: "05",
    date_label: "05 Sep 2027 \u2022 19:00\u201321:00 WIB",
    location: "Gedung Kesenian Pasuruan",
    cultureId: "pertapan-indrokilo",
    status: "selesai",
    organizer: null,
    ticket_info: null,
    url: null,
    source: "mock",
  },
  {
    id: "agenda-mock-3",
    title: "Pameran Seni Rupa Daerah",
    desc: "Pameran karya perupa lokal dari lukisan hingga instalasi.",
    month_label: "Okt",
    day_label: "18",
    date_label: "18 Okt 2027 \u2022 09:00\u201316:00 WIB",
    location: "Galeri Kota Pasuruan",
    cultureId: "museum-kabupaten-pasuruan",
    status: "berlangsung",
    organizer: null,
    ticket_info: null,
    url: null,
    source: "mock",
  },
  {
    id: "agenda-mock-4",
    title: "Pertunjukan Wayang Kulit",
    desc: "Pagelaran wayang kulit semalam suntuk dengan lakon klasik.",
    month_label: "Nov",
    day_label: "02",
    date_label: "02 Nov 2027 \u2022 20:00\u201323:00 WIB",
    location: "Pendopo Kabupaten Pasuruan",
    cultureId: "sanggar-seni-cuciotak-rahmatalam",
    status: "akan-datang",
    organizer: null,
    ticket_info: null,
    url: null,
    source: "mock",
  },
  {
    id: "agenda-mock-5",
    title: "Festival Budaya Pesisir",
    desc: "Kirab budaya dan bazar kuliner khas pesisir Pasuruan.",
    month_label: "Des",
    day_label: "14",
    date_label: "14 Des 2027 \u2022 08:00\u201317:00 WIB",
    location: "Pantai Lekok, Pasuruan",
    cultureId: "klenteng-tjoe-tik-kiong",
    status: "akan-datang",
    organizer: null,
    ticket_info: null,
    url: null,
    source: "mock",
  },
  {
    id: "agenda-mock-6",
    title: "Ziarah Situs Bersejarah",
    desc: "Kunjungan edukasi ke situs bersejarah bersama pemandu lokal.",
    month_label: "Jan",
    day_label: "25",
    date_label: "25 Jan 2028 \u2022 07:00\u201311:00 WIB",
    location: "Candi Jawi, Prigen",
    cultureId: "candi-jawi",
    status: "akan-datang",
    organizer: null,
    ticket_info: null,
    url: null,
    source: "mock",
  },
];

const BUDAYA_GALLERY = [
  {
    id: "galeri-mock-1",
    title: "Galeri Batik Tulis",
    desc: "Koleksi motif batik tulis khas pesisir.",
    cultureId: "sanggar-seni-dharma-budaya",
    media: {
      type: "image",
      url: null,
      alt: "Foto galeri batik tulis (segera hadir)",
    },
    source: "mock",
  },
  {
    id: "galeri-mock-2",
    title: "Galeri Wayang Kulit",
    desc: "Deretan wayang dan perlengkapan pementasan.",
    cultureId: "sanggar-seni-cuciotak-rahmatalam",
    media: {
      type: "image",
      url: null,
      alt: "Foto galeri wayang kulit (segera hadir)",
    },
    source: "mock",
  },
  {
    id: "galeri-mock-3",
    title: "Galeri Kerajinan Tangan",
    desc: "Hasil kerajinan anyaman dan ukiran warga.",
    cultureId: "sanggar-seni-dharma-budaya",
    media: {
      type: "image",
      url: null,
      alt: "Foto galeri kerajinan tangan (segera hadir)",
    },
    source: "mock",
  },
  {
    id: "galeri-mock-4",
    title: "Galeri Situs Bersejarah",
    desc: "Jejak peninggalan situs bersejarah Pasuruan.",
    cultureId: "candi-jawi",
    media: {
      type: "image",
      url: null,
      alt: "Foto galeri situs bersejarah (segera hadir)",
    },
    source: "mock",
  },
  {
    id: "galeri-mock-5",
    title: "Galeri Museum Etnografi",
    desc: "Koleksi artefak dan benda budaya masyarakat.",
    cultureId: "museum-kabupaten-pasuruan",
    media: {
      type: "image",
      url: null,
      alt: "Foto galeri museum etnografi (segera hadir)",
    },
    source: "mock",
  },
  {
    id: "galeri-mock-6",
    title: "Galeri Tari Tradisional",
    desc: "Kostum dan gerak tari tradisional daerah.",
    cultureId: "sanggar-seni-cuciotak-rahmatalam",
    media: {
      type: "image",
      url: null,
      alt: "Foto galeri tari tradisional (segera hadir)",
    },
    source: "mock",
  },
  {
    id: "galeri-mock-7",
    title: "Galeri Upacara Adat",
    desc: "Suasana upacara adat dan kebersamaan warga.",
    cultureId: "pertapan-indrokilo",
    media: {
      type: "image",
      url: null,
      alt: "Foto galeri upacara adat (segera hadir)",
    },
    source: "mock",
  },
  {
    id: "galeri-mock-8",
    title: "Galeri Artefak Kuno",
    desc: "Temuan artefak dan benda peninggalan lama.",
    cultureId: "museum-kabupaten-pasuruan",
    media: {
      type: "image",
      url: null,
      alt: "Foto galeri artefak kuno (segera hadir)",
    },
    source: "mock",
  },
  {
    id: "galeri-mock-9",
    title: "Galeri Seni Kontemporer",
    desc: "Karya seni modern dari seniman lokal.",
    cultureId: "sanggar-seni-dharma-budaya",
    media: {
      type: "image",
      url: null,
      alt: "Foto galeri seni kontemporer (segera hadir)",
    },
    source: "mock",
  },
];

// CERITA DI BALIK BUDAYA (teaser + halaman cerita_budaya.html?slug=).
// Teks cerita DIAMBIL dari data budaya REAL (name/short_description/
// description) lewat cultureId — tidak ada narasi yang difabrikasi.
// Entri di sini hanya memilih budaya mana yang diangkat sebagai "cerita".
const BUDAYA_STORIES = [
  { id: "cerita-1", slug: "candi-jawi", cultureId: "candi-jawi", source: "mock" },
  { id: "cerita-2", slug: "museum-kabupaten-pasuruan", cultureId: "museum-kabupaten-pasuruan", source: "mock" },
  { id: "cerita-3", slug: "pondok-pesantren-sidogiri", cultureId: "pondok-pesantren-sidogiri", source: "mock" },
  { id: "cerita-4", slug: "sanggar-seni-dharma-budaya", cultureId: "sanggar-seni-dharma-budaya", source: "mock" },
  { id: "cerita-5", slug: "klenteng-tjoe-tik-kiong", cultureId: "klenteng-tjoe-tik-kiong", source: "mock" },
  { id: "cerita-6", slug: "makam-mbah-sayyid-arif-segoropuro", cultureId: "makam-mbah-sayyid-arif-segoropuro", source: "mock" },
];

const PASINFO_BUDAYA = {
  categories: BUDAYA_CATEGORIES,
  cultures: BUDAYA_CULTURES,
  regions: BUDAYA_REGIONS,
  calendar: BUDAYA_CALENDAR,
  gallery: BUDAYA_GALLERY,
  stories: BUDAYA_STORIES,
};
if (typeof window !== "undefined") {
  window.PASINFO_BUDAYA = PASINFO_BUDAYA;
}
