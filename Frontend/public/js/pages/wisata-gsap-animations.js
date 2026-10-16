/**
 * GSAP Animations untuk Wisata Listing Page (TASK 7 - 2026-10-13)
 * =================================================================
 * Menambahkan efek animasi GSAP ke berbagai section (kecuali hero).
 * Menggunakan GSAP dari CDN via <script> tag terlebih dahulu.
 *
 * Sections yang di-animate:
 * 1. Map Section (.map-section) - fade in + slide up
 * 2. Destination List (.dest-grid) - stagger cards in
 * 3. Testimonial/Recommendation Carousel - fade in elements
 *
 * Nota: Hero section TIDAK di-animate (sesuai instruksi Owner).
 */

(function () {
  "use strict";

  // Cek apakah GSAP sudah loaded
  if (typeof gsap === "undefined") {
    if (window.console) console.warn("[wisata-gsap] GSAP not loaded, skipping animations");
    return;
  }

  var mm = gsap.matchMedia();
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    if (window.console) console.info("[wisata-gsap] Reduced motion detected, skipping animations");
    return;
  }

  // ── SECTION 1: MAP SECTION ANIMATION ──────────────────────────
  function animateMapSection() {
    var mapSection = document.getElementById("map-section");
    if (!mapSection) return;

    gsap.fromTo(
      mapSection,
      {
        opacity: 0,
        y: 40,
      },
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
    var mapContainer = mapSection.querySelector("#wisata-map");
    if (mapContainer) {
      gsap.fromTo(
        mapContainer,
        {
          scale: 0.95,
          opacity: 0,
        },
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

    // Animate detail panel
    var detailPanel = mapSection.querySelector("#dest-detail > div");
    if (detailPanel) {
      gsap.fromTo(
        detailPanel,
        {
          opacity: 0,
          x: 30,
        },
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
    var destGrid = document.getElementById("dest-grid");
    if (!destGrid) return;

    var cards = destGrid.querySelectorAll("[data-dest-slug]");
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
        // Owner 2026-10-14: hapus inline transform setelah tween selesai agar
        // hover lift (.hover:-translate-y-2) tidak diblokir inline style GSAP.
        clearProps: "transform",
        scrollTrigger: {
          trigger: destGrid,
          start: "top 75%",
          toggleActions: "play none none none",
        },
      }
    );
  }

  // ── SECTION 3: RECOMMENDATION CAROUSEL ANIMATION ─────────────
  function animateRecommendationSection() {
    var recoSection = document.querySelector(".reco-section-bg");
    if (!recoSection) return;

    gsap.fromTo(
      recoSection,
      {
        opacity: 0,
      },
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

    // Animate heading
    var heading = recoSection.querySelector(".reco-heading");
    if (heading) {
      gsap.fromTo(
        heading,
        {
          opacity: 0,
          y: -30,
        },
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

    // Animate carousel container (subtle float)
    var coverflow = recoSection.querySelector(".coverflow-container");
    if (coverflow) {
      gsap.fromTo(
        coverflow,
        {
          opacity: 0,
          scale: 0.98,
        },
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

    // Animate dots
    var dots = document.getElementById("reco-dots");
    if (dots) {
      gsap.fromTo(
        dots.querySelectorAll("span"),
        {
          opacity: 0,
          scale: 0,
        },
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

  // ── SECTION 4: JUDUL & DESKRIPSI SETIAP SECTION ───────────────
  // Owner 2026-10-14: animasikan judul (h2) + deskripsi (p) di tiap section
  // halaman daftar wisata. Section Rekomendasi dikecualikan karena sudah
  // dianimasikan di animateRecommendationSection (.reco-heading).
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

  // ── OBSERVER UNTUK ANIMASI DINAMIS ────────────────────────────
  // Animate new cards saat di-render (pagination/filter)
  function observeNewCards() {
    var destGrid = document.getElementById("dest-grid");
    if (!destGrid || typeof MutationObserver === "undefined") return;

    var observer = new MutationObserver(function (mutations) {
      var newCards = destGrid.querySelectorAll("[data-dest-slug]:not([data-animated])");
      if (newCards.length === 0) return;

      gsap.fromTo(
        newCards,
        {
          opacity: 0,
          y: 20,
          scale: 0.95,
        },
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

    observer.observe(destGrid, {
      childList: true,
      subtree: false,
    });
  }

  // ── INIT ───────────────────────────────────────────────────────
  function init() {
    // Pastikan ScrollTrigger plugin sudah registered
    if (typeof gsap.registerPlugin === "function" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }

    animateMapSection();
    animateDestinationList();
    animateRecommendationSection();
    animateSectionHeadings();
    observeNewCards();

    if (window.console) console.info("[wisata-gsap] Animations initialized");
  }

  // Tunggu DOM siap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
