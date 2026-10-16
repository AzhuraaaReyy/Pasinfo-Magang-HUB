/**
 * Menu Kuliner - GSAP Animation Effects (Mobile Safe)
 * =====================================================================
 * Port dari detail-kuliner-animation.js (konsep & perilaku disamakan).
 * - Animasi masuk hero + breadcrumb SETELAH konten dirender (gsap.set/
 *   gsap.from immediateRender -> tanpa kedip).
 * - Kartu/section di bawah hero REVEAL SAAT SCROLL (ScrollTrigger, sekali).
 * - Bila "prefers-reduced-motion", animasi dilewati.
 *
 * Penyesuaian DOM menu_kuliner.html:
 * - Hero: #hero-media (diisi JS setHeroPhoto) + overlay konten
 *   (.absolute.inset-0.flex) + breadcrumb nav[aria-label="Breadcrumb"].
 * - Menu (#menu-grid) & rekomendasi (#reco-grid) & sekitar (#nearby-grid)
 *   diisi JS -> ditangani lewat MutationObserver (revealItems).
 */

(function () {
  'use strict';

  var CURTAIN_MS = 430; // durasi tirai masuk (input.css: 0.42s) + jeda kecil
  var BASE = 0.05; // jeda dasar (diisi sesuai konteks transisi)

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

  /* Hero Banner: media zoom halus + fade konten teks (saat load). */
  function animateHeroBanner() {
    var heroMedia = document.getElementById('hero-media');
    if (heroMedia) {
      gsap.set(heroMedia, { scale: 1.04 });
      gsap.to(heroMedia, { duration: 1, scale: 1, ease: 'power2.out', delay: BASE + 0.2 });
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
    gsap.to(breadcrumb, { duration: 0.6, opacity: 1, ease: 'power2.out', delay: BASE });
  }

  /* Reveal satu elemen saat masuk viewport (sekali saja). */
  function reveal(el, from) {
    if (!el) return;
    var inView = el.getBoundingClientRect().top < window.innerHeight;
    var opts = {
      duration: 0.7,
      ease: 'power2.out',
      immediateRender: true,
      delay: inView ? BASE : 0,
    };
    if (hasScrollTrigger()) {
      opts.scrollTrigger = { trigger: el, start: 'top 85%', once: true };
    }
    gsap.from(el, Object.assign({ opacity: 0, y: 30 }, from, opts));
  }

  /* Reveal sekumpulan item dengan stagger; tunggu bila belum dirender. */
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
    // MENU & HARGA (section + kartu menu)
    var menuGrid = document.getElementById('menu-grid');
    if (menuGrid) {
      var menuSection = menuGrid.closest('section');
      if (menuSection) reveal(menuSection);
      revealItems(menuGrid, ':scope > *', { y: 20, scale: 0.97 }, 0.07);
    }

    // SPACE IKLAN (dua banner di dalam <main>)
    Array.prototype.forEach.call(document.querySelectorAll('main > div'), function (ad) {
      reveal(ad, { y: 24 });
    });

    // REKOMENDASI & SEKITAR (section + kartu)
    ['reco-grid', 'nearby-grid'].forEach(function (id) {
      var grid = document.getElementById(id);
      if (!grid) return;
      var section = grid.closest('section');
      if (section) reveal(section);
      revealItems(grid, ':scope > *', { y: 30 }, 0.1);
    });
  }

  /* Hover: cukup kartu & kontrol berukuran wajar (hindari repaint besar). */
  var MAX_HOVER_AREA = 140000;

  function addHoverAnimationsToAllElements() {
    var allCards = document.querySelectorAll('article, .rounded-2xl, .rounded-xl');
    allCards.forEach(function (card) {
      if (card._gsapListenerAdded) return;
      var rect = card.getBoundingClientRect();
      if (rect.width * rect.height > MAX_HOVER_AREA) return;
      card._gsapListenerAdded = true;

      card.addEventListener('mouseenter', function () {
        gsap.to(this, { duration: 0.3, y: -6, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', function () {
        gsap.to(this, { duration: 0.3, y: 0, clearProps: 'boxShadow', ease: 'power2.out' });
      });
      card.addEventListener('touchstart', function () {
        gsap.to(this, { duration: 0.2, scale: 0.98, ease: 'power2.out' });
      }, { passive: true });
      card.addEventListener('touchend', function () {
        gsap.to(this, { duration: 0.2, scale: 1, clearProps: 'scale', ease: 'power2.out' });
      }, { passive: true });
    });

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
      btn.addEventListener('touchstart', function () {
        gsap.to(this, { duration: 0.15, scale: 0.95, ease: 'power2.out' });
      }, { passive: true });
      btn.addEventListener('touchend', function () {
        gsap.to(this, { duration: 0.15, scale: 1, clearProps: 'scale', ease: 'power2.out' });
      }, { passive: true });
    });
  }

  ready(function () {
    if (prefersReducedMotion()) return;
    whenGsap(function () {
      if (hasScrollTrigger()) {
        gsap.registerPlugin(ScrollTrigger);
      }
      BASE = document.documentElement.classList.contains('ph-entering') ? CURTAIN_MS / 1000 : 0.05;
      initAnimations();
      setTimeout(addHoverAnimationsToAllElements, (BASE + 0.85) * 1000);
      if (hasScrollTrigger()) {
        setTimeout(function () {
          ScrollTrigger.refresh();
        }, 200);
      }
    });
  });
})();
