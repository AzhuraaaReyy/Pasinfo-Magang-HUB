/**
 * wisata-listing.js — dipindah VERBATIM dari inline <script> wisata.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // ── Daftar Destinasi: memakai dataset bersama (single source of truth).
      // JANGAN duplikasi data di sini; cukup baca window.PASINFO_WISATA. ──
      const WISATA_DATA = window.PASINFO_WISATA || { categories: [], destinations: [] };
      function wisataCategoryName(id) {
        const found = WISATA_DATA.categories.filter((x) => x.id === id)[0];
        return found ? found.name : "";
      }

      /* ── FOTO SEMENTARA (Owner 2026-10-16) ──────────────────────────
         Data media[0].url masih null untuk semua destinasi. Untuk
         sementara setiap card memakai gambar yang tersedia di folder
         wisata (tidak harus sesuai destinasi; nanti Owner ganti foto
         asli). Pemetaan deterministik dari id agar konsisten antar
         render/pagination. Jika nanti media[0].url terisi, dipakai
         lebih dulu.
         Owner 2026-10-15: kartu grid kecil → pakai versi thumbnail WebP
         (520px) agar ringan. Urutan/pemetaan identik dengan
         data-wisata.js PHOTO_FALLBACK (versi penuh untuk hero detail). ── */
      const WISATA_FALLBACK_PHOTOS = [
        "../../public/assets/images/wisata/optimized/bromo2.thumb.webp",
        "../../public/assets/images/wisata/optimized/bromo3.thumb.webp",
        "../../public/assets/images/wisata/optimized/bromo_banner.thumb.webp",
        "../../public/assets/images/wisata/optimized/purwodadi-botanic-garden.thumb.webp",
        "../../public/assets/images/wisata/optimized/taman_safari_indonesia_2.thumb.webp",
        "../../public/assets/images/wisata/optimized/air-terjun-kakek-bodo.thumb.webp",
      ];
      function wisataPhotoFor(d) {
        if (d.media && d.media[0]) {
          /* Kartu listing kecil → pakai thumbnail (WebP 520px) bila ada;
             url penuh milik hero detail/ galeri. */
          if (d.media[0].thumbnail_url) return d.media[0].thumbnail_url;
          if (d.media[0].url) return d.media[0].url;
        }
        const id = d.id || d.slug || "x";
        let h = 0;
        for (let i = 0; i < id.length; i++) {
          h = (h + id.charCodeAt(i)) % WISATA_FALLBACK_PHOTOS.length;
        }
        return WISATA_FALLBACK_PHOTOS[h];
      }

      /* ── HARGA RENTANG SEMENTARA (Owner 2026-10-16) ────────────────
         Harga asli belum fix. Selalu tampilkan rentang +Rp20.000 dari
         harga dasar: mis. Rp 10.000 → "Rp 10.000 - Rp 30.000". --------- */
      function wisataPriceRange(d) {
        if (!d.prices || !d.prices.length) return null;
        const nums = d.prices
          .map((p) => parseInt(String(p).replace(/[^\d]/g, ""), 10))
          .filter((n) => Number.isFinite(n) && n > 0);
        if (!nums.length) return null;
        const base = Math.min(...nums);
        const fmt = (n) => "Rp " + n.toLocaleString("id-ID");
        return fmt(base) + " - " + fmt(base + 20000);
      }

      const wisataDestinations = WISATA_DATA.destinations.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        regionId: d.regionId,
        photo: wisataPhotoFor(d),
        category: wisataCategoryName(d.categoryId),
        short_description: d.short_description,
        rating: d.rating,
        reviews: d.reviews_label,
        location: d.address,
        hours: d.opening_hours,
        price: wisataPriceRange(d),
      }));

      const ICON_STAR = '<svg class="h-4 w-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>';
      /* Ikon meta dari folder assets (Owner 2026-10-16) */
      const ICON_PIN = '<img src="../../public/assets/icons/icon_lokasi-hitam.svg" alt="" class="h-4 w-4 shrink-0 object-contain" />';
      const ICON_CLOCK = '<img src="../../public/assets/icons/icon_waktu.svg" alt="" class="h-4 w-4 shrink-0 object-contain" />';
      const ICON_TAG = '<img src="../../public/assets/icons/icon_harga-tiket.svg" alt="" class="h-4 w-4 shrink-0 object-contain" />';
      const ICON_HEART = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>';
      const ICON_BOOKMARK = '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.726 48.726 0 017.186 0z" /></svg>';
      /* State like/bookmark disimpan sementara di dataset tombol (Owner
         2026-10-16: cukup animasi aktif, tidak perlu disimpan permanen). */

      const destGrid = document.getElementById("dest-grid");
      const destEmpty = document.getElementById("dest-empty");
      const filterBtns = Array.from(document.querySelectorAll("[data-filter-btn]"));
      const FILTER_BASE = "shrink-0 px-4 py-1.5 rounded-md text-xs font-medium whitespace-nowrap";
      const FILTER_ACTIVE = "bg-red-600 text-white";
      const FILTER_IDLE = "bg-red-100 text-red-700";

      function destCardHTML(d) {
        let meta = "";
        if (d.rating) {
          meta += '<div class="flex items-center gap-1.5">' + ICON_STAR + "<span>" + d.rating + (d.reviews ? " (" + d.reviews + ")" : "") + "</span></div>";
        }
        if (d.location) {
          meta += '<div class="flex items-center gap-1.5">' + ICON_PIN + "<span>" + d.location + "</span></div>";
        }
        if (d.hours) {
          meta += '<div class="flex items-center gap-1.5">' + ICON_CLOCK + "<span>" + d.hours + "</span></div>";
        }
        if (d.price) {
          meta += '<div class="flex items-center gap-1.5 font-semibold text-gray-700">' + ICON_TAG + "<span>" + d.price + "</span></div>";
        }
        const mediaInner = d.photo
          ? '<img src="' + d.photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />'
          : '<div class="w-full h-full bg-red-400" role="img" aria-label="Foto destinasi ' + d.name + ' (placeholder)"></div>';
        return (
          '<article data-dest-id="' +
          d.id +
          '" data-dest-slug="' +
          d.slug +
          '" class="wisata-card group h-full bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden flex flex-col cursor-pointer hover:-translate-y-2 hover:scale-[1.015] hover:shadow-2xl transition-all duration-300 ease-out will-change-transform">' +
            '<div class="relative h-44 sm:h-48 lg:h-52 overflow-hidden">' +
              mediaInner +
              '<span class="absolute top-2 left-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded">' + d.category + "</span>" +
              '<div class="absolute top-2 right-2 flex items-center gap-1.5">' +
                '<button type="button" data-like-btn aria-label="Sukai ' + d.name + '" aria-pressed="false" class="like-btn text-white bg-black/30 p-1.5 rounded-full hover:text-red-400 transition-all duration-200">' + ICON_HEART + "</button>" +
                '<button type="button" data-bookmark-btn aria-label="Simpan ' + d.name + '" aria-pressed="false" class="bookmark-btn text-white bg-black/30 p-1.5 rounded-full hover:text-yellow-400 transition-all duration-200">' + ICON_BOOKMARK + "</button>" +
              "</div>" +
            "</div>" +
            '<div class="p-4 flex flex-1 flex-col">' +
              // Owner 2026-10-17: konsistensi judul/deskripsi semua kartu
              // wisata — judul text-xl, deskripsi text-sm, meta text-xs
              // (sama di mobile/tablet/desktop; paritas kartu rekomendasi).
              '<h3 class="font-bold text-xl text-gray-900 uppercase leading-snug line-clamp-2">' + d.name + "</h3>" +
              '<p class="text-sm text-gray-500 mt-1.5 leading-relaxed line-clamp-2">' + d.short_description + "</p>" +
              '<div class="pt-3 mt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1.5">' + meta + "</div>" +
            "</div>" +
          "</article>"
        );
      }

      let destFilter = "Semua";
      let destPage = 1;
      // Owner 2026-10-14: di mobile tampilkan 6 kartu per halaman,
      // di layar lebih besar tetap 12.
      function destPerPage() {
        return window.matchMedia("(max-width: 639px)").matches ? 6 : 12;
      }
      const destPager = document.getElementById("dest-pager");
      const PAGER_BASE = "min-w-[2rem] h-8 px-2 rounded-md text-xs font-bold transition-colors";
      const PAGER_ACTIVE = "bg-red-600 text-white";
      const PAGER_IDLE = "bg-white text-slate-600 ring-1 ring-gray-200 hover:bg-gray-100";

      function destMapRegion() {
        try {
          if (window.PasuruanWisataMap) return window.PasuruanWisataMap.getState().selectedRegion;
        } catch (err) {
          /* abaikan: grid tampil tanpa filter wilayah */
        }
        return null;
      }

      function destFilteredList() {
        const region = destMapRegion();
        return wisataDestinations.filter((d) => {
          if (destFilter !== "Semua" && d.category !== destFilter) return false;
          if (region && d.regionId !== region) return false;
          return true;
        });
      }

      function destTotalPages(list) {
        return Math.max(1, Math.ceil(list.length / destPerPage()));
      }

      /* Owner 2026-10-14: indikator halaman ringkas — jendela tetap 3 angka
         yang berakhir di halaman aktif, diikuti halaman terakhir; angka lama
         hilang (digeser keluar) agar jumlah angka TIDAK bertambah.
         Contoh: hal.1 -> 1 2 3 … 10, hal.5 -> 3 4 5 … 10,
         hal.10 -> 1 … 8 9 10. Panah kiri/kanan berpindah halaman. */
      function pagerItems(current, total) {
        const size = 3; // jumlah angka di jendela (tetap)
        const start = Math.max(1, Math.min(current - (size - 1), total - size + 1));
        const end = Math.min(total, start + size - 1);
        const items = [];
        // Angka awal muncul kembali hanya saat jendela menyentuh halaman
        // terakhir (mis. 1 … 8 9 10), bukan saat berada di tengah.
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

      function renderPager(pages) {
        if (!destPager) return;
        if (pages <= 1) {
          destPager.innerHTML = "";
          return;
        }
        let html =
          '<button type="button" data-pager-prev aria-label="Halaman sebelumnya" ' +
          (destPage <= 1 ? "disabled" : "") +
          ' class="' + PAGER_BASE + " " + PAGER_IDLE + ' disabled:opacity-40">&lsaquo;</button>';
        pagerItems(destPage, pages).forEach((it) => {
          if (it === "…") {
            html +=
              '<span aria-hidden="true" class="' + PAGER_BASE + ' text-slate-400 select-none">&hellip;</span>';
            return;
          }
          const on = it === destPage;
          html +=
            '<button type="button" data-page-btn data-page="' + it + '" ' +
            (on ? 'aria-current="page" ' : "") +
            'aria-label="Halaman ' + it + '" class="' + PAGER_BASE + " " + (on ? PAGER_ACTIVE : PAGER_IDLE) + '">' + it + "</button>";
        });
        html +=
          '<button type="button" data-pager-next aria-label="Halaman berikutnya" ' +
          (destPage >= pages ? "disabled" : "") +
          ' class="' + PAGER_BASE + " " + PAGER_IDLE + ' disabled:opacity-40">&rsaquo;</button>';
        destPager.innerHTML = html;
        const prev = destPager.querySelector("[data-pager-prev]");
        const next = destPager.querySelector("[data-pager-next]");
        if (prev) prev.addEventListener("click", () => goDestPage(destPage - 1));
        if (next) next.addEventListener("click", () => goDestPage(destPage + 1));
        Array.from(destPager.querySelectorAll("[data-page-btn]")).forEach((b) => {
          b.addEventListener("click", () => goDestPage(parseInt(b.getAttribute("data-page"), 10)));
        });
      }

      /* ── ANIMASI FADE-IN (konsep GSAP, vanilla WAAPI) ────────────────
         Kartu masuk dengan opacity 0→1 + translateY, stagger berurutan,
         easing power2.out ala GSAP (cubic-bezier .22,1,.36,1).
         Tidak menambah library (stack lock vanilla JS). Jika browser
         tidak mendukung WAAPI, kartu langsung tampil (fallback aman). ── */
      function animateCardsIn(container) {
        const cards = Array.from(container.querySelectorAll("[data-dest-slug]"));
        const reducedMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        cards.forEach((card, i) => {
          if (!card.animate || reducedMotion) return;
          card.animate(
            [
              { opacity: 0, transform: "translateY(18px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 520,
              delay: i * 60,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              fill: "backwards",
            },
          );
        });
      }

      /* ── TRANSISI TINGGI GRID (Owner 2026-10-16) ────────────────────
         Saat pindah halaman dengan jumlah kartu berbeda (mis. halaman
         penuh 12 → halaman terakhir 4), tinggi grid berubah drastis dan
         konten di bawahnya (pager/iklan) "melompat" — terasa kaget.
         Solusi: tween tinggi grid dari nilai lama ke nilai baru dengan
         overflow hidden sementara, jadi ruang menyusut/mengembang halus
         bersamaan dengan fade-in kartu. Fallback aman bila tanpa WAAPI. ── */
      let destRenderToken = 0;
      let destGridResizeAnim = null;
      let destGridResizeClearRaf = 0;

      function animateGridResize(container, fromHeight) {
        if (!container.animate) return;
        const reducedMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reducedMotion) return;
        const toHeight = container.offsetHeight;
        if (!fromHeight || fromHeight === toHeight) return;
        if (destGridResizeAnim) {
          try { destGridResizeAnim.cancel(); } catch (err) { /* abaikan */ }
        }
        if (destGridResizeClearRaf) {
          cancelAnimationFrame(destGridResizeClearRaf);
          destGridResizeClearRaf = 0;
        }
        container.style.overflow = "hidden";
        container.style.height = fromHeight + "px";
        void container.offsetHeight; // commit tinggi awal (hindari kedip 1 frame)
        const anim = container.animate(
          [{ height: fromHeight + "px" }, { height: toHeight + "px" }],
          { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
        );
        destGridResizeAnim = anim;
        const done = () => {
          if (destGridResizeAnim !== anim) return; // sudah digantikan animasi baru
          destGridResizeAnim = null;
          container.style.height = toHeight + "px"; // jaga tinggi akhir
          container.style.overflow = "";
          try { anim.cancel(); } catch (err) { /* abaikan */ }
          destGridResizeClearRaf = requestAnimationFrame(() => {
            destGridResizeClearRaf = 0;
            container.style.height = ""; // kembali ke auto
          });
        };
        anim.onfinish = done;
      }

      function goDestPage(page) {
        const pages = destTotalPages(destFilteredList());
        const next = Math.max(1, Math.min(pages, page));
        if (next === destPage) return;
        destPage = next;
        const token = ++destRenderToken;
        const section = destGrid ? (destGrid.closest('section') || destGrid) : null;
        const reducedMotion =
          window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (section) {
          try { section.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }); } catch (e) {}
        }
        /* Transisi pagination smooth: fade-out grid lama -> render baru
           (renderDestinations memicu tween tinggi grid + fade-in stagger). */
        if (destGrid.animate && !reducedMotion && destGrid.children.length > 0 && !destGrid.classList.contains("hidden")) {
          const startHeight = destGrid.offsetHeight;
          const out = destGrid.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 200, easing: "ease-in" },
          );
          out.onfinish = () => {
            if (token === destRenderToken) renderDestinations(startHeight);
          };
        } else {
          renderDestinations();
        }
      }

      function renderDestinations(fromHeight) {
        const list = destFilteredList();
        const per = destPerPage();
        const pages = destTotalPages(list);
        if (destPage > pages) destPage = pages;
        const items = list.slice((destPage - 1) * per, destPage * per);
        const prevHeight = typeof fromHeight === "number" ? fromHeight : destGrid.offsetHeight;
        destGrid.innerHTML = items.map(destCardHTML).join("");
        const empty = list.length === 0;
        destEmpty.classList.toggle("hidden", !empty);
        destGrid.classList.toggle("hidden", empty);
        renderPager(pages);
        // Klik kartu → LANGSUNG ke halaman detail (Owner 2026-10-16: tanpa
        // tirai transisi — paritas acara, navigasi langsung agar responsif <100ms).
        Array.from(destGrid.querySelectorAll("[data-dest-slug]")).forEach((card) => {
          card.addEventListener("click", (e) => {
            if (e.target.closest("button")) return;
            window.location.href = "detail_wisata.html?slug=" + card.getAttribute("data-dest-slug");
          });
        });
        if (window.PasuruanWisataMap) {
          const st = window.PasuruanWisataMap.getState();
          if (st.selectedDestination) window.PasuruanWisataMap.selectDestination(st.selectedDestination);
        }
        if (!empty) {
          animateGridResize(destGrid, prevHeight);
          animateCardsIn(destGrid);
        }
      }

      filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          destFilter = btn.getAttribute("data-filter");
          destPage = 1;
          filterBtns.forEach((b) => {
            const on = b === btn;
            b.setAttribute("aria-pressed", on ? "true" : "false");
            b.className = FILTER_BASE + " " + (on ? FILTER_ACTIVE : FILTER_IDLE);
          });
          renderDestinations();
        });
      });

      /* ── LIKE & BOOKMARK (Owner 2026-10-16) ─────────────────────────
         Hanya animasi/status aktif tanpa penyimpanan permanen:
         - Like aktif   → ikon terisi (fill currentColor) + merah.
         - Bookmark aktif → ikon terisi (fill currentColor) + kuning.
         Event delegation pada grid agar bekerja setelah render ulang
         (pagination/filter). State sementara disimpan di dataset tombol
         dan hilang saat grid dirender ulang (sesuai permintaan "tidak
         usah disimpan"). ── */
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

      destGrid.addEventListener("click", (e) => {
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
        }
      });

      window.addEventListener("wisata:mapchange", () => {
        destPage = 1;
        renderDestinations();
      });

      // Kembali dari halaman detail (bfcache): tampilkan SEMUA lagi —
      // filter kategori, halaman, dan peta di-reset (Owner 2026-10-16;
      // pola acara-listing.js, tanpa syarat "filter eksplisit").
      window.addEventListener("pageshow", (e) => {
        if (!e || !e.persisted) return;
        destFilter = "Semua";
        destPage = 1;
        filterBtns.forEach((b) => {
          const on = b.getAttribute("data-filter") === "Semua";
          b.setAttribute("aria-pressed", on ? "true" : "false");
          b.className = FILTER_BASE + " " + (on ? FILTER_ACTIVE : FILTER_IDLE);
        });
        if (window.PasuruanWisataMap) {
          try {
            // resetFilters() memicu wisata:mapchange → renderDestinations(),
            // jadi JANGAN render manual lagi (hindari render + animasi ganda).
            window.PasuruanWisataMap.resetFilters();
            return;
          } catch (err) {
            /* gagal memicu peta: fallback render manual di bawah */
          }
        }
        renderDestinations();
      });

      // Berubah jumlah kartu per halaman saat melewati breakpoint mobile.
      let destLastPerPage = destPerPage();
      window.addEventListener("resize", () => {
        const per = destPerPage();
        if (per !== destLastPerPage) {
          destLastPerPage = per;
          destPage = 1;
          renderDestinations();
        }
      });

      renderDestinations();
    
