const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Xem hàng đợi hiện tại"),

    async execute(interaction, player) {
        const queue = player.get(interaction.guild.id);

        // Kiểm tra queue hợp lệ
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                content: "❌ | Không có bài nào đang phát",
                ephemeral: true,
            });
        }

        const current = queue.currentTrack;
        // Tùy lib — có thể là queue.tracks, queue.upcomingTracks hoặc cả hai
        const upcoming = queue.tracks?.toArray?.() ?? queue.upcomingTracks ?? [];

        let desc = `🎶 **Đang phát:** ${current.title}\n\n`;

        if (upcoming.length > 0) {
            desc += `📜 **Hàng đợi tiếp theo:**\n`;
            desc += upcoming
                .slice(0, 10)
                .map((t, i) => `${i + 1}. ${t.title}`)
                .join("\n");
        } else {
            desc += "🎶 Không có bài tiếp theo.";
        }

        return interaction.reply({ content: desc });
    },
};
