/**
 * Partial FOOTER Pasuruan Info (dipakai semua halaman).
 * Dipasang via pasinfo-layout.js dari <div data-layout-footer>.
 * JANGAN edit footer langsung di tiap halaman — edit file ini.
 *
 * Parameter:
 * - assetPrefix: "./public" (root) atau "../../public" (src/views)
 */
(function () {
  "use strict";
  function renderFooter(opts) {
    var assetPrefix = (opts && opts.assetPrefix) || "./public";
    return `<footer class="bg-footer text-gray-300">
      <div class="container-page py-12 md:py-16">
        <!-- Grid Utama: Brand Info, Ikuti Kami, & Kontak -->
        <div class="grid grid-cols-1 gap-10 md:grid-cols-3 lg:gap-12">
          <!-- Kolom 1: Logo & Deskripsi -->
          <div class="space-y-4">
            <div class="flex items-center gap-2">
              <img
                src="${assetPrefix}/assets/logo/Logo Pasinfo Land-White.png"
                alt="Pasuruan Info"
                class="h-14 w-auto object-contain"
              />
            </div>
            <p class="text-sm leading-relaxed text-gray-400">
              Portal informasi digital yang menyajikan berita terkini dan
              terpercaya seputar Pasuruan, meliputi peristiwa, cek fakta,
              ekonomi, pemerintahan, hiburan, kuliner, gaya hidup, pariwisata,
              serta dinamika lokal yang relevan bagi masyarakat.
            </p>
          </div>

          <!-- Kolom 2: Ikuti Kami (Social Media Circle Icons) -->
          <div>
            <h3 class="text-base font-bold text-white">Ikuti Kami</h3>
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <!-- WhatsApp -->
              <a
                href="#"
                aria-label="WhatsApp"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <img
                  src="${assetPrefix}/assets/icons/icon_whatsapp.svg"
                  alt=""
                  aria-hidden="true"
                  class="h-5 w-5"
                />
              </a>

              <!-- Instagram -->
              <a
                href="#"
                aria-label="Instagram"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <img
                  src="${assetPrefix}/assets/icons/icon_instagram.svg"
                  alt=""
                  aria-hidden="true"
                  class="h-5 w-5"
                />
              </a>

              <!-- TikTok -->
              <a
                href="#"
                aria-label="TikTok"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <img
                  src="${assetPrefix}/assets/icons/icon_tiktok.svg"
                  alt=""
                  aria-hidden="true"
                  class="h-5 w-5"
                />
              </a>

              <!-- YouTube -->
              <a
                href="#"
                aria-label="YouTube"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <img
                  src="${assetPrefix}/assets/icons/icon_youtube.svg"
                  alt=""
                  aria-hidden="true"
                  class="h-5 w-5"
                />
              </a>

              <!-- X / Twitter -->
              <a
                href="#"
                aria-label="X / Twitter"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <img
                  src="${assetPrefix}/assets/icons/icon_X.svg"
                  alt=""
                  aria-hidden="true"
                  class="h-5 w-5"
                />
              </a>

              <!-- Threads -->
              <a
                href="#"
                aria-label="Threads"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <img
                  src="${assetPrefix}/assets/icons/icon_threads.svg"
                  alt=""
                  aria-hidden="true"
                  class="h-5 w-5"
                />
              </a>
            </div>
          </div>

          <!-- Kolom 3: Kontak -->
          <div>
            <h3 class="text-base font-bold text-white">Kontak</h3>
            <ul class="mt-4 space-y-4 text-sm text-gray-400">
              <li class="flex items-start gap-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-gray-300"
                >
                  <img
                    src="${assetPrefix}/assets/icons/icon_lokasi-putih.svg"
                    alt=""
                    aria-hidden="true"
                    class="h-5 w-5"
                  />
                </div>
                <span class="min-w-0 break-words pt-2"
                  >Jl. KH. Samanhudi No. 29, Bugul Kidul, Kota Pasuruan</span
                >
              </li>
              <li class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-gray-300"
                >
                  <img
                    src="${assetPrefix}/assets/icons/icon_kontak.svg"
                    alt=""
                    aria-hidden="true"
                    class="h-5 w-5"
                  />
                </div>
                <span class="min-w-0 break-words">0851-6161-8669</span>
              </li>
              <li class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-800 text-gray-300"
                >
                  <img
                    src="${assetPrefix}/assets/icons/icon_email.svg"
                    alt=""
                    aria-hidden="true"
                    class="h-5 w-5"
                  />
                </div>
                <span class="min-w-0 break-words"
                  >pasuruaninfo93@gmail.com</span
                >
              </li>
            </ul>
          </div>
        </div>

      
        <!-- Garis Pemisah & Bottom Section (Kiri & Kanan Eksplisit) -->
        <div class="mt-12 border-t border-gray-800/80 pt-8">
          <div
            class="flex w-full flex-col justify-between gap-4 text-sm text-gray-400 md:flex-row md:items-center"
          >
            <p class="text-left">© 2026 Pasuruan Info. All rights reserved.</p>
            <div class="flex items-center gap-6 md:justify-end">
              <a href="#" class="py-0.5 transition-colors hover:text-white"
                >Kebijakan Privasi</a
              >
              <a href="#" class="py-0.5 transition-colors hover:text-white"
                >Syarat & Ketentuan</a
              >
              <a href="#" class="py-0.5 transition-colors hover:text-white"
                >Redaksi</a
              >
            </div>
          </div>
        </div>
      </div>
    </footer>`;
  }
  window.PasinfoLayout = window.PasinfoLayout || {};
  window.PasinfoLayout.renderFooter = renderFooter;
})();
