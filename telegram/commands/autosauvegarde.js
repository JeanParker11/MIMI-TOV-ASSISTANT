const fs = require("fs");
const path = require("path");
const zipAndSend = require("../utils/zipAndSend");

let timer = null;
let isProcessing = false;

module.exports = (bot) => {
  const dataFolder = path.join(__dirname, "../../data");
  const chatIds = global.TELEGRAM_ADMIN_IDS || [];

  if (!chatIds.length) {
    console.warn("⚠️ Aucun ID d'utilisateur défini dans settings.TELEGRAM_ADMIN_IDS pour les sauvegardes automatiques.");
    return;
  }

  // Vérifier que le dossier data existe
  if (!fs.existsSync(dataFolder)) {
    console.warn("⚠️ Le dossier data n'existe pas");
    return;
  }

  console.log(`🔍 Surveillance du dossier: ${dataFolder}`);
  console.log(`📋 Destinataires: ${chatIds.join(', ')}`);

  fs.readdirSync(dataFolder).forEach((file) => {
    const filePath = path.join(dataFolder, file);

    if (path.extname(filePath) === ".json") {
      fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime && !isProcessing) {
          console.log(`[📂] Changement détecté dans ${file}`);

          if (timer) clearTimeout(timer);
          timer = setTimeout(async () => {
            isProcessing = true;
            
            try {
              // Envoi à tous les IDs avec gestion d'erreur individuelle
              const sendPromises = chatIds.map(async (chatId) => {
                try {
                  console.log(`📤 Tentative d'envoi à ${chatId}`);
                  await zipAndSend(bot, chatId);
                  console.log(`✅ Sauvegarde automatique envoyée à ${chatId}`);
                  return { success: true, chatId };
                } catch (err) {
                  console.error(`❌ Erreur d'envoi à ${chatId} :`, err.message);
                  return { success: false, chatId, error: err.message };
                }
              });

              const results = await Promise.allSettled(sendPromises);
              const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
              const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
              
              console.log(`📊 Résumé sauvegarde : ${successful} réussis, ${failed} échecs`);
            } catch (err) {
              console.error("❌ Erreur générale d'envoi :", err);
            } finally {
              isProcessing = false;
            }
          }, 2000);
        }
      });
    }
  });

  console.log(`✅ Surveillance de sauvegarde activée pour ${chatIds.length} destinataires !`);
};