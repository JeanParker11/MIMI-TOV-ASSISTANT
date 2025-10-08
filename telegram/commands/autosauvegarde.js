const fs = require("fs");
const path = require("path");
const zipAndSend = require("../utils/zipAndSend");
const settings = require("../../settings");

let timer = null;

module.exports = (bot) => {
  const dataFolder = path.join(__dirname, "../../data");
  const chatId = global.TELEGRAM_ADMIN_ID; // L'ID Telegram du propriétaire à qui envoyer la sauvegarde

  if (!chatId) {
    console.warn("⚠️ Aucun ID d'utilisateur défini dans settings.owner pour les sauvegardes automatiques.");
    return;
  }

  fs.readdirSync(dataFolder).forEach((file) => {
    const filePath = path.join(dataFolder, file);

    if (path.extname(filePath) === ".json") {
      fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          console.log(`[📂] Changement détecté dans ${file}`);

          if (timer) clearTimeout(timer);
          timer = setTimeout(async () => {
            try {
              await zipAndSend(bot, chatId);
              console.log("✅ Sauvegarde automatique envoyée.");
            } catch (err) {
              console.error("❌ Erreur d'envoi automatique :", err);
            }
          }, 2000);
        }
      });
    }
  });

  console.log("Database de sauvegarde activée ! 📥.");
};