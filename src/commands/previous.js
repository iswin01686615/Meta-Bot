const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("previous")
        .setDescription("Phát lại bài hát trước đó"),

    async execute(interaction, player) {
        const queue = player.get(interaction.guild.id);
        if (!queue || !queue.isPlaying) {
            return interaction.reply({ content: "❌ | Không có bài nào đang phát", ephemeral: true });
        }

        if (!queue.metadata) queue.metadata = {};
        if (!queue.metadata.previousTracks) queue.metadata.previousTracks = [];
        if (!queue.metadata.forwardTracks) queue.metadata.forwardTracks = [];

        // Kiểm tra có bài trước không
        if (queue.metadata.previousTracks.length === 0) {
            return interaction.reply({ content: "📭 | Không có bài trước nào trong lịch sử", ephemeral: true });
        }

        const previousTrack = queue.metadata.previousTracks.pop();

        if (queue.currentTrack) {
            queue.metadata.forwardTracks.push(queue.currentTrack);
        }

        await queue.stop();
        await queue.play(previousTrack);

        interaction.reply(`⏮️ | Đang phát lại: **${previousTrack.title}**`);
    },
};
