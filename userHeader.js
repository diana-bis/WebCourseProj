function loadUserHeader() {
  const header = document.getElementById("header");
  if (!header) return; // if page has no header element, do nothing

  const currentUserId = sessionStorage.getItem("currentUserId");

  if (!currentUserId) {
    // If user is not logged in — redirect to login page
    window.location.href = "login.html";
    return;
  }

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const user = users.find(u => u.id === Number(currentUserId));

  if (!user) {
    // Corrupted session - force logout
    sessionStorage.removeItem("currentUserId");
    window.location.href = "login.html";
    return;
  }

  header.innerHTML = `
    <nav class="navbar navbar-light bg-white shadow-sm px-4">
      <div class="container-fluid justify-content-end gap-3">
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
        <button id="logoutBtn" class="btn btn-outline-danger btn-sm">
          Logout
        </button>
      </div>
    </nav>
  `;

  // Add logout functionality
  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("currentUserId");
    window.location.href = "login.html";
  });
}

// Run automatically when the page finishes loading
window.addEventListener("DOMContentLoaded", loadUserHeader);
