/**
 * Pasuruan Info — Homepage Interaction
 * ================================
 *
 * STATUS : Frontend Phase 1
 *
 * Seluruh interaksi pada halaman ini bersifat lokal (mock).
 * Tidak ada request network, tidak ada API call.
 */

(function () {
  "use strict";

  /* ───────────────────────────────────────────────
   * Placeholder image marker
   *
   * Menandai elemen yang seharusnya berisi foto. Asset produksi
   * belum tersedia sehingga memakai wireframe abu-abu dengan
   * diagonal subtle + label MOCK.
   * Dihapus otomatis setelah aset gambar produksi tersedia.
   * ─────────────────────────────────────────────── */
  function markPlaceholders() {
    var nodes = document.querySelectorAll("[data-placeholder-image]");
    Array.prototype.forEach.call(nodes, function (node) {
      node.classList.add(
        "bg-[linear-gradient(135deg,#e5e7eb_25%,transparent_25%,transparent_50%,#e5e7eb_50%,#e5e7eb_75%,transparent_75%)]",
        "bg-[length:16px_16px]",
        "bg-gray-200"
      );
    });
  }

  /* ───────────────────────────────────────────────
   * Mobile menu (hamburger)
   *
   * Di mobile, menu kategori tidak lagi scroll horizontal.
   * Menu dibuka lewat tombol hamburger dan digulir vertikal.
   * Desktop tetap memakai scroll horizontal (§16).
   * ─────────────────────────────────────────────── */
  function initMobileMenu() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var panel = document.querySelector("[data-mobile-menu]");
    var list = document.querySelector("[data-mobile-list]");
    var iconOpen = document.querySelector("[data-icon-open]");
    var iconClose = document.querySelector("[data-icon-close]");
    if (!toggle || !panel) return;

    var VISIBLE_ITEMS = 4;

    /* Membatasi tinggi list pada jumlah 4 item pertama agar
       item kelima dan seterusnya digulir vertikal. Height
       dihitung dari item aktual karena label panjang bisa
       membungkus ke dua baris. */
    function clampMobileList() {
      if (!list) return;
      var items = list.children;

      if (items.length <= VISIBLE_ITEMS) {
        list.style.removeProperty("max-height");
        return;
      }

      var height = 0;
      for (var i = 0; i < VISIBLE_ITEMS; i++) {
        height += items[i].getBoundingClientRect().height;
      }
      list.style.maxHeight = Math.ceil(height) + "px";
    }

    function setOpen(open) {
      panel.classList.toggle("hidden", !open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
      if (iconOpen) iconOpen.classList.toggle("hidden", open);
      if (iconClose) iconClose.classList.toggle("hidden", !open);

      /* Diukur setelah panel terlihat. Saat masih display:none
         semua tinggi item bernilai 0 sehingga batas max-height
         akan terkunci jadi 0px dan list tidak bisa digulir. */
      if (open) clampMobileList();
    }

    setOpen(false);

    toggle.addEventListener("click", function () {
      setOpen(panel.classList.contains("hidden"));
    });

    /* Menutup panel saat layar melebar ke desktop, agar state
       terbuka tidak tertinggal saat layout berubah. */
    var desktop = window.matchMedia("(min-width: 1024px)");
    function onBreakpointChange(event) {
      if (event.matches) setOpen(false);
    }
    if (typeof desktop.addEventListener === "function") {
      desktop.addEventListener("change", onBreakpointChange);
    } else {
      desktop.addListener(onBreakpointChange);
    }

    /* Label panjang bisa membungkus dan mengubah tinggi item,
       sehingga batas 4 item dihitung ulang saat ukuran berubah. */
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (panel.classList.contains("hidden")) return;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        resizeTimer = null;
        clampMobileList();
      }, 120);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (panel.classList.contains("hidden")) return;
      setOpen(false);
      toggle.focus();
    });

    /* Menutup panel ketika fokus berpindah keluar dari header. */
    document.addEventListener("focusin", function (event) {
      if (panel.classList.contains("hidden")) return;
      if (!panel.contains(event.target) && !toggle.contains(event.target)) {
        setOpen(false);
      }
    });
  }

  /* ───────────────────────────────────────────────
   * Scrollable category navigation (desktop)
   *
   * Sesuai design.md §16 — Category Navigation.
   * Lebar list dibatasi agar hanya 4 item pertama yang terlihat.
   * Item ke-5 dan seterusnya keluar area scroll dan dapat
   * dijangkau lewat tombol panah atau gesture swipe.
   *
   * Tombol panah hanya terlihat saat nav di-hover (diatur CSS),
   * namun state aria-disabled-nya tetap disinkronkan JS.
   * ─────────────────────────────────────────────── */
  function initScrollableNav() {
    var list = document.querySelector("[data-nav-list]");
    var prev = document.querySelector("[data-nav-prev]");
    var next = document.querySelector("[data-nav-next]");
    var fadeLeft = document.querySelector("[data-nav-fade-left]");
    var fadeRight = document.querySelector("[data-nav-fade-right]");
    if (!list || !prev || !next) return;

    var VISIBLE_ITEMS = 4;
    var SCROLL_STEP = 150;

    /* Membatasi lebar list pada lebar total 4 item pertama
       beserta gap, sehingga item kelima dan seterusnya tidak
       terlihat sebelum pengguna menggulir. */
    function clampToVisibleItems() {
      var items = list.children;
      if (items.length <= VISIBLE_ITEMS) {
        list.style.removeProperty("max-width");
        return;
      }

      var gap = parseFloat(window.getComputedStyle(list).columnGap) || 0;
      var width = 0;

      for (var i = 0; i < VISIBLE_ITEMS; i++) {
        width += items[i].getBoundingClientRect().width;
        if (i < VISIBLE_ITEMS - 1) width += gap;
      }

      list.style.maxWidth = Math.ceil(width + gap) + "px";
    }

    /* Sinkronisasi aria-disabled.
       Panah selalu ada di DOM namun disembunyikan lewat CSS
       (opacity) kecuali nav sedang di-hover/focus. */
    function updateArrows() {
      var maxScroll = list.scrollWidth - list.clientWidth;
      var atStart = list.scrollLeft <= 1;
      var atEnd = list.scrollLeft >= maxScroll - 1;
      var noOverflow = maxScroll <= 1;

      // Jika tidak ada overflow, nonaktifkan kedua tombol sepenuhnya
      if (noOverflow) {
        atStart = true;
        atEnd = true;
      }

      prev.setAttribute("aria-disabled", String(atStart));
      next.setAttribute("aria-disabled", String(atEnd));

      // Fade indikator scroll masih mengikuti logika posisi
      if (fadeLeft) fadeLeft.classList.toggle("hidden", atStart);
      if (fadeRight) fadeRight.classList.toggle("hidden", atEnd);
    }

    function scrollByStep(direction) {
      var maxScroll = list.scrollWidth - list.clientWidth;
      if (direction < 0 && list.scrollLeft <= 1) return;
      if (direction > 0 && list.scrollLeft >= maxScroll - 1) return;
      list.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });
    }

    prev.addEventListener("click", function () {
      scrollByStep(-1);
    });

    next.addEventListener("click", function () {
      scrollByStep(1);
    });

    function sync() {
      clampToVisibleItems();
      updateArrows();
    }

    list.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", sync);
    sync();
  }

  /* ───────────────────────────────────────────────
   * Search form guard
   *
   * Belum ada backend. Mencegah submit agar halaman
   * tidak reload. Berlaku untuk form desktop dan mobile.
   * ─────────────────────────────────────────────── */
  function initSearchGuard() {
    var forms = document.querySelectorAll("[data-search-form]");
    Array.prototype.forEach.call(forms, function (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
      });
    });
  }

  function init() {
    markPlaceholders();
    initMobileMenu();
    initScrollableNav();
    initSearchGuard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
