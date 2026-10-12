/**
 * reco-carousel.js — dipindah VERBATIM dari inline <script> wisata.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // ── Carousel Rekomendasi: panah + dots (vanilla) ──
      (function () {
        const row = document.getElementById("reco-row");
        const dotsWrap = document.getElementById("reco-dots");
        if (!row || !dotsWrap) return;
        const dots = Array.from(dotsWrap.children);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const behavior = reduced ? "auto" : "smooth";
        const step = () => Math.min(360, row.clientWidth * 0.8);
        const prev = document.querySelector("[data-reco-prev]");
        const next = document.querySelector("[data-reco-next]");
        function paint() {
          const max = row.scrollWidth - row.clientWidth;
          const idx = max > 0 ? Math.min(dots.length - 1, Math.round((row.scrollLeft / max) * (dots.length - 1))) : 2;
          dots.forEach((d, i) => {
            const on = i === idx;
            d.className = (on ? "w-6 h-2" : "w-2 h-2") + " rounded-full " + (on ? "bg-white" : "bg-white/40") + " cursor-pointer";
          });
        }
        if (prev) prev.addEventListener("click", () => row.scrollBy({ left: -step(), behavior }));
        if (next) next.addEventListener("click", () => row.scrollBy({ left: step(), behavior }));
        dots.forEach((d, i) => {
          d.setAttribute("role", "button");
          d.setAttribute("tabindex", "0");
          d.setAttribute("aria-label", "Ke rekomendasi " + (i + 1));
          const go = () => {
            const max = row.scrollWidth - row.clientWidth;
            row.scrollTo({ left: (max / (dots.length - 1)) * i, behavior });
          };
          d.addEventListener("click", go);
          d.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
          });
        });
        let t = null;
        row.addEventListener("scroll", () => {
          if (t) clearTimeout(t);
          t = setTimeout(paint, 80);
        }, { passive: true });
        paint();
      })();
    
