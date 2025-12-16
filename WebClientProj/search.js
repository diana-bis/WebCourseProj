const API_KEY = "AIzaSyC14NLoxU9amQ3IivPeIhMmEm6HeajT4Qo";
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const resultsDiv = document.getElementById("results");

const modal = document.getElementById("videoModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const playerFrame = document.getElementById("playerFrame");

// Prevents access without login
window.addEventListener("DOMContentLoaded", () => {
    if (!sessionStorage.getItem("currentUserId")) {
        window.location.replace("login.html");
    }
});

searchBtn.addEventListener("click", searchYouTube);

function openModal(videoId) {
    // autoplay=1 starts playing immediately
    playerFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    modal.classList.add("open");
}

function closeModal() {
    modal.classList.remove("open");
    playerFrame.src = ""; // Stops the video
}

closeModalBtn.addEventListener("click", closeModal);

// close when clicking outside the modal content
modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

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
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=16&q=${encodeURIComponent(query)}&key=${API_KEY}`
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
            card.classList.add("video-card");

            card.innerHTML = `
                <img class="clickable open-video" data-video-id="${videoId}" src="${thumbnail}" alt="thumbnail">
                <span class="video-title clickable open-video" data-video-id="${videoId}" title="${title}">${title}</span>
                <p>Channel: ${channel}</p>
                <p>Duration: ${duration}</p>
                <p>Views: ${views}</p>
                <button class="favBtn">Add to Favorites</button>
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
