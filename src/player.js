const { PlayerManager } = require("ziplayer");
const { SoundCloudPlugin, YouTubePlugin, SpotifyPlugin } = require("@ziplayer/plugin");


const player = new PlayerManager({
    plugins: [new SoundCloudPlugin(), new YouTubePlugin(), new SpotifyPlugin()],
    leaveOnEmpty: false,   // 👈 không rời khi voice channel trống
    leaveOnEnd: false,     // 👈 không rời khi hết nhạc
    leaveOnStop: false,
});


// Optional: Listen to events
player.on("trackStart", (queue, track) => {
    if (!queue.metadata) queue.metadata = {};
    if (!queue.metadata.previousTracks) queue.metadata.previousTracks = [];
    if (!queue.metadata.forwardTracks) queue.metadata.forwardTracks = [];
    if (!queue.metadata.channel) queue.metadata.channel = null;

    if (queue.metadata.channel) {
        queue.metadata.channel.send(`▶ | Đang phát: **${track.title}**`);
    }
});

player.on("audioTrackError", (queue, error, track) => {
    console.error("🔴 Audio Track Error:", error);
    queue.metadata?.channel?.send(`❌ Lỗi khi phát bài: **${track.title}**. Đang chuyển bài tiếp theo...`);
    queue.skip();
});


player.on("trackAdd", (queue, track) => {
    queue.metadata?.channel?.send(`✅ Added to queue: **${track.title}**`);
});

player.on("trackEnd", (queue, track) => {
    try {
        if (!queue?.tracks || queue.tracks.length === 0) {
            queue.metadata?.channel?.send("⏹️ | Đã phát xong bài cuối, chờ bài mới...");
        }
    } catch (err) {
        console.error("Lỗi trong trackEnd:", err);
    }
});

player.on("error", (queue, error) => {
    console.error(`[${queue.guild?.id}] ❌ Error:`, error);
});


player.on("debug", console.log);

player.on("queueEnd", (queue) => {
    // 🔹 Nếu không còn bài nào trong hàng đợi
    if (!queue || !queue.connection) return;

    // 🔹 Không rời khỏi kênh
    queue.metadata?.channel?.send("📭 | Hết hàng đợi, bot vẫn đang giữ kết nối (24/7 mode).");

    // ⚠️ KHÔNG destroy hay leave
    // queue.connection.destroy(); ❌ đừng có dòng này!
});


module.exports = { player };