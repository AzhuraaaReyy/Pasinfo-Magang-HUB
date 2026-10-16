/**
 * wisata-hero.js — Hero "Shared Element Expansion" (kode Owner, iterasi 2026-10-13).
 * ============================================================================
 * Urutan anti-kedip: BG commit + geser kartu dimulai PARALEL saat expand
 * baru ~50% (permintaan Owner: animasi lain tidak menunggu bg selesai
 * memperbesar; strip z-30 di atas klon sehingga aman digeser bersamaan).
 * Crossfade bg (0.1s) selesai jauh sebelum expand berakhir → klon fullscreen
 * dilepas tepat di akhir expand + 2x rAF; tumbuh via transform-only berjangkar
 * tengah kartu — tanpa kesan bergeser; tanpa repaint layout per-frame.
 * Teks LAMA dibiarkan di tempat (tanpa textOut) — kartu yang membesar
 * MENUTUPINYA. Klon di-host di wrapper konten (z-20) sehingga di ATAS teks
 * (z auto) tetapi DI BAWAH strip kartu (wrapper kartu z-30); karena klon di
 * atas overlay hero, overlay gelap hero disalin ke dalam klon agar kecerahan
 * identik saat klon dilepas. Teks BARU tetap fade-in stagger (-24px → 0)
 * SETELAH kartu menutupi.
 * 5 slide data, foto images/wisata/.
 * Strip LOOP 5 node (tampil 3 + 2 terklip); rantai 1-slot × k PARALEL saat
 * expand ~50% (DOMINO per-kartu ~70ms stagger, 260ms/node, jeda-awal 80ms,
 * lalu commit; viewport identik); expanded berakhir terakhir-hidden; ring = aktif.
 * Hover kartu = TERANGKAT (translateY + shadow-2xl, tanpa scale). Kelas hover
 * ini hidup di public/css/styles.css; jika baru ditambah WAJIB `npm run
 * build:css` (Tailwind otomatis memindai seluruh folder public/js).
 * Kartu asal (paling kiri) DULU terangkat (240ms, translateY -14px) → jeda
 * 90ms (hold) → BARU klon memperbesar fullscreen (diserap/crossfade saat
 * expand mulai); dikembalikan ke ujung antrean di finishChain.
 * Timing: LIFT 240ms + HOLD 90ms + EXPAND 400ms; PARALLEL_AT 0.5 = animasi
 * lain (bg + geser kartu) mulai di 50% durasi expand, bukan menunggu selesai.
 * Teks/judul fade-in segera (20ms) setelah klon dilepas di akhir expand.
 */
(function () {
  "use strict";

  var IMG_BASE = "../../public/assets/images/wisata/";

  var slidesData = [
    {
      badge: "Wisata",
      location: "Pasuruan Raya",
      title: "Eksplorasi Wisata<br /> Pasuruan Raya",
      description: "Temukan keindahan alam, budaya, dan kuliner khas Pasuruan. Dari pegunungan Bromo hingga pantai berpasir putih — semua informasi wisata terpercaya ada di sini.",
      bg: "from-orange-900 via-stone-800 to-slate-900",
      img: "optimized/bromo_banner.webp",
      thumb: "optimized/bromo_banner.thumb.webp",
      label: "Panorama pegunungan Bromo",
    },
    {
      badge: "Konservasi",
      location: "Prigen, Pasuruan",
      title: "Taman Safari<br /> Indonesia 2",
      description: "Rasakan pengalaman safari alam terbuka mendatangi habitat berbagai satwa langka dari seluruh belahan dunia.",
      bg: "from-green-900 via-stone-800 to-slate-900",
      img: "optimized/taman_safari_indonesia_2.webp",
      thumb: "optimized/taman_safari_indonesia_2.thumb.webp",
      label: "Kawasan konservasi satwa",
    },
    {
      badge: "Alam",
      location: "Tretes, Pasuruan",
      title: "Sejuknya Air Terjun<br /> Kakek Bodo",
      description: "Hutan wisata alam dengan gemuruh air terjun alami setinggi 47 meter di kawasan pegunungan yang sangat sejuk.",
      bg: "from-cyan-900 via-sky-800 to-slate-900",
      img: "optimized/air-terjun-kakek-bodo.webp",
      thumb: "optimized/air-terjun-kakek-bodo.thumb.webp",
      label: "Air terjun pegunungan",
    },
    {
      badge: "Petualangan",
      location: "Tengger, Pasuruan",
      title: "Pesona Bromo &<br /> Taman Nasional",
      description: "Nikmati kemegahan lautan pasir Bromo dan pemandangan matahari terbit yang memukau langsung dari ketinggian Pasuruan.",
      bg: "from-stone-800 via-orange-900 to-slate-900",
      img: "optimized/bromo2.webp",
      thumb: "optimized/bromo2.thumb.webp",
      label: "Lautan pasir Bromo",
    },
    {
      badge: "WISATA ALAM",
      location: "Tengger, Pasuruan",
      title: "Pesona Keindahan & Lautan Pasir Gunung Bromo",
      description: "Saksikan kemegahan kawah aktif dan bentangan lautan pasir berbisikan angin yang memukau di kawasan pegunungan Tengger, Pasuruan Raya.",
      bg: "from-stone-800 via-orange-900 to-slate-900",
      img: "optimized/bromo3.webp",
      thumb: "optimized/bromo3.thumb.webp",
      label: "Kawah dan lautan pasir Bromo",
    },
  ];

  var currentIndex = 0;
  var isAnimating = false;
  var autoSlideTimer = null;
  var activeBgLayer = 1;
  // Owner 2026-10-14: durasi ganti kartu hero = 5 detik (sebelumnya 6 detik).
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

  // Teks lama TIDAK lagi dikeluarkan (textOut dihapus): kartu yang membesar
  // menutupi teks, lalu teks baru fade-in setelah bg aman.

  // Strip loop seamless: SEMUA slide ter-render SEKALI (urutan stabil, termasuk
  // yang aktif). Rotasi hanya memindahkan node existing + reset transform —
  // tanpa innerHTML ulang, tanpa pop, tanpa fade. Ilusi data banyak dari loop.
  function renderStripOnce() {
    cardsContainer.innerHTML = "";
    // gap-4 (bukan space-x) agar slot seragam; max-w N slot (+padding px-1)
    // + overflow hidden agar slot ke-(N+1) terklip = antrean tak terlihat.
    // 3*128+2*16+8=424 / 3*144+2*16+8=472.
    // Owner 2026-10-14: TABLET (md 768-1023) tampilkan 4 kartu:
    // 4*160+3*16+8=696; lg kembali 3 kartu (3*160+2*16+8=520).
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
      card.className = "card-item flex-shrink-0 w-32 h-44 sm:w-36 sm:h-48 md:w-40 md:h-56 rounded-2xl overflow-hidden relative cursor-pointer shadow-xl border border-white/20 group text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400";
      card.setAttribute("aria-label", "Tampilkan " + data.badge + ": " + plainTitle(data.title));

      var bgHtml = data.img
        ? '<img src="' + imgUrl(data.thumb || data.img) + '" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 pointer-events-none" aria-hidden="true" loading="lazy" />'
        : '<div class="absolute inset-0 bg-gradient-to-b ' + data.bg + ' pointer-events-none" aria-hidden="true"></div>';

      card.innerHTML = bgHtml +
        '<div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-3 flex flex-col justify-end pointer-events-none">' +
        '<span class="text-[10px] text-red-400 font-bold uppercase tracking-wider line-clamp-1">' + data.badge + '</span>' +
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
    // Invarian: aktif TERAKHIR (diclip max-w) agar rotasi siklik tepat.
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

  // Pindahkan k node pertama ke belakang (rotasi loop).
  function rotateCommit(k) {
    for (var r = 0; r < k; r++) {
      cardsContainer.appendChild(cardsContainer.firstElementChild);
    }
  }

  // Cari node thumb berdasarkan slide (wajib: klik hanya kirim 1 argumen,
  // autoplay kirim node lama — keduanya harus valid).
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
    // Langkah rotasi dari posisi sekarang (0 = kartu aktif → abaikan).
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

    // Ambil koordinat relatif terhadap heroSection (node dicari mandiri —
    // klik hanya kirim targetIndex; autoplay kirim node lama, tetap valid).
    var heroRect = heroSection.getBoundingClientRect();
    var node = clickedCard || nodeForSlide(targetIndex);
    if (!node) { isAnimating = false; startAutoplay(); return; }
    var rect = node.getBoundingClientRect();
    var relativeTop = rect.top - heroRect.top;
    var relativeLeft = rect.left - heroRect.left;

    // Klon LANGSUNG seukuran fullscreen; tumbuh via transform-only berjangkar
    // tengah kartu (compositor, tanpa repaint layout; tak ada kesan bergeser).
    // Host = wrapper konten (tempat #content-container, z-20): klon jadi DI ATAS
    // teks lama (z auto) sehingga MENUTUPINYA, tapi DI BAWAH strip kartu
    // (wrapper kartu z-30). Karena klon kini di atas overlay hero, overlay gelap
    // hero disalin ke dalam klon agar kecerahan identik saat klon dilepas.
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
    clone.style.opacity = "0"; // tampil tepat saat expand mulai (anti flash fullscreen)
    var cloneVeil = document.createElement("div");
    cloneVeil.className = "absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30 pointer-events-none";
    clone.appendChild(cloneVeil);
    host.appendChild(clone);
    clone.style.willChange = "transform";
    var scaleX0 = rect.width / heroRect.width;
    var scaleY0 = rect.height / heroRect.height;
    // Fase hero: LIFT dulu (angkat), HOLD (jeda), lalu EXPAND (memperbesar).
    var LIFT_DIST = -14;  // px terangkat (masih dalam ruang clip kartu: overflow-hidden + py-3 = 12px)
    var LIFT_MS = 240;    // durasi fase angkat (dulu 320ms — Owner minta lebih cepat, tetap halus)
    var HOLD_MS = 90;     // jeda (hold) setelah angkat, sebelum memperbesar (dulu 150ms)
    var LIFT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
    var EXPAND_MS = 400;   // durasi memperbesar fullscreen (dulu 500ms) — jangan <380 agar tetap smooth
    var PARALLEL_AT = 0.5; // fraksi EXPAND_MS saat animasi paralel (geser kartu + bg) mulai
    var fromX = relativeLeft;
    var fromY = relativeTop + LIFT_DIST;

    // Strip loop: rotasi k slot (klik/autoplay); commit dimulai PARALEL saat
    // expand ~50% (startParallel), bukan menunggu bg selesai.
    var step = slotStep();
    cardsContainer.style.willChange = "transform";
    // (Commit rotasi + visibilitas dilakukan di startParallel → chainNext.)

    // Kartu asal (paling kiri): DULU terangkat (fase LIFT) → jeda (HOLD) →
    // BARU klon memperbesar (fase EXPAND). Saat expand mulai, kartu asal
    // diserap klon (seukuran & seposisi persis → crossfade tak terlihat), lalu
    // dikembalikan ke ujung antrean di finishChain (looping) agar tampil lagi.
    var origin = node;
    origin.style.transition = "transform " + (LIFT_MS / 1000) + "s " + LIFT_EASE + ", opacity 0.2s ease";
    origin.style.transform = "translateY(" + LIFT_DIST + "px)";

    // Fase 1 — LIFT. Klon ikut naik (masih opacity 0) hanya sebagai pengatur
    // waktu yang sinkron dengan kartu asal; yang terlihat naik = kartu asal.
    var lift = clone.animate([
      { transform: "translateY(0px)" },
      { transform: "translateY(" + LIFT_DIST + "px)" }
    ], { duration: LIFT_MS, easing: LIFT_EASE, fill: "forwards" });

    var expandStarted = false;
    function startExpand() {
      if (expandStarted) return;
      expandStarted = true;

      // Fase 2 — EXPAND. Klon (seukuran/seposisi kartu yang sudah terangkat)
      // menggantikan kartu asal SEKALIGUS, lalu membesar jadi fullscreen.
      clone.style.opacity = "1";
      // Serap kartu asal: klon (seukuran & seposisi persis) menutupinya,
      // jadi fade cepat ini tak terlihat — kartu tampak "ikut membesar".
      origin.style.opacity = "0";

      // Teks lama DIBIARKAN (tidak dikeluarkan) — klon yang membesar menutupinya;
      // teks baru baru dipasang SETELAH expand + bg aman (anti kedip).
      // fill "both": keyframe pertama langsung berlaku → tak ada 1 frame
      // fullscreen bocor sebelum expand dimulai.
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
      // Rantai rotasi 1-slot × k — DIMULAI PARALEL saat expand baru ~50%
      // (permintaan Owner: animasi lain "bersamaan dengan card saat
      // memperbesar", bukan menunggu bg selesai). Strip z-30 DI ATAS klon,
      // jadi aman terlihat digeser sementara klon masih membesar. Tiap
      // langkah menggeser kartu DOMINO (stagger 70ms, 260ms/node, easing
      // melandai) dengan jeda-awal 80ms → commit (node pertama ke belakang,
      // viewport identik). Entrant terklip masuk halus SETELAH tetangganya
      // bergeser; expanded berakhir terakhir-hidden. Tanpa pop.
      var CHAIN_LEAD = 80;     // jeda sebelum pergeseran mulai
      var CHAIN_STEP = 260;    // durasi gerak tiap langkah
      var CHAIN_STAGGER = 70;  // jeda antar-kartu (efek domino)
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
        // Tunggu SEMUA node selesai (delay + duration), lalu commit sekali.
        var remaining = anims.length;
        function oneDone() { if (--remaining <= 0) commitStep(); }
        anims.forEach(function (a) {
          if (a && a.finished && a.finished.then) a.finished.then(oneDone, oneDone);
          else oneDone();
        });
        // Jaring aman bila finished tak tersedia / macet.
        window.setTimeout(commitStep, lead + nodes.length * CHAIN_STAGGER + CHAIN_STEP + 40);
      }
      function finishChain() {
        cardsContainer.style.willChange = "";
        // Kartu asal kini di ujung antrean (terklip, tak terlihat): kembalikan
        // visibilitas + transform agar bisa tampil lagi saat loop berputar.
        origin.style.opacity = "1";
        origin.style.transform = "";
        origin.style.transition = "";
        moveRing(targetIndex);
        currentIndex = targetIndex;
        preloadImageAt((currentIndex + 1) % slidesData.length);
        isAnimating = false;
        startAutoplay();
      }

      // BG + geser kartu berjalan PARALEL saat expand baru ~50% (bukan
      // menunggu bg selesai memperbesar — permintaan Owner). Crossfade bg
      // (0.1s) kelar jauh sebelum expand berakhir → klon aman dilepas tepat
      // di akhir expand tanpa gate 120ms tambahan. Rantai kartu dimulai di
      // sini juga: strip z-30 ada DI ATAS klon, jadi pergeseran terlihat
      // "bersamaan dengan card saat memperbesar".
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
        // 2x rAF bukti ter-paint → hapus klon. BG sudah settle (crossfade
        // paralel), jadi tidak perlu gate 120ms — jeda diperpendek.
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            clone.remove();
            // Teks swap + fade-up stagger langsung di sini (jeda 20ms saja).
            // Fade-in JELAS dari atas ke bawah (-24px → 0) + stagger.
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

    // Fase 1 (LIFT) selesai → HOLD (jeda) → BARU memperbesar.
    lift.onfinish = function () {
      window.setTimeout(startExpand, HOLD_MS);
    };
    // Jaring aman bila lift.onfinish tak tersedia / macet.
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
    // Decode di muka agar frame pertama expand tak stall.
    if (im.decode) {
      try {
        im.decode().catch(function () {});
      } catch (e) {}
    }
  }

  function preloadImages() {
    // Owner 2026-10-15 (perbaikan lag): cukup slide aktif + 1 berikutnya.
    // Sebelumnya SELURUH slide (~13,7 MB) diunduh sekaligus saat load.
    // Slide berikutnya yang lain dipreload bertahap saat slide berganti.
    preloadImageAt(currentIndex);
    preloadImageAt((currentIndex + 1) % slidesData.length);
  }

  function init() {
    // Aktifkan z-30 milik wrapper kartu (class template, static → inert) agar
    // strip kartu tetap DI ATAS klon hero yang kini di-host di wrapper konten.
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
      window.console.info("[wisata-hero] build 20261016-parallel-fast");
    }
    // Layer BG: fade 150ms (klon menutupi selama gate, jadi fade panjang sia-sia).
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
