/**
 * Ulasan Kuliner — hero by-slug + daftar ulasan + rekomendasi (2026-10-09).
 * =======================================================================
 * - Dipindah dari inline <script> + disinkronkan (Owner approved):
 *   (a) Hero + breadcrumb + tab mengikuti ?slug= dari DATA REAL kuliner
 *       (sebelumnya statis "SOTO AYAM KAMBING").
 *   (b) Statistik + bars mengikuti MOCKUP ulasan.png (20k / 12.876 /
 *       90-60-40-30-10) — konten statis mockup, di-HTML (bukan JS).
 *   (c) Daftar ulasan = placeholder visual mockup (nama + teks generik,
 *       foto = kotak abu KOSONG spt mockup, suka 17 + komentar 5).
 *       Review backend = Tier 2 (out of scope) — tombol suka hanya
 *       menambah angka secara lokal (tanpa persistensi).
 *   (d) Menu & Harga: dataset real TAK PUNYA menu → kartu disembunyikan,
 *       tampil empty-state jujur (bagian "Lihat Semua Menu" → menu_kuliner).
 *   (e) Rekomendasi ← kuliner REAL (detail_kuliner); Destinasi ← wisata
 *       REAL (detail_wisata + alamat, tanpa jarak fabrikan).
 *   (f) Emoji (avatar/like/dislike/pin/bagikan) → SVG/inisial proyek.
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

    // Hero + breadcrumb + tab dari data real.
    document.title = "Ulasan " + item.name + " - Pasuruan Info";
    setText("detail-title", item.name.toUpperCase());
    setText("detail-desc", item.short_description || "");
    setText("detail-location", item.address || "Pasuruan, Jawa Timur");
    setText("crumb-name", item.name);
    var cat = catName(item.categoryId);
    var heroCat = $("hero-cat");
    if (heroCat) heroCat.textContent = "Kuliner " + (cat || "Tradisional");
    setText(
      "hero-rating-text",
      item.rating != null ? item.rating + (item.reviews_label ? " (" + item.reviews_label + ")" : "") : "Belum ada ulasan"
    );
    var tabUtama = $("tab-utama");
    if (tabUtama) tabUtama.href = "detail_kuliner.html?slug=" + item.slug;
    var tabMenu = $("tab-menu");
    if (tabMenu) tabMenu.href = "menu_kuliner.html?slug=" + item.slug;
    var btnMenu = $("btn-lihat-menu");
    if (btnMenu) btnMenu.href = "menu_kuliner.html?slug=" + item.slug;

    // Simpan (visual) + Bagikan (Web Share API).
    var saved = false;
    var simpanBtn = $("btn-simpan");
    if (simpanBtn) {
      simpanBtn.addEventListener("click", function () {
        saved = !saved;
        simpanBtn.setAttribute("aria-pressed", saved ? "true" : "false");
        var t = $("simpan-text");
        if (t) t.textContent = saved ? "Tersimpan" : "Simpan";
      });
    }
    var bagikanBtn = $("btn-bagikan");
    if (bagikanBtn) {
      bagikanBtn.addEventListener("click", function () {
        if (navigator.share) {
          navigator.share({ title: item.name, url: window.location.href }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(window.location.href).catch(function () {});
        }
      });
    }

    // Daftar ulasan placeholder (mockup): kotak foto abu kosong, suka 17 + komentar 5.
    var HEART_SVG = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';
    var CHAT_SVG = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>';
    var REVIEWS = [
      { name: "Aldi Ferdinand", text: "Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966.", date: "17 September 2027 - 07:00 WIB" },
      { name: "Aldi Ferdinand", text: "Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966.", date: "17 September 2027 - 07:00 WIB" },
      { name: "Aldi Ferdinand", text: "Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966.", date: "17 September 2027 - 07:00 WIB" },
      { name: "Aldi Ferdinand", text: "Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966.", date: "17 September 2027 - 07:00 WIB" },
    ];
    var expanded = true;
    function reviewCard(r, idx) {
      return (
        '<div class="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3" data-review="' + idx + '">' +
        '<div class="flex items-center justify-between">' +
        '<div class="flex items-center gap-3">' +
        '<div class="w-9 h-9 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-500 text-xs font-bold" aria-hidden="true">A</div>' +
        '<span class="text-xs font-bold text-gray-900">' + esc(r.name) + "</span>" +
        "</div>" +
        '<div class="text-yellow-400 text-xs font-bold" role="img" aria-label="Rating 5 dari 5">★★★★★</div>' +
        "</div>" +
        '<p class="text-xs text-gray-600 leading-relaxed">' + esc(r.text) + "</p>" +
        '<div class="flex items-center gap-2 pt-1" aria-hidden="true">' +
        '<div class="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200"></div>' +
        '<div class="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200"></div>' +
        "</div>" +
        '<div class="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">' +
        "<span>" + esc(r.date) + "</span>" +
        '<div class="flex items-center gap-4 text-gray-600">' +
        '<button type="button" data-like="' + idx + '" class="flex items-center gap-1 hover:text-blue-600 transition-colors" aria-label="Suka ulasan ini">' + HEART_SVG +
        ' <span class="font-bold text-xs" data-likes>17</span></button>' +
        '<span class="flex items-center gap-1">' + CHAT_SVG + ' <span class="font-bold text-xs">5</span></span>' +
        "</div></div></div>"
      );
    }
    function renderReviews() {
      var list = $("reviews-list");
      if (!list) return;
      var show = expanded ? REVIEWS : REVIEWS.slice(0, 2);
      list.innerHTML = show.map(reviewCard).join("");
      var more = $("btn-more");
      if (more) more.querySelector("span").textContent = expanded ? "Tampilkan lebih sedikit" : "Tampilkan lebih banyak";
    }
    var likes = {};
    document.addEventListener("click", function (e) {
      var likeBtn = e.target.closest("[data-like]");
      if (likeBtn) {
        var i = likeBtn.getAttribute("data-like");
        likes[i] = !(likes[i] === true);
        var n = likeBtn.querySelector("[data-likes]");
        if (n) n.textContent = likes[i] ? "18" : "17";
        likeBtn.classList.toggle("text-blue-600", likes[i] === true);
        return;
      }
      if (e.target.closest("#btn-more")) {
        expanded = !expanded;
        renderReviews();
      }
    });

    // Form ulasan: cegah submit (tanpa backend) + picker bintang visual.
    var form = $("ulasan-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
      });
    }
    var picked = 0;
    function paintStars() {
      var stars = document.querySelectorAll("#star-picker [data-star]");
      for (var i = 0; i < stars.length; i++) {
        var on = parseInt(stars[i].getAttribute("data-star"), 10) <= picked;
        stars[i].classList.toggle("text-yellow-400", on);
        stars[i].classList.toggle("text-gray-300", !on);
      }
    }
    document.addEventListener("click", function (e) {
      var s = e.target.closest("#star-picker [data-star]");
      if (s) {
        picked = parseInt(s.getAttribute("data-star"), 10) || 0;
        paintStars();
      }
    });

    // Menu & Harga: dataset real tak punya menu → empty-state jujur.
    var menuGrid = $("menu-harga-grid");
    if (menuGrid) {
      menuGrid.innerHTML =
        '<p class="col-span-full text-sm text-gray-500 text-center py-8">Menu belum tersedia untuk kuliner ini.</p>';
    }

    // Rekomendasi ← kuliner REAL; Destinasi ← wisata REAL.
    function kulCard(d) {
      return (
        '<a href="detail_kuliner.html?slug=' + d.slug + '" class="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-2xs group cursor-pointer flex flex-col h-full">' +
        '<div class="relative h-24 bg-gradient-to-br from-amber-700 to-slate-800 overflow-hidden"></div>' +
        '<div class="p-2.5 flex-1 flex flex-col">' +
        '<h4 class="text-xs font-bold text-gray-900 truncate group-hover:text-blue-700">' + esc(d.name) + "</h4>" +
        '<p class="text-[10px] text-gray-500 mt-0.5 line-clamp-1">' + esc(d.address || "") + "</p>" +
        "</div></div>"
      );
    }
    function destCard(d) {
      return (
        '<a href="detail_wisata.html?slug=' + d.slug + '" class="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-2xs group cursor-pointer flex flex-col h-full">' +
        '<div class="relative h-24 bg-gradient-to-br from-emerald-600 to-slate-800 overflow-hidden"></div>' +
        '<div class="p-2.5 flex-1 flex flex-col">' +
        '<h4 class="text-xs font-bold text-gray-900 truncate group-hover:text-blue-700">' + esc(d.name) + "</h4>" +
        '<p class="text-[10px] text-gray-500 mt-0.5 line-clamp-1">' + esc(d.address || "") + "</p>" +
        "</div></div>"
      );
    }
    var others = DATA.culinaries.filter(function (d) {
      return d.id !== item.id;
    });
    var sameCat = others.filter(function (d) {
      return d.categoryId && item.categoryId && d.categoryId === item.categoryId;
    });
    var recoList = (sameCat.length >= 4 ? sameCat : others).slice(0, 4);
    var recoGrid = $("reco-kuliner-grid");
    if (recoGrid) recoGrid.innerHTML = recoList.map(kulCard).join("");
    var dests = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];
    var destGrid = $("reco-destinasi-grid");
    if (destGrid) destGrid.innerHTML = dests.slice(0, 4).map(destCard).join("");

    renderReviews();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
