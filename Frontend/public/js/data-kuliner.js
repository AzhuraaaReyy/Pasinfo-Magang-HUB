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
 * - Kategori halaman dipertahankan (tradisional/camilan/kopi/seafood);
 *   pemetaan subkategori→kategori via tabel di tools/build-kuliner-budaya.js.
 *   kopi-minuman + camilan-oleh-oleh = 0 item (tab kosong = empty-state).
 *
 * Dibangkitkan: node tools/build-kuliner-budaya.js (jangan edit manual).
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
  { id: "camilan-oleh-oleh", slug: "camilan-oleh-oleh", name: "Camilan & Oleh-oleh" },
  { id: "kopi-minuman", slug: "kopi-minuman", name: "Kopi & Minuman" },
  { id: "seafood", slug: "seafood", name: "Seafood" },
];

const KULINER_CULINARIES = [
  {
    "id": "nasi-punel-bu-hj-lin",
    "slug": "nasi-punel-bu-hj-lin",
    "name": "Nasi Punel Bu Hj. Lin",
    "regionId": "pasuruan-utara",
    "place": {
      "latitude": -7.600565,
      "longitude": 112.789212
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Nasi Punel Bu Hj. Lin (belum tersedia)"
      }
    ],
    "short_description": "Nasi punel khas Bangil dengan lauk empal, lidah, babat, dan ayam. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Nasi punel khas Bangil dengan lauk empal, lidah, babat, dan ayam. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Gempeng, Kec. Bangil",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.600565,112.789212",
    "place_id": "ChIJH8M8TkLb1y0RQL0COiosMLo",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "depot-nasi-punel-setia-budi-bangil",
    "slug": "depot-nasi-punel-setia-budi-bangil",
    "name": "Depot Nasi Punel Setia Budi Bangil",
    "regionId": "pasuruan-utara",
    "place": {
      "latitude": -7.598894,
      "longitude": 112.779461
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Depot Nasi Punel Setia Budi Bangil (belum tersedia)"
      }
    ],
    "short_description": "Nasi punel dengan pilihan lauk daging, ayam, dan jeroan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Nasi punel dengan pilihan lauk daging, ayam, dan jeroan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Pogar, Kec. Bangil",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.598894,112.779461",
    "place_id": "ChIJt-BnQW_b1y0RUYFKMqq6DAs",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "warung-pojok-nasi-punel-bangil",
    "slug": "warung-pojok-nasi-punel-bangil",
    "name": "Warung Pojok Nasi Punel Bangil",
    "regionId": "pasuruan-utara",
    "place": {
      "latitude": -7.599188,
      "longitude": 112.781702
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Warung Pojok Nasi Punel Bangil (belum tersedia)"
      }
    ],
    "short_description": "Warung kecil dengan tempat duduk terbatas dan sering antre; lokasi di gang kecil dari jalan utama. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Warung kecil dengan tempat duduk terbatas dan sering antre; lokasi di gang kecil dari jalan utama. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Kidul Dalem, Kec. Bangil",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.599188,112.781702",
    "place_id": "ChIJ_ZkYuGjb1y0RhcVsfCkdVLY",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "waroeng-sambel-bangil",
    "slug": "waroeng-sambel-bangil",
    "name": "Waroeng Sambel",
    "regionId": "pasuruan-utara",
    "place": {
      "latitude": -7.605421,
      "longitude": 112.770878
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Waroeng Sambel (belum tersedia)"
      }
    ],
    "short_description": "Rumah makan sambal di Jl. Raya Pandaan-Bangil dengan beberapa paket hidangan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Rumah makan sambal di Jl. Raya Pandaan-Bangil dengan beberapa paket hidangan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Pogar, Kec. Bangil",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.605421,112.770878",
    "place_id": "ChIJ3czZpHPb1y0R--KqLLg8qWI",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "warung-teko-beji",
    "slug": "warung-teko-beji",
    "name": "Warung Teko Beji",
    "regionId": "pasuruan-utara",
    "place": {
      "latitude": -7.597973,
      "longitude": 112.765038
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Warung Teko Beji (belum tersedia)"
      }
    ],
    "short_description": "Restoran bergazebo dengan kolam ikan dan area bermain anak; ayam bakar dan sayur asem disebut dalam ulasan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Restoran bergazebo dengan kolam ikan dan area bermain anak; ayam bakar dan sayur asem disebut dalam ulasan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Gajahbendo, Kec. Beji",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.597973,112.765038",
    "place_id": "ChIJlSwvOHjb1y0R-PagfucxwZ8",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "cairo-restaurant-bangil",
    "slug": "cairo-restaurant-bangil",
    "name": "Cairo Restaurant Bangil",
    "regionId": "pasuruan-utara",
    "place": {
      "latitude": -7.593659,
      "longitude": 112.784154
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Cairo Restaurant Bangil (belum tersedia)"
      }
    ],
    "short_description": "Menyajikan masakan Timur Tengah (sate disebut dalam ulasan); tempat duduk terbatas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Menyajikan masakan Timur Tengah (sate disebut dalam ulasan); tempat duduk terbatas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Bendomungal, Kec. Bangil",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.593659,112.784154",
    "place_id": "ChIJlZXem0Lb1y0RvECZzpZsa9s",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "sri-sultan-prigen",
    "slug": "sri-sultan-prigen",
    "name": "SRI Sultan Prigen Masakan Khas Nusantara",
    "regionId": "pasuruan-barat",
    "place": {
      "latitude": -7.666725,
      "longitude": 112.667427
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto SRI Sultan Prigen Masakan Khas Nusantara (belum tersedia)"
      }
    ],
    "short_description": "Terkenal dengan ayam goreng madu. Alamat Google menyebut Kec. Pandaan, padahal Candi Wates pada data Candi Jawi tercatat Kec. Prigen; kecamatan perlu dicek ke poligon batas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Terkenal dengan ayam goreng madu. Alamat Google menyebut Kec. Pandaan, padahal Candi Wates pada data Candi Jawi tercatat Kec. Prigen; kecamatan perlu dicek ke poligon batas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Candi Wates, Kec. Prigen",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.666725,112.667427",
    "place_id": "ChIJTxXuxZjZ1y0RAlyJ1H4aAaw",
    "keyakinan": "rendah",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "cimory-restaurant-prigen",
    "slug": "cimory-restaurant-prigen",
    "name": "Cimory Restaurant Prigen",
    "regionId": "pasuruan-barat",
    "place": {
      "latitude": -7.680053,
      "longitude": 112.639899
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Cimory Restaurant Prigen (belum tersedia)"
      }
    ],
    "short_description": "Restoran dalam kawasan Cimory Dairyland dengan menu Indonesia dan western; ada toko produk susu. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Restoran dalam kawasan Cimory Dairyland dengan menu Indonesia dan western; ada toko produk susu. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Plembon, Kec. Prigen",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.680053,112.639899",
    "place_id": "ChIJD527l4PX1y0R9qBfAdlvjkk",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "foodcourt-sawah-view",
    "slug": "foodcourt-sawah-view",
    "name": "Foodcourt Sawah View",
    "regionId": "pasuruan-barat",
    "place": {
      "latitude": -7.689035,
      "longitude": 112.685278
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Foodcourt Sawah View (belum tersedia)"
      }
    ],
    "short_description": "Food court terbuka menghadap sawah dengan area bermain anak. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Food court terbuka menghadap sawah dengan area bermain anak. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Bulukandang, Kec. Prigen",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.689035,112.685278",
    "place_id": "ChIJ5xKFcp7X1y0RO3ipmnPYnMU",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "warung-kepulan-asap",
    "slug": "warung-kepulan-asap",
    "name": "Warung Kepulan Asap",
    "regionId": "pasuruan-barat",
    "place": {
      "latitude": -7.657272,
      "longitude": 112.647414
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Warung Kepulan Asap (belum tersedia)"
      }
    ],
    "short_description": "Rumah makan ramah keluarga dengan konsep prasmanan dan pemandangan gunung. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Rumah makan ramah keluarga dengan konsep prasmanan dan pemandangan gunung. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Sekarjoho, Kec. Prigen",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.657272,112.647414",
    "place_id": "ChIJozRzK2zZ1y0RQ4kwmSLrq0o",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "warung-lesehan-pak-majid",
    "slug": "warung-lesehan-pak-majid",
    "name": "Warung Lesehan Pak Majid",
    "regionId": "pasuruan-barat",
    "place": {
      "latitude": -7.672783,
      "longitude": 112.684041
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Warung Lesehan Pak Majid (belum tersedia)"
      }
    ],
    "short_description": "Lesehan dengan ayam bakar madu, gurami goreng, dan patin asap; ada kolam ikan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Lesehan dengan ayam bakar madu, gurami goreng, dan patin asap; ada kolam ikan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Durensewu, Kec. Pandaan",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.672783,112.684041",
    "place_id": "ChIJJ7YpqNjZ1y0R1o8rvOVGrxY",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "gubug-makan-mang-engking-pandaan",
    "slug": "gubug-makan-mang-engking-pandaan",
    "name": "Gubug Makan Mang Engking Pandaan",
    "regionId": "pasuruan-barat",
    "place": {
      "latitude": -7.670973,
      "longitude": 112.683457
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Gubug Makan Mang Engking Pandaan (belum tersedia)"
      }
    ],
    "short_description": "Restoran terbuka dengan kolam, gazebo di atas air, dan menu paket; udang bakar madu disebut sebagai andalan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Restoran terbuka dengan kolam, gazebo di atas air, dan menu paket; udang bakar madu disebut sebagai andalan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Durensewu, Kec. Pandaan",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.670973,112.683457",
    "place_id": "ChIJFZE7ItnZ1y0R9OYXweBsltI",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "seafood",
    "culinary_type": "seafood",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "rawon-jetak-bu-sudar",
    "slug": "rawon-jetak-bu-sudar",
    "name": "Rawon Jetak Bu Sudar",
    "regionId": "pasuruan-barat",
    "place": {
      "latitude": -7.672225,
      "longitude": 112.703537
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Rawon Jetak Bu Sudar (belum tersedia)"
      }
    ],
    "short_description": "Warung rawon di gang kecil; daging dan kuah disajikan terpisah. Alamat menyebut Jetak, Kedung, Karang Jati. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Warung rawon di gang kecil; daging dan kuah disajikan terpisah. Alamat menyebut Jetak, Kedung, Karang Jati. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Karangjati, Kec. Pandaan",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.672225,112.703537",
    "place_id": "ChIJd5LSTf3Z1y0RoFziVJFcSJY",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "warung-artomoro",
    "slug": "warung-artomoro",
    "name": "Warung ARTOMORO",
    "regionId": "pasuruan-barat",
    "place": {
      "latitude": -7.769176,
      "longitude": 112.744014
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Warung ARTOMORO (belum tersedia)"
      }
    ],
    "short_description": "Warung murah di jalur Surabaya-Malang; nasi goreng mawut disebut dalam ulasan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Warung murah di jalur Surabaya-Malang; nasi goreng mawut disebut dalam ulasan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Polerejo, Kec. Purwosari",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.769176,112.744014",
    "place_id": "ChIJxeje5d3T1y0RYR-fwoxQQsY",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "ayam-kirana-purwodadi",
    "slug": "ayam-kirana-purwodadi",
    "name": "Ayam Kirana Purwodadi",
    "regionId": "pasuruan-barat",
    "place": {
      "latitude": -7.793888,
      "longitude": 112.739148
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Ayam Kirana Purwodadi (belum tersedia)"
      }
    ],
    "short_description": "Ayam goreng berbumbu kuat; dusun Kademangan Kidul pada alamat. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Ayam goreng berbumbu kuat; dusun Kademangan Kidul pada alamat. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Kertosari, Kec. Purwosari",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.793888,112.739148",
    "place_id": "ChIJOZ2ZRgDT1y0RtXGaN8fwLp8",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "rawon-sakinah",
    "slug": "rawon-sakinah",
    "name": "Rawon Sakinah",
    "regionId": "kota-pasuruan",
    "place": {
      "latitude": -7.641352,
      "longitude": 112.909027
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Rawon Sakinah (belum tersedia)"
      }
    ],
    "short_description": "Menu utama rawon, pecel, dan sambelan; sate komoh (sate daging berbumbu) paling dikenal. Alamat menyebut lingkungan Bangilan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Menu utama rawon, pecel, dan sambelan; sate komoh (sate daging berbumbu) paling dikenal. Alamat menyebut lingkungan Bangilan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Panggungrejo, Kec. Panggungrejo",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.641352,112.909027",
    "place_id": "ChIJte8s1XTG1y0RVOitVvuJz_Q",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "rawon-sederhana",
    "slug": "rawon-sederhana",
    "name": "Rawon Sederhana",
    "regionId": "kota-pasuruan",
    "place": {
      "latitude": -7.643209,
      "longitude": 112.909454
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Rawon Sederhana (belum tersedia)"
      }
    ],
    "short_description": "Rawon dengan pilihan lidah dan sate daging. Pekuncen tercatat di Kec. Bugul Kidul pada alamat ini, tetapi di Kec. Panggungrejo pada tempat lain; perlu dicek ke poligon batas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Rawon dengan pilihan lidah dan sate daging. Pekuncen tercatat di Kec. Bugul Kidul pada alamat ini, tetapi di Kec. Panggungrejo pada tempat lain; perlu dicek ke poligon batas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Pekuncen, Kec. Bugul Kidul",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.643209,112.909454",
    "place_id": "ChIJFbiRDwvG1y0RnG46KS169tA",
    "keyakinan": "rendah",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "bakso-cak-eb-pasuruan",
    "slug": "bakso-cak-eb-pasuruan",
    "name": "Bakso Cak'Eb Pasuruan",
    "regionId": "kota-pasuruan",
    "place": {
      "latitude": -7.672042,
      "longitude": 112.899905
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Bakso Cak'Eb Pasuruan (belum tersedia)"
      }
    ],
    "short_description": "Bakso dengan varian bakso keju; suasana pinggir sawah. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Bakso dengan varian bakso keju; suasana pinggir sawah. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Tembokrejo, Kec. Purworejo",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.672042,112.899905",
    "place_id": "ChIJR49G2W3P1y0RpnvHe-TujI0",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "rumah-makan-budja",
    "slug": "rumah-makan-budja",
    "name": "Rumah Makan Budja",
    "regionId": "kota-pasuruan",
    "place": {
      "latitude": -7.661464,
      "longitude": 112.891923
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Rumah Makan Budja (belum tersedia)"
      }
    ],
    "short_description": "Restoran dengan ruang privat dan mushola; aneka menu rumahan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Restoran dengan ruang privat dan mushola; aneka menu rumahan. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Pohjentrek, Kec. Purworejo",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.661464,112.891923",
    "place_id": "ChIJc-wVUDfF1y0Rck4EQmNbi5Y",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "rm-nikmat-rasa-2",
    "slug": "rm-nikmat-rasa-2",
    "name": "RM Nikmat Rasa 2",
    "regionId": "kota-pasuruan",
    "place": {
      "latitude": -7.646145,
      "longitude": 112.915451
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto RM Nikmat Rasa 2 (belum tersedia)"
      }
    ],
    "short_description": "Menu ayam dan capcay; pilihan menu luas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Menu ayam dan capcay; pilihan menu luas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Bugul Lor, Kec. Panggungrejo",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.646145,112.915451",
    "place_id": "ChIJj_BDeA7G1y0R9ck4oSRyU_Q",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "kebon-pring-rumah-makan-lesehan",
    "slug": "kebon-pring-rumah-makan-lesehan",
    "name": "Kebon Pring Rumah Makan Lesehan",
    "regionId": "kota-pasuruan",
    "place": {
      "latitude": -7.632315,
      "longitude": 112.888644
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Kebon Pring Rumah Makan Lesehan (belum tersedia)"
      }
    ],
    "short_description": "Area luas dengan taman, masjid, dan tempat bermain anak; ayam Kebon Pring disebut sebagai menu rekomendasi. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Area luas dengan taman, masjid, dan tempat bermain anak; ayam Kebon Pring disebut sebagai menu rekomendasi. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Karangketug, Kec. Gadingrejo",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.632315,112.888644",
    "place_id": "ChIJE56fV8_F1y0RIJ0kOruXmzY",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "d-jadul-ayam-bebek-bakar",
    "slug": "d-jadul-ayam-bebek-bakar",
    "name": "D'Jadul Ayam & Bebek Bakar",
    "regionId": "kota-pasuruan",
    "place": {
      "latitude": -7.654528,
      "longitude": 112.907294
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto D'Jadul Ayam & Bebek Bakar (belum tersedia)"
      }
    ],
    "short_description": "Cwie mie, pangsit, dan bebek bakar; pembayaran tunai menurut ulasan. Kecamatan untuk Pekuncen berbeda antar sumber; perlu dicek ke poligon batas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Cwie mie, pangsit, dan bebek bakar; pembayaran tunai menurut ulasan. Kecamatan untuk Pekuncen berbeda antar sumber; perlu dicek ke poligon batas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Pekuncen, Kec. Bugul Kidul",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.654528,112.907294",
    "place_id": "ChIJGwM-cwfG1y0RDTz2Ynru1Ls",
    "keyakinan": "rendah",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "warung-wakro",
    "slug": "warung-wakro",
    "name": "Warung WakRo",
    "regionId": "kota-pasuruan",
    "place": {
      "latitude": -7.667606,
      "longitude": 112.900172
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Warung WakRo (belum tersedia)"
      }
    ],
    "short_description": "Sayur asem, rawon, sop buntut; tempat duduk lesehan dan kursi. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Sayur asem, rawon, sop buntut; tempat duduk lesehan dan kursi. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Tembokrejo, Kec. Purworejo",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.667606,112.900172",
    "place_id": "ChIJEyLDo4DP1y0RXKqZeKj5g68",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "kedai-kikil-haekal",
    "slug": "kedai-kikil-haekal",
    "name": "Kedai Kikil Haekal",
    "regionId": "pasuruan-barat",
    "place": {
      "latitude": -7.579715,
      "longitude": 112.701822
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Kedai Kikil Haekal (belum tersedia)"
      }
    ],
    "short_description": "Lontong kikil yang ramai; cepat habis, parkir mobil terbatas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Lontong kikil yang ramai; cepat habis, parkir mobil terbatas. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Winong, Kec. Gempol",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.579715,112.701822",
    "place_id": "ChIJm3kCQpPf1y0RB4Nmdk0NqJ4",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
  {
    "id": "warung-rawon-sate-komo-nguling",
    "slug": "warung-rawon-sate-komo-nguling",
    "name": "Warung Rawon Sate Komo Nguling",
    "regionId": "pasuruan-timur",
    "place": {
      "latitude": -7.717364,
      "longitude": 113.077537
    },
    "media": [
      {
        "type": "image",
        "url": null,
        "alt": "Foto Warung Rawon Sate Komo Nguling (belum tersedia)"
      }
    ],
    "short_description": "Warung sejak sekitar 1980 menurut ulasan; paket rawon dan sate komo; buka pagi hari. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "description": "Warung sejak sekitar 1980 menurut ulasan; paket rawon dan sate komo; buka pagi hari. Kecamatan dan desa/kelurahan mengacu pada alamat di Google Places.",
    "rating": null,
    "reviews_label": null,
    "address": "Susu'an, Kec. Nguling",
    "opening_hours": null,
    "googleMapsUrl": "https://www.google.com/maps/search/?api=1&query=-7.717364,113.077537",
    "place_id": "ChIJr0B7o7621y0RBsOaHLbmt9I",
    "keyakinan": "sedang",
    "source": "destinasi-kuliner-pasuruan.json",
    "verification": {
      "status": "pending",
      "verified_at": null
    },
    "featured": false,
    "categoryId": "tradisional",
    "culinary_type": "tradisional",
    "price_range": null,
    "prices": [],
    "operational_status": null,
    "menus": []
  },
];

const PASINFO_KULINER = { regions: KULINER_REGIONS, categories: KULINER_CATEGORIES, culinaries: KULINER_CULINARIES };
if (typeof window !== "undefined") {
  window.PASINFO_KULINER = PASINFO_KULINER;
}
