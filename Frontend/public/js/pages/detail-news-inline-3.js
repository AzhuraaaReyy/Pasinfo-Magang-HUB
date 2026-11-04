
      function openLoginModal() {
        const modal = document.getElementById("login-modal");
        modal.classList.remove("opacity-0", "pointer-events-none");
        modal.classList.add("opacity-100");
        modal.firstElementChild.classList.remove("scale-95");
        modal.firstElementChild.classList.add("scale-100");
      }

      function closeLoginModal() {
        const modal = document.getElementById("login-modal");
        modal.firstElementChild.classList.remove("scale-100");
        modal.firstElementChild.classList.add("scale-95");
        modal.classList.remove("opacity-100");
        modal.classList.add("opacity-0", "pointer-events-none");
      }

      function handleCommentSubmit(event) {
        event.preventDefault();
        const commentVal = document
          .getElementById("comment-input")
          .value.trim();
        if (!commentVal) {
          showToast("Silakan tuliskan komentar Anda terlebih dahulu!");
          return;
        }
        openLoginModal();
      }

      let isFollowingAuthor = false;
      function toggleFollowAuthor() {
        const followBtn = document.getElementById("follow-author-btn");
        const followIcon = document.getElementById("follow-icon");
        const followText = document.getElementById("follow-text");
        isFollowingAuthor = !isFollowingAuthor;
        if (isFollowingAuthor) {
          followBtn.classList.remove("bg-slate-900", "hover:bg-blue-600");
          followBtn.classList.add("bg-blue-600", "hover:bg-blue-700");
          followIcon.className = "fas fa-check text-[10px]";
          followText.innerText = "Mengikuti";
          showToast("Anda sekarang mengikuti penulis ini");
        } else {
          followBtn.classList.remove("bg-blue-600", "hover:bg-blue-700");
          followBtn.classList.add("bg-slate-900", "hover:bg-blue-600");
          followIcon.className = "fas fa-plus text-[10px]";
          followText.innerText = "Ikuti Penulis";
          showToast("Anda berhenti mengikuti penulis ini");
        }
      }

      function showToast(message) {
        const toast = document.getElementById("toast");
        const toastMsg = document.getElementById("toast-message");
        toastMsg.innerText = message;
        toast.classList.remove("opacity-0", "pointer-events-none");
        toast.classList.add("opacity-100");
        setTimeout(() => {
          toast.classList.remove("opacity-100");
          toast.classList.add("opacity-0", "pointer-events-none");
        }, 3000);
      }

      function shareArticle(platform) {
        showToast(`Tautan telah disalin untuk dibagikan ke ${platform}!`);
      }

      let isLiked = false;
      function toggleLike() {
        const heartIcon = document.getElementById("heart-icon");
        isLiked = !isLiked;
        if (isLiked) {
          heartIcon.classList.remove("far");
          heartIcon.classList.add("fas", "text-red-500");
          showToast("Artikel ditambahkan ke favorit!");
        } else {
          heartIcon.classList.remove("fas", "text-red-500");
          heartIcon.classList.add("far");
          showToast("Artikel dihapus dari favorit.");
        }
      }
    