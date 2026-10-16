/**
 * internal-nav.js - tirai transisi untuk SEMUA navigasi internal.
 * =====================================================================
 * Dipakai pada halaman sub-kuliner (detail_kuliner, menu_kuliner, ulasan)
 * agar perpindahan antar-tab/halaman terasa menyatu, memakai tirai
 * `page-transition.js` (keluar) + `page-enter.js` (masuk) yang sudah ada.
 *
 * Delegasi klik pada <a> internal (same-origin, bukan #anchor, bukan target
 * baru, tanpa modifier/klik tengah) -> PasInfoPageTransition.go(url).
 * Bila page-transition.js belum siap, navigasi dibiarkan normal.
 *
 * Tanpa library tambahan (stack lock: vanilla JS).
 */
(function () {
  "use strict";

  function isModified(e) {
    return (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    );
  }

  function isInternal(href) {
    if (!href) return false;
    if (href.charAt(0) === "#") return false; // anchor di halaman yang sama
    if (href.indexOf("//") === 0) return false; // protocol-relative (eksternal)
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false; // http:, mailto:, tel:, dsb.
    return true;
  }

  document.addEventListener("click", function (e) {
    if (isModified(e)) return;
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;
    if (!isInternal(a.getAttribute("href"))) return;
    // Halaman yang sama -> biarkan browser (hindari tirai sia-sia).
    if (a.href.split("#")[0] === window.location.href.split("#")[0]) return;

    var go = window.PasInfoPageTransition && window.PasInfoPageTransition.go;
    if (!go) return;
    e.preventDefault();
    go(a.href);
  });
})();
