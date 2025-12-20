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

window.addEventListener("DOMContentLoaded", () => {
    loadPlaylists(true);
});

function loadPlaylists(selectFromURL = false) {
    const { user } = getCurrentUser();
    playlistList.innerHTML = "";

    if (!user.playlists || user.playlists.length === 0) {
        playlistList.innerHTML =
            `<li class="list-group-item text-muted">No playlists yet</li>`;
        return;
    }

    const playlistNameFromURL = getPlaylistNameFromURL();

    user.playlists.forEach(pl => {
        const li = document.createElement("li");
        li.className = "list-group-item list-group-item-action";
        li.textContent = pl.name;

        li.addEventListener("click", () => {
            selectPlaylist(pl.id);
        });

        playlistList.appendChild(li);

        // If playlist matches the one in the URL, select to show it
        if (selectFromURL && playlistNameFromURL === pl.name) {
            selectPlaylist(pl.id);
        }
    });
}


function selectPlaylist(playlistId) {
    const { user } = getCurrentUser();
    const playlist = user.playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    selectedPlaylistId = playlistId;
    playlistTitle.textContent = playlist.name;
    emptyMessage.style.display = "none";
    songsContainer.innerHTML = "";

    if (playlist.videos.length === 0) {
        songsContainer.innerHTML =
            `<p class="text-muted">This playlist is empty.</p>`;
        return;
    }

    playlist.videos.forEach(video => {
        const col = document.createElement("div");
        col.className = "col-md-2 col-sm-4";

        col.innerHTML = `
            <div class="card h-100 shadow-sm">
                <img src="${video.thumbnail}" class="card-img-top" />
                <div class="card-body">
                    <h6 class="card-title">${video.title}</h6>
                    <p class="mb-1"><strong>Channel:</strong> ${video.channel}</p>
                </div>
            </div>
        `;

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

function getPlaylistNameFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("name");
}

