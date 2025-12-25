let API_KEY = null; // Restricted API (only to specific websites)
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const resultsDiv = document.getElementById("results");

const modal = document.getElementById("videoModal");
const playerFrame = document.getElementById("playerFrame");

let bootstrapModal;

let addToFavModal;
let pendingVideo = null;
let pendingFavButton = null;
let userPlaylistsCache = [];

// Prevents access without login
window.addEventListener("DOMContentLoaded", async () => {
    const userId = getCurrentUserId();
    if (!userId) {
        window.location.replace("login.html");
        return;
    }

    const res = await fetch(`/api/playlists/${userId}`);
    if (res.ok) {
        userPlaylistsCache = await res.json();
    }

    bootstrapModal = new bootstrap.Modal(
        document.getElementById("videoModal")
    );

    addToFavModal = new bootstrap.Modal(
        document.getElementById("addToFavModal")
    );

    modal.addEventListener("hidden.bs.modal", () => {
        playerFrame.src = "";
    });

    await loadConfig();

    // Load search from query string if exists
    const params = new URLSearchParams(window.location.search);
    const queryFromUrl = params.get("q");

    if (queryFromUrl) {
        searchInput.value = queryFromUrl;
        searchYouTube(); // run search automatically
    }
});

const playlistSelect = document.getElementById("playlistSelect");
const newPlaylistInput = document.getElementById("newPlaylistInput");

// Add to fav - when selecting existing playlist
playlistSelect.addEventListener("change", () => {
    if (playlistSelect.value) {
        newPlaylistInput.value = "";
        newPlaylistInput.disabled = true;
    } else {
        newPlaylistInput.disabled = false;
    }
});

// Add to fav - when typing a new playlist
newPlaylistInput.addEventListener("input", () => {
    if (newPlaylistInput.value.trim()) {
        playlistSelect.value = "";
        playlistSelect.disabled = true;
    } else {
        playlistSelect.disabled = false;
    }
});

async function loadConfig() {
    try {
        const response = await fetch("config.json");
        const config = await response.json();

        API_KEY = config.apiKey;

        if (!API_KEY) {
            alert("API key missing in config.json");
        }
    } catch (err) {
        console.error("Failed to load config.json", err);
        alert("Failed to load configuration.");
    }
}

searchBtn.addEventListener("click", searchYouTube);

searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        searchYouTube();
    }
});

function openModal(videoId) {
    // autoplay=1 starts playing immediately
    playerFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    bootstrapModal.show();
}

function closeModal() {
    bootstrapModal.hide();
    playerFrame.src = ""; // Stops the video
}

async function searchYouTube() {
    const query = searchInput.value.trim();
    if (!query) {
        alert("Please enter a search term.");
        return;
    }

    // Update URL query string
    const params = new URLSearchParams(window.location.search);
    params.set("q", query);
    history.pushState({}, "", `${window.location.pathname}?${params}`);
    // Remember last search URL
    sessionStorage.setItem("lastSearchUrl", window.location.href);

    resultsDiv.innerHTML = "<p>Loading...</p>";

    try {
        // Search videos by query
        const searchResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(query)}&key=${API_KEY}`
        );
        const searchData = await searchResponse.json(); // Converts API response to a JavaScript object

        if (!searchData.items || searchData.items.length === 0) {
            resultsDiv.innerHTML = "<p>No results found.</p>";
            return;
        }

        // Collect all video IDs to get extra info (duration, views)
        const videoIds = searchData.items.map(item => item.id.videoId).join(",");

        // Get video statistics (duration, views)
        const detailsResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${API_KEY}`
        );
        const detailsData = await detailsResponse.json();

        // Map video IDs to details
        const detailsMap = {};
        detailsData.items.forEach(video => {
            detailsMap[video.id] = {
                duration: video.contentDetails.duration,
                views: video.statistics.viewCount
            };
        });

        // Clear old results
        resultsDiv.innerHTML = "";

        const userId = getCurrentUserId();
        if (!userId) return;

        // Create cards
        searchData.items.forEach(item => {
            const videoId = item.id.videoId;
            const title = item.snippet.title;
            const thumbnail = item.snippet.thumbnails.medium.url;
            const channel = item.snippet.channelTitle;
            const duration = formatDuration(detailsMap[videoId]?.duration || "N/A");
            const views = formatViews(detailsMap[videoId]?.views || "0");

            const card = document.createElement("div");
            card.className = "col-md-3 col-sm-6";

            card.innerHTML = `
                <div class="result-card shadow-sm">
                    <div class="result-img-container">
                        <img src="${thumbnail}" class="result-img open-video" alt="${title}">
                        <div class="play-overlay open-video">
                            <div class="btn-play">▶</div>
                        </div>
                        <div class="position-absolute bottom-0 end-0 m-2">
                            <span class="badge bg-dark opacity-75">${duration}</span>
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column p-3">
                        <h6 class="fw-bold mb-1 text-truncate open-video" title="${title}" style="cursor:pointer">${title}</h6>
                        <p class="text-muted small mb-0 text-truncate"><strong>Channel:</strong> ${channel}</p>
                        <p class="text-muted mb-3" style="font-size: 0.75rem;">${views} views</p>
                        
                        <button class="btn btn-outline-primary btn-sm rounded-pill mt-auto favBtn">
                            + Add to Playlist
                        </button>
                    </div>
                </div>
            `;

            card.querySelectorAll(".open-video").forEach(el => {
                el.addEventListener("click", () => openModal(videoId));
            });

            const favBtn = card.querySelector(".favBtn");

            if (isVideoInFavorites(videoId)) {
                markAsInFavorite(favBtn);
            }

            favBtn.addEventListener("click", () => {
                pendingFavButton = favBtn;
                openAddToFavoritesDialog({
                    videoId,
                    title,
                    thumbnail,
                    channel
                });
            });

            resultsDiv.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        resultsDiv.innerHTML = "<p>Error loading results.</p>";
    }
}

// Helper: convert ISO 8601 duration to mm:ss
function formatDuration(duration) {
    if (!duration.startsWith("PT")) return duration;
    const match = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
    const minutes = match[1] ? parseInt(match[1]) : 0;
    const seconds = match[2] ? parseInt(match[2]) : 0;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Helper: format large view counts
function formatViews(views) {
    const num = parseInt(views);
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
}

function getCurrentUserId() {
    return sessionStorage.getItem("currentUserId");
}

function markAsInFavorite(favBtn) {
    favBtn.textContent = "✓ In Favorites";
    favBtn.classList.remove("btn-outline-primary");
    favBtn.classList.add("btn-secondary");
    favBtn.disabled = true;
}

async function openAddToFavoritesDialog(video) {
    pendingVideo = video;

    const userId = getCurrentUserId();
    if (!userId) return;

    const select = document.getElementById("playlistSelect");
    const input = document.getElementById("newPlaylistInput");

    // Reset state
    select.disabled = false;
    input.disabled = false;
    select.innerHTML = `<option value="">-- Select playlist --</option>`;
    input.value = "";

    try {
        const res = await fetch(`/api/playlists/${userId}`);
        const playlists = await res.json();

        if (res.ok && Array.isArray(playlists)) {
            playlists.forEach(pl => {
                const opt = document.createElement("option");
                opt.value = pl.name;
                opt.textContent = pl.name;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Failed to load playlists", err);
    }

    addToFavModal.show();
}

document.getElementById("confirmAddToFav").addEventListener("click", async () => {
    if (!pendingVideo) return;

    const select = document.getElementById("playlistSelect");
    const input = document.getElementById("newPlaylistInput");

    const playlistName = input.value.trim() || select.value;

    if (!playlistName) {
        alert("Please select or create a playlist");
        return;
    }

    const userId = getCurrentUserId();

    try {
        const response = await fetch(`/api/playlists/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                playlistName,
                video: {
                    ...pendingVideo,
                    rating: 0
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Failed to save to playlist");
            return;
        }

        if (pendingFavButton) {
            markAsInFavorite(pendingFavButton);
            pendingFavButton = null;
        }

        const playlist = userPlaylistsCache.find(p => p.name === playlistName);
        if (playlist) {
            playlist.videos.push({ videoId: pendingVideo.videoId });
        } else {
            userPlaylistsCache.push({
                name: playlistName,
                videos: [{ videoId: pendingVideo.videoId }]
            });
        }

        addToFavModal.hide();
        showToast(`Saved to "${playlistName}"`, data.playlistId);

        pendingVideo = null;

    } catch (err) {
        console.error(err);
        alert("Server error while saving playlist");
    }
});

function showToast(message, playlistId) {
    const toast = document.createElement("div");
    toast.className = "toast align-items-center text-bg-success show position-fixed bottom-0 end-0 m-3";
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
                <br>
                <a href="playlist.html?id=${playlistId}" class="text-white text-decoration-underline">
                    Go to playlist
                </a>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto"></button>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}

function isVideoInFavorites(videoId) {
    return userPlaylistsCache.some(pl =>
        pl.videos.some(v => v.videoId === videoId)
    );
}
