window.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("currentUserId")) {
        // Already logged in - go to search
        window.location.replace("search.html");
    }
});

function validateLogin() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    // Check if username exsits in system
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const user = users.find(u => u.username === username);
    if (!user) {
        alert("Username not found. Please register first.");
        return false;
    }

    // Check if password is correct
    if (user.password !== password) {
        alert("Incorrect password.");
        return false;
    }

    // If all succesful - save user id in sessionStorage (lasts while the browser tab is open)
    sessionStorage.setItem("currentUserId", user.id);

    window.location.replace("search.html");   // redirect to search page and remove login from history (so can't click back)
    return false;   // No need for the form submition process - handled it without
}