require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
    Client,
    Collection,
    GatewayIntentBits,
    REST,
    Routes,
} = require("discord.js");
const { player } = require("./player");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.commands = new Collection();

// 타락 목록 불러오기
const commands = [];
const commandFiles = fs
    .readdirSync(path.join(__dirname, "commands"))
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (!command.data || !command.execute) {
        console.warn(`⚠️ Bỏ qua file ${file} vì thiếu \"data\" hoặc \"execute\"`);
        continue;
    }
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

// 라이브에 스래쉬 컨머드 등록
client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log("🔄 Đăng ký Slash Commands...");
        await rest.put(Routes.applicationCommands(client.user.id), {
            body: commands,
        });
        console.log("✅ Đăng ký Slash Commands thành công.");
    } catch (error) {
        console.error("❌ Lỗi khi đăng ký Slash Commands:", error);
    }
});

// 처리 Slash Command + Button Interaction
client.on("interactionCreate", async (interaction) => {
    // Slash Command
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            return interaction.reply({
                content: "❌ Không tìm thấy lệnh.",
                ephemeral: true,
            });
        }

        try {
            await command.execute(interaction, player);
        } catch (err) {
            console.error(err);
            await interaction.reply({
                content: "❌ Có lỗi khi thực hiện lệnh.",
                ephemeral: true,
            });
        }
    }

    // Button Interaction
    if (interaction.isButton()) {
        try {
            const handleButtons = require("./events/interaction-handler");
            await handleButtons(client, interaction, player);
        } catch (err) {
            console.error("❌ Lỗi khi xử lý nút:", err);
            if (!interaction.replied) {
                await interaction.reply({
                    content: "❌ Có lỗi khi xử lý nút.",
                    ephemeral: true,
                });
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);