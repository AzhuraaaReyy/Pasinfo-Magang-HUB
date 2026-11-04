
      (function () {
        "use strict";
        var DATA = window.NEWS_DATA || { articles: [], categories: [], videos: [], photos: [] };
        var PREFIX = document.body.getAttribute("data-asset-prefix") || "../../public";
        var DETAIL = "detail_news.html?slug=";

        function esc(s) {
          return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
          });
        }
        function img(p) {
          if (!p) return "";
          if (/^https?:\/\//.test(p)) return p;
          return PREFIX + "/assets/images/" + p;
        }
        function link(slug) {
          return DETAIL + encodeURIComponent(slug);
        }
        function go(el, slug) {
          el.setAttribute("role", "link");
          el.setAttribute("tabindex", "0");
          el.addEventListener("click", function () {
            window.location.href = link(slug);
          });
          el.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              window.location.href = link(slug);
            }
          });
        }
        function wrap(cls, inner) {
          var e = document.createElement("div");
          e.className = cls;
          e.innerHTML = inner;
          return e;
        }

        function heroLargeInner(a) {
          return (
            '<img src="' + img(a.image) + '" alt="' + esc(a.title) + '" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />' +
            '<div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>' +
            '<div class="relative z-10 space-y-2.5">' +
            '<span data-badge class="inline-block px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider rounded shadow-sm">' + esc(a.categoryLabel) + "</span>" +
            '<h1 class="text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight group-hover:text-blue-300 transition-colors">' + esc(a.title) + "</h1>" +
            '<p class="text-xs text-slate-300 line-clamp-2 leading-relaxed">' + esc(a.excerpt) + "</p>" +
            '<div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 font-medium pt-1 border-t border-white/10">' +
            '<span class="text-white font-semibold">' + esc(a.author) + "</span><span>\u2022</span>" +
            '<span class="flex items-center gap-1"><i class="far fa-calendar-alt text-[9px]"></i> ' + esc(a.published_label) + "</span><span>\u2022</span>" +
            '<span class="flex items-center gap-1 text-slate-200"><i class="fas fa-globe text-[9px]"></i> ' + esc(a.source) + "</span>" +
            "</div></div>"
          );
        }
        function heroSmall(a) {
          return wrap(
            "group relative rounded-xl overflow-hidden min-h-[185px] bg-slate-900 transition-all duration-300 flex flex-col justify-end p-5 border border-slate-200/20 shadow-sm cursor-pointer",
            '<img src="' + img(a.image) + '" alt="' + esc(a.title) + '" class="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-700" />' +
              '<div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>' +
              '<div class="relative z-10 space-y-1.5">' +
              '<span data-badge class="inline-block px-2 py-0.5 bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-wider rounded shadow-sm">' + esc(a.categoryLabel) + "</span>" +
              '<h2 class="text-sm sm:text-base font-bold text-white leading-snug group-hover:text-blue-300 transition-colors">' + esc(a.title) + "</h2>" +
              '<div class="flex flex-wrap items-center gap-2 text-[10px] text-slate-300 font-medium pt-1 border-t border-white/10">' +
              '<span class="text-white font-semibold">' + esc(a.author) + "</span><span>\u2022</span>" +
              '<span class="flex items-center gap-1"><i class="far fa-calendar-alt text-[9px]"></i> ' + esc(a.published_label) + "</span><span>\u2022</span>" +
              '<span class="flex items-center gap-1 text-slate-200"><i class="fas fa-globe text-[9px]"></i> ' + esc(a.source) + "</span>" +
              "</div></div>"
          );
        }
        function mainCard(a) {
          return wrap(
            "group bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between h-full hover:border-blue-500 hover:shadow-md transition-all duration-200 cursor-pointer",
            '<div class="space-y-2">' +
              '<div data-card-media class="overflow-hidden rounded-lg bg-slate-100 aspect-[16/10] relative">' +
              '<img src="' + img(a.image) + '" alt="' + esc(a.title) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />' +
              '<span data-badge class="absolute top-2 left-2 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-wider rounded shadow-sm">' + esc(a.categoryLabel) + "</span>" +
              "</div>" +
              '<h3 class="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-3 group-hover:text-blue-600 transition-colors">' + esc(a.title) + "</h3>" +
              '<p class="text-[11px] text-slate-500 leading-relaxed line-clamp-2">' + esc(a.excerpt) + "</p>" +
              "</div>" +
              '<div data-news-meta class="flex flex-wrap items-center justify-between gap-y-0.5 text-[10px] text-slate-500 pt-2 border-t border-slate-100 mt-2.5">' +
              '<span class="flex items-center gap-1"><i class="far fa-clock text-blue-600"></i> ' + esc(a.published_label) + "</span>" +
              '<span class="font-medium text-slate-600 flex items-center gap-1"><i class="fas fa-globe text-slate-400 text-[9px]"></i> ' + esc(a.source) + "</span>" +
              "</div>"
          );
        }
        function listItem(a, accent) {
          return wrap(
            "group flex gap-3 items-start cursor-pointer",
            '<div class="w-20 h-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 relative">' +
              '<img src="' + img(a.image) + '" alt="' + esc(a.title) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />' +
              '<span data-badge class="absolute top-1 left-1 px-1 bg-blue-600 text-white text-[7px] font-bold rounded">' + esc(a.categoryLabel) + "</span>" +
              "</div>" +
              '<div class="space-y-1.5 min-w-0 flex-1">' +
              '<h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-3 group-hover:text-blue-600 transition-colors">' + esc(a.title) + "</h4>" +
              '<p class="text-[11px] text-slate-500 leading-snug line-clamp-2">' + esc(a.excerpt) + "</p>" +
              '<div data-news-meta class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-slate-400">' +
                '<span><i class="far fa-clock ' + (accent || "text-blue-600") + '"></i> ' + esc(a.published_label) + "</span>" +
                (a.source ? '<span><i class="fas fa-globe text-slate-400"></i> ' + esc(a.source) + "</span>" : "") +
                "</div>" +
              "</div>"
          );
        }
        function videoItem(v) {
          return wrap(
            "group flex gap-3 items-start cursor-pointer",
            '<div class="w-20 h-14 shrink-0 overflow-hidden rounded-lg bg-slate-900 relative">' +
              '<img src="' + img(v.image) + '" alt="' + esc(v.title) + '" class="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300" />' +
              '<div class="absolute inset-0 flex items-center justify-center"><div class="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow"><i class="fas fa-play text-xs pl-0.5"></i></div></div>' +
              '<span data-badge class="absolute bottom-0.5 right-0.5 px-1 bg-slate-950/80 text-white text-[10px] font-mono font-bold rounded">' + esc(v.duration) + "</span>" +
              "</div>" +
              '<div class="space-y-1.5 min-w-0 flex-1">' +
              '<h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-3 group-hover:text-blue-600 transition-colors">' + esc(v.title) + "</h4>" +
              '<p class="text-[11px] text-slate-500 leading-snug line-clamp-2">' + esc(v.desc) + "</p>" +
              '<span class="text-[9px] text-slate-400 block"><i class="far fa-clock text-red-600"></i> ' + esc(v.date) + "</span>" +
              "</div>"
          );
        }
        function photoItem(p) {
          return wrap(
            "group flex gap-3 items-start cursor-pointer",
            '<div class="w-20 h-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 relative">' +
              '<img src="' + img(p.image) + '" alt="' + esc(p.title) + '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />' +
              '<span data-badge class="absolute top-1 left-1 px-1 bg-emerald-600 text-white text-[7px] font-bold rounded flex items-center gap-0.5"><i class="fas fa-images"></i> ' + esc(p.count) + "</span>" +
              "</div>" +
              '<div class="space-y-1.5 min-w-0 flex-1">' +
              '<h4 class="text-xs font-bold text-slate-900 leading-snug line-clamp-3 group-hover:text-blue-600 transition-colors">' + esc(p.title) + "</h4>" +
              '<p class="text-[11px] text-slate-500 leading-snug line-clamp-2">' + esc(p.desc) + "</p>" +
              '<span class="text-[9px] text-slate-400 block"><i class="far fa-clock text-emerald-600"></i> ' + esc(p.date) + "</span>" +
              "</div>"
          );
        }

        function fill(sel, items, builder) {
          var host = document.querySelector(sel);
          if (!host) return;
          host.innerHTML = "";
          items.forEach(function (it) {
            var el = builder(it);
            host.appendChild(el);
          });
        }

        function getParam(name) {
          var m = new RegExp("[?&]" + name + "=([^&]+)").exec(window.location.search);
          return m ? decodeURIComponent(m[1]) : "";
        }

        function validCat(slug) {
          return DATA.categories.some(function (c) { return c.slug === slug; });
        }

        function renderCategory(catSlug) {
          var cat = DATA.categories.filter(function (c) { return c.slug === catSlug; })[0];
          var label = cat ? cat.label : "Terbaru";
          var badge = document.querySelector("[data-category-badge]");
          var title = document.querySelector("[data-category-title]");
          if (badge) badge.textContent = label;
          if (title) title.textContent = "Berita " + label;
          var items = DATA.byCategory(catSlug);
          if (!items.length) items = DATA.articles.slice(0, 6);
          fill('[data-news-grid="category"]', items, mainCard);
        }

        function renderHero() {
          var f = DATA.featured(3);
          if (f.length < 3) f = DATA.articles.slice(0, 3);
          var big = document.querySelector("[data-hero-large]");
          if (big && f[0]) {
            big.innerHTML = heroLargeInner(f[0]);
            go(big, f[0].slug);
          }
          var stack = document.querySelector("[data-hero-stack]");
          if (stack) {
            stack.innerHTML = "";
            [f[1], f[2]].forEach(function (a) {
              if (!a) return;
              var el = heroSmall(a);
              stack.appendChild(el);
              go(el, a.slug);
            });
          }
        }

        function wireGrid(sel) {
          document.querySelectorAll(sel + " > article, " + sel + " > .group").forEach(function (el) {
            var titleEl = el.querySelector("h3");
            if (!titleEl) return;
            var t = titleEl.textContent.trim();
            var match = DATA.articles.filter(function (a) { return a.title === t; })[0];
            if (match) go(el, match.slug);
          });
        }

        function renderAll() {
          renderHero();

          // Filter chips
          var current = getParam("category");
          if (!validCat(current)) current = "lokal";
          var filter = document.querySelector("[data-news-filter]");
          if (filter) {
            filter.innerHTML = "";
            DATA.categories.forEach(function (c) {
              var a = document.createElement("a");
              a.href = "LayoutNews.html?category=" + encodeURIComponent(c.slug);
              a.className =
                "news-chip inline-block px-3.5 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors" +
                (c.slug === current ? " is-active" : "");
              a.textContent = c.label;
              a.setAttribute("data-chip", c.slug);
              filter.appendChild(a);
            });
          }

          fill('[data-news-list="internasional"]', DATA.byCategory("internasional"), listItem);
          fill('[data-news-list="nasional"]', DATA.byCategory("nasional"), listItem);
          fill("[data-news-video]", DATA.videos, videoItem);
          fill("[data-news-photo]", DATA.photos, photoItem);

          fill(
            '[data-news-grid="reco"]',
            DATA.featured(6).length ? DATA.featured(6) : DATA.articles.slice(0, 6),
            mainCard
          );
          var others = DATA.articles.filter(function (a) { return a.category !== current; }).slice(0, 6);
          fill('[data-news-grid="more"]', others, mainCard);

          renderCategory(current);

          // Link seluruh kartu utama ke detail
          wireGrid('[data-news-grid="category"]');
          wireGrid('[data-news-grid="reco"]');
          wireGrid('[data-news-grid="more"]');
          document
            .querySelectorAll('[data-news-list] > .group, [data-news-video] > .group, [data-news-photo] > .group')
            .forEach(function (el) {
              var t = el.querySelector("h4");
              if (!t) return;
              var match = DATA.articles.filter(function (a) { return a.title === t.textContent.trim(); })[0];
              if (match) go(el, match.slug);
            });
        }

        function animate() {
          if (!window.gsap || !window.ScrollTrigger) return;
          gsap.registerPlugin(ScrollTrigger);
          var targets = document.querySelectorAll(
            "main > section, main > nav, aside > div, [data-news-grid] > *, [data-news-list] > *, [data-news-video] > *, [data-news-photo] > *"
          );
          targets.forEach(function (el, i) {
            gsap.fromTo(
              el,
              { autoAlpha: 0, y: 24 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                ease: "power2.out",
                scrollTrigger: { trigger: el, start: "top 92%", once: true },
                delay: Math.min((i % 6) * 0.04, 0.24),
              }
            );
          });
        }

        document.addEventListener("DOMContentLoaded", function () {
          renderAll();
          animate();
        });
      })();
    