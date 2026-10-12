/**
 * budaya-listing.js — dipindah VERBATIM dari inline <script> budaya.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // ── Daftar Budaya: memakai dataset (single source of truth).
      // JANGAN duplikasi data di sini; cukup baca window.PASINFO_BUDAYA. ──
      const BUDAYA_DATA = window.PASINFO_BUDAYA || { categories: [], cultures: [], calendar: [], gallery: [] };
      function budayaCategoryName(id) {
        const found = BUDAYA_DATA.categories.filter((x) => x.id === id)[0];
        return found ? found.name : "";
      }
      const budayaItems = BUDAYA_DATA.cultures.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        photo: d.media && d.media[0] ? d.media[0].url : null,
        category: budayaCategoryName(d.categoryId),
        categoryId: d.categoryId,
        regionId: d.regionId,
        short_description: d.short_description,
        rating: d.rating,
        reviews: d.reviews_label,
        location: d.address,
        hours: d.opening_hours,
        featured: !!d.featured,
      }));

      const BUD_ICON_STAR = '<svg class="h-3 w-3 text-yellow-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>';
      const BUD_ICON_PIN = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>';
      const BUD_ICON_CLOCK = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
      const BUD_ICON_HEART = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';
      const BUD_ICON_BOOKMARK = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.726 48.726 0 017.186 0z" /></svg>';

      const budGrid = document.getElementById("bud-grid");
       const budEmpty = document.getElementById("bud-empty");
       const budCount = document.getElementById("bud-count");
        const budFiltersWrap = document.getElementById("bud-filters");
        const BUD_FILTER_BASE = "px-4 py-1.5 rounded-md text-xs font-medium whitespace-nowrap";
        const BUD_FILTER_ACTIVE = "bg-blue-700 text-white";
        const BUD_FILTER_IDLE = "bg-blue-100 text-blue-700";

      function budCardHTML(d) {
         let meta = "";
         if (d.rating) {
           meta += '<div class="flex items-center gap-1">' + BUD_ICON_STAR + "<span>" + d.rating + (d.reviews ? " (" + d.reviews + ")" : "") + "</span></div>";
         }
         if (d.location) {
           meta += '<div class="flex items-center gap-1">' + BUD_ICON_PIN + "<span>" + d.location + "</span></div>";
         }
         if (d.hours) {
           meta += '<div class="flex items-center gap-1">' + BUD_ICON_CLOCK + "<span>" + d.hours + "</span></div>";
         }
         const mediaInner = d.photo
           ? '<img src="' + d.photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-full object-cover" />'
           : '<div class="w-full h-full bg-gradient-to-b from-violet-800 via-stone-700 to-slate-800" role="img" aria-label="Foto budaya ' + d.name + ' (placeholder)"></div>';
         return (
           '<article data-bud-id="' +
           d.id +
            '" data-bud-slug="' +
            d.slug +
            '" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full cursor-pointer hover:shadow-md transition-shadow">' +
             '<div class="relative h-32 sm:h-40 md:h-48 lg:h-48 overflow-hidden shrink-0">' +
               mediaInner +
               '<span class="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded">' + d.category + "</span>" +
               '<div class="absolute top-2 right-2 flex items-center gap-1.5">' +
                 '<button type="button" aria-label="Sukai ' + d.name + '" class="text-white bg-black/30 p-1 rounded-full hover:text-red-400 transition-colors">' + BUD_ICON_HEART + "</button>" +
                 '<button type="button" aria-label="Simpan ' + d.name + '" class="text-white bg-black/30 p-1 rounded-full hover:text-red-400 transition-colors">' + BUD_ICON_BOOKMARK + "</button>" +
               "</div>" +
             "</div>" +
             '<div class="p-3 sm:p-4 flex flex-1 flex-col">' +
               '<h3 class="font-bold text-sm sm:text-base text-gray-900 uppercase line-clamp-2">' + d.name + "</h3>" +
               '<p class="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">' + d.short_description + "</p>" +
               '<div class="mt-2 text-[10px] sm:text-xs text-gray-500 space-y-1">' + meta + "</div>" +
             "</div>" +
           "</article>"
         );
       }

      function budFeaturedHTML(d) {
        if (!d) {
          return '<div class="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-500">Budaya unggulan belum tersedia.</div>';
        }
        const mediaInner = d.photo
          ? '<img src="' + d.photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-44 object-cover" />'
          : '<div class="w-full h-44 bg-gradient-to-b from-violet-800 via-stone-700 to-slate-800" role="img" aria-label="Foto budaya ' + d.name + ' (placeholder)"></div>';
        return (
          '<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">' +
            '<div class="px-4 pt-4"><span class="text-sm font-bold text-gray-900">Budaya</span></div>' +
            '<div class="mt-2">' + mediaInner + "</div>" +
            '<div class="p-4">' +
              '<h3 class="font-bold text-base text-gray-900">' + d.name + "</h3>" +
              '<p class="text-[11px] text-gray-500 mt-1 line-clamp-3">' + d.short_description + "</p>" +
              '<dl class="mt-3 space-y-2 text-[11px] text-gray-600">' +
                '<div class="flex items-center gap-2"><dt class="sr-only">Rating</dt><dd class="flex items-center gap-1">' + BUD_ICON_STAR + "<span>" + d.rating + (d.reviews ? " (" + d.reviews + ")" : "") + "</span></dd></div>" +
                '<div class="flex items-center gap-2"><dt class="w-16 shrink-0 text-gray-400">Kategori</dt><dd class="font-semibold text-gray-700">' + d.category + "</dd></div>" +
                '<div class="flex items-center gap-2"><dt class="w-16 shrink-0 text-gray-400">Lokasi</dt><dd>' + d.location + "</dd></div>" +
                '<div class="flex items-center gap-2"><dt class="w-16 shrink-0 text-gray-400">Jam</dt><dd>' + d.hours + "</dd></div>" +
              "</dl>" +
            "</div>" +
          "</div>"
        );
      }

      function budGalleryHTML(g) {
        const desc = g.desc || "";
        return (
          '<figure data-bud-slug="' + g.cultureId + '" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow">' +
            '<div class="relative h-28 sm:h-32 overflow-hidden">' +
              '<div class="w-full h-full bg-gradient-to-b from-violet-800 via-stone-700 to-slate-800" role="img" aria-label="Foto ' + g.title + '"></div>' +
            "</div>" +
            '<figcaption class="p-3">' +
              '<p class="text-xs font-bold text-gray-900 uppercase line-clamp-1">' + g.title + "</p>" +
              (desc ? '<p class="text-[10px] text-gray-500 mt-0.5 line-clamp-2">' + desc + "</p>" : "") +
              '<span class="mt-1.5 inline-block text-[11px] font-bold text-blue-700">Baca Selengkapnya &rarr;</span>' +
            "</figcaption>" +
          "</figure>"
        );
      }

      function budCalendarHTML(a) {
        const day = a.day_label || "--";
        const mon = a.month_label || "";
        const yearMatch = String(a.date_label || "").match(/(19|20)\d{2}/);
        const year = yearMatch ? yearMatch[0] : "";
        const when = a.date_label || "";
        const loc = a.location || "";
        const desc = a.desc || "";
        return (
          '<article class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">' +
            '<div class="relative h-36 overflow-hidden shrink-0 bg-gradient-to-b from-blue-500 to-blue-700" role="img" aria-label="Foto ' + a.title + ' (placeholder)">' +
              '<div class="absolute top-2 left-2 bg-white rounded-md px-2 py-1 text-center shadow leading-none min-w-[3rem]">' +
                '<span class="block text-base font-extrabold text-gray-900 leading-none">' + day + "</span>" +
                (mon ? '<span class="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mt-0.5">' + mon + "</span>" : "") +
                (year ? '<span class="block text-[10px] font-semibold text-gray-500">' + year + "</span>" : "") +
              "</div>" +
            "</div>" +
            '<div class="p-3 sm:p-4 flex flex-1 flex-col">' +
              '<h3 class="font-bold text-sm sm:text-base text-gray-900 line-clamp-1">' + a.title + "</h3>" +
              (desc ? '<p class="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">' + desc + "</p>" : "") +
              '<div class="mt-2 text-[11px] text-gray-500 space-y-1">' +
                (when ? '<p class="flex items-center gap-1">' + BUD_ICON_CLOCK + "<span>" + when + "</span></p>" : "") +
                (loc ? '<p class="flex items-center gap-1">' + BUD_ICON_PIN + "<span>" + loc + "</span></p>" : "") +
              "</div>" +
              '<span class="mt-auto pt-2 inline-block text-[11px] font-bold text-blue-700">Detail &rarr;</span>' +
            "</div>" +
          "</article>"
        );
      }

      function budRecoCardHTML(d) {
        const mediaInner = d.photo
          ? '<img src="' + d.photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-full object-cover" />'
          : '<div class="w-full h-full bg-gradient-to-b from-violet-800 via-stone-700 to-slate-800" role="img" aria-label="Foto budaya ' + d.name + ' (placeholder)"></div>';
        return (
          '<div data-bud-slug="' + d.slug + '" class="w-56 h-64 bg-white/90 text-gray-800 rounded-xl overflow-hidden flex-shrink-0 shadow-lg backdrop-blur-md flex flex-col cursor-pointer hover:shadow-xl transition-shadow">' +
            '<div class="relative h-32 shrink-0">' + mediaInner + "</div>" +
            '<div class="p-3 flex flex-col flex-1">' +
              '<div class="text-yellow-400 text-xs mb-1">★★★★★</div>' +
              '<p class="text-xs font-bold text-gray-900 uppercase line-clamp-1">' + d.name + "</p>" +
              '<p class="text-[11px] text-gray-500 line-clamp-2 mt-1">' + d.short_description + "</p>" +
              '<p class="text-[11px] font-semibold text-gray-700 mt-auto pt-2">' + d.category + "</p>" +
            "</div>" +
          "</div>"
        );
      }

       let budFilter = "Semua";
       let budKeyword = "";
       let budPage = 1;
       function budPerPage() {
         const w = window.innerWidth || 1024;
         if (w < 640) return 6;
         if (w < 1024) return 9;
         return 12;
       }
       const budPager = document.getElementById("bud-pager");
       const BUD_PAGER_BASE = "min-w-[2rem] h-8 px-2 rounded-md text-xs font-bold transition-colors";
       const BUD_PAGER_ACTIVE = "bg-blue-700 text-white";
       const BUD_PAGER_IDLE = "bg-white text-slate-600 ring-1 ring-gray-200 hover:bg-gray-100";

      function budRenderFilterTabs() {
        const cats = ["Semua"].concat(BUDAYA_DATA.categories.map((c) => c.name));
        budFiltersWrap.innerHTML = "";
        cats.forEach((name) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.setAttribute("data-filter-btn", "");
          btn.setAttribute("data-filter", name);
          const on = name === budFilter;
          btn.setAttribute("aria-pressed", on ? "true" : "false");
          btn.className = BUD_FILTER_BASE + " " + (on ? BUD_FILTER_ACTIVE : BUD_FILTER_IDLE);
          btn.textContent = name;
          btn.addEventListener("click", () => {
            budFilter = name;
            budPage = 1;
            Array.from(budFiltersWrap.querySelectorAll("[data-filter-btn]")).forEach((b) => {
              const isOn = b.getAttribute("data-filter") === budFilter;
              b.setAttribute("aria-pressed", isOn ? "true" : "false");
              b.className = BUD_FILTER_BASE + " " + (isOn ? BUD_FILTER_ACTIVE : BUD_FILTER_IDLE);
            });
            budRenderList();
          });
          budFiltersWrap.appendChild(btn);
        });
      }

      function budMapRegion() {
         try {
           if (window.PasuruanBudayaMap) return window.PasuruanBudayaMap.getState().selectedRegion;
         } catch (err) {
           /* abaikan: grid tampil tanpa filter wilayah */
         }
         return null;
       }

       function budFilteredList() {
         const region = budMapRegion();
         const kw = budKeyword.trim().toLowerCase();
         return budayaItems.filter((d) => {
           if (budFilter !== "Semua" && d.category !== budFilter) return false;
           if (region && d.regionId !== region) return false;
           if (kw && (d.name + " " + (d.short_description || "")).toLowerCase().indexOf(kw) === -1) return false;
           return true;
         });
       }

      function budTotalPages(list) {
        return Math.max(1, Math.ceil(list.length / budPerPage()));
      }

      function budRenderPager(pages) {
        if (!budPager) return;
        if (pages <= 1) {
          budPager.innerHTML = "";
          return;
        }
        let html =
          '<button type="button" data-pager-prev aria-label="Halaman sebelumnya" ' +
          (budPage <= 1 ? "disabled" : "") +
          ' class="' + BUD_PAGER_BASE + " " + BUD_PAGER_IDLE + ' disabled:opacity-40">&lsaquo;</button>';
        for (let i = 1; i <= pages; i++) {
          const on = i === budPage;
          html +=
            '<button type="button" data-page-btn data-page="' + i + '" ' +
            (on ? 'aria-current="page" ' : "") +
            'aria-label="Halaman ' + i + '" class="' + BUD_PAGER_BASE + " " + (on ? BUD_PAGER_ACTIVE : BUD_PAGER_IDLE) + '">' + i + "</button>";
        }
        html +=
          '<button type="button" data-pager-next aria-label="Halaman berikutnya" ' +
          (budPage >= pages ? "disabled" : "") +
          ' class="' + BUD_PAGER_BASE + " " + BUD_PAGER_IDLE + ' disabled:opacity-40">&rsaquo;</button>';
        budPager.innerHTML = html;
        const prev = budPager.querySelector("[data-pager-prev]");
        const next = budPager.querySelector("[data-pager-next]");
        if (prev) prev.addEventListener("click", () => budGoPage(budPage - 1));
        if (next) next.addEventListener("click", () => budGoPage(budPage + 1));
        Array.from(budPager.querySelectorAll("[data-page-btn]")).forEach((b) => {
          b.addEventListener("click", () => budGoPage(parseInt(b.getAttribute("data-page"), 10)));
        });
      }

      function budGoPage(page) {
        const pages = budTotalPages(budFilteredList());
        budPage = Math.max(1, Math.min(pages, page));
        budRenderList();
      }

      // Klik kartu → halaman detail budaya tersebut (tiru pola wisata.html).
      function budWireDetailCards(scope) {
        if (!scope) return;
        Array.from(scope.querySelectorAll("[data-bud-slug]")).forEach((card) => {
          card.addEventListener("click", (e) => {
            if (e.target.closest("button")) return;
            window.location.href = "detail_budaya.html?slug=" + card.getAttribute("data-bud-slug");
          });
        });
      }

      function budRenderList() {
        const list = budFilteredList();
        const per = budPerPage();
        const pages = budTotalPages(list);
        if (budPage > pages) budPage = pages;
        const items = list.slice((budPage - 1) * per, budPage * per);
        budGrid.innerHTML = items.map(budCardHTML).join("");
        budWireDetailCards(budGrid);
        const empty = list.length === 0;
        budEmpty.classList.toggle("hidden", !empty);
        budGrid.classList.toggle("hidden", empty);
        const start = list.length === 0 ? 0 : (budPage - 1) * per + 1;
        const end = Math.min(list.length, budPage * per);
        budCount.textContent = "Menampilkan data " + start + "\u2013" + end + " dari " + list.length + " budaya" +
          (budFilter !== "Semua" ? ' pada kategori "' + budFilter + '"' : "") +
          (budKeyword.trim() ? ' untuk "' + budKeyword.trim() + '"' : "") +
          ".";
        budRenderPager(pages);
      }

      let budResizeT = null;
      window.addEventListener("resize", () => {
        if (budResizeT) clearTimeout(budResizeT);
        budResizeT = setTimeout(() => {
          const pages = budTotalPages(budFilteredList());
          if (budPage > pages) budPage = pages;
          budRenderList();
        }, 150);
      });

      /* #bud-featured dimiliki eksklusif oleh budaya-map.js (renderDetail)
         agar detail card kanan map hanya 1 dan ikut seleksi wilayah.
         Script daftar ini TIDAK merender featured. */

      let budGalleryExpanded = false;
      let budCalendarExpanded = false;
      const BUD_TEASER_COUNT = 4;

      function budPaintToggle(btn, expanded, moreLabel, lessLabel) {
        if (!btn) return;
        btn.textContent = expanded ? lessLabel : moreLabel;
      }

      function budRenderGallery() {
        const slot = document.getElementById("bud-gallery");
        if (!slot) return;
        const data = BUDAYA_DATA.gallery || [];
        const items = budGalleryExpanded ? data : data.slice(0, BUD_TEASER_COUNT);
        slot.innerHTML = items.map(budGalleryHTML).join("");
        budWireDetailCards(slot);
        budPaintToggle(
          document.getElementById("bud-gallery-toggle"),
          budGalleryExpanded,
          "Lihat Semua Cerita \u2192",
          "Tampilkan Lebih Sedikit \u2192"
        );
      }

      function budRenderCalendar() {
        const slot = document.getElementById("bud-calendar");
        if (!slot) return;
        const data = BUDAYA_DATA.calendar || [];
        const items = budCalendarExpanded ? data : data.slice(0, BUD_TEASER_COUNT);
        slot.innerHTML = items.map(budCalendarHTML).join("");
        budPaintToggle(
          document.getElementById("bud-calendar-toggle"),
          budCalendarExpanded,
          "Lihat Semua Agenda \u2192",
          "Tampilkan Lebih Sedikit \u2192"
        );
      }

      function budRenderReco() {
        const row = document.getElementById("reco-row");
        if (!row) return;
        const feat = budayaItems.filter((d) => d.featured);
        const list = feat.length ? feat : budayaItems.slice(0, 4);
        row.innerHTML = list.map(budRecoCardHTML).join("");
        budWireDetailCards(row);
      }

        budRenderFilterTabs();
       budRenderList();
       budRenderGallery();
       budRenderCalendar();
       budRenderReco();

       // NOTE 2026-10-09 (Owner): tombol toggle Kalender/Galeri kini anchor
       // navigasi (agenda_budaya.html / cerita_budaya.html); expand inline
       // dinonaktifkan — render teaser statis dipertahankan.

       window.addEventListener("budaya:mapchange", () => {
         budPage = 1;
         budRenderList();
       });
    
