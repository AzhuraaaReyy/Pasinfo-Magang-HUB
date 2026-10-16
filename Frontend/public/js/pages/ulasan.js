/**
 * Ulasan Kuliner — hero by-slug + daftar ulasan + rekomendasi (2026-10-09).
 * =======================================================================
 * - Dipindah dari inline <script> + disinkronkan (Owner approved):
 *   (a) Hero + breadcrumb + tab mengikuti ?slug= dari DATA REAL kuliner
 *       (sebelumnya statis "SOTO AYAM KAMBING").
 *   (b) Statistik + bars mengikuti MOCKUP ulasan.png (20k / 12.876 /
 *       90-60-40-30-10) — konten statis mockup, di-HTML (bukan JS).
 *   (c) Daftar ulasan ← window.PASINFO_KULINER_ULASAN[slug] (5 ulasan MOCK/
 *       tempat, data-kuliner-ulasan.js). Ulasan form tampil in-memory di depan
 *       (hilang saat refresh; backend review tetap Tier 2 / out of scope).
 *   (d) Menu & Harga ← window.PASINFO_KULINER_MENUS[slug] (4 item pertama).
 *   (e) Rekomendasi ← kuliner REAL; Sekitar ← wisata TERDEKAT (jarak real
 *       via nearby.js). Kartu + wrapper section disamakan dgn
 *       detail_kuliner.html (Owner 2026-10-15).
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

    // Foto: sumber sama dengan halaman Detail Kuliner (media.url bila ada;
    // bila null → gambar contoh domain bergilir deterministik per id).
    // Owner 2026-10-15: hero ulasan memakai image kuliner terpilih.
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
    // Thumbnail kecil untuk kartu rekomendasi/sekitar (samakan dgn detail_kuliner.js).
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

    function catName(id) {
      var list = DATA.categories || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) return list[i].name;
      }
      return "";
    }

    // Hero + breadcrumb + tab dari data real.
    document.title = "Ulasan " + item.name + " - Pasuruan Info";
    var heroMedia = $("hero-media");
    if (heroMedia) {
      var photo = kulinerPhotoFor(item);
      if (photo) {
        heroMedia.style.backgroundImage = 'url("' + photo + '")';
        heroMedia.setAttribute("role", "img");
        heroMedia.setAttribute("aria-label", "Foto " + item.name);
      }
    }
    setText("detail-title", item.name.toUpperCase());
    setText("detail-desc", item.short_description || "");
    setText("detail-location", item.address || "Pasuruan, Jawa Timur");
    setText("crumb-name", "Ulasan " + item.name);
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
    var tabUlasan = $("tab-ulasan");
    if (tabUlasan) tabUlasan.href = "ulasan.html?slug=" + item.slug;
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

    // Daftar ulasan: sumber window.PASINFO_KULINER_ULASAN[slug] (5 ulasan MOCK
    // per tempat, data-kuliner-ulasan.js). Ulasan yang dikirim pengunjung
    // disisipkan di depan — in-memory saja (hilang saat refresh, belum ada backend).
    var HEART_SVG = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';
    var CHAT_SVG = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>';
    var userReviews = [];
    var dataReviews = [];
    try {
      var rpool = (window.PASINFO_KULINER_ULASAN && window.PASINFO_KULINER_ULASAN[item.slug]) || [];
      dataReviews = rpool.map(function (r) {
        return {
          name: r.name || "Pengunjung",
          initials: r.initials || "P",
          rating: r.rating != null ? r.rating : 5,
          text: r.body || "",
          date: r.date || "",
          photos: Array.isArray(r.photos) ? r.photos : [],
        };
      });
    } catch (e) { dataReviews = []; }

    function currentList() {
      return userReviews.concat(dataReviews);
    }
    function stars(rating) {
      var r = Math.round(rating || 5);
      var out = "";
      for (var i = 1; i <= 5; i++) out += i <= r ? "★" : "☆";
      return out;
    }
    var expanded = true;
    function reviewCard(r, idx) {
      var photos = (r.photos || []).map(function (src) {
        return '<div class="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden"><img src="' + src + '" alt="Foto ulasan" loading="lazy" class="w-full h-full object-cover" /></div>';
      }).join("");
      return (
        '<div class="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3" data-review="' + idx + '">' +
        '<div class="flex items-center justify-between">' +
        '<div class="flex items-center gap-3">' +
        '<div class="w-9 h-9 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-500 text-xs font-bold" aria-hidden="true">' + esc(r.initials || "P") + "</div>" +
        '<span class="text-xs font-bold text-gray-900">' + esc(r.name) + "</span>" +
        "</div>" +
        '<div class="text-yellow-400 text-xs font-bold" role="img" aria-label="Rating ' + (r.rating || 5) + ' dari 5">' + stars(r.rating) + "</div>" +
        "</div>" +
        '<p class="text-xs text-gray-600 leading-relaxed">' + esc(r.text) + "</p>" +
        (photos ? '<div class="flex items-center gap-2 pt-1" aria-hidden="true">' + photos + "</div>" : "") +
        '<div class="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">' +
        "<span>" + esc(r.date) + "</span>" +
        '<div class="flex items-center gap-4 text-gray-600">' +
        '<button type="button" data-like="' + idx + '" class="flex items-center gap-1 hover:text-blue-600 transition-colors" aria-label="Suka ulasan ini">' + HEART_SVG +
        ' <span class="font-bold text-xs" data-likes>0</span></button>' +
        '<span class="flex items-center gap-1">' + CHAT_SVG + ' <span class="font-bold text-xs">0</span></span>' +
        "</div></div></div>"
      );
    }
    function renderReviews() {
      var list = $("reviews-list");
      if (!list) return;
      var all = currentList();
      if (!all.length) {
        list.innerHTML = '<p class="text-sm text-gray-500 text-center py-8">Belum ada ulasan untuk kuliner ini.</p>';
      } else {
        list.innerHTML = (expanded ? all : all.slice(0, 2)).map(reviewCard).join("");
      }
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
        if (n) n.textContent = likes[i] ? "1" : "0";
        likeBtn.classList.toggle("text-blue-600", likes[i] === true);
        return;
      }
      if (e.target.closest("#btn-more")) {
        expanded = !expanded;
        renderReviews();
      }
    });

    // Form ulasan: tanpa backend → ulasan tampil di daftar (in-memory, hilang saat refresh).
    var form = $("ulasan-form");
    var picked = 0;
    function msg(text, ok) {
      var m = $("ulasan-msg");
      if (!m) return;
      m.textContent = text;
      m.className = "text-xs font-semibold " + (ok ? "text-green-600" : "text-red-500");
    }
    function paintStars() {
      var starEls = document.querySelectorAll("#star-picker [data-star]");
      for (var i = 0; i < starEls.length; i++) {
        var on = parseInt(starEls[i].getAttribute("data-star"), 10) <= picked;
        starEls[i].classList.toggle("text-yellow-400", on);
        starEls[i].classList.toggle("text-gray-300", !on);
      }
    }
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var ta = $("ulasan-text");
        var text = ta ? ta.value.trim() : "";
        if (picked < 1) { msg("Silakan pilih rating bintang terlebih dahulu.", false); return; }
        if (text.length < 3) { msg("Silakan tulis ulasan Anda.", false); return; }
        var now = new Date();
        var bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
        userReviews.unshift({
          name: "Anda",
          initials: "A",
          rating: picked,
          text: text,
          date: now.getDate() + " " + bulan[now.getMonth()] + " " + now.getFullYear() + " - " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + " WIB",
          photos: [],
        });
        if (ta) ta.value = "";
        picked = 0;
        paintStars();
        expanded = true;
        renderReviews();
        updateStats();
        msg("Ulasan terkirim. Terima kasih! (tampil sementara, belum tersimpan permanen)", true);
      });
    }
    document.addEventListener("click", function (e) {
      var s = e.target.closest("#star-picker [data-star]");
      if (s) {
        picked = parseInt(s.getAttribute("data-star"), 10) || 0;
        paintStars();
      }
    });

    // Menu & Harga: window.PASINFO_KULINER_MENUS[slug] (4 item pertama, MOCK).
    var menuGrid = $("menu-harga-grid");
    if (menuGrid) {
      var mpool = (window.PASINFO_KULINER_MENUS && window.PASINFO_KULINER_MENUS[item.slug]) || [];
      var mshow = mpool.slice(0, 4);
      if (!mshow.length) {
        menuGrid.innerHTML = '<p class="col-span-full text-sm text-gray-500 text-center py-8">Menu belum tersedia untuk kuliner ini.</p>';
      } else {
        menuGrid.innerHTML = mshow.map(function (m) {
          var price = m.price_label || (m.price != null ? "Rp " + m.price : "");
          return (
            '<article class="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-2xs flex flex-col h-full">' +
            '<div class="relative h-24 bg-gradient-to-br from-amber-700 to-slate-800 overflow-hidden">' +
            (m.image ? '<img src="' + m.image + '" alt="Foto ' + esc(m.name) + '" loading="lazy" class="w-full h-full object-cover" />' : "") +
            "</div>" +
            '<div class="p-2.5 flex-1 flex flex-col">' +
            '<h4 class="text-xs font-bold text-gray-900 line-clamp-1">' + esc(m.name) + "</h4>" +
            '<p class="text-[10px] text-gray-500 mt-0.5">' + esc(price) + "</p>" +
            "</div></article>"
          );
        }).join("");
      }
    }

    // Statistik ulasan disinkronkan dengan data tempat (rating hero + jumlah
    // ulasan) supaya kartu statistik sama dengan rating pada hero.
    function updateStats() {
      var all = currentList();
      var avg = item.rating;
      if (avg == null && all.length) {
        var sum = 0;
        for (var i = 0; i < all.length; i++) sum += all[i].rating || 0;
        avg = Math.round((sum / all.length) * 10) / 10;
      }
      setText("stat-rating", avg != null ? avg : "—");
      var st = $("stat-stars");
      if (st) st.textContent = stars(Math.round(avg || 5));
      var label = item.reviews_label || (all.length + " Ulasan");
      setText("stat-total", String(label).replace(/\s*ulasan\s*$/i, "").trim());
      setText("stat-total-sub", "(" + label + ")");
    }

    // Rekomendasi ← kuliner REAL; Sekitar ← wisata TERDEKAT (jarak real).
    // Struktur kartu disamakan dgn detail_kuliner.html: foto + nama + rating
    // + baris info (alamat utk rekomendasi, jarak utk sekitar).
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
    var recoGrid = $("reco-kuliner-grid");
    if (recoGrid) {
      recoGrid.innerHTML = recoList.map(function (d) {
        return sharedCard(d, "detail_kuliner.html?slug=" + d.slug, kulinerThumbFor, d.address || "");
      }).join("");
    }
    // Sekitar: destinasi wisata TERDEKAT by jarak real (nearby.js).
    var destGrid = $("reco-destinasi-grid");
    if (destGrid) {
      var wisata = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];
      var sekitar = [];
      try {
        var ref = window.PasinfoNearby ? window.PasinfoNearby.refPoint(item, DATA.regions) : null;
        sekitar = window.PasinfoNearby ? window.PasinfoNearby.nearest(ref, wisata, 4) : [];
      } catch (e) { sekitar = []; }
      if (!sekitar.length) sekitar = wisata.slice(0, 4);
      destGrid.innerHTML = sekitar.map(function (d) {
        var dist = d._distKm != null && window.PasinfoNearby ? window.PasinfoNearby.fmtKm(d._distKm) : (d.address || "");
        return sharedCard(d, "detail_wisata.html?slug=" + d.slug, wisataPhotoFor, dist);
      }).join("");
    }
    // Judul sekitar mengikuti wilayah (sama dgn detail/menu_kuliner).
    try {
      var regName = "";
      var regs = DATA.regions || [];
      for (var r = 0; r < regs.length; r++) {
        if (regs[r].id === item.regionId) { regName = regs[r].name; break; }
      }
      if (regName) setText("sekitar-title", "Jelajah Destinasi Sekitar " + regName);
    } catch (e) {}

    renderReviews();
    updateStats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
