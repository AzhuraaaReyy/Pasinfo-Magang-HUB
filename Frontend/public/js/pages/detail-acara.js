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
          var DATA = window.PASINFO_ACARA;
          if (!DATA || !DATA.events || !DATA.events.length) return;

          // Enrich data dengan sources & verification
          if (window.AddSourcesData && window.AddSourcesData.enrichAcara) {
            window.AddSourcesData.enrichAcara(DATA);
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
        var rawSchedule = current.occurrences && current.occurrences[0] ? current.occurrences[0].label : null;
        var scheduleFull = realOr(rawSchedule, FALLBACK_SCHEDULE);
        var schedParts = String(scheduleFull).split("|");
        var scheduleDate = (schedParts[0] || "").trim() || "Minggu, 10 September 2027";
        var scheduleTime = (schedParts[1] || "").trim() || "08:00 - 12:00";
        var venue = realOr(current.venue_address, FALLBACK_LOCATION);
        var organizer = realOr(current.organizer_name, FALLBACK_ORGANIZER);
        var contactRaw = cleanText(current.organizer_phone);
        var contact = contactRaw && !isPlaceholderRaw(current.organizer_phone) ? contactRaw : "—";
        var rawTicket = current.tickets && current.tickets[0] ? current.tickets[0].price_label : null;
        var ticketType = current.tickets && current.tickets[0] ? cleanText(current.tickets[0].ticket_type) : "";
        var ticketLabel = !isPlaceholderRaw(rawTicket) && cleanText(rawTicket)
          ? cleanText(rawTicket)
          : (ticketType ? ticketType + " \u00B7 Info di lokasi acara" : "Info di lokasi acara");
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
        setText("info-kuota", FALLBACK_QUOTA);
        setText("info-kontak", contact);
        setText("info-penyelenggara", organizer);
        setText("lokasi-alamat", venue);

        // Display Source & Verification Info (pola detail_wisata, Tier 1.7)
        (function () {
          var sourceEl = document.getElementById("source-info");
          var verificationEl = document.getElementById("verification-info");

          if (sourceEl && current.sources && current.sources.length > 0) {
            var source = current.sources[0];
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

        // Foto hero: pakai media.url bila ada, bila tidak tetap placeholder.
        var photoUrl = current.media && current.media[0] ? current.media[0].url : null;
        if (photoUrl) {
          var heroImg = $("evt-hero-img");
          if (heroImg) {
            heroImg.src = photoUrl;
            heroImg.alt = "Foto " + name;
          }
          var heroWrap = $("evt-hero-photo");
          if (heroWrap) heroWrap.setAttribute("aria-label", "Foto " + name);
        }

        // Tautan rute: hanya aktif bila URL terverifikasi tersedia.
        var rute = $("rute-link");
        if (rute) {
          if (current.googleMapsUrl) {
            rute.href = current.googleMapsUrl;
            rute.setAttribute("aria-disabled", "false");
            rute.title = "Buka rute menuju lokasi acara";
            rute.target = "_blank";
            rute.rel = "noopener noreferrer";
          }
        }

        var ICON_PIN = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>';
        var ICON_CAL = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>';
        var ICON_USER = '<svg class="h-3 w-3 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>';

        function photoInner(d, label) {
          var url = d.media && d.media[0] ? d.media[0].url : null;
          if (url) {
            return '<img src="' + url + '" alt="Foto ' + label + '" loading="lazy" class="w-full h-full object-cover" />';
          }
          return '<img src="../../public/assets/images/poster-dummy.svg" alt="Poster ' + label + ' (placeholder)" loading="lazy" class="w-full h-full object-cover" />';
        }

        // Kartu event pola mockup: foto + badge gelap, nama, meta berikon, pill "Lihat Detail →".
        // MOCK: pola sumber sama dgn listing acara.html (occurrences[0].label -> jadwal,
        // venue_address -> lokasi); placeholder -> fallback generik. Peserta "—"
        // (listing acara.html tidak punya kolom peserta, jadi tanpa angka baru).
        function eventCardHTML(d) {
          var dName = cleanText(d.name) || "Acara Pasuruan";
          var dRawSched = d.occurrences && d.occurrences[0] ? d.occurrences[0].label : null;
          var dSchedule = realOr(dRawSched, FALLBACK_SCHEDULE);
          var dVenue = realOr(d.venue_address, FALLBACK_LOCATION);
          return (
            '<a href="detail_acara.html?slug=' + d.slug + '" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow group">' +
              '<div class="relative h-32 sm:h-40 overflow-hidden shrink-0">' +
                photoInner(d, dName) +
                '<span class="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold">' + dSchedule + "</span>" +
              "</div>" +
              '<div class="p-3 flex flex-1 flex-col">' +
                '<h3 class="font-bold text-xs sm:text-sm text-gray-900 leading-snug group-hover:text-blue-700 transition-colors">' + dName + "</h3>" +
                '<div class="mt-2 text-gray-500 space-y-1 text-[10px] sm:text-[11px]">' +
                  '<p class="flex items-center gap-1">' + ICON_PIN + "<span class='truncate'>" + dVenue + "</span></p>" +
                  '<p class="flex items-center gap-1">' + ICON_CAL + "<span class='truncate'>" + dSchedule + "</span></p>" +
                  '<p class="flex items-center gap-1">' + ICON_USER + "<span>\u2014</span></p>" +
                "</div>" +
                '<div class="mt-auto pt-3 flex justify-end">' +
                  '<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] sm:text-[11px] font-bold">Lihat Detail <span aria-hidden="true">→</span></span>' +
                "</div>" +
              "</div>" +
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
        function distLabel(d, i) {
          if (d && d._distKm != null && window.PasinfoNearby) {
            return window.PasinfoNearby.fmtKm(d._distKm);
          }
          return DISTANCES[i % DISTANCES.length];
        }
        function jelajahCardHTML(d, i) {
          var dName = cleanText(d.name) || "Acara Pasuruan";
          var href = d._href || ("detail_acara.html?slug=" + d.slug);
          return (
            '<a href="' + href + '" class="block group">' +
              '<div class="relative h-32 sm:h-40 rounded-xl overflow-hidden bg-blue-500">' +
                photoInner(d, dName) +
                '<span class="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 text-amber-300 text-[10px] font-bold">' +
                  '<svg class="h-3 w-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>' +
                  "4.6</span>" +
              "</div>" +
              '<h3 class="mt-2 font-bold text-xs sm:text-sm text-gray-900 group-hover:text-blue-700 transition-colors">' + dName + "</h3>" +
              '<p class="text-[10px] sm:text-[11px] text-gray-500">' + distLabel(d, i) + "</p>" +
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
    
