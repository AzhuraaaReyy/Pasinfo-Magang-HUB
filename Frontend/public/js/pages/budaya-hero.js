/**
 * budaya-hero.js — dipindah VERBATIM dari inline <script> budaya.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // ── Hero carousel budaya (MOCK visual: gradient placeholder) ──
      const budayaSlides = [
        {
          badge: "Budaya",
          location: "Pasuruan Raya",
          title:
            "Eksplorasi Budaya<br /> Pasuruan",
          description:
            "Kenali tradisi, kesenian, situs sejarah, dan museum khas Pasuruan dalam satu halaman jelajah budaya.",
          bg: "from-violet-900 via-stone-800 to-slate-900",
          label: "Suasana budaya Pasuruan (placeholder)",
        },
        {
          badge: "Tradisi",
          location: "Pasuruan Raya",
          title: "Tradisi &<br /> Ritual Lokal",
          description:
            "Mengenal ragam tradisi masyarakat yang diwariskan turun-temurun sebagai identitas budaya setempat.",
          bg: "from-stone-800 via-violet-900 to-slate-900",
          label: "Tradisi lokal (placeholder)",
        },
        {
          badge: "Kesenian",
          location: "Pasuruan Raya",
          title: "Kesenian &<br /> Pertunjukan",
          description:
            "Cuplikan ragam kesenian dan pertunjukan panggung sebagai etalase kekayaan ekspresi budaya.",
          bg: "from-emerald-900 via-stone-800 to-slate-900",
          label: "Pertunjukan kesenian (placeholder)",
        },
        {
          badge: "Sejarah",
          location: "Pasuruan Raya",
          title: "Situs &<br /> Museum",
          description:
            "Jelajahi situs bersejarah dan koleksi museum sebagai jendela masa lalu Pasuruan.",
          bg: "from-amber-900 via-stone-800 to-slate-900",
          label: "Situs bersejarah (placeholder)",
        },
      ];

      let budCurrentIndex = 0;
      let budIsAnimating = false;
      let budAutoSlideTimer = null;
      let budActiveBgLayer = 1;
      const BUD_AUTOPLAY_INTERVAL = 6000;
      const budPrefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const budHeroSection = document.getElementById("hero-section");
      const budBadgeWrapper = document.getElementById("badge-wrapper");
      const budBadgeText = document.getElementById("badge-text");
      const budHeroLocation = document.getElementById("hero-location");
      const budHeroTitle = document.getElementById("hero-title");
      const budHeroDesc = document.getElementById("hero-desc");
      const budCardsContainer = document.getElementById("cards-container");
      const budHeroTextEls = [budBadgeWrapper, budHeroTitle, budHeroDesc];

      function budBgClass(slide) {
        return "absolute inset-0 bg-gradient-to-b " + slide.bg;
      }

      function budApplySlideText(index) {
        const data = budayaSlides[index];
        budBadgeText.textContent = data.badge;
        budHeroLocation.textContent = data.location;
        budHeroTitle.innerHTML = data.title;
        budHeroDesc.textContent = data.description;
      }

      function budTextIn() {
        budHeroTextEls.forEach((el, i) => {
          el.style.transition = "opacity 0.75s ease, transform 0.75s ease";
          el.style.transitionDelay = budPrefersReducedMotion ? "0s" : i * 0.1 + "s";
          el.style.opacity = "1";
          el.style.transform = "none";
        });
        window.setTimeout(() => {
          budHeroTextEls.forEach((el) => {
            el.style.transitionDelay = "0s";
          });
        }, 1200);
      }

      function budTextOut(done) {
        if (budPrefersReducedMotion) {
          done();
          return;
        }
        budHeroTextEls.forEach((el) => {
          el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
          el.style.transitionDelay = "0s";
          el.style.opacity = "0";
          el.style.transform = "translateY(-20px)";
        });
        window.setTimeout(done, 320);
      }

      function budPlainTitle(html) {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        return tmp.textContent || "";
      }

      function budRenderCardsQueue() {
        budCardsContainer.innerHTML = "";
        const total = budayaSlides.length;

        for (let i = 1; i <= 3; i++) {
          const slideIndex = (budCurrentIndex + i) % total;
          const data = budayaSlides[slideIndex];

          const card = document.createElement("button");
          card.type = "button";
          card.className =
            "card-item flex-shrink-0 w-32 h-44 sm:w-36 sm:h-48 md:w-40 md:h-56 rounded-2xl overflow-hidden relative cursor-pointer shadow-xl border border-white/20 group text-left transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400";
          card.setAttribute(
            "aria-label",
            "Tampilkan " + data.badge + ": " + budPlainTitle(data.title),
          );

          card.innerHTML =
            '<div class="w-full h-full bg-gradient-to-b ' +
            data.bg +
            ' pointer-events-none transition-transform duration-500 group-hover:scale-110" aria-hidden="true"></div>' +
            '<div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-3 flex flex-col justify-end pointer-events-none">' +
            '<span class="text-[10px] text-red-400 font-bold uppercase tracking-wider line-clamp-1">' +
            data.badge +
            "</span>" +
            '<span class="text-xs sm:text-sm font-bold text-white uppercase line-clamp-1">' +
            budPlainTitle(data.title) +
            "</span>" +
            "</div>";

          card.addEventListener("click", () => {
            if (budIsAnimating) return;
            budTriggerCardOpening(slideIndex, card);
          });

          budCardsContainer.appendChild(card);
        }
      }

      function budSetActiveBg(layerNum, slide) {
        const el = document.getElementById("bg-layer-" + layerNum);
        el.className = budBgClass(slide);
        el.setAttribute("aria-label", slide.label);
      }

      function budTriggerCardOpening(targetIndex, clickedCard) {
        if (budIsAnimating) return;
        budIsAnimating = true;

        budStopAutoplay();

        const targetData = budayaSlides[targetIndex];
        const nextBgLayerNum = budActiveBgLayer === 1 ? 2 : 1;
        const currentBgEl = document.getElementById(
          "bg-layer-" + budActiveBgLayer,
        );
        const nextBgEl = document.getElementById("bg-layer-" + nextBgLayerNum);

        budSetActiveBg(nextBgLayerNum, targetData);
        nextBgEl.style.opacity = "0";

        if (budPrefersReducedMotion) {
          currentBgEl.style.opacity = "0";
          nextBgEl.style.opacity = "1";
          budActiveBgLayer = nextBgLayerNum;
          budCurrentIndex = targetIndex;
          budApplySlideText(targetIndex);
          budRenderCardsQueue();
          budIsAnimating = false;
          budStartAutoplay();
          return;
        }

        const rect = clickedCard.getBoundingClientRect();
        const heroRect = budHeroSection.getBoundingClientRect();

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

        budTextOut(() => {});

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

        const shift = budCardsContainer.animate(
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
          budActiveBgLayer = nextBgLayerNum;

          clone.remove();
          shift.cancel();

          budApplySlideText(targetIndex);
          budTextIn();

          budCurrentIndex = targetIndex;
          budRenderCardsQueue();

          budIsAnimating = false;
          budStartAutoplay();
        };
      }

      function budStartAutoplay() {
        budStopAutoplay();
        if (budPrefersReducedMotion) return;
        budAutoSlideTimer = setInterval(() => {
          if (budIsAnimating) return;
          const firstCard = budCardsContainer.querySelector(".card-item");
          const nextIndex = (budCurrentIndex + 1) % budayaSlides.length;
          if (firstCard) {
            budTriggerCardOpening(nextIndex, firstCard);
          }
        }, BUD_AUTOPLAY_INTERVAL);
      }

      function budStopAutoplay() {
        if (budAutoSlideTimer) clearInterval(budAutoSlideTimer);
      }

      function budInitHero() {
        budApplySlideText(budCurrentIndex);
        budSetActiveBg(1, budayaSlides[budCurrentIndex]);
        document.getElementById("bg-layer-1").style.opacity = "1";
        document.getElementById("bg-layer-2").style.opacity = "0";

        if (budPrefersReducedMotion) {
          budRenderCardsQueue();
          return;
        }
        budHeroTextEls.forEach((el) => {
          el.style.opacity = "0";
          el.style.transform = "translateY(30px)";
        });
        budRenderCardsQueue();
        budStartAutoplay();
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            budTextIn();
          });
        });

        if (budHeroSection) {
          budHeroSection.addEventListener("mouseenter", budStopAutoplay);
          budHeroSection.addEventListener("mouseleave", budStartAutoplay);
        }
      }

      document.addEventListener("DOMContentLoaded", budInitHero);
    
