window.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("currentUserId")) {
        // Already logged in - go to search
        window.location.replace("search.html");
        return;
    }
    document.getElementById("registerForm").addEventListener("submit", validateForm);
});

async function validateForm(event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const firstname = document.getElementById("firstname").value.trim();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm").value;
    const image = document.getElementById("image").value.trim();

    // Password length
    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    // check if password has at least one letter, one number, one special char
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
    if (!passwordPattern.test(password)) {
        alert("Password must contain at least one letter, one number, and one special character.");
        return;
    }

    // Confirm password match
    if (password !== confirm) {
        alert("Passwords do not match!");
        return;
    }

    // Image URL check
    if (!image.startsWith("http")) {
        alert("Please enter a valid image URL (must start with http or https).");
        return;
    }

    // Send to server
    const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username,
            firstname,
            password,
            image
        })
    });

    const data = await response.json();

    if (!response.ok) {
        alert(data.error);
        return;
    }

    window.location.replace("login.html");    // Redirect to login page
}