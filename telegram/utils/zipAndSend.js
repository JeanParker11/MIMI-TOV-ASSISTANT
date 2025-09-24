const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

let zipEnvoye = false;

module.exports = async (bot, chatId) => {
  if (zipEnvoye) {
    console.log("⚠️ Le fichier ZIP a déjà été envoyé.");
    return;
  }
  zipEnvoye = true;

  const zipName = global.BACKUP_ZIP_NAME || "data.zip";
  const zipPath = path.resolve(zipName);
  const sourceDir = path.resolve(global.BACKUP_PATH || "./data");

  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", async () => {
    try {
      await bot.telegram.sendDocument(chatId, {
        source: zipPath,
        filename: zipName
      });

      console.log(`✅ ${zipName} envoyé avec succès à Telegram.`);

      fs.unlink(zipPath, (err) => {
        if (err) console.error("❌ Erreur suppression du fichier ZIP :", err);
        else console.log("🧹 Fichier ZIP supprimé après envoi.");
      });
    } catch (err) {
      console.error("❌ Erreur lors de l’envoi à Telegram :", err);
    }
  });

  archive.on("error", (err) => {
    console.error("❌ Erreur d’archivage :", err);
  });

  archive.pipe(output);
  archive.directory(sourceDir, false);
  archive.finalize();
};