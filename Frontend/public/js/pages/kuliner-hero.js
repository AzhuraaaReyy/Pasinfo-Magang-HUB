/**
 * kuliner-hero.js — dipindah VERBATIM dari inline <script> kuliner.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // ── Hero carousel kuliner (MOCK visual: gradient placeholder) ──
      const kulinerSlides = [
        {
          badge: "Kuliner",
          location: "Pasuruan Raya",
          title:
            "Temukan Kuliner<br /> Terbaik di Pasuruan",
          description:
            "Jelajahi cita rasa khas Pasuruan. Dari kuliner tradisional hingga camilan oleh-oleh — semua informasi tempat makan terpercaya ada di sini.",
          bg: "from-amber-900 via-stone-800 to-slate-900",
          label: "Hidangan khas Pasuruan (placeholder)",
        },
        {
          badge: "Tradisional",
          location: "Pasuruan Raya",
          title: "Rawon & Soto<br /> Legendaris",
          description:
            "Hangatnya kuah rempah khas Jawa Timur yang dimasak perlahan dengan resep turun-temurun para juru masak Pasuruan.",
          bg: "from-stone-800 via-amber-900 to-slate-900",
          label: "Kuliner tradisional (placeholder)",
        },
        {
          badge: "Oleh-oleh",
          location: "Pasuruan Raya",
          title: "Camilan &<br /> Oleh-oleh Khas",
          description:
            "Bawa pulang rasa Pasuruan untuk keluarga — aneka camilan dan buah tangan khas dari sentra oleh-oleh setempat.",
          bg: "from-orange-900 via-stone-800 to-slate-900",
          label: "Camilan oleh-oleh (placeholder)",
        },
        {
          badge: "Minuman",
          location: "Pasuruan Raya",
          title: "Kopi &<br /> Angkringan Malam",
          description:
            "Nikmati malam Pasuruan dengan secangkir kopi hangat dan jajanan angkringan di sudut kota yang ramai.",
          bg: "from-emerald-900 via-stone-800 to-slate-900",
          label: "Kedai kopi malam (placeholder)",
        },
      ];

      let kulCurrentIndex = 0;
      let kulIsAnimating = false;
      let kulAutoSlideTimer = null;
      let kulActiveBgLayer = 1;
      const KUL_AUTOPLAY_INTERVAL = 6000;
      const kulPrefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const kulHeroSection = document.getElementById("hero-section");
      const kulBadgeWrapper = document.getElementById("badge-wrapper");
      const kulBadgeText = document.getElementById("badge-text");
      const kulHeroLocation = document.getElementById("hero-location");
      const kulHeroTitle = document.getElementById("hero-title");
      const kulHeroDesc = document.getElementById("hero-desc");
      const kulCardsContainer = document.getElementById("cards-container");
      const kulHeroTextEls = [kulBadgeWrapper, kulHeroTitle, kulHeroDesc];

      function kulBgClass(slide) {
        return "absolute inset-0 bg-gradient-to-b " + slide.bg;
      }

      function kulApplySlideText(index) {
        const data = kulinerSlides[index];
        kulBadgeText.textContent = data.badge;
        kulHeroLocation.textContent = data.location;
        kulHeroTitle.innerHTML = data.title;
        kulHeroDesc.textContent = data.description;
      }

      function kulTextIn() {
        kulHeroTextEls.forEach((el, i) => {
          el.style.transition = "opacity 0.75s ease, transform 0.75s ease";
          el.style.transitionDelay = kulPrefersReducedMotion ? "0s" : i * 0.1 + "s";
          el.style.opacity = "1";
          el.style.transform = "none";
        });
        window.setTimeout(() => {
          kulHeroTextEls.forEach((el) => {
            el.style.transitionDelay = "0s";
          });
        }, 1200);
      }

      function kulTextOut(done) {
        if (kulPrefersReducedMotion) {
          done();
          return;
        }
        kulHeroTextEls.forEach((el) => {
          el.style.transition = "opacity 0.3s ease, transform 0.3s ease";
          el.style.transitionDelay = "0s";
          el.style.opacity = "0";
          el.style.transform = "translateY(-20px)";
        });
        window.setTimeout(done, 320);
      }

      function kulPlainTitle(html) {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        return tmp.textContent || "";
      }

      function kulRenderCardsQueue() {
        kulCardsContainer.innerHTML = "";
        const total = kulinerSlides.length;

        for (let i = 1; i <= 3; i++) {
          const slideIndex = (kulCurrentIndex + i) % total;
          const data = kulinerSlides[slideIndex];

          const card = document.createElement("button");
          card.type = "button";
           card.className =
             "card-item flex-shrink-0 w-32 h-44 sm:w-36 sm:h-48 md:w-40 md:h-56 rounded-2xl overflow-hidden relative cursor-pointer shadow-xl border border-white/20 group text-left transition-transform duration-300 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";
          card.setAttribute(
            "aria-label",
            "Tampilkan " + data.badge + ": " + kulPlainTitle(data.title),
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
            kulPlainTitle(data.title) +
            "</span>" +
            "</div>";

          card.addEventListener("click", () => {
            if (kulIsAnimating) return;
            kulTriggerCardOpening(slideIndex, card);
          });

          kulCardsContainer.appendChild(card);
        }
      }

      function kulSetActiveBg(layerNum, slide) {
        const el = document.getElementById("bg-layer-" + layerNum);
        el.className = kulBgClass(slide);
        el.setAttribute("aria-label", slide.label);
      }

      function kulTriggerCardOpening(targetIndex, clickedCard) {
        if (kulIsAnimating) return;
        kulIsAnimating = true;

        kulStopAutoplay();

        const targetData = kulinerSlides[targetIndex];
        const nextBgLayerNum = kulActiveBgLayer === 1 ? 2 : 1;
        const currentBgEl = document.getElementById(
          "bg-layer-" + kulActiveBgLayer,
        );
        const nextBgEl = document.getElementById("bg-layer-" + nextBgLayerNum);

        kulSetActiveBg(nextBgLayerNum, targetData);
        nextBgEl.style.opacity = "0";

        if (kulPrefersReducedMotion) {
          currentBgEl.style.opacity = "0";
          nextBgEl.style.opacity = "1";
          kulActiveBgLayer = nextBgLayerNum;
          kulCurrentIndex = targetIndex;
          kulApplySlideText(targetIndex);
          kulRenderCardsQueue();
          kulIsAnimating = false;
          kulStartAutoplay();
          return;
        }

        const rect = clickedCard.getBoundingClientRect();
        const heroRect = kulHeroSection.getBoundingClientRect();

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

        kulTextOut(() => {});

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

        const shift = kulCardsContainer.animate(
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
          kulActiveBgLayer = nextBgLayerNum;

          clone.remove();
          shift.cancel();

          kulApplySlideText(targetIndex);
          kulTextIn();

          kulCurrentIndex = targetIndex;
          kulRenderCardsQueue();

          kulIsAnimating = false;
          kulStartAutoplay();
        };
      }

      function kulStartAutoplay() {
        kulStopAutoplay();
        if (kulPrefersReducedMotion) return;
        kulAutoSlideTimer = setInterval(() => {
          if (kulIsAnimating) return;
          const firstCard = kulCardsContainer.querySelector(".card-item");
          const nextIndex = (kulCurrentIndex + 1) % kulinerSlides.length;
          if (firstCard) {
            kulTriggerCardOpening(nextIndex, firstCard);
          }
        }, KUL_AUTOPLAY_INTERVAL);
      }

      function kulStopAutoplay() {
        if (kulAutoSlideTimer) clearInterval(kulAutoSlideTimer);
      }

      function kulInitHero() {
        kulApplySlideText(kulCurrentIndex);
        kulSetActiveBg(1, kulinerSlides[kulCurrentIndex]);
        document.getElementById("bg-layer-1").style.opacity = "1";
        document.getElementById("bg-layer-2").style.opacity = "0";

        if (kulPrefersReducedMotion) {
          kulRenderCardsQueue();
          return;
        }
        kulHeroTextEls.forEach((el) => {
          el.style.opacity = "0";
          el.style.transform = "translateY(30px)";
        });
        kulRenderCardsQueue();
        kulStartAutoplay();
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            kulTextIn();
          });
        });

        if (kulHeroSection) {
          kulHeroSection.addEventListener("mouseenter", kulStopAutoplay);
          kulHeroSection.addEventListener("mouseleave", kulStartAutoplay);
        }
      }

      document.addEventListener("DOMContentLoaded", kulInitHero);
    
