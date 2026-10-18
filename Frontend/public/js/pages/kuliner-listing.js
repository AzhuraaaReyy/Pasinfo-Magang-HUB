/**
 * kuliner-listing.js — dipindah VERBATIM dari inline <script> kuliner.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // ── Daftar Kuliner: memakai dataset mock (single source of truth).
      // JANGAN duplikasi data di sini; cukup baca window.PASINFO_KULINER. ──
      // CATATAN defer-order: data-kuliner.js dimuat dengan `defer`, sedangkan
      // script inline ini dieksekusi saat parsing — jadi dataset HANYA boleh
      // dibaca di dalam init (DOMContentLoaded), bukan di top-level.
      // FOTO SEMENTARA (Owner 2026-10-14): gambar contoh per domain, dipakai
      // bergilir bila data tidak punya media.url. Ganti dengan foto asli nanti.
      // Owner 2026-10-15: kartu grid kecil → pakai varian thumbnail WebP.
      const KULINER_FALLBACK_PHOTOS = [
        "../../public/assets/images/kuliner/optimized/Lontong Kupang Kraton.thumb.webp",
        "../../public/assets/images/kuliner/optimized/Nasi Punel.thumb.webp",
        "../../public/assets/images/kuliner/optimized/soto-pasuruan.thumb.webp",
      ];
      function kulinerPhotoFor(d) {
        if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
        const key = d && d.id != null ? String(d.id) : "";
        let sum = 0;
        for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
        return KULINER_FALLBACK_PHOTOS[sum % KULINER_FALLBACK_PHOTOS.length];
      }
      let KULINER_DATA = { categories: [], culinaries: [] };
      let kulinerItems = [];
      function kulInitData() {
        KULINER_DATA = window.PASINFO_KULINER || { categories: [], culinaries: [] };
        if (!Array.isArray(KULINER_DATA.categories)) KULINER_DATA.categories = [];
        if (!Array.isArray(KULINER_DATA.culinaries)) KULINER_DATA.culinaries = [];
        kulinerItems = KULINER_DATA.culinaries.map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          photo: kulinerPhotoFor(d),
          category: kulinerCategoryName(d.categoryId),
          categoryId: d.categoryId,
          regionId: d.regionId || null,
          short_description: d.short_description,
          rating: d.rating,
          reviews: d.reviews_label,
          location: d.address,
          hours: d.opening_hours,
          price: d.price_range,
          status: d.operational_status,
          featured: !!d.featured,
        }));
      }
      function kulinerCategoryName(id) {
        const found = (KULINER_DATA.categories || []).filter((x) => x.id === id)[0];
        return found ? found.name : "";
      }
      function kulinerCategoryIdByName(name) {
        const found = (KULINER_DATA.categories || []).filter((x) => x.name === name)[0];
        return found ? found.id : null;
      }
      function kulinerRegionName(id) {
        const regs = (window.PASINFO_KULINER && window.PASINFO_KULINER.regions) || [];
        const found = regs.filter((x) => x.id === id)[0];
        return found ? found.name : id;
      }

      const KUL_ICON_STAR = '<svg class="h-4 w-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>';
      const KUL_ICON_PIN = '<img src="../../public/assets/icons/icon_lokasi-hitam.svg" alt="" class="h-4 w-4 shrink-0 object-contain" />';
      const KUL_ICON_CLOCK = '<img src="../../public/assets/icons/icon_waktu.svg" alt="" class="h-4 w-4 shrink-0 object-contain" />';
      const KUL_ICON_TAG = '<img src="../../public/assets/icons/icon_harga-tiket.svg" alt="" class="h-4 w-4 shrink-0 object-contain" />';
      const KUL_ICON_HEART = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';
      const KUL_ICON_BOOKMARK = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.726 48.726 0 017.186 0z" /></svg>';

      const kulGrid = document.getElementById("kul-grid");
      const kulEmpty = document.getElementById("kul-empty");
      const kulCount = document.getElementById("kul-count");
      // Filter tabs kini STATIS di markup (mirror wisata); JS hanya membaca
      // [data-filter-btn] + menempelkan class aktif/idle (tanpa render DOM).
      const KUL_FILTER_BASE = "px-4 py-1.5 rounded-md text-xs font-medium whitespace-nowrap";
      const KUL_FILTER_ACTIVE = "bg-blue-600 text-white";
      const KUL_FILTER_IDLE = "bg-blue-100 text-blue-700";

      /* ── LIKE & BOOKMARK (mirror wisata) ─────────────────────────── */
      const LIKE_BASE_CLASS = "text-white bg-black/30 p-1.5 rounded-full hover:text-red-400 transition-all duration-200";
      const LIKE_ACTIVE_CLASS = "text-red-500 bg-black/30 p-1.5 rounded-full hover:text-red-400 transition-all duration-200";
      const BOOKMARK_BASE_CLASS = "text-white bg-black/30 p-1.5 rounded-full hover:text-yellow-400 transition-all duration-200";
      const BOOKMARK_ACTIVE_CLASS = "text-yellow-400 bg-black/30 p-1.5 rounded-full hover:text-yellow-400 transition-all duration-200";

      function toggleSocialButton(btn, activeClass, baseClass) {
        const isActive = btn.getAttribute("aria-pressed") === "true";
        const svg = btn.querySelector("svg");
        if (isActive) {
          btn.setAttribute("aria-pressed", "false");
          btn.className = baseClass;
          if (svg) svg.setAttribute("fill", "none");
        } else {
          btn.setAttribute("aria-pressed", "true");
          btn.className = activeClass;
          if (svg) svg.setAttribute("fill", "currentColor");
          if (btn.animate) {
            btn.animate(
              [
                { transform: "scale(1)" },
                { transform: "scale(1.25)" },
                { transform: "scale(1)" },
              ],
              { duration: 250, easing: "ease-out" },
            );
          }
        }
      }

      function kulStatusPill(status) {
        var code, label;
        if (status && typeof status === "object") {
          code = String(status.status || "unknown");
          label = status.label || "";
        } else if (typeof status === "string") {
          code = status === "buka" ? "open" : status === "tutup" ? "closed" : status;
          label = "";
        } else {
          code = "unknown";
          label = "";
        }
        if (code === "open") {
          return '<span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700"><span class="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true"></span>' + (label || "Buka") + "</span>";
        }
        if (code === "closing_soon") {
          return '<span class="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700"><span class="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>' + (label || "Segera Tutup") + "</span>";
        }
        if (code === "closed") {
          return '<span class="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600"><span class="h-1.5 w-1.5 rounded-full bg-gray-500" aria-hidden="true"></span>' + (label || "Tutup") + "</span>";
        }
        return "";
      }

      function kulCardHTML(d) {
        let meta = "";
        if (d.rating) {
          meta += '<div class="flex items-center gap-1.5">' + KUL_ICON_STAR + "<span>" + d.rating + (d.reviews ? " (" + d.reviews + ")" : "") + "</span></div>";
        }
        if (d.location) {
          meta += '<div class="flex items-center gap-1.5">' + KUL_ICON_PIN + "<span>" + d.location + "</span></div>";
        }
        if (d.hours) {
          meta += '<div class="flex items-center gap-1.5">' + KUL_ICON_CLOCK + "<span>" + d.hours + "</span></div>";
        }
        if (d.price) {
          meta += '<div class="flex items-center gap-1.5 font-semibold text-gray-700">' + KUL_ICON_TAG + "<span>" + d.price + "</span></div>";
        }
        const mediaInner = d.photo
          ? '<img src="' + d.photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />'
          : '<div class="w-full h-full bg-gradient-to-b from-amber-700 via-stone-700 to-slate-800" role="img" aria-label="Foto kuliner ' + d.name + ' (placeholder)"></div>';
        return (
          '<article data-kul-id="' +
          d.id +
          '" data-kul-slug="' +
          d.slug +
          '" class="kuliner-card group h-full bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden flex flex-col cursor-pointer hover:-translate-y-2 hover:scale-[1.015] hover:shadow-2xl transition-all duration-300 ease-out will-change-transform">' +
            '<div class="relative h-44 sm:h-48 lg:h-52 overflow-hidden">' +
              mediaInner +
              '<span class="absolute top-2 left-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded">' + d.category + "</span>" +
              '<div class="absolute top-2 right-2 flex items-center gap-1.5">' +
                '<button type="button" data-like-btn aria-label="Sukai ' + d.name + '" aria-pressed="false" class="like-btn text-white bg-black/30 p-1.5 rounded-full hover:text-red-400 transition-all duration-200">' + KUL_ICON_HEART + "</button>" +
                '<button type="button" data-bookmark-btn aria-label="Simpan ' + d.name + '" aria-pressed="false" class="bookmark-btn text-white bg-black/30 p-1.5 rounded-full hover:text-yellow-400 transition-all duration-200">' + KUL_ICON_BOOKMARK + "</button>" +
              "</div>" +
            "</div>" +
            '<div class="p-4 flex flex-1 flex-col">' +
              // Owner 2026-10-17: konsistensi judul/deskripsi semua kartu —
              // judul text-xl, deskripsi text-sm, meta text-xs (paritas
              // wisata-listing.js; sama di mobile/tablet/desktop).
              '<h3 class="font-bold text-xl text-gray-900 uppercase leading-snug line-clamp-2">' + d.name + "</h3>" +
              '<p class="text-sm text-gray-500 mt-1.5 leading-relaxed line-clamp-2">' + d.short_description + "</p>" +
              '<div class="pt-3 mt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1.5">' + meta + "</div>" +
            "</div>" +
          "</article>"
        );
      }

      function kulFeaturedHTML(d) {
        if (!d) {
          return '<div class="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-500">Kuliner unggulan belum tersedia.</div>';
        }
        const mediaInner = d.photo
          ? '<img src="' + d.photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-44 object-cover" />'
          : '<div class="w-full h-44 bg-gradient-to-b from-amber-700 via-stone-700 to-slate-800" role="img" aria-label="Foto kuliner ' + d.name + ' (placeholder)"></div>';
        return (
          '<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">' +
            '<div class="px-4 pt-4"><span class="text-sm font-bold text-gray-900">Kuliner</span></div>' +
            '<div class="mt-2">' + mediaInner + "</div>" +
            '<div class="p-4">' +
              '<h3 class="font-bold text-xl text-gray-900">' + d.name + "</h3>" +
              '<p class="text-sm text-gray-500 mt-1 line-clamp-3">' + d.short_description + "</p>" +
              '<dl class="mt-3 space-y-2 text-xs text-gray-600">' +
                '<div class="flex items-center gap-2"><dt class="sr-only">Rating</dt><dd class="flex items-center gap-1">' + KUL_ICON_STAR + "<span>" + d.rating + (d.reviews ? " (" + d.reviews + ")" : "") + "</span></dd></div>" +
                '<div class="flex items-center gap-2"><dt class="w-16 shrink-0 text-gray-400">Kategori</dt><dd class="font-semibold text-gray-700">' + d.category + "</dd></div>" +
                '<div class="flex items-center gap-2"><dt class="w-16 shrink-0 text-gray-400">Lokasi</dt><dd>' + d.location + "</dd></div>" +
                '<div class="flex items-center gap-2"><dt class="w-16 shrink-0 text-gray-400">Harga</dt><dd>' + d.price + "</dd></div>" +
                '<div class="flex items-center gap-2"><dt class="w-16 shrink-0 text-gray-400">Jam</dt><dd>' + d.hours + "</dd></div>" +
                '<div class="flex items-center gap-2"><dt class="w-16 shrink-0 text-gray-400">Status</dt><dd>' + kulStatusPill(d.status) + "</dd></div>" +
              "</dl>" +
            "</div>" +
          "</div>"
        );
      }

      let kulFilter = "Semua";
      let kulKeyword = "";
      let kulRegionId = null;
      let kulPage = 1;
      // Pagination responsif (TASK-KUL-003 delta): mobile 6 / tablet 9 / desktop 12.
      // Breakpoint selaras grid: <640 → 1 kolom, <1024 → 3 kolom, ≥1024 → 4 kolom.
      function kulPerPage() {
        try {
          const w =
            (typeof window !== "undefined" && window.innerWidth) || 1280;
          if (w < 640) return 6;
          if (w < 1024) return 9;
          return 12;
        } catch (err) {
          return 12;
        }
      }
      // Kompat nama lama: sinkronisasi ulang saat resize (jangan pakai konstanta statis).
      let KUL_PER_PAGE = kulPerPage();
      let kulPerPageCached = KUL_PER_PAGE;
       const kulPager = document.getElementById("kul-pager");
       const KUL_PAGER_BASE = "min-w-[2rem] h-8 px-2 rounded-md text-xs font-bold transition-colors";
       const KUL_PAGER_ACTIVE = "bg-blue-600 text-white";
       const KUL_PAGER_IDLE = "bg-white text-slate-600 ring-1 ring-gray-200 hover:bg-gray-100";

      function kulApplyFilterTabStyles() {
        Array.from(document.querySelectorAll("[data-filter-btn]")).forEach((b) => {
          const isOn = b.getAttribute("data-filter") === kulFilter;
          b.setAttribute("aria-pressed", isOn ? "true" : "false");
          b.className = KUL_FILTER_BASE + " " + (isOn ? KUL_FILTER_ACTIVE : KUL_FILTER_IDLE);
        });
      }

      // Pasang listener sekali pada tombol filter statis (idempoten).
      function kulWireFilterTabs() {
        Array.from(document.querySelectorAll("[data-filter-btn]")).forEach((btn) => {
          if (btn.getAttribute("data-filter-wired") === "1") return;
          btn.setAttribute("data-filter-wired", "1");
          btn.addEventListener("click", () => {
            kulFilter = btn.getAttribute("data-filter");
            kulPage = 1;
            kulApplyFilterTabStyles();
            kulRenderList();
            // Sinkron kategori ke map (satu arah; map me-notify balik tanpa loop).
            try {
              const api = window.PasuruanKulinerMap;
              if (api && typeof api.selectCategory === "function") {
                api.selectCategory(kulinerCategoryIdByName(kulFilter));
              }
            } catch (err) { /* abaikan: grid tetap jalan tanpa map */ }
          });
        });
      }

      function kulFilteredList() {
        const kw = (kulKeyword || "").trim().toLowerCase();
        return kulinerItems.filter((d) => {
          if (kulFilter !== "Semua" && d.category !== kulFilter) return false;
          if (kulRegionId && d.regionId !== kulRegionId) return false;
          if (kw && (d.name + " " + (d.short_description || "")).toLowerCase().indexOf(kw) === -1) return false;
          return true;
        });
      }

      function kulTotalPages(list) {
        const per = kulPerPage();
        return Math.max(1, Math.ceil((list ? list.length : 0) / per));
      }

      /* Indikator halaman ringkas (mirror wisata): jendela tetap 3 angka
         berakhir di halaman aktif, diikuti halaman terakhir. Contoh:
         hal.1 -> 1 2 3 … 10, hal.5 -> 3 4 5 … 10, hal.10 -> 1 … 8 9 10. */
      function kulPagerItems(current, total) {
        const size = 3;
        const start = Math.max(1, Math.min(current - (size - 1), total - size + 1));
        const end = Math.min(total, start + size - 1);
        const items = [];
        if (start > 1 && end >= total) {
          items.push(1);
          if (start > 2) items.push("…");
        }
        for (let i = start; i <= end; i++) items.push(i);
        if (end < total) {
          items.push("…");
          items.push(total);
        }
        return items;
      }

      function kulRenderPager(pages) {
        if (!kulPager) return;
        if (pages <= 1) {
          kulPager.innerHTML = "";
          return;
        }
        let html =
          '<button type="button" data-pager-prev aria-label="Halaman sebelumnya" ' +
          (kulPage <= 1 ? "disabled" : "") +
          ' class="' + KUL_PAGER_BASE + " " + KUL_PAGER_IDLE + ' disabled:opacity-40">&lsaquo;</button>';
        kulPagerItems(kulPage, pages).forEach((it) => {
          if (it === "…") {
            html +=
              '<span aria-hidden="true" class="' + KUL_PAGER_BASE + ' text-slate-400 select-none">&hellip;</span>';
            return;
          }
          const on = it === kulPage;
          html +=
            '<button type="button" data-page-btn data-page="' + it + '" ' +
            (on ? 'aria-current="page" ' : "") +
            'aria-label="Halaman ' + it + '" class="' + KUL_PAGER_BASE + " " + (on ? KUL_PAGER_ACTIVE : KUL_PAGER_IDLE) + '">' + it + "</button>";
        });
        html +=
          '<button type="button" data-pager-next aria-label="Halaman berikutnya" ' +
          (kulPage >= pages ? "disabled" : "") +
          ' class="' + KUL_PAGER_BASE + " " + KUL_PAGER_IDLE + ' disabled:opacity-40">&rsaquo;</button>';
        kulPager.innerHTML = html;
        const prev = kulPager.querySelector("[data-pager-prev]");
        const next = kulPager.querySelector("[data-pager-next]");
        if (prev) prev.addEventListener("click", () => kulGoPage(kulPage - 1));
        if (next) next.addEventListener("click", () => kulGoPage(kulPage + 1));
        Array.from(kulPager.querySelectorAll("[data-page-btn]")).forEach((b) => {
          b.addEventListener("click", () => kulGoPage(parseInt(b.getAttribute("data-page"), 10)));
        });
      }

      function kulGoPage(page) {
        const pages = kulTotalPages(kulFilteredList());
        const next = Math.max(1, Math.min(pages, page));
        if (next === kulPage) return;
        kulPage = next;
        const token = ++kulRenderToken;
        const reducedMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const section = kulGrid ? (kulGrid.closest('section') || kulGrid) : null;
        if (section) {
          try { section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }); } catch (e) {}
        }
        if (kulGrid.animate && !reducedMotion && kulGrid.children.length > 0 && !kulGrid.classList.contains("hidden")) {
          const startHeight = kulGrid.offsetHeight;
          const out = kulGrid.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-in" });
          out.onfinish = () => {
            if (token === kulRenderToken) kulRenderList(startHeight);
          };
        } else {
          kulRenderList();
        }
      }

      /* ── ANIMASI FADE-IN (konsep GSAP, vanilla WAAPI) — mirror wisata ── */
      function animateCardsIn(container) {
        const cards = Array.from(container.querySelectorAll("[data-kul-slug]"));
        const reducedMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        cards.forEach((card, i) => {
          if (!card.animate || reducedMotion) return;
          card.animate(
            [
              { opacity: 0, transform: "translateY(18px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 520, delay: i * 60, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" },
          );
        });
      }

      /* ── TRANSISI TINGGI GRID (mirror wisata) ──────────────────────── */
      let kulRenderToken = 0;
      let kulGridResizeAnim = null;
      let kulGridResizeClearRaf = 0;

      function animateGridResize(container, fromHeight) {
        if (!container.animate) return;
        const reducedMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reducedMotion) return;
        const toHeight = container.offsetHeight;
        if (!fromHeight || fromHeight === toHeight) return;
        if (kulGridResizeAnim) {
          try { kulGridResizeAnim.cancel(); } catch (err) { /* abaikan */ }
        }
        if (kulGridResizeClearRaf) {
          cancelAnimationFrame(kulGridResizeClearRaf);
          kulGridResizeClearRaf = 0;
        }
        container.style.overflow = "hidden";
        container.style.height = fromHeight + "px";
        void container.offsetHeight;
        const anim = container.animate(
          [{ height: fromHeight + "px" }, { height: toHeight + "px" }],
          { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
        );
        kulGridResizeAnim = anim;
        const done = () => {
          if (kulGridResizeAnim !== anim) return;
          kulGridResizeAnim = null;
          container.style.height = toHeight + "px";
          container.style.overflow = "";
          try { anim.cancel(); } catch (err) { /* abaikan */ }
          kulGridResizeClearRaf = requestAnimationFrame(() => {
            kulGridResizeClearRaf = 0;
            container.style.height = "";
          });
        };
        anim.onfinish = done;
      }

      function kulRenderList(fromHeight) {
        if (!kulGrid) return;
        const list = kulFilteredList();
        const per = kulPerPage();
        KUL_PER_PAGE = per;
        kulPerPageCached = per;
        const pages = kulTotalPages(list);
        if (kulPage > pages) kulPage = pages;
        if (kulPage < 1) kulPage = 1;
        const startIdx = (kulPage - 1) * per;
        const items = list.slice(startIdx, startIdx + per);
        const prevHeight = typeof fromHeight === "number" ? fromHeight : kulGrid.offsetHeight;
        kulGrid.innerHTML = items.map(kulCardHTML).join("");
        const empty = list.length === 0;
        if (kulEmpty) kulEmpty.classList.toggle("hidden", !empty);
        kulGrid.classList.toggle("hidden", empty);
        if (kulCount) {
          if (empty) {
            kulCount.textContent = "Menampilkan data 0 dari 0.";
          } else {
            const start = startIdx + 1;
            const end = Math.min(startIdx + per, list.length);
            kulCount.textContent = "Menampilkan data " + start + "–" + end + " dari " + list.length +
              (kulFilter !== "Semua" ? ' pada kategori "' + kulFilter + '"' : "") +
              (kulRegionId ? ' di wilayah "' + kulinerRegionName(kulRegionId) + '"' : "") +
              ((kulKeyword || "").trim() ? ' untuk "' + (kulKeyword || "").trim() + '"' : "") +
              " (data dummy).";
          }
        }
        kulRenderPager(pages);
        kulApplyMapHighlight();
        if (!empty) {
          animateGridResize(kulGrid, prevHeight);
          animateCardsIn(kulGrid);
        }
      }

      // Terapkan highlight pilihan map ke grid yang baru di-render
      // (render ulang menghapus class ring, jadi wajib di-apply ulang).
      function kulApplyMapHighlight() {
        try {
          const api = window.PasuruanKulinerMap;
          if (!api || typeof api.getState !== "function" || !kulGrid) return;
          const sel = api.getState().selectedCulinary;
          if (!sel) return;
          const cards = kulGrid.querySelectorAll("[data-kul-id]");
          Array.prototype.forEach.call(cards, function (card) {
            const on = card.getAttribute("data-kul-id") === sel;
            card.classList.toggle("ring-2", on);
            card.classList.toggle("ring-blue-600", on);
          });
        } catch (err) { /* abaikan */ }
      }

      // Sinkron filter region+kategori dari map (event kuliner:mapchange).
      // Listener ini TIDAK memanggil balik map API (anti-loop).
      function kulSyncFromMap() {
        try {
          const api = window.PasuruanKulinerMap;
          if (!api || typeof api.getState !== "function") return;
          const s = api.getState();
          const nextRegion = s.selectedRegion || null;
          let nextCatName = "Semua";
          if (s.selectedCategory) {
            const found = (KULINER_DATA.categories || []).filter((x) => x.id === s.selectedCategory)[0];
            if (found) nextCatName = found.name;
          }
          const changed = nextRegion !== kulRegionId || nextCatName !== kulFilter;
          kulRegionId = nextRegion;
          kulFilter = nextCatName;
          if (changed) {
            kulPage = 1;
            kulApplyFilterTabStyles();
          }
          kulRenderList();
        } catch (err) { /* abaikan */ }
      }

      // Detail card kanan map (#kul-detail) dimiliki PENUH oleh kuliner-map.js
      // (renderDetail: 1 card terpilih/default + rating/kategori/harga/lokasi/
      // jam/status). Fungsi ini dipertahankan sebagai no-op agar tidak ada
      // penulis kedua ke #kul-detail dan tidak ada referensi DOM yatim.
      function kulRenderFeatured() {
        return;
      }

      function kulInitDaftar() {
        kulInitData();
        if (!kulGrid) return;
        kulWireFilterTabs();
        kulApplyFilterTabStyles();
        kulRenderList();
        kulRenderFeatured();
        // Klik kartu grid → halaman detail kuliner (pola wisata:
        // wisata.html: klik kartu → detail_wisata.html?slug=).
        // Tetap sinkron ke map bila tersedia, lalu navigasi ke detail.
        kulGrid.addEventListener("click", (e) => {
          const likeBtn = e.target.closest("[data-like-btn]");
          if (likeBtn) {
            e.stopPropagation();
            toggleSocialButton(likeBtn, LIKE_ACTIVE_CLASS, LIKE_BASE_CLASS);
            return;
          }
          const bookmarkBtn = e.target.closest("[data-bookmark-btn]");
          if (bookmarkBtn) {
            e.stopPropagation();
            toggleSocialButton(bookmarkBtn, BOOKMARK_ACTIVE_CLASS, BOOKMARK_BASE_CLASS);
            return;
          }
          const card = e.target.closest("[data-kul-id]");
          if (!card) return;
          const slug = card.getAttribute("data-kul-slug");
          if (slug) {
            // Klik kartu → LANGSUNG ke halaman detail (Owner 2026-10-16: tanpa
            // tirai transisi dan TANPA sinkron peta — paritas acara. Sinkron
            // selectCulinary memicu refilter + render ulang grid + animasi kartu
            // sebelum pindah, serta mengubah filter wilayah secara tidak sengaja).
            window.location.href = "detail_kuliner.html?slug=" + slug;
          }
        });
        window.addEventListener("kuliner:mapchange", kulSyncFromMap);

        // Kembali dari halaman detail (bfcache): tampilkan SEMUA lagi —
        // filter kategori, wilayah, halaman, dan peta di-reset (Owner 2026-10-16;
        // pola acara-listing.js, tanpa syarat "filter eksplisit").
        window.addEventListener("pageshow", (e) => {
          if (!e || !e.persisted) return;
          kulFilter = "Semua";
          kulRegionId = null;
          kulPage = 1;
          try {
            kulApplyFilterTabStyles();
          } catch (err) {
            /* abaikan: tab tetap tampil dgn gaya bawaan */
          }
          if (window.PasuruanKulinerMap) {
            try {
              // resetFilters() memicu kuliner:mapchange → kulSyncFromMap() →
              // kulRenderList(), jadi JANGAN render manual lagi (hindari render
              // + animasi ganda).
              window.PasuruanKulinerMap.resetFilters();
              return;
            } catch (err) {
              /* gagal memicu peta: fallback render manual di bawah */
            }
          }
          kulRenderList();
        });
        // Resize responsif pagination (debounced ~200ms): re-render hanya
        // bila perPage berubah; clamp kulPage agar tetap valid. Null-safe.
        let kulResizeTimer = null;
        window.addEventListener("resize", () => {
          try {
            if (kulResizeTimer) clearTimeout(kulResizeTimer);
            kulResizeTimer = setTimeout(() => {
              try {
                const next = kulPerPage();
                if (next !== kulPerPageCached) {
                  kulPerPageCached = next;
                  KUL_PER_PAGE = next;
                  const pages = kulTotalPages(kulFilteredList());
                  if (kulPage > pages) kulPage = pages;
                  if (kulPage < 1) kulPage = 1;
                  kulRenderList();
                }
              } catch (err) { /* abaikan: grid tetap tampil */ }
            }, 200);
          } catch (err) { /* abaikan */ }
        });
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
          kulInitDaftar();
        });
      } else {
        kulInitDaftar();
      }
    
