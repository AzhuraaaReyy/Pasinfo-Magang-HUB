
      /* Transisi halus: tautan Pasinfo Jelajah ΓåÆ halaman tujuan.          Hanya menangani klik kiri biasa (modifier/middle-click tetap          membuka tab seperti biasa). */ (function () {
        function bind() {
          if (!window.PasInfoPageTransition) return;
          var links = document.querySelectorAll("[data-page-transition]");
          Array.prototype.forEach.call(links, function (a) {
            a.addEventListener("click", function (e) {
              if (e.defaultPrevented || e.button !== 0) return;
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              var href = a.getAttribute("href");
              if (!href || href.charAt(0) === "#") return;
              e.preventDefault();
              window.PasInfoPageTransition.go(href);
            });
          });
        }
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", bind);
        } else {
          bind();
        }
      })();
    