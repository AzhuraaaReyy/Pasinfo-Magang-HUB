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

  // FOTO SEMENTARA (Owner 2026-10-14): gambar contoh domain untuk kartu
  // featured; media.url dipakai bila ada. Ganti foto asli menyusul.
  var ACARA_FALLBACK_PHOTOS = [
    "../../public/assets/images/acara/optimized/bromo-marathon.thumb.webp",
    "../../public/assets/images/acara/optimized/Hari-Jadi-Kota-Pasuruan.thumb.webp",
    "../../public/assets/images/acara/optimized/Pekan-Raya-Pasuruan-(PRP).thumb.webp"
  ];
  function acaraPhotoFor(d) {
    if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
    var key = d && d.id != null ? String(d.id) : "";
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return ACARA_FALLBACK_PHOTOS[sum % ACARA_FALLBACK_PHOTOS.length];
  }

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
  var regionBoundsCache = {}; // Cache bounds per wilayah untuk flyTo (paritas kuliner/wisata).

  function fullBounds() {
    return kabupatenBoundsCache || PASURUAN_BOUNDS;
  }

  /* ── Transisi viewport halus (paritas kuliner/wisata) ─────────────
     Pilih wilayah / reset / pilih acara memakai flyTo() supaya
     zoom-out selalu beranimasi mulus (fitBounds bawaan "snap"). */
  var FLY_DURATION = 0.9; // detik
  var FLY_EASE = 0.25;
  var REGION_MAX_ZOOM = 16;

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

  /* Bingkai satu wilayah: zoom ideal dari bounds-nya, minimal 1 level
     lebih dekat dari tampilan penuh (paritas kuliner/wisata). */
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
  var CHIP_ACTIVE = "bg-green-600 text-white";
  var CHIP_IDLE = "bg-green-100 text-green-700";

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

  // Ikon baris info panel memakai file aset lokal (selaras kartu daftar).
  var MAP_ICON_BASE = "../../public/assets/icons/";
  function mapInfoIcon(file, label) {
    return '<img src="' + MAP_ICON_BASE + file + '" alt="" aria-hidden="true" loading="lazy" class="h-3.5 w-3.5 shrink-0 object-contain" title="' + label + '" />';
  }
  var ICON_PIN_SM = mapInfoIcon("icon_lokasi-hitam.svg", "Lokasi");
  var ICON_CAL_SM = mapInfoIcon("icon_kalender.svg", "Tanggal acara");
  var ICON_CLOCK_SM = mapInfoIcon("icon_waktu.svg", "Waktu acara");
  var ICON_TAG_SM = mapInfoIcon("icon_harga-tiket.svg", "Harga tiket");

  /* Turunan tampilan dari field schema (event_occurrences/event_tickets):
     jadwal diformat dari starts_at/ends_at; tipe tiket dari price. */
  var MAP_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  var MAP_MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  function mapPad(n) {
    return (n < 10 ? "0" : "") + n;
  }
  function mapFmtDate(startsAt) {
    if (!startsAt) return "";
    var s = new Date(startsAt);
    if (isNaN(s.getTime())) return "";
    return MAP_DAYS[s.getDay()] + ", " + s.getDate() + " " + MAP_MONTHS[s.getMonth()] + " " + s.getFullYear();
  }
  function mapFmtTime(startsAt, endsAt) {
    if (!startsAt) return "";
    var s = new Date(startsAt);
    if (isNaN(s.getTime())) return "";
    var t = mapPad(s.getHours()) + ":" + mapPad(s.getMinutes());
    if (endsAt) {
      var e = new Date(endsAt);
      if (!isNaN(e.getTime())) t += " - " + mapPad(e.getHours()) + ":" + mapPad(e.getMinutes());
    }
    return t;
  }
  function mapTicketType(price) {
    return price != null && Number(price) > 0 ? "Berbayar" : "Gratis";
  }
  function mapPriceText(price) {
    if (price == null || Number(price) <= 0 || isNaN(Number(price))) return "";
    return "Rp " + String(Math.round(Number(price))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

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

  var ICON_ORG_SM = mapInfoIcon("icon_penyelenggara.svg", "Penyelenggara");

  function renderDetail() {
    var panel = document.getElementById("evt-detail");
    if (!panel) return;
    var e = state.selectedEvent ? getEvent(state.selectedEvent) : null;

    /* Belum ada pilihan → tampilkan pesan terpusat (paritas kuliner/wisata),
       bukan fallback ke item pertama (Owner 2026-10-15: samakan kosong). */
    if (!e || !isValidEvent(e)) {
      panel.innerHTML =
        '<div class="bg-white rounded-xl shadow-sm border-2 p-4 flex flex-col flex-1">' +
        '<span class="font-bold text-gray-800 text-2xl block mb-3">Acara</span>' +
        '<p class="text-sm text-gray-500 text-center flex items-center justify-center flex-1">Pilih penanda pada peta atau kartu acara untuk melihat detail.</p>' +
        "</div>";
      return;
    }

    var displayName = cleanMockText(e.name) || "Acara Pasuruan";
    var displayDesc = cleanMockText(e.short_description);
    var occ = e.occurrences && e.occurrences[0] ? e.occurrences[0] : null;
    var price = e.tickets && e.tickets[0] ? e.tickets[0].price : null;
    var venue = cleanMockText(e.venue_address) || "Lokasi menyusul, Pasuruan";
    var ticketInfo = mapPriceText(price) || (mapTicketType(price) + " · Info di lokasi acara");
    var organizer = cleanMockText(e.organizer_name) || "Menyusul";

    // Baris info panel: lokasi, tanggal, waktu, harga tiket, penyelenggara.
    var dateStr = (occ && mapFmtDate(occ.starts_at)) || "";
    var timeStr = (occ && mapFmtTime(occ.starts_at, occ.ends_at)) || "";
    var rows = metaRow(ICON_PIN_SM, venue);
    if (dateStr) rows += metaRow(ICON_CAL_SM, dateStr);
    if (timeStr) rows += metaRow(ICON_CLOCK_SM, timeStr);
    if (ticketInfo) rows += metaRow(ICON_TAG_SM, ticketInfo);
    rows += metaRow(ICON_ORG_SM, organizer);

    var cta = "";
    if (e.googleMapsUrl) {
      cta =
        '<a href="' +
        e.googleMapsUrl +
        '" target="_blank" rel="noopener noreferrer" class="evt-btn-green mt-4 inline-flex items-center justify-center w-full px-4 py-2 rounded-md text-xs font-bold text-white bg-green-600 transition-colors">Buka Google Maps' +
        '<span class="sr-only"> (tautan eksternal)</span></a>';
    }

    var detailLink =
      '<a href="detail_acara.html?slug=' +
      e.slug +
      '" class="evt-link-green mt-2 inline-flex items-center justify-center w-full px-4 py-2 rounded-md text-xs font-bold text-green-700 transition-colors">Lihat Halaman Detail &rarr;</a>';

    var photo = acaraPhotoFor(e);
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
      '<div class="bg-white rounded-xl shadow-sm border-2 p-4 flex flex-col flex-1">' +
      "<div>" +
      '<span class="font-bold text-gray-800 text-2xl block mb-3">Acara</span>' +
      photoBox +
      '<p class="text-[11px] font-semibold text-green-700 uppercase">' +
      regionName(e.regionId) +
      " · " +
      categoryName(e.categoryId) +
      "</p>" +
      '<h3 class="font-bold text-base text-gray-900">' +
      displayName +
      "</h3>" +
      (displayDesc
        ? '<p class="text-xs text-gray-500 mt-1 leading-relaxed">' + displayDesc + "</p>"
        : "") +
      "</div>" +
      '<div class="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100 text-[11px] text-gray-600">' +
      rows +
      "</div>" +
      cta +
      detailLink +
      "</div>";
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

    // Zoom otomatis mulus ke wilayah terpilih (paritas kuliner/wisata);
    // toggle off → zoom-out mulus ke tampilan penuh.
    if (id) {
      flyToRegion(id);
    } else {
      defaultView(false);
    }
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
    /* Klik pin/kartu memfilter Daftar mengikuti regionId item itu (paritas
       kuliner selectCulinary). Klik item yang sama lagi = toggle reset ke
       semua + zoom-out mulus. */
    if (id && state.selectedEvent === id) {
      state.selectedEvent = null;
      state.selectedRegion = null;
      updateAll();
      notifyDaftar();
      defaultView(false); // zoom-out mulus (paritas kuliner/wisata).
      return;
    }
    var e = getEvent(id);
    if (!e || !isValidEvent(e)) return;
    state.selectedEvent = id;
    if (e.regionId && state.selectedRegion !== e.regionId) {
      state.selectedRegion = e.regionId;
    }
    /* Bila kategori map aktif menyembunyikan item yang diklik,
       longgarkan kategori agar pin terpilih tetap terlihat. */
    if (state.selectedCategory && e.categoryId !== state.selectedCategory) {
      var stillVisible = getFilteredEvents().some(function (x) {
        return x.id === e.id;
      });
      if (!stillVisible) state.selectedCategory = null;
    }
    updateAll();
    notifyDaftar();

    // Zoom mulus ke lokasi acara terpilih (level 15, paritas kuliner/wisata).
    if (e.place && Number.isFinite(e.place.latitude) && Number.isFinite(e.place.longitude)) {
      setTimeout(function () {
        map.flyTo([e.place.latitude, e.place.longitude], 15, {
          animate: !reducedMotion,
          duration: 0.8,
        });
      }, 100);
    }
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
