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

    /* Menutup panel saat layar melebar ke tablet/desktop, agar state
       terbuka tidak tertinggal saat layout berubah. */
    var desktop = window.matchMedia("(min-width: 768px)");
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

    /* Di tablet (md) tampil 3 item, di desktop (lg) 4 item. */
    function visibleItems() {
      return window.innerWidth < 1024 ? 3 : 4;
    }

    var SCROLL_STEP = 150;

    /* Membatasi lebar list pada lebar total beberapa item pertama
       beserta gap, sehingga item berikutnya tidak terlihat sebelum
       pengguna menggulir. */
    function clampToVisibleItems() {
      var count = visibleItems();
      var items = list.children;
      if (items.length <= count) {
        list.style.removeProperty("max-width");
        return;
      }

      var gap = parseFloat(window.getComputedStyle(list).columnGap) || 0;
      var width = 0;

      for (var i = 0; i < count; i++) {
        width += items[i].getBoundingClientRect().width;
        if (i < count - 1) width += gap;
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
   * Kategori berita slider (mobile & tablet)
   *
   * Grup kategori (Lokal, Nasional, Internasional, dst.)
   * menggeser horizontal pada layar di bawah 1024px.
   * Indikator berupa bullet di bawah carousel yang menandai
   * kartu aktif; bullet bisa diklik untuk melompat langsung
   * ke kartu tersebut. Desktop (>1024) memakai grid statis
   * sehingga bullet disembunyikan lewat CSS (lg:hidden).
   * ─────────────────────────────────────────────── */
  function initCategorySlider() {
    var list = document.querySelector("[data-category-slider]");
    var dotsWrap = document.querySelector("[data-cat-dots]");
    if (!list || !dotsWrap) return;

    var children = Array.prototype.slice.call(list.children);
    var dots = [];

    function cardStep() {
      var first = children[0];
      if (!first) return 0;
      var gap = parseFloat(window.getComputedStyle(list).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    }

    function setActive(index) {
      dots.forEach(function (d, k) {
        var active = k === index;
        d.btn.setAttribute("aria-current", active ? "true" : "false");
        d.pill.classList.toggle("w-7", active);
        d.pill.classList.toggle("bg-brand", active);
        d.pill.classList.toggle("w-2.5", !active);
        d.pill.classList.toggle("bg-gray-300", !active);
      });
    }

    function scrollToIndex(index) {
      var step = cardStep();
      if (!step) return;
      var target = index * step;
      target = Math.max(0, Math.min(list.scrollWidth - list.clientWidth, target));
      list.scrollTo({ left: target, behavior: "smooth" });
      setActive(index);
    }

    function updateFromScroll() {
      if (!dots.length) return;
      var step = cardStep();
      if (!step) return;
      // di ujung kanan (tak mungkin tiap kartu menyejajari awalnya),
      // kartu terakhir dianggap posisi aktif
      if (list.scrollLeft >= list.scrollWidth - list.clientWidth - 2) {
        setActive(children.length - 1);
        return;
      }
      var pad = parseFloat(window.getComputedStyle(list).scrollPaddingLeft) || 0;
      var index = Math.round((list.scrollLeft + pad) / step);
      index = Math.max(0, Math.min(children.length - 1, index));
      setActive(index);
    }

    function makeDots() {
      dotsWrap.innerHTML = "";
      dots = children.map(function (child, i) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("data-cat-dot", "");
        btn.setAttribute("aria-label", "Ke kartu kategori " + (i + 1));
        btn.setAttribute("aria-controls", "category-slider");
        btn.setAttribute("aria-current", "false");
        btn.classList.add(
          "flex",
          "h-6",
          "w-7",
          "items-center",
          "justify-center",
          "rounded-full",
          "transition-colors",
          "hover:bg-gray-100",
          "focus:outline-none",
          "focus-visible:ring-2",
          "focus-visible:ring-brand",
          "focus-visible:ring-offset-2"
        );
        var pill = document.createElement("span");
        pill.setAttribute("aria-hidden", "true");
        pill.classList.add(
          "h-2.5",
          "w-2.5",
          "rounded-full",
          "bg-gray-300",
          "transition-all",
          "duration-300",
          "hover:bg-gray-400"
        );
        btn.appendChild(pill);
        btn.addEventListener("click", function () {
          scrollToIndex(i);
        });
        dotsWrap.appendChild(btn);
        return { btn: btn, pill: pill };
      });
    }

    makeDots();
    setActive(0);
    list.addEventListener("scroll", updateFromScroll, { passive: true });
    window.addEventListener("resize", updateFromScroll);
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

  /* ───────────────────────────────────────────────
   * Animasi · util
   * ─────────────────────────────────────────────── */
  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /* ───────────────────────────────────────────────
   * Animasi · gambar fade-in saat dimuat
   *
   * Opasitas 0 hanya dipasang oleh JS (class .img-fade)
   * sehingga halaman tetap tampil normal tanpa JS.
   * Dilepas saat load selesai maupun saat gagal.
   * ─────────────────────────────────────────────── */
  function initImageFade() {
    if (prefersReducedMotion()) return;
    var nodes = document.querySelectorAll("img[data-fade]");
    Array.prototype.forEach.call(nodes, function (img) {
      if (img.complete) return;
      img.classList.add("img-fade");
      img.addEventListener(
        "load",
        function () {
          img.classList.remove("img-fade");
        },
        { once: true }
      );
      img.addEventListener(
        "error",
        function () {
          img.classList.remove("img-fade");
        },
        { once: true }
      );
    });
  }

  /* ───────────────────────────────────────────────
   * Animasi · reveal konten saat scroll
   *
   * Class persembunyian hanya dipasang ketika
   * IntersectionObserver tersedia dan pengguna tidak
   * meminta reduced motion — selain itu konten tetap
   * tampil apa adanya. Terungkap sekali lalu dilepas
   * dari pengamatan.
   * ─────────────────────────────────────────────── */
  function initReveal() {
    if (prefersReducedMotion()) return;
    if (!("IntersectionObserver" in window)) return;
    var nodes = document.querySelectorAll("[data-reveal]");
    if (!nodes.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        Array.prototype.forEach.call(entries, function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -60px 0px" }
    );

    Array.prototype.forEach.call(nodes, function (node) {
      node.classList.add("reveal-hidden");
      observer.observe(node);
    });
  }

  /* ───────────────────────────────────────────────
   * Animasi · header menyembunyi saat scroll ke bawah
   *
   * Header sticky menerima translateY(-100%) ketika
   * pengguna scroll ke bawah dan kembali ketika scroll
   * ke atas. Tidak aktif saat menu mobile terbuka.
   * ─────────────────────────────────────────────── */
  function initSmartHeader() {
    var header = document.querySelector("header");
    if (!header) return;
    if (prefersReducedMotion()) return;

    var lastY = window.pageYOffset;
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.pageYOffset;
      var menuToggle = document.querySelector("[data-menu-toggle]");
      var menuOpen =
        menuToggle && menuToggle.getAttribute("aria-expanded") === "true";

      if (menuOpen) {
        header.classList.remove("header-hide");
      } else if (y > 120 && y > lastY + 4) {
        header.classList.add("header-hide");
      } else if (y < lastY - 4 || y <= 120) {
        header.classList.remove("header-hide");
      }
      lastY = y;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
  }

  /* ───────────────────────────────────────────────
   * Animasi · progress bar baca
   *
   * Bar tipis di atas halaman memanjang sesuai posisi
   * scroll (skala sumbu-X 0 → 1). Murni presentasi,
   * aria-hidden di markup.
   * ─────────────────────────────────────────────── */
  function initReadingProgress() {
    var bar = document.querySelector("[data-reading-progress]");
    if (!bar) return;

    var ticking = false;

    function update() {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var ratio = max > 0 ? window.pageYOffset / max : 0;
      if (ratio < 0) ratio = 0;
      if (ratio > 1) ratio = 1;
      bar.style.transform = "scaleX(" + ratio + ")";
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  /* ───────────────────────────────────────────────
   * Header overlay transparan (wisata/kuliner/budaya/acara)
   *
   * Aktif hanya bila <body data-header-overlay> ada. Header
   * transparan di atas section pertama, menjadi solid setelah
   * scroll melewati hero. Homepage/news tidak terpengaruh.
   * ─────────────────────────────────────────────── */
  function initOverlayHeader() {
    if (!document.body.hasAttribute("data-header-overlay")) return;
    var header = document.querySelector("header");
    if (!header) return;

    function threshold() {
      var hero = document.getElementById("hero-section");
      return hero ? hero.offsetHeight - 80 : 600;
    }

    var ticking = false;
    function update() {
      ticking = false;
      header.classList.toggle("header-solid", window.pageYOffset > threshold());
    }

    update();
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update);
  }

  function init() {
    markPlaceholders();
    initMobileMenu();
    initOverlayHeader();
    initScrollableNav();
    initCategorySlider();
    initSearchGuard();
    initImageFade();
    initReveal();
    initSmartHeader();
    initReadingProgress();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
