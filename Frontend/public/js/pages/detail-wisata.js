/**
 * detail-wisata.js - halaman detail destinasi wisata.
 * =====================================================================
 * Riwayat:
 * - 2026-10-09: dipindah VERBATIM dari inline <script> detail_wisata.html
 *   (refactor A+B, Owner approved).
 * - 2026-10-13 (TASK-WIS-DETAIL-SYNC-001, Owner): render data-driven supaya
 *   halaman ini SINKRON dengan halaman listing wisata dan data-wisata.js:
 *   hero memakai gambar yang sudah ada, "Tentang Wisata" memakai paragraf
 *   `description` (3 paragraf), harga tiket + fasilitas + jam operasional
 *   dari data, cuaca memakai nilai contoh (API cuaca menyusul), galeri dari
 *   media[], dan "Jelajah Sekitar" kini lintas domain (kuliner + budaya +
 *   acara terdekat) memakai jarak nyata dari nearby.js.
 *
 * Timing: file ini tetap dieksekusi tanpa defer (urutan script lama tidak
 * berubah), tetapi render dijalankan setelah DOMContentLoaded supaya
 * dependensi deferred (add-sources-data.js, opening-hours-util.js,
 * leaflet.js) sudah tersedia. Sebelumnya render berjalan lebih dulu
 * sehingga kartu Sumber Informasi dan status jam operasional kosong.
 *
 * Catatan anti-fabrikasi:
 * - Tidak ada harga, tanggal, cuaca, atau titik peta yang dikarang di file
 *   ini. Angka tiket & cuaca berasal dari field dummy di data-wisata.js
 *   (sudah ditandai di sana); tanggal memakai tanggal nyata hari ini.
 * - Tombol "Pesan Tiket" tetap tombol visual (booking = fitur masa depan,
 *   PRD 16.3).
 */
(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    var el = $(id);
    if (el) el.textContent = text === null || text === undefined ? "" : String(text);
  }

  function setHTML(id, html) {
    var el = $(id);
    if (el) el.innerHTML = html === null || html === undefined ? "" : String(html);
  }

  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* Foto hero: elemen <img> sudah ada di HTML (Owner 2026-10-16: paritas
     detail_acara.html). Tanpa placeholder teks & tanpa transisi fade —
     langsung menyetel .src sehingga tidak ada "berkedip" mock/skeleton
     dan gambar mulai diunduh lebih awal (fetchpriority=high). Bila gambar
     gagal dimuat, <img> bawaan tetap tampil (tanpa error). */
  function setHeroPhoto(el, url, name) {
    if (!el || !url) return;
    var img = el.querySelector("img");
    if (!img) return;
    img.src = url;
    img.alt = "Foto " + name;
    el.setAttribute("aria-label", "Foto " + name);
  }

  /* Pola bento galeri (sama dengan susunan sebelumnya: foto besar 2x2,
     diikuti kartu 1x1). Slot dipakai bergilir sesuai jumlah media. */
  var GALLERY_SLOTS = [
    "col-span-2 row-span-2",
    "col-span-1",
    "col-span-1",
    "col-span-2 row-span-2",
    "col-span-1",
    "col-span-1",
    "col-span-2",
    "col-span-2",
    "col-span-1",
    "col-span-1",
    "col-span-1",
    "col-span-1",
  ];

  var PLAY_BADGE =
    '<span class="absolute inset-0 flex items-center justify-center">' +
    '<span class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center opacity-90 group-hover:opacity-100">' +
    '<svg class="w-5 h-5 text-white fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>' +
    "</span></span>";

  var PLACEHOLDER_MEDIA = "../../public/assets/images/poster-dummy.svg";

  var STATUS_LABELS = {
    verified: "Terverifikasi",
    pending: "Menunggu Verifikasi",
    rejected: "Ditolak",
    expired: "Kedaluwarsa",
  };
  var STATUS_CLASS = {
    verified: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    rejected: "bg-red-100 text-red-700",
    expired: "bg-gray-200 text-gray-700",
  };
  var CONFIDENCE_LABELS = {
    rendah: "Rendah",
    sedang: "Sedang",
    tinggi: "Tinggi",
    perlu_cek: "Perlu dicek",
  };

  function init() {
    var DATA = window.PASINFO_WISATA;
    if (!DATA || !DATA.destinations || !DATA.destinations.length) return;

    /* Helper bersama dari data-wisata.js (satu sumber dengan listing). */
    var H = window.PasinfoWisata || null;

    /* Sumber & verifikasi diisi util deferred ini. Aman karena render
       sudah menunggu DOMContentLoaded. */
    if (window.AddSourcesData && window.AddSourcesData.enrichWisata) {
      window.AddSourcesData.enrichWisata(DATA);
    }

    function catName(id) {
      return H ? H.categoryName(id) || "" : "";
    }
    function regName(id) {
      return H ? H.regionName(id) || "" : "";
    }

    /* Gambar: SATU sumber dengan halaman listing (data-wisata.js).
       - wisata         -> photoFor (media[0].url / aset lokal deterministik)
       - lintas domain  -> imageOf (media[0].url bila ada, else placeholder) */
    function wisataPhoto(item) {
      if (H && H.photoFor) return H.photoFor(item);
      if (item && item.media && item.media[0] && item.media[0].url) return item.media[0].url;
      return PLACEHOLDER_MEDIA;
    }
    function lainPhoto(item) {
      if (H && H.imageOf) return H.imageOf(item);
      if (item && item.media && item.media[0] && item.media[0].url) return item.media[0].url;
      return PLACEHOLDER_MEDIA;
    }
    function slugParam() {
      try {
        return new URLSearchParams(window.location.search).get("slug");
      } catch (e) {
        return null;
      }
    }

    var dest =
      DATA.destinations.filter(function (d) {
        return d.slug === slugParam();
      })[0] || DATA.destinations[0];
    if (!dest) return;

    document.title = dest.name + " - Pasuruan Info";

    /* Geolocation: jarak dari lokasi user sekarang ke destinasi */
    var userLocation = null;
    var userDistanceToDestination = "-";
    var userLocationName = "-";
    
    function getUserLocation(callback) {
      if (!navigator.geolocation) {
        callback(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function(pos) { callback({lat: pos.coords.latitude, lng: pos.coords.longitude}); },
        function() { callback(null); },
        { timeout: 5000, maximumAge: 0 }
      );
    }
    
    function haversineDistance(lat1, lng1, lat2, lng2) {
      var R = 6371; // km
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
      return "±" + km.toFixed(1) + " km";
    }
    
    /* FIX #2: Translate lat/lng ke nama lokasi (frontend mapping) */
    function translateLatLngToRegion(lat, lng) {
      /* Mapping simple: cek region mana yang terdekat atau cek bounding box */
      var regions = DATA.regions || [];
      var closestRegion = null;
      var minDist = Infinity;
      for (var i = 0; i < regions.length; i++) {
        var r = regions[i];
        if (r.center && r.center.latitude && r.center.longitude) {
          var dist = haversineDistance(lat, lng, r.center.latitude, r.center.longitude);
          if (dist < minDist) {
            minDist = dist;
            closestRegion = r;
          }
        }
      }
      return closestRegion ? closestRegion.name : "Pasuruan";
    }
    
    /* FIX #3: Format estimasi dengan jam-menit dan icon */
    function formatEstimasi(km, transportType) {
      if (!km && km !== 0) return "-";
      var speedKmH = transportType === "motor" ? 40 : 30; // motor 40, mobil 30
      var totalMenit = Math.ceil(km / speedKmH * 60);
      var jam = Math.floor(totalMenit / 60);
      var menit = totalMenit % 60;
      /* Use icon files from /public/assets/icons/ */
      var iconPath = transportType === "motor" 
        ? "../../public/assets/icons/icon_motor.svg"
        : "../../public/assets/icons/icon_mobil.svg";
      var label = transportType === "motor" ? "motor" : "mobil";
      return '<img src="' + iconPath + '" alt="" class="w-4 h-4 inline mr-1" />' + label + ': ' + (jam > 0 ? jam + ' jam ' : '') + menit + ' menit';
    }
     
     /* Init geolocation async (non-blocking) */
     getUserLocation(function(loc) {
       if (loc) {
         userLocation = loc;
         userLocationName = translateLatLngToRegion(loc.lat, loc.lng);
         
         if (dest.place && dest.place.latitude && dest.place.longitude) {
           var distKm = haversineDistance(loc.lat, loc.lng, dest.place.latitude, dest.place.longitude);
           userDistanceToDestination = formatDistance(distKm);
           
           /* FIX #2: Populate route-dari with location name (not lat/lng) */
           setText("route-dari", userLocationName);
           
      /* FIX #3: Calculate dual estimasi (mobil + motor) dengan format jam-menit + icon */
            var estimasiMobil = formatEstimasi(distKm, "mobil");
            var estimasiMotor = formatEstimasi(distKm, "motor");
            setHTML("route-estimasi", estimasiMobil + " | " + estimasiMotor);
         }
       } else {
         /* Geolocation not available or denied */
         setText("route-dari", "Izinkan lokasi untuk melihat rute");
       }
     });

    /* ---------- 1. HERO ---------- */
    setText("crumb-name", dest.name);
    setText("hero-cat", catName(dest.categoryId) || "Wisata");
    setText("detail-title", dest.name);
    setText("detail-desc", dest.short_description || "Deskripsi destinasi segera hadir.");
    setText("detail-location", dest.address || regName(dest.regionId) || "Pasuruan");

    /* Rating: pakai angka dari data (sama dengan kartu listing),
       bukan angka mockup lama "4.8 (3 rb ulasan)". */
    var ratingText = "";
    if (dest.rating !== null && dest.rating !== undefined && dest.rating !== "") {
      ratingText = String(dest.rating);
      if (dest.reviews_label) ratingText += " (" + dest.reviews_label + ")";
    }
    setText("detail-rating", ratingText || "Belum ada rating");

    /* Foto hero: media[0].url (aset lokal yang sudah ada sampai foto asli
       tersedia; Owner akan mengganti). Elemen <img> sudah ada di HTML —
       .src disetel langsung (tanpa fade) agar tidak muncul kedipan
       placeholder → foto. */
    var heroMedia = $("hero-media");
    var heroPhoto = wisataPhoto(dest);
    setHeroPhoto(heroMedia, heroPhoto, dest.name);

    /* ---------- 2. TENTANG WISATA (paragraf milik Owner) ---------- */
    var tentang = $("tentang-desc");
    var paragraphs = H && H.paragraphsOf ? H.paragraphsOf(dest) : [];
    if (tentang) {
      tentang.innerHTML = paragraphs.length
        ? paragraphs
            .map(function (p) {
              return "<p>" + esc(p) + "</p>";
            })
            .join("")
        : '<p class="text-gray-500">Deskripsi destinasi segera hadir.</p>';
    }

    /* ---------- 3. INFORMASI UTAMA (dl) ---------- */
    setText("info-kategori", catName(dest.categoryId) || "-");
    setText("info-wilayah", regName(dest.regionId) || "-");
    setText("info-tiket", (H && H.priceLabel(dest)) || "-");
    setText("info-lokasi", dest.address || "-");

    var hours = H && H.hoursDisplay ? H.hoursDisplay(dest) : null;
    if (hours) {
      setText("info-jadwal", hours.display || "-");
      var statusEl = $("info-jadwal-status");
      if (statusEl) {
        statusEl.textContent =
          (hours.indicator ? hours.indicator + " " : "") + (hours.status || "");
        if (hours.isOpen === true) {
          statusEl.className =
            "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700";
        } else if (hours.isOpen === false) {
          statusEl.className =
            "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700";
        } else {
          statusEl.className =
            "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700";
        }
      }
    }

    var fasilitasEl = $("info-fasilitas");
    var facilities = H && H.facilitiesOf ? H.facilitiesOf(dest) : [];
    if (fasilitasEl) {
      fasilitasEl.innerHTML = facilities.length
        ? '<span class="flex flex-wrap gap-2 justify-end">' +
          facilities
            .map(function (f) {
              return (
                '<span class="px-2.5 py-1.5 bg-gray-100 rounded text-sm font-semibold text-gray-700">' +
                esc(f.name) +
                "</span>"
              );
            })
            .join("") +
          "</span>"
        : "-";
    }

    /* ---------- 4. LOKASI & RUTE ---------- */
    var lokasiDesc =
      esc(dest.name) + " berlokasi di " +
      esc(dest.address || "alamat belum tersedia") +
      (regName(dest.regionId) ? ", " + regName(dest.regionId) : "") +
      ". Gunakan peta di bawah untuk melihat lokasi tepatnya, atau klik 'Dapatkan Arah & Rute' untuk navigasi ke Google Maps.";
    setText("lokasi-desc", lokasiDesc);
    setText("route-lokasi", dest.address || "-");
    setText("route-jarak", userDistanceToDestination);

     /* FIX #1: Peta Indonesia penuh dengan marker user location + destinasi + jarak visual 
        ALTERNATIF: Canvas-based map (tidak perlu Leaflet library) */
     function initFullIndonesiaMap() {
       var box = $("lokasi-map");
       if (!box) return false;
       
       var destLat = dest.place && typeof dest.place.latitude === "number" ? dest.place.latitude : null;
       var destLng = dest.place && typeof dest.place.longitude === "number" ? dest.place.longitude : null;
       if (destLat === null || destLng === null) {
         console.warn("[detail-wisata] Koordinat destinasi tidak valid");
         return false;
       }
       
       try {
         /* OPSI 1: Jika Leaflet tersedia, gunakan Leaflet */
         if (window.L) {
           return initLeafletMap(box, destLat, destLng);
         }
         
         /* OPSI 2: Fallback ke canvas SVG map (selalu muncul) */
         return initCanvasMap(box, destLat, destLng);
       } catch (e) {
         console.error("[detail-wisata] Error saat init peta:", e);
         return false;
       }
     }
     
      /* Leaflet-based map (high quality) */
      function initLeafletMap(box, destLat, destLng) {
        try {
          var indonesia = window.L.map(box, {
            scrollWheelZoom: false,
            zoomControl: true,
            attributionControl: false,
            dragging: true,
            touchZoom: true,
            doubleClickZoom: true,
            keyboard: false,
            preferCanvas: true,
          }).setView([-2.5, 112.5], 5);
          
          /* Add tile layer (OpenStreetMap).
             Perf: updateWhenIdle + keepBuffer kecil agar tile tidak terus
             dimuat saat idle/pan — mengurangi beban jaringan & repaint. */
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            updateWhenIdle: true,
            updateWhenZooming: false,
            keepBuffer: 1,
          }).addTo(indonesia);
          
          /* Marker destinasi (red) */
          window.L.circleMarker([destLat, destLng], {
            radius: 10,
            color: "#ffffff",
            weight: 3,
            fillColor: "#dc2626",
            fillOpacity: 1,
          }).bindPopup(dest.name).addTo(indonesia);
          
          /* Marker user location (blue) - jika tersedia */
          if (userLocation) {
            window.L.circleMarker([userLocation.lat, userLocation.lng], {
              radius: 8,
              color: "#ffffff",
              weight: 2,
              fillColor: "#2563eb",
              fillOpacity: 1,
            }).bindPopup("Lokasi Anda: " + userLocationName).addTo(indonesia);
            
            /* Garis jarak antara user dan destinasi */
            window.L.polyline(
              [[userLocation.lat, userLocation.lng], [destLat, destLng]],
              { color: '#f59e0b', weight: 2, opacity: 0.7, dashArray: '5, 5' }
            ).addTo(indonesia);
          }
          
          var fallback = $("lokasi-map-fallback");
          if (fallback) fallback.setAttribute("aria-hidden", "true");
          return true;
        } catch (e) {
          console.error("[detail-wisata] Error saat init Leaflet map:", e);
          return false;
        }
      }
     
      /* Canvas SVG-based map (fallback, selalu muncul) */
      function initCanvasMap(box, destLat, destLng) {
        try {
          /* Indonesia bounding box: lat -10.5 to 5.5, lng 95 to 141 */
          var minLat = -10.5, maxLat = 5.5, minLng = 95, maxLng = 141;
          var canvasWidth = box.offsetWidth || 400;
          var canvasHeight = box.offsetHeight || 300;
          
          /* Fungsi konversi lat/lng ke pixel dalam canvas */
          function latLngToPixel(lat, lng) {
            var x = ((lng - minLng) / (maxLng - minLng)) * canvasWidth;
            var y = ((maxLat - lat) / (maxLat - minLat)) * canvasHeight;
            return {x: x, y: y};
          }
          
          var destPixel = latLngToPixel(destLat, destLng);
          var userPixel = userLocation ? latLngToPixel(userLocation.lat, userLocation.lng) : null;
          
          /* Create SVG overlay */
          var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("width", canvasWidth);
          svg.setAttribute("height", canvasHeight);
          svg.setAttribute("viewBox", "0 0 " + canvasWidth + " " + canvasHeight);
          svg.setAttribute("class", "absolute inset-0");
          svg.style.pointerEvents = "none";
          
          /* Background */
          var bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          bg.setAttribute("width", canvasWidth);
          bg.setAttribute("height", canvasHeight);
          bg.setAttribute("fill", "#e5e7eb");
          svg.appendChild(bg);
          
          /* Garis jarak (user ke destinasi) */
          if (userPixel) {
            var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", userPixel.x);
            line.setAttribute("y1", userPixel.y);
            line.setAttribute("x2", destPixel.x);
            line.setAttribute("y2", destPixel.y);
            line.setAttribute("stroke", "#f59e0b");
            line.setAttribute("stroke-width", "2");
            line.setAttribute("stroke-dasharray", "5,5");
            line.setAttribute("opacity", "0.8");
            svg.appendChild(line);
          }
          
          /* Marker destinasi (red) */
          var destMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          destMarker.setAttribute("cx", destPixel.x);
          destMarker.setAttribute("cy", destPixel.y);
          destMarker.setAttribute("r", "10");
          destMarker.setAttribute("fill", "#dc2626");
          destMarker.setAttribute("stroke", "#ffffff");
          destMarker.setAttribute("stroke-width", "3");
          svg.appendChild(destMarker);
          
          /* Label destinasi */
          var destLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
          destLabel.setAttribute("x", destPixel.x);
          destLabel.setAttribute("y", destPixel.y - 15);
          destLabel.setAttribute("text-anchor", "middle");
          destLabel.setAttribute("fill", "#dc2626");
          destLabel.setAttribute("font-size", "12");
          destLabel.setAttribute("font-weight", "bold");
          destLabel.textContent = "Destinasi";
          svg.appendChild(destLabel);
          
          /* Marker user location (blue) - jika tersedia */
          if (userPixel) {
            var userMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            userMarker.setAttribute("cx", userPixel.x);
            userMarker.setAttribute("cy", userPixel.y);
            userMarker.setAttribute("r", "8");
            userMarker.setAttribute("fill", "#2563eb");
            userMarker.setAttribute("stroke", "#ffffff");
            userMarker.setAttribute("stroke-width", "2");
            svg.appendChild(userMarker);
            
            /* Label user */
            var userLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            userLabel.setAttribute("x", userPixel.x);
            userLabel.setAttribute("y", userPixel.y - 15);
            userLabel.setAttribute("text-anchor", "middle");
            userLabel.setAttribute("fill", "#2563eb");
            userLabel.setAttribute("font-size", "12");
            userLabel.setAttribute("font-weight", "bold");
            userLabel.textContent = "Anda";
            svg.appendChild(userLabel);
          }
          
          /* Clear existing content dan add SVG */
          box.innerHTML = "";
          box.appendChild(svg);
          
          /* Add legend */
          var legend = document.createElement("div");
          legend.className = "absolute bottom-2 left-2 bg-white/90 rounded px-2 py-1 text-xs";
          legend.innerHTML = '<span style="display:inline-block; width:8px; height:8px; background:#dc2626; border-radius:50%; margin-right:4px;"></span>Destinasi ' +
                             '<span style="display:inline-block; width:8px; height:8px; background:#2563eb; border-radius:50%; margin-left:8px; margin-right:4px;"></span>Anda';
          box.appendChild(legend);
          
          var fallback = $("lokasi-map-fallback");
          if (fallback) fallback.setAttribute("aria-hidden", "true");
          return true;
        } catch (e) {
          console.error("[detail-wisata] Error saat init Canvas SVG map:", e);
          return false;
        }
      }
     
      /* Tunggu Leaflet tersedia + DOM fully ready sebelum inisialisasi map.
         Strategi: Tunggu sampai container siap, coba Leaflet, jika gagal fallback ke Canvas SVG */
      function waitForLeafletAndInitMap() {
        var attempts = 0;
        var maxAttempts = 50; // 5 seconds timeout (50 × 100ms)
        var initialDelay = 300; // Wait 300ms untuk DOM/layout fully ready

        setTimeout(function() {
          var checkInterval = setInterval(function() {
            attempts++;
            
            var mapBox = $("lokasi-map");
            var containerReady = mapBox && mapBox.offsetHeight > 0 && mapBox.offsetWidth > 0;
            var leafletReady = window.L && window.L.map;
            
            if (leafletReady && containerReady) {
              clearInterval(checkInterval);
              setTimeout(function() {
                initFullIndonesiaMap();
              }, 60);
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              initFullIndonesiaMap();
            }
          }, 100);
        }, initialDelay);
      }
      
      /* Lazy-init peta: baru mulai memuat tile OSM saat bagian peta mendekati
         viewport. Ini mencegah tile dimuat saat transisi halaman (penyebab
         lag saat pindah dari daftar wisata) dan menghemat data di mobile. */
      function scheduleMapInit() {
        var box = $("lokasi-map");
        if (!box) return;
        if (!("IntersectionObserver" in window)) {
          waitForLeafletAndInitMap();
          return;
        }
        var started = false;
        var io = new IntersectionObserver(function(entries) {
          var visible = entries.some(function(en) { return en.isIntersecting; });
          if (!visible || started) return;
          started = true;
          io.disconnect();
          waitForLeafletAndInitMap();
        }, { rootMargin: "250px 0px", threshold: 0 });
        io.observe(box);
      }
      
      scheduleMapInit();

     /* Tombol: Dapatkan Arah & Rute (redirect ke Google Maps) */
     var ruteBtn = $("ruteBtn");
     if (ruteBtn) {
       ruteBtn.addEventListener("click", function (e) {
         e.preventDefault();
         if (dest.place && typeof dest.place.latitude === "number" && typeof dest.place.longitude === "number") {
           var mapsUrl = "https://www.google.com/maps/dir/?api=1&destination=" +
             dest.place.latitude + "," + dest.place.longitude;
           window.open(mapsUrl, "_blank");
         } else {
           alert("Koordinat destinasi tidak tersedia untuk membuka Google Maps.");
         }
       });
     }

     /* ---------- 5. GALERI (dari media[]) ---------- */
    var galeriGrid = $("galeri-grid");
    var media = H && H.photosOf ? H.photosOf(dest) : [];
    if (galeriGrid) {
      if (!media.length) {
        galeriGrid.innerHTML =
          '<div class="col-span-4 h-32 rounded-lg bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-500">Media belum tersedia</div>';
      } else {
        galeriGrid.innerHTML = media
          .map(function (m, i) {
            return galleryItemHTML(m, i, dest.name);
          })
          .join("");
      }
    }
    setText(
      "galeri-desc",
      media.length
        ? "Foto contoh memakai aset lokal yang sudah tersedia; foto dan video asli destinasi menyusul."
        : "Media destinasi ini belum tersedia."
    );

    function galleryItemHTML(m, index, label) {
      var slot = GALLERY_SLOTS[index % GALLERY_SLOTS.length];
      var isVideo = m && m.type === "video";
      var src = isVideo ? m.thumbnail_url : m && m.url;
      var inner = "";
      if (src) {
        inner =
          '<img src="' +
          esc(src) +
          '" alt="' +
          esc((m && (m.alt_text || m.alt)) || label) +
          '" loading="lazy" class="w-full h-full object-cover" />';
      } else {
        inner =
          '<span class="absolute inset-0 flex items-center justify-center px-2 text-center text-[10px] font-semibold text-gray-500">' +
          (isVideo ? "Video belum tersedia" : "Foto belum tersedia") +
          "</span>";
      }
      if (isVideo && src) inner += PLAY_BADGE;
      return '<div class="relative overflow-hidden rounded-lg bg-gray-200 group ' + slot + '">' + inner + "</div>";
    }

    /* ---------- 6. INFORMASI TAMBAHAN: cuaca & harga tiket ---------- */
    /* Cuaca: nilai contoh dari data-wisata.js (DUMMY_WEATHER, API cuaca
       menyusul) + tanggal nyata hari ini. Tidak ada angka cuaca yang
       dikarang di sini. */
    var weather = H && H.weatherOf ? H.weatherOf(dest) : null;
    if (weather) {
      setText("cuaca-judul", "Cuaca di " + dest.name);
      setText("cuaca-tanggal", "Hari ini, " + (H && H.todayLabel ? H.todayLabel() : ""));
      setText("cuaca-suhu", weather.temperature_c);
      setText("cuaca-kondisi", weather.condition_label || "-");
    }

    /* Tiket: baris dari destination_prices (turunan `prices` + 2 baris
       dummy, sudah ditandai di data-wisata.js). Label rupiah dibuat oleh
       priceLabel supaya format tetap satu sumber dengan listing. */
    var tiketList = $("tiket-list");
    if (tiketList) {
      var rows = H && H.ticketRows ? H.ticketRows(dest) : [];
      tiketList.innerHTML = rows.length
        ? rows
            .map(function (r) {
              var label = H && H.priceLabel ? H.priceLabel({ destination_prices: [r] }) : null;
              return (
                '<li class="flex justify-between gap-3">' +
                '<span class="text-gray-600">' +
                esc(r.name) +
                "</span>" +
                '<span class="font-bold text-gray-900 whitespace-nowrap">' +
                esc(label || "-") +
                "</span>" +
                "</li>"
              );
            })
            .join("")
        : '<li class="text-gray-500">Info tiket belum tersedia.</li>';
    }

    /* ---------- 6b. SUMBER & VERIFIKASI ---------- */
    (function () {
      var sourceEl = $("source-info");
      var verificationEl = $("verification-info");
      
      /* Build SUMBER INFORMASI HTML (tanpa label, karena label di HTML) */
      var sourceHtml = '';
      if (dest.sources && dest.sources.length) {
        sourceHtml = '<div class="space-y-2">';
        dest.sources.forEach(function(s) {
          sourceHtml += '<div class="text-sm">';
          sourceHtml += '<p class="font-semibold text-gray-800">' + esc(s.name) + '</p>';
          if (s.url) {
            sourceHtml += '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" class="text-xs text-red-600 hover:text-red-700 font-semibold">Buka sumber <span class="sr-only">(tautan eksternal)</span></a>';
          }
          sourceHtml += '</div>';
        });
        sourceHtml += '</div>';
      } else if (dest.source) {
        sourceHtml = '<p class="text-xs text-gray-600">Berkas data: ' + esc(dest.source) + '</p>';
      } else {
        sourceHtml = '<p class="text-xs text-gray-600">Informasi sumber belum tersedia</p>';
      }
      
      /* Build VERIFIKASI HTML (tanpa label) */
      var status = (dest.verification && dest.verification.status) || "pending";
      var label = STATUS_LABELS[status] || "Menunggu Verifikasi";
      var cls = STATUS_CLASS[status] || STATUS_CLASS.pending;
      var verifyHtml = '<div class="text-sm">';
      verifyHtml += '<span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ' + cls + '">' + esc(label) + '</span>';
      if (dest.verification && dest.verification.verified_at) {
        var d = new Date(dest.verification.verified_at);
        verifyHtml += '<p class="text-xs text-gray-600 mt-2">Diverifikasi pada ' + esc(d.toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })) + '</p>';
      }
      if (dest.keyakinan) {
        verifyHtml += '<p class="text-xs text-gray-600 mt-2">Keyakinan koordinat: ' + esc(CONFIDENCE_LABELS[dest.keyakinan] || dest.keyakinan) + '</p>';
      }
      verifyHtml += '</div>';
      
      /* Set ke masing-masing element */
      if (sourceEl) {
        sourceEl.innerHTML = sourceHtml;
      }
      if (verificationEl) {
        verificationEl.innerHTML = verifyHtml;
      }
    })();

    /* ---------- 7. KARTU REKOMENDASI ---------- */
    function getItemField(item, domain, fieldName) {
      if (fieldName === 'address') {
        if (domain === 'Acara') return item.venue_address || '-';
        return item.address || (item.place && item.place.name) || '-';
      }
      if (fieldName === 'name') {
        return item.name || '-';
      }
      if (fieldName === 'short_description') {
        return item.short_description || item.description || '-';
      }
      return '-';
    }

    function recoCard(item) {
      /* FIX #6: Calculate destination-to-destination distance (not user location) */
      var itemDist = "-";
      if (dest.place && dest.place.latitude && dest.place.longitude &&
          item.place && item.place.latitude && item.place.longitude) {
        var distKm = haversineDistance(dest.place.latitude, dest.place.longitude, 
                                       item.place.latitude, item.place.longitude);
        itemDist = formatDistance(distKm);
      }
      
      /* FIX #7: Render badge dengan kategori domain yang benar */
      var domain = item._domain || 'Wisata';
      var catId = item.categoryId || item.category_id;
      var catName_val = "";
      
      /* Mapping kategori berdasarkan domain */
      if (domain === 'Kuliner' && item.categories && item.categories.length) {
        catName_val = item.categories[0];
      } else if (domain === 'Budaya' && item.categories && item.categories.length) {
        catName_val = item.categories[0];
      } else if (domain === 'Acara' && item.categories && item.categories.length) {
        catName_val = item.categories[0];
      } else if (H) {
        catName_val = H.categoryName(catId) || "";
      }
      
      var rating = item.rating || 0;
      var photo = wisataPhoto(item) || lainPhoto(item) || PLACEHOLDER_MEDIA;
      var cardName = getItemField(item, domain, 'name');
      var cardDesc = getItemField(item, domain, 'short_description');
      var cardLocation = getItemField(item, domain, 'address');
      // Badge lintas-domain mengikuti warna domain masing-masing
      // (Owner 2026-10-16; pola detail-budaya): Kuliner biru, Budaya ungu,
      // selainnya merah wisata.
      var badgeBg = domain === 'Kuliner' ? '#2563eb' : domain === 'Budaya' ? '#6d28d9' : '#dc2626';

      return (
        '<a href="' + esc(item._href || ("detail_wisata.html?slug=" + item.slug)) + '" class="group block no-underline">' +
        '<article class="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">' +

        '<div class="absolute top-3 left-3 right-3 flex items-center justify-between z-10">' +
        '<span class="inline-block px-3 py-1 text-white text-xs font-bold rounded-md" style="background-color:' + badgeBg + '">' +
        esc(catName_val || domain) +
        '</span>' +
        /* FIX #5: Use icon_rating.svg instead of icon_fasilitas.svg */
        (domain === 'Budaya'
        ? ''
        : '<span class="inline-block px-2.5 py-1 bg-white text-gray-900 text-xs font-semibold rounded-md flex items-center gap-1">' +
        '<img src="../../public/assets/icons/icon_rating.svg" alt="" class="w-4 h-4" />' +
        rating +
        '</span>') +
        '</div>' +
        
        '<div class="relative h-44 sm:h-48 lg:h-52 overflow-hidden bg-gray-200">' +
        '<img src="' + esc(photo) + '" alt="' + esc(cardName) + '" ' +
        'class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" ' +
        'loading="lazy" />' +
        '</div>' +
        
        '<div class="flex flex-col flex-1 p-4 bg-white">' +
        '<h3 class="font-bold text-gray-900 text-base line-clamp-2 mb-2">' +
        esc(cardName) +
        '</h3>' +
        '<p class="text-xs text-gray-600 line-clamp-2 mb-3">' +
        esc(cardDesc) +
        '</p>' +
        '<div class="text-xs text-gray-600 space-y-1">' +
        '<p class="flex items-center gap-1"><img src="../../public/assets/icons/icon_lokasi-hitam.svg" alt="" class="w-4 h-4 flex-shrink-0" />' + esc(cardLocation) + '</p>' +
        '<p class="flex items-center gap-1"><img src="../../public/assets/icons/icon_jarak.svg" alt="" class="w-4 h-4 flex-shrink-0" />' + itemDist + '</p>' +
        '</div>' +
        '</div>' +
        
        '</article>' +
        '</a>'
      );
    }

    function renderReco(id, list, limit) {
      var el = $(id);
      if (el) el.innerHTML = list.slice(0, limit || 4).map(recoCard).join("");
    }

    var others = DATA.destinations.filter(function (d) {
      return d.id !== dest.id;
    });

    /* Destinasi yang sama bisa terdaftar di domain lain (mis. candi-sepilar
       ada di wisata dan budaya) -> keluarkan agar tidak jadi "tetangga" diri
       sendiri pada Jelajah Sekitar. */
    var crossPool = crossDomainPool().filter(function (x) {
      return x.slug !== dest.slug;
    });

    renderReco(
      "reco-serupa",
      others.filter(function (d) {
        return d.categoryId === dest.categoryId;
      }),
      4
    );
    renderReco(
      "reco-lainnya",
      others.filter(function (d) {
        return d.categoryId !== dest.categoryId;
      }),
      4
    );

    /* Jelajah Sekitar = LINTAS DOMAIN (Owner 2026-10-13): kuliner + budaya +
       acara terdekat dari koordinat destinasi ini. Jarak nyata (haversine,
       nearby.js). Bila acuan/titik tidak tersedia, jatuh ke destinasi wisata
       satu wilayah (perilaku lama). */
    setText("sekitar-title", "Jelajah Sekitar " + (regName(dest.regionId) || "Pasuruan"));

    function crossDomainPool() {
      var pool = [];
      function push(list, domain, hrefPrefix) {
        if (!list || !list.length) return;
        for (var i = 0; i < list.length; i++) {
          var item = list[i];
          if (!item) continue;
          item._domain = domain;
          item._href = hrefPrefix + item.slug;
          pool.push(item);
        }
      }
      var K = window.PASINFO_KULINER;
      var B = window.PASINFO_BUDAYA;
      var A = window.PASINFO_ACARA;
      push(K && K.culinaries, "Kuliner", "detail_kuliner.html?slug=");
      push(B && B.cultures, "Budaya", "detail_budaya.html?slug=");
      push(A && A.events, "Acara", "detail_acara.html?slug=");
      return pool;
    }

     /* Pemetaan kategori ke folder aset gambar */
     function getImageForItem(item) {
       var domain = item._domain;
       if (domain === "Kuliner") return "../../public/assets/images/poster-dummy.svg";
       if (domain === "Budaya") return "../../public/assets/images/poster-dummy.svg";
       if (domain === "Acara") return "../../public/assets/images/poster-dummy.svg";
       // Fallback: wisata photos
       return wisataPhoto(item) || lainPhoto(item) || PLACEHOLDER_MEDIA;
     }

     var sekitarList = [];
     var ref =
       window.PasinfoNearby && typeof window.PasinfoNearby.refPoint === "function"
         ? window.PasinfoNearby.refPoint(dest, DATA.regions)
         : null;
     if (ref && window.PasinfoNearby && crossPool.length) {
       sekitarList = window.PasinfoNearby.nearest(ref, crossPool, 8);
     }
     if (!sekitarList.length) {
       sekitarList = others.filter(function (d) {
         return d.regionId === dest.regionId;
       });
     }
     // Limit to 4 items
     if (sekitarList.length > 4) {
       sekitarList = sekitarList.slice(0, 4);
     }
     renderReco("reco-sekitar", sekitarList, 4);

    /* ---------- 8. Simpan (visual) + Bagikan (Web Share API/clipboard) ---------- */
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
  }


  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
