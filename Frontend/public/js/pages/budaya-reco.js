/**
 * budaya-reco.js — Coverflow Rekomendasi Budaya
 * =================================================================
 * Mesin 3D/shell IDENTIK dengan coverflow kuliner (kuliner.html inline,
 * yang sendiri diadaptasi dari wisata.html). Perbedaan hanya sumber data
 * dan target detail:
 *   - kartu dibangun dari data REAL window.PASINFO_BUDAYA.cultures
 *     (tanpa rating & kategori — Owner 2026-10-16: judul + deskripsi saja);
 *   - target detail = detail_budaya.html?slug=<culture slug>.
 * Tanpa library animasi.
 */
(function () {
  "use strict";

  var IMG_BASE = "../../public/assets/images/budaya/optimized/";
  var BUD_COVER_PHOTOS = [
    IMG_BASE + "Tari Terbang Bandung & Tari Pasuruan Kondang.webp",
    IMG_BASE + "Tradisi-Skilot.webp",
    IMG_BASE + "Yadnya Karo Sodoran (Tosari).webp",
  ];

  // Foto fallback bergilir (hash id) — sama dengan budaya-listing.js agar
  // gambar satu budaya konsisten antar section; versi ini memakai foto
  // ukuran penuh (bukan thumbnail) untuk kartu coverflow.
  function budCoverPhoto(d) {
    if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
    var key = d && d.id != null ? String(d.id) : "";
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return BUD_COVER_PHOTOS[sum % BUD_COVER_PHOTOS.length];
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function init() {
    var track = document.getElementById("reco-row");
    if (!track) return;

    var prevBtn = document.querySelector("[data-reco-prev]");
    var nextBtn = document.querySelector("[data-reco-next]");
    var dotsContainer = document.getElementById("reco-dots");
    var section = document.querySelector(".reco-section-bg");

    /* 5 SHELL POSISI TETAP (3D) — geometri tidak pernah berubah.
       Shell 0/4 = Luar, 1/3 = Dalam, 2 = Tengah (selalu di depan). */
    var shells = Array.prototype.filter.call(track.children, function (el) {
      return el.classList.contains("coverflow-card");
    });
    if (shells.length < 5) return;

    var CENTER = 2;
    var OFFSET = [-2, -1, 0, 1, 2];

    /* Sumber data: budaya REAL (featured lebih diutamakan). */
    var cultures =
      (window.PASINFO_BUDAYA && window.PASINFO_BUDAYA.cultures) || [];
    var pool = cultures.filter(function (c) {
      return c && c.name;
    });
    if (pool.length === 0) return;
    var featured = pool.filter(function (c) {
      return c.featured;
    });
    var source = featured.length ? featured : pool;

    /* Bangun tepat 5 kartu (siklus bila jumlah budaya unggulan < 5). */
    var TOTAL = 5;
    var order = [];
    for (var i = 0; i < TOTAL; i++) {
      var d = source[i % source.length];
      var img = budCoverPhoto(d);
      var card = document.createElement("div");
      card.className = "reco-card";
      card.setAttribute("data-slug", d.slug || "");
      card.setAttribute("data-name", d.name || "");
      card.setAttribute("data-img", img);
      card.innerHTML =
        '<div class="reco-card__img" style="background-image: url(&quot;' +
        esc(img) +
        '&quot;);"></div>' +
        '<div class="reco-card__grad"></div>' +
        '<div class="reco-card__tint"></div>' +
        '<div class="reco-card__body">' +
        '<p class="reco-card__name text-xs font-bold leading-snug mb-1 text-white">' +
        esc(d.name) +
        "</p>" +
        '<p class="reco-card__desc text-[11px] text-gray-100 line-clamp-2 leading-relaxed">' +
        esc(d.short_description || "") +
        "</p>" +
        "</div>";
      order.push(card);
    }
    var total = order.length;

    var reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var currentIndex = 0;
    var renderToken = 0;
    var lastSwipeAt = 0;

    var cardForShell = function (i) {
      return order[(currentIndex + OFFSET[i] + total) % total];
    };
    var centerCard = function () {
      return cardForShell(CENTER);
    };

    function place() {
      shells.forEach(function (shell, i) {
        var card = cardForShell(i);
        if (card.parentNode !== shell) shell.appendChild(card);
      });
    }

    function syncCenterMeta() {
      var shell = shells[CENTER];
      var card = centerCard();
      shell.setAttribute("role", "link");
      shell.setAttribute("tabindex", "0");
      shell.setAttribute(
        "aria-label",
        "Lihat detail " + (card.getAttribute("data-name") || ""),
      );
      shell.setAttribute("data-dest-slug", card.getAttribute("data-slug"));
    }

    function applySectionBg() {
      if (!section) return;
      var img = centerCard().getAttribute("data-img");
      if (!img) return;
      section.style.backgroundImage =
        'linear-gradient(to bottom, rgba(15, 23, 42, 0.38) 0%, rgba(15, 23, 42, 0) 34%, rgba(15, 23, 42, 0) 56%, rgba(15, 23, 42, 0.92) 100%), url("' +
        img +
        '")';
    }

    function updateDots() {
      if (!dotsContainer) return;
      Array.prototype.forEach.call(dotsContainer.children, function (dot, idx) {
        var active = idx === currentIndex;
        dot.className = active
          ? "w-6 h-2 rounded-full bg-white shadow-sm transition-all duration-300"
          : "w-2 h-2 rounded-full bg-white/40 cursor-pointer transition-all duration-300";
        if (active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }

    function clearAnim(card) {
      if (card.__recoAnim) {
        try {
          card.__recoAnim.cancel();
        } catch (e) {
          /* abaikan */
        }
        card.__recoAnim = null;
      }
      card.style.transform = "";
      card.style.opacity = "";
    }

    function renderInstant() {
      order.forEach(clearAnim);
      place();
      syncCenterMeta();
      applySectionBg();
      updateDots();
    }

    function renderAnimated() {
      var myToken = ++renderToken;
      updateDots();

      order.forEach(clearAnim);
      var first = new Map();
      order.forEach(function (c) {
        first.set(c, c.getBoundingClientRect());
      });

      place();

      syncCenterMeta();
      applySectionBg();

      if (!(window.Element && Element.prototype.animate)) return;

      order.forEach(function (card) {
        var f = first.get(card);
        var l = card.getBoundingClientRect();
        var dx = f.left - l.left;
        var dy = f.top - l.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

        var wrapped = Math.abs(dx) > card.offsetWidth * 1.5;
        var frames = wrapped
          ? [
              {
                transform: "translate(" + dx + "px," + dy + "px)",
                opacity: 1,
              },
              {
                transform: "translate(" + dx * 0.45 + "px," + dy * 0.45 + "px)",
                opacity: 0,
                offset: 0.5,
              },
              { transform: "translate(0px,0px)", opacity: 1 },
            ]
          : [
              { transform: "translate(" + dx + "px," + dy + "px)" },
              { transform: "translate(0px,0px)" },
            ];

        var anim = card.animate(frames, {
          duration: 420,
          easing: "cubic-bezier(0.25, 0.8, 0.35, 1)",
          fill: "both",
        });
        card.__recoAnim = anim;
        anim.onfinish = function () {
          if (myToken !== renderToken) return;
          clearAnim(card);
        };
      });
    }

    function render() {
      if (reduced) renderInstant();
      else renderAnimated();
    }

    function goDetail(slug) {
      if (!slug) return;
      var url = "detail_budaya.html?slug=" + slug;
      if (window.PasInfoPageTransition)
        window.PasInfoPageTransition.go(url);
      else window.location.href = url;
    }

    shells.forEach(function (shell, shellIndex) {
      shell.addEventListener("click", function () {
        if (Date.now() - lastSwipeAt < 350) return;
        if (shellIndex === CENTER) {
          goDetail(shell.getAttribute("data-dest-slug"));
          return;
        }
        currentIndex = (currentIndex + OFFSET[shellIndex] + total) % total;
        render();
      });
      shell.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        if (shellIndex === CENTER) {
          goDetail(shell.getAttribute("data-dest-slug"));
        } else {
          currentIndex = (currentIndex + OFFSET[shellIndex] + total) % total;
          render();
        }
      });
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        currentIndex = (currentIndex - 1 + total) % total;
        render();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        currentIndex = (currentIndex + 1) % total;
        render();
      });
    }

    if (dotsContainer) {
      Array.prototype.forEach.call(dotsContainer.children, function (dot, idx) {
        dot.setAttribute("role", "button");
        dot.setAttribute("tabindex", "0");
        dot.setAttribute("aria-label", "Buka rekomendasi " + (idx + 1));
        var goDot = function () {
          if (idx === currentIndex) return;
          currentIndex = idx;
          render();
        };
        dot.addEventListener("click", goDot);
        dot.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goDot();
          }
        });
      });
    }

    // Swipe / Drag (touch + mouse)
    var startX = 0;
    var isDragging = false;

    function handleSwipe(start, end) {
      var diff = start - end;
      if (Math.abs(diff) > 40) {
        lastSwipeAt = Date.now();
        currentIndex = (currentIndex + (diff > 0 ? 1 : -1) + total) % total;
        render();
      }
    }

    track.addEventListener(
      "touchstart",
      function (e) {
        startX = e.touches[0].clientX;
        isDragging = true;
      },
      { passive: true },
    );

    track.addEventListener(
      "touchend",
      function (e) {
        if (!isDragging) return;
        isDragging = false;
        handleSwipe(startX, e.changedTouches[0].clientX);
      },
      { passive: true },
    );

    track.addEventListener("mousedown", function (e) {
      startX = e.clientX;
      isDragging = true;
    });

    track.addEventListener("mouseup", function (e) {
      if (!isDragging) return;
      isDragging = false;
      handleSwipe(startX, e.clientX);
    });

    renderInstant();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
