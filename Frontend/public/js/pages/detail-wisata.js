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

  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
    
    /* Init geolocation async (non-blocking) */
    getUserLocation(function(loc) {
      if (loc) {
        userLocation = loc;
        if (dest.place && dest.place.latitude && dest.place.longitude) {
          var distKm = haversineDistance(loc.lat, loc.lng, dest.place.latitude, dest.place.longitude);
          userDistanceToDestination = formatDistance(distKm);
        }
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
       tersedia; Owner akan mengganti). */
    var heroMedia = $("hero-media");
    var heroPhoto = wisataPhoto(dest);
    if (heroMedia && heroPhoto) {
      heroMedia.innerHTML =
        '<img src="' + esc(heroPhoto) + '" alt="Foto ' + esc(dest.name) + '" class="w-full h-full object-cover" />';
      heroMedia.setAttribute("aria-label", "Foto " + dest.name);
    }

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
        ? '<span class="flex flex-wrap gap-1.5 justify-end">' +
          facilities
            .map(function (f) {
              return (
                '<span class="px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold text-gray-600">' +
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
      "Destinasi ini berada di " +
      (dest.address || "alamat belum tersedia") +
      (regName(dest.regionId) ? ", " + regName(dest.regionId) : "") +
      ". Peta di bawah dapat dipakai untuk melihat titik lokasinya.";
    setText("lokasi-desc", lokasiDesc);
    setText("route-lokasi", dest.address || "-");
    setText("route-jarak", userDistanceToDestination);

    /* Peta mini: marker dari koordinat nyata (pola sama dengan halaman
       wisata: tanpa tile, hanya penanda). Fallback tetap tampil bila
       Leaflet tidak tersedia. */
    function initMiniMap() {
      var box = $("lokasi-map");
      if (!box) return false;
      if (!window.L) {
        console.warn("[detail-wisata] Leaflet tidak tersedia saat initMiniMap dipanggil");
        return false;
      }
      var lat = dest.place && typeof dest.place.latitude === "number" ? dest.place.latitude : null;
      var lng = dest.place && typeof dest.place.longitude === "number" ? dest.place.longitude : null;
      if (lat === null || lng === null) {
        console.warn("[detail-wisata] Koordinat tidak valid:", {lat: lat, lng: lng});
        return false;
      }
      try {
        var mini = window.L.map(box, {
          scrollWheelZoom: false,
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          touchZoom: false,
          doubleClickZoom: false,
          keyboard: false,
        }).setView([lat, lng], 13);
        window.L.circleMarker([lat, lng], {
          radius: 9,
          color: "#ffffff",
          weight: 3,
          fillColor: "#dc2626",
          fillOpacity: 1,
        }).addTo(mini);
        box.removeAttribute("role");
        box.setAttribute("aria-label", "Peta titik lokasi " + dest.name);
        var fallback = $("lokasi-map-fallback");
        if (fallback) fallback.setAttribute("aria-hidden", "true");
        console.log("[detail-wisata] Mini-map berhasil diinisialisasi untuk:", dest.name);
        return true;
      } catch (e) {
        console.error("[detail-wisata] Error saat init mini-map:", e);
        return false;
      }
    }
    
    /* Tunggu Leaflet tersedia sebelum inisialisasi map.
       Leaflet dimuat dengan defer, jadi mungkin belum siap. */
    function waitForLeafletAndInitMap() {
      if (window.L) {
        initMiniMap();
      } else {
        console.log("[detail-wisata] Leaflet belum tersedia, menunggu...");
        var attempts = 0;
        var maxAttempts = 50;
        var checkInterval = setInterval(function() {
          attempts++;
          if (window.L) {
            clearInterval(checkInterval);
            console.log("[detail-wisata] Leaflet siap, inisialisasi mini-map");
            initMiniMap();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.warn("[detail-wisata] Timeout menunggu Leaflet setelah " + (maxAttempts * 100) + "ms");
          }
        }, 100);
      }
    }
     waitForLeafletAndInitMap();

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
      if (sourceEl) {
        if (dest.sources && dest.sources.length) {
          sourceEl.innerHTML = dest.sources
            .map(function (s) {
              var html = '<div class="text-sm">';
              html += '<p class="font-semibold text-gray-800">' + esc(s.name) + "</p>";
              if (s.url) {
                html +=
                  '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" class="text-xs text-red-600 hover:text-red-700 font-semibold">Buka sumber' +
                  '<span class="sr-only"> (tautan eksternal)</span></a>';
              }
              html += "</div>";
              return html;
            })
            .join("");
        } else if (dest.source) {
          sourceEl.innerHTML =
            '<p class="text-xs text-gray-600">Berkas data: ' + esc(dest.source) + "</p>";
        } else {
          sourceEl.innerHTML =
            '<p class="text-xs text-gray-600">Informasi sumber belum tersedia</p>';
        }
      }

      var verificationEl = $("verification-info");
      if (verificationEl) {
        var status = (dest.verification && dest.verification.status) || "pending";
        var label = STATUS_LABELS[status] || "Menunggu Verifikasi";
        var cls = STATUS_CLASS[status] || STATUS_CLASS.pending;
        var html = '<div class="text-sm">';
        html +=
          '<span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ' +
          cls +
          '">' +
          esc(label) +
          "</span>";
        if (dest.verification && dest.verification.verified_at) {
          var d = new Date(dest.verification.verified_at);
          html +=
            '<p class="text-xs text-gray-600 mt-2">Diverifikasi pada ' +
            esc(d.toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })) +
            "</p>";
        }
        if (dest.keyakinan) {
          html +=
            '<p class="text-xs text-gray-600 mt-2">Keyakinan koordinat: ' +
            esc(CONFIDENCE_LABELS[dest.keyakinan] || dest.keyakinan) +
            "</p>";
        }
        html += "</div>";
        verificationEl.innerHTML = html;
      }
    })();

    /* ---------- 7. KARTU REKOMENDASI ---------- */
    function recoCard(item) {
      var itemDist = "-";
      if (userLocation && item.place && item.place.latitude && item.place.longitude) {
        var distKm = haversineDistance(userLocation.lat, userLocation.lng, item.place.latitude, item.place.longitude);
        itemDist = formatDistance(distKm);
      }
      
      var catName_val = H ? H.categoryName(item.categoryId || item.category_id) || "" : "";
      var rating = item.rating || 0;
      var photo = wisataPhoto(item) || lainPhoto(item) || PLACEHOLDER_MEDIA;
      var location = item.address || (item.place && item.place.name) || "-";
      
      return (
        '<a href="' + esc(item._href || "#") + '" class="group block no-underline">' +
        '<article class="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">' +
        
        '<div class="absolute top-3 left-3 right-3 flex items-center justify-between z-10">' +
        '<span class="inline-block px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-md">' +
        esc(catName_val) +
        '</span>' +
        '<span class="inline-block px-2.5 py-1 bg-white text-gray-900 text-xs font-semibold rounded-md">' +
        '⭐ ' + rating +
        '</span>' +
        '</div>' +
        
        '<div class="relative h-44 sm:h-48 lg:h-52 overflow-hidden bg-gray-200">' +
        '<img src="' + esc(photo) + '" alt="' + esc(item.name) + '" ' +
        'class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" ' +
        'loading="lazy" />' +
        '</div>' +
        
        '<div class="flex flex-col flex-1 p-4 bg-white">' +
        '<h3 class="font-bold text-gray-900 text-base line-clamp-2 mb-2">' +
        esc(item.name) +
        '</h3>' +
        '<p class="text-xs text-gray-600 line-clamp-2 mb-3">' +
        esc(item.short_description || "") +
        '</p>' +
        '<div class="text-xs text-gray-600 space-y-1">' +
        '<p>📍 ' + esc(location) + '</p>' +
        '<p>📏 ' + itemDist + '</p>' +
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
