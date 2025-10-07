import { SlashCommandBuilder } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";

export default {
    data: new SlashCommandBuilder()
        .setName("resume")
        .setDescription("Tiếp tục phát nhạc"),

    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guild.id);
        if (!connection)
            return interaction.reply("🚫 Bot chưa phát nhạc nào!");
        connection.state.subscription.player.unpause();
        interaction.reply("▶️ Tiếp tục phát nhạc!");
    },
};
