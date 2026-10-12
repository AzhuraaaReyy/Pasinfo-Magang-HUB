/**
 * Pasinfo shared NEARBY helper — "Destinasi Sekitar" berbasis jarak real.
 * =====================================================================
 * Jarak dihitung dengan haversine dari koordinat WGS84 nyata
 * (destinasi wisata: Google Places, tervalidasi poligon BIG 2026).
 *
 * Titik acuan (refPoint):
 *   - koordinat item bila tersedia (place.latitude/longitude non-null),
 *   - bila null (kuliner/budaya/acara = mock contract) → center region
 *     dari regionId item (center region terdefinisi per domain).
 * Item tanpa acuan valid dikembalikan apa adanya (tanpa jarak).
 *
 * Dipakai oleh: detail-wisata.js, detail-kuliner.js,
 *               detail-budaya.js, detail-acara.js
 * (Owner instruction 2026-10-09: Sekitar = jarak terdekat, bukan dummy.)
 */
(function (window) {
  "use strict";

  function num(v) {
    return typeof v === "number" && isFinite(v) ? v : null;
  }

  function coordsOf(place) {
    if (!place) return null;
    var lat = num(place.latitude);
    var lng = num(place.longitude);
    if (lat === null || lng === null) return null;
    return { lat: lat, lng: lng };
  }

  function regionCenter(regions, regionId) {
    if (!regions || !regionId) return null;
    for (var i = 0; i < regions.length; i++) {
      var r = regions[i];
      if (r && r.id === regionId && r.center) {
        return coordsOf(r.center);
      }
    }
    return null;
  }

  // Titik acuan untuk satu item: koordinat sendiri → center region → null.
  function refPoint(item, regions) {
    var own = coordsOf(item && item.place);
    if (own) return own;
    return regionCenter(regions, item && item.regionId);
  }

  // Jarak haversine dalam km.
  function haversineKm(a, b) {
    var R = 6371;
    var dLat = ((b.lat - a.lat) * Math.PI) / 180;
    var dLng = ((b.lng - a.lng) * Math.PI) / 180;
    var sLat = Math.sin(dLat / 2);
    var sLng = Math.sin(dLng / 2);
    var h =
      sLat * sLat +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        sLng *
        sLng;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // N destinasi wisata terdekat dari ref (melewati yang tanpa koordinat).
  // Mengembalikan salinan item + properti non-kontrak `_distKm` (angka).
  function nearest(ref, destinations, n) {
    var out = [];
    if (!ref || !destinations) return out;
    for (var i = 0; i < destinations.length; i++) {
      var d = destinations[i];
      var c = coordsOf(d && d.place);
      if (!c) continue;
      var dist = haversineKm(ref, c);
      out.push({ item: d, dist: dist });
    }
    out.sort(function (x, y) {
      return x.dist - y.dist;
    });
    return out.slice(0, n).map(function (x) {
      x.item._distKm = x.dist;
      return x.item;
    });
  }

  // Format Indonesia: "±3,2 km" (<1 km → meter).
  function fmtKm(km) {
    if (km === null || km === undefined || !isFinite(km)) return "";
    if (km < 1) {
      return "±" + String(Math.max(100, Math.round(km * 1000))) + " m";
    }
    return "±" + String(km.toFixed(1)).replace(".", ",") + " km";
  }

  window.PasinfoNearby = {
    refPoint: refPoint,
    haversineKm: haversineKm,
    nearest: nearest,
    fmtKm: fmtKm,
  };
})(window);
