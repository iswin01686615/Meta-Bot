import { SlashCommandBuilder } from "discord.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } from "@discordjs/voice";
import play from "play-dl";

const queue = new Map();

export default {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Phát nhạc từ YouTube (link hoặc tên bài hát)")
        .addStringOption(option =>
            option.setName("query")
                .setDescription("Link hoặc tên bài hát")
                .setRequired(true)
        ),

    async execute(interaction) {
        const query = interaction.options.getString("query");
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel)
            return interaction.reply("🚫 Bạn phải vào kênh thoại trước!");

        await interaction.deferReply();

        let songInfo;
        if (play.yt_validate(query) === "video") {
            songInfo = await play.video_info(query);
        } else {
            const searched = await play.search(query, { limit: 1 });
            songInfo = await play.video_info(searched[0].url);
        }

        const song = {
            title: songInfo.video_details.title,
            url: songInfo.video_details.url,
            duration: songInfo.video_details.durationRaw,
        };

        const serverQueue = queue.get(interaction.guild.id);

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

            try {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                });

                queueConstruct.connection = connection;
                playSong(interaction.guild, queueConstruct.songs[0]);
                interaction.followUp(`🎵 Đang phát: **${song.title}**`);
            } catch (err) {
                console.error(err);
                queue.delete(interaction.guild.id);
                return interaction.followUp("❌ Lỗi khi kết nối kênh thoại!");
            }
        } else {
            serverQueue.songs.push(song);
            return interaction.followUp(`✅ Thêm vào hàng chờ: **${song.title}**`);
        }
    },
};

async function playSong(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.connection.destroy();
        queue.delete(guild.id);
        return;
    }

    const stream = await play.stream(song.url);
    const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
    });

    serverQueue.player.play(resource);
    serverQueue.connection.subscribe(serverQueue.player);

    serverQueue.player.on(AudioPlayerStatus.Idle, () => {
        serverQueue.songs.shift();
        playSong(guild, serverQueue.songs[0]);
    });
}
