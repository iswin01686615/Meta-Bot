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
// 🔧 FIX 1: Thêm cookie YouTube
// ==============================
if (process.env.YT_COOKIE) {
    play.setToken({
        youtube: {
            cookie: process.env.YT_COOKIE,
        },
    });
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

        // ==============================
        // 🧩 Kiểm tra người dùng
        // ==============================
        if (!voiceChannel) {
            return interaction.reply({
                content: "🚫 Bạn phải vào kênh thoại trước!",
                ephemeral: true,
            });
        }

        // ==============================
        // 🕓 Trì hoãn phản hồi (để tránh lỗi reply)
        // ==============================
        await interaction.deferReply();

        try {
            // ==============================
            // 🔍 Tìm bài hát
            // ==============================
            let songInfo;
            if (play.yt_validate(query) === "video") {
                songInfo = await play.video_info(query);
            } else {
                const searched = await play.search(query, { limit: 1 });
                if (!searched.length) {
                    return interaction.editReply("❌ Không tìm thấy bài hát nào.");
                }
                songInfo = await play.video_info(searched[0].url);
            }

            const song = {
                title: songInfo.video_details.title,
                url: songInfo.video_details.url,
                duration: songInfo.video_details.durationRaw,
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

                // Bắt đầu phát bài hát đầu tiên
                await playSong(interaction, queueConstruct.songs[0]);
            } else {
                serverQueue.songs.push(song);
                await interaction.editReply(
                    `✅ **${song.title}** đã được thêm vào hàng chờ!`
                );
            }
        } catch (err) {
            console.error("❌ Lỗi phát nhạc:", err);
            await interaction.editReply("⚠️ Có lỗi xảy ra khi phát nhạc!");
        }
    },
};

// ==============================
// 🎵 Hàm phát nhạc
// ==============================
async function playSong(interaction, song) {
    const serverQueue = queue.get(interaction.guild.id);
    if (!song) {
        serverQueue.connection.destroy();
        queue.delete(interaction.guild.id);
        await interaction.editReply("✅ Đã phát xong danh sách!");
        return;
    }

    try {
        // ==============================
        // 🔊 Lấy stream nhạc từ YouTube
        // ==============================
        const stream = await play.stream(song.url);
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
        });

        serverQueue.player.play(resource);
        serverQueue.connection.subscribe(serverQueue.player);

        await interaction.editReply(`🎵 Đang phát: **${song.title}**`);

        // Khi bài hát kết thúc → chuyển bài tiếp theo
        serverQueue.player.once(AudioPlayerStatus.Idle, () => {
            serverQueue.songs.shift();
            playSong(interaction, serverQueue.songs[0]);
        });
    } catch (error) {
        console.error("🚫 Lỗi khi phát bài:", error);
        await interaction.editReply("❌ Không thể phát bài hát này!");
        serverQueue.songs.shift();
        playSong(interaction, serverQueue.songs[0]);
    }
}
