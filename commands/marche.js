/**
 * COMMANDE MARCHÉ - Système de boutique
 * Permet d'acheter/vendre des équipements et objets
 */

const fs = require('fs');
const path = require('path');

// Catalogue de la boutique
const CATALOGUE = {
  armes: {
    epee_base: {
      nom: "Épée de fer",
      type: "tranchante",
      grade: "D",
      rs: 12,
      durabilite_max: 12,
      prix_achat: 50,
      prix_vente: 20,
      description: "Une épée basique mais fiable"
    },
    hache_guerre: {
      nom: "Hache de guerre",
      type: "contondante",
      grade: "C",
      rs: 18,
      durabilite_max: 18,
      prix_achat: 120,
      prix_vente: 50,
      description: "Hache lourde pour briser les armures"
    },
    lance_acier: {
      nom: "Lance d'acier",
      type: "perforante",
      grade: "C",
      rs: 20,
      durabilite_max: 20,
      prix_achat: 150,
      prix_vente: 60,
      description: "Lance avec portée étendue (2-3m)"
    },
    dague_ombre: {
      nom: "Dague de l'ombre",
      type: "perforante",
      grade: "B",
      rs: 28,
      durabilite_max: 28,
      prix_achat: 300,
      prix_vente: 120,
      description: "Dague rapide et mortelle"
    },
    marteau_titan: {
      nom: "Marteau du Titan",
      type: "contondante",
      grade: "A",
      rs: 40,
      durabilite_max: 40,
      prix_achat: 800,
      prix_vente: 350,
      description: "Marteau légendaire d'Atlas"
    }
  },
  
  armures: {
    casque_fer: {
      nom: "Casque de fer",
      zone: "tete",
      grade: "D",
      rs: 10,
      durabilite_max: 10,
      prix_achat: 40,
      prix_vente: 15,
      description: "Protection basique pour la tête"
    },
    plastron_cuir: {
      nom: "Plastron de cuir",
      zone: "torse",
      grade: "D",
      rs: 12,
      durabilite_max: 12,
      prix_achat: 60,
      prix_vente: 25,
      description: "Armure légère en cuir"
    },
    plastron_acier: {
      nom: "Plastron d'acier",
      zone: "torse",
      grade: "C",
      rs: 20,
      durabilite_max: 20,
      prix_achat: 180,
      prix_vente: 75,
      description: "Armure lourde mais résistante"
    },
    brassieres_mailles: {
      nom: "Brassières de mailles",
      zone: "bras",
      grade: "C",
      rs: 15,
      durabilite_max: 15,
      prix_achat: 100,
      prix_vente: 40,
      description: "Protection des bras en cotte de mailles"
    },
    jambieres_plates: {
      nom: "Jambières plates",
      zone: "jambes",
      grade: "B",
      rs: 25,
      durabilite_max: 25,
      prix_achat: 250,
      prix_vente: 100,
      description: "Protection complète des jambes"
    }
  },
  
  consommables: {
    potion_soin_mineure: {
      nom: "Potion de soin mineure",
      type: "soin",
      effet: { pv: 20 },
      prix_achat: 15,
      prix_vente: 5,
      description: "Restaure 20 PV"
    },
    potion_soin_majeure: {
      nom: "Potion de soin majeure",
      type: "soin",
      effet: { pv: 50 },
      prix_achat: 50,
      prix_vente: 20,
      description: "Restaure 50 PV"
    },
    potion_force: {
      nom: "Potion de force",
      type: "buff",
      effet: { force: 5, duree: 3 },
      prix_achat: 30,
      prix_vente: 12,
      description: "Augmente la force de 5 pendant 3 tours"
    },
    potion_vitesse: {
      nom: "Potion de vitesse",
      type: "buff",
      effet: { vitesse: 3, pm: 2, duree: 3 },
      prix_achat: 35,
      prix_vente: 15,
      description: "Augmente vitesse et PM pendant 3 tours"
    },
    antidote: {
      nom: "Antidote",
      type: "remede",
      effet: { retire_statut: ["Empoisonné", "Sylvae"] },
      prix_achat: 25,
      prix_vente: 10,
      description: "Soigne l'empoisonnement"
    },
    baume_glace: {
      nom: "Baume de glace",
      type: "remede",
      effet: { retire_statut: ["Brûlure", "Ignis"] },
      prix_achat: 25,
      prix_vente: 10,
      description: "Soigne les brûlures"
    }
  },
  
  materiaux: {
    lingot_fer: {
      nom: "Lingot de fer",
      type: "materiau",
      prix_achat: 10,
      prix_vente: 4,
      description: "Matériau de base pour la forge"
    },
    lingot_acier: {
      nom: "Lingot d'acier",
      type: "materiau",
      prix_achat: 30,
      prix_vente: 12,
      description: "Matériau de qualité pour la forge"
    },
    cuir_traite: {
      nom: "Cuir traité",
      type: "materiau",
      prix_achat: 20,
      prix_vente: 8,
      description: "Pour créer des armures légères"
    },
    gemme_force: {
      nom: "Gemme de force",
      type: "materiau",
      prix_achat: 100,
      prix_vente: 40,
      description: "Améliore les armes (bonus force)"
    },
    gemme_protection: {
      nom: "Gemme de protection",
      type: "materiau",
      prix_achat: 100,
      prix_vente: 40,
      description: "Améliore les armures (bonus résistance)"
    }
  }
};

// Promotions du jour (changent quotidiennement)
function getPromotionsDuJour() {
  const jour = new Date().getDay();
  const promotions = [];
  
  // Sélectionner 3 items en promotion selon le jour
  const seed = jour;
  const allItems = [
    ...Object.keys(CATALOGUE.armes),
    ...Object.keys(CATALOGUE.armures),
    ...Object.keys(CATALOGUE.consommables)
  ];
  
  for (let i = 0; i < 3; i++) {
    const index = (seed * (i + 1)) % allItems.length;
    promotions.push({
      item: allItems[index],
      reduction: 20 + (jour * 5) // 20-50% de réduction
    });
  }
  
  return promotions;
}

module.exports = {
  name: 'marche',
  description: 'Accède au marché pour acheter/vendre des équipements',
  category: 'Économie',
  aliases: ['boutique', 'shop'],
  
  execute: async (sock, msg, args) => {
    const userId = msg.key.remoteJid.endsWith('@g.us') 
      ? msg.key.participant 
      : msg.key.remoteJid;
    const chatId = msg.key.remoteJid;
    
    // Charger les données du joueur
    const banquePath = path.join(__dirname, '../banque.json');
    const inventairePath = path.join(__dirname, '../data/inventaires.json');
    
    let banque = {};
    if (fs.existsSync(banquePath)) {
      banque = JSON.parse(fs.readFileSync(banquePath, 'utf8'));
    }
    
    let inventaires = {};
    if (fs.existsSync(inventairePath)) {
      inventaires = JSON.parse(fs.readFileSync(inventairePath, 'utf8'));
    }
    
    // Initialiser si nécessaire
    if (!banque[userId]) {
      banque[userId] = { diamants: 100, rulith: 0 }; // 100 diamants de départ
      fs.writeFileSync(banquePath, JSON.stringify(banque, null, 2));
    }
    
    if (!inventaires[userId]) {
      inventaires[userId] = {
        armes: [],
        armures: [],
        consommables: [],
        materiaux: []
      };
    }
    
    const solde = banque[userId].diamants;
    const promotions = getPromotionsDuJour();
    
    // Menu principal
    const menuPrincipal = `
╔══════════════════════════════╗
║       🏪 **MARCHÉ** 🏪         ║
╚══════════════════════════════╝

💰 **Votre solde:** ${solde} diamants

🎯 **Promotions du jour:**
${promotions.map(p => {
  const categorie = Object.keys(CATALOGUE).find(cat => 
    CATALOGUE[cat][p.item]
  );
  const item = CATALOGUE[categorie]?.[p.item];
  return item ? `• ${item.nom} : -${p.reduction}% !` : '';
}).filter(x => x).join('\n')}

📦 **Catégories:**
1️⃣ Armes
2️⃣ Armures  
3️⃣ Consommables
4️⃣ Matériaux
5️⃣ Vendre des objets
6️⃣ Voir mon inventaire
0️⃣ Quitter

Répondez avec le numéro de votre choix.`;

    await sock.sendMessage(chatId, { text: menuPrincipal });
    
    // Listener pour la réponse
    const listener = async (update) => {
      const newMsg = update.messages[0];
      if (!newMsg.message || newMsg.key.remoteJid !== chatId) return;
      if (newMsg.key.participant !== userId && newMsg.key.remoteJid !== userId) return;
      
      const response = newMsg.message.conversation || 
                       newMsg.message.extendedTextMessage?.text || '';
      const choice = response.trim();
      
      switch(choice) {
        case '1':
          await afficherCategorie(sock, chatId, userId, 'armes', CATALOGUE.armes, banque, inventaires, promotions);
          break;
          
        case '2':
          await afficherCategorie(sock, chatId, userId, 'armures', CATALOGUE.armures, banque, inventaires, promotions);
          break;
          
        case '3':
          await afficherCategorie(sock, chatId, userId, 'consommables', CATALOGUE.consommables, banque, inventaires, promotions);
          break;
          
        case '4':
          await afficherCategorie(sock, chatId, userId, 'materiaux', CATALOGUE.materiaux, banque, inventaires, promotions);
          break;
          
        case '5':
          await menuVente(sock, chatId, userId, inventaires[userId], banque);
          break;
          
        case '6':
          await afficherInventaire(sock, chatId, inventaires[userId]);
          break;
          
        case '0':
          await sock.sendMessage(chatId, { text: "✅ Marché fermé. À bientôt!" });
          sock.ev.off("messages.upsert", listener);
          return;
          
        default:
          await sock.sendMessage(chatId, { text: "❌ Option invalide." });
      }
      
      // Réafficher le menu après chaque action
      setTimeout(async () => {
        await module.exports.execute(sock, msg, args);
      }, 1500);
      
      sock.ev.off("messages.upsert", listener);
    };
    
    sock.ev.on("messages.upsert", listener);
    
    // Timeout après 60 secondes
    setTimeout(() => {
      sock.ev.off("messages.upsert", listener);
    }, 60000);
  }
};

// Fonction pour afficher une catégorie
async function afficherCategorie(sock, chatId, userId, categorie, items, banque, inventaires, promotions) {
  let message = `🛍️ **${categorie.toUpperCase()}**\n\n`;
  
  const itemsList = Object.entries(items);
  itemsList.forEach(([key, item], index) => {
    let prix = item.prix_achat;
    
    // Vérifier si en promotion
    const promo = promotions.find(p => p.item === key);
    if (promo) {
      prix = Math.floor(prix * (1 - promo.reduction / 100));
      message += `🔥 `;
    }
    
    message += `${index + 1}. **${item.nom}** (${item.grade || ''})\n`;
    message += `   ${item.description}\n`;
    
    if (item.rs) message += `   Rs: ${item.rs} | `;
    if (item.effet) {
      const effetStr = Object.entries(item.effet)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      message += `   Effet: ${effetStr}\n`;
    }
    
    if (promo) {
      message += `   ~~${item.prix_achat}~~ **${prix} diamants** (-${promo.reduction}%)\n`;
    } else {
      message += `   Prix: ${prix} diamants\n`;
    }
    message += '\n';
  });
  
  message += `💰 Solde: ${banque[userId].diamants} diamants\n`;
  message += `\nQuel objet voulez-vous acheter? (numéro) ou 0 pour retour`;
  
  await sock.sendMessage(chatId, { text: message });
  
  // Listener pour l'achat
  const buyListener = async (update) => {
    const newMsg = update.messages[0];
    if (!newMsg.message || newMsg.key.remoteJid !== chatId) return;
    if (newMsg.key.participant !== userId && newMsg.key.remoteJid !== userId) return;
    
    const response = newMsg.message.conversation || 
                     newMsg.message.extendedTextMessage?.text || '';
    const choiceNum = parseInt(response.trim());
    
    if (choiceNum === 0) {
      sock.ev.off("messages.upsert", buyListener);
      return;
    }
    
    if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > itemsList.length) {
      await sock.sendMessage(chatId, { text: "❌ Numéro invalide." });
      sock.ev.off("messages.upsert", buyListener);
      return;
    }
    
    const [itemKey, item] = itemsList[choiceNum - 1];
    let prix = item.prix_achat;
    
    // Appliquer la promotion si applicable
    const promo = promotions.find(p => p.item === itemKey);
    if (promo) {
      prix = Math.floor(prix * (1 - promo.reduction / 100));
    }
    
    // Vérifier les fonds
    if (banque[userId].diamants < prix) {
      await sock.sendMessage(chatId, { 
        text: `❌ Diamants insuffisants! Il vous manque ${prix - banque[userId].diamants} diamants.` 
      });
      sock.ev.off("messages.upsert", buyListener);
      return;
    }
    
    // Effectuer l'achat
    banque[userId].diamants -= prix;
    
    // Ajouter à l'inventaire
    const itemAchat = {
      ...item,
      durabilite_actuelle: item.durabilite_max || 1,
      date_achat: new Date().toISOString()
    };
    
    if (!inventaires[userId][categorie]) {
      inventaires[userId][categorie] = [];
    }
    inventaires[userId][categorie].push(itemAchat);
    
    // Sauvegarder
    fs.writeFileSync(path.join(__dirname, '../banque.json'), JSON.stringify(banque, null, 2));
    fs.writeFileSync(path.join(__dirname, '../data/inventaires.json'), JSON.stringify(inventaires, null, 2));
    
    let messageAchat = `✅ **${item.nom}** acheté avec succès!\n`;
    messageAchat += `💎 -${prix} diamants\n`;
    messageAchat += `💰 Solde restant: ${banque[userId].diamants} diamants`;
    
    if (promo) {
      messageAchat += `\n🎉 Vous avez économisé ${item.prix_achat - prix} diamants grâce à la promotion!`;
    }
    
    await sock.sendMessage(chatId, { text: messageAchat });
    
    sock.ev.off("messages.upsert", buyListener);
  };
  
  sock.ev.on("messages.upsert", buyListener);
  
  setTimeout(() => {
    sock.ev.off("messages.upsert", buyListener);
  }, 30000);
}

// Fonction pour le menu de vente
async function menuVente(sock, chatId, userId, inventaire, banque) {
  const itemsVendables = [];
  
  // Collecter tous les items vendables
  ['armes', 'armures', 'consommables', 'materiaux'].forEach(cat => {
    if (inventaire[cat] && inventaire[cat].length > 0) {
      inventaire[cat].forEach((item, index) => {
        itemsVendables.push({
          ...item,
          categorie: cat,
          index: index
        });
      });
    }
  });
  
  if (itemsVendables.length === 0) {
    await sock.sendMessage(chatId, { text: "❌ Vous n'avez rien à vendre." });
    return;
  }
  
  let message = "💰 **VENTE D'OBJETS**\n\n";
  
  itemsVendables.forEach((item, i) => {
    const etat = item.durabilite_actuelle && item.durabilite_max 
      ? ` (${Math.round(item.durabilite_actuelle/item.durabilite_max*100)}%)`
      : '';
    
    message += `${i + 1}. ${item.nom}${etat}\n`;
    message += `   Prix de vente: ${item.prix_vente} diamants\n\n`;
  });
  
  message += "Quel objet voulez-vous vendre? (numéro) ou 0 pour annuler";
  
  await sock.sendMessage(chatId, { text: message });
  
  const sellListener = async (update) => {
    const newMsg = update.messages[0];
    if (!newMsg.message || newMsg.key.remoteJid !== chatId) return;
    if (newMsg.key.participant !== userId && newMsg.key.remoteJid !== userId) return;
    
    const response = newMsg.message.conversation || 
                     newMsg.message.extendedTextMessage?.text || '';
    const choiceNum = parseInt(response.trim());
    
    if (choiceNum === 0) {
      sock.ev.off("messages.upsert", sellListener);
      return;
    }
    
    if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > itemsVendables.length) {
      await sock.sendMessage(chatId, { text: "❌ Numéro invalide." });
      sock.ev.off("messages.upsert", sellListener);
      return;
    }
    
    const itemVente = itemsVendables[choiceNum - 1];
    
    // Retirer de l'inventaire
    const inventaires = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/inventaires.json'), 'utf8'));
    inventaires[userId][itemVente.categorie].splice(itemVente.index, 1);
    
    // Ajouter les diamants
    banque[userId].diamants += itemVente.prix_vente;
    
    // Sauvegarder
    fs.writeFileSync(path.join(__dirname, '../banque.json'), JSON.stringify(banque, null, 2));
    fs.writeFileSync(path.join(__dirname, '../data/inventaires.json'), JSON.stringify(inventaires, null, 2));
    
    await sock.sendMessage(chatId, { 
      text: `✅ **${itemVente.nom}** vendu!\n💎 +${itemVente.prix_vente} diamants\n💰 Nouveau solde: ${banque[userId].diamants} diamants` 
    });
    
    sock.ev.off("messages.upsert", sellListener);
  };
  
  sock.ev.on("messages.upsert", sellListener);
  
  setTimeout(() => {
    sock.ev.off("messages.upsert", sellListener);
  }, 30000);
}

// Fonction pour afficher l'inventaire
async function afficherInventaire(sock, chatId, inventaire) {
  let message = "📦 **VOTRE INVENTAIRE**\n\n";
  
  const categories = ['armes', 'armures', 'consommables', 'materiaux'];
  
  categories.forEach(cat => {
    const items = inventaire[cat] || [];
    if (items.length > 0) {
      message += `**${cat.toUpperCase()}:**\n`;
      items.forEach(item => {
        const etat = item.durabilite_actuelle && item.durabilite_max 
          ? ` (${Math.round(item.durabilite_actuelle/item.durabilite_max*100)}%)`
          : '';
        message += `• ${item.nom}${etat}\n`;
      });
      message += '\n';
    }
  });
  
  if (message === "📦 **VOTRE INVENTAIRE**\n\n") {
    message += "Votre inventaire est vide.";
  }
  
  await sock.sendMessage(chatId, { text: message });
}
