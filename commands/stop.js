import { SlashCommandBuilder } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";

export default {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Dừng phát nhạc và rời kênh thoại"),

    async execute(interaction) {
        const connection = getVoiceConnection(interaction.guild.id);
        if (!connection)
            return interaction.reply("🚫 Bot không trong kênh thoại!");
        connection.destroy();
        interaction.reply("🛑 Đã dừng phát nhạc!");
    },
};
