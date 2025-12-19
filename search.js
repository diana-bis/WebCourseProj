let API_KEY = null; // Restricted API (only to specific websites)
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const resultsDiv = document.getElementById("results");

const modal = document.getElementById("videoModal");
const playerFrame = document.getElementById("playerFrame");

let bootstrapModal;
// Prevents access without login
window.addEventListener("DOMContentLoaded", async () => {
    if (!sessionStorage.getItem("currentUserId")) {
        window.location.replace("login.html");
        return;
    }

    bootstrapModal = new bootstrap.Modal(
        document.getElementById("videoModal")
    );

    await loadConfig();
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

        // 3️⃣ Create cards
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
