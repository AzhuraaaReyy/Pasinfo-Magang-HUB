/**
 * Builder: data-kuliner.js + data-budaya.js dari JSON real Owner.
 * ============================================================
 * Sumber : public/data/destinasi-kuliner-pasuruan.json (25)
 *          public/data/destinasi-budaya-pasuruan.json  (25)
 *          (koordinat Google Places, keyakinan "sedang",
 *           BELUM diverifikasi poligon batas — jujur dicatat.)
 * Cara pakai: node tools/build-kuliner-budaya.js   (dari folder Frontend/)
 *
 * Keputusan mapping (terdokumentasi, reversibel):
 * - KEC_TO_REGION: empiris dari data-wisata.js (Kec. per regionId) +
 *   aturan kabupaten_kota "Kota Pasuruan" -> kota-pasuruan.
 *   INFERRED (butuh verifikasi Owner): Kraton -> utara, Kejayan -> selatan.
 * - KUL_CAT: mengandung "seafood" -> seafood, sisanya tradisional.
 *   Akibat jujur: kopi-minuman + camilan-oleh-oleh = 0 item (tab kosong,
 *   empty-state existing yang tampil). TIDAK membuat kategori baru (desain final).
 * - BUD_CAT: mengandung "museum" -> museum; "sanggar" -> kesenian;
 *   "pesantren" -> tradisi; sisanya situs-sejarah (tempat ibadah bersejarah,
 *   candi, makam, pura, landmark = warisan situs).
 * - verification.status = "pending" (UI: "Menunggu Verifikasi") — jujur,
 *   karena belum verifikasi poligon. add-sources-data.js di-guard agar
 *   TIDAK menimpa status non-null dengan pola acak.
 * - Field tanpa data (menu, harga, jam, rating) = null/[] — JANGAN difabrikasi.
 *   UI existing sudah punya fallback ("-", grid kosong, rating default).
 * - featured = false semua (tanpa sinyal editorial); fallback UI
 *   (slice 0-4) yang tampil. Hero slides tetap hardcoded terpisah.
 * - Bagian CALENDAR/GALLERY budaya (teaser mock terpisah) dipertahankan
 *   apa adanya — di luar scope data baru ini.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "public", "data");
const JS = path.join(ROOT, "public", "js");

const KEC_TO_REGION = {
  Bangil: "pasuruan-utara",
  Beji: "pasuruan-utara",
  Gempol: "pasuruan-barat",
  Nguling: "pasuruan-timur",
  Pandaan: "pasuruan-barat",
  Prigen: "pasuruan-barat",
  Purwosari: "pasuruan-barat",
  Purwodadi: "pasuruan-barat",
  Rejoso: "pasuruan-timur",
  Tosari: "pasuruan-selatan",
  // INFERRED — butuh verifikasi Owner (tidak ada di data wisata):
  Kraton: "pasuruan-utara",
  Kejayan: "pasuruan-selatan",
};

function regionOf(d) {
  if (d.kabupaten_kota === "Kota Pasuruan") return "kota-pasuruan";
  var r = KEC_TO_REGION[d.kecamatan];
  if (!r) throw new Error("kecamatan tak terpetakan: " + d.kecamatan);
  return r;
}

function kulCat(sub) {
  if (/seafood/i.test(sub)) return "seafood";
  return "tradisional";
}

function budCat(sub) {
  if (/museum/i.test(sub)) return "museum";
  if (/sanggar/i.test(sub)) return "kesenian";
  if (/^pesantren$/i.test(sub.trim())) return "tradisi";
  return "situs-sejarah";
}

function esc(s) {
  return JSON.stringify(s == null ? "" : String(s));
}

function baseItem(d, file) {
  var addr = d.desa_kelurahan + ", Kec. " + d.kecamatan;
  return {
    id: d.id,
    slug: d.id,
    name: d.nama,
    regionId: regionOf(d),
    place: { latitude: d.latitude, longitude: d.longitude },
    media: [{ type: "image", url: null, alt: "Foto " + d.nama + " (belum tersedia)" }],
    short_description: d.catatan,
    description: d.catatan,
    rating: null,
    reviews_label: null,
    address: addr,
    opening_hours: null,
    googleMapsUrl:
      "https://www.google.com/maps/search/?api=1&query=" + d.latitude + "," + d.longitude,
    place_id: d.place_id,
    keyakinan: d.keyakinan,
    source: file,
    verification: { status: "pending", verified_at: null },
    featured: false,
  };
}

function kulinerJS(list) {
  var items = list.map(function (d) {
    var b = baseItem(d, "destinasi-kuliner-pasuruan.json");
    b.categoryId = kulCat(d.subkategori);
    b.culinary_type = b.categoryId;
    b.price_range = null;
    b.prices = [];
    b.operational_status = null;
    b.menus = [];
    return b;
  });
  var lines = items.map(function (it) {
    return (
      "  " + JSON.stringify(it, null, 2).split("\n").join("\n  ") + ","
    );
  });
  return { items: lines, dist: catDist(list, kulCat) };
}

function budayaJS(list) {
  var items = list.map(function (d) {
    var b = baseItem(d, "destinasi-budaya-pasuruan.json");
    b.categoryId = budCat(d.subkategori);
    b.culture_type = b.categoryId;
    b.historical_period = null;
    b.status = "published";
    b.gallery = [];
    // urutan field mengikuti factory lama (categoryId/regionId di depan)
    return b;
  });
  var lines = items.map(function (it) {
    return (
      "  " + JSON.stringify(it, null, 2).split("\n").join("\n  ") + ","
    );
  });
  return { items: lines, dist: catDist(list, budCat) };
}

function catDist(list, fn) {
  var c = {};
  list.forEach(function (d) {
    var k = fn(d.subkategori);
    c[k] = (c[k] || 0) + 1;
  });
  return c;
}

function extractSection(src, startMark, endMark) {
  var a = src.indexOf(startMark);
  if (a === -1) throw new Error("marker awal tak ketemu: " + startMark);
  var b = src.indexOf(endMark, a);
  if (b === -1) throw new Error("marker akhir tak ketemu: " + endMark);
  return src.slice(a, b + endMark.length);
}

function main() {
  var kul = JSON.parse(fs.readFileSync(path.join(DATA, "destinasi-kuliner-pasuruan.json"), "utf8"));
  var bud = JSON.parse(fs.readFileSync(path.join(DATA, "destinasi-budaya-pasuruan.json"), "utf8"));

  var kSrc = fs.readFileSync(path.join(JS, "data-kuliner.js"), "utf8");
  var bSrc = fs.readFileSync(path.join(JS, "data-budaya.js"), "utf8");

  var headerK = [
    "/**",
    " * DATA KULINER — Pasuruan Info (DATA REAL Owner, BUKAN mock).",
    " * ==========================================================",
    " * Sumber: public/data/destinasi-kuliner-pasuruan.json (25 destinasi).",
    " * Koordinat Google Places (keyakinan \"sedang\"); BELUM diverifikasi",
    " * terhadap poligon batas wilayah — verification.status = \"pending\"",
    " * (UI: \"Menunggu Verifikasi\"). Jangan tampilkan sebagai terverifikasi.",
    " *",
    " * - place.latitude/longitude REAL per tempat (dipakai peta + jarak Sekitar).",
    " * - media[].url null → UI memakai placeholder lokal (tanpa foto).",
    " * - Field tanpa data (menu, harga, jam, rating) = null/[] — fallback UI.",
    " * - Kategori halaman dipertahankan (tradisional/camilan/kopi/seafood);",
    " *   pemetaan subkategori→kategori via tabel di tools/build-kuliner-budaya.js.",
    " *   kopi-minuman + camilan-oleh-oleh = 0 item (tab kosong = empty-state).",
    " *",
    " * Dibangkitkan: node tools/build-kuliner-budaya.js (jangan edit manual).",
    " */",
    "",
  ].join("\n");

  var headerB = [
    "/**",
    " * DATA BUDAYA — Pasuruan Info (DATA REAL Owner, BUKAN mock).",
    " * ========================================================",
    " * Sumber: public/data/destinasi-budaya-pasuruan.json (25 destinasi).",
    " * Koordinat Google Places (keyakinan \"sedang\"); BELUM diverifikasi",
    " * terhadap poligon batas wilayah — verification.status = \"pending\".",
    " *",
    " * - Kategori halaman dipertahankan (tradisi/kesenian/situs/museum).",
    " * - CALENDAR/GALLERY teaser mock dipertahankan (di luar scope data ini).",
    " *",
    " * Dibangkitkan: node tools/build-kuliner-budaya.js (jangan edit manual).",
    " */",
    "",
  ].join("\n");

  var kRegions = extractSection(kSrc, "const KULINER_REGIONS", "];");
  var kCats = extractSection(kSrc, "const KULINER_CATEGORIES", "];");
  var bRegions = extractSection(bSrc, "const BUDAYA_REGIONS", "];");
  var bCats = extractSection(bSrc, "const BUDAYA_CATEGORIES", "];");
  var bCal = extractSection(bSrc, "const BUDAYA_CALENDAR", "];");
  var bGal = extractSection(bSrc, "const BUDAYA_GALLERY", "];");

  var k = kulinerJS(kul);
  var b = budayaJS(bud);

  var outK = [
    headerK,
    kRegions,
    "",
    kCats,
    "",
    "const KULINER_CULINARIES = [",
    k.items.join("\n"),
    "];",
    "",
    "const PASINFO_KULINER = { regions: KULINER_REGIONS, categories: KULINER_CATEGORIES, culinaries: KULINER_CULINARIES };",
    'if (typeof window !== "undefined") {',
    "  window.PASINFO_KULINER = PASINFO_KULINER;",
    "}",
    "",
  ].join("\n");

  var outB = [
    headerB,
    bRegions,
    "",
    bCats,
    "",
    "const BUDAYA_CULTURES = [",
    b.items.join("\n"),
    "];",
    "",
    bCal,
    "",
    bGal,
    "",
    "const PASINFO_BUDAYA = {",
    "  categories: BUDAYA_CATEGORIES,",
    "  cultures: BUDAYA_CULTURES,",
    "  regions: BUDAYA_REGIONS,",
    "  calendar: BUDAYA_CALENDAR,",
    "  gallery: BUDAYA_GALLERY,",
    "};",
    'if (typeof window !== "undefined") {',
    "  window.PASINFO_BUDAYA = PASINFO_BUDAYA;",
    "}",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(JS, "data-kuliner.js"), outK);
  fs.writeFileSync(path.join(JS, "data-budaya.js"), outB);
  console.log("kuliner: 25 items", JSON.stringify(k.dist));
  console.log("budaya: 25 items", JSON.stringify(b.dist));
  console.log("DONE");
}

main();
