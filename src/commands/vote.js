const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("vote")
        .setDescription("Vote để skip bài hát hiện tại"),

    async execute(interaction, player) {
        const queue = player.get(interaction.guild.id);

        if (!queue || !queue.currentTrack) {
            return interaction.reply({ content: "❌ Không có bài nào đang phát", ephemeral: true });
        }

        const voteMsg = await interaction.reply({
            content: "🗳 | Bỏ phiếu **bỏ qua bài hát này**? (👍 = Đồng ý, 👎 = Không đồng ý)",
            fetchReply: true,
        });

        await voteMsg.react("👍");
        await voteMsg.react("👎");

        const filter = (reaction, user) =>
            ["👍", "👎"].includes(reaction.emoji.name) && !user.bot;

        const collector = voteMsg.createReactionCollector({ filter, time: 15000 });

        const userVotes = new Set();
        let votes = { up: 0, down: 0 };

        collector.on("collect", (reaction, user) => {
            if (userVotes.has(user.id)) return;
            userVotes.add(user.id);

            if (reaction.emoji.name === "👍") votes.up++;
            else if (reaction.emoji.name === "👎") votes.down++;
        });

        collector.on("end", async () => {
            let resultMsg = `📊 | Kết quả vote: 👍 ${votes.up} | 👎 ${votes.down}\n`;

            if (votes.up > votes.down) {
                try {
                    await queue.skip();
                    resultMsg += "✅ Đa số đồng ý. Đã bỏ qua bài hát.";
                } catch (err) {
                    console.error(err);
                    resultMsg += "⚠️ Gặp lỗi khi bỏ qua bài hát.";
                }
            } else {
                resultMsg += "❌ Đa số không đồng ý. Tiếp tục phát bài hát.";
            }

            interaction.followUp({ content: resultMsg });
        });
    },
};
