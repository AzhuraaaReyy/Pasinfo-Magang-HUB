/**
 * budaya-listing.js — dipindah VERBATIM dari inline <script> budaya.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // ── Daftar Budaya: memakai dataset (single source of truth).
      // JANGAN duplikasi data di sini; cukup baca window.PASINFO_BUDAYA. ──
      const BUDAYA_DATA = window.PASINFO_BUDAYA || { categories: [], cultures: [], calendar: [], gallery: [] };
      // FOTO SEMENTARA (Owner 2026-10-14): gambar contoh per domain, dipakai
      // bergilir bila data tidak punya media.url. Ganti dengan foto asli nanti.
      // Owner 2026-10-15: kartu grid kecil → pakai varian thumbnail WebP.
      const BUDAYA_FALLBACK_PHOTOS = [
        "../../public/assets/images/budaya/optimized/Tari Terbang Bandung & Tari Pasuruan Kondang.thumb.webp",
        "../../public/assets/images/budaya/optimized/Tradisi-Skilot.thumb.webp",
        "../../public/assets/images/budaya/optimized/Yadnya Karo Sodoran (Tosari).thumb.webp",
      ];
      function budayaPhotoFor(d) {
        if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
        const key = d && d.id != null ? String(d.id) : "";
        let sum = 0;
        for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
        return BUDAYA_FALLBACK_PHOTOS[sum % BUDAYA_FALLBACK_PHOTOS.length];
      }
      function budayaCategoryName(id) {
        const found = BUDAYA_DATA.categories.filter((x) => x.id === id)[0];
        return found ? found.name : "";
      }
      const budayaItems = BUDAYA_DATA.cultures.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        photo: budayaPhotoFor(d),
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

      // Peta budaya by id/slug (id == slug pada dataset) untuk meresolusi
      // cerita ke data budaya REAL (item 6 — tanpa fabrikasi narasi).
      const budayaCultureById = {};
      BUDAYA_DATA.cultures.forEach((c) => {
        if (c.id != null) budayaCultureById[c.id] = c;
        if (c.slug != null) budayaCultureById[c.slug] = c;
      });

      // Status agenda kalender → badge (item 5, Owner 2026-10-16:
      // Akan Datang=hijau, Berlangsung=biru, Selesai=abu).
      const BUD_STATUS_META = {
        "akan-datang": { label: "Akan Datang", cls: "bg-green-600 text-white" },
        "berlangsung": { label: "Berlangsung", cls: "bg-blue-600 text-white" },
        "selesai": { label: "Selesai", cls: "bg-gray-500 text-white" },
      };
      function budStatusBadge(status) {
        const meta = BUD_STATUS_META[status] || BUD_STATUS_META["akan-datang"];
        return '<span class="inline-block ' + meta.cls + ' text-[10px] font-bold px-2 py-0.5 rounded">' + meta.label + "</span>";
      }

      const BUD_ICON_STAR = '<svg class="h-3 w-3 text-yellow-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>';
      const BUD_ICON_PIN = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>';
      const BUD_ICON_CLOCK = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
      const BUD_ICON_HEART = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';
      const BUD_ICON_BOOKMARK = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.726 48.726 0 017.186 0z" /></svg>';

      // Tombol suka/simpan (paritas kuliner-listing.js): toggle warna + isi ikon.
      const BUD_LIKE_BASE = "text-white bg-black/30 p-1.5 rounded-full hover:text-red-400 transition-all duration-200";
      const BUD_LIKE_ACTIVE = "text-red-500 bg-black/30 p-1.5 rounded-full hover:text-red-400 transition-all duration-200";
      const BUD_BOOKMARK_BASE = "text-white bg-black/30 p-1.5 rounded-full hover:text-yellow-400 transition-all duration-200";
      const BUD_BOOKMARK_ACTIVE = "text-yellow-400 bg-black/30 p-1.5 rounded-full hover:text-yellow-400 transition-all duration-200";
      function budToggleSocialButton(btn, activeClass, baseClass) {
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

      const budGrid = document.getElementById("bud-grid");
       const budEmpty = document.getElementById("bud-empty");
        const budFiltersWrap = document.getElementById("bud-filters");
        const BUD_FILTER_BASE = "px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap";
        const BUD_FILTER_ACTIVE = "bud-accent";
        const BUD_FILTER_IDLE = "bud-accent-soft";

      function budCardHTML(d) {
         let meta = "";
         if (d.rating) {
           meta += '<div class="flex items-center gap-1.5">' + BUD_ICON_STAR + "<span>" + d.rating + (d.reviews ? " (" + d.reviews + ")" : "") + "</span></div>";
         }
         if (d.location) {
           meta += '<div class="flex items-center gap-1.5">' + BUD_ICON_PIN + "<span>" + d.location + "</span></div>";
         }
         if (d.hours) {
           meta += '<div class="flex items-center gap-1.5">' + BUD_ICON_CLOCK + "<span>" + d.hours + "</span></div>";
         }
         const mediaInner = d.photo
           ? '<img src="' + d.photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />'
           : '<div class="w-full h-full bg-gradient-to-b from-violet-800 via-stone-700 to-slate-800" role="img" aria-label="Foto budaya ' + d.name + ' (placeholder)"></div>';
         return (
           '<article data-bud-id="' +
           d.id +
            '" data-bud-slug="' +
            d.slug +
            '" class="budaya-card group h-full bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden flex flex-col cursor-pointer hover:-translate-y-2 hover:scale-[1.015] hover:shadow-2xl transition-all duration-300 ease-out will-change-transform">' +
              '<div class="relative h-44 sm:h-48 lg:h-52 overflow-hidden shrink-0">' +
               mediaInner +
               '<span class="absolute top-2 left-2 bud-accent text-white text-[10px] px-2 py-0.5 rounded">' + d.category + "</span>" +
               '<div class="absolute top-2 right-2 flex items-center gap-1.5">' +
                 '<button type="button" data-like-btn aria-label="Sukai ' + d.name + '" aria-pressed="false" class="' + BUD_LIKE_BASE + '">' + BUD_ICON_HEART + "</button>" +
                 '<button type="button" data-bookmark-btn aria-label="Simpan ' + d.name + '" aria-pressed="false" class="' + BUD_BOOKMARK_BASE + '">' + BUD_ICON_BOOKMARK + "</button>" +
               "</div>" +
             "</div>" +
             '<div class="p-4 flex flex-1 flex-col">' +
                '<h3 class="font-bold text-xl text-gray-900 uppercase leading-snug line-clamp-2">' + d.name + "</h3>" +
                '<p class="text-sm text-gray-500 mt-1.5 leading-relaxed line-clamp-2">' + d.short_description + "</p>" +
                '<div class="pt-3 mt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1.5">' + meta + "</div>" +
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
              '<h3 class="font-bold text-xl text-gray-900">' + d.name + "</h3>" +
              '<p class="text-sm text-gray-500 mt-1 line-clamp-3">' + d.short_description + "</p>" +
              '<dl class="mt-3 space-y-2 text-xs text-gray-600">' +
                (d.rating ? '<div class="flex items-center gap-2"><dt class="sr-only">Rating</dt><dd class="flex items-center gap-1">' + BUD_ICON_STAR + "<span>" + d.rating + (d.reviews ? " (" + d.reviews + ")" : "") + "</span></dd></div>" : "") +
                '<div class="flex items-center gap-2"><dt class="w-16 shrink-0 text-gray-400">Kategori</dt><dd class="font-semibold text-gray-700">' + d.category + "</dd></div>" +
                '<div class="flex items-center gap-2"><dt class="w-16 shrink-0 text-gray-400">Lokasi</dt><dd>' + d.location + "</dd></div>" +
                '<div class="flex items-center gap-2"><dt class="w-16 shrink-0 text-gray-400">Jam</dt><dd>' + d.hours + "</dd></div>" +
              "</dl>" +
            "</div>" +
          "</div>"
        );
      }

      function budGalleryHTML(v) {
        const mediaInner = v.photo
          ? '<img src="' + v.photo + '" alt="Foto ' + v.title + '" loading="lazy" class="w-full h-full object-cover" />'
          : '<div class="w-full h-full bg-gradient-to-b from-violet-800 via-stone-700 to-slate-800" role="img" aria-label="Foto ' + v.title + '"></div>';
        return (
          '<figure data-cerita-slug="' + v.slug + '" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer flex flex-col hover:-translate-y-2 hover:scale-[1.015] hover:shadow-2xl transition-all duration-300 ease-out will-change-transform">' +
            '<div class="relative h-36 overflow-hidden">' +
              mediaInner +
            "</div>" +
            '<figcaption class="p-4 flex flex-1 flex-col">' +
              '<p class="text-xl font-bold text-gray-900 uppercase line-clamp-1">' + v.title + "</p>" +
              (v.desc ? '<p class="text-sm text-gray-500 mt-1.5 leading-relaxed line-clamp-2">' + v.desc + "</p>" : "") +
              '<div class="mt-auto pt-3"><span class="text-sm font-bold bud-accent-text">Baca Selengkapnya &rarr;</span></div>' +
            "</figcaption>" +
          "</figure>"
        );
      }

      // Cerita di Balik Budaya: view-model DITURUNKAN dari budaya REAL
      // (judul "Cerita di Balik <nama>", excerpt = short_description,
      // foto = aset budaya). Tidak ada narasi yang difabrikasi.
      function budStoryVM(s) {
        const c = budayaCultureById[s.cultureId] || budayaCultureById[s.slug] || null;
        const name = c ? c.name : "";
        return {
          slug: s.slug || (c && c.slug) || "",
          title: "Cerita di Balik " + name,
          desc: c ? c.short_description || "" : "",
          photo: c ? budayaPhotoFor(c) : BUDAYA_FALLBACK_PHOTOS[0],
        };
      }

      function budCalendarHTML(a) {
        const day = a.day_label || "--";
        const mon = a.month_label || "";
        const yearMatch = String(a.date_label || "").match(/(19|20)\d{2}/);
        const year = yearMatch ? yearMatch[0] : "";
        const when = a.date_label || "";
        const loc = a.location || "";
        const desc = a.desc || "";
        // Foto dari aset budaya (resolusi ke budaya REAL via cultureId).
        const calCulture = budayaCultureById[a.cultureId] || null;
        const calPhoto = calCulture ? budayaPhotoFor(calCulture) : BUDAYA_FALLBACK_PHOTOS[0];
        const calImg = '<img src="' + calPhoto + '" alt="Foto ' + a.title + '" loading="lazy" class="w-full h-full object-cover" />';
        return (
          '<article data-bud-slug="' + (a.cultureId || "") + '" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full cursor-pointer hover:-translate-y-2 hover:scale-[1.015] hover:shadow-2xl transition-all duration-300 ease-out will-change-transform">' +
            '<div class="relative h-36 overflow-hidden shrink-0 bud-accent">' +
              calImg +
              '<div class="absolute top-2 left-2 bg-white rounded-md px-2 py-1 text-center shadow leading-none min-w-[3rem]">' +
                '<span class="block text-base font-extrabold text-gray-900 leading-none">' + day + "</span>" +
                (mon ? '<span class="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mt-0.5">' + mon + "</span>" : "") +
                (year ? '<span class="block text-[10px] font-semibold text-gray-500">' + year + "</span>" : "") +
              "</div>" +
              '<div class="absolute top-2 right-2">' + budStatusBadge(a.status) + "</div>" +
            "</div>" +
            '<div class="p-3 sm:p-4 flex flex-1 flex-col">' +
              '<h3 class="font-bold text-xl text-gray-900 line-clamp-1">' + a.title + "</h3>" +
              (desc ? '<p class="text-sm text-gray-500 mt-1 line-clamp-2">' + desc + "</p>" : "") +
              '<div class="mt-2 text-xs text-gray-500 space-y-1">' +
                (when ? '<p class="flex items-center gap-1">' + BUD_ICON_CLOCK + "<span>" + when + "</span></p>" : "") +
                (loc ? '<p class="flex items-center gap-1">' + BUD_ICON_PIN + "<span>" + loc + "</span></p>" : "") +
              "</div>" +
              '<span class="mt-auto pt-2 inline-block text-sm font-bold bud-accent-text">Detail &rarr;</span>' +
            "</div>" +
          "</article>"
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
       const BUD_PAGER_BASE = "min-w-[2rem] h-8 px-2 rounded-md text-sm font-bold transition-colors";
        const BUD_PAGER_ACTIVE = "bud-accent";
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
        budScrollToList();
      }

      // Ronde 3 (item 3): setelah ganti halaman, gulir halus kembali ke puncak
      // daftar. Tinggi kartu antar-halaman bisa berbeda (mis. 10 → 1 kartu), sehingga
      // posisi scroll lama membuat lompatan yang terasa mendadak.
      function budScrollToList() {
        const sec = document.getElementById("bud-list-section") || budGrid;
        if (!sec) return;
        const header = document.querySelector("header");
        const offset = (header && header.offsetHeight ? header.offsetHeight : 72) + 8;
        sec.style.scrollMarginTop = offset + "px";
        try {
          sec.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (e) {
          const top = Math.max(0, sec.getBoundingClientRect().top + window.scrollY - offset);
          window.scrollTo({ top: top, behavior: "smooth" });
        }
      }

      // Klik kartu → LANGSUNG ke halaman detail (Owner 2026-10-16: tanpa
      // tirai transisi — paritas acara, navigasi langsung agar responsif <100ms).
      function budNavigate(href) {
        window.location.href = href;
      }
      function budWireDetailCards(scope) {
        if (!scope) return;
        Array.from(scope.querySelectorAll("[data-bud-slug]")).forEach((card) => {
          card.addEventListener("click", (e) => {
            const likeBtn = e.target.closest("[data-like-btn]");
            if (likeBtn) {
              e.stopPropagation();
              budToggleSocialButton(likeBtn, BUD_LIKE_ACTIVE, BUD_LIKE_BASE);
              return;
            }
            const bookmarkBtn = e.target.closest("[data-bookmark-btn]");
            if (bookmarkBtn) {
              e.stopPropagation();
              budToggleSocialButton(bookmarkBtn, BUD_BOOKMARK_ACTIVE, BUD_BOOKMARK_BASE);
              return;
            }
            if (e.target.closest("button")) return;
            budNavigate("detail_budaya.html?slug=" + card.getAttribute("data-bud-slug"));
          });
        });
      }

      function budWireCerita(scope) {
        if (!scope) return;
        Array.from(scope.querySelectorAll("[data-cerita-slug]")).forEach((card) => {
          card.addEventListener("click", () => {
            budNavigate("cerita_budaya.html?slug=" + card.getAttribute("data-cerita-slug"));
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
        const data = BUDAYA_DATA.stories || [];
        const items = budGalleryExpanded ? data : data.slice(0, BUD_TEASER_COUNT);
        slot.innerHTML = items.map((s) => budGalleryHTML(budStoryVM(s))).join("");
        budWireCerita(slot);
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
        budWireDetailCards(slot);
        budPaintToggle(
          document.getElementById("bud-calendar-toggle"),
          budCalendarExpanded,
          "Lihat Semua Agenda \u2192",
          "Tampilkan Lebih Sedikit \u2192"
        );
      }

        budRenderFilterTabs();
       budRenderList();
       budRenderGallery();
       budRenderCalendar();

       // NOTE 2026-10-09 (Owner): tombol toggle Kalender/Galeri kini anchor
       // navigasi (agenda_budaya.html / cerita_budaya.html); expand inline
       // dinonaktifkan — render teaser statis dipertahankan.

       window.addEventListener("budaya:mapchange", () => {
         budPage = 1;
         budRenderList();
       });

       // Kembali dari halaman detail (bfcache): tampilkan SEMUA lagi —
       // filter kategori, halaman, dan peta di-reset (Owner 2026-10-16;
       // pola acara-listing.js, tanpa syarat "filter eksplisit").
       window.addEventListener("pageshow", (e) => {
         if (!e || !e.persisted) return;
         budFilter = "Semua";
         budPage = 1;
         budRenderFilterTabs();
         if (window.PasuruanBudayaMap) {
           try {
             // resetFilters() memicu budaya:mapchange → budRenderList(),
             // jadi JANGAN render manual lagi (hindari render + animasi ganda).
             window.PasuruanBudayaMap.resetFilters();
             return;
           } catch (err) {
             /* gagal memicu peta: fallback render manual di bawah */
           }
         }
         budRenderList();
       });
    
