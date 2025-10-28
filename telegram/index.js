const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const settings = require("../settings");

const bot = new Telegraf(global.TELEGRAM_BOT_TOKEN);
const commandsPath = path.join(__dirname, "commands");

// DEBUG de l'initialisation
console.log("🔍 DEBUG - TELEGRAM_ADMIN_ID:", global.TELEGRAM_ADMIN_ID);
console.log("🔍 DEBUG - TELEGRAM_ADMIN_IDS:", global.TELEGRAM_ADMIN_IDS);

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
  
  // CORRECTION: Utiliser TELEGRAM_ADMIN_IDS au lieu de TELEGRAM_ADMIN_ID
  const chatIds = global.TELEGRAM_ADMIN_IDS || [];
  
  if (chatIds.length === 0) {
    console.error("❌ Aucun TELEGRAM_ADMIN_IDS défini");
    return;
  }

  // Envoyer à tous les administrateurs
  for (const chatId of chatIds) {
    try {
      console.log(`📤 Envoi sauvegarde à: ${chatId}`);
      await zipAndSend(bot, chatId);
      console.log(`✅ Sauvegarde envoyée à ${chatId}`);
    } catch (err) {
      console.error(`❌ Erreur envoi à ${chatId}:`, err.message);
    }
  }
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));