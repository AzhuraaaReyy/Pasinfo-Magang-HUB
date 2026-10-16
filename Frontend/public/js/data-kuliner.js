/**
 * DATA KULINER — Pasuruan Info (DATA REAL Owner, BUKAN mock).
 * ==========================================================
 * Sumber: public/data/destinasi-kuliner-pasuruan.json (25 destinasi).
 * Koordinat Google Places (keyakinan "sedang"); BELUM diverifikasi
 * terhadap poligon batas wilayah — verification.status = "pending"
 * (UI: "Menunggu Verifikasi"). Jangan tampilkan sebagai terverifikasi.
 *
 * - place.latitude/longitude REAL per tempat (dipakai peta + jarak Sekitar).
 * - media[].url null → UI memakai placeholder lokal (tanpa foto).
 * - Field tanpa data (menu, harga, jam, rating) = null/[] — fallback UI.
 *   KECUALI bila ada override di public/data/kuliner-overrides.json
 *   (DATA DUMMY Owner, sementara): rating, reviews_label, opening_hours,
 *   price_range, menus diisi dari override + ditandai item.is_dummy.
 * - facilities: array string fasilitas, hanya yang disebut jelas di
 *   deskripsi/ulasan. [] = belum ada info (UI: "Info fasilitas belum tersedia").
 * - operational_status: DIHITUNG OTOMATIS saat file dimuat dari
 *   opening_hours (zona waktu WIB) oleh getOperationalStatus() di bawah.
 *   Nilai: { status: "open" | "closing_soon" | "closed" | "unknown", label }.
 *   Untuk status yang selalu segar, panggil refreshOperationalStatus() saat render.
 * - Kategori halaman dipertahankan (tradisional/camilan/kopi/seafood);
 *   pemetaan subkategori→kategori via tabel di tools/build-kuliner-budaya.js.
 *   kopi-minuman + camilan-oleh-oleh = 0 item (tab kosong = empty-state).
 *
 * Dibangkitkan: node tools/build-kuliner-budaya.js (jangan edit manual).
 * CATATAN: perubahan facilities/operational_status di file ini harus ikut
 * ditambahkan ke generator, jika tidak akan tertimpa saat generate ulang.
 */

const KULINER_REGIONS = [
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

const KULINER_CATEGORIES = [
  { id: "tradisional", slug: "tradisional", name: "Tradisional" },
  {
    id: "camilan-oleh-oleh",
    slug: "camilan-oleh-oleh",
    name: "Camilan & Oleh-oleh",
  },
  { id: "kopi-minuman", slug: "kopi-minuman", name: "Kopi & Minuman" },
  { id: "seafood", slug: "seafood", name: "Seafood" },
];

const KULINER_CULINARIES = [
  {
    id: "nasi-punel-bu-hj-lin",
    slug: "nasi-punel-bu-hj-lin",
    name: "Nasi Punel Bu Hj. Lin",
    regionId: "pasuruan-utara",
    place: {
      latitude: -7.600565,
      longitude: 112.789212,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Nasi Punel Bu Hj. Lin (belum tersedia)",
      },
    ],
    short_description:
      "Nasi punel khas Bangil dengan lauk empal, lidah, babat, dan ayam. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Nasi Punel Bu Hj. Lin menyajikan nasi punel, hidangan khas Bangil yang dikenal dengan lauknya yang beragam. Pilihan lauknya meliputi empal, lidah, babat, dan ayam, sehingga pengunjung bisa menyesuaikan dengan selera masing-masing.\n\nBagi yang ingin mengenal kuliner khas Bangil, tempat ini dapat menjadi salah satu pilihan untuk mencicipi nasi punel. Perpaduan nasi dengan lauk daging dan jeroan menjadikannya sajian yang mengenyangkan.\n\nTempat makan ini beralamat di Gempeng, Kec. Bangil. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini mengumpulkan gambaran hidangan nasi punel khas Bangil di Nasi Punel Bu Hj. Lin. Fokus foto ada pada sajian nasi dengan lauk empal, lidah, babat, dan ayam yang menjadi pilihan di tempat ini.\n\nMelalui foto-foto tersebut, pengunjung dapat melihat tampilan lauk dan cara penyajiannya sebelum datang. Gambaran ini membantu menentukan lauk mana yang ingin dicoba.\n\nGunakan galeri ini sebagai referensi saat merencanakan kunjungan ke Gempeng, Kec. Bangil. Bagi yang baru mengenal nasi punel, foto-foto ini dapat menjadi pengantar sebelum mencicipi langsung.",
    rating: 4.6,
    reviews_label: "1.250 Ulasan",
    address: "Gempeng, Kec. Bangil",
    opening_hours: "06.00 - 14.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.600565,112.789212",
    place_id: "ChIJH8M8TkLb1y0RQL0COiosMLo",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 15.000 - Rp 30.000",
    prices: [],
    operational_status: null,
    facilities: [],
    menus: [
      {
        name: "Nasi punel + empal",
        price: "Rp 22.000",
      },
      {
        name: "Nasi punel + lidah",
        price: "Rp 25.000",
      },
      {
        name: "Nasi punel + babat",
        price: "Rp 24.000",
      },
      {
        name: "Nasi punel + ayam",
        price: "Rp 20.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "depot-nasi-punel-setia-budi-bangil",
    slug: "depot-nasi-punel-setia-budi-bangil",
    name: "Depot Nasi Punel Setia Budi Bangil",
    regionId: "pasuruan-utara",
    place: {
      latitude: -7.598894,
      longitude: 112.779461,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Depot Nasi Punel Setia Budi Bangil (belum tersedia)",
      },
    ],
    short_description:
      "Nasi punel dengan pilihan lauk daging, ayam, dan jeroan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Depot Nasi Punel Setia Budi Bangil menyajikan nasi punel dengan pilihan lauk daging, ayam, dan jeroan. Variasi lauk ini memberi ruang bagi pengunjung untuk memilih kombinasi yang paling sesuai dengan selera.\n\nSebagai salah satu depot nasi punel di Bangil, tempat ini cocok bagi pencinta kuliner yang ingin membandingkan cita rasa nasi punel dari satu warung ke warung lainnya. Hidangan ini menjadi bagian dari identitas kuliner khas wilayah Bangil.\n\nDepot ini beralamat di Pogar, Kec. Bangil. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan sajian nasi punel di Depot Nasi Punel Setia Budi Bangil. Foto-fotonya berfokus pada pilihan lauk daging, ayam, dan jeroan yang tersedia di depot ini.\n\nDari galeri, pengunjung dapat membandingkan tampilan tiap pilihan lauk sehingga lebih mudah menentukan menu favorit. Gambaran suasana depot juga membantu menyiapkan ekspektasi sebelum berkunjung.\n\nGaleri ini cocok dijadikan rujukan bagi pencinta nasi punel yang ingin membandingkan beberapa tempat makan di Bangil. Lokasi depot berada di Pogar, Kec. Bangil.",
    rating: 4.4,
    reviews_label: "860 Ulasan",
    address: "Pogar, Kec. Bangil",
    opening_hours: "06.30 - 15.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.598894,112.779461",
    place_id: "ChIJt-BnQW_b1y0RUYFKMqq6DAs",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 15.000 - Rp 32.000",
    prices: [],
    operational_status: null,
    facilities: [],
    menus: [
      {
        name: "Nasi punel ayam",
        price: "Rp 20.000",
      },
      {
        name: "Nasi punel babat",
        price: "Rp 24.000",
      },
      {
        name: "Nasi punel empal",
        price: "Rp 26.000",
      },
      {
        name: "Nasi punel lidah",
        price: "Rp 30.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "warung-pojok-nasi-punel-bangil",
    slug: "warung-pojok-nasi-punel-bangil",
    name: "Warung Pojok Nasi Punel Bangil",
    regionId: "pasuruan-utara",
    place: {
      latitude: -7.599188,
      longitude: 112.781702,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Warung Pojok Nasi Punel Bangil (belum tersedia)",
      },
    ],
    short_description:
      "Warung kecil dengan tempat duduk terbatas dan sering antre; lokasi di gang kecil dari jalan utama. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Warung Pojok Nasi Punel Bangil adalah warung kecil yang menyajikan nasi punel khas Bangil. Ukurannya yang sederhana membuat suasananya terasa akrab, khas warung makan lokal yang sering dikunjungi warga sekitar.\n\nTempat duduknya terbatas dan warung ini sering diwarnai antrean. Lokasinya berada di gang kecil dari jalan utama, sehingga pengunjung perlu memperhatikan petunjuk arah dan sebaiknya datang dengan waktu yang cukup longgar.\n\nWarung ini beralamat di Kidul Dalem, Kec. Bangil. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini memperlihatkan nasi punel dan suasana Warung Pojok Nasi Punel Bangil. Warung ini berukuran kecil, sehingga foto-fotonya menggambarkan suasana makan yang sederhana dan akrab.\n\nTempat duduk di warung terbatas dan antrean sering terjadi. Galeri membantu pengunjung membayangkan ukuran tempat dan suasananya sebelum datang.\n\nLokasi warung berada di gang kecil dari jalan utama di Kidul Dalem, Kec. Bangil. Lihat galeri ini lalu sisihkan waktu lebih agar kunjungan tidak terburu-buru.",
    rating: 4.7,
    reviews_label: "640 Ulasan",
    address: "Kidul Dalem, Kec. Bangil",
    opening_hours: "05.30 - 11.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.599188,112.781702",
    place_id: "ChIJ_ZkYuGjb1y0RhcVsfCkdVLY",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 12.000 - Rp 28.000",
    prices: [],
    operational_status: null,
    facilities: ["Tempat duduk terbatas"],
    menus: [
      {
        name: "Nasi punel campur",
        price: "Rp 18.000",
      },
      {
        name: "Nasi punel empal",
        price: "Rp 20.000",
      },
      {
        name: "Nasi punel babat",
        price: "Rp 22.000",
      },
      {
        name: "Nasi punel lidah",
        price: "Rp 26.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "waroeng-sambel-bangil",
    slug: "waroeng-sambel-bangil",
    name: "Waroeng Sambel",
    regionId: "pasuruan-utara",
    place: {
      latitude: -7.605421,
      longitude: 112.770878,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Waroeng Sambel (belum tersedia)",
      },
    ],
    short_description:
      "Rumah makan sambal di Jl. Raya Pandaan-Bangil dengan beberapa paket hidangan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Waroeng Sambel adalah rumah makan yang menonjolkan hidangan dengan sambal sebagai pelengkap utamanya. Tersedia beberapa paket hidangan, sehingga pengunjung dapat memilih paket sesuai selera dan jumlah orang.\n\nRumah makan ini berada di Jl. Raya Pandaan-Bangil, jalur yang cukup mudah dijangkau bagi pengunjung yang melintas di antara dua kecamatan tersebut. Lokasinya cocok untuk singgah makan bersama keluarga atau teman.\n\nTempat makan ini beralamat di Pogar, Kec. Bangil. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan hidangan dan suasana Waroeng Sambel, rumah makan sambal di Jl. Raya Pandaan-Bangil. Foto-fotonya berfokus pada paket hidangan dengan sambal sebagai pelengkap utama.\n\nPengunjung dapat melihat gambaran tiap paket hidangan, mulai dari lauk hingga sambal yang menyertainya. Hal ini memudahkan memilih paket yang sesuai dengan selera dan jumlah orang.\n\nGaleri ini cocok dijadikan acuan bagi yang ingin singgah makan di jalur Pandaan-Bangil. Lokasinya berada di Pogar, Kec. Bangil.",
    rating: 4.3,
    reviews_label: "970 Ulasan",
    address: "Pogar, Kec. Bangil",
    opening_hours: "10.00 - 21.30 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.605421,112.770878",
    place_id: "ChIJ3czZpHPb1y0R--KqLLg8qWI",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 25.000 - Rp 55.000",
    prices: [],
    operational_status: null,
    facilities: [],
    menus: [
      {
        name: "Paket ayam sambal",
        price: "Rp 32.000",
      },
      {
        name: "Paket lele sambal",
        price: "Rp 28.000",
      },
      {
        name: "Paket bebek sambal",
        price: "Rp 40.000",
      },
      {
        name: "Paket tahu tempe sambal",
        price: "Rp 25.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "warung-teko-beji",
    slug: "warung-teko-beji",
    name: "Warung Teko Beji",
    regionId: "pasuruan-utara",
    place: {
      latitude: -7.597973,
      longitude: 112.765038,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Warung Teko Beji (belum tersedia)",
      },
    ],
    short_description:
      "Restoran bergazebo dengan kolam ikan dan area bermain anak; ayam bakar dan sayur asem disebut dalam ulasan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Warung Teko Beji adalah restoran dengan gazebo dan kolam ikan yang memberi suasana santai saat makan. Menurut ulasan, ayam bakar dan sayur asem menjadi menu yang disebut-sebut oleh pengunjung.\n\nTersedia pula area bermain anak, sehingga tempat ini nyaman untuk makan bersama keluarga. Suasana gazebo yang terbuka cocok bagi rombongan yang ingin makan sambil bersantai.\n\nRestoran ini beralamat di Gajahbendo, Kec. Beji. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini mengumpulkan gambaran Warung Teko Beji, restoran dengan gazebo, kolam ikan, dan area bermain anak. Foto-fotonya berfokus pada hidangan seperti ayam bakar dan sayur asem yang disebut dalam ulasan.\n\nSelain makanan, galeri menampilkan suasana tempat yang terbuka dan santai. Gazebo dan kolam ikan menjadi elemen visual yang membedakan restoran ini.\n\nBagi yang berencana makan bersama keluarga, galeri ini membantu melihat fasilitas sebelum datang. Lokasinya berada di Gajahbendo, Kec. Beji.",
    rating: 4.4,
    reviews_label: "1.100 Ulasan",
    address: "Gajahbendo, Kec. Beji",
    opening_hours: "09.00 - 21.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.597973,112.765038",
    place_id: "ChIJlSwvOHjb1y0R-PagfucxwZ8",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 25.000 - Rp 60.000",
    prices: [],
    operational_status: null,
    facilities: ["Gazebo", "Kolam ikan", "Area bermain anak"],
    menus: [
      {
        name: "Ayam bakar",
        price: "Rp 35.000",
      },
      {
        name: "Sayur asem",
        price: "Rp 12.000",
      },
      {
        name: "Gurami bakar",
        price: "Rp 55.000",
      },
      {
        name: "Paket nasi ayam goreng",
        price: "Rp 30.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "cairo-restaurant-bangil",
    slug: "cairo-restaurant-bangil",
    name: "Cairo Restaurant Bangil",
    regionId: "pasuruan-utara",
    place: {
      latitude: -7.593659,
      longitude: 112.784154,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Cairo Restaurant Bangil (belum tersedia)",
      },
    ],
    short_description:
      "Menyajikan masakan Timur Tengah (sate disebut dalam ulasan); tempat duduk terbatas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Cairo Restaurant Bangil menyajikan masakan Timur Tengah, yang menjadi pilihan menarik bagi pengunjung yang ingin mencoba cita rasa berbeda dari kuliner lokal. Menurut ulasan, sate termasuk menu yang disebut oleh pengunjung.\n\nTempat duduknya terbatas, sehingga pengunjung yang datang berombongan sebaiknya mempertimbangkan waktu kunjungan agar tidak kesulitan mendapat tempat. Suasananya cocok untuk makan santai bersama keluarga atau teman.\n\nRestoran ini beralamat di Bendomungal, Kec. Bangil. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan hidangan Timur Tengah di Cairo Restaurant Bangil. Foto-fotonya berfokus pada sajian yang disebut dalam ulasan, termasuk sate.\n\nGambaran hidangan dan suasana restoran membantu pengunjung mengenal cita rasa yang berbeda dari kuliner lokal. Tempat duduk yang terbatas juga tergambar dari suasana ruangannya.\n\nGunakan galeri ini sebagai referensi sebelum berkunjung ke Bendomungal, Kec. Bangil, terutama bagi rombongan yang perlu mengatur waktu agar mudah mendapat tempat.",
    rating: 4.5,
    reviews_label: "720 Ulasan",
    address: "Bendomungal, Kec. Bangil",
    opening_hours: "10.00 - 22.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.593659,112.784154",
    place_id: "ChIJlZXem0Lb1y0RvECZzpZsa9s",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 30.000 - Rp 70.000",
    prices: [],
    operational_status: null,
    facilities: ["Tempat duduk terbatas"],
    menus: [
      {
        name: "Sate kambing",
        price: "Rp 45.000",
      },
      {
        name: "Nasi kebuli",
        price: "Rp 42.000",
      },
      {
        name: "Nasi mandi ayam",
        price: "Rp 48.000",
      },
      {
        name: "Kebab daging",
        price: "Rp 35.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "sri-sultan-prigen",
    slug: "sri-sultan-prigen",
    name: "SRI Sultan Prigen Masakan Khas Nusantara",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.666725,
      longitude: 112.667427,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto SRI Sultan Prigen Masakan Khas Nusantara (belum tersedia)",
      },
    ],
    short_description:
      "Terkenal dengan ayam goreng madu. Alamat Google menyebut Kec. Pandaan, padahal Candi Wates pada data Candi Jawi tercatat Kec. Prigen; kecamatan perlu dicek ke poligon batas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "SRI Sultan Prigen menyajikan masakan khas Nusantara dan dikenal dengan ayam goreng madunya. Menu ini menjadi daya tarik utama bagi pengunjung yang singgah dalam perjalanan menuju atau dari kawasan wisata Prigen.\n\nAlamat Google untuk lokasi ini menyebut Kec. Pandaan, padahal Candi Wates pada data Candi Jawi tercatat di Kec. Prigen. Karena itu, kecamatan lokasi ini masih perlu dicek ke poligon batas wilayah dan tingkat keyakinan datanya masih rendah.\n\nRumah makan ini beralamat di Candi Wates, Kec. Prigen. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan hidangan masakan khas Nusantara di SRI Sultan Prigen. Foto-fotonya berfokus pada ayam goreng madu, menu yang paling dikenal dari tempat ini.\n\nMelalui galeri, pengunjung dapat melihat tampilan sajian dan suasana rumah makan sebelum datang. Gambaran ini membantu menentukan menu yang ingin dicoba.\n\nLokasi rumah makan ini tercatat di Candi Wates, Kec. Prigen, namun kecamatannya masih perlu dicek ke poligon batas wilayah. Galeri ini dapat dijadikan acuan visual selama data lokasi diverifikasi.",
    rating: 4.5,
    reviews_label: "1.900 Ulasan",
    address: "Candi Wates, Kec. Prigen",
    opening_hours: "09.00 - 21.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.666725,112.667427",
    place_id: "ChIJTxXuxZjZ1y0RAlyJ1H4aAaw",
    keyakinan: "rendah",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 40.000 - Rp 100.000",
    prices: [],
    operational_status: null,
    facilities: [],
    menus: [
      {
        name: "Ayam goreng madu",
        price: "Rp 48.000",
      },
      {
        name: "Ayam bakar madu",
        price: "Rp 50.000",
      },
      {
        name: "Nasi liwet komplit",
        price: "Rp 45.000",
      },
      {
        name: "Gurami goreng",
        price: "Rp 85.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "cimory-restaurant-prigen",
    slug: "cimory-restaurant-prigen",
    name: "Cimory Restaurant Prigen",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.680053,
      longitude: 112.639899,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Cimory Restaurant Prigen (belum tersedia)",
      },
    ],
    short_description:
      "Restoran dalam kawasan Cimory Dairyland dengan menu Indonesia dan western; ada toko produk susu. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Cimory Restaurant Prigen berada di dalam kawasan Cimory Dairyland dan menyajikan menu Indonesia serta western. Pilihan menu yang beragam membuatnya cocok bagi rombongan dengan selera yang berbeda-beda.\n\nDi kawasan yang sama terdapat toko produk susu, sehingga pengunjung dapat sekaligus berbelanja setelah makan. Restoran ini mudah dikombinasikan dengan kunjungan wisata di sekitar Prigen.\n\nRestoran ini beralamat di Plembon, Kec. Prigen. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan hidangan dan suasana Cimory Restaurant Prigen yang berada dalam kawasan Cimory Dairyland. Foto-fotonya mencakup menu Indonesia dan western yang tersedia di restoran.\n\nGaleri juga memberi gambaran kawasan sekitar, termasuk toko produk susu yang berada di area yang sama. Hal ini membantu pengunjung menyusun rencana makan sekaligus berbelanja.\n\nGunakan galeri ini sebagai referensi saat merencanakan kunjungan ke Plembon, Kec. Prigen, terutama bagi rombongan yang ingin memilih menu sebelum datang.",
    rating: 4.6,
    reviews_label: "5.200 Ulasan",
    address: "Plembon, Kec. Prigen",
    opening_hours: "09.00 - 21.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.680053,112.639899",
    place_id: "ChIJD527l4PX1y0R9qBfAdlvjkk",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 45.000 - Rp 120.000",
    prices: [],
    operational_status: null,
    facilities: ["Toko produk susu", "Menu Indonesia & western"],
    menus: [
      {
        name: "Steak ayam",
        price: "Rp 65.000",
      },
      {
        name: "Nasi goreng Cimory",
        price: "Rp 48.000",
      },
      {
        name: "Spaghetti bolognese",
        price: "Rp 58.000",
      },
      {
        name: "Chicken burger",
        price: "Rp 62.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "foodcourt-sawah-view",
    slug: "foodcourt-sawah-view",
    name: "Foodcourt Sawah View",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.689035,
      longitude: 112.685278,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Foodcourt Sawah View (belum tersedia)",
      },
    ],
    short_description:
      "Food court terbuka menghadap sawah dengan area bermain anak. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Foodcourt Sawah View adalah food court terbuka yang menghadap hamparan sawah. Pemandangan hijau di sekitarnya memberi suasana santai yang berbeda dari tempat makan di pusat kota.\n\nTersedia area bermain anak, sehingga tempat ini nyaman dikunjungi bersama keluarga. Konsep food court memungkinkan setiap anggota rombongan memilih makanan sesuai selera masing-masing.\n\nFood court ini beralamat di Bulukandang, Kec. Prigen. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan suasana Foodcourt Sawah View, food court terbuka yang menghadap hamparan sawah. Foto-fotonya menggambarkan area makan dan pemandangan hijau di sekelilingnya.\n\nSelain suasana, galeri memperlihatkan area bermain anak yang tersedia di lokasi. Gambaran ini membantu keluarga menilai kenyamanan tempat sebelum datang.\n\nKonsep food court memungkinkan pengunjung memilih makanan sesuai selera. Lokasinya berada di Bulukandang, Kec. Prigen; lihat galeri ini untuk membayangkan suasana sebelum berkunjung.",
    rating: 4.2,
    reviews_label: "680 Ulasan",
    address: "Bulukandang, Kec. Prigen",
    opening_hours: "10.00 - 21.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.689035,112.685278",
    place_id: "ChIJ5xKFcp7X1y0RO3ipmnPYnMU",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 15.000 - Rp 45.000",
    prices: [],
    operational_status: null,
    facilities: ["Area terbuka", "Pemandangan sawah", "Area bermain anak"],
    menus: [
      {
        name: "Menu food court",
        price: "Rp 25.000",
      },
      {
        name: "Nasi goreng",
        price: "Rp 22.000",
      },
      {
        name: "Mie ayam",
        price: "Rp 18.000",
      },
      {
        name: "Ayam geprek",
        price: "Rp 24.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "warung-kepulan-asap",
    slug: "warung-kepulan-asap",
    name: "Warung Kepulan Asap",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.657272,
      longitude: 112.647414,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Warung Kepulan Asap (belum tersedia)",
      },
    ],
    short_description:
      "Rumah makan ramah keluarga dengan konsep prasmanan dan pemandangan gunung. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Warung Kepulan Asap adalah rumah makan ramah keluarga dengan konsep prasmanan. Dengan konsep ini, pengunjung dapat melihat langsung pilihan hidangan dan mengambil sesuai selera.\n\nRumah makan ini menawarkan pemandangan gunung yang membuat suasana makan terasa lebih segar, terutama bagi pengunjung yang datang dari perkotaan. Tempat ini cocok untuk makan bersama keluarga besar atau rombongan.\n\nRumah makan ini beralamat di Sekarjoho, Kec. Prigen. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan hidangan dan suasana Warung Kepulan Asap, rumah makan ramah keluarga dengan konsep prasmanan. Foto-fotonya menggambarkan pilihan hidangan yang dapat diambil langsung oleh pengunjung.\n\nPemandangan gunung di sekitar rumah makan juga menjadi bagian dari galeri. Suasana ini memberi kesan segar dan santai saat makan.\n\nGaleri ini membantu keluarga atau rombongan membayangkan suasana sebelum berkunjung ke Sekarjoho, Kec. Prigen.",
    rating: 4.3,
    reviews_label: "540 Ulasan",
    address: "Sekarjoho, Kec. Prigen",
    opening_hours: "08.00 - 20.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.657272,112.647414",
    place_id: "ChIJozRzK2zZ1y0RQ4kwmSLrq0o",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 25.000 - Rp 55.000",
    prices: [],
    operational_status: null,
    facilities: ["Prasmanan", "Pemandangan gunung", "Ramah keluarga"],
    menus: [
      {
        name: "Prasmanan (per orang)",
        price: "Rp 40.000",
      },
      {
        name: "Ayam bakar",
        price: "Rp 32.000",
      },
      {
        name: "Soto ayam",
        price: "Rp 25.000",
      },
      {
        name: "Pepes ikan",
        price: "Rp 30.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "warung-lesehan-pak-majid",
    slug: "warung-lesehan-pak-majid",
    name: "Warung Lesehan Pak Majid",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.672783,
      longitude: 112.684041,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Warung Lesehan Pak Majid (belum tersedia)",
      },
    ],
    short_description:
      "Lesehan dengan ayam bakar madu, gurami goreng, dan patin asap; ada kolam ikan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Warung Lesehan Pak Majid menyajikan hidangan dengan konsep lesehan. Menu yang disebut dalam data meliputi ayam bakar madu, gurami goreng, dan patin asap, sehingga pilihannya mencakup olahan ayam maupun ikan.\n\nDi lokasi terdapat kolam ikan yang menambah suasana santai saat makan. Konsep lesehan cocok bagi pengunjung yang ingin menikmati hidangan secara lebih santai bersama keluarga atau teman.\n\nWarung ini beralamat di Durensewu, Kec. Pandaan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan hidangan di Warung Lesehan Pak Majid, mulai dari ayam bakar madu, gurami goreng, hingga patin asap. Foto-fotonya menggambarkan variasi olahan ayam dan ikan yang menjadi ciri tempat ini.\n\nGaleri juga memperlihatkan suasana lesehan dan kolam ikan di lokasi. Elemen ini memberi kesan santai yang cocok untuk makan bersama keluarga atau teman.\n\nGunakan galeri ini sebagai gambaran sebelum berkunjung ke Durensewu, Kec. Pandaan.",
    rating: 4.4,
    reviews_label: "830 Ulasan",
    address: "Durensewu, Kec. Pandaan",
    opening_hours: "10.00 - 21.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.672783,112.684041",
    place_id: "ChIJJ7YpqNjZ1y0R1o8rvOVGrxY",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 25.000 - Rp 70.000",
    prices: [],
    operational_status: null,
    facilities: ["Lesehan", "Kolam ikan"],
    menus: [
      {
        name: "Ayam bakar madu",
        price: "Rp 32.000",
      },
      {
        name: "Gurami goreng",
        price: "Rp 65.000",
      },
      {
        name: "Patin asap",
        price: "Rp 45.000",
      },
      {
        name: "Lele goreng",
        price: "Rp 28.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "gubug-makan-mang-engking-pandaan",
    slug: "gubug-makan-mang-engking-pandaan",
    name: "Gubug Makan Mang Engking Pandaan",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.670973,
      longitude: 112.683457,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Gubug Makan Mang Engking Pandaan (belum tersedia)",
      },
    ],
    short_description:
      "Restoran terbuka dengan kolam, gazebo di atas air, dan menu paket; udang bakar madu disebut sebagai andalan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Gubug Makan Mang Engking Pandaan adalah restoran terbuka dengan kolam dan gazebo di atas air. Suasana ini membuat pengalaman makan terasa berbeda, apalagi bagi pengunjung yang datang bersama keluarga atau rombongan.\n\nTersedia menu paket yang memudahkan pemesanan untuk beberapa orang sekaligus. Udang bakar madu disebut sebagai menu andalan, sehingga tempat ini cocok bagi pencinta hidangan seafood.\n\nRestoran ini beralamat di Durensewu, Kec. Pandaan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan suasana dan hidangan Gubug Makan Mang Engking Pandaan, restoran terbuka dengan kolam dan gazebo di atas air. Foto-fotonya berfokus pada suasana makan yang khas serta hidangan andalan seperti udang bakar madu.\n\nGambaran menu paket juga membantu pengunjung membayangkan sajian untuk rombongan. Tempat ini cocok untuk makan bersama keluarga besar.\n\nLihat galeri ini sebelum berkunjung ke Durensewu, Kec. Pandaan, terutama untuk memilih gazebo dan menu yang sesuai kebutuhan rombongan.",
    rating: 4.4,
    reviews_label: "3.400 Ulasan",
    address: "Durensewu, Kec. Pandaan",
    opening_hours: "10.00 - 21.30 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.670973,112.683457",
    place_id: "ChIJFZE7ItnZ1y0R9OYXweBsltI",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "seafood",
    culinary_type: "seafood",
    price_range: "Rp 45.000 - Rp 130.000",
    prices: [],
    operational_status: null,
    facilities: ["Gazebo di atas air", "Kolam", "Menu paket", "Area terbuka"],
    menus: [
      {
        name: "Udang bakar madu",
        price: "Rp 75.000",
      },
      {
        name: "Paket keluarga",
        price: "Rp 250.000",
      },
      {
        name: "Gurame bakar",
        price: "Rp 95.000",
      },
      {
        name: "Cumi goreng tepung",
        price: "Rp 65.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "rawon-jetak-bu-sudar",
    slug: "rawon-jetak-bu-sudar",
    name: "Rawon Jetak Bu Sudar",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.672225,
      longitude: 112.703537,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Rawon Jetak Bu Sudar (belum tersedia)",
      },
    ],
    short_description:
      "Warung rawon di gang kecil; daging dan kuah disajikan terpisah. Alamat menyebut Jetak, Kedung, Karang Jati. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Rawon Jetak Bu Sudar adalah warung rawon yang berada di gang kecil. Ciri khasnya, daging dan kuah rawon disajikan terpisah, sehingga pengunjung dapat mengatur sendiri perpaduan keduanya.\n\nKarena lokasinya berada di gang kecil, pengunjung disarankan memperhatikan petunjuk arah saat menuju ke sana. Alamat pada data menyebut Jetak, Kedung, Karang Jati sebagai patokan lingkungan sekitar.\n\nWarung ini beralamat di Karangjati, Kec. Pandaan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan sajian rawon di Rawon Jetak Bu Sudar. Ciri khasnya, daging dan kuah disajikan terpisah, sehingga foto-fotonya menunjukkan penyajian yang berbeda dari rawon biasa.\n\nGaleri juga memperlihatkan suasana warung yang berada di gang kecil. Gambaran ini membantu pengunjung mengenali lokasi dan suasana sebelum datang.\n\nGunakan galeri ini sebagai referensi saat menuju Karangjati, Kec. Pandaan. Alamat pada data menyebut Jetak, Kedung, Karang Jati sebagai patokan lingkungan.",
    rating: 4.6,
    reviews_label: "410 Ulasan",
    address: "Karangjati, Kec. Pandaan",
    opening_hours: "06.00 - 14.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.672225,112.703537",
    place_id: "ChIJd5LSTf3Z1y0RoFziVJFcSJY",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 15.000 - Rp 30.000",
    prices: [],
    operational_status: null,
    facilities: [],
    menus: [
      {
        name: "Rawon daging",
        price: "Rp 22.000",
      },
      {
        name: "Rawon babat",
        price: "Rp 20.000",
      },
      {
        name: "Rawon empal",
        price: "Rp 24.000",
      },
      {
        name: "Rawon campur",
        price: "Rp 25.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "warung-artomoro",
    slug: "warung-artomoro",
    name: "Warung ARTOMORO",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.769176,
      longitude: 112.744014,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Warung ARTOMORO (belum tersedia)",
      },
    ],
    short_description:
      "Warung murah di jalur Surabaya-Malang; nasi goreng mawut disebut dalam ulasan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Warung ARTOMORO adalah warung makan dengan harga bersahabat yang berada di jalur Surabaya-Malang. Letaknya yang strategis membuatnya mudah dijadikan tempat singgah bagi pengendara yang sedang dalam perjalanan.\n\nMenurut ulasan, nasi goreng mawut menjadi salah satu menu yang disebut oleh pengunjung. Suasananya sederhana dan cocok bagi yang mencari makanan cepat dan terjangkau.\n\nWarung ini beralamat di Polerejo, Kec. Purwosari. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan hidangan di Warung ARTOMORO, warung murah di jalur Surabaya-Malang. Foto-fotonya berfokus pada nasi goreng mawut yang disebut dalam ulasan.\n\nGaleri juga menggambarkan suasana warung yang sederhana dan mudah dijadikan tempat singgah bagi pengendara. Gambaran ini membantu pengunjung mengenali tempat sebelum berhenti.\n\nLokasinya berada di Polerejo, Kec. Purwosari. Lihat galeri ini sebagai referensi saat merencanakan perjalanan lewat jalur tersebut.",
    rating: 4.1,
    reviews_label: "320 Ulasan",
    address: "Polerejo, Kec. Purwosari",
    opening_hours: "17.00 - 01.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.769176,112.744014",
    place_id: "ChIJxeje5d3T1y0RYR-fwoxQQsY",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 10.000 - Rp 25.000",
    prices: [],
    operational_status: null,
    facilities: [],
    menus: [
      {
        name: "Nasi goreng mawut",
        price: "Rp 15.000",
      },
      {
        name: "Mie goreng",
        price: "Rp 14.000",
      },
      {
        name: "Nasi goreng ayam",
        price: "Rp 17.000",
      },
      {
        name: "Kwetiau goreng",
        price: "Rp 18.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "ayam-kirana-purwodadi",
    slug: "ayam-kirana-purwodadi",
    name: "Ayam Kirana Purwodadi",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.793888,
      longitude: 112.739148,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Ayam Kirana Purwodadi (belum tersedia)",
      },
    ],
    short_description:
      "Ayam goreng berbumbu kuat; dusun Kademangan Kidul pada alamat. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Ayam Kirana Purwodadi menyajikan ayam goreng dengan bumbu yang kuat. Cita rasa bumbunya menjadi daya tarik bagi pengunjung yang menyukai ayam goreng dengan rasa yang menonjol.\n\nAlamat pada data menyebut dusun Kademangan Kidul, yang dapat dijadikan patokan lingkungan sekitar. Meski bernama Purwodadi, alamat Google tercatat di Kec. Purwosari, sehingga kecamatan tempat ini sebaiknya dicek kembali.\n\nTempat makan ini beralamat di Kertosari, Kec. Purwosari. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan ayam goreng berbumbu kuat di Ayam Kirana Purwodadi. Foto-fotonya berfokus pada tampilan ayam dan hidangan pendampingnya.\n\nGambaran sajian membantu pengunjung membayangkan cita rasa dan porsinya sebelum datang. Bagi pencinta ayam goreng, galeri ini dapat menjadi bahan pertimbangan.\n\nAlamat pada data menyebut dusun Kademangan Kidul di Kertosari, Kec. Purwosari. Meski bernama Purwodadi, kecamatan pada alamat Google tercatat Purwosari, sehingga lokasinya sebaiknya dicek sebelum berangkat.",
    rating: 4.5,
    reviews_label: "760 Ulasan",
    address: "Kertosari, Kec. Purwosari",
    opening_hours: "09.00 - 20.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.793888,112.739148",
    place_id: "ChIJOZ2ZRgDT1y0RtXGaN8fwLp8",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 20.000 - Rp 45.000",
    prices: [],
    operational_status: null,
    facilities: [],
    menus: [
      {
        name: "Ayam goreng + nasi",
        price: "Rp 28.000",
      },
      {
        name: "Ayam bakar + nasi",
        price: "Rp 30.000",
      },
      {
        name: "Ayam goreng kremes + nasi",
        price: "Rp 32.000",
      },
      {
        name: "Paket ayam 2 potong",
        price: "Rp 40.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "rawon-sakinah",
    slug: "rawon-sakinah",
    name: "Rawon Sakinah",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.641352,
      longitude: 112.909027,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Rawon Sakinah (belum tersedia)",
      },
    ],
    short_description:
      "Menu utama rawon, pecel, dan sambelan; sate komoh (sate daging berbumbu) paling dikenal. Alamat menyebut lingkungan Bangilan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Rawon Sakinah menyajikan rawon, pecel, dan sambelan sebagai menu utamanya. Di antara semuanya, sate komoh, yaitu sate daging berbumbu, menjadi menu yang paling dikenal oleh pengunjung.\n\nKombinasi rawon dan sate komoh menjadikan tempat ini cocok bagi yang ingin mencicipi kuliner khas Pasuruan dalam satu kali makan. Alamat pada data menyebut lingkungan Bangilan sebagai patokan lokasi.\n\nTempat makan ini beralamat di Panggungrejo, Kec. Panggungrejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan menu utama Rawon Sakinah, yaitu rawon, pecel, dan sambelan. Foto-fotonya juga memperlihatkan sate komoh, sate daging berbumbu yang paling dikenal di tempat ini.\n\nGambaran sajian membantu pengunjung membandingkan pilihan menu dan menentukan yang ingin dicoba. Perpaduan rawon dan sate komoh menjadi sorotan visual dalam galeri.\n\nLihat galeri ini sebelum berkunjung ke Panggungrejo, Kec. Panggungrejo. Alamat pada data menyebut lingkungan Bangilan sebagai patokan lokasi.",
    rating: 4.5,
    reviews_label: "1.280 Ulasan",
    address: "Panggungrejo, Kec. Panggungrejo",
    opening_hours: "06.00 - 15.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.641352,112.909027",
    place_id: "ChIJte8s1XTG1y0RVOitVvuJz_Q",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 15.000 - Rp 30.000",
    prices: [],
    operational_status: null,
    facilities: [],
    menus: [
      {
        name: "Rawon",
        price: "Rp 20.000",
      },
      {
        name: "Sate komoh",
        price: "Rp 25.000",
      },
      {
        name: "Nasi pecel",
        price: "Rp 15.000",
      },
      {
        name: "Nasi sambelan",
        price: "Rp 18.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "rawon-sederhana",
    slug: "rawon-sederhana",
    name: "Rawon Sederhana",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.643209,
      longitude: 112.909454,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Rawon Sederhana (belum tersedia)",
      },
    ],
    short_description:
      "Rawon dengan pilihan lidah dan sate daging. Pekuncen tercatat di Kec. Bugul Kidul pada alamat ini, tetapi di Kec. Panggungrejo pada tempat lain; perlu dicek ke poligon batas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Rawon Sederhana menyajikan rawon dengan pilihan tambahan lidah dan sate daging. Pilihan ini memberi variasi bagi pengunjung yang ingin menikmati rawon dengan isian yang berbeda.\n\nKecamatan untuk wilayah Pekuncen tercatat di Kec. Bugul Kidul pada alamat ini, tetapi di Kec. Panggungrejo pada tempat lain. Karena itu posisi administratifnya perlu dicek ke poligon batas wilayah dan tingkat keyakinan datanya masih rendah.\n\nTempat makan ini beralamat di Pekuncen, Kec. Bugul Kidul. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan sajian Rawon Sederhana, rawon dengan pilihan lidah dan sate daging. Foto-fotonya berfokus pada tampilan rawon serta pelengkapnya.\n\nGaleri membantu pengunjung membayangkan sajian sebelum datang, terutama bagi yang ingin mencoba rawon dengan tambahan lidah atau sate daging.\n\nKecamatan lokasi ini tercatat Bugul Kidul pada alamat Pekuncen, padahal tempat lain mencatat Panggungrejo. Posisi administratifnya perlu dicek ke poligon batas wilayah, jadi galeri ini bisa dipakai sebagai acuan visual saja.",
    rating: 4.3,
    reviews_label: "520 Ulasan",
    address: "Pekuncen, Kec. Bugul Kidul",
    opening_hours: "06.00 - 14.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.643209,112.909454",
    place_id: "ChIJFbiRDwvG1y0RnG46KS169tA",
    keyakinan: "rendah",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 15.000 - Rp 35.000",
    prices: [],
    operational_status: null,
    facilities: [],
    menus: [
      {
        name: "Rawon lidah",
        price: "Rp 28.000",
      },
      {
        name: "Rawon daging",
        price: "Rp 22.000",
      },
      {
        name: "Rawon campur",
        price: "Rp 25.000",
      },
      {
        name: "Sate daging",
        price: "Rp 30.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "bakso-cak-eb-pasuruan",
    slug: "bakso-cak-eb-pasuruan",
    name: "Bakso Cak'Eb Pasuruan",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.672042,
      longitude: 112.899905,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Bakso Cak'Eb Pasuruan (belum tersedia)",
      },
    ],
    short_description:
      "Bakso dengan varian bakso keju; suasana pinggir sawah. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Bakso Cak'Eb Pasuruan menyajikan bakso dengan beberapa varian, di antaranya bakso keju. Varian ini menjadi pilihan menarik bagi pengunjung yang ingin mencoba bakso dengan isian yang berbeda dari biasanya.\n\nTempat ini memiliki suasana pinggir sawah yang membuat makan terasa lebih santai dan segar. Lokasinya cocok untuk dikunjungi bersama keluarga atau teman sambil menikmati pemandangan sekitar.\n\nTempat makan ini beralamat di Tembokrejo, Kec. Purworejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan hidangan di Bakso Cak'Eb Pasuruan, termasuk varian bakso keju yang menjadi ciri tempat ini. Foto-fotonya berfokus pada tampilan semangkuk bakso dan isiannya.\n\nGaleri juga menggambarkan suasana pinggir sawah yang membuat makan terasa lebih santai. Pemandangan di sekitar lokasi menjadi bagian dari daya tarik tempat ini.\n\nLihat galeri ini sebagai gambaran sebelum berkunjung ke Tembokrejo, Kec. Purworejo, bersama keluarga atau teman.",
    rating: 4.4,
    reviews_label: "890 Ulasan",
    address: "Tembokrejo, Kec. Purworejo",
    opening_hours: "10.00 - 21.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.672042,112.899905",
    place_id: "ChIJR49G2W3P1y0RpnvHe-TujI0",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 12.000 - Rp 28.000",
    prices: [],
    operational_status: null,
    facilities: ["Suasana pinggir sawah"],
    menus: [
      {
        name: "Bakso keju",
        price: "Rp 20.000",
      },
      {
        name: "Bakso biasa",
        price: "Rp 15.000",
      },
      {
        name: "Bakso urat",
        price: "Rp 18.000",
      },
      {
        name: "Bakso komplit",
        price: "Rp 25.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "rumah-makan-budja",
    slug: "rumah-makan-budja",
    name: "Rumah Makan Budja",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.661464,
      longitude: 112.891923,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Rumah Makan Budja (belum tersedia)",
      },
    ],
    short_description:
      "Restoran dengan ruang privat dan mushola; aneka menu rumahan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Rumah Makan Budja adalah restoran yang menyajikan aneka menu rumahan. Hidangan bergaya rumahan membuatnya cocok bagi pengunjung yang mencari makanan yang akrab di lidah.\n\nTersedia ruang privat yang nyaman untuk pertemuan keluarga atau acara kecil, serta mushola yang memudahkan pengunjung beribadah. Fasilitas ini menjadikannya pilihan praktis untuk makan bersama rombongan.\n\nRestoran ini beralamat di Pohjentrek, Kec. Purworejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan aneka menu rumahan di Rumah Makan Budja. Foto-fotonya berfokus pada hidangan bergaya rumahan yang akrab di lidah.\n\nGaleri juga memperlihatkan fasilitas restoran, seperti ruang privat dan mushola. Gambaran ini membantu pengunjung menilai kenyamanan tempat untuk pertemuan keluarga atau acara kecil.\n\nGunakan galeri ini sebagai referensi saat merencanakan kunjungan ke Pohjentrek, Kec. Purworejo.",
    rating: 4.3,
    reviews_label: "610 Ulasan",
    address: "Pohjentrek, Kec. Purworejo",
    opening_hours: "09.00 - 21.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.661464,112.891923",
    place_id: "ChIJc-wVUDfF1y0Rck4EQmNbi5Y",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 25.000 - Rp 65.000",
    prices: [],
    operational_status: null,
    facilities: ["Ruang privat", "Mushola"],
    menus: [
      {
        name: "Menu rumahan (paket)",
        price: "Rp 35.000",
      },
      {
        name: "Ayam goreng",
        price: "Rp 30.000",
      },
      {
        name: "Ikan bakar",
        price: "Rp 45.000",
      },
      {
        name: "Capcay",
        price: "Rp 30.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "rm-nikmat-rasa-2",
    slug: "rm-nikmat-rasa-2",
    name: "RM Nikmat Rasa 2",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.646145,
      longitude: 112.915451,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto RM Nikmat Rasa 2 (belum tersedia)",
      },
    ],
    short_description:
      "Menu ayam dan capcay; pilihan menu luas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "RM Nikmat Rasa 2 adalah rumah makan dengan pilihan menu yang luas. Menu ayam dan capcay termasuk yang disebut dalam data, sehingga cocok bagi pengunjung yang menyukai masakan rumahan bergaya sehari-hari.\n\nPilihan menu yang beragam memudahkan rombongan dengan selera berbeda untuk makan bersama di satu tempat. Rumah makan ini dapat menjadi opsi praktis saat berkunjung ke kawasan Panggungrejo.\n\nRumah makan ini beralamat di Bugul Lor, Kec. Panggungrejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan pilihan menu di RM Nikmat Rasa 2, termasuk menu ayam dan capcay. Foto-fotonya menggambarkan variasi masakan rumahan yang tersedia.\n\nGaleri membantu pengunjung melihat keragaman menu sehingga lebih mudah memilih hidangan untuk rombongan dengan selera berbeda.\n\nLihat galeri ini sebelum berkunjung ke Bugul Lor, Kec. Panggungrejo, sebagai gambaran sajian yang bisa dipesan.",
    rating: 4.2,
    reviews_label: "450 Ulasan",
    address: "Bugul Lor, Kec. Panggungrejo",
    opening_hours: "09.00 - 21.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.646145,112.915451",
    place_id: "ChIJj_BDeA7G1y0R9ck4oSRyU_Q",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 20.000 - Rp 50.000",
    prices: [],
    operational_status: null,
    facilities: [],
    menus: [
      {
        name: "Ayam goreng",
        price: "Rp 25.000",
      },
      {
        name: "Capcay",
        price: "Rp 28.000",
      },
      {
        name: "Nasi goreng spesial",
        price: "Rp 28.000",
      },
      {
        name: "Ayam bakar",
        price: "Rp 30.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "kebon-pring-rumah-makan-lesehan",
    slug: "kebon-pring-rumah-makan-lesehan",
    name: "Kebon Pring Rumah Makan Lesehan",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.632315,
      longitude: 112.888644,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Kebon Pring Rumah Makan Lesehan (belum tersedia)",
      },
    ],
    short_description:
      "Area luas dengan taman, masjid, dan tempat bermain anak; ayam Kebon Pring disebut sebagai menu rekomendasi. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Kebon Pring Rumah Makan Lesehan memiliki area yang luas dengan taman yang asri. Suasana lesehan di tengah taman memberi pengalaman makan yang santai bagi pengunjung dari berbagai usia.\n\nDi area ini juga tersedia masjid dan tempat bermain anak, sehingga nyaman untuk keluarga dan rombongan. Ayam Kebon Pring disebut sebagai menu rekomendasi yang layak dicoba.\n\nRumah makan ini beralamat di Karangketug, Kec. Gadingrejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan hidangan dan suasana Kebon Pring Rumah Makan Lesehan. Foto-fotonya berfokus pada ayam Kebon Pring yang disebut sebagai menu rekomendasi.\n\nGaleri juga memperlihatkan area yang luas dengan taman, masjid, dan tempat bermain anak. Fasilitas ini membuat tempat ini nyaman untuk keluarga dan rombongan.\n\nGunakan galeri ini sebagai gambaran sebelum berkunjung ke Karangketug, Kec. Gadingrejo.",
    rating: 4.4,
    reviews_label: "1.750 Ulasan",
    address: "Karangketug, Kec. Gadingrejo",
    opening_hours: "09.00 - 21.30 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.632315,112.888644",
    place_id: "ChIJE56fV8_F1y0RIJ0kOruXmzY",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 25.000 - Rp 65.000",
    prices: [],
    operational_status: null,
    facilities: ["Lesehan", "Taman", "Masjid", "Tempat bermain anak"],
    menus: [
      {
        name: "Ayam Kebon Pring",
        price: "Rp 35.000",
      },
      {
        name: "Gurami goreng",
        price: "Rp 60.000",
      },
      {
        name: "Lele goreng",
        price: "Rp 28.000",
      },
      {
        name: "Bebek goreng",
        price: "Rp 45.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "d-jadul-ayam-bebek-bakar",
    slug: "d-jadul-ayam-bebek-bakar",
    name: "D'Jadul Ayam & Bebek Bakar",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.654528,
      longitude: 112.907294,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto D'Jadul Ayam & Bebek Bakar (belum tersedia)",
      },
    ],
    short_description:
      "Cwie mie, pangsit, dan bebek bakar; pembayaran tunai menurut ulasan. Kecamatan untuk Pekuncen berbeda antar sumber; perlu dicek ke poligon batas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "D'Jadul Ayam & Bebek Bakar menyajikan cwie mie, pangsit, dan bebek bakar. Perpaduan menu ini memberi pilihan bagi pengunjung yang ingin menikmati hidangan berkuah maupun olahan bakar.\n\nMenurut ulasan, pembayaran di tempat ini dilakukan secara tunai, sehingga pengunjung disarankan menyiapkan uang tunai. Kecamatan untuk wilayah Pekuncen juga berbeda antar sumber, sehingga posisi administratifnya perlu dicek ke poligon batas wilayah.\n\nTempat makan ini beralamat di Pekuncen, Kec. Bugul Kidul. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan hidangan di D'Jadul Ayam & Bebek Bakar, mulai dari cwie mie, pangsit, hingga bebek bakar. Foto-fotonya menggambarkan variasi sajian berkuah dan olahan bakar.\n\nGambaran hidangan membantu pengunjung menentukan menu yang ingin dicoba sebelum datang.\n\nMenurut ulasan, pembayaran dilakukan secara tunai, dan kecamatan Pekuncen berbeda antar sumber sehingga perlu dicek ke poligon batas wilayah. Siapkan uang tunai saat berkunjung dan gunakan galeri ini sebagai acuan visual.",
    rating: 4.3,
    reviews_label: "380 Ulasan",
    address: "Pekuncen, Kec. Bugul Kidul",
    opening_hours: "10.00 - 21.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.654528,112.907294",
    place_id: "ChIJGwM-cwfG1y0RDTz2Ynru1Ls",
    keyakinan: "rendah",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 20.000 - Rp 50.000",
    prices: [],
    operational_status: null,
    facilities: ["Pembayaran tunai"],
    menus: [
      {
        name: "Bebek bakar",
        price: "Rp 38.000",
      },
      {
        name: "Cwie mie",
        price: "Rp 18.000",
      },
      {
        name: "Ayam bakar",
        price: "Rp 30.000",
      },
      {
        name: "Pangsit goreng",
        price: "Rp 20.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "warung-wakro",
    slug: "warung-wakro",
    name: "Warung WakRo",
    regionId: "kota-pasuruan",
    place: {
      latitude: -7.667606,
      longitude: 112.900172,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Warung WakRo (belum tersedia)",
      },
    ],
    short_description:
      "Sayur asem, rawon, sop buntut; tempat duduk lesehan dan kursi. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Warung WakRo menyajikan beberapa hidangan berkuah dan masakan rumahan, di antaranya sayur asem, rawon, dan sop buntut. Pilihan ini cocok bagi pengunjung yang menyukai makanan dengan kuah hangat.\n\nTempat duduknya tersedia dalam dua gaya, yaitu lesehan dan kursi. Pengunjung dapat memilih sesuai kenyamanan, sehingga cocok untuk makan bersama keluarga dengan berbagai usia.\n\nWarung ini beralamat di Tembokrejo, Kec. Purworejo. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan hidangan di Warung WakRo, seperti sayur asem, rawon, dan sop buntut. Foto-fotonya berfokus pada sajian berkuah yang hangat dan masakan rumahan.\n\nGaleri juga memperlihatkan tempat duduk yang tersedia dalam dua gaya, yaitu lesehan dan kursi. Gambaran ini membantu pengunjung memilih gaya duduk yang sesuai.\n\nLihat galeri ini sebelum berkunjung ke Tembokrejo, Kec. Purworejo, sebagai referensi menu dan suasana.",
    rating: 4.4,
    reviews_label: "560 Ulasan",
    address: "Tembokrejo, Kec. Purworejo",
    opening_hours: "10.00 - 21.00 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.667606,112.900172",
    place_id: "ChIJEyLDo4DP1y0RXKqZeKj5g68",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 18.000 - Rp 55.000",
    prices: [],
    operational_status: null,
    facilities: ["Lesehan", "Kursi"],
    menus: [
      {
        name: "Sop buntut",
        price: "Rp 45.000",
      },
      {
        name: "Rawon",
        price: "Rp 22.000",
      },
      {
        name: "Sayur asem",
        price: "Rp 18.000",
      },
      {
        name: "Ayam goreng",
        price: "Rp 28.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "kedai-kikil-haekal",
    slug: "kedai-kikil-haekal",
    name: "Kedai Kikil Haekal",
    regionId: "pasuruan-barat",
    place: {
      latitude: -7.579715,
      longitude: 112.701822,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Kedai Kikil Haekal (belum tersedia)",
      },
    ],
    short_description:
      "Lontong kikil yang ramai; cepat habis, parkir mobil terbatas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Kedai Kikil Haekal dikenal dengan lontong kikilnya yang ramai dikunjungi. Hidangan ini menjadi daya tarik utama bagi pengunjung yang ingin menikmati sajian khas berbahan kikil.\n\nMenu di kedai ini cepat habis, sehingga pengunjung disarankan datang lebih awal. Area parkir mobil juga terbatas, jadi perlu mempertimbangkan kendaraan yang dibawa saat berkunjung.\n\nKedai ini beralamat di Winong, Kec. Gempol. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan lontong kikil di Kedai Kikil Haekal, hidangan yang ramai dikunjungi. Foto-fotonya berfokus pada tampilan lontong kikil dan pelengkapnya.\n\nGaleri membantu pengunjung membayangkan sajian sebelum datang. Karena menu cepat habis, gambaran ini bisa menjadi alasan untuk berkunjung lebih awal.\n\nParkir mobil di lokasi terbatas, jadi pertimbangkan kendaraan yang dibawa. Kedai berada di Winong, Kec. Gempol.",
    rating: 4.7,
    reviews_label: "980 Ulasan",
    address: "Winong, Kec. Gempol",
    opening_hours: "05.00 - 10.30 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.579715,112.701822",
    place_id: "ChIJm3kCQpPf1y0RB4Nmdk0NqJ4",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 12.000 - Rp 25.000",
    prices: [],
    operational_status: null,
    facilities: ["Parkir mobil terbatas"],
    menus: [
      {
        name: "Lontong kikil",
        price: "Rp 18.000",
      },
      {
        name: "Lontong kikil + telur",
        price: "Rp 22.000",
      },
      {
        name: "Lontong kikil spesial",
        price: "Rp 24.000",
      },
      {
        name: "Nasi kikil",
        price: "Rp 20.000",
      },
    ],
    is_dummy: true,
  },
  {
    id: "warung-rawon-sate-komo-nguling",
    slug: "warung-rawon-sate-komo-nguling",
    name: "Warung Rawon Sate Komo Nguling",
    regionId: "pasuruan-timur",
    place: {
      latitude: -7.717364,
      longitude: 113.077537,
    },
    media: [
      {
        type: "image",
        url: null,
        alt: "Foto Warung Rawon Sate Komo Nguling (belum tersedia)",
      },
    ],
    short_description:
      "Warung sejak sekitar 1980 menurut ulasan; paket rawon dan sate komo; buka pagi hari. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    description:
      "Warung Rawon Sate Komo Nguling adalah warung yang menurut ulasan sudah berdiri sejak sekitar tahun 1980. Usia warung yang cukup lama menunjukkan bahwa tempat ini sudah dikenal oleh warga sekitar dari generasi ke generasi.\n\nWarung ini menawarkan paket rawon dan sate komo, perpaduan hidangan khas Pasuruan yang sering dinikmati bersamaan. Warung ini buka pada pagi hari, sehingga cocok untuk sarapan atau makan di awal hari.\n\nWarung ini beralamat di Susu'an, Kec. Nguling. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    gallery_description:
      "Galeri ini menampilkan sajian di Warung Rawon Sate Komo Nguling, warung yang menurut ulasan sudah berdiri sejak sekitar tahun 1980. Foto-fotonya berfokus pada paket rawon dan sate komo.\n\nGaleri juga membantu pengunjung mengenal suasana warung yang telah lama dikenal warga. Perpaduan rawon dan sate komo menjadi sorotan visual.\n\nWarung ini buka pada pagi hari, sehingga cocok dikunjungi saat sarapan. Lokasinya berada di Susu'an, Kec. Nguling.",
    rating: 4.6,
    reviews_label: "300 Ulasan",
    address: "Susu'an, Kec. Nguling",
    opening_hours: "05.30 - 11.30 WIB",
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=-7.717364,113.077537",
    place_id: "ChIJr0B7o7621y0RBsOaHLbmt9I",
    keyakinan: "sedang",
    source: "destinasi-kuliner-pasuruan.json",
    verification: {
      status: "pending",
      verified_at: null,
    },
    featured: false,
    categoryId: "tradisional",
    culinary_type: "tradisional",
    price_range: "Rp 15.000 - Rp 30.000",
    prices: [],
    operational_status: null,
    facilities: [],
    menus: [
      {
        name: "Paket rawon + sate komo",
        price: "Rp 28.000",
      },
      {
        name: "Rawon daging",
        price: "Rp 20.000",
      },
      {
        name: "Sate komo",
        price: "Rp 24.000",
      },
      {
        name: "Rawon babat",
        price: "Rp 22.000",
      },
    ],
    is_dummy: true,
  },
];

/**
 * Hitung status buka/tutup dari string jam operasional (mis. "06.00 - 14.00 WIB").
 * Memakai zona waktu WIB (Asia/Jakarta) terlepas dari zona waktu perangkat.
 * Mendukung jam lintas tengah malam (mis. "17.00 - 01.00 WIB").
 * @returns {{status: "open"|"closing_soon"|"closed"|"unknown", label: string}}
 */
function getOperationalStatus(openingHours, now) {
  const m = /(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})/.exec(
    openingHours || "",
  );
  if (!m) return { status: "unknown", label: "Jam belum tersedia" };

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now || new Date());
  const cur =
    (Number(parts.find((p) => p.type === "hour").value) % 24) * 60 +
    Number(parts.find((p) => p.type === "minute").value);

  const open = Number(m[1]) * 60 + Number(m[2]);
  const close = Number(m[3]) * 60 + Number(m[4]);
  const isOpen =
    open <= close ? cur >= open && cur < close : cur >= open || cur < close;

  if (!isOpen) return { status: "closed", label: "Tutup" };
  const minsLeft = (close - cur + 1440) % 1440;
  return minsLeft <= 60
    ? { status: "closing_soon", label: "Segera Tutup" }
    : { status: "open", label: "Buka" };
}

/** Isi ulang operational_status semua item (panggil saat render agar selalu segar). */
function refreshOperationalStatus(now) {
  KULINER_CULINARIES.forEach((item) => {
    item.operational_status = getOperationalStatus(item.opening_hours, now);
  });
}

refreshOperationalStatus();

const PASINFO_KULINER = {
  regions: KULINER_REGIONS,
  categories: KULINER_CATEGORIES,
  culinaries: KULINER_CULINARIES,
  getOperationalStatus,
  refreshOperationalStatus,
};
if (typeof window !== "undefined") {
  window.PASINFO_KULINER = PASINFO_KULINER;
}
