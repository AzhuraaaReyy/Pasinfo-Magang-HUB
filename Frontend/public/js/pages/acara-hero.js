/**
 * acara-hero.js — Hero "Shared Element Expansion" acara.
 * ============================================================================
 * Paritas mekanik penuh dengan wisata-hero.js / kuliner-hero.js /
 * budaya-hero.js (Owner 2026-10-15: konsep hero Acara disamakan; berbeda
 * hanya data + foto). Mekanisme, timing, dan struktur IDENTIK dengan
 * kuliner-hero.js (sama-sama 4 slide). Yang BERBEDA hanya:
 *   - IMG_BASE & slidesData (Acara: 4 slide; aset = 3 foto, satu dipakai
 *     ulang — foto sementara, ganti foto asli menyusul dari Owner).
 *   - Aksen HIJAU (Owner 2026-10-15): badge kartu `.evt-badge-text`
 *     + ring fokus `.evt-focus-ring` (raw CSS scoped di acara.html agar
 *     tanpa rebuild styles.css; Tailwind belum membangkitkan
 *     text-green-300/ring-green-400) + stroke lokasi #16a34a.
 *   - Tag console "[acara-hero]".
 * Strip LOOP node (render sekali, rotasi node); LIFT 240ms → HOLD 90ms →
 * EXPAND 400ms; paralel bg + rantai kartu di 50% expand; autoplay 5 detik.
 */
(function () {
  "use strict";

  var IMG_BASE = "../../public/assets/images/acara/";

  var slidesData = [
    {
      badge: "Acara",
      location: "Pasuruan Raya",
      title: "Eksplorasi Acara<br /> Pasuruan",
      description:
        "Temukan agenda acara Pasuruan. Dari festival hingga pameran — semua informasi event terpusat di sini.",
      bg: "from-violet-900 via-stone-800 to-slate-900",
      img: "optimized/bromo-marathon.webp",
      thumb: "optimized/bromo-marathon.thumb.webp",
      label: "Suasana acara Pasuruan (foto sementara)",
    },
    {
      badge: "Festival",
      location: "Pasuruan Raya",
      title: "Festival &<br /> Panggung Komunitas",
      description:
        "Panggung seni dan festival komunitas sebagai ruang temu warga Pasuruan.",
      bg: "from-stone-800 via-violet-900 to-slate-900",
      img: "optimized/Pekan-Raya-Pasuruan-(PRP).webp",
      thumb: "optimized/Pekan-Raya-Pasuruan-(PRP).thumb.webp",
      label: "Panggung festival (foto sementara)",
    },
    {
      badge: "Tradisi",
      location: "Pasuruan Raya",
      title: "Tradisi &<br /> Kirab Warga",
      description:
        "Arak-arakan dan ritual warga yang diwariskan lintas generasi.",
      bg: "from-amber-900 via-stone-800 to-slate-900",
      img: "optimized/Hari-Jadi-Kota-Pasuruan.webp",
      thumb: "optimized/Hari-Jadi-Kota-Pasuruan.thumb.webp",
      label: "Kirab tradisi (foto sementara)",
    },
    {
      badge: "Museum",
      location: "Pasuruan Raya",
      title: "Pameran &<br /> Koleksi Museum",
      description:
        "Pameran koleksi dan lokakarya kurasi untuk pengunjung segala usia.",
      bg: "from-emerald-900 via-stone-800 to-slate-900",
      img: "optimized/bromo-marathon.webp",
      thumb: "optimized/bromo-marathon.thumb.webp",
      label: "Galeri pameran (foto sementara)",
    },
  ];

  var currentIndex = 0;
  var isAnimating = false;
  var autoSlideTimer = null;
  var activeBgLayer = 1;
  var AUTOPLAY_INTERVAL = 5000;
  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var heroSection = document.getElementById("hero-section");
  var bgContainer = document.getElementById("bg-container");
  var badgeWrapper = document.getElementById("badge-wrapper");
  var badgeText = document.getElementById("badge-text");
  var heroLocation = document.getElementById("hero-location");
  var heroTitle = document.getElementById("hero-title");
  var heroDesc = document.getElementById("hero-desc");
  var cardsContainer = document.getElementById("cards-container");
  var contentContainer = document.getElementById("content-container");
  var heroTextEls = [badgeWrapper, heroTitle, heroDesc];

  function imgUrl(file) { return IMG_BASE + file; }

  function plainTitle(html) {
    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || "";
  }

  function applySlideText(index) {
    var data = slidesData[index];
    badgeText.textContent = data.badge;
    heroLocation.textContent = data.location;
    heroTitle.innerHTML = data.title;
    heroDesc.textContent = data.description;
  }

  function textIn() {
    heroTextEls.forEach(function (el, i) {
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      el.style.transitionDelay = prefersReducedMotion ? "0s" : i * 0.1 + "s";
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    window.setTimeout(function () {
      heroTextEls.forEach(function (el) { el.style.transitionDelay = "0s"; });
    }, 900);
  }

  // Strip loop seamless: SEMUA slide ter-render SEKALI (urutan stabil, termasuk
  // yang aktif). Rotasi hanya memindahkan node existing + reset transform.
  function renderStripOnce() {
    cardsContainer.innerHTML = "";
    cardsContainer.classList.remove("space-x-4");
    cardsContainer.classList.remove("overflow-x-auto");
    cardsContainer.classList.remove("max-w-full");
    ["gap-4", "overflow-hidden", "max-w-[424px]", "sm:max-w-[472px]", "md:max-w-[696px]", "lg:max-w-[520px]"].forEach(function (c) {
      if ((" " + cardsContainer.className + " ").indexOf(" " + c + " ") === -1) {
        cardsContainer.className += " " + c;
      }
    });
    slidesData.forEach(function (data, slideIndex) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "card-item flex-shrink-0 w-32 h-44 sm:w-36 sm:h-48 md:w-40 md:h-56 rounded-2xl overflow-hidden relative cursor-pointer shadow-xl border border-white/20 group text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl focus:outline-none focus-visible:ring-2 evt-focus-ring";
      card.setAttribute("aria-label", "Tampilkan " + data.badge + ": " + plainTitle(data.title));

      var bgHtml = data.img
        ? '<img src="' + imgUrl(data.thumb || data.img) + '" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 pointer-events-none" aria-hidden="true" loading="lazy" />'
        : '<div class="absolute inset-0 bg-gradient-to-b ' + data.bg + ' pointer-events-none" aria-hidden="true"></div>';

      card.innerHTML = bgHtml +
        '<div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-3 flex flex-col justify-end pointer-events-none">' +
        '<span class="text-[10px] evt-badge-text font-bold uppercase tracking-wider line-clamp-1">' + data.badge + '</span>' +
        '<span class="text-xs sm:text-sm font-bold text-white uppercase line-clamp-1">' + plainTitle(data.title) + '</span>' +
        '</div>';

      (function (idx) {
        card.addEventListener("click", function () {
          triggerCardOpening(idx);
        });
      })(slideIndex);

      card._slideIndex = slideIndex;
      cardsContainer.appendChild(card);
    });
    rotateCommit((currentIndex + 1) % slidesData.length);
    moveRing(currentIndex);
  }

  function moveRing(index) {
    Array.prototype.forEach.call(cardsContainer.children, function (n) {
      var on = n._slideIndex === index;
      if (on) {
        n.classList.add("ring-2", "ring-white/90");
        n.setAttribute("aria-current", "true");
      } else {
        n.classList.remove("ring-2", "ring-white/90");
        n.removeAttribute("aria-current");
      }
    });
  }

  function slotStep() {
    var first = cardsContainer.firstElementChild;
    return first ? first.offsetWidth + 16 : 144;
  }

  function rotateCommit(k) {
    for (var r = 0; r < k; r++) {
      cardsContainer.appendChild(cardsContainer.firstElementChild);
    }
  }

  function nodeForSlide(index) {
    var found = null;
    Array.prototype.forEach.call(cardsContainer.children, function (n) {
      if (n._slideIndex === index) found = n;
    });
    return found;
  }

  function setActiveBg(layerNum, slide) {
    var el = document.getElementById("bg-layer-" + layerNum);
    el.className = "absolute inset-0 bg-gradient-to-b " + slide.bg + " transition-opacity duration-700";
    if (slide.img) {
      el.style.backgroundImage = 'url("' + imgUrl(slide.img) + '")';
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    } else {
      el.style.backgroundImage = "";
    }
    el.setAttribute("aria-label", slide.label);
  }

  function triggerCardOpening(targetIndex, clickedCard) {
    if (isAnimating) return;
    var totalRot = slidesData.length;
    var rotK = (targetIndex - currentIndex + totalRot) % totalRot;
    if (rotK === 0) return;
    isAnimating = true;
    stopAutoplay();

    var targetData = slidesData[targetIndex];
    var nextBgLayerNum = activeBgLayer === 1 ? 2 : 1;
    var currentBgEl = document.getElementById("bg-layer-" + activeBgLayer);
    var nextBgEl = document.getElementById("bg-layer-" + nextBgLayerNum);

    setActiveBg(nextBgLayerNum, targetData);
    nextBgEl.style.opacity = "0";

    if (prefersReducedMotion) {
      currentBgEl.style.opacity = "0";
      nextBgEl.style.opacity = "1";
      activeBgLayer = nextBgLayerNum;
      rotateCommit(rotK);
      currentIndex = targetIndex;
      preloadImageAt((currentIndex + 1) % slidesData.length);
      moveRing(targetIndex);
      applySlideText(targetIndex);
      isAnimating = false;
      startAutoplay();
      return;
    }

    var heroRect = heroSection.getBoundingClientRect();
    var node = clickedCard || nodeForSlide(targetIndex);
    if (!node) { isAnimating = false; startAutoplay(); return; }
    var rect = node.getBoundingClientRect();
    var relativeTop = rect.top - heroRect.top;
    var relativeLeft = rect.left - heroRect.left;

    var host = (contentContainer && contentContainer.parentElement) || bgContainer;
    var hostRect = host.getBoundingClientRect();
    var clone = document.createElement("div");
    clone.className = "absolute z-[5] overflow-hidden rounded-2xl bg-cover bg-center pointer-events-none " + targetData.bg;
    if (targetData.img) {
      clone.style.backgroundImage = 'url("' + imgUrl(targetData.img) + '")';
    }
    clone.style.top = (heroRect.top - hostRect.top) + "px";
    clone.style.left = (heroRect.left - hostRect.left) + "px";
    clone.style.width = heroRect.width + "px";
    clone.style.height = heroRect.height + "px";
    clone.style.transformOrigin = "0 0";
    clone.style.opacity = "0";
    var cloneVeil = document.createElement("div");
    cloneVeil.className = "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 pointer-events-none";
    clone.appendChild(cloneVeil);
    host.appendChild(clone);
    clone.style.willChange = "transform";
    var scaleX0 = rect.width / heroRect.width;
    var scaleY0 = rect.height / heroRect.height;
    var LIFT_DIST = -14;
    var LIFT_MS = 240;
    var HOLD_MS = 90;
    var LIFT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
    var EXPAND_MS = 400;
    var PARALLEL_AT = 0.5;
    var fromX = relativeLeft;
    var fromY = relativeTop + LIFT_DIST;

    var step = slotStep();
    cardsContainer.style.willChange = "transform";

    var origin = node;
    origin.style.transition = "transform " + (LIFT_MS / 1000) + "s " + LIFT_EASE + ", opacity 0.2s ease";
    origin.style.transform = "translateY(" + LIFT_DIST + "px)";

    var lift = clone.animate([
      { transform: "translateY(0px)" },
      { transform: "translateY(" + LIFT_DIST + "px)" }
    ], { duration: LIFT_MS, easing: LIFT_EASE, fill: "forwards" });

    var expandStarted = false;
    function startExpand() {
      if (expandStarted) return;
      expandStarted = true;

      clone.style.opacity = "1";
      origin.style.opacity = "0";

      var expand = clone.animate([
        {
          transform: "translate(" + fromX + "px, " + fromY + "px) scale(" + scaleX0 + ", " + scaleY0 + ")",
          borderRadius: "16px"
        },
        {
          transform: "translate(0px, 0px) scale(1, 1)",
          borderRadius: "0px"
        }
      ], { duration: EXPAND_MS, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "both" });

      cardsContainer.style.willChange = "transform";
      var CHAIN_LEAD = 80;
      var CHAIN_STEP = 260;
      var CHAIN_STAGGER = 70;
      var CHAIN_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
      var stepsDone = 0;
      function chainNext() {
        if (stepsDone >= rotK) { finishChain(); return; }
        var isFirstStep = stepsDone === 0;
        stepsDone++;
        var lead = isFirstStep ? CHAIN_LEAD : 0;
        var nodes = Array.prototype.slice.call(cardsContainer.children);
        var anims = nodes.map(function (n, i) {
          return n.animate(
            [
              { transform: "translateX(0px)" },
              { transform: "translateX(-" + step + "px)" }
            ],
            { duration: CHAIN_STEP, delay: lead + i * CHAIN_STAGGER, easing: CHAIN_EASE, fill: "forwards" }
          );
        });
        var stepped = false;
        function commitStep() {
          if (stepped) return;
          stepped = true;
          anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
          rotateCommit(1);
          chainNext();
        }
        var remaining = anims.length;
        function oneDone() { if (--remaining <= 0) commitStep(); }
        anims.forEach(function (a) {
          if (a && a.finished && a.finished.then) a.finished.then(oneDone, oneDone);
          else oneDone();
        });
        window.setTimeout(commitStep, lead + nodes.length * CHAIN_STAGGER + CHAIN_STEP + 40);
      }
      function finishChain() {
        cardsContainer.style.willChange = "";
        origin.style.opacity = "1";
        origin.style.transform = "";
        origin.style.transition = "";
        moveRing(targetIndex);
        currentIndex = targetIndex;
        preloadImageAt((currentIndex + 1) % slidesData.length);
        isAnimating = false;
        startAutoplay();
      }

      var parallelStarted = false;
      function startParallel() {
        if (parallelStarted) return;
        parallelStarted = true;
        nextBgEl.style.opacity = "1";
        currentBgEl.style.opacity = "0";
        activeBgLayer = nextBgLayerNum;
        chainNext();
      }
      window.setTimeout(startParallel, Math.round(EXPAND_MS * PARALLEL_AT));

      var expandDone = false;
      function onExpandDone() {
        if (expandDone) return;
        expandDone = true;
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            clone.remove();
            applySlideText(targetIndex);
            heroTextEls.forEach(function (el) {
              el.style.transition = "none";
              el.style.transform = "translateY(-24px)";
              el.style.opacity = "0";
            });
            window.setTimeout(function () {
              textIn();
            }, 20);
          });
        });
      }
      expand.onfinish = onExpandDone;
      window.setTimeout(onExpandDone, EXPAND_MS + 120);
    }

    lift.onfinish = function () {
      window.setTimeout(startExpand, HOLD_MS);
    };
    window.setTimeout(startExpand, LIFT_MS + HOLD_MS + 120);
  }

  function startAutoplay() {
    stopAutoplay();
    if (prefersReducedMotion) return;
    autoSlideTimer = setInterval(function () {
      if (isAnimating) return;
      if (document.hidden) return;
      var firstCard = cardsContainer.querySelector(".card-item");
      if (firstCard) {
        var nextIndex = (currentIndex + 1) % slidesData.length;
        triggerCardOpening(nextIndex, firstCard);
      }
    }, AUTOPLAY_INTERVAL);
  }

  function stopAutoplay() {
    if (autoSlideTimer) clearInterval(autoSlideTimer);
    autoSlideTimer = null;
  }

  function preloadImageAt(index) {
    var s = slidesData[index];
    if (!s || !s.img) return;
    var im = new Image();
    im.src = imgUrl(s.img);
    if (im.decode) {
      try {
        im.decode().catch(function () {});
      } catch (e) {}
    }
  }

  function preloadImages() {
    preloadImageAt(currentIndex);
    preloadImageAt((currentIndex + 1) % slidesData.length);
  }

  function init() {
    if (cardsContainer && cardsContainer.parentElement) {
      cardsContainer.parentElement.style.position = "relative";
    }
    applySlideText(currentIndex);
    setActiveBg(1, slidesData[currentIndex]);
    document.getElementById("bg-layer-1").style.opacity = "1";
    document.getElementById("bg-layer-2").style.opacity = "0";

    renderStripOnce();
    preloadImages();
    if (window.console && window.console.info) {
      window.console.info("[acara-hero] gen-b parity wisata/kuliner/budaya, 4-slide");
    }
    document.getElementById("bg-layer-1").style.transition = "opacity 0.1s ease";
    document.getElementById("bg-layer-2").style.transition = "opacity 0.1s ease";

    if (!prefersReducedMotion) {
      heroTextEls.forEach(function (el) {
        el.style.opacity = "0";
        el.style.transform = "translateY(30px)";
      });
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          textIn();
        });
      });
    }

    startAutoplay();

    if (heroSection) {
      heroSection.addEventListener("mouseenter", stopAutoplay);
      heroSection.addEventListener("mouseleave", startAutoplay);
      heroSection.addEventListener("touchstart", stopAutoplay, { passive: true });
      heroSection.addEventListener("touchend", startAutoplay, { passive: true });
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
