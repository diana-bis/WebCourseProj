function getCurrentUserId() {
    return sessionStorage.getItem("currentUserId");
}

async function fetchPlaylists() {
    const userId = getCurrentUserId();
    if (!userId) return [];

    const res = await fetch(`/api/playlists/${userId}`);
    if (!res.ok) return [];
    return await res.json();
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

function stopAllPlayers() {
    const audioPlayer = document.getElementById("audioPlayer");

    // Stop MP3
    if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    }

    // Stop YouTube
    if (ytPlayerInstance && ytPlayerInstance.stopVideo) {
        ytPlayerInstance.stopVideo();
    }
}

async function loadPlaylists() {
    const playlists = await fetchPlaylists();
    playlistList.innerHTML = "";

    if (!playlists.length) {
        playlistList.innerHTML =
            `<li class="list-group-item text-muted">No playlists yet</li>`;
        return;
    }

    const playlistIdFromURL = getPlaylistIdFromURL();
    let firstPlaylistId = null;
    let foundFromURL = false;

    playlists.forEach(pl => {
        const li = document.createElement("li");
        li.className = "list-group-item list-group-item-action";
        li.textContent = pl.name;

        if (!firstPlaylistId) firstPlaylistId = pl.id;

        if (playlistIdFromURL === pl.id) {
            selectPlaylist(pl.id);
            foundFromURL = true;
        }

        li.addEventListener("click", () => {
            document.querySelectorAll("#playlistList .list-group-item").forEach(x => x.classList.remove("active"));

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


async function selectPlaylist(playlistId) {
    document
        .getElementById("uploadMp3Wrapper")
        .classList.remove("d-none");

    const playlists = await fetchPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
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
                <img src="${video.thumbnail}" class="card-img-top playlist-thumb" />
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
            starEl.addEventListener("click", async (e) => {
                e.stopPropagation();

                const rating = Number(starEl.dataset.star);
                const userId = getCurrentUserId();

                await fetch(
                    `/api/playlists/${userId}/${selectedPlaylistId}/video/${video.id}`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ rating })
                    }
                );

                selectPlaylist(selectedPlaylistId);
            });
        });

        removeBtn.addEventListener("click", async (e) => {
            e.stopPropagation();

            if (!confirm("Remove this video from playlist?")) return;

            const userId = getCurrentUserId();

            await fetch(
                `/api/playlists/${userId}/${selectedPlaylistId}/video/${video.id}`,
                { method: "DELETE" }
            );

            selectPlaylist(selectedPlaylistId);
        });

        col.addEventListener("click", () => {
            stopAllPlayers();
            playingPlaylist = videos;   // full playlist
            currentVideoIndex = index;            // start from clicked song

            playerWrapper.classList.remove("d-none");
            playCurrentVideo();
        });

        songsContainer.appendChild(col);
    });
}

document.getElementById("createPlaylistBtn").addEventListener("click", async () => {
    const input = document.getElementById("newPlaylistName");
    const name = input.value.trim();
    if (!name) {
        alert("Please enter a playlist name");
        return;
    }

    const userId = getCurrentUserId();

    const res = await fetch(`/api/playlists/${userId}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
    });

    if (!res.ok) {
        alert("Playlist already exists");
        return;
    }

    input.value = "";
    await loadPlaylists();

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
    if (currentVideoIndex >= playingPlaylist.length) return;

    stopAllPlayers();

    const item = playingPlaylist[currentVideoIndex];

    const ytWrapper = document.getElementById("playerWrapper");
    const audioWrapper = document.getElementById("audioPlayerWrapper");
    const audioPlayer = document.getElementById("audioPlayer");

    // MP3
    if (item.type === "mp3") {
        ytWrapper.classList.add("d-none");
        audioWrapper.classList.remove("d-none");

        audioPlayer.src = item.filePath;
        audioPlayer.play();

        audioPlayer.onended = () => {
            currentVideoIndex++;
            playCurrentVideo();
        };
    }
    // YouTube
    else {
        audioWrapper.classList.add("d-none");
        ytWrapper.classList.remove("d-none");

        ytPlayerInstance.loadVideoById(item.videoId);
    }
}


playPlaylistBtn.addEventListener("click", () => {
    if (!currentSortedVideos.length) {
        alert("Playlist is empty");
        return;
    }

    playingPlaylist = currentSortedVideos;
    currentVideoIndex = 0;

    playerWrapper.classList.remove("d-none");
    playCurrentVideo();
});

deletePlaylistBtn.addEventListener("click", async () => {
    if (!selectedPlaylistId) return;
    if (!confirm("Are you sure you want to delete this playlist?")) return;

    const userId = getCurrentUserId();

    await fetch(
        `/api/playlists/${userId}/${selectedPlaylistId}`,
        { method: "DELETE" }
    );

    selectedPlaylistId = null;
    songsContainer.innerHTML = "";
    playlistTitle.textContent = "Select a playlist";
    emptyMessage.style.display = "block";
    playPlaylistBtn.disabled = true;
    deletePlaylistBtn.disabled = true;

    history.replaceState({}, "", "playlist.html");
    loadPlaylists();
});

document.getElementById("mp3FileInput").addEventListener("change", async () => {

    if (!selectedPlaylistId) {
        alert("Select a playlist first");
        return;
    }

    const fileInput = document.getElementById("mp3FileInput");
    const file = fileInput.files[0];

    if (!file) {
        alert("Choose an MP3 file");
        return;
    }

    const userId = getCurrentUserId();
    const formData = new FormData();
    formData.append("mp3", file);

    const res = await fetch(
        `/api/playlists/${userId}/${selectedPlaylistId}/upload`,
        {
            method: "POST",
            body: formData
        }
    );

    if (!res.ok) {
        alert("Upload failed, song already exsists");
        return;
    }

    fileInput.value = "";
    selectPlaylist(selectedPlaylistId);
});
