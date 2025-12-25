window.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("currentUserId")) {
        // Already logged in - go to search
        window.location.replace("search.html");
    }
});

async function loadConfig() {
    try {
        const response = await fetch("config.json");
        const config = await response.json();

        const content = document.getElementById("content");

        content.innerHTML = `
      <div class="mb-4 text-center">
                <h3 class="fw-bold text-dark">${config.student.name}</h3>
                <span class="badge bg-light text-dark border">${config.student.id}</span>
            </div>

            <hr class="my-4 opacity-10">

            <h5 class="fw-bold mb-3">Navigation Links</h5>
            <div class="list-group list-group-flush">
                ${config.links
                .map(link => `
                        <a href="${link.url}" class="playlist-item text-decoration-none text-dark rounded mb-2">
                            <div>
                                <div class="fw-bold">${link.text}</div>
                            </div>
                        </a>
                    `).join("")}
            </div>
        `;
    } catch (err) {
        console.error("Failed to load config.json", err);
    }
}

loadConfig();
