/**
 * Pasuruan Info — Wisata Interactive Map (Leaflet + Vanilla JS)
 * ============================================================
 *
 * DATA  : window.PASINFO_WISATA (public/js/data-wisata.js,
 *         dibangkitkan dari public/data/destinasi-wisata-pasuruan.json).
 *         Single source of truth untuk marker, kartu, detail, filter.
 *         JANGAN hardcode destinasi di file ini.
 *
 * STATE : { selectedRegion, selectedCategory, selectedDestination }
 *         berisi id atau null. Region != destination (§prompt 13).
 *
 * ALUR  : region → filter → marker → pilih destinasi → detail.
 *         Klik marker TIDAK mereset region yang aktif.
 */

(function () {
  "use strict";

  var DATA = window.PASINFO_WISATA;
  var mapEl = document.getElementById("wisata-map");
  if (!DATA || !mapEl || !window.L) return;

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Batas wilayah Pasuruan (Kota + Kabupaten) — kasar, untuk
     membatasi viewport agar tidak membahas wilayah lain.
     BUKAN batas administrasi resmi. */
  var PASURUAN_BOUNDS = null;
  /* Titik tengah bbox Kabupaten Pasuruan (terverifikasi dari data
     kabupaten-pasuruan-batas): acuan kuadran klasifikasi. */
  var GEO_CENTER = { latitude: -7.751, longitude: 112.838 };

  var state = {
    selectedRegion: null,
    selectedCategory: null,
    selectedDestination: null,
  };

  /* ── lookup & validasi ─────────────────────────────── */

  function findById(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function regionName(id) {
    var r = findById(DATA.regions, id);
    return r ? r.name : "";
  }

  function categoryName(id) {
    var c = findById(DATA.categories, id);
    return c ? c.name : "";
  }

  /* Warna pembeda tiap wilayah (dari data region, bukan hardcoded). */
  function regionColor(id) {
    var r = findById(DATA.regions, id);
    return r && r.color ? r.color : "#9ca3af";
  }

  function isValidDestination(d) {
    return !!(
      d &&
      d.id &&
      d.name &&
      d.regionId &&
      d.categoryId &&
      d.place &&
      Number.isFinite(d.place.latitude) &&
      Number.isFinite(d.place.longitude)
    );
  }

  function getFilteredDestinations() {
    return DATA.destinations.filter(function (d) {
      if (!isValidDestination(d)) {
        if (window.console) console.warn("[wisata-map] data tidak valid, dilewati:", d && d.id);
        return false;
      }
      if (state.selectedRegion && d.regionId !== state.selectedRegion) return false;
      if (state.selectedCategory && d.categoryId !== state.selectedCategory) return false;
      return true;
    });
  }

  function getDestination(id) {
    return findById(DATA.destinations, id) || null;
  }

  /* ── peta ──────────────────────────────────────────── */

  /* Peta bersih: TANPA tile OSM (terlalu ramai) — hanya potongan
     batas wilayah + marker di atas latar polos. Sepenuhnya offline.
     Zoom pengguna dikunci (kontrol + gestur mati) agar tampilan
     selalu pas dalam kartu; fokus zoom hanya dari aplikasi
     (pilih wilayah/destinasi). Keyboard tetap aktif untuk akses pin. */
  var map = window.L.map("wisata-map", {
    scrollWheelZoom: false,
    doubleClickZoom: true,
    touchZoom: true,
    boxZoom: true,
    zoomControl: true,
    attributionControl: false,
    zoomSnap: 0.25,
    minZoom: 9,
    maxZoom: 18,
  });
  PASURUAN_BOUNDS = window.L.latLngBounds([
    [-7.96, 112.57],
    [-7.54, 113.11],
  ]);
  map.setMaxBounds(PASURUAN_BOUNDS);
  map.options.maxBoundsViscosity = 1.0;

   var markerLayer = window.L.layerGroup().addTo(map);
   var markersById = {};
   var boundaryLayer = window.L.layerGroup().addTo(map);
   var kecamatanLayer = window.L.layerGroup().addTo(map);
   var kecamatanRefs = []; // { layer, regionId }
   var regionBoundsCache = {}; // Cache bounds untuk setiap region (TASK 3)

  /* Batas administrasi resmi (disuplai user, bukan dikarang).
     Path relatif terhadap halaman wisata.html. */
  var GEO_KECAMATAN_URL = "../../public/data/pasuruan-kecamatan.lite.geojson";
  var GEO_KOTA_URL = "../../public/data/kota-pasuruan-batas.lite.geojson";
  var GEO_KABUPATEN_URL = "../../public/data/kabupaten-pasuruan-batas.lite.geojson";

  /* Ikon lokasi (pin) SVG dengan warna wilayahnya. */
  function pinIcon(d) {
    var active = d.id === state.selectedDestination;
    var color = regionColor(d.regionId);
    return window.L.divIcon({
      className: "wisata-pin-wrap",
      html:
        '<span class="wisata-pin' +
        (active ? " active" : "") +
        '">' +
        '<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path fill="' +
        color +
        '" stroke="#ffffff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>' +
        '<circle cx="12" cy="9" r="2.5" fill="#ffffff"/>' +
        "</svg></span>",
      iconSize: [28, 28],
      iconAnchor: [14, 23],
    });
  }

  function renderMarkers() {
    markerLayer.clearLayers();
    markersById = {};
    var list = getFilteredDestinations();
    list.forEach(function (d) {
      var marker = window.L.marker([d.place.latitude, d.place.longitude], {
        icon: pinIcon(d),
        title: d.name,
        alt: d.name,
        zIndexOffset: d.id === state.selectedDestination ? 1000 : 0,
      });
      marker.on("click", function () {
        selectDestination(d.id, { fly: false });
      });
      markersById[d.id] = marker;
      markerLayer.addLayer(marker);
    });
  }

  /* ── batas administrasi resmi (disuplai user).
     Kecamatan diwarnai per wilayah tujuan; outline kota/kabupaten
     sebagai konteks netral. Klik poligon = pilih region. */
  function kecamatanBBox(feature) {
    var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    (function walk(c) {
      if (typeof c[0] === "number") {
        if (c[0] < minx) minx = c[0];
        if (c[1] < miny) miny = c[1];
        if (c[0] > maxx) maxx = c[0];
        if (c[1] > maxy) maxy = c[1];
        return;
      }
      for (var i = 0; i < c.length; i++) walk(c[i]);
    })(feature.geometry.coordinates);
    return [minx, miny, maxx, maxy];
  }

  /* Klasifikasi kecamatan → regionId: Kota bila properti
     kabupaten_kota = "Kota Pasuruan", selebihnya kuadran dari
     GEO_CENTER (data-driven, bukan hafalan). */
  function classifyKecamatan(feature) {
    var props = feature.properties || {};
    if (props.kabupaten_kota === "Kota Pasuruan") return "kota-pasuruan";
    var bb = kecamatanBBox(feature);
    var cx = (bb[0] + bb[2]) / 2;
    var cy = (bb[1] + bb[3]) / 2;
    var dx = cx - GEO_CENTER.longitude;
    var dy = cy - GEO_CENTER.latitude;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "pasuruan-timur" : "pasuruan-barat";
    return dy > 0 ? "pasuruan-utara" : "pasuruan-selatan";
  }

  function kecamatanStyle(selected, color) {
    // TASK: Warna tetap konsisten hijau baik saat dipilih maupun tidak
    // Hanya opacity sedikit berbeda agar terlihat selected state
    return {
      color: color,
      weight: 1.5,  // Konsisten, tidak berubah saat selected
      opacity: 0.75,  // Konsisten lebih visible
      fillColor: color,
      fillOpacity: 0.18,  // Konsisten fill
    };
  }

  /* Fokus wilayah: poligon region terpilih tampil dengan highlight subtle
     (hanya opacity sedikit lebih tinggi); poligon lain tetap normal. 
     Warna tetap konsisten hijau/sesuai region. */
  function updateKecamatan() {
    kecamatanRefs.forEach(function (ref) {
      var r = findById(DATA.regions, ref.regionId);
      if (!r) return;
      var selected = state.selectedRegion === ref.regionId;
      if (!kecamatanLayer.hasLayer(ref.layer)) ref.layer.addTo(kecamatanLayer);
      // Warna tetap konsisten, hanya opacity sedikit berbeda saat selected
      ref.layer.setStyle({
        color: r.color || "#9ca3af",
        weight: selected ? 2 : 1.5,  // Sedikit lebih tebal saat selected
        opacity: selected ? 0.95 : 0.75,  // Sedikit lebih visible saat selected
        fillColor: r.color || "#9ca3af",
        fillOpacity: selected ? 0.25 : 0.18,  // Sedikit lebih opaque saat selected
      });
    });
  }

  function fetchGeoJSON(url) {
    return window.fetch(url).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
      return res.json();
    });
  }

   function renderAdministrative(kecamatanGeo, kotaGeo, kabupatenGeo) {
     var rendered = 0;
     if (kabupatenGeo && kabupatenGeo.features) {
       kabupatenGeo.features.forEach(function (f) {
         if (!f.geometry) return;
         var outline = window.L.geoJSON(f.geometry, {
           color: "#475569",
           weight: 2,
           opacity: 0.9,
           fill: false,
           interactive: false,
         });
         outline.addTo(boundaryLayer);
         if (!kabupatenBoundsCache) {
           kabupatenBoundsCache = outline.getBounds();
         } else {
           kabupatenBoundsCache.extend(outline.getBounds());
         }
       });
     }
     if (kotaGeo && kotaGeo.features) {
       kotaGeo.features.forEach(function (f) {
         if (!f.geometry) return;
         window.L.geoJSON(f.geometry, {
           color: "#0f172a",
           weight: 3,
           opacity: 0.95,
           fill: false,
           interactive: false,
         }).addTo(boundaryLayer);
       });
     }
        if (kecamatanGeo && kecamatanGeo.features) {
          kecamatanGeo.features.forEach(function (f) {
            if (!f.geometry) return;
            var regionId = classifyKecamatan(f);
            var r = findById(DATA.regions, regionId);
            if (!r) return;
            var color = r.color || "#9ca3af";
            var layer = window.L.geoJSON(f.geometry, {
              style: kecamatanStyle(false, color),  // TASK: Warna konsisten hijau (diperbaiki di kecamatanStyle)
            });
            var kecName = (f.properties && f.properties.kecamatan) || r.name;
            layer.bindTooltip(kecName + " — " + r.name, { sticky: true });
            layer.on("click", function () {
              selectRegion(regionId);
            });
            kecamatanLayer.addLayer(layer);
            kecamatanRefs.push({ layer: layer, regionId: regionId });
            
            // TASK 3: Cache bounds untuk setiap region
            if (!regionBoundsCache[regionId]) {
              regionBoundsCache[regionId] = layer.getBounds();
            } else {
              regionBoundsCache[regionId].extend(layer.getBounds());
            }
            
            rendered++;
          });
        }
     return rendered;
   }

  function loadBoundaries() {
    if (!window.fetch) return;
    /* file:// tidak mengizinkan fetch file lokal (CORS) — lewati
       diam-diam dan tetap memakai zona kasar. */
    if (window.location && window.location.protocol === "file:") return;
    Promise.all([
      fetchGeoJSON(GEO_KECAMATAN_URL).catch(function () {
        return null;
      }),
      fetchGeoJSON(GEO_KOTA_URL).catch(function () {
        return null;
      }),
      fetchGeoJSON(GEO_KABUPATEN_URL).catch(function () {
        return null;
      }),
    ]).then(function (parts) {
      var count = renderAdministrative(parts[0], parts[1], parts[2]);
      if (count > 0) {
        updateKecamatan();
      }
    });
  }

  /* Viewport awal & reset: bingkai seluruh Kabupaten Pasuruan
     (dari outline datanya) agar semua wilayah terlihat penuh dalam
     kartu di semua ukuran layar — tanpa perlu menggeser. */
  var kabupatenBoundsCache = null;

  function fullBounds() {
    return kabupatenBoundsCache || PASURUAN_BOUNDS;
  }

  /* ── Transisi viewport halus (Owner 2026-10-14) ──────────────────
     Semua perpindahan (pilih wilayah, reset, toggle) memakai flyTo()
     supaya zoom-out selalu beranimasi mulus. fitBounds() bawaan
     Leaflet mengabaikan opsi `duration` dan "snap" singkat, sehingga
     transisi pin (level 18) → wilayah terasa melompat. */
  var FLY_DURATION = 0.9; // detik
  var FLY_EASE = 0.25;
  var REGION_MAX_ZOOM = 16;

  /* Zoom tampilan penuh — acuan agar pilih wilayah selalu jelas lebih
     dekat dari tampilan penuh. (Tanpa padding agar bingkai awal sama
     persis dengan fitBounds sebelumnya.) */
  function fullViewZoom() {
    return map.getBoundsZoom(fullBounds());
  }

  function defaultView(instant) {
    var b = fullBounds();
    if (instant || reducedMotion) {
      map.fitBounds(b, { animate: false });
      return;
    }
    map.flyTo(b.getCenter(), fullViewZoom(), {
      animate: true,
      duration: FLY_DURATION,
      easeLinearity: FLY_EASE,
    });
  }

  /* Bingkai satu wilayah: hitung zoom ideal dari bounds-nya, lalu
     pastikan minimal 1 level lebih dekat dari tampilan penuh agar
     wilayah besar (mis. Pasuruan Barat) tidak tampak seperti tampilan
     penuh. Mengembalikan { center, zoom } atau null. */
  function regionView(id) {
    var b = regionBoundsCache[id];
    if (b && b.isValid()) {
      var fit = map.getBoundsZoom(b, false, window.L.point(24, 24));
      var z = Math.min(Math.max(fit, fullViewZoom() + 1), REGION_MAX_ZOOM);
      return { center: b.getCenter(), zoom: z };
    }
    var r = findById(DATA.regions, id);
    if (
      r &&
      r.center &&
      Number.isFinite(r.center.latitude) &&
      Number.isFinite(r.center.longitude)
    ) {
      return {
        center: window.L.latLng(r.center.latitude, r.center.longitude),
        zoom: Math.min(Math.max(r.zoom || 0, fullViewZoom() + 1), REGION_MAX_ZOOM),
      };
    }
    return null;
  }

  function flyToRegion(id) {
    var v = regionView(id);
    if (!v) return;
    map.flyTo(v.center, v.zoom, {
      animate: !reducedMotion,
      duration: reducedMotion ? 0 : FLY_DURATION,
      easeLinearity: FLY_EASE,
    });
  }

  /* ── chips, count, detail ──────────────────────────── */

  var CHIP_BASE =
    "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors";
  var CHIP_ACTIVE = "bg-red-600 text-white";
  var CHIP_IDLE = "bg-red-100 text-red-700 hover:bg-red-200";

  function chipButton(label, pressed, attrs) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    btn.className = CHIP_BASE + " " + (pressed ? CHIP_ACTIVE : CHIP_IDLE);
    for (var k in attrs) btn.setAttribute(k, attrs[k]);
    return btn;
  }

  function regionChipButton(label, pressed, value, color) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    btn.setAttribute("data-region-chip", value);
    btn.className = CHIP_BASE + " inline-flex items-center gap-1.5 " + (pressed ? "" : "bg-gray-100 text-gray-700 hover:bg-gray-200");
    if (pressed) {
      btn.style.backgroundColor = value ? color : "#374151";
      btn.style.color = "#ffffff";
    }
    var dot = document.createElement("span");
    dot.setAttribute("aria-hidden", "true");
    dot.className = "inline-block h-2 w-2 rounded-full";
    dot.style.backgroundColor = pressed ? "#ffffff" : color;
    btn.insertBefore(dot, btn.firstChild);
    return btn;
  }

  function renderRegionChips() {
    var wrap = document.getElementById("region-chips");
    if (!wrap) return;
    wrap.innerHTML = "";
    wrap.appendChild(regionChipButton("Semua Wilayah", !state.selectedRegion, "", "#9ca3af"));
    DATA.regions.forEach(function (r) {
      wrap.appendChild(
        regionChipButton(r.name, state.selectedRegion === r.id, r.id, regionColor(r.id)),
      );
    });
  }

  function renderCategoryChips() {
    var wrap = document.getElementById("map-cat-chips");
    if (!wrap) return;
    wrap.innerHTML = "";
    wrap.appendChild(
      chipButton("Semua Kategori", !state.selectedCategory, { "data-map-cat-chip": "" }),
    );
    DATA.categories.forEach(function (c) {
      wrap.appendChild(
        chipButton(c.name, state.selectedCategory === c.id, { "data-map-cat-chip": c.id }),
      );
    });
  }

  function renderCount() {
    var el = document.getElementById("map-count");
    if (!el) return;
    var n = getFilteredDestinations().length;
    var total = DATA.destinations.filter(isValidDestination).length;
    el.textContent = "Menampilkan " + n + " dari " + total + " destinasi.";
  }

  function metaRow(icon, text) {
    return (
      '<div class="flex items-center space-x-1.5">' +
      icon +
      "<span>" +
      text +
      "</span></div>"
    );
  }

  var ICON_PIN_SM =
    '<svg class="h-3.5 w-3.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>';
  var ICON_CLOCK_SM =
    '<svg class="h-3.5 w-3.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
  var ICON_TAG_SM =
    '<svg class="h-3.5 w-3.5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" /></svg>';

  /* Ikon aset Owner (public/assets/icons) untuk rating, kategori, cuaca. */
  var ICON_RATING_IMG =
    '<img src="../../public/assets/icons/icon_rating.svg" alt="" aria-hidden="true" class="h-4 w-4 shrink-0 object-contain" />';
  var ICON_KATEGORI_IMG =
    '<img src="../../public/assets/icons/icon_kategori.svg" alt="" aria-hidden="true" class="h-4 w-4 shrink-0 object-contain" />';
  var ICON_CUACA_IMG =
    '<img src="../../public/assets/icons/icon_cuaca.svg" alt="" aria-hidden="true" class="h-4 w-4 shrink-0 object-contain" />';

  function renderDetail() {
     var panel = document.getElementById("dest-detail");
     if (!panel) return;
     var d = state.selectedDestination ? getDestination(state.selectedDestination) : null;

     if (!d || !isValidDestination(d)) {
       panel.innerHTML =
         '<div class="bg-white rounded-xl shadow-sm border-2 p-4 flex flex-col flex-1">' +
         '<span class="font-bold text-gray-800 text-2xl block mb-3">Destinasi</span>' +
         '<p class="text-sm text-gray-500 text-center flex items-center justify-center flex-1">Pilih penanda pada peta atau kartu destinasi untuk melihat detail.</p>' +
         "</div>";
       return;
     }

     /* Sinkron dgn kartu listing (TASK-WIS-DETAIL-SYNC-001): pakai rentang
        harga yang sama supaya panel peta tidak tampil beda dari kartu. */
     var price =
       window.PasinfoWisata && window.PasinfoWisata.priceLabel
         ? window.PasinfoWisata.priceLabel(d)
         : d.prices && d.prices.length
           ? d.prices.join(" - ")
           : null;
     var rows = metaRow(ICON_PIN_SM, d.address || "-");
     if (d.opening_hours) rows += metaRow(ICON_CLOCK_SM, d.opening_hours);
     if (price) rows += metaRow(ICON_TAG_SM, price);

     /* Info tambahan (Owner 2026-10-14): rating, kategori, cuaca. */
     var ratingText = Number.isFinite(d.rating)
       ? d.rating + "/5" + (d.reviews_label ? " \u00B7 " + d.reviews_label : "")
       : "-";
     rows += metaRow(ICON_RATING_IMG, ratingText);
     var cat = categoryName(d.categoryId);
     if (cat) rows += metaRow(ICON_KATEGORI_IMG, cat);
     var weather =
       window.PasinfoWisata && window.PasinfoWisata.weatherOf
         ? window.PasinfoWisata.weatherOf(d)
         : d.weather;
     if (weather && weather.condition_label) {
       var weatherText =
         weather.condition_label +
         (Number.isFinite(weather.temperature_c)
           ? " \u00B7 " + weather.temperature_c + "\u00B0C"
           : "");
       rows += metaRow(ICON_CUACA_IMG, weatherText);
     }

     var cta = "";
     if (d.googleMapsUrl) {
       cta =
         '<a href="' +
         d.googleMapsUrl +
         '" target="_blank" rel="noopener noreferrer" class="mt-4 inline-flex items-center justify-center w-full px-4 py-2 rounded-md text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors">Buka di Google Maps' +
         '<span class="sr-only"> (tautan eksternal)</span></a>';
     }

     var detailLink =
       '<a href="detail_wisata.html?slug=' +
       d.slug +
       '" class="mt-2 inline-flex items-center justify-center w-full px-4 py-2 rounded-md text-xs font-bold text-red-600 hover:text-red-700 transition-colors">Lihat Halaman Detail &rarr;</a>';

     var photo = d.media && d.media[0] && d.media[0].url;
     var photoBox = photo
       ? '<img src="' +
         photo +
         '" alt="Foto ' +
         d.name +
         '" loading="lazy" class="w-full h-36 rounded-lg mb-3 object-cover" />'
       : '<div class="w-full h-36 rounded-lg mb-3 flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300" role="img" aria-label="Foto ' +
         d.name +
         ' (placeholder)">' +
         '<span class="text-xs font-semibold text-gray-500">Foto: ' +
         d.name +
         "</span></div>";

     panel.innerHTML =
       '<div class="bg-white rounded-xl shadow-sm border-2 p-4 flex flex-col flex-1">' +
       "<div>" +
       '<span class="font-bold text-gray-800 text-2xl block mb-3">Destinasi</span>' +
       photoBox +
       '<p class="text-[11px] font-semibold text-red-700 uppercase">' +
       regionName(d.regionId) +
       " · " +
       categoryName(d.categoryId) +
       "</p>" +
       '<h3 class="font-bold text-base text-gray-900">' +
       d.name +
       "</h3>" +
       '<p class="text-xs text-gray-500 mt-1 leading-relaxed">' +
       (d.short_description || "") +
       "</p>" +
       "</div>" +
       '<div class="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100 text-[11px] text-gray-600">' +
       rows +
       "</div>" +
       cta +
       detailLink +
       "</div>";
   }

  function highlightDaftarCard() {
    var cards = document.querySelectorAll("#dest-grid [data-dest-id]");
    Array.prototype.forEach.call(cards, function (card) {
      var on = card.getAttribute("data-dest-id") === state.selectedDestination;
      card.classList.toggle("ring-2", on);
      card.classList.toggle("ring-brand", on);
    });
  }

  /* ── state transitions ─────────────────────────────── */

  function updateAll() {
    renderRegionChips();
    renderCategoryChips();
    renderMarkers();
    updateKecamatan();
    renderCount();
    renderDetail();
    highlightDaftarCard();
  }

  /* Beri tahu grid daftar bila FILTER berubah (region/kategori/reset).
     Perubahan pilihan destinasi tidak disiarkan agar halaman grid
     tidak ikut ter-reset. */
  function notifyDaftar() {
    if (typeof window.CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("wisata:mapchange"));
    }
  }

  function selectRegion(id) {
    // Pilih ulang wilayah aktif = kembali (toggle)
    if (id && state.selectedRegion === id) id = null;
    state.selectedRegion = id || null;
    state.selectedDestination = null; // ganti wilayah = reset pilihan destinasi
    updateAll();
    notifyDaftar();

    if (id) {
      // Auto-zoom mulus ke wilayah terpilih (sesuai bounds wilayah).
      flyToRegion(id);
    } else {
      // Toggle off / "Semua Wilayah" → zoom-out mulus ke tampilan penuh.
      defaultView(false);
    }
  }

   function selectCategory(id) {
     state.selectedCategory = id || null;
     var sel = state.selectedDestination ? getDestination(state.selectedDestination) : null;
     var visible = sel && getFilteredDestinations().some(function (d) {
       return d.id === sel.id;
     });
     if (!visible) state.selectedDestination = null;
     updateAll();
     notifyDaftar();
   }

   function selectDestination(id) {
     var d = getDestination(id);
     if (!d || !isValidDestination(d)) return;
     state.selectedDestination = id;
     renderMarkers();
     renderDetail();
     highlightDaftarCard();
     
    // TASK: Zoom ke marker saat dipilih dengan smooth transition (level 15)
    if (d && d.place && Number.isFinite(d.place.latitude) && Number.isFinite(d.place.longitude)) {
      setTimeout(function() {
        // Zoom ke marker dengan level 15 (tidak terlalu dekat; Owner 2026-10-14).
        map.flyTo([d.place.latitude, d.place.longitude], 15, {  // Level 15 (dikurangi dari 18)
          animate: !reducedMotion,
          duration: 0.8
        });
      }, 100);
    }
   }

   function resetFilters() {
     state.selectedRegion = null;
     state.selectedCategory = null;
     state.selectedDestination = null;
     updateAll();
     notifyDaftar();
     defaultView(false);  // Smooth zoom-out animation
   }

  /* ── wiring ────────────────────────────────────────── */

  var regionWrap = document.getElementById("region-chips");
  if (regionWrap) {
    regionWrap.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-region-chip]");
      if (!btn) return;
      selectRegion(btn.getAttribute("data-region-chip") || null);
    });
  }

  var catWrap = document.getElementById("map-cat-chips");
  if (catWrap) {
    catWrap.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-map-cat-chip]");
      if (!btn) return;
      selectCategory(btn.getAttribute("data-map-cat-chip") || null);
    });
  }

  var resetBtn = document.getElementById("map-reset");
  if (resetBtn) resetBtn.addEventListener("click", resetFilters);

  renderRegionChips();
  renderCategoryChips();
  updateAll();
  defaultView(true);
  loadBoundaries();

  window.PasuruanWisataMap = {
    selectDestination: selectDestination,
    selectRegion: selectRegion,
    selectCategory: selectCategory,
    resetFilters: resetFilters,
    /* Akses data untuk integrasi halaman detail (detail_wisata.html):
       getDestination(idAtauSlug) mengembalikan 1 objek destinasi,
       getDestinations() mengembalikan seluruh dataset. */
    getDestination: getDestination,
    getDestinations: function () {
      return DATA.destinations.slice();
    },
    getState: function () {
      var c = map.getCenter();
      return {
        selectedRegion: state.selectedRegion,
        selectedCategory: state.selectedCategory,
        selectedDestination: state.selectedDestination,
        visibleCount: getFilteredDestinations().length,
        zoom: map.getZoom(),
        bbox: map.getBounds().toBBoxString(),
        constrained: !!map.options.maxBounds,
        minZoom: map.options.minZoom,
        center: {
          latitude: +c.lat.toFixed(5),
          longitude: +c.lng.toFixed(5),
        },
      };
    },
  };
})();
