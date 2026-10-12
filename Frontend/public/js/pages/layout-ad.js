/**
 * Pasinfo shared AD BANNER partial (byte-identical di kuliner/budaya).
 * ================================================================
 * Block "Space Iklan" yang sebelumnya copy-paste identik di
 * kuliner.html + budaya.html. Wisata/acara memakai varian spacing
 * berbeda (desain final) sehingga TIDAK disatukan.
 *
 * Dipakai oleh: kuliner.html, budaya.html
 * Cara pakai: <div data-layout-ad></div> + script ini (sinkron).
 */
(function () {
  "use strict";

  function renderAdBanner() {
    return (
      '<div class="mt-12 bg-gray-100 rounded-xl p-8 text-center border border-gray-200">' +
      '<span class="text-2xl font-bold text-gray-700 tracking-wide">Space Iklan</span>' +
      "</div>"
    );
  }

  function mount() {
    var slots = document.querySelectorAll("[data-layout-ad]");
    for (var i = 0; i < slots.length; i++) {
      var tmp = document.createElement("div");
      tmp.innerHTML = renderAdBanner();
      var el = tmp.firstElementChild;
      if (el) slots[i].replaceWith(el);
    }
  }

  mount();

  window.PasinfoLayoutAd = { render: renderAdBanner };
})();
