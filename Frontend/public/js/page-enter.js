/**
 * page-enter.js - tirai masuk transisi antar-halaman.
 * =====================================================================
 * Dipanggil SINKRON di dalam <head> (sebelum body dilukis) pada setiap
 * halaman yang bisa menjadi tujuan navigasi internal.
 *
 * Bila sessionStorage "ph-nav" === "1" (di-set `page-transition.js` tepat
 * sebelum berpindah halaman), tambahkan class `ph-entering` ke <html>
 * sehingga tirai mulai penuh lalu memudar. Aturan CSS-nya dipusatkan di
 * `src/input.css` (dipindah dari <style>/<script> inline tiap halaman
 * agar HTML bersih - Owner).
 *
 * Tanpa JS/library tambahan (stack lock: vanilla JS). Bila sessionStorage
 * tidak tersedia, halaman tetap tampil normal tanpa tirai.
 */
(function () {
  "use strict";
  try {
    if (sessionStorage.getItem("ph-nav") === "1") {
      sessionStorage.removeItem("ph-nav");
      document.documentElement.classList.add("ph-entering");
    }
  } catch (e) {
    /* sessionStorage diblokir - lewati tirai, konten tetap tampil. */
  }
})();
