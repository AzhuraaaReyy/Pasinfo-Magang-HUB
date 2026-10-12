/**
 * Menu Kuliner — hero by-slug + menu + rekomendasi + sekitar (2026-10-09).
 * ======================================================================
 * - Dipindah dari inline <script> + diperbaiki (Owner approved):
 *   (a) Hero + tab "Informasi Utama" mengikuti ?slug= dari DATA REAL
 *       (sebelumnya statis "Soto Ayam Kambing" + tab tanpa slug).
 *   (b) Menu: dataset real TAK PUNYA data menu/harga → empty-state jujur
 *       "Menu belum tersedia" (DUMMY_MENUS 15 item + harga fabrikan DIHAPUS).
 *   (c) Section "Rekomendasi Kuliner Lainnya" sesuai mockup DITAMBAHKAN
 *       (sebelumnya tak ada di HTML → renderRekomendasi() crash TypeError
 *       dan mematikan render Sekitar di bawahnya).
 *   (d) Sekitar = destinasi wisata TERDEKAT (nearby.js) + link detail_wisata
 *       + jarak hitung; tombol → wisata.html (Owner direction Sekitar).
 * - Dijalankan setelah DOMContentLoaded agar data-*.js (defer) siap.
 * - Markup/kelas visual mengikuti mockup (kartu biru rekomendasi, dsb).
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
    setText(
      "hero-rating-text",
      item.rating != null ? item.rating + (item.reviews_label ? " (" + item.reviews_label + ")" : "") : "Belum ada ulasan"
    );

    // Menu: dataset real tak punya menu/harga → empty-state jujur.
    var grid = $("menu-grid");
    if (grid) {
      grid.innerHTML =
        '<p class="col-span-full text-sm text-gray-500 text-center py-10">' +
        "Menu belum tersedia untuk kuliner ini." +
        "</p>";
    }
    setText("pagination-info", "Menampilkan data dari 0 - 0");
    var pager = $("pagination-controls");
    if (pager) pager.innerHTML = "";

    // Rekomendasi: kuliner lain (link detail_kuliner), kartu biru mockup.
    function recoCard(d) {
      return (
        '<a href="detail_kuliner.html?slug=' + d.slug + '" class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col h-full group">' +
        '<div class="relative h-44 bg-gradient-to-br from-blue-600 to-slate-800 flex items-center justify-center group-hover:opacity-90 transition-opacity" role="img" aria-label="Foto ' + esc(d.name) + ' (placeholder)"></div>' +
        '<div class="p-4 flex-1 flex flex-col justify-between">' +
        "<div>" +
        '<h4 class="font-bold text-gray-900 text-base group-hover:text-blue-700 transition-colors line-clamp-1">' + esc(d.name) + "</h4>" +
        '<p class="text-gray-600 text-xs mt-1 line-clamp-2">' + esc(d.short_description || "") + "</p>" +
        '<div class="flex items-center gap-1 mt-2 text-sm"><span class="text-amber-400 text-xs">★</span>' +
        '<span class="font-semibold text-gray-900">' + (d.rating != null ? d.rating : "-") + "</span></div>" +
        "</div>" +
        '<div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-600">' + esc(d.address || "") + "</div>" +
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
    if (recoGrid) recoGrid.innerHTML = recoList.map(recoCard).join("");

    // Sekitar: destinasi wisata terdekat + link detail_wisata + jarak hitung.
    function nearbyCard(d) {
      var dist = d._distKm != null && window.PasinfoNearby ? window.PasinfoNearby.fmtKm(d._distKm) : "";
      return (
        '<a href="detail_wisata.html?slug=' + d.slug + '" class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col h-full group">' +
        '<div class="relative h-44 bg-gradient-to-br from-blue-700 to-slate-800 flex items-center justify-center group-hover:opacity-90 transition-opacity" role="img" aria-label="Foto ' + esc(d.name) + ' (placeholder)">' +
        '<span class="absolute top-3 left-3 px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase rounded-lg">Wisata</span>' +
        "</div>" +
        '<div class="p-4 flex-1 flex flex-col justify-between">' +
        '<h4 class="font-bold text-gray-900 text-base group-hover:text-blue-700 transition-colors line-clamp-1">' + esc(d.name) + "</h4>" +
        '<div class="mt-3 space-y-2 text-xs text-gray-600">' +
        '<p class="flex items-center gap-1"><span class="text-amber-400">★</span> ' + (d.rating != null ? d.rating : "-") + "</p>" +
        (dist ? '<p class="flex items-center gap-1">' + esc(dist) + "</p>" : "") +
        "</div></div></a>"
      );
    }
    var sekitar = [];
    try {
      var WD = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];
      var ref = window.PasinfoNearby ? window.PasinfoNearby.refPoint(item, DATA.regions) : null;
      sekitar = window.PasinfoNearby ? window.PasinfoNearby.nearest(ref, WD, 4) : [];
    } catch (e) {}
    var nearbyGrid = $("nearby-grid");
    if (nearbyGrid) nearbyGrid.innerHTML = sekitar.map(nearbyCard).join("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
