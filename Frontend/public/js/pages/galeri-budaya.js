/**
 * Galeri Budaya — listing budaya dari data bersama (Owner 2026-10-16).
 * =======================================================================
 * - Isi galeri = window.PASINFO_BUDAYA.cultures (25 budaya REAL), bukan mock.
 *   Foto memakai media.url bila ada; karena masih null → foto contoh domain
 *   bergilir (anti-halusinasi, tidak ada hotlink acak).
 * - Klik kartu → detail_budaya.html?slug=<slug> memakai <a href> internal,
 *   sehingga transisi halaman ditangani internal-nav.js + page-transition.js.
 * - Filter media Foto/Video DIHAPUS (Owner 2026-10-16); tersisa filter
 *   kategori yang labelnya mengikuti kategori data (Tradisi/Kesenian/
 *   Situs & Sejarah/Museum).
 * - Lightbox modal DIHAPUS karena kartu kini bernavigasi ke halaman detail.
 * - Kartu Rekomendasi Serupa/Lainnya ← data budaya REAL (detail_budaya),
 *   Destinasi ← data wisata REAL (detail_wisata). Pemilihan teaser:
 *   slice(0,4)/slice(4,8)/slice(0,4).
 * - Pagination jujur: dihitung dari data (9/halaman), teks dinamis.
 */
(function () {
  "use strict";

  var PER_PAGE = 9;

  // FOTO SEMENTARA (Owner 2026-10-14): foto contoh domain bergilir selama
  // media.url masih null. Versi WebP (1600px), sama seperti detail_budaya.
  var BUDAYA_PHOTOS = [
    "../../public/assets/images/budaya/optimized/Tari Terbang Bandung & Tari Pasuruan Kondang.webp",
    "../../public/assets/images/budaya/optimized/Tradisi-Skilot.webp",
    "../../public/assets/images/budaya/optimized/Yadnya Karo Sodoran (Tosari).webp",
  ];

  function budayaPhotoFor(d) {
    if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
    var key = d && d.id != null ? String(d.id) : "";
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return BUDAYA_PHOTOS[sum % BUDAYA_PHOTOS.length];
  }

  // Foto wisata untuk section lintas-domain "Jelajah Destinasi Sekitar Budaya".
  // Pemetaan identik dengan wisata-listing.js (id deterministik).
  var WISATA_PHOTOS = [
    "../../public/assets/images/wisata/optimized/bromo2.webp",
    "../../public/assets/images/wisata/optimized/bromo3.webp",
    "../../public/assets/images/wisata/optimized/bromo_banner.webp",
    "../../public/assets/images/wisata/optimized/purwodadi-botanic-garden.webp",
    "../../public/assets/images/wisata/optimized/taman_safari_indonesia_2.webp",
    "../../public/assets/images/wisata/optimized/air-terjun-kakek-bodo.webp",
  ];

  function wisataPhotoFor(d) {
    if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
    var key = d && d.id != null ? String(d.id) : "";
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return WISATA_PHOTOS[sum % WISATA_PHOTOS.length];
  }

  var CULTURES = (window.PASINFO_BUDAYA && window.PASINFO_BUDAYA.cultures) || [];
  var CATEGORIES = (window.PASINFO_BUDAYA && window.PASINFO_BUDAYA.categories) || [];

  function categoryName(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i].name;
    }
    return id || "";
  }

  var WISATA_DATA = window.PASINFO_WISATA || { categories: [], destinations: [] };
  function wisataCategoryName(id) {
    for (var i = 0; i < WISATA_DATA.categories.length; i++) {
      if (WISATA_DATA.categories[i].id === id) return WISATA_DATA.categories[i].name;
    }
    return id || "";
  }

  function $(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return String(s == null ? "" : s);
  }

  var activeCategory = "Semua";
  var currentPage = 1;

  var categorySidebar = $("category-sidebar");
  var galleryGrid = $("gallery-grid");
  var galleryPager = $("gallery-pager");

  // Owner 2026-10-17 (instruksi 4): sidebar kategori dihapus dari HTML galeri.
  // Kategori kini chip horizontal persis filter budaya.html (basis chip
  // px-4 py-1.5 text-sm, tanpa ikon, warna bud-accent). #category-sidebar
  // tetap dipakai sebagai container chip agar delegasi klik tidak berubah.
  const BUD_GALLERY_FILTER_BASE = "shrink-0 px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap";
  const BUD_GALLERY_FILTER_ACTIVE = "bud-accent";
  const BUD_GALLERY_FILTER_IDLE = "bud-accent-soft";

  function renderCategoryChips() {
    var items = ["Semua"].concat(
      CATEGORIES.map(function (c) {
        return c.name;
      })
    );
    categorySidebar.innerHTML = items
      .map(function (cat) {
        var active = cat === activeCategory;
        return (
          '<button type="button" data-cat="' + esc(cat) + '" class="' +
          BUD_GALLERY_FILTER_BASE + " " + (active ? BUD_GALLERY_FILTER_ACTIVE : BUD_GALLERY_FILTER_IDLE) + '">' +
          esc(cat) +
          "</button>"
        );
      })
      .join("");
  }

  function getFilteredData() {
    return CULTURES.filter(function (item) {
      return activeCategory === "Semua" || categoryName(item.categoryId) === activeCategory;
    });
  }

  function totalPages(data) {
    return Math.max(1, Math.ceil(data.length / PER_PAGE));
  }

  function renderGalleryGrid() {
    var data = getFilteredData();
    if (currentPage > totalPages(data)) currentPage = totalPages(data);
    var start = (currentPage - 1) * PER_PAGE;
    var pageItems = data.slice(start, start + PER_PAGE);
    if (data.length === 0) {
      galleryGrid.classList.add("hidden");
      $("gallery-empty").classList.remove("hidden");
    } else {
      galleryGrid.classList.remove("hidden");
      $("gallery-empty").classList.add("hidden");
    }
    galleryGrid.innerHTML = pageItems
      .map(function (item) {
        return (
          '<a href="detail_budaya.html?slug=' + encodeURIComponent(item.slug) + '" class="group relative bg-gray-100 rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer border border-gray-100 shadow-xs hover:shadow-md transition h-full block" aria-label="Lihat detail ' + esc(item.name) + '">' +
          '<img src="' + budayaPhotoFor(item) + '" alt="Foto ' + esc(item.name) + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />' +
          "</a>"
        );
      })
      .join("");
    var countEl = $("gallery-count");
    if (countEl) countEl.textContent = data.length + " hasil ditemukan";
    // Owner 2026-10-18: teks "Menampilkan data/page" dihapus (Owner).
    renderPager(data);
  }

  // Owner 2026-10-17 (instruksi 3): pager galeri budaya disamakan pager daftar
  // budaya (budaya-listing.js): panah prev/next ("&lsaquo;/&rsaquo;", tanpa
  // jeda "…" pada listing budaya), halaman aktif ungu domain (bud-accent).
  const BUD_PAGER_BASE = "min-w-[2rem] h-8 px-2 rounded-md text-sm font-bold transition-colors";
  const BUD_PAGER_ACTIVE = "bud-accent";
  const BUD_PAGER_IDLE = "bg-white text-slate-600 ring-1 ring-gray-200 hover:bg-gray-100";

  function renderPager(data) {
    var n = totalPages(data);
    var html = "";
    if (n <= 1) {
      galleryPager.innerHTML = "";
      return;
    }
    html +=
      '<button type="button" data-page-prev aria-label="Halaman sebelumnya" ' +
      (currentPage <= 1 ? "disabled" : "") +
      ' class="' + BUD_PAGER_BASE + " " + BUD_PAGER_IDLE + ' disabled:opacity-40">&lsaquo;</button>';
    for (var i = 1; i <= n; i++) {
      var on = i === currentPage;
      html +=
        '<button type="button" data-page="' + i + '" aria-label="Halaman ' + i + '" class="' +
        BUD_PAGER_BASE + " " + (on ? BUD_PAGER_ACTIVE : BUD_PAGER_IDLE) + '">' + i + "</button>";
    }
    html +=
      '<button type="button" data-page-next aria-label="Halaman berikutnya" ' +
      (currentPage >= n ? "disabled" : "") +
      ' class="' + BUD_PAGER_BASE + " " + BUD_PAGER_IDLE + ' disabled:opacity-40">&rsaquo;</button>';
    galleryPager.innerHTML = html;
  }

  // Kartu rekomendasi mengikuti gaya kartu detail_wisata (Owner 2026-10-16):
  // foto + badge kategori (warna mengikuti domain item) + rating + judul +
  // deskripsi + lokasi. Tanpa baris jarak (galeri tidak punya titik acuan).
  function recoCard(item, domain, photo, href, catName) {
    var badgeBg =
      domain === "Kuliner" ? "#2563eb" :
      domain === "Budaya" ? "#6d28d9" :
      "#dc2626";
    var rating = item.rating != null && item.rating !== "" ? item.rating : "-";
    var desc = item.short_description || "";
    var loc = item.address || "";
    return (
      '<a href="' + esc(href) + '" class="group block no-underline h-full">' +
      '<article class="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col bg-white">' +
      '<div class="absolute top-3 left-3 right-3 flex items-center justify-between z-10">' +
      '<span class="inline-block px-3 py-1 text-white text-xs font-bold rounded-md" style="background-color:' + badgeBg + '">' + esc(catName) + "</span>" +
      (domain === "Budaya"
        ? ""
        : '<span class="inline-block px-2.5 py-1 bg-white text-gray-900 text-xs font-semibold rounded-md flex items-center gap-1">' +
          '<img src="../../public/assets/icons/icon_rating.svg" alt="" class="w-4 h-4" />' + esc(rating) +
          "</span>") +
      "</div>" +
      '<div class="relative h-44 sm:h-48 lg:h-52 overflow-hidden bg-gray-200">' +
      '<img src="' + esc(photo) + '" alt="' + esc(item.name) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" loading="lazy" />' +
      "</div>" +
      '<div class="flex flex-col flex-1 p-4 bg-white">' +
      '<h3 class="font-bold text-gray-900 text-xl line-clamp-2 mb-2">' + esc(item.name) + "</h3>" +
      (desc ? '<p class="text-sm text-gray-600 line-clamp-2 mb-3">' + esc(desc) + "</p>" : "") +
      '<div class="text-xs text-gray-600 mt-auto">' +
      (loc ? '<p class="flex items-center gap-1"><img src="../../public/assets/icons/icon_lokasi-hitam.svg" alt="" class="w-4 h-4 flex-shrink-0" />' + esc(loc) + "</p>" : "") +
      "</div>" +
      "</div>" +
      "</article>" +
      "</a>"
    );
  }

  function cultureCards(list) {
    return list
      .map(function (d) {
        return recoCard(d, "Budaya", budayaPhotoFor(d), "detail_budaya.html?slug=" + esc(d.slug), categoryName(d.categoryId));
      })
      .join("");
  }

  function destinasiCards(list) {
    return list
      .map(function (d) {
        return recoCard(d, "Wisata", wisataPhotoFor(d), "detail_wisata.html?slug=" + esc(d.slug), wisataCategoryName(d.categoryId));
      })
      .join("");
  }

  function renderRecommendations() {
    var dests = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];
    var serupa = $("reco-serupa-grid");
    var lainnya = $("reco-lainnya-grid");
    var dest = $("reco-destinasi-grid");
    if (serupa) serupa.innerHTML = cultureCards(CULTURES.slice(0, 4));
    if (lainnya) lainnya.innerHTML = cultureCards(CULTURES.slice(4, 8));
    if (dest) dest.innerHTML = destinasiCards(dests.slice(0, 4));
  }

  // Delegasi klik untuk filter & pagination (navigasi kartu = <a href> biasa).
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-cat],[data-page],[data-page-prev],[data-page-next]");
    if (!t) return;
    if (t.hasAttribute("data-cat")) {
      activeCategory = t.getAttribute("data-cat");
      currentPage = 1;
      renderCategoryChips();
      renderGalleryGrid();
    } else if (t.hasAttribute("data-page-prev") || t.hasAttribute("data-page-next")) {
      currentPage = t.hasAttribute("data-page-prev") ? currentPage - 1 : currentPage + 1;
      renderGalleryGrid();
      var grid = $("gallery-grid");
      if (grid && grid.scrollIntoView) grid.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (t.hasAttribute("data-page")) {
      currentPage = parseInt(t.getAttribute("data-page"), 10) || 1;
      renderGalleryGrid();
      var grid = $("gallery-grid");
      if (grid && grid.scrollIntoView) grid.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  // Hero banner memakai foto item pertama domain (Owner 2026-10-16, item 2).
  function applyHeroBackdrop() {
    var el = $("galeri-hero-bg");
    if (!el) return;
    var first = CULTURES[0];
    if (first) el.style.backgroundImage = "url('" + budayaPhotoFor(first) + "')";
  }

  // Init (data-budaya.js + data-wisata.js wajib termuat sebelumnya).
  applyHeroBackdrop();
  renderCategoryChips();
  renderGalleryGrid();
  renderRecommendations();
})();
