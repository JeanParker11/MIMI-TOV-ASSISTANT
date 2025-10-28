const fs = require("fs");
const path = require("path");
const axios = require("axios");

const BOUTIQUE_PATH = path.join(__dirname, "../data/boutique.json");
const ARGENT_PATH = path.join(__dirname, "../data/banque.json");
const FICHES_PATH = path.join(__dirname, "../data/fiches.json");
const SOCIAL_PATH = path.join(__dirname, "../data/social.json");
const INVENTAIRE_PATH = path.join(__dirname, "../data/inventaire.json");

function loadBoutique() {
  if (!fs.existsSync(BOUTIQUE_PATH)) {
    const structureInitiale = {
      "settings": {
        "taxe_rate": 0.01
      },
      "valoria": {
        "diamants": 50000,
        "rulith": 1000000,
        "transactions": []
      },
      "articles": {
        "vetements": {},
        "potions": {},
        "conversion": {}
      }
    };
    fs.writeFileSync(BOUTIQUE_PATH, JSON.stringify(structureInitiale, null, 2));
  }
  return JSON.parse(fs.readFileSync(BOUTIQUE_PATH));
}

function loadArgent() {
  if (!fs.existsSync(ARGENT_PATH)) {
    fs.writeFileSync(ARGENT_PATH, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(ARGENT_PATH));
}

function saveArgent(data) {
  fs.writeFileSync(ARGENT_PATH, JSON.stringify(data, null, 2));
}

function loadFiches() {
  if (!fs.existsSync(FICHES_PATH)) {
    fs.writeFileSync(FICHES_PATH, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(FICHES_PATH));
}

function loadSocial() {
  if (!fs.existsSync(SOCIAL_PATH)) {
    fs.writeFileSync(SOCIAL_PATH, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(SOCIAL_PATH));
}

function initCompte(jid) {
  const banque = loadArgent();
  if (!banque[jid]) {
    banque[jid] = { diamants: 0, rulith: 0 };
    saveArgent(banque);
  }
  return banque[jid];
}

// Fonctions pour l'inventaire
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

function ajouterArticle(jid, article, type) {
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

async function downloadImage(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error('Erreur téléchargement image:', error);
    return null;
  }
}

async function sendArticleWithImage(riza, chat, article, quotedMsg = null) {
  const stockText = article.stock !== undefined ? `📦 Stock: ${article.stock}` : '📦 Stock: Illimité';
  let caption = `🛒 *${article.nom}*\n\n📝 ${article.description}\n💸 Prix: ${article.prix.toLocaleString()} ${article.devise}\n${stockText}`;

  // Ajouter les caractéristiques spécifiques selon le type d'article
  if (article.resistance) {
    caption += `\n🛡️ Résistance: ${article.resistance}`;
  }
  if (article.effets) {
    caption += `\n✨ Effets: ${article.effets}`;
  }
  if (article.malus && article.malus !== "Aucun") {
    caption += `\n⚠️ Malus: ${article.malus}`;
  }
  if (article.degats) {
    caption += `\n⚔️ Dégâts: ${article.degats}`;
  }
  if (article.poids) {
    caption += `\n⚖️ Poids: ${article.poids}kg`;
  }

  if (article.image) {
    try {
      const imageBuffer = await downloadImage(article.image);
      if (imageBuffer) {
        await riza.sendMessage(chat, {
          image: imageBuffer,
          caption: caption
        }, { quoted: quotedMsg });
        return;
      }
    } catch (error) {
      console.error('Erreur envoi image:', error);
    }
  }
  
  await riza.sendMessage(chat, {
    text: caption
  }, { quoted: quotedMsg });
}

function ajouterTaxe(montant, devise, type, joueur, articleNom) {
  const boutique = loadBoutique();
  const taxe = Math.ceil(montant * boutique.settings.taxe_rate);
  
  if (devise === "💎") {
    boutique.valoria.diamants += taxe;
  } else {
    boutique.valoria.rulith += taxe;
  }
  
  boutique.valoria.transactions.push({
    date: new Date().toISOString(),
    type: type,
    montant: taxe,
    devise: devise,
    joueur: joueur,
    article: articleNom,
    description: `Taxe ${boutique.settings.taxe_rate * 100}%`
  });
  
  fs.writeFileSync(BOUTIQUE_PATH, JSON.stringify(boutique, null, 2));
  return taxe;
}

function verserVente(montant, devise, type, joueur, articleNom) {
  const boutique = loadBoutique();
  const revenu = montant;
  
  if (devise === "💎") {
    boutique.valoria.diamants += revenu;
  } else {
    boutique.valoria.rulith += revenu;
  }
  
  boutique.valoria.transactions.push({
    date: new Date().toISOString(),
    type: "vente",
    montant: revenu,
    devise: devise,
    joueur: joueur,
    article: articleNom,
    description: `Vente ${articleNom}`
  });
  
  fs.writeFileSync(BOUTIQUE_PATH, JSON.stringify(boutique, null, 2));
}

function decrementerStock(categorie, articleId) {
  const boutique = loadBoutique();
  if (boutique.articles[categorie]?.[articleId]?.stock > 0) {
    boutique.articles[categorie][articleId].stock--;
    boutique.articles[categorie][articleId].updatedAt = new Date().toISOString();
    fs.writeFileSync(BOUTIQUE_PATH, JSON.stringify(boutique, null, 2));
    return true;
  }
  return false;
}

function trouverArticleParId(articleId) {
  const boutique = loadBoutique();
  
  console.log("🔍 Recherche article ID:", articleId);
  
  // Recherche par ID exact d'abord
  for (const [categorie, articles] of Object.entries(boutique.articles)) {
    if (articles[articleId]) {
      console.log("✅ Article trouvé:", categorie, articleId);
      return { article: articles[articleId], categorie: categorie, id: articleId };
    }
  }
  
  // Si non trouvé, recherche par nom (insensible à la casse)
  for (const [categorie, articles] of Object.entries(boutique.articles)) {
    for (const [id, article] of Object.entries(articles)) {
      if (article.nom && article.nom.toLowerCase().includes(articleId.toLowerCase())) {
        console.log("✅ Article trouvé par nom:", categorie, id);
        return { article: article, categorie: categorie, id: id };
      }
    }
  }
  
  console.log("❌ Article non trouvé:", articleId);
  return null;
}

// Fonction pour obtenir toutes les armes par faction et rang
function getCompendiumArmes() {
  const boutique = loadBoutique();
  const compendium = {};
  
  // Fonction de normalisation des factions
  function normaliserFaction(faction) {
    if (!faction) return "Non définie";
    const factionLower = faction.toLowerCase();
    if (factionLower.includes("herm") || factionLower.includes("hermes")) return "Hermès";
    if (factionLower.includes("hecat") || factionLower.includes("hécat")) return "Hécates";
    if (factionLower.includes("arès") || factionLower.includes("ares")) return "Arès";
    if (factionLower.includes("atlas")) return "Atlas";
    return faction;
  }
  
  Object.entries(boutique.articles).forEach(([faction, articles]) => {
    if (["hermes", "hecate", "arès", "atlas", "ares", "toutes_factions"].includes(faction.toLowerCase())) {
      Object.entries(articles).forEach(([id, arme]) => {
        const rang = arme.rang || "E";
        const factionNormalisee = normaliserFaction(faction);
        
        if (!compendium[factionNormalisee]) {
          compendium[factionNormalisee] = {};
        }
        if (!compendium[factionNormalisee][rang]) {
          compendium[factionNormalisee][rang] = [];
        }
        
        compendium[factionNormalisee][rang].push({
          id: id,
          nom: arme.nom,
          description: arme.description,
          prix: arme.prix,
          devise: arme.devise,
          rang: arme.rang,
          degats: arme.degats || "Non spécifié",
          poids: arme.poids || "Non spécifié",
          stock: arme.stock || 0,
          image: arme.image || null,
          faction: factionNormalisee
        });
      });
    }
  });
  
  return compendium;
}

// Fonction pour afficher le compendium des armes
async function showCompendiumArmes(riza, chat, quotedMsg, factionJoueur = null) {
  const compendium = getCompendiumArmes();
  let texte = `⚔️ *COMPENDIUM DES ARMES* ⚔️\n══════════════════\n\n`;
  
  const factions = Object.keys(compendium).sort();
  
  if (factions.length === 0) {
    texte += "❌ Aucune arme disponible dans le compendium.\n";
  } else {
    // Si une faction est spécifiée, afficher seulement cette faction
    if (factionJoueur && factionJoueur !== "Non définie" && compendium[factionJoueur]) {
      texte += `*FACTION: ${factionJoueur.toUpperCase()}*\n══════════════════\n\n`;
      const message = await riza.sendMessage(chat, { text: texte }, { quoted: quotedMsg });
      await afficherArmesParFaction(riza, chat, compendium[factionJoueur], factionJoueur, message);
      return message;
    }
    
    // Sinon afficher le menu des factions
    texte += "*CHOISIS TA FACTION :*\n\n";
    
    factions.forEach((faction, index) => {
      const countArmes = Object.values(compendium[faction]).flat().length;
      texte += `${index + 1}. 🛡️ ${faction} (${countArmes} armes)\n`;
    });
    
    texte += `\n0. ↩️ Retour\n═════════════════\n*Choisis une faction (1-${factions.length}) :*`;
  }
  
  const message = await riza.sendMessage(chat, { text: texte }, { quoted: quotedMsg });
  return message;
}

// Fonction pour afficher les armes d'une faction spécifique par rang
async function afficherArmesParFaction(riza, chat, armesFaction, faction, quotedMsg) {
  const rangs = ["S", "A", "B", "C", "D", "E"];
  let texte = `⚔️ *ARMES ${faction.toUpperCase()}* ⚔️\n══════════════════\n\n`;
  
  let hasArmes = false;
  
  for (const rang of rangs) {
    if (armesFaction[rang] && armesFaction[rang].length > 0) {
      hasArmes = true;
      texte += `*🎯 RANG ${rang}*\n`;
      texte += `═══════════════════\n`;
      
      armesFaction[rang].forEach((arme, index) => {
        const imageIndicator = arme.image ? " 🖼️" : "";
        const stockIndicator = arme.stock > 0 ? ` 📦${arme.stock}` : " ❌Rupture";
        texte += `*${index + 1}.* ${arme.nom}${imageIndicator}${stockIndicator}\n`;
        texte += `   ⚔️ Dégâts: ${arme.degats} | ⚖️ Poids: ${arme.poids}kg\n`;
        texte += `   💸 ${arme.prix.toLocaleString()} ${arme.devise}\n\n`;
      });
    }
  }
  
  if (!hasArmes) {
    texte += `❌ Aucune arme disponible pour la faction ${faction}.\n\n`;
  }
  
  texte += `*0.* ↩️ Retour au compendium\n═════════════════\n*Choisis une arme pour voir les détails :*`;
  
  const message = await riza.sendMessage(chat, { text: texte }, { quoted: quotedMsg });
  return message;
}

// Fonction pour afficher les détails d'une arme spécifique
async function showDetailsArme(riza, chat, arme, armeId, faction, quotedMsg) {
  let texte = `⚔️ *${arme.nom}* ⚔️\n`;
  texte += `🛡️ *Faction:* ${faction}\n`;
  texte += `🎯 *Rang:* ${arme.rang}\n`;
  texte += `════════════════════\n`;
  texte += `📝 ${arme.description}\n\n`;
  texte += `*📊 CARACTÉRISTIQUES :*\n`;
  texte += `⚔️ Dégâts: ${arme.degats}\n`;
  texte += `⚖️ Poids: ${arme.poids}kg\n\n`;
  texte += `*💰 PRIX :* ${arme.prix.toLocaleString()} ${arme.devise}\n`;
  texte += `📦 *Stock disponible:* ${arme.stock} exemplaire(s)\n\n`;
  
  texte += `════════════════════\n`;
  texte += `1. 🛒 Acheter cette arme\n`;
  texte += `0. ↩️ Retour aux armes ${faction}\n`;
  texte += `════════════════════\n*Choisis une option :*`;
  
  let message;
  
  if (arme.image) {
    try {
      const imageBuffer = await downloadImage(arme.image);
      if (imageBuffer) {
        message = await riza.sendMessage(chat, {
          image: imageBuffer,
          caption: texte
        }, { quoted: quotedMsg });
        return message;
      }
    } catch (error) {
      console.error('Erreur envoi image détail:', error);
    }
  }
  
  message = await riza.sendMessage(chat, { text: texte }, { quoted: quotedMsg });
  return message;
}

// Fonction pour obtenir tous les vêtements
function getVetements() {
  const boutique = loadBoutique();
  const vetements = [];
  
  // Parcourir les catégories de vêtements
  const categoriesVetements = ["vetements", "armures"];
  
  categoriesVetements.forEach(categorie => {
    if (boutique.articles[categorie]) {
      Object.entries(boutique.articles[categorie]).forEach(([id, vetement]) => {
        vetements.push({
          id: id,
          nom: vetement.nom,
          description: vetement.description,
          prix: vetement.prix,
          devise: vetement.devise,
          resistance: vetement.resistance || "Non spécifié",
          effets: vetement.effets || "Aucun",
          malus: vetement.malus || "Aucun",
          stock: vetement.stock || 0,
          image: vetement.image || null,
          categorie: categorie
        });
      });
    }
  });
  
  return vetements;
}

// Fonction pour afficher les vêtements
async function showVetements(riza, chat, quotedMsg) {
  const vetements = getVetements();
  let texte = `👕 *VÊTEMENTS & ARMURES* 👕\n══════════════════\n\n`;
  
  if (vetements.length === 0) {
    texte += "❌ Aucun vêtement disponible pour le moment.\n";
  } else {
    vetements.forEach((vetement, index) => {
      const stockIndicator = vetement.stock > 0 ? ` 📦${vetement.stock}` : " ❌Rupture";
      texte += `*${index + 1}.* ${vetement.nom}${stockIndicator}\n`;
      texte += `   🛡️ Résistance: ${vetement.resistance} | 💸 ${vetement.prix.toLocaleString()} ${vetement.devise}\n\n`;
    });
  }
  
  texte += `*0.* ↩️ Retour au menu\n═════════════════\n*Choisis un vêtement pour voir les détails :*`;
  
  const message = await riza.sendMessage(chat, { text: texte }, { quoted: quotedMsg });
  return message;
}

// Fonction pour afficher les détails d'un vêtement
async function showDetailsVetement(riza, chat, vetement, quotedMsg) {
  let texte = `👕 *${vetement.nom}* 👕\n`;
  texte += `════════════════════\n`;
  texte += `📝 ${vetement.description}\n\n`;
  texte += `*📊 CARACTÉRISTIQUES :*\n`;
  texte += `🛡️ Résistance: ${vetement.resistance}\n`;
  texte += `✨ Effets: ${vetement.effets}\n`;
  if (vetement.malus && vetement.malus !== "Aucun") {
    texte += `⚠️ Malus: ${vetement.malus}\n`;
  }
  texte += `\n*💰 PRIX :* ${vetement.prix.toLocaleString()} ${vetement.devise}\n`;
  texte += `📦 *Stock disponible:* ${vetement.stock} exemplaire(s)\n\n`;
  
  texte += `════════════════════\n`;
  texte += `1. 🛒 Acheter ce vêtement\n`;
  texte += `0. ↩️ Retour aux vêtements\n`;
  texte += `════════════════════\n*Choisis une option :*`;
  
  let message;
  
  if (vetement.image) {
    try {
      const imageBuffer = await downloadImage(vetement.image);
      if (imageBuffer) {
        message = await riza.sendMessage(chat, {
          image: imageBuffer,
          caption: texte
        }, { quoted: quotedMsg });
        return message;
      }
    } catch (error) {
      console.error('Erreur envoi image vêtement:', error);
    }
  }
  
  message = await riza.sendMessage(chat, { text: texte }, { quoted: quotedMsg });
  return message;
}

// Fonction pour obtenir tous les consommables
function getConsommables() {
  const boutique = loadBoutique();
  const consommables = [];
  
  // Parcourir les catégories de consommables
  const categoriesConsommables = ["potions", "consommables"];
  
  categoriesConsommables.forEach(categorie => {
    if (boutique.articles[categorie]) {
      Object.entries(boutique.articles[categorie]).forEach(([id, consommable]) => {
        consommables.push({
          id: id,
          nom: consommable.nom,
          description: consommable.description,
          prix: consommable.prix,
          devise: consommable.devise,
          effets: consommable.effets || "Aucun",
          type: consommable.type || "Divers",
          stock: consommable.stock || 0,
          image: consommable.image || null,
          categorie: categorie
        });
      });
    }
  });
  
  return consommables;
}

// Fonction pour afficher les consommables
async function showConsommables(riza, chat, quotedMsg) {
  const consommables = getConsommables();
  let texte = `🧪 *CONSOMMABLES & POTIONS* 🧪\n══════════════════\n\n`;
  
  if (consommables.length === 0) {
    texte += "❌ Aucun consommable disponible pour le moment.\n";
  } else {
    consommables.forEach((consommable, index) => {
      const stockIndicator = consommable.stock > 0 ? ` 📦${consommable.stock}` : " ❌Rupture";
      texte += `*${index + 1}.* ${consommable.nom}${stockIndicator}\n`;
      texte += `   🧪 Type: ${consommable.type} | 💸 ${consommable.prix.toLocaleString()} ${consommable.devise}\n\n`;
    });
  }
  
  texte += `*0.* ↩️ Retour au menu\n═════════════════\n*Choisis un consommable pour voir les détails :*`;
  
  const message = await riza.sendMessage(chat, { text: texte }, { quoted: quotedMsg });
  return message;
}

// Fonction pour afficher les détails d'un consommable
async function showDetailsConsommable(riza, chat, consommable, quotedMsg) {
  let texte = `🧪 *${consommable.nom}* 🧪\n`;
  texte += `📋 Type: ${consommable.type}\n`;
  texte += `════════════════════\n`;
  texte += `📝 ${consommable.description}\n\n`;
  texte += `*✨ EFFETS :*\n${consommable.effets}\n\n`;
  texte += `*💰 PRIX :* ${consommable.prix.toLocaleString()} ${consommable.devise}\n`;
  texte += `📦 *Stock disponible:* ${consommable.stock} exemplaire(s)\n\n`;
  
  texte += `════════════════════\n`;
  texte += `1. 🛒 Acheter ce consommable\n`;
  texte += `0. ↩️ Retour aux consommables\n`;
  texte += `════════════════════\n*Choisis une option :*`;
  
  let message;
  
  if (consommable.image) {
    try {
      const imageBuffer = await downloadImage(consommable.image);
      if (imageBuffer) {
        message = await riza.sendMessage(chat, {
          image: imageBuffer,
          caption: texte
        }, { quoted: quotedMsg });
        return message;
      }
    } catch (error) {
      console.error('Erreur envoi image consommable:', error);
    }
  }
  
  message = await riza.sendMessage(chat, { text: texte }, { quoted: quotedMsg });
  return message;
}

module.exports = {
  loadBoutique,
  loadArgent,
  saveArgent,
  loadFiches,
  loadSocial,
  initCompte,
  sendArticleWithImage,
  ajouterTaxe,
  verserVente,
  decrementerStock,
  trouverArticleParId,
  getCompendiumArmes,
  showCompendiumArmes,
  afficherArmesParFaction,
  showDetailsArme,
  loadInventaire,
  saveInventaire,
  initInventaire,
  ajouterArticle,
  getVetements,
  showVetements,
  showDetailsVetement,
  getConsommables,
  showConsommables,
  showDetailsConsommable
};