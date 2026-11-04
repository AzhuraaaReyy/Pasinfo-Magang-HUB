
/**
 * MOCK DATA — Berita Pasuruan Info (frontend phase)
 * ------------------------------------------------------------------
 * Sumber data SEMENTARA untuk halaman LayoutNews.html & detail_news.html.
 * Struktur field sengaja diselaraskan dengan docs/schema.md §18 (articles)
 * dan §19 (article_categories) supaya transisi ke API Laravel nanti tidak
 * perlu restrukturisasi:
 *
 *   Mock (file ini)  ->  GET /api/articles  ->  ArticleResource  ->  Laravel
 *
 * CATATAN KEJUJURAN DATA: seluruh judul, isi, penulis, sumber, dan tanggal
 * di bawah ini adalah KONTEN MOCK untuk kebutuhan UI. Ini BUKAN berita nyata
 * dan tidak merepresentasikan kejadian, tokoh, atau angka faktual apa pun.
 *
 * Field per artikel:
 *   id, slug, title, excerpt, content[],
 *   category (slug kategori), categoryLabel,
 *   author, source, published_at (ISO), published_label (tampilan),
 *   image (nama file di public/assets/images/news/), featured (bool)
 */
(function () {
  "use strict";

  // §19 article_categories — 9 kategori (source of truth halaman berita)
  var CATEGORIES = [
    { slug: "lokal", label: "Lokal" },
    { slug: "nasional", label: "Nasional" },
    { slug: "internasional", label: "Internasional" },
    { slug: "inspiratif", label: "Inspiratif" },
    { slug: "politik", label: "Politik" },
    { slug: "hiburan", label: "Hiburan" },
    { slug: "kesehatan", label: "Kesehatan" },
    { slug: "teknologi", label: "Teknologi" },
    { slug: "ekonomi", label: "Ekonomi" },
  ];

  // Gambar mock yang tersedia di public/assets/images/news/
  var IMG = {
    card: ["berita1-card.jpg", "berita2-card.jpg", "berita3-card.jpg", "berita4-card.jpg"],
    full: ["berita1.jpg", "berita2.png", "berita3.png", "berita4.png"],
  };
  function card(i) { return "news/" + IMG.card[i % IMG.card.length]; }
  function full(i) { return "news/" + IMG.full[i % IMG.full.length]; }

  // Singkat & seragam; teks JUJUR sebagai mock.
  var ARTICLES = [
    {
      id: 1,
      slug: "pemeriksaan-kesehatan-anak-digelar-serentak",
      title: "Pemeriksaan Kesehatan Anak Digelar Serentak di Puskesmas Wilayah",
      excerpt: "Program pelayanan kesehatan anak digelar serentak untuk memastikan tumbuh kembang optimal.",
      content: [
        "Sejumlah puskesmas di wilayah Pasuruan menggelar pemeriksaan kesehatan anak secara serentak pada pekan ini. Kegiatan menyasar balita dan anak usia sekolah sebagai bagian dari upaya pemantauan tumbuh kembang secara berkala.",
        "Petugas kesehatan melakukan penimbangan, pengukuran tinggi badan, serta pencatatan status gizi anak. Hasil pemeriksaan dicatat pada buku kesehatan ibu dan anak agar orang tua dapat memantau perkembangan dari waktu ke waktu.",
        "Selain pemeriksaan fisik, warga juga menerima edukasi mengenai pemberian gizi seimbang dan pola asuh yang mendukung tumbuh kembang. Edukasi ini disampaikan secara singkat namun terarah kepada orang tua yang hadir.",
        "Kegiatan serupa direncanakan berlanjut pada periode berikutnya dengan jadwal yang disesuaikan di tiap wilayah. Penyelenggara mengajak masyarakat memanfaatkan layanan ini secara rutin.",
      ],
      category: "lokal",
      categoryLabel: "Lokal",
      author: "Redaksi Pasinfo",
      source: "pasuruan.info",
      published_at: "2026-10-05T08:30:00+07:00",
      published_label: "5 Okt 2026",
      image: card(0),
      featured: true,
    },
    {
      id: 2,
      slug: "pemkab-sahkan-program-infrastruktur-dan-kesejahteraan",
      title: "Pemerintah Daerah Sahkan Program Infrastruktur dan Kesejahteraan Warga",
      excerpt: "Sejumlah program pembangunan infrastruktur dan kesejahteraan disahkan untuk tahun berikutnya.",
      content: [
        "Pemerintah daerah menetapkan sejumlah program pembangunan yang mencakup infrastruktur jalan, penerangan, dan peningkatan pelayanan publik. Penetapan ini menjadi acuan pelaksanaan kegiatan pada periode berikutnya.",
        "Program tersebut disusun berdasarkan usulan masyarakat yang dihimpun melalui musyawarah perencanaan pembangunan. Prioritas diberikan pada kawasan yang dinilai memerlukan perbaikan paling mendesak.",
        "Selain infrastruktur, anggaran juga dialokasikan untuk program kesejahteraan seperti bantuan sosial dan pemberdayaan usaha kecil. Pelaksanaannya akan dipantau secara berkala oleh perangkat daerah terkait.",
        "Pemerintah mengajak warga ikut mengawasi jalannya pembangunan agar hasilnya tepat sasaran. Mekanisme pengaduan disediakan bagi masyarakat yang ingin menyampaikan masukan.",
      ],
      category: "lokal",
      categoryLabel: "Lokal",
      author: "Redaksi Pasinfo",
      source: "pasuruankota.go.id",
      published_at: "2026-10-02T10:15:00+07:00",
      published_label: "2 Okt 2026",
      image: card(1),
      featured: true,
    },
    {
      id: 3,
      slug: "atlet-daerah-siap-hadapi-turnamen-antar-wilayah",
      title: "Atlet Daerah Siap Hadapi Turnamen Antar-Wilayah dengan Dukungan Suporter",
      excerpt: "Persiapan atlet daerah memasuki tahap akhir menjelang turnamen antar-wilayah.",
      content: [
        "Sejumlah atlet daerah mengikuti pemusatan latihan menjelang turnamen antar-wilayah. Latihan difokuskan pada peningkatan kebugaran, strategi, dan kekompakan tim.",
        "Pelatih menyebut para atlet menunjukkan perkembangan yang baik selama masa persiapan. Evaluasi rutin dilakukan untuk menentukan komposisi terbaik yang akan diturunkan.",
        "Dukungan suporter turut menjadi penyemangat bagi para atlet yang berlatih. Warga diimbau hadir memberikan dukungan langsung secara tertib dan sportif.",
        "Turnamen diharapkan menjadi ajang pembinaan bibit muda sekaligus mempererat hubungan antar-daerah. Manajemen tim optimistis dapat tampil maksimal pada laga pembuka.",
      ],
      category: "lokal",
      categoryLabel: "Lokal",
      author: "Redaksi Pasinfo",
      source: "kabarpas.com",
      published_at: "2026-10-04T14:20:00+07:00",
      published_label: "4 Okt 2026",
      image: card(2),
      featured: true,
    },
    {
      id: 4,
      slug: "panduan-peningkatan-kualitas-pembelajaran-nasional",
      title: "Panduan Peningkatan Kualitas Pembelajaran Nasional Mulai Diterapkan",
      excerpt: "Panduan peningkatan kualitas pembelajaran mulai diterapkan di sekolah-sekolah.",
      content: [
        "Panduan peningkatan kualitas pembelajaran mulai diterapkan di sejumlah sekolah. Pedoman ini menekankan pendekatan yang berpihak pada peserta didik.",
        "Guru diberi ruang menyesuaikan metode pembelajaran dengan kondisi kelas masing-masing. Pendampingan dilakukan agar penerapannya berjalan bertahap.",
        "Asesmen tidak lagi hanya berorientasi nilai akhir, tetapi juga mempertimbangkan proses belajar. Hal ini diharapkan mendorong siswa lebih aktif terlibat.",
        "Sekolah diimbau menjalin komunikasi dengan orang tua agar penerapan di sekolah selaras dengan pendampingan di rumah. Umpan balik akan dievaluasi secara berkala.",
      ],
      category: "nasional",
      categoryLabel: "Nasional",
      author: "Redaksi Pasinfo",
      source: "nasional.info",
      published_at: "2026-10-13T09:00:00+07:00",
      published_label: "13 Okt 2026",
      image: card(3),
      featured: false,
    },
    {
      id: 5,
      slug: "perluasan-jaringan-sinyal-jangkau-desa-terpencil",
      title: "Perluasan Jaringan Sinyal Digital Menjangkau Desa Terpencil",
      excerpt: "Perluasan jaringan sinyal digital diarahkan ke kawasan yang belum terjangkau.",
      content: [
        "Perluasan jaringan sinyal digital menyasar kawasan yang selama ini belum terjangkau. Pembangunan menara dan penguatan sinyal dilakukan secara bertahap.",
        "Warga di daerah terpencil menyambut baik peningkatan akses komunikasi. Koneksi yang lebih stabil dinilai memudahkan pekerjaan dan layanan daring.",
        "Pemerintah menegaskan perluasan ini juga mendukung layanan publik berbasis digital. Sekolah dan puskesmas diharapkan merasakan manfaat serupa.",
        "Pemeliharaan dan pemantauan kualitas jaringan akan dilakukan berkelanjutan. Masukan warga menjadi bagian dari evaluasi perbaikan layanan.",
      ],
      category: "nasional",
      categoryLabel: "Nasional",
      author: "Redaksi Pasinfo",
      source: "nasional.info",
      published_at: "2026-10-13T09:10:00+07:00",
      published_label: "13 Okt 2026",
      image: card(0),
      featured: false,
    },
    {
      id: 6,
      slug: "ktt-ekonomi-dunia-bahas-rantai-pasok-global",
      title: "Forum Ekonomi Dunia Bahas Penyeimbangan Rantai Pasok Global",
      excerpt: "Forum ekonomi internasional membahas penyeimbangan rantai pasok dan inflasi.",
      content: [
        "Pertemuan ekonomi tingkat internasional membahas upaya menyeimbangkan rantai pasok global. Isu ini dinilai berpengaruh pada harga dan ketersediaan barang antarnegara.",
        "Perwakilan sejumlah negara bertukar pandangan mengenai langkah menjaga stabilitas perdagangan. Kolaborasi lintas negara menjadi salah satu usulan utama.",
        "Selain rantai pasok, pertemuan menyoroti pentingnya koordinasi kebijakan untuk menekan dampak gejolak ekonomi. Kesepakatan teknis akan ditindaklanjuti pada pertemuan berikutnya.",
        "Pengamat menilai hasil pertemuan perlu diterjemahkan ke kebijakan nyata di masing-masing negara. Dampaknya bagi masyarakat luas akan terasa secara bertahap.",
      ],
      category: "internasional",
      categoryLabel: "Internasional",
      author: "Redaksi Pasinfo",
      source: "global.info",
      published_at: "2026-10-13T11:00:00+07:00",
      published_label: "13 Okt 2026",
      image: card(1),
      featured: false,
    },
    {
      id: 7,
      slug: "konsorsium-teknologi-sepakati-standar-etika-kecerdasan-buatan",
      title: "Konsorsium Teknologi Internasional Sepakati Standar Etika Kecerdasan Buatan",
      excerpt: "Standar etika kecerdasan buatan disepakati oleh sejumlah pihak lintas negara.",
      content: [
        "Sejumlah pihak dari berbagai negara menyepakati kerangka etika pemanfaatan kecerdasan buatan. Kerangka ini menekankan prinsip transparansi dan tanggung jawab.",
        "Standar tersebut mengatur bagaimana sistem cerdas semestinya digunakan tanpa merugikan pengguna. Pengawasan penerapan menjadi bagian penting dari kesepakatan.",
        "Pengembang diimbau mengedepankan aspek keamanan dan privasi dalam merancang produk. Uji coba sebelum peluncuran menjadi salah satu rekomendasi.",
        "Penerapan standar ini masih membutuhkan penyesuaian di tiap negara. Diskusi lanjutan dijadwalkan untuk menyempurnakan mekanisme pengawasan.",
      ],
      category: "internasional",
      categoryLabel: "Internasional",
      author: "Redaksi Pasinfo",
      source: "global.info",
      published_at: "2026-10-13T11:20:00+07:00",
      published_label: "13 Okt 2026",
      image: card(2),
      featured: false,
    },
    {
      id: 8,
      slug: "gerakan-gotong-royong-sulap-lahan-jadi-kebun-gizi",
      title: "Gerakan Gotong Royong Sulap Lahan Kosong Jadi Kebun Gizi",
      excerpt: "Inisiatif warga mengubah lahan kosong menjadi kebun gizi bersama.",
      content: [
        "Sekelompok warga mengubah lahan kosong menjadi kebun gizi bersama. Lahan tersebut kini ditanami aneka sayuran yang hasilnya dibagi untuk warga setempat.",
        "Kegiatan dikerjakan secara bergotong royong pada waktu-waktu tertentu. Warga bergantian merawat tanaman sembari berbagi pengalaman bercocok tanam.",
        "Selain menyediakan bahan pangan, kebun ini menjadi sarana edukasi bagi anak-anak. Mereka diajak mengenal cara menanam dan merawat tanaman.",
        "Pengelola berharap kegiatan ini berlanjut dan meluas ke wilayah lain. Partisipasi warga menjadi kunci keberlanjutan kebun gizi tersebut.",
      ],
      category: "inspiratif",
      categoryLabel: "Inspiratif",
      author: "Redaksi Pasinfo",
      source: "kabarpas.com",
      published_at: "2026-10-12T08:00:00+07:00",
      published_label: "12 Okt 2026",
      image: card(3),
      featured: true,
    },
    {
      id: 9,
      slug: "komunitas-pemuda-buka-workshop-seni-digital",
      title: "Komunitas Pemuda Membuka Ruang Workshop Seni Digital",
      excerpt: "Ruang kerja bersama dibuka untuk mengasah bakat seni digital pemuda.",
      content: [
        "Komunitas kreatif pemuda membuka ruang kerja bersama untuk belajar seni digital. Fasilitas ini disediakan agar peserta dapat berlatih dengan lebih leluasa.",
        "Workshop rutin digelar dengan materi yang bertahap, mulai dari dasar hingga proyek nyata. Peserta dibimbing oleh praktisi yang lebih berpengalaman.",
        "Kegiatan ini juga menjadi ajang bertukar ide antar-anggota komunitas. Kolaborasi antar-peserta diharapkan menghasilkan karya yang lebih beragam.",
        "Pengelola mengajak siapa pun yang berminat untuk bergabung. Jadwal dan materi akan diumumkan melalui kanal komunitas.",
      ],
      category: "inspiratif",
      categoryLabel: "Inspiratif",
      author: "Redaksi Pasinfo",
      source: "wartapasuruan.com",
      published_at: "2026-10-12T10:00:00+07:00",
      published_label: "12 Okt 2026",
      image: card(0),
      featured: false,
    },
    {
      id: 10,
      slug: "musyawarah-bahas-usulan-pembangunan-wilayah",
      title: "Musyawarah Wilayah Bahas Usulan Pembangunan Prioritas",
      excerpt: "Musyawarah menjaring usulan warga untuk pembangunan prioritas.",
      content: [
        "Musyawarah wilayah digelar untuk menjaring usulan pembangunan dari masyarakat. Warga menyampaikan prioritas kebutuhan di lingkungan masing-masing.",
        "Usulan yang terkumpul mencakup perbaikan jalan, penerangan, dan sarana umum. Setiap usulan dicatat untuk dibahas lebih lanjut.",
        "Peserta musyawarah mendiskusikan skala prioritas berdasarkan tingkat kebutuhan. Proses ini menjadi bagian dari perencanaan pembangunan.",
        "Hasil musyawarah akan dibawa ke forum lanjutan untuk dibahas bersama pemangku kepentingan. Warga diharapkan terus mengawal prosesnya.",
      ],
      category: "politik",
      categoryLabel: "Politik",
      author: "Redaksi Pasinfo",
      source: "politik.info",
      published_at: "2026-10-10T09:30:00+07:00",
      published_label: "10 Okt 2026",
      image: card(1),
      featured: false,
    },
    {
      id: 11,
      slug: "penguatan-peran-lembaga-musyawarah-desa",
      title: "Penguatan Peran Lembaga Musyawarah Desa Jadi Sorotan",
      excerpt: "Peran lembaga musyawarah desa diperkuat untuk penyaluran aspirasi warga.",
      content: [
        "Penguatan peran lembaga musyawarah desa menjadi sorotan dalam diskusi tata kelola. Lembaga ini dinilai penting sebagai penyalur aspirasi warga.",
        "Peserta diskusi menyoroti pentingnya keterbukaan dalam pengambilan keputusan. Informasi mengenai program dan anggaran diharapkan mudah diakses warga.",
        "Pendampingan bagi perangkat desa diusulkan agar kapasitas pengelolaan meningkat. Hal ini diharapkan membuat layanan lebih cepat dan tertib.",
        "Kolaborasi antara pemerintah dan warga menjadi tema utama diskusi. Kesepakatan tindak lanjut akan disusun pada pertemuan berikutnya.",
      ],
      category: "politik",
      categoryLabel: "Politik",
      author: "Redaksi Pasinfo",
      source: "politik.info",
      published_at: "2026-10-10T10:15:00+07:00",
      published_label: "10 Okt 2026",
      image: card(2),
      featured: false,
    },
    {
      id: 12,
      slug: "festival-kesenian-daerah-hibur-warga",
      title: "Festival Kesenian Daerah Hibur Warga dan Lestarikan Tradisi",
      excerpt: "Pentas kesenian daerah menampilkan pertunjukan tari dan musik tradisional.",
      content: [
        "Festival kesenian daerah digelar untuk menghibur sekaligus melestarikan tradisi. Berbagai kelompok seni tampil membawakan pertunjukan khas.",
        "Pertunjukan tari dan musik tradisional menjadi daya tarik utama acara. Penonton dari berbagai kalangan hadir menyaksikan.",
        "Selain hiburan, acara ini menjadi ruang bagi generasi muda untuk mengenal kesenian daerah. Pelatihan singkat bagi anak-anak turut dilaksanakan.",
        "Penyelenggara berharap festival rutin digelar agar kesenian daerah terus lestari. Dukungan warga menjadi bagian penting keberhasilan acara.",
      ],
      category: "hiburan",
      categoryLabel: "Hiburan",
      author: "Redaksi Pasinfo",
      source: "hiburan.info",
      published_at: "2026-10-12T19:00:00+07:00",
      published_label: "12 Okt 2026",
      image: card(3),
      featured: false,
    },
    {
      id: 13,
      slug: "panggung-musik-remaja-tampilkan-bakat-lokal",
      title: "Panggung Musik Remaja Menampilkan Bakat Lokal",
      excerpt: "Panggung musik terbuka menjadi ruang unjuk bakat remaja daerah.",
      content: [
        "Panggung musik terbuka digelar untuk memberi ruang bagi bakat remaja daerah. Beberapa grup melakukan penampilan pertama mereka di hadapan penonton.",
        "Bertema santai, acara menyajikan beragam genre musik sesuai minat peserta. Penonton tampak antusias mendukung setiap penampilan.",
        "Penyelenggara menyediakan area bagi kelompok yang ingin belajar tampil secara teratur. Hal ini diharapkan membangun rasa percaya diri generasi muda.",
        "Acara direncanakan berlanjut sebagai agenda berkala. Warga diundang ikut memeriahkan sekaligus mendukung bakat lokal.",
      ],
      category: "hiburan",
      categoryLabel: "Hiburan",
      author: "Redaksi Pasinfo",
      source: "hiburan.info",
      published_at: "2026-10-12T20:00:00+07:00",
      published_label: "12 Okt 2026",
      image: card(0),
      featured: false,
    },
    {
      id: 14,
      slug: "layanan-posyandu-keliling-jangkau-pelosok",
      title: "Layanan Posyandu Keliling Jangkau Wilayah Pelosok",
      excerpt: "Posyandu keliling mempermudah warga pelosok mendapat pemeriksaan berkala.",
      content: [
        "Layanan posyandu keliling hadir untuk mempermudah warga di wilayah pelosok. Petugas mendatangi lokasi yang jauh dari fasilitas kesehatan.",
        "Pemeriksaan dasar bagi lansia dan balita menjadi layanan utama yang diberikan. Warga tak perlu menempuh perjalanan jauh untuk memeriksakan kesehatan.",
        "Petugas juga memberikan penyuluhan kesehatan sederhana kepada warga. Materi disesuaikan dengan kebutuhan di tiap lokasi.",
        "Program ini menyasar lansia dan anak sebagai kelompok prioritas. Pemantauan rutin membantu memastikan warga tetap terlayani.",
      ],
      category: "kesehatan",
      categoryLabel: "Kesehatan",
      author: "Redaksi Pasinfo",
      source: "dinkes.info",
      published_at: "2026-10-09T09:00:00+07:00",
      published_label: "9 Okt 2026",
      image: card(1),
      featured: false,
    },
    {
      id: 15,
      slug: "kampanye-gizi-seimbang-sasar-keluarga",
      title: "Kampanye Gizi Seimbang Menyasar Keluarga di Lingkungan Permukiman",
      excerpt: "Kampanye gizi seimbang mengedukasi keluarga soal pola makan sehari-hari.",
      content: [
        "Kampanye gizi seimbang digelar untuk mengedukasi keluarga di lingkungan permukiman. Kegiatan menekankan pentingnya pola makan yang beragam.",
        "Kader kesehatan menjelaskan cara menyusun menu harian dengan bahan yang mudah diperoleh. Contoh sajian sederhana dibagikan kepada peserta.",
        "Peserta diajak berdiskusi mengenai kebiasaan makan keluarga sehari-hari. Tanya jawab berlangsung interaktif sepanjang sesi.",
        "Kampanye ini menekankan pencegahan melalui kebiasaan baik. Pemantauan berlanjut akan dilakukan bersama kader di tiap lingkungan.",
      ],
      category: "kesehatan",
      categoryLabel: "Kesehatan",
      author: "Redaksi Pasinfo",
      source: "dinkes.info",
      published_at: "2026-10-09T09:30:00+07:00",
      published_label: "9 Okt 2026",
      image: card(2),
      featured: false,
    },
    {
      id: 16,
      slug: "aplikasi-layanan-publik-digital-dirilis",
      title: "Aplikasi Layanan Publik Digital Resmi Dirilis",
      excerpt: "Aplikasi layanan publik digital memudahkan warga mengakses sejumlah layanan.",
      content: [
        "Aplikasi layanan publik digital resmi dirilis untuk mempermudah warga. Sejumlah layanan kini dapat diakses langsung dari ponsel.",
        "Pengguna diminta melakukan pendaftaran terlebih dahulu sebelum menggunakan layanan. Panduan penggunaan disediakan untuk membantu pengguna baru.",
        "Pengembang menekankan pentingnya keamanan data pengguna dalam aplikasi. Pembaruan berkala akan dilakukan untuk menambah fitur.",
        "Masukan pengguna menjadi dasar pengembangan tahap berikutnya. Layanan dukungan disediakan bagi warga yang mengalami kendala.",
      ],
      category: "teknologi",
      categoryLabel: "Teknologi",
      author: "Redaksi Pasinfo",
      source: "teknologi.info",
      published_at: "2026-10-11T13:00:00+07:00",
      published_label: "11 Okt 2026",
      image: card(3),
      featured: false,
    },
    {
      id: 17,
      slug: "pelatihan-literasi-digital-untuk-pelaku-usaha-kecil",
      title: "Pelatihan Literasi Digital Digelar untuk Pelaku Usaha Kecil",
      excerpt: "Pelatihan literasi digital membantu pelaku usaha kecil memasarkan produk.",
      content: [
        "Pelatihan literasi digital digelar bagi pelaku usaha kecil di daerah. Peserta belajar memanfaatkan perangkat digital untuk mendukung usaha mereka.",
        "Materi mencakup dasar pemasaran daring hingga pengelolaan komunikasi dengan pelanggan. Peserta mempraktikkan langsung setiap materi.",
        "Pelatih menekankan pentingnya konsistensi dan kejujuran dalam berjualan daring. Hal ini dinilai membangun kepercayaan pelanggan.",
        "Pelatihan lanjutan akan disesuaikan dengan kebutuhan peserta. Pendampingan diharapkan membantu usaha kecil tumbuh lebih stabil.",
      ],
      category: "teknologi",
      categoryLabel: "Teknologi",
      author: "Redaksi Pasinfo",
      source: "teknologi.info",
      published_at: "2026-10-11T14:00:00+07:00",
      published_label: "11 Okt 2026",
      image: card(0),
      featured: false,
    },
    {
      id: 18,
      slug: "program-literasi-keuangan-rumah-tangga",
      title: "Program Literasi Keuangan Rumah Tangga Tingkatkan Kesadaran Warga",
      excerpt: "Edukasi pengelolaan keuangan rumah tangga digelar rutin bagi warga.",
      content: [
        "Program literasi keuangan rumah tangga digelar untuk meningkatkan kesadaran warga. Peserta belajar mengelola pemasukan dan pengeluaran secara sederhana.",
        "Materi menyoroti pentingnya menyiapkan dana darurat dan merencanakan kebutuhan jangka panjang. Contoh pencatatan sederhana diberikan kepada peserta.",
        "Peserta diajak mempraktikkan penyusunan anggaran keluarga secara bersama-sama. Sesi diskusi dibuka untuk berbagi pengalaman.",
        "Program ini diharapkan membantu keluarga lebih siap menghadapi kebutuhan mendadak. Kegiatan serupa direncanakan berlanjut di lingkungan lain.",
      ],
      category: "ekonomi",
      categoryLabel: "Ekonomi",
      author: "Redaksi Pasinfo",
      source: "ekonomi.info",
      published_at: "2026-10-11T08:00:00+07:00",
      published_label: "11 Okt 2026",
      image: card(1),
      featured: false,
    },
    // Artikel yang tampil pada kartu beranda (index.html) — judul & gambar
    // disamakan dengan yang sudah ada di index.html agar tautan konsisten.
    {
      id: 19,
      slug: "kolaborasi-warga-petugas-aksi-bersih-lingkungan",
      title: "Kolaborasi Warga dan Petugas dalam Aksi Bersih Lingkungan",
      excerpt: "Kegiatan bersih lingkungan menjadi salah satu bentuk kepedulian masyarakat terhadap kebersihan dan kelestarian kawasan sekitar.",
      content: [
        "Warga bersama petugas menggelar aksi bersih lingkungan di sejumlah titik permukiman. Kegiatan dikerjakan secara bergotong royong dengan menelusuri area yang dinilai memerlukan perhatian.",
        "Peserta mengumpulkan sampah, menyapu jalan, serta merapikan saluran air agar tidak tersumbat. Peralatan kebersihan disiapkan bersama supaya pelaksanaan berjalan lancar.",
        "Selain menjaga kebersihan, kegiatan ini menjadi sarana mempererat hubungan antarwarga. Anak-anak turut dilibatkan agar kepedulian terhadap lingkungan tumbuh sejak dini.",
        "Aksi serupa direncanakan berlanjut secara berkala di lingkungan lain. Warga diajak menjaga kebersihan kawasan tidak hanya saat kegiatan bersama berlangsung.",
      ],
      category: "lokal",
      categoryLabel: "Lokal",
      author: "Redaksi Pasinfo",
      source: "pasuruan.com",
      published_at: "2026-10-10T05:00:00+07:00",
      published_label: "10 Okt 2026",
      image: "news/berita1.jpg",
      featured: false,
    },
    {
      id: 20,
      slug: "koordinasi-pejabat-pemerintah-program-pembangunan",
      title: "Koordinasi Pejabat Pemerintah Jadi Bagian Penting dalam Program Pembangunan",
      excerpt: "Koordinasi antarpemangku kepentingan merupakan salah satu aspek penting dalam mendukung pelaksanaan program pembangunan.",
      content: [
        "Koordinasi antarpejabat pemerintah dinilai menjadi bagian penting dalam menjalankan program pembangunan. Pertemuan rutin dilakukan untuk menyelaraskan langkah antarperangkat daerah.",
        "Setiap pihak memaparkan rencana kerja dan kendala yang dihadapi di lapangan. Dengan begitu, potensi tumpang tindih kegiatan dapat diminimalkan sejak awal.",
        "Peserta menyepakati pentingnya keterbukaan informasi agar program mudah dipahami masyarakat. Jadwal pelaksanaan disusun agar tidak mengganggu aktivitas warga.",
        "Hasil koordinasi akan ditindaklanjuti pada rapat berikutnya. Pemantauan berkala dilakukan untuk memastikan program berjalan sesuai rencana.",
      ],
      category: "politik",
      categoryLabel: "Politik",
      author: "Redaksi Pasinfo",
      source: "pasuruan.com",
      published_at: "2026-10-08T06:00:00+07:00",
      published_label: "8 Okt 2026",
      image: "news/berita3.png",
      featured: false,
    },
    {
      id: 21,
      slug: "ketika-kita-menyampaikan-kebenaran-kepada-masyarakat",
      title: "Ketika Kita Menyampaikan Kebenaran Kepada Masyarakat",
      excerpt: "Menyampaikan informasi yang benar kepada masyarakat menjadi tanggung jawab bersama.",
      content: [
        "Menyampaikan informasi yang benar kepada masyarakat menjadi tanggung jawab bersama. Setiap pihak diharapkan mengedepankan kejujuran dan ketelitian sebelum menyampaikan kabar.",
        "Informasi yang keliru dapat menimbulkan salah paham dan merugikan banyak pihak. Karena itu, pengecekan sumber menjadi langkah penting yang tidak boleh dilewatkan.",
        "Masyarakat pun diajak bersikap kritis terhadap informasi yang diterima. Kebiasaan memverifikasi membantu mencegah penyebaran kabar yang belum jelas kebenarannya.",
        "Keterbukaan dan saling mengingatkan diharapkan menjadi budaya dalam berkomunikasi. Dengan begitu, kepercayaan publik dapat terjaga dari waktu ke waktu.",
      ],
      category: "inspiratif",
      categoryLabel: "Inspiratif",
      author: "Isabella",
      source: "pasuruan.com",
      published_at: "2026-10-10T05:30:00+07:00",
      published_label: "10 Okt 2026",
      image: "news/berita1.jpg",
      featured: false,
    },
    {
      id: 22,
      slug: "sinergi-pemerintah-masyarakat-dukung-pembangunan",
      title: "Sinergi Pemerintah dan Masyarakat Berperan dalam Mendukung Pembangunan",
      excerpt: "Pembangunan yang berkelanjutan membutuhkan kerja sama berbagai pihak, termasuk pemerintah, masyarakat, dan sektor terkait.",
      content: [
        "Sinergi antara pemerintah dan masyarakat dinilai berperan penting dalam mendukung pembangunan. Kerja sama berbagai pihak membuat program lebih mudah dijalankan.",
        "Warga dilibatkan mulai dari tahap perencanaan hingga pengawasan. Partisipasi ini diharapkan membuat hasil pembangunan sesuai kebutuhan di lapangan.",
        "Pemerintah menegaskan komunikasi dua arah perlu dijaga agar masukan warga ditindaklanjuti. Saluran penyampaian aspirasi disediakan bagi masyarakat.",
        "Kolaborasi semacam ini dinilai menjadi kunci pembangunan yang berkelanjutan. Semua pihak diharapkan menjaga komitmen yang telah disepakati.",
      ],
      category: "lokal",
      categoryLabel: "Lokal",
      author: "Redaksi Pasinfo",
      source: "pasuruan.com",
      published_at: "2026-10-07T06:30:00+07:00",
      published_label: "7 Okt 2026",
      image: "news/berita4.png",
      featured: false,
    },
    {
      id: 23,
      slug: "peran-media-menyampaikan-informasi-kepada-masyarakat",
      title: "Peran Media dalam Menyampaikan Informasi kepada Masyarakat",
      excerpt: "Media memiliki peran penting dalam menyampaikan informasi mengenai berbagai peristiwa kepada masyarakat.",
      content: [
        "Media memiliki peran penting dalam menyampaikan informasi mengenai berbagai peristiwa kepada masyarakat. Kecepatan penyampaian perlu diimbangi dengan ketepatan isi.",
        "Penyampaian berita yang berimbang membantu masyarakat memahami persoalan secara utuh. Sumber informasi diusahakan jelas dan dapat dipertanggungjawabkan.",
        "Perkembangan kanal digital membuat arus informasi semakin cepat. Karena itu, kedisiplinan memeriksa fakta menjadi bagian tak terpisahkan dari kerja pemberitaan.",
        "Masyarakat diharapkan menyaring informasi dengan bijak. Media dan pembaca dapat bersama menjaga ruang informasi yang sehat.",
      ],
      category: "lokal",
      categoryLabel: "Lokal",
      author: "Redaksi Pasinfo",
      source: "pasuruan.com",
      published_at: "2026-10-09T05:30:00+07:00",
      published_label: "9 Okt 2026",
      image: "news/berita2.png",
      featured: false,
    },
    {
      id: 24,
      slug: "selamat-datang-portal-berita-informasi-pasuruan",
      title: "Selamat Datang di Portal Berita & Informasi Pasuruan",
      excerpt: "Portal berita dan informasi Pasuruan hadir menyajikan kabar lokal dan sekitarnya.",
      content: [
        "Portal berita dan informasi Pasuruan hadir sebagai ruang berbagi kabar bagi warga. Beragam informasi lokal disajikan dengan bahasa yang mudah dipahami.",
        "Selain berita, portal ini memuat informasi destinasi, kuliner, budaya, dan agenda kegiatan daerah. Tujuannya agar warga lebih mudah menjelajahi potensi setempat.",
        "Kami mengutamakan penyampaian informasi yang jelas dan tertata. Masukan dari pembaca menjadi bahan perbaikan agar penyajian terus relevan.",
        "Terima kasih atas kunjungan Anda. Dukungan pembaca menjadi dorongan untuk menghadirkan informasi yang bermanfaat bagi masyarakat.",
      ],
      category: "lokal",
      categoryLabel: "Lokal",
      author: "Redaksi Pasinfo",
      source: "pasuruan.com",
      published_at: "2026-10-07T07:00:00+07:00",
      published_label: "7 Okt 2026",
      image: "news/berita1.jpg",
      featured: false,
    },
    {
      id: 25,
      slug: "peningkatan-layanan-publik-program-digitalisasi",
      title: "Peningkatan Layanan Publik Melalui Program Digitalisasi",
      excerpt: "Program digitalisasi diarahkan untuk mempercepat dan mempermudah layanan publik.",
      content: [
        "Program digitalisasi diarahkan untuk meningkatkan kualitas layanan publik. Sejumlah proses yang sebelumnya manual kini bertahap dipindahkan ke sistem daring.",
        "Petugas menerima pendampingan agar terbiasa menggunakan perangkat baru. Warga pun diberi panduan sederhana untuk mengakses layanan.",
        "Digitalisasi dinilai mempercepat proses dan mengurangi antrean. Meski begitu, layanan tatap muka tetap disediakan bagi yang membutuhkannya.",
        "Evaluasi penerapan dilakukan secara berkala. Masukan pengguna menjadi dasar untuk menyempurnakan sistem pada tahap berikutnya.",
      ],
      category: "teknologi",
      categoryLabel: "Teknologi",
      author: "Redaksi Pasinfo",
      source: "pasuruan.com",
      published_at: "2026-10-06T08:00:00+07:00",
      published_label: "6 Okt 2026",
      image: "news/berita2.png",
      featured: false,
    },
    {
      id: 26,
      slug: "penguatan-ekonomi-lokal-pembinaan-umkm-pasuruan",
      title: "Penguatan Ekonomi Lokal Lewat Pembinaan UMKM Pasuruan",
      excerpt: "Pembinaan pelaku UMKM diarahkan untuk memperkuat ekonomi lokal.",
      content: [
        "Pembinaan pelaku usaha mikro, kecil, dan menengah diarahkan untuk memperkuat ekonomi lokal. Peserta memperoleh pendampingan dalam mengelola usaha.",
        "Materi pembinaan mencakup pencatatan keuangan, kemasan produk, hingga cara memasarkan barang. Pelaku usaha diajak memahami kebutuhan pelanggan.",
        "Akses ke pasar yang lebih luas menjadi salah satu perhatian utama. Kolaborasi antar pelaku usaha diharapkan saling menguatkan.",
        "Program pembinaan direncanakan berlanjut dengan materi yang disesuaikan. Pelaku usaha diimbau memanfaatkan kesempatan ini secara berkelanjutan.",
      ],
      category: "ekonomi",
      categoryLabel: "Ekonomi",
      author: "Redaksi Pasinfo",
      source: "pasuruan.com",
      published_at: "2026-10-05T08:30:00+07:00",
      published_label: "5 Okt 2026",
      image: "news/berita4.png",
      featured: false,
    },
    {
      id: 27,
      slug: "dukungan-sektor-pariwisata-pertumbuhan-daerah",
      title: "Dukungan Sektor Pariwisata untuk Dorong Pertumbuhan Daerah",
      excerpt: "Sektor pariwisata didorong untuk menopang pertumbuhan daerah.",
      content: [
        "Dukungan bagi sektor pariwisata diarahkan untuk menopang pertumbuhan daerah. Pengembangan mencakup penataan fasilitas dan promosi destinasi.",
        "Pelaku usaha di sekitar destinasi diharapkan turut merasakan manfaatnya. Pelibatan warga menjadi bagian dari upaya menjaga keberlanjutan.",
        "Kebersihan dan kenyamanan kawasan wisata menjadi perhatian penting. Pengelola mengajak semua pihak menjaga kualitas layanan bagi pengunjung.",
        "Langkah lanjutan disusun bersama pemangku kepentingan terkait. Evaluasi berkala dilakukan agar dampaknya terasa secara merata.",
      ],
      category: "ekonomi",
      categoryLabel: "Ekonomi",
      author: "Redaksi Pasinfo",
      source: "pasuruan.com",
      published_at: "2026-10-04T09:00:00+07:00",
      published_label: "4 Okt 2026",
      image: "news/berita3.png",
      featured: false,
    },
    // Tambahan data mock untuk widget sidebar (Internasional & Nasional) — 5 item.
    {
      id: 28,
      slug: "forum-iklim-internasional-sepakati-pendanaan-transisi-energi",
      title: "Forum Iklim Internasional Sepakati Pendanaan Transisi Energi",
      excerpt: "Sejumlah negara menyepakati skema pendanaan bersama untuk transisi energi.",
      content: [
        "Forum iklim tingkat internasional menyepakati skema pendanaan bersama untuk mendukung transisi energi. Kesepakatan ini menekankan peralihan bertahap menuju sumber energi yang lebih bersih.",
        "Perwakilan negara membahas mekanisme pembagian beban pembiayaan serta pendampingan teknologi. Negara berkembang diharapkan memperoleh dukungan agar transisi berjalan adil.",
        "Selain pendanaan, pertemuan menyoroti pentingnya pengawasan capaian tiap negara. Pelaporan berkala disepakati sebagai alat memantau kemajuan bersama.",
        "Hasil kesepakatan akan ditindaklanjuti pada pertemuan lanjutan. Pengamat menilai implementasi di lapangan menjadi ujian utama dari komitmen ini.",
      ],
      category: "internasional",
      categoryLabel: "Internasional",
      author: "Redaksi Pasinfo",
      source: "global.info",
      published_at: "2026-10-14T09:00:00+07:00",
      published_label: "14 Okt 2026",
      image: card(3),
      featured: false,
    },
    {
      id: 29,
      slug: "kolaborasi-lintas-negara-riset-pangan-berkelanjutan",
      title: "Kolaborasi Lintas Negara Perkuat Riset Pangan Berkelanjutan",
      excerpt: "Riset pangan berkelanjutan dikembangkan melalui kolaborasi lintas negara.",
      content: [
        "Sejumlah lembaga riset dari berbagai negara menjalin kolaborasi untuk memperkuat riset pangan berkelanjutan. Fokusnya mencakup ketahanan pangan dan efisiensi produksi.",
        "Pertukaran data dan metode penelitian disepakati agar hasil riset dapat diterapkan lebih luas. Kolaborasi ini diharapkan mempercepat inovasi di sektor pangan.",
        "Selain teknologi, penguatan kapasitas peneliti muda menjadi bagian dari kerja sama. Program pelatihan bersama direncanakan berjalan berkala.",
        "Temuan riset akan dibagikan melalui forum terbuka. Pendekatan kolaboratif dinilai penting menghadapi tantangan pangan jangka panjang.",
      ],
      category: "internasional",
      categoryLabel: "Internasional",
      author: "Redaksi Pasinfo",
      source: "global.info",
      published_at: "2026-10-14T10:30:00+07:00",
      published_label: "14 Okt 2026",
      image: card(0),
      featured: false,
    },
    {
      id: 30,
      slug: "pertemuan-regional-bahas-konektivitas-perdagangan",
      title: "Pertemuan Regional Bahas Konektivitas dan Perdagangan",
      excerpt: "Konektivitas dan kelancaran perdagangan menjadi bahasan pertemuan regional.",
      content: [
        "Pertemuan regional membahas upaya meningkatkan konektivitas antarnegara. Kelancaran arus barang dan jasa menjadi salah satu agenda utama.",
        "Perwakilan negara bertukar pandangan mengenai penyederhanaan prosedur dan penguatan infrastruktur. Langkah ini dinilai dapat mempercepat proses perdagangan.",
        "Selain itu, pertemuan menyoroti pentingnya koordinasi menghadapi gejolak ekonomi global. Kerja sama yang erat dianggap membantu menjaga stabilitas kawasan.",
        "Kesepakatan teknis akan disusun pada pertemuan berikutnya. Pelaku usaha berharap hasilnya mempermudah kegiatan lintas negara.",
      ],
      category: "internasional",
      categoryLabel: "Internasional",
      author: "Redaksi Pasinfo",
      source: "global.info",
      published_at: "2026-10-14T13:00:00+07:00",
      published_label: "14 Okt 2026",
      image: card(2),
      featured: false,
    },
    {
      id: 31,
      slug: "program-transportasi-publik-terpadu-nasional-diperluas",
      title: "Program Transportasi Publik Terpadu Nasional Diperluas",
      excerpt: "Program transportasi publik terpadu diperluas ke sejumlah daerah.",
      content: [
        "Program transportasi publik terpadu diperluas ke sejumlah daerah. Langkah ini diarahkan agar perpindahan antar moda lebih mudah dan terjangkau.",
        "Penambahan rute dan integrasi jadwal menjadi bagian dari perluasan tersebut. Pengguna diharapkan merasakan layanan yang lebih terhubung.",
        "Pemerintah menekankan pentingnya kenyamanan dan keselamatan penumpang. Fasilitas pendukung di titik transit turut dibenahi.",
        "Evaluasi penerapan dilakukan berkala bersama pemangku kepentingan. Masukan pengguna menjadi bahan penyempurnaan layanan.",
      ],
      category: "nasional",
      categoryLabel: "Nasional",
      author: "Redaksi Pasinfo",
      source: "nasional.info",
      published_at: "2026-10-14T08:00:00+07:00",
      published_label: "14 Okt 2026",
      image: card(1),
      featured: false,
    },
    {
      id: 32,
      slug: "upaya-nasional-tekan-angka-kemiskinan-daerah",
      title: "Upaya Nasional Tekan Angka Kemiskinan di Daerah",
      excerpt: "Berbagai upaya nasional disiapkan untuk menekan angka kemiskinan di daerah.",
      content: [
        "Sejumlah upaya nasional disiapkan untuk menekan angka kemiskinan di daerah. Pendekatan difokuskan pada peningkatan pendapatan dan akses layanan dasar.",
        "Program pemberdayaan masyarakat menjadi salah satu strategi utama. Peserta dibekali keterampilan dan pendampingan agar lebih mandiri.",
        "Sinergi antara pemerintah pusat dan daerah ditekankan dalam pelaksanaan. Data yang akurat menjadi dasar penargetan program.",
        "Evaluasi berkala dilakukan untuk mengukur hasil. Penyesuaian kebijakan akan mengikuti temuan di lapangan.",
      ],
      category: "nasional",
      categoryLabel: "Nasional",
      author: "Redaksi Pasinfo",
      source: "nasional.info",
      published_at: "2026-10-14T08:30:00+07:00",
      published_label: "14 Okt 2026",
      image: card(3),
      featured: false,
    },
    {
      id: 33,
      slug: "penguatan-layanan-kesehatan-dasar-di-daerah-nasional",
      title: "Penguatan Layanan Kesehatan Dasar di Daerah Jadi Prioritas",
      excerpt: "Penguatan layanan kesehatan dasar di daerah menjadi salah satu prioritas.",
      content: [
        "Penguatan layanan kesehatan dasar di daerah menjadi salah satu prioritas. Fokus diarahkan pada pemerataan akses dan peningkatan fasilitas.",
        "Tenaga kesehatan menerima pendampingan agar layanan semakin tertata. Sarana pendukung di fasilitas kesehatan turut dilengkapi.",
        "Pemerintah mendorong pencegahan melalui edukasi masyarakat. Pemeriksaan berkala menjadi bagian dari upaya menjaga kesehatan warga.",
        "Pemantauan capaian dilakukan secara berkala. Masukan dari daerah menjadi dasar perbaikan program berikutnya.",
      ],
      category: "nasional",
      categoryLabel: "Nasional",
      author: "Redaksi Pasinfo",
      source: "nasional.info",
      published_at: "2026-10-14T09:30:00+07:00",
      published_label: "14 Okt 2026",
      image: card(0),
      featured: false,
    },
  ];

  // Widget "Video Terkait" (mock, tanpa URL video nyata)
  var VIDEOS = [
    { title: "Pantauan Udara Pembangunan Jalan Akses Utama", desc: "Rekaman udara memperlihatkan progres pembangunan jalan akses utama.", duration: "02:45", date: "13 Okt 2026", image: card(0) },
    { title: "Liputan Kemeriahan Pawai Budaya Daerah", desc: "Cuplikan kemeriahan pawai budaya yang diikuti berbagai komunitas.", duration: "05:12", date: "13 Okt 2026", image: card(1) },
    { title: "Dokumentasi Keindahan Destinasi Ekowisata Lokal", desc: "Dokumentasi singkat pesona destinasi ekowisata di daerah.", duration: "01:30", date: "13 Okt 2026", image: card(2) },
    { title: "Wawancara Pelaku Usaha Kreatif Muda", desc: "Perbincangan dengan pelaku usaha kreatif tentang perjalanan usahanya.", duration: "04:15", date: "13 Okt 2026", image: card(3) },
    { title: "Dokumenter Singkat Jejak Sejarah Kota", desc: "Penelusuran singkat jejak sejarah dan bangunan lama di kota.", duration: "08:20", date: "13 Okt 2026", image: card(0) },
  ];

  // Widget "Foto Terkait" (mock)
  var PHOTOS = [
    { title: "Galeri Foto: Antusias Warga Menyambut Gelaran Pasar", desc: "Kumpulan foto antusiasme warga menyambut gelaran pasar.", count: 8, date: "13 Okt 2026", image: card(1) },
    { title: "Lensa Visual: Karya Produk Unggulan UMKM Daerah", desc: "Potret produk unggulan hasil karya pelaku UMKM daerah.", count: 12, date: "13 Okt 2026", image: card(2) },
    { title: "Retrospeksi Foto: Wajah Baru Ruang Terbuka Hijau", desc: "Dokumentasi perubahan wajah ruang terbuka hijau kota.", count: 6, date: "13 Okt 2026", image: card(3) },
    { title: "Bidikan Kamera: Komunitas Tanam Bibit Pohon", desc: "Momen komunitas menanam bibit pohon bersama warga.", count: 10, date: "13 Okt 2026", image: card(0) },
    { title: "Kirab Budaya: Warna-Warni Baju Adat dalam Lensa", desc: "Warna-warni baju adat yang terekam dalam kirab budaya.", count: 15, date: "13 Okt 2026", image: card(1) },
  ];

  window.NEWS_DATA = {
    categories: CATEGORIES,
    articles: ARTICLES,
    videos: VIDEOS,
    photos: PHOTOS,
    // helper yang dipakai halaman
    bySlug: function (slug) {
      for (var i = 0; i < ARTICLES.length; i++) {
        if (ARTICLES[i].slug === slug) return ARTICLES[i];
      }
      return null;
    },
    byCategory: function (cat) {
      return ARTICLES.filter(function (a) { return a.category === cat; });
    },
    featured: function (n) {
      var f = ARTICLES.filter(function (a) { return a.featured; });
      return typeof n === "number" ? f.slice(0, n) : f;
    },
  };
})();
    

      (function () {
        "use strict";
        var DATA = window.NEWS_DATA || { articles: [], categories: [], videos: [], photos: [] };
        var PREFIX = document.body.getAttribute("data-asset-prefix") || "../../public";
        var DETAIL = "detail_news.html?slug=";

        function esc(s) {
          return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
          });
        }
        function img(p) {
          if (!p) return "";
          if (/^https?:\/\//.test(p)) return p;
          return PREFIX + "/assets/images/" + p;
        }
        function link(slug) {
          return DETAIL + encodeURIComponent(slug);
        }
        function go(el, slug) {
          el.setAttribute("role", "link");
          el.setAttribute("tabindex", "0");
          el.addEventListener("click", function () {
            window.location.href = link(slug);
          });
          el.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              window.location.href = link(slug);
            }
          });
        }
        function wrap(cls, inner) {
          var e = document.createElement("div");
          e.className = cls;
          e.innerHTML = inner;
          return e;
        }

        function heroLargeInner(a) {
          return (
            '<img src="' + img(a.image) + '" alt="' + esc(a.title) + '" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />' +
            '<div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>' +
            '<div class="relative z-10 space-y-2.5">' +
            '<span data-badge class="inline-block px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider rounded shadow-sm">' + esc(a.categoryLabel) + "</span>" +
            '<h1 class="text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight group-hover:text-blue-300 transition-colors">' + esc(a.title) + "</h1>" +
            '<p class="text-xs text-slate-300 line-clamp-2 leading-relaxed">' + esc(a.excerpt) + "</p>" +
            '<div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 font-medium pt-1 border-t border-white/10">' +
            '<span class="text-white font-semibold">' + esc(a.author) + "</span><span>\u2022</span>" +
            '<span class="flex items-center gap-1"><i class="far fa-calendar-alt text-[9px]"></i> ' + esc(a.published_label) + "</span><span>\u2022</span>" +
            '<span class="flex items-center gap-1 text-slate-200"><i class="fas fa-globe text-[9px]"></i> ' + esc(a.source) + "</span>" +
            "</div></div>"
          );
        }
        function heroSmall(a) {
          return wrap(
            "group relative rounded-xl overflow-hidden min-h-[185px] bg-slate-900 transition-all duration-300 flex flex-col justify-end p-5 border border-slate-200/20 shadow-sm cursor-pointer",
            '<img src="' + img(a.image) + '" alt="' + esc(a.title) + '" class="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-700" />' +
              '<div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>' +
              '<div class="relative z-10 space-y-1.5">' +
              '<span data-badge class="inline-block px-2 py-0.5 bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-wider rounded shadow-sm">' + esc(a.categoryLabel) + "</span>" +
              '<h2 class="text-sm sm:text-base font-bold text-white leading-snug group-hover:text-blue-300 transition-colors">' + esc(a.title) + "</h2>" +
              '<div class="flex flex-wrap items-center gap-2 text-[10px] text-slate-300 font-medium pt-1 border-t border-white/10">' +
              '<span class="text-white font-semibold">' + esc(a.author) + "</span><span>\u2022</span>" +
              '<span class="flex items-center gap-1"><i class="far fa-calendar-alt text-[9px]"></i> ' + esc(a.published_label) + "</span><span>\u2022</span>" +
              '<span class="flex items-center gap-1 text-slate-200"><i class="fas fa-globe text-[9px]"></i> ' + esc(a.source) + "</span>" +
              "</div></div>"
          );
        }
        function mainCard(a) {
          return wrap(
            "group bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-full hover:border-blue-500 hover:shadow-md transition-all duration-200 cursor-pointer",
            '<div class="space-y-2">' +
              '<div data-card-media class="overflow-hidden rounded-lg bg-slate-100 aspect-[16/10] relative">' +
              '<img src="' + img(a.image) + '" alt="' + esc(a.title) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />' +
              '<span data-badge class="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-wider rounded shadow-sm">' + esc(a.categoryLabel) + "</span>" +
              "</div>" +
              '<h3 class="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-3 group-hover:text-blue-600 transition-colors">' + esc(a.title) + "</h3>" +
              '<p class="text-[11px] text-slate-500 leading-relaxed line-clamp-2">' + esc(a.excerpt) + "</p>" +
              "</div>" +
              '<div data-news-meta class="flex flex-wrap items-center justify-between gap-y-0.5 text-[10px] text-slate-500 pt-2 border-t border-slate-100 mt-2.5">' +
              '<span class="flex items-center gap-1"><i class="far fa-clock text-blue-600"></i> ' + esc(a.published_label) + "</span>" +
              '<span class="font-medium text-slate-600 flex items-center gap-1"><i class="fas fa-globe text-slate-400 text-[9px]"></i> ' + esc(a.source) + "</span>" +
              "</div>"
          );
        }
        function listItem(a, accent) {
          return wrap(
            "group flex gap-3 items-start cursor-pointer",
            '<div class="w-20 h-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 relative">' +
              '<img src="' + img(a.image) + '" alt="' + esc(a.title) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />' +
              '<span data-badge class="absolute top-1 left-1 px-1 bg-blue-600 text-white text-[7px] font-bold rounded">' + esc(a.categoryLabel) + "</span>" +
              "</div>" +
              '<div class="space-y-1.5 min-w-0 flex-1">' +
              '<h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-3 group-hover:text-blue-600 transition-colors">' + esc(a.title) + "</h4>" +
              '<p class="text-[11px] text-slate-500 leading-snug line-clamp-2">' + esc(a.excerpt) + "</p>" +
              '<div data-news-meta class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-slate-400">' +
                '<span><i class="far fa-clock ' + (accent || "text-blue-600") + '"></i> ' + esc(a.published_label) + "</span>" +
                (a.source ? '<span><i class="fas fa-globe text-slate-400"></i> ' + esc(a.source) + "</span>" : "") +
                "</div>" +
              "</div>"
          );
        }
        function videoItem(v) {
          return wrap(
            "group flex gap-3 items-start cursor-pointer",
            '<div class="w-20 h-14 shrink-0 overflow-hidden rounded-lg bg-slate-900 relative">' +
              '<img src="' + img(v.image) + '" alt="' + esc(v.title) + '" class="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300" />' +
              '<div class="absolute inset-0 flex items-center justify-center"><div class="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow"><i class="fas fa-play text-xs pl-0.5"></i></div></div>' +
              '<span data-badge class="absolute bottom-0.5 right-0.5 px-1 bg-slate-950/80 text-white text-[10px] font-mono font-bold rounded">' + esc(v.duration) + "</span>" +
              "</div>" +
              '<div class="space-y-1.5 min-w-0 flex-1">' +
              '<h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-3 group-hover:text-blue-600 transition-colors">' + esc(v.title) + "</h4>" +
              '<p class="text-[11px] text-slate-500 leading-snug line-clamp-2">' + esc(v.desc) + "</p>" +
              '<span class="text-[9px] text-slate-400 block"><i class="far fa-clock text-red-600"></i> ' + esc(v.date) + "</span>" +
              "</div>"
          );
        }
        function photoItem(p) {
          return wrap(
            "group flex gap-3 items-start cursor-pointer",
            '<div class="w-20 h-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 relative">' +
              '<img src="' + img(p.image) + '" alt="' + esc(p.title) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />' +
              '<span data-badge class="absolute top-1 left-1 px-1 bg-emerald-600 text-white text-[7px] font-bold rounded flex items-center gap-0.5"><i class="fas fa-images"></i> ' + esc(p.count) + "</span>" +
              "</div>" +
              '<div class="space-y-1.5 min-w-0 flex-1">' +
              '<h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-3 group-hover:text-blue-600 transition-colors">' + esc(p.title) + "</h4>" +
              '<p class="text-[11px] text-slate-500 leading-snug line-clamp-2">' + esc(p.desc) + "</p>" +
              '<span class="text-[9px] text-slate-400 block"><i class="far fa-clock text-emerald-600"></i> ' + esc(p.date) + "</span>" +
              "</div>"
          );
        }

        function fill(sel, items, builder) {
          var host = document.querySelector(sel);
          if (!host) return;
          host.innerHTML = "";
          items.forEach(function (it) {
            var el = builder(it);
            host.appendChild(el);
          });
        }

        function getParam(name) {
          var m = new RegExp("[?&]" + name + "=([^&]+)").exec(window.location.search);
          return m ? decodeURIComponent(m[1]) : "";
        }

        function validCat(slug) {
          return DATA.categories.some(function (c) { return c.slug === slug; });
        }

        function renderCategory(catSlug) {
          var cat = DATA.categories.filter(function (c) { return c.slug === catSlug; })[0];
          var label = cat ? cat.label : "Terbaru";
          var badge = document.querySelector("[data-category-badge]");
          var title = document.querySelector("[data-category-title]");
          if (badge) badge.textContent = label;
          if (title) title.textContent = "Berita " + label;
          var items = DATA.byCategory(catSlug);
          if (!items.length) items = DATA.articles.slice(0, 6);
          fill('[data-news-grid="category"]', items, mainCard);
        }

        function renderHero() {
          var f = DATA.featured(3);
          if (f.length < 3) f = DATA.articles.slice(0, 3);
          var big = document.querySelector("[data-hero-large]");
          if (big && f[0]) {
            big.innerHTML = heroLargeInner(f[0]);
            go(big, f[0].slug);
          }
          var stack = document.querySelector("[data-hero-stack]");
          if (stack) {
            stack.innerHTML = "";
            [f[1], f[2]].forEach(function (a) {
              if (!a) return;
              var el = heroSmall(a);
              stack.appendChild(el);
              go(el, a.slug);
            });
          }
        }

        function wireGrid(sel) {
          document.querySelectorAll(sel + " > article, " + sel + " > .group").forEach(function (el) {
            var titleEl = el.querySelector("h3");
            if (!titleEl) return;
            var t = titleEl.textContent.trim();
            var match = DATA.articles.filter(function (a) { return a.title === t; })[0];
            if (match) go(el, match.slug);
          });
        }

        function renderAll() {
          renderHero();

          // Filter chips
          var current = getParam("category");
          if (!validCat(current)) current = "lokal";
          var filter = document.querySelector("[data-news-filter]");
          if (filter) {
            filter.innerHTML = "";
            DATA.categories.forEach(function (c) {
              var a = document.createElement("a");
              a.href = "LayoutNews.html?category=" + encodeURIComponent(c.slug);
              a.className =
                "news-chip inline-block px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors" +
                (c.slug === current ? " is-active" : "");
              a.textContent = c.label;
              a.setAttribute("data-chip", c.slug);
              filter.appendChild(a);
            });
          }

          fill('[data-news-list="internasional"]', DATA.byCategory("internasional"), listItem);
          fill('[data-news-list="nasional"]', DATA.byCategory("nasional"), listItem);
          fill("[data-news-video]", DATA.videos, videoItem);
          fill("[data-news-photo]", DATA.photos, photoItem);

          fill(
            '[data-news-grid="reco"]',
            DATA.featured(6).length ? DATA.featured(6) : DATA.articles.slice(0, 6),
            mainCard
          );
          var others = DATA.articles.filter(function (a) { return a.category !== current; }).slice(0, 6);
          fill('[data-news-grid="more"]', others, mainCard);

          renderCategory(current);

          // Link seluruh kartu utama ke detail
          wireGrid('[data-news-grid="category"]');
          wireGrid('[data-news-grid="reco"]');
          wireGrid('[data-news-grid="more"]');
          document
            .querySelectorAll('[data-news-list] > .group, [data-news-video] > .group, [data-news-photo] > .group')
            .forEach(function (el) {
              var t = el.querySelector("h4");
              if (!t) return;
              var match = DATA.articles.filter(function (a) { return a.title === t.textContent.trim(); })[0];
              if (match) go(el, match.slug);
            });
        }

        function animate() {
          if (!window.gsap || !window.ScrollTrigger) return;
          gsap.registerPlugin(ScrollTrigger);
          var targets = document.querySelectorAll(
            "main > section, main > nav, aside > div, [data-news-grid] > *, [data-news-list] > *, [data-news-video] > *, [data-news-photo] > *"
          );
          targets.forEach(function (el, i) {
            gsap.fromTo(
              el,
              { autoAlpha: 0, y: 24 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                ease: "power2.out",
                scrollTrigger: { trigger: el, start: "top 92%", once: true },
                delay: Math.min((i % 6) * 0.04, 0.24),
              }
            );
          });
        }

        document.addEventListener("DOMContentLoaded", function () {
          renderAll();
          animate();
        });
      })();
    