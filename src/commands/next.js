const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("next")
        .setDescription("Chuyển sang bài hát tiếp theo"),

    async execute(interaction, player) {
        const queue = player.get(interaction.guild.id);

        if (!queue || !queue.isPlaying) {
            return interaction.reply({ content: "❌ | Không có bài nào đang phát.", ephemeral: true });
        }

        // Đảm bảo metadata tồn tại
        if (!queue.metadata) queue.metadata = {};
        if (!queue.metadata.forwardTracks) queue.metadata.forwardTracks = [];
        if (!queue.metadata.previousTracks) queue.metadata.previousTracks = [];

        // 🔁 Nếu có bài trong forwardTracks thì phát lại bài đó
        if (queue.metadata.forwardTracks.length > 0) {
            const nextTrack = queue.metadata.forwardTracks.pop();

            if (queue.currentTrack) {
                queue.metadata.previousTracks.push(queue.currentTrack);
            }

            await queue.stop();
            await queue.play(nextTrack);
            return interaction.reply(`⏭ | Đang phát lại bài: **${nextTrack.title}**`);
        }

        // ⏭ Nếu không còn bài trong forwardTracks thì skip như thường
        if (!queue.upcomingTracks || queue.upcomingTracks.length === 0) {
            // await queue.stop(); // Dừng luôn queue nếu hết bài
            return interaction.reply("📭 | Không còn bài hát nào trong hàng đợi.");
        }

        // Lưu bài hiện tại trước khi skip
        if (queue.currentTrack) {
            queue.metadata.previousTracks.push(queue.currentTrack);
        }

        await queue.skip();
        interaction.reply("⏭ | Đã chuyển sang bài tiếp theo!");
    },
};
