/**
 * Cerita Budaya — interaksi halaman (dipindah VERBATIM dari inline <script>,
 * refactor 2026-10-09 Owner approved; diperkecil: changeGallery global
 * diganti delegasi data-gallery-btn karena onclick inline telah dihapus).
 * Perilaku identik: ganti foto galeri, toggle Simpan,
 * Bagikan via Native Share API.
 * (Menu mobile ditangani shared header via public/js/main.js.)
 */
(function () {
  "use strict";

  // Gallery Image Switcher (delegasi tombol data-gallery-btn)
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

  // Native Share API
  var shareBtn = document.getElementById("share-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", function () {
      if (navigator.share) {
        navigator
          .share({
            title: "Festival Reog Pasuruan",
            text: "Lihat cerita kebudayaan Festival Reog Pasuruan di Pasuruan Info!",
            url: window.location.href,
          })
          .catch(function () {});
      }
    });
  }
})();
