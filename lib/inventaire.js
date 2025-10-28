const fs = require("fs");
const path = require("path");

const INVENTAIRE_PATH = path.join(__dirname, "../data/inventaire.json");

function loadInventaire() {
  if (!fs.existsSync(INVENTAIRE_PATH)) {
    fs.writeFileSync(INVENTAIRE_PATH, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(INVENTAIRE_PATH));
}

function saveInventaire(data) {
  fs.writeFileSync(INVENTAIRE_PATH, JSON.stringify(data, null, 2));
}

function initInventaire(jid) {
  const inventaire = loadInventaire();
  if (!inventaire[jid]) {
    inventaire[jid] = {
      armes: [],
      armures: [],
      objets: [],
      sorts: [],
      lastUpdated: new Date().toISOString()
    };
    saveInventaire(inventaire);
  }
  return inventaire[jid];
}

async function showInventaire(riza, chat, jid, quotedMsg) {
  const inventaire = loadInventaire();
  const joueurInventaire = inventaire[jid] || initInventaire(jid);
  
  let texte = `🎒 *TON INVENTAIRE* 🎒\n`;
  texte += `══════════════════\n\n`;
  
  // Armes
  if (joueurInventaire.armes && joueurInventaire.armes.length > 0) {
    texte += `⚔️ *ARMES* (${joueurInventaire.armes.length})\n`;
    joueurInventaire.armes.forEach((arme, index) => {
      const equipIndicator = arme.equipé ? " ✅" : "";
      texte += `• ${arme.nom}${equipIndicator}\n`;
    });
    texte += `\n`;
  }
  
  // Armures
  if (joueurInventaire.armures && joueurInventaire.armures.length > 0) {
    texte += `🛡️ *ARMURES* (${joueurInventaire.armures.length})\n`;
    joueurInventaire.armures.forEach((armure, index) => {
      const equipIndicator = armure.equipé ? " ✅" : "";
      texte += `• ${armure.nom}${equipIndicator}\n`;
    });
    texte += `\n`;
  }
  
  // Objets
  if (joueurInventaire.objets && joueurInventaire.objets.length > 0) {
    texte += `🧪 *OBJETS* (${joueurInventaire.objets.length})\n`;
    joueurInventaire.objets.forEach((objet, index) => {
      texte += `• ${objet.nom}\n`;
    });
    texte += `\n`;
  }
  
  // Sorts
  if (joueurInventaire.sorts && joueurInventaire.sorts.length > 0) {
    texte += `✨ *SORTS* (${joueurInventaire.sorts.length})\n`;
    joueurInventaire.sorts.forEach((sort, index) => {
      texte += `• ${sort.nom}\n`;
    });
    texte += `\n`;
  }
  
  // Si inventaire vide
  if (joueurInventaire.armes.length === 0 && 
      joueurInventaire.armures.length === 0 && 
      joueurInventaire.objets.length === 0 && 
      joueurInventaire.sorts.length === 0) {
    texte += `📭 *Inventaire vide*\n`;
    texte += `Rends-toi à la boutique pour acheter tes premiers objets !\n\n`;
  }
  
  texte += `══════════════════\n`;
  texte += `Dernière mise à jour: ${new Date(joueurInventaire.lastUpdated).toLocaleDateString()}`;
  
  await riza.sendMessage(chat, { text: texte }, { quoted: quotedMsg });
}

function ajouterArticleInventaire(jid, article, type) {
  const inventaire = loadInventaire();
  initInventaire(jid);
  
  if (!inventaire[jid][type]) {
    inventaire[jid][type] = [];
  }
  
  inventaire[jid][type].push({
    id: article.id || Math.random().toString(36).substr(2, 9),
    nom: article.nom,
    description: article.description,
    prix: article.prix,
    devise: article.devise,
    rang: article.rang,
    degats: article.degats,
    poids: article.poids,
    resistance: article.resistance,
    effets: article.effets,
    malus: article.malus,
    type: article.type,
    image: article.image,
    achetéLe: new Date().toISOString(),
    equipé: false
  });
  
  inventaire[jid].lastUpdated = new Date().toISOString();
  saveInventaire(inventaire);
  
  return inventaire[jid];
}

module.exports = {
  loadInventaire,
  saveInventaire,
  initInventaire,
  showInventaire,
  ajouterArticle: ajouterArticleInventaire
};