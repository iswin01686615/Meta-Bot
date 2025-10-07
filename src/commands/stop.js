const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Dừng phát nhạc và xoá hàng đợi"),

    async execute(interaction, player) {
        const queue = player.get(interaction.guild.id);

        if (!queue || !queue.isPlaying) {
            return interaction.reply({ content: "❌ | Không có bài nào đang phát.", ephemeral: true });
        }

        await queue.stop(); // Dừng queue
        interaction.reply("⏹️ | Đã dừng phát nhạc và xoá hàng đợi.");
    },
};
