const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Phát nhạc từ URL hoặc từ khoá tìm kiếm")
        .addStringOption(option =>
            option.setName("query")
                .setDescription("YouTube / Spotify / SoundCloud URL hoặc từ khóa")
                .setRequired(true)
        ),

    async execute(interaction, player) {
        const query = interaction.options.getString("query");
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: "❌ | You must be in a voice channel", ephemeral: true });
        }

        const queue = player.create(interaction.guild.id, {
            metadata: {
                channel: interaction.channel,
                is247: true,
            },
            selfDeaf: true,
        });

        try {
            await interaction.deferReply();

            if (!queue.connection) {
                await queue.connect(voiceChannel);
            }

            const success = await queue.play(query);

            if (success) {
                console.log("▶️ Playing:", queue.currentTrack?.title || "N/A");
                console.log("🎶 Queue:", queue.upcomingTracks.map((t, i) => `${i + 1}. ${t.title}`));
                return interaction.editReply(`▶ | Playing: **${queue.currentTrack?.title}**`);
            } else {
                return interaction.editReply("❌ | Could not play the track.");
            }

        } catch (error) {
            console.error("❌ Error playing track:", error);
            return interaction.editReply("❌ | Error playing the track.");
        }
    }
};
