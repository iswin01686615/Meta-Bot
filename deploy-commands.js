require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

// Lấy dữ liệu commands từ thư mục src/commands
const commands = [];
const commandsPath = path.join(__dirname, "src", "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command.data) {
        console.log("🧾 Đăng ký:", command.data.name);
        commands.push(command.data.toJSON());
    } else {
        console.warn(`⚠️ Bỏ qua ${file} vì thiếu .data`);
    }
}

// REST client
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

// Deploy commands theo GUILD để thấy ngay
(async () => {
    try {
        console.log("🔄 Đang deploy slash commands (guild)...");

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log("✅ Đã deploy lệnh cho guild thành công.");
    } catch (error) {
        console.error("❌ Lỗi khi deploy:", error);
    }
})();
