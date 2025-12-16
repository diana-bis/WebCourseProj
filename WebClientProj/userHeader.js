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
    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 20px; padding: 10px;">
      <img src="${user.image}" alt="Profile" width="40" height="40" style="border-radius: 50%;">
      <span>Welcome ${user.firstname}!</span>
      <button id="logoutBtn">Logout</button>
    </div>
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
