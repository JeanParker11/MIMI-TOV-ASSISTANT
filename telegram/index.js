const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const settings = require("../settings");

const bot = new Telegraf(global.TELEGRAM_BOT_TOKEN);
const commandsPath = path.join(__dirname, "commands");

// Charger dynamiquement les commandes Telegram
fs.readdirSync(commandsPath).forEach(file => {
  if (file.endsWith(".js")) {
    const command = require(path.join(commandsPath, file));
    if (typeof command === "function") {
      command(bot);
    }
  }
});

// Lancer le bot Telegram
bot.launch().then(() => {
  console.log("✅ Bot Telegram lancé.");
});

// Watcher sur le dossier /data
const dataPath = path.join(__dirname, "..", "data");
const zipAndSend = require("./utils/zipAndSend");

chokidar.watch(dataPath, { ignoreInitial: true }).on("all", async (event, filePath) => {
  console.log(`📦 Changement détecté dans data/: ${event} -> ${filePath}`);
  await zipAndSend(bot, global.TELEGRAM_ADMIN_ID);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));