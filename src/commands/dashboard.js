const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dashboard")
        .setDescription("🎵 Giao diện điều khiển nhạc với emoji tùy chỉnh"),

    async execute(interaction, player) {
        const queue = player.get(interaction.guildId);
        const current = queue?.current;

        const songTitle = current?.title || "Không có bài nào";
        const duration = current?.duration || "0:00";
        const position = queue?.node?.getTimestamp()?.current || "0:00";
        const thumbnail = current?.thumbnail || "https://img.icons8.com/fluency/96/music.png";
        const author = current?.author || "Không rõ";
        const url = current?.url || undefined; // sửa lỗi nếu chuỗi rỗng

        const embed = new EmbedBuilder()
            .setTitle("🎶 Now Playing")
            .setDescription(url ? `**[${songTitle}](${url})**` : `**${songTitle}**`)
            .addFields(
                { name: "Thời lượng", value: `${position} / ${duration}`, inline: true },
                { name: "Tác giả", value: author, inline: true }
            )
            .setThumbnail(thumbnail)
            .setColor("#1DB954")
            .setFooter({ text: "Fly Music Bot" });

        const playbackRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("back")
                .setEmoji("<:skipto_start:1425219099599835266>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("pause")
                .setEmoji("<:pause:1425219078301421619>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("play")
                .setEmoji("<:play:1425219051948347404>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("next")
                .setEmoji("<:rightarrow_2026932:1425234900507693066>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("stop")
                .setEmoji("<:stop:1425219037104967741>")
                .setStyle(ButtonStyle.Secondary)
        );

        const musicRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("queue")
                .setEmoji("<:bulletedlist:1425218999259762812>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("library")
                .setEmoji("<:musicalnotes:1425218950454837299>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("add")
                .setEmoji("<:plus:1425218922344484905>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("search")
                .setEmoji("<:searchv1:1425218904468357182>")
                .setStyle(ButtonStyle.Secondary)
        );

        const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("like")
                .setEmoji("<:likev1:1425218885636067349>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("volume")
                .setEmoji("<:mediumvolume:1425218870301561056>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("loop")
                .setEmoji("<:repeat:1425218857085440050>")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("247")
                .setEmoji("<:radio:1425218827079389204>")
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            embeds: [embed],
            components: [playbackRow, musicRow, controlRow],
            ephemeral: false,
        });
    },
};
