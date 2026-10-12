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
      const acaraItems = (ACARA_DATA.events || []).map((d) => ({
        id: d.id,
        name: evtCleanText(d.name) || "Acara Pasuruan",
        slug: d.slug,
        photo: d.media && d.media[0] ? d.media[0].url : null,
        category: acaraCategoryName(d.categoryId),
        categoryId: d.categoryId,
        regionId: d.regionId || null,
        short_description: evtCleanText(d.short_description),
        schedule: evtCleanText(d.occurrences && d.occurrences[0] ? d.occurrences[0].label : null) || "Jadwal menyusul",
        location: evtCleanText(d.venue_address) || "Lokasi menyusul, Pasuruan",
        ticketType: d.tickets && d.tickets[0] ? d.tickets[0].ticket_type : null,
        ticketInfo: evtCleanText(d.tickets && d.tickets[0] ? d.tickets[0].price_label : null) || "Informasi tiket menyusul",
        featured: !!d.featured,
      }));

      const EVT_ICON_CAL = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>';
      const EVT_ICON_PIN = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>';
      const EVT_ICON_TAG = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" /></svg>';
      const EVT_ICON_HEART = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';
      const EVT_ICON_BOOKMARK = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.726 48.726 0 017.186 0z" /></svg>';

      const evtGrid = document.getElementById("evt-grid");
      const evtEmpty = document.getElementById("evt-empty");
      const evtCount = document.getElementById("evt-count");
      const evtFiltersWrap = document.getElementById("evt-filters");
       const EVT_FILTER_BASE = "px-3 sm:px-4 py-1.5 rounded-md text-xs font-medium whitespace-nowrap";
       const EVT_FILTER_ACTIVE = "bg-blue-600 text-white";
       const EVT_FILTER_IDLE = "bg-blue-100 text-blue-700";

      function evtTicketBadge(type) {
        if (type === "Gratis") {
          return '<span class="absolute top-2 left-2 bg-green-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded">Gratis</span>';
        }
        if (type === "Berbayar") {
          return '<span class="absolute top-2 left-2 bg-amber-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded">Berbayar</span>';
        }
        return "";
      }

       function evtCardHTML(d) {
          let meta = "";
          if (d.schedule) {
            meta += '<div class="flex items-center gap-1 text-[10px] sm:text-[10px] md:text-[11px]">' + EVT_ICON_CAL + "<span>" + d.schedule + "</span></div>";
          }
          if (d.location) {
            meta += '<div class="flex items-center gap-1 text-[10px] sm:text-[10px] md:text-[11px]">' + EVT_ICON_PIN + "<span>" + d.location + "</span></div>";
          }
          // Informasi tiket SAJA (teks). Bukan booking/payment.
          if (d.ticketInfo) {
            meta += '<div class="flex items-center gap-1 text-[10px] sm:text-[10px] md:text-[11px]">' + EVT_ICON_TAG + "<span>" + d.ticketInfo + "</span></div>";
          }
          const mediaInner = d.photo
            ? '<img src="' + d.photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-full object-cover" />'
            : '<div class="w-full h-full bg-gradient-to-b from-violet-800 via-slate-700 to-slate-800" role="img" aria-label="Foto acara ' + d.name + ' (placeholder)"></div>';
          return (
            '<article data-evt-id="' +
            d.id +
            '" data-evt-slug="' +
            d.slug +
            '" data-evt-region="' +
            (d.regionId || "") +
            '" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">' +
              '<div class="relative h-32 sm:h-40 md:h-48 overflow-hidden shrink-0">' +
                mediaInner +
                evtTicketBadge(d.ticketType) +
                '<div class="absolute top-2 right-2 flex items-center gap-1.5">' +
                  '<button type="button" aria-label="Sukai ' + d.name + '" class="text-white bg-black/30 p-1 rounded-full hover:text-red-400 transition-colors">' + EVT_ICON_HEART + "</button>" +
                  '<button type="button" aria-label="Simpan ' + d.name + '" class="text-white bg-black/30 p-1 rounded-full hover:text-red-400 transition-colors">' + EVT_ICON_BOOKMARK + "</button>" +
                "</div>" +
              "</div>" +
              '<div class="p-2.5 sm:p-3 md:p-3 flex flex-1 flex-col">' +
                '<span class="text-[9px] sm:text-[10px] md:text-[10px] font-bold uppercase tracking-wider text-blue-600">' + d.category + "</span>" +
                '<h3 class="font-bold text-xs sm:text-sm md:text-sm text-gray-900 uppercase mt-1">' + d.name + "</h3>" +
                '<p class="text-[10px] sm:text-[11px] md:text-[11px] text-gray-500 mt-1.5 line-clamp-2">' + d.short_description + "</p>" +
                '<div class="mt-2 text-gray-500 space-y-0.5">' + meta + "</div>" +
                '<div class="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-1">' +
                  '<a href="detail_acara.html?slug=' + d.slug + '" class="inline-flex items-center text-[9px] sm:text-[10px] md:text-[11px] font-bold text-blue-600 hover:text-blue-700 truncate" title="Lihat detail ' + d.name + '">Lihat Detail</a>' +
                  '<span class="inline-flex items-center text-[9px] sm:text-[10px] md:text-[11px] font-bold text-gray-400 truncate" aria-disabled="true" title="Tautan pendaftaran eksternal belum terverifikasi">Daftar</span>' +
                "</div>" +
              "</div>" +
            "</article>"
          );
        }

      function evtRecoCardHTML(d) {
        const mediaInner = d.photo
          ? '<img src="' + d.photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-full object-cover" />'
          : '<div class="w-full h-full bg-gradient-to-b from-violet-800 via-slate-700 to-slate-800" role="img" aria-label="Foto acara ' + d.name + ' (placeholder)"></div>';
        return (
          '<div class="w-56 h-64 bg-white/90 text-gray-800 rounded-xl overflow-hidden flex-shrink-0 shadow-lg backdrop-blur-md flex flex-col">' +
            '<div class="relative h-32 shrink-0">' + mediaInner + "</div>" +
            '<div class="p-3 flex flex-col flex-1">' +
              '<div class="text-yellow-400 text-xs mb-1">★★★★★</div>' +
              '<p class="text-xs font-bold text-gray-900 uppercase line-clamp-1">' + d.name + "</p>" +
              '<p class="text-[11px] text-gray-500 line-clamp-2 mt-1">' + d.short_description + "</p>" +
              '<p class="text-[11px] font-semibold text-gray-700 mt-auto pt-2">' + d.schedule + "</p>" +
            "</div>" +
          "</div>"
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
       const EVT_PAGER_ACTIVE = "bg-blue-600 text-white";
       const EVT_PAGER_IDLE = "bg-white text-slate-600 ring-1 ring-gray-200 hover:bg-gray-100";

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
            Array.from(evtFiltersWrap.querySelectorAll("[data-filter-btn]")).forEach((b) => {
              const isOn = b.getAttribute("data-filter") === evtFilter;
              b.setAttribute("aria-pressed", isOn ? "true" : "false");
              b.className = EVT_FILTER_BASE + " " + (isOn ? EVT_FILTER_ACTIVE : EVT_FILTER_IDLE);
            });
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

      function evtGoPage(page) {
        const pages = evtTotalPages(evtFilteredList());
        evtPage = Math.max(1, Math.min(pages, page));
        evtRenderList();
      }

      function evtRenderList() {
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
        evtGrid.innerHTML = items.map(evtCardHTML).join("");
        const empty = list.length === 0;
        if (evtEmpty) evtEmpty.classList.toggle("hidden", !empty);
        evtGrid.classList.toggle("hidden", empty);
        const region = evtMapRegion();
        if (evtCount) {
          evtCount.textContent = "Menampilkan " + list.length + " acara" +
            (evtFilter !== "Semua" ? ' pada kategori "' + evtFilter + '"' : "") +
            (region ? ' di wilayah "' + evtRegionName(region) + '"' : "") +
            ".";
        }
        evtRenderPager(pages);
      }

      // Klik kartu daftar → sorot detail di sebelah map (tanpa mengubah filter wilayah).
      function evtWireGridSelect() {
        if (!evtGrid) return;
        evtGrid.addEventListener("click", (e) => {
          if (e.target.closest("button") || e.target.closest("a")) return;
          const card = e.target.closest("[data-evt-id]");
          if (!card) return;
          const id = card.getAttribute("data-evt-id");
          if (window.PasuruanAcaraMap && id) {
            try {
              window.PasuruanAcaraMap.selectEvent(id);
            } catch (err) {
              /* abaikan */
            }
          }
        });
      }

      function evtRenderReco() {
        const row = document.getElementById("reco-row");
        if (!row) return;
        const feat = acaraItems.filter((d) => d.featured);
        const list = feat.length ? feat : acaraItems.slice(0, 4);
        row.innerHTML = list.map(evtRecoCardHTML).join("");
      }

      // ── Sorotan "Event Pasuruan Hari Ini" (sesuai mockup acara.png) ──
      // (sumber: mock, lihat data-acara.js). Tanpa kata "Mock" pada tampilan,
      // tanpa booking/payment (PRD §19.2: tiket display-only).
      const EVT_TODAY_HEROES = [
        {
          title: "Festival Musik Feat Danny Caknan",
          slug: "festival-seni-mock",
          schedule: "Minggu, 10 September 2027 | 09:00 - 12:00",
          organizer: "Dinas Kebudayaan Kab. Pasuruan",
          location: "Alun-alun Kota Pasuruan",
          description: "Panggung musik rakyat bersama bintang tamu dan musisi lokal Pasuruan. Terbuka untuk umum.",
        },
        {
          title: "Pasuruan Fun Run 2027",
          slug: "kirab-tradisi-mock",
          schedule: "Sabtu, 15 September 2027 / 06:00–10:00",
          organizer: "Dinas Kepemudaan dan Olahraga Kab. Pasuruan",
          location: "Alun-Alun Kota Pasuruan",
          description: "Lari santai 5K mengelilingi pusat kota. Cocok untuk pemula dan komunitas lari.",
        },
        {
          title: "Gelar Wayang Kulit",
          slug: "gelar-wayang-mock",
          schedule: "Sabtu, 22 September 2027 / 20:00–23:00",
          organizer: "Dinas Kebudayaan Kab. Pasuruan",
          location: "Pendopo Kecamatan Bangil",
          description: "Pertunjukan wayang kulit dengan lakon klasik dan dalang tamu.",
        },
      ];
      let evtTodayIndex = 0;

      function evtRenderTodayHero() {
        const titleEl = document.getElementById("evt-today-title");
        if (!titleEl) return;
        const d = EVT_TODAY_HEROES[evtTodayIndex % EVT_TODAY_HEROES.length];
        titleEl.textContent = d.title;
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
          const total = EVT_TODAY_HEROES.length;
          const active = evtTodayIndex % total;
          dots.innerHTML = "";
          for (let i = 0; i < total; i++) {
            const on = i === active;
            const b = document.createElement("button");
            b.type = "button";
            b.setAttribute("role", "tab");
            b.setAttribute("aria-selected", on ? "true" : "false");
            b.setAttribute("aria-label", "Tampilkan sorotan ke-" + (i + 1));
            b.className = (on ? "w-6 h-2 bg-blue-600" : "w-2 h-2 bg-gray-300") + " rounded-full";
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
        evtTodayIndex = (evtTodayIndex + dir + EVT_TODAY_HEROES.length) % EVT_TODAY_HEROES.length;
        evtRenderTodayHero();
      }

      // Countdown dummy: mulai 00 hari / 01 jam / 30 menit / 50 detik, berdetak tiap detik.
      let evtCountdown = 1 * 3600 + 30 * 60 + 50;
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
      function evtStartCountdown() {
        evtPaintCountdown();
        const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) return;
        window.setInterval(() => {
          if (evtCountdown > 0) evtCountdown -= 1;
          evtPaintCountdown();
        }, 1000);
      }

      // ── Kalender mini (navigasi bulan; titik/judul dummy display-only, bukan jadwal nyata) ──
      let evtCalY = 2025, evtCalM = 4; // Mei 2025 (0-index) agar tampilan awal persis mockup
      const EVT_CAL_MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
      function evtCalDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
      // Titik dummy deterministik per tanggal (display-only, bukan jadwal nyata):
      // Mei 2025 memakai peta persis tampilan lama; bulan lain memakai pola d% agar hidup.
      function evtCalDot(y, m, d) {
        if (y === 2025 && m === 4) {
          const map = { 5: "bg-green-500", 12: "bg-red-500", 15: "bg-blue-500", 22: "bg-amber-500", 27: "bg-red-500" };
          return map[d] || null;
        }
        if (d % 7 === 1) return "bg-blue-500";
        if (d % 7 === 3) return "bg-amber-500";
        if (d % 11 === 4) return "bg-green-500";
        if (d % 9 === 5) return "bg-red-500";
        return null;
      }
      function evtRenderCalendar() {
        const titleEl = document.getElementById("evt-cal-title");
        const grid = document.getElementById("evt-cal-grid");
        if (!titleEl || !grid) return;
        titleEl.textContent = EVT_CAL_MONTHS[evtCalM] + " " + evtCalY;
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
            const dot = evtCalDot(evtCalY, evtCalM, dayNum);
            const dotHtml = dot ? '<span class="absolute left-1/2 -translate-x-1/2 bottom-0 h-1 w-1 rounded-full ' + dot + '"></span>' : "";
            let hl = false;
            if (isRealMonth) hl = dayNum === now.getDate();
            else if (evtCalY === 2025 && evtCalM === 4) hl = dayNum === 10; // pertahankan tampilan mockup awal
            if (hl) {
              html += '<span class="py-1 rounded-full bg-blue-600 text-white font-bold relative" title="Hari ini">' + dayNum + "</span>";
            } else if (dot) {
              html += '<span class="py-1 relative rounded hover:ring-1 hover:ring-gray-300">' + dayNum + dotHtml + "</span>";
            } else {
              html += '<span class="py-1">' + dayNum + "</span>";
            }
          }
        }
        grid.innerHTML = html;
      }
      function evtStepCalendar(dir) {
        evtCalM += dir;
        if (evtCalM < 0) { evtCalM = 11; evtCalY -= 1; }
        if (evtCalM > 11) { evtCalM = 0; evtCalY += 1; }
        evtRenderCalendar();
      }

      evtRenderFilterTabs();
      evtWireGridSelect();
      evtRenderList();
      evtRenderReco();
      evtRenderTodayHero();
      evtRenderCalendar();
      evtStartCountdown();

      const evtTodayPrev = document.getElementById("evt-today-prev");
      if (evtTodayPrev) evtTodayPrev.addEventListener("click", () => evtStepTodayHero(-1));
      const evtTodayNext = document.getElementById("evt-today-next");
      if (evtTodayNext) evtTodayNext.addEventListener("click", () => evtStepTodayHero(1));
      // Klik kartu sorotan Hari Ini → halaman detail acara (tanpa mengubah tampilan hero/kalender).
      const evtTodayHero = document.getElementById("evt-today-hero");
      if (evtTodayHero) {
        evtTodayHero.classList.add("cursor-pointer");
        evtTodayHero.addEventListener("click", (e) => {
          if (e.target.closest("button") || e.target.closest("a")) return;
          const d = EVT_TODAY_HEROES[evtTodayIndex % EVT_TODAY_HEROES.length];
          if (d && d.slug) window.location.href = "detail_acara.html?slug=" + d.slug;
        });
      }
      const evtCalPrev = document.getElementById("evt-cal-prev");
      if (evtCalPrev) evtCalPrev.addEventListener("click", () => evtStepCalendar(-1));
      const evtCalNext = document.getElementById("evt-cal-next");
      if (evtCalNext) evtCalNext.addEventListener("click", () => evtStepCalendar(1));

      // Sinkron Map → Daftar (pola Budaya): klik wilayah → filter grid + reset ke hal. 1;
      // klik lagi → tampil semua. Kategori (#evt-filters) dikombinasikan dengan region.
      // Sorotan Hari Ini TIDAK ikut terfilter (tetap tampil).
      window.addEventListener("acara:mapchange", () => {
        evtPage = 1;
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
    
