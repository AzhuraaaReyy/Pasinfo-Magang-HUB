/**
 * Detail Budaya - GSAP Animation Effects (Mobile Safe)
 * =====================================================================
 * Diselaraskan dengan detail-kuliner-animation.js (Owner 2026-10-15):
 * - Hero + breadcrumb masuk halus SETELAH konten dirender (gsap.set/gsap.from
 *   immediateRender -> tanpa kedip). Section hero TIDAK disembunyikan karena
 *   foto hero sudah di-fade oleh detail-budaya.js.
 * - Kartu/section di bawah hero REVEAL SAAT SCROLL (ScrollTrigger, sekali saja).
 * - Bila pengguna memilih "reduced motion", animasi GSAP dilewati.
 * - Durasi load disesuaikan dengan tirai transisi (ph-entering).
 *
 * Penyesuaian DOM budaya:
 * - Galeri memakai #galeri-featured + #galeri-thumbs [data-shot].
 * - Section "Sejarah Singkat & Nilai Budaya" ikut dianimasikan (budaya-unik).
 * - Sumber & Verifikasi tetap section tersendiri.
 * - Rekomendasi #reco-serupa / #reco-lainnya / #reco-sekitar diisi JS
 *   -> ditangani lewat MutationObserver.
 * - Perbaikan: typo lama `reco-sekaritar` -> `reco-sekitar`.
 */

(function () {
  'use strict';

  var CURTAIN_MS = 430; // durasi tirai masuk (lihat input.css: 0.42s) + jeda kecil
  var BASE = 0.05; // jeda dasar (diisi sesuai konteks transisi)

  // Pastikan GSAP sudah siap tanpa melempar error (aman di strict mode).
  function whenGsap(cb, attempts) {
    attempts = attempts || 0;
    if (typeof window.gsap !== 'undefined') {
      cb();
      return;
    }
    if (attempts > 50) return; // menyerah setelah ~5 detik
    window.setTimeout(function () {
      whenGsap(cb, attempts + 1);
    }, 100);
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function hasScrollTrigger() {
    return typeof window.ScrollTrigger !== 'undefined';
  }

  function ready(cb) {
    if (document.readyState === 'complete') {
      cb();
      return;
    }
    document.addEventListener('DOMContentLoaded', cb, { once: true });
  }

  function initAnimations() {
    animateHeroBanner();
    animateBreadcrumb();
    animateCardsOnScroll();
    addHoverAnimationsToAllElements();
  }

  /* Hero Banner: zoom halus pada media + fade konten teks (saat load). */
  function animateHeroBanner() {
    var heroMedia = document.getElementById('hero-media');
    /* JANGAN menyembunyikan seluruh <section> hero (opacity:0). Foto hero
       sudah di-fade oleh detail-budaya.js, sehingga menyembunyikan section
       menambah lapisan fade KEDUA dan membuat area hero terlihat kosong. */
    if (heroMedia) {
      gsap.set(heroMedia, { scale: 1.04 });
      gsap.to(heroMedia, {
        duration: 1,
        scale: 1,
        ease: 'power2.out',
        delay: BASE + 0.2,
      });
    }

    var heroContent = document.querySelector('.absolute.inset-0.flex');
    if (heroContent) {
      var children = heroContent.querySelectorAll('div, h1, p, span');
      gsap.set(children, { opacity: 0, y: 20 });
      gsap.to(children, {
        duration: 0.6,
        opacity: 1,
        y: 0,
        stagger: 0.1,
        ease: 'power2.out',
        delay: BASE + 0.3,
      });
    }
  }

  /* Breadcrumb: fade-in halus (saat load). */
  function animateBreadcrumb() {
    var breadcrumb = document.querySelector('nav[aria-label="Breadcrumb"]');
    if (!breadcrumb) return;
    gsap.set(breadcrumb, { opacity: 0 });
    gsap.to(breadcrumb, {
      duration: 0.6,
      opacity: 1,
      ease: 'power2.out',
      delay: BASE,
    });
  }

  /* Reveal satu elemen saat masuk viewport (sekali saja). Elemen yang sudah
     terlihat saat load tetap diberi jeda BASE agar muncul setelah tirai. */
  function reveal(el, from, inViewDelay) {
    if (!el) return;
    var inView = el.getBoundingClientRect().top < window.innerHeight;
    var opts = {
      duration: 0.7,
      ease: 'power2.out',
      immediateRender: true,
      delay: inView ? BASE + (inViewDelay || 0) : inViewDelay || 0,
    };
    if (hasScrollTrigger()) {
      opts.scrollTrigger = { trigger: el, start: 'top 85%', once: true };
    }
    gsap.from(el, Object.assign({ opacity: 0, y: 30 }, from, opts));
  }

  /* Reveal sekumpulan item dengan stagger saat masuk viewport. Bila item
     belum dirender (rekomendasi yang diisi JS), tunggu sampai ada. */
  function revealItems(container, selector, from, stagger) {
    if (!container) return;
    if (typeof stagger !== 'number') stagger = 0.08;

    function run(items) {
      Array.prototype.forEach.call(items, function (item, i) {
        var inView = item.getBoundingClientRect().top < window.innerHeight;
        var opts = {
          duration: 0.6,
          ease: 'power2.out',
          immediateRender: true,
          delay: (inView ? BASE : 0) + i * stagger,
        };
        if (hasScrollTrigger()) {
          opts.scrollTrigger = { trigger: item, start: 'top 92%', once: true };
        }
        gsap.from(item, Object.assign({ opacity: 0, y: 24 }, from, opts));
      });
    }

    var items = container.querySelectorAll(selector);
    if (items.length) {
      run(items);
      return;
    }
    var obs = new MutationObserver(function () {
      var found = container.querySelectorAll(selector);
      if (found.length) {
        obs.disconnect();
        run(found);
      }
    });
    obs.observe(container, { childList: true, subtree: true });
  }

  /* Kartu & section: reveal saat scroll. */
  function animateCardsOnScroll() {
    // TENTANG BUDAYA
    reveal(document.querySelector('[aria-labelledby="tentang-title"]'));

    // LOKASI & RUTE
    reveal(document.querySelector('[aria-labelledby="lokasi-title"]'));

    // GALERI (section + thumbnail)
    reveal(document.querySelector('section[aria-label*="Galeri"]'));
    revealItems(document.getElementById('galeri-thumbs'), '[data-shot]', { y: 24, scale: 0.96 }, 0.06);

    // SEJARAH SINGKAT & NILAI BUDAYA (budaya-unik)
    var sejarahDesc = document.getElementById('sejarah-desc');
    if (sejarahDesc) {
      var sejarahSection = sejarahDesc.closest('section');
      if (sejarahSection) reveal(sejarahSection);
    }

    // SUMBER & VERIFIKASI
    reveal(document.querySelector('section[aria-label="Sumber dan verifikasi"]'), { y: 24 });

    // SPACE IKLAN
    reveal(document.querySelector('section[aria-label="Space iklan"]'), { y: 24 });

    // REKOMENDASI SERUPA / LAINNYA / SEKITAR (section + kartu)
    ['reco-serupa', 'reco-lainnya', 'reco-sekitar'].forEach(function (id) {
      var grid = document.getElementById(id);
      if (!grid) return;
      var section = grid.closest('section');
      if (section) reveal(section);
      revealItems(grid, ':scope > *', { y: 30 }, 0.1);
    });
  }

  /**
   * Add Hover Animations to Interactive Elements.
   *
   * Catatan performa: sengaja TIDAK menyasar <section> besar (mis. Tentang/
   * Lokasi) dan melewati elemen berukuran sangat besar, karena menganimasikan
   * y/boxShadow pada area luas memicu repaint berat - terutama saat tap di
   * mobile. Cukup kartu & kontrol berukuran wajar.
   */
  var MAX_HOVER_AREA = 140000; // px^2 (~ 375x373); di atas ini dianggap container besar

  function addHoverAnimationsToAllElements() {
    // KARTU
    var allCards = document.querySelectorAll('article, .rounded-2xl, .rounded-xl');
    allCards.forEach(function (card) {
      if (card._gsapListenerAdded) return;
      var rect = card.getBoundingClientRect();
      if (rect.width * rect.height > MAX_HOVER_AREA) return; // lewati container besar
      card._gsapListenerAdded = true;

      card.addEventListener('mouseenter', function () {
        gsap.to(this, {
          duration: 0.3,
          y: -6,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          ease: 'power2.out',
        });
      });

      card.addEventListener('mouseleave', function () {
        gsap.to(this, {
          duration: 0.3,
          y: 0,
          clearProps: 'boxShadow',
          ease: 'power2.out',
        });
      });

      card.addEventListener(
        'touchstart',
        function () {
          gsap.to(this, { duration: 0.2, scale: 0.98, ease: 'power2.out' });
        },
        { passive: true }
      );

      card.addEventListener(
        'touchend',
        function () {
          gsap.to(this, { duration: 0.2, scale: 1, clearProps: 'scale', ease: 'power2.out' });
        },
        { passive: true }
      );
    });

    // TOMBOL
    var allButtons = document.querySelectorAll('button, a[class*="bg-blue"], a[class*="bg-white"]');

    allButtons.forEach(function (btn) {
      if (btn._gsapButtonAdded) return;
      btn._gsapButtonAdded = true;

      btn.addEventListener('mouseenter', function () {
        gsap.to(this, { duration: 0.25, scale: 1.05, ease: 'power2.out' });
      });

      btn.addEventListener('mouseleave', function () {
        gsap.to(this, { duration: 0.25, scale: 1, clearProps: 'scale', ease: 'power2.out' });
      });

      btn.addEventListener(
        'touchstart',
        function () {
          gsap.to(this, { duration: 0.15, scale: 0.95, ease: 'power2.out' });
        },
        { passive: true }
      );

      btn.addEventListener(
        'touchend',
        function () {
          gsap.to(this, { duration: 0.15, scale: 1, clearProps: 'scale', ease: 'power2.out' });
        },
        { passive: true }
      );
    });

    // INFO ITEMS
    var infoItems = document.querySelectorAll('dl > div');
    infoItems.forEach(function (item) {
      if (item._gsapInfoAdded) return;
      item._gsapInfoAdded = true;

      item.addEventListener('mouseenter', function () {
        gsap.to(this, {
          duration: 0.25,
          x: 4,
          backgroundColor: 'rgba(243, 244, 246, 0.5)',
          ease: 'power2.out',
        });
      });

      item.addEventListener('mouseleave', function () {
        gsap.to(this, {
          duration: 0.25,
          x: 0,
          clearProps: 'backgroundColor',
          ease: 'power2.out',
        });
      });
    });
  }

  ready(function () {
    if (prefersReducedMotion()) return;
    whenGsap(function () {
      if (hasScrollTrigger()) {
        gsap.registerPlugin(ScrollTrigger);
      }
      // Bila datang lewat transisi (tirai aktif), tunda animasi load sampai
      // tirai selesai memudar agar fade-in terlihat.
      BASE = document.documentElement.classList.contains('ph-entering') ? CURTAIN_MS / 1000 : 0.05;
      initAnimations();
      // Pasang ulang listener hover sekali lagi untuk elemen yang baru dirender.
      setTimeout(addHoverAnimationsToAllElements, (BASE + 0.85) * 1000);
      if (hasScrollTrigger()) {
        // Pastikan posisi trigger sesuai setelah semua konten siap.
        setTimeout(function () {
          ScrollTrigger.refresh();
        }, 200);
      }
    });
  });
})();
