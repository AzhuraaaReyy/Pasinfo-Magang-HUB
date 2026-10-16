/**
 * GSAP Animations untuk Homepage (Pasuruan Info)
 * ================================================
 * Animasi entrance yang konsisten untuk seluruh section homepage:
 * 1. Hero      → timeline saat load (stagger kolom kiri, tengah, sidebar).
 * 2. Section   → fade + slide-up saat masuk viewport ([data-reveal]).
 *
 * Nota:
 * - GSAP dimuat via CDN (3.12.2) sebelum file ini.
 * - Menghormati prefers-reduced-motion (skip total).
 * - Atribut [data-reveal] dilepas agar tidak bertabrakan dengan reveal
 *   berbasis IntersectionObserver di main.js (single source animasi).
 */

(function () {
  "use strict";

  if (typeof gsap === "undefined") {
    if (window.console) {
      console.warn("[homepage-gsap] GSAP not loaded, skipping animations");
    }
    return;
  }

  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    if (window.console) {
      console.info("[homepage-gsap] Reduced motion detected, skipping animations");
    }
    return;
  }

  if (typeof ScrollTrigger !== "undefined" && typeof gsap.registerPlugin === "function") {
    gsap.registerPlugin(ScrollTrigger);
  }

  // ── Hero: entrance saat load ──────────────────────────────────
  function animateHero() {
    var hero = document.querySelector("[data-hero-section]");
    if (!hero) return;

    var tl = gsap.timeline({
      defaults: { duration: 0.7, ease: "power2.out" },
    });

    var leftCards = hero.querySelectorAll("[data-hero-left] > article");
    if (leftCards.length) {
      tl.from(leftCards, { opacity: 0, y: 24, stagger: 0.12 });
    }

    var mid = hero.querySelector("[data-hero-mid]");
    if (mid) {
      tl.from(mid, { opacity: 0, y: 24 }, 0.15);
    }

    var asideHeader = hero.querySelector("[data-hero-aside] > div");
    if (asideHeader) {
      tl.from(asideHeader, { opacity: 0, y: 16 }, 0.3);
    }

    var asideItems = hero.querySelectorAll("[data-hero-aside] li");
    if (asideItems.length) {
      tl.from(asideItems, { opacity: 0, y: 16, stagger: 0.06 }, 0.4);
    }
  }

  // ── Section lain: fade + slide-up saat scroll ─────────────────
  function animateRevealSections() {
    var nodes = gsap.utils.toArray("[data-reveal]");
    if (!nodes.length) return;

    nodes.forEach(function (el) {
      // Lepas agar reveal bawaan main.js (IntersectionObserver) tidak aktif.
      el.removeAttribute("data-reveal");

      gsap.from(el, {
        opacity: 0,
        y: 28,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none none",
        },
      });
    });
  }

  // ── INIT ───────────────────────────────────────────────────────
  function init() {
    animateHero();
    animateRevealSections();

    if (typeof ScrollTrigger !== "undefined") {
      window.addEventListener("load", function () {
        ScrollTrigger.refresh();
      });
    }

    if (window.console) {
      console.info("[homepage-gsap] Animations initialized");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
