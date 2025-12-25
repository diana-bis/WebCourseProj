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
    <nav class="navbar navbar-light bg-white shadow-sm px-4">
      <div class="container-fluid d-flex justify-content-between align-items-center">

        <!-- Left side -->
        <div class="d-flex gap-3">
          <a href="search.html" id="searchLink" class="nav-link fw-semibold">🔍 Search</a>
          <a href="playlist.html" class="nav-link fw-semibold">🎵 My Playlists</a>
        </div>

        <!-- Right side -->
        <div class="d-flex align-items-center gap-3">
          <img
            src="${user.image}"
            alt="Profile"
            width="40"
            height="40"
            class="rounded-circle"
          />
          <span class="fw-semibold">
            Welcome ${user.firstname}!
          </span>
          <button id="logoutBtn" class="btn btn-outline-danger btn-sm">Logout</button>
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
