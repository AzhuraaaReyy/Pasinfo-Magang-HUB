/**
 * kuliner-reco.js — dipindah VERBATIM dari inline <script> kuliner.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // ── Carousel Rekomendasi: panah + dots (vanilla) ──
      // Defer-safe: di-init via window.__kulRecoInit (dipanggil dari init
      // daftar setelah reco-row ter-render). Query dots fresh setiap paint
      // karena dots di-rebuild mengikuti jumlah item featured.
      (function () {
        let wired = false;
        function paint() {
          const row = document.getElementById("reco-row");
          const dotsWrap = document.getElementById("reco-dots");
          if (!row || !dotsWrap) return;
          const dots = Array.from(dotsWrap.children);
          if (!dots.length) return;
          const max = row.scrollWidth - row.clientWidth;
          const idx = max > 0 ? Math.min(dots.length - 1, Math.round((row.scrollLeft / max) * (dots.length - 1))) : 0;
          dots.forEach((d, i) => {
            const on = i === idx;
            d.className = (on ? "w-6 h-2" : "w-2 h-2") + " rounded-full " + (on ? "bg-white" : "bg-white/40") + " cursor-pointer";
          });
        }
        function wireDots() {
          const row = document.getElementById("reco-row");
          const dotsWrap = document.getElementById("reco-dots");
          if (!row || !dotsWrap) return;
          const dots = Array.from(dotsWrap.children);
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const behavior = reduced ? "auto" : "smooth";
          dots.forEach((d, i) => {
            if (d.getAttribute("data-reco-wired") === "1") return;
            d.setAttribute("data-reco-wired", "1");
            d.setAttribute("role", "button");
            d.setAttribute("tabindex", "0");
            d.setAttribute("aria-label", "Ke rekomendasi " + (i + 1));
            const go = () => {
              const kids = Array.from(dotsWrap.children);
              const max = row.scrollWidth - row.clientWidth;
              row.scrollTo({ left: (max / Math.max(1, kids.length - 1)) * i, behavior });
            };
            d.addEventListener("click", go);
            d.addEventListener("keydown", (e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
            });
          });
        }
        function init() {
          const row = document.getElementById("reco-row");
          if (!row) return;
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const behavior = reduced ? "auto" : "smooth";
          const step = () => Math.min(360, row.clientWidth * 0.8);
          const prev = document.querySelector("[data-reco-prev]");
          const next = document.querySelector("[data-reco-next]");
          if (!wired) {
            wired = true;
            if (prev) prev.addEventListener("click", () => row.scrollBy({ left: -step(), behavior }));
            if (next) next.addEventListener("click", () => row.scrollBy({ left: step(), behavior }));
            let t = null;
            row.addEventListener("scroll", () => {
              if (t) clearTimeout(t);
              t = setTimeout(paint, 80);
            }, { passive: true });
          }
          wireDots();
          paint();
        }
        window.__kulRecoInit = init;
        window.__kulRecoRefresh = function () { wireDots(); paint(); };
        if (document.readyState !== "loading") init();
      })();
    
