/**
 * Galeri Kuliner — listing kuliner dari data bersama (Owner 2026-10-16, item 5).
 * =======================================================================
 * Mirror galeri-budaya.js (konsep UI/UX sama), aksen mengikuti domain Kuliner
 * (biru, sama dengan badge hero kuliner.html).
 * - Isi galeri = window.PASINFO_KULINER.culinaries (34 kuliner REAL).
 *   Foto memakai media[0].url bila ada; karena masih null → foto contoh domain
 *   bergilir (anti-halusinasi; sama seperti kuliner-listing.js).
 * - Klik kartu → detail_kuliner.html?slug=<slug> memakai <a href> internal,
 *   sehingga transisi halaman ditangani internal-nav.js + page-transition.js.
 * - Filter = kategori dari data (Tradisional/Camilan & Oleh-oleh/
 *   Kopi & Minuman/Seafood). Tidak ada filter media.
 * - Kartu Rekomendasi Serupa/Lainnya ← data kuliner REAL (detail_kuliner),
 *   section ke-3 ← data wisata REAL (detail_wisata).
 * - Pagination dihitung dari data (9/halaman), teks dinamis.
 * CATATAN loading: data-kuliner.js dimuat TANPA defer sebelum file ini
 * (pola detail_kuliner.html), jadi dataset aman dibaca di top-level init.
 */
(function () {
  "use strict";

  var PER_PAGE = 9;

  // FOTO SEMENTARA (Owner 2026-10-15/16): sama dengan kuliner-listing.js
  // KULINER_FALLBACK_PHOTOS (urutan & pemetaan identik, versi penuh).
  var KULINER_PHOTOS = [
    "../../public/assets/images/kuliner/optimized/Lontong Kupang Kraton.webp",
    "../../public/assets/images/kuliner/optimized/Nasi Punel.webp",
    "../../public/assets/images/kuliner/optimized/soto-pasuruan.webp",
  ];

  function kulinerPhotoFor(d) {
    if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
    var key = d && d.id != null ? String(d.id) : "";
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return KULINER_PHOTOS[sum % KULINER_PHOTOS.length];
  }

  // Foto wisata untuk section lintas-domain "Jelajah Wisata Sekitar".
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

  var CULINARIES = (window.PASINFO_KULINER && window.PASINFO_KULINER.culinaries) || [];
  var CATEGORIES = (window.PASINFO_KULINER && window.PASINFO_KULINER.categories) || [];
  var DESTINATIONS = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];
  var WISATA_CATEGORIES = (window.PASINFO_WISATA && window.PASINFO_WISATA.categories) || [];

  function categoryName(id, list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].name;
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
  // Kategori kini chip horizontal dengan UI/UX filter budaya.html (basis chip
  // px-4 py-1.5 text-sm, tanpa ikon), warna aktif/idle mengikuti domain
  // kuliner. #category-sidebar tetap dipakai sebagai container chip agar
  // delegasi klik tidak berubah.
  const GALLERY_FILTER_BASE = "shrink-0 px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap";
  const GALLERY_FILTER_ACTIVE = "bg-blue-600 text-white";
  const GALLERY_FILTER_IDLE = "bg-blue-100 text-blue-700";

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
          GALLERY_FILTER_BASE + " " + (active ? GALLERY_FILTER_ACTIVE : GALLERY_FILTER_IDLE) + '">' +
          esc(cat) +
          "</button>"
        );
      })
      .join("");
  }

  function getFilteredData() {
    return CULINARIES.filter(function (item) {
      return (
        activeCategory === "Semua" ||
        categoryName(item.categoryId, CATEGORIES) === activeCategory
      );
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
          '<a href="detail_kuliner.html?slug=' + encodeURIComponent(item.slug) + '" class="group relative bg-gray-100 rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer border border-gray-100 shadow-xs hover:shadow-md transition h-full block" aria-label="Lihat detail ' + esc(item.name) + '">' +
          '<img src="' + kulinerPhotoFor(item) + '" alt="Foto ' + esc(item.name) + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />' +
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

  // Owner 2026-10-17 (instruksi 3): pager galeri disamakan pager daftar
  // kuliner (kuliner-listing.js): panah prev/next, jendela 3 angka dengan
  // "…", halaman aktif biru domain kuliner.
  const PAGER_BASE = "min-w-[2rem] h-8 px-2 rounded-md text-xs font-bold transition-colors";
  const PAGER_ACTIVE = "bg-blue-600 text-white";
  const PAGER_IDLE = "bg-white text-slate-600 ring-1 ring-gray-200 hover:bg-gray-100";

  function pagerItems(current, total) {
    // Konsep sama dengan kuliner-listing.js: jendela 3 angka berakhir di
    // halaman aktif (tidak menambah angka), angka awal muncul saat jendela
    // menyentuh halaman terakhir.
    var size = 3;
    var start = Math.max(1, Math.min(current - (size - 1), total - size + 1));
    var end = Math.min(total, start + size - 1);
    var items = [];
    if (start > 1 && end >= total) {
      items.push(1);
      if (start > 2) items.push("…");
    }
    for (var i = start; i <= end; i++) items.push(i);
    if (end < total) {
      items.push("…");
      items.push(total);
    }
    return items;
  }

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
      ' class="' + PAGER_BASE + " " + PAGER_IDLE + ' disabled:opacity-40">&lsaquo;</button>';
    pagerItems(currentPage, n).forEach(function (it) {
      if (it === "…") {
        html +=
          '<span aria-hidden="true" class="' + PAGER_BASE + ' text-slate-400 select-none">&hellip;</span>';
        return;
      }
      var on = it === currentPage;
      html +=
        '<button type="button" data-page="' + it + '" aria-label="Halaman ' + it + '" class="' +
        PAGER_BASE + " " + (on ? PAGER_ACTIVE : PAGER_IDLE) + '">' + it + "</button>";
    });
    html +=
      '<button type="button" data-page-next aria-label="Halaman berikutnya" ' +
      (currentPage >= n ? "disabled" : "") +
      ' class="' + PAGER_BASE + " " + PAGER_IDLE + ' disabled:opacity-40">&rsaquo;</button>';
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

  // Kartu kuliner (Rekomendasi Serupa / Lainnya).
  function kulinerCards(list) {
    return list
      .map(function (d) {
        return recoCard(d, "Kuliner", kulinerPhotoFor(d), "detail_kuliner.html?slug=" + esc(d.slug), categoryName(d.categoryId, CATEGORIES));
      })
      .join("");
  }

  // Kartu wisata (section "Jelajah Wisata Sekitar").
  function wisataCards(list) {
    return list
      .map(function (d) {
        return recoCard(d, "Wisata", wisataPhotoFor(d), "detail_wisata.html?slug=" + esc(d.slug), categoryName(d.categoryId, WISATA_CATEGORIES));
      })
      .join("");
  }

  function renderRecommendations() {
    var serupa = $("reco-serupa-grid");
    var lainnya = $("reco-lainnya-grid");
    var dest = $("reco-destinasi-grid");
    if (serupa) serupa.innerHTML = kulinerCards(CULINARIES.slice(0, 4));
    if (lainnya) lainnya.innerHTML = kulinerCards(CULINARIES.slice(4, 8));
    if (dest) dest.innerHTML = wisataCards(DESTINATIONS.slice(0, 4));
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
    var first = CULINARIES[0];
    if (first) el.style.backgroundImage = "url('" + kulinerPhotoFor(first) + "')";
  }

  // Init (data-kuliner.js + data-wisata.js wajib termuat sebelumnya).
  applyHeroBackdrop();
  renderCategoryChips();
  renderGalleryGrid();
  renderRecommendations();
})();
