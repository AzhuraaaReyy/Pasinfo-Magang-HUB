/**
 * detail-wisata.js — dipindah VERBATIM dari inline <script> detail_wisata.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // Detail destinasi: render dari dataset bersama via ?slug=.
      // Tanpa slug → destinasi pertama. Tanpa backend: bookmark visual
      // saja, bagikan via Web Share API/clipboard.
      (function () {
        "use strict";
        function $(id) {
          return document.getElementById(id);
        }
        var DATA = window.PASINFO_WISATA;
        if (!DATA || !DATA.destinations.length) return;

        // Enrich data dengan sources & verification
        if (window.AddSourcesData && window.AddSourcesData.enrichWisata) {
          window.AddSourcesData.enrichWisata(DATA);
        }

        function catName(id) {
          var c = DATA.categories.filter(function (x) { return x.id === id; })[0];
          return c ? c.name : "";
        }
        function regName(id) {
          var r = DATA.regions.filter(function (x) { return x.id === id; })[0];
          return r ? r.name : "";
        }
        function slugParam() {
          try {
            return new URLSearchParams(window.location.search).get("slug");
          } catch (e) {
            return null;
          }
        }
        var dest =
          DATA.destinations.filter(function (d) { return d.slug === slugParam(); })[0] ||
          DATA.destinations[0];
        if (!dest) return;

        document.title = dest.name + " - Pasuruan Info";
        function setText(id, text) {
          var el = $(id);
          if (el) el.textContent = text;
        }
         setText("crumb-name", dest.name);
         setText("hero-cat", catName(dest.categoryId) || "Wisata");
         setText("detail-title", dest.name);
         setText("detail-location", dest.address);
         setText("tentang-desc", dest.short_description || "Deskripsi destinasi segera hadir.");
         setText("info-kategori", catName(dest.categoryId) || "-");
         setText("info-wilayah", regName(dest.regionId) || "-");
         setText("info-alamat", dest.address);
         
         // Opening hours dengan status real-time
         if (dest.opening_hours && window.OpeningHoursUtil) {
           var hoursDisplay = window.OpeningHoursUtil.getDisplay(dest.opening_hours);
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
           setText("info-jadwal", dest.opening_hours || "-");
         }
         
         // Baris tambahan hanya bila datanya ada (dummy sistematis ok)
        var infoRows = $("info-rows");
        if (infoRows) {
          var extra = "";
          if (dest.prices && dest.prices.length) {
            extra +=
              '<tr><td class="py-3.5 px-4 font-semibold text-gray-500">Harga</td>' +
              '<td class="py-3.5 px-4 font-bold text-gray-800">' + dest.prices.join(" - ") + "</td></tr>";
          }
          if (dest.opening_hours) {
            extra +=
              '<tr class="bg-gray-50/50"><td class="py-3.5 px-4 font-semibold text-gray-500">Jam Operasional</td>' +
              '<td class="py-3.5 px-4 font-bold text-gray-800">' + dest.opening_hours + "</td></tr>";
          }
          if (dest.fasilitas && dest.fasilitas.length) {
            extra +=
              '<tr><td class="py-3.5 px-4 font-semibold text-gray-500">Fasilitas</td><td class="py-3.5 px-4 font-medium text-gray-800">' +
              '<span class="flex flex-wrap gap-1.5">' +
              dest.fasilitas.map(function (f) {
                return '<span class="px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold text-gray-600">' + f + "</span>";
              }).join("") +
              "</span></td></tr>";
          }
          infoRows.insertAdjacentHTML("beforeend", extra);
        }
        // Rating pill di hero dihapus (hanya tampilkan di bawah lokasi)
        setText("hero-media-label", "Foto: " + dest.name + " (segera hadir)");
        setText("lokasi-alamat", dest.address);
        setText("lokasi-koordinat", dest.place.latitude + ", " + dest.place.longitude);
        var rute = $("rute-link");
        if (rute) {
          if (dest.googleMapsUrl) {
            rute.href = dest.googleMapsUrl;
          } else {
            rute.classList.add("hidden");
          }
        }
        // Foto: pakai media.url bila tersedia, bila tidak maka placeholder.
        var photoUrl = dest.media && dest.media[0] ? dest.media[0].url : null;
        if (photoUrl) {
          var heroMedia = $("hero-media");
          if (heroMedia) {
            heroMedia.innerHTML =
              '<img src="' + photoUrl + '" alt="Foto ' + dest.name + '" class="w-full h-full object-cover" />';
            heroMedia.setAttribute("aria-label", "Foto " + dest.name);
          }
          var galFeatured = $("galeri-featured");
          if (galFeatured) {
            galFeatured.innerHTML =
              '<img src="' + photoUrl + '" alt="Foto ' + dest.name + '" loading="lazy" class="w-full h-full object-cover" />';
            galFeatured.setAttribute("aria-label", "Foto " + dest.name);
          }
        }
        setText("sekitar-title", "Jelajah Destinasi Sekitar " + regName(dest.regionId));
        setText("serupa-title", catName(dest.categoryId) + " Serupa di Pasuruan");
        // Rincian tiket dari data (bila tidak ada, tampilkan status)
        var tiketList = $("tiket-list");
        if (tiketList) {
          var tiketRows = "";
          if (dest.prices && dest.prices.length) {
            tiketRows +=
              '<li class="flex justify-between items-center gap-2 pt-2">' +
              '<span class="text-gray-600 font-medium">Tiket Masuk</span>' +
              '<span class="font-bold text-gray-900 text-right">' + dest.prices.join(" - ") + "</span></li>";
          }
          if (dest.opening_hours) {
            tiketRows +=
              '<li class="flex justify-between items-center gap-2 pt-2">' +
              '<span class="text-gray-600 font-medium">Jam Operasional</span>' +
              '<span class="font-bold text-gray-900 text-right">' + dest.opening_hours + "</span></li>";
          }
          tiketList.innerHTML =
            tiketRows ||
            '<li class="text-xs text-gray-500 pt-2">Info tiket segera hadir.</li>';
        }

        // Mini peta: 1 penanda di atas latar polos (konsisten halaman wisata).
        // Dijalankan setelah Leaflet (defer) tersedia.
        function initMiniMap() {
          try {
            if (window.L && $("detail-map")) {
              var mini = window.L.map("detail-map", {
                scrollWheelZoom: false,
                zoomControl: false,
                attributionControl: false,
              }).setView([dest.place.latitude, dest.place.longitude], 13);
              window.L.circleMarker([dest.place.latitude, dest.place.longitude], {
                radius: 9,
                color: "#ffffff",
                weight: 3,
                fillColor: "#dc2626",
                fillOpacity: 1,
              }).addTo(mini);
            }
          } catch (e) {
            /* peta opsional: konten tetap tampil tanpanya */
          }
        }
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", initMiniMap);
        } else {
          initMiniMap();
        }

        // Display Source & Verification Info
        (function () {
          var sourceEl = $("source-info");
          var verificationEl = $("verification-info");
          
          if (sourceEl && dest.sources && dest.sources.length > 0) {
            var source = dest.sources[0];
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
          
          if (verificationEl && dest.verification) {
            var status = dest.verification.status || "unknown";
            var statusLabel = status === "verified" ? "Terverifikasi" : status === "pending" ? "Menunggu Verifikasi" : "Status Tidak Diketahui";
            var statusColor = status === "verified" ? "green" : status === "pending" ? "yellow" : "gray";
            var statusBgClass = "bg-" + statusColor + "-100";
            var statusTextClass = "text-" + statusColor + "-700";
            
            var html = '<div class="text-sm">';
            html += '<div class="flex items-center gap-2 mb-2">';
            html += '<span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ' + statusBgClass + ' ' + statusTextClass + '">' + statusLabel + '</span>';
            html += '</div>';
            if (dest.verification.verified_at) {
              var verifiedDate = new Date(dest.verification.verified_at);
              var dateStr = verifiedDate.toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
              html += '<p class="text-xs text-gray-600">Diverifikasi pada ' + dateStr + '</p>';
            }
            html += '</div>';
            verificationEl.innerHTML = html;
          } else if (verificationEl) {
            verificationEl.innerHTML = '<p class="text-xs text-gray-600">Status verifikasi belum tersedia</p>';
          }
        })();

        // Kartu rekomendasi (placeholder visual + data real)
        function recoCard(d) {
          return (
            '<a href="detail_wisata.html?slug=' + d.slug + '" class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col group">' +
            '<div class="relative h-44 bg-red-400" role="img" aria-label="Foto destinasi ' + d.name + ' (placeholder)">' +
            '<span class="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase rounded-lg">' + catName(d.categoryId) + "</span>" +
            "</div>" +
            '<div class="p-4 flex-1 flex flex-col justify-between">' +
            "<div>" +
            '<h4 class="font-bold text-gray-900 text-base group-hover:text-red-600 transition-colors">' + d.name + "</h4>" +
            '<p class="text-gray-500 text-xs mt-1 line-clamp-2">' + (d.short_description || "") + "</p>" +
            "</div>" +
            "</div></a>"
          );
        }
        function renderReco(id, list) {
          var el = $(id);
          if (el) el.innerHTML = list.slice(0, 4).map(recoCard).join("");
        }
        var others = DATA.destinations.filter(function (d) { return d.id !== dest.id; });
        renderReco(
          "reco-serupa",
          others.filter(function (d) { return d.categoryId === dest.categoryId; }),
        );
        renderReco(
          "reco-lainnya",
          others.filter(function (d) { return d.categoryId !== dest.categoryId; }),
        );
        // Sekitar = destinasi TERDEKAT by jarak real (haversine, nearby.js)
        // dari koordinat destinasi ini; fallback: satu region bila jarak
        // tak dapat dihitung (Owner 2026-10-09).
        var sekitarList = others.filter(function (d) { return d.regionId === dest.regionId; });
        try {
          var ref = window.PasinfoNearby
            ? window.PasinfoNearby.refPoint(dest, DATA.regions)
            : null;
          var near = window.PasinfoNearby
            ? window.PasinfoNearby.nearest(ref, others, 4)
            : [];
          if (near.length) sekitarList = near;
        } catch (e) {}
        renderReco("reco-sekitar", sekitarList);

        // Simpan (visual saja) + Bagikan (Web Share API / clipboard)
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
              navigator.share({ title: dest.name, url: url }).catch(function () {});
            } else if (navigator.clipboard) {
              navigator.clipboard.writeText(url).catch(function () {});
            }
          });
        }
      })();
    
