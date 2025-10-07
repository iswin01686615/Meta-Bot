import { Client, GatewayIntentBits, Collection } from "discord.js";
import "dotenv/config";
import fs from "fs";
import path from "path";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();

// Load commands từ thư mục /commands
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    client.commands.set(command.default.data.name, command.default);
}

client.once("clientReady", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: "❌ Có lỗi khi xử lý lệnh!", ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);