const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pause")
        .setDescription("Tạm dừng bài hát hiện tại"),

    async execute(interaction, player) {
        const queue = player.get(interaction.guild.id);

        if (!queue || !queue.isPlaying) {
            return interaction.reply({ content: "❌ | Không có bài nào đang phát", ephemeral: true });
        }

        queue.pause();
        interaction.reply("⏸ | Đã tạm dừng phát nhạc.");
    },
};
