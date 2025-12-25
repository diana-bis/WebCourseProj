const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;

const crypto = require("crypto");

const PLAYLISTS_DIR = path.join(__dirname, "playlists");

const multer = require("multer");

const UPLOADS_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}
app.use("/uploads", express.static(UPLOADS_DIR));

app.use(express.json());
// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "client")));

const USERS_FILE = path.join(__dirname, "users.json");

function readUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, "[]");
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.post("/api/register", (req, res) => {
    const { username, firstname, password, image } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const users = readUsers();

    // Check if username already exists in Storage
    if (users.some(u => u.username === username)) {
        return res.status(409).json({ error: "Username already exists" });
    }

    const newUser = {
        id: Date.now(),
        username,
        firstname,
        password,
        image
    };

    users.push(newUser);
    saveUsers(users);

    res.status(201).json({ message: "Registered successfully" });
});

app.post("/api/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Missing credentials" });
    }

    const users = readUsers();

    // Check username
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(401).json({ error: "Username not found" });
    }

    // Check password
    if (user.password !== password) {
        return res.status(401).json({ error: "Incorrect password" });
    }

    // Success
    res.json({
        userId: user.id,
        username: user.username
    });
});


if (!fs.existsSync(PLAYLISTS_DIR)) {
    fs.mkdirSync(PLAYLISTS_DIR);
}

function getPlaylistFile(userId) {
    return path.join(PLAYLISTS_DIR, `user_${userId}.json`);
}

function readPlaylists(userId) {
    const file = getPlaylistFile(userId);
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, "[]");
    }
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function savePlaylists(userId, playlists) {
    fs.writeFileSync(
        getPlaylistFile(userId),
        JSON.stringify(playlists, null, 2)
    );
}

app.get("/api/playlists/:userId", (req, res) => {
    const { userId } = req.params;

    const users = readUsers();
    const userExists = users.some(u => String(u.id) === String(userId));
    if (!userExists) {
        return res.status(404).json({ error: "User not found" });
    }

    const playlists = readPlaylists(userId);
    res.json(playlists);
});

app.get("/api/users/:userId", (req, res) => {
    const { userId } = req.params;
    const users = readUsers();

    const user = users.find(u => String(u.id) === String(userId));
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    res.json({
        id: user.id,
        firstname: user.firstname,
        image: user.image
    });
});

app.post("/api/playlists/:userId", (req, res) => {
    const { userId } = req.params;
    const { playlistName, video } = req.body;

    if (!playlistName || !video) {
        return res.status(400).json({ error: "Missing data" });
    }

    const playlists = readPlaylists(userId);

    let playlist = playlists.find(p => p.name === playlistName);

    if (!playlist) {
        playlist = {
            id: Date.now(),
            name: playlistName,
            videos: []
        };
        playlists.push(playlist);
    }

    const ytItem = {
        id: video.videoId,
        type: "youtube",
        videoId: video.videoId,
        title: video.title,
        thumbnail: video.thumbnail,
        rating: 0
    };

    if (playlist.videos.some(v => v.id === ytItem.id)) {
        return res.status(409).json({ error: "Item already exists in playlist" });
    }

    playlist.videos.push(ytItem);
    savePlaylists(userId, playlists);

    res.json({
        message: "Saved successfully",
        playlistId: playlist.id
    });
});

// create new playlist
app.post("/api/playlists/:userId/create", (req, res) => {
    const { userId } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Missing playlist name" });
    }

    const playlists = readPlaylists(userId);

    if (playlists.some(p => p.name === name)) {
        return res.status(409).json({ error: "Playlist already exists" });
    }

    const newPlaylist = {
        id: Date.now(),
        name,
        videos: []
    };

    playlists.push(newPlaylist);
    savePlaylists(userId, playlists);

    res.json(newPlaylist);
});

// delete a playlist
app.delete("/api/playlists/:userId/:playlistId", (req, res) => {
    const { userId, playlistId } = req.params;

    const playlists = readPlaylists(userId);
    const index = playlists.findIndex(p => p.id == playlistId);

    if (index === -1) {
        return res.status(404).json({ error: "Playlist not found" });
    }

    playlists.splice(index, 1);
    savePlaylists(userId, playlists);

    res.json({ message: "Playlist deleted" });
});

// remove a video from playlist
app.delete("/api/playlists/:userId/:playlistId/video/:id", (req, res) => {
    const { userId, playlistId, id } = req.params;

    const playlists = readPlaylists(userId);
    const playlist = playlists.find(p => p.id == playlistId);
    if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
    }

    playlist.videos = playlist.videos.filter(v => v.id !== id);
    savePlaylists(userId, playlists);

    res.json({ message: "Item removed" });
});


//upsate rating
app.put("/api/playlists/:userId/:playlistId/video/:id", (req, res) => {
    const { userId, playlistId, id } = req.params;
    const { rating } = req.body;

    const playlists = readPlaylists(userId);
    const playlist = playlists.find(p => p.id == playlistId);
    if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
    }

    const item = playlist.videos.find(v => v.id === id);
    if (!item) {
        return res.status(404).json({ error: "Item not found" });
    }

    item.rating = rating;
    savePlaylists(userId, playlists);

    res.json({ message: "Rating updated" });
});


// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("audio/")) {
            cb(null, true);
        } else {
            cb(new Error("Only audio files are allowed"));
        }
    }

});

app.post("/api/playlists/:userId/:playlistId/upload", upload.single("mp3"), (req, res) => {
    const { userId, playlistId } = req.params;

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const playlists = readPlaylists(userId);
    const playlist = playlists.find(p => p.id == playlistId);

    if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
    }

    // Prevent duplicate MP3 (by original filename)
    if (
        playlist.videos.some(
            v => v.type === "mp3" && v.title === req.file.originalname
        )
    ) {
        // remove uploaded file
        fs.unlinkSync(req.file.path);

        return res.status(409).json({
            error: "MP3 already exists in playlist"
        });
    }

    const mp3Item = {
        id: crypto.randomUUID(),
        type: "mp3",
        title: req.file.originalname,
        filePath: `/uploads/${req.file.filename}`,
        thumbnail: "/images/Gemini_Generated_mp3.png",
        rating: 0
    };

    playlist.videos.push(mp3Item);
    savePlaylists(userId, playlists);

    res.json({ message: "MP3 added to playlist", item: mp3Item });
}
);
