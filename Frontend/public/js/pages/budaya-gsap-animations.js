/**
 * GSAP Animations untuk Budaya Listing Page
 * =================================================================
 * Port dari wisata-gsap-animations.js (Owner override design.md §49-50).
 * Menambahkan efek entrance/scroll GSAP ke section (KECUALI hero, sesuai
 * pola Wisata). Tidak mengubah DOM/layout. Section rekomendasi kini memakai
 * coverflow (paritas Kuliner, budaya-reco.js); GSAP hanya menganimasi section
 * (.reco-section-bg), heading, container (.coverflow-container), dan dots —
 * BUKAN per-kartu (transform 3D kartu dikelola CSS coverflow).
 *
 * Sections yang di-animate:
 * 1. Map Section (#map-section) + peta (#budaya-map) + panel (#bud-featured)
 * 2. Daftar Budaya (#bud-grid [data-bud-id]) - stagger cards
 * 3. Kalender Budaya (#bud-calendar)
 * 4. Galeri Budaya (#bud-gallery)
 * 5. Rekomendasi (.reco-section-bg + .coverflow-container + #reco-dots)
 */

(function () {
  "use strict";

  if (typeof gsap === "undefined") {
    if (window.console) console.warn("[budaya-gsap] GSAP not loaded, skipping animations");
    return;
  }

  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    if (window.console) console.info("[budaya-gsap] Reduced motion detected, skipping animations");
    return;
  }

  var ST = {
    start: "top 80%",
    toggleActions: "play none none none",
  };

  // ── SECTION 1: MAP & FEATURED ─────────────────────────────────
  function animateMapSection() {
    var mapSection = document.getElementById("map-section");
    if (!mapSection) return;

    gsap.fromTo(
      mapSection,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: mapSection, start: ST.start, toggleActions: ST.toggleActions } }
    );

    var mapContainer = document.getElementById("budaya-map");
    if (mapContainer) {
      gsap.fromTo(
        mapContainer,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: "back.out(1.7)", scrollTrigger: { trigger: mapSection, start: ST.start, toggleActions: ST.toggleActions } }
      );
    }

    var featured = document.getElementById("bud-featured");
    if (featured) {
      gsap.fromTo(
        featured,
        { opacity: 0, x: 30 },
        { opacity: 1, x: 0, duration: 0.8, delay: 0.2, ease: "power2.out", scrollTrigger: { trigger: mapSection, start: ST.start, toggleActions: ST.toggleActions } }
      );
    }
  }

  // ── SECTION 2: DAFTAR BUDAYA ──────────────────────────────────
  function animateListGrid() {
    var grid = document.getElementById("bud-grid");
    if (!grid) return;
    var cards = grid.querySelectorAll("[data-bud-id]");
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
        clearProps: "transform",
        scrollTrigger: { trigger: grid, start: "top 75%", toggleActions: ST.toggleActions },
      }
    );
  }

  // ── SECTION 3 & 4: KALENDER + GALERI (teaser) ────────────────
  function animateTeaserSection(sectionId, slotId) {
    var section = document.getElementById(sectionId);
    if (!section) return;
    var slot = document.getElementById(slotId);

    gsap.fromTo(
      section,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", scrollTrigger: { trigger: section, start: ST.start, toggleActions: ST.toggleActions } }
    );

    if (!slot) return;
    var items = slot.querySelectorAll(":scope > *");
    if (items.length === 0) return;

    gsap.fromTo(
      items,
      { opacity: 0, y: 20, scale: 0.96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.07,
        ease: "back.out(1.4)",
        clearProps: "transform",
        scrollTrigger: { trigger: section, start: "top 75%", toggleActions: ST.toggleActions },
      }
    );
  }

  // ── SECTION 5: REKOMENDASI (coverflow, mirror Kuliner) ────────
  // Tidak menganimasi tiap kartu (transform 3D coverflow dikelola CSS);
  // cukup section, heading, container coverflow, dan dots.
  function animateRecommendationSection() {
    var recoSection = document.querySelector(".reco-section-bg");
    if (!recoSection) return;

    gsap.fromTo(
      recoSection,
      { opacity: 0 },
      { opacity: 1, duration: 1, ease: "power1.out", scrollTrigger: { trigger: recoSection, start: ST.start, toggleActions: ST.toggleActions } }
    );

    var heading = recoSection.querySelector(".reco-heading");
    if (heading) {
      gsap.fromTo(
        heading,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", scrollTrigger: { trigger: recoSection, start: ST.start, toggleActions: ST.toggleActions } }
      );
    }

    var coverflow = recoSection.querySelector(".coverflow-container");
    if (coverflow) {
      gsap.fromTo(
        coverflow,
        { opacity: 0, scale: 0.98 },
        { opacity: 1, scale: 1, duration: 1, delay: 0.2, ease: "back.out(1.5)", scrollTrigger: { trigger: recoSection, start: ST.start, toggleActions: ST.toggleActions } }
      );
    }

    var dots = document.getElementById("reco-dots");
    if (dots) {
      gsap.fromTo(
        dots.querySelectorAll("span"),
        { opacity: 0, scale: 0 },
        { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(2)", scrollTrigger: { trigger: recoSection, start: "top 70%", toggleActions: ST.toggleActions } }
      );
    }
  }

  // ── OBSERVER UNTUK ANIMASI DINAMIS (filter/pagination) ───────
  function observeNewCards() {
    var grid = document.getElementById("bud-grid");
    if (!grid || typeof MutationObserver === "undefined") return;

    var observer = new MutationObserver(function () {
      var newCards = grid.querySelectorAll("[data-bud-id]:not([data-animated])");
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
    animateListGrid();
    animateTeaserSection("bud-calendar-section", "bud-calendar");
    animateTeaserSection("bud-gallery-section", "bud-gallery");
    animateRecommendationSection();
    observeNewCards();

    if (window.console) console.info("[budaya-gsap] Animations initialized");
  }

  if (document.readyState === "complete") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
