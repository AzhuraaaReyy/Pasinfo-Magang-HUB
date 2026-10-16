/**
 * Detail Acara (Event) - GSAP Animation Effects (Mobile Safe)
 * =================================================================
 * Port dari detail-wisata-animation.js (Owner override design.md §49-50).
 * DOM detail_acara.html berbeda dari detail_wisata (hero 2 kolom, bukan
 * banner full-width; tanpa cuaca/tiket/partnership), sehingga selector
 * diadaptasi. Penyesuaian:
 * - Hero: `section[aria-label="Ringkasan acara"]` + `#evt-hero-photo`.
 * - Bug `arguments.callee` diperbaiki.
 * - Hover memakai clearProps agar tidak menimpa shadow Tailwind permanen.
 */

(function () {
  'use strict';

  if (typeof gsap === 'undefined') {
    if (window.console) console.warn('[detail-acara-gsap] GSAP not loaded, skipping animations');
    return;
  }

  if (typeof ScrollTrigger !== 'undefined' && typeof gsap.registerPlugin === 'function') {
    gsap.registerPlugin(ScrollTrigger);
  }

  var BASE = 0.05; // jeda dasar (diisi sesuai konteks transisi)
  var CURTAIN_MS = 420; // selaras animasi tirai ph-curtain-out di input.css

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function hasScrollTrigger() {
    return typeof window.ScrollTrigger !== 'undefined';
  }

  // Tunggu GSAP bila CDN lambat (maks ~5 detik), lalu jalan.
  function whenGsap(cb, attempts) {
    attempts = attempts || 0;
    if (typeof window.gsap !== 'undefined') {
      cb();
      return;
    }
    if (attempts > 50) return;
    window.setTimeout(function () {
      whenGsap(cb, attempts + 1);
    }, 100);
  }

  function initAnimations() {
    animateHero();
    animateBreadcrumb();
    animateCardsOnScroll();
    addHoverAnimationsToAllElements();

    if (window.console) console.info('[detail-acara-gsap] Animations initialized');
  }

  /** Hero (2 kolom: foto + info)
   * Transform-only (tanpa opacity:0) — pola sama seperti animateCards di
   * bawah. opacity:0 pada gsap.from menyembunyikan konten yang sudah
   * ter-paint lalu memunculkannya lagi (~1 detik hero kosong), sehingga
   * halaman terasa reload 2x (verified filmstrip 2026-10-16). */
  function animateHero() {
    var heroSection = document.querySelector('section[aria-label="Ringkasan acara"]') || document.querySelector('section:first-of-type');
    if (heroSection) {
      gsap.from(heroSection, { duration: 0.8, y: 30, ease: 'power2.out', delay: 0.1 });
    }

    var heroPhoto = document.getElementById('evt-hero-photo');
    if (heroPhoto) {
      gsap.from(heroPhoto, { duration: 1, scale: 0.95, ease: 'power2.out', delay: 0.2 });
    }

    var title = document.getElementById('detail-title');
    if (title) {
      var infoCol = title.closest('div');
      if (infoCol) {
        gsap.from(infoCol.querySelectorAll('h1, p, div, button, svg'), {
          duration: 0.6,
          y: 20,
          stagger: 0.08,
          ease: 'power2.out',
          delay: 0.3,
        });
      }
    }
  }

  /** Breadcrumb Animation (transform-only, alasan sama seperti hero) */
  function animateBreadcrumb() {
    var breadcrumb = document.querySelector('nav[aria-label="Breadcrumb"]');
    if (!breadcrumb) return;

    gsap.from(breadcrumb, { duration: 0.6, x: -20, ease: 'power2.out' });
    gsap.from(breadcrumb.querySelectorAll('a, span'), {
      duration: 0.4,
      x: -10,
      stagger: 0.05,
      ease: 'power2.out',
      delay: 0.1,
    });
  }

  /* Reveal satu elemen saat masuk viewport (sekali saja). Pola
     detail-wisata: elemen yang sudah terlihat saat load diberi jeda BASE
     agar muncul setelah tirai. */
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
     belum dirender (grid JS), tunggu sampai ada. */
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
    if (typeof MutationObserver === 'undefined') return;
    var obs = new MutationObserver(function () {
      var found = container.querySelectorAll(selector);
      if (found.length) {
        obs.disconnect();
        run(found);
      }
    });
    obs.observe(container, { childList: true, subtree: true });
  }

  /** Kartu & section: reveal saat scroll (pola detail-wisata). */
  function animateCardsOnScroll() {
    // TENTANG ACARA (kartu kiri, termasuk sumber di dalamnya)
    var tentangTitle = document.getElementById('tentang-title');
    if (tentangTitle) {
      reveal(tentangTitle.closest('div'));
      revealItems(document.getElementById('info-rows'), ':scope > div', null, 0.06);
    }

    // LOKASI & RUTE
    reveal(document.querySelector('aside[aria-labelledby="lokasi-title"]'));

    // REKOMENDASI + JELAJAH (grid dinamis)
    revealItems(document.getElementById('reco-penyelenggara'), ':scope > *');
    revealItems(document.getElementById('reco-lainnya'), ':scope > *');
    revealItems(document.getElementById('jelajah-sekitar'), ':scope > *');

    // SPACE IKLAN
    reveal(document.querySelector('section[aria-label="Space iklan"]'));
  }

  /** Hover Animations */
  function addHoverAnimationsToAllElements() {
    var allCards = document.querySelectorAll('aside, article, .rounded-2xl, .rounded-xl');

    allCards.forEach(function (card) {
      if (card._gsapListenerAdded) return;
      card._gsapListenerAdded = true;

      card.addEventListener('mouseenter', function () {
        gsap.to(this, { duration: 0.3, y: -6, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', function () {
        gsap.to(this, { duration: 0.3, y: 0, clearProps: 'boxShadow', ease: 'power2.out' });
      });
      card.addEventListener('touchstart', function () {
        gsap.to(this, { duration: 0.2, scale: 0.98, ease: 'power2.out' });
      });
      card.addEventListener('touchend', function () {
        gsap.to(this, { duration: 0.2, scale: 1, clearProps: 'scale', ease: 'power2.out' });
      });
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
      });
      btn.addEventListener('touchend', function () {
        gsap.to(this, { duration: 0.15, scale: 1, clearProps: 'scale', ease: 'power2.out' });
      });
    });

    var infoItems = document.querySelectorAll('dl > div');
    infoItems.forEach(function (item) {
      if (item._gsapInfoAdded) return;
      item._gsapInfoAdded = true;

      item.addEventListener('mouseenter', function () {
        gsap.to(this, { duration: 0.25, x: 4, backgroundColor: 'rgba(243, 244, 246, 0.5)', ease: 'power2.out' });
      });
      item.addEventListener('mouseleave', function () {
        gsap.to(this, { duration: 0.25, x: 0, clearProps: 'backgroundColor', ease: 'power2.out' });
      });
    });
  }

  function ready(callback) {
    if (document.readyState !== 'loading') {
      callback();
    } else {
      document.addEventListener('DOMContentLoaded', callback);
    }
  }

  ready(function () {
    if (prefersReducedMotion()) return;
    whenGsap(function () {
      if (hasScrollTrigger()) {
        gsap.registerPlugin(ScrollTrigger);
      }
      // Bila datang lewat transisi (tirai aktif), tunda animasi load sampai
      // tirai selesai memudar agar fade-in terlihat. Tanpa tirai: jeda 0.05.
      // Entrance hero/breadcrumb transform-only (tanpa opacity:0) sehingga
      // tak pernah mengosongkan konten yang sudah ter-paint (anti reload-2x,
      // verified filmstrip 2026-10-16).
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
    window.addEventListener('load', function () {
      addHoverAnimationsToAllElements();
    });
  });
})();
