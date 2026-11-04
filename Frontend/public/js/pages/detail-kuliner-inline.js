
      (function () {
        try {
          var slug = new URLSearchParams(location.search).get("slug");
          if (!slug) return;
          var F = [
            "../../public/assets/images/kuliner/optimized/soto-pasuruan.webp",
            "../../public/assets/images/kuliner/optimized/Lontong Kupang Kraton.webp",
            "../../public/assets/images/kuliner/optimized/Nasi Punel.webp",
            "../../public/assets/images/kuliner/optimized/Nasi Punel.webp"
          ];
          var h = 0;
          for (var i = 0; i < slug.length; i++) h = (h + slug.charCodeAt(i)) % F.length;
          var link = document.createElement("link");
          link.rel = "preload";
          link.as = "image";
          link.fetchPriority = "high";
          link.href = F[h];
          document.head.appendChild(link);
        } catch (e) {}
      })();
    