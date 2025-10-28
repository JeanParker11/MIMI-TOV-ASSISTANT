const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

let zipEnvoye = false;

module.exports = async (bot, chatId) => {
  // Vérifier que chatId est défini
  if (!chatId) {
    console.error("❌ chatId est undefined dans zipAndSend");
    return;
  }

  if (zipEnvoye) {
    console.log("⚠️ Le fichier ZIP a déjà été envoyé.");
    return;
  }
  zipEnvoye = true;

  const zipName = global.BACKUP_ZIP_NAME || "data.zip";
  const zipPath = path.resolve(zipName);
  const sourceDir = path.resolve(global.BACKUP_PATH || "./data");

  // Vérifier que le répertoire source existe
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Le répertoire source n'existe pas: ${sourceDir}`);
    zipEnvoye = false;
    return;
  }

  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on("close", async () => {
      try {
        console.log(`📤 Envoi du ZIP à chat_id: ${chatId}`);
        
        await bot.telegram.sendDocument(chatId, {
          source: fs.readFileSync(zipPath),
          filename: zipName
        });

        console.log(`✅ ${zipName} envoyé avec succès à Telegram.`);

        fs.unlink(zipPath, (err) => {
          if (err) console.error("❌ Erreur suppression du fichier ZIP :", err);
          else console.log("🧹 Fichier ZIP supprimé après envoi.");
        });
        
        zipEnvoye = false;
        resolve();
      } catch (err) {
        console.error("❌ Erreur lors de l'envoi à Telegram :", err);
        zipEnvoye = false;
        reject(err);
      }
    });

    archive.on("error", (err) => {
      console.error("❌ Erreur d'archivage :", err);
      zipEnvoye = false;
      reject(err);
    });

    archive.pipe(output);
    
    // Vérifier s'il y a des fichiers à archiver
    if (fs.existsSync(sourceDir) && fs.readdirSync(sourceDir).length > 0) {
      archive.directory(sourceDir, false);
      archive.finalize();
    } else {
      console.log("⚠️ Aucun fichier à archiver dans le dossier data");
      zipEnvoye = false;
      resolve();
    }
  });
};