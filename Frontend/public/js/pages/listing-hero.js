/**
 * Pasinfo shared HERO template — listing pages (wisata/kuliner/budaya).
 * ================================================================
 * Pengganti <section id="hero-section"> yang sebelumnya ditulis ulang
 * (copy-paste) di tiap halaman listing. Struktur, class, dan atribut
 * dibuat IDENTIK dengan markup asli; yang berbeda antar-halaman
 * (badge, label aria, judul/deskripsi default) dibaca dari atribut
 * <body> data-hero-* agar file:// tetap aman (tanpa fetch).
 *
 * Konfigurasi <body> yang dibaca:
 *   data-hero-label       (aria-label section, cth "Galeri Kuliner Pasuruan")
 *   data-hero-bg-label    (aria-label bg-layer-1, cth "Latar hero kuliner")
 *   data-hero-badge-class (cth "bg-blue-600" / "bg-[#ef4444]")
 *   data-hero-badge       (cth "Kuliner")
 *   data-hero-location    (cth "Pasuruan Raya")
 *   data-hero-title-class (class <h1>, per-domain — JANGAN diseragamkan)
 *   data-hero-title       (HTML, boleh mengandung <br>)
 *   data-hero-desc        (teks deskripsi default)
 *   data-hero-cards-label (aria-label cards-container)
 *
 * Dipakai oleh: wisata.html, kuliner.html, budaya.html
 * Cara pakai: <div data-listing-hero></div> + script ini (sinkron,
 *             tepat di posisi hero semula) SEBELUM script driver hero.
 */
(function () {
  "use strict";

  function renderListingHero(cfg) {
    return (
      '<section id="hero-section" class="relative w-full min-h-[100vh] min-h-[100dvh] bg-black overflow-hidden flex items-end md:items-start lg:items-end pt-16 md:pt-24 lg:pt-0 pb-8 sm:pb-12 md:pb-16 select-none" aria-roledescription="carousel" aria-label="' + cfg.label + '">' +
      '<div id="bg-container" class="absolute inset-0 z-0 pointer-events-none">' +
      '<div id="bg-layer-1" role="img" aria-label="' + cfg.bgLabel + '" class="absolute inset-0 opacity-100 transition-opacity duration-700"></div>' +
      '<div id="bg-layer-2" role="img" aria-label="" class="absolute inset-0 opacity-0 transition-opacity duration-700"></div>' +
      "</div>" +
      '<div class="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/40 to-black/30 pointer-events-none"></div>' +
      '<div class="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col lg:flex-row lg:items-end justify-between gap-8 lg:gap-12">' +
      '<div id="content-container" class="max-w-xl min-w-0 text-white space-y-4 pb-2 lg:pb-6" aria-live="polite">' +
      '<div id="badge-wrapper" class="flex items-center space-x-3">' +
      '<span id="badge-text" class="inline-block ' + cfg.badgeClass + ' text-white text-[13px] sm:text-sm font-bold px-4 py-1.5 rounded-md uppercase tracking-wider shadow-sm">' + cfg.badge + "</span>" +
      '<span id="hero-location" class="text-[11px] sm:text-xs font-semibold text-gray-300 uppercase tracking-widest">' + cfg.location + "</span>" +
      "</div>" +
      '<h1 id="hero-title" class="' + cfg.titleClass + '">' + cfg.title + "</h1>" +
      '<p id="hero-desc" class="text-sm md:text-base text-gray-200/90 leading-relaxed max-w-md font-normal drop-shadow-sm line-clamp-3">' + cfg.desc + "</p>" +
      "</div>" +
      '<div class="w-full lg:w-auto flex-shrink-0 z-30">' +
      '<div id="cards-container" class="flex items-center space-x-4 overflow-x-auto no-scrollbar py-3 px-1 max-w-full" aria-label="' + cfg.cardsLabel + '"></div>' +
      "</div>" +
      "</div>" +
      "</section>"
    );
  }

  function mount() {
    var slot = document.querySelector("[data-listing-hero]");
    if (!slot) return;
    var body = document.body;
    function attr(name, fallback) {
      var v = body.getAttribute(name);
      return v === null ? fallback : v;
    }
    var cfg = {
      label: attr("data-hero-label", ""),
      bgLabel: attr("data-hero-bg-label", ""),
      badgeClass: attr("data-hero-badge-class", "bg-blue-600"),
      badge: attr("data-hero-badge", ""),
      location: attr("data-hero-location", "Pasuruan Raya"),
      titleClass: attr("data-hero-title-class", ""),
      title: attr("data-hero-title", ""),
      desc: attr("data-hero-desc", ""),
      cardsLabel: attr("data-hero-cards-label", ""),
    };
    var tmp = document.createElement("div");
    tmp.innerHTML = renderListingHero(cfg);
    var section = tmp.firstElementChild;
    if (section) slot.replaceWith(section);
  }

  // Dijalankan sinkron (script dimuat tanpa defer tepat di posisi hero)
  // agar driver hero (script berikutnya) menemukan seluruh id.
  mount();

  window.PasinfoListingHero = { render: renderListingHero };
})();
