const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'monarsenal',
  description: 'Gère votre équipement et arsenal',
  category: 'Équipement',
  
  execute: async (sock, msg, args) => {
    const userId = msg.key.remoteJid.endsWith('@g.us') 
      ? msg.key.participant 
      : msg.key.remoteJid;
    const chatId = msg.key.remoteJid;
    
    // Charger l'inventaire du joueur
    const inventairePath = path.join(__dirname, '../data/inventaires.json');
    let inventaires = {};
    if (fs.existsSync(inventairePath)) {
      inventaires = JSON.parse(fs.readFileSync(inventairePath, 'utf8'));
    }
    
    // Initialiser l'inventaire du joueur s'il n'existe pas
    if (!inventaires[userId]) {
      inventaires[userId] = {
        armes: [],
        armures: [],
        equipement_actuel: {
          main_droite: null,
          main_gauche: null,
          tete: null,
          torse: null,
          bras: null,
          jambes: null
        }
      };
      fs.writeFileSync(inventairePath, JSON.stringify(inventaires, null, 2));
    }
    
    const playerInventory = inventaires[userId];
    
    // Menu principal
    const menuPrincipal = `
╔══════════════════════════════╗
║     🗡️ **MON ARSENAL** 🛡️      ║
╚══════════════════════════════╝

📦 **Équipement actuel:**
• Main droite: ${playerInventory.equipement_actuel.main_droite || 'Vide'}
• Main gauche: ${playerInventory.equipement_actuel.main_gauche || 'Vide'}
• Tête: ${playerInventory.equipement_actuel.tete || 'Aucune'}
• Torse: ${playerInventory.equipement_actuel.torse || 'Aucun'}
• Bras: ${playerInventory.equipement_actuel.bras || 'Aucuns'}
• Jambes: ${playerInventory.equipement_actuel.jambes || 'Aucunes'}

🎯 **Options disponibles:**
1️⃣ Équiper une arme
2️⃣ Équiper une armure
3️⃣ Déséquiper un objet
4️⃣ Voir mon inventaire
5️⃣ Inspecter un équipement
6️⃣ Réparer un équipement
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
          await equiperArme(sock, chatId, userId, playerInventory, inventaires);
          break;
          
        case '2':
          await equiperArmure(sock, chatId, userId, playerInventory, inventaires);
          break;
          
        case '3':
          await desequiper(sock, chatId, userId, playerInventory, inventaires);
          break;
          
        case '4':
          await voirInventaire(sock, chatId, playerInventory);
          break;
          
        case '5':
          await inspecterEquipement(sock, chatId, userId, playerInventory);
          break;
          
        case '6':
          await reparerEquipement(sock, chatId, userId, playerInventory, inventaires);
          break;
          
        case '0':
          await sock.sendMessage(chatId, { text: "✅ Arsenal fermé." });
          sock.ev.off("messages.upsert", listener);
          return;
          
        default:
          await sock.sendMessage(chatId, { text: "❌ Option invalide. Veuillez choisir un numéro entre 0 et 6." });
      }
      
      // Réafficher le menu après chaque action
      setTimeout(async () => {
        await module.exports.execute(sock, msg, args);
      }, 1000);
      
      sock.ev.off("messages.upsert", listener);
    };
    
    sock.ev.on("messages.upsert", listener);
    
    // Timeout après 60 secondes
    setTimeout(() => {
      sock.ev.off("messages.upsert", listener);
    }, 60000);
  }
};

// Fonction pour équiper une arme
async function equiperArme(sock, chatId, userId, inventory, allInventories) {
  if (inventory.armes.length === 0) {
    await sock.sendMessage(chatId, { text: "❌ Vous n'avez aucune arme dans votre inventaire." });
    return;
  }
  
  let message = "🗡️ **Vos armes disponibles:**\n\n";
  inventory.armes.forEach((arme, index) => {
    const statut = getStatutDurabilite(arme.durabilite_actuelle, arme.durabilite_max);
    message += `${index + 1}. **${arme.nom}** (${arme.grade})\n`;
    message += `   Rs: ${arme.rs} | État: ${statut}\n`;
    message += `   Type: ${arme.type}\n\n`;
  });
  
  message += "Quelle arme voulez-vous équiper? (numéro)\n";
  message += "Puis précisez la main (D pour droite, G pour gauche)";
  
  await sock.sendMessage(chatId, { text: message });
  
  const armeListener = async (update) => {
    const newMsg = update.messages[0];
    if (!newMsg.message || newMsg.key.remoteJid !== chatId) return;
    if (newMsg.key.participant !== userId && newMsg.key.remoteJid !== userId) return;
    
    const response = newMsg.message.conversation || 
                     newMsg.message.extendedTextMessage?.text || '';
    const parts = response.trim().split(' ');
    
    const armeIndex = parseInt(parts[0]) - 1;
    const main = parts[1]?.toUpperCase();
    
    if (isNaN(armeIndex) || armeIndex < 0 || armeIndex >= inventory.armes.length) {
      await sock.sendMessage(chatId, { text: "❌ Numéro d'arme invalide." });
      sock.ev.off("messages.upsert", armeListener);
      return;
    }
    
    if (main !== 'D' && main !== 'G') {
      await sock.sendMessage(chatId, { text: "❌ Veuillez spécifier D (droite) ou G (gauche)." });
      sock.ev.off("messages.upsert", armeListener);
      return;
    }
    
    const arme = inventory.armes[armeIndex];
    const mainSlot = main === 'D' ? 'main_droite' : 'main_gauche';
    
    // Déséquiper l'arme actuelle si présente
    if (inventory.equipement_actuel[mainSlot]) {
      const ancienneArme = inventory.equipement_actuel[mainSlot];
      await sock.sendMessage(chatId, { 
        text: `🔄 ${ancienneArme} déséquipée de la ${main === 'D' ? 'main droite' : 'main gauche'}.` 
      });
    }
    
    // Équiper la nouvelle arme
    inventory.equipement_actuel[mainSlot] = arme.nom;
    
    // Sauvegarder
    const inventairePath = path.join(__dirname, '../data/inventaires.json');
    fs.writeFileSync(inventairePath, JSON.stringify(allInventories, null, 2));
    
    await sock.sendMessage(chatId, { 
      text: `✅ **${arme.nom}** équipée en ${main === 'D' ? 'main droite' : 'main gauche'}!` 
    });
    
    sock.ev.off("messages.upsert", armeListener);
  };
  
  sock.ev.on("messages.upsert", armeListener);
  
  setTimeout(() => {
    sock.ev.off("messages.upsert", armeListener);
  }, 30000);
}

// Fonction pour équiper une armure
async function equiperArmure(sock, chatId, userId, inventory, allInventories) {
  if (inventory.armures.length === 0) {
    await sock.sendMessage(chatId, { text: "❌ Vous n'avez aucune armure dans votre inventaire." });
    return;
  }
  
  let message = "🛡️ **Vos armures disponibles:**\n\n";
  inventory.armures.forEach((armure, index) => {
    const statut = getStatutDurabilite(armure.durabilite_actuelle, armure.durabilite_max);
    message += `${index + 1}. **${armure.nom}** (${armure.grade})\n`;
    message += `   Rs: ${armure.rs} | État: ${statut}\n`;
    message += `   Zone: ${armure.zone}\n\n`;
  });
  
  message += "Quelle armure voulez-vous équiper? (numéro)";
  
  await sock.sendMessage(chatId, { text: message });
  
  const armureListener = async (update) => {
    const newMsg = update.messages[0];
    if (!newMsg.message || newMsg.key.remoteJid !== chatId) return;
    if (newMsg.key.participant !== userId && newMsg.key.remoteJid !== userId) return;
    
    const response = newMsg.message.conversation || 
                     newMsg.message.extendedTextMessage?.text || '';
    const armureIndex = parseInt(response.trim()) - 1;
    
    if (isNaN(armureIndex) || armureIndex < 0 || armureIndex >= inventory.armures.length) {
      await sock.sendMessage(chatId, { text: "❌ Numéro d'armure invalide." });
      sock.ev.off("messages.upsert", armureListener);
      return;
    }
    
    const armure = inventory.armures[armureIndex];
    const zone = armure.zone.toLowerCase();
    
    // Déséquiper l'armure actuelle si présente
    if (inventory.equipement_actuel[zone]) {
      const ancienneArmure = inventory.equipement_actuel[zone];
      await sock.sendMessage(chatId, { 
        text: `🔄 ${ancienneArmure} déséquipée.` 
      });
    }
    
    // Équiper la nouvelle armure
    inventory.equipement_actuel[zone] = armure.nom;
    
    // Sauvegarder
    const inventairePath = path.join(__dirname, '../data/inventaires.json');
    fs.writeFileSync(inventairePath, JSON.stringify(allInventories, null, 2));
    
    await sock.sendMessage(chatId, { 
      text: `✅ **${armure.nom}** équipée sur ${zone}!` 
    });
    
    sock.ev.off("messages.upsert", armureListener);
  };
  
  sock.ev.on("messages.upsert", armureListener);
  
  setTimeout(() => {
    sock.ev.off("messages.upsert", armureListener);
  }, 30000);
}

// Fonction pour déséquiper
async function desequiper(sock, chatId, userId, inventory, allInventories) {
  let message = "🔄 **Équipement actuel:**\n\n";
  const slots = [
    { key: 'main_droite', name: 'Main droite' },
    { key: 'main_gauche', name: 'Main gauche' },
    { key: 'tete', name: 'Tête' },
    { key: 'torse', name: 'Torse' },
    { key: 'bras', name: 'Bras' },
    { key: 'jambes', name: 'Jambes' }
  ];
  
  let hasEquipment = false;
  slots.forEach((slot, index) => {
    if (inventory.equipement_actuel[slot.key]) {
      message += `${index + 1}. ${slot.name}: ${inventory.equipement_actuel[slot.key]}\n`;
      hasEquipment = true;
    }
  });
  
  if (!hasEquipment) {
    await sock.sendMessage(chatId, { text: "❌ Vous n'avez aucun équipement à retirer." });
    return;
  }
  
  message += "\nQuel équipement voulez-vous retirer? (numéro)";
  await sock.sendMessage(chatId, { text: message });
  
  const desequipListener = async (update) => {
    const newMsg = update.messages[0];
    if (!newMsg.message || newMsg.key.remoteJid !== chatId) return;
    if (newMsg.key.participant !== userId && newMsg.key.remoteJid !== userId) return;
    
    const response = newMsg.message.conversation || 
                     newMsg.message.extendedTextMessage?.text || '';
    const slotIndex = parseInt(response.trim()) - 1;
    
    if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= slots.length) {
      await sock.sendMessage(chatId, { text: "❌ Numéro invalide." });
      sock.ev.off("messages.upsert", desequipListener);
      return;
    }
    
    const slot = slots[slotIndex];
    const item = inventory.equipement_actuel[slot.key];
    
    if (!item) {
      await sock.sendMessage(chatId, { text: "❌ Cet emplacement est déjà vide." });
      sock.ev.off("messages.upsert", desequipListener);
      return;
    }
    
    inventory.equipement_actuel[slot.key] = null;
    
    // Sauvegarder
    const inventairePath = path.join(__dirname, '../data/inventaires.json');
    fs.writeFileSync(inventairePath, JSON.stringify(allInventories, null, 2));
    
    await sock.sendMessage(chatId, { 
      text: `✅ **${item}** retiré de ${slot.name.toLowerCase()}.` 
    });
    
    sock.ev.off("messages.upsert", desequipListener);
  };
  
  sock.ev.on("messages.upsert", desequipListener);
  
  setTimeout(() => {
    sock.ev.off("messages.upsert", desequipListener);
  }, 30000);
}

// Fonction pour voir l'inventaire
async function voirInventaire(sock, chatId, inventory) {
  let message = "📦 **VOTRE INVENTAIRE**\n\n";
  
  message += "🗡️ **Armes:**\n";
  if (inventory.armes.length === 0) {
    message += "Aucune arme\n";
  } else {
    inventory.armes.forEach(arme => {
      const statut = getStatutDurabilite(arme.durabilite_actuelle, arme.durabilite_max);
      message += `• ${arme.nom} (${arme.grade}) - Rs: ${arme.rs} - État: ${statut}\n`;
    });
  }
  
  message += "\n🛡️ **Armures:**\n";
  if (inventory.armures.length === 0) {
    message += "Aucune armure\n";
  } else {
    inventory.armures.forEach(armure => {
      const statut = getStatutDurabilite(armure.durabilite_actuelle, armure.durabilite_max);
      message += `• ${armure.nom} (${armure.grade}) - Rs: ${armure.rs} - Zone: ${armure.zone} - État: ${statut}\n`;
    });
  }
  
  await sock.sendMessage(chatId, { text: message });
}

// Fonction pour inspecter un équipement
async function inspecterEquipement(sock, chatId, userId, inventory) {
  const allItems = [...inventory.armes, ...inventory.armures];
  
  if (allItems.length === 0) {
    await sock.sendMessage(chatId, { text: "❌ Vous n'avez aucun équipement à inspecter." });
    return;
  }
  
  let message = "🔍 **Équipements disponibles:**\n\n";
  allItems.forEach((item, index) => {
    message += `${index + 1}. ${item.nom} (${item.type || 'armure'})\n`;
  });
  
  message += "\nQuel équipement voulez-vous inspecter? (numéro)";
  await sock.sendMessage(chatId, { text: message });
  
  const inspectListener = async (update) => {
    const newMsg = update.messages[0];
    if (!newMsg.message || newMsg.key.remoteJid !== chatId) return;
    if (newMsg.key.participant !== userId && newMsg.key.remoteJid !== userId) return;
    
    const response = newMsg.message.conversation || 
                     newMsg.message.extendedTextMessage?.text || '';
    const itemIndex = parseInt(response.trim()) - 1;
    
    if (isNaN(itemIndex) || itemIndex < 0 || itemIndex >= allItems.length) {
      await sock.sendMessage(chatId, { text: "❌ Numéro invalide." });
      sock.ev.off("messages.upsert", inspectListener);
      return;
    }
    
    const item = allItems[itemIndex];
    const statut = getStatutDurabilite(item.durabilite_actuelle, item.durabilite_max);
    const pourcentage = Math.round((item.durabilite_actuelle / item.durabilite_max) * 100);
    
    let details = `📋 **${item.nom}**\n`;
    details += `━━━━━━━━━━━━━━━━\n`;
    details += `Grade: ${item.grade}\n`;
    details += `Type: ${item.type || 'armure'}\n`;
    details += `Résistance: ${item.rs}\n`;
    details += `Durabilité: ${item.durabilite_actuelle}/${item.durabilite_max} (${pourcentage}%)\n`;
    details += `État: ${statut}\n`;
    
    if (item.description) {
      details += `\nDescription: ${item.description}\n`;
    }
    
    if (item.effets && item.effets.length > 0) {
      details += `\nEffets spéciaux:\n`;
      item.effets.forEach(effet => {
        details += `• ${effet}\n`;
      });
    }
    
    await sock.sendMessage(chatId, { text: details });
    
    sock.ev.off("messages.upsert", inspectListener);
  };
  
  sock.ev.on("messages.upsert", inspectListener);
  
  setTimeout(() => {
    sock.ev.off("messages.upsert", inspectListener);
  }, 30000);
}

// Fonction pour réparer un équipement
async function reparerEquipement(sock, chatId, userId, inventory, allInventories) {
  const itemsToRepair = [...inventory.armes, ...inventory.armures].filter(item => {
    const pourcentage = (item.durabilite_actuelle / item.durabilite_max) * 100;
    return pourcentage < 100;
  });
  
  if (itemsToRepair.length === 0) {
    await sock.sendMessage(chatId, { text: "✅ Tous vos équipements sont en parfait état!" });
    return;
  }
  
  let message = "🔧 **Équipements nécessitant réparation:**\n\n";
  itemsToRepair.forEach((item, index) => {
    const statut = getStatutDurabilite(item.durabilite_actuelle, item.durabilite_max);
    const pourcentage = Math.round((item.durabilite_actuelle / item.durabilite_max) * 100);
    const coutReparation = Math.ceil((item.durabilite_max - item.durabilite_actuelle) * 2);
    
    message += `${index + 1}. ${item.nom} - ${pourcentage}% (${statut})\n`;
    message += `   Coût: ${coutReparation} diamants\n\n`;
  });
  
  message += "Quel équipement voulez-vous réparer? (numéro)";
  await sock.sendMessage(chatId, { text: message });
  
  const repairListener = async (update) => {
    const newMsg = update.messages[0];
    if (!newMsg.message || newMsg.key.remoteJid !== chatId) return;
    if (newMsg.key.participant !== userId && newMsg.key.remoteJid !== userId) return;
    
    const response = newMsg.message.conversation || 
                     newMsg.message.extendedTextMessage?.text || '';
    const itemIndex = parseInt(response.trim()) - 1;
    
    if (isNaN(itemIndex) || itemIndex < 0 || itemIndex >= itemsToRepair.length) {
      await sock.sendMessage(chatId, { text: "❌ Numéro invalide." });
      sock.ev.off("messages.upsert", repairListener);
      return;
    }
    
    const item = itemsToRepair[itemIndex];
    const coutReparation = Math.ceil((item.durabilite_max - item.durabilite_actuelle) * 2);
    
    // Vérifier les diamants du joueur
    const banquePath = path.join(__dirname, '../banque.json');
    let banque = {};
    if (fs.existsSync(banquePath)) {
      banque = JSON.parse(fs.readFileSync(banquePath, 'utf8'));
    }
    
    if (!banque[userId] || banque[userId].diamants < coutReparation) {
      await sock.sendMessage(chatId, { 
        text: `❌ Diamants insuffisants! Vous avez ${banque[userId]?.diamants || 0} diamants, il vous en faut ${coutReparation}.` 
      });
      sock.ev.off("messages.upsert", repairListener);
      return;
    }
    
    // Effectuer la réparation
    item.durabilite_actuelle = item.durabilite_max;
    banque[userId].diamants -= coutReparation;
    
    // Sauvegarder
    const inventairePath = path.join(__dirname, '../data/inventaires.json');
    fs.writeFileSync(inventairePath, JSON.stringify(allInventories, null, 2));
    fs.writeFileSync(banquePath, JSON.stringify(banque, null, 2));
    
    await sock.sendMessage(chatId, { 
      text: `✅ **${item.nom}** réparé avec succès!\n💎 -${coutReparation} diamants\n💰 Solde restant: ${banque[userId].diamants} diamants` 
    });
    
    sock.ev.off("messages.upsert", repairListener);
  };
  
  sock.ev.on("messages.upsert", repairListener);
  
  setTimeout(() => {
    sock.ev.off("messages.upsert", repairListener);
  }, 30000);
}

// Fonction utilitaire pour obtenir le statut de durabilité
function getStatutDurabilite(actuelle, max) {
  const pourcentage = (actuelle / max) * 100;
  
  if (pourcentage >= 91) return "⭐ Neuf";
  if (pourcentage >= 70) return "✨ Presque neuf";
  if (pourcentage >= 30) return "👍 Bon état";
  if (pourcentage >= 1) return "⚠️ Usé";
  return "💔 Cassé";
}
