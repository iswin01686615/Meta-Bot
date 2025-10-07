import { SlashCommandBuilder } from "discord.js";
import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
} from "@discordjs/voice";
import play from "play-dl";

// ==============================
// 🔧 GẮN COOKIE YOUTUBE (NẾU CÓ)
// ==============================
try {
    if (process.env.YT_COOKIE) {
        play.setToken({
            youtube: {
                cookie: process.env.YT_COOKIE,
            },
        });
        console.log("✅ YT_COOKIE loaded");
    } else {
        console.log("⚠️ YT_COOKIE not set");
    }
} catch (e) {
    console.error("❌ Cookie setup failed:", e);
}

const queue = new Map();

export default {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Phát nhạc từ YouTube (link hoặc tên bài hát)")
        .addStringOption((option) =>
            option
                .setName("query")
                .setDescription("Link hoặc tên bài hát")
                .setRequired(true)
        ),

    async execute(interaction) {
        const query = interaction.options.getString("query");
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({
                content: "🚫 Bạn phải vào kênh thoại trước!",
                ephemeral: true,
            });
        }

        await interaction.deferReply();

        try {
            let songInfo;
            let videoUrl;
            let videoId;

            // ==============================
            // 🔍 Kiểm tra query là link hay từ khóa
            // ==============================
            const validation = play.yt_validate(query);

            if (validation === "video") {
                // Nếu là link video YouTube
                songInfo = await safeVideoInfo(query);
                videoId = songInfo?.video_details?.id;
                videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            } else {
                // Nếu là từ khóa → tìm kiếm video đầu tiên
                const searched = await play.search(query, { limit: 1 });
                if (!searched.length) {
                    return interaction.editReply("❌ Không tìm thấy bài hát nào.");
                }

                videoId = searched[0].id || searched[0].url?.split("v=")[1];
                videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                songInfo = await safeVideoInfo(videoUrl);
            }

            // ==============================
            // 🧩 Tạo object bài hát
            // ==============================
            const details = songInfo?.video_details || {};
            const song = {
                title: details.title || "Không rõ tên bài hát",
                url: videoUrl,
                duration: details.durationRaw || "Không rõ thời lượng",
            };

            // ==============================
            // 🎶 Hàng chờ phát nhạc
            // ==============================
            let serverQueue = queue.get(interaction.guild.id);

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

// ==============================
// 🎵 HÀM PHÁT NHẠC CHÍNH
// ==============================
async function playSong(interaction, song) {
    const serverQueue = queue.get(interaction.guild.id);
    if (!song) {
        serverQueue.connection.destroy();
        queue.delete(interaction.guild.id);
        await interaction.editReply("✅ Danh sách phát đã hết!");
        return;
    }

    try {
        if (!song.url || !song.url.startsWith("http")) {
            throw new Error("URL không hợp lệ: " + song.url);
        }

        const stream = await play.stream(song.url);
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
        });

        serverQueue.player.play(resource);
        serverQueue.connection.subscribe(serverQueue.player);

        await interaction.editReply(`🎵 Đang phát: **${song.title}**`);

        serverQueue.player.once(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            playSong(interaction, serverQueue.songs[0]);
        });
    } catch (error) {
        console.error("❌ Lỗi khi phát bài:", error);
        await interaction.editReply(
            `⚠️ Không thể phát bài hát: **${song?.title || "Không xác định"}**`
        );
        serverQueue.songs.shift();
        playSong(interaction, serverQueue.songs[0]);
    }
}

// ==============================
// 🧠 SAFE VIDEO INFO WRAPPER
// ==============================
// Bọc play.video_info() để tránh JSON parse lỗi (Unexpected character)
async function safeVideoInfo(url) {
    try {
        return await play.video_info(url);
    } catch (err) {
        console.warn("⚠️ play.video_info thất bại, dùng fallback:", err.message);
        // fallback tối thiểu để vẫn phát được
        const videoId = url.split("v=")[1];
        return {
            video_details: {
                id: videoId,
                title: "Video không xác định",
                durationRaw: "Không rõ",
            },
        };
    }
}
