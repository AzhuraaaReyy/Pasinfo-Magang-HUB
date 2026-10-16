/* PasInfoPageTransition — transisi antar-halaman yang halus (Owner rev.3).
   Cara kerja: sebelum berpindah halaman, sebuah "tirai" (fade) ditampilkan
   lewat class pada <html>. Halaman tujuan (detail_wisata.html) menampilkan
   tirai yang sama lalu memudarkannya, sehingga terasa menyatu.

   Catatan: bila preferensi pengguna "prefers-reduced-motion", transisi
   dilewati dan navigasi berjalan langsung. */
(function () {
  "use strict";

  var LEAVING = "ph-leaving"; // class tirai pada halaman yang ditinggalkan
  var FLAG = "ph-nav"; // penanda di sessionStorage untuk halaman tujuan
  var DURATION = 220; // ms, selaras dengan transition opacity di CSS
  var leaving = false;

  function reducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function go(url) {
    if (!url || leaving) return;

    if (reducedMotion()) {
      window.location.href = url;
      return;
    }

    leaving = true;
    try {
      sessionStorage.setItem(FLAG, "1");
    } catch (e) {
      /* sessionStorage tidak tersedia; tetap lanjut tanpa tirai tujuan */
    }
    document.documentElement.classList.add(LEAVING);
    window.setTimeout(function () {
      window.location.href = url;
    }, DURATION);
  }

  // Kembali dari bfcache (tombol back): pastikan tirai tidak tertinggal.
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) {
      leaving = false;
      document.documentElement.classList.remove(LEAVING);
    }
  });

  window.PasInfoPageTransition = { go: go };
})();
