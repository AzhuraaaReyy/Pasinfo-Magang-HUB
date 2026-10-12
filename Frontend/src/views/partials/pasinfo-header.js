/**
 * Partial HEADER Pasuruan Info (dipakai semua halaman).
 * Dipasang via pasinfo-layout.js dari <div data-layout-header>.
 * JANGAN edit header langsung di tiap halaman — edit file ini.
 *
 * Parameter:
 * - assetPrefix: "./public" (root) atau "../../public" (src/views)
 * - active: id nav aktif ("terbaru" | "wisata" | ...) + aria-current
 * - wisataHref: link halaman wisata sesuai posisi halaman
 */
(function () {
  "use strict";
  var NAV_ITEMS = [
    { id: "terbaru", label: "Terbaru", href: "{HOME_HREF}" },
    { id: "lokal", label: "Lokal", href: "#" },
    { id: "nasional", label: "Nasional", href: "#" },
    { id: "internasional", label: "Internasional", href: "#" },
    { id: "inspiratif", label: "Inspiratif", href: "#" },
    { id: "politik", label: "Politik", href: "#" },
    { id: "wisata", label: "Wisata", href: "{WISATA_HREF}" },
  ];
  var MOBILE_EXTRA = { id: "beranda", label: "Beranda", href: "{HOME_HREF}" };
  var CHEVRON =
    '<svg class="h-4 w-4 shrink-0 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>';

  function desktopItem(item, active, wisataHref) {
    var on = item.id === active;
    var href = item.id === "wisata" ? wisataHref : item.href;
    return (
      "<li><a" +
      ' href="' + href + '"' +
      (on ? ' aria-current="page"' : "") +
      ' class="link-underline ph-nav-link inline-block py-1 text-xs font-bold uppercase tracking-wider ' +
      (on ? "text-brand" : "text-slate-700 transition-colors hover:text-sky-600") +
      '">' + item.label + "</a></li>"
    );
  }

  function mobileItem(item, active, wisataHref, chevron) {
    var on = item.id === active;
    var href = item.id === "wisata" ? wisataHref : item.href;
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
    var desktopItems = NAV_ITEMS.map(function (it) {
      return desktopItem(it, active, wisataHref);
    }).join("");
    var mobileItems = [MOBILE_EXTRA]
      .concat(NAV_ITEMS.slice(1))
      .map(function (it) {
        return mobileItem(it, active, wisataHref, CHEVRON);
      })
      .join("");
    var html = `<header
      class="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-md"
    >
      <div class="container-page">
        <div class="relative flex h-16 items-center justify-between gap-4">
          <!-- Area kiri · logo, lebar terkunci -->
          <a href="{HOME_HREF}" class="shrink-0" aria-label="Pasuruan Info, beranda">
            <img
              src="${assetPrefix}/assets/logo/Logo%20Pasinfo.png"
              alt="Logo Pasuruan Info"
              class="ph-logo-dark h-14 w-auto object-contain"
            />
            <img
              src="${assetPrefix}/assets/logo/Logo%20Pasinfo%20Land-White.png"
              alt="Logo Pasuruan Info"
              class="ph-logo-light hidden h-14 w-auto object-contain"
            />
          </a>

          <div
            class="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center md:flex"
          >
            <nav
              class="group/nav flex min-w-0 max-w-full items-center gap-1"
              aria-label="Kategori berita"
            >
              <button
                type="button"
                data-nav-prev
                class="shrink-0 rounded-full bg-white p-1.5 shadow-md ring-1 ring-gray-200 transition-all opacity-0 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:pointer-events-auto hover:bg-gray-50 focus:outline-none focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Geser kategori ke kiri"
              >
                <svg
                  class="h-4 w-4 text-gray-700"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div class="relative min-w-0 flex-1">
                <ul
                  data-nav-list
                  class="no-scrollbar mx-auto flex items-center gap-4 overflow-x-auto whitespace-nowrap scroll-smooth px-1 py-2 lg:gap-6"
                >${desktopItems}
                </ul>

                <!-- Fade gradient penanda masih bisa di-scroll -->
                <div
                  data-nav-fade-left
                  class="pointer-events-none absolute inset-y-0 left-0 hidden w-6 bg-gradient-to-r from-white to-transparent"
                ></div>
                <div
                  data-nav-fade-right
                  class="pointer-events-none absolute inset-y-0 right-0 hidden w-6 bg-gradient-to-l from-white to-transparent"
                ></div>
              </div>

              <button
                type="button"
                data-nav-next
                class="shrink-0 rounded-full bg-white p-1.5 shadow-md ring-1 ring-gray-200 transition-all opacity-0 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:pointer-events-auto hover:bg-gray-50 focus:outline-none focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Geser kategori ke kanan"
              >
                <svg
                  class="h-4 w-4 text-gray-700"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
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

          <!-- Area kanan · cari & masuk (desktop) + tombol hamburger (mobile) -->
          <div class="flex shrink-0 items-center gap-3">
            <form
              class="hidden shrink-0 md:block"
              role="search"
              data-search-form
            >
              <label class="sr-only" for="search-input">Cari berita</label>
              <div class="relative mt-auto">
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
                  id="search-input"
                  type="search"
                  placeholder="Cari..."
                  class="ph-search h-9 w-44 rounded-full border-0 bg-gray-100 pl-9 pr-4 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand md:w-40 lg:w-44 xl:w-56"
                />
              </div>
            </form>

            <!-- Account (visual only) -->
            <button
              type="button"
              class="ph-auth hidden h-9 shrink-0 rounded-full bg-slate-900 px-6 text-xs font-bold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 md:block md:px-3 lg:px-6"
            >
              Masuk
            </button>

            <!-- Hamburger · mobile saja -->
            <button
              type="button"
              data-menu-toggle
              class="ph-menu-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-700 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand md:hidden"
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
