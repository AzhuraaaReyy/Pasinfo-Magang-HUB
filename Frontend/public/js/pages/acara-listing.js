/**
 * acara-listing.js — dipindah VERBATIM dari inline <script> acara.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // ── Daftar Acara: memakai dataset mock (single source of truth).
      // JANGAN duplikasi data di sini; cukup baca window.PASINFO_ACARA. ──
      // Tiket/registrasi TAMPIL SEBAGAI INFORMASI SAJA (prd.md §19.2):
      // tidak ada booking, payment, atau backend reminder pada tahap ini.
      const ACARA_DATA = window.PASINFO_ACARA || { categories: [], events: [] };
      // FOTO SEMENTARA (Owner 2026-10-14): gambar contoh per domain, dipakai
      // bergilir bila data tidak punya media.url. Ganti dengan foto asli nanti.
      // Owner 2026-10-15: kartu grid kecil → pakai varian thumbnail WebP.
      const ACARA_FALLBACK_PHOTOS = [
        "../../public/assets/images/acara/optimized/bromo-marathon.thumb.webp",
        "../../public/assets/images/acara/optimized/Hari-Jadi-Kota-Pasuruan.thumb.webp",
        "../../public/assets/images/acara/optimized/Pekan-Raya-Pasuruan-(PRP).thumb.webp",
      ];
      function acaraPhotoFor(d) {
        if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
        const key = d && d.id != null ? String(d.id) : "";
        let sum = 0;
        for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
        return ACARA_FALLBACK_PHOTOS[sum % ACARA_FALLBACK_PHOTOS.length];
      }
      function acaraCategoryName(id) {
        const found = (ACARA_DATA.categories || []).filter((x) => x.id === id)[0];
        return found ? found.name : "";
      }
      // Bersihkan penanda mock ("Mock"/"(MOCK)"/"(mock…)") dari teks TAMPILAN.
      // Sumber data tetap mock (lihat data-acara.js); UI tidak boleh memajang kata Mock.
      function evtCleanText(s) {
        if (s == null) return "";
        return String(s)
          .replace(/\s*\(MOCK\)/gi, "")
          .replace(/\s*\(mock[^)]*\)/gi, "")
          .replace(/\s+Mock\b/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim();
      }
      // ──Turunan tampilan dari field schema (event_occurrences/event_tickets).
      // Tipe tiket DITURUNKAN dari price (null/0 = Gratis), jadwal diformat
      // dari starts_at/ends_at. Satu-satunya sumber tanggal = occurrences.──
      const EVT_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const EVT_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const EVT_MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      function evtPad(n) {
        return (n < 10 ? "0" : "") + n;
      }
      function evtFmtFull(startsAt, endsAt) {
        if (!startsAt) return "";
        const s = new Date(startsAt);
        if (isNaN(s.getTime())) return "";
        let t = EVT_DAYS[s.getDay()] + ", " + s.getDate() + " " + EVT_MONTHS[s.getMonth()] + " " + s.getFullYear() +
          " | " + evtPad(s.getHours()) + ":" + evtPad(s.getMinutes());
        if (endsAt) {
          const e = new Date(endsAt);
          if (!isNaN(e.getTime())) t += " - " + evtPad(e.getHours()) + ":" + evtPad(e.getMinutes());
        }
        return t;
      }
      function evtFmtShort(startsAt) {
        if (!startsAt) return "";
        const s = new Date(startsAt);
        if (isNaN(s.getTime())) return "";
        return s.getDate() + " " + EVT_MONTHS_SHORT[s.getMonth()] + " " + s.getFullYear() +
          " · " + evtPad(s.getHours()) + ":" + evtPad(s.getMinutes());
      }
      function evtPriceText(price) {
        if (price == null || Number(price) <= 0 || isNaN(Number(price))) return "";
        return "Rp " + String(Math.round(Number(price))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      }
      const acaraItems = (ACARA_DATA.events || []).map((d) => {
        const occ = d.occurrences && d.occurrences[0] ? d.occurrences[0] : null;
        const price = d.tickets && d.tickets[0] ? d.tickets[0].price : null;
        // Fallback selaras map/detail (integrasi listing↔detail): tipe + info lokasi.
        const ticketType = price != null && Number(price) > 0 ? "Berbayar" : "Gratis";
        return {
          id: d.id,
          name: evtCleanText(d.name) || "Acara Pasuruan",
          slug: d.slug,
          photo: acaraPhotoFor(d),
          category: acaraCategoryName(d.categoryId),
          categoryId: d.categoryId,
          regionId: d.regionId || null,
          short_description: evtCleanText(d.short_description),
          schedule: (occ && evtFmtShort(occ.starts_at)) || "Jadwal menyusul",
          scheduleFull: (occ && evtFmtFull(occ.starts_at, occ.ends_at)) || "",
          location: evtCleanText(d.venue_address) || "Lokasi menyusul, Pasuruan",
          ticketInfo: evtPriceText(price) || (ticketType + " · Info di lokasi acara"),
          featured: !!d.featured,
        };
      });

      // Ikon meta kartu memakai file aset lokal (Owner 2026-10-16).
      // Like/bookmark tetap inline SVG karena butuh toggle fill aktif.
      const EVT_ICON_BASE = "../../public/assets/icons/";
      const EVT_ICON_CAL = '<img src="' + EVT_ICON_BASE + 'icon_kalender.svg" alt="" aria-hidden="true" loading="lazy" class="h-4 w-4 shrink-0 object-contain" />';
      const EVT_ICON_PIN = '<img src="' + EVT_ICON_BASE + 'icon_lokasi-hitam.svg" alt="" aria-hidden="true" loading="lazy" class="h-4 w-4 shrink-0 object-contain" />';
      const EVT_ICON_TAG = '<img src="' + EVT_ICON_BASE + 'icon_harga-tiket.svg" alt="" aria-hidden="true" loading="lazy" class="h-4 w-4 shrink-0 object-contain" />';
      const EVT_ICON_HEART = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';
      const EVT_ICON_BOOKMARK = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.726 48.726 0 017.186 0z" /></svg>';

      // ── LIKE & BOOKMARK (adaptasi pola kuliner-listing.js: toggle
      // aria-pressed + pop WAAPI; state sementara, hilang saat re-render) ──
      const EVT_LIKE_BASE = "text-white bg-black/30 p-1.5 rounded-full hover:text-red-400 transition-all duration-200";
      const EVT_LIKE_ACTIVE = "text-red-500 bg-black/30 p-1.5 rounded-full hover:text-red-400 transition-all duration-200";
      const EVT_BOOKMARK_BASE = "text-white bg-black/30 p-1.5 rounded-full hover:text-yellow-400 transition-all duration-200";
      const EVT_BOOKMARK_ACTIVE = "text-yellow-400 bg-black/30 p-1.5 rounded-full hover:text-yellow-400 transition-all duration-200";

      function evtToggleSocialButton(btn, activeClass, baseClass) {
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

      const evtGrid = document.getElementById("evt-grid");
      const evtEmpty = document.getElementById("evt-empty");
      const evtCount = document.getElementById("evt-count");
      const evtFiltersWrap = document.getElementById("evt-filters");
       const EVT_FILTER_BASE = "px-4 py-1.5 rounded-md text-xs font-medium whitespace-nowrap";
       const EVT_FILTER_ACTIVE = "bg-green-600 text-white";
       const EVT_FILTER_IDLE = "bg-green-100 text-green-700";

       function evtCardHTML(d) {
           let meta = "";
           if (d.schedule) {
             meta += '<div class="flex items-center gap-1.5">' + EVT_ICON_CAL + "<span>" + d.schedule + "</span></div>";
           }
           if (d.location) {
             meta += '<div class="flex items-center gap-1.5">' + EVT_ICON_PIN + "<span>" + d.location + "</span></div>";
           }
           // Informasi tiket SAJA (teks). Bukan booking/payment.
           if (d.ticketInfo) {
             meta += '<div class="flex items-center gap-1.5 font-semibold text-gray-700">' + EVT_ICON_TAG + "<span>" + d.ticketInfo + "</span></div>";
           }
           const mediaInner = d.photo
             ? '<img src="' + d.photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />'
             : '<div class="w-full h-full bg-gradient-to-b from-violet-800 via-slate-700 to-slate-800" role="img" aria-label="Foto acara ' + d.name + ' (placeholder)"></div>';
           return (
             '<article data-evt-id="' +
             d.id +
             '" data-evt-slug="' +
             d.slug +
             '" data-evt-region="' +
             (d.regionId || "") +
             '" class="group h-full bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden flex flex-col cursor-pointer hover:-translate-y-2 hover:scale-[1.015] hover:shadow-2xl transition-all duration-300 ease-out will-change-transform">' +
               '<div class="relative h-44 sm:h-48 lg:h-52 overflow-hidden">' +
                 mediaInner +
                 '<span class="absolute top-2 left-2 bg-green-600 text-white text-[10px] px-2 py-0.5 rounded">' + d.category + "</span>" +
                 '<div class="absolute top-2 right-2 flex items-center gap-1.5">' +
                   '<button type="button" data-like-btn aria-label="Sukai ' + d.name + '" aria-pressed="false" class="' + EVT_LIKE_BASE + '">' + EVT_ICON_HEART + "</button>" +
                   '<button type="button" data-bookmark-btn aria-label="Simpan ' + d.name + '" aria-pressed="false" class="' + EVT_BOOKMARK_BASE + '">' + EVT_ICON_BOOKMARK + "</button>" +
                 "</div>" +
               "</div>" +
               '<div class="p-4 flex flex-1 flex-col">' +
                 '<h3 class="font-bold text-xl text-gray-900 uppercase leading-snug line-clamp-2">' + d.name + "</h3>" +
                 '<p class="text-sm text-gray-500 mt-1.5 leading-relaxed line-clamp-2">' + d.short_description + "</p>" +
                '<div class="pt-3 mt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1.5">' + meta + "</div>" +
                '<div class="mt-auto pt-3 flex items-center justify-end gap-1">' +
                  '<a href="detail_acara.html?slug=' + d.slug + '" class="evt-btn-green inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-600 text-white text-[10px] sm:text-[11px] font-bold transition-colors" title="Lihat detail ' + d.name + '">Lihat Detail <span aria-hidden="true">→</span></a>' +
                "</div>" +
              "</div>" +
            "</article>"
          );
        }

      let evtFilter = "Semua";
      let evtPage = 1;
      // Pagination responsif (pola Kuliner/Budaya): mobile 6 / tablet 9 / desktop 12.
      // Breakpoint selaras grid: <640 → 1 kolom, <1024 → 3 kolom, ≥1024 → 4 kolom.
      function evtPerPage() {
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
      let EVT_PER_PAGE = evtPerPage();
      let evtPerPageCached = EVT_PER_PAGE;
      const evtPager = document.getElementById("evt-pager");
      const EVT_PAGER_BASE = "min-w-[2rem] h-8 px-2 rounded-md text-xs font-bold transition-colors";
       const EVT_PAGER_ACTIVE = "bg-green-600 text-white";
       const EVT_PAGER_IDLE = "bg-white text-slate-600 ring-1 ring-gray-200 hover:bg-gray-100";

      function evtPaintFilterTabs() {
        if (!evtFiltersWrap) return;
        Array.from(evtFiltersWrap.querySelectorAll("[data-filter-btn]")).forEach((b) => {
          const isOn = b.getAttribute("data-filter") === evtFilter;
          b.setAttribute("aria-pressed", isOn ? "true" : "false");
          b.className = EVT_FILTER_BASE + " " + (isOn ? EVT_FILTER_ACTIVE : EVT_FILTER_IDLE);
        });
      }

      function evtRenderFilterTabs() {
        if (!evtFiltersWrap) return;
        const cats = ["Semua"].concat((ACARA_DATA.categories || []).map((c) => c.name));
        evtFiltersWrap.innerHTML = "";
        cats.forEach((name) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.setAttribute("data-filter-btn", "");
          btn.setAttribute("data-filter", name);
          const on = name === evtFilter;
          btn.setAttribute("aria-pressed", on ? "true" : "false");
          btn.className = EVT_FILTER_BASE + " " + (on ? EVT_FILTER_ACTIVE : EVT_FILTER_IDLE);
          btn.textContent = name;
          btn.addEventListener("click", () => {
            evtFilter = name;
            evtPage = 1;
            evtPaintFilterTabs();
            // Teruskan kategori ke peta agar marker ikut tersaring (aman dari loop:
            // mapchange dari peta hanya me-render ulang daftar).
            if (window.PasuruanAcaraMap) {
              try {
                const found = (ACARA_DATA.categories || []).filter((c) => c.name === name)[0];
                window.PasuruanAcaraMap.selectCategory(found ? found.id : null);
              } catch (err) {
                /* abaikan: daftar tetap terfilter lokal */
              }
            }
            evtRenderList();
          });
          evtFiltersWrap.appendChild(btn);
        });
      }

      // Wilayah aktif dibaca dari state peta (pola sama seperti Budaya):
      // klik wilayah di map → daftar ikut terfilter; klik lagi → reset ke semua.
      function evtMapRegion() {
        try {
          if (window.PasuruanAcaraMap) return window.PasuruanAcaraMap.getState().selectedRegion;
        } catch (err) {
          /* abaikan: grid tampil tanpa filter wilayah */
        }
        return null;
      }
      function evtRegionName(id) {
        const found = (ACARA_DATA.regions || []).filter((r) => r.id === id)[0];
        return found ? found.name : id;
      }
      function evtFilteredList() {
        const region = evtMapRegion();
        return acaraItems.filter((d) => {
          if (evtFilter !== "Semua" && d.category !== evtFilter) return false;
          if (region && d.regionId !== region) return false;
          return true;
        });
      }

      function evtTotalPages(list) {
        const per = evtPerPage();
        return Math.max(1, Math.ceil((list ? list.length : 0) / per));
      }

      function evtRenderPager(pages) {
        if (!evtPager) return;
        if (pages <= 1) {
          evtPager.innerHTML = "";
          return;
        }
        let html =
          '<button type="button" data-pager-prev aria-label="Halaman sebelumnya" ' +
          (evtPage <= 1 ? "disabled" : "") +
          ' class="' + EVT_PAGER_BASE + " " + EVT_PAGER_IDLE + ' disabled:opacity-40">&lsaquo;</button>';
        for (let i = 1; i <= pages; i++) {
          const on = i === evtPage;
          html +=
            '<button type="button" data-page-btn data-page="' + i + '" ' +
            (on ? 'aria-current="page" ' : "") +
            'aria-label="Halaman ' + i + '" class="' + EVT_PAGER_BASE + " " + (on ? EVT_PAGER_ACTIVE : EVT_PAGER_IDLE) + '">' + i + "</button>";
        }
        html +=
          '<button type="button" data-pager-next aria-label="Halaman berikutnya" ' +
          (evtPage >= pages ? "disabled" : "") +
          ' class="' + EVT_PAGER_BASE + " " + EVT_PAGER_IDLE + ' disabled:opacity-40">&rsaquo;</button>';
        evtPager.innerHTML = html;
        const prev = evtPager.querySelector("[data-pager-prev]");
        const next = evtPager.querySelector("[data-pager-next]");
        if (prev) prev.addEventListener("click", () => evtGoPage(evtPage - 1));
        if (next) next.addEventListener("click", () => evtGoPage(evtPage + 1));
        Array.from(evtPager.querySelectorAll("[data-page-btn]")).forEach((b) => {
          b.addEventListener("click", () => evtGoPage(parseInt(b.getAttribute("data-page"), 10)));
        });
      }

      // ── Transisi pagination halus (adaptasi pola wisata-listing.js:
      // fade-out grid lama → render baru → tween tinggi grid lama→baru agar
      // pager/iklan di bawah tidak melompat, mis. 12 kartu → 4 kartu).
      // Hormati prefers-reduced-motion; fallback instan bila tanpa WAAPI. ──
      let evtRenderToken = 0;
      let evtGridResizeAnim = null;
      let evtGridResizeClearRaf = 0;

      function animateEvtGridResize(container, fromHeight) {
        if (!container.animate) return;
        const reducedMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reducedMotion) return;
        const toHeight = container.offsetHeight;
        if (!fromHeight || fromHeight === toHeight) return;
        if (evtGridResizeAnim) {
          try { evtGridResizeAnim.cancel(); } catch (err) { /* abaikan */ }
        }
        if (evtGridResizeClearRaf) {
          cancelAnimationFrame(evtGridResizeClearRaf);
          evtGridResizeClearRaf = 0;
        }
        container.style.overflow = "hidden";
        container.style.height = fromHeight + "px";
        void container.offsetHeight; // commit tinggi awal (hindari kedip 1 frame)
        const anim = container.animate(
          [{ height: fromHeight + "px" }, { height: toHeight + "px" }],
          { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
        );
        evtGridResizeAnim = anim;
        const done = () => {
          if (evtGridResizeAnim !== anim) return; // sudah digantikan animasi baru
          evtGridResizeAnim = null;
          container.style.height = toHeight + "px"; // jaga tinggi akhir
          container.style.overflow = "";
          try { anim.cancel(); } catch (err) { /* abaikan */ }
          evtGridResizeClearRaf = requestAnimationFrame(() => {
            evtGridResizeClearRaf = 0;
            container.style.height = ""; // kembali ke auto
          });
        };
        anim.onfinish = done;
      }

      // ── ANIMASI FADE-IN (konsep GSAP, vanilla WAAPI) — paritas kuliner ──
      function animateEvtCardsIn(container) {
        const cards = Array.from(container.querySelectorAll("[data-evt-slug]"));
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

      function evtGoPage(page) {
        const pages = evtTotalPages(evtFilteredList());
        const next = Math.max(1, Math.min(pages, page));
        if (next === evtPage) return;
        evtPage = next;
        const token = ++evtRenderToken;
        const reducedMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const section = evtGrid ? (evtGrid.closest("section") || evtGrid) : null;
        if (section) {
          try { section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }); } catch (e) {}
        }
        if (evtGrid && evtGrid.animate && !reducedMotion && evtGrid.children.length > 0 && !evtGrid.classList.contains("hidden")) {
          const startHeight = evtGrid.offsetHeight;
          const out = evtGrid.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 200, easing: "ease-in" },
          );
          out.onfinish = () => {
            if (token === evtRenderToken) evtRenderList(startHeight);
          };
        } else {
          evtRenderList();
        }
      }

      function evtRenderList(fromHeight) {
        if (!evtGrid) return;
        const per = evtPerPage();
        EVT_PER_PAGE = per;
        evtPerPageCached = per;
        const list = evtFilteredList();
        const pages = evtTotalPages(list);
        if (evtPage > pages) evtPage = pages;
        if (evtPage < 1) evtPage = 1;
        const startIdx = (evtPage - 1) * per;
        const items = list.slice(startIdx, startIdx + per);
        const prevHeight = typeof fromHeight === "number" ? fromHeight : evtGrid.offsetHeight;
        evtGrid.innerHTML = items.map(evtCardHTML).join("");
        const empty = list.length === 0;
        if (evtEmpty) evtEmpty.classList.toggle("hidden", !empty);
        evtGrid.classList.toggle("hidden", empty);
        if (!empty) {
          animateEvtGridResize(evtGrid, prevHeight);
          animateEvtCardsIn(evtGrid);
        }
        const region = evtMapRegion();
        if (evtCount) {
          evtCount.textContent = "Menampilkan " + list.length + " acara" +
            (evtFilter !== "Semua" ? ' pada kategori "' + evtFilter + '"' : "") +
            (region ? ' di wilayah "' + evtRegionName(region) + '"' : "") +
            ".";
        }
        evtRenderPager(pages);
      }

      // Like & bookmark kartu (adaptasi pola kuliner-listing.js: event delegation
      // pada grid agar tetap bekerja setelah render ulang filter/pagination).
      // Handler grid-select di bawah sudah mengabaikan klik button, jadi tidak konflik.
      function evtWireSocial() {
        if (!evtGrid) return;
        evtGrid.addEventListener("click", (e) => {
          const likeBtn = e.target.closest("[data-like-btn]");
          if (likeBtn) {
            e.stopPropagation();
            evtToggleSocialButton(likeBtn, EVT_LIKE_ACTIVE, EVT_LIKE_BASE);
            return;
          }
          const bookmarkBtn = e.target.closest("[data-bookmark-btn]");
          if (bookmarkBtn) {
            e.stopPropagation();
            evtToggleSocialButton(bookmarkBtn, EVT_BOOKMARK_ACTIVE, EVT_BOOKMARK_BASE);
            return;
          }
        });
      }

      // Klik badan kartu → LANGSUNG ke halaman detail (Owner 2026-10-16:
      // tanpa tirai transisi dan tanpa sinkron peta dulu — sinkron memicu
      // render ulang grid + animasi kartu yang terlihat seperti kartu
      // "ditarik ke atas" sebelum pindah; pekerjaan mati sebelum unload).
      function evtWireGridSelect() {
        if (!evtGrid) return;
        evtGrid.addEventListener("click", (e) => {
          if (e.target.closest("button") || e.target.closest("a")) return;
          const card = e.target.closest("[data-evt-id]");
          if (!card) return;
          const slug = card.getAttribute("data-evt-slug");
          if (slug) window.location.href = "detail_acara.html?slug=" + slug;
        });
      }

      // ── Sorotan "Event Pasuruan Hari Ini" (sesuai mockup acara.png) ──
      // DITURUNKAN dari occurrences (sumber: mock, lihat data-acara.js):
      // sedang-berlangsung → upcoming terdekat → (fallback) 3 terakhir.
      // Tanpa kata "Mock" pada tampilan; tanpa booking/payment
      // (PRD §19.2: tiket display-only).
      const EVT_FALLBACK_ORG = "Dinas Kebudayaan Kab. Pasuruan";
      const EVT_FALLBACK_LOC = "Lokasi menyusul, Pasuruan";
      const EVT_STATUS_LABEL = { live: "Sedang Berlangsung", soon: "Akan Datang", done: "Selesai" };

      function evtComputeHeroes() {
        const now = Date.now();
        const items = [];
        (ACARA_DATA.events || []).forEach((ev) => {
          const occ = ev.occurrences && ev.occurrences[0];
          if (!occ || !occ.starts_at) return;
          const s = new Date(occ.starts_at).getTime();
          if (isNaN(s)) return;
          const eRaw = occ.ends_at ? new Date(occ.ends_at).getTime() : s;
          const e = isNaN(eRaw) ? s : eRaw;
          items.push({ ev, sStr: occ.starts_at, eStr: occ.ends_at || occ.starts_at, s, e });
        });
        const live = items.filter((i) => now >= i.s && now <= i.e).sort((a, b) => a.s - b.s);
        const upcoming = items.filter((i) => i.s > now).sort((a, b) => a.s - b.s);
        let list = live.concat(upcoming).slice(0, 3);
        let done = false;
        if (!list.length) {
          list = items.sort((a, b) => b.e - a.e).slice(0, 3);
          done = true;
        }
        return list.map((i) => {
          const status = done ? "done" : (now >= i.s && now <= i.e ? "live" : "soon");
          return {
            title: evtCleanText(i.ev.name) || "Acara Pasuruan",
            slug: i.ev.slug,
            schedule: evtFmtFull(i.sStr, i.eStr) || "Jadwal menyusul",
            organizer: evtCleanText(i.ev.organizer_name) || EVT_FALLBACK_ORG,
            location: evtCleanText(i.ev.venue_address) || EVT_FALLBACK_LOC,
            description: evtCleanText(i.ev.short_description),
            status,
            target: status === "live" ? i.e : (status === "soon" ? i.s : 0),
          };
        });
      }
      function evtTodayHeroes() {
        return evtComputeHeroes();
      }
      let evtTodayIndex = 0;
      let evtSwipeSuppressClick = false;

      function evtRenderTodayHero() {
        const titleEl = document.getElementById("evt-today-title");
        if (!titleEl) return;
        const heroes = evtTodayHeroes();
        if (!heroes.length) return;
        if (evtTodayIndex >= heroes.length) evtTodayIndex = 0;
        const d = heroes[evtTodayIndex % heroes.length];
        titleEl.textContent = d.title;
        const badge = document.querySelector("#evt-today-hero span.inline-block");
        if (badge) badge.textContent = EVT_STATUS_LABEL[d.status] || d.status;
        const sched = document.querySelector("[data-evt-schedule-text]") || document.getElementById("evt-today-schedule");
        if (sched) sched.textContent = d.schedule;
        const org = document.querySelector("[data-evt-org-text]") || document.getElementById("evt-today-org");
        if (org) org.textContent = d.organizer;
        const locText = document.querySelector("[data-evt-loc-text]");
        if (locText) locText.textContent = d.location || "";
        const desc = document.getElementById("evt-today-desc");
        if (desc) desc.textContent = "";
        const poster = document.getElementById("evt-today-poster-text");
        if (poster) {
          var headline = "";
          if (/caknan/i.test(d.title)) headline = "DENNY CAKNAN";
          else if (/fun run/i.test(d.title)) headline = "FUN RUN";
          else if (/wayang/i.test(d.title)) headline = "WAYANG KULIT";
          else {
            var words = (d.title || "").split(" ").filter(Boolean).slice(-2);
            headline = words.join(" ").toUpperCase() || "ACARA";
          }
          poster.innerHTML = headline.replace(/ /g, "<br />");
        }
        const dots = document.getElementById("evt-today-dots");
        if (dots) {
          // Dots sebagai switch klik (button): aktif biru memanjang, nonaktif abu.
          const total = evtTodayHeroes().length || 1;
          const active = total ? evtTodayIndex % total : 0;
          dots.innerHTML = "";
          for (let i = 0; i < total; i++) {
            const on = i === active;
            const b = document.createElement("button");
            b.type = "button";
            b.setAttribute("role", "tab");
            b.setAttribute("aria-selected", on ? "true" : "false");
            b.setAttribute("aria-label", "Tampilkan sorotan ke-" + (i + 1));
            b.className = (on ? "w-6 h-2 bg-green-600" : "w-2 h-2 bg-gray-300") + " rounded-full";
            (function (idx) {
              b.addEventListener("click", () => {
                evtTodayIndex = idx;
                evtRenderTodayHero();
              });
            })(i);
            dots.appendChild(b);
          }
        }
      }

      function evtStepTodayHero(dir) {
        const total = evtTodayHeroes().length || 1;
        evtTodayIndex = (evtTodayIndex + dir + total) % total;
        evtRenderTodayHero();
        evtSyncCountdown(true);
      }

      // Countdown DITURUNKAN dari occurrence sorotan aktif: menuju mulai
      // (Akan Datang) atau menuju selesai (Sedang Berlangsung). Tiap detik
      // dihitung ulang dari jam berjalan; saat mencapai nol, sorotan ikut
      // dihitung ulang (status bisa berbalik).
      let evtCountdown = 0;
      function evtPaintCountdown() {
        const rest = Math.max(0, evtCountdown);
        const d = Math.floor(rest / 86400);
        const h = Math.floor((rest % 86400) / 3600);
        const m = Math.floor((rest % 3600) / 60);
        const s = rest % 60;
        const pad = (n) => (n < 10 ? "0" + n : "" + n);
        const dEl = document.getElementById("evt-cd-d");
        const hEl = document.getElementById("evt-cd-h");
        const mEl = document.getElementById("evt-cd-m");
        const sEl = document.getElementById("evt-cd-s");
        if (dEl) dEl.textContent = pad(d);
        if (hEl) hEl.textContent = pad(h);
        if (mEl) mEl.textContent = pad(m);
        if (sEl) sEl.textContent = pad(s);
      }
      function evtSyncCountdown(repaint) {
        const heroes = evtTodayHeroes();
        if (!heroes.length) {
          evtCountdown = 0;
        } else {
          if (evtTodayIndex >= heroes.length) evtTodayIndex = 0;
          const h = heroes[evtTodayIndex % heroes.length];
          evtCountdown = h.target ? Math.max(0, Math.round((h.target - Date.now()) / 1000)) : 0;
        }
        if (repaint) {
          evtRenderTodayHero();
          evtPaintCountdown();
        }
      }
      function evtStartCountdown() {
        evtSyncCountdown(true);
        const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) return;
        window.setInterval(() => {
          const before = evtTodayHeroes()[evtTodayIndex % (evtTodayHeroes().length || 1)];
          evtSyncCountdown(false);
          const after = evtTodayHeroes()[evtTodayIndex % (evtTodayHeroes().length || 1)];
          if ((!before && after) || (before && after && (before.slug !== after.slug || before.status !== after.status))) {
            evtRenderTodayHero();
          }
          evtPaintCountdown();
        }, 1000);
      }

      // ── Kalender mini: titik DITURUNKAN dari occurrences (sumber: mock).
      // Warna titik mengikuti kategori event (legend tidak diubah). ──
      const EVT_CAT_DOT = {
        kesenian: "bg-amber-400",
        tradisi: "bg-red-500",
        sejarah: "bg-blue-500",
        museum: "bg-emerald-500",
      };
      let evtCalY, evtCalM;
      let evtCalSel = null;
      (function evtCalInitMonth() {
        const n = new Date();
        evtCalY = n.getFullYear();
        evtCalM = n.getMonth();
      })();
      const EVT_CAL_MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
      function evtCalDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
      // Peta tanggal → { color, items:[{title,slug}] } untuk bulan tampil.
      // Sumber sama dengan titik kategori (occurrences[0]); dipakai untuk
      // merender kalender sekaligus panel info tanggal aktif.
      function evtOccDayMap(y, m) {
        const map = {};
        (ACARA_DATA.events || []).forEach((ev) => {
          const occ = ev.occurrences && ev.occurrences[0];
          if (!occ || !occ.starts_at) return;
          const s = new Date(occ.starts_at);
          if (isNaN(s.getTime())) return;
          const eRaw = occ.ends_at ? new Date(occ.ends_at) : s;
          const e = isNaN(eRaw.getTime()) ? s : eRaw;
          const col = EVT_CAT_DOT[ev.categoryId] || "bg-gray-400";
          let d = new Date(s.getFullYear(), s.getMonth(), s.getDate());
          const end = new Date(e.getFullYear(), e.getMonth(), e.getDate());
          for (let k = 0; k < 62 && d <= end; k++) {
            if (d.getFullYear() === y && d.getMonth() === m) {
              const day = d.getDate();
              if (!map[day]) map[day] = { color: col, items: [] };
              map[day].items.push({ title: evtCleanText(ev.name) || "Acara Pasuruan", slug: ev.slug });
            }
            d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
          }
        });
        return map;
      }
      function evtRenderCalendarInfo() {
        const box = document.getElementById("evt-cal-info");
        if (!box) return;
        if (!evtCalSel) {
          box.innerHTML = "";
          box.classList.add("hidden");
          return;
        }
        const entry = evtOccDayMap(evtCalSel.y, evtCalSel.m)[evtCalSel.d];
        const items = entry ? entry.items : [];
        const tgl = evtCalSel.d + " " + EVT_CAL_MONTHS[evtCalSel.m] + " " + evtCalSel.y;
        let html = '<p class="font-semibold text-gray-700">Acara ' + tgl + "</p>";
        if (!items.length) {
          html += '<p class="mt-1 text-gray-400">Belum ada acara pada tanggal ini.</p>';
        } else {
          html += '<ul class="mt-1 space-y-1">' + items.map((it) =>
            '<li><a class="evt-link-green text-green-700 font-semibold hover:underline" href="detail_acara.html?slug=' + it.slug + '">' + it.title + "</a></li>"
          ).join("") + "</ul>";
        }
        box.innerHTML = html;
        box.classList.remove("hidden");
      }
      function evtRenderCalendar() {
        const titleEl = document.getElementById("evt-cal-title");
        const grid = document.getElementById("evt-cal-grid");
        if (!titleEl || !grid) return;
        titleEl.textContent = EVT_CAL_MONTHS[evtCalM] + " " + evtCalY;
        const dayMap = evtOccDayMap(evtCalY, evtCalM);
        const off = (new Date(evtCalY, evtCalM, 1).getDay() + 6) % 7; // Senin-pertama
        const days = evtCalDaysInMonth(evtCalY, evtCalM);
        const prevDays = evtCalDaysInMonth(evtCalY, evtCalM - 1);
        const now = new Date();
        const isRealMonth = evtCalY === now.getFullYear() && evtCalM === now.getMonth();
        let html = "";
        const total = Math.ceil((off + days) / 7) * 7;
        for (let i = 0; i < total; i++) {
          const dayNum = i - off + 1;
          if (i < off) {
            // Tanggal bulan sebelumnya (abu)
            html += '<span class="py-1 text-gray-300" aria-disabled="true">' + (prevDays - off + 1 + i) + "</span>";
          } else if (dayNum > days) {
            // Tanggal bulan berikutnya (abu)
            html += '<span class="py-1 text-gray-300" aria-disabled="true">' + (dayNum - days) + "</span>";
          } else {
            const entry = dayMap[dayNum] || null;
            const dotHtml = entry ? '<span class="absolute left-1/2 -translate-x-1/2 bottom-0 h-1 w-1 rounded-full ' + entry.color + '"></span>' : "";
            const isToday = isRealMonth && dayNum === now.getDate();
            const isSel = evtCalSel && evtCalSel.y === evtCalY && evtCalSel.m === evtCalM && evtCalSel.d === dayNum;
            if (isSel) {
              // Tanggal aktif terpilih — aksen hijau (warna domain acara).
              html += '<button type="button" data-evt-cal-day="' + dayNum + '" aria-pressed="true" class="py-1 rounded-full bg-green-600 text-white font-bold relative">' + dayNum + dotHtml + "</button>";
            } else if (isToday) {
              // Hari ini — highlight hijau domain + titik kategori.
              html += '<button type="button" data-evt-cal-day="' + dayNum + '" class="py-1 rounded-full bg-green-600 text-white font-bold relative" title="Hari ini">' + dayNum + dotHtml + "</button>";
            } else if (entry) {
              html += '<button type="button" data-evt-cal-day="' + dayNum + '" aria-label="Lihat acara tanggal ' + dayNum + '" class="py-1 relative rounded hover:ring-1 hover:ring-gray-300">' + dayNum + dotHtml + "</button>";
            } else {
              html += '<span class="py-1">' + dayNum + "</span>";
            }
          }
        }
        grid.innerHTML = html;
        evtRenderCalendarInfo();
      }
      function evtStepCalendar(dir) {
        evtCalSel = null;
        evtCalM += dir;
        if (evtCalM < 0) { evtCalM = 11; evtCalY -= 1; }
        if (evtCalM > 11) { evtCalM = 0; evtCalY += 1; }
        evtRenderCalendar();
      }

      evtRenderFilterTabs();
      evtWireGridSelect();
      evtWireSocial();
      evtRenderList();
      evtRenderTodayHero();
      evtRenderCalendar();
      evtStartCountdown();

      const evtTodayPrev = document.getElementById("evt-today-prev");
      if (evtTodayPrev) evtTodayPrev.addEventListener("click", () => evtStepTodayHero(-1));
      const evtTodayNext = document.getElementById("evt-today-next");
      if (evtTodayNext) evtTodayNext.addEventListener("click", () => evtStepTodayHero(1));
      // Geser sorotan dengan jari (mobile/tablet); desktop tetap tombol panah.
      // Ambang 40px horizontal & harus lebih dominan dari gerak vertikal agar
      // scroll halaman tetap wajar; klik setelah swipe ditahan 400ms supaya
      // tidak ikut membuka halaman detail.
      const evtTodayWrap = document.getElementById("evt-today-wrap");
      if (evtTodayWrap) {
        let swipeStartX = 0, swipeStartY = 0;
        evtTodayWrap.addEventListener("touchstart", (e) => {
          if (!e.touches || e.touches.length !== 1) return;
          swipeStartX = e.touches[0].clientX;
          swipeStartY = e.touches[0].clientY;
        }, { passive: true });
        evtTodayWrap.addEventListener("touchend", (e) => {
          const t = (e.changedTouches && e.changedTouches[0]) || null;
          if (!t) return;
          const dx = t.clientX - swipeStartX;
          const dy = t.clientY - swipeStartY;
          if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
          evtStepTodayHero(dx < 0 ? 1 : -1);
          evtSwipeSuppressClick = true;
          window.setTimeout(() => { evtSwipeSuppressClick = false; }, 400);
        }, { passive: true });
      }
      // Klik kartu sorotan Hari Ini → halaman detail acara (tanpa mengubah tampilan hero/kalender).
      const evtTodayHero = document.getElementById("evt-today-hero");
      if (evtTodayHero) {
        evtTodayHero.classList.add("cursor-pointer");
        evtTodayHero.addEventListener("click", (e) => {
          if (evtSwipeSuppressClick) return;
          if (e.target.closest("button") || e.target.closest("a")) return;
          const heroes = evtTodayHeroes();
          const d = heroes.length ? heroes[evtTodayIndex % heroes.length] : null;
          if (d && d.slug) window.location.href = "detail_acara.html?slug=" + d.slug;
        });
      }
      const evtCalPrev = document.getElementById("evt-cal-prev");
      if (evtCalPrev) evtCalPrev.addEventListener("click", () => evtStepCalendar(-1));
      const evtCalNext = document.getElementById("evt-cal-next");
      if (evtCalNext) evtCalNext.addEventListener("click", () => evtStepCalendar(1));
      // Klik tanggal ber-acara → panel info (nama acara + link detail).
      // Klik tanggal yang sama sekali lagi → tutup panel.
      const evtCalGrid = document.getElementById("evt-cal-grid");
      if (evtCalGrid) {
        evtCalGrid.addEventListener("click", (e) => {
          const btn = e.target.closest("[data-evt-cal-day]");
          if (!btn || !evtCalGrid.contains(btn)) return;
          const day = parseInt(btn.getAttribute("data-evt-cal-day"), 10);
          if (isNaN(day)) return;
          const same = evtCalSel && evtCalSel.y === evtCalY && evtCalSel.m === evtCalM && evtCalSel.d === day;
          evtCalSel = same ? null : { y: evtCalY, m: evtCalM, d: day };
          evtRenderCalendar();
        });
      }

      // Sinkron Map → Daftar (pola Budaya): klik wilayah → filter grid + reset ke hal. 1;
      // klik lagi → tampil semua. Kategori (#evt-filters) dikombinasikan dengan region.
      // Sorotan Hari Ini TIDAK ikut terfilter (tetap tampil).
      window.addEventListener("acara:mapchange", () => {
        evtPage = 1;
        evtRenderList();
      });

      // Kembali dari halaman detail (bfcache): tampilkan SEMUA lagi —
      // filter kategori, halaman, dan peta di-reset (Owner 2026-10-16).
      window.addEventListener("pageshow", (e) => {
        if (!e || !e.persisted) return;
        evtFilter = "Semua";
        evtPage = 1;
        evtPaintFilterTabs();
        if (window.PasuruanAcaraMap) {
          try {
            window.PasuruanAcaraMap.resetFilters();
          } catch (err) {
            /* abaikan: daftar tetap di-render di bawah */
          }
        }
        evtRenderList();
      });

      // Resize responsif pagination (debounced ~200ms, pola Kuliner/Budaya):
      // re-render hanya bila perPage berubah; clamp evtPage agar tetap valid.
      let evtResizeTimer = null;
      window.addEventListener("resize", () => {
        try {
          if (evtResizeTimer) clearTimeout(evtResizeTimer);
          evtResizeTimer = setTimeout(() => {
            try {
              const next = evtPerPage();
              if (next !== evtPerPageCached) {
                evtPerPageCached = next;
                EVT_PER_PAGE = next;
                const pages = evtTotalPages(evtFilteredList());
                if (evtPage > pages) evtPage = pages;
                if (evtPage < 1) evtPage = 1;
                evtRenderList();
              }
            } catch (err) { /* abaikan: grid tetap tampil */ }
          }, 200);
        } catch (err) { /* abaikan */ }
      });
    
