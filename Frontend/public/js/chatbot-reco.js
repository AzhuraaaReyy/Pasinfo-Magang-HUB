/**
 * CHATBOT RECO ENGINE - Pasuruan Info Assistant (Stage 1, rule-based)
 * ===================================================================
 * Mesin aturan MURNI (tanpa DOM, tanpa fetch, tanpa dependensi):
 * menerima teks + dataset wisata lalu mengembalikan keputusan + kartu.
 * Tujuannya: deterministik, dapat dijelaskan, dapat diuji lewat Node.
 *
 * TIDAK memanggil API/AI apa pun. Stage 1 hanya domain WISATA yang aktif;
 * kuliner/acara/budaya sengaja dijawab "belum tersedia" (keputusan Owner
 * 2026-10-18) meski dataset lain sudah ada di repo.
 *
 * Sumber data: public/js/data-wisata.js (WISATA_REGIONS, WISATA_CATEGORIES,
 * WISATA_DESTINATIONS). File ini TIDAK menyimpan/menduplikasi data wisata.
 * Catatan penting: data-wisata.js mengisi media[0] dengan ASET CONTOH LOKAL
 * (bukan foto asli tempat) saat load; alt-nya sudah memuat "(aset contoh
 * lokal)" sehingga kartu chat bisa menyampaikan status itu apa adanya.
 *
 * Ekspor: window.PasinfoChatbotReco / module.exports
 *   detectIntent(query)                  -> intent terstruktur
 *   recommend(query, data, options)      -> { kind, text, cards, meta }
 *   availableOptions(data)               -> daftar kategori + wilayah
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PasinfoChatbotReco = api;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var MAX_CARDS = 3;

  /* Kata umum yang tidak dipakai sebagai kata kunci pencocokan. */
  var STOPWORDS = {
    yang: 1, untuk: 1, dengan: 1, dari: 1, saya: 1, aku: 1, kamu: 1, kita: 1,
    ingin: 1, mau: 1, cari: 1, mencari: 1, apa: 1, ada: 1, di: 1, ke: 1,
    dan: 1, atau: 1, tempat: 1, rekomendasi: 1, rekomendasikan: 1,
    rekomendasiin: 1, tolong: 1, dong: 1, ya: 1, nya: 1, itu: 1, ini: 1,
    bisa: 1, gimana: 1, bagaimana: 1, mana: 1, saja: 1, aja: 1, tentang: 1,
    sekitar: 1, daerah: 1, wilayah: 1, kabupaten: 1, to: 1, the: 1, a: 1,
    an: 1, wisata: 1, destinasi: 1, liburan: 1, rekreasi: 1, jalan: 1,
    trip: 1, traveling: 1, healing: 1, menarik: 1, bagus: 1, info: 1,
    informasi: 1, bantu: 1, tolongin: 1
  };

  /* Kata kunci -> kategori wisata (id mengikuti WISATA_CATEGORIES). */
  var CATEGORY_KEYWORDS = {
    "wisata-alam": [
      "alam", "gunung", "pantai", "air terjun", "airterjun", "curug", "hutan",
      "bukit", "laut", "danau", "sunrise", "sunset", "pemandangan",
      "panorama", "kemping", "camping", "hiking", "trekking", "kebun",
      "sungai", "puncak", "kawah", "savana", "padang rumput", "mangrove"
    ],
    keluarga: [
      "keluarga", "anak", "anak-anak", "kolam", "bermain", "mainan",
      "waterpark", "wahana", "santai", "piknik", "taman bermain",
      "kebun binatang", "edukasi", "safari"
    ],
    "sejarah-budaya": [
      "sejarah", "candi", "museum", "situs", "purbakala", "kuno",
      "tradisi", "heritage", "peninggalan", "arsitektur", "kampung budaya"
    ],
    "wisata-religi": [
      "religi", "religius", "masjid", "ziarah", "makam", "vihara",
      "klenteng", "gereja", "spiritual", "pesantren", "makam wali"
    ]
  };

  /* Kata kunci -> wilayah (id mengikuti WISATA_REGIONS). */
  var REGION_KEYWORDS = {
    "kota-pasuruan": ["kota pasuruan", "pusat kota"],
    "pasuruan-timur": ["pasuruan timur", "timur"],
    "pasuruan-barat": ["pasuruan barat", "barat"],
    "pasuruan-utara": ["pasuruan utara", "utara"],
    "pasuruan-selatan": ["pasuruan selatan", "selatan"]
  };

  /* Pemicu "niat wisata" walau tanpa kata kunci kategori/wilayah. */
  var WISATA_HINTS = [
    "wisata", "destinasi", "liburan", "rekreasi", "jalan-jalan",
    "jalan jalan", "tempat menarik", "trip", "traveling", "healing"
  ];

  /* Domain lain: sengaja dijawab "belum tersedia" pada Stage 1. */
  var DOMAIN_KEYWORDS = {
    kuliner: [
      "kuliner", "kulineran", "makan", "makanan", "resto", "restoran",
      "warung", "masakan", "jajan", "camilan", "kafe", "cafe", "kopi",
      "minum", "minuman", "lapar", "oleh-oleh"
    ],
    acara: [
      "acara", "event", "agenda", "festival", "konser", "pameran", "jadwal",
      "pertunjukan", "karnaval"
    ],
    budaya: [
      "budaya", "adat", "tarian", "seni", "cerita rakyat", "kesenian", "reog"
    ]
  };

  var GREETINGS = [
    "halo", "hai", "hi", "hello", "selamat pagi", "selamat siang",
    "selamat sore", "selamat malam", "assalamualaikum", "permisi", "pagi",
    "siang", "sore", "malam"
  ];

  var THANKS = [
    "terima kasih", "terimakasih", "makasih", "thanks", "thank you",
    "syukron", "tengkyu"
  ];

  var MORE_WORDS = ["lainnya", "lagi", "next", "selanjutnya", "more", "lain"];

  function normalize(value) {
    return String(value === null || value === undefined ? "" : value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeRe(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /* Cocokkan kata kunci terhadap teks (sudah dinormalisasi). Kata kunci
     multi-kata dicocokkan sebagai frase; satu kata memakai batas kata agar
     "seni" tidak cocok di dalam "senin". */
  function matchKeywords(text, keywords) {
    var hits = [];
    if (!text) return hits;
    var padded = " " + text + " ";
    (keywords || []).forEach(function (rawKeyword) {
      var keyword = normalize(rawKeyword);
      if (!keyword) return;
      if (keyword.indexOf(" ") !== -1) {
        if (padded.indexOf(" " + keyword + " ") !== -1) hits.push(keyword);
      } else if (
        new RegExp("(^|[^a-z0-9])" + escapeRe(keyword) + "([^a-z0-9]|$)").test(text)
      ) {
        hits.push(keyword);
      }
    });
    return hits;
  }

  function groupsMatching(text, map) {
    var ids = [];
    Object.keys(map).forEach(function (groupId) {
      if (matchKeywords(text, map[groupId]).length) ids.push(groupId);
    });
    return ids;
  }

  function significantTokens(text) {
    var out = [];
    (text ? text.split(" ") : []).forEach(function (token) {
      if (token.length < 3) return;
      if (STOPWORDS[token]) return;
      if (out.indexOf(token) === -1) out.push(token);
    });
    return out;
  }

  function detectIntent(query) {
    var text = normalize(query);
    if (!text) return { type: "empty" };

    if (matchKeywords(text, THANKS).length) return { type: "thanks" };
    if (matchKeywords(text, MORE_WORDS).length && text.split(" ").length <= 2) {
      return { type: "more" };
    }

    var categoryIds = groupsMatching(text, CATEGORY_KEYWORDS);
    var regionIds = groupsMatching(text, REGION_KEYWORDS);
    var wisataHint = matchKeywords(text, WISATA_HINTS).length > 0;
    var tokens = significantTokens(text);

    /* Wisata menang bila ada pemicu wisata / kata kunci kategori & wilayah,
       supaya "wisata budaya" tetap dijawab sebagai wisata (kategori
       Sejarah & Budaya), bukan "belum tersedia". */
    if (wisataHint || categoryIds.length || regionIds.length) {
      return {
        type: "wisata",
        categoryIds: categoryIds,
        regionIds: regionIds,
        tokens: tokens
      };
    }

    /* Domain lain diprioritaskan di atas sapaan ("halo, ada kuliner?"). */
    var domain = null;
    ["kuliner", "acara", "budaya"].forEach(function (name) {
      if (!domain && matchKeywords(text, DOMAIN_KEYWORDS[name]).length) {
        domain = name;
      }
    });
    if (domain) return { type: "domain", domain: domain };

    if (matchKeywords(text, GREETINGS).length) return { type: "greeting" };

    /* Ada kata kunci berarti tanpa label kategori/wilayah -> coba cari nama
       destinasi ("bromo", "tretes"). Kalau nihil, baru jawab tidak tahu. */
    if (tokens.length) return { type: "search", tokens: tokens };

    return { type: "unknown" };
  }

  function findById(list, id) {
    list = list || [];
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
    return null;
  }

  function availableOptions(data) {
    return {
      categories: ((data && data.categories) || []).map(function (c) {
        return c.name;
      }),
      regions: ((data && data.regions) || []).map(function (r) {
        return r.name;
      })
    };
  }

  function photoOf(destination) {
    var media = destination.media && destination.media[0];
    if (!media) return null;
    return media.thumbnail_url || media.url || null;
  }

  function toCard(destination, data, detailHrefPrefix) {
    var category = findById(data && data.categories, destination.categoryId);
    var media = destination.media && destination.media[0];
    var photo = photoOf(destination);
    return {
      slug: destination.slug || destination.id,
      name: destination.name || "(tanpa nama)",
      categoryName: category ? category.name : "",
      description: destination.short_description || "",
      hasPhoto: !!photo,
      photo: photo,
      photoAlt:
        (media && (media.alt || media.alt_text)) ||
        "Foto " + (destination.name || "") + " (aset contoh lokal)",
      href: detailHrefPrefix + (destination.slug || destination.id)
    };
  }

  function categoryNames(ids, data) {
    return (ids || [])
      .map(function (id) {
        var category = findById(data && data.categories, id);
        return category ? category.name : null;
      })
      .filter(Boolean);
  }

  function regionNames(ids, data) {
    return (ids || [])
      .map(function (id) {
        var region = findById(data && data.regions, id);
        return region ? region.name : null;
      })
      .filter(Boolean);
  }

  function noMatchText(query, data) {
    var option = availableOptions(data);
    return (
      'Maaf, saya belum menemukan wisata yang cocok dengan "' +
      String(query).trim() +
      '". Coba kata kunci lain. Pilihan yang tersedia:\n- Kategori: ' +
      option.categories.join(", ") +
      "\n- Wilayah: " +
      option.regions.join(", ")
    );
  }

  function headingFor(mode, ctx) {
    if (mode === "default") return "Ini beberapa destinasi wisata pilihan untuk kamu:";
    if (mode === "search") {
      return ctx.query ? 'Hasil pencarian "' + ctx.query + '":' : "Hasil pencarian:";
    }
    if (mode === "strict") {
      var label = ctx.categoryText + " di " + ctx.regionText;
      return "Berikut " + label + " yang bisa kamu pertimbangkan:";
    }
    if (mode === "relaxed") {
      return (
        "Belum ada " +
        ctx.categoryText +
        " di " +
        ctx.regionText +
        " pada data saat ini. Ini pilihan terdekat (kategori " +
        ctx.categoryText +
        " atau wilayah " +
        ctx.regionText +
        ") yang bisa kamu pertimbangkan:"
      );
    }
    if (mode === "category") {
      return "Berikut " + ctx.categoryText + " yang bisa kamu pertimbangkan:";
    }
    return "Berikut wisata di " + ctx.regionText + " yang bisa kamu pertimbangkan:";
  }

  function recommend(query, data, options) {
    var opts = options || {};
    var detailHrefPrefix = opts.detailHrefPrefix || "detail_wisata.html?slug=";
    var intent = detectIntent(query);

    if (intent.type !== "wisata" && intent.type !== "search") {
      return { kind: "intent", text: "", cards: [], meta: { intent: intent } };
    }

    var destinations = (data && data.destinations) || [];
    var tokens = intent.tokens || [];
    var categoryIds = intent.categoryIds || [];
    var regionIds = intent.regionIds || [];
    var isSearch = intent.type === "search";

    var matchesCategory = function (d) {
      return categoryIds.indexOf(d.categoryId) !== -1;
    };
    var matchesRegion = function (d) {
      return regionIds.indexOf(d.regionId) !== -1;
    };

    /* Kandidat: kategori & wilayah dipakai bersamaan (AND). Bila kombinasi itu
       kosong di data, turun ke OR dan katakan apa adanya lewat heading. */
    var candidates = null;
    var mode = "default";
    if (!isSearch && categoryIds.length && regionIds.length) {
      var strict = destinations.filter(function (d) {
        return matchesCategory(d) && matchesRegion(d);
      });
      if (strict.length) {
        candidates = strict;
        mode = "strict";
      } else {
        candidates = destinations.filter(function (d) {
          return matchesCategory(d) || matchesRegion(d);
        });
        mode = "relaxed";
      }
    } else if (!isSearch && categoryIds.length) {
      candidates = destinations.filter(matchesCategory);
      mode = "category";
    } else if (!isSearch && regionIds.length) {
      candidates = destinations.filter(matchesRegion);
      mode = "region";
    }

    var poolBase = candidates || destinations;

    /* Skor kata kunci (nama > deskripsi > alamat); urutan dataset = tie-break
       deterministik. Tanpa kata kunci, urutan dataset dipakai apa adanya. */
    var scored = poolBase.map(function (destination, index) {
      var score = 0;
      /* Bobot filtur dipakai untuk MENGURUTKAN (bukan menyaring) agar pada
         mode "relaxed" hasil yang cocok kategori selalu tampil lebih dulu
         daripada yang hanya cocok wilayah. */
      if (categoryIds.indexOf(destination.categoryId) !== -1) score += 4;
      if (regionIds.indexOf(destination.regionId) !== -1) score += 3;
      var name = normalize(destination.name);
      var desc = normalize(destination.short_description);
      var addr = normalize(destination.address);
      tokens.forEach(function (token) {
        if (name.indexOf(token) !== -1) score += 3;
        else if (desc.indexOf(token) !== -1) score += 1;
        else if (addr.indexOf(token) !== -1) score += 1;
      });
      return { destination: destination, index: index, score: score };
    });

    var hits = scored.filter(function (item) {
      return item.score > 0;
    });
    hits.sort(function (a, b) {
      return b.score - a.score || a.index - b.index;
    });

    var hasKeyword = tokens.length > 0;
    var bare = !isSearch && !categoryIds.length && !regionIds.length && !hasKeyword;

    /* Susun pool hasil:
       - ada kandidat kategori/wilayah -> SELURUH kandidat, terbaik lebih dulu
         (kata kunci hanya mengurutkan, tidak mempersempit);
       - pencarian bebas -> hanya yang benar-benar cocok kata kunci;
       - "rekomendasi wisata" tanpa filter -> urutan dataset (pilihan awal);
       - selain itu -> jujur tidak ditemukan. */
    var pool;
    if (candidates && candidates.length) {
      pool = scored.slice().sort(function (a, b) {
        return b.score - a.score || a.index - b.index;
      });
    } else if (hits.length) {
      pool = hits;
      if (mode === "default") mode = "search";
    } else if (bare) {
      pool = scored.map(function (item) {
        return { destination: item.destination, index: item.index, score: 0 };
      });
      mode = "default";
    } else {
      return {
        kind: "text",
        text: noMatchText(query, data),
        cards: [],
        meta: { intent: intent, mode: "no-match" }
      };
    }

    var offset = Math.max(0, parseInt(opts.offset, 10) || 0);
    if (offset >= pool.length) offset = 0;
    var page = pool.slice(offset, offset + MAX_CARDS);
    var cards = page.map(function (item) {
      return toCard(item.destination, data, detailHrefPrefix);
    });

    var heading;
    if (offset > 0) {
      heading = "Berikut rekomendasi wisata lainnya:";
    } else {
      heading = headingFor(mode, {
        query: String(query).trim(),
        categoryText: categoryNames(categoryIds, data).join(" & "),
        regionText: regionNames(regionIds, data).join(" / ")
      });
    }
    if (pool.length > offset + page.length) {
      heading += '\nKetik "lainnya" untuk melihat rekomendasi berikutnya.';
    }

    return {
      kind: "cards",
      text: heading,
      cards: cards,
      meta: {
        intent: intent,
        mode: mode,
        offset: offset,
        hasMore: pool.length > offset + page.length,
        total: pool.length
      }
    };
  }

  return {
    MAX_CARDS: MAX_CARDS,
    normalize: normalize,
    detectIntent: detectIntent,
    availableOptions: availableOptions,
    recommend: recommend
  };
});
