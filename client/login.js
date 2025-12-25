window.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("currentUserId")) {
        // Already logged in - go to search
        window.location.replace("search.html");
        return;
    }
    document.getElementById("loginForm").addEventListener("submit", validateLogin);
});

async function validateLogin(event) {
    event.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    // If all succesful - save user id in sessionStorage (lasts while the browser tab is open)
    sessionStorage.setItem("currentUserId", data.userId);

    window.location.replace("search.html");   // redirect to search page and remove login from history (so can't click back)
}