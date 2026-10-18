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

          // FOTO SEMENTARA (Owner 2026-10-14): gambar contoh domain, dipakai
          // bergilir bila media.url null. Ganti foto asli menyusul.
          // Owner 2026-10-15: hero/galeri → versi WebP penuh (1600px).
          var BUDAYA_FALLBACK_PHOTOS = [
            "../../public/assets/images/budaya/optimized/Tari Terbang Bandung & Tari Pasuruan Kondang.webp",
            "../../public/assets/images/budaya/optimized/Tradisi-Skilot.webp",
            "../../public/assets/images/budaya/optimized/Yadnya Karo Sodoran (Tosari).webp"
          ];
          function budayaPhotoFor(d) {
            if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
            var key = d && d.id != null ? String(d.id) : "";
            var sum = 0;
            for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
            return BUDAYA_FALLBACK_PHOTOS[sum % BUDAYA_FALLBACK_PHOTOS.length];
          }
          // Kartu kecil (rekomendasi) → varian thumbnail WebP (Owner 2026-10-15).
          var BUDAYA_THUMB_PHOTOS = [
            "../../public/assets/images/budaya/optimized/Tari Terbang Bandung & Tari Pasuruan Kondang.thumb.webp",
            "../../public/assets/images/budaya/optimized/Tradisi-Skilot.thumb.webp",
            "../../public/assets/images/budaya/optimized/Yadnya Karo Sodoran (Tosari).thumb.webp"
          ];
          function budayaThumbFor(d) {
            if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
            var key = d && d.id != null ? String(d.id) : "";
            var sum = 0;
            for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
            return BUDAYA_THUMB_PHOTOS[sum % BUDAYA_THUMB_PHOTOS.length];
          }

          // Foto hero: elemen <img> sudah ada di HTML (Owner 2026-10-16:
          // paritas detail_acara.html). Tanpa placeholder teks & tanpa fade —
          // langsung menyetel .src sehingga tidak ada "berkedip" mock/skeleton.
          function setHeroPhoto(el, url, name) {
            if (!el || !url) return;
            var img = el.querySelector("img");
            if (!img) return;
            img.src = url;
            img.alt = "Foto " + name;
            el.setAttribute("aria-label", "Foto " + name);
          }

          // --- Georute (paritas detail-kuliner.js) ---
          var userLocation = null;
          var userLocationName = "-";
          function getUserLocation(callback) {
            if (!navigator.geolocation) { callback(null); return; }
            navigator.geolocation.getCurrentPosition(
              function (pos) { callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
              function () { callback(null); },
              { timeout: 5000, maximumAge: 0 }
            );
          }
          function haversineDistance(lat1, lng1, lat2, lng2) {
            var R = 6371;
            var dLat = (lat2 - lat1) * Math.PI / 180;
            var dLng = (lng2 - lng1) * Math.PI / 180;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
          }
          function formatDistance(km) {
            if (!km && km !== 0) return "-";
            return "\u00b1" + km.toFixed(1) + " km";
          }
          function translateLatLngToRegion(lat, lng) {
            var regions = DATA.regions || [];
            var closest = null;
            var minDist = Infinity;
            for (var i = 0; i < regions.length; i++) {
              var r = regions[i];
              if (r.center && r.center.latitude && r.center.longitude) {
                var dist = haversineDistance(lat, lng, r.center.latitude, r.center.longitude);
                if (dist < minDist) { minDist = dist; closest = r; }
              }
            }
            return closest ? closest.name : "Pasuruan";
          }
          function formatEstimasi(km, transportType) {
            if (!km && km !== 0) return "-";
            var speedKmH = transportType === "motor" ? 40 : 30;
            var totalMenit = Math.ceil(km / speedKmH * 60);
            var jam = Math.floor(totalMenit / 60);
            var menit = totalMenit % 60;
            var label = transportType === "motor" ? "Motor" : "Mobil";
            return label + ": " + (jam > 0 ? jam + " jam " : "") + menit + " menit";
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
        function setHTML(id, html) {
          var el = $(id);
          if (el) el.innerHTML = html;
        }
        function esc(s) {
          return String(s == null ? "" : s);
        }
        function paras(text) {
          return String(text || "")
            .split(/\n{2,}/)
            .map(function (s) { return s.trim(); })
            .filter(Boolean);
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

        document.title = item.name + " - Pasuruan Info";
        setText("crumb-name", item.name);
        setText("hero-cat", "Budaya " + category);
        setText("detail-title", item.name);
        setText("detail-desc", item.short_description || item.name);
        setText("detail-location", item.address || "Pasuruan");
        // Owner 2026-10-17: baris rating hero meniru detail_wisata/detail_kuliner.
        setText("detail-rating", item.rating != null && item.rating !== "" ? String(item.rating) : "-");

        // Hero: foto budaya (contoh domain bila media null); .src disetel
        // langsung pada <img> (tanpa fade) — paritas detail_acara.html.
        var heroMedia = $("hero-media");
        if (heroMedia) setHeroPhoto(heroMedia, budayaPhotoFor(item), item.name);

          // --- 3. Tentang + tabel info (data nyata dari data-budaya.js) ---
          setText("tentang-title", "Tentang " + item.name);
          var tentangEl = $("tentang-desc");
          if (tentangEl) {
            var tentangParas = paras(item.description);
            if (!tentangParas.length) tentangParas = paras(item.short_description);
            tentangEl.innerHTML = tentangParas.length
              ? tentangParas.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("")
              : "<p>Deskripsi budaya segera hadir.</p>";
          }
          setText("info-kategori", "Budaya " + category);

          // Jam operasional: data null → tampilkan keterangan (tanpa jam karangan).
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
            setText("info-jadwal", "Informasi jam belum tersedia");
            var statusEl0 = $("info-jadwal-status");
            if (statusEl0) {
              statusEl0.textContent = "";
              statusEl0.className = "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700";
            }
          }

          setText("info-lokasi", item.address || "Pasuruan");

        // Display Source & Verification Info (pola detail_wisata, Tier 1.7)
        (function () {
          var sourceEl = $("source-info");
          var verificationEl = $("verification-info");

          if (sourceEl && item.sources && item.sources.length > 0) {
            var source = item.sources[0];
            var html = '<div class="text-sm">';
            html += '<p class="font-semibold text-gray-900">' + (source.name || "Sumber Tidak Diketahui") + '</p>';
            if (source.url) {
              html += '<p class="text-sm bud-accent-text mt-1"><a href="' + source.url + '" target="_blank" rel="noopener">Kunjungi sumber →</a></p>';
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

        // --- Lokasi & Rute (real: geolokasi + haversine; tanpa data karangan) ---
        setText("lokasi-desc", item.short_description || "Informasi lokasi dan rute menuju daya tarik budaya ini.");
        setText("route-lokasi", item.address || "Pasuruan");
        getUserLocation(function (loc) {
          if (loc) {
            userLocation = loc;
            userLocationName = translateLatLngToRegion(loc.lat, loc.lng);
            setText("route-dari", userLocationName);
            if (item.place && typeof item.place.latitude === "number" && typeof item.place.longitude === "number") {
              var distKm = haversineDistance(loc.lat, loc.lng, item.place.latitude, item.place.longitude);
              setText("route-jarak", formatDistance(distKm));
              setHTML("route-estimasi", formatEstimasi(distKm, "mobil") + " \u00b7 " + formatEstimasi(distKm, "motor"));
            }
          } else {
            setText("route-dari", "Izinkan lokasi untuk melihat rute");
          }
        });

        // --- 4. Sejarah + Nilai (data nyata; tanpa teks karangan) ---
        var descParas = paras(item.description);
        setText("sejarah-desc", descParas[0] || item.short_description || "Informasi sejarah belum tersedia.");
        setText("nilai-desc", item.short_description || descParas[1] || "Informasi nilai budaya belum tersedia.");

        // --- Galeri: foto besar + thumbs ---
        // Owner 2026-10-17 (instruksi 1): tanpa anak panah dan tanpa ganti
        // foto lokal di card. Semua foto (utama + thumb) menjadi <a> menuju
        // halaman galeri budaya — klik foto = navigasi galeri (keputusan
        // Owner). Gambar contoh domain; foto asli menyusul.
        var GALLERY_SHOTS = BUDAYA_FALLBACK_PHOTOS.map(function (url, idx) {
          return { label: "Foto " + (idx + 1) + ": " + item.name, url: url };
        });
        var GALERI_LINK = "galeri_budaya.html";
        var featured = $("galeri-featured");
        function paintFeatured() {
          if (featured) {
            featured.className = "w-full h-60 sm:h-80 rounded-xl overflow-hidden mb-4";
            featured.innerHTML =
              '<a href="' + GALERI_LINK + '" class="block w-full h-full">' +
              '<img src="' + GALLERY_SHOTS[0].url + '" alt="' + GALLERY_SHOTS[0].label + '" class="w-full h-full object-cover" /></a>';
            featured.setAttribute("aria-label", GALLERY_SHOTS[0].label);
          }
          paintThumbs();
        }
        function paintThumbs() {
          var wrap = $("galeri-thumbs");
          if (!wrap) return;
          var html = "";
          for (var t = 0; t < GALLERY_SHOTS.length; t++) {
            html +=
              '<a href="' + GALERI_LINK + '" aria-label="Lihat ' + GALLERY_SHOTS[t].label + '"' +
              ' class="h-16 sm:h-20 rounded-lg overflow-hidden flex' +
              (t === 0 ? " bud-accent-ring" : " opacity-80 hover:opacity-100") + ' transition-all">' +
              '<img src="' + GALLERY_SHOTS[t].url + '" alt="" class="w-full h-full object-cover" /></a>';
          }
          wrap.innerHTML = html;
        }
        paintFeatured();

        // --- 5-7. Kartu rekomendasi (konsep sama dengan galeri_budaya, Owner 2026-10-16):
        // foto + badge kategori (warna mengikuti domain item) + rating + judul +
        // deskripsi + alamat. Serupa/Lainnya = budaya; Sekitar = destinasi wisata.
        var WISATA_PHOTOS = [
          "../../public/assets/images/wisata/optimized/bromo2.webp",
          "../../public/assets/images/wisata/optimized/bromo3.webp",
          "../../public/assets/images/wisata/optimized/bromo_banner.webp",
          "../../public/assets/images/wisata/optimized/purwodadi-botanic-garden.webp",
          "../../public/assets/images/wisata/optimized/taman_safari_indonesia_2.webp",
          "../../public/assets/images/wisata/optimized/air-terjun-kakek-bodo.webp"
        ];
        function wisataPhotoFor(d) {
          if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
          var key = d && d.id != null ? String(d.id) : "";
          var sum = 0;
          for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
          return WISATA_PHOTOS[sum % WISATA_PHOTOS.length];
        }
        var BUDAYA_CATEGORIES = DATA.categories || [];
        function budayaCategoryName(id) {
          for (var i = 0; i < BUDAYA_CATEGORIES.length; i++) {
            if (BUDAYA_CATEGORIES[i].id === id) return BUDAYA_CATEGORIES[i].name;
          }
          return id || "";
        }
        var WISATA_DATA = window.PASINFO_WISATA || { categories: [] };
        function wisataCategoryName(id) {
          for (var i = 0; i < WISATA_DATA.categories.length; i++) {
            if (WISATA_DATA.categories[i].id === id) return WISATA_DATA.categories[i].name;
          }
          return id || "";
        }
        function recoCard(item, domain, photo, href, catName) {
          var badgeBg = domain === "Kuliner" ? "#2563eb" : domain === "Budaya" ? "#6d28d9" : "#dc2626";
          var rating = item.rating != null && item.rating !== "" ? item.rating : "-";
          var desc = item.short_description || "";
          var loc = item.address || "";
          return (
            '<a href="' + esc(href) + '" class="group block no-underline h-full">' +
            '<article class="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col bg-white">' +
            '<div class="absolute top-3 left-3 right-3 flex items-center justify-between z-10">' +
            '<span class="inline-block px-3 py-1 text-white text-xs font-bold rounded-md" style="background-color:' + badgeBg + '">' + esc(catName) + "</span>" +
            (domain === "Budaya"
              ? ""
              : '<span class="inline-block px-2.5 py-1 bg-white text-gray-900 text-xs font-semibold rounded-md flex items-center gap-1">' +
                '<img src="../../public/assets/icons/icon_rating.svg" alt="" class="w-4 h-4" />' + esc(rating) +
                "</span>") +
            "</div>" +
            '<div class="relative h-44 sm:h-48 lg:h-52 overflow-hidden bg-gray-200">' +
            '<img src="' + esc(photo) + '" alt="' + esc(item.name) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" loading="lazy" />' +
            "</div>" +
            '<div class="flex flex-col flex-1 p-4 bg-white">' +
            '<h3 class="font-bold text-gray-900 text-xl line-clamp-2 mb-2">' + esc(item.name) + "</h3>" +
            (desc ? '<p class="text-sm text-gray-600 line-clamp-2 mb-3">' + esc(desc) + "</p>" : "") +
            '<div class="text-xs text-gray-600 mt-auto">' +
            (loc ? '<p class="flex items-center gap-1"><img src="../../public/assets/icons/icon_lokasi-hitam.svg" alt="" class="w-4 h-4 flex-shrink-0" />' + esc(loc) + "</p>" : "") +
            "</div>" +
            "</div>" +
            "</article>" +
            "</a>"
          );
        }
        function cultureRecoHTML(list) {
          return list.map(function (d) {
            return recoCard(d, "Budaya", budayaPhotoFor(d), "detail_budaya.html?slug=" + esc(d.slug), budayaCategoryName(d.categoryId));
          }).join("");
        }
        function wisataRecoHTML(list) {
          return list.map(function (d) {
            var href = d._href || ("detail_wisata.html?slug=" + esc(d.slug));
            return recoCard(d, "Wisata", wisataPhotoFor(d), href, wisataCategoryName(d.categoryId));
          }).join("");
        }
        function fillFour(primary, others) {
          var out = primary.slice(0);
          for (var i = 0; i < others.length && out.length < 4; i++) {
            if (out.indexOf(others[i]) === -1) out.push(others[i]);
          }
          return out.slice(0, 4);
        }
        function renderReco(id, html) {
          var el = $(id);
          if (el) el.innerHTML = html;
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
        renderReco("reco-serupa", cultureRecoHTML(fillFour(sameCat, others)));
        renderReco("reco-lainnya", cultureRecoHTML(fillFour(diffCat, others)));
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
        renderReco("reco-sekitar", wisataRecoHTML(sekitarList));

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
        // --- Peta Leaflet interaktif (fallback SVG bila L belum siap) ---
        function initFullIndonesiaMap() {
          var box = $("lokasi-map");
          if (!box) return false;
          var destLat = item.place && typeof item.place.latitude === "number" ? item.place.latitude : null;
          var destLng = item.place && typeof item.place.longitude === "number" ? item.place.longitude : null;
          if (destLat === null || destLng === null) {
            console.warn("[detail-budaya] Koordinat budaya tidak valid");
            return false;
          }
          try {
            if (window.L) return initLeafletMap(box, destLat, destLng);
            return initCanvasMap(box, destLat, destLng);
          } catch (e) {
            console.error("[detail-budaya] Error saat init peta:", e);
            return false;
          }
        }
        function initLeafletMap(box, destLat, destLng) {
          try {
            var map = window.L.map(box, {
              scrollWheelZoom: false,
              zoomControl: true,
              attributionControl: false,
              dragging: true,
              touchZoom: true,
              doubleClickZoom: true,
              keyboard: false,
              preferCanvas: true,
            }).setView([destLat, destLng], 14);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19,
              updateWhenIdle: true,
              updateWhenZooming: false,
              keepBuffer: 1,
            }).addTo(map);
            window.L.circleMarker([destLat, destLng], {
              radius: 10, color: "#ffffff", weight: 3, fillColor: "#dc2626", fillOpacity: 1,
            }).bindPopup(item.name).addTo(map);
            if (userLocation) {
              window.L.circleMarker([userLocation.lat, userLocation.lng], {
                radius: 8, color: "#ffffff", weight: 2, fillColor: "#2563eb", fillOpacity: 1,
              }).bindPopup("Lokasi Anda: " + userLocationName).addTo(map);
              window.L.polyline([[userLocation.lat, userLocation.lng], [destLat, destLng]],
                { color: '#f59e0b', weight: 2, opacity: 0.7, dashArray: '5, 5' }).addTo(map);
            }
            var fallback = $("lokasi-map-fallback");
            if (fallback) fallback.setAttribute("aria-hidden", "true");
            return true;
          } catch (e) {
            console.error("[detail-budaya] Error saat init Leaflet map:", e);
            return false;
          }
        }
        function initCanvasMap(box, destLat, destLng) {
          try {
            var minLat = -10.5, maxLat = 5.5, minLng = 95, maxLng = 141;
            var canvasWidth = box.offsetWidth || 400;
            var canvasHeight = box.offsetHeight || 300;
            function latLngToPixel(lat, lng) {
              return {
                x: ((lng - minLng) / (maxLng - minLng)) * canvasWidth,
                y: ((maxLat - lat) / (maxLat - minLat)) * canvasHeight,
              };
            }
            var destPixel = latLngToPixel(destLat, destLng);
            var userPixel = userLocation ? latLngToPixel(userLocation.lat, userLocation.lng) : null;
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("width", canvasWidth);
            svg.setAttribute("height", canvasHeight);
            svg.setAttribute("viewBox", "0 0 " + canvasWidth + " " + canvasHeight);
            svg.setAttribute("class", "absolute inset-0");
            svg.style.pointerEvents = "none";
            var bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bg.setAttribute("width", canvasWidth);
            bg.setAttribute("height", canvasHeight);
            bg.setAttribute("fill", "#e5e7eb");
            svg.appendChild(bg);
            if (userPixel) {
              var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
              line.setAttribute("x1", userPixel.x); line.setAttribute("y1", userPixel.y);
              line.setAttribute("x2", destPixel.x); line.setAttribute("y2", destPixel.y);
              line.setAttribute("stroke", "#f59e0b"); line.setAttribute("stroke-width", "2");
              line.setAttribute("stroke-dasharray", "5,5"); line.setAttribute("opacity", "0.8");
              svg.appendChild(line);
            }
            var destMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            destMarker.setAttribute("cx", destPixel.x); destMarker.setAttribute("cy", destPixel.y);
            destMarker.setAttribute("r", "10"); destMarker.setAttribute("fill", "#dc2626");
            destMarker.setAttribute("stroke", "#ffffff"); destMarker.setAttribute("stroke-width", "3");
            svg.appendChild(destMarker);
            var destLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            destLabel.setAttribute("x", destPixel.x); destLabel.setAttribute("y", destPixel.y - 15);
            destLabel.setAttribute("text-anchor", "middle"); destLabel.setAttribute("fill", "#dc2626");
            destLabel.setAttribute("font-size", "12"); destLabel.setAttribute("font-weight", "bold");
            destLabel.textContent = "Budaya";
            svg.appendChild(destLabel);
            if (userPixel) {
              var userMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              userMarker.setAttribute("cx", userPixel.x); userMarker.setAttribute("cy", userPixel.y);
              userMarker.setAttribute("r", "8"); userMarker.setAttribute("fill", "#2563eb");
              userMarker.setAttribute("stroke", "#ffffff"); userMarker.setAttribute("stroke-width", "2");
              svg.appendChild(userMarker);
              var userLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
              userLabel.setAttribute("x", userPixel.x); userLabel.setAttribute("y", userPixel.y - 15);
              userLabel.setAttribute("text-anchor", "middle"); userLabel.setAttribute("fill", "#2563eb");
              userLabel.setAttribute("font-size", "12"); userLabel.setAttribute("font-weight", "bold");
              userLabel.textContent = "Anda";
              svg.appendChild(userLabel);
            }
            box.innerHTML = "";
            box.appendChild(svg);
            var legend = document.createElement("div");
            legend.className = "absolute bottom-2 left-2 bg-white/90 rounded px-2 py-1 text-xs";
            legend.innerHTML = '<span style="display:inline-block; width:8px; height:8px; background:#dc2626; border-radius:50%; margin-right:4px;"></span>Budaya ' +
                               '<span style="display:inline-block; width:8px; height:8px; background:#2563eb; border-radius:50%; margin-left:8px; margin-right:4px;"></span>Anda';
            box.appendChild(legend);
            var fallback = $("lokasi-map-fallback");
            if (fallback) fallback.setAttribute("aria-hidden", "true");
            return true;
          } catch (e) {
            console.error("[detail-budaya] Error saat init Canvas SVG map:", e);
            return false;
          }
        }
        function waitForLeafletAndInitMap() {
          var attempts = 0;
          var maxAttempts = 50;
          setTimeout(function () {
            var checkInterval = setInterval(function () {
              attempts++;
              var mapBox = $("lokasi-map");
              var containerReady = mapBox && mapBox.offsetHeight > 0 && mapBox.offsetWidth > 0;
              var leafletReady = window.L && window.L.map;
              if (leafletReady && containerReady) {
                clearInterval(checkInterval);
                setTimeout(function () { initFullIndonesiaMap(); }, 60);
              } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                initFullIndonesiaMap();
              }
            }, 100);
          }, 300);
        }
        function scheduleMapInit() {
          var box = $("lokasi-map");
          if (!box) return;
          if (!("IntersectionObserver" in window)) { waitForLeafletAndInitMap(); return; }
          var started = false;
          var io = new IntersectionObserver(function (entries) {
            var visible = entries.some(function (en) { return en.isIntersecting; });
            if (!visible || started) return;
            started = true;
            io.disconnect();
            waitForLeafletAndInitMap();
          }, { rootMargin: "250px 0px", threshold: 0 });
          io.observe(box);
        }
        scheduleMapInit();

        // Tombol "Dapatkan Arah & Rute" → Google Maps (googleMapsUrl asli, fallback koordinat).
        var ruteBtn = $("ruteBtn");
        if (ruteBtn) {
          ruteBtn.addEventListener("click", function (e) {
            e.preventDefault();
            if (item.googleMapsUrl) { window.open(item.googleMapsUrl, "_blank"); return; }
            if (item.place && typeof item.place.latitude === "number" && typeof item.place.longitude === "number") {
              window.open("https://www.google.com/maps/dir/?api=1&destination=" + item.place.latitude + "," + item.place.longitude, "_blank");
            } else {
              alert("Koordinat budaya tidak tersedia untuk membuka Google Maps.");
            }
          });
        }
      })();
    
