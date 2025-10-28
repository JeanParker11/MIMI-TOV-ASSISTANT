const zipAndSend = require("../utils/zipAndSend");
const settings = require("../../settings");

module.exports = (bot) => {
  bot.command("sauvegarde", async (ctx) => {
    try {
      // Vérifier si l'utilisateur est autorisé
      const userTelegramId = ctx.from.id;
      const isAuthorized = global.TELEGRAM_ADMIN_IDS.includes(userTelegramId) || 
                          global.TELEGRAM_OWNER.includes(userTelegramId);

      if (!isAuthorized) {
        return ctx.reply("❌ Vous n'êtes pas autorisé à utiliser cette commande.");
      }

      // Envoyer un message de confirmation
      await ctx.reply("🔄 Préparation de la sauvegarde en cours...");

      // Générer et envoyer la sauvegarde
      await zipAndSend(bot, ctx.chat.id);
      
      await ctx.reply("✅ Sauvegarde envoyée avec succès !");

    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde manuelle :", error);
      await ctx.reply("❌ Erreur lors de la génération de la sauvegarde. Vérifiez les logs.");
    }
  });

  // Commande pour envoyer la sauvegarde à tous les admins
  bot.command("sauvegardeall", async (ctx) => {
    try {
      // Vérifier si l'utilisateur est le owner
      const userTelegramId = ctx.from.id;
      const isOwner = global.TELEGRAM_OWNER.includes(userTelegramId);

      if (!isOwner) {
        return ctx.reply("❌ Cette commande est réservée au propriétaire du bot.");
      }

      await ctx.reply(`🔄 Envoi de la sauvegarde à ${global.TELEGRAM_ADMIN_IDS.length} destinataires...`);

      let successCount = 0;
      let failCount = 0;

      // Envoyer à tous les admins
      for (const adminId of global.TELEGRAM_ADMIN_IDS) {
        try {
          await zipAndSend(bot, adminId);
          successCount++;
          console.log(`✅ Sauvegarde envoyée à ${adminId}`);
        } catch (error) {
          failCount++;
          console.error(`❌ Erreur envoi à ${adminId}:`, error.message);
        }
      }

      await ctx.reply(`📊 Résumé de l'envoi :\n✅ ${successCount} réussis\n❌ ${failCount} échecs`);

    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde globale :", error);
      await ctx.reply("❌ Erreur lors de l'envoi global de la sauvegarde.");
    }
  });

  // Commande pour voir la liste des destinataires
  bot.command("destinataires", async (ctx) => {
    try {
      const userTelegramId = ctx.from.id;
      const isAuthorized = global.TELEGRAM_ADMIN_IDS.includes(userTelegramId) || 
                          global.TELEGRAM_OWNER.includes(userTelegramId);

      if (!isAuthorized) {
        return ctx.reply("❌ Vous n'êtes pas autorisé à utiliser cette commande.");
      }

      const destinatairesList = global.TELEGRAM_ADMIN_IDS.map(id => `• ${id}`).join('\n');
      
      await ctx.reply(`📋 Liste des destinataires de sauvegarde (${global.TELEGRAM_ADMIN_IDS.length}) :\n\n${destinatairesList}\n\n👤 Votre ID : ${userTelegramId}`);

    } catch (error) {
      console.error("❌ Erreur commande destinataires :", error);
      await ctx.reply("❌ Erreur lors de la récupération des destinataires.");
    }
  });
};