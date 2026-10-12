/**
 * Galeri Budaya — listing + lightbox (refactor 2026-10-09, Owner approved).
 * =======================================================================
 * - Dipindah dari inline <script>; onclick inline diganti delegasi data-*.
 * - Foto memakai placeholder lokal (poster-dummy.svg), BUKAN picsum —
 *   tidak ada hotlink acak/fabrikasi identitas (anti-halusinasi).
 * - Label kategori filter mengikuti MOCKUP (Semua/Tradisional/Kesenian/
 *   Sejarah/Museum), BUKAN kategori halaman — keputusan mockup-wins.
 * - Kartu Rekomendasi Serupa/Lainnya ← data budaya REAL (detail_budaya);
 *   Destinasi ← data wisata REAL (detail_wisata). Pemilihan teaser:
 *   slice(0,4)/slice(4,8)/slice(0,4) — tampa konteks item acuan.
 * - Pagination jujur: dihitung dari data (9/halaman), teks dinamis.
 */
(function () {
  "use strict";

  var POSTER = "../../public/assets/images/poster-dummy.svg";
  var PER_PAGE = 9;

  // Galeri: judul/kategori mengikuti mockup; foto placeholder lokal.
  var GALLERY = [
    { id: 1, title: "Jaranan Puto", category: "Tradisional", type: "Foto", isVideo: false, desc: "Kab. Pasuruan" },
    { id: 2, title: "Event Lampion", category: "Kesenian", type: "Video", isVideo: true, desc: "Kab. Pasuruan" },
    { id: 3, title: "Budaya Tari Geprek", category: "Tradisional", type: "Foto", isVideo: false, desc: "Kab. Pasuruan" },
    { id: 4, title: "Kuliner Bakso Arab", category: "Kesenian", type: "Foto", isVideo: false, desc: "Kota Pasuruan" },
    { id: 5, title: "Larung Sesaji Pesisir", category: "Sejarah", type: "Video", isVideo: true, desc: "Kab. Pasuruan" },
    { id: 6, title: "Museum Kebudayaan", category: "Museum", type: "Foto", isVideo: false, desc: "Kota Pasuruan" },
    { id: 7, title: "Tari Reog Pasuruan", category: "Kesenian", type: "Foto", isVideo: false, desc: "Kab. Pasuruan" },
    { id: 8, title: "Upacara Karo Bromo", category: "Sejarah", type: "Foto", isVideo: false, desc: "Kab. Pasuruan" },
    { id: 9, title: "Pentas Ludruk Pasuruan", category: "Kesenian", type: "Video", isVideo: true, desc: "Kota Pasuruan" },
  ];

  function $(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return String(s == null ? "" : s);
  }

  var activeMediaType = "Semua";
  var activeCategory = "Semua";
  var currentPage = 1;

  var mediaFiltersWrap = $("gallery-media-filters");
  var categorySidebar = $("category-sidebar");
  var galleryGrid = $("gallery-grid");
  var galleryPager = $("gallery-pager");

  function renderMediaFilters() {
    var types = ["Semua", "Foto", "Video"];
    mediaFiltersWrap.innerHTML = types
      .map(function (type) {
        var active = type === activeMediaType;
        return (
          '<button type="button" data-media="' + type + '" class="px-5 py-1.5 rounded-full text-xs font-semibold transition ' +
          (active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300") +
          '">' + type + "</button>"
        );
      })
      .join("");
  }

  function renderCategorySidebar() {
    // Label mockup (Tradisional/Sejarah) — disengaja, lihat header file.
    var categories = ["Semua", "Tradisional", "Kesenian", "Sejarah", "Museum"];
    categorySidebar.innerHTML = categories
      .map(function (cat) {
        var active = cat === activeCategory;
        return (
          "<li>" +
          '<button type="button" data-cat="' + cat + '" class="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 font-medium transition ' +
          (active ? "bg-gray-200 text-gray-900 font-bold" : "hover:bg-gray-100 text-gray-700") +
          '">' +
          '<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>' +
          esc(cat) +
          "</button></li>"
        );
      })
      .join("");
  }

  function getFilteredData() {
    return GALLERY.filter(function (item) {
      var matchMedia = activeMediaType === "Semua" || item.type === activeMediaType;
      var matchCat = activeCategory === "Semua" || item.category === activeCategory;
      return matchMedia && matchCat;
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
      .map(function (item, idx) {
        return (
          '<div data-modal="' + (start + idx) + '" class="group relative bg-gray-100 rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer border border-gray-100 shadow-xs hover:shadow-md transition h-full">' +
          '<img src="' + POSTER + '" alt="' + esc(item.title) + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />' +
          (item.isVideo
            ? '<div class="absolute inset-0 flex items-center justify-center"><div class="w-10 h-10 bg-black/40 backdrop-blur-xs rounded-full flex items-center justify-center text-white"><svg class="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>'
            : "") +
          "</div>"
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
        (active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300") +
        '">' + i + "</button>";
    }
    galleryPager.innerHTML = html;
  }

  // Rekomendasi dari DATA REAL (lihat header file).
  function cultureCards(list) {
    return list
      .map(function (d) {
        return (
          '<a href="detail_budaya.html?slug=' + esc(d.slug) + '" class="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-2xs group cursor-pointer flex flex-col h-full">' +
          '<div class="relative h-24 bg-gradient-to-br from-blue-500 to-blue-700 overflow-hidden">' +
          '<span class="absolute top-1.5 right-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">' + esc(d.categoryId || "") + "</span>" +
          "</div>" +
          '<div class="p-2.5 flex-1 flex flex-col">' +
          '<h4 class="text-xs font-bold text-gray-900 truncate group-hover:text-blue-700">' + esc(d.name) + "</h4>" +
          '<p class="text-[10px] text-gray-500 mt-0.5 line-clamp-1">' + esc(d.address || "") + "</p>" +
          "</div></div>"
        );
      })
      .join("");
  }

  function destinasiCards(list) {
    return list
      .map(function (d) {
        return (
          '<a href="detail_wisata.html?slug=' + esc(d.slug) + '" class="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-2xs group cursor-pointer flex flex-col h-full">' +
          '<div class="relative h-24 bg-gradient-to-br from-emerald-600 to-slate-800 overflow-hidden">' +
          '<span class="absolute top-1.5 right-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">Wisata</span>' +
          "</div>" +
          '<div class="p-2.5 flex-1 flex flex-col">' +
          '<h4 class="text-xs font-bold text-gray-900 truncate group-hover:text-blue-700">' + esc(d.name) + "</h4>" +
          '<p class="text-[10px] text-gray-500 mt-0.5 line-clamp-1">' + esc(d.address || "") + "</p>" +
          "</div></div>"
        );
      })
      .join("");
  }

  function renderRecommendations() {
    var cultures = (window.PASINFO_BUDAYA && window.PASINFO_BUDAYA.cultures) || [];
    var dests = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];
    var serupa = $("reco-serupa-grid");
    var lainnya = $("reco-lainnya-grid");
    var dest = $("reco-destinasi-grid");
    if (serupa) serupa.innerHTML = cultureCards(cultures.slice(0, 4));
    if (lainnya) lainnya.innerHTML = cultureCards(cultures.slice(4, 8));
    if (dest) dest.innerHTML = destinasiCards(dests.slice(0, 4));
  }

  // Delegasi klik (pengganti onclick inline).
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-media],[data-cat],[data-page],[data-modal]");
    if (!t) return;
    if (t.hasAttribute("data-media")) {
      activeMediaType = t.getAttribute("data-media");
      currentPage = 1;
      renderMediaFilters();
      renderGalleryGrid();
    } else if (t.hasAttribute("data-cat")) {
      activeCategory = t.getAttribute("data-cat");
      currentPage = 1;
      renderCategorySidebar();
      renderGalleryGrid();
    } else if (t.hasAttribute("data-page")) {
      currentPage = parseInt(t.getAttribute("data-page"), 10) || 1;
      renderGalleryGrid();
      var grid = $("gallery-grid");
      if (grid && grid.scrollIntoView) grid.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (t.hasAttribute("data-modal")) {
      openModal(parseInt(t.getAttribute("data-modal"), 10) || 0);
    }
  });

  // Lightbox.
  var currentModalIdx = 0;
  function openModal(idx) {
    var data = getFilteredData();
    if (!data[idx]) return;
    currentModalIdx = idx;
    var item = data[idx];
    $("modal-image").src = POSTER;
    $("modal-image").alt = item.title;
    $("modal-title").textContent = item.title;
    $("modal-desc").textContent = item.desc;
    var modal = $("gallery-modal");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    $("gallery-modal").classList.add("hidden");
    $("gallery-modal").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  $("gallery-modal-close").addEventListener("click", closeModal);
  $("modal-prev").addEventListener("click", function () {
    var data = getFilteredData();
    currentModalIdx = (currentModalIdx - 1 + data.length) % data.length;
    openModal(currentModalIdx);
  });
  $("modal-next").addEventListener("click", function () {
    var data = getFilteredData();
    currentModalIdx = (currentModalIdx + 1) % data.length;
    openModal(currentModalIdx);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  // Init (data-budaya.js + data-wisata.js wajib termuat sebelumnya).
  renderMediaFilters();
  renderCategorySidebar();
  renderGalleryGrid();
  renderRecommendations();
})();
