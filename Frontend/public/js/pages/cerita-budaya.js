/**
 * Cerita Budaya — halaman data-driven (Owner 2026-10-16).
 * =====================================================================
 * Konten DITURUNKAN dari data budaya REAL (window.PASINFO_BUDAYA):
 *   ?slug=  → BUDAYA_STORIES (slug) → BUDAYA_CULTURES (cultureId).
 *   judul  = "Cerita di Balik <name>"
 *   ringkas= culture.short_description
 *   isi    = culture.description
 *   foto   = aset budaya (public/assets/images/budaya/optimized).
 * TIDAK ada narasi/rating/harga yang difabrikasi.
 * Interaksi lama dipertahankan: ganti foto galeri, toggle Simpan,
 * Bagikan via Native Share API.
 */
(function () {
  "use strict";

  var DATA = window.PASINFO_BUDAYA || { cultures: [], stories: [] };

  // Aset budaya REAL (varian penuh untuk hero/galeri).
  var BUDAYA_PHOTOS_FULL = [
    "../../public/assets/images/budaya/optimized/Tari Terbang Bandung & Tari Pasuruan Kondang.webp",
    "../../public/assets/images/budaya/optimized/Tradisi-Skilot.webp",
    "../../public/assets/images/budaya/optimized/Yadnya Karo Sodoran (Tosari).webp",
  ];
  function photoFor(key) {
    var s = String(key == null ? "" : key);
    var sum = 0;
    for (var i = 0; i < s.length; i++) sum += s.charCodeAt(i);
    return BUDAYA_PHOTOS_FULL[sum % BUDAYA_PHOTOS_FULL.length];
  }

  function getParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]+)").exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : "";
  }

  function findCulture(id) {
    var list = DATA.cultures || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id || list[i].slug === id) return list[i];
    }
    return null;
  }

  function findStory(slug) {
    var list = DATA.stories || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].slug === slug) return list[i];
    }
    return null;
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text || "";
  }

  function populate() {
    var slug = getParam("slug");
    var stories = DATA.stories || [];
    var story = findStory(slug) || stories[0] || null;
    var culture = story
      ? findCulture(story.cultureId) || findCulture(story.slug)
      : null;

    var name = culture ? culture.name : "Budaya Pasuruan";
    var title = "Cerita di Balik " + name;
    var heroPhoto = photoFor(culture ? culture.id : slug);

    document.title = title + " | Pasuruan Info";

    var heroEl = document.getElementById("story-hero-img");
    if (heroEl) {
      heroEl.src = heroPhoto;
      heroEl.alt = name;
    }
    setText("story-title", title);
    setText("story-excerpt", culture ? culture.short_description : "");
    setText("story-location", culture ? culture.address || "" : "");
    setText("story-body", culture ? culture.description : "");

    // Galeri: foto utama + 3 thumbnail (aset budaya REAL).
    var main = document.getElementById("main-gallery-img");
    if (main) {
      main.src = heroPhoto;
      main.alt = name;
    }
    var thumbs = document.getElementById("story-thumbs");
    if (thumbs) {
      thumbs.innerHTML = BUDAYA_PHOTOS_FULL.map(function (src, i) {
        return (
          '<button type="button" data-gallery-src="' + src + '" data-gallery-btn aria-label="Foto galeri ' + (i + 1) + '" class="rounded-xl overflow-hidden aspect-[4/3] border border-gray-200 hover:border-brand transition focus:outline-none">' +
          '<img src="' + src + '" alt="Foto galeri ' + (i + 1) + '" class="w-full h-full object-cover" />' +
          "</button>"
        );
      }).join("");
    }

    // Sidebar "Situs Terkait" → budaya REAL terkait (kategori sama, else lain).
    var cultures = DATA.cultures || [];
    var related = null;
    if (culture) {
      for (var i = 0; i < cultures.length; i++) {
        if (cultures[i].id !== culture.id && cultures[i].categoryId === culture.categoryId) {
          related = cultures[i];
          break;
        }
      }
    }
    if (!related) {
      for (var j = 0; j < cultures.length; j++) {
        if (!culture || cultures[j].id !== culture.id) {
          related = cultures[j];
          break;
        }
      }
    }
    if (related) {
      var rImg = document.getElementById("related-img");
      if (rImg) {
        rImg.src = photoFor(related.id);
        rImg.alt = related.name;
      }
      setText("related-title", related.name);
      setText("related-location", related.address || "");
      setText("related-desc", related.short_description || "");
      var rLink = document.getElementById("related-link");
      if (rLink) rLink.href = "detail_budaya.html?slug=" + related.slug;
    }

    // Gallery Image Switcher (delegasi tombol data-gallery-btn, dinamis).
    var mainImg = document.getElementById("main-gallery-img");
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-gallery-btn]"),
      function (btn) {
        btn.addEventListener("click", function () {
          var src = btn.getAttribute("data-gallery-src");
          if (mainImg && src) mainImg.src = src;
        });
      }
    );

    // Native Share API (judul mengikuti cerita aktif).
    var shareBtn = document.getElementById("share-btn");
    if (shareBtn) {
      shareBtn.addEventListener("click", function () {
        if (navigator.share) {
          navigator
            .share({
              title: title,
              text: "Lihat " + title + " di Pasuruan Info!",
              url: window.location.href,
            })
            .catch(function () {});
        }
      });
    }
  }

  // Bookmark Toggle State (visual saja, tanpa backend)
  var saveBtn = document.getElementById("save-btn");
  var isSaved = false;
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      isSaved = !isSaved;
      if (isSaved) {
        saveBtn.classList.remove("bg-white", "text-gray-900");
        saveBtn.classList.add("bg-green-600", "text-white");
        saveBtn.innerHTML =
          '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg> <span>Tersimpan</span>';
      } else {
        saveBtn.classList.remove("bg-green-600", "text-white");
        saveBtn.classList.add("bg-white", "text-gray-900");
        saveBtn.innerHTML =
          '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.424 48.424 0 0111.186 0z" /></svg> <span>Simpan</span>';
      }
    });
  }

  populate();
})();
