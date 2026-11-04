
      (function () {
        "use strict";
        var DATA = window.NEWS_DATA || {
          articles: [],
          categories: [],
          videos: [],
          photos: [],
        };
        var PREFIX =
          document.body.getAttribute("data-asset-prefix") || "../../public";
        var DETAIL = "detail_news.html?slug=";
        var LAYOUT = "LayoutNews.html?category=";

        function esc(s) {
          return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return {
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            }[c];
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
        }
        function h(html) {
          var t = document.createElement("template");
          t.innerHTML = html.trim();
          return t.content.firstElementChild;
        }
        function setText(sel, val) {
          var el = document.querySelector(sel);
          if (el) el.textContent = val;
        }
        function getParam(name) {
          var m = new RegExp("[?&]" + name + "=([^&]+)").exec(
            window.location.search,
          );
          return m ? decodeURIComponent(m[1]) : "";
        }

        function listItem(a) {
          var el = h(
            '<div class="flex gap-3 group cursor-pointer items-start">' +
              '<img src="' +
              img(a.image) +
              '" alt="' +
              esc(a.title) +
              '" class="w-20 h-16 object-cover rounded-sm shrink-0 group-hover:opacity-85 transition-opacity" />' +
              '<div class="space-y-1 w-full">' +
              '<div class="flex items-center justify-between gap-1">' +
              '<span class="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">' +
              esc(a.categoryLabel) +
              "</span>" +
              '<span class="text-[9px] text-gray-400 font-medium">' +
              esc(a.published_label) +
              "</span>" +
              "</div>" +
              '<h3 class="text-xs font-medium text-gray-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">' +
              esc(a.title) +
              "</h3>" +
              '<p data-news-desc class="text-[11px] text-slate-500 leading-snug line-clamp-2">' +
              esc(a.excerpt) +
              "</p>" +
              '<p class="text-slate-400 flex items-center gap-1 font-normal text-[9px] pt-0.5"><i class="fas fa-globe-asia text-[8px] text-blue-500/80"></i> ' +
              esc(a.source) +
              "</p></div></div>",
          );
          return el;
        }
        function popularItem(a, rank) {
          var el = h(
            '<div class="flex gap-3 group cursor-pointer items-start">' +
              '<div class="relative shrink-0">' +
              '<img src="' +
              img(a.image) +
              '" alt="' +
              esc(a.title) +
              '" class="w-20 h-16 object-cover rounded-sm group-hover:opacity-85 transition-opacity" />' +
              '<span class="absolute -top-1.5 -left-1.5 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">' +
              rank +
              "</span></div>" +
              '<div class="space-y-1 w-full">' +
              '<span class="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">' +
              esc(a.categoryLabel) +
              " \u2022 " +
              esc(a.published_label) +
              "</span>" +
              '<h3 class="text-xs font-medium text-gray-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">' +
              esc(a.title) +
              "</h3>" +
              '<p data-news-desc class="text-[11px] text-slate-500 leading-snug line-clamp-2">' +
              esc(a.excerpt) +
              "</p>" +
              '<p class="text-slate-400 flex items-center gap-1 font-normal text-[9px] pt-0.5"><i class="fas fa-globe-asia text-[8px] text-blue-500/80"></i> ' +
              esc(a.source) +
              "</p></div></div>",
          );
          return el;
        }
        function videoItem(v) {
          var el = h(
            '<div class="flex gap-3 group cursor-pointer items-start">' +
              '<div class="relative shrink-0 w-20 h-14 rounded-sm overflow-hidden bg-black">' +
              '<img src="' +
              img(v.image) +
              '" alt="' +
              esc(v.title) +
              '" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80" />' +
              '<div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">' +
              '<div class="w-5 h-5 rounded-full bg-blue-600/90 text-white flex items-center justify-center text-[8px] shadow-sm pl-0.5"><i class="fas fa-play"></i></div>' +
              "</div></div>" +
              '<div class="space-y-1 w-full">' +
              '<h3 class="text-xs font-medium text-gray-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">' +
              esc(v.title) +
              "</h3>" +
              '<p data-news-desc class="text-[11px] text-slate-500 leading-snug line-clamp-2">' +
              esc(v.desc) +
              "</p>" +
              '<p class="text-slate-400 flex items-center gap-1 font-normal text-[9px] pt-0.5"><i class="fab fa-youtube text-[8px] text-red-500"></i> ' +
              esc(v.date) +
              "</p></div></div>",
          );
          return el;
        }
        function photoItem(p) {
          var el = h(
            '<div class="group cursor-pointer space-y-1.5">' +
              '<div class="overflow-hidden rounded-sm bg-gray-100">' +
              '<img src="' +
              img(p.image) +
              '" alt="' +
              esc(p.title) +
              '" class="w-full h-20 object-cover group-hover:scale-105 transition-transform duration-300" />' +
              "</div>" +
              '<h3 class="text-[11px] font-medium text-gray-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">' +
              esc(p.title) +
              "</h3>" +
              '<p data-news-desc class="text-[11px] text-slate-500 leading-snug line-clamp-2">' +
              esc(p.desc) +
              "</p>" +
              '<p class="text-slate-400 flex items-center gap-1 font-normal text-[9px]"><i class="fas fa-camera text-[8px] text-emerald-500"></i> ' +
              esc(p.date) +
              "</p></div>",
          );
          return el;
        }
        function recoCard(a) {
          var el = h(
            '<div class="group cursor-pointer space-y-2">' +
              '<div class="overflow-hidden rounded-sm bg-gray-100">' +
              '<img src="' +
              img(a.image) +
              '" alt="' +
              esc(a.title) +
              '" class="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300" />' +
              "</div>" +
              '<h3 class="text-xs font-medium text-gray-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">' +
              esc(a.title) +
              "</h3>" +
              '<p data-news-desc class="text-[11px] text-slate-500 leading-snug line-clamp-2">' +
              esc(a.excerpt) +
              "</p>" +
              '<p class="text-slate-400 flex items-center gap-1 font-normal text-[9px]"><i class="fas fa-globe-asia text-[8px] text-blue-500/80"></i> ' +
              esc(a.source) +
              "</p></div>",
          );
          return el;
        }
        function miniCard(a) {
          var el = h(
            '<div class="group cursor-pointer space-y-1.5">' +
              '<div class="overflow-hidden rounded-sm bg-gray-100">' +
              '<img src="' +
              img(a.image) +
              '" alt="' +
              esc(a.title) +
              '" class="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300" />' +
              "</div>" +
              '<h3 class="text-[11px] font-medium text-gray-800 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">' +
              esc(a.title) +
              "</h3>" +
              '<p data-news-desc class="text-[11px] text-slate-500 leading-snug line-clamp-2">' +
              esc(a.excerpt) +
              "</p>" +
              '<p class="text-slate-400 flex items-center gap-1 font-normal text-[9px]"><i class="fas fa-globe-asia text-[8px] text-blue-500/80"></i> ' +
              esc(a.source) +
              "</p></div>",
          );
          return el;
        }

        function fill(sel, items, builder) {
          var host = document.querySelector(sel);
          if (!host) return;
          host.innerHTML = "";
          items.forEach(function (it, i) {
            var el = builder(it, i + 1);
            host.appendChild(el);
          });
        }

        function renderArticle(a) {
          document.title = a.title + " — Pasuruan Info";
          setText("[data-breadcrumb-title]", a.categoryLabel);
          setText("[data-article-category]", a.categoryLabel);
          setText("[data-article-title]", a.title);
          setText("[data-article-excerpt]", a.excerpt);
          setText("[data-article-author]", a.author);
          setText("[data-article-date]", a.published_label);
          setText("[data-article-source]", a.source);
          setText("[data-author-name]", a.author);
          setText(
            "[data-author-initial]",
            (a.author || "P").charAt(0).toUpperCase(),
          );

          var fig = document.querySelector("[data-article-image]");
          if (fig) {
            fig.src = img(a.image);
            fig.alt = a.title;
          }

          var content = document.querySelector("[data-article-content]");
          if (content) {
            content.innerHTML = "";
            (a.content || []).forEach(function (p, i) {
              var pel = document.createElement("p");
              pel.textContent = p;
              content.appendChild(pel);
              if (i === 1) {
                var q = h(
                  '<blockquote class="my-6 border-l-2 border-blue-600 pl-4 py-1 italic text-gray-500 text-sm leading-relaxed">' +
                    esc(a.excerpt) +
                    "</blockquote>",
                );
                content.appendChild(q);
              }
            });
          }

          var meta = document.querySelector("meta[name=description]");
          if (meta) meta.setAttribute("content", a.excerpt);
        }

        function renderAll() {
          var slug = getParam("slug");
          var article =
            DATA.bySlug(slug) ||
            (DATA.articles.length ? DATA.articles[0] : null);
          if (!article) return;

          renderArticle(article);

          // Widget lists
          var related = DATA.articles
            .filter(function (a) {
              return a.slug !== article.slug && a.category === article.category;
            })
            .concat(
              DATA.articles.filter(function (a) {
                return (
                  a.slug !== article.slug && a.category !== article.category
                );
              }),
            )
            .slice(0, 5);
          fill('[data-news-list="related"]', related, listItem);
          fill(
            '[data-news-list="latest"]',
            DATA.articles
              .filter(function (a) {
                return a.slug !== article.slug;
              })
              .slice(0, 6),
            listItem,
          );
          fill(
            '[data-news-list="popular"]',
            DATA.articles.slice(0, 4),
            popularItem,
          );
          fill("[data-news-video]", DATA.videos.slice(0, 4), videoItem);
          fill("[data-news-photo-grid]", DATA.photos.slice(0, 4), photoItem);
          fill(
            '[data-news-grid="reco"]',
            DATA.articles
              .filter(function (a) {
                return a.slug !== article.slug;
              })
              .slice(0, 6),
            recoCard,
          );
          fill(
            '[data-news-grid="pasuruan"]',
            DATA.articles
              .filter(function (a) {
                return a.slug !== article.slug;
              })
              .slice(0, 8),
            miniCard,
          );

          // Label kategori aktif pada section bawah
          var lbl = document.getElementById("active-category-label");
          if (lbl) lbl.textContent = "Kategori: " + article.categoryLabel;

          // Filter kategori (link ke LayoutNews)
          var filter = document.querySelector("[data-news-filter]");
          if (filter) {
            filter.innerHTML = "";
            DATA.categories.forEach(function (c) {
              var a = document.createElement("a");
              a.href = LAYOUT + encodeURIComponent(c.slug);
              a.className =
                "inline-block px-3 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap " +
                (c.slug === article.category
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200");
              a.textContent = c.label;
              filter.appendChild(a);
            });
          }

          // Wire seluruh kartu ke detail
          document
            .querySelectorAll(
              "[data-news-list] > .group, [data-news-grid] > .group, [data-news-video] > .group, [data-news-photo-grid] > .group",
            )
            .forEach(function (el) {
              var heading = el.querySelector("h3");
              if (!heading) return;
              var t = heading.textContent.trim();
              var match = DATA.articles.filter(function (a) {
                return a.title === t;
              })[0];
              if (match) go(el, match.slug);
            });
        }

        function animate() {
          if (!window.gsap || !window.ScrollTrigger) return;
          gsap.registerPlugin(ScrollTrigger);
          var targets = document.querySelectorAll(
            "[data-news-main-scroll] > article, [data-news-main-scroll] > section, aside > section, #pasuruan-news-grid > *, [data-news-list] > *, [data-news-grid] > *, [data-news-video] > *",
          );
          /* Di desktop isi kolom artikel berada di dalam panel scroll
             ([data-news-main-scroll] absolute/overflow-y:auto); ScrollTrigger
             harus memakai panel itu sebagai scroller agar bagian di dalam
             panel tetap tampil (tidak tertinggal pada autoAlpha:0).
             Di mobile/tablet panel tidak aktif → scroller tetap window. */
          var mainPane = document.querySelector("[data-news-main-scroll]");
          var paneActive =
            mainPane && getComputedStyle(mainPane).position === "absolute";
          targets.forEach(function (el, i) {
            var inPane = paneActive && el.parentNode === mainPane;
            gsap.fromTo(
              el,
              { autoAlpha: 0, y: 24 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: el,
                  scroller: inPane ? mainPane : window,
                  start: "top 92%",
                  once: true,
                },
                delay: Math.min((i % 6) * 0.04, 0.24),
              },
            );
          });
        }

        document.addEventListener("DOMContentLoaded", function () {
          renderAll();
          animate();
        });
      })();
    