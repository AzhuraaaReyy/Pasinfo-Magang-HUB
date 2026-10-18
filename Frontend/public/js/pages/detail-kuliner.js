/**
 * detail-kuliner.js — dipindah VERBATIM dari inline <script> detail_kuliner.html
 * (refactor A+B 2026-10-09, Owner approved). Isi tidak diubah;
 * timing eksekusi identik (script eksternal tanpa defer di posisi sama).
 */
      // Detail kuliner: render by-slug dari window.PASINFO_KULINER.culinaries.
      // Tanpa slug / slug tak valid → item featured pertama (fallback: item pertama).
      // Null-safe: media/place null → placeholder. Tanpa kata terlarang di UI.
      (function () {
        "use strict";
        function $(id) {
          return document.getElementById(id);
        }
        function setText(id, text) {
          var el = $(id);
          if (el) el.textContent = text;
        }
        function showToast(msg) {
          var t = $("toast");
          if (!t) {
            try { window.alert(msg); } catch (e) {}
            return;
          }
          t.textContent = msg;
          t.classList.remove("hidden");
          try {
            if (t._timer) clearTimeout(t._timer);
            t._timer = setTimeout(function () { t.classList.add("hidden"); }, 2200);
          } catch (e) {}
        }
        function setHTML(id, html) {
          var el = $(id);
          if (el) el.innerHTML = html;
        }
        /* Foto hero: elemen <img> sudah ada di HTML (Owner 2026-10-16: paritas
           detail_acara.html). Tanpa placeholder teks & tanpa transisi fade —
           langsung menyetel .src sehingga tidak ada "berkedip" mock/skeleton
           dan gambar mulai diunduh lebih awal (fetchpriority=high). */
        function setHeroPhoto(el, url, name) {
          if (!el || !url) return;
          var img = el.querySelector("img");
          if (!img) return;
          img.src = url;
          img.alt = "Foto " + name;
          el.setAttribute("aria-label", "Foto " + name);
        }
        var userLocation = null;
        var userLocationName = "-";
        function getUserLocation(callback) {
          if (!navigator.geolocation) { callback(null); return; }
          navigator.geolocation.getCurrentPosition(
            function (pos) { callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
            function () { callback(null); },
            { timeout: 5000, maximumAge: 0 }
          );
        }
        function haversineDistance(lat1, lng1, lat2, lng2) {
          var R = 6371;
          var dLat = (lat2 - lat1) * Math.PI / 180;
          var dLng = (lng2 - lng1) * Math.PI / 180;
          var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
          var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        }
        function formatDistance(km) {
          if (!km && km !== 0) return "-";
          return "±" + km.toFixed(1) + " km";
        }
        function translateLatLngToRegion(lat, lng) {
          var regions = DATA.regions || [];
          var closestRegion = null;
          var minDist = Infinity;
          for (var i = 0; i < regions.length; i++) {
            var r = regions[i];
            if (r.center && r.center.latitude && r.center.longitude) {
              var dist = haversineDistance(lat, lng, r.center.latitude, r.center.longitude);
              if (dist < minDist) { minDist = dist; closestRegion = r; }
            }
          }
          return closestRegion ? closestRegion.name : "Pasuruan";
        }
        function formatEstimasi(km, transportType) {
          if (!km && km !== 0) return "-";
          var speedKmH = transportType === "motor" ? 40 : 30;
          var totalMenit = Math.ceil(km / speedKmH * 60);
          var jam = Math.floor(totalMenit / 60);
          var menit = totalMenit % 60;
          var iconPath = transportType === "motor"
            ? "../../public/assets/icons/icon_motor.svg"
            : "../../public/assets/icons/icon_mobil.svg";
          var label = transportType === "motor" ? "motor" : "mobil";
          return '<img src="' + iconPath + '" alt="" class="w-4 h-4 inline mr-1" />' + label + ': ' + (jam > 0 ? jam + ' jam ' : '') + menit + ' menit';
        }

          var DATA = (typeof window !== "undefined" && window.PASINFO_KULINER) || null;
          if (!DATA || !Array.isArray(DATA.culinaries) || !DATA.culinaries.length) return;

          // Enrich data dengan sources & verification
          if (window.AddSourcesData && window.AddSourcesData.enrichKuliner) {
            window.AddSourcesData.enrichKuliner(DATA);
          }

          // FOTO SEMENTARA (Owner 2026-10-14): gambar contoh domain, dipakai
          // bergilir bila media.url null. Ganti foto asli menyusul.
          // Owner 2026-10-15: hero/galeri → versi WebP penuh (1600px).
          var KULINER_FALLBACK_PHOTOS = [
            "../../public/assets/images/kuliner/optimized/Lontong Kupang Kraton.webp",
            "../../public/assets/images/kuliner/optimized/Nasi Punel.webp",
            "../../public/assets/images/kuliner/optimized/soto-pasuruan.webp"
          ];
          function kulinerPhotoFor(d) {
            if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
            return KULINER_FALLBACK_PHOTOS[photoHash(d) % KULINER_FALLBACK_PHOTOS.length];
          }
          // Owner 2026-10-16: kartu kecil (menu & rekomendasi) → versi thumbnail.
          var KULINER_THUMB_PHOTOS = [
            "../../public/assets/images/kuliner/optimized/Lontong Kupang Kraton.thumb.webp",
            "../../public/assets/images/kuliner/optimized/Nasi Punel.thumb.webp",
            "../../public/assets/images/kuliner/optimized/soto-pasuruan.thumb.webp"
          ];
          function photoHash(d) {
            var key = d && d.id != null ? String(d.id) : "";
            var sum = 0;
            for (var i = 0; i < key.length; i++) sum += key.charCodeAt(i);
            return sum;
          }
          function kulinerThumbFor(d) {
            if (d && d.media && d.media[0] && d.media[0].url) return d.media[0].url;
            return KULINER_THUMB_PHOTOS[photoHash(d) % KULINER_THUMB_PHOTOS.length];
          }
          // Kartu kecil (sekitar/wisata) → utamakan thumbnail_url (WebP kecil),
          // mirror wisata-listing.js; else url / aset lokal deterministik.
          function wisataPhotoFor(d) {
            if (d && d.media && d.media[0]) {
              if (d.media[0].thumbnail_url) return d.media[0].thumbnail_url;
              if (d.media[0].url) return d.media[0].url;
            }
            try {
              var api = window.PasinfoWisata || (window.PASINFO_WISATA && window.PASINFO_WISATA.api);
              if (api && typeof api.photoFor === "function") return api.photoFor(d);
            } catch (e) {}
            return null;
          }
          function sekitarPhotoFor(d) {
            if (d && d._href && d._href.indexOf("detail_wisata") !== -1) return wisataPhotoFor(d);
            return kulinerThumbFor(d);
          }
          // operational_status di data-kuliner.js kini objek {status,label};
          // helper ini tetap menerima string lama agar aman.
          function opStatus(os) {
            if (os && typeof os === "object") {
              return { code: String(os.status || "unknown"), label: os.label || "Status belum tersedia" };
            }
            var s = typeof os === "string" ? os.toLowerCase() : "";
            if (s === "buka") return { code: "open", label: "Buka" };
            if (s === "tutup") return { code: "closed", label: "Tutup" };
            return { code: "unknown", label: "Status belum tersedia" };
          }

          function catName(id) {
            var list = DATA.categories || [];
            for (var i = 0; i < list.length; i++) {
              if (list[i].id === id) return list[i].name;
            }
            return "";
          }
        function slugParam() {
          try {
            return new URLSearchParams(window.location.search).get("slug");
          } catch (e) {
            return null;
          }
        }
        var slug = slugParam();
        var item = null;
        for (var i = 0; i < DATA.culinaries.length; i++) {
          if (DATA.culinaries[i].slug === slug) { item = DATA.culinaries[i]; break; }
        }
        if (!item) {
          for (var f = 0; f < DATA.culinaries.length; f++) {
            if (DATA.culinaries[f].featured) { item = DATA.culinaries[f]; break; }
          }
        }
        if (!item) item = DATA.culinaries[0];
        if (!item) return;

        var category = catName(item.categoryId) || "Tradisional";
        var rating = item.rating || "4.7";

        getUserLocation(function (loc) {
          if (loc) {
            userLocation = loc;
            userLocationName = translateLatLngToRegion(loc.lat, loc.lng);
            if (item.place && typeof item.place.latitude === "number" && typeof item.place.longitude === "number") {
              var distKm = haversineDistance(loc.lat, loc.lng, item.place.latitude, item.place.longitude);
              setText("route-dari", userLocationName);
              setText("route-jarak", formatDistance(distKm));
              setHTML("route-estimasi", formatEstimasi(distKm, "mobil") + " | " + formatEstimasi(distKm, "motor"));
            }
          } else {
            setText("route-dari", "Izinkan lokasi untuk melihat rute");
          }
        });

        document.title = item.name + " - Pasuruan Info";
        setText("crumb-name", item.name);
        setText("hero-cat", "Kuliner " + category);
        setText("detail-title", item.name);
          setText("detail-location", item.address || "Pasuruan, Jawa Timur");
          var ratingText = String(rating);
          if (item.reviews_label) ratingText += " (" + item.reviews_label + ")";
          setText("hero-rating-text", ratingText);
          setText("detail-desc", item.short_description || "Deskripsi kuliner segera hadir.");
          // Tentang Kuliner: description multi-paragraf (data-kuliner.js) → 3 <p>.
          var tentangEl = $("tentang-desc");
          if (tentangEl) {
            var tentangParas = String(item.description || "")
              .split(/\n{2,}/)
              .map(function (s) { return s.trim(); })
              .filter(Boolean);
            tentangEl.innerHTML = tentangParas.length
              ? tentangParas.map(function (p) { return "<p>" + p + "</p>"; }).join("")
              : "<p>Deskripsi kuliner segera hadir.</p>";
          }
          // Deskripsi galeri dari data-kuliner.js (gallery_description, multi-paragraf).
          var galeriDescEl = $("galeri-desc");
          if (galeriDescEl) {
            var gdParas = String(item.gallery_description || "")
              .split(/\n{2,}/)
              .map(function (s) { return s.trim(); })
              .filter(Boolean);
            galeriDescEl.innerHTML = gdParas.length
              ? gdParas.map(function (p) { return "<p>" + p + "</p>"; }).join("")
              : "<p>Galeri foto kuliner ini.</p>";
          }
          setText("info-kategori", category);
          setText("info-harga", item.price_range || "-");
          
          // Opening hours dengan status real-time
          if (item.opening_hours && window.OpeningHoursUtil) {
            var hoursDisplay = window.OpeningHoursUtil.getDisplay(item.opening_hours);
            setText("info-jam", hoursDisplay.display);
            var statusEl = $("info-jam-status");
            if (statusEl) {
              statusEl.textContent = hoursDisplay.indicator + " " + hoursDisplay.status;
              if (hoursDisplay.isOpen === true) {
                statusEl.className = "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700";
              } else if (hoursDisplay.isOpen === false) {
                statusEl.className = "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700";
              } else {
                statusEl.className = "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700";
              }
            }
          } else {
            setText("info-jam", item.opening_hours || "-");
          }

          // Fasilitas (array string di data-kuliner.js; "-" bila kosong).
          var fasilitasEl = $("info-fasilitas");
          if (fasilitasEl) {
            var facs = Array.isArray(item.facilities) ? item.facilities : [];
            fasilitasEl.innerHTML = facs.length
              ? '<span class="flex flex-wrap gap-2 justify-end">' + facs.map(function (f) {
                  return '<span class="px-2.5 py-1.5 bg-gray-100 rounded text-sm font-semibold text-gray-700">' + f + "</span>";
                }).join("") + "</span>"
              : "-";
          }

          setText("route-lokasi", item.address || "-");
          setText("lokasi-desc", item.name + " berlokasi di " + (item.address || "alamat belum tersedia") + ". Gunakan peta di bawah untuk melihat lokasi tepatnya, atau klik 'Dapatkan Arah & Rute' untuk navigasi ke Google Maps.");
        var statusEl = $("info-status");
        if (statusEl) {
          var os = opStatus(item.operational_status);
          statusEl.textContent = os.label;
          statusEl.className = "inline-block px-2.5 py-0.5 rounded text-white text-[10px] font-bold " +
            (os.code === "open" ? "bg-green-500" : os.code === "closing_soon" ? "bg-amber-500" : "bg-gray-400");
        }
        // Display Source & Verification Info (pola detail_wisata, Tier 1.7)
        (function () {
          var sourceEl = $("source-info");
          var verificationEl = $("verification-info");

          if (sourceEl && item.sources && item.sources.length > 0) {
            var source = item.sources[0];
            var html = '<div class="text-sm">';
            html += '<p class="font-semibold text-gray-900">' + (source.name || "Sumber Tidak Diketahui") + '</p>';
            if (source.url) {
              html += '<p class="text-xs text-blue-600 mt-1"><a href="' + source.url + '" target="_blank" rel="noopener">Kunjungi sumber →</a></p>';
            }
            html += '</div>';
            sourceEl.innerHTML = html;
          } else if (sourceEl) {
            sourceEl.innerHTML = '<p class="text-xs text-gray-600">Informasi sumber belum tersedia</p>';
          }

          if (verificationEl && item.verification) {
            var status = item.verification.status || "unknown";
            var statusLabel = status === "verified" ? "Terverifikasi" : status === "pending" ? "Menunggu Verifikasi" : "Status Tidak Diketahui";
            var html = '<div class="text-sm">';
            html += '<div class="flex items-center gap-2 mb-2">';
            html += '<span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ' + (status === "verified" ? "bg-green-100 text-green-700" : status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-200 text-gray-700") + '">' + statusLabel + '</span>';
            html += '</div>';
            if (item.verification.verified_at) {
              var verifiedDate = new Date(item.verification.verified_at);
              var dateStr = verifiedDate.toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });
              html += '<p class="text-xs text-gray-600">Diverifikasi pada ' + dateStr + '</p>';
            }
            html += '</div>';
            verificationEl.innerHTML = html;
          } else if (verificationEl) {
            verificationEl.innerHTML = '<p class="text-xs text-gray-600">Status verifikasi belum tersedia</p>';
          }
        })();

        // Foto: pakai media.url bila ada; bila tidak pakai gambar contoh domain.
        try {
          var photoUrl = kulinerPhotoFor(item);
          if (photoUrl) {
            var heroMedia = $("hero-media");
            if (heroMedia) setHeroPhoto(heroMedia, photoUrl, item.name);
          }
        } catch (e) {}

        // Dummy non-fungsional: toast "segera hadir", tanpa backend.
        ["btn-simpan", "btn-bagikan"].forEach(function (id) {
          var b = $(id);
          if (b) b.addEventListener("click", function () { showToast("Fitur ini segera hadir."); });
        });
        // Thumb "Lihat semua foto" kini <a href="galeri_kuliner.html"> (item 5b)
        // sehingga binding toast-nya dihapus.

        // Tab navigasi antar-halaman (Owner 2026-10-16): Informasi Utama /
        // Menu & Harga / Ulasan = halaman terpisah. Tab aktif (Informasi
        // Utama) sudah statis di markup; di sini hanya menambahkan slug yang
        // sama ke tiap tautan agar konteks kuliner tidak hilang.
        (function initTabs() {
          if (!item || !item.slug) return;
          var tabTargets = {
            "tab-utama": "detail_kuliner.html",
            "tab-menu": "menu_kuliner.html",
            "tab-ulasan": "ulasan.html",
          };
          Object.keys(tabTargets).forEach(function (id) {
            var el = $(id);
            if (el) el.setAttribute("href", tabTargets[id] + "?slug=" + item.slug);
          });
        })();

        // Galeri: Owner 2026-10-17 (instruksi 1) — tanpa panah prev/next dan
        // tanpa ganti foto lokal di card. Foto utama + thumbs hanya dipaint
        // sekali; semua foto = <a> menuju galeri_kuliner.html (klik foto =
        // navigasi galeri, keputusan Owner). Thumb "Lihat semua foto" sudah
        // <a> di markup.
        var GALERI_LABELS = ["Foto 1", "Foto 2", "Foto 3"];
        function galeriPhoto(i) {
          var n = KULINER_FALLBACK_PHOTOS.length;
          return KULINER_FALLBACK_PHOTOS[((i % n) + n) % n];
        }
        function paintGaleri() {
          var main = $("galeri-main");
          if (main) {
            main.innerHTML = '<a href="galeri_kuliner.html" class="block w-full h-full"><img src="' + galeriPhoto(0) + '" alt="Foto galeri ' + item.name + '" class="w-full h-full object-cover" /></a>';
            main.setAttribute("aria-label", GALERI_LABELS[0] + ": " + item.name);
          }
          var thumbs = document.querySelectorAll("#galeri-thumbs .thumb-btn");
          for (var k = 0; k < thumbs.length; k++) {
            if (k < KULINER_FALLBACK_PHOTOS.length) {
              thumbs[k].style.backgroundImage = 'url("' + galeriPhoto(k) + '")';
              thumbs[k].style.backgroundSize = "cover";
              thumbs[k].style.backgroundPosition = "center";
              thumbs[k].textContent = "";
            }
          }
        }
        paintGaleri();

        // Menu: sumber utama window.PASINFO_KULINER_MENUS[slug] (15 item/tempat,
        // data-kuliner-menus.js, MOCK). Fallback: item.menus lalu dummy inline.
        // _placeholder: tampilan sementara, bukan data terverifikasi; tanpa kata terlarang di UI.
        var _placeholderMenus = [
          { name: "Rawon Kucing", price: "Rp 15.000", rating: "4.6" },
          { name: "Rawon Tetelan", price: "Rp 15.000", rating: "4.6" },
          { name: "Rawon Bihun", price: "Rp 15.000", rating: "4.6" },
          { name: "Nasi Campur", price: "Rp 15.000", rating: "4.6" }
        ];
        var validMenus = [];
        try {
          var pool = (window.PASINFO_KULINER_MENUS && window.PASINFO_KULINER_MENUS[item.slug]) || null;
          var raw = Array.isArray(pool) ? pool : (Array.isArray(item.menus) ? item.menus : []);
          for (var m = 0; m < raw.length; m++) {
            var nm = raw[m] && raw[m].name ? String(raw[m].name) : "";
            var pr = raw[m] && (raw[m].price_label || raw[m].price) ? String(raw[m].price_label || raw[m].price) : "";
            if (!nm || /mock/i.test(nm) || !pr) continue;
            validMenus.push({
              name: nm,
              price: pr,
              rating: rating,
              category: raw[m].category || "",
              image: raw[m].image || "",
              description: raw[m].description || "",
            });
          }
        } catch (e) { validMenus = []; }
        var menuList = validMenus.length ? validMenus : _placeholderMenus;
        function menuCard(menu, idx) {
          var photo = menu.image || KULINER_THUMB_PHOTOS[(idx || 0) % KULINER_THUMB_PHOTOS.length];
          // Owner 2026-10-17: kartu menu mengikuti pola badge kartu wisata
          // (keputusan Owner) — kategori biru kiri-atas, rating putih
          // kanan-atas, foto h-44, judul text-xl, deskripsi text-sm, harga
          // baris ikon text-xs.
          return (
            '<article class="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white h-full flex flex-col">' +
            '<div class="absolute top-3 left-3 right-3 flex items-center justify-between z-10">' +
            (menu.category
              ? '<span class="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-md">' + menu.category + "</span>"
              : "") +
            '<span class="inline-block px-2.5 py-1 bg-white text-gray-900 text-xs font-semibold rounded-md flex items-center gap-1">' +
            '<img src="../../public/assets/icons/icon_rating.svg" alt="" class="w-4 h-4" />' + (menu.rating || rating) +
            "</span>" +
            "</div>" +
            '<div class="relative h-44 overflow-hidden bg-gray-200"><img src="' + photo + '" alt="Foto ' + menu.name + '" loading="lazy" class="w-full h-full object-cover" /></div>' +
            '<div class="flex flex-col flex-1 p-4 bg-white">' +
            '<h3 class="font-bold text-gray-900 text-xl line-clamp-2 mb-2">' + menu.name + "</h3>" +
            (menu.description ? '<p class="text-sm text-gray-600 line-clamp-2 mb-3">' + menu.description + "</p>" : "") +
            '<div class="text-xs text-gray-600 mt-auto">' +
            '<p class="flex items-center gap-1"><img src="../../public/assets/icons/icon_harga-tiket.svg" alt="" class="w-4 h-4 flex-shrink-0" />' + menu.price + "</p>" +
            "</div>" +
            "</div>" +
            "</article>"
          );
        }
        function renderMenus() {
          var grid = $("menu-grid");
          if (!grid) return;
          grid.innerHTML = menuList.slice(0, 4).map(function (m, i) { return menuCard(m, i); }).join("");
        }
        renderMenus();
        // "Lihat Semua Menu" = tautan ke halaman Menu & Harga (tab), bukan expand
        // inline (Owner 2026-10-15). Menampilkan subset (4 kartu ringkas) di sini.
        var menuToggle = $("menu-toggle");
        if (menuToggle) menuToggle.setAttribute("href", "menu_kuliner.html?slug=" + item.slug);

        // Kartu rekomendasi / sekitar: foto kecil, nama, rating ASLI, baris info.
        // Sekitar (reco-sekitar): destinasi wisata TERDEKAT by jarak real (nearby.js),
        // link ke detail_wisata (Owner 2026-10-09). Reko (reco-kuliner): tetap kuliner.
        // Owner 2026-10-15: ★4.6 hardcode + jarak placeholder ("10km - 12 menit")
        // diganti rating & alamat/jarak asli, agar section identik dengan
        // menu_kuliner.html dan tanpa data fiktif.
        function fmtDist(d) {
          if (d && d._distKm != null && window.PasinfoNearby) {
            return window.PasinfoNearby.fmtKm(d._distKm);
          }
          return "";
        }
        function recoCard(d, idx, photoFn) {
          // Owner 2026-10-17: kartu direstrukturisasi mengikuti kartu
          // rekomendasi detail_wisata.html (keputusan Owner) — badge kategori
          // warna kiri-atas, badge rating putih kanan-atas, foto h-44, judul
          // text-xl, deskripsi text-sm, baris info ikon text-xs.
          var isWisata = d._href && d._href.indexOf("detail_wisata") !== -1;
          var href = d._href || ("detail_kuliner.html?slug=" + d.slug);
          var photo = photoFn ? photoFn(d) : null;
          var catId = d.categoryId || d.category_id || "";
          var catName_val = "";
          if (isWisata) {
            var WC = (window.PASINFO_WISATA && window.PASINFO_WISATA.categories) || [];
            for (var w = 0; w < WC.length; w++) {
              if (WC[w].id === catId) { catName_val = WC[w].name; break; }
            }
            if (!catName_val) catName_val = "Wisata";
          } else {
            catName_val = catName(catId) || "Kuliner";
          }
          var badgeBg = isWisata ? "#dc2626" : "#2563eb";
          var rating = d.rating != null && d.rating !== "" ? d.rating : "-";
          var desc = d.short_description || "";
          var loc = d.address || "";
          var dist = fmtDist(d);
          var media = photo
            ? '<div class="relative h-44 overflow-hidden bg-gray-200"><img src="' + photo + '" alt="Foto ' + d.name + '" loading="lazy" class="w-full h-full object-cover" /></div>'
            : '<div class="relative h-44 overflow-hidden bg-gradient-to-br from-amber-800 via-stone-700 to-slate-800" role="img" aria-label="Foto ' + d.name + ' (placeholder)"></div>';
          return (
            '<a href="' + href + '" class="group block no-underline h-full">' +
            '<article class="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col bg-white">' +
            '<div class="absolute top-3 left-3 right-3 flex items-center justify-between z-10">' +
            '<span class="inline-block px-3 py-1 text-white text-xs font-bold rounded-md" style="background-color:' + badgeBg + '">' + catName_val + "</span>" +
            '<span class="inline-block px-2.5 py-1 bg-white text-gray-900 text-xs font-semibold rounded-md flex items-center gap-1">' +
            '<img src="../../public/assets/icons/icon_rating.svg" alt="" class="w-4 h-4" />' + rating +
            "</span>" +
            "</div>" +
            media +
            '<div class="flex flex-col flex-1 p-4 bg-white">' +
            '<h3 class="font-bold text-gray-900 text-xl line-clamp-2 mb-2">' + d.name + "</h3>" +
            (desc ? '<p class="text-sm text-gray-600 line-clamp-2 mb-3">' + desc + "</p>" : "") +
            '<div class="text-xs text-gray-600 mt-auto space-y-1">' +
            (loc ? '<p class="flex items-center gap-1"><img src="../../public/assets/icons/icon_lokasi-hitam.svg" alt="" class="w-4 h-4 flex-shrink-0" />' + loc + "</p>" : "") +
            (dist ? '<p class="flex items-center gap-1"><img src="../../public/assets/icons/icon_jarak.svg" alt="" class="w-4 h-4 flex-shrink-0" />' + dist + "</p>" : "") +
            "</div>" +
            "</div>" +
            "</article>" +
            "</a>"
          );
        }
        function renderReco(id, list, photoFn) {
          var el = $(id);
          if (!el) return;
          el.innerHTML = list.slice(0, 4).map(function (d, i) { return recoCard(d, i, photoFn); }).join("");
        }
        var others = DATA.culinaries.filter(function (d) { return d.id !== item.id; });
        var sameCat = others.filter(function (d) { return d.categoryId === item.categoryId; });
        var recoList = sameCat.length >= 4 ? sameCat : others;
        renderReco("reco-kuliner", recoList, kulinerThumbFor);
        // Sekitar = destinasi wisata terdekat (jarak real). Link ke detail_wisata.
        var sekitarList = [];
        try {
          var WD = (window.PASINFO_WISATA && window.PASINFO_WISATA.destinations) || [];
          var ref = window.PasinfoNearby
            ? window.PasinfoNearby.refPoint(item, DATA.regions)
            : null;
          sekitarList = window.PasinfoNearby
            ? window.PasinfoNearby.nearest(ref, WD, 4)
            : [];
          sekitarList.forEach(function (d) {
            d._href = "detail_wisata.html?slug=" + d.slug;
          });
        } catch (e) {}
        if (!sekitarList.length) {
          var sameRegion = others.filter(function (d) { return d.regionId && item.regionId && d.regionId === item.regionId; });
          sekitarList = sameRegion.length >= 4 ? sameRegion : others;
        }
        renderReco("reco-sekitar", sekitarList, sekitarPhotoFor);
        try {
          var regName = "";
          var regs = DATA.regions || [];
          for (var r = 0; r < regs.length; r++) {
            if (regs[r].id === item.regionId) { regName = regs[r].name; break; }
          }
          if (regName)         setText("sekitar-title", "Jelajah Destinasi Sekitar" + (regName ? " " + regName : ""));
        } catch (e) {}

        function initFullIndonesiaMap() {
          var box = $("lokasi-map");
          if (!box) return false;
          var destLat = item.place && typeof item.place.latitude === "number" ? item.place.latitude : null;
          var destLng = item.place && typeof item.place.longitude === "number" ? item.place.longitude : null;
          if (destLat === null || destLng === null) {
            console.warn("[detail-kuliner] Koordinat kuliner tidak valid");
            return false;
          }
          try {
            if (window.L) return initLeafletMap(box, destLat, destLng);
            return initCanvasMap(box, destLat, destLng);
          } catch (e) {
            console.error("[detail-kuliner] Error saat init peta:", e);
            return false;
          }
        }
        function initLeafletMap(box, destLat, destLng) {
          try {
            var map = window.L.map(box, {
              scrollWheelZoom: false,
              zoomControl: true,
              attributionControl: false,
              dragging: true,
              touchZoom: true,
              doubleClickZoom: true,
              keyboard: false,
              preferCanvas: true,
            }).setView([destLat, destLng], 14);
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19,
              updateWhenIdle: true,
              updateWhenZooming: false,
              keepBuffer: 1,
            }).addTo(map);
            window.L.circleMarker([destLat, destLng], {
              radius: 10, color: "#ffffff", weight: 3, fillColor: "#dc2626", fillOpacity: 1,
            }).bindPopup(item.name).addTo(map);
            if (userLocation) {
              window.L.circleMarker([userLocation.lat, userLocation.lng], {
                radius: 8, color: "#ffffff", weight: 2, fillColor: "#2563eb", fillOpacity: 1,
              }).bindPopup("Lokasi Anda: " + userLocationName).addTo(map);
              window.L.polyline([[userLocation.lat, userLocation.lng], [destLat, destLng]],
                { color: '#f59e0b', weight: 2, opacity: 0.7, dashArray: '5, 5' }).addTo(map);
            }
            var fallback = $("lokasi-map-fallback");
            if (fallback) fallback.setAttribute("aria-hidden", "true");
            return true;
          } catch (e) {
            console.error("[detail-kuliner] Error saat init Leaflet map:", e);
            return false;
          }
        }
        function initCanvasMap(box, destLat, destLng) {
          try {
            var minLat = -10.5, maxLat = 5.5, minLng = 95, maxLng = 141;
            var canvasWidth = box.offsetWidth || 400;
            var canvasHeight = box.offsetHeight || 300;
            function latLngToPixel(lat, lng) {
              return {
                x: ((lng - minLng) / (maxLng - minLng)) * canvasWidth,
                y: ((maxLat - lat) / (maxLat - minLat)) * canvasHeight,
              };
            }
            var destPixel = latLngToPixel(destLat, destLng);
            var userPixel = userLocation ? latLngToPixel(userLocation.lat, userLocation.lng) : null;
            var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("width", canvasWidth);
            svg.setAttribute("height", canvasHeight);
            svg.setAttribute("viewBox", "0 0 " + canvasWidth + " " + canvasHeight);
            svg.setAttribute("class", "absolute inset-0");
            svg.style.pointerEvents = "none";
            var bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bg.setAttribute("width", canvasWidth);
            bg.setAttribute("height", canvasHeight);
            bg.setAttribute("fill", "#e5e7eb");
            svg.appendChild(bg);
            if (userPixel) {
              var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
              line.setAttribute("x1", userPixel.x); line.setAttribute("y1", userPixel.y);
              line.setAttribute("x2", destPixel.x); line.setAttribute("y2", destPixel.y);
              line.setAttribute("stroke", "#f59e0b"); line.setAttribute("stroke-width", "2");
              line.setAttribute("stroke-dasharray", "5,5"); line.setAttribute("opacity", "0.8");
              svg.appendChild(line);
            }
            var destMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            destMarker.setAttribute("cx", destPixel.x); destMarker.setAttribute("cy", destPixel.y);
            destMarker.setAttribute("r", "10"); destMarker.setAttribute("fill", "#dc2626");
            destMarker.setAttribute("stroke", "#ffffff"); destMarker.setAttribute("stroke-width", "3");
            svg.appendChild(destMarker);
            var destLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            destLabel.setAttribute("x", destPixel.x); destLabel.setAttribute("y", destPixel.y - 15);
            destLabel.setAttribute("text-anchor", "middle"); destLabel.setAttribute("fill", "#dc2626");
            destLabel.setAttribute("font-size", "12"); destLabel.setAttribute("font-weight", "bold");
            destLabel.textContent = "Kuliner";
            svg.appendChild(destLabel);
            if (userPixel) {
              var userMarker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              userMarker.setAttribute("cx", userPixel.x); userMarker.setAttribute("cy", userPixel.y);
              userMarker.setAttribute("r", "8"); userMarker.setAttribute("fill", "#2563eb");
              userMarker.setAttribute("stroke", "#ffffff"); userMarker.setAttribute("stroke-width", "2");
              svg.appendChild(userMarker);
              var userLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
              userLabel.setAttribute("x", userPixel.x); userLabel.setAttribute("y", userPixel.y - 15);
              userLabel.setAttribute("text-anchor", "middle"); userLabel.setAttribute("fill", "#2563eb");
              userLabel.setAttribute("font-size", "12"); userLabel.setAttribute("font-weight", "bold");
              userLabel.textContent = "Anda";
              svg.appendChild(userLabel);
            }
            box.innerHTML = "";
            box.appendChild(svg);
            var legend = document.createElement("div");
            legend.className = "absolute bottom-2 left-2 bg-white/90 rounded px-2 py-1 text-xs";
            legend.innerHTML = '<span style="display:inline-block; width:8px; height:8px; background:#dc2626; border-radius:50%; margin-right:4px;"></span>Kuliner ' +
                               '<span style="display:inline-block; width:8px; height:8px; background:#2563eb; border-radius:50%; margin-left:8px; margin-right:4px;"></span>Anda';
            box.appendChild(legend);
            var fallback = $("lokasi-map-fallback");
            if (fallback) fallback.setAttribute("aria-hidden", "true");
            return true;
          } catch (e) {
            console.error("[detail-kuliner] Error saat init Canvas SVG map:", e);
            return false;
          }
        }
        function waitForLeafletAndInitMap() {
          var attempts = 0;
          var maxAttempts = 50;
          setTimeout(function () {
            var checkInterval = setInterval(function () {
              attempts++;
              var mapBox = $("lokasi-map");
              var containerReady = mapBox && mapBox.offsetHeight > 0 && mapBox.offsetWidth > 0;
              var leafletReady = window.L && window.L.map;
              if (leafletReady && containerReady) {
                clearInterval(checkInterval);
                setTimeout(function () { initFullIndonesiaMap(); }, 60);
              } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                initFullIndonesiaMap();
              }
            }, 100);
          }, 300);
        }
        function scheduleMapInit() {
          var box = $("lokasi-map");
          if (!box) return;
          if (!("IntersectionObserver" in window)) { waitForLeafletAndInitMap(); return; }
          var started = false;
          var io = new IntersectionObserver(function (entries) {
            var visible = entries.some(function (en) { return en.isIntersecting; });
            if (!visible || started) return;
            started = true;
            io.disconnect();
            waitForLeafletAndInitMap();
          }, { rootMargin: "250px 0px", threshold: 0 });
          io.observe(box);
        }
        scheduleMapInit();

        var ruteBtn = $("ruteBtn");
        if (ruteBtn) {
          ruteBtn.addEventListener("click", function (e) {
            e.preventDefault();
            if (item.googleMapsUrl) { window.open(item.googleMapsUrl, "_blank"); return; }
            if (item.place && typeof item.place.latitude === "number" && typeof item.place.longitude === "number") {
              window.open("https://www.google.com/maps/dir/?api=1&destination=" + item.place.latitude + "," + item.place.longitude, "_blank");
            } else {
              alert("Koordinat kuliner tidak tersedia untuk membuka Google Maps.");
            }
          });
        }
      })();
    
