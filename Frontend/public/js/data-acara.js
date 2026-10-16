/**
 * DATA ACARA — Pasuruan Info (MOCK / PLACEHOLDER)
 * ==============================================
 * STATUS: MOCK. Seluruh isi file ini adalah placeholder untuk pengembangan
 * dan pengujian layout frontend. BUKAN informasi acara nyata.
 *
 * - Nama, jadwal, venue, penyelenggara, harga tiket, dan URL adalah nilai
 *   generik placeholder (atau null); JANGAN tampilkan sebagai fakta nyata.
 * - `occurrences[].starts_at/ends_at` berisi TANGGAL MOCK yang koheren
 *   (ISO +07:00, Nov–Des 2026; 2 event dijangkarkan ke "hari berjalan"
 *   saat runtime agar sorotan Hari Ini selalu hidup). Kalender, sorotan
 *   Hari Ini, dan countdown DIHITUNG dari field ini — bukan dummy.
 *   Saat backend dibangun, ganti nilai dengan DATETIME nyata (WIB);
 *   bentuk field sudah sesuai `event_occurrences` (lihat bawah).
 * - `tickets[].price` null = Gratis; angka = harga rupiah (mock).
 *   `ticket_url/registration_url` null → UI hanya menampilkan INFORMASI
 *   tiket (teks + tautan placeholder nonaktif). Booking/payment TIDAK
 *   termasuk scope (lihat prd.md §19.2).
 * - `place` memakai center region (coordinates fallback, bukan titik
 *   terverifikasi); `venue_address` + `organizer_name` terisi mock per
 *   event (ACARA_VENUES, mentah bertanda MOCK).
 * - `googleMapsUrl` = URL pencarian Maps dari koordinat place (fungsional).
 * - `media[].url` bernilai null → UI memakai placeholder (tanpa foto).
 * - `organizer_phone/website_url` null (belum terverifikasi; tampil "—").
 * - `verification.status` null dan `source: "mock"` menandai belum
 *   terverifikasi.
 *
 * Bentuk data mengikuti `events` + `event_occurrences` + `event_tickets`
 * pada `schema.md` (§15–§17) agar transisi mock → API tidak mengubah
 * component: occurrences {id, starts_at, ends_at, status, notes};
 * tickets {id, name, price, description, ticket_url, registration_url,
 * available}. Tipe Gratis/Berbayar DITURUNKAN dari `price` di UI
 * (bukan kolom), sesuai scope tiket-informasi prd.md §19.2.
 * `capacity` (INT nullable, mock) = kuota peserta; null = "Tanpa Batas".
 * CATATAN BACKEND: schema.md BELUM mengatur kuota/peserta (grep kosong
 * di prd/design/schema) — `capacity` adalah kandidat kolom
 * `events.capacity` (nullable) saat migrasi; sinkronkan schema.md dulu
 * sebelum implementasi backend.
 * Label kategori mengikuti tab filter pada mockup
 * `public/assets/mockup/acara.png` (Semua, Kesenian, Tradisi, Sejarah,
 * Museum) sebagai label UI mock — bukan taksonomi terverifikasi.
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

/* Nilai generik SAMA untuk semua item (DUMMY — lihat header). */
const ACARA_MOCK = {
  venue_address: "Lokasi menyusul (MOCK), Pasuruan",
  verification: { status: null, verified_at: null },
  source: "mock",
};

/* Deskripsi 3 paragraf per event (MOCK). Paragraf dipisahkan "\n\n".
   Seluruhnya placeholder; bukan informasi acara nyata. */
const ACARA_DESCRIPTIONS = {
  "festival-seni-mock":
    "Festival Seni Mock adalah contoh acara pertunjukan seni komunitas yang menampilkan penampilan dari berbagai grup seni lokal. Acara seperti ini biasanya menjadi ruang temu bagi seniman, pelajar, dan warga untuk menikmati karya secara langsung.\n\nDalam data contoh ini, rangkaian acara digambarkan terdiri dari beberapa penampilan dengan ragam bentuk seni. Tujuannya adalah membantu pengujian tampilan halaman agar deskripsi acara terlihat lengkap dan mudah dibaca oleh pengguna.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan informasi tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "konser-komunitas-mock":
    "Konser Komunitas Mock adalah contoh panggung musik yang memberi ruang bagi musisi independen dan grup band lokal. Acara semacam ini umumnya mempertemukan pelaku musik dengan penikmatnya dalam suasana yang akrab.\n\nDalam data contoh ini, konser digambarkan sebagai acara berbayar dengan sejumlah penampil dari komunitas musik setempat. Deskripsi ini disediakan agar halaman detail acara dapat diuji dengan teks yang cukup panjang dan terstruktur.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan harga tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "kirab-tradisi-mock":
    "Kirab Tradisi Mock adalah contoh arak-arakan tradisi tahunan yang menampilkan kostum dan musik tradisional Pasuruan. Kirab biasanya menjadi sarana warga untuk merayakan dan melestarikan tradisi yang diwariskan antargenerasi.\n\nDalam data contoh ini, kirab digambarkan sebagai acara terbuka dan gratis yang dapat disaksikan masyarakat umum. Gambaran tersebut dipakai untuk menguji bagaimana deskripsi acara tradisi tampil pada kartu maupun halaman detail.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, rute, penyelenggara, dan informasi tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "ritual-panen-mock":
    "Ritual Panen Mock adalah contoh acara syukuran panen warga yang diisi dengan kegiatan gotong royong dan makan bersama. Tradisi seperti ini mencerminkan rasa syukur dan kebersamaan masyarakat pada hasil bumi mereka.\n\nDalam data contoh ini, acara digambarkan berlangsung secara sederhana dan terbuka bagi komunitas setempat. Deskripsi ini membantu menguji tampilan konten acara tradisi di wilayah Pasuruan bagian selatan.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan informasi tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "pawai-sejarah-mock":
    "Pawai Sejarah Mock adalah contoh pawai napak tilas yang mengikuti jejak sejarah Kota Pasuruan dari masa lampau. Acara seperti ini mengajak peserta dan penonton mengenali perjalanan kota melalui penampilan dan cerita.\n\nDalam data contoh ini, pawai digambarkan sebagai acara gratis yang cocok untuk keluarga, pelajar, dan pemerhati sejarah. Gambaran tersebut dipakai untuk menguji tampilan deskripsi pada kategori sejarah.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, rute, penyelenggara, dan informasi tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "jelajah-sejarah-mock":
    "Jelajah Sejarah Mock adalah contoh tur edukasi sejarah yang dipandu oleh pemandu berpengalaman untuk mengunjungi situs-situs bersejarah. Kegiatan seperti ini memberi kesempatan peserta belajar langsung di lokasi, bukan hanya dari buku.\n\nDalam data contoh ini, tur digambarkan sebagai acara berbayar dengan rute melewati beberapa situs. Deskripsi ini disediakan agar halaman acara dapat diuji dengan informasi yang runtut dan mudah dipahami.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, rute, penyelenggara, dan harga tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "pameran-museum-mock":
    "Pameran Museum Mock adalah contoh pameran koleksi artefak dan benda bersejarah dari koleksi privat maupun publik. Pameran semacam ini membantu pengunjung mengenal peninggalan sejarah dan budaya secara lebih dekat.\n\nDalam data contoh ini, pameran digambarkan sebagai acara gratis yang dapat dikunjungi masyarakat umum. Gambaran tersebut dipakai untuk menguji tampilan deskripsi acara pada kategori museum.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan informasi tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "workshop-koleksi-mock":
    "Workshop Koleksi Mock adalah contoh lokakarya kurasi bagi pemula yang ingin belajar mengelola koleksi museum. Kegiatan seperti ini memperkenalkan dasar perawatan, pencatatan, dan penataan koleksi.\n\nDalam data contoh ini, workshop digambarkan sebagai acara berbayar dengan peserta terbatas. Deskripsi ini membantu menguji bagaimana informasi kegiatan belajar ditampilkan pada halaman acara.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan harga tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "pasar-seni-mock":
    "Pasar Seni Mock adalah contoh bazar karya perupa yang menampilkan lukisan, patung, dan kerajinan dari seniman lokal. Acara seperti ini mempertemukan seniman langsung dengan pengunjung yang ingin melihat atau memiliki karya.\n\nDalam data contoh ini, pasar seni digambarkan sebagai acara gratis dengan beragam karya yang dapat dinikmati sambil berjalan santai. Gambaran tersebut dipakai untuk menguji tampilan deskripsi pada kategori kesenian.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan informasi tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "gelar-wayang-mock":
    "Gelar Wayang Kulit Mock adalah contoh pertunjukan wayang kulit tradisional dengan cerita dari kitab Ramayana dan Mahabharata. Wayang kulit dikenal sebagai kesenian yang memadukan cerita, musik, dan nilai kehidupan.\n\nDalam data contoh ini, pertunjukan digambarkan sebagai acara gratis yang terbuka bagi masyarakat umum. Deskripsi ini dipakai untuk menguji tampilan konten acara tradisi di wilayah Pasuruan bagian selatan.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan informasi tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "seminar-budaya-mock":
    "Seminar Budaya Lokal Mock adalah contoh seminar diskusi tentang pelestarian warisan budaya Pasuruan untuk generasi mendatang. Forum seperti ini menjadi tempat bertukar pandangan antara budayawan, akademisi, dan masyarakat.\n\nDalam data contoh ini, seminar digambarkan sebagai acara gratis dengan sesi pemaparan dan tanya jawab. Gambaran tersebut dipakai untuk menguji tampilan deskripsi acara pada kategori sejarah.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan informasi tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "festival-kuliner-mock":
    "Festival Makanan Tradisional Mock adalah contoh festival kuliner yang menampilkan masakan tradisional dan inovasi makanan dari koki lokal. Festival seperti ini memperkenalkan cita rasa daerah sekaligus mendukung pelaku usaha kuliner setempat.\n\nDalam data contoh ini, festival digambarkan sebagai acara berbayar dengan beragam stan makanan. Deskripsi ini disediakan agar halaman acara dapat diuji dengan teks yang lengkap dan terstruktur.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan harga tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "pameran-fotografi-mock":
    "Pameran Fotografi Sejarah Mock adalah contoh pameran fotografi dokumenter tentang transformasi Kota Pasuruan selama satu abad terakhir. Foto-foto semacam ini membantu pengunjung melihat perubahan wajah kota dari masa ke masa.\n\nDalam data contoh ini, pameran digambarkan sebagai acara gratis yang dapat dikunjungi siapa saja. Gambaran tersebut dipakai untuk menguji tampilan deskripsi acara pada kategori museum.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan informasi tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "konser-musik-tradisional-mock":
    "Konser Musik Tradisional Mock adalah contoh pertunjukan gamelan dan musik tradisional dengan format orkestra musik klasik Indonesia. Pertunjukan seperti ini menampilkan kekayaan bunyi dan keterampilan para pemain musik tradisi.\n\nDalam data contoh ini, konser digambarkan sebagai acara berbayar dan ditandai sebagai acara unggulan. Deskripsi ini dipakai untuk menguji tampilan acara pilihan pada halaman utama maupun halaman acara.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan harga tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "festival-teater-mock":
    "Festival Teater Pelajar Mock adalah contoh kompetisi dan pameran teater dari sekolah-sekolah dengan berbagai genre pertunjukan. Festival seperti ini menjadi wadah bagi pelajar untuk berlatih, tampil, dan saling belajar.\n\nDalam data contoh ini, festival digambarkan sebagai acara gratis yang dapat disaksikan keluarga dan masyarakat umum. Gambaran tersebut dipakai untuk menguji tampilan deskripsi acara pada kategori kesenian.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan informasi tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
  "jelajah-museum-malam-mock":
    "Jelajah Museum Malam Mock adalah contoh tur museum khusus malam hari dengan suasana penuh misteri dan pencerahan sejarah. Kunjungan di malam hari memberi pengalaman yang berbeda dibandingkan kunjungan pada siang hari.\n\nDalam data contoh ini, tur digambarkan sebagai acara berbayar dengan pemandu yang menceritakan koleksi dan sejarahnya. Deskripsi ini membantu menguji tampilan informasi acara pada kategori museum.\n\nSeluruh informasi pada halaman ini masih berupa data contoh (mock). Jadwal, lokasi, penyelenggara, dan harga tiket menyusul dan belum dapat dijadikan rujukan acara yang sebenarnya.",
};

function acaraItem(
  id,
  slug,
  name,
  categoryId,
  regionId,
  short_description,
  price,
  featured,
  startsAt,
  endsAt,
  capacity,
) {
  // Dapatkan koordinat region untuk fallback lokasi
  var region = ACARA_REGIONS.find(function (r) {
    return r.id === regionId;
  });
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
    description: ACARA_DESCRIPTIONS[id] || null,
    status: "published",
    featured: !!featured,
    capacity: capacity == null ? null : capacity,
    venue_name: null,
    venue_address: ACARA_MOCK.venue_address,
    place: { latitude: latitude, longitude: longitude },
    occurrences: [
      {
        id: slug + "-occ-1",
        starts_at: startsAt,
        ends_at: endsAt,
        status: "scheduled",
        notes: null,
      },
    ],
    tickets: [
      {
        id: slug + "-tiket-1",
        name: "Tiket masuk (MOCK)",
        price: price,
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
  acaraItem(
    "festival-seni-mock",
    "festival-seni-mock",
    "Festival Seni Mock",
    "kesenian",
    "pasuruan-timur",
    "pertunjukan seni komunitas dengan penampilan dari berbagai grup seni lokal (mock)",
    null,
    true,
    "2026-11-08T09:00:00+07:00",
    "2026-11-08T17:00:00+07:00",
    500,
  ),
  acaraItem(
    "konser-komunitas-mock",
    "konser-komunitas-mock",
    "Konser Komunitas Mock",
    "kesenian",
    "pasuruan-barat",
    "panggung musik komunitas untuk musisi independen dan grup band lokal (mock)",
    25000,
    false,
    "2026-11-15T19:00:00+07:00",
    "2026-11-15T22:00:00+07:00",
    300,
  ),
  acaraItem(
    "kirab-tradisi-mock",
    "kirab-tradisi-mock",
    "Kirab Tradisi Mock",
    "tradisi",
    "kota-pasuruan",
    "arak-arakan tradisi tahunan dengan kostum dan musik tradisional Pasuruan (mock)",
    null,
    true,
    "2026-11-22T07:00:00+07:00",
    "2026-11-22T11:00:00+07:00",
    null,
  ),
  acaraItem(
    "ritual-panen-mock",
    "ritual-panen-mock",
    "Ritual Panen Mock",
    "tradisi",
    "pasuruan-selatan",
    "syukuran panen warga dengan acara gotong royong dan makan bersama komunitas (mock)",
    null,
    false,
    "2026-11-29T08:00:00+07:00",
    "2026-11-29T12:00:00+07:00",
    100,
  ),
  acaraItem(
    "pawai-sejarah-mock",
    "pawai-sejarah-mock",
    "Pawai Sejarah Mock",
    "sejarah",
    "pasuruan-utara",
    "pawai napak tilas mengikuti jejak sejarah kota Pasuruan dari abad lampau (mock)",
    null,
    false,
    "2026-12-06T07:30:00+07:00",
    "2026-12-06T10:30:00+07:00",
    null,
  ),
  acaraItem(
    "jelajah-sejarah-mock",
    "jelajah-sejarah-mock",
    "Jelajah Sejarah Mock",
    "sejarah",
    "pasuruan-barat",
    "tur edukasi sejarah dengan pemandu berpengalaman mengunjungi situs-situs bersejarah (mock)",
    50000,
    false,
    "2026-12-13T08:00:00+07:00",
    "2026-12-13T12:00:00+07:00",
    50,
  ),
  acaraItem(
    "pameran-museum-mock",
    "pameran-museum-mock",
    "Pameran Museum Mock",
    "museum",
    "kota-pasuruan",
    "pameran koleksi artefak dan benda bersejarah dari koleksi privat dan publik (mock)",
    null,
    true,
    "2026-12-20T10:00:00+07:00",
    "2026-12-20T18:00:00+07:00",
    200,
  ),
  acaraItem(
    "workshop-koleksi-mock",
    "workshop-koleksi-mock",
    "Workshop Koleksi Mock",
    "museum",
    "pasuruan-timur",
    "lokakarya kurasi untuk pemula yang ingin belajar pengelolaan koleksi museum (mock)",
    25000,
    false,
    "2026-12-27T09:00:00+07:00",
    "2026-12-27T12:00:00+07:00",
    30,
  ),
  acaraItem(
    "pasar-seni-mock",
    "pasar-seni-mock",
    "Pasar Seni Mock",
    "kesenian",
    "pasuruan-barat",
    "bazar karya perupa menampilkan lukisan, patung, dan kerajinan dari seniman lokal (mock)",
    null,
    false,
    "2026-11-10T09:00:00+07:00",
    "2026-11-10T16:00:00+07:00",
    null,
  ),
  acaraItem(
    "gelar-wayang-mock",
    "gelar-wayang-mock",
    "Gelar Wayang Kulit Mock",
    "tradisi",
    "pasuruan-selatan",
    "pertunjukan wayang kulit tradisional dengan cerita dari kitab Ramayana dan Mahabharata (mock)",
    null,
    true,
    "2026-11-17T20:00:00+07:00",
    "2026-11-17T23:00:00+07:00",
    400,
  ),
  acaraItem(
    "seminar-budaya-mock",
    "seminar-budaya-mock",
    "Seminar Budaya Lokal Mock",
    "sejarah",
    "pasuruan-utara",
    "seminar diskusi tentang pelestarian warisan budaya Pasuruan untuk generasi mendatang (mock)",
    null,
    false,
    "2026-11-24T09:00:00+07:00",
    "2026-11-24T12:00:00+07:00",
    150,
  ),
  acaraItem(
    "festival-kuliner-mock",
    "festival-kuliner-mock",
    "Festival Makanan Tradisional Mock",
    "kesenian",
    "kota-pasuruan",
    "festival kuliner menampilkan masakan tradisional dan inovasi food dari chef lokal (mock)",
    25000,
    false,
    "2026-12-01T10:00:00+07:00",
    "2026-12-01T22:00:00+07:00",
    1000,
  ),
  acaraItem(
    "pameran-fotografi-mock",
    "pameran-fotografi-mock",
    "Pameran Fotografi Sejarah Mock",
    "museum",
    "pasuruan-timur",
    "pameran fotografi dokumenter tentang transformasi kota Pasuruan selama satu abad terakhir (mock)",
    null,
    false,
    "2026-12-08T10:00:00+07:00",
    "2026-12-08T17:00:00+07:00",
    200,
  ),
  acaraItem(
    "konser-musik-tradisional-mock",
    "konser-musik-tradisional-mock",
    "Konser Musik Tradisional Mock",
    "tradisi",
    "pasuruan-barat",
    "pertunjukan gamelan dan musik tradisional dengan orkestra musik klasik Indonesia penuh (mock)",
    50000,
    true,
    "2026-12-15T19:30:00+07:00",
    "2026-12-15T22:00:00+07:00",
    300,
  ),
  acaraItem(
    "festival-teater-mock",
    "festival-teater-mock",
    "Festival Teater Pelajar Mock",
    "kesenian",
    "kota-pasuruan",
    "kompetisi dan pameran teater dari sekolah-sekolah dengan berbagai genre pertunjukan (mock)",
    null,
    false,
    "2026-12-22T09:00:00+07:00",
    "2026-12-22T15:00:00+07:00",
    250,
  ),
  acaraItem(
    "jelajah-museum-malam-mock",
    "jelajah-museum-malam-mock",
    "Jelajah Museum Malam Mock",
    "museum",
    "pasuruan-selatan",
    "tur museum khusus malam hari dengan suasana penuh misteri dan pencerahan sejarah (mock)",
    50000,
    false,
    "2026-12-29T19:00:00+07:00",
    "2026-12-29T22:00:00+07:00",
    40,
  ),
];

/* Jangkar "hari ini" (runtime, MOCK): 2 event occurrence-nya digeser ke
   tanggal berjalan agar sorotan "Event Hari Ini" selalu hidup. Nilai fixed
   di atas tetap menjadi jadwal kanonis bila jangkar ini dilepas. */
function acaraTodayISO(h, m) {
  var n = new Date();
  function p(x) {
    return (x < 10 ? "0" : "") + x;
  }
  return (
    n.getFullYear() +
    "-" +
    p(n.getMonth() + 1) +
    "-" +
    p(n.getDate()) +
    "T" +
    p(h) +
    ":" +
    p(m) +
    ":00+07:00"
  );
}
function acaraSetOccurrence(slug, startsAt, endsAt) {
  for (var i = 0; i < ACARA_EVENTS.length; i++) {
    if (ACARA_EVENTS[i].slug === slug && ACARA_EVENTS[i].occurrences[0]) {
      ACARA_EVENTS[i].occurrences[0].starts_at = startsAt;
      ACARA_EVENTS[i].occurrences[0].ends_at = endsAt;
      return;
    }
  }
}
acaraSetOccurrence("festival-seni-mock", acaraTodayISO(9, 0), acaraTodayISO(17, 0));
acaraSetOccurrence("gelar-wayang-mock", acaraTodayISO(19, 0), acaraTodayISO(23, 0));

/* Venue + penyelenggara + tautan rute per event (MOCK — lihat header).
   Nilai mentah bertanda "(MOCK)" dan dibersihkan saat tampil, mengikuti
   konvensi file ini. Telepon sengaja null (tampil "—", tanpa mengarang
   nomor). googleMapsUrl = pencarian Maps dari koordinat place (fungsional,
   bukan klaim alamat). */
const ACARA_VENUES = {
  "festival-seni-mock": ["Lapangan Grati, Pasuruan Timur (MOCK)", "Komunitas Seni Pasuruan Timur (MOCK)"],
  "konser-komunitas-mock": ["Balai Serbaguna Prigen (MOCK)", "Komunitas Musik Pasuruan Barat (MOCK)"],
  "kirab-tradisi-mock": ["Alun-alun Kota Pasuruan (MOCK)", "Dinas Kebudayaan Kab. Pasuruan (MOCK)"],
  "ritual-panen-mock": ["Balai Desa Tutur (MOCK)", "Kelompok Tani Pasuruan Selatan (MOCK)"],
  "pawai-sejarah-mock": ["Pendopo Kecamatan Bangil (MOCK)", "Komunitas Sejarah Pasuruan (MOCK)"],
  "jelajah-sejarah-mock": ["Museum Daerah Prigen (MOCK)", "Pemandu Wisata Sejarah (MOCK)"],
  "pameran-museum-mock": ["Gedung Kesenian Kota Pasuruan (MOCK)", "Dinas Kebudayaan Kab. Pasuruan (MOCK)"],
  "workshop-koleksi-mock": ["Balai Budaya Grati (MOCK)", "Kurator Museum Komunitas (MOCK)"],
  "pasar-seni-mock": ["Pasar Seni Prigen (MOCK)", "Perupa Pasuruan Barat (MOCK)"],
  "gelar-wayang-mock": ["Pendopo Tutur (MOCK)", "Paguyuban Wayang Kulit (MOCK)"],
  "seminar-budaya-mock": ["Aula Kecamatan Bangil (MOCK)", "Akademisi dan Budayawan (MOCK)"],
  "festival-kuliner-mock": ["Lapangan Kota Pasuruan (MOCK)", "UMKM Kuliner Pasuruan (MOCK)"],
  "pameran-fotografi-mock": ["Galeri Seni Grati (MOCK)", "Komunitas Fotografi Pasuruan (MOCK)"],
  "konser-musik-tradisional-mock": ["Panggung Terbuka Prigen (MOCK)", "Orkestra Musik Tradisional (MOCK)"],
  "festival-teater-mock": ["Gedung Pertunjukan Kota Pasuruan (MOCK)", "Teater Pelajar Pasuruan (MOCK)"],
  "jelajah-museum-malam-mock": ["Museum Tutur (MOCK)", "Pengelola Museum Komunitas (MOCK)"],
};
ACARA_EVENTS.forEach(function (it) {
  var v = ACARA_VENUES[it.slug];
  if (v) {
    it.venue_address = v[0];
    it.organizer_name = v[1];
  }
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
