/**
 * Pasuruan Info — Kuliner Interactive Map (Leaflet + Vanilla JS)
 * ==============================================================
 *
 * DATA  : window.PASINFO_KULINER (public/js/data-kuliner.js,
 *         struktur mirip data-wisata.js).
 *         Single source of truth untuk marker, kartu, detail, filter.
 *
 * STATE : { selectedRegion, selectedCategory, selectedCulinary }
 *         berisi id atau null.
 *
 * ALUR  : region → filter → marker → pilih kuliner → detail.
 */

(function () {
  "use strict";

  var DATA = window.PASINFO_KULINER;
  var mapEl = document.getElementById("kuliner-map");
  
  // DEBUG: Log initialization state
  if (typeof window.console !== "undefined") {
    console.log("[kuliner-map] DATA:", !!DATA, DATA ? Object.keys(DATA) : "null");
    console.log("[kuliner-map] mapEl:", !!mapEl);
    console.log("[kuliner-map] window.L:", !!window.L);
  }
  
  if (!DATA || !mapEl || !window.L) {
    if (typeof window.console !== "undefined") {
      console.warn("[kuliner-map] Missing dependencies - aborting initialization");
      if (!DATA) console.warn("  - PASINFO_KULINER not found");
      if (!mapEl) console.warn("  - #kuliner-map element not found");
      if (!window.L) console.warn("  - Leaflet library (window.L) not loaded");
    }
    return;
  }

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var PASURUAN_BOUNDS = null;
  var GEO_CENTER = { latitude: -7.751, longitude: 112.838 };

  var state = {
    selectedRegion: null,
    selectedCategory: null,
    selectedCulinary: null,
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

  function regionColor(id) {
    var r = findById(DATA.regions, id);
    return r && r.color ? r.color : "#9ca3af";
  }

  function isValidCulinary(d) {
    return !!(
      d &&
      d.id &&
      d.name &&
      d.regionId &&
      d.categoryId &&
      d.place &&
      (Number.isFinite(d.place.latitude) || findById(DATA.regions, d.regionId)) &&
      (Number.isFinite(d.place.longitude) || findById(DATA.regions, d.regionId))
    );
  }

  function getFilteredCulinaries() {
    return DATA.culinaries.filter(function (d) {
      if (!isValidCulinary(d)) {
        if (window.console) console.warn("[kuliner-map] data tidak valid, dilewati:", d && d.id);
        return false;
      }
      if (state.selectedRegion && d.regionId !== state.selectedRegion) return false;
      if (state.selectedCategory && d.categoryId !== state.selectedCategory) return false;
      return true;
    });
  }

  function getCulinary(id) {
    return findById(DATA.culinaries, id) || null;
  }

  /* ── peta ──────────────────────────────────────────── */

  var map = window.L.map("kuliner-map", {
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
  var kecamatanRefs = [];

  var GEO_KECAMATAN_URL = "../../public/data/pasuruan-kecamatan.lite.geojson";
  var GEO_KOTA_URL = "../../public/data/kota-pasuruan-batas.lite.geojson";
  var GEO_KABUPATEN_URL = "../../public/data/kabupaten-pasuruan-batas.lite.geojson";

  function pinIcon(d) {
    var active = d.id === state.selectedCulinary;
    var color = regionColor(d.regionId);
    return window.L.divIcon({
      className: "kuliner-pin-wrap",
      html:
        '<span class="kuliner-pin' +
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
    var list = getFilteredCulinaries();
    list.forEach(function (d) {
      var lat = d.place && Number.isFinite(d.place.latitude) ? d.place.latitude : null;
      var lng = d.place && Number.isFinite(d.place.longitude) ? d.place.longitude : null;
      
      // Fallback to region center if coordinates unavailable
      if (!lat || !lng) {
        var region = findById(DATA.regions, d.regionId);
        if (region && region.center) {
          lat = region.center.latitude;
          lng = region.center.longitude;
        }
      }
      
      if (!lat || !lng) return; // Skip if no valid coordinates
      
      var marker = window.L.marker([lat, lng], {
        icon: pinIcon(d),
        title: d.name,
        alt: d.name,
        zIndexOffset: d.id === state.selectedCulinary ? 1000 : 0,
      });
      marker.on("click", function () {
        selectCulinary(d.id, { fly: false });
      });
      markersById[d.id] = marker;
      markerLayer.addLayer(marker);
    });
  }

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
    return {
      color: color,
      weight: selected ? 3 : 1.5,
      opacity: selected ? 0.95 : 0.65,
      fillColor: color,
      fillOpacity: selected ? 0.32 : 0.14,
    };
  }

  function updateKecamatan() {
    kecamatanRefs.forEach(function (ref) {
      var r = findById(DATA.regions, ref.regionId);
      if (!r) return;
      var selected = state.selectedRegion === ref.regionId;
      if (!kecamatanLayer.hasLayer(ref.layer)) ref.layer.addTo(kecamatanLayer);
      if (!state.selectedRegion || selected) {
        ref.layer.setStyle(
          kecamatanStyle(selected, r.color || "#9ca3af"),
        );
      } else {
        ref.layer.setStyle({
          color: r.color || "#9ca3af",
          weight: 1,
          opacity: 0.55,
          fillColor: r.color || "#9ca3af",
          fillOpacity: 0,
        });
      }
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
          style: kecamatanStyle(false, color),
        });
        var kecName = (f.properties && f.properties.kecamatan) || r.name;
        layer.bindTooltip(kecName + " — " + r.name, { sticky: true });
        layer.on("click", function () {
          selectRegion(regionId);
        });
        kecamatanLayer.addLayer(layer);
        kecamatanRefs.push({ layer: layer, regionId: regionId });
        rendered++;
      });
    }
    return rendered;
  }

  function loadBoundaries() {
    if (!window.fetch) return;
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

  var kabupatenBoundsCache = null;

  function fullBounds() {
    return kabupatenBoundsCache || PASURUAN_BOUNDS;
  }

  function defaultView(instant) {
    map.fitBounds(fullBounds(), { animate: instant ? false : !reducedMotion });
  }

  /* ── chips, count, detail ──────────────────────────── */

  var CHIP_BASE =
    "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors";
  var CHIP_ACTIVE = "bg-blue-600 text-white";
  var CHIP_IDLE = "bg-blue-100 text-blue-700 hover:bg-blue-200";

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
    var wrap = document.getElementById("region-chips-kuliner");
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
    var wrap = document.getElementById("map-cat-chips-kuliner");
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
    var el = document.getElementById("map-count-kuliner");
    if (!el) return;
    var n = getFilteredCulinaries().length;
    var total = DATA.culinaries.filter(isValidCulinary).length;
    el.textContent = "Menampilkan " + n + " dari " + total + " kuliner.";
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
  var ICON_STAR_SM =
    '<svg class="h-3.5 w-3.5 shrink-0 text-yellow-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clip-rule="evenodd" /></svg>';

  function statusPill(status) {
    if (status === "buka") {
      return '<span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700"><span class="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true"></span>Buka</span>';
    }
    if (status === "tutup") {
      return '<span class="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-600"><span class="h-1.5 w-1.5 rounded-full bg-gray-500" aria-hidden="true"></span>Tutup</span>';
    }
    return "";
  }

  function renderDetail() {
    var panel = document.getElementById("kul-detail");
    if (!panel) return;
    var d = state.selectedCulinary ? getCulinary(state.selectedCulinary) : null;

    /* Default: 1 card dari item terpilih/default (mockup kuliner.png).
       Bila belum ada seleksi, tampilkan item valid pertama dari daftar
       terfilter (tetap 1 card, tidak dobel/tumpang tindih). */
    if (!d || !isValidCulinary(d)) {
      var fallback = getFilteredCulinaries()[0] || null;
      if (!fallback) {
        var all = DATA.culinaries.filter(isValidCulinary);
        fallback = all.length ? all[0] : null;
      }
      d = fallback;
    }

    if (!d) {
      panel.innerHTML =
        '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">' +
        '<span class="font-bold text-gray-800 text-sm block mb-3">Kuliner</span>' +
        '<p class="text-sm text-gray-500">Kuliner unggulan belum tersedia.</p>' +
        "</div>";
      return;
    }

    var price = d.price_range || null;
    var rows = "";
    if (typeof d.rating !== "undefined" && d.rating !== null && d.rating !== "") {
      var ratingTxt = d.rating + (d.reviews_label ? " (" + d.reviews_label + ")" : "");
      rows += metaRow(ICON_STAR_SM, ratingTxt);
    }
    rows += metaRow(ICON_PIN_SM, d.address || "-");
    if (d.opening_hours) rows += metaRow(ICON_CLOCK_SM, d.opening_hours);
    if (price) rows += metaRow(ICON_TAG_SM, price);
    var statusHtml = statusPill(d.operational_status);
    if (statusHtml) rows += '<div class="flex items-center space-x-1.5"><span>' + statusHtml + "</span></div>";

    var photo = d.media && d.media[0] && d.media[0].url;
    var photoBox = photo
      ? '<img src="' +
        photo +
        '" alt="Foto ' +
        d.name +
        '" loading="lazy" class="w-full h-36 rounded-lg mb-3 object-cover" />'
      : '<div class="w-full h-36 rounded-lg mb-3 flex items-center justify-center bg-gradient-to-br from-amber-700 via-stone-700 to-slate-800" role="img" aria-label="Foto ' +
        d.name +
        ' (placeholder)">' +
        '<span class="text-xs font-semibold text-gray-400">Foto: ' +
        d.name +
        "</span></div>";

    panel.innerHTML =
      '<div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between h-full">' +
      "<div>" +
      '<span class="font-bold text-gray-800 text-sm block mb-3">Kuliner</span>' +
      photoBox +
      '<p class="text-[11px] font-semibold text-blue-700 uppercase">' +
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
      "</div>";
  }

  function highlightDaftarCard() {
    var cards = document.querySelectorAll("#kul-grid [data-kul-id]");
    Array.prototype.forEach.call(cards, function (card) {
      var on = card.getAttribute("data-kul-id") === state.selectedCulinary;
      card.classList.toggle("ring-2", on);
      card.classList.toggle("ring-blue-600", on);
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

  function notifyDaftar() {
    if (typeof window.CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("kuliner:mapchange"));
    }
  }

  function selectRegion(id) {
    if (id && state.selectedRegion === id) id = null;
    state.selectedRegion = id || null;
    state.selectedCulinary = null;
    updateAll();
    notifyDaftar();
  }

  function selectCategory(id) {
    state.selectedCategory = id || null;
    var sel = state.selectedCulinary ? getCulinary(state.selectedCulinary) : null;
    var visible = sel && getFilteredCulinaries().some(function (d) {
      return d.id === sel.id;
    });
    if (!visible) state.selectedCulinary = null;
    updateAll();
    notifyDaftar();
  }

  function selectCulinary(id) {
    /* Klik pin memfilter Daftar mengikuti regionId item itu (kontrak
       TASK-KUL-002). Klik pin yang sama lagi = toggle reset ke semua. */
    if (id && state.selectedCulinary === id) {
      state.selectedCulinary = null;
      state.selectedRegion = null;
      updateAll();
      notifyDaftar();
      return;
    }
    var d = getCulinary(id);
    if (!d || !isValidCulinary(d)) return;
    state.selectedCulinary = id;
    if (d.regionId && state.selectedRegion !== d.regionId) {
      state.selectedRegion = d.regionId;
    }
    /* Bila kategori map aktif menyembunyikan item yang diklik,
       longgarkan kategori agar pin terpilih tetap terlihat. */
    if (state.selectedCategory && d.categoryId !== state.selectedCategory) {
      var stillVisible = getFilteredCulinaries().some(function (x) {
        return x.id === d.id;
      });
      if (!stillVisible) state.selectedCategory = null;
    }
    updateAll();
    notifyDaftar();
  }

  function resetFilters() {
    state.selectedRegion = null;
    state.selectedCategory = null;
    state.selectedCulinary = null;
    updateAll();
    notifyDaftar();
    defaultView(false);
  }

  /* ── wiring ────────────────────────────────────────── */

  var regionWrap = document.getElementById("region-chips-kuliner");
  if (regionWrap) {
    regionWrap.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-region-chip]");
      if (!btn) return;
      selectRegion(btn.getAttribute("data-region-chip") || null);
    });
  }

  var catWrap = document.getElementById("map-cat-chips-kuliner");
  if (catWrap) {
    catWrap.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-map-cat-chip]");
      if (!btn) return;
      selectCategory(btn.getAttribute("data-map-cat-chip") || null);
    });
  }

  var resetBtn = document.getElementById("map-reset-kuliner");
  if (resetBtn) resetBtn.addEventListener("click", resetFilters);

  renderRegionChips();
  renderCategoryChips();
  updateAll();
  defaultView(true);
  loadBoundaries();

  if (typeof window.console !== "undefined") {
    console.log("[kuliner-map] Initialization complete. Map ready.");
    console.log("[kuliner-map] Regions:", DATA.regions.length);
    console.log("[kuliner-map] Categories:", DATA.categories.length);
    console.log("[kuliner-map] Culinaries:", DATA.culinaries.length);
  }

  window.PasuruanKulinerMap = {
    selectCulinary: selectCulinary,
    selectRegion: selectRegion,
    selectCategory: selectCategory,
    resetFilters: resetFilters,
    getCulinary: getCulinary,
    getCulinaries: function () {
      return DATA.culinaries.slice();
    },
    getState: function () {
      var c = map.getCenter();
      return {
        selectedRegion: state.selectedRegion,
        selectedCategory: state.selectedCategory,
        selectedCulinary: state.selectedCulinary,
        visibleCount: getFilteredCulinaries().length,
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
