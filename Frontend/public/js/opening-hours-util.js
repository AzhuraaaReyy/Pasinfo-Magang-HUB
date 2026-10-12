/**
 * UTILITY: Opening Hours Status Calculator
 * =========================================
 *
 * Fungsi untuk parse opening_hours dan hitung status real-time
 * (Buka/Tutup berdasarkan waktu saat ini).
 *
 * Format opening_hours: "08.00 - 17.00 WIB" atau "08:00 - 17:00"
 *
 * Digunakan di:
 * - detail_wisata.html
 * - detail_kuliner.html
 * - detail_budaya.html
 * - detail_acara.html
 */

(function (window) {
  "use strict";

  /**
   * Parse opening hours string dan ekstrak jam buka/tutup
   * @param {string} hoursStr - Format: "08.00 - 17.00 WIB" atau "08:00 - 17:00"
   * @returns {object|null} { open: "08:00", close: "17:00" } atau null jika invalid
   */
  function parseOpeningHours(hoursStr) {
    if (!hoursStr || typeof hoursStr !== "string") return null;

    // Hapus "WIB" atau label timezone lainnya
    var cleaned = hoursStr.replace(/\s*(WIB|WITA|WIT|UTC)\s*/i, "").trim();

    // Split by dash/hyphen
    var parts = cleaned.split("-").map(function (p) {
      return p.trim();
    });

    if (parts.length !== 2) return null;

    // Normalize format: "08.00" atau "08:00" → "08:00"
    var openStr = parts[0].replace(/\./, ":").trim();
    var closeStr = parts[1].replace(/\./, ":").trim();

    // Validasi format HH:MM
    var timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(openStr) || !timeRegex.test(closeStr)) {
      return null;
    }

    return {
      open: openStr,
      close: closeStr,
    };
  }

  /**
   * Hitung status buka/tutup berdasarkan waktu saat ini
   * @param {object} hours - { open: "08:00", close: "17:00" }
   * @returns {object} { isOpen: boolean, status: "Buka"|"Tutup", timeRange: "08:00 - 17:00" }
   */
  function calculateStatus(hours) {
    if (!hours || !hours.open || !hours.close) {
      return {
        isOpen: null,
        status: "Informasi tidak tersedia",
        timeRange: "",
      };
    }

    var now = new Date();
    var currentHour = String(now.getHours()).padStart(2, "0");
    var currentMin = String(now.getMinutes()).padStart(2, "0");
    var currentTime = currentHour + ":" + currentMin;

    // Convert time strings to minutes for comparison
    function timeToMinutes(timeStr) {
      var parts = timeStr.split(":");
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    var openMinutes = timeToMinutes(hours.open);
    var closeMinutes = timeToMinutes(hours.close);
    var currentMinutes = timeToMinutes(currentTime);

    var isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

    return {
      isOpen: isOpen,
      status: isOpen ? "Buka sekarang" : "Tutup",
      timeRange: hours.open + " - " + hours.close,
      indicator: isOpen ? "🟢" : "🔴",
    };
  }

  /**
   * Get formatted opening hours display dengan status
   * @param {string} hoursStr - Format: "08.00 - 17.00 WIB"
   * @returns {object} { display: "08:00 - 17:00", status: "Buka sekarang", indicator: "🟢" }
   */
  function getOpeningHoursDisplay(hoursStr) {
    var parsed = parseOpeningHours(hoursStr);
    if (!parsed) {
      return {
        display: hoursStr || "Belum tersedia",
        status: "Informasi tidak tersedia",
        indicator: "⚪",
      };
    }

    var statusInfo = calculateStatus(parsed);
    return {
      display: statusInfo.timeRange,
      status: statusInfo.status,
      indicator: statusInfo.indicator,
      isOpen: statusInfo.isOpen,
    };
  }

  // Expose ke window global
  window.OpeningHoursUtil = {
    parse: parseOpeningHours,
    calculateStatus: calculateStatus,
    getDisplay: getOpeningHoursDisplay,
  };
})(window);
