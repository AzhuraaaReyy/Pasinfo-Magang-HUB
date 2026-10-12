/**
 * Pasuruan Info — Acara Interactive Map (Leaflet + Vanilla JS)
 * ============================================================
 *
 * DATA  : window.PASINFO_ACARA (public/js/data-acara.js).
 *         Single source of truth untuk region, events.
 *
 * STATE : { selectedRegion, selectedCategory, selectedEvent }
 *         berisi id atau null.
 *
 * ALUR  : region → filter → marker → pilih event → detail.
 *         Klik marker TIDAK mereset region yang aktif.
 *
 * POLA  : Mengikuti wisata-map.js EXACTLY — tanpa tile layer (offline),
 *         dengan GeoJSON boundaries + SVG pins.
 */

(function () {
  "use strict";

  var DATA = window.PASINFO_ACARA;
  var mapEl = document.getElementById("acara-map");
  if (!DATA || !mapEl || !window.L) return;

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var PASURUAN_BOUNDS = null;
  var GEO_CENTER = { latitude: -7.751, longitude: 112.838 };

  var state = {
    selectedRegion: null,
    selectedCategory: null,
    selectedEvent: null,
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

  function isValidEvent(e) {
    return !!(
      e &&
      e.id &&
      e.name &&
      e.regionId &&
      e.categoryId &&
      e.place &&
      Number.isFinite(e.place.latitude) &&
      Number.isFinite(e.place.longitude)
    );
  }

  function getFilteredEvents() {
    return DATA.events.filter(function (e) {
      if (!isValidEvent(e)) {
        if (window.console) console.warn("[acara-map] event tidak valid, dilewati:", e && e.id);
        return false;
      }
      if (state.selectedRegion && e.regionId !== state.selectedRegion) return false;
      if (state.selectedCategory && e.categoryId !== state.selectedCategory) return false;
      return true;
    });
  }

  function getEvent(id) {
    return findById(DATA.events, id) || null;
  }

  /* ── peta ──────────────────────────────────────────── */

  var map = window.L.map("acara-map", {
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

  /* Ikon lokasi (pin) SVG dengan warna wilayahnya. */
  function pinIcon(e) {
    var active = e.id === state.selectedEvent;
    var color = regionColor(e.regionId);
    return window.L.divIcon({
      className: "acara-pin-wrap",
      html:
        '<span class="acara-pin' +
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
    var list = getFilteredEvents();
    list.forEach(function (e) {
      var label = cleanMockText(e.name) || "Acara Pasuruan";
      var marker = window.L.marker([e.place.latitude, e.place.longitude], {
        icon: pinIcon(e),
        title: label,
        alt: label,
        zIndexOffset: e.id === state.selectedEvent ? 1000 : 0,
      });
      marker.on("click", function () {
        selectEvent(e.id, { fly: false });
      });
      markersById[e.id] = marker;
      markerLayer.addLayer(marker);
    });
  }

  /* ── batas administrasi resmi (disuplai user) ── */
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
    var n = getFilteredEvents().length;
    var total = DATA.events.filter(isValidEvent).length;
    el.textContent = "Menampilkan " + n + " dari " + total + " acara.";
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

  /* Bersihkan penanda mock dari teks TAMPILAN (sumber data tetap mock).
     UI tidak boleh memajang kata "Mock"; fallback netral bila kosong. */
  function cleanMockText(s) {
    if (s == null) return "";
    return String(s)
      .replace(/\s*\(MOCK\)/gi, "")
      .replace(/\s*\(mock[^)]*\)/gi, "")
      .replace(/\s+Mock\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function renderDetail() {
    var panel = document.getElementById("evt-detail");
    if (!panel) return;
    var e = state.selectedEvent ? getEvent(state.selectedEvent) : null;

    if (!e || !isValidEvent(e)) {
      panel.innerHTML =
        '<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">' +
        '<div class="px-4 pt-4"><span class="text-sm font-bold text-gray-900">Acara</span></div>' +
        '<div class="p-4">' +
        '<div class="w-full h-36 rounded-lg mb-3 bg-gradient-to-b from-blue-600 to-blue-800" role="img" aria-label="Ilustrasi acara (placeholder)"></div>' +
        '<p class="text-sm text-gray-500">Pilih penanda pada peta untuk melihat detail acara.</p>' +
        "</div></div>";
      return;
    }

    var displayName = cleanMockText(e.name) || "Acara Pasuruan";
    var displayDesc = cleanMockText(e.short_description);
    var schedule = cleanMockText(e.occurrences && e.occurrences[0] ? e.occurrences[0].label : null);
    var venue = cleanMockText(e.venue_address) || "Lokasi menyusul, Pasuruan";
    var ticketInfo = cleanMockText(e.tickets && e.tickets[0] ? e.tickets[0].price_label : null) || "Informasi tiket menyusul";
    var organizer = cleanMockText(e.organizer_name) || "Menyusul";

    /* Baris meta berlabel sesuai mockup: Lokasi / Waktu / Harga Tiket / Penyelenggara. */
    function detailRow(label, value) {
      return (
        '<div class="flex items-start gap-2 text-[11px] text-gray-600">' +
        '<span class="w-20 shrink-0 text-gray-400">' +
        label +
        "</span>" +
        '<span class="font-medium text-gray-700">' +
        (value || "-") +
        "</span>" +
        "</div>"
      );
    }

    var rows = detailRow("Lokasi", venue);
    if (schedule) rows += detailRow("Waktu", schedule);
    if (ticketInfo) rows += detailRow("Harga Tiket", ticketInfo);
    rows += detailRow("Penyelenggara", organizer);

    var photo = e.media && e.media[0] && e.media[0].url;
    var photoBox = photo
      ? '<img src="' +
        photo +
        '" alt="Foto ' +
        displayName +
        '" loading="lazy" class="w-full h-36 rounded-lg mb-3 object-cover" />'
      : '<div class="w-full h-36 rounded-lg mb-3 bg-gradient-to-b from-blue-600 to-blue-800" role="img" aria-label="Ilustrasi ' +
        displayName +
        ' (placeholder)"></div>';

    panel.innerHTML =
      '<div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">' +
      '<div class="px-4 pt-4"><span class="text-sm font-bold text-gray-900">Acara</span></div>' +
      '<div class="p-4">' +
      photoBox +
      '<p class="text-[11px] font-semibold text-blue-700 uppercase">' +
      regionName(e.regionId) +
      " · " +
      categoryName(e.categoryId) +
      "</p>" +
      '<h3 class="font-bold text-base text-gray-900 mt-1">' +
      displayName +
      "</h3>" +
      (displayDesc
        ? '<p class="text-xs text-gray-500 mt-1 leading-relaxed">' + displayDesc + "</p>"
        : "") +
      '<div class="mt-3 space-y-1.5">' +
      rows +
      "</div>" +
      '<p class="mt-3 text-[10px] text-gray-400">Informasi tiket/registrasi bersifat tampilan saja. Tautan eksternal belum terverifikasi.</p>' +
      "</div></div>";
  }

  function highlightDaftarCard() {
    var cards = document.querySelectorAll("#evt-grid [data-evt-id]");
    Array.prototype.forEach.call(cards, function (card) {
      var on = card.getAttribute("data-evt-id") === state.selectedEvent;
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
      window.dispatchEvent(new CustomEvent("acara:mapchange"));
    }
  }

  function selectRegion(id) {
    if (id && state.selectedRegion === id) id = null;
    state.selectedRegion = id || null;
    state.selectedEvent = null;
    updateAll();
    notifyDaftar();
  }

  function selectCategory(id) {
    state.selectedCategory = id || null;
    var sel = state.selectedEvent ? getEvent(state.selectedEvent) : null;
    var visible = sel && getFilteredEvents().some(function (e) {
      return e.id === sel.id;
    });
    if (!visible) state.selectedEvent = null;
    updateAll();
    notifyDaftar();
  }

  function selectEvent(id) {
    var e = getEvent(id);
    if (!e || !isValidEvent(e)) return;
    state.selectedEvent = id;
    renderMarkers();
    renderDetail();
    highlightDaftarCard();
  }

  function resetFilters() {
    state.selectedRegion = null;
    state.selectedCategory = null;
    state.selectedEvent = null;
    updateAll();
    notifyDaftar();
    defaultView(false);
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

  // Pilih sorotan awal agar 1 card detail langsung terisi saat halaman
  // dibuka (sesuai mockup acara.png). Klik pin/wilayah mengubahnya nanti.
  (function selectDefaultEvent() {
    if (state.selectedEvent) return;
    var first = null;
    var fallback = null;
    for (var i = 0; i < DATA.events.length; i++) {
      var cand = DATA.events[i];
      if (!isValidEvent(cand)) continue;
      if (!fallback) fallback = cand;
      if (cand.featured) {
        first = cand;
        break;
      }
    }
    if (first || fallback) state.selectedEvent = (first || fallback).id;
  })();

  renderRegionChips();
  renderCategoryChips();
  updateAll();
  defaultView(true);
  loadBoundaries();

  window.PasuruanAcaraMap = {
    selectEvent: selectEvent,
    selectRegion: selectRegion,
    selectCategory: selectCategory,
    resetFilters: resetFilters,
    getEvent: getEvent,
    getEvents: function () {
      return DATA.events.slice();
    },
    getState: function () {
      var c = map.getCenter();
      return {
        selectedRegion: state.selectedRegion,
        selectedCategory: state.selectedCategory,
        selectedEvent: state.selectedEvent,
        visibleCount: getFilteredEvents().length,
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
