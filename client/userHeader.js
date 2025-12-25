async function loadUserHeader() {
  const header = document.getElementById("header");
  if (!header) return; // if page has no header element, do nothing

  const currentUserId = sessionStorage.getItem("currentUserId");
  if (!currentUserId) {
    window.location.href = "login.html";
    return;
  }

  let user;
  try {
    const res = await fetch(`/api/users/${currentUserId}`);
    if (!res.ok) throw new Error("User not found");
    user = await res.json();
  } catch (err) {
    // Corrupted session → force logout
    sessionStorage.removeItem("currentUserId");
    window.location.href = "login.html";
    return;
  }

  header.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm px-4 nav-colorful">
      <div class="container-fluid d-flex justify-content-between align-items-center">

        <div class="d-flex align-items-center gap-4">
          <span class="fw-bold student-name fs-4 me-3">MusicHub</span>
          <div class="d-flex gap-2">
            <a href="search.html" id="searchLink" class="nav-link-custom">🔍 Search</a>
            <a href="playlist.html" class="nav-link-custom">🎵 My Playlists</a>
          </div>
        </div>

        <div class="d-flex align-items-center gap-3 bg-light rounded-pill ps-2 pe-3 py-1 border">
          <img
            src="${user.image}"
            alt="Profile"
            width="35"
            height="35"
            class="rounded-circle border border-2 border-white shadow-sm"
          />
          <div class="d-none d-md-block">
            <span class="small text-muted d-block" style="font-size: 0.7rem;">Account</span>
            <span class="user-name-text small"> ${user.firstname}
            </span>
          </div>
          <button id="logoutBtn" class="btn btn-link p-0 text-danger text-decoration-none fw-bold small ms-2" style="font-size: 0.8rem;">Logout</button>
        </div>

      </div>
    </nav>
  `;

  // Preserve last search query when clicking Search in header
  const searchLink = document.getElementById("searchLink");
  const lastSearchUrl = sessionStorage.getItem("lastSearchUrl");

  if (searchLink && lastSearchUrl) {
    searchLink.href = lastSearchUrl;
  }

  // Add logout functionality
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("currentUserId");
    sessionStorage.removeItem("lastSearchUrl");
    window.location.href = "login.html";
  });
}

// Run automatically when the page finishes loading
window.addEventListener("DOMContentLoaded", loadUserHeader);
