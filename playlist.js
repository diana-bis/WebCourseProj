// Get current user
function getCurrentUser() {
    const userId = Number(sessionStorage.getItem("currentUserId"));
    const users = JSON.parse(localStorage.getItem("users")) || [];
    return {
        users,
        user: users.find(u => u.id === userId)
    };
}

const playlistList = document.getElementById("playlistList");
const songsContainer = document.getElementById("songsContainer");
const playlistTitle = document.getElementById("playlistTitle");
const emptyMessage = document.getElementById("emptyMessage");

let selectedPlaylistId = null;

const playPlaylistBtn = document.getElementById("playPlaylistBtn");
const playerWrapper = document.getElementById("playerWrapper");

let ytPlayerInstance;
let playingPlaylist = [];
let currentVideoIndex = 0;

let currentSortedVideos = [];
const sortSelect = document.getElementById("sortSelect");

const playlistSearchInput = document.getElementById("playlistSearchInput");

const deletePlaylistBtn = document.getElementById("deletePlaylistBtn");

playlistSearchInput.addEventListener("input", () => {
    selectPlaylist(selectedPlaylistId);
});

sortSelect.addEventListener("change", () => {
    selectPlaylist(selectedPlaylistId);
});

window.addEventListener("DOMContentLoaded", () => {
    loadPlaylists();
});

function loadPlaylists() {
    const { user } = getCurrentUser();
    playlistList.innerHTML = "";

    if (!user.playlists || user.playlists.length === 0) {
        playlistList.innerHTML =
            `<li class="list-group-item text-muted">No playlists yet</li>`;
        return;
    }

    const playlistIdFromURL = getPlaylistIdFromURL();
    let firstPlaylistId = null;
    let foundFromURL = false;

    user.playlists.forEach(pl => {
        const li = document.createElement("li");
        li.className = "list-group-item list-group-item-action";
        li.textContent = pl.name;

        if (!firstPlaylistId) firstPlaylistId = pl.id;

        if (playlistIdFromURL === pl.id) {
            selectPlaylist(pl.id);
            foundFromURL = true;
        }

        li.addEventListener("click", () => {
            history.pushState({}, "", `playlist.html?id=${pl.id}`);
            selectPlaylist(pl.id);
        });

        playlistList.appendChild(li);
    });

    // Load first playlist in list
    if (!foundFromURL && firstPlaylistId) {
        history.replaceState({}, "", `playlist.html?id=${firstPlaylistId}`);
        selectPlaylist(firstPlaylistId);
    }
}


function selectPlaylist(playlistId) {
    const { user } = getCurrentUser();
    const playlist = user.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    selectedPlaylistId = playlistId;
    playPlaylistBtn.disabled = false;
    deletePlaylistBtn.disabled = false;

    playlistTitle.textContent = playlist.name;
    emptyMessage.style.display = "none";
    songsContainer.innerHTML = "";

    if (playlist.videos.length === 0) {
        songsContainer.innerHTML =
            `<p class="text-muted">This playlist is empty.</p>`;
        return;
    }

    let videos = [...playlist.videos];

    // Search in playlist
    const searchText = playlistSearchInput.value.toLowerCase().trim();
    if (searchText) {
        videos = videos.filter(video =>
            video.title.toLowerCase().includes(searchText)
        );
    }

    // Sort alphabetically
    if (sortSelect.value === "az") {
        videos.sort((a, b) =>
            a.title.localeCompare(b.title)
        );
    }

    if (sortSelect.value === "za") {
        videos.sort((a, b) =>
            b.title.localeCompare(a.title)
        );
    }

    // Sort by rating
    if (sortSelect.value === "rating-desc") {
        videos.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    if (sortSelect.value === "rating-asc") {
        videos.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }

    currentSortedVideos = videos;

    videos.forEach((video, index) => {
        const col = document.createElement("div");
        col.className = "col-md-3 col-sm-4";

        col.innerHTML = `
            <div class="card h-100 shadow-sm">
                <img src="${video.thumbnail}" class="card-img-top" />
                    <div class="card-body text-center">
                        <h6 class="card-title">${video.title}</h6>
                            <div class="mb-2">
                                ${[1, 2, 3, 4, 5].map(star => `
                                    <span
                                        class="fs-5 me-1 ${video.rating >= star ? 'text-warning' : 'text-secondary'}"
                                        role="button"
                                        data-star="${star}">★
                                    </span>
                                `).join("")}
                            </div>
                        
                        <button class="btn btn-outline-danger btn-sm removeBtn">Remove</button>
                    </div> 
            </div>
        `;

        const removeBtn = col.querySelector(".removeBtn");

        col.querySelectorAll("[data-star]").forEach(starEl => {
            starEl.addEventListener("click", (e) => {
                e.stopPropagation();

                const rating = Number(starEl.dataset.star);

                const { users, user } = getCurrentUser();
                const playlist = user.playlists.find(p => p.id === selectedPlaylistId);

                const realVideo = playlist.videos.find(
                    v => v.videoId === video.videoId
                );

                realVideo.rating = rating;

                localStorage.setItem("users", JSON.stringify(users));

                selectPlaylist(selectedPlaylistId);
            });
        });

        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // prevents play click

            if (!confirm("Remove this video from playlist?")) return;

            const { users, user } = getCurrentUser();
            const playlist = user.playlists.find(p => p.id === selectedPlaylistId);

            // Remove video by index
            const index = playlist.videos.findIndex(
                v => v.videoId === video.videoId
            );
            playlist.videos.splice(index, 1);

            localStorage.setItem("users", JSON.stringify(users));

            // Refresh playlist UI
            selectPlaylist(selectedPlaylistId);
        });

        col.addEventListener("click", () => {
            playingPlaylist = videos;   // full playlist
            currentVideoIndex = index;            // start from clicked song

            playerWrapper.classList.remove("d-none");
            playCurrentVideo();
        });

        songsContainer.appendChild(col);
    });
}

// Create new playlist
document.getElementById("createPlaylistBtn").addEventListener("click", () => {
    const input = document.getElementById("newPlaylistName");
    const name = input.value.trim();
    if (!name) return alert("Please enter a playlist name");

    const { users, user } = getCurrentUser();

    if (!user.playlists) user.playlists = [];

    const exists = user.playlists.some(p => p.name === name);
    if (exists) {
        alert("A playlist with this name already exists");
        return;
    }

    user.playlists.push({
        id: Date.now(),
        name,
        videos: []
    });

    localStorage.setItem("users", JSON.stringify(users));
    input.value = "";
    loadPlaylists();

    const modal = bootstrap.Modal.getInstance(
        document.getElementById("createPlaylistModal")
    );
    modal.hide();
});

function getPlaylistIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return Number(params.get("id"));
}

function onYouTubeIframeAPIReady() {
    ytPlayerInstance = new YT.Player("ytPlayer", {
        height: "360",
        width: "640",
        events: {
            onStateChange: onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        currentVideoIndex++;
        playCurrentVideo();
    }
}

function playCurrentVideo() {
    if (!ytPlayerInstance) return;
    if (currentVideoIndex >= playingPlaylist.length) return;

    ytPlayerInstance.loadVideoById(
        playingPlaylist[currentVideoIndex].videoId
    );
}


playPlaylistBtn.addEventListener("click", () => {
    const { user } = getCurrentUser();
    const playlist = user.playlists.find(p => p.id === selectedPlaylistId);

    if (!playlist || playlist.videos.length === 0) {
        alert("Playlist is empty");
        return;
    }

    playingPlaylist = currentSortedVideos;
    currentVideoIndex = 0;

    playerWrapper.classList.remove("d-none");
    playCurrentVideo();
});


deletePlaylistBtn.addEventListener("click", () => {
    if (!selectedPlaylistId) return;

    if (!confirm("Are you sure you want to delete this playlist?")) return;

    const { users, user } = getCurrentUser();

    const index = user.playlists.findIndex(
        p => p.id === selectedPlaylistId
    );

    if (index === -1) return;

    user.playlists.splice(index, 1);
    localStorage.setItem("users", JSON.stringify(users));

    selectedPlaylistId = null;
    songsContainer.innerHTML = "";
    playlistTitle.textContent = "Select a playlist";
    emptyMessage.style.display = "block";
    playPlaylistBtn.disabled = true;
    deletePlaylistBtn.disabled = true;

    // Reload playlist list
    history.replaceState({}, "", "playlist.html");
    loadPlaylists();
});