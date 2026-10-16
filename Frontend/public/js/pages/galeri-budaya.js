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

  function renderCategorySidebar() {
    var items = ["Semua"].concat(
      CATEGORIES.map(function (c) {
        return c.name;
      })
    );
    categorySidebar.innerHTML = items
      .map(function (cat) {
        var active = cat === activeCategory;
        return (
          "<li>" +
          '<button type="button" data-cat="' + esc(cat) + '" class="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 font-medium transition ' +
          (active ? "bud-accent-soft font-bold" : "hover:bg-gray-100 text-gray-700") +
          '">' +
          '<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' +
          esc(cat) +
          "</button></li>"
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
    var rangeEl = $("gallery-range");
    if (rangeEl) {
      rangeEl.textContent = data.length
        ? "Menampilkan data dari " + (start + 1) + " - " + Math.min(start + PER_PAGE, data.length)
        : "Menampilkan data dari 0 - 0";
    }
    var pageEl = $("gallery-pageinfo");
    if (pageEl) pageEl.textContent = "Menampilkan page " + currentPage + " dari " + totalPages(data);
    renderPager(data);
  }

  function renderPager(data) {
    var n = totalPages(data);
    var html = "";
    for (var i = 1; i <= n; i++) {
      var active = i === currentPage;
      html +=
        '<button type="button" data-page="' + i + '" aria-label="Halaman ' + i + '" class="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition ' +
        (active ? "bud-accent" : "bg-gray-200 text-gray-600 hover:bg-gray-300") +
        '">' + i + "</button>";
    }
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
      '<h3 class="font-bold text-gray-900 text-base line-clamp-2 mb-2">' + esc(item.name) + "</h3>" +
      (desc ? '<p class="text-xs text-gray-600 line-clamp-2 mb-3">' + esc(desc) + "</p>" : "") +
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
    var t = e.target.closest("[data-cat],[data-page]");
    if (!t) return;
    if (t.hasAttribute("data-cat")) {
      activeCategory = t.getAttribute("data-cat");
      currentPage = 1;
      renderCategorySidebar();
      renderGalleryGrid();
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
  renderCategorySidebar();
  renderGalleryGrid();
  renderRecommendations();
})();
