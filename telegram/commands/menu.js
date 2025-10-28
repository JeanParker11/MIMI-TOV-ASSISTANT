const fs = require("fs");
const path = require("path");

module.exports = (bot) => {
  bot.command("menu", async (ctx) => {
    try {
      const botName = global.botname || "ᴘᴀʀᴋʏ-ᴍᴅ";
      const version = global.botversion || "2.0.0";
      const ownerName = global.ownername || "Jean Parker 🐼";
      
      // Compter les commandes disponibles
      const commandsPath = path.join(__dirname, "../../commands");
      const commandCount = fs.existsSync(commandsPath) 
        ? fs.readdirSync(commandsPath).filter(f => f.endsWith('.js')).length 
        : 0;

      const menuText = `
┏━━━━━━━━━━━━━━━━━⊷
┃ 🤖 ${botName}
┣━━━━━━━━━━━━━━━━━⊷
┃ 📱 *Version* : ${version}
┃ 👤 *Créateur* : ${ownerName}
┃ 🔧 *Commandes* : ${commandCount}
┃ 🧠 *IA* : Gemini AI
┃ 📊 *Plateforme* : Telegram
┗━━━━━━━━━━━━━━━━━⊷

🎮 *COMMANDES PRINCIPALES*

/aide - Liste complète des commandes
/sauvegarde - Télécharger les données
/stats - Statistiques du bot
/ping - Test de latence
/menu - Afficher ce menu

🌟 *FONCTIONNALITÉS*

✅ Gestion des quiz manga/anime
✅ Assistant IA Gemini intégré
✅ Sauvegarde automatique
✅ Interface web complète
✅ API publique disponible
✅ Support multi-plateforme

🔗 *LIENS UTILES*

• Interface Web : Disponible sur le serveur
• API Documentation : /api/docs
• GitHub : https://github.com/JeanParker11/PARKY-MD

💡 *ASTUCE* : Utilisez /aide pour voir toutes les commandes disponibles avec leurs descriptions détaillées.

Propulsé par Gemini AI 🚀
      `.trim();

      await ctx.reply(menuText, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error("Erreur menu.js :", error);
      await ctx.reply("❌ Une erreur est survenue lors de l'affichage du menu.");
    }
  });
};