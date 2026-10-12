/**
 * acara-hero.js — dipindah VERBATIM dari inline <script> acara.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // ── Hero carousel acara (MOCK visual: gradient placeholder) ──
      const acaraSlides = [
        {
          badge: "Acara",
          location: "Pasuruan Raya",
          title:
            "Eksplorasi Acara<br /> Pasuruan",
          description:
            "Temukan agenda acara Pasuruan. Dari festival hingga pameran — semua informasi event terpusat di sini.",
          bg: "from-violet-900 via-stone-800 to-slate-900",
          label: "Suasana acara Pasuruan (placeholder)",
        },
        {
          badge: "Festival",
          location: "Pasuruan Raya",
          title: "Festival &<br /> Panggung Komunitas",
          description:
            "Panggung seni dan festival komunitas sebagai ruang temu warga Pasuruan.",
          bg: "from-stone-800 via-violet-900 to-slate-900",
          label: "Panggung festival (placeholder)",
        },
        {
          badge: "Tradisi",
          location: "Pasuruan Raya",
          title: "Tradisi &<br /> Kirab Warga",
          description:
            "Arak-arakan dan ritual warga yang diwariskan lintas generasi.",
          bg: "from-amber-900 via-stone-800 to-slate-900",
          label: "Kirab tradisi (placeholder)",
        },
        {
          badge: "Museum",
          location: "Pasuruan Raya",
          title: "Pameran &<br /> Koleksi Museum",
          description:
            "Pameran koleksi dan lokakarya kurasi untuk pengunjung segala usia.",
          bg: "from-emerald-900 via-stone-800 to-slate-900",
          label: "Galeri pameran (placeholder)",
        },
      ];

      let evtCurrentIndex = 0;
      let evtIsAnimating = false;
      let evtAutoSlideTimer = null;
      let evtActiveBgLayer = 1;
      const EVT_AUTOPLAY_INTERVAL = 6000;
      const evtPrefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const evtHeroSection = document.getElementById("hero-section");
      const evtBadgeWrapper = document.getElementById("badge-wrapper");
      const evtBadgeText = document.getElementById("badge-text");
      const evtHeroLocation = document.getElementById("hero-location");
      const evtHeroTitle = document.getElementById("hero-title");
      const evtHeroDesc = document.getElementById("hero-desc");
      const evtCardsContainer = document.getElementById("cards-container");
      const evtHeroTextEls = [evtBadgeWrapper, evtHeroTitle, evtHeroDesc];

      function evtBgClass(slide) {
        return "absolute inset-0 bg-gradient-to-b " + slide.bg;
      }

      function evtApplySlideText(index) {
        const data = acaraSlides[index];
        evtBadgeText.textContent = data.badge;
        evtHeroLocation.textContent = data.location;
        evtHeroTitle.innerHTML = data.title;
        evtHeroDesc.textContent = data.description;
      }

      function evtTextIn() {
        evtHeroTextEls.forEach((el, i) => {
          el.style.transition = "opacity 0.75s ease, transform 0.75s ease";
          el.style.transitionDelay = evtPrefersReducedMotion ? "0s" : i * 0.1 + "s";
          el.style.opacity = "1";
          el.style.transform = "none";
        });
        window.setTimeout(() => {
          evtHeroTextEls.forEach((el) => {
            el.style.transitionDelay = "0s";
          });
        }, 1200);
      }

      function evtTextOut(done) {
        if (evtPrefersReducedMotion) {
          done();
          return;
        }
        evtHeroTextEls.forEach((el) => {
          el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
          el.style.transitionDelay = "0s";
          el.style.opacity = "0";
          el.style.transform = "translateY(-20px)";
        });
        window.setTimeout(done, 320);
      }

      function evtPlainTitle(html) {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        return tmp.textContent || "";
      }

      function evtRenderCardsQueue() {
        evtCardsContainer.innerHTML = "";
        const total = acaraSlides.length;

        for (let i = 1; i <= 3; i++) {
          const slideIndex = (evtCurrentIndex + i) % total;
          const data = acaraSlides[slideIndex];

          const card = document.createElement("button");
          card.type = "button";
          card.className =
            "card-item flex-shrink-0 w-32 h-44 sm:w-36 sm:h-48 md:w-40 md:h-56 rounded-2xl overflow-hidden relative cursor-pointer shadow-xl border border-white/20 group text-left transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400";
          card.setAttribute(
            "aria-label",
            "Tampilkan " + data.badge + ": " + evtPlainTitle(data.title),
          );

           card.innerHTML =
             '<div class="w-full h-full bg-gradient-to-b ' +
             data.bg +
             ' pointer-events-none transition-transform duration-500 group-hover:scale-110" aria-hidden="true"></div>' +
             '<div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-3 flex flex-col justify-end pointer-events-none">' +
             '<span class="text-[10px] text-blue-400 font-bold uppercase tracking-wider line-clamp-1">' +
             data.badge +
             "</span>" +
             '<span class="text-xs sm:text-sm font-bold text-white uppercase line-clamp-1">' +
             evtPlainTitle(data.title) +
             "</span>" +
             "</div>";

          card.addEventListener("click", () => {
            if (evtIsAnimating) return;
            evtTriggerCardOpening(slideIndex, card);
          });

          evtCardsContainer.appendChild(card);
        }
      }

      function evtSetActiveBg(layerNum, slide) {
        const el = document.getElementById("bg-layer-" + layerNum);
        el.className = evtBgClass(slide);
        el.setAttribute("aria-label", slide.label);
      }

      function evtTriggerCardOpening(targetIndex, clickedCard) {
        if (evtIsAnimating) return;
        evtIsAnimating = true;

        evtStopAutoplay();

        const targetData = acaraSlides[targetIndex];
        const nextBgLayerNum = evtActiveBgLayer === 1 ? 2 : 1;
        const currentBgEl = document.getElementById(
          "bg-layer-" + evtActiveBgLayer,
        );
        const nextBgEl = document.getElementById("bg-layer-" + nextBgLayerNum);

        evtSetActiveBg(nextBgLayerNum, targetData);
        nextBgEl.style.opacity = "0";

        if (evtPrefersReducedMotion) {
          currentBgEl.style.opacity = "0";
          nextBgEl.style.opacity = "1";
          evtActiveBgLayer = nextBgLayerNum;
          evtCurrentIndex = targetIndex;
          evtApplySlideText(targetIndex);
          evtRenderCardsQueue();
          evtIsAnimating = false;
          evtStartAutoplay();
          return;
        }

        const rect = clickedCard.getBoundingClientRect();
        const heroRect = evtHeroSection.getBoundingClientRect();

        const clone = document.createElement("div");
        clone.className =
          "fixed z-20 overflow-hidden rounded-2xl shadow-2xl pointer-events-none bg-gradient-to-b " +
          targetData.bg;
        clone.style.top = rect.top + "px";
        clone.style.left = rect.left + "px";
        clone.style.width = rect.width + "px";
        clone.style.height = rect.height + "px";
        document.body.appendChild(clone);

        clickedCard.style.opacity = "0";

        const shiftAmount = rect.width + 16;

        evtTextOut(() => {});

        const bloom = clone.animate(
          [
            {
              top: rect.top + "px",
              left: rect.left + "px",
              width: rect.width + "px",
              height: rect.height + "px",
              borderRadius: "16px",
            },
            {
              top: heroRect.top + "px",
              left: heroRect.left + "px",
              width: heroRect.width + "px",
              height: heroRect.height + "px",
              borderRadius: "0px",
            },
          ],
          { duration: 800, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" },
        );

        const shift = evtCardsContainer.animate(
          [{ transform: "translateX(0)" }, { transform: "translateX(-" + shiftAmount + "px)" }],
          { duration: 800, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "forwards" },
        );
        clickedCard.animate(
          [
            { opacity: 1, transform: "scale(1)" },
            { opacity: 0, transform: "scale(0.85)" },
          ],
          { duration: 300, easing: "ease-out", fill: "forwards" },
        );

        bloom.onfinish = () => {
          nextBgEl.style.opacity = "1";
          currentBgEl.style.opacity = "0";
          evtActiveBgLayer = nextBgLayerNum;

          clone.remove();
          shift.cancel();

          evtApplySlideText(targetIndex);
          evtTextIn();

          evtCurrentIndex = targetIndex;
          evtRenderCardsQueue();

          evtIsAnimating = false;
          evtStartAutoplay();
        };
      }

      function evtStartAutoplay() {
        evtStopAutoplay();
        if (evtPrefersReducedMotion) return;
        evtAutoSlideTimer = setInterval(() => {
          if (evtIsAnimating) return;
          const firstCard = evtCardsContainer.querySelector(".card-item");
          const nextIndex = (evtCurrentIndex + 1) % acaraSlides.length;
          if (firstCard) {
            evtTriggerCardOpening(nextIndex, firstCard);
          }
        }, EVT_AUTOPLAY_INTERVAL);
      }

      function evtStopAutoplay() {
        if (evtAutoSlideTimer) clearInterval(evtAutoSlideTimer);
      }

      function evtInitHero() {
        evtApplySlideText(evtCurrentIndex);
        evtSetActiveBg(1, acaraSlides[evtCurrentIndex]);
        document.getElementById("bg-layer-1").style.opacity = "1";
        document.getElementById("bg-layer-2").style.opacity = "0";

        if (evtPrefersReducedMotion) {
          evtRenderCardsQueue();
          return;
        }
        evtHeroTextEls.forEach((el) => {
          el.style.opacity = "0";
          el.style.transform = "translateY(30px)";
        });
        evtRenderCardsQueue();
        evtStartAutoplay();
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            evtTextIn();
          });
        });

        if (evtHeroSection) {
          evtHeroSection.addEventListener("mouseenter", evtStopAutoplay);
          evtHeroSection.addEventListener("mouseleave", evtStartAutoplay);
        }
      }

      document.addEventListener("DOMContentLoaded", evtInitHero);
    
