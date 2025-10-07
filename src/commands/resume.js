const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resume")
        .setDescription("Tiếp tục phát bài hát đang dừng"),

    async execute(interaction, player) {
        const queue = player.get(interaction.guild.id);
        if (!queue || !queue.isPaused) {
            return interaction.reply({ content: "❌ | Nhạc chưa được tạm dừng", ephemeral: true });
        }

        queue.resume();
        interaction.reply("▶ | Đã tiếp tục phát nhạc.");
    },
};
