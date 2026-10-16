/**
 * GSAP Animations untuk Kuliner Listing Page
 * =================================================================
 * Port dari wisata-gsap-animations.js (Owner override design.md §49-50).
 * Menambahkan efek entrance/scroll GSAP ke section (KECUALI hero, sesuai
 * pola Wisata). Tidak mengubah DOM/layout: hanya animasi pada elemen yang
 * sudah ada. Aman bila GSAP gagal dimuat (konten tetap tampil).
 *
 * Sections yang di-animate:
 * 1. Map Section (#map-section) - fade in + slide up
 * 2. Panel detail peta (#kul-detail > div) - fade + slide dari kanan
 * 3. Destination List (#kul-grid [data-kul-id]) - stagger cards in
 * 4. Rekomendasi (#reco-row + #reco-dots) - fade in elements
 */

(function () {
  "use strict";

  // Cek apakah GSAP sudah loaded
  if (typeof gsap === "undefined") {
    if (window.console) console.warn("[kuliner-gsap] GSAP not loaded, skipping animations");
    return;
  }

  var reducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    if (window.console) console.info("[kuliner-gsap] Reduced motion detected, skipping animations");
    return;
  }

  // ── SECTION 1: MAP SECTION ANIMATION ──────────────────────────
  function animateMapSection() {
    var mapSection = document.getElementById("map-section");
    if (!mapSection) return;

    gsap.fromTo(
      mapSection,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: mapSection,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      }
    );

    // Animate map container
    var mapContainer = document.getElementById("kuliner-map");
    if (mapContainer) {
      gsap.fromTo(
        mapContainer,
        { scale: 0.95, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 1,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: mapSection,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    }

    // Animate detail panel (di-render oleh kuliner-map.js)
    var detailPanel = document.querySelector("#kul-detail > div");
    if (detailPanel) {
      gsap.fromTo(
        detailPanel,
        { opacity: 0, x: 30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          delay: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: mapSection,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    }
  }

  // ── SECTION 2: DESTINATION LIST ANIMATION ─────────────────────
  function animateDestinationList() {
    var grid = document.getElementById("kul-grid");
    if (!grid) return;

    var cards = grid.querySelectorAll("[data-kul-slug]");
    if (cards.length === 0) return;

    gsap.fromTo(
      cards,
      {
        opacity: 0,
        y: 30,
        scale: 0.95,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.08,
        ease: "back.out(1.5)",
        // Mirror wisata: hapus inline transform setelah tween agar hover
        // lift (.hover:-translate-y-2) tidak diblokir inline style GSAP.
        clearProps: "transform",
        scrollTrigger: {
          trigger: grid,
          start: "top 75%",
          toggleActions: "play none none none",
        },
      }
    );
  }

  // ── SECTION 2b: JUDUL & DESKRIPSI SETIAP SECTION (mirror wisata) ─
  function animateSectionHeadings() {
    var headings = Array.prototype.slice.call(
      document.querySelectorAll("main section h2")
    );
    headings = headings.filter(function (h) {
      return !h.closest(".reco-heading");
    });

    headings.forEach(function (h) {
      gsap.fromTo(
        h,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: h,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      var parent = h.parentElement;
      var desc = parent ? parent.querySelector("p") : null;
      if (desc) {
        gsap.fromTo(
          desc,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            delay: 0.12,
            ease: "power2.out",
            scrollTrigger: {
              trigger: h,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          }
        );
      }
    });
  }

  // ── SECTION 3: RECOMMENDATION CAROUSEL ANIMATION ─────────────
  // Kuliner kini memakai coverflow (mirror wisata). Animasi diselaraskan
  // dengan wisata-gsap-animations: section .reco-section-bg, heading,
  // container coverflow, dan dots.
  function animateRecommendationSection() {
    var recoSection = document.querySelector(".reco-section-bg");
    if (!recoSection) return;

    gsap.fromTo(
      recoSection,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 1,
        ease: "power1.out",
        scrollTrigger: {
          trigger: recoSection,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      }
    );

    var heading = recoSection.querySelector(".reco-heading");
    if (heading) {
      gsap.fromTo(
        heading,
        { opacity: 0, y: -30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: recoSection,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    }

    var coverflow = recoSection.querySelector(".coverflow-container");
    if (coverflow) {
      gsap.fromTo(
        coverflow,
        { opacity: 0, scale: 0.98 },
        {
          opacity: 1,
          scale: 1,
          duration: 1,
          delay: 0.2,
          ease: "back.out(1.5)",
          scrollTrigger: {
            trigger: recoSection,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    }

    var dots = document.getElementById("reco-dots");
    if (dots) {
      gsap.fromTo(
        dots.querySelectorAll("span"),
        { opacity: 0, scale: 0 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "back.out(2)",
          scrollTrigger: {
            trigger: recoSection,
            start: "top 70%",
            toggleActions: "play none none none",
          },
        }
      );
    }
  }

  // ── OBSERVER UNTUK ANIMASI DINAMIS ────────────────────────────
  // Animate new cards saat di-render (pagination/filter).
  function observeNewCards() {
    var grid = document.getElementById("kul-grid");
    if (!grid || typeof MutationObserver === "undefined") return;

    var observer = new MutationObserver(function () {
      var newCards = grid.querySelectorAll("[data-kul-id]:not([data-animated])");
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
            newCards.forEach(function (card) {
              card.setAttribute("data-animated", "true");
            });
          },
        }
      );
    });

    observer.observe(grid, {
      childList: true,
      subtree: false,
    });
  }

  // ── INIT ───────────────────────────────────────────────────────
  function init() {
    if (typeof gsap.registerPlugin === "function" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    animateMapSection();
    animateDestinationList();
    animateRecommendationSection();
    animateSectionHeadings();
    observeNewCards();

    if (window.console) console.info("[kuliner-gsap] Animations initialized");
  }

  // Script ini di-load dengan `defer`, sehingga saat dieksekusi readyState
  // masih "interactive" dan DOMContentLoaded BELUM fired. Daftarkan listener
  // agar berjalan SETELAH handler DOMContentLoaded milik kuliner-listing.js
  // (yang men-render grid & tab filter).
  if (document.readyState === "complete") {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
