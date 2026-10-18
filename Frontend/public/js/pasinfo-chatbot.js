/**
 * PASINFO CHATBOT WIDGET - Pasuruan Info Assistant (Stage 1)
 * ==========================================================
 * Widget mengapung (FAB + panel) yang dipasang ke <body> pada SEMUA halaman.
 * Dipanggil otomatis oleh partials/pasinfo-layout.js (injeksi <script>
 * dinamis) sehingga tidak perlu menambah <script> di 19 halaman.
 *
 * Ketentuan yang dipegang:
 * - Tertutup saat halaman dimuat; state: closed / open / min (perkecil).
 * - Riwayat percakapan hidup di memori saja (tanpa localStorage/penyimpanan).
 * - SEMUA teks pengguna & data dirender via textContent (tidak ada innerHTML
 *   untuk data dinamis) -> aman dari injeksi.
 * - Data wisata = public/js/data-wisata.js, dimuat LAZY saat dibutuhkan
 *   (halaman non-wisata tidak memikul 160KB data sampai widget dipakai).
 * - Stage 1: hanya domain WISATA yang menjawab data. Kuliner/Acara/Budaya
 *   dijawab jujur "belum tersedia" (bukan AI, bukan API - murni rule-based).
 * - Styling memakai <style> scoped sendiri (styles.css stale, tidak di-build).
 *
 * Tanpa dependensi eksternal. Font Awesome TIDAK global -> ikon SVG inline.
 */
(function () {
  "use strict";

  if (window.__pasinfoChatbotMounted) return;
  window.__pasinfoChatbotMounted = true;

  var GREETING =
    "Halo! Saya Pasuruan Info Assistant. Ada yang bisa saya bantu untuk " +
    "menemukan wisata menarik di Pasuruan?";

  var CHIPS = [
    "Rekomendasi Wisata",
    "Rekomendasi Kuliner",
    "Informasi Acara",
    "Informasi Budaya"
  ];

  var DOMAIN_LABEL = { kuliner: "Kuliner", acara: "Acara", budaya: "Budaya" };

  var ICON_SEND =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>';

  var STYLE_ID = "pasinfo-chatbot-style";

  function assetPrefix() {
    return document.body.getAttribute("data-asset-prefix") || "./public";
  }

  /* Ikon FAB memakai logo brand (spasi di nama file di-encode %20 seperti
     pola header logo di pasinfo-header.js). */
  function logoUrl() {
    return assetPrefix() + "/assets/logo/Logo%20favicon.png";
  }

  function detailHrefPrefix() {
    return assetPrefix() === "./public"
      ? "./src/views/detail_wisata.html?slug="
      : "detail_wisata.html?slug=";
  }

  function datasetUrl() {
    return assetPrefix() + "/js/data-wisata.js";
  }

  /* Dataset menyimpan path aset sebagai "../../public/assets/...".
     Path itu BENAR hanya dari halaman src/views/; dari index.html akan rusak.
     Normalisasi: ambil bagian setelah "public/" lalu tempel assetPrefix
     halaman yang sedang dibuka. URL absolut/data: dibiarkan apa adanya. */
  function photoSrc(raw) {
    if (!raw) return null;
    var value = String(raw);
    if (
      /^(https?:)?\/\//i.test(value) ||
      value.indexOf("data:") === 0 ||
      value.charAt(0) === "/"
    ) {
      return value;
    }
    var marker = value.indexOf("public/");
    var rest =
      marker !== -1
        ? value.slice(marker + "public/".length)
        : value.replace(/^(\.\.\/)+/, "");
    return assetPrefix() + "/" + rest;
  }

  function isMobile() {
    return window.matchMedia("(max-width: 767px)").matches;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      "[data-pasinfo-chat]{position:fixed;inset:auto 0 0 auto;z-index:60}",
      "[data-pasinfo-chat] *{box-sizing:border-box}",
      "[data-pasinfo-chat] .pchat-fab{position:fixed;bottom:calc(1.5rem + env(safe-area-inset-bottom,0px));right:1.5rem;display:flex;align-items:center;justify-content:center;width:56px;height:56px;padding:0;border:1px solid #e5e7eb;border-radius:9999px;background:#fff;box-shadow:0 10px 25px -5px rgba(15,23,42,.28);cursor:pointer;transition:background-color .16s ease,transform .16s ease}",
      "[data-pasinfo-chat] .pchat-fab-logo{display:block;width:34px;height:34px;object-fit:contain}",
      "[data-pasinfo-chat] .pchat-fab:hover{background:#f1f5f9;transform:translateY(-1px)}",
      "[data-pasinfo-chat] .pchat-fab:focus-visible,[data-pasinfo-chat] .pchat-btn:focus-visible,[data-pasinfo-chat] .pchat-chip:focus-visible,[data-pasinfo-chat] .pchat-send:focus-visible,[data-pasinfo-chat] .pchat-card-link:focus-visible,[data-pasinfo-chat] .pchat-input:focus-visible{outline:2px solid #1d4ed8;outline-offset:2px}",
      "[data-pasinfo-chat][data-state=open] .pchat-fab,[data-pasinfo-chat][data-state=min] .pchat-fab{display:none}",
      "[data-pasinfo-chat] .pchat-panel{position:fixed;right:1.5rem;bottom:1.5rem;display:flex;flex-direction:column;width:380px;max-width:calc(100vw - 3rem);height:min(620px,calc(100vh - 3rem));background:#fff;border:1px solid #e5e7eb;border-radius:1rem;box-shadow:0 25px 50px -12px rgba(15,23,42,.35);overflow:hidden;font-family:inherit;font-size:14px;color:#374151;opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .18s ease,transform .18s ease}",
      "[data-pasinfo-chat][data-state=open] .pchat-panel{opacity:1;transform:translateY(0);pointer-events:auto}",
      "[data-pasinfo-chat][data-state=open] .pchat-panel.pchat-mobile{border-radius:1rem 1rem 0 0;padding-bottom:env(safe-area-inset-bottom,0px)}",
      "[data-pasinfo-chat] .pchat-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem;padding:.75rem 1rem;background:#2563eb;color:#fff;flex-shrink:0}",
      "[data-pasinfo-chat] .pchat-title{margin:0;font-size:.9375rem;font-weight:700;line-height:1.3}",
      "[data-pasinfo-chat] .pchat-sub{margin:.125rem 0 0;font-size:.75rem;color:#dbeafe;line-height:1.3}",
      "[data-pasinfo-chat] .pchat-head-actions{display:flex;gap:.25rem;flex-shrink:0}",
      "[data-pasinfo-chat] .pchat-btn{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:0;border-radius:.5rem;background:rgba(255,255,255,.15);color:#fff;font-size:1rem;line-height:1;cursor:pointer}",
      "[data-pasinfo-chat] .pchat-btn:hover{background:rgba(255,255,255,.3)}",
      "[data-pasinfo-chat] .pchat-log{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:1rem;display:flex;flex-direction:column;gap:.625rem;background:#fff}",
      "[data-pasinfo-chat] .pchat-msg{max-width:88%;padding:.5rem .75rem;border-radius:.875rem;line-height:1.45;white-space:pre-line;word-break:break-word}",
      "[data-pasinfo-chat] .pchat-msg-user{align-self:flex-end;background:#2563eb;color:#fff;border-bottom-right-radius:.25rem}",
      "[data-pasinfo-chat] .pchat-msg-bot{align-self:flex-start;background:#f3f4f6;color:#374151;border-bottom-left-radius:.25rem}",
      "[data-pasinfo-chat] .pchat-cards{display:flex;flex-direction:column;gap:.5rem;margin-top:.5rem}",
      "[data-pasinfo-chat] .pchat-card{display:flex;gap:.625rem;padding:.5rem;background:#fff;border:1px solid #e5e7eb;border-radius:.75rem}",
      "[data-pasinfo-chat] .pchat-thumb{width:56px;height:56px;flex-shrink:0;border-radius:.5rem;overflow:hidden;background:#f3f4f6}",
      "[data-pasinfo-chat] .pchat-thumb img{width:100%;height:100%;object-fit:cover;display:block}",
      "[data-pasinfo-chat] .pchat-thumb-ph{width:100%;height:100%;background:#f87171}",
      "[data-pasinfo-chat] .pchat-card-body{min-width:0;display:flex;flex-direction:column;gap:.1875rem}",
      "[data-pasinfo-chat] .pchat-card-name{margin:0;font-size:.8125rem;font-weight:700;color:#111827;line-height:1.3}",
      "[data-pasinfo-chat] .pchat-badge{align-self:flex-start;padding:.0625rem .375rem;border:1px solid #bfdbfe;border-radius:9999px;background:#eff6ff;color:#1d4ed8;font-size:.6875rem;font-weight:600;line-height:1.5}",
      "[data-pasinfo-chat] .pchat-card-desc{margin:0;font-size:.75rem;color:#6b7280;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}",
      "[data-pasinfo-chat] .pchat-card-link{align-self:flex-start;margin-top:.125rem;font-size:.75rem;font-weight:700;color:#2563eb;text-decoration:none}",
      "[data-pasinfo-chat] .pchat-card-link:hover{text-decoration:underline}",
      "[data-pasinfo-chat] .pchat-status{margin:0;padding:.375rem 1rem;background:#f9fafb;border-top:1px solid #f3f4f6;color:#6b7280;font-size:.75rem;flex-shrink:0}",
      "[data-pasinfo-chat] .pchat-chips{display:flex;flex-wrap:wrap;gap:.375rem;padding:.625rem 1rem .25rem;border-top:1px solid #f3f4f6;background:#fff;flex-shrink:0}",
      "[data-pasinfo-chat] .pchat-chip{padding:.375rem .625rem;border:1px solid #e5e7eb;border-radius:9999px;background:#fff;color:#374151;font-size:.75rem;font-weight:600;cursor:pointer;min-height:32px}",
      "[data-pasinfo-chat] .pchat-chip:hover{background:#f3f4f6}",
      "[data-pasinfo-chat] .pchat-form{display:flex;align-items:flex-end;gap:.5rem;padding:.625rem 1rem 1rem;background:#fff;flex-shrink:0}",
      "[data-pasinfo-chat] .pchat-input{flex:1 1 auto;min-width:0;max-height:4.5rem;padding:.5rem .625rem;border:1px solid #e5e7eb;border-radius:.75rem;font-family:inherit;font-size:.8125rem;line-height:1.4;color:#374151;resize:none;overflow-y:auto}",
      "[data-pasinfo-chat] .pchat-input::placeholder{color:#9ca3af}",
      "[data-pasinfo-chat] .pchat-send{display:flex;align-items:center;justify-content:center;width:40px;height:40px;flex-shrink:0;border:0;border-radius:.75rem;background:#2563eb;color:#fff;cursor:pointer}",
      "[data-pasinfo-chat] .pchat-send:disabled{background:#d1d5db;cursor:not-allowed}",
      "[data-pasinfo-chat] .pchat-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}",
      "@media (max-width:767px){",
      "[data-pasinfo-chat] .pchat-panel{left:0;right:0;bottom:0;width:100%;max-width:none;height:85vh;height:85dvh;border-radius:1rem 1rem 0 0}",
      "[data-pasinfo-chat][data-state=min] .pchat-panel{height:auto}",
      "}",
      "@media (prefers-reduced-motion:reduce){",
      "[data-pasinfo-chat] .pchat-fab,[data-pasinfo-chat] .pchat-panel{transition:none}",
      "}",
      "[data-pasinfo-chat][data-state=min] .pchat-log,[data-pasinfo-chat][data-state=min] .pchat-chips,[data-pasinfo-chat][data-state=min] .pchat-form,[data-pasinfo-chat][data-state=min] .pchat-status{display:none}",
      "body.pchat-locked{overflow:hidden}"
    ].join("");
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === "class") node.className = attrs[key];
        else if (key === "text") node.textContent = attrs[key];
        else if (key === "html") node.innerHTML = attrs[key];
        else if (attrs[key] !== null && attrs[key] !== undefined) {
          node.setAttribute(key, attrs[key]);
        }
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function build() {
    var panelId = "pasinfo-chat-panel";
    var inputId = "pasinfo-chat-input";

    var fab = el(
      "button",
      {
        type: "button",
        class: "pchat-fab",
        "data-chat-toggle": "",
        "aria-expanded": "false",
        "aria-controls": panelId,
        "aria-label": "Buka Pasuruan Info Assistant"
      },
      [
        el("img", {
          class: "pchat-fab-logo",
          src: logoUrl(),
          alt: "",
          "aria-hidden": "true",
          width: "34",
          height: "34",
          decoding: "async"
        })
      ]
    );

    var log = el("div", {
      class: "pchat-log",
      "data-chat-log": "",
      role: "log",
      "aria-live": "polite",
      "aria-relevant": "additions text"
    });

    var status = el("p", {
      class: "pchat-status",
      "data-chat-status": "",
      role: "status",
      hidden: "hidden",
      text: ""
    });

    var chips = el("div", { class: "pchat-chips", "data-chat-chips": "" });
    CHIPS.forEach(function (label) {
      chips.appendChild(
        el("button", {
          type: "button",
          class: "pchat-chip",
          "data-chat-chip": label,
          text: label
        })
      );
    });

    var input = el("textarea", {
      id: inputId,
      class: "pchat-input",
      "data-chat-input": "",
      rows: "1",
      placeholder: "Tulis pertanyaan\u2026",
      autocomplete: "off",
      "aria-label": "Tulis pertanyaan untuk asisten"
    });

    var send = el("button", {
      type: "submit",
      class: "pchat-send",
      "data-chat-send": "",
      "aria-label": "Kirim pesan",
      disabled: "disabled",
      html: ICON_SEND
    });

    var form = el("form", { class: "pchat-form", "data-chat-form": "" }, [input, send]);

    var head = el("header", { class: "pchat-head" }, [
      el("div", {}, [
        el("p", {
          class: "pchat-title",
          id: "pasinfo-chat-title",
          text: "Pasuruan Info Assistant"
        }),
        el("p", { class: "pchat-sub", text: "Asisten rekomendasi wisata" })
      ]),
      el("div", { class: "pchat-head-actions" }, [
        el("button", {
          type: "button",
          class: "pchat-btn",
          "data-chat-min": "",
          "aria-label": "Perkecil panel",
          text: "\u2013"
        }),
        el("button", {
          type: "button",
          class: "pchat-btn",
          "data-chat-close": "",
          "aria-label": "Tutup panel",
          text: "\u2715"
        })
      ])
    ]);

    var panel = el("section", {
      id: panelId,
      class: "pchat-panel",
      "data-chat-panel": "",
      role: "dialog",
      "aria-modal": "false",
      "aria-labelledby": "pasinfo-chat-title"
    }, [head, log, status, chips, form]);

    var rootEl = el("div", {
      "data-pasinfo-chat": "",
      "data-state": "closed"
    }, [fab, panel]);

    return {
      root: rootEl,
      fab: fab,
      panel: panel,
      log: log,
      status: status,
      chips: chips,
      input: input,
      send: send,
      form: form,
      minBtn: panel.querySelector("[data-chat-min]"),
      closeBtn: panel.querySelector("[data-chat-close]")
    };
  }

  var ui = null;
  var state = {
    open: false,
    min: false,
    busy: false,
    greeted: false,
    messages: [],
    data: null,
    dataLoading: false,
    dataFailed: false,
    lastQuery: "",
    lastOffset: 0
  };

  function appendMessage(direction, text) {
    var stick = atBottom();
    var node = el("div", {
      class: "pchat-msg pchat-msg-" + (direction === "user" ? "user" : "bot"),
      text: text
    });
    ui.log.appendChild(node);
    state.messages.push({ role: direction, text: text });
    scrollToLatest(stick);
    return node;
  }

  function appendCards(result) {
    var stick = atBottom();
    var bubble = el("div", { class: "pchat-msg pchat-msg-bot", text: result.text });
    var wrap = el("div", { class: "pchat-cards" });
    result.cards.forEach(function (card) {
      var thumb;
      var src = photoSrc(card.photo);
      if (card.hasPhoto && src) {
        thumb = el("div", { class: "pchat-thumb" }, [
          el("img", {
            src: src,
            alt: card.photoAlt,
            loading: "lazy",
            decoding: "async"
          })
        ]);
      } else {
        thumb = el("div", { class: "pchat-thumb" }, [
          el("div", {
            class: "pchat-thumb-ph",
            role: "img",
            "aria-label": card.photoAlt
          })
        ]);
      }
      var body = el("div", { class: "pchat-card-body" }, [
        el("p", { class: "pchat-card-name", text: card.name })
      ]);
      if (card.categoryName) {
        body.appendChild(el("span", { class: "pchat-badge", text: card.categoryName }));
      }
      if (card.description) {
        body.appendChild(el("p", { class: "pchat-card-desc", text: card.description }));
      }
      body.appendChild(
        el("a", {
          class: "pchat-card-link",
          href: card.href,
          text: "Lihat Detail \u2192"
        })
      );
      wrap.appendChild(el("div", { class: "pchat-card" }, [thumb, body]));
    });
    bubble.appendChild(wrap);
    ui.log.appendChild(bubble);
    state.messages.push({ role: "assistant", text: result.text, cards: result.cards });
    scrollToLatest(stick);
  }

  function atBottom() {
    return ui.log.scrollHeight - ui.log.scrollTop - ui.log.clientHeight < 80;
  }

  function scrollToLatest(force) {
    if (force || atBottom()) {
      ui.log.scrollTop = ui.log.scrollHeight;
    }
  }

  function setStatus(text) {
    if (text) {
      ui.status.textContent = text;
      ui.status.removeAttribute("hidden");
    } else {
      ui.status.textContent = "";
      ui.status.setAttribute("hidden", "hidden");
    }
  }

  function syncSendState() {
    var empty = !ui.input.value.trim();
    ui.send.disabled = empty || state.busy;
  }

  function replyForIntent(intent) {
    if (intent.type === "greeting") {
      return GREETING;
    }
    if (intent.type === "thanks") {
      return "Sama-sama! Kalau butuh rekomendasi wisata lagi, tinggal tanya ya.";
    }
    if (intent.type === "domain") {
      return (
        "Untuk saat ini saya baru bisa membantu rekomendasi wisata. " +
        "Informasi " +
        (DOMAIN_LABEL[intent.domain] || intent.domain) +
        " belum tersedia di asisten ini."
      );
    }
    return (
      "Saya belum bisa menjawab itu. Saya bisa membantu menemukan wisata " +
      "di Pasuruan — coba tulis, misalnya: \"wisata alam\" atau \"wisata di " +
      "Pasuruan Timur\"."
    );
  }

  function wisataDataset() {
    if (state.data) return state.data;
    if (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) {
      state.data = window.PASINFO_WISATA;
    } else if (
      typeof window.WISATA_DESTINATIONS !== "undefined" &&
      window.WISATA_DESTINATIONS
    ) {
      state.data = {
        regions: window.WISATA_REGIONS || [],
        categories: window.WISATA_CATEGORIES || [],
        destinations: window.WISATA_DESTINATIONS || []
      };
    }
    return state.data || null;
  }

  function loadWisataData(done) {
    var ready = wisataDataset();
    if (ready) return done(null, ready);
    if (state.dataFailed) return done("failed", null);

    setStatus("Memuat data wisata\u2026");
    state.dataLoading = true;
    var script = document.createElement("script");
    script.src = datasetUrl();
    script.async = true;
    script.onload = function () {
      state.dataLoading = false;
      setStatus("");
      var data = wisataDataset();
      if (data) done(null, data);
      else {
        state.dataFailed = true;
        done("failed", null);
      }
    };
    script.onerror = function () {
      state.dataLoading = false;
      setStatus("");
      state.dataFailed = true;
      done("failed", null);
    };
    document.head.appendChild(script);
  }

  function answerWisata(query) {
    var intent = window.PasinfoChatbotReco.detectIntent(query);
    state.busy = true;
    syncSendState();
    loadWisataData(function (error, data) {
      state.busy = false;
      syncSendState();
      if (error) {
        appendMessage(
          "assistant",
          "Maaf, data wisata tidak bisa dimuat saat ini. Kamu bisa membuka " +
            'halaman "Wisata" untuk melihat daftar destinasi lengkap.'
        );
        return;
      }
      var normalized = window.PasinfoChatbotReco.normalize(query);
      var offset =
        intent.type === "more" || normalized === state.lastQuery
          ? state.lastOffset + window.PasinfoChatbotReco.MAX_CARDS
          : 0;
      var result = window.PasinfoChatbotReco.recommend(query, data, {
        offset: offset,
        detailHrefPrefix: detailHrefPrefix()
      });
      if (result.kind === "cards") {
        state.lastQuery = normalized;
        state.lastOffset = result.meta && result.meta.offset ? result.meta.offset : 0;
        appendCards(result);
      } else {
        appendMessage("assistant", result.text);
      }
    });
  }

  function send(rawText) {
    if (state.busy) return;
    var text = String(rawText === undefined || rawText === null ? "" : rawText).trim();
    if (!text) return;
    appendMessage("user", text);
    ui.input.value = "";
    syncSendState();

    var reco = window.PasinfoChatbotReco;
    if (!reco) {
      appendMessage(
        "assistant",
        "Asisten sedang tidak tersedia (mesin aturan gagal dimuat)."
      );
      return;
    }

    var intent = reco.detectIntent(text);
    if (intent.type === "empty") return;
    if (intent.type === "wisata" || intent.type === "search" || intent.type === "more") {
      if (intent.type === "more" && !state.lastQuery) {
        appendMessage(
          "assistant",
          'Belum ada rekomendasi sebelumnya. Coba tanya "rekomendasi wisata" dulu ya.'
        );
        return;
      }
      answerWisata(intent.type === "more" ? state.lastQuery : text);
      return;
    }
    appendMessage("assistant", replyForIntent(intent));
  }

  function setState(next) {
    state.open = next !== "closed";
    state.min = next === "min";
    ui.root.setAttribute("data-state", next);
    ui.fab.setAttribute("aria-expanded", String(state.open));
    ui.panel.classList.toggle("pchat-mobile", isMobile());
    ui.minBtn.setAttribute(
      "aria-label",
      state.min ? "Perbesar panel" : "Perkecil panel"
    );
    if (state.open) {
      document.addEventListener("keydown", onKeydown);
    } else {
      document.removeEventListener("keydown", onKeydown);
    }
    lockPageScroll(state.open && isMobile());
  }

  function lockPageScroll(lock) {
    if (lock) document.body.classList.add("pchat-locked");
    else document.body.classList.remove("pchat-locked");
  }

  function onKeydown(event) {
    if (event.key === "Escape" && state.open) {
      event.preventDefault();
      close();
    }
  }

  function open() {
    if (!state.greeted) {
      state.greeted = true;
      appendMessage("assistant", GREETING);
    }
    setState(state.min ? "min" : "open");
    ui.input.focus();
    ui.log.scrollTop = ui.log.scrollHeight;
  }

  function close() {
    setState("closed");
    ui.fab.focus();
  }

  function toggleMin() {
    setState(state.min ? "open" : "min");
    if (state.min) ui.minBtn.focus();
    else ui.input.focus();
  }

  function wire() {
    ui.fab.addEventListener("click", function () {
      if (state.open) close();
      else open();
    });
    ui.closeBtn.addEventListener("click", close);
    ui.minBtn.addEventListener("click", toggleMin);

    ui.chips.addEventListener("click", function (event) {
      var chip = event.target.closest("[data-chat-chip]");
      if (!chip) return;
      if (!state.open) open();
      send(chip.getAttribute("data-chat-chip"));
    });

    ui.form.addEventListener("submit", function (event) {
      event.preventDefault();
      send(ui.input.value);
    });

    ui.input.addEventListener("input", syncSendState);
    ui.input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        send(ui.input.value);
      }
    });

    window.addEventListener("resize", function () {
      ui.panel.classList.toggle("pchat-mobile", isMobile());
      if (!state.open) lockPageScroll(false);
      else lockPageScroll(isMobile());
    });
  }

  function mount() {
    if (document.querySelector("[data-pasinfo-chat]")) return;
    injectStyle();
    ui = build();
    document.body.appendChild(ui.root);
    wire();
    syncSendState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
