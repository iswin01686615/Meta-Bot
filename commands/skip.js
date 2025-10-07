import { SlashCommandBuilder } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";

export default {
    data: new SlashCommandBuilder()
        .setName("skip")
        .setDescription("Bỏ qua bài hát hiện tại"),

    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guild.id);
        if (!connection)
            return interaction.reply("🚫 Bot chưa phát nhạc nào!");
        connection.state.subscription.player.stop();
        interaction.reply("⏭️ Đã bỏ qua bài hát!");
    },
};
