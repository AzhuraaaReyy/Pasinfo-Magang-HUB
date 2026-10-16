/**
 * Partial HEADER Pasuruan Info (dipakai semua halaman).
 * Dipasang via pasinfo-layout.js dari <div data-layout-header>.
 * JANGAN edit header langsung di tiap halaman — edit file ini.
 *
 * Parameter:
 * - assetPrefix: "./public" (root) atau "../../public" (src/views)
 * - active: id nav aktif ("terbaru" | "wisata" | ...) + aria-current
 * - wisataHref: link halaman wisata sesuai posisi halaman
 * - newsHref: link halaman listing berita (LayoutNews.html) sesuai posisi
 *   halaman. Item kategori berita memakai "<newsHref>?category=<id>".
 */
(function () {
  "use strict";
  var NAV_ITEMS = [
    { id: "terbaru", label: "Terbaru", href: "{HOME_HREF}" },
    { id: "lokal", label: "Lokal", cat: "lokal" },
    { id: "nasional", label: "Nasional", cat: "nasional" },
    { id: "internasional", label: "Internasional", cat: "internasional" },
    { id: "inspiratif", label: "Inspiratif", cat: "inspiratif" },
    { id: "politik", label: "Politik", cat: "politik" },
    { id: "wisata", label: "Wisata", href: "{WISATA_HREF}" },
  ];
  var MOBILE_EXTRA = { id: "beranda", label: "Beranda", href: "{HOME_HREF}" };
  var CHEVRON =
    '<svg class="h-4 w-4 shrink-0 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>';

  function itemHref(item, wisataHref, newsHref) {
    if (item.id === "wisata") return wisataHref;
    if (item.cat) return newsHref + "?category=" + item.cat;
    return item.href;
  }

  function desktopItem(item, active, wisataHref, newsHref) {
    var on = item.id === active;
    var href = itemHref(item, wisataHref, newsHref);
    return (
      "<li><a" +
      ' href="' + href + '"' +
      (on ? ' aria-current="page"' : "") +
             ' class="link-underline ph-nav-link inline-block py-1 text-xs md:text-sm font-bold uppercase tracking-wider ' +
      (on ? "text-brand" : "text-slate-700 transition-colors hover:text-sky-600") +
      '">' + item.label + "</a></li>"
    );
  }

  function mobileItem(item, active, wisataHref, newsHref, chevron) {
    var on = item.id === active;
    var href = itemHref(item, wisataHref, newsHref);
    return (
      '<li class="border-b border-gray-100"><a' +
      ' href="' + href + '"' +
      (on ? ' aria-current="page"' : "") +
      ' class="flex min-h-[44px] items-center justify-between px-1 text-sm font-bold uppercase tracking-wider ' +
      (on ? "text-brand" : "text-slate-700 transition-colors hover:text-sky-600") +
      '">' + item.label + chevron +
      "</a></li>"
    );
  }

  function renderHeader(opts) {
    var assetPrefix = opts.assetPrefix || "./public";
    var active = opts.active || "";
    var wisataHref = opts.wisataHref || "#";
    var homeHref = opts.homeHref || "#";
    var newsHref = opts.newsHref || "#";
    var desktopItems = NAV_ITEMS.map(function (it) {
      return desktopItem(it, active, wisataHref, newsHref);
    }).join("");
    var mobileItems = [MOBILE_EXTRA]
      .concat(NAV_ITEMS.slice(1))
      .map(function (it) {
        return mobileItem(it, active, wisataHref, newsHref, CHEVRON);
      })
      .join("");
    var html = `<header
      class="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-md"
    >
      <div class="container-page">
        <div class="flex h-16 items-center justify-between gap-3 lg:gap-4">
          <!-- Area kiri · logo -->
          <a href="{HOME_HREF}" class="shrink-0" aria-label="Pasuruan Info, beranda">
            <img
              src="${assetPrefix}/assets/logo/Logo%20Pasinfo.png"
              alt="Logo Pasuruan Info"
              class="ph-logo-dark h-12 md:h-14 w-auto object-contain"
            />
            <img
              src="${assetPrefix}/assets/logo/Logo%20Pasinfo%20Land-White.png"
              alt="Logo Pasuruan Info"
              class="ph-logo-light hidden h-12 md:h-14 w-auto object-contain"
            />
          </a>

          <!-- Area tengah · navigation (scrollable dengan arrows) -->
           <div class="hidden md:flex min-w-0 flex-1 items-center justify-center">
            <nav
              class="group/nav flex items-center gap-0 min-w-0"
              aria-label="Kategori berita"
            >
               <button
                 type="button"
                 data-nav-prev
                 class="shrink-0 rounded-full bg-white p-1 shadow-md ring-1 ring-gray-200 transition-all opacity-0 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                 aria-label="Geser kategori ke kiri"
               >
                <svg
                  class="h-3 w-3 text-gray-700"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

               <div class="relative min-w-0 flex-1 lg:max-w-2xl mx-auto">
                <ul
                  data-nav-list
                  class="no-scrollbar flex items-center gap-1.5 md:gap-2 lg:gap-4 overflow-x-auto whitespace-nowrap scroll-smooth px-4 py-2"
                >${desktopItems}
                </ul>
              </div>

               <button
                 type="button"
                 data-nav-next
                 class="shrink-0 rounded-full bg-white p-1 shadow-md ring-1 ring-gray-200 transition-all opacity-0 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                 aria-label="Geser kategori ke kanan"
               >
                <svg
                  class="h-3 w-3 text-gray-700"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </nav>
          </div>

          <!-- Area kanan · cari & masuk (tablet+) + tombol hamburger (mobile) -->
           <div class="flex shrink-0 items-center gap-2 lg:gap-3">
            <div class="hidden md:flex items-center gap-2 lg:gap-3">
            <form
              role="search"
              data-search-form
            >
              <label class="sr-only" for="search-input">Cari berita</label>
              <div class="relative">
                <svg
                  class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path stroke-linecap="round" d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  id="search-input"
                  type="search"
                  placeholder="Cari..."
                   class="ph-search h-8 w-28 md:w-32 lg:w-40 rounded-full border-0 bg-gray-100 pl-7 pr-3 text-xs md:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>
            </form>

            <!-- Account (visual only) -->
            <button
              type="button"
              class="ph-auth h-8 shrink-0 rounded-full bg-slate-900 px-4 lg:px-5 text-xs lg:text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Masuk
            </button>
            </div>

            <!-- Hamburger · mobile & tablet (< lg) -->
            <button
              type="button"
              data-menu-toggle
              class="ph-menu-btn flex md:hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-700 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Buka menu"
              aria-expanded="false"
              aria-controls="mobile-menu"
            >
              <svg
                data-icon-open
                class="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <svg
                data-icon-close
                class="hidden h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!--mobile-->
      <div
        id="mobile-menu"
        data-mobile-menu
        class="hidden border-t border-gray-200 bg-white md:hidden"
      >
        <div class="container-page">
          <div
            class="max-h-[calc(100vh-4rem-1px)] overflow-y-auto overscroll-contain py-3"
          >
            <nav aria-label="Kategori berita mobile">
              <ul
                data-mobile-list
                class="no-scrollbar flex flex-col overflow-y-auto overscroll-contain"
              >${mobileItems}
                </ul>
            </nav>

            <form class="mt-4" role="search" data-search-form>
              <label class="sr-only" for="search-input-mobile"
                >Cari berita</label
              >
              <div class="relative">
                <svg
                  class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path stroke-linecap="round" d="M20 20l-3.5-3.5" />
                </svg>
                <input
                  id="search-input-mobile"
                  type="search"
                  placeholder="Cari..."
                  class="ph-search h-10 w-full rounded-full border-0 bg-gray-100 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </div>
            </form>

            <button
              type="button"
              class="ph-auth mt-3 h-10 w-full rounded-full bg-slate-900 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Masuk
            </button>
          </div>
        </div>
      </div>
    </header>`;
    html = html.split("{WISATA_HREF}").join(wisataHref);
    html = html.split("{HOME_HREF}").join(homeHref);
    return html;
  }

  window.PasinfoLayout = window.PasinfoLayout || {};
  window.PasinfoLayout.renderHeader = renderHeader;
})();
