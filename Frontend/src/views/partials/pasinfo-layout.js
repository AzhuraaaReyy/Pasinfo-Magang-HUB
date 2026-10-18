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
 *
 * Sejak 2026-10-18 (Owner: widget chatbot global) injector ini juga memuat
 * partial chatbot (chatbot-reco.js lalu pasinfo-chatbot.js) secara LAZY dari
 * {data-asset-prefix}/js/ sehingga widget tampil di SEMUA halaman tanpa
 * menambah <script> di tiap halaman. Jika pemuatan gagal, halaman tetap
 * normal (widget hanya tidak muncul / melapor dari dalam dirinya).
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
    mountFavicon(cfg);
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
    mountChatbot(cfg);
  }

  /* Favicon global (Owner 2026-10-18): samakan ikon tab di SEMUA halaman.
     Halaman lama memakai placeholder <link rel="icon" href="data:," /> dan
     sebagian (detail_news, LayoutNews) belum punya favicon; index.html masih
     memakai logo lama. Fungsi ini menimpa/bikin satu <link rel="icon"> dari
     logo brand tanpa mengubah <head> tiap halaman. */
  function mountFavicon(cfg) {
    var href = cfg.assetPrefix + "/assets/logo/Logo%20favicon.png";
    var links = document.querySelectorAll('link[rel~="icon"]');
    if (links.length) {
      Array.prototype.forEach.call(links, function (link) {
        link.setAttribute("href", href);
        link.setAttribute("type", "image/png");
      });
      return;
    }
    var link = document.createElement("link");
    link.setAttribute("rel", "icon");
    link.setAttribute("type", "image/png");
    link.setAttribute("href", href);
    document.head.appendChild(link);
  }

  /* Muat <script> lokal berurutan (async=false) tanpa fetch agar aman file://. */
  function loadScript(src, marker, onDone) {
    var script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.setAttribute(marker, "");
    if (onDone) {
      script.onload = onDone;
      script.onerror = onDone;
    }
    document.head.appendChild(script);
  }

  function mountChatbot(cfg) {
    if (document.querySelector("[data-pasinfo-chat]")) return;
    if (document.querySelector("script[data-pasinfo-chatbot-loader]")) return;
    var base = cfg.assetPrefix + "/js/";
    loadScript(base + "chatbot-reco.js", "data-pasinfo-chatbot-loader", function () {
      loadScript(base + "pasinfo-chatbot.js", "data-pasinfo-chatbot");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
