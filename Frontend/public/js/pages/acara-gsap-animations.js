/**
 * GSAP Animations untuk Acara (Event) Listing Page
 * =================================================================
 * Port dari wisata-gsap-animations.js (Owner override design.md §49-50).
 * Menambahkan efek entrance/scroll GSAP ke section (KECUALI hero, sesuai
 * pola Wisata). Tidak mengubah DOM/layout dan tidak mengubah carousel
 * rekomendasi (tetap horizontal-scroll via reco-carousel.js).
 *
 * Sections yang di-animate:
 * 1. Map Section (#map-section) + peta (#acara-map) + panel (#evt-detail)
 * 2. Event Hari Ini (#evt-today-wrap) + Kalender mini (aside)
 * 3. Daftar Acara (#evt-grid [data-evt-id]) - stagger cards
 * 4. Rekomendasi (#reco-row + #reco-dots)
 */

(function () {
  "use strict";

  if (typeof gsap === "undefined") {
    if (window.console) console.warn("[acara-gsap] GSAP not loaded, skipping animations");
    return;
  }

  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    if (window.console) console.info("[acara-gsap] Reduced motion detected, skipping animations");
    return;
  }

  var ST = {
    start: "top 80%",
    toggleActions: "play none none none",
  };

  // ── SECTION 1: MAP & DETAIL PANEL ─────────────────────────────
  function animateMapSection() {
    var mapSection = document.getElementById("map-section");
    if (!mapSection) return;

    gsap.fromTo(
      mapSection,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: mapSection, start: ST.start, toggleActions: ST.toggleActions } }
    );

    var mapContainer = document.getElementById("acara-map");
    if (mapContainer) {
      gsap.fromTo(
        mapContainer,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: "back.out(1.7)", scrollTrigger: { trigger: mapSection, start: ST.start, toggleActions: ST.toggleActions } }
      );
    }

    var detail = document.getElementById("evt-detail");
    if (detail) {
      gsap.fromTo(
        detail,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.8, delay: 0.2, ease: "power2.out", scrollTrigger: { trigger: mapSection, start: ST.start, toggleActions: ST.toggleActions } }
      );
    }
  }

  // ── SECTION 2: EVENT HARI INI + KALENDER ─────────────────────
  function animateTodaySection() {
    var section = document.querySelector('section[aria-label="Event hari ini dan kalender acara"]');
    if (!section) return;

    gsap.fromTo(
      section,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", scrollTrigger: { trigger: section, start: ST.start, toggleActions: ST.toggleActions } }
    );

    var wrap = document.getElementById("evt-today-wrap");
    if (wrap) {
      gsap.fromTo(
        wrap,
        { opacity: 0, y: 25, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, delay: 0.1, ease: "back.out(1.3)", scrollTrigger: { trigger: section, start: ST.start, toggleActions: ST.toggleActions } }
      );
    }

    var calAside = section.querySelector('aside[aria-label="Kalender Acara Pasuruan"]');
    if (calAside) {
      gsap.fromTo(
        calAside,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.7, delay: 0.25, ease: "power2.out", scrollTrigger: { trigger: section, start: ST.start, toggleActions: ST.toggleActions } }
      );
    }
  }

  // ── SECTION 3: DAFTAR ACARA ──────────────────────────────────
  function animateListGrid() {
    var grid = document.getElementById("evt-grid");
    if (!grid) return;
    var cards = grid.querySelectorAll("[data-evt-id]");
    if (cards.length === 0) return;

    gsap.fromTo(
      cards,
      { opacity: 0, y: 30, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.08,
        ease: "back.out(1.5)",
        // Bersihkan transform inline seusai entrance agar hover-lift
        // Tailwind (hover:-translate-y-2) tetap berfungsi — inline style
        // selalu menang atas stylesheet bila tidak dibersihkan.
        clearProps: "transform",
        scrollTrigger: { trigger: grid, start: "top 75%", toggleActions: ST.toggleActions },
      }
    );
  }

  // ── SECTION 4: REKOMENDASI (horizontal-scroll, tidak diubah) ─
  function animateRecommendationSection() {
    var row = document.getElementById("reco-row");
    if (!row) return;
    var section = row.closest("section") || row.parentElement;
    if (!section) return;

    gsap.fromTo(
      section,
      { opacity: 0 },
      { opacity: 1, duration: 1, ease: "power1.out", scrollTrigger: { trigger: section, start: ST.start, toggleActions: ST.toggleActions } }
    );

    var heading = section.querySelector("h2");
    if (heading) {
      gsap.fromTo(
        heading,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: section, start: ST.start, toggleActions: ST.toggleActions } }
      );
    }

    var cards = row.querySelectorAll(":scope > *");
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1, ease: "back.out(1.4)", scrollTrigger: { trigger: section, start: ST.start, toggleActions: ST.toggleActions } }
      );
    }

    var dots = document.getElementById("reco-dots");
    if (dots) {
      gsap.fromTo(
        dots.querySelectorAll("span"),
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(2)", scrollTrigger: { trigger: section, start: "top 70%", toggleActions: ST.toggleActions } }
      );
    }
  }

  // ── OBSERVER UNTUK ANIMASI DINAMIS (filter/pagination) ───────
  function observeNewCards() {
    var grid = document.getElementById("evt-grid");
    if (!grid || typeof MutationObserver === "undefined") return;

    var observer = new MutationObserver(function () {
      var newCards = grid.querySelectorAll("[data-evt-id]:not([data-animated])");
      if (newCards.length === 0) return;
      gsap.fromTo(
        newCards,
        { opacity: 0, y: 20, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.06,
          ease: "back.out(1.5)",
          clearProps: "transform",
          onComplete: function () {
            newCards.forEach(function (c) {
              c.setAttribute("data-animated", "true");
            });
          },
        }
      );
    });

    observer.observe(grid, { childList: true, subtree: false });
  }

  // ── INIT ───────────────────────────────────────────────────────
  function init() {
    if (typeof gsap.registerPlugin === "function" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    animateMapSection();
    animateTodaySection();
    animateListGrid();
    animateRecommendationSection();
    observeNewCards();

    if (window.console) console.info("[acara-gsap] Animations initialized");
  }

  if (document.readyState === "complete") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
