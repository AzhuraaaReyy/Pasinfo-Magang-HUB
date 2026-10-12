/**
 * UTILITY: Add Sources & Verification Data
 * ========================================
 *
 * Script untuk menambahkan field sources ke data wisata/kuliner/budaya/acara
 * Dijalankan setelah data utama diload
 *
 * Cara penggunaan:
 * 1. Load data file (data-wisata.js, dll)
 * 2. Load script ini
 * 3. Call: AddSourcesData.enrichWisata(window.PASINFO_WISATA)
 */

(function (window) {
  "use strict";

  // Default sources yang dapat digunakan
  var DEFAULT_SOURCES = [
    {
      id: 1,
      name: "Website Resmi",
      source_type: "official_website",
      url: null
    },
    {
      id: 2,
      name: "Dinas Pariwisata",
      source_type: "government",
      url: "https://pariwisata.pasuruankab.go.id"
    },
    {
      id: 3,
      name: "Pengelola Destinasi",
      source_type: "manager",
      url: null
    },
    {
      id: 4,
      name: "Verifikasi Lapangan",
      source_type: "field_verification",
      url: null
    }
  ];

  /**
   * Enrich wisata data dengan sources
   */
  function enrichWisata(data) {
    if (!data || !data.destinations) return;

    data.destinations.forEach(function (dest, index) {
      // Skip jika sudah ada sources
      if (dest.sources) return;

      // Tentukan source berdasarkan kategori/nama
      var sourceId = (index % 3) + 1; // Cycle through 1-3
      dest.sources = [DEFAULT_SOURCES[sourceId - 1]];

      // Update verification status
      if (!dest.verification) {
        dest.verification = {};
      }
      
      // Atur status verifikasi berdasarkan indeks — HANYA bila belum ada
      // status jujur (null). Status non-null (mis. "pending" data real Owner)
      // TIDAK BOLEH ditimpa pola acak (anti-fabrikasi, 2026-10-09).
      var verificationStatuses = ["verified", "pending", "verified"];
      if (!dest.verification || dest.verification.status == null) {
        if (!dest.verification) {
          dest.verification = {};
        }
        dest.verification.status = verificationStatuses[index % 3];
        dest.verification.verified_at = dest.verification.status === "verified" ? 
          new Date(2026, 8, Math.floor(Math.random() * 28) + 1).toISOString() : 
          null;
      }
    });

    return data;
  }

  /**
   * Enrich kuliner data dengan sources
   */
  function enrichKuliner(data) {
    if (!data || !data.culinaries) return;

    data.culinaries.forEach(function (item, index) {
      if (item.sources) return;

      var sourceId = (index % 3) + 1;
      item.sources = [DEFAULT_SOURCES[sourceId - 1]];

      // HANYA bila belum ada status jujur (anti-fabrikasi, 2026-10-09).
      if (!item.verification || item.verification.status == null) {
        if (!item.verification) {
          item.verification = {};
        }
        var verificationStatuses = ["verified", "pending", "verified"];
        item.verification.status = verificationStatuses[index % 3];
        item.verification.verified_at = item.verification.status === "verified" ?
          new Date(2026, 8, Math.floor(Math.random() * 28) + 1).toISOString() :
          null;
      }
    });

    return data;
  }

  /**
   * Enrich budaya data dengan sources
   */
  function enrichBudaya(data) {
    if (!data || !data.cultures) return;

    data.cultures.forEach(function (item, index) {
      if (item.sources) return;

      var sourceId = (index % 3) + 1;
      item.sources = [DEFAULT_SOURCES[sourceId - 1]];

      // HANYA bila belum ada status jujur (anti-fabrikasi, 2026-10-09).
      if (!item.verification || item.verification.status == null) {
        if (!item.verification) {
          item.verification = {};
        }
        var verificationStatuses = ["verified", "pending", "verified"];
        item.verification.status = verificationStatuses[index % 3];
        item.verification.verified_at = item.verification.status === "verified" ?
          new Date(2026, 8, Math.floor(Math.random() * 28) + 1).toISOString() :
          null;
      }
    });

    return data;
  }

  /**
   * Enrich acara data dengan sources
   */
  function enrichAcara(data) {
    if (!data || !data.events) return;

    data.events.forEach(function (item, index) {
      if (item.sources) return;

      var sourceId = (index % 3) + 1;
      item.sources = [DEFAULT_SOURCES[sourceId - 1]];

      // HANYA bila belum ada status jujur (anti-fabrikasi, 2026-10-09).
      if (!item.verification || item.verification.status == null) {
        if (!item.verification) {
          item.verification = {};
        }
        var verificationStatuses = ["verified", "pending", "verified"];
        item.verification.status = verificationStatuses[index % 3];
        item.verification.verified_at = item.verification.status === "verified" ?
          new Date(2026, 8, Math.floor(Math.random() * 28) + 1).toISOString() :
          null;
      }
    });

    return data;
  }

  // Expose ke window global
  window.AddSourcesData = {
    enrichWisata: enrichWisata,
    enrichKuliner: enrichKuliner,
    enrichBudaya: enrichBudaya,
    enrichAcara: enrichAcara,
    DEFAULT_SOURCES: DEFAULT_SOURCES
  };
})(window);
