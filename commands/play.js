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
// 🔧 Gắn cookie YouTube (nếu có)
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

            // ==============================
            // 🔍 Kiểm tra query là link hay từ khoá
            // ==============================
            if (play.yt_validate(query) === "video") {
                songInfo = await play.video_info(query);
                videoUrl = songInfo.video_details.url || query;
            } else {
                const searched = await play.search(query, { limit: 1 });
                if (!searched.length) {
                    return interaction.editReply("❌ Không tìm thấy bài hát nào.");
                }

                // Fix “undefined URL” — tự build lại link nếu thiếu
                const first = searched[0];
                videoUrl = first.url || `https://www.youtube.com/watch?v=${first.id}`;
                songInfo = await play.video_info(videoUrl);
            }

            const song = {
                title: songInfo.video_details.title,
                url: videoUrl,
                duration: songInfo.video_details.durationRaw,
            };

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
// 🎵 Hàm phát nhạc chính
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
        await interaction.editReply("⚠️ Không thể phát bài hát này!");
        serverQueue.songs.shift();
        playSong(interaction, serverQueue.songs[0]);
    }
}
