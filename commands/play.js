import { SlashCommandBuilder } from "discord.js";
import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
} from "@discordjs/voice";
import ytdl from "ytdl-core";
import ytSearch from "yt-search";

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
            // ==============================
            // 🔍 Tìm video
            // ==============================
            let videoUrl;
            let title;

            if (ytdl.validateURL(query)) {
                // Là link YouTube hợp lệ
                videoUrl = query;
                const info = await ytdl.getInfo(videoUrl);
                title = info.videoDetails.title;
            } else {
                // Tìm kiếm theo từ khoá
                const result = await ytSearch(query);
                const video = result.videos.length > 0 ? result.videos[0] : null;

                if (!video) {
                    return interaction.editReply("❌ Không tìm thấy bài hát nào.");
                }

                videoUrl = video.url;
                title = video.title;
            }

            const song = { title, url: videoUrl };

            // ==============================
            // 🎶 Quản lý hàng chờ
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
// 🎵 HÀM PHÁT NHẠC
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
        console.log("🎧 Streaming:", song.url);

        const stream = ytdl(song.url, {
            filter: "audioonly",
            quality: "highestaudio",
            highWaterMark: 1 << 25, // giảm lag buffer
        });

        const resource = createAudioResource(stream);
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
