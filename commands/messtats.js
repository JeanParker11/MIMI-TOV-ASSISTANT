/**
 * COMMANDE STATS - Affiche les statistiques de combat
 */

const combatStats = require('../lib/combatStats');

module.exports = {
  name: 'messtats',
  description: 'Affiche vos statistiques de combat détaillées',
  category: 'Combat',
  aliases: ['statistiques', 'palmares'],
  
  execute: async (sock, msg, args) => {
    const userId = msg.key.remoteJid.endsWith('@g.us') 
      ? msg.key.participant 
      : msg.key.remoteJid;
    const chatId = msg.key.remoteJid;
    
    // Obtenir le profil du joueur
    const profile = combatStats.getPlayerProfile(userId);
    
    if (!profile) {
      await sock.sendMessage(chatId, { 
        text: "❌ Vous n'avez pas encore de statistiques de combat.\nParticipez à votre premier combat pour commencer!" 
      });
      return;
    }
    
    // Construire le message de stats
    let message = `╔══════════════════════════════╗\n`;
    message += `║    📊 **VOS STATISTIQUES** 📊    ║\n`;
    message += `╚══════════════════════════════╝\n\n`;
    
    message += `**${profile.titre}**\n\n`;
    
    message += `⚔️ **RÉSUMÉ GÉNÉRAL**\n`;
    message += `• Combats: ${profile.resume.combats}\n`;
    message += `• Victoires: ${profile.resume.victoires}\n`;
    message += `• Taux de victoire: ${profile.resume.taux_victoire}\n`;
    message += `• Série actuelle: ${profile.resume.serie_actuelle} ${profile.resume.serie_actuelle >= 3 ? '🔥' : ''}\n\n`;
    
    message += `💥 **STATISTIQUES DE COMBAT**\n`;
    message += `• Dégâts moyens/combat: ${profile.combat.degats_moyens}\n`;
    message += `• Précision: ${profile.combat.precision}\n`;
    message += `• Taux d'esquive: ${profile.combat.taux_esquive}\n`;
    message += `• Distance moyenne: ${profile.combat.distance_moyenne}\n\n`;
    
    message += `🏆 **RECORDS PERSONNELS**\n`;
    if (profile.records.victoire_plus_rapide) {
      message += `• Victoire la plus rapide: ${profile.records.victoire_plus_rapide} tours\n`;
    }
    if (profile.records.combat_plus_long) {
      message += `• Combat le plus long: ${profile.records.combat_plus_long} tours\n`;
    }
    if (profile.records.pv_restants_max > 0) {
      message += `• PV max restants: ${profile.records.pv_restants_max}/100\n`;
    }
    if (profile.records.degats_un_tour_max > 0) {
      message += `• Dégâts max en un tour: ${profile.records.degats_un_tour_max}\n`;
    }
    
    message += `\n🎖️ **ACHIEVEMENTS**: ${profile.achievements} débloqués\n`;
    
    // Commande pour voir les achievements détaillés
    if (args[0] === 'achievements' || args[0] === 'ach') {
      const stats = combatStats.stats[userId];
      if (stats && stats.achievements && stats.achievements.length > 0) {
        message += `\n📜 **VOS ACHIEVEMENTS:**\n`;
        stats.achievements.forEach(ach => {
          message += `• **${ach.nom}** - ${ach.description}\n`;
          message += `  Obtenu le: ${new Date(ach.date_obtention).toLocaleDateString()}\n`;
        });
      }
    } else if (profile.achievements > 0) {
      message += `\n💡 Utilisez \`!messtats achievements\` pour voir vos achievements détaillés`;
    }
    
    await sock.sendMessage(chatId, { text: message });
  }
};
