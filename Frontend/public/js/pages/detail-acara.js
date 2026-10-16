/**
 * detail-acara.js — dipindah VERBATIM dari inline <script> detail_acara.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // ── Detail Acara: render by-slug dari window.PASINFO_ACARA.events ──
      // Tanpa ?slug= → event featured pertama. Null-safe: occurrences/tickets/
      // organizer null → label netral (tanpa kata Mock pada tampilan).
      // Tiket/registrasi TAMPIL SEBAGAI INFORMASI SAJA (PRD §19.2): tombol
      // "Daftar / Beli Tiket" dan "Ingatkan Event" display-only, tanpa
      // booking/payment/backend.
      (function () {
        "use strict";
        function $(id) {
          return document.getElementById(id);
        }
        function setText(id, text) {
          var el = $(id);
          if (el) el.textContent = text;
        }
        // Bersihkan penanda mock ("Mock"/"(MOCK)"/"(mock…)") dari teks TAMPILAN.
        function cleanText(s) {
          if (s == null) return "";
          return String(s)
            .replace(/\s*\(MOCK\)/gi, "")
            .replace(/\s*\(mock[^)]*\)/gi, "")
            .replace(/\s+Mock\b/gi, "")
            .replace(/\s{2,}/g, " ")
            .trim();
        }
        // Turunan tampilan dari field schema (paritas acara-listing.js).
        var DET_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        var DET_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        function detPad(n) {
          return (n < 10 ? "0" : "") + n;
        }
        function detFmtFull(startsAt, endsAt) {
          if (!startsAt) return "";
          var s = new Date(startsAt);
          if (isNaN(s.getTime())) return "";
          var t = DET_DAYS[s.getDay()] + ", " + s.getDate() + " " + DET_MONTHS[s.getMonth()] + " " + s.getFullYear() +
            " | " + detPad(s.getHours()) + ":" + detPad(s.getMinutes());
          if (endsAt) {
            var e = new Date(endsAt);
            if (!isNaN(e.getTime())) t += " - " + detPad(e.getHours()) + ":" + detPad(e.getMinutes());
          }
          return t;
        }
        function detTicketType(price) {
          return price != null && Number(price) > 0 ? "Berbayar" : "Gratis";
        }
        function detPriceText(price) {
          if (price == null || Number(price) <= 0 || isNaN(Number(price))) return "";
          return "Rp " + String(Math.round(Number(price))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        }
          var DATA = window.PASINFO_ACARA;
          if (!DATA || !DATA.events || !DATA.events.length) return;

          // Enrich data dengan sources & verification
          if (window.AddSourcesData && window.AddSourcesData.enrichAcara) {
            window.AddSourcesData.enrichAcara(DATA);
          }

          // FOTO SEMENTARA (Owner 2026-10-14): gambar contoh domain, dipakai
          // bergilir bila media.url null. Ganti foto asli menyusul.
          // Owner 2026-10-15: hero/galeri → versi WebP penuh (1600px).
          var ACARA_FALLBACK_PHOTOS = [
            "../../public/assets/images/acara/optimized/bromo-marathon.webp",
            "../../public/assets/images/acara/optimized/Hari-Jadi-Kota-Pasuruan.webp",
            "../../public/assets/images/acara/optimized/Pekan-Raya-Pasuruan-(PRP).webp"
          ];
          function acaraPhotoFor(d) {
            if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
            var key = d && d.id != null ? String(d.id) : "";
            var sum = 0;
            for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
            return ACARA_FALLBACK_PHOTOS[sum % ACARA_FALLBACK_PHOTOS.length];
          }

          function catName(id) {
            var c = (DATA.categories || []).filter(function (x) { return x.id === id; })[0];
            return c ? c.name : "";
        }
        function slugParam() {
          try {
            return new URLSearchParams(window.location.search).get("slug");
          } catch (e) {
            return null;
          }
        }
        var featured = DATA.events.filter(function (d) { return !!d.featured; });
        var fallback = featured.length ? featured[0] : DATA.events[0];
        var current =
          DATA.events.filter(function (d) { return d.slug === slugParam(); })[0] ||
          fallback;
        if (!current) return;

        var name = cleanText(current.name) || "Acara Pasuruan";
        // MOCK fallback generik: satu pola dgn hero listing acara.html
        // (jadwal/lokasi/penyelenggara hero). Nilai generik dummy, bukan fakta.
        // MOCK: data null/placeholder -> fallback di bawah. Kontak "—" (tanpa nomor).
        var FALLBACK_SCHEDULE = "Minggu, 10 September 2027 | 08:00 - 12:00";
        var FALLBACK_LOCATION = "Alun-alun Kota Pasuruan";
        var FALLBACK_ORGANIZER = "Dinas Kebudayaan Kab. Pasuruan";
        var FALLBACK_QUOTA = "Tanpa Batas";
        function isPlaceholderRaw(v) {
          if (v == null) return true;
          var s = String(v);
          if (!s.trim()) return true;
          return /\(MOCK\)/i.test(s);
        }
        function realOr(raw, fb) {
          if (isPlaceholderRaw(raw)) return fb;
          return cleanText(raw) || fb;
        }
        var detOcc = current.occurrences && current.occurrences[0] ? current.occurrences[0] : null;
        var scheduleFull = (detOcc && detFmtFull(detOcc.starts_at, detOcc.ends_at)) || FALLBACK_SCHEDULE;
        var schedParts = String(scheduleFull).split("|");
        var scheduleDate = (schedParts[0] || "").trim() || "Minggu, 10 September 2027";
        var scheduleTime = (schedParts[1] || "").trim() || "08:00 - 12:00";
        // Venue/organizer kini terisi mock per event di data (mentah bertanda
        // MOCK, dibersihkan saat tampil) — tidak lagi dianggap placeholder.
        var venue = cleanText(current.venue_address) || FALLBACK_LOCATION;
        var organizer = cleanText(current.organizer_name) || FALLBACK_ORGANIZER;
        var contactRaw = cleanText(current.organizer_phone);
        var contact = contactRaw && !isPlaceholderRaw(current.organizer_phone) ? contactRaw : "—";
        var detPrice = current.tickets && current.tickets[0] ? current.tickets[0].price : null;
        var ticketType = detTicketType(detPrice);
        var ticketLabel = detPriceText(detPrice) || (ticketType + " · Info di lokasi acara");
        var category = catName(current.categoryId) || "Acara";
        var desc = cleanText(current.description || current.short_description) || "Informasi acara di Pasuruan.";
        var rangkaian = cleanText(current.short_description) || desc;

          document.title = name + " - Pasuruan Info";
          setText("crumb-name", name);
          setText("detail-title", name);
          setText("tentang-title", "Tentang " + name);
          setText("tentang-desc", desc);
          setText("rangkaian-desc", rangkaian);
          setText("evt-schedule-date", scheduleDate);
          setText("evt-schedule-time", scheduleTime);
          
          // Opening hours dengan status real-time (untuk acara, gunakan scheduleTime)
          if (scheduleTime && window.OpeningHoursUtil) {
            var hoursDisplay = window.OpeningHoursUtil.getDisplay(scheduleTime);
            var statusEl = document.getElementById("evt-schedule-status");
            if (statusEl) {
              statusEl.textContent = hoursDisplay.indicator + " " + hoursDisplay.status;
              if (hoursDisplay.isOpen === true) {
                statusEl.className = "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 w-fit";
              } else if (hoursDisplay.isOpen === false) {
                statusEl.className = "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 w-fit";
              } else {
                statusEl.className = "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 w-fit";
              }
            }
          }
          
          setText("evt-location", venue);
          setText("evt-organizer", organizer);
          setText("info-kategori", category);
        setText("info-tiket", ticketLabel);
        // Kuota peserta dari `capacity` (mock; null = Tanpa Batas).
        // CATATAN BACKEND: kandidat kolom `events.capacity` (INT nullable).
        var capacityTxt = FALLBACK_QUOTA;
        if (current.capacity != null && !isNaN(Number(current.capacity)) && Number(current.capacity) > 0) {
          capacityTxt = "Maksimal " + Number(current.capacity) + " peserta";
        }
        setText("info-kuota", capacityTxt);
        setText("info-kontak", contact);
        setText("info-penyelenggara", organizer);

        /* ── Lokasi & Rute: geolokasi + peta live + estimasi (pola
           detail-kuliner). Jarak dihitung (haversine), bukan disimpan. ── */
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
        function evtDistKm(a, b) {
          if (window.PasinfoNearby && window.PasinfoNearby.haversineKm) {
            try {
              return window.PasinfoNearby.haversineKm(a, b);
            } catch (e) {}
          }
          var R = 6371;
          var dLat = (b.lat - a.lat) * Math.PI / 180;
          var dLng = (b.lng - a.lng) * Math.PI / 180;
          var sLat = Math.sin(dLat / 2);
          var sLng = Math.sin(dLng / 2);
          var h = sLat * sLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sLng * sLng;
          return 2 * R * Math.asin(Math.sqrt(h));
        }
        function evtFmtKm(km) {
          if (window.PasinfoNearby && window.PasinfoNearby.fmtKm) {
            try {
              return window.PasinfoNearby.fmtKm(km);
            } catch (e) {}
          }
          if (km == null || !isFinite(km)) return "-";
          return "±" + km.toFixed(1).replace(".", ",") + " km";
        }
        function evtRefPoint(item) {
          if (window.PasinfoNearby && window.PasinfoNearby.refPoint) {
            try {
              var rp = window.PasinfoNearby.refPoint(item, (DATA && DATA.regions) || []);
              if (rp) return rp;
            } catch (e) {}
          }
          var p = item && item.place;
          if (p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)) {
            return { lat: p.latitude, lng: p.longitude };
          }
          return null;
        }
        function translateLatLngToRegion(lat, lng) {
          var regions = (DATA && DATA.regions) || [];
          var best = null;
          var minD = Infinity;
          for (var i = 0; i < regions.length; i++) {
            var r = regions[i];
            if (r.center && Number.isFinite(r.center.latitude) && Number.isFinite(r.center.longitude)) {
              var dd = evtDistKm({ lat: lat, lng: lng }, { lat: r.center.latitude, lng: r.center.longitude });
              if (dd < minD) { minD = dd; best = r; }
            }
          }
          return best ? best.name : "Pasuruan";
        }
        function formatEstimasi(km, transportType) {
          if (km == null || !isFinite(km)) return "-";
          var speedKmH = transportType === "motor" ? 40 : 30;
          var totalMenit = Math.ceil(km / speedKmH * 60);
          var jam = Math.floor(totalMenit / 60);
          var menit = totalMenit % 60;
          var iconPath = transportType === "motor"
            ? "../../public/assets/icons/icon_motor.svg"
            : "../../public/assets/icons/icon_mobil.svg";
          var label = transportType === "motor" ? "motor" : "mobil";
          return '<img src="' + iconPath + '" alt="" class="w-4 h-4 inline mr-1" />' + label + ": " + (jam > 0 ? jam + " jam " : "") + menit + " menit";
        }
        function setRouteHTML(id, html) {
          var el = $(id);
          if (el) el.innerHTML = html;
        }
        setText("route-lokasi", venue);
        getUserLocation(function (loc) {
          if (loc) {
            userLocation = loc;
            userLocationName = translateLatLngToRegion(loc.lat, loc.lng);
            var ref = evtRefPoint(current);
            if (ref) {
              var distKm = evtDistKm(loc, ref);
              setText("route-dari", userLocationName);
              setText("route-jarak", evtFmtKm(distKm));
              setRouteHTML("route-estimasi", formatEstimasi(distKm, "mobil") + " | " + formatEstimasi(distKm, "motor"));
            }
          } else {
            setText("route-dari", "Izinkan lokasi untuk melihat rute");
          }
        });

        // Display Source & Verification Info (pola detail_wisata, Tier 1.7)
        (function () {
          var sourceEl = document.getElementById("source-info");
          var verificationEl = document.getElementById("verification-info");

          if (sourceEl && current.sources && current.sources.length > 0) {
            var source = current.sources[0];
            var html = '<div class="text-sm">';
            html += '<p class="font-semibold text-gray-900">' + (source.name || "Sumber Tidak Diketahui") + '</p>';
            if (source.url) {
              html += '<p class="text-xs text-green-700 mt-1"><a href="' + source.url + '" target="_blank" rel="noopener">Kunjungi sumber →</a></p>';
            }
            html += '</div>';
            sourceEl.innerHTML = html;
          } else if (sourceEl) {
            sourceEl.innerHTML = '<p class="text-xs text-gray-600">Informasi sumber belum tersedia</p>';
          }

          if (verificationEl && current.verification) {
            var status = current.verification.status || "unknown";
            var statusLabel = status === "verified" ? "Terverifikasi" : status === "pending" ? "Menunggu Verifikasi" : "Status Tidak Diketahui";
            var html = '<div class="text-sm">';
            html += '<div class="flex items-center gap-2 mb-2">';
            html += '<span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ' + (status === "verified" ? "bg-green-100 text-green-700" : status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-200 text-gray-700") + '">' + statusLabel + '</span>';
            html += '</div>';
            if (current.verification.verified_at) {
              var verifiedDate = new Date(current.verification.verified_at);
              var dateStr = verifiedDate.toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
              html += '<p class="text-xs text-gray-600">Diverifikasi pada ' + dateStr + '</p>';
            }
            html += '</div>';
            verificationEl.innerHTML = html;
          } else if (verificationEl) {
            verificationEl.innerHTML = '<p class="text-xs text-gray-600">Status verifikasi belum tersedia</p>';
          }
        })();

        // Foto hero: pakai media.url bila ada; bila tidak pakai gambar contoh domain.
        var photoUrl = acaraPhotoFor(current);
        if (photoUrl) {
          var heroImg = $("evt-hero-img");
          if (heroImg) {
            heroImg.src = photoUrl;
            heroImg.alt = "Foto " + name;
          }
          var heroWrap = $("evt-hero-photo");
          if (heroWrap) heroWrap.setAttribute("aria-label", "Foto " + name);
        }

        /* Peta live + fallback (pola detail-kuliner, label Acara):
           Leaflet + OSM bila tersedia; kanvas SVG offline bila tidak.
           Inisialisasi malas saat section mendekati viewport. */
        function initEvtLeafletMap(box, destLat, destLng) {
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
            window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: "© OpenStreetMap contributors",
              maxZoom: 19,
              updateWhenIdle: true,
              updateWhenZooming: false,
              keepBuffer: 1,
            }).addTo(map);
            window.L.circleMarker([destLat, destLng], {
              radius: 10, color: "#ffffff", weight: 3, fillColor: "#dc2626", fillOpacity: 1,
            }).bindPopup(name).addTo(map);
            if (userLocation) {
              window.L.circleMarker([userLocation.lat, userLocation.lng], {
                radius: 8, color: "#ffffff", weight: 2, fillColor: "#2563eb", fillOpacity: 1,
              }).bindPopup("Lokasi Anda: " + userLocationName).addTo(map);
              window.L.polyline([[userLocation.lat, userLocation.lng], [destLat, destLng]],
                { color: "#f59e0b", weight: 2, opacity: 0.7, dashArray: "5, 5" }).addTo(map);
            }
            var fallback = $("lokasi-map-fallback");
            if (fallback) fallback.setAttribute("aria-hidden", "true");
            return true;
          } catch (e) {
            return false;
          }
        }
        function initEvtCanvasMap(box, destLat, destLng) {
          try {
            var canvasWidth = box.offsetWidth || 400;
            var canvasHeight = box.offsetHeight || 300;
            var svgNS = "http://www.w3.org/2000/svg";
            var svg = document.createElementNS(svgNS, "svg");
            svg.setAttribute("width", canvasWidth);
            svg.setAttribute("height", canvasHeight);
            svg.setAttribute("viewBox", "0 0 " + canvasWidth + " " + canvasHeight);
            svg.setAttribute("class", "absolute inset-0");
            svg.style.pointerEvents = "none";
            var cx = canvasWidth / 2;
            var cy = canvasHeight / 2;
            var destMarker = document.createElementNS(svgNS, "circle");
            destMarker.setAttribute("cx", cx);
            destMarker.setAttribute("cy", cy);
            destMarker.setAttribute("r", "10");
            destMarker.setAttribute("fill", "#dc2626");
            destMarker.setAttribute("stroke", "#ffffff");
            destMarker.setAttribute("stroke-width", "3");
            svg.appendChild(destMarker);
            var destLabel = document.createElementNS(svgNS, "text");
            destLabel.setAttribute("x", cx);
            destLabel.setAttribute("y", cy - 15);
            destLabel.setAttribute("text-anchor", "middle");
            destLabel.setAttribute("fill", "#dc2626");
            destLabel.setAttribute("font-size", "12");
            destLabel.setAttribute("font-weight", "bold");
            destLabel.textContent = "Acara";
            svg.appendChild(destLabel);
            box.innerHTML = "";
            box.appendChild(svg);
            var fallback = $("lokasi-map-fallback");
            if (fallback) fallback.setAttribute("aria-hidden", "true");
            return true;
          } catch (e) {
            return false;
          }
        }
        function initEvtFullMap() {
          var box = $("lokasi-map");
          if (!box) return false;
          var destLat = current.place && Number.isFinite(current.place.latitude) ? current.place.latitude : null;
          var destLng = current.place && Number.isFinite(current.place.longitude) ? current.place.longitude : null;
          if (destLat === null || destLng === null) return false;
          try {
            if (window.L && window.L.map) return initEvtLeafletMap(box, destLat, destLng);
            return initEvtCanvasMap(box, destLat, destLng);
          } catch (e) {
            return false;
          }
        }
        (function scheduleEvtMapInit() {
          var box = $("lokasi-map");
          if (!box) return;
          function start() {
            var attempts = 0;
            var timer = setInterval(function () {
              attempts++;
              var ready =
                box.offsetHeight > 0 &&
                box.offsetWidth > 0 &&
                window.L &&
                window.L.map;
              if (ready || attempts >= 50) {
                clearInterval(timer);
                setTimeout(initEvtFullMap, 60);
              }
            }, 100);
          }
          if (!("IntersectionObserver" in window)) {
            setTimeout(start, 300);
            return;
          }
          var started = false;
          var io = new IntersectionObserver(
            function (entries) {
              var visible = entries.some(function (en) {
                return en.isIntersecting;
              });
              if (!visible || started) return;
              started = true;
              io.disconnect();
              start();
            },
            { rootMargin: "250px 0px", threshold: 0 }
          );
          io.observe(box);
        })();

        var ruteBtn = $("ruteBtn");
        if (ruteBtn) {
          ruteBtn.addEventListener("click", function (e) {
            e.preventDefault();
            if (current.googleMapsUrl) {
              window.open(current.googleMapsUrl, "_blank");
              return;
            }
            if (current.place && Number.isFinite(current.place.latitude) && Number.isFinite(current.place.longitude)) {
              window.open(
                "https://www.google.com/maps/dir/?api=1&destination=" + current.place.latitude + "," + current.place.longitude,
                "_blank"
              );
            }
          });
        }

        // Ikon kartu memakai file aset lokal (paritas wisata: w-4 h-4).
        var EVT_ASSET = "../../public/assets/icons/";
        function evtCardIcon(file) {
          return '<img src="' + EVT_ASSET + file + '" alt="" aria-hidden="true" loading="lazy" class="w-4 h-4 flex-shrink-0 object-contain" />';
        }

        function photoInner(d, label) {
          var url = acaraPhotoFor(d);
          if (url) {
            return '<img src="' + url + '" alt="Foto ' + label + '" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />';
          }
          return '<img src="../../public/assets/images/poster-dummy.svg" alt="Poster ' + label + ' (placeholder)" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />';
        }

        // Kartu event pola mockup: foto + badge gelap, nama, meta berikon, pill "Lihat Detail →".
        // MOCK: pola sumber sama dgn listing acara.html (starts_at -> jadwal,
        // venue_address -> lokasi); placeholder -> fallback generik. Peserta "—"
        // (listing acara.html tidak punya kolom peserta, jadi tanpa angka baru).
        // Kartu rekomendasi pola wisata: pill kategori + badge jarak putih,
        // foto, judul, deskripsi, meta lokasi + jadwal. Seluruh kartu link.
        function eventCardHTML(d) {
          var dName = cleanText(d.name) || "Acara Pasuruan";
          var dOcc = d.occurrences && d.occurrences[0] ? d.occurrences[0] : null;
          var dSchedule = (dOcc && detFmtFull(dOcc.starts_at, dOcc.ends_at)) || FALLBACK_SCHEDULE;
          var dVenue = cleanText(d.venue_address) || FALLBACK_LOCATION;
          var dDesc = cleanText(d.short_description);
          var dDist = distLabel(d);
          return (
            '<a href="detail_acara.html?slug=' + d.slug + '" class="group block no-underline">' +
            '<article class="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">' +
            '<div class="absolute top-3 left-3 right-3 flex items-center justify-between z-10">' +
            '<span class="inline-block px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-md">' + (catName(d.categoryId) || "Acara") + "</span>" +
            (dDist
              ? '<span class="inline-block px-2.5 py-1 bg-white text-gray-900 text-xs font-semibold rounded-md flex items-center gap-1">' +
                evtCardIcon("icon_jarak.svg") + dDist + "</span>"
              : "") +
            "</div>" +
            '<div class="relative h-44 sm:h-48 lg:h-52 overflow-hidden bg-gray-200">' +
              photoInner(d, dName) +
            "</div>" +
            '<div class="flex flex-col flex-1 p-4 bg-white">' +
            '<h3 class="font-bold text-gray-900 text-base line-clamp-2 mb-2">' + dName + "</h3>" +
            (dDesc ? '<p class="text-xs text-gray-600 line-clamp-2 mb-3">' + dDesc + "</p>" : "") +
            '<div class="text-xs text-gray-600 space-y-1">' +
            '<p class="flex items-center gap-1">' + evtCardIcon("icon_lokasi-hitam.svg") + "<span class='truncate'>" + dVenue + "</span></p>" +
            '<p class="flex items-center gap-1">' + evtCardIcon("icon_kalender.svg") + "<span class='truncate'>" + dSchedule + "</span></p>" +
            "</div>" +
            "</div>" +
            "</article>" +
            "</a>"
          );
        }

        function fillUp(list, pool, n) {
          var out = list.slice(0, n);
          if (out.length < n) {
            var seen = {};
            out.forEach(function (d) { seen[d.slug] = true; });
            pool.forEach(function (d) {
              if (out.length >= n) return;
              if (!seen[d.slug]) {
                seen[d.slug] = true;
                out.push(d);
              }
            });
          }
          return out;
        }

        // Jarak badge dihitung dari acara ini ke tiap kartu (haversine via
        // helper di atas; schema §8: jarak dihitung, bukan disimpan).
        // Tampil apa adanya (sewilayah mock bisa ±100 m).
        // NOTE: harus di-assign SEBELUM renderGrid di bawah (var hoisting
        // tidak membawa nilai assignment).
        var evtRef = evtRefPoint(current);
        function distLabel(d) {
          if (!d) return "";
          var c = d.place;
          if (!evtRef || !c || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return "";
          return evtFmtKm(evtDistKm(evtRef, { lat: c.latitude, lng: c.longitude }));
        }

        var others = DATA.events.filter(function (d) { return d.slug !== current.slug; });
        var sameCat = others.filter(function (d) { return d.categoryId === current.categoryId; });
        var diffCat = others.filter(function (d) { return d.categoryId !== current.categoryId; });

        function renderGrid(id, list) {
          var el = $(id);
          if (el) el.innerHTML = list.map(eventCardHTML).join("");
        }
        renderGrid("reco-penyelenggara", fillUp(sameCat, others, 4));
        renderGrid("reco-lainnya", fillUp(diffCat, others, 4));

        // Jelajah Destinasi Sekitar Event: 4 destinasi wisata TERDEKAT by jarak
        // real (nearby.js) + link detail_wisata (Owner 2026-10-09; menggantikan
        // pola lama "tetap domain acara" + jarak dummy).
        // Kartu jelajah pola wisata: pill domain + badge putih, foto, judul,
        // deskripsi, meta lokasi + jarak. Badge = RATING untuk non-budaya
        // (Owner 2026-10-16); kartu domain/kategori budaya tetap badge JARAK.
        function isBudayaCard(d) {
          if (!d) return false;
          if (d._href && d._href.indexOf("detail_budaya") !== -1) return true;
          if (d._domain === "Budaya") return true;
          return false;
        }
        function jelajahCardHTML(d) {
          var dName = cleanText(d.name) || "Destinasi Sekitar";
          var href = d._href || ("detail_acara.html?slug=" + d.slug);
          var dDesc = cleanText(d.short_description);
          var dDist = distLabel(d);
          var dVenue = cleanText(d.venue_address) || cleanText(d.address) || "Pasuruan";
          var useRating = !isBudayaCard(d) && d.rating != null && d.rating !== "";
          var badgeInner = useRating
            ? evtCardIcon("icon_rating.svg") + d.rating
            : (dDist ? evtCardIcon("icon_jarak.svg") + dDist : "");
          return (
            '<a href="' + href + '" class="group block no-underline">' +
            '<article class="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">' +
            '<div class="absolute top-3 left-3 right-3 flex items-center justify-between z-10">' +
            '<span class="inline-block px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-md">Wisata</span>' +
            (badgeInner
              ? '<span class="inline-block px-2.5 py-1 bg-white text-gray-900 text-xs font-semibold rounded-md flex items-center gap-1">' +
                badgeInner + "</span>"
              : "") +
            "</div>" +
            '<div class="relative h-44 sm:h-48 lg:h-52 overflow-hidden bg-gray-200">' +
              photoInner(d, dName) +
            "</div>" +
            '<div class="flex flex-col flex-1 p-4 bg-white">' +
            '<h3 class="font-bold text-gray-900 text-base line-clamp-2 mb-2">' + dName + "</h3>" +
            (dDesc ? '<p class="text-xs text-gray-600 line-clamp-2 mb-3">' + dDesc + "</p>" : "") +
            '<div class="text-xs text-gray-600 space-y-1">' +
            '<p class="flex items-center gap-1">' + evtCardIcon("icon_lokasi-hitam.svg") + "<span class='truncate'>" + dVenue + "</span></p>" +
            (dDist ? '<p class="flex items-center gap-1">' + evtCardIcon("icon_jarak.svg") + "<span class='truncate'>" + dDist + "</span></p>" : "") +
            "</div>" +
            "</div>" +
            "</article>" +
            "</a>"
          );
        }
        var jelajahEl = $("jelajah-sekitar");
        if (jelajahEl) {
          // Sekitar = destinasi wisata terdekat (jarak real dari center region
          // event, karena koordinat event null per mock contract).
          var sekitarList = [];
          try {
            var WD = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];
            var regions = (window.PASINFO_ACARA && window.PASINFO_ACARA.regions) || [];
            var ref = window.PasinfoNearby
              ? window.PasinfoNearby.refPoint(current, regions)
              : null;
            sekitarList = window.PasinfoNearby
              ? window.PasinfoNearby.nearest(ref, WD, 4)
              : [];
            sekitarList.forEach(function (d) {
              d._href = "detail_wisata.html?slug=" + d.slug;
            });
          } catch (e) {}
          if (!sekitarList.length) {
            sekitarList = fillUp(others, DATA.events.filter(function (d) { return d.slug !== current.slug; }), 4);
          }
          jelajahEl.innerHTML = sekitarList.map(jelajahCardHTML).join("");
        }
      })();
    
