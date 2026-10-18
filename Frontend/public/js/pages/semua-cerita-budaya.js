/**
 * semua-cerita-budaya.js — Halaman "Semua Cerita di Balik Budaya".
 * ============================================================================
 * Owner 2026-10-18 (ronde-2): KONSEP SAMA PERSIS menu_kuliner.html +
 * menu-kuliner.js (patokan Owner), aksen domain ungu (bud-accent):
 *   - Hero card detail: foto aset budaya REAL (media.url masih null →
 *     fallback hash, pola antar halaman); TANPA rating & tanpa tombol
 *     Simpan/Bagikan (data cerita tidak punya ulasan — pilihan Owner).
 *   - Daftar Cerita: filter pill mirror #menu-filter-row, grid mirror
 *     #menu-grid (1 / sm 3 / lg 4), kartu mirror menuCardHTML dengan data
 *     cerita (judul, deskripsi, lokasi; tanpa harga/rating → footer
 *     "Baca Cerita →"), like dummy mirror menu.
 *   - Pager = tombol saja dipusatkan (tanpa teks "Menampilkan data",
 *     konsisten keputusan Owner untuk halaman budaya), gaya tombol = pola
 *     menu-kuliner (‹ angka ›, aktif aksen ungu).
 *   - Rekomendasi Cerita Budaya = mirror sharedCard (badge kategori, foto
 *     h-44, judul, deskripsi, lokasi) → cerita_budaya.html?slug=.
 *   - Jelajah Destinasi Lainnya = mirror sharedCard destinasi wisata →
 *     detail_wisata.html?slug= (TANPA klaim jarak/terdekat — halaman ini
 *     tidak punya titik acuan wilayah; data & foto dari data-wisata REAL).
 */
(function () {
  "use strict";

  function init() {
    function $(id) {
      return document.getElementById(id);
    }
    function esc(s) {
      return String(s == null ? "" : s);
    }

    var BUD = window.PASINFO_BUDAYA || { cultures: [], stories: [], categories: [] };
    var CULTURES = BUD.cultures || [];
    var STORIES = BUD.stories || [];
    var CATEGORIES = BUD.categories || [];
    if (!STORIES.length || !CULTURES.length) return;

    /* Foto budaya: URL lokal REAL (aset Owner), hash deterministik per id —
       pola sama agenda/galeri/detail budaya. */
    var BUDAYA_PHOTOS = [
      "../../public/assets/images/budaya/optimized/Tari Terbang Bandung & Tari Pasuruan Kondang.webp",
      "../../public/assets/images/budaya/optimized/Tradisi-Skilot.webp",
      "../../public/assets/images/budaya/optimized/Yadnya Karo Sodoran (Tosari).webp",
    ];
    var BUDAYA_THUMBS = [
      "../../public/assets/images/budaya/optimized/Tari Terbang Bandung & Tari Pasuruan Kondang.thumb.webp",
      "../../public/assets/images/budaya/optimized/Tradisi-Skilot.thumb.webp",
      "../../public/assets/images/budaya/optimized/Yadnya Karo Sodoran (Tosari).thumb.webp",
    ];
    function photoHash(d) {
      var key = d && d.id != null ? String(d.id) : "";
      var sum = 0;
      for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
      return sum;
    }
    function budayaPhotoFor(c) {
      if (c && c.media && c.media[0] && c.media[0].url) return c.media[0].url;
      return BUDAYA_PHOTOS[photoHash(c) % BUDAYA_PHOTOS.length];
    }
    function budayaThumbFor(c) {
      if (c && c.media && c.media[0] && c.media[0].url) return c.media[0].url;
      return BUDAYA_THUMBS[photoHash(c) % BUDAYA_THUMBS.length];
    }
    function categoryName(id) {
      for (var i = 0; i < CATEGORIES.length; i++) {
        if (CATEGORIES[i].id === id) return CATEGORIES[i].name;
      }
      return id || "";
    }

    var STORY_ITEMS = STORIES.map(function (s) {
      var c = null;
      for (var i = 0; i < CULTURES.length; i++) {
        if (CULTURES[i].id === s.cultureId) { c = CULTURES[i]; break; }
      }
      if (!c) return null;
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        desc: c.short_description || "",
        location: c.address || "",
        category: categoryName(c.categoryId),
        categoryId: c.categoryId,
        photo: budayaPhotoFor(c),
        thumb: budayaThumbFor(c),
      };
    }).filter(Boolean);

    /* ===== HERO: foto budaya (mirror setHeroPhoto menu-kuliner.js) ===== */
    function setHeroPhoto(el, url, name) {
      if (!el || !url) return;
      var img = new Image();
      img.className = "w-full h-full object-cover";
      img.alt = "Foto " + name;
      img.decoding = "async";
      var done = false;
      function reveal() {
        if (done) return;
        done = true;
        el.textContent = "";
        img.style.opacity = "0";
        img.style.transition = "opacity 700ms cubic-bezier(0.22,1,0.36,1)";
        el.appendChild(img);
        el.setAttribute("aria-label", "Foto " + name);
        void img.offsetWidth;
        img.style.opacity = "1";
      }
      img.onload = reveal;
      img.src = url;
      if (img.complete && img.naturalWidth > 0) reveal();
    }
    var heroMedia = $("hero-media");
    if (heroMedia) setHeroPhoto(heroMedia, budayaPhotoFor(STORY_ITEMS[0]), STORY_ITEMS[0].name);

    /* ===== DAFTAR CERITA (mirror menu & harga menu-kuliner.js) ===== */
    var filter = "Semua";
    var page = 1;
    function perPage() {
      return window.matchMedia("(max-width: 639px)").matches ? 6 : 12;
    }

    var LIKE_ICON =
      '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';
    var PIN_ICON =
      '<img src="../../public/assets/icons/icon_lokasi-hitam.svg" alt="" aria-hidden="true" class="h-3 w-3 shrink-0 object-contain" />';

    /* Kartu cerita mirror menuCardHTML: badge kategori kiri-atas,
       like kanan-atas, foto h-44, judul text-xl, deskripsi text-sm,
       meta lokasi text-xs, footer (pengganti harga): "Baca Cerita →". */
    function cardHTML(d) {
      return (
        '<article data-story-id="' + esc(d.id) + '" data-story-slug="' + esc(d.slug) + '"' +
        ' class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col h-full group cursor-pointer">' +
        '<div class="relative h-44 bg-gradient-to-br from-violet-900 via-stone-800 to-slate-900 flex items-center justify-center overflow-hidden">' +
        '<img src="' + esc(d.photo) + '" alt="Foto ' + esc(d.name) + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />' +
        '<span class="absolute top-3 left-3 bud-accent text-white text-xs font-bold rounded-md px-3 py-1">' + esc(d.category) + "</span>" +
        '<button type="button" data-like="' + esc(d.id) + '" aria-pressed="false" aria-label="Sukai cerita ' + esc(d.name) + '" class="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-gray-500 hover:text-red-500 shadow-sm transition-colors">' + LIKE_ICON + "</button>" +
        "</div>" +
        '<div class="p-4 flex-1 flex flex-col justify-between">' +
        "<div>" +
        '<h4 class="font-bold text-gray-900 text-xl line-clamp-2">' + esc(d.name) + "</h4>" +
        '<p class="text-sm text-gray-600 mt-1 line-clamp-2">' + esc(d.desc) + "</p>" +
        '<div class="mt-2 space-y-1 text-xs text-gray-600">' +
        '<p class="flex items-center gap-1.5">' + PIN_ICON + '<span class="line-clamp-1">' + esc(d.location) + "</span></p>" +
        "</div>" +
        "</div>" +
        '<div class="mt-3 pt-3 border-t border-gray-100">' +
        '<span class="text-xs font-bold bud-accent-text">Baca Cerita →</span>' +
        "</div></div></article>"
      );
    }
    function filteredList() {
      if (filter === "Semua") return STORY_ITEMS;
      return STORY_ITEMS.filter(function (d) { return d.categoryId === filter; });
    }
    /* Autorertece tinggi grid antar halaman (mirror animateGridResize
       menu-kuliner.js). */
    var gridResizeAnim = null;
    function animateGridResize(grid, fromHeight) {
      if (!grid || !grid.animate) return;
      var reduced =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;
      if (gridResizeAnim) {
        try { gridResizeAnim.cancel(); } catch (e) {}
        gridResizeAnim = null;
      }
      var toHeight = grid.offsetHeight;
      if (!fromHeight || fromHeight === toHeight) return;
      grid.style.overflow = "hidden";
      grid.style.height = fromHeight + "px";
      void grid.offsetHeight;
      var anim = grid.animate(
        [{ height: fromHeight + "px" }, { height: toHeight + "px" }],
        { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
      );
      gridResizeAnim = anim;
      anim.onfinish = function () {
        if (gridResizeAnim !== anim) return;
        gridResizeAnim = null;
        grid.style.height = toHeight + "px";
        grid.style.overflow = "";
        try { anim.cancel(); } catch (e) {}
        requestAnimationFrame(function () { grid.style.height = ""; });
      };
    }
    function scrollListTop() {
      var grid = $("cerita-grid");
      if (!grid) return;
      var target = grid.closest("section") || grid;
      var reduced =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      try {
        target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      } catch (e) {
        target.scrollIntoView();
      }
    }

    /* Pager tombol saja (tanpa teks info, konsisten keputusan lama);
       style tombol mirror pagination-controls menu-kuliner.js. */
    function renderPager(list) {
      var pagerEl = $("cerita-pager");
      if (!pagerEl) return;
      var pages = Math.max(1, Math.ceil(list.length / perPage()));
      if (page > pages) page = pages;
      if (page < 1) page = 1;
      if (pages <= 1) { pagerEl.innerHTML = ""; return; }
      var base = "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ";
      var html = "";
      html += '<button type="button" data-pager="' + (page - 1) + '"' + (page <= 1 ? " disabled" : "") +
        ' class="' + base + "border border-gray-300 " + (page <= 1 ? "text-gray-300" : "text-gray-700 hover:bg-gray-100") + '">‹</button>';
      for (var p = 1; p <= pages; p++) {
        html += '<button type="button" data-pager="' + p + '" class="' + base + (p === page ? "bud-accent" : "border border-gray-300 text-gray-700 hover:bg-gray-100") + '">' + p + "</button>";
      }
      html += '<button type="button" data-pager="' + (page + 1) + '"' + (page >= pages ? " disabled" : "") +
        ' class="' + base + "border border-gray-300 " + (page >= pages ? "text-gray-300" : "text-gray-700 hover:bg-gray-100") + '">›</button>';
      pagerEl.innerHTML = html;
    }

    function renderList(fromHeight) {
      var grid = $("cerita-grid");
      if (!grid) return;
      var list = filteredList();
      if (!list.length) {
        grid.innerHTML = "";
        var emptyEl = $("cerita-empty");
        if (emptyEl) emptyEl.classList.remove("hidden");
        renderPager(list);
        return;
      }
      var emptyEl = $("cerita-empty");
      if (emptyEl) emptyEl.classList.add("hidden");
      var pages = Math.max(1, Math.ceil(list.length / perPage()));
      if (page > pages) page = pages;
      var start = (page - 1) * perPage();
      grid.innerHTML = list.slice(start, start + perPage()).map(cardHTML).join("");
      renderPager(list);
      animateGridResize(grid, fromHeight);
    }

    document.addEventListener("click", function (e) {
      var likeBtn = e.target.closest("[data-like]");
      if (likeBtn) {
        var on = likeBtn.getAttribute("aria-pressed") !== "true";
        likeBtn.setAttribute("aria-pressed", on ? "true" : "false");
        likeBtn.classList.toggle("text-red-500", on);
        likeBtn.classList.toggle("text-gray-500", !on);
        return;
      }
      var fb = e.target.closest("[data-filter-btn]");
      if (fb) {
        filter = fb.getAttribute("data-filter") || "Semua";
        page = 1;
        Array.prototype.forEach.call(document.querySelectorAll("[data-filter-btn]"), function (b) {
          var on = b.getAttribute("data-filter") === filter;
          var base = "px-4 py-2 rounded-full font-semibold text-sm transition-colors ";
          b.className = base + (on ? "bud-accent" : "bg-gray-200 text-gray-700 hover:bg-gray-300");
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        renderList();
        return;
      }
      var pb = e.target.closest("#cerita-pager [data-pager]");
      if (pb && !pb.disabled) {
        var p = parseInt(pb.getAttribute("data-pager"), 10);
        if (!isNaN(p) && p >= 1 && p !== page) {
          var grid = $("cerita-grid");
          var fromHeight = grid ? grid.offsetHeight : 0;
          page = p;
          renderList(fromHeight);
          scrollListTop();
        }
        return;
      }
      var card = e.target.closest("[data-story-id]");
      if (card) {
        var slug = card.getAttribute("data-story-slug");
        if (slug) window.location.href = "cerita_budaya.html?slug=" + slug;
      }
    });

    renderList();

    /* ===== KARTU SHARED (mirror sharedCard menu-kuliner.js, aksen domain) =
       badge kategori kiri-atas, foto h-44, judul text-xl, deskripsi,
       lokasi. Budaya: TANPA badge rating (rating tidak ada di data); wisata:
       badge kategori merah #dc2626 persis patokan, TANPA baris jarak. */
    function budayaCard(d, href) {
      var media =
        '<div class="relative h-44 overflow-hidden bg-gray-200"><img src="' + esc(d.thumb) + '" alt="Foto ' + esc(d.name) + '" loading="lazy" class="w-full h-full object-cover" /></div>';
      return (
        '<a href="' + href + '" class="group block no-underline h-full">' +
        '<article class="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col bg-white">' +
        '<div class="absolute top-3 left-3 z-10">' +
        '<span class="inline-block px-3 py-1 text-white text-xs font-bold rounded-md bud-accent">' + esc(d.category) + "</span>" +
        "</div>" +
        media +
        '<div class="flex flex-col flex-1 p-4 bg-white">' +
        '<h3 class="font-bold text-gray-900 text-xl line-clamp-2 mb-2">' + esc(d.name) + "</h3>" +
        (d.desc ? '<p class="text-sm text-gray-600 line-clamp-2 mb-3">' + esc(d.desc) + "</p>" : "") +
        '<div class="text-xs text-gray-600 mt-auto space-y-1">' +
        (d.location ? '<p class="flex items-center gap-1"><img src="../../public/assets/icons/icon_lokasi-hitam.svg" alt="" class="w-4 h-4 flex-shrink-0" />' + esc(d.location) + "</p>" : "") +
        "</div>" +
        "</div>" +
        "</article>" +
        "</a>"
      );
    }

    var recoGrid = $("reco-cerita-grid");
    if (recoGrid) {
      recoGrid.innerHTML = STORY_ITEMS.slice(0, 4).map(function (d) {
        return budayaCard(d, "cerita_budaya.html?slug=" + d.slug);
      }).join("");
    }

    /* Jelajah destinasi lainnya: data REAL dari PASINFO_WISATA (tanpa
       pernyataan jarak). */
    var WD = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];
    var WCAT = (window.PASINFO_WISATA && window.PASINFO_WISATA.categories) || [];
    function wisataPhotoFor(d) {
      if (d && d.media && d.media[0]) {
        return d.media[0].thumbnail_url || d.media[0].url || null;
      }
      return null;
    }
    function wisataCard(d) {
      var photo = wisataPhotoFor(d);
      var catName_v = "Wisata";
      for (var w = 0; w < WCAT.length; w++) {
        if (WCAT[w].id === d.categoryId) { catName_v = WCAT[w].name; break; }
      }
      var media = photo
        ? '<div class="relative h-44 overflow-hidden bg-gray-200"><img src="' + photo + '" alt="Foto ' + esc(d.name) + '" loading="lazy" class="w-full h-full object-cover" /></div>'
        : '<div class="relative h-44 overflow-hidden bg-gradient-to-br from-amber-800 via-stone-700 to-slate-800" role="img" aria-label="Foto ' + esc(d.name) + ' (placeholder)"></div>';
      return (
        '<a href="detail_wisata.html?slug=' + esc(d.slug) + '" class="group block no-underline h-full">' +
        '<article class="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col bg-white">' +
        '<div class="absolute top-3 left-3 z-10">' +
        '<span class="inline-block px-3 py-1 text-white text-xs font-bold rounded-md" style="background-color:#dc2626">' + esc(catName_v) + "</span>" +
        "</div>" +
        media +
        '<div class="flex flex-col flex-1 p-4 bg-white">' +
        '<h3 class="font-bold text-gray-900 text-xl line-clamp-2 mb-2">' + esc(d.name) + "</h3>" +
        (d.short_description ? '<p class="text-sm text-gray-600 line-clamp-2 mb-3">' + esc(d.short_description) + "</p>" : "") +
        '<div class="text-xs text-gray-600 mt-auto space-y-1">' +
        (d.address ? '<p class="flex items-center gap-1"><img src="../../public/assets/icons/icon_lokasi-hitam.svg" alt="" class="w-4 h-4 flex-shrink-0" />' + esc(d.address) + "</p>" : "") +
        "</div>" +
        "</div>" +
        "</article>" +
        "</a>"
      );
    }
    var nearbyGrid = $("nearby-grid");
    if (nearbyGrid) {
      nearbyGrid.innerHTML = WD.slice(0, 4).map(wisataCard).join("");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
