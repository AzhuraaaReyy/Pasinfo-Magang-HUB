/**
 * Agenda Budaya — daftar + kalender + rekomendasi (refactor 2026-10-09).
 * =====================================================================
 * - Dipindah dari inline <script>; onclick inline diganti delegasi data-*.
 * - Daftar agenda ← BUDAYA_CALENDAR REAL (data-budaya.js), BUKAN 4 dummy
 *   identik. Kategori dari kata kunci judul (terdokumentasi di bawah)
 *   karena dataset kalender tak membawa categoryId:
 *     tradisi : tradisi|kirab|ritual|adat|ziarah
 *     kesenian: seni|tari|musik|wayang|teater|pameran|festival|batik
 *     situs-sejarah: museum|situs|candi|sejarah
 *   Label filter mengikuti MOCKUP (Tradisional/Sejarah), bukan kategori
 *   halaman — keputusan mockup-wins (seperti galeri).
 * - Foto: poster-dummy.svg lokal (mockup-png sebagai konten dihapus).
 * - Pagination jujur (4/halaman) + teks dinamis; widget kalender bisa
 *   navigasi bulan + titik event dari data.
 * - Rekomendasi Serupa/Lainnya ← cultures REAL (detail_budaya);
 *   Destinasi ← wisata REAL (detail_wisata), teaser slice tanpa acuan.
 */
(function () {
  "use strict";

  var POSTER = "../../public/assets/images/poster-dummy.svg";
  var PER_PAGE = 4;

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  function $(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    return String(s == null ? "" : s);
  }

  var CAL = (window.PASINFO_BUDAYA && window.PASINFO_BUDAYA.calendar) || [];
  var CULTURES = (window.PASINFO_BUDAYA && window.PASINFO_BUDAYA.cultures) || [];
  var DESTS = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];

  function agendaCategory(title) {
    var t = String(title || "");
    if (/tradisi|kirab|ritual|adat|ziarah/i.test(t)) return "tradisi";
    if (/museum|situs|candi|sejarah/i.test(t)) return "situs-sejarah";
    return "kesenian";
  }

  function agendaYear(a) {
    var m = String(a.date_label || "").match(/(\d{4})/);
    return m ? parseInt(m[1], 10) : null;
  }

  function agendaTime(a) {
    var parts = String(a.date_label || "").split("•");
    return parts.length > 1 ? parts[1].trim() : "";
  }

  // Status agenda → badge (item 5, Owner 2026-10-16):
  // Akan Datang=hijau, Berlangsung=biru, Selesai=abu.
  var STATUS_META = {
    "akan-datang": { label: "Akan Datang", cls: "bg-green-600 text-white" },
    "berlangsung": { label: "Berlangsung", cls: "bg-blue-600 text-white" },
    "selesai": { label: "Selesai", cls: "bg-gray-500 text-white" },
  };
  function statusBadge(status) {
    var meta = STATUS_META[status] || STATUS_META["akan-datang"];
    return '<span class="inline-block ' + meta.cls + ' text-[11px] font-bold px-3 py-1 rounded-md shadow-sm">' + meta.label + "</span>";
  }

  // Label mockup -> value kategori halaman.
  var FILTERS = [
    { label: "Semua", value: "Semua" },
    { label: "Tradisional", value: "tradisi" },
    { label: "Kesenian", value: "kesenian" },
    { label: "Sejarah", value: "situs-sejarah" },
    { label: "Museum", value: "museum" },
  ];

  var currentCategory = "Semua";
  var currentPage = 1;

  var agendaListEl = $("agenda-list");
  var filtersEl = $("agenda-filters");
  var pagerEl = $("agenda-pager");

  var DOT_SVG = '<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" stroke-width="2"/></svg>';
  var PIN_SVG = '<svg class="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>';
  var CAL_SVG = '<svg class="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';

  function renderFilters() {
    filtersEl.innerHTML = FILTERS.map(function (f) {
      var on = f.value === currentCategory;
      return (
        '<button type="button" data-agcat="' + f.value + '" class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ' +
        (on ? "bg-gray-200 text-gray-900 font-bold" : "bg-gray-50 text-gray-600 hover:bg-gray-100") +
        '"><span>' + DOT_SVG + "</span><span>" + f.label + "</span></button>"
      );
    }).join("");
  }

  function filteredAgenda() {
    return CAL.filter(function (a) {
      return currentCategory === "Semua" || agendaCategory(a.title) === currentCategory;
    });
  }

  function totalPages(list) {
    return Math.max(1, Math.ceil(list.length / PER_PAGE));
  }

  function renderAgendaList() {
    var list = filteredAgenda();
    if (currentPage > totalPages(list)) currentPage = totalPages(list);
    var start = (currentPage - 1) * PER_PAGE;
    var pageItems = list.slice(start, start + PER_PAGE);
    if (!list.length) {
      agendaListEl.innerHTML = "";
      $("agenda-empty").classList.remove("hidden");
    } else {
      $("agenda-empty").classList.add("hidden");
      agendaListEl.innerHTML = pageItems
        .map(function (a) {
          return (
            '<div class="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row items-center gap-4 hover:shadow-md transition-shadow relative">' +
            '<div class="flex-shrink-0 text-center px-2">' +
          '<span class="block text-2xl font-black bud-accent-text leading-none">' + esc(a.day_label) + "</span>" +
          '<span class="block text-sm font-extrabold bud-accent-text leading-tight">' + esc(a.month_label) + "</span>" +
          '<span class="block text-sm font-extrabold bud-accent-text leading-tight">' + esc(agendaYear(a) || "") + "</span>" +
            "</div>" +
            '<div class="w-full sm:w-28 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">' +
            '<img src="' + POSTER + '" alt="' + esc(a.title) + '" loading="lazy" class="w-full h-full object-cover" />' +
            "</div>" +
            '<div class="flex-1 min-w-0 w-full">' +
            '<span class="inline-block bud-accent text-[10px] font-bold px-2.5 py-0.5 rounded-md mb-1">' + esc(agendaCategory(a.title) === "tradisi" ? "Tradisi" : agendaCategory(a.title) === "situs-sejarah" ? "Sejarah" : "Kesenian") + "</span>" +
            '<h3 class="text-base font-bold text-gray-900 line-clamp-1">' + esc(a.title) + "</h3>" +
            '<div class="flex items-center gap-3 text-[11px] text-gray-500 my-1">' +
            '<span class="flex items-center gap-1">' + PIN_SVG + " " + esc(a.location || "") + "</span>" +
            '<span class="flex items-center gap-1">' + CAL_SVG + " " + esc(agendaTime(a)) + "</span>" +
            "</div>" +
            '<p class="text-xs text-gray-500 line-clamp-2">' + esc(a.desc) + "</p>" +
            "</div>" +
            '<div class="sm:self-end w-full sm:w-auto text-right mt-2 sm:mt-0">' +
            statusBadge(a.status) +
            "</div></div>"
          );
        })
        .join("");
    }
    var countEl = $("agenda-count");
    if (countEl) countEl.textContent = list.length + " hasil ditemukan";
    var rangeEl = $("agenda-range");
    if (rangeEl) {
      rangeEl.textContent = list.length
        ? "Menampilkan data dari " + (start + 1) + " - " + Math.min(start + PER_PAGE, list.length)
        : "Menampilkan data dari 0 - 0";
    }
    var pageEl = $("agenda-pageinfo");
    if (pageEl) pageEl.textContent = "Menampilkan page " + currentPage + " dari " + totalPages(list);
    renderPagination(list);
  }

  function renderPagination(list) {
    var n = totalPages(list);
    var html =
      '<button type="button" data-agpage="prev" aria-label="Halaman sebelumnya" class="w-6 h-6 rounded bg-gray-100 text-gray-500 flex items-center justify-center text-xs">&lsaquo;</button>';
    for (var i = 1; i <= n; i++) {
      html +=
        '<button type="button" data-agpage="' + i + '" aria-label="Halaman ' + i + '"' + (i === currentPage ? ' aria-current="page"' : "") + ' class="w-6 h-6 rounded text-xs flex items-center justify-center ' +
          (i === currentPage ? "bud-accent text-white font-bold" : "bg-gray-100 text-gray-600 hover:bg-gray-200") +
        '">' + i + "</button>";
    }
    html +=
      '<button type="button" data-agpage="next" aria-label="Halaman berikutnya" class="w-6 h-6 rounded bg-gray-100 text-gray-500 flex items-center justify-center text-xs">&rsaquo;</button>';
    pagerEl.innerHTML = html;
  }

  // Widget kalender: navigasi bulan + titik event dari data.
  var calYear = null;
  var calMonth = null;
  function agendaMonthIdx(a) {
    var m = MONTHS.indexOf(a.month_label);
    var y = agendaYear(a);
    if (m === -1 || y === null) return null;
    return { y: y, m: m };
  }
  function renderCalendar() {
    var grid = $("cal-grid");
    var label = $("cal-month-label");
    if (!grid) return;
    if (calYear === null && CAL.length) {
      var first = agendaMonthIdx(CAL[0]);
      if (first) {
        calYear = first.y;
        calMonth = first.m;
      } else {
        var now = new Date();
        calYear = now.getFullYear();
        calMonth = now.getMonth();
      }
    }
    if (label) label.textContent = MONTHS[calMonth] + " " + calYear;
    var firstDay = new Date(calYear, calMonth, 1);
    var offset = (firstDay.getDay() + 6) % 7; // Senin dulu
    var days = new Date(calYear, calMonth + 1, 0).getDate();
    var prevDays = new Date(calYear, calMonth, 0).getDate();
    var eventDays = {};
    CAL.forEach(function (a) {
      var mi = agendaMonthIdx(a);
      if (mi && mi.y === calYear && mi.m === calMonth) {
        eventDays[parseInt(a.day_label, 10)] = true;
      }
    });
    var html = "";
    for (var p = offset - 1; p >= 0; p--) {
      html += '<span class="text-gray-300">' + (prevDays - p) + "</span>";
    }
    for (var d = 1; d <= days; d++) {
      if (eventDays[d]) {
        html += '<span class="bg-blue-600 text-white rounded-full font-bold">' + d + "</span>";
      } else {
        html += "<span>" + d + "</span>";
      }
    }
    grid.innerHTML = html;
  }

  // Foto contoh domain bergilir (media.url masih null) — sama seperti galeri/detail.
  var BUDAYA_PHOTOS = [
    "../../public/assets/images/budaya/optimized/Tari Terbang Bandung & Tari Pasuruan Kondang.webp",
    "../../public/assets/images/budaya/optimized/Tradisi-Skilot.webp",
    "../../public/assets/images/budaya/optimized/Yadnya Karo Sodoran (Tosari).webp",
  ];
  function budayaPhotoFor(d) {
    if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
    var key = d && d.id != null ? String(d.id) : "";
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return BUDAYA_PHOTOS[sum % BUDAYA_PHOTOS.length];
  }
  var WISATA_PHOTOS = [
    "../../public/assets/images/wisata/optimized/bromo2.webp",
    "../../public/assets/images/wisata/optimized/bromo3.webp",
    "../../public/assets/images/wisata/optimized/bromo_banner.webp",
    "../../public/assets/images/wisata/optimized/purwodadi-botanic-garden.webp",
    "../../public/assets/images/wisata/optimized/taman_safari_indonesia_2.webp",
    "../../public/assets/images/wisata/optimized/air-terjun-kakek-bodo.webp",
  ];
  function wisataPhotoFor(d) {
    if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
    var key = d && d.id != null ? String(d.id) : "";
    var sum = 0;
    for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
    return WISATA_PHOTOS[sum % WISATA_PHOTOS.length];
  }
  var BUDAYA_CATEGORIES = (window.PASINFO_BUDAYA && window.PASINFO_BUDAYA.categories) || [];
  function budayaCategoryName(id) {
    for (var i = 0; i < BUDAYA_CATEGORIES.length; i++) {
      if (BUDAYA_CATEGORIES[i].id === id) return BUDAYA_CATEGORIES[i].name;
    }
    return id || "";
  }
  var WISATA_CATEGORIES = (window.PASINFO_WISATA && window.PASINFO_WISATA.categories) || [];
  function wisataCategoryName(id) {
    for (var i = 0; i < WISATA_CATEGORIES.length; i++) {
      if (WISATA_CATEGORIES[i].id === id) return WISATA_CATEGORIES[i].name;
    }
    return id || "";
  }
  // Kartu rekomendasi = konsep galeri_budaya (Owner 2026-10-16): foto + badge
  // kategori (warna mengikuti domain item) + rating + judul + deskripsi + alamat.
  function recoCard(item, domain, photo, href, catName) {
    var badgeBg = domain === "Kuliner" ? "#2563eb" : domain === "Budaya" ? "#6d28d9" : "#dc2626";
    var rating = item.rating != null && item.rating !== "" ? item.rating : "-";
    var desc = item.short_description || "";
    var loc = item.address || "";
    return (
      '<a href="' + esc(href) + '" class="group block no-underline h-full">' +
      '<article class="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col bg-white">' +
      '<div class="absolute top-3 left-3 right-3 flex items-center justify-between z-10">' +
      '<span class="inline-block px-3 py-1 text-white text-xs font-bold rounded-md" style="background-color:' + badgeBg + '">' + esc(catName) + "</span>" +
      (domain === "Budaya"
        ? ""
        : '<span class="inline-block px-2.5 py-1 bg-white text-gray-900 text-xs font-semibold rounded-md flex items-center gap-1">' +
          '<img src="../../public/assets/icons/icon_rating.svg" alt="" class="w-4 h-4" />' + esc(rating) +
          "</span>") +
      "</div>" +
      '<div class="relative h-44 sm:h-48 lg:h-52 overflow-hidden bg-gray-200">' +
      '<img src="' + esc(photo) + '" alt="' + esc(item.name) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" loading="lazy" />' +
      "</div>" +
      '<div class="flex flex-col flex-1 p-4 bg-white">' +
      '<h3 class="font-bold text-gray-900 text-base line-clamp-2 mb-2">' + esc(item.name) + "</h3>" +
      (desc ? '<p class="text-xs text-gray-600 line-clamp-2 mb-3">' + esc(desc) + "</p>" : "") +
      '<div class="text-xs text-gray-600 mt-auto">' +
      (loc ? '<p class="flex items-center gap-1"><img src="../../public/assets/icons/icon_lokasi-hitam.svg" alt="" class="w-4 h-4 flex-shrink-0" />' + esc(loc) + "</p>" : "") +
      "</div>" +
      "</div>" +
      "</article>" +
      "</a>"
    );
  }
  function cultureCards(list) {
    return list.map(function (d) {
      return recoCard(d, "Budaya", budayaPhotoFor(d), "detail_budaya.html?slug=" + esc(d.slug), budayaCategoryName(d.categoryId));
    }).join("");
  }
  function wisataCards(list) {
    return list.map(function (d) {
      return recoCard(d, "Wisata", wisataPhotoFor(d), "detail_wisata.html?slug=" + esc(d.slug), wisataCategoryName(d.categoryId));
    }).join("");
  }

  function renderRecommendations() {
    var serupa = $("reco-serupa-grid");
    var lainnya = $("reco-lainnya-grid");
    var dest = $("reco-destinasi-grid");
    if (serupa) serupa.innerHTML = cultureCards(CULTURES.slice(0, 4));
    if (lainnya) lainnya.innerHTML = cultureCards(CULTURES.slice(4, 8));
    if (dest) dest.innerHTML = wisataCards(DESTS.slice(0, 4));
  }

  // Delegasi klik.
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-agcat],[data-agpage],[data-cal-nav]");
    if (!t) return;
    if (t.hasAttribute("data-agcat")) {
      currentCategory = t.getAttribute("data-agcat");
      currentPage = 1;
      renderFilters();
      renderAgendaList();
    } else if (t.hasAttribute("data-agpage")) {
      var v = t.getAttribute("data-agpage");
      var n = totalPages(filteredAgenda());
      if (v === "prev") currentPage = Math.max(1, currentPage - 1);
      else if (v === "next") currentPage = Math.min(n, currentPage + 1);
      else currentPage = Math.min(n, Math.max(1, parseInt(v, 10) || 1));
      renderAgendaList();
    } else if (t.hasAttribute("data-cal-nav")) {
      var step = parseInt(t.getAttribute("data-cal-nav"), 10) || 0;
      var dt = new Date(calYear, calMonth + step, 1);
      calYear = dt.getFullYear();
      calMonth = dt.getMonth();
      renderCalendar();
    }
  });

  renderFilters();
  renderAgendaList();
  renderCalendar();
  renderRecommendations();
})();
