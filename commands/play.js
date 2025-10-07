import { SlashCommandBuilder } from "discord.js";
import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
} from "@discordjs/voice";
import ytdl from "@distube/ytdl-core";
import ytSearch from "yt-search";

const queue = new Map();

export default {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("🎶 Phát nhạc từ YouTube (link hoặc tên bài hát)")
        .addStringOption((option) =>
            option
                .setName("query")
                .setDescription("🔗 Link hoặc tên bài hát muốn phát")
                .setRequired(true)
        ),

    async execute(interaction) {
        const query = interaction.options.getString("query");
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({
                content: "🚫 Bạn phải tham gia kênh thoại trước khi phát nhạc!",
                ephemeral: true,
            });
        }

        await interaction.deferReply();

        try {
            // =========================
            // 🔍 Tìm kiếm / lấy video
            // =========================
            let videoUrl, title;

            if (ytdl.validateURL(query)) {
                // ✅ Nếu là link YouTube
                videoUrl = query;
                const info = await ytdl.getInfo(videoUrl);
                title = info.videoDetails.title;
            } else {
                // 🔎 Nếu là từ khóa → tìm kiếm video đầu tiên
                const result = await ytSearch(query);
                const video = result.videos.length > 0 ? result.videos[0] : null;

                if (!video) {
                    return interaction.editReply("❌ Không tìm thấy bài hát nào.");
                }

                videoUrl = video.url;
                title = video.title;
            }

            const song = { title, url: videoUrl };
            let serverQueue = queue.get(interaction.guild.id);

            // =========================
            // 🧱 Quản lý hàng chờ
            // =========================
            if (!serverQueue) {
                const queueConstruct = {
                    voiceChannel,
                    connection: null,
                    songs: [],
                    player: createAudioPlayer({
                        behaviors: { noSubscriber: NoSubscriberBehavior.Play },
                    }),
                };

                queue.set(interaction.guild.id, queueConstruct);
                queueConstruct.songs.push(song);

                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                queueConstruct.connection = connection;
                await playSong(interaction, queueConstruct.songs[0]);
            } else {
                serverQueue.songs.push(song);
                await interaction.editReply(`✅ Thêm vào hàng chờ: **${song.title}**`);
            }
        } catch (err) {
            console.error("🚫 Lỗi khi xử lý yêu cầu phát nhạc:", err);
            await interaction.editReply("⚠️ Có lỗi xảy ra khi phát nhạc!");
        }
    },
};

// =========================
// 🎧 Hàm phát nhạc chính
// =========================
async function playSong(interaction, song) {
    const serverQueue = queue.get(interaction.guild.id);
    if (!song) {
        serverQueue.connection.destroy();
        queue.delete(interaction.guild.id);
        await interaction.editReply("✅ Hết danh sách phát!");
        return;
    }

    try {
        console.log("🎵 Phát:", song.title);

        const stream = ytdl(song.url, {
            filter: "audioonly",
            quality: "highestaudio",
            highWaterMark: 1 << 25,
            requestOptions: {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            },
        });

        const resource = createAudioResource(stream);
        serverQueue.player.play(resource);
        serverQueue.connection.subscribe(serverQueue.player);

        await interaction.editReply(`🎶 Đang phát: **${song.title}**`);

        // Khi phát xong → phát bài tiếp
        serverQueue.player.once(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            playSong(interaction, serverQueue.songs[0]);
        });
    } catch (error) {
        console.error("❌ Lỗi khi phát bài:", error.message);
        await interaction.editReply(
            `⚠️ Không thể phát bài hát: **${song?.title || "Không xác định"}**`
        );

        // Bỏ qua bài lỗi và phát tiếp bài kế
        serverQueue.songs.shift();
        playSong(interaction, serverQueue.songs[0]);
    }
}
