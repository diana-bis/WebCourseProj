window.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("currentUserId")) {
        // Already logged in - go to search
        window.location.replace("search.html");
    }
});

// Get users array from localStorage
function getUsers() {
    const users = localStorage.getItem("users");
    return users ? JSON.parse(users) : [];
}

// Generate incremental user ID
function generateUserId(users) {
    if (users.length === 0) return 1;
    return users[users.length - 1].id + 1;
}

function validateForm() {
    const username = document.getElementById("username").value.trim();
    const firstname = document.getElementById("firstname").value.trim();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm").value;
    const image = document.getElementById("image").value.trim();

    // Password length
    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return false;
    }

    // Check if username already exists in Local Storage
    const users = getUsers();
    const exists = users.some(user => user.username === username);
    if (exists) {
        alert("Username already exists. Please choose another one.");
        return false;
    }

    // check if password has at least one letter, one number, one special char
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
    if (!passwordPattern.test(password)) {
        alert("Password must contain at least one letter, one number, and one special character.");
        return false;
    }

    // Confirm password match
    if (password !== confirm) {
        alert("Passwords do not match!");
        return false;
    }

    // Image URL check
    if (!image.startsWith("http")) {
        alert("Please enter a valid image URL (must start with http or https).");
        return false;
    }

    // If all checks passed — save user to localStorage
    const newUser = {
        id: generateUserId(users),
        username: username,
        firstname: firstname,
        password: password,
        image: image
    };

    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));
    window.location.replace("login.html");    // Redirect to login page
    return false;   // No need for the form submition process - handled it without

}