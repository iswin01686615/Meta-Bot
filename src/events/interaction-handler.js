module.exports = async (client, interaction, player) => {
    if (!interaction.isButton()) return;

    const queue = player.get(interaction.guildId);
    if (!queue) {
        return interaction.reply({ content: "❌ | Không có bài nào đang phát.", ephemeral: true });
    }

    try {
        switch (interaction.customId) {
            case "play":
                await queue.node.resume();
                await interaction.reply({ content: "▶️ | Đã tiếp tục phát.", ephemeral: true });
                break;

            case "pause":
                await queue.node.pause();
                await interaction.reply({ content: "⏸️ | Đã tạm dừng.", ephemeral: true });
                break;

            case "stop":
                await queue.node.stop();
                await interaction.reply({ content: "⏹️ | Đã dừng phát nhạc.", ephemeral: true });
                break;

            case "next":
                await queue.node.skip();
                await interaction.reply({ content: "⏭️ | Đã chuyển sang bài tiếp theo.", ephemeral: true });
                break;

            case "back":
                await queue.node.back();
                await interaction.reply({ content: "⏮️ | Đã quay lại bài trước.", ephemeral: true });
                break;

            case "queue":
                const upcoming = queue.tracks.toArray();
                if (!upcoming.length) {
                    await interaction.reply({ content: "📜 | Hàng đợi trống.", ephemeral: true });
                } else {
                    const list = upcoming.slice(0, 10).map((t, i) => `${i + 1}. ${t.title}`).join("\n");
                    await interaction.reply({ content: `📜 | Hàng đợi:\n${list}`, ephemeral: true });
                }
                break;

            case "loop":
                const mode = queue.repeatMode === 0 ? 1 : 0;
                queue.setRepeatMode(mode);
                await interaction.reply({ content: mode ? "🔁 | Bật lặp lại." : "🔁 | Tắt lặp lại.", ephemeral: true });
                break;

            case "like":
                await interaction.reply({ content: "❤️ | Đã thêm vào mục yêu thích (giả lập).", ephemeral: true });
                break;

            case "add":
                await interaction.reply({ content: "➕ | Chức năng thêm bài chưa được hỗ trợ ở đây.", ephemeral: true });
                break;

            case "search":
                await interaction.reply({ content: "🔍 | Gõ `/play` để tìm bài hát mới.", ephemeral: true });
                break;

            case "volume":
                await interaction.reply({ content: "🔊 | Hiện không hỗ trợ thay đổi âm lượng bằng nút.", ephemeral: true });
                break;

            case "247":
                await interaction.reply({ content: "📻 | Chức năng 24/7 chưa bật.", ephemeral: true });
                break;

            case "library":
            case "history":
            case "recent":
                await interaction.reply({ content: "📁 | Tính năng thư viện đang phát triển.", ephemeral: true });
                break;

            default:
                await interaction.reply({ content: "❓ | Nút không rõ chức năng.", ephemeral: true });
        }
    } catch (err) {
        console.error("❌ Lỗi xử lý interaction:", err);
        await interaction.reply({ content: "⚠️ | Có lỗi xảy ra khi xử lý.", ephemeral: true });
    }
};
