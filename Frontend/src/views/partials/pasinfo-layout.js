/**
 * Pasinfo Layout injector (Vanilla JS, tanpa fetch — aman file://).
 * Mengganti <div data-layout-header> dan <div data-layout-footer>
 * dengan partial header/footer. Konfigurasi lewat atribut <body>:
 *
 *   data-asset-prefix="./public" | "../../public"
 *   data-page-active="terbaru" | "wisata" | ...
 *   data-wisata-href="./src/views/wisata.html" | "wisata.html"
 *   data-home-href="./index.html" | "../../index.html" (logo + Beranda mobile)
 *   data-news-href="./src/views/LayoutNews.html" | "LayoutNews.html" (opsional)
 *   data-header-overlay="dark"  (opsional: header transparan di hero)
 *
 * Muat SETELAH pasinfo-header.js + pasinfo-footer.js,
 * SEBELUM public/js/main.js (agar menu/nav descobrir).
 */
(function () {
  "use strict";

  function config() {
    var body = document.body;
    var assetPrefix = body.getAttribute("data-asset-prefix") || "./public";
    // Halaman root (index.html) memakai "./public"; halaman di src/views/
    // memakai "../../public". LayoutNews.html berada di src/views/, jadi
    // turunkan jalur relatifnya dari posisi halaman.
    var newsHref =
      body.getAttribute("data-news-href") ||
      (assetPrefix === "./public"
        ? "./src/views/LayoutNews.html"
        : "LayoutNews.html");
    return {
      assetPrefix: assetPrefix,
      active: body.getAttribute("data-page-active") || "",
      wisataHref: body.getAttribute("data-wisata-href") || "#",
      homeHref: body.getAttribute("data-home-href") || "#",
      newsHref: newsHref,
    };
  }

  function mount() {
    if (!window.PasinfoLayout) return;
    var cfg = config();
    var headerSlot = document.querySelector("[data-layout-header]");
    if (headerSlot && window.PasinfoLayout.renderHeader) {
      var tmp = document.createElement("div");
      tmp.innerHTML = window.PasinfoLayout.renderHeader(cfg);
      var headerEl = tmp.firstElementChild;
      if (headerEl) headerSlot.replaceWith(headerEl);
    }
    var footerSlot = document.querySelector("[data-layout-footer]");
    if (footerSlot && window.PasinfoLayout.renderFooter) {
      var tmp2 = document.createElement("div");
      tmp2.innerHTML = window.PasinfoLayout.renderFooter(cfg);
      var footerEl = tmp2.firstElementChild;
      if (footerEl) footerSlot.replaceWith(footerEl);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
