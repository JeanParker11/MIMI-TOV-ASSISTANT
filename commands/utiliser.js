/**
 * COMMANDE UTILISER - Utilise un objet consommable
 */

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'utiliser',
  description: 'Utilise un objet consommable',
  category: 'Combat',
  aliases: ['use', 'consommer'],
  
  execute: async (sock, msg, args) => {
    const userId = msg.key.remoteJid.endsWith('@g.us') 
      ? msg.key.participant 
      : msg.key.remoteJid;
    const chatId = msg.key.remoteJid;
    
    // Vérifier si le joueur est en combat
    const activeCombats = require('../lib/combatManager').activeCombats || {};
    const combat = Object.values(activeCombats).find(c => 
      c.joueurs.some(j => j.id === userId)
    );
    
    if (!combat) {
      await sock.sendMessage(chatId, { 
        text: "❌ Vous devez être en combat pour utiliser un consommable!" 
      });
      return;
    }
    
    // Vérifier si c'est le tour du joueur
    if (combat.joueurActif.id !== userId) {
      await sock.sendMessage(chatId, { 
        text: "❌ Ce n'est pas votre tour!" 
      });
      return;
    }
    
    // Charger l'inventaire
    const inventairePath = path.join(__dirname, '../data/inventaires.json');
    let inventaires = {};
    if (fs.existsSync(inventairePath)) {
      inventaires = JSON.parse(fs.readFileSync(inventairePath, 'utf8'));
    }
    
    if (!inventaires[userId] || !inventaires[userId].consommables || inventaires[userId].consommables.length === 0) {
      await sock.sendMessage(chatId, { 
        text: "❌ Vous n'avez aucun consommable dans votre inventaire!" 
      });
      return;
    }
    
    const consommables = inventaires[userId].consommables;
    
    // Si pas d'argument, afficher la liste
    if (!args[0]) {
      let message = "🧪 **VOS CONSOMMABLES:**\n\n";
      consommables.forEach((item, index) => {
        message += `${index + 1}. **${item.nom}**\n`;
        message += `   ${item.description}\n\n`;
      });
      message += "Utilisez `!utiliser [numéro]` pour consommer un objet";
      
      await sock.sendMessage(chatId, { text: message });
      return;
    }
    
    // Utiliser le consommable
    const index = parseInt(args[0]) - 1;
    if (isNaN(index) || index < 0 || index >= consommables.length) {
      await sock.sendMessage(chatId, { 
        text: "❌ Numéro invalide!" 
      });
      return;
    }
    
    const item = consommables[index];
    const joueur = combat.joueurs.find(j => j.id === userId);
    
    // Appliquer les effets
    let messageEffet = `✨ Vous utilisez **${item.nom}**!\n\n`;
    
    if (item.effet) {
      // Effet de soin
      if (item.effet.pv) {
        const pvAvant = joueur.statsActuelles.pv;
        joueur.statsActuelles.pv = Math.min(100, joueur.statsActuelles.pv + item.effet.pv);
        const pvGagnes = joueur.statsActuelles.pv - pvAvant;
        messageEffet += `💚 +${pvGagnes} PV (${joueur.statsActuelles.pv}/100)\n`;
      }
      
      // Effet de buff
      if (item.effet.force) {
        joueur.statsActuelles.pf = (joueur.statsActuelles.pf || joueur.statsInitiales.force) + item.effet.force;
        messageEffet += `💪 Force +${item.effet.force} pendant ${item.effet.duree || 3} tours\n`;
        
        // Ajouter un statut temporaire
        if (!joueur.buffs) joueur.buffs = [];
        joueur.buffs.push({
          type: 'force',
          valeur: item.effet.force,
          tours_restants: item.effet.duree || 3
        });
      }
      
      if (item.effet.vitesse) {
        joueur.statsActuelles.vitesse = (joueur.statsActuelles.vitesse || joueur.statsInitiales.vitesse) + item.effet.vitesse;
        messageEffet += `⚡ Vitesse +${item.effet.vitesse}\n`;
      }
      
      if (item.effet.pm) {
        joueur.points_mouvement.actuels += item.effet.pm;
        joueur.points_mouvement.max += item.effet.pm;
        messageEffet += `🏃 PM +${item.effet.pm}\n`;
      }
      
      // Retrait de statuts
      if (item.effet.retire_statut && Array.isArray(item.effet.retire_statut)) {
        item.effet.retire_statut.forEach(statut => {
          const index = joueur.statuts.indexOf(statut);
          if (index > -1) {
            joueur.statuts.splice(index, 1);
            messageEffet += `🧹 ${statut} retiré!\n`;
          }
        });
      }
    }
    
    // Retirer l'objet de l'inventaire
    consommables.splice(index, 1);
    fs.writeFileSync(inventairePath, JSON.stringify(inventaires, null, 2));
    
    // Logger l'utilisation
    if (combat.logger) {
      combat.logger.log('CONSOMMABLE', {
        joueur_id: userId,
        item: item.nom,
        effets: item.effet,
        tour: combat.tour
      });
    }
    
    await sock.sendMessage(chatId, { text: messageEffet });
    
    // Considérer comme une action (passer le tour)
    setTimeout(() => {
      sock.sendMessage(chatId, { 
        text: "⏭️ Votre tour se termine après utilisation du consommable." 
      });
      
      // Passer au joueur suivant
      const adversaire = combat.joueurs.find(j => j.id !== userId);
      combat.joueurActif = adversaire;
      require('../lib/combatManager').demarrerTour(combat, sock);
    }, 2000);
  }
};
