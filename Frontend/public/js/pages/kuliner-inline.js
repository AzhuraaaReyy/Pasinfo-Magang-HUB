        (function () {
          var layer = document.getElementById("bg-layer-1");
          if (!layer) return;
          layer.style.backgroundImage =
            'url("../../public/assets/images/kuliner/optimized/soto-pasuruan.webp"), linear-gradient(to bottom, #92400e, #292524, #0f172a)';
          layer.style.backgroundSize = "cover";
          layer.style.backgroundPosition = "center";
          layer.style.backgroundColor = "#292524";
        })();
      document.addEventListener("DOMContentLoaded", () => {
        const track = document.getElementById("reco-row");
        const prevBtn = document.querySelector("[data-reco-prev]");
        const nextBtn = document.querySelector("[data-reco-next]");
        const dotsContainer = document.getElementById("reco-dots");
        const section = document.querySelector(".reco-section-bg");

        if (!track) return;

        /* 5 SHELL POSISI TETAP (3D) ΓÇö geometri tidak pernah berubah.
           Shell 0/4 = Luar, 1/3 = Dalam, 2 = Tengah (selalu di depan). */
        const shells = Array.from(track.children).filter((el) =>
          el.classList.contains("coverflow-card"),
        );
        if (shells.length < 5) return;

        const CENTER = 2;
        const OFFSET = [-2, -1, 0, 1, 2];

        /* Urutan kartu = urutan rekomendasi (5 teratas dari data kuliner). */
        const ORDER_SLUGS = [
          "nasi-punel-bu-hj-lin",
          "depot-nasi-punel-setia-budi-bangil",
          "warung-pojok-nasi-punel-bangil",
          "waroeng-sambel-bangil",
          "warung-teko-beji",
        ];
        const order = ORDER_SLUGS.map((slug) =>
          track.querySelector('.reco-card[data-slug="' + slug + '"]'),
        );
        if (order.some((c) => !c)) return;
        const total = order.length;

        /* Selaraskan teks kartu dengan sumber data (data-kuliner.js) bila
           tersedia; markup tetap memuat fallback tanpa JS. */
        (function hydrateText() {
          const dest =
            (window.PASINFO_KULINER && window.PASINFO_KULINER.culinaries) || [];
          const bySlug = {};
          dest.forEach((d) => {
            bySlug[d.slug] = d;
          });
          const shortMap = window.DESKRIPSI_SHORT || {};
          order.forEach((card) => {
            const d = bySlug[card.getAttribute("data-slug")];
            if (!d) return;
            const nameEl = card.querySelector(".reco-card__name");
            const descEl = card.querySelector(".reco-card__desc");
            if (d.name) {
              card.setAttribute("data-name", d.name);
              if (nameEl) nameEl.textContent = d.name;
            }
            const desc = shortMap[d.slug] || d.short_description;
            if (desc && descEl) descEl.textContent = desc;
          });
        })();

        const reduced =
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let currentIndex = 0;
        let renderToken = 0;
        let lastSwipeAt = 0;

        const cardForShell = (i) =>
          order[(currentIndex + OFFSET[i] + total) % total];
        const centerCard = () => cardForShell(CENTER);

        function place() {
          shells.forEach((shell, i) => {
            const card = cardForShell(i);
            if (card.parentNode !== shell) shell.appendChild(card);
          });
        }

        function syncCenterMeta() {
          const shell = shells[CENTER];
          const card = centerCard();
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
          const img = centerCard().getAttribute("data-img");
          if (!img) return;
          section.style.backgroundImage =
            'linear-gradient(to bottom, rgba(15, 23, 42, 0.38) 0%, rgba(15, 23, 42, 0) 34%, rgba(15, 23, 42, 0) 56%, rgba(15, 23, 42, 0.92) 100%), url("' +
            img +
            '")';
        }

        function updateDots() {
          if (!dotsContainer) return;
          Array.from(dotsContainer.children).forEach((dot, idx) => {
            const active = idx === currentIndex;
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
          const myToken = ++renderToken;
          updateDots();

          order.forEach(clearAnim);
          const first = new Map();
          order.forEach((c) => first.set(c, c.getBoundingClientRect()));

          place();

          syncCenterMeta();
          applySectionBg();

          if (!(window.Element && Element.prototype.animate)) return;

          order.forEach((card) => {
            const f = first.get(card);
            const l = card.getBoundingClientRect();
            const dx = f.left - l.left;
            const dy = f.top - l.top;
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

            const wrapped = Math.abs(dx) > card.offsetWidth * 1.5;
            const frames = wrapped
              ? [
                  {
                    transform: "translate(" + dx + "px," + dy + "px)",
                    opacity: 1,
                  },
                  {
                    transform:
                      "translate(" + dx * 0.45 + "px," + dy * 0.45 + "px)",
                    opacity: 0,
                    offset: 0.5,
                  },
                  { transform: "translate(0px,0px)", opacity: 1 },
                ]
              : [
                  { transform: "translate(" + dx + "px," + dy + "px)" },
                  { transform: "translate(0px,0px)" },
                ];

            const anim = card.animate(frames, {
              duration: 420,
              easing: "cubic-bezier(0.25, 0.8, 0.35, 1)",
              fill: "both",
            });
            card.__recoAnim = anim;
            anim.onfinish = () => {
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
          const url = "detail_kuliner.html?slug=" + slug;
          if (window.PasInfoPageTransition)
            window.PasInfoPageTransition.go(url);
          else window.location.href = url;
        }

        shells.forEach((shell, shellIndex) => {
          shell.addEventListener("click", () => {
            if (Date.now() - lastSwipeAt < 350) return;
            if (shellIndex === CENTER) {
              goDetail(shell.getAttribute("data-dest-slug"));
              return;
            }
            currentIndex = (currentIndex + OFFSET[shellIndex] + total) % total;
            render();
          });
          shell.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            if (shellIndex === CENTER) {
              goDetail(shell.getAttribute("data-dest-slug"));
            } else {
              currentIndex =
                (currentIndex + OFFSET[shellIndex] + total) % total;
              render();
            }
          });
        });

        if (prevBtn) {
          prevBtn.addEventListener("click", () => {
            currentIndex = (currentIndex - 1 + total) % total;
            render();
          });
        }

        if (nextBtn) {
          nextBtn.addEventListener("click", () => {
            currentIndex = (currentIndex + 1) % total;
            render();
          });
        }

        if (dotsContainer) {
          Array.from(dotsContainer.children).forEach((dot, idx) => {
            dot.setAttribute("role", "button");
            dot.setAttribute("tabindex", "0");
            dot.setAttribute("aria-label", "Buka rekomendasi " + (idx + 1));
            const goDot = () => {
              if (idx === currentIndex) return;
              currentIndex = idx;
              render();
            };
            dot.addEventListener("click", goDot);
            dot.addEventListener("keydown", (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goDot();
              }
            });
          });
        }

        // Swipe / Drag (touch + mouse)
        let startX = 0;
        let isDragging = false;

        track.addEventListener(
          "touchstart",
          (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
          },
          { passive: true },
        );

        track.addEventListener(
          "touchend",
          (e) => {
            if (!isDragging) return;
            isDragging = false;
            handleSwipe(startX, e.changedTouches[0].clientX);
          },
          { passive: true },
        );

        track.addEventListener("mousedown", (e) => {
          startX = e.clientX;
          isDragging = true;
        });

        track.addEventListener("mouseup", (e) => {
          if (!isDragging) return;
          isDragging = false;
          handleSwipe(startX, e.clientX);
        });

        function handleSwipe(start, end) {
          const diff = start - end;
          if (Math.abs(diff) > 40) {
            lastSwipeAt = Date.now();
            currentIndex = (currentIndex + (diff > 0 ? 1 : -1) + total) % total;
            render();
          }
        }

        renderInstant();
      });
