/**
 * Menu Kuliner — hero by-slug + menu + rekomendasi + sekitar (2026-10-09).
 * ======================================================================
 * - Dipindah dari inline <script> + diperbaiki (Owner approved):
 *   (a) Hero + tab "Informasi Utama" mengikuti ?slug= dari DATA REAL
 *       (sebelumnya statis "Soto Ayam Kambing" + tab tanpa slug).
 *   (b) Menu ← window.PASINFO_KULINER_MENUS[slug] (15 item/tempat, MOCK;
 *       data-kuliner-menus.js) + filter kategori (Makanan/Minuman/Cemilan)
 *       + paginasi 12/halaman. Fallback: empty-state jujur bila data kosong.
 *   (c) Section "Rekomendasi Kuliner Lainnya" sesuai mockup DITAMBAHKAN
 *       (sebelumnya tak ada di HTML → renderRekomendasi() crash TypeError
 *       dan mematikan render Sekitar di bawahnya).
 *   (d) Sekitar = destinasi wisata TERDEKAT (nearby.js) + link detail_wisata
 *       + jarak hitung; tombol → wisata.html (Owner direction Sekitar).
 *   (e) Owner 2026-10-15 (5-task round): hero memakai image kuliner terpilih
 *       (sama dgn detail); kartu menu kaya info (judul, deskripsi, lokasi,
 *       rating + like, jam operasional, status operasional, harga); section
 *       Rekomendasi + Sekitar diseragamkan dgn detail_kuliner.html (bg-gray-100,
 *       kartu p-2.5, grid gap-3 sm:gap-4).
 * - Dijalankan setelah DOMContentLoaded agar data-*.js (defer) siap.
 */
(function () {
  "use strict";

  function init() {
    function $(id) {
      return document.getElementById(id);
    }
    function setText(id, text) {
      var el = $(id);
      if (el) el.textContent = text;
    }
    function esc(s) {
      return String(s == null ? "" : s);
    }
    function slugParam() {
      try {
        return new URLSearchParams(window.location.search).get("slug");
      } catch (e) {
        return null;
      }
    }
    function showToast(msg) {
      var t = $("toast");
      if (!t) {
        try { window.alert(msg); } catch (e) {}
        return;
      }
      t.textContent = msg;
      t.classList.remove("hidden");
      try {
        if (t._timer) clearTimeout(t._timer);
        t._timer = setTimeout(function () { t.classList.add("hidden"); }, 2200);
      } catch (e) {}
    }

    var DATA = (typeof window !== "undefined" && window.PASINFO_KULINER) || null;
    if (!DATA || !Array.isArray(DATA.culinaries) || !DATA.culinaries.length) return;

    var slug = slugParam();
    var item = null;
    for (var i = 0; i < DATA.culinaries.length; i++) {
      if (DATA.culinaries[i].slug === slug) {
        item = DATA.culinaries[i];
        break;
      }
    }
    if (!item) item = DATA.culinaries[0];
    if (!item) return;

    // Foto: sumber sama dengan halaman Detail Kuliner (media.url bila ada;
    // bila null → gambar contoh domain bergilir deterministik per id).
    // Owner 2026-10-15: hero menu & harga memakai image kuliner terpilih.
    var KULINER_FALLBACK_PHOTOS = [
      "../../public/assets/images/kuliner/optimized/Lontong Kupang Kraton.webp",
      "../../public/assets/images/kuliner/optimized/Nasi Punel.webp",
      "../../public/assets/images/kuliner/optimized/soto-pasuruan.webp"
    ];
    function photoHash(d) {
      var key = d && d.id != null ? String(d.id) : "";
      var sum = 0;
      for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
      return sum;
    }
    function kulinerPhotoFor(d) {
      if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
      return KULINER_FALLBACK_PHOTOS[photoHash(d) % KULINER_FALLBACK_PHOTOS.length];
    }
    // Kartu kecil (rekomendasi) → versi thumbnail (Owner 2026-10-16).
    var KULINER_THUMB_PHOTOS = [
      "../../public/assets/images/kuliner/optimized/Lontong Kupang Kraton.thumb.webp",
      "../../public/assets/images/kuliner/optimized/Nasi Punel.thumb.webp",
      "../../public/assets/images/kuliner/optimized/soto-pasuruan.thumb.webp"
    ];
    function kulinerThumbFor(d) {
      if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
      return KULINER_THUMB_PHOTOS[photoHash(d) % KULINER_THUMB_PHOTOS.length];
    }
    function wisataPhotoFor(d) {
      if (d && d.media && d.media[0]) {
        if (d.media[0].thumbnail_url) return d.media[0].thumbnail_url;
        if (d.media[0].url) return d.media[0].url;
      }
      try {
        var api = window.PasinfoWisata || (window.PASINFO_WISATA && window.PASINFO_WISATA.api);
        if (api && typeof api.photoFor === "function") return api.photoFor(d);
      } catch (e) {}
      return null;
    }
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

    function catName(id) {
      var list = DATA.categories || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i].name;
      }
      return "";
    }

    // Hero dari data real.
    document.title = "Menu & Harga - " + item.name + " - Pasuruan Info";
    setText("detail-title", item.name);
    setText("detail-desc", item.short_description || "Deskripsi segera hadir.");
    setText("detail-location", item.address || "Pasuruan, Jawa Timur");
    setText("hero-cat", "Kuliner " + (catName(item.categoryId) || "Tradisional"));
    var crumb = $("crumb-name");
    if (crumb) crumb.textContent = "Menu & Harga " + item.name;
    var tabUtama = $("tab-utama");
    if (tabUtama) tabUtama.href = "detail_kuliner.html?slug=" + item.slug;
    var tabMenu = $("tab-menu");
    if (tabMenu) tabMenu.href = "menu_kuliner.html?slug=" + item.slug;
    var tabUlasan = $("tab-ulasan");
    if (tabUlasan) tabUlasan.href = "ulasan.html?slug=" + item.slug;
    setText(
      "hero-rating-text",
      item.rating != null ? item.rating + (item.reviews_label ? " (" + item.reviews_label + ")" : "") : "Belum ada ulasan"
    );

    // Hero banner: image kuliner terpilih (sama seperti halaman detail).
    var heroMedia = $("hero-media");
    if (heroMedia) setHeroPhoto(heroMedia, kulinerPhotoFor(item), item.name);

    // Simpan/Bagikan (mirror detail_kuliner.js): dummy non-fungsional (toast).
    ["btn-simpan", "btn-bagikan"].forEach(function (id) {
      var b = $(id);
      if (b) b.addEventListener("click", function () { showToast("Fitur ini segera hadir."); });
    });

    // Menu & Harga: sumber window.PASINFO_KULINER_MENUS[slug] (15 item/tempat,
    // MOCK; data-kuliner-menus.js). Kategori item: Makanan | Minuman | Cemilan,
    // selaras tombol filter mockup. Fallback → empty-state jujur.
    // Owner 2026-10-16: di mobile tampilkan 6 kartu per halaman (1 kolom),
    // di layar lebih besar tetap 12 — selaras wisata-listing.js/kuliner-listing.js.
    function menuPerPage() {
      return window.matchMedia("(max-width: 639px)").matches ? 6 : 12;
    }
    var allMenus = [];
    try {
      var pool = (window.PASINFO_KULINER_MENUS && window.PASINFO_KULINER_MENUS[item.slug]) || [];
      allMenus = pool.map(function (m, i) {
        return {
          id: m.id || "m" + i,
          name: m.name || "",
          description: m.description || "",
          price: m.price_label || (m.price != null ? "Rp " + m.price : ""),
          category: m.category || "",
          image: m.image || "",
          rating: m.rating != null ? m.rating : item.rating,
        };
      }).filter(function (m) { return m.name && m.price; });
    } catch (e) { allMenus = []; }

    // Info tempat (sama untuk semua item menu): lokasi, jam operasional,
    // status operasional — Owner 2026-10-15 minta ditampilkan per kartu.
    var placeLocation = item.address || "Pasuruan, Jawa Timur";
    var jamDisplay = item.opening_hours || "-";
    try {
      if (item.opening_hours && window.OpeningHoursUtil) {
        jamDisplay = window.OpeningHoursUtil.getDisplay(item.opening_hours).display;
      }
    } catch (e) {}
    function opStatus(os) {
      if (os && typeof os === "object") {
        return { code: String(os.status || "unknown"), label: os.label || "Status belum tersedia" };
      }
      var s = typeof os === "string" ? os.toLowerCase() : "";
      if (s === "buka") return { code: "open", label: "Buka" };
      if (s === "tutup") return { code: "closed", label: "Tutup" };
      return { code: "unknown", label: "Status belum tersedia" };
    }
    var placeStatus = opStatus(item.operational_status);
    var statusBadgeClass = "inline-block px-1.5 py-0.5 rounded text-white text-[9px] font-bold " +
      (placeStatus.code === "open" ? "bg-green-500" : placeStatus.code === "closing_soon" ? "bg-amber-500" : "bg-gray-400");

    var HEART_SVG = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';

    var menuFilter = "semua";
    var menuPage = 1;

    function menuCardHTML(m) {
      var media = m.image
        ? '<img src="' + m.image + '" alt="Foto ' + esc(m.name) + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />'
        : '<span class="text-white/70 text-xs font-semibold">Foto segera hadir</span>';
      var badge = m.category
        ? '<span class="absolute top-3 left-3 px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase rounded-lg">' + esc(m.category) + "</span>"
        : "";
      var ratingLike =
        '<span class="absolute top-3 right-3 flex items-center gap-1.5">' +
        '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 text-[10px] font-bold text-gray-800 shadow-sm"><span aria-hidden="true" class="text-amber-400">★</span>' + (m.rating != null ? m.rating : "-") + "</span>" +
        '<button type="button" data-like="' + esc(m.id) + '" aria-pressed="false" aria-label="Suka menu ' + esc(m.name) + '" class="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-gray-500 hover:text-red-500 shadow-sm transition-colors">' + HEART_SVG + "</button>" +
        "</span>";
      var desc = m.description
        ? '<p class="text-[11px] text-gray-500 mt-1 line-clamp-2">' + esc(m.description) + "</p>"
        : "";
      return (
        '<article class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col h-full group">' +
        '<div class="relative h-40 sm:h-44 bg-gradient-to-br from-amber-800 via-stone-700 to-slate-800 flex items-center justify-center overflow-hidden">' + media + badge + ratingLike + "</div>" +
        '<div class="p-4 flex-1 flex flex-col justify-between">' +
        "<div>" +
        '<h4 class="font-bold text-gray-900 text-sm sm:text-base line-clamp-2 group-hover:text-blue-700 transition-colors">' + esc(m.name) + "</h4>" +
        desc +
        '<div class="mt-2 space-y-1 text-[11px] text-gray-600">' +
        '<p class="flex items-center gap-1.5"><img src="../../public/assets/icons/icon_lokasi-hitam.svg" alt="" aria-hidden="true" class="h-3 w-3 shrink-0 object-contain" /><span class="line-clamp-1">' + esc(placeLocation) + "</span></p>" +
        '<p class="flex items-center gap-1.5 flex-wrap"><img src="../../public/assets/icons/icon_waktu.svg" alt="" aria-hidden="true" class="h-3 w-3 shrink-0 object-contain" /><span>' + esc(jamDisplay) + '</span><span class="' + statusBadgeClass + '">' + esc(placeStatus.label) + "</span></p>" +
        "</div>" +
        "</div>" +
        '<div class="mt-3 pt-3 border-t border-gray-100">' +
        '<span class="text-sm font-bold text-blue-700">' + esc(m.price) + "</span>" +
        "</div></div></article>"
      );
    }
    function renderPagination(total) {
      var per = menuPerPage();
      var info = $("pagination-info");
      if (info) {
        var shown = total === 0 ? 0 : (menuPage - 1) * per + 1;
        var end = Math.min(menuPage * per, total);
        info.textContent = "Menampilkan data " + shown + " - " + end + " dari " + total;
      }
      var controls = $("pagination-controls");
      if (!controls) return;
      var pages = Math.max(1, Math.ceil(total / per));
      var btn = "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ";
      var html = "";
      html += '<button type="button" data-page="' + (menuPage - 1) + '"' + (menuPage <= 1 ? " disabled" : "") +
        ' class="' + btn + "border border-gray-300 " + (menuPage <= 1 ? "text-gray-300" : "text-gray-700 hover:bg-gray-100") + '">‹</button>';
      for (var p = 1; p <= pages; p++) {
        html += '<button type="button" data-page="' + p + '" class="' + btn + (p === menuPage ? "bg-blue-600 text-white" : "border border-gray-300 text-gray-700 hover:bg-gray-100") + '">' + p + "</button>";
      }
      html += '<button type="button" data-page="' + (menuPage + 1) + '"' + (menuPage >= pages ? " disabled" : "") +
        ' class="' + btn + "border border-gray-300 " + (menuPage >= pages ? "text-gray-300" : "text-gray-700 hover:bg-gray-100") + '">›</button>';
      controls.innerHTML = html;
    }
    function menuFilteredList() {
      return allMenus.filter(function (m) {
        return menuFilter === "semua" || String(m.category).toLowerCase() === menuFilter;
      });
    }

    /* Transisi tinggi grid saat ganti halaman (mirror kuliner-listing.js):
       grid dianimasikan dari tinggi lama ke tinggi baru agar tidak "melompat". */
    var menuGridResizeAnim = null;
    function animateGridResize(grid, fromHeight) {
      if (!grid || !grid.animate) return;
      var reduced =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;
      // Batalkan animasi lama dulu agar offsetHeight terbaca dari tinggi alami
      // grid (tanpa sisa fill:forwards) — mencegah grid macet di tinggi halaman
      // lama saat kembali ke halaman sebelumnya (mis. halaman 2 → halaman 1).
      if (menuGridResizeAnim) {
        try { menuGridResizeAnim.cancel(); } catch (e) {}
        menuGridResizeAnim = null;
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
      menuGridResizeAnim = anim;
      anim.onfinish = function () {
        if (menuGridResizeAnim !== anim) return;
        menuGridResizeAnim = null;
        // Pindahkan tinggi dari animasi ke inline lalu batalkan fill:forwards,
        // sehingga tinggi kembali ke auto (sama seperti wisata-listing.js).
        grid.style.height = toHeight + "px";
        grid.style.overflow = "";
        try { anim.cancel(); } catch (e) {}
        requestAnimationFrame(function () {
          grid.style.height = "";
        });
      };
    }

    /* Scroll halus ke atas daftar saat ganti halaman (menghindari scroll
       "melompat" ketika jumlah data per halaman berbeda). */
    function scrollMenuListTop() {
      var grid = $("menu-grid");
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

    function renderMenus(fromHeight) {
      var grid = $("menu-grid");
      if (!grid) return;
      if (!allMenus.length) {
        grid.className = "grid grid-cols-1 gap-6";
        grid.innerHTML = '<p class="text-sm text-gray-500 text-center py-10">Menu belum tersedia untuk kuliner ini.</p>';
        setText("pagination-info", "Menampilkan data 0 - 0");
        var pg = $("pagination-controls");
        if (pg) pg.innerHTML = "";
        return;
      }
      var list = menuFilteredList();
      var per = menuPerPage();
      var pages = Math.max(1, Math.ceil(list.length / per));
      if (menuPage > pages) menuPage = pages;
      if (menuPage < 1) menuPage = 1;
      var start = (menuPage - 1) * per;
      grid.className = "grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6";
      grid.innerHTML = list.slice(start, start + per).map(menuCardHTML).join("");
      renderPagination(list.length);
      animateGridResize(grid, fromHeight);
    }
    document.addEventListener("click", function (e) {
      // Like (ikon hati, tanpa angka): toggle warna lokal saja — belum ada backend.
      var likeBtn = e.target.closest("[data-like]");
      if (likeBtn) {
        var on = likeBtn.getAttribute("aria-pressed") !== "true";
        likeBtn.setAttribute("aria-pressed", on ? "true" : "false");
        likeBtn.classList.toggle("text-red-500", on);
        likeBtn.classList.toggle("text-gray-500", !on);
        return;
      }
      var fb = e.target.closest("[data-filter]");
      if (fb) {
        menuFilter = fb.getAttribute("data-filter") || "semua";
        menuPage = 1;
        Array.from(document.querySelectorAll("[data-filter]")).forEach(function (b) {
          var on = b.getAttribute("data-filter") === menuFilter;
          b.classList.toggle("bg-blue-600", on);
          b.classList.toggle("text-white", on);
          b.classList.toggle("bg-gray-200", !on);
          b.classList.toggle("text-gray-700", !on);
        });
        renderMenus();
        return;
      }
      var pb = e.target.closest("#pagination-controls [data-page]");
      if (pb && !pb.disabled) {
        var p = parseInt(pb.getAttribute("data-page"), 10);
        if (!isNaN(p) && p >= 1 && p !== menuPage) {
          var grid = $("menu-grid");
          var fromHeight = grid ? grid.offsetHeight : 0;
          menuPage = p;
          renderMenus(fromHeight);
          scrollMenuListTop();
        }
      }
    });
    renderMenus();

    // Rekomendasi + Sekitar: struktur kartu diseragamkan dengan
    // detail_kuliner.html (Owner 2026-10-15): foto kecil, nama, rating, baris info.
    function cardMedia(d, photoFn) {
      var photo = photoFn ? photoFn(d) : null;
      return photo
        ? '<div class="h-24 sm:h-28"><img src="' + photo + '" alt="Foto ' + esc(d.name) + '" loading="lazy" class="w-full h-full object-cover" /></div>'
        : '<div class="h-24 sm:h-28 bg-gradient-to-br from-amber-800 via-stone-700 to-slate-800" role="img" aria-label="Foto ' + esc(d.name) + ' (placeholder)"></div>';
    }
    function sharedCard(d, href, photoFn, subline) {
      var rating = d.rating != null ? d.rating : "-";
      return (
        '<a href="' + href + '" class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group block">' +
        cardMedia(d, photoFn) +
        '<div class="p-2.5 sm:p-3">' +
        '<div class="flex items-center justify-between gap-2">' +
        '<h3 class="text-[11px] sm:text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-blue-700">' + esc(d.name) + "</h3>" +
        '<span class="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-semibold text-gray-700 shrink-0"><span aria-hidden="true" class="text-amber-400">★</span>' + rating + "</span>" +
        "</div>" +
        (subline ? '<p class="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">' + esc(subline) + "</p>" : "") +
        "</div></a>"
      );
    }

    var others = DATA.culinaries.filter(function (d) {
      return d.id !== item.id;
    });
    var sameCat = others.filter(function (d) {
      return d.categoryId && item.categoryId && d.categoryId === item.categoryId;
    });
    var recoList = (sameCat.length >= 4 ? sameCat : others).slice(0, 4);
    var recoGrid = $("reco-grid");
    if (recoGrid) {
      recoGrid.innerHTML = recoList.map(function (d) {
        return sharedCard(d, "detail_kuliner.html?slug=" + d.slug, kulinerThumbFor, d.address || "");
      }).join("");
    }

    // Sekitar: destinasi wisata terdekat (jarak real) + link detail_wisata.
    var sekitar = [];
    try {
      var WD = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];
      var ref = window.PasinfoNearby ? window.PasinfoNearby.refPoint(item, DATA.regions) : null;
      sekitar = window.PasinfoNearby ? window.PasinfoNearby.nearest(ref, WD, 4) : [];
    } catch (e) {}
    var nearbyGrid = $("nearby-grid");
    if (nearbyGrid) {
      nearbyGrid.innerHTML = sekitar.map(function (d) {
        var dist = d._distKm != null && window.PasinfoNearby ? window.PasinfoNearby.fmtKm(d._distKm) : "";
        return sharedCard(d, "detail_wisata.html?slug=" + d.slug, wisataPhotoFor, dist);
      }).join("");
    }
    // Judul sekitar mengikuti wilayah, sama dengan detail_kuliner.js.
    try {
      var regName = "";
      var regs = DATA.regions || [];
      for (var r = 0; r < regs.length; r++) {
        if (regs[r].id === item.regionId) { regName = regs[r].name; break; }
      }
      if (regName) setText("sekitar-title", "Jelajah Destinasi Sekitar " + regName);
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
