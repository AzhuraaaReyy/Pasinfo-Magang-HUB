/**
 * detail-budaya.js — dipindah VERBATIM dari inline <script> detail_budaya.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // Detail budaya: render dari dataset bersama via ?slug=.
      // Tanpa slug → budaya featured pertama (fallback item pertama).
      // CATATAN KODE (tidak tampil di UI): seluruh teks generik di bawah
      // adalah placeholder visual mengikuti mockup (flag MOCK); BUKAN fakta
      // budaya terverifikasi. Jangan sajikan sebagai data nyata.
      // Peta = placeholder STATIS (tanpa tile/backend). Tombol tiket & rute
      // = dummy non-fungsional (visual saja, tanpa backend).
        (function () {
          "use strict";
          function $(id) {
            return document.getElementById(id);
          }
          var DATA = window.PASINFO_BUDAYA;
          if (!DATA || !DATA.cultures || !DATA.cultures.length) return;

          // Enrich data dengan sources & verification
          if (window.AddSourcesData && window.AddSourcesData.enrichBudaya) {
            window.AddSourcesData.enrichBudaya(DATA);
          }

          function catName(id) {
            var list = DATA.categories || [];
            for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i].name;
          }
          return "";
        }
        function regName(id) {
          var list = DATA.regions || [];
          for (var j = 0; j < list.length; j++) {
            if (list[j].id === id) return list[j].name;
          }
          return "";
        }
        function slugParam() {
          try {
            return new URLSearchParams(window.location.search).get("slug");
          } catch (e) {
            return null;
          }
        }
        function setText(id, text) {
          var el = $(id);
          if (el) el.textContent = text;
        }

        var cultures = DATA.cultures;
        var current = null;
        var want = slugParam();
        for (var k = 0; k < cultures.length; k++) {
          if (cultures[k].slug === want) { current = cultures[k]; break; }
        }
        if (!current) {
          for (var f = 0; f < cultures.length; f++) {
            if (cultures[f].featured) { current = cultures[f]; break; }
          }
        }
        if (!current) current = cultures[0];
        if (!current) return;
        var item = current;

        var category = catName(item.categoryId) || "-";
        var region = regName(item.regionId) || "";
        var ratingText = item.rating
          ? item.rating + (item.reviews_label ? " (" + item.reviews_label + ")" : "")
          : "-";

        document.title = item.name + " - Pasuruan Info";
        setText("crumb-name", item.name);
        setText("hero-cat", "Budaya " + category);
        setText("detail-title", item.name);
        setText("detail-desc", item.short_description || "—");
        setText("detail-location", item.address || "Pasuruan");
        setText("detail-rating", ratingText);

          // --- 3. Tentang + tabel (MOCK visual: nilai placeholder gaya mockup) ---
          setText("tentang-title", "Tentang " + item.name);
          setText("tentang-desc", item.short_description || "");
          setText("info-kategori", "Budaya " + category);
          setText("info-tiket", "Gratis"); // MOCK visual mengikuti mockup
          
          // Opening hours dengan status real-time
          if (item.opening_hours && window.OpeningHoursUtil) {
            var hoursDisplay = window.OpeningHoursUtil.getDisplay(item.opening_hours);
            setText("info-jadwal", hoursDisplay.display);
            var statusEl = $("info-jadwal-status");
            if (statusEl) {
              statusEl.textContent = hoursDisplay.indicator + " " + hoursDisplay.status;
              if (hoursDisplay.isOpen === true) {
                statusEl.className = "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700";
              } else if (hoursDisplay.isOpen === false) {
                statusEl.className = "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700";
              } else {
                statusEl.className = "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700";
              }
            }
          } else {
            setText("info-jadwal", (item.opening_hours || "08.00 - 15.00 WIB") + " (Senin - Selasa)");
          }
          
          setText("info-lokasi", item.address || "Pasuruan");
          setText("info-makna", "Kebaikan, Keberanian, Kebijaksanaan"); // MOCK visual mengikuti mockup

        // Display Source & Verification Info (pola detail_wisata, Tier 1.7)
        (function () {
          var sourceEl = $("source-info");
          var verificationEl = $("verification-info");

          if (sourceEl && item.sources && item.sources.length > 0) {
            var source = item.sources[0];
            var html = '<div class="text-sm">';
            html += '<p class="font-semibold text-gray-900">' + (source.name || "Sumber Tidak Diketahui") + '</p>';
            if (source.url) {
              html += '<p class="text-xs text-blue-600 mt-1"><a href="' + source.url + '" target="_blank" rel="noopener">Kunjungi sumber →</a></p>';
            }
            html += '</div>';
            sourceEl.innerHTML = html;
          } else if (sourceEl) {
            sourceEl.innerHTML = '<p class="text-xs text-gray-600">Informasi sumber belum tersedia</p>';
          }

          if (verificationEl && item.verification) {
            var status = item.verification.status || "unknown";
            var statusLabel = status === "verified" ? "Terverifikasi" : status === "pending" ? "Menunggu Verifikasi" : "Status Tidak Diketahui";
            var html = '<div class="text-sm">';
            html += '<div class="flex items-center gap-2 mb-2">';
            html += '<span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ' + (status === "verified" ? "bg-green-100 text-green-700" : status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-200 text-gray-700") + '">' + statusLabel + '</span>';
            html += '</div>';
            if (item.verification.verified_at) {
              var verifiedDate = new Date(item.verification.verified_at);
              var dateStr = verifiedDate.toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
              html += '<p class="text-xs text-gray-600">Diverifikasi pada ' + dateStr + '</p>';
            }
            html += '</div>';
            verificationEl.innerHTML = html;
          } else if (verificationEl) {
            verificationEl.innerHTML = '<p class="text-xs text-gray-600">Status verifikasi belum tersedia</p>';
          }
        })();

        // --- Lokasi & Rute (MOCK visual: baris contoh mengikuti mockup) ---
        setText("lokasi-desc", item.short_description || "Informasi lokasi dan rute menuju daya tarik budaya ini.");
        setText("route-lokasi", item.address || "Pasuruan");
        setText("route-dari", "Jakarta Utara (contoh)"); // MOCK visual
        setText("route-jarak", "200 km dari destinasi budaya (contoh)"); // MOCK visual
        setText("route-estimasi", "Motor 4 jam 30 mnt • Mobil 2 jam 30 mnt (contoh)"); // MOCK visual

        // --- 4. Sejarah + Nilai (MOCK visual: teks dummy gaya mockup) ---
        setText(
          "sejarah-desc",
          "Sejarah singkat " + item.name + " diwariskan turun-temurun oleh masyarakat setempat. " + (item.short_description || "") + " Hingga kini, tradisi ini tetap dijaga sebagai bagian dari identitas dan jati diri daerah."
        ); // MOCK visual
        setText(
          "nilai-desc",
          (item.short_description || item.name) + " Makna yang terkandung di dalamnya mencerminkan kebaikan, kebersamaan, dan kearifan lokal yang diwariskan para pendahulu."
        ); // MOCK visual

        // --- Galeri: foto besar + 4 thumbs (3 foto + 1 panah, klik ganti) ---
        // Media asli belum tersedia (media.url null) → placeholder gradasi.
        var GALLERY_SHOTS = [
          { label: "Foto 1: " + item.name, bg: "from-stone-600 via-stone-700 to-slate-800" },
          { label: "Foto 2: " + item.name, bg: "from-amber-800 via-stone-700 to-slate-800" },
          { label: "Foto 3: " + item.name, bg: "from-emerald-900 via-stone-800 to-slate-900" },
        ];
        var galIndex = 0;
        var featured = $("galeri-featured");
        var featuredLabel = $("galeri-featured-label");
        function paintFeatured(i) {
          galIndex = (i + GALLERY_SHOTS.length) % GALLERY_SHOTS.length;
          if (featured) {
            featured.className =
              "w-full h-60 sm:h-80 rounded-xl overflow-hidden mb-4 flex items-center justify-center bg-gradient-to-br " +
              GALLERY_SHOTS[galIndex].bg;
            featured.setAttribute("aria-label", GALLERY_SHOTS[galIndex].label);
          }
          if (featuredLabel) featuredLabel.textContent = GALLERY_SHOTS[galIndex].label;
          paintThumbs();
        }
        function paintThumbs() {
          var wrap = $("galeri-thumbs");
          if (!wrap) return;
          var html = "";
          for (var t = 0; t < GALLERY_SHOTS.length; t++) {
            html +=
              '<button type="button" data-shot="' + t + '" aria-label="Tampilkan ' + GALLERY_SHOTS[t].label + '"' +
              ' class="h-16 sm:h-20 rounded-lg overflow-hidden bg-gradient-to-br ' + GALLERY_SHOTS[t].bg +
              (t === galIndex ? " ring-2 ring-blue-700" : " opacity-80 hover:opacity-100") + ' transition-all"></button>';
          }
          html +=
            '<button type="button" data-shot="next" aria-label="Foto berikutnya"' +
            ' class="h-16 sm:h-20 rounded-lg overflow-hidden bg-gray-300 hover:bg-gray-400 flex items-center justify-center text-gray-600 transition-colors">' +
            '<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12l-7.5 7.5M21 12H3" /></svg></button>';
          wrap.innerHTML = html;
          var btns = wrap.querySelectorAll("[data-shot]");
          for (var b = 0; b < btns.length; b++) {
            btns[b].addEventListener("click", function () {
              var v = this.getAttribute("data-shot");
              if (v === "next") paintFeatured(galIndex + 1);
              else paintFeatured(parseInt(v, 10));
            });
          }
        }
        paintFeatured(0);

        // --- 5-7. Kartu rekomendasi (reko: tetap domain budaya; sekitar:
        // destinasi wisata TERDEKAT by jarak real + link detail_wisata — Owner 2026-10-09).
        // Jarak dummy hanya untuk kartu reko (gaya mockup); sekitar memakai jarak ukur.
        var DIST_LABELS = ["10km - 12 menit", "20km - 24 menit", "25km - 28 menit", "30km - 32 menit"];
        function esc(s) {
          return String(s == null ? "" : s);
        }
        function photoBox(name, badge) {
          return (
            '<div class="relative h-32 sm:h-36 overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700" role="img" aria-label="Foto ' + esc(name) + '">' +
            (badge ? '<span class="absolute top-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 bg-black/70 text-white text-[10px] font-bold rounded-full">' + esc(badge) + "</span>" : "") +
            "</div>"
          );
        }
        function recoCard(d, i, badgeMode) {
          var sub = region ? region + ", Pasuruan" : "Pasuruan";
          var badge = DIST_LABELS[i % DIST_LABELS.length]; // MOCK visual (reko saja)
          // Sekitar: tampilkan jarak ukur real bila tersedia (item wisata ber-_distKm).
          var foot = (d._distKm != null && window.PasinfoNearby)
            ? window.PasinfoNearby.fmtKm(d._distKm)
            : (badgeMode === "rating" ? badge : sub);
          var href = d._href || ("detail_budaya.html?slug=" + esc(d.slug));
          var head = "";
          if (badgeMode === "rating") {
            head =
              '<div class="relative h-32 sm:h-36 overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700" role="img" aria-label="Foto ' + esc(d.name) + '">' +
              '<span class="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-black/70 text-amber-300 text-[10px] font-bold rounded-full">' +
              '<svg class="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>' +
              (d.rating || "4.6") + "</span></div>";
          } else {
            head = photoBox(d.name, badge);
          }
           return (
             '<a href="' + href + '" class="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group">' +
             head +
             '<div class="p-3">' +
             '<h3 class="font-bold text-xs sm:text-sm text-gray-900 line-clamp-1 group-hover:text-blue-700 transition-colors">' + esc(d.name) + "</h3>" +
             '<p class="text-[11px] text-gray-500 mt-0.5">' + esc(foot) + "</p>" +
             "</div></a>"
           );
        }
        function fillFour(primary, others) {
          var out = primary.slice(0);
          for (var i = 0; i < others.length && out.length < 4; i++) {
            if (out.indexOf(others[i]) === -1) out.push(others[i]);
          }
          return out.slice(0, 4);
        }
        function renderReco(id, list, badgeMode) {
          var el = $(id);
          if (!el) return;
          var html = "";
          for (var i = 0; i < list.length; i++) {
            html += recoCard(list[i], i, badgeMode);
          }
          el.innerHTML = html;
        }
        var others = [];
        for (var o = 0; o < cultures.length; o++) {
          if (cultures[o].id !== item.id) others.push(cultures[o]);
        }
        var sameCat = [];
        var diffCat = [];
        var sameReg = [];
        for (var r = 0; r < others.length; r++) {
          if (others[r].categoryId === item.categoryId) sameCat.push(others[r]);
          else diffCat.push(others[r]);
          if (others[r].regionId === item.regionId) sameReg.push(others[r]);
        }
        renderReco("reco-serupa", fillFour(sameCat, others), "durasi");
        renderReco("reco-lainnya", fillFour(diffCat, others), "durasi");
        // Sekitar = destinasi wisata terdekat (jarak real dari center region item,
        // karena koordinat budaya null per mock contract). Link ke detail_wisata.
        var sekitarList = fillFour(sameReg, others);
        try {
          var WD = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];
          var ref = window.PasinfoNearby
            ? window.PasinfoNearby.refPoint(item, DATA.regions)
            : null;
          var near = window.PasinfoNearby
            ? window.PasinfoNearby.nearest(ref, WD, 4)
            : [];
          if (near.length) {
            near.forEach(function (d) {
              d._href = "detail_wisata.html?slug=" + d.slug;
            });
            sekitarList = near;
          }
        } catch (e) {}
        renderReco("reco-sekitar", sekitarList, "rating");

        // Simpan (visual saja) + Bagikan (Web Share API / clipboard) — pola canonical wisata.
        var bookmarked = false;
        var bookmarkBtn = $("bookmarkBtn");
        if (bookmarkBtn) {
          bookmarkBtn.addEventListener("click", function () {
            bookmarked = !bookmarked;
            bookmarkBtn.setAttribute("aria-pressed", bookmarked ? "true" : "false");
            var icon = $("bookmarkIcon");
            var text = $("bookmarkText");
            if (icon) icon.setAttribute("fill", bookmarked ? "currentColor" : "none");
            if (text) text.textContent = bookmarked ? "Tersimpan" : "Simpan";
          });
        }
        var shareBtn = $("shareBtn");
        if (shareBtn) {
          shareBtn.addEventListener("click", function () {
            var url = window.location.href;
            if (navigator.share) {
              navigator.share({ title: item.name, url: url }).catch(function () {});
            } else if (navigator.clipboard) {
              navigator.clipboard.writeText(url).catch(function () {});
            }
          });
        }
        // Tombol dummy non-fungsional: visual saja, tanpa navigasi/backend.
        ["pesanTiketBtn", "ruteBtn"].forEach(function (bid) {
          var btn = $(bid);
          if (btn) {
            btn.addEventListener("click", function (e) {
              e.preventDefault();
            });
          }
        });
      })();
    
