/**
 * HOMEPAGE SYNC — Sinkronisasi data mock ke halaman
 * =================================================
 * 
 * File ini mengambil data dari MOCK_HOME dan me-render
 * berita ke halaman dengan tanggal, waktu, kategori, dan sumber
 * dari mock-data.js.
 * 
 * Dipanggil setelah DOM siap dan mock-data.js sudah di-load.
 */

(function () {
  'use strict';

  /* Ikon metadata (kalender / waktu / sumber) dipakai seragam agar
     tanggal, waktu, dan sumber selalu sejajar dalam satu baris.
     Ikon sumber memakai aset resmi `icon_sumber.svg` (bukan Font
     Awesome yang tidak ikut ter-load di halaman). */
  function metaIcon(file) {
    return (
      '<img class="metadata-icon" src="./public/assets/icons/' +
      file +
      '" alt="" aria-hidden="true" />'
    );
  }

  /* Isi metadata: tanggal · waktu · sumber (tanpa wrapper). */
  function metaItems(dateLabel, timeLabel, sourceName) {
    return (
      '<span class="metadata-item">' +
      metaIcon('icon_kalender.svg') +
      '<span>' + dateLabel + '</span></span>' +
      '<span class="metadata-separator" aria-hidden="true">•</span>' +
      '<span class="metadata-item">' +
      metaIcon('icon_waktu.svg') +
      '<span>' + timeLabel + '</span></span>' +
      '<span class="metadata-separator" aria-hidden="true">•</span>' +
      '<span class="metadata-item">' +
      metaIcon('icon_sumber.svg') +
      '<span class="font-semibold text-gray-600">' + sourceName + '</span></span>'
    );
  }

  function metaMarkup(dateLabel, timeLabel, sourceName, extraClass) {
    var cls = 'metadata-wrapper' + (extraClass ? ' ' + extraClass : '');
    return '<span class="' + cls + '">' +
      metaItems(dateLabel, timeLabel, sourceName) + '</span>';
  }

  /**
   * Update Hero Section (Featured, Secondary, Latest)
   */
  function syncHero() {
    if (typeof MOCK_HOME === 'undefined' || !MOCK_HOME.hero) return;

    const hero = MOCK_HOME.hero;

    // ════════════════════════════════════════════════════
    // FEATURED (Tengah - Kolom 2)
    // ════════════════════════════════════════════════════
    if (hero.featured) {
      const featured = hero.featured;
      const heroCol2 = document.querySelector('article[class*="lg:col-span-6"][class*="hague-divider-l"]');
      if (heroCol2) {
        // Update badge
        const badgeEl = heroCol2.querySelector('.hague-badge');
        if (badgeEl) {
          badgeEl.textContent = featured.categories?.[0]?.name || 'UTAMA';
        }

        // Update judul
        const titleEl = heroCol2.querySelector('h2');
        if (titleEl) titleEl.textContent = featured.title;

        // Update deskripsi
        const descEl = heroCol2.querySelector('p.line-clamp-3');
        if (descEl) descEl.textContent = featured.description;

        // Update metadata (tanggal, waktu, & sumber) - SEJAJAR HORIZONTAL
        const metaEl = heroCol2.querySelector('p.text-xs.text-gray-400');
        if (metaEl) {
          const sourceName = featured.source?.name || 'Pasuruan.com';
          metaEl.innerHTML = metaMarkup(
            featured.published_label,
            featured.time_label,
            sourceName
          );
        }
      }
    }

    // ════════════════════════════════════════════════════
    // SECONDARY (Kiri - Kolom 1, 2 cards)
    // ════════════════════════════════════════════════════
    if (hero.secondary && hero.secondary.length >= 2) {
      const articles = document.querySelectorAll('[class*="lg:col-span-3"][class*="lg:pr-6"] article');
      
      // First secondary card
      if (articles[0] && hero.secondary[0]) {
        const sec1 = hero.secondary[0];
        const badge = articles[0].querySelector('.hague-badge');
        const title = articles[0].querySelector('h3');
        const meta = articles[0].querySelector('p.mt-1\\.5.text-xs');
        
        if (badge) badge.textContent = sec1.categories?.[0]?.name || 'LOKAL';
        if (title) title.textContent = sec1.title;
        if (meta) {
          meta.innerHTML = metaMarkup(
            sec1.published_label,
            sec1.time_label,
            sec1.source?.name || 'Pasuruan.com'
          );
        }
      }

      // Second secondary card
      if (articles[1] && hero.secondary[1]) {
        const sec2 = hero.secondary[1];
        const badges = articles[1].querySelectorAll('.hague-badge');
        const title = articles[1].querySelector('h3');
        const meta = articles[1].querySelector('p.mt-1\\.5.text-xs');
        
        if (badges.length >= 2) {
          badges[0].textContent = sec2.categories?.[0]?.name || 'LOKAL';
          if (sec2.categories?.[1]) {
            badges[1].textContent = sec2.categories[1].name;
          }
        }
        if (title) title.textContent = sec2.title;
        if (meta) {
          meta.innerHTML = metaMarkup(
            sec2.published_label,
            sec2.time_label,
            sec2.source?.name || 'Pasuruan.com'
          );
        }
      }
    }

    // ════════════════════════════════════════════════════
    // LATEST NEWS (Kanan - Kolom 3, 8 items sidebar)
    // ════════════════════════════════════════════════════
    if (hero.latest && hero.latest.length > 0) {
      const latestItems = document.querySelectorAll('[aria-labelledby="latest-heading"] ul li');
      
      hero.latest.forEach((news, idx) => {
        if (latestItems[idx]) {
          const link = latestItems[idx].querySelector('a');
          if (!link) return;

          const title = link.querySelector('h3');
          const meta = link.querySelector('p.mt-1');
          
          if (title) title.textContent = news.title;
          if (meta) {
            meta.innerHTML = metaMarkup(
              news.published_label,
              news.time_label,
              news.source?.name || 'Pasuruan.com',
              'metadata-sm'
            );
          }
        }
      });
    }
  }

  /**
   * Update Berita Pilihan Section (4 card grid)
   */
  function syncPilihan() {
    if (typeof MOCK_HOME === 'undefined' || !MOCK_HOME.pilihan) return;

    const pilihan = MOCK_HOME.pilihan;
    
    // Cari cards di Berita Pilihan section
    const section = document.querySelector('[aria-labelledby="pilihan-heading"]');
    if (!section) return;
    
    const cards = section.querySelectorAll('article');

    pilihan.forEach((news, idx) => {
      const card = cards[idx];
      if (!card) return;

      const badge = card.querySelector('span[class*="bg-brand"]');
      const title = card.querySelector('h3');
      const excerpt = card.querySelector('p.text-sm.text-gray-500');
      const timeEl = card.querySelector('time');

      if (badge) badge.textContent = news.categories?.[0]?.name || 'LOKAL';
      if (title) title.textContent = news.title;
      if (excerpt) excerpt.textContent = news.description || '';
      
      // Update tanggal, waktu, dan sumber - SEJAJAR HORIZONTAL
      if (timeEl) {
        const metaParent = timeEl.closest('p');
        if (metaParent) {
          metaParent.innerHTML = metaMarkup(
            news.published_label,
            news.time_label,
            news.source?.name || 'Pasuruan.com'
          );
        }
      }
    });
  }

  /**
   * Update Category Groups (Lokal, Nasional, Internasional carousel)
   */
  function syncKategoriGroups() {
    if (typeof MOCK_HOME === 'undefined' || !MOCK_HOME.kategori_groups) return;

    const groups = MOCK_HOME.kategori_groups;
    const sections = document.querySelectorAll('[data-category-slider] section');

    groups.forEach((group, groupIdx) => {
      const section = sections[groupIdx];
      if (!section) return;

      // Update category header
      const categoryHeading = section.querySelector('h3');
      if (categoryHeading) {
        categoryHeading.innerHTML = `
          <svg class="h-4 w-4 text-brand" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          </svg>
          ${group.category.name}
        `;
      }

      // Update items (3 per category)
      const items = section.querySelectorAll('ul li');
      group.items.forEach((news, idx) => {
        if (items[idx]) {
          const link = items[idx].querySelector('a');
          if (!link) return;

          const title = link.querySelector('h4');
          // Wrapper metadata adalah <div class="metadata-wrapper"> (bukan <p>).
          const meta = link.querySelector('.metadata-wrapper');

          if (title) title.textContent = news.title;
          if (meta) {
            meta.classList.add('metadata-sm');
            meta.innerHTML = metaItems(
              news.published_label,
              news.time_label,
              news.source?.name || 'Pasuruan.com'
            );
          }
        }
      });
    });
  }

  /**
   * Main initialization
   */
  function init() {
    // Tunggu DOM siap
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
          syncHero();
          syncPilihan();
          syncKategoriGroups();
        }, 100);
      });
    } else {
      setTimeout(() => {
        syncHero();
        syncPilihan();
        syncKategoriGroups();
      }, 100);
    }
  }

  init();
})();
