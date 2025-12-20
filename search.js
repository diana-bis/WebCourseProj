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

// Prevents access without login
window.addEventListener("DOMContentLoaded", async () => {
    if (!sessionStorage.getItem("currentUserId")) {
        window.location.replace("login.html");
        return;
    }

    bootstrapModal = new bootstrap.Modal(
        document.getElementById("videoModal")
    );

    addToFavModal = new bootstrap.Modal(
        document.getElementById("addToFavModal")
    );


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

    resultsDiv.innerHTML = "<p>Loading...</p>";

    try {
        // Search videos by query
        const searchResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=16&q=${encodeURIComponent(query)}&key=${API_KEY}`
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

        const { user } = getCurrentUser();

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
                <div class="card h-100 shadow-sm">
                    <img
                    src="${thumbnail}"
                    class="card-img-top open-video"
                    style="cursor:pointer"
                    alt="thumbnail"
                    />
                    <div class="card-body d-flex flex-column">
                        <h6 class="card-title text-truncate open-video" title="${title}" style="cursor:pointer">${title}</h6>
                        <p class="mb-1"><strong>Channel:</strong> ${channel}</p>
                        <p class="mb-1"><strong>Duration:</strong> ${duration}</p>
                        <p class="mb-2"><strong>Views:</strong> ${views}</p>
                        <button class="btn btn-outline-primary mt-auto favBtn">Add to Favorites</button>
                    </div>
                </div>
                `;

            card.querySelectorAll(".open-video").forEach(el => {
                el.addEventListener("click", () => openModal(videoId));
            });

            const favBtn = card.querySelector(".favBtn");

            if (isVideoInFavorites(user, videoId)) {
                markAsInFavorite(favBtn);
            } else {
                favBtn.addEventListener("click", () => {
                    pendingFavButton = favBtn;
                    openAddToFavoritesDialog({
                        videoId,
                        title,
                        thumbnail,
                        channel
                    });
                });
            }

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

function getCurrentUser() {
    const userId = Number(sessionStorage.getItem("currentUserId"));
    const users = JSON.parse(localStorage.getItem("users")) || [];
    return {
        users,
        user: users.find(u => u.id === userId)
    };
}

function isVideoInFavorites(user, videoId) {
    if (!user.playlists) return false;
    return user.playlists.some(pl =>
        pl.videos.some(v => v.videoId === videoId)
    );
}

function markAsInFavorite(favBtn) {
    favBtn.textContent = "✓ In Favorites";
    favBtn.classList.remove("btn-outline-primary");
    favBtn.classList.add("btn-secondary");
    favBtn.disabled = true;
}

function openAddToFavoritesDialog(video) {
    pendingVideo = video;

    const { user } = getCurrentUser();
    if (!user.playlists) user.playlists = [];

    const select = document.getElementById("playlistSelect");
    const input = document.getElementById("newPlaylistInput");

    // Reset state
    select.disabled = false;
    input.disabled = false;
    select.innerHTML = `<option value="">-- Select playlist --</option>`;
    input.value = "";

    user.playlists.forEach(pl => {
        const opt = document.createElement("option");
        opt.value = pl.name;
        opt.textContent = pl.name;
        select.appendChild(opt);
    });

    addToFavModal.show();
}

document.getElementById("confirmAddToFav").addEventListener("click", () => {
    if (!pendingVideo) return;
    const select = document.getElementById("playlistSelect");
    const input = document.getElementById("newPlaylistInput");

    const selectedPlaylist = select.value;
    const newPlaylistName = input.value.trim();

    if (!selectedPlaylist && !newPlaylistName) {
        alert("Please select or create a playlist");
        return;
    }

    const { users, user } = getCurrentUser();
    if (!user.playlists) user.playlists = [];

    let playlist;

    // Case 1: existing playlist selected
    if (selectedPlaylist) {
        playlist = user.playlists.find(p => p.name === selectedPlaylist);
    }

    // Case 2: new playlist name entered
    if (newPlaylistName) {
        const nameExists = user.playlists.some(p => p.name === newPlaylistName);
        if (nameExists) {
            alert("A playlist with this name already exists. Please select it from the list.");
            return;
        }

        playlist = {
            id: Date.now(),
            name: newPlaylistName,
            videos: []
        };
        user.playlists.push(playlist);
    }

    // Prevents duplicate video (extra check)
    const exists = playlist.videos.some(v => v.videoId === pendingVideo.videoId);
    if (exists) {
        alert("This video is already in this playlist");
        return;
    }

    playlist.videos.push(pendingVideo);
    localStorage.setItem("users", JSON.stringify(users));

    addToFavModal.hide();
    showToast(`Saved to "${playlist.name}"`, playlist.name);

    if (pendingFavButton) {
        markAsInFavorite(pendingFavButton);
        pendingFavButton = null;
    }

    pendingVideo = null;
});



function showToast(message, playlistName) {
    const toast = document.createElement("div");
    toast.className = "toast align-items-center text-bg-success show position-fixed bottom-0 end-0 m-3";
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
                <br>
                <a href="playlists.html?name=${encodeURIComponent(playlistName)}" class="text-white text-decoration-underline">
                    Go to playlist
                </a>
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto"></button>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}
