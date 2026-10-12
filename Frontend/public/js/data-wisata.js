/**
 * DATA DESTINASI WISATA — Pasuruan Info ( diverifikasi user )
 * ==========================================================
 * Sumber: public/data/destinasi-wisata-pasuruan.json
 * (koordinat Google Places, diuji terhadap poligon batas desa BIG 2026).
 *
 * Region: klasifikasi kecamatan (properti kabupaten_kota + kuadran
 * bbox kabupaten) — lihat build-data-wisata.js untuk regenerasi.
 * Field null/[] = data belum tersedia dan disembunyikan UI.
 * PENGECUALIAN DUMMY: rating, reviews_label, opening_hours, prices,
 * fasilitas saat ini bernilai generik SAMA untuk semua destinasi
 * (jelas bukan data per-tempat); ganti per destinasi bila data asli ada.
 * googleMapsUrl dibuat deterministik dari koordinat (navigasi).
 *
 * DESKRIPSI: `description` = array 2 paragraf per destinasi;
 * `short_description` = 2 kalimat pertama dari paragraf 1.
 *
 * PENGGANTIAN: timpa file ini dari JSON terbaru memakai skrip yang
 * sama. Logika peta/filter/kartu/detail tidak perlu diubah.
 */
const WISATA_REGIONS = [
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

const WISATA_CATEGORIES = [
  {
    id: "wisata-alam",
    slug: "wisata-alam",
    name: "Wisata Alam",
  },
  {
    id: "keluarga",
    slug: "keluarga",
    name: "Keluarga",
  },
  {
    id: "sejarah-budaya",
    slug: "sejarah-budaya",
    name: "Sejarah & Budaya",
  },
  {
    id: "wisata-religi",
    slug: "wisata-religi",
    name: "Wisata Religi",
  },
];

const WISATA_DESTINATIONS = [
  {
    id: "penanjakan-bromo",
    slug: "penanjakan-bromo",
    name: "Penanjakan Bromo (Penanjakan 1)",
    regionId: "pasuruan-selatan",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.904591,
      longitude: 112.951086,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Penanjakan Bromo (Penanjakan 1) (belum tersedia)",
      },
    ],
    short_description:
      "Penanjakan Bromo, atau yang dikenal sebagai Penanjakan 1, adalah salah satu titik pandang paling terkenal untuk menikmati matahari terbit di kawasan Taman Nasional Bromo Tengger Semeru. Dari ketinggian lebih dari 2.700 meter di atas permukaan laut, pengunjung dapat melihat hamparan lautan kabut dengan Gunung Bromo, Batok, dan Semeru yang menjulang di kejauhan.",
    description: [
      "Penanjakan Bromo, atau yang dikenal sebagai Penanjakan 1, adalah salah satu titik pandang paling terkenal untuk menikmati matahari terbit di kawasan Taman Nasional Bromo Tengger Semeru. Dari ketinggian lebih dari 2.700 meter di atas permukaan laut, pengunjung dapat melihat hamparan lautan kabut dengan Gunung Bromo, Batok, dan Semeru yang menjulang di kejauhan.",
      "Karena udara di kawasan ini sangat dingin, terutama menjelang subuh, pengunjung disarankan membawa jaket tebal, sarung tangan, dan penutup kepala. Datanglah lebih awal agar mendapat posisi terbaik untuk menyaksikan cahaya pertama muncul, dan periksa kondisi cuaca serta aturan kunjungan terbaru sebelum berangkat.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Keduwung, Kec. Puspo",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.904591,112.951086",
    place_id: "ChIJqR8CVIA21i0RyjTjUfLc2YU",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "bukit-cinta-bromo",
    slug: "bukit-cinta-bromo",
    name: "Bukit Cinta (Bromo Tengger Semeru)",
    regionId: "pasuruan-selatan",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.914467,
      longitude: 112.939603,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Bukit Cinta (Bromo Tengger Semeru) (belum tersedia)",
      },
    ],
    short_description:
      "Bukit Cinta merupakan titik pandang di kawasan Bromo Tengger Semeru yang berada di wilayah Wonokitri, Tosari. Dari sini pengunjung dapat menikmati panorama matahari terbit dengan latar lanskap pegunungan dan hamparan kabut tipis yang menyelimuti lembah di bawahnya.",
    description: [
      "Bukit Cinta merupakan titik pandang di kawasan Bromo Tengger Semeru yang berada di wilayah Wonokitri, Tosari. Dari sini pengunjung dapat menikmati panorama matahari terbit dengan latar lanskap pegunungan dan hamparan kabut tipis yang menyelimuti lembah di bawahnya.",
      "Lokasinya yang relatif mudah dijangkau menjadikan Bukit Cinta pilihan bagi wisatawan yang ingin merasakan suasana pagi di Bromo tanpa harus mendaki terlalu jauh. Bawalah pakaian hangat dan berangkatlah sebelum fajar agar tidak ketinggalan momen terbaik.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Wonokitri, Kec. Tosari",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.914467,112.939603",
    place_id: "ChIJ67LyZ5A21i0RYcJVU-xr-qU",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "taman-edelweiss-wonokitri",
    slug: "taman-edelweiss-wonokitri",
    name: "Taman Edelweiss Desa Wonokitri",
    regionId: "pasuruan-selatan",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.883402,
      longitude: 112.912341,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Taman Edelweiss Desa Wonokitri (belum tersedia)",
      },
    ],
    short_description:
      "Taman Edelweiss di Desa Wonokitri adalah kebun bunga edelweiss yang dikelola masyarakat Tengger. Bunga yang dikenal sebagai bunga abadi ini tumbuh di dataran tinggi dan menjadi bagian penting dari budaya serta upacara adat suku Tengger.",
    description: [
      "Taman Edelweiss di Desa Wonokitri adalah kebun bunga edelweiss yang dikelola masyarakat Tengger. Bunga yang dikenal sebagai bunga abadi ini tumbuh di dataran tinggi dan menjadi bagian penting dari budaya serta upacara adat suku Tengger.",
      "Selain melihat hamparan bunga yang cantik untuk berfoto, pengunjung dapat mengenal lebih dekat kehidupan desa wisata di lereng Bromo. Tempat ini cocok dikunjungi sambil menuju atau pulang dari kawasan Penanjakan dan Bukit Cinta.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Sedaeng, Kec. Tosari",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.883402,112.912341",
    place_id: "ChIJfZk5uik11i0RCK5lz_3XKtw",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "coban-binangun",
    slug: "coban-binangun",
    name: "Air Terjun Coban Binangun",
    regionId: "pasuruan-barat",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.672947,
      longitude: 112.674746,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Air Terjun Coban Binangun (belum tersedia)",
      },
    ],
    short_description:
      "Air Terjun Coban Binangun berada di wilayah Pandaan dan menawarkan suasana sejuk dengan aliran air yang jatuh di tengah rimbun pepohonan. Tempat ini cocok sebagai pelarian singkat dari hiruk pikuk kota bagi pencinta wisata alam.",
    description: [
      "Air Terjun Coban Binangun berada di wilayah Pandaan dan menawarkan suasana sejuk dengan aliran air yang jatuh di tengah rimbun pepohonan. Tempat ini cocok sebagai pelarian singkat dari hiruk pikuk kota bagi pencinta wisata alam.",
      "Untuk menuju air terjun, pengunjung biasanya perlu berjalan kaki melewati jalur alami yang bisa licin saat musim hujan. Gunakan alas kaki yang nyaman, perhatikan kondisi cuaca, dan jaga kebersihan agar keindahan alamnya tetap terjaga.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Plintahan, Kec. Pandaan",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.672947,112.674746",
    place_id: "ChIJn_E5GdbZ1y0RIp1d2hv725M",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "coban-segraya",
    slug: "coban-segraya",
    name: "Air Terjun Coban Segraya",
    regionId: "pasuruan-barat",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.644142,
      longitude: 112.637251,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Air Terjun Coban Segraya (belum tersedia)",
      },
    ],
    short_description:
      "Air Terjun Coban Segraya terletak di Desa Sukoreno, Kecamatan Prigen, di kaki Gunung Arjuno–Welirang. Udara pegunungan yang sejuk dan gemericik air yang jatuh dari tebing membuat tempat ini terasa tenang dan menyegarkan.",
    description: [
      "Air Terjun Coban Segraya terletak di Desa Sukoreno, Kecamatan Prigen, di kaki Gunung Arjuno–Welirang. Udara pegunungan yang sejuk dan gemericik air yang jatuh dari tebing membuat tempat ini terasa tenang dan menyegarkan.",
      "Kawasan sekitar air terjun dikelilingi pepohonan sehingga cocok untuk menikmati alam, berfoto, atau sekadar beristirahat. Karena jalurnya alami, disarankan datang saat cuaca cerah dan berhati-hati pada batuan yang basah.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Sukoreno, Kec. Prigen",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.644142,112.637251",
    place_id: "ChIJaYEoFhLZ1y0RyxxhU2ZdIR8",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "coban-centong",
    slug: "coban-centong",
    name: "Coban Centong",
    regionId: "pasuruan-barat",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.696958,
      longitude: 112.618987,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Coban Centong (belum tersedia)",
      },
    ],
    short_description:
      "Coban Centong adalah air terjun di kawasan lereng Welirang, Desa Lumbangrejo, Prigen. Aliran airnya yang jernih dan lingkungan hutan di sekelilingnya menghadirkan nuansa alam yang asri bagi pengunjung yang mencari ketenangan.",
    description: [
      "Coban Centong adalah air terjun di kawasan lereng Welirang, Desa Lumbangrejo, Prigen. Aliran airnya yang jernih dan lingkungan hutan di sekelilingnya menghadirkan nuansa alam yang asri bagi pengunjung yang mencari ketenangan.",
      "Lokasinya berdekatan dengan sejumlah tempat wisata di kawasan Prigen sehingga dapat dikombinasikan dengan destinasi lain dalam satu perjalanan. Sebaiknya datang pada pagi atau siang hari dan hindari berkunjung ketika hujan deras karena debit air bisa meningkat.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Lumbangrejo, Kec. Prigen",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.696958,112.618987",
    place_id: "ChIJNWCMQeDX1y0Rhdh48bGdh_8",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "coban-waru",
    slug: "coban-waru",
    name: "Coban Waru",
    regionId: "pasuruan-selatan",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.908688,
      longitude: 112.828766,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Coban Waru (belum tersedia)",
      },
    ],
    short_description:
      "Coban Waru adalah air terjun yang berada di Desa Kayukebek, Kecamatan Tutur, di wilayah pegunungan Pasuruan selatan. Kesejukan udara dan pemandangan perbukitan di sekitarnya membuat tempat ini menarik bagi pencinta alam.",
    description: [
      "Coban Waru adalah air terjun yang berada di Desa Kayukebek, Kecamatan Tutur, di wilayah pegunungan Pasuruan selatan. Kesejukan udara dan pemandangan perbukitan di sekitarnya membuat tempat ini menarik bagi pencinta alam.",
      "Perjalanan menuju lokasi melewati kawasan perdesaan dataran tinggi yang asri. Persiapkan kendaraan dan perlengkapan yang sesuai, serta bawa jas hujan karena cuaca di pegunungan dapat berubah dengan cepat.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Kayukebek, Kec. Tutur",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.908688,112.828766",
    place_id: "ChIJ0aez6Bwy1i0Rwu1QJbbppNw",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "coban-ndalung",
    slug: "coban-ndalung",
    name: "Air Terjun Coban Ndalung",
    regionId: "pasuruan-barat",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.813159,
      longitude: 112.751667,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Air Terjun Coban Ndalung (belum tersedia)",
      },
    ],
    short_description:
      "Air Terjun Coban Ndalung berada di Desa Cowek, Kecamatan Purwodadi. Air terjun ini menawarkan suasana alami dengan aliran air yang jatuh di antara tebing dan pepohonan, cocok untuk melepas penat di akhir pekan.",
    description: [
      "Air Terjun Coban Ndalung berada di Desa Cowek, Kecamatan Purwodadi. Air terjun ini menawarkan suasana alami dengan aliran air yang jatuh di antara tebing dan pepohonan, cocok untuk melepas penat di akhir pekan.",
      "Pengunjung dapat menikmati keindahan air terjun sambil bersantai di area sekitarnya. Gunakan alas kaki yang tidak licin dan selalu patuhi arahan pengelola demi keselamatan selama berkunjung.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Cowek, Kec. Purwodadi",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.813159,112.751667",
    place_id: "ChIJkRKasCLT1y0R03lW49v3RWg",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "air-terjun-putuk-truno",
    slug: "air-terjun-putuk-truno",
    name: "Air Terjun Putuk Truno",
    regionId: "pasuruan-barat",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.687801,
      longitude: 112.635066,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Air Terjun Putuk Truno (belum tersedia)",
      },
    ],
    short_description:
      "Air Terjun Putuk Truno berada di kawasan Prigen, di lereng Gunung Welirang yang berhawa sejuk. Tempat ini dikenal sebagai destinasi alam yang tenang dengan suara air dan rimbunnya hutan di sekitarnya.",
    description: [
      "Air Terjun Putuk Truno berada di kawasan Prigen, di lereng Gunung Welirang yang berhawa sejuk. Tempat ini dikenal sebagai destinasi alam yang tenang dengan suara air dan rimbunnya hutan di sekitarnya.",
      "Putuk Truno dapat dikunjungi bersama destinasi lain di kawasan Tretes dan Prigen. Pastikan membawa perlengkapan yang sesuai untuk berjalan di jalur alami, serta jaga kebersihan lingkungan selama berada di lokasi.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Prigen, Kec. Prigen",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.687801,112.635066",
    place_id: "ChIJ5YfmZ-7X1y0Rr7vllwqtb2c",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "air-terjun-kakek-bodo",
    slug: "air-terjun-kakek-bodo",
    name: "Air Terjun Kakek Bodo",
    regionId: "pasuruan-barat",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.70064,
      longitude: 112.623754,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Air Terjun Kakek Bodo (belum tersedia)",
      },
    ],
    short_description:
      "Air Terjun Kakek Bodo adalah salah satu air terjun populer di kawasan Prigen, tidak jauh dari Tretes. Aliran airnya yang jatuh di tengah hutan membuat suasananya sejuk dan menyegarkan, terutama pada pagi hingga siang hari.",
    description: [
      "Air Terjun Kakek Bodo adalah salah satu air terjun populer di kawasan Prigen, tidak jauh dari Tretes. Aliran airnya yang jatuh di tengah hutan membuat suasananya sejuk dan menyegarkan, terutama pada pagi hingga siang hari.",
      "Karena berada di kawasan wisata yang ramai, tempat ini mudah dijangkau dan mudah dipadukan dengan destinasi lain di sekitarnya. Berhati-hatilah pada bebatuan yang licin dan hindari berkunjung saat cuaca ekstrem.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Prigen, Kec. Prigen",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.70064,112.623754",
    place_id: "ChIJ__fPhd3X1y0RL1VABnk-h68",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "tretes-wisata-alam",
    slug: "tretes-wisata-alam",
    name: "Tretes Wisata Alam",
    regionId: "pasuruan-barat",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.696304,
      longitude: 112.628037,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Tretes Wisata Alam (belum tersedia)",
      },
    ],
    short_description:
      "Tretes adalah kawasan wisata pegunungan di Prigen yang sudah lama dikenal sebagai tempat peristirahatan dengan udara sejuk di lereng Gunung Welirang. Kawasan ini menawarkan beragam pengalaman, mulai dari menikmati pemandangan, jalan santai, hingga berwisata alam.",
    description: [
      "Tretes adalah kawasan wisata pegunungan di Prigen yang sudah lama dikenal sebagai tempat peristirahatan dengan udara sejuk di lereng Gunung Welirang. Kawasan ini menawarkan beragam pengalaman, mulai dari menikmati pemandangan, jalan santai, hingga berwisata alam.",
      "Letaknya yang strategis dan dekat dengan banyak destinasi, seperti air terjun, hutan pinus, dan taman rekreasi, menjadikan Tretes cocok sebagai pangkalan perjalanan. Tersedia pula banyak pilihan penginapan dan tempat makan di sekitarnya.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Prigen, Kec. Prigen",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.696304,112.628037",
    place_id: "ChIJ-WCLXOHX1y0Rv3hTnXpCVBo",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "hutan-pinus-sumber-wekas",
    slug: "hutan-pinus-sumber-wekas",
    name: "Hutan Pinus Sumber Wekas",
    regionId: "pasuruan-barat",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.677426,
      longitude: 112.619274,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Hutan Pinus Sumber Wekas (belum tersedia)",
      },
    ],
    short_description:
      "Hutan Pinus Sumber Wekas adalah area wisata hutan pinus di Desa Lumbangrejo, Prigen. Barisan pohon pinus yang menjulang menghadirkan suasana teduh dan udara segar, sehingga nyaman untuk bersantai maupun berfoto.",
    description: [
      "Hutan Pinus Sumber Wekas adalah area wisata hutan pinus di Desa Lumbangrejo, Prigen. Barisan pohon pinus yang menjulang menghadirkan suasana teduh dan udara segar, sehingga nyaman untuk bersantai maupun berfoto.",
      "Tempat ini juga sering dimanfaatkan untuk berkemah dan kegiatan di alam terbuka bersama keluarga atau teman. Jika berencana bermalam, siapkan perlengkapan yang memadai karena suhu malam hari di kawasan ini cukup dingin.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Lumbangrejo, Kec. Prigen",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.677426,112.619274",
    place_id: "ChIJ-_geEVt3eC4RP5AYBPmdyVc",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "the-pinus-prigen",
    slug: "the-pinus-prigen",
    name: "The Pinus Prigen",
    regionId: "pasuruan-barat",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.671606,
      longitude: 112.625433,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto The Pinus Prigen (belum tersedia)",
      },
    ],
    short_description:
      "The Pinus Prigen merupakan destinasi bernuansa hutan pinus di Desa Lumbangrejo, Prigen. Suasana teduh di antara pepohonan pinus menjadikannya tempat yang nyaman untuk menikmati alam sambil bersantai.",
    description: [
      "The Pinus Prigen merupakan destinasi bernuansa hutan pinus di Desa Lumbangrejo, Prigen. Suasana teduh di antara pepohonan pinus menjadikannya tempat yang nyaman untuk menikmati alam sambil bersantai.",
      "Area ini cocok untuk berfoto, berkemah, atau sekadar melepas penat bersama keluarga dan teman. Karena berada di dataran tinggi, siapkan pakaian hangat terutama jika berkunjung pada sore hingga malam hari.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Lumbangrejo, Kec. Prigen",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.671606,112.625433",
    place_id: "ChIJZcwCXW3Z1y0R0EktfT5MZM0",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "twa-gunung-baung",
    slug: "twa-gunung-baung",
    name: "Taman Wisata Alam Gunung Baung",
    regionId: "pasuruan-barat",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.80029,
      longitude: 112.747789,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Taman Wisata Alam Gunung Baung (belum tersedia)",
      },
    ],
    short_description:
      "Taman Wisata Alam Gunung Baung berada di Kecamatan Purwosari dan merupakan kawasan konservasi dengan hutan yang masih terjaga. Tempat ini menawarkan suasana alam yang tenang serta kesempatan untuk mengenal kekayaan flora dan fauna setempat.",
    description: [
      "Taman Wisata Alam Gunung Baung berada di Kecamatan Purwosari dan merupakan kawasan konservasi dengan hutan yang masih terjaga. Tempat ini menawarkan suasana alam yang tenang serta kesempatan untuk mengenal kekayaan flora dan fauna setempat.",
      "Sebagai kawasan konservasi, pengunjung diharapkan menjaga kebersihan dan tidak merusak lingkungan. Sebaiknya periksa kondisi akses dan aturan kunjungan terlebih dahulu sebelum berangkat.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Kertosari, Kec. Purwosari",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.80029,112.747789",
    place_id: "ChIJV6ipUw7T1y0Rz8MeiTXJ3XA",
    verification: {
      status: "perlu_cek",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "ranu-grati",
    slug: "ranu-grati",
    name: "Danau Ranu Grati",
    regionId: "pasuruan-timur",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.720866,
      longitude: 113.011982,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Danau Ranu Grati (belum tersedia)",
      },
    ],
    short_description:
      "Danau Ranu Grati adalah danau alami di Kecamatan Grati yang berada di dataran rendah dengan pemandangan perbukitan di sekelilingnya. Hamparan air yang tenang menjadikannya tempat yang nyaman untuk bersantai bersama keluarga.",
    description: [
      "Danau Ranu Grati adalah danau alami di Kecamatan Grati yang berada di dataran rendah dengan pemandangan perbukitan di sekelilingnya. Hamparan air yang tenang menjadikannya tempat yang nyaman untuk bersantai bersama keluarga.",
      "Di sekitar danau, pengunjung dapat menikmati suasana tepi air, berfoto, atau mencoba aktivitas wisata air yang tersedia. Berkunjunglah pada pagi atau sore hari agar suasana lebih sejuk dan pemandangannya lebih indah.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Sumberdawesari, Kec. Grati",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.720866,113.011982",
    place_id: "ChIJEbrSvRm21y0RYwyfUnz8NB0",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "pantai-lekok",
    slug: "pantai-lekok",
    name: "Pantai Lekok",
    regionId: "pasuruan-timur",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.657496,
      longitude: 112.991822,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Pantai Lekok (belum tersedia)",
      },
    ],
    short_description:
      "Pantai Lekok berada di Kecamatan Lekok, di pesisir utara Pasuruan yang menghadap Selat Madura. Pantai ini menyuguhkan suasana khas pesisir dengan hamparan laut, angin yang berembus, dan aktivitas nelayan setempat.",
    description: [
      "Pantai Lekok berada di Kecamatan Lekok, di pesisir utara Pasuruan yang menghadap Selat Madura. Pantai ini menyuguhkan suasana khas pesisir dengan hamparan laut, angin yang berembus, dan aktivitas nelayan setempat.",
      "Pengunjung dapat menikmati pemandangan laut, terutama pada sore hari ketika langit mulai berwarna jingga. Perhatikan kondisi ombak dan arahan warga setempat jika ingin bermain di area pantai.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Jatirejo, Kec. Lekok",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.657496,112.991822",
    place_id: "ChIJh56WhAfI1y0Ryfn8OXrN1Zo",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "mangrove-nguling",
    slug: "mangrove-nguling",
    name: "Mangrove Tour Nguling",
    regionId: "pasuruan-timur",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.703969,
      longitude: 113.093252,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Mangrove Tour Nguling (belum tersedia)",
      },
    ],
    short_description:
      "Mangrove Tour Nguling adalah wisata hutan bakau di wilayah pesisir Kecamatan Nguling. Pengunjung dapat menyusuri kawasan mangrove dan mengenal fungsi penting ekosistem ini sebagai pelindung pantai sekaligus habitat berbagai biota.",
    description: [
      "Mangrove Tour Nguling adalah wisata hutan bakau di wilayah pesisir Kecamatan Nguling. Pengunjung dapat menyusuri kawasan mangrove dan mengenal fungsi penting ekosistem ini sebagai pelindung pantai sekaligus habitat berbagai biota.",
      "Wisata ini cocok untuk keluarga maupun pelajar yang ingin belajar tentang pelestarian lingkungan pesisir. Kenakan pakaian dan alas kaki yang sesuai, serta jangan meninggalkan sampah di area mangrove.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Penunggul, Kec. Nguling",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.703969,113.093252",
    place_id: "ChIJRy5oqc221y0RNhQDT2X8jPs",
    verification: {
      status: "perlu_cek",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "mangrove-kota-pasuruan",
    slug: "mangrove-kota-pasuruan",
    name: "Hutan Mangrove Kota Pasuruan",
    regionId: "kota-pasuruan",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.62823,
      longitude: 112.907342,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Hutan Mangrove Kota Pasuruan (belum tersedia)",
      },
    ],
    short_description:
      "Hutan Mangrove Kota Pasuruan berada di kawasan pesisir Kecamatan Panggungrejo. Area ini menjadi ruang hijau di tepi pantai yang berperan menjaga garis pantai sekaligus menjadi tempat rekreasi dan edukasi lingkungan.",
    description: [
      "Hutan Mangrove Kota Pasuruan berada di kawasan pesisir Kecamatan Panggungrejo. Area ini menjadi ruang hijau di tepi pantai yang berperan menjaga garis pantai sekaligus menjadi tempat rekreasi dan edukasi lingkungan.",
      "Pengunjung dapat berjalan santai menikmati suasana hutan bakau, mengamati tumbuhan dan satwa pesisir, serta belajar tentang pentingnya konservasi. Lokasinya yang dekat dengan pusat kota memudahkan untuk dikunjungi di sela waktu luang.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Tamba'an, Kec. Panggungrejo",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.62823,112.907342",
    place_id: "ChIJy3Z79HjG1y0RZGa8XIaP_Wo",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "banyu-biru",
    slug: "banyu-biru",
    name: "Pemandian Alam Banyu Biru",
    regionId: "pasuruan-timur",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.747592,
      longitude: 112.968108,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Pemandian Alam Banyu Biru (belum tersedia)",
      },
    ],
    short_description:
      "Pemandian Alam Banyu Biru di Kecamatan Winongan adalah pemandian yang bersumber dari mata air alami. Air yang jernih berwarna kebiruan menjadi daya tarik utama sekaligus memberi kesegaran bagi pengunjung yang ingin berenang atau berendam.",
    description: [
      "Pemandian Alam Banyu Biru di Kecamatan Winongan adalah pemandian yang bersumber dari mata air alami. Air yang jernih berwarna kebiruan menjadi daya tarik utama sekaligus memberi kesegaran bagi pengunjung yang ingin berenang atau berendam.",
      "Tempat ini cocok untuk rekreasi keluarga karena suasananya teduh dan nyaman. Kunjungi pada hari biasa jika ingin suasana yang lebih tenang, dan perhatikan aturan keselamatan di area kolam.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Sumberrejo, Kec. Winongan",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.747592,112.968108",
    place_id: "ChIJQaUrISXK1y0RpU3ypDF7EZM",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "kebun-raya-purwodadi",
    slug: "kebun-raya-purwodadi",
    name: "Kebun Raya Purwodadi",
    regionId: "pasuruan-barat",
    categoryId: "wisata-alam",
    place: {
      latitude: -7.797655,
      longitude: 112.737271,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Kebun Raya Purwodadi (belum tersedia)",
      },
    ],
    short_description:
      "Kebun Raya Purwodadi adalah kebun botani yang berada di Kecamatan Purwosari dan terkenal dengan koleksi tanaman dari kawasan beriklim kering dataran rendah. Kawasan ini berfungsi sebagai tempat konservasi, penelitian, pendidikan, sekaligus rekreasi.",
    description: [
      "Kebun Raya Purwodadi adalah kebun botani yang berada di Kecamatan Purwosari dan terkenal dengan koleksi tanaman dari kawasan beriklim kering dataran rendah. Kawasan ini berfungsi sebagai tempat konservasi, penelitian, pendidikan, sekaligus rekreasi.",
      "Pengunjung dapat berjalan santai menyusuri taman, mengamati beragam koleksi tumbuhan, dan menikmati suasana yang asri. Tempat ini cocok untuk wisata edukasi bagi pelajar maupun keluarga yang ingin belajar tentang keanekaragaman hayati.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Kertosari, Kec. Purwosari",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.797655,112.737271",
    place_id: "ChIJ2YRA8gzT1y0RF3hvQDDAxVk",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "taman-safari-prigen",
    slug: "taman-safari-prigen",
    name: "Taman Safari Indonesia II Prigen",
    regionId: "pasuruan-barat",
    categoryId: "keluarga",
    place: {
      latitude: -7.759045,
      longitude: 112.668747,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Taman Safari Indonesia II Prigen (belum tersedia)",
      },
    ],
    short_description:
      "Taman Safari Indonesia II Prigen adalah taman safari di kaki Gunung Arjuno–Welirang yang menyatukan konservasi satwa dengan wisata keluarga. Pengunjung dapat melihat beragam satwa dari dekat, baik dari dalam kendaraan maupun di area yang bisa dijelajahi dengan berjalan kaki.",
    description: [
      "Taman Safari Indonesia II Prigen adalah taman safari di kaki Gunung Arjuno–Welirang yang menyatukan konservasi satwa dengan wisata keluarga. Pengunjung dapat melihat beragam satwa dari dekat, baik dari dalam kendaraan maupun di area yang bisa dijelajahi dengan berjalan kaki.",
      "Selain melihat satwa, tersedia berbagai atraksi dan wahana yang cocok untuk anak-anak. Karena areanya luas, sediakan waktu setengah hingga satu hari penuh agar kunjungan lebih nyaman dan tidak terburu-buru.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Cendono, Kec. Purwosari",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.759045,112.668747",
    place_id: "ChIJz9_vaA_X1y0Rr_m1v7rCDaM",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "cimory-dairyland-prigen",
    slug: "cimory-dairyland-prigen",
    name: "Dairyland Farm Theme Park Prigen",
    regionId: "pasuruan-barat",
    categoryId: "keluarga",
    place: {
      latitude: -7.680142,
      longitude: 112.640361,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Dairyland Farm Theme Park Prigen (belum tersedia)",
      },
    ],
    short_description:
      "Dairyland Farm Theme Park Prigen adalah taman tema bergaya peternakan yang berada di kawasan Prigen. Pengunjung dapat melihat hewan ternak, bermain di area rekreasi, dan menikmati suasana pegunungan yang sejuk.",
    description: [
      "Dairyland Farm Theme Park Prigen adalah taman tema bergaya peternakan yang berada di kawasan Prigen. Pengunjung dapat melihat hewan ternak, bermain di area rekreasi, dan menikmati suasana pegunungan yang sejuk.",
      "Tempat ini ramah untuk anak-anak sehingga cocok sebagai tujuan liburan keluarga. Pengunjung juga bisa mencicipi aneka produk olahan susu dan kuliner di area sekitarnya.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Prigen, Kec. Prigen",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.680142,112.640361",
    place_id: "ChIJ1TirnxTX1y0RdTFapxcblU4",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "tanaria-park",
    slug: "tanaria-park",
    name: "Tanaria Park",
    regionId: "pasuruan-barat",
    categoryId: "keluarga",
    place: {
      latitude: -7.676678,
      longitude: 112.624277,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Tanaria Park (belum tersedia)",
      },
    ],
    short_description:
      "Tanaria Park adalah taman tema di Desa Lumbangrejo, Prigen, dengan nuansa pegunungan yang sejuk. Area ini dirancang sebagai tempat rekreasi keluarga dengan beragam spot foto dan wahana yang menarik.",
    description: [
      "Tanaria Park adalah taman tema di Desa Lumbangrejo, Prigen, dengan nuansa pegunungan yang sejuk. Area ini dirancang sebagai tempat rekreasi keluarga dengan beragam spot foto dan wahana yang menarik.",
      "Pengunjung dapat menghabiskan waktu bermain sekaligus bersantai bersama anak-anak dan orang tua. Datang pada hari kerja biasanya lebih lengang, sedangkan akhir pekan dan musim liburan cenderung lebih ramai.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Lumbangrejo, Kec. Prigen",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.676678,112.624277",
    place_id: "ChIJNSYMFMrZ1y0RByopaLqGI6c",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "lembah-pendawa",
    slug: "lembah-pendawa",
    name: "Lembah Pendawa Bali van Java",
    regionId: "pasuruan-barat",
    categoryId: "keluarga",
    place: {
      latitude: -7.67032,
      longitude: 112.681038,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Lembah Pendawa Bali van Java (belum tersedia)",
      },
    ],
    short_description:
      "Lembah Pendawa Bali van Java adalah taman rekreasi di Pandaan yang mengusung nuansa pulau Bali. Pengunjung dapat menikmati suasana taman bernuansa Bali dan berbagai fasilitas rekreasi untuk keluarga.",
    description: [
      "Lembah Pendawa Bali van Java adalah taman rekreasi di Pandaan yang mengusung nuansa pulau Bali. Pengunjung dapat menikmati suasana taman bernuansa Bali dan berbagai fasilitas rekreasi untuk keluarga.",
      "Tempat ini cocok bagi yang ingin berlibur santai dengan suasana berbeda tanpa harus pergi jauh. Sebaiknya cek kembali informasi wahana dan jam operasional sebelum berkunjung.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Durensewu, Kec. Pandaan",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.67032,112.681038",
    place_id: "ChIJuclx3KTZ1y0RgA7gLaiRBXg",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "taman-k-pandaan",
    slug: "taman-k-pandaan",
    name: "Taman K",
    regionId: "pasuruan-barat",
    categoryId: "keluarga",
    place: {
      latitude: -7.677306,
      longitude: 112.678884,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Taman K (belum tersedia)",
      },
    ],
    short_description:
      "Taman K adalah taman rekreasi di Kecamatan Pandaan yang dirancang sebagai tempat bersantai dan berkumpul bersama keluarga. Suasana tamannya yang tertata menjadikannya pilihan yang nyaman untuk menghabiskan waktu luang.",
    description: [
      "Taman K adalah taman rekreasi di Kecamatan Pandaan yang dirancang sebagai tempat bersantai dan berkumpul bersama keluarga. Suasana tamannya yang tertata menjadikannya pilihan yang nyaman untuk menghabiskan waktu luang.",
      "Pengunjung dapat menikmati area terbuka, berfoto, dan bermain bersama anak-anak. Lokasinya yang berdekatan dengan destinasi lain di Pandaan memudahkan untuk digabungkan dalam satu rute perjalanan.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Durensewu, Kec. Pandaan",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.677306,112.678884",
    place_id: "ChIJkVMMOMLX1y0Rd2TOqZGohcc",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "ranting-sewu-park",
    slug: "ranting-sewu-park",
    name: "Ranting Sewu Park",
    regionId: "pasuruan-barat",
    categoryId: "keluarga",
    place: {
      latitude: -7.676478,
      longitude: 112.685844,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Ranting Sewu Park (belum tersedia)",
      },
    ],
    short_description:
      "Ranting Sewu Park adalah destinasi wisata edukasi di Kecamatan Pandaan. Tempat ini menggabungkan unsur bermain dan belajar sehingga anak-anak dapat mengenal alam dengan cara yang menyenangkan.",
    description: [
      "Ranting Sewu Park adalah destinasi wisata edukasi di Kecamatan Pandaan. Tempat ini menggabungkan unsur bermain dan belajar sehingga anak-anak dapat mengenal alam dengan cara yang menyenangkan.",
      "Suasana tamannya yang hijau menjadikannya nyaman untuk dikunjungi bersama keluarga maupun rombongan sekolah. Jika berencana datang berombongan, sebaiknya hubungi pengelola terlebih dahulu untuk memastikan ketersediaan kegiatan.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Durensewu, Kec. Pandaan",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.676478,112.685844",
    place_id: "ChIJzbpchujX1y0RT1L09ttECpo",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "telogo-sewu",
    slug: "telogo-sewu",
    name: "Telogo Sewu Outbound & Kolam Renang",
    regionId: "pasuruan-barat",
    categoryId: "keluarga",
    place: {
      latitude: -7.673559,
      longitude: 112.68388,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Telogo Sewu Outbound & Kolam Renang (belum tersedia)",
      },
    ],
    short_description:
      "Telogo Sewu Outbound & Kolam Renang di Pandaan menyediakan kegiatan outbound dan fasilitas kolam renang dalam satu lokasi. Tempat ini cocok untuk kegiatan keluarga, komunitas, maupun rombongan sekolah.",
    description: [
      "Telogo Sewu Outbound & Kolam Renang di Pandaan menyediakan kegiatan outbound dan fasilitas kolam renang dalam satu lokasi. Tempat ini cocok untuk kegiatan keluarga, komunitas, maupun rombongan sekolah.",
      "Pengunjung dapat bermain air, mengikuti permainan luar ruang, dan menikmati suasana yang segar. Bawalah pakaian ganti serta ikuti aturan keselamatan, terutama saat anak-anak berada di area kolam.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Durensewu, Kec. Pandaan",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.673559,112.68388",
    place_id: "ChIJqQFrBeTZ1y0RByghguUXHak",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "taman-dayu",
    slug: "taman-dayu",
    name: "The Taman Dayu",
    regionId: "pasuruan-barat",
    categoryId: "keluarga",
    place: {
      latitude: -7.675169,
      longitude: 112.694828,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto The Taman Dayu (belum tersedia)",
      },
    ],
    short_description:
      "The Taman Dayu adalah kawasan taman dan kuliner di Pandaan yang menawarkan suasana hijau dan tertata. Kawasan ini menjadi tempat favorit untuk bersantai, berjalan-jalan, dan menikmati beragam pilihan makanan.",
    description: [
      "The Taman Dayu adalah kawasan taman dan kuliner di Pandaan yang menawarkan suasana hijau dan tertata. Kawasan ini menjadi tempat favorit untuk bersantai, berjalan-jalan, dan menikmati beragam pilihan makanan.",
      "Suasananya yang nyaman membuat Taman Dayu cocok untuk berkumpul bersama keluarga atau teman. Pengunjung juga dapat memadukan kunjungan dengan destinasi lain di sekitar Pandaan dan Prigen.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Durensewu, Kec. Pandaan",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.675169,112.694828",
    place_id: "ChIJy_DrMgDX1y0RiCACDRMeDa8",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "splash-waterpark",
    slug: "splash-waterpark",
    name: "The Splash Waterpark (Taman Dayu)",
    regionId: "pasuruan-barat",
    categoryId: "keluarga",
    place: {
      latitude: -7.702061,
      longitude: 112.671702,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto The Splash Waterpark (Taman Dayu) (belum tersedia)",
      },
    ],
    short_description:
      "The Splash Waterpark adalah taman air di kawasan Taman Dayu, Kecamatan Prigen. Tersedia berbagai wahana air yang dapat dinikmati oleh anak-anak maupun orang dewasa, mulai dari seluncuran hingga kolam untuk bersantai.",
    description: [
      "The Splash Waterpark adalah taman air di kawasan Taman Dayu, Kecamatan Prigen. Tersedia berbagai wahana air yang dapat dinikmati oleh anak-anak maupun orang dewasa, mulai dari seluncuran hingga kolam untuk bersantai.",
      "Tempat ini cocok untuk liburan keluarga yang ingin bermain air seharian. Bawalah pakaian renang, perlengkapan ganti, dan tabir surya, serta patuhi aturan keselamatan di setiap wahana.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Sukolelo, Kec. Prigen",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.702061,112.671702",
    place_id: "ChIJiQCtxMhLeC4Rd2yWgd2Lp6Q",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "saygon-waterpark",
    slug: "saygon-waterpark",
    name: "Saygon Waterpark",
    regionId: "pasuruan-barat",
    categoryId: "keluarga",
    place: {
      latitude: -7.747727,
      longitude: 112.737993,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Saygon Waterpark (belum tersedia)",
      },
    ],
    short_description:
      "Saygon Waterpark merupakan taman air di Kecamatan Purwosari yang menawarkan beragam wahana bermain air. Tempat ini menjadi pilihan rekreasi bagi keluarga yang ingin bersenang-senang dan menyegarkan diri.",
    description: [
      "Saygon Waterpark merupakan taman air di Kecamatan Purwosari yang menawarkan beragam wahana bermain air. Tempat ini menjadi pilihan rekreasi bagi keluarga yang ingin bersenang-senang dan menyegarkan diri.",
      "Pengunjung dapat bermain di kolam, mencoba wahana, dan bersantai di area sekitarnya. Datanglah lebih pagi agar punya waktu bermain lebih lama dan terhindar dari antrean pada jam ramai.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Pucangsari, Kec. Purwosari",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.747727,112.737993",
    place_id: "ChIJhdtSBF7R1y0R0P_gSVMuhok",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "bhakti-alam",
    slug: "bhakti-alam",
    name: "Agrowisata Bhakti Alam",
    regionId: "pasuruan-selatan",
    categoryId: "keluarga",
    place: {
      latitude: -7.815344,
      longitude: 112.805222,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Agrowisata Bhakti Alam (belum tersedia)",
      },
    ],
    short_description:
      "Agrowisata Bhakti Alam berada di Kecamatan Tutur, kawasan dataran tinggi yang terkenal dengan pertanian dan peternakan. Tempat ini mengajak pengunjung mengenal dunia agrowisata sambil menikmati udara yang sejuk.",
    description: [
      "Agrowisata Bhakti Alam berada di Kecamatan Tutur, kawasan dataran tinggi yang terkenal dengan pertanian dan peternakan. Tempat ini mengajak pengunjung mengenal dunia agrowisata sambil menikmati udara yang sejuk.",
      "Selain bersantai, pengunjung dapat belajar tentang aktivitas pertanian dan melihat suasana khas perdesaan lereng pegunungan. Cocok untuk wisata keluarga maupun kegiatan edukasi bagi anak-anak.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Ngembal, Kec. Tutur",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.815344,112.805222",
    place_id: "ChIJV40W66bS1y0RC6SMWlQqx1o",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "bukit-flora",
    slug: "bukit-flora",
    name: "Wisata Bukit Flora",
    regionId: "pasuruan-selatan",
    categoryId: "keluarga",
    place: {
      latitude: -7.86516,
      longitude: 112.80666,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Wisata Bukit Flora (belum tersedia)",
      },
    ],
    short_description:
      "Wisata Bukit Flora di Kecamatan Tutur menggabungkan unsur wisata edukasi dan kegiatan outbound di tengah udara pegunungan yang sejuk. Suasana asri dan pemandangan alam sekitarnya menjadikan tempat ini nyaman untuk beraktivitas.",
    description: [
      "Wisata Bukit Flora di Kecamatan Tutur menggabungkan unsur wisata edukasi dan kegiatan outbound di tengah udara pegunungan yang sejuk. Suasana asri dan pemandangan alam sekitarnya menjadikan tempat ini nyaman untuk beraktivitas.",
      "Tempat ini cocok untuk keluarga, komunitas, maupun rombongan sekolah yang ingin belajar sambil bermain. Bawalah pakaian hangat dan perlengkapan yang sesuai untuk kegiatan di luar ruangan.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Tutur, Kec. Tutur",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.86516,112.80666",
    place_id: "ChIJT0UP6bEt1i0RkL0Je6IAFiM",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "dam-pleret-1904",
    slug: "dam-pleret-1904",
    name: "Dam Pleret 1904",
    regionId: "pasuruan-utara",
    categoryId: "keluarga",
    place: {
      latitude: -7.680641,
      longitude: 112.882733,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Dam Pleret 1904 (belum tersedia)",
      },
    ],
    short_description:
      "Dam Pleret 1904 adalah bangunan bendungan peninggalan masa kolonial di Kecamatan Pohjentrek, Desa Pleret, yang hingga kini masih berperan dalam pengairan. Tempat ini menjadi desa wisata yang memadukan nilai sejarah, edukasi, dan keindahan alam.",
    description: [
      "Dam Pleret 1904 adalah bangunan bendungan peninggalan masa kolonial di Kecamatan Pohjentrek, Desa Pleret, yang hingga kini masih berperan dalam pengairan. Tempat ini menjadi desa wisata yang memadukan nilai sejarah, edukasi, dan keindahan alam.",
      "Pengunjung dapat melihat langsung bangunan bendungan, menikmati pemandangan aliran air, dan belajar tentang sejarah pengelolaan air di Pasuruan. Cocok untuk wisata edukasi bagi anak-anak maupun pecinta sejarah.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Pleret, Kec. Pohjentrek",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.680641,112.882733",
    place_id: "ChIJ_8CIwI7P1y0RaHJHAhnBuQA",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "kedawung-agro-selfie",
    slug: "kedawung-agro-selfie",
    name: "Kedawung Agro Selfie (KAS)",
    regionId: "pasuruan-timur",
    categoryId: "keluarga",
    place: {
      latitude: -7.705252,
      longitude: 112.975247,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Kedawung Agro Selfie (KAS) (belum tersedia)",
      },
    ],
    short_description:
      "Kedawung Agro Selfie (KAS) adalah destinasi agrowisata di Kecamatan Grati yang menawarkan taman dan spot foto di tengah suasana perdesaan. Hamparan tanaman dan dekorasi kreatif menjadi daya tarik bagi pengunjung yang gemar berfoto.",
    description: [
      "Kedawung Agro Selfie (KAS) adalah destinasi agrowisata di Kecamatan Grati yang menawarkan taman dan spot foto di tengah suasana perdesaan. Hamparan tanaman dan dekorasi kreatif menjadi daya tarik bagi pengunjung yang gemar berfoto.",
      "Tempat ini cocok untuk dikunjungi bersama keluarga atau teman sambil menikmati udara terbuka. Datanglah pada pagi atau sore hari agar cahaya lebih bagus untuk berfoto dan suhu tidak terlalu panas.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Kedawungkulon, Kec. Grati",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.705252,112.975247",
    place_id: "ChIJcZQ4SrbJ1y0RXhsycY6By0M",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "taman-kota-pasuruan",
    slug: "taman-kota-pasuruan",
    name: "Taman Kota Pasuruan",
    regionId: "kota-pasuruan",
    categoryId: "keluarga",
    place: {
      latitude: -7.645218,
      longitude: 112.909697,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Taman Kota Pasuruan (belum tersedia)",
      },
    ],
    short_description:
      "Taman Kota Pasuruan adalah ruang terbuka hijau di pusat Kota Pasuruan yang dapat dinikmati oleh masyarakat dari berbagai kalangan. Tempat ini menjadi lokasi favorit warga untuk bersantai, berolahraga ringan, dan bermain bersama anak-anak.",
    description: [
      "Taman Kota Pasuruan adalah ruang terbuka hijau di pusat Kota Pasuruan yang dapat dinikmati oleh masyarakat dari berbagai kalangan. Tempat ini menjadi lokasi favorit warga untuk bersantai, berolahraga ringan, dan bermain bersama anak-anak.",
      "Lokasinya yang berada di tengah kota membuatnya mudah dijangkau dan cocok untuk disinggahi sambil menjelajahi tempat wisata lain di Kota Pasuruan. Jagalah kebersihan dan fasilitas taman agar tetap nyaman bagi semua pengunjung.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Pekuncen, Kec. Panggungrejo",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.645218,112.909697",
    place_id: "ChIJecPixwvG1y0RbRwL1qEpTE4",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "alun-alun-pasuruan",
    slug: "alun-alun-pasuruan",
    name: "Alun-Alun Pasuruan (Payung Madinah)",
    regionId: "kota-pasuruan",
    categoryId: "keluarga",
    place: {
      latitude: -7.641916,
      longitude: 112.906693,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Alun-Alun Pasuruan (Payung Madinah) (belum tersedia)",
      },
    ],
    short_description:
      "Alun-Alun Pasuruan merupakan ruang publik utama di jantung Kota Pasuruan dan dikenal dengan payung-payung besar yang terinspirasi dari Masjid Nabawi di Madinah, sehingga disebut Payung Madinah. Tempat ini ramai pada sore dan malam hari ketika warga berkumpul dan bersantai.",
    description: [
      "Alun-Alun Pasuruan merupakan ruang publik utama di jantung Kota Pasuruan dan dikenal dengan payung-payung besar yang terinspirasi dari Masjid Nabawi di Madinah, sehingga disebut Payung Madinah. Tempat ini ramai pada sore dan malam hari ketika warga berkumpul dan bersantai.",
      "Letaknya bersebelahan dengan Masjid Agung Al-Anwar sehingga sering menjadi titik awal wisata religi dan wisata kota. Pengunjung dapat menikmati suasana, berfoto, serta mencicipi jajanan yang ada di sekitarnya.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Kebonsari, Kec. Panggungrejo",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.641916,112.906693",
    place_id: "ChIJm-BusArG1y0RsS1j739ftjI",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "masjid-cheng-hoo-pandaan",
    slug: "masjid-cheng-hoo-pandaan",
    name: "Masjid Muhammad Cheng Hoo Pandaan",
    regionId: "pasuruan-barat",
    categoryId: "wisata-religi",
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
      "Masjid Muhammad Cheng Hoo Pandaan menonjol dengan arsitektur bernuansa Tionghoa yang dipadukan dengan fungsi masjid. Namanya diambil dari Laksamana Cheng Ho, tokoh pelaut Tiongkok beragama Islam yang dikenal dalam sejarah hubungan Nusantara dan Tiongkok.",
    description: [
      "Masjid Muhammad Cheng Hoo Pandaan menonjol dengan arsitektur bernuansa Tionghoa yang dipadukan dengan fungsi masjid. Namanya diambil dari Laksamana Cheng Ho, tokoh pelaut Tiongkok beragama Islam yang dikenal dalam sejarah hubungan Nusantara dan Tiongkok.",
      "Selain menjadi tempat ibadah, masjid ini menarik dikunjungi karena bentuk bangunannya yang unik dan warna-warnanya yang khas. Pengunjung diharapkan menjaga adab, berpakaian sopan, dan menghormati jamaah yang sedang beribadah.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Petungasri, Kec. Pandaan",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.651513,112.68751",
    place_id: "ChIJJWgjoprZ1y0RgQ8NzzM1hoM",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "masjid-agung-al-anwar",
    slug: "masjid-agung-al-anwar",
    name: "Masjid Agung Al-Anwar",
    regionId: "kota-pasuruan",
    categoryId: "wisata-religi",
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
      "Masjid Agung Al-Anwar adalah masjid utama di Kota Pasuruan yang berdiri di kawasan pusat kota. Masjid ini menjadi pusat kegiatan keagamaan dan salah satu ikon kota, terutama bagi para peziarah yang mengunjungi wisata religi di Pasuruan.",
    description: [
      "Masjid Agung Al-Anwar adalah masjid utama di Kota Pasuruan yang berdiri di kawasan pusat kota. Masjid ini menjadi pusat kegiatan keagamaan dan salah satu ikon kota, terutama bagi para peziarah yang mengunjungi wisata religi di Pasuruan.",
      "Lokasinya yang dekat dengan alun-alun dan makam ulama menjadikannya titik awal yang strategis untuk menjelajahi wisata religi. Pengunjung dimohon mengenakan pakaian yang sopan dan menjaga ketenangan selama berada di area masjid.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Kebonsari, Kec. Panggungrejo",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.641466,112.905601",
    place_id: "ChIJwYB0_9_F1y0RM4SDUWrrCyc",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "makam-kh-abdul-hamid",
    slug: "makam-kh-abdul-hamid",
    name: "Makam KH. Abdul Hamid (Mbah Hamid)",
    regionId: "kota-pasuruan",
    categoryId: "wisata-religi",
    place: {
      latitude: -7.64131,
      longitude: 112.905317,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Makam KH. Abdul Hamid (Mbah Hamid) (belum tersedia)",
      },
    ],
    short_description:
      "Makam KH. Abdul Hamid, yang akrab disapa Mbah Hamid, adalah salah satu makam ulama yang paling banyak dikunjungi peziarah di Kota Pasuruan. Beliau dikenal luas sebagai ulama yang dihormati masyarakat, dan makamnya menjadi tujuan utama wisata religi.",
    description: [
      "Makam KH. Abdul Hamid, yang akrab disapa Mbah Hamid, adalah salah satu makam ulama yang paling banyak dikunjungi peziarah di Kota Pasuruan. Beliau dikenal luas sebagai ulama yang dihormati masyarakat, dan makamnya menjadi tujuan utama wisata religi.",
      "Peziarah datang dari berbagai daerah untuk berdoa dan mengenang keteladanan beliau. Saat berkunjung, jagalah adab, berpakaian sopan, dan ikuti tata tertib yang berlaku di area makam.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Kebonsari, Kec. Panggungrejo",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.64131,112.905317",
    place_id: "ChIJWSUAl1fF1y0RM2jLISJgEUY",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "makam-mbah-slagah",
    slug: "makam-mbah-slagah",
    name: "Makam Mbah Slagah",
    regionId: "kota-pasuruan",
    categoryId: "wisata-religi",
    place: {
      latitude: -7.649078,
      longitude: 112.907852,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Makam Mbah Slagah (belum tersedia)",
      },
    ],
    short_description:
      "Makam Mbah Slagah berada di Kelurahan Pekuncen, Kota Pasuruan, dan menjadi salah satu tujuan ziarah warga setempat maupun pengunjung dari luar daerah. Tempat ini dihormati masyarakat sebagai makam tokoh yang dikenal dalam sejarah lokal.",
    description: [
      "Makam Mbah Slagah berada di Kelurahan Pekuncen, Kota Pasuruan, dan menjadi salah satu tujuan ziarah warga setempat maupun pengunjung dari luar daerah. Tempat ini dihormati masyarakat sebagai makam tokoh yang dikenal dalam sejarah lokal.",
      "Peziarah biasanya datang untuk berdoa dan mengikuti rangkaian wisata religi di Kota Pasuruan. Jagalah ketenangan, berpakaian sopan, dan hormati tata cara yang berlaku di lokasi.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Pekuncen, Kec. Panggungrejo",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.649078,112.907852",
    place_id: "ChIJOQ1xUQjG1y0R1cxEOlw5ByM",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "makam-mbah-semendi",
    slug: "makam-mbah-semendi",
    name: "Makam Mbah Sholeh Semendi",
    regionId: "pasuruan-timur",
    categoryId: "wisata-religi",
    place: {
      latitude: -7.727835,
      longitude: 112.966573,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Makam Mbah Sholeh Semendi (belum tersedia)",
      },
    ],
    short_description:
      "Makam Mbah Sholeh Semendi berada di Desa Bandaran, Kecamatan Winongan. Tempat ini dihormati masyarakat sebagai makam tokoh agama dan menjadi tujuan ziarah bagi warga sekitar maupun peziarah dari luar daerah.",
    description: [
      "Makam Mbah Sholeh Semendi berada di Desa Bandaran, Kecamatan Winongan. Tempat ini dihormati masyarakat sebagai makam tokoh agama dan menjadi tujuan ziarah bagi warga sekitar maupun peziarah dari luar daerah.",
      "Pengunjung dapat berdoa dan mengenang jasa tokoh yang dimakamkan di sini dalam suasana yang tenang. Selama berada di lokasi, jagalah adab dan kebersihan serta ikuti arahan pengurus makam.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Bandaran, Kec. Winongan",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.727835,112.966573",
    place_id: "ChIJA_YGE5DJ1y0RUiPNzY52JvM",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "makam-mbah-syakaruddin",
    slug: "makam-mbah-syakaruddin",
    name: "Makam Mbah Syakaruddin",
    regionId: "pasuruan-timur",
    categoryId: "wisata-religi",
    place: {
      latitude: -7.723027,
      longitude: 112.92617,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Makam Mbah Syakaruddin (belum tersedia)",
      },
    ],
    short_description:
      "Makam Mbah Syakaruddin berada di Desa Keboncandi, Kecamatan Gondangwetan. Makam ini dihormati masyarakat dan sering dikunjungi peziarah yang ingin berdoa serta mengenang tokoh yang dimakamkan di sini.",
    description: [
      "Makam Mbah Syakaruddin berada di Desa Keboncandi, Kecamatan Gondangwetan. Makam ini dihormati masyarakat dan sering dikunjungi peziarah yang ingin berdoa serta mengenang tokoh yang dimakamkan di sini.",
      "Suasana tempat ini tenang sehingga nyaman untuk berdoa dengan khusyuk. Datanglah dengan pakaian yang sopan, jaga ketertiban, dan hormati peziarah lain yang sedang berada di lokasi.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Keboncandi, Kec. Gondangwetan",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.723027,112.92617",
    place_id: "ChIJCUge7QHJ1y0RNoWAwdgDydY",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "makam-mbah-sayyid-arif-segoropuro",
    slug: "makam-mbah-sayyid-arif-segoropuro",
    name: "Makam Mbah Sayyid Arif Segoropuro",
    regionId: "pasuruan-timur",
    categoryId: "wisata-religi",
    place: {
      latitude: -7.676086,
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
      "Makam Mbah Sayyid Arif Segoropuro berada di Desa Segoropuro, Kecamatan Rejoso. Tempat ini menjadi tujuan ziarah bagi masyarakat yang menghormati tokoh yang dimakamkan di sana dan ingin berdoa di lokasi tersebut.",
    description: [
      "Makam Mbah Sayyid Arif Segoropuro berada di Desa Segoropuro, Kecamatan Rejoso. Tempat ini menjadi tujuan ziarah bagi masyarakat yang menghormati tokoh yang dimakamkan di sana dan ingin berdoa di lokasi tersebut.",
      "Peziarah datang untuk berdoa dan mengenang jasa beliau dalam suasana yang tenang dan khidmat. Selama berkunjung, ikuti tata tertib setempat dan jaga kebersihan serta kesopanan di area makam.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Segoropuro, Kec. Rejoso",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.676086,112.976121",
    place_id: "ChIJ0WRBHmvI1y0RL31QvEHBnFA",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "klenteng-tjoe-tik-kiong",
    slug: "klenteng-tjoe-tik-kiong",
    name: "Klenteng Tjoe Tik Kiong",
    regionId: "kota-pasuruan",
    categoryId: "wisata-religi",
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
      "Klenteng Tjoe Tik Kiong adalah tempat ibadah umat Tionghoa di Kota Pasuruan yang menjadi bagian dari jejak keberagaman budaya kota ini. Arsitektur khas klenteng dengan warna merah dan ornamen tradisionalnya menjadikannya menarik untuk dikunjungi.",
    description: [
      "Klenteng Tjoe Tik Kiong adalah tempat ibadah umat Tionghoa di Kota Pasuruan yang menjadi bagian dari jejak keberagaman budaya kota ini. Arsitektur khas klenteng dengan warna merah dan ornamen tradisionalnya menjadikannya menarik untuk dikunjungi.",
      "Selain sebagai tempat ibadah, klenteng ini mencerminkan sejarah panjang komunitas Tionghoa di Pasuruan. Pengunjung dipersilakan melihat-lihat dengan tetap menjaga sopan santun dan menghormati umat yang sedang beribadah.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Trajeng, Kec. Panggungrejo",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.636724,112.905345",
    place_id: "ChIJrakG7hnF1y0RiFk-DsC6_hU",
    verification: {
      status: "sedang",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "klenteng-tjoe-an-kiong-bangil",
    slug: "klenteng-tjoe-an-kiong-bangil",
    name: "Klenteng Tjoe An Kiong Bangil",
    regionId: "pasuruan-utara",
    categoryId: "wisata-religi",
    place: {
      latitude: -7.596495,
      longitude: 112.781641,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Klenteng Tjoe An Kiong Bangil (belum tersedia)",
      },
    ],
    short_description:
      "Klenteng Tjoe An Kiong adalah klenteng di Kecamatan Bangil yang menjadi pusat ibadah dan budaya komunitas Tionghoa setempat. Bangunannya yang khas dengan ornamen tradisional menunjukkan keberagaman budaya di Pasuruan.",
    description: [
      "Klenteng Tjoe An Kiong adalah klenteng di Kecamatan Bangil yang menjadi pusat ibadah dan budaya komunitas Tionghoa setempat. Bangunannya yang khas dengan ornamen tradisional menunjukkan keberagaman budaya di Pasuruan.",
      "Pengunjung dapat melihat arsitektur klenteng sambil mengenal tradisi yang dijaga hingga kini. Saat berkunjung, jagalah ketenangan, berpakaian sopan, dan hormati kegiatan peribadatan yang sedang berlangsung.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Kauman, Kec. Bangil",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.596495,112.781641",
    place_id: "ChIJ422VpBjb1y0RLoMiN3fNDJE",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "candi-jawi",
    slug: "candi-jawi",
    name: "Candi Jawi",
    regionId: "pasuruan-barat",
    categoryId: "sejarah-budaya",
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
      "Candi Jawi adalah candi peninggalan masa Kerajaan Singasari yang berada di Desa Candiwates, Prigen. Candi ini bercorak perpaduan Hindu dan Buddha serta dikenal dengan bentuknya yang ramping dan menjulang, berlatar pegunungan di sekitarnya.",
    description: [
      "Candi Jawi adalah candi peninggalan masa Kerajaan Singasari yang berada di Desa Candiwates, Prigen. Candi ini bercorak perpaduan Hindu dan Buddha serta dikenal dengan bentuknya yang ramping dan menjulang, berlatar pegunungan di sekitarnya.",
      "Halaman candi yang asri membuatnya nyaman untuk dikunjungi sambil belajar tentang sejarah Jawa Timur. Pengunjung diharapkan tidak memanjat atau merusak bagian candi agar peninggalan bersejarah ini tetap lestari.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Candiwates, Kec. Prigen",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.662501,112.66975",
    place_id: "ChIJEdbzFs3Z1y0RkM8ggTvGKKE",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "candi-belahan",
    slug: "candi-belahan",
    name: "Candi Belahan (Sumber Tetek)",
    regionId: "pasuruan-barat",
    categoryId: "sejarah-budaya",
    place: {
      latitude: -7.607547,
      longitude: 112.651368,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Candi Belahan (Sumber Tetek) (belum tersedia)",
      },
    ],
    short_description:
      "Candi Belahan, yang juga dikenal sebagai Sumber Tetek, adalah petirtaan atau pemandian kuno di Desa Wonosunyo, Gempol. Tempat ini dikaitkan dengan masa Kerajaan Medang dan Raja Airlangga, dengan arca-arca yang menjadi pancuran air.",
    description: [
      "Candi Belahan, yang juga dikenal sebagai Sumber Tetek, adalah petirtaan atau pemandian kuno di Desa Wonosunyo, Gempol. Tempat ini dikaitkan dengan masa Kerajaan Medang dan Raja Airlangga, dengan arca-arca yang menjadi pancuran air.",
      "Aliran air yang jernih dari sumber alami berpadu dengan nuansa sejarah menjadikan tempat ini istimewa bagi pecinta sejarah dan budaya. Hormati nilai sakral dan sejarahnya dengan menjaga kebersihan serta tidak merusak benda cagar budaya.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Wonosunyo, Kec. Gempol",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.607547,112.651368",
    place_id: "ChIJP9puZNrY1y0RDbO52VODE8Q",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "candi-gunung-gangsir",
    slug: "candi-gunung-gangsir",
    name: "Candi Gunung Gangsir",
    regionId: "pasuruan-utara",
    categoryId: "sejarah-budaya",
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
      "Candi Gunung Gangsir adalah situs candi peninggalan masa lampau yang berada di Desa Gununggangsir, Kecamatan Beji. Keberadaannya menjadi bukti jejak peradaban Hindu–Buddha di wilayah Pasuruan.",
    description: [
      "Candi Gunung Gangsir adalah situs candi peninggalan masa lampau yang berada di Desa Gununggangsir, Kecamatan Beji. Keberadaannya menjadi bukti jejak peradaban Hindu–Buddha di wilayah Pasuruan.",
      "Pengunjung dapat melihat sisa-sisa bangunan kuno sambil menikmati suasana yang tenang. Tempat ini cocok bagi yang tertarik pada sejarah dan arkeologi, dengan tetap menjaga kelestarian situs.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Gununggangsir, Kec. Beji",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.58685,112.733475",
    place_id: "ChIJVVVVlQ3c1y0RfJBQ_hyC7Z8",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "candi-keboireng",
    slug: "candi-keboireng",
    name: "Candi Keboireng",
    regionId: "pasuruan-barat",
    categoryId: "sejarah-budaya",
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
      "Candi Keboireng adalah situs peninggalan sejarah di Desa Ngerong, Kecamatan Gempol. Sisa bangunan kuno di sini menjadi bagian dari jejak peradaban masa lampau di wilayah Pasuruan.",
    description: [
      "Candi Keboireng adalah situs peninggalan sejarah di Desa Ngerong, Kecamatan Gempol. Sisa bangunan kuno di sini menjadi bagian dari jejak peradaban masa lampau di wilayah Pasuruan.",
      "Tempat ini cocok bagi pengunjung yang ingin mengenal sejarah lokal dalam suasana yang tenang. Jagalah kebersihan dan jangan menyentuh atau memindahkan bagian situs agar warisan ini tetap terjaga.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Ngerong, Kec. Gempol",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.599954,112.698589",
    place_id: "ChIJ0fIkFNbZ1y0RufYMgxxSRS8",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "situs-raos-pacinan",
    slug: "situs-raos-pacinan",
    name: "Situs Raos Pacinan",
    regionId: "pasuruan-barat",
    categoryId: "sejarah-budaya",
    place: {
      latitude: -7.551486,
      longitude: 112.679669,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Situs Raos Pacinan (belum tersedia)",
      },
    ],
    short_description:
      "Situs Raos Pacinan adalah situs purbakala di Desa Carat, Kecamatan Gempol. Keberadaannya menjadi salah satu bukti jejak sejarah dan peradaban masa lampau di wilayah ini.",
    description: [
      "Situs Raos Pacinan adalah situs purbakala di Desa Carat, Kecamatan Gempol. Keberadaannya menjadi salah satu bukti jejak sejarah dan peradaban masa lampau di wilayah ini.",
      "Pengunjung dapat melihat peninggalan di situs ini dan belajar tentang sejarah lokal Pasuruan. Hormati lokasi sebagai benda cagar budaya dengan tidak merusak atau mengambil bagian situs.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Carat, Kec. Gempol",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.551486,112.679669",
    place_id: "ChIJwy7CEH3f1y0RWY4-8uGb97c",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "candi-sepilar",
    slug: "candi-sepilar",
    name: "Candi Sepilar",
    regionId: "pasuruan-barat",
    categoryId: "sejarah-budaya",
    place: {
      latitude: -7.769912,
      longitude: 112.618293,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Candi Sepilar (belum tersedia)",
      },
    ],
    short_description:
      "Candi Sepilar berada di Desa Sumberrejo, Kecamatan Purwosari, dan dikenal sebagai situs candi yang berada di sekitar jalur pendakian Gunung Arjuno. Lokasinya yang berada di lereng gunung memberikan nuansa sejarah yang berpadu dengan alam.",
    description: [
      "Candi Sepilar berada di Desa Sumberrejo, Kecamatan Purwosari, dan dikenal sebagai situs candi yang berada di sekitar jalur pendakian Gunung Arjuno. Lokasinya yang berada di lereng gunung memberikan nuansa sejarah yang berpadu dengan alam.",
      "Tempat ini menarik bagi pendaki maupun pencinta sejarah yang ingin melihat peninggalan kuno di kawasan pegunungan. Karena aksesnya berada di jalur alam, persiapkan perlengkapan yang sesuai dan periksa kondisi jalur sebelum berkunjung.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Sumberrejo, Kec. Purwosari",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.769912,112.618293",
    place_id: "ChIJ5dfqPVh_eC4RZtFyxCb_D-I",
    verification: {
      status: "perlu_cek",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "prasasti-pendirian-pasuruan",
    slug: "prasasti-pendirian-pasuruan",
    name: "Prasasti Pendirian Pasuruan (De Inscriptie van de Oprichting van Pasoeroean)",
    regionId: "pasuruan-barat",
    categoryId: "sejarah-budaya",
    place: {
      latitude: -7.579799,
      longitude: 112.684955,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Prasasti Pendirian Pasuruan (De Inscriptie van de Oprichting van Pasoeroean) (belum tersedia)",
      },
    ],
    short_description:
      "Prasasti Pendirian Pasuruan, atau De Inscriptie van de Oprichting van Pasoeroean, adalah monumen bersejarah yang berkaitan dengan sejarah berdirinya Pasuruan pada masa kolonial. Prasasti ini menjadi salah satu penanda penting perjalanan sejarah wilayah Pasuruan.",
    description: [
      "Prasasti Pendirian Pasuruan, atau De Inscriptie van de Oprichting van Pasoeroean, adalah monumen bersejarah yang berkaitan dengan sejarah berdirinya Pasuruan pada masa kolonial. Prasasti ini menjadi salah satu penanda penting perjalanan sejarah wilayah Pasuruan.",
      "Pengunjung dapat melihat langsung peninggalan ini dan belajar tentang sejarah kota. Tempat ini cocok bagi pecinta sejarah serta pelajar yang ingin mengenal akar sejarah Pasuruan.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Bulusari, Kec. Gempol",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.579799,112.684955",
    place_id: "ChIJO4o_L8Te1y0RDXdBiRa2Lgk",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "societeit-harmonie",
    slug: "societeit-harmonie",
    name: "Societeit Harmonie",
    regionId: "kota-pasuruan",
    categoryId: "sejarah-budaya",
    place: {
      latitude: -7.645497,
      longitude: 112.910275,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Societeit Harmonie (belum tersedia)",
      },
    ],
    short_description:
      "Societeit Harmonie adalah bangunan cagar budaya di Kota Pasuruan yang dahulu digunakan sebagai tempat berkumpul pada masa kolonial. Arsitekturnya mencerminkan gaya bangunan Eropa yang berkembang di kota-kota Hindia Belanda.",
    description: [
      "Societeit Harmonie adalah bangunan cagar budaya di Kota Pasuruan yang dahulu digunakan sebagai tempat berkumpul pada masa kolonial. Arsitekturnya mencerminkan gaya bangunan Eropa yang berkembang di kota-kota Hindia Belanda.",
      "Bangunan ini menjadi bagian dari wisata kota tua Pasuruan dan dapat dikunjungi sambil menjelajahi bangunan bersejarah di sekitarnya. Pengunjung diharapkan menjaga bangunan dan fasilitasnya sebagai warisan budaya.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Pekuncen, Kec. Panggungrejo",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.645497,112.910275",
    place_id: "ChIJTW7IsNrH1y0RYu4T2Jqlxmw",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "taman-candra-wilwatikta",
    slug: "taman-candra-wilwatikta",
    name: "Taman Candra Wilwatikta",
    regionId: "pasuruan-barat",
    categoryId: "sejarah-budaya",
    place: {
      latitude: -7.658181,
      longitude: 112.675036,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Taman Candra Wilwatikta (belum tersedia)",
      },
    ],
    short_description:
      "Taman Candra Wilwatikta adalah panggung seni budaya di Kecamatan Pandaan yang menjadi tempat pertunjukan seni tradisional khas Jawa Timur. Nama Wilwatikta merujuk pada nama lain Kerajaan Majapahit, sehingga nuansa budayanya terasa kuat.",
    description: [
      "Taman Candra Wilwatikta adalah panggung seni budaya di Kecamatan Pandaan yang menjadi tempat pertunjukan seni tradisional khas Jawa Timur. Nama Wilwatikta merujuk pada nama lain Kerajaan Majapahit, sehingga nuansa budayanya terasa kuat.",
      "Panggung terbuka ini sering digunakan untuk pementasan seni dan acara kebudayaan. Pengunjung dapat menikmati pertunjukan atau sekadar melihat suasana tempatnya; periksa jadwal acara terlebih dahulu agar tidak ketinggalan pementasan.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Sumbergedang, Kec. Pandaan",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.658181,112.675036",
    place_id: "ChIJMwDuP8nZ1y0RL2hMiE_PmnA",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
  {
    id: "sedaeng-kampung-budaya-tengger",
    slug: "sedaeng-kampung-budaya-tengger",
    name: "Sedaeng Kampung Budaya Tengger",
    regionId: "pasuruan-selatan",
    categoryId: "sejarah-budaya",
    place: {
      latitude: -7.881531,
      longitude: 112.912374,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Sedaeng Kampung Budaya Tengger (belum tersedia)",
      },
    ],
    short_description:
      "Sedaeng Kampung Budaya Tengger berada di Desa Sedaeng, Kecamatan Tosari, di kawasan dataran tinggi Tengger. Kampung ini menjaga adat, tradisi, dan kehidupan masyarakat Tengger yang dikenal erat dengan budaya Hindu dan alam pegunungan.",
    description: [
      "Sedaeng Kampung Budaya Tengger berada di Desa Sedaeng, Kecamatan Tosari, di kawasan dataran tinggi Tengger. Kampung ini menjaga adat, tradisi, dan kehidupan masyarakat Tengger yang dikenal erat dengan budaya Hindu dan alam pegunungan.",
      "Pengunjung dapat mengenal budaya, rumah adat, serta kehidupan sehari-hari masyarakat setempat. Hormati adat dan kebiasaan warga, berpakaian sopan, dan mintalah izin sebelum mengambil foto kegiatan atau upacara.",
    ],
    rating: 4,
    reviews_label: "100 Ulasan",
    address: "Sedaeng, Kec. Tosari",
    opening_hours: "08.00 - 17.00 WIB",
    prices: ["Rp 10.000"],
    fasilitas: ["Parkir", "Toilet", "Musholla", "Warung Makan"],
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.881531,112.912374",
    place_id: "ChIJ6RE6mZA11i0R778Rn2QFnTQ",
    verification: {
      status: "tinggi",
      verified_at: null,
    },
    source: "destinasi-wisata-pasuruan.json",
  },
];

/**
 * DESKRIPSI DESTINASI WISATA — Pasuruan Info
 * ==========================================
 * Berisi 3 paragraf deskripsi untuk setiap destinasi (55 destinasi),
 * dikunci berdasarkan `slug`. Blok ini dijalankan setelah WISATA_DESTINATIONS
 * dan sebelum PASINFO_WISATA diekspor (Owner 2026-10-16).
 *
 * Hasil: setiap destinasi mendapat field `description` berupa array
 * [paragraf1, paragraf2, paragraf3], dan `short_description` diganti dengan
 * 2 kalimat pertama dari paragraf 1 (lihat DESKRIPSI_SHORT di bawah).
 *
 * Catatan: deskripsi sengaja tidak memuat harga, jam buka, atau angka yang
 * mudah berubah, karena data tersebut masih dummy dan harus diisi per tempat.
 */
const DESKRIPSI_WISATA = {
  "penanjakan-bromo": [
    "Penanjakan Bromo, atau yang dikenal sebagai Penanjakan 1, adalah salah satu titik pandang paling terkenal untuk menikmati matahari terbit di kawasan Taman Nasional Bromo Tengger Semeru. Dari ketinggian lebih dari 2.700 meter di atas permukaan laut, pengunjung dapat melihat hamparan lautan kabut dengan Gunung Bromo, Batok, dan Semeru yang menjulang di kejauhan.",
    "Karena udara di kawasan ini sangat dingin, terutama menjelang subuh, pengunjung disarankan membawa jaket tebal, sarung tangan, dan penutup kepala. Datanglah lebih awal agar mendapat posisi terbaik untuk menyaksikan cahaya pertama muncul, dan periksa kondisi cuaca serta aturan kunjungan terbaru sebelum berangkat.",
    "Penanjakan umumnya dicapai melalui jalur Wonokitri dan Tosari, dan banyak wisatawan melanjutkan perjalanan ke kawah Bromo serta lautan pasir setelah matahari terbit. Karena berada di dalam kawasan taman nasional, ikuti aturan yang berlaku, jaga kebersihan, dan jangan membawa pulang tumbuhan maupun batuan."
  ],
  "bukit-cinta-bromo": [
    "Bukit Cinta merupakan titik pandang di kawasan Bromo Tengger Semeru yang berada di wilayah Wonokitri, Tosari. Dari sini pengunjung dapat menikmati panorama matahari terbit dengan latar lanskap pegunungan dan hamparan kabut tipis yang menyelimuti lembah di bawahnya.",
    "Lokasinya yang relatif mudah dijangkau menjadikan Bukit Cinta pilihan bagi wisatawan yang ingin merasakan suasana pagi di Bromo tanpa harus mendaki terlalu jauh. Bawalah pakaian hangat dan berangkatlah sebelum fajar agar tidak ketinggalan momen terbaik.",
    "Bukit Cinta kerap dikunjungi bersamaan dengan Penanjakan karena letaknya yang berdekatan di kawasan yang sama. Setelah menikmati fajar, pengunjung dapat melanjutkan perjalanan ke Taman Edelweiss atau desa-desa Tengger di sekitarnya sambil menghangatkan diri dengan minuman hangat."
  ],
  "taman-edelweiss-wonokitri": [
    "Taman Edelweiss di Desa Wonokitri adalah kebun bunga edelweiss yang dikelola masyarakat Tengger. Bunga yang dikenal sebagai bunga abadi ini tumbuh di dataran tinggi dan menjadi bagian penting dari budaya serta upacara adat suku Tengger.",
    "Selain melihat hamparan bunga yang cantik untuk berfoto, pengunjung dapat mengenal lebih dekat kehidupan desa wisata di lereng Bromo. Tempat ini cocok dikunjungi sambil menuju atau pulang dari kawasan Penanjakan dan Bukit Cinta.",
    "Edelweiss adalah tanaman yang dihormati dan dijaga di kawasan Tengger, sehingga sebaiknya cukup dinikmati dan difoto tanpa dipetik, kecuali diizinkan oleh pengelola. Dengan begitu, bunga ini tetap lestari dan dapat dinikmati oleh wisatawan berikutnya."
  ],
  "coban-binangun": [
    "Air Terjun Coban Binangun berada di wilayah Pandaan dan menawarkan suasana sejuk dengan aliran air yang jatuh di tengah rimbun pepohonan. Tempat ini cocok sebagai pelarian singkat dari hiruk pikuk kota bagi pencinta wisata alam.",
    "Untuk menuju air terjun, pengunjung biasanya perlu berjalan kaki melewati jalur alami yang bisa licin saat musim hujan. Gunakan alas kaki yang nyaman, perhatikan kondisi cuaca, dan jaga kebersihan agar keindahan alamnya tetap terjaga.",
    "Lokasinya di Pandaan membuatnya mudah digabung dengan destinasi lain di sekitar Pandaan dan Prigen dalam satu hari. Waktu terbaik untuk datang adalah pagi hari pada musim kemarau, ketika jalur lebih aman dan suasana lebih nyaman."
  ],
  "coban-segraya": [
    "Air Terjun Coban Segraya terletak di Desa Sukoreno, Kecamatan Prigen, di kaki Gunung Arjuno–Welirang. Udara pegunungan yang sejuk dan gemericik air yang jatuh dari tebing membuat tempat ini terasa tenang dan menyegarkan.",
    "Kawasan sekitar air terjun dikelilingi pepohonan sehingga cocok untuk menikmati alam, berfoto, atau sekadar beristirahat. Karena jalurnya alami, disarankan datang saat cuaca cerah dan berhati-hati pada batuan yang basah.",
    "Kawasan Prigen memiliki beberapa air terjun yang berdekatan, sehingga Coban Segraya dapat menjadi bagian dari rute wisata alam sehari penuh. Bawalah bekal secukupnya beserta kantong sampah pribadi, dan jangan meninggalkan sampah di sepanjang jalur."
  ],
  "coban-centong": [
    "Coban Centong adalah air terjun di kawasan lereng Welirang, Desa Lumbangrejo, Prigen. Aliran airnya yang jernih dan lingkungan hutan di sekelilingnya menghadirkan nuansa alam yang asri bagi pengunjung yang mencari ketenangan.",
    "Lokasinya berdekatan dengan sejumlah tempat wisata di kawasan Prigen sehingga dapat dikombinasikan dengan destinasi lain dalam satu perjalanan. Sebaiknya datang pada pagi atau siang hari dan hindari berkunjung ketika hujan deras karena debit air bisa meningkat.",
    "Bagi yang gemar berjalan kaki, perjalanan menuju lokasi dapat menjadi bagian dari petualangan tersendiri. Siapkan stamina, air minum, dan pakaian ganti, terutama jika berencana bermain di sekitar aliran air."
  ],
  "coban-waru": [
    "Coban Waru adalah air terjun yang berada di Desa Kayukebek, Kecamatan Tutur, di wilayah pegunungan Pasuruan selatan. Kesejukan udara dan pemandangan perbukitan di sekitarnya membuat tempat ini menarik bagi pencinta alam.",
    "Perjalanan menuju lokasi melewati kawasan perdesaan dataran tinggi yang asri. Persiapkan kendaraan dan perlengkapan yang sesuai, serta bawa jas hujan karena cuaca di pegunungan dapat berubah dengan cepat.",
    "Kecamatan Tutur dikenal dengan udara sejuk dan lahan pertaniannya, sehingga perjalanan menuju Coban Waru juga menyuguhkan pemandangan khas dataran tinggi. Sebaiknya berangkat pada pagi hari agar punya waktu cukup dan sudah kembali sebelum sore, saat kabut dan hujan lebih sering turun."
  ],
  "coban-ndalung": [
    "Air Terjun Coban Ndalung berada di Desa Cowek, Kecamatan Purwodadi. Air terjun ini menawarkan suasana alami dengan aliran air yang jatuh di antara tebing dan pepohonan, cocok untuk melepas penat di akhir pekan.",
    "Pengunjung dapat menikmati keindahan air terjun sambil bersantai di area sekitarnya. Gunakan alas kaki yang tidak licin dan selalu patuhi arahan pengelola demi keselamatan selama berkunjung.",
    "Karena berada di Purwodadi, tempat ini dapat digabungkan dengan kunjungan ke Kebun Raya Purwodadi atau Taman Wisata Alam Gunung Baung yang letaknya tidak jauh. Dengan begitu, satu perjalanan dapat mencakup beberapa destinasi alam sekaligus."
  ],
  "air-terjun-putuk-truno": [
    "Air Terjun Putuk Truno berada di kawasan Prigen, di lereng Gunung Welirang yang berhawa sejuk. Tempat ini dikenal sebagai destinasi alam yang tenang dengan suara air dan rimbunnya hutan di sekitarnya.",
    "Putuk Truno dapat dikunjungi bersama destinasi lain di kawasan Tretes dan Prigen. Pastikan membawa perlengkapan yang sesuai untuk berjalan di jalur alami, serta jaga kebersihan lingkungan selama berada di lokasi.",
    "Kawasan Prigen menawarkan banyak pilihan penginapan dan tempat makan sehingga nyaman dijadikan basis perjalanan. Jika menginginkan suasana yang lebih tenang, datanglah pada hari kerja dan hindari musim libur panjang."
  ],
  "air-terjun-kakek-bodo": [
    "Air Terjun Kakek Bodo adalah salah satu air terjun populer di kawasan Prigen, tidak jauh dari Tretes. Aliran airnya yang jatuh di tengah hutan membuat suasananya sejuk dan menyegarkan, terutama pada pagi hingga siang hari.",
    "Karena berada di kawasan wisata yang ramai, tempat ini mudah dijangkau dan mudah dipadukan dengan destinasi lain di sekitarnya. Berhati-hatilah pada bebatuan yang licin dan hindari berkunjung saat cuaca ekstrem.",
    "Banyak pengunjung menggabungkannya dengan kunjungan ke area Tretes, seperti hutan pinus dan tempat makan di sekitarnya. Kenakan pakaian yang nyaman dan siapkan jas hujan, karena cuaca di lereng gunung bisa berubah sewaktu-waktu."
  ],
  "tretes-wisata-alam": [
    "Tretes adalah kawasan wisata pegunungan di Prigen yang sudah lama dikenal sebagai tempat peristirahatan dengan udara sejuk di lereng Gunung Welirang. Kawasan ini menawarkan beragam pengalaman, mulai dari menikmati pemandangan, jalan santai, hingga berwisata alam.",
    "Letaknya yang strategis dan dekat dengan banyak destinasi, seperti air terjun, hutan pinus, dan taman rekreasi, menjadikan Tretes cocok sebagai pangkalan perjalanan. Tersedia pula banyak pilihan penginapan dan tempat makan di sekitarnya.",
    "Pengunjung dapat menyesuaikan rencana perjalanan dengan minat masing-masing, mulai dari wisata air terjun, hutan pinus, hingga taman rekreasi keluarga. Karena akhir pekan dan musim liburan cenderung padat, berangkatlah lebih pagi untuk menghindari kemacetan menuju kawasan."
  ],
  "hutan-pinus-sumber-wekas": [
    "Hutan Pinus Sumber Wekas adalah area wisata hutan pinus di Desa Lumbangrejo, Prigen. Barisan pohon pinus yang menjulang menghadirkan suasana teduh dan udara segar, sehingga nyaman untuk bersantai maupun berfoto.",
    "Tempat ini juga sering dimanfaatkan untuk berkemah dan kegiatan di alam terbuka bersama keluarga atau teman. Jika berencana bermalam, siapkan perlengkapan yang memadai karena suhu malam hari di kawasan ini cukup dingin.",
    "Jika berencana berkemah, pilih area yang diizinkan pengelola dan bawa kembali semua sampah. Pagi hari biasanya menjadi waktu paling nyaman untuk menikmati udara segar dan cahaya matahari yang menembus sela-sela pepohonan."
  ],
  "the-pinus-prigen": [
    "The Pinus Prigen merupakan destinasi bernuansa hutan pinus di Desa Lumbangrejo, Prigen. Suasana teduh di antara pepohonan pinus menjadikannya tempat yang nyaman untuk menikmati alam sambil bersantai.",
    "Area ini cocok untuk berfoto, berkemah, atau sekadar melepas penat bersama keluarga dan teman. Karena berada di dataran tinggi, siapkan pakaian hangat terutama jika berkunjung pada sore hingga malam hari.",
    "Lokasinya berdekatan dengan sejumlah destinasi lain di Desa Lumbangrejo sehingga mudah dipadukan dalam satu rute. Bawalah alas duduk atau tikar jika ingin bersantai lebih lama di bawah rindangnya pepohonan pinus."
  ],
  "twa-gunung-baung": [
    "Taman Wisata Alam Gunung Baung berada di Kecamatan Purwosari dan merupakan kawasan konservasi dengan hutan yang masih terjaga. Tempat ini menawarkan suasana alam yang tenang serta kesempatan untuk mengenal kekayaan flora dan fauna setempat.",
    "Sebagai kawasan konservasi, pengunjung diharapkan menjaga kebersihan dan tidak merusak lingkungan. Sebaiknya periksa kondisi akses dan aturan kunjungan terlebih dahulu sebelum berangkat.",
    "Kawasan Purwosari memiliki beberapa tempat wisata alam yang berdekatan, seperti Kebun Raya Purwodadi, sehingga dapat dijadikan satu rute perjalanan. Pastikan membawa perbekalan yang cukup dan ikuti petunjuk petugas selama berada di kawasan konservasi."
  ],
  "ranu-grati": [
    "Danau Ranu Grati adalah danau alami di Kecamatan Grati yang berada di dataran rendah dengan pemandangan perbukitan di sekelilingnya. Hamparan air yang tenang menjadikannya tempat yang nyaman untuk bersantai bersama keluarga.",
    "Di sekitar danau, pengunjung dapat menikmati suasana tepi air, berfoto, atau mencoba aktivitas wisata air yang tersedia. Berkunjunglah pada pagi atau sore hari agar suasana lebih sejuk dan pemandangannya lebih indah.",
    "Pengunjung dapat memadukan kunjungan ke danau dengan wisata lain di Grati dan sekitarnya, seperti Kedawung Agro Selfie. Jika ingin mencoba aktivitas di atas air, perhatikan keselamatan dan gunakan pelampung sesuai ketentuan pengelola."
  ],
  "pantai-lekok": [
    "Pantai Lekok berada di Kecamatan Lekok, di pesisir utara Pasuruan yang menghadap Selat Madura. Pantai ini menyuguhkan suasana khas pesisir dengan hamparan laut, angin yang berembus, dan aktivitas nelayan setempat.",
    "Pengunjung dapat menikmati pemandangan laut, terutama pada sore hari ketika langit mulai berwarna jingga. Perhatikan kondisi ombak dan arahan warga setempat jika ingin bermain di area pantai.",
    "Pantai di pesisir utara umumnya paling nyaman dikunjungi pada sore hari ketika terik matahari mulai berkurang. Bawalah topi, tabir surya, dan air minum, serta jaga kebersihan pantai dengan membuang sampah pada tempatnya."
  ],
  "mangrove-nguling": [
    "Mangrove Tour Nguling adalah wisata hutan bakau di wilayah pesisir Kecamatan Nguling. Pengunjung dapat menyusuri kawasan mangrove dan mengenal fungsi penting ekosistem ini sebagai pelindung pantai sekaligus habitat berbagai biota.",
    "Wisata ini cocok untuk keluarga maupun pelajar yang ingin belajar tentang pelestarian lingkungan pesisir. Kenakan pakaian dan alas kaki yang sesuai, serta jangan meninggalkan sampah di area mangrove.",
    "Waktu kunjungan sebaiknya disesuaikan dengan kondisi pasang surut agar penelusuran kawasan lebih nyaman, jadi tanyakan informasi terbaru kepada pengelola. Dengan ikut menjaga kebersihan, pengunjung turut membantu kelestarian ekosistem mangrove."
  ],
  "mangrove-kota-pasuruan": [
    "Hutan Mangrove Kota Pasuruan berada di kawasan pesisir Kecamatan Panggungrejo. Area ini menjadi ruang hijau di tepi pantai yang berperan menjaga garis pantai sekaligus menjadi tempat rekreasi dan edukasi lingkungan.",
    "Pengunjung dapat berjalan santai menikmati suasana hutan bakau, mengamati tumbuhan dan satwa pesisir, serta belajar tentang pentingnya konservasi. Lokasinya yang dekat dengan pusat kota memudahkan untuk dikunjungi di sela waktu luang.",
    "Tempat ini cocok dipadukan dengan wisata kota lainnya, seperti alun-alun dan kawasan kota lama Pasuruan. Datanglah pada pagi atau sore hari untuk merasakan suasana yang lebih teduh dan nyaman."
  ],
  "banyu-biru": [
    "Pemandian Alam Banyu Biru di Kecamatan Winongan adalah pemandian yang bersumber dari mata air alami. Air yang jernih berwarna kebiruan menjadi daya tarik utama sekaligus memberi kesegaran bagi pengunjung yang ingin berenang atau berendam.",
    "Tempat ini cocok untuk rekreasi keluarga karena suasananya teduh dan nyaman. Kunjungi pada hari biasa jika ingin suasana yang lebih tenang, dan perhatikan aturan keselamatan di area kolam.",
    "Banyu Biru dapat dinikmati sebagai tempat berenang sekaligus bersantai bersama keluarga. Bawalah pakaian ganti dan handuk, serta awasi anak-anak saat berada di area kolam dan sumber air."
  ],
  "kebun-raya-purwodadi": [
    "Kebun Raya Purwodadi adalah kebun botani yang berada di Kecamatan Purwosari dan terkenal dengan koleksi tanaman dari kawasan beriklim kering dataran rendah. Kawasan ini berfungsi sebagai tempat konservasi, penelitian, pendidikan, sekaligus rekreasi.",
    "Pengunjung dapat berjalan santai menyusuri taman, mengamati beragam koleksi tumbuhan, dan menikmati suasana yang asri. Tempat ini cocok untuk wisata edukasi bagi pelajar maupun keluarga yang ingin belajar tentang keanekaragaman hayati.",
    "Karena areanya luas, kenakan alas kaki yang nyaman dan bawa air minum untuk berjalan santai. Kunjungan akan lebih menyenangkan jika dilakukan pada pagi atau sore hari ketika udara tidak terlalu panas."
  ],
  "taman-safari-prigen": [
    "Taman Safari Indonesia II Prigen adalah taman safari di kaki Gunung Arjuno–Welirang yang menyatukan konservasi satwa dengan wisata keluarga. Pengunjung dapat melihat beragam satwa dari dekat, baik dari dalam kendaraan maupun di area yang bisa dijelajahi dengan berjalan kaki.",
    "Selain melihat satwa, tersedia berbagai atraksi dan wahana yang cocok untuk anak-anak. Karena areanya luas, sediakan waktu setengah hingga satu hari penuh agar kunjungan lebih nyaman dan tidak terburu-buru.",
    "Lokasinya berada di kaki pegunungan sehingga udaranya relatif sejuk, namun cuaca dapat berubah sewaktu-waktu sehingga membawa jas hujan akan sangat membantu. Patuhi aturan keselamatan satwa, misalnya tidak memberi makan atau mengganggu hewan di luar ketentuan pengelola."
  ],
  "cimory-dairyland-prigen": [
    "Dairyland Farm Theme Park Prigen adalah taman tema bergaya peternakan yang berada di kawasan Prigen. Pengunjung dapat melihat hewan ternak, bermain di area rekreasi, dan menikmati suasana pegunungan yang sejuk.",
    "Tempat ini ramah untuk anak-anak sehingga cocok sebagai tujuan liburan keluarga. Pengunjung juga bisa mencicipi aneka produk olahan susu dan kuliner di area sekitarnya.",
    "Kunjungan biasanya paling ramai pada akhir pekan dan musim liburan, sehingga datang lebih pagi dapat membantu menghindari keramaian. Bawalah pakaian hangat yang tipis karena kawasan Prigen berudara sejuk."
  ],
  "tanaria-park": [
    "Tanaria Park adalah taman tema di Desa Lumbangrejo, Prigen, dengan nuansa pegunungan yang sejuk. Area ini dirancang sebagai tempat rekreasi keluarga dengan beragam spot foto dan wahana yang menarik.",
    "Pengunjung dapat menghabiskan waktu bermain sekaligus bersantai bersama anak-anak dan orang tua. Datang pada hari kerja biasanya lebih lengang, sedangkan akhir pekan dan musim liburan cenderung lebih ramai.",
    "Pertimbangkan membawa topi, jaket tipis, dan sepatu yang nyaman untuk bermain seharian. Padukan dengan destinasi lain di Prigen agar liburan keluarga terasa lebih lengkap."
  ],
  "lembah-pendawa": [
    "Lembah Pendawa Bali van Java adalah taman rekreasi di Pandaan yang mengusung nuansa pulau Bali. Pengunjung dapat menikmati suasana taman bernuansa Bali dan berbagai fasilitas rekreasi untuk keluarga.",
    "Tempat ini cocok bagi yang ingin berlibur santai dengan suasana berbeda tanpa harus pergi jauh. Sebaiknya cek kembali informasi wahana dan jam operasional sebelum berkunjung.",
    "Berada di Pandaan, tempat ini dapat digabungkan dengan Taman K, Ranting Sewu Park, dan Taman Dayu yang berada di kawasan Durensewu. Dengan begitu, satu hari liburan keluarga dapat mencakup beberapa tujuan sekaligus."
  ],
  "taman-k-pandaan": [
    "Taman K adalah taman rekreasi di Kecamatan Pandaan yang dirancang sebagai tempat bersantai dan berkumpul bersama keluarga. Suasana tamannya yang tertata menjadikannya pilihan yang nyaman untuk menghabiskan waktu luang.",
    "Pengunjung dapat menikmati area terbuka, berfoto, dan bermain bersama anak-anak. Lokasinya yang berdekatan dengan destinasi lain di Pandaan memudahkan untuk digabungkan dalam satu rute perjalanan.",
    "Anak-anak dapat bermain sementara orang tua bersantai, sehingga tempat ini cocok untuk perjalanan keluarga dengan berbagai usia. Karena berdekatan dengan banyak destinasi lain, kamu dapat menyusun rute satu hari penuh di Pandaan."
  ],
  "ranting-sewu-park": [
    "Ranting Sewu Park adalah destinasi wisata edukasi di Kecamatan Pandaan. Tempat ini menggabungkan unsur bermain dan belajar sehingga anak-anak dapat mengenal alam dengan cara yang menyenangkan.",
    "Suasana tamannya yang hijau menjadikannya nyaman untuk dikunjungi bersama keluarga maupun rombongan sekolah. Jika berencana datang berombongan, sebaiknya hubungi pengelola terlebih dahulu untuk memastikan ketersediaan kegiatan.",
    "Kegiatan edukasi di sini dapat menjadi alternatif liburan yang bermanfaat bagi anak-anak. Hubungi pengelola lebih dulu jika ingin mengikuti kegiatan tertentu, karena program dan kapasitasnya dapat berbeda dari waktu ke waktu."
  ],
  "telogo-sewu": [
    "Telogo Sewu Outbound & Kolam Renang di Pandaan menyediakan kegiatan outbound dan fasilitas kolam renang dalam satu lokasi. Tempat ini cocok untuk kegiatan keluarga, komunitas, maupun rombongan sekolah.",
    "Pengunjung dapat bermain air, mengikuti permainan luar ruang, dan menikmati suasana yang segar. Bawalah pakaian ganti serta ikuti aturan keselamatan, terutama saat anak-anak berada di area kolam.",
    "Kegiatan outbound biasanya lebih nyaman dilakukan pada pagi hari ketika udara belum terlalu panas. Bawalah pakaian olahraga dan perlengkapan renang, serta ikuti arahan pemandu demi keselamatan seluruh peserta."
  ],
  "taman-dayu": [
    "The Taman Dayu adalah kawasan taman dan kuliner di Pandaan yang menawarkan suasana hijau dan tertata. Kawasan ini menjadi tempat favorit untuk bersantai, berjalan-jalan, dan menikmati beragam pilihan makanan.",
    "Suasananya yang nyaman membuat Taman Dayu cocok untuk berkumpul bersama keluarga atau teman. Pengunjung juga dapat memadukan kunjungan dengan destinasi lain di sekitar Pandaan dan Prigen.",
    "Kawasan ini sering dipilih sebagai tempat singgah untuk makan dan bersantai setelah mengunjungi destinasi lain di Pandaan dan Prigen. Datang pada sore hari menghadirkan suasana yang lebih teduh, sedangkan akhir pekan cenderung lebih ramai."
  ],
  "splash-waterpark": [
    "The Splash Waterpark adalah taman air di kawasan Taman Dayu, Kecamatan Prigen. Tersedia berbagai wahana air yang dapat dinikmati oleh anak-anak maupun orang dewasa, mulai dari seluncuran hingga kolam untuk bersantai.",
    "Tempat ini cocok untuk liburan keluarga yang ingin bermain air seharian. Bawalah pakaian renang, perlengkapan ganti, dan tabir surya, serta patuhi aturan keselamatan di setiap wahana.",
    "Sebelum bermain, pastikan memahami batas usia dan tinggi badan untuk setiap wahana. Gunakan pakaian renang yang sesuai aturan dan simpan barang berharga di tempat yang aman."
  ],
  "saygon-waterpark": [
    "Saygon Waterpark merupakan taman air di Kecamatan Purwosari yang menawarkan beragam wahana bermain air. Tempat ini menjadi pilihan rekreasi bagi keluarga yang ingin bersenang-senang dan menyegarkan diri.",
    "Pengunjung dapat bermain di kolam, mencoba wahana, dan bersantai di area sekitarnya. Datanglah lebih pagi agar punya waktu bermain lebih lama dan terhindar dari antrean pada jam ramai.",
    "Lokasinya di Purwosari memudahkan pengunjung menggabungkannya dengan wisata lain di sekitar kecamatan ini. Bagi keluarga dengan anak kecil, pilih wahana yang sesuai usia dan selalu dampingi mereka selama bermain."
  ],
  "bhakti-alam": [
    "Agrowisata Bhakti Alam berada di Kecamatan Tutur, kawasan dataran tinggi yang terkenal dengan pertanian dan peternakan. Tempat ini mengajak pengunjung mengenal dunia agrowisata sambil menikmati udara yang sejuk.",
    "Selain bersantai, pengunjung dapat belajar tentang aktivitas pertanian dan melihat suasana khas perdesaan lereng pegunungan. Cocok untuk wisata keluarga maupun kegiatan edukasi bagi anak-anak.",
    "Datanglah dengan pakaian yang nyaman untuk beraktivitas di kebun dan alam terbuka. Udara dataran tinggi cukup sejuk, jadi bawa jaket, terutama jika berkunjung pada pagi atau sore hari."
  ],
  "bukit-flora": [
    "Wisata Bukit Flora di Kecamatan Tutur menggabungkan unsur wisata edukasi dan kegiatan outbound di tengah udara pegunungan yang sejuk. Suasana asri dan pemandangan alam sekitarnya menjadikan tempat ini nyaman untuk beraktivitas.",
    "Tempat ini cocok untuk keluarga, komunitas, maupun rombongan sekolah yang ingin belajar sambil bermain. Bawalah pakaian hangat dan perlengkapan yang sesuai untuk kegiatan di luar ruangan.",
    "Program dan fasilitas kegiatan dapat berbeda-beda, sehingga disarankan menghubungi pengelola jika berencana datang berkelompok. Siapkan juga perlengkapan pribadi seperti jas hujan dan alas kaki yang nyaman."
  ],
  "dam-pleret-1904": [
    "Dam Pleret 1904 adalah bangunan bendungan peninggalan masa kolonial di Kecamatan Pohjentrek, Desa Pleret, yang hingga kini masih berperan dalam pengairan. Tempat ini menjadi desa wisata yang memadukan nilai sejarah, edukasi, dan keindahan alam.",
    "Pengunjung dapat melihat langsung bangunan bendungan, menikmati pemandangan aliran air, dan belajar tentang sejarah pengelolaan air di Pasuruan. Cocok untuk wisata edukasi bagi anak-anak maupun pecinta sejarah.",
    "Kunjungan ke tempat ini dapat memberi gambaran tentang bagaimana sistem irigasi menopang pertanian di Pasuruan sejak lama. Hargai bangunan bersejarah ini dengan tidak mencoret atau merusak bagiannya, dan patuhi rambu keselamatan di sekitar aliran air."
  ],
  "kedawung-agro-selfie": [
    "Kedawung Agro Selfie (KAS) adalah destinasi agrowisata di Kecamatan Grati yang menawarkan taman dan spot foto di tengah suasana perdesaan. Hamparan tanaman dan dekorasi kreatif menjadi daya tarik bagi pengunjung yang gemar berfoto.",
    "Tempat ini cocok untuk dikunjungi bersama keluarga atau teman sambil menikmati udara terbuka. Datanglah pada pagi atau sore hari agar cahaya lebih bagus untuk berfoto dan suhu tidak terlalu panas.",
    "Hamparan taman dan spot foto di sini menarik dinikmati bersama keluarga, dan tempat ini dapat dipadukan dengan kunjungan ke Danau Ranu Grati. Karena berada di area terbuka, bawalah topi dan air minum serta jaga kebersihan agar taman tetap asri."
  ],
  "taman-kota-pasuruan": [
    "Taman Kota Pasuruan adalah ruang terbuka hijau di pusat Kota Pasuruan yang dapat dinikmati oleh masyarakat dari berbagai kalangan. Tempat ini menjadi lokasi favorit warga untuk bersantai, berolahraga ringan, dan bermain bersama anak-anak.",
    "Lokasinya yang berada di tengah kota membuatnya mudah dijangkau dan cocok untuk disinggahi sambil menjelajahi tempat wisata lain di Kota Pasuruan. Jagalah kebersihan dan fasilitas taman agar tetap nyaman bagi semua pengunjung.",
    "Warga sering memanfaatkannya untuk berolahraga ringan atau berkumpul, terutama di pagi dan sore hari. Tempat ini juga mudah dipadukan dengan Alun-Alun dan Societeit Harmonie yang berada di pusat kota."
  ],
  "alun-alun-pasuruan": [
    "Alun-Alun Pasuruan merupakan ruang publik utama di jantung Kota Pasuruan dan dikenal dengan payung-payung besar yang terinspirasi dari Masjid Nabawi di Madinah, sehingga disebut Payung Madinah. Tempat ini ramai pada sore dan malam hari ketika warga berkumpul dan bersantai.",
    "Letaknya bersebelahan dengan Masjid Agung Al-Anwar sehingga sering menjadi titik awal wisata religi dan wisata kota. Pengunjung dapat menikmati suasana, berfoto, serta mencicipi jajanan yang ada di sekitarnya.",
    "Dari alun-alun, pengunjung dapat berjalan kaki menuju Masjid Agung Al-Anwar dan area sekitarnya. Malam hari biasanya lebih ramai dengan pedagang dan warga yang berkumpul, jadi jaga barang bawaan dan kebersihan lingkungan."
  ],
  "masjid-cheng-hoo-pandaan": [
    "Masjid Muhammad Cheng Hoo Pandaan menonjol dengan arsitektur bernuansa Tionghoa yang dipadukan dengan fungsi masjid. Namanya diambil dari Laksamana Cheng Ho, tokoh pelaut Tiongkok beragama Islam yang dikenal dalam sejarah hubungan Nusantara dan Tiongkok.",
    "Selain menjadi tempat ibadah, masjid ini menarik dikunjungi karena bentuk bangunannya yang unik dan warna-warnanya yang khas. Pengunjung diharapkan menjaga adab, berpakaian sopan, dan menghormati jamaah yang sedang beribadah.",
    "Masjid ini juga dikenal sebagai simbol keberagaman dan toleransi karena memadukan unsur budaya Tionghoa dengan nilai-nilai Islam. Sesuaikan waktu kunjungan dengan jadwal salat agar tidak mengganggu jamaah yang sedang beribadah."
  ],
  "masjid-agung-al-anwar": [
    "Masjid Agung Al-Anwar adalah masjid utama di Kota Pasuruan yang berdiri di kawasan pusat kota. Masjid ini menjadi pusat kegiatan keagamaan dan salah satu ikon kota, terutama bagi para peziarah yang mengunjungi wisata religi di Pasuruan.",
    "Lokasinya yang dekat dengan alun-alun dan makam ulama menjadikannya titik awal yang strategis untuk menjelajahi wisata religi. Pengunjung dimohon mengenakan pakaian yang sopan dan menjaga ketenangan selama berada di area masjid.",
    "Karena letaknya di pusat kota, masjid ini mudah dijangkau dan sering menjadi titik awal rangkaian ziarah. Pengunjung yang ingin berfoto sebaiknya meminta izin dan tidak mengganggu kegiatan ibadah."
  ],
  "makam-kh-abdul-hamid": [
    "Makam KH. Abdul Hamid, yang akrab disapa Mbah Hamid, adalah salah satu makam ulama yang paling banyak dikunjungi peziarah di Kota Pasuruan. Beliau dikenal luas sebagai ulama yang dihormati masyarakat, dan makamnya menjadi tujuan utama wisata religi.",
    "Peziarah datang dari berbagai daerah untuk berdoa dan mengenang keteladanan beliau. Saat berkunjung, jagalah adab, berpakaian sopan, dan ikuti tata tertib yang berlaku di area makam.",
    "Area sekitar makam dapat sangat ramai pada waktu-waktu tertentu, terutama saat musim liburan. Datanglah dengan sabar, ikuti arahan pengurus, dan jaga barang bawaan selama berada di lokasi."
  ],
  "makam-mbah-slagah": [
    "Makam Mbah Slagah berada di Kelurahan Pekuncen, Kota Pasuruan, dan menjadi salah satu tujuan ziarah warga setempat maupun pengunjung dari luar daerah. Tempat ini dihormati masyarakat sebagai makam tokoh yang dikenal dalam sejarah lokal.",
    "Peziarah biasanya datang untuk berdoa dan mengikuti rangkaian wisata religi di Kota Pasuruan. Jagalah ketenangan, berpakaian sopan, dan hormati tata cara yang berlaku di lokasi.",
    "Lokasi ini dapat dikunjungi sebagai bagian dari rangkaian ziarah di Kota Pasuruan bersama makam dan masjid lain di pusat kota. Sebaiknya tanyakan kepada warga atau pengurus setempat mengenai adab dan waktu kunjungan yang disarankan."
  ],
  "makam-mbah-semendi": [
    "Makam Mbah Sholeh Semendi berada di Desa Bandaran, Kecamatan Winongan. Tempat ini dihormati masyarakat sebagai makam tokoh agama dan menjadi tujuan ziarah bagi warga sekitar maupun peziarah dari luar daerah.",
    "Pengunjung dapat berdoa dan mengenang jasa tokoh yang dimakamkan di sini dalam suasana yang tenang. Selama berada di lokasi, jagalah adab dan kebersihan serta ikuti arahan pengurus makam.",
    "Kecamatan Winongan juga memiliki Pemandian Alam Banyu Biru yang dapat dikunjungi dalam satu perjalanan. Selama berziarah, hormati peziarah lain dan ikuti tata tertib yang ditetapkan pengurus makam."
  ],
  "makam-mbah-syakaruddin": [
    "Makam Mbah Syakaruddin berada di Desa Keboncandi, Kecamatan Gondangwetan. Makam ini dihormati masyarakat dan sering dikunjungi peziarah yang ingin berdoa serta mengenang tokoh yang dimakamkan di sini.",
    "Suasana tempat ini tenang sehingga nyaman untuk berdoa dengan khusyuk. Datanglah dengan pakaian yang sopan, jaga ketertiban, dan hormati peziarah lain yang sedang berada di lokasi.",
    "Peziarah dianjurkan datang pada waktu yang tidak terlalu ramai agar dapat berdoa dengan lebih tenang. Bawalah perlengkapan ibadah pribadi serta jaga kebersihan makam dan lingkungan sekitarnya."
  ],
  "makam-mbah-sayyid-arif-segoropuro": [
    "Makam Mbah Sayyid Arif Segoropuro berada di Desa Segoropuro, Kecamatan Rejoso. Tempat ini menjadi tujuan ziarah bagi masyarakat yang menghormati tokoh yang dimakamkan di sana dan ingin berdoa di lokasi tersebut.",
    "Peziarah datang untuk berdoa dan mengenang jasa beliau dalam suasana yang tenang dan khidmat. Selama berkunjung, ikuti tata tertib setempat dan jaga kebersihan serta kesopanan di area makam.",
    "Perjalanan ke Segoropuro dapat dikombinasikan dengan kunjungan ke Pantai Lekok yang berada di kecamatan terdekat. Dengan begitu, wisata religi dan wisata pesisir dapat dinikmati dalam satu rute perjalanan."
  ],
  "klenteng-tjoe-tik-kiong": [
    "Klenteng Tjoe Tik Kiong adalah tempat ibadah umat Tionghoa di Kota Pasuruan yang menjadi bagian dari jejak keberagaman budaya kota ini. Arsitektur khas klenteng dengan warna merah dan ornamen tradisionalnya menjadikannya menarik untuk dikunjungi.",
    "Selain sebagai tempat ibadah, klenteng ini mencerminkan sejarah panjang komunitas Tionghoa di Pasuruan. Pengunjung dipersilakan melihat-lihat dengan tetap menjaga sopan santun dan menghormati umat yang sedang beribadah.",
    "Klenteng biasanya ramai dikunjungi umat pada perayaan tertentu, seperti Imlek, sehingga suasananya bisa sangat berbeda dari hari biasa. Pengunjung dapat bertanya dengan sopan kepada pengurus jika ingin memahami makna ornamen dan tata cara ibadah."
  ],
  "klenteng-tjoe-an-kiong-bangil": [
    "Klenteng Tjoe An Kiong adalah klenteng di Kecamatan Bangil yang menjadi pusat ibadah dan budaya komunitas Tionghoa setempat. Bangunannya yang khas dengan ornamen tradisional menunjukkan keberagaman budaya di Pasuruan.",
    "Pengunjung dapat melihat arsitektur klenteng sambil mengenal tradisi yang dijaga hingga kini. Saat berkunjung, jagalah ketenangan, berpakaian sopan, dan hormati kegiatan peribadatan yang sedang berlangsung.",
    "Keberadaan klenteng ini mencerminkan keragaman masyarakat di Bangil dan sekitarnya. Jika ingin mengambil foto, mintalah izin kepada pengurus dan hindari mengganggu umat yang sedang beribadah."
  ],
  "candi-jawi": [
    "Candi Jawi adalah candi peninggalan masa Kerajaan Singasari yang berada di Desa Candiwates, Prigen. Candi ini bercorak perpaduan Hindu dan Buddha serta dikenal dengan bentuknya yang ramping dan menjulang, berlatar pegunungan di sekitarnya.",
    "Halaman candi yang asri membuatnya nyaman untuk dikunjungi sambil belajar tentang sejarah Jawa Timur. Pengunjung diharapkan tidak memanjat atau merusak bagian candi agar peninggalan bersejarah ini tetap lestari.",
    "Candi Jawi terletak di kawasan yang mudah dipadukan dengan Taman Candra Wilwatikta, Masjid Cheng Hoo, dan destinasi lain di Pandaan dan Prigen. Datang pada pagi hari memberi cahaya yang baik untuk berfoto dan udara yang lebih nyaman."
  ],
  "candi-belahan": [
    "Candi Belahan, yang juga dikenal sebagai Sumber Tetek, adalah petirtaan atau pemandian kuno di Desa Wonosunyo, Gempol. Tempat ini dikaitkan dengan masa Kerajaan Medang dan Raja Airlangga, dengan arca-arca yang menjadi pancuran air.",
    "Aliran air yang jernih dari sumber alami berpadu dengan nuansa sejarah menjadikan tempat ini istimewa bagi pecinta sejarah dan budaya. Hormati nilai sakral dan sejarahnya dengan menjaga kebersihan serta tidak merusak benda cagar budaya.",
    "Karena merupakan situs bersejarah yang masih berhubungan dengan aliran air, hormati nilai situs dan ikuti arahan juru pelihara. Bacalah papan informasi di lokasi, jika tersedia, untuk memahami sejarah dan makna tempat ini."
  ],
  "candi-gunung-gangsir": [
    "Candi Gunung Gangsir adalah situs candi peninggalan masa lampau yang berada di Desa Gununggangsir, Kecamatan Beji. Keberadaannya menjadi bukti jejak peradaban Hindu–Buddha di wilayah Pasuruan.",
    "Pengunjung dapat melihat sisa-sisa bangunan kuno sambil menikmati suasana yang tenang. Tempat ini cocok bagi yang tertarik pada sejarah dan arkeologi, dengan tetap menjaga kelestarian situs.",
    "Karena situs ini tidak sepopuler candi lainnya, kunjungan biasanya terasa lebih tenang. Periksa akses dan kondisi lokasi terlebih dahulu, dan tanyakan kepada warga atau pengelola setempat jika membutuhkan panduan."
  ],
  "candi-keboireng": [
    "Candi Keboireng adalah situs peninggalan sejarah di Desa Ngerong, Kecamatan Gempol. Sisa bangunan kuno di sini menjadi bagian dari jejak peradaban masa lampau di wilayah Pasuruan.",
    "Tempat ini cocok bagi pengunjung yang ingin mengenal sejarah lokal dalam suasana yang tenang. Jagalah kebersihan dan jangan menyentuh atau memindahkan bagian situs agar warisan ini tetap terjaga.",
    "Lokasinya di Gempol dapat dikombinasikan dengan kunjungan ke Candi Belahan, Situs Raos Pacinan, atau Prasasti Pendirian Pasuruan. Dengan begitu, kamu dapat menyusun rute wisata sejarah yang lebih lengkap dalam satu hari."
  ],
  "situs-raos-pacinan": [
    "Situs Raos Pacinan adalah situs purbakala di Desa Carat, Kecamatan Gempol. Keberadaannya menjadi salah satu bukti jejak sejarah dan peradaban masa lampau di wilayah ini.",
    "Pengunjung dapat melihat peninggalan di situs ini dan belajar tentang sejarah lokal Pasuruan. Hormati lokasi sebagai benda cagar budaya dengan tidak merusak atau mengambil bagian situs.",
    "Bagi pecinta sejarah, mengunjungi beberapa situs di Gempol dalam satu hari dapat memberi gambaran yang lebih utuh tentang jejak masa lampau di Pasuruan. Periksa lokasi dan akses terlebih dahulu karena situs semacam ini tidak selalu mudah ditemukan."
  ],
  "candi-sepilar": [
    "Candi Sepilar berada di Desa Sumberrejo, Kecamatan Purwosari, dan dikenal sebagai situs candi yang berada di sekitar jalur pendakian Gunung Arjuno. Lokasinya yang berada di lereng gunung memberikan nuansa sejarah yang berpadu dengan alam.",
    "Tempat ini menarik bagi pendaki maupun pencinta sejarah yang ingin melihat peninggalan kuno di kawasan pegunungan. Karena aksesnya berada di jalur alam, persiapkan perlengkapan yang sesuai dan periksa kondisi jalur sebelum berkunjung.",
    "Jalur di sekitar kawasan ini bisa menanjak dan licin sehingga memerlukan kondisi fisik yang baik. Jika berencana mendaki lebih jauh, informasikan rencana perjalanan kepada orang lain dan ikuti aturan pendakian di Gunung Arjuno."
  ],
  "prasasti-pendirian-pasuruan": [
    "Prasasti Pendirian Pasuruan, atau De Inscriptie van de Oprichting van Pasoeroean, adalah monumen bersejarah yang berkaitan dengan sejarah berdirinya Pasuruan pada masa kolonial. Prasasti ini menjadi salah satu penanda penting perjalanan sejarah wilayah Pasuruan.",
    "Pengunjung dapat melihat langsung peninggalan ini dan belajar tentang sejarah kota. Tempat ini cocok bagi pecinta sejarah serta pelajar yang ingin mengenal akar sejarah Pasuruan.",
    "Karena berupa monumen, kunjungan biasanya singkat sehingga cocok dijadikan persinggahan dalam rute wisata sejarah di Gempol. Bacalah informasi yang tersedia di sekitarnya dan hindari menyentuh atau mencoret monumen."
  ],
  "societeit-harmonie": [
    "Societeit Harmonie adalah bangunan cagar budaya di Kota Pasuruan yang dahulu digunakan sebagai tempat berkumpul pada masa kolonial. Arsitekturnya mencerminkan gaya bangunan Eropa yang berkembang di kota-kota Hindia Belanda.",
    "Bangunan ini menjadi bagian dari wisata kota tua Pasuruan dan dapat dikunjungi sambil menjelajahi bangunan bersejarah di sekitarnya. Pengunjung diharapkan menjaga bangunan dan fasilitasnya sebagai warisan budaya.",
    "Kawasan kota lama di sekitarnya menyimpan beberapa bangunan tua yang menarik dijelajahi sambil berjalan kaki. Datanglah pada pagi atau sore hari agar suasana lebih nyaman dan cahaya lebih baik untuk berfoto."
  ],
  "taman-candra-wilwatikta": [
    "Taman Candra Wilwatikta adalah panggung seni budaya di Kecamatan Pandaan yang menjadi tempat pertunjukan seni tradisional khas Jawa Timur. Nama Wilwatikta merujuk pada nama lain Kerajaan Majapahit, sehingga nuansa budayanya terasa kuat.",
    "Panggung terbuka ini sering digunakan untuk pementasan seni dan acara kebudayaan. Pengunjung dapat menikmati pertunjukan atau sekadar melihat suasana tempatnya; periksa jadwal acara terlebih dahulu agar tidak ketinggalan pementasan.",
    "Sebagian pementasan diadakan pada jadwal tertentu, jadi periksa informasi acara sebelum berangkat. Datang lebih awal membantu pengunjung mendapat tempat terbaik dan menikmati suasana sebelum pertunjukan dimulai."
  ],
  "sedaeng-kampung-budaya-tengger": [
    "Sedaeng Kampung Budaya Tengger berada di Desa Sedaeng, Kecamatan Tosari, di kawasan dataran tinggi Tengger. Kampung ini menjaga adat, tradisi, dan kehidupan masyarakat Tengger yang dikenal erat dengan budaya Hindu dan alam pegunungan.",
    "Pengunjung dapat mengenal budaya, rumah adat, serta kehidupan sehari-hari masyarakat setempat. Hormati adat dan kebiasaan warga, berpakaian sopan, dan mintalah izin sebelum mengambil foto kegiatan atau upacara.",
    "Masyarakat Tengger menjalankan upacara adat sesuai kalender setempat, sehingga waktu kunjungan dapat memengaruhi pengalaman yang didapat. Bersikaplah sopan, kenakan pakaian hangat, dan ikuti arahan warga selama berada di kampung."
  ]
};


/* ---- Short description: 2 kalimat pertama dari paragraf 1 ---- */
const DESKRIPSI_SHORT = {
  "penanjakan-bromo": "Penanjakan Bromo, atau yang dikenal sebagai Penanjakan 1, adalah salah satu titik pandang paling terkenal untuk menikmati matahari terbit di kawasan Taman Nasional Bromo Tengger Semeru. Dari ketinggian lebih dari 2.700 meter di atas permukaan laut, pengunjung dapat melihat hamparan lautan kabut dengan Gunung Bromo, Batok, dan Semeru yang menjulang di kejauhan.",
  "bukit-cinta-bromo": "Bukit Cinta merupakan titik pandang di kawasan Bromo Tengger Semeru yang berada di wilayah Wonokitri, Tosari. Dari sini pengunjung dapat menikmati panorama matahari terbit dengan latar lanskap pegunungan dan hamparan kabut tipis yang menyelimuti lembah di bawahnya.",
  "taman-edelweiss-wonokitri": "Taman Edelweiss di Desa Wonokitri adalah kebun bunga edelweiss yang dikelola masyarakat Tengger. Bunga yang dikenal sebagai bunga abadi ini tumbuh di dataran tinggi dan menjadi bagian penting dari budaya serta upacara adat suku Tengger.",
  "coban-binangun": "Air Terjun Coban Binangun berada di wilayah Pandaan dan menawarkan suasana sejuk dengan aliran air yang jatuh di tengah rimbun pepohonan. Tempat ini cocok sebagai pelarian singkat dari hiruk pikuk kota bagi pencinta wisata alam.",
  "coban-segraya": "Air Terjun Coban Segraya terletak di Desa Sukoreno, Kecamatan Prigen, di kaki Gunung Arjuno–Welirang. Udara pegunungan yang sejuk dan gemericik air yang jatuh dari tebing membuat tempat ini terasa tenang dan menyegarkan.",
  "coban-centong": "Coban Centong adalah air terjun di kawasan lereng Welirang, Desa Lumbangrejo, Prigen. Aliran airnya yang jernih dan lingkungan hutan di sekelilingnya menghadirkan nuansa alam yang asri bagi pengunjung yang mencari ketenangan.",
  "coban-waru": "Coban Waru adalah air terjun yang berada di Desa Kayukebek, Kecamatan Tutur, di wilayah pegunungan Pasuruan selatan. Kesejukan udara dan pemandangan perbukitan di sekitarnya membuat tempat ini menarik bagi pencinta alam.",
  "coban-ndalung": "Air Terjun Coban Ndalung berada di Desa Cowek, Kecamatan Purwodadi. Air terjun ini menawarkan suasana alami dengan aliran air yang jatuh di antara tebing dan pepohonan, cocok untuk melepas penat di akhir pekan.",
  "air-terjun-putuk-truno": "Air Terjun Putuk Truno berada di kawasan Prigen, di lereng Gunung Welirang yang berhawa sejuk. Tempat ini dikenal sebagai destinasi alam yang tenang dengan suara air dan rimbunnya hutan di sekitarnya.",
  "air-terjun-kakek-bodo": "Air Terjun Kakek Bodo adalah salah satu air terjun populer di kawasan Prigen, tidak jauh dari Tretes. Aliran airnya yang jatuh di tengah hutan membuat suasananya sejuk dan menyegarkan, terutama pada pagi hingga siang hari.",
  "tretes-wisata-alam": "Tretes adalah kawasan wisata pegunungan di Prigen yang sudah lama dikenal sebagai tempat peristirahatan dengan udara sejuk di lereng Gunung Welirang. Kawasan ini menawarkan beragam pengalaman, mulai dari menikmati pemandangan, jalan santai, hingga berwisata alam.",
  "hutan-pinus-sumber-wekas": "Hutan Pinus Sumber Wekas adalah area wisata hutan pinus di Desa Lumbangrejo, Prigen. Barisan pohon pinus yang menjulang menghadirkan suasana teduh dan udara segar, sehingga nyaman untuk bersantai maupun berfoto.",
  "the-pinus-prigen": "The Pinus Prigen merupakan destinasi bernuansa hutan pinus di Desa Lumbangrejo, Prigen. Suasana teduh di antara pepohonan pinus menjadikannya tempat yang nyaman untuk menikmati alam sambil bersantai.",
  "twa-gunung-baung": "Taman Wisata Alam Gunung Baung berada di Kecamatan Purwosari dan merupakan kawasan konservasi dengan hutan yang masih terjaga. Tempat ini menawarkan suasana alam yang tenang serta kesempatan untuk mengenal kekayaan flora dan fauna setempat.",
  "ranu-grati": "Danau Ranu Grati adalah danau alami di Kecamatan Grati yang berada di dataran rendah dengan pemandangan perbukitan di sekelilingnya. Hamparan air yang tenang menjadikannya tempat yang nyaman untuk bersantai bersama keluarga.",
  "pantai-lekok": "Pantai Lekok berada di Kecamatan Lekok, di pesisir utara Pasuruan yang menghadap Selat Madura. Pantai ini menyuguhkan suasana khas pesisir dengan hamparan laut, angin yang berembus, dan aktivitas nelayan setempat.",
  "mangrove-nguling": "Mangrove Tour Nguling adalah wisata hutan bakau di wilayah pesisir Kecamatan Nguling. Pengunjung dapat menyusuri kawasan mangrove dan mengenal fungsi penting ekosistem ini sebagai pelindung pantai sekaligus habitat berbagai biota.",
  "mangrove-kota-pasuruan": "Hutan Mangrove Kota Pasuruan berada di kawasan pesisir Kecamatan Panggungrejo. Area ini menjadi ruang hijau di tepi pantai yang berperan menjaga garis pantai sekaligus menjadi tempat rekreasi dan edukasi lingkungan.",
  "banyu-biru": "Pemandian Alam Banyu Biru di Kecamatan Winongan adalah pemandian yang bersumber dari mata air alami. Air yang jernih berwarna kebiruan menjadi daya tarik utama sekaligus memberi kesegaran bagi pengunjung yang ingin berenang atau berendam.",
  "kebun-raya-purwodadi": "Kebun Raya Purwodadi adalah kebun botani yang berada di Kecamatan Purwosari dan terkenal dengan koleksi tanaman dari kawasan beriklim kering dataran rendah. Kawasan ini berfungsi sebagai tempat konservasi, penelitian, pendidikan, sekaligus rekreasi.",
  "taman-safari-prigen": "Taman Safari Indonesia II Prigen adalah taman safari di kaki Gunung Arjuno–Welirang yang menyatukan konservasi satwa dengan wisata keluarga. Pengunjung dapat melihat beragam satwa dari dekat, baik dari dalam kendaraan maupun di area yang bisa dijelajahi dengan berjalan kaki.",
  "cimory-dairyland-prigen": "Dairyland Farm Theme Park Prigen adalah taman tema bergaya peternakan yang berada di kawasan Prigen. Pengunjung dapat melihat hewan ternak, bermain di area rekreasi, dan menikmati suasana pegunungan yang sejuk.",
  "tanaria-park": "Tanaria Park adalah taman tema di Desa Lumbangrejo, Prigen, dengan nuansa pegunungan yang sejuk. Area ini dirancang sebagai tempat rekreasi keluarga dengan beragam spot foto dan wahana yang menarik.",
  "lembah-pendawa": "Lembah Pendawa Bali van Java adalah taman rekreasi di Pandaan yang mengusung nuansa pulau Bali. Pengunjung dapat menikmati suasana taman bernuansa Bali dan berbagai fasilitas rekreasi untuk keluarga.",
  "taman-k-pandaan": "Taman K adalah taman rekreasi di Kecamatan Pandaan yang dirancang sebagai tempat bersantai dan berkumpul bersama keluarga. Suasana tamannya yang tertata menjadikannya pilihan yang nyaman untuk menghabiskan waktu luang.",
  "ranting-sewu-park": "Ranting Sewu Park adalah destinasi wisata edukasi di Kecamatan Pandaan. Tempat ini menggabungkan unsur bermain dan belajar sehingga anak-anak dapat mengenal alam dengan cara yang menyenangkan.",
  "telogo-sewu": "Telogo Sewu Outbound & Kolam Renang di Pandaan menyediakan kegiatan outbound dan fasilitas kolam renang dalam satu lokasi. Tempat ini cocok untuk kegiatan keluarga, komunitas, maupun rombongan sekolah.",
  "taman-dayu": "The Taman Dayu adalah kawasan taman dan kuliner di Pandaan yang menawarkan suasana hijau dan tertata. Kawasan ini menjadi tempat favorit untuk bersantai, berjalan-jalan, dan menikmati beragam pilihan makanan.",
  "splash-waterpark": "The Splash Waterpark adalah taman air di kawasan Taman Dayu, Kecamatan Prigen. Tersedia berbagai wahana air yang dapat dinikmati oleh anak-anak maupun orang dewasa, mulai dari seluncuran hingga kolam untuk bersantai.",
  "saygon-waterpark": "Saygon Waterpark merupakan taman air di Kecamatan Purwosari yang menawarkan beragam wahana bermain air. Tempat ini menjadi pilihan rekreasi bagi keluarga yang ingin bersenang-senang dan menyegarkan diri.",
  "bhakti-alam": "Agrowisata Bhakti Alam berada di Kecamatan Tutur, kawasan dataran tinggi yang terkenal dengan pertanian dan peternakan. Tempat ini mengajak pengunjung mengenal dunia agrowisata sambil menikmati udara yang sejuk.",
  "bukit-flora": "Wisata Bukit Flora di Kecamatan Tutur menggabungkan unsur wisata edukasi dan kegiatan outbound di tengah udara pegunungan yang sejuk. Suasana asri dan pemandangan alam sekitarnya menjadikan tempat ini nyaman untuk beraktivitas.",
  "dam-pleret-1904": "Dam Pleret 1904 adalah bangunan bendungan peninggalan masa kolonial di Kecamatan Pohjentrek, Desa Pleret, yang hingga kini masih berperan dalam pengairan. Tempat ini menjadi desa wisata yang memadukan nilai sejarah, edukasi, dan keindahan alam.",
  "kedawung-agro-selfie": "Kedawung Agro Selfie (KAS) adalah destinasi agrowisata di Kecamatan Grati yang menawarkan taman dan spot foto di tengah suasana perdesaan. Hamparan tanaman dan dekorasi kreatif menjadi daya tarik bagi pengunjung yang gemar berfoto.",
  "taman-kota-pasuruan": "Taman Kota Pasuruan adalah ruang terbuka hijau di pusat Kota Pasuruan yang dapat dinikmati oleh masyarakat dari berbagai kalangan. Tempat ini menjadi lokasi favorit warga untuk bersantai, berolahraga ringan, dan bermain bersama anak-anak.",
  "alun-alun-pasuruan": "Alun-Alun Pasuruan merupakan ruang publik utama di jantung Kota Pasuruan dan dikenal dengan payung-payung besar yang terinspirasi dari Masjid Nabawi di Madinah, sehingga disebut Payung Madinah. Tempat ini ramai pada sore dan malam hari ketika warga berkumpul dan bersantai.",
  "masjid-cheng-hoo-pandaan": "Masjid Muhammad Cheng Hoo Pandaan menonjol dengan arsitektur bernuansa Tionghoa yang dipadukan dengan fungsi masjid. Namanya diambil dari Laksamana Cheng Ho, tokoh pelaut Tiongkok beragama Islam yang dikenal dalam sejarah hubungan Nusantara dan Tiongkok.",
  "masjid-agung-al-anwar": "Masjid Agung Al-Anwar adalah masjid utama di Kota Pasuruan yang berdiri di kawasan pusat kota. Masjid ini menjadi pusat kegiatan keagamaan dan salah satu ikon kota, terutama bagi para peziarah yang mengunjungi wisata religi di Pasuruan.",
  "makam-kh-abdul-hamid": "Makam KH. Abdul Hamid, yang akrab disapa Mbah Hamid, adalah salah satu makam ulama yang paling banyak dikunjungi peziarah di Kota Pasuruan. Beliau dikenal luas sebagai ulama yang dihormati masyarakat, dan makamnya menjadi tujuan utama wisata religi.",
  "makam-mbah-slagah": "Makam Mbah Slagah berada di Kelurahan Pekuncen, Kota Pasuruan, dan menjadi salah satu tujuan ziarah warga setempat maupun pengunjung dari luar daerah. Tempat ini dihormati masyarakat sebagai makam tokoh yang dikenal dalam sejarah lokal.",
  "makam-mbah-semendi": "Makam Mbah Sholeh Semendi berada di Desa Bandaran, Kecamatan Winongan. Tempat ini dihormati masyarakat sebagai makam tokoh agama dan menjadi tujuan ziarah bagi warga sekitar maupun peziarah dari luar daerah.",
  "makam-mbah-syakaruddin": "Makam Mbah Syakaruddin berada di Desa Keboncandi, Kecamatan Gondangwetan. Makam ini dihormati masyarakat dan sering dikunjungi peziarah yang ingin berdoa serta mengenang tokoh yang dimakamkan di sini.",
  "makam-mbah-sayyid-arif-segoropuro": "Makam Mbah Sayyid Arif Segoropuro berada di Desa Segoropuro, Kecamatan Rejoso. Tempat ini menjadi tujuan ziarah bagi masyarakat yang menghormati tokoh yang dimakamkan di sana dan ingin berdoa di lokasi tersebut.",
  "klenteng-tjoe-tik-kiong": "Klenteng Tjoe Tik Kiong adalah tempat ibadah umat Tionghoa di Kota Pasuruan yang menjadi bagian dari jejak keberagaman budaya kota ini. Arsitektur khas klenteng dengan warna merah dan ornamen tradisionalnya menjadikannya menarik untuk dikunjungi.",
  "klenteng-tjoe-an-kiong-bangil": "Klenteng Tjoe An Kiong adalah klenteng di Kecamatan Bangil yang menjadi pusat ibadah dan budaya komunitas Tionghoa setempat. Bangunannya yang khas dengan ornamen tradisional menunjukkan keberagaman budaya di Pasuruan.",
  "candi-jawi": "Candi Jawi adalah candi peninggalan masa Kerajaan Singasari yang berada di Desa Candiwates, Prigen. Candi ini bercorak perpaduan Hindu dan Buddha serta dikenal dengan bentuknya yang ramping dan menjulang, berlatar pegunungan di sekitarnya.",
  "candi-belahan": "Candi Belahan, yang juga dikenal sebagai Sumber Tetek, adalah petirtaan atau pemandian kuno di Desa Wonosunyo, Gempol. Tempat ini dikaitkan dengan masa Kerajaan Medang dan Raja Airlangga, dengan arca-arca yang menjadi pancuran air.",
  "candi-gunung-gangsir": "Candi Gunung Gangsir adalah situs candi peninggalan masa lampau yang berada di Desa Gununggangsir, Kecamatan Beji. Keberadaannya menjadi bukti jejak peradaban Hindu–Buddha di wilayah Pasuruan.",
  "candi-keboireng": "Candi Keboireng adalah situs peninggalan sejarah di Desa Ngerong, Kecamatan Gempol. Sisa bangunan kuno di sini menjadi bagian dari jejak peradaban masa lampau di wilayah Pasuruan.",
  "situs-raos-pacinan": "Situs Raos Pacinan adalah situs purbakala di Desa Carat, Kecamatan Gempol. Keberadaannya menjadi salah satu bukti jejak sejarah dan peradaban masa lampau di wilayah ini.",
  "candi-sepilar": "Candi Sepilar berada di Desa Sumberrejo, Kecamatan Purwosari, dan dikenal sebagai situs candi yang berada di sekitar jalur pendakian Gunung Arjuno. Lokasinya yang berada di lereng gunung memberikan nuansa sejarah yang berpadu dengan alam.",
  "prasasti-pendirian-pasuruan": "Prasasti Pendirian Pasuruan, atau De Inscriptie van de Oprichting van Pasoeroean, adalah monumen bersejarah yang berkaitan dengan sejarah berdirinya Pasuruan pada masa kolonial. Prasasti ini menjadi salah satu penanda penting perjalanan sejarah wilayah Pasuruan.",
  "societeit-harmonie": "Societeit Harmonie adalah bangunan cagar budaya di Kota Pasuruan yang dahulu digunakan sebagai tempat berkumpul pada masa kolonial. Arsitekturnya mencerminkan gaya bangunan Eropa yang berkembang di kota-kota Hindia Belanda.",
  "taman-candra-wilwatikta": "Taman Candra Wilwatikta adalah panggung seni budaya di Kecamatan Pandaan yang menjadi tempat pertunjukan seni tradisional khas Jawa Timur. Nama Wilwatikta merujuk pada nama lain Kerajaan Majapahit, sehingga nuansa budayanya terasa kuat.",
  "sedaeng-kampung-budaya-tengger": "Sedaeng Kampung Budaya Tengger berada di Desa Sedaeng, Kecamatan Tosari, di kawasan dataran tinggi Tengger. Kampung ini menjaga adat, tradisi, dan kehidupan masyarakat Tengger yang dikenal erat dengan budaya Hindu dan alam pegunungan."
};

/* ---- Gabungkan ke data destinasi ---- */
if (typeof WISATA_DESTINATIONS !== "undefined") {
  WISATA_DESTINATIONS.forEach(function (d) {
    var teks = DESKRIPSI_WISATA[d.slug];
    if (teks) d.description = teks;               // array [p1, p2, p3]
    var ringkas = DESKRIPSI_SHORT[d.slug];
    if (ringkas) d.short_description = ringkas;   // 2 kalimat pertama
  });
}
if (typeof window !== "undefined") {
  window.DESKRIPSI_WISATA = DESKRIPSI_WISATA;
  window.DESKRIPSI_SHORT = DESKRIPSI_SHORT;
}

const PASINFO_WISATA = {
  regions: WISATA_REGIONS,
  categories: WISATA_CATEGORIES,
  destinations: WISATA_DESTINATIONS,
};
if (typeof window !== "undefined") {
  window.PASINFO_WISATA = PASINFO_WISATA;
}
