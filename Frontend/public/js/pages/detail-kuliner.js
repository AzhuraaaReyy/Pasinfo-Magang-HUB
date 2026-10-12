/**
 * detail-kuliner.js — dipindah VERBATIM dari inline <script> detail_kuliner.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // Detail kuliner: render by-slug dari window.PASINFO_KULINER.culinaries.
      // Tanpa slug / slug tak valid → item featured pertama (fallback: item pertama).
      // Null-safe: media/place null → placeholder. Tanpa kata terlarang di UI.
      (function () {
        "use strict";
        function $(id) {
          return document.getElementById(id);
        }
        function setText(id, text) {
          var el = $(id);
          if (el) el.textContent = text;
        }
        function showToast(msg) {
          var t = $("toast");
          if (!t) {
            try { window.alert(msg); } catch (e) {}
            return;
          }
          t.textContent = msg;
          t.classList.remove("hidden");
          try {
            if (t._timer) clearTimeout(t._timer);
            t._timer = setTimeout(function () { t.classList.add("hidden"); }, 2200);
          } catch (e) {}
        }

          var DATA = (typeof window !== "undefined" && window.PASINFO_KULINER) || null;
          if (!DATA || !Array.isArray(DATA.culinaries) || !DATA.culinaries.length) return;

          // Enrich data dengan sources & verification
          if (window.AddSourcesData && window.AddSourcesData.enrichKuliner) {
            window.AddSourcesData.enrichKuliner(DATA);
          }

          function catName(id) {
            var list = DATA.categories || [];
            for (var i = 0; i < list.length; i++) {
              if (list[i].id === id) return list[i].name;
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
        var slug = slugParam();
        var item = null;
        for (var i = 0; i < DATA.culinaries.length; i++) {
          if (DATA.culinaries[i].slug === slug) { item = DATA.culinaries[i]; break; }
        }
        if (!item) {
          for (var f = 0; f < DATA.culinaries.length; f++) {
            if (DATA.culinaries[f].featured) { item = DATA.culinaries[f]; break; }
          }
        }
        if (!item) item = DATA.culinaries[0];
        if (!item) return;

        var category = catName(item.categoryId) || "Tradisional";
        var rating = item.rating || "4.7";

        document.title = item.name + " - Pasuruan Info";
        setText("crumb-name", item.name);
        setText("hero-cat", "Kuliner " + category);
        setText("detail-title", item.name);
          setText("detail-location", item.address || "Pasuruan, Jawa Timur");
          setText("hero-rating-text", rating + " (1.245 Ulasan)");
          setText("hero-media-label", "Foto: " + item.name + " (placeholder)");
          setText("info-kategori", category);
          setText("info-harga", item.price_range || "-");
          
          // Opening hours dengan status real-time
          if (item.opening_hours && window.OpeningHoursUtil) {
            var hoursDisplay = window.OpeningHoursUtil.getDisplay(item.opening_hours);
            setText("info-jam", hoursDisplay.display);
            var statusEl = $("info-jam-status");
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
            setText("info-jam", item.opening_hours || "-");
          }
          
          setText("lokasi-alamat", item.address || "Pasuruan, Jawa Timur");
        var statusEl = $("info-status");
        if (statusEl) {
          var st = (item.operational_status || "buka").toLowerCase();
          statusEl.textContent = st === "buka" ? "Buka" : st === "tutup" ? "Tutup" : (item.operational_status || "-");
          statusEl.className = "inline-block px-2.5 py-0.5 rounded text-white text-[10px] font-bold " +
            (st === "buka" ? "bg-green-500" : "bg-gray-400");
        }
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

        // Foto: pakai media.url bila tersedia & non-null, bila tidak tetap placeholder.
        try {
          var photoUrl = (item.media && item.media[0] && item.media[0].url) ? item.media[0].url : null;
          if (photoUrl) {
            var heroMedia = $("hero-media");
            if (heroMedia) {
              heroMedia.innerHTML = '<img src="' + photoUrl + '" alt="Foto ' + item.name + '" class="w-full h-full object-cover" />';
              heroMedia.setAttribute("aria-label", "Foto " + item.name);
            }
          }
        } catch (e) {}

        // Dummy non-fungsional: toast "segera hadir", tanpa backend.
        ["btn-simpan", "btn-bagikan", "btn-rute"].forEach(function (id) {
          var b = $(id);
          if (b) b.addEventListener("click", function () { showToast("Fitur ini segera hadir."); });
        });
        var thumbMore = document.querySelector('[data-thumb="3"]');
        if (thumbMore) thumbMore.addEventListener("click", function () { showToast("17 foto lainnya segera hadir."); });

        // Tab aktif sederhana: klik tab → pindah state aktif visual.
        [["tab-utama"], ["tab-menu"], ["tab-ulasan"]].forEach(function (pair) {
          var t = $(pair[0]);
          if (!t) return;
          t.addEventListener("click", function () {
            ["tab-utama", "tab-menu", "tab-ulasan"].forEach(function (other) {
              var o = $(other);
              if (!o) return;
              var on = o === t;
              o.classList.toggle("text-blue-700", on);
              o.classList.toggle("text-gray-700", !on);
              o.classList.toggle("font-bold", on);
              o.classList.toggle("font-semibold", !on);
              o.classList.toggle("border-blue-700", on);
              o.classList.toggle("border-transparent", !on);
              if (on) o.setAttribute("aria-current", "page");
              else o.removeAttribute("aria-current");
            });
          });
        });

        // Galeri: carousel placeholder (prev/next + klik thumb ganti foto besar).
        var galeriIndex = 0;
        var GALERI_LABELS = ["Foto 1 (placeholder)", "Foto 2 (placeholder)", "Foto 3 (placeholder)", "Semua foto (placeholder)"];
        function paintGaleri() {
          var label = $("galeri-main-label");
          if (label) label.textContent = GALERI_LABELS[galeriIndex] || GALERI_LABELS[0];
          var thumbs = document.querySelectorAll("#galeri-thumbs .thumb-btn");
          for (var k = 0; k < thumbs.length; k++) {
            var on = k === galeriIndex;
            thumbs[k].classList.toggle("ring-2", on);
            thumbs[k].classList.toggle("ring-blue-600", on);
          }
        }
        function galeriGo(n) {
          galeriIndex = ((n % 4) + 4) % 4;
          if (galeriIndex === 3) { showToast("17 foto lainnya segera hadir."); galeriIndex = 2; }
          paintGaleri();
        }
        var gp = $("galeri-prev"), gn = $("galeri-next");
        if (gp) gp.addEventListener("click", function () { galeriGo(galeriIndex - 1); });
        if (gn) gn.addEventListener("click", function () { galeriGo(galeriIndex + 1); });
        var thumbsAll = document.querySelectorAll("#galeri-thumbs .thumb-btn");
        for (var ti = 0; ti < thumbsAll.length; ti++) {
          (function (btn) {
            btn.addEventListener("click", function () {
              var v = parseInt(btn.getAttribute("data-thumb"), 10);
              galeriGo(isNaN(v) ? 0 : v);
            });
          })(thumbsAll[ti]);
        }
        paintGaleri();

        // Menu: pakai `menus` bila valid (nama terisi + harga ada),
        // bila kosong → 4 menu dummy realistis inline (penanda hanya di kode).
        // _placeholder: tampilan sementara, bukan data terverifikasi; tanpa kata terlarang di UI.
        var _placeholderMenus = [
          { name: "Rawon Kucing", price: "Rp 15.000", rating: "4.6" },
          { name: "Rawon Tetelan", price: "Rp 15.000", rating: "4.6" },
          { name: "Rawon Bihun", price: "Rp 15.000", rating: "4.6" },
          { name: "Nasi Campur", price: "Rp 15.000", rating: "4.6" }
        ];
        var validMenus = [];
        try {
          var raw = Array.isArray(item.menus) ? item.menus : [];
          for (var m = 0; m < raw.length; m++) {
            var nm = raw[m] && raw[m].name ? String(raw[m].name) : "";
            var pr = raw[m] && raw[m].price ? String(raw[m].price) : "";
            if (!nm || /mock/i.test(nm) || !pr) continue;
            validMenus.push({ name: nm, price: pr, rating: rating });
          }
        } catch (e) { validMenus = []; }
        var menuList = validMenus.length ? validMenus : _placeholderMenus;
        var menuExpanded = false;
        function menuCard(menu) {
          return (
            '<article class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">' +
            '<div class="h-24 sm:h-28 bg-gradient-to-br from-amber-800 via-stone-700 to-slate-800" role="img" aria-label="Foto ' + menu.name + ' (placeholder)"></div>' +
            '<div class="p-2.5 sm:p-3">' +
            '<div class="flex items-center justify-between gap-2">' +
            '<h3 class="text-[11px] sm:text-xs font-bold text-gray-900 line-clamp-1">' + menu.name + "</h3>" +
            '<span class="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-semibold text-gray-700 shrink-0"><span aria-hidden="true" class="text-amber-400">★</span>' + (menu.rating || rating) + "</span>" +
            "</div>" +
            '<p class="text-[11px] sm:text-xs text-gray-500 mt-0.5">' + menu.price + "</p>" +
            "</div></article>"
          );
        }
        function renderMenus() {
          var grid = $("menu-grid");
          if (!grid) return;
          var showAll = menuExpanded || menuList.length <= 4;
          var visible = showAll ? menuList : menuList.slice(0, 4);
          grid.innerHTML = visible.map(menuCard).join("");
          var t = $("menu-toggle");
          if (t) {
            if (menuList.length <= 4) {
              t.textContent = menuExpanded ? "Tutup Menu ↑" : "Lihat Semua Menu →";
            } else {
              t.textContent = showAll ? "Tutup Menu ↑" : "Lihat Semua Menu →";
            }
            t.setAttribute("aria-expanded", showAll ? "true" : "false");
          }
        }
        renderMenus();
        var menuToggle = $("menu-toggle");
        if (menuToggle) menuToggle.addEventListener("click", function () {
          menuExpanded = !menuExpanded;
          renderMenus();
        });

        // Kartu rekomendasi / sekitar: pola kuliner (foto placeholder, nama, rating, jarak).
        // Sekitar (reco-sekitar): destinasi wisata TERDEKAT by jarak real (nearby.js),
        // link ke detail_wisata (Owner 2026-10-09). Reko (reco-kuliner): tetap kuliner.
        var _distances = ["10km - 12 menit", "20km - 24 menit", "25km - 28 menit", "30km - 32 menit"];
        function fmtDist(d, idx) {
          if (d && d._distKm != null && window.PasinfoNearby) {
            return window.PasinfoNearby.fmtKm(d._distKm);
          }
          return _distances[idx % _distances.length];
        }
        function recoCard(d, idx) {
          var dist = fmtDist(d, idx);
          var href = d._href || ("detail_kuliner.html?slug=" + d.slug);
          return (
            '<a href="' + href + '" class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group block">' +
            '<div class="h-24 sm:h-28 bg-gradient-to-br from-amber-800 via-stone-700 to-slate-800" role="img" aria-label="Foto ' + d.name + ' (placeholder)"></div>' +
            '<div class="p-2.5 sm:p-3">' +
            '<div class="flex items-center justify-between gap-2">' +
            '<h3 class="text-[11px] sm:text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-blue-700">' + d.name + "</h3>" +
            '<span class="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-semibold text-gray-700 shrink-0"><span aria-hidden="true" class="text-amber-400">★</span>4.6</span>' +
            "</div>" +
            '<p class="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">' + dist + "</p>" +
            "</div></a>"
          );
        }
        function renderReco(id, list) {
          var el = $(id);
          if (!el) return;
          el.innerHTML = list.slice(0, 4).map(recoCard).join("");
        }
        var others = DATA.culinaries.filter(function (d) { return d.id !== item.id; });
        var sameCat = others.filter(function (d) { return d.categoryId === item.categoryId; });
        var recoList = sameCat.length >= 4 ? sameCat : others;
        renderReco("reco-kuliner", recoList);
        // Sekitar = destinasi wisata terdekat (jarak real dari center region item,
        // karena koordinat kuliner null per mock contract). Link ke detail_wisata.
        var sekitarList = [];
        try {
          var WD = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];
          var ref = window.PasinfoNearby
            ? window.PasinfoNearby.refPoint(item, DATA.regions)
            : null;
          sekitarList = window.PasinfoNearby
            ? window.PasinfoNearby.nearest(ref, WD, 4)
            : [];
          sekitarList.forEach(function (d) {
            d._href = "detail_wisata.html?slug=" + d.slug;
          });
        } catch (e) {}
        if (!sekitarList.length) {
          var sameRegion = others.filter(function (d) { return d.regionId && item.regionId && d.regionId === item.regionId; });
          sekitarList = sameRegion.length >= 4 ? sameRegion : others;
        }
        renderReco("reco-sekitar", sekitarList);
        try {
          var regName = "";
          var regs = DATA.regions || [];
          for (var r = 0; r < regs.length; r++) {
            if (regs[r].id === item.regionId) { regName = regs[r].name; break; }
          }
          if (regName) setText("sekitar-title", "Jelajah Destinasi Sekitar " + regName);
        } catch (e) {}
      })();
    
