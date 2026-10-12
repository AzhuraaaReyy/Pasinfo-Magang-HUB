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
          photo: d.media && d.media[0] ? d.media[0].url : null,
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

      const KUL_ICON_STAR = '<svg class="h-3 w-3 text-yellow-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>';
      const KUL_ICON_PIN = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>';
      const KUL_ICON_CLOCK = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
      const KUL_ICON_TAG = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" /></svg>';
      const KUL_ICON_HEART = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';
      const KUL_ICON_BOOKMARK = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.726 48.726 0 017.186 0z" /></svg>';

      const kulGrid = document.getElementById("kul-grid");
      const kulEmpty = document.getElementById("kul-empty");
      const kulCount = document.getElementById("kul-count");
       const kulFiltersWrap = document.getElementById("kul-filters");
        const KUL_FILTER_BASE = "px-4 py-1.5 rounded-md text-xs font-medium whitespace-nowrap";
       const KUL_FILTER_ACTIVE = "bg-blue-600 text-white";
       const KUL_FILTER_IDLE = "bg-blue-100 text-blue-700";

      function kulStatusPill(status) {
        if (status === "buka") {
          return '<span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700"><span class="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true"></span>Buka</span>';
        }
        if (status === "tutup") {
          return '<span class="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600"><span class="h-1.5 w-1.5 rounded-full bg-gray-500" aria-hidden="true"></span>Tutup</span>';
        }
        return "";
      }

      function kulCardHTML(d) {
        let meta = "";
        if (d.rating) {
          meta += '<div class="flex items-center gap-1 text-[10px] sm:text-xs">' + KUL_ICON_STAR + "<span>" + d.rating + (d.reviews ? " (" + d.reviews + ")" : "") + "</span></div>";
        }
        if (d.location) {
          meta += '<div class="flex items-center gap-1 text-[10px] sm:text-xs">' + KUL_ICON_PIN + "<span class='line-clamp-1'>" + d.location + "</span></div>";
        }
        if (d.hours) {
          meta += '<div class="flex items-center gap-1 text-[10px] sm:text-xs">' + KUL_ICON_CLOCK + "<span>" + d.hours + "</span></div>";
        }
        if (d.price) {
          meta += '<div class="flex items-center gap-1 font-semibold text-gray-700 text-[10px] sm:text-xs">' + KUL_ICON_TAG + "<span>" + d.price + "</span></div>";
        }
        const mediaInner = d.photo
          ? '<img src="' + d.photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-full object-cover" />'
          : '<div class="w-full h-full bg-gradient-to-b from-amber-700 via-stone-700 to-slate-800" role="img" aria-label="Foto kuliner ' + d.name + ' (placeholder)"></div>';
        return (
          '<article data-kul-id="' +
          d.id +
          '" data-kul-slug="' +
          d.slug +
          '" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">' +
            '<div class="relative h-32 sm:h-40 md:h-48 overflow-hidden shrink-0">' +
              mediaInner +
              '<span class="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] sm:text-[10px] px-2 py-0.5 rounded">' + d.category + "</span>" +
              '<div class="absolute top-2 right-2 flex items-center gap-1.5">' +
                '<button type="button" aria-label="Sukai ' + d.name + '" class="text-white bg-black/30 p-1 rounded-full hover:text-red-400 transition-colors">' + KUL_ICON_HEART + "</button>" +
                '<button type="button" aria-label="Simpan ' + d.name + '" class="text-white bg-black/30 p-1 rounded-full hover:text-red-400 transition-colors">' + KUL_ICON_BOOKMARK + "</button>" +
              "</div>" +
            "</div>" +
            '<div class="p-3 sm:p-3 md:p-4 flex flex-1 flex-col">' +
              '<div class="flex items-start justify-between gap-2">' +
                '<h3 class="font-bold text-xs sm:text-sm md:text-base text-gray-900 uppercase line-clamp-2">' + d.name + "</h3>" +
                kulStatusPill(d.status) +
              "</div>" +
              '<p class="text-[10px] sm:text-[11px] md:text-xs text-gray-500 mt-1 line-clamp-2">' + d.short_description + "</p>" +
              '<div class="mt-2 text-[9px] sm:text-[10px] md:text-[11px] text-gray-500 space-y-1">' + meta + "</div>" +
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
              '<h3 class="font-bold text-base text-gray-900">' + d.name + "</h3>" +
              '<p class="text-[11px] text-gray-500 mt-1 line-clamp-3">' + d.short_description + "</p>" +
              '<dl class="mt-3 space-y-2 text-[11px] text-gray-600">' +
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

      function kulRecoCardHTML(d) {
        const mediaInner = d.photo
          ? '<img src="' + d.photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-full object-cover" />'
          : '<div class="w-full h-full bg-gradient-to-b from-amber-700 via-stone-700 to-slate-800" role="img" aria-label="Foto kuliner ' + d.name + ' (placeholder)"></div>';
        return (
          '<div data-kul-reco data-kul-slug="' + d.slug + '" role="link" tabindex="0" aria-label="Lihat detail ' + d.name + '" class="w-56 h-64 bg-white/90 text-gray-800 rounded-xl overflow-hidden flex-shrink-0 shadow-lg backdrop-blur-md flex flex-col cursor-pointer hover:shadow-xl transition-shadow">' +
            '<div class="relative h-32 shrink-0">' + mediaInner + "</div>" +
            '<div class="p-3 flex flex-col flex-1">' +
              '<div class="text-yellow-400 text-xs mb-1">★★★★★</div>' +
              '<p class="text-xs font-bold text-gray-900 uppercase line-clamp-1">' + d.name + "</p>" +
              '<p class="text-[11px] text-gray-500 line-clamp-2 mt-1">' + d.short_description + "</p>" +
              '<p class="text-[11px] font-semibold text-gray-700 mt-auto pt-2">' + d.price + "</p>" +
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

      function kulRenderFilterTabs() {
        const cats = ["Semua"].concat(KULINER_DATA.categories.map((c) => c.name));
        kulFiltersWrap.innerHTML = "";
        cats.forEach((name) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.setAttribute("data-filter-btn", "");
          btn.setAttribute("data-filter", name);
          const on = name === kulFilter;
          btn.setAttribute("aria-pressed", on ? "true" : "false");
          btn.className = KUL_FILTER_BASE + " " + (on ? KUL_FILTER_ACTIVE : KUL_FILTER_IDLE);
          btn.textContent = name;
          btn.addEventListener("click", () => {
            kulFilter = name;
            kulPage = 1;
            Array.from(kulFiltersWrap.querySelectorAll("[data-filter-btn]")).forEach((b) => {
              const isOn = b.getAttribute("data-filter") === kulFilter;
              b.setAttribute("aria-pressed", isOn ? "true" : "false");
              b.className = KUL_FILTER_BASE + " " + (isOn ? KUL_FILTER_ACTIVE : KUL_FILTER_IDLE);
            });
            kulRenderList();
            // Sinkron kategori ke map (satu arah; map me-notify balik tanpa loop
            // karena listener mapchange di bawah tidak pernah memanggil balik map).
            try {
              const api = window.PasuruanKulinerMap;
              if (api && typeof api.selectCategory === "function") {
                api.selectCategory(kulinerCategoryIdByName(name));
              }
            } catch (err) { /* abaikan: grid tetap jalan tanpa map */ }
          });
          kulFiltersWrap.appendChild(btn);
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
        for (let i = 1; i <= pages; i++) {
          const on = i === kulPage;
          html +=
            '<button type="button" data-page-btn data-page="' + i + '" ' +
            (on ? 'aria-current="page" ' : "") +
            'aria-label="Halaman ' + i + '" class="' + KUL_PAGER_BASE + " " + (on ? KUL_PAGER_ACTIVE : KUL_PAGER_IDLE) + '">' + i + "</button>";
        }
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
        kulPage = Math.max(1, Math.min(pages, page));
        kulRenderList();
      }

      function kulRenderList() {
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
            kulRenderFilterTabs();
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

      function kulGoRecoDetail(slug) {
        if (!slug) return;
        window.location.href = "detail_kuliner.html?slug=" + slug;
      }

      function kulRenderReco() {
        const row = document.getElementById("reco-row");
        if (!row) return;
        const feat = kulinerItems.filter((d) => d.featured);
        const list = feat.length ? feat : kulinerItems.slice(0, 4);
        row.innerHTML = list.map(kulRecoCardHTML).join("");
        // Klik kartu rekomendasi → halaman detail (pola wisata).
        Array.from(row.querySelectorAll("[data-kul-reco]")).forEach((card) => {
          card.addEventListener("click", () => kulGoRecoDetail(card.getAttribute("data-kul-slug")));
          card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); kulGoRecoDetail(card.getAttribute("data-kul-slug")); }
          });
        });
        kulRenderRecoDots(list.length);
        if (typeof window.__kulRecoRefresh === "function") {
          window.__kulRecoRefresh();
        }
      }

      function kulRenderRecoDots(n) {
        const dotsWrap = document.getElementById("reco-dots");
        if (!dotsWrap) return;
        dotsWrap.innerHTML = "";
        const count = Math.max(1, Math.min(n || 0, 8));
        for (let i = 0; i < count; i++) {
          const s = document.createElement("span");
          s.className = "w-2 h-2 rounded-full bg-white/40";
          s.setAttribute("aria-hidden", "true");
          dotsWrap.appendChild(s);
        }
      }

      function kulInitDaftar() {
        kulInitData();
        if (!kulGrid) return;
        kulRenderFilterTabs();
        kulRenderList();
        kulRenderFeatured();
        kulRenderReco();
        // Klik kartu grid → halaman detail kuliner (pola wisata:
        // wisata.html: klik kartu → detail_wisata.html?slug=).
        // Tetap sinkron ke map bila tersedia, lalu navigasi ke detail.
        kulGrid.addEventListener("click", (e) => {
          const card = e.target.closest("[data-kul-id]");
          if (!card || e.target.closest("button")) return;
          try {
            const api = window.PasuruanKulinerMap;
            if (api && typeof api.selectCulinary === "function") {
              api.selectCulinary(card.getAttribute("data-kul-id"));
            }
          } catch (err) { /* abaikan */ }
          const slug = card.getAttribute("data-kul-slug");
          if (slug) window.location.href = "detail_kuliner.html?slug=" + slug;
        });
        window.addEventListener("kuliner:mapchange", kulSyncFromMap);
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
          if (typeof window.__kulRecoInit === "function") window.__kulRecoInit();
        });
      } else {
        kulInitDaftar();
        if (typeof window.__kulRecoInit === "function") window.__kulRecoInit();
      }
    
