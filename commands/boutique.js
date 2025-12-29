const fs = require("fs");
const path = require("path");
const axios = require("axios");

const BOUTIQUE_PATH = path.join(__dirname, "../data/boutique.json");
const ARGENT_PATH = path.join(__dirname, "../data/banque.json");
const FICHES_PATH = path.join(__dirname, "../data/fiches.json");
const SOCIAL_PATH = path.join(__dirname, "../data/social.json");
const INVENTAIRE_PATH = path.join(__dirname, "../data/inventaire.json");

// ============================================
// FONCTIONS UTILITAIRES DU BOUTIQUE.JS
// ============================================

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

// ============================================
// COMMANDE BOUTIQUE PRINCIPALE
// ============================================

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

module.exports = {
  name: "boutique",
  category: "UNIROLIST",
  description: "Boutique officielle Valoria - Acheter des articles",
  allowedForAll: true,

  // Exporter toutes les fonctions utilitaires
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
  ajouterArticle,
  getVetements,
  showVetements,
  showDetailsVetement,
  getConsommables,
  showConsommables,
  showDetailsConsommable,
  loadInventaire,
  saveInventaire,
  initInventaire,

  async execute(riza, m, args) {
    const jid = m.sender;
    const fiches = loadFiches();
    const socials = loadSocial();

    if (!fiches[jid] || !socials[jid]) {
      return riza.sendMessage(m.chat, {
        text: "❌ *ACCÈS REFUSÉ*\n\nTu n'as pas encore de fiche enregistrée.\n\nUtilise `!enregistrer` avec un admin pour commencer !"
      }, { quoted: m });
    }

    const factionJoueur = normaliserFaction(socials[jid].faction) || "Non définie";
    const compte = initCompte(jid);
    let lastMessage = null;
    let currentStep = "menu_principal";
    let sessionActive = true;
    let compendiumData = null;
    let currentFaction = null;
    let currentArmesFaction = null;
    let currentVetements = null;
    let currentConsommables = null;

    const showMenuPrincipal = async (quotedMsg = m) => {
      if (!sessionActive) return;

      const compteActuel = initCompte(jid);
      const menuText = `🏪 *BOUTIQUE VALORIA* - ${factionJoueur}
══════════════════
1. 💱 Conversions
2. ⚔️ Compendium des Armes
3. 👕 Vêtements & Armures
4. 🧪 Consommables & Potions
5. 💸 Mon solde
6. 🎒 Mon inventaire
7. 🛠️ Infos Valoria
8. ❌ Quitter

💸 *Solde :*
💎 ${compteActuel.diamants.toLocaleString()} 
💰 ${compteActuel.rulith.toLocaleString()}
══════════════════
*Choisis (1-8) :*`;

      const menuMessage = await riza.sendMessage(m.chat, { text: menuText }, { quoted: quotedMsg });
      lastMessage = menuMessage;
      currentStep = "menu_principal";
    };

    const showArticles = async (categorie, titre, quotedMsg) => {
      const boutique = loadBoutique();
      let articles = boutique.articles[categorie] || {};
      
      let texte = `🛒 *${titre}*\n══════════════════\n`;
      
      // Cas spécial pour les conversions
      if (categorie === "conversion") {
        texte += `*1.* 💎 Diamants en Rulith\n`;
        texte += `   📝 Convertir des Diamants en Rulith\n\n`;
        texte += `*2.* 💰 Rulith en Diamants\n`;
        texte += `   📝 Convertir des Rulith en Diamants\n\n`;
      }

      texte += `*0.* ↩️ Retour\n══════════════════\n*Choisis un article :*`;
      
      const message = await riza.sendMessage(m.chat, { text: texte }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = `selection_${categorie}`;
    };

    const processAchat = async (categorie, articleId, quotedMsg) => {
      const boutique = loadBoutique();
      const article = boutique.articles[categorie]?.[articleId];
      
      if (!article) {
        await riza.sendMessage(m.chat, { text: "❌ Article introuvable." }, { quoted: quotedMsg });
        return showMenuPrincipal(quotedMsg);
      }

      // Vérifier si l'arme est accessible à la faction du joueur (SEULEMENT POUR LES ARMES)
      if (["hermes", "hecate", "arès", "atlas", "ares"].includes(categorie.toLowerCase())) {
        const factionArticle = normaliserFaction(categorie);
        const factionJoueurNorm = normaliserFaction(factionJoueur);
        
        if (factionArticle !== factionJoueurNorm) {
          await riza.sendMessage(m.chat, {
            text: `❌ *ACCÈS REFUSÉ*\n\nCette arme n'est pas accessible à la faction ${factionJoueur}.\n\nFaction requise: ${factionArticle}`
          }, { quoted: quotedMsg });
          return showMenuPrincipal(quotedMsg);
        }
      }

      // Vérifier stock
      if (article.stock !== undefined && article.stock <= 0) {
        await riza.sendMessage(m.chat, { 
          text: `❌ *RUPTURE DE STOCK*\n\n${article.nom} n'est plus disponible.` 
        }, { quoted: quotedMsg });
        return showMenuPrincipal(quotedMsg);
      }

      const compteActuel = initCompte(jid);
      const solde = article.devise === "💎" ? compteActuel.diamants : compteActuel.rulith;

      if (solde < article.prix) {
        await riza.sendMessage(m.chat, {
          text: `❌ *SOLDE INSUFFISANT*\n\nPrix : ${article.prix.toLocaleString()} ${article.devise}\nTon solde : ${solde.toLocaleString()} ${article.devise}`
        }, { quoted: quotedMsg });
        return showMenuPrincipal(quotedMsg);
      }

      // Afficher l'article avec son image
      await sendArticleWithImage(riza, m.chat, article, quotedMsg);

      const confirmationText = `══════════════════\n💎 *Confirmer l'achat ?*\n\nTape *oui* pour acheter ou *non* pour annuler :`;
      
      const confirmationMsg = await riza.sendMessage(m.chat, { text: confirmationText }, { quoted: quotedMsg });
      lastMessage = confirmationMsg;
      currentStep = `confirmation_${categorie}_${articleId}`;
    };

    const processConversion = async (type, quotedMsg) => {
      const compteActuel = initCompte(jid);
      const deviseSource = type === "conversion_diamants_vers_rulith" ? "diamants" : "rulith";
      const deviseSourceSymbole = type === "conversion_diamants_vers_rulith" ? "💎" : "Ru";
      const deviseCibleSymbole = type === "conversion_diamants_vers_rulith" ? "Ru" : "💎";
      
      const soldeSource = compteActuel[deviseSource] || 0;
      const soldeRu = compteActuel.rulith || 0;

      if (soldeSource === 0) {
        await riza.sendMessage(m.chat, {
          text: `❌ *SOLDE INSUFFISANT*\n\nTu n'as pas de ${deviseSourceSymbole} à convertir.\n\nSolde ${deviseSourceSymbole} : ${soldeSource.toLocaleString()}`
        }, { quoted: quotedMsg });
        return showMenuPrincipal(quotedMsg);
      }

      const conversionMessage = await riza.sendMessage(m.chat, {
        text: `💱 *CONVERSION ${deviseSourceSymbole} → ${deviseCibleSymbole}*
═════════════════════
*Solde disponible :* ${soldeSource.toLocaleString()} ${deviseSourceSymbole}
*Solde Ru :* ${soldeRu.toLocaleString()} Ru
*Taux de change :* 1💎 = 1,000 Ru
*Taxe :* 1% en Ru sur le montant converti

═════════════════════
*Entrez le montant à convertir :*
*Exemple :* 1000

*Ou tapez* \`max\` *pour tout convertir*
═════════════════════`
      }, { quoted: quotedMsg });

      lastMessage = conversionMessage;
      currentStep = `conversion_${type}`;
    };

    // Écouteur joueur
    const listener = async ({ messages }) => {
      if (!sessionActive) return;

      const msg = messages[0];
      if (!msg.message) return;

      const from = msg.key.participant || msg.key.remoteJid;
      if (from !== jid) return;

      const context = msg.message?.extendedTextMessage?.contextInfo;
      if (!context || context.stanzaId !== lastMessage?.key?.id) return;

      const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const reponse = content.trim().toLowerCase();

      try {
        if (currentStep === "menu_principal") {
          if (reponse === "1") {
            await showArticles("conversion", "💱 CONVERSIONS", msg);
          }
          else if (reponse === "2") {
            compendiumData = getCompendiumArmes();
            // Afficher directement la faction du joueur
            if (factionJoueur && factionJoueur !== "Non définie" && compendiumData[factionJoueur]) {
              currentFaction = factionJoueur;
              currentArmesFaction = compendiumData[factionJoueur];
              lastMessage = await afficherArmesParFaction(riza, m.chat, currentArmesFaction, currentFaction, msg);
              currentStep = "compendium_armes";
            } else {
              lastMessage = await showCompendiumArmes(riza, m.chat, msg, factionJoueur);
              currentStep = "compendium_factions";
            }
          }
          else if (reponse === "3") {
            currentVetements = getVetements();
            lastMessage = await showVetements(riza, m.chat, msg);
            currentStep = "vetements";
          }
          else if (reponse === "4") {
            currentConsommables = getConsommables();
            lastMessage = await showConsommables(riza, m.chat, msg);
            currentStep = "consommables";
          }
          else if (reponse === "5") {
            const compteActuel = initCompte(jid);
            await riza.sendMessage(m.chat, {
              text: `💸 *TON SOLDE*\n══════════════════\n💎 ${compteActuel.diamants.toLocaleString()} Diamants\n💰 ${compteActuel.rulith.toLocaleString()} Rulith`
            }, { quoted: msg });
            await showMenuPrincipal(msg);
          }
          else if (reponse === "6") {
            // Afficher l'inventaire
            const { showInventaire } = require('../lib/inventaire');
            await showInventaire(riza, m.chat, jid, msg);
            await showMenuPrincipal(msg);
          }
          else if (reponse === "7") {
            await this.showInfosValoria(riza, msg);
            await showMenuPrincipal(msg);
          }
          else if (reponse === "8") {
            sessionActive = false;
            riza.ev.off("messages.upsert", listener);
            await riza.sendMessage(m.chat, { text: "👋 À bientôt !" }, { quoted: msg });
          }
          else {
            await showMenuPrincipal(msg);
          }
        }
        else if (currentStep.startsWith("selection_")) {
          if (reponse === "0") {
            await showMenuPrincipal(msg);
          } else {
            const categorie = currentStep.replace("selection_", "");
            if (categorie === "conversion") {
              if (reponse === "1") await processConversion("conversion_diamants_vers_rulith", msg);
              else if (reponse === "2") await processConversion("conversion_rulith_vers_diamants", msg);
              else await showArticles("conversion", "💱 CONVERSIONS", msg);
            }
          }
        }
        else if (currentStep === "compendium_factions") {
          if (reponse === "0") {
            await showMenuPrincipal(msg);
          } else {
            const factions = Object.keys(compendiumData).sort();
            const index = parseInt(reponse) - 1;
            
            if (index >= 0 && index < factions.length) {
              currentFaction = factions[index];
              currentArmesFaction = compendiumData[currentFaction];
              lastMessage = await afficherArmesParFaction(riza, m.chat, currentArmesFaction, currentFaction, msg);
              currentStep = "compendium_armes";
            } else {
              await showCompendiumArmes(riza, m.chat, msg);
            }
          }
        }
        else if (currentStep === "compendium_armes") {
          if (reponse === "0") {
            lastMessage = await showCompendiumArmes(riza, m.chat, msg);
            currentStep = "compendium_factions";
          } else {
            // Récupérer toutes les armes de la faction par rang
            const rangs = ["S", "A", "B", "C", "D", "E"];
            let toutesArmes = [];
            
            for (const rang of rangs) {
              if (currentArmesFaction[rang]) {
                toutesArmes = toutesArmes.concat(currentArmesFaction[rang]);
              }
            }
            
            const index = parseInt(reponse) - 1;
            if (index >= 0 && index < toutesArmes.length) {
              const armeSelectionnee = toutesArmes[index];
              // Trouver la catégorie réelle de l'arme
              const resultat = trouverArticleParId(armeSelectionnee.id);
              if (resultat) {
                lastMessage = await showDetailsArme(riza, m.chat, resultat.article, armeSelectionnee.id, currentFaction, msg);
                currentStep = `details_arme_${armeSelectionnee.id}`;
              } else {
                await riza.sendMessage(m.chat, { text: "❌ Arme introuvable." }, { quoted: msg });
                await afficherArmesParFaction(riza, m.chat, currentArmesFaction, currentFaction, msg);
              }
            } else {
              await afficherArmesParFaction(riza, m.chat, currentArmesFaction, currentFaction, msg);
            }
          }
        }
        else if (currentStep.startsWith("details_arme_")) {
          if (reponse === "0") {
            lastMessage = await afficherArmesParFaction(riza, m.chat, currentArmesFaction, currentFaction, msg);
            currentStep = "compendium_armes";
          } else if (reponse === "1") {
            const armeId = currentStep.replace("details_arme_", "");
            const resultat = trouverArticleParId(armeId);
            if (resultat) {
              await processAchat(resultat.categorie, resultat.id, msg);
            } else {
              await riza.sendMessage(m.chat, { text: "❌ Arme introuvable." }, { quoted: msg });
              await showMenuPrincipal(msg);
            }
          } else {
            await showMenuPrincipal(msg);
          }
        }
        else if (currentStep === "vetements") {
          if (reponse === "0") {
            await showMenuPrincipal(msg);
          } else {
            const index = parseInt(reponse) - 1;
            if (index >= 0 && index < currentVetements.length) {
              const vetementSelectionne = currentVetements[index];
              lastMessage = await showDetailsVetement(riza, m.chat, vetementSelectionne, msg);
              currentStep = `details_vetement_${vetementSelectionne.id}`;
            } else {
              await showVetements(riza, m.chat, msg);
            }
          }
        }
        else if (currentStep.startsWith("details_vetement_")) {
          if (reponse === "0") {
            lastMessage = await showVetements(riza, m.chat, msg);
            currentStep = "vetements";
          } else if (reponse === "1") {
            const vetementId = currentStep.replace("details_vetement_", "");
            const resultat = trouverArticleParId(vetementId);
            if (resultat) {
              await processAchat(resultat.categorie, resultat.id, msg);
            } else {
              await riza.sendMessage(m.chat, { text: "❌ Vêtement introuvable." }, { quoted: msg });
              await showMenuPrincipal(msg);
            }
          } else {
            await showMenuPrincipal(msg);
          }
        }
        else if (currentStep === "consommables") {
          if (reponse === "0") {
            await showMenuPrincipal(msg);
          } else {
            const index = parseInt(reponse) - 1;
            if (index >= 0 && index < currentConsommables.length) {
              const consommableSelectionne = currentConsommables[index];
              lastMessage = await showDetailsConsommable(riza, m.chat, consommableSelectionne, msg);
              currentStep = `details_consommable_${consommableSelectionne.id}`;
            } else {
              await showConsommables(riza, m.chat, msg);
            }
          }
        }
        else if (currentStep.startsWith("details_consommable_")) {
          if (reponse === "0") {
            lastMessage = await showConsommables(riza, m.chat, msg);
            currentStep = "consommables";
          } else if (reponse === "1") {
            const consommableId = currentStep.replace("details_consommable_", "");
            const resultat = trouverArticleParId(consommableId);
            if (resultat) {
              await processAchat(resultat.categorie, resultat.id, msg);
            } else {
              await riza.sendMessage(m.chat, { text: "❌ Consommable introuvable." }, { quoted: msg });
              await showMenuPrincipal(msg);
            }
          } else {
            await showMenuPrincipal(msg);
          }
        }
        else if (currentStep.startsWith("confirmation_")) {
          if (reponse === "oui") {
            const parts = currentStep.split('_');
            if (parts.length < 3) {
              await riza.sendMessage(m.chat, { text: "❌ Erreur: format de confirmation invalide." }, { quoted: msg });
              return showMenuPrincipal(msg);
            }
            
            const categorie = parts[1];
            const articleId = parts.slice(2).join('_');
            
            console.log("🛒 Confirmation achat:", { categorie, articleId });
            
            const resultat = trouverArticleParId(articleId);
            if (!resultat) {
              await riza.sendMessage(m.chat, { 
                text: `❌ Article introuvable.\nID: ${articleId}\nCatégorie: ${categorie}` 
              }, { quoted: msg });
              return showMenuPrincipal(msg);
            }

            const article = resultat.article;
            const categorieReelle = resultat.categorie;
            const idReel = resultat.id;

            // Vérifier stock à nouveau
            if (article.stock !== undefined && article.stock <= 0) {
              await riza.sendMessage(m.chat, { 
                text: `❌ Plus en stock !` 
              }, { quoted: msg });
              return showMenuPrincipal(msg);
            }

            const banque = loadArgent();
            const compteActuel = banque[jid];

            // Débiter le joueur
            if (article.devise === "💎") {
              if (compteActuel.diamants < article.prix) {
                await riza.sendMessage(m.chat, {
                  text: `❌ *SOLDE INSUFFISANT*\n\nPrix : ${article.prix.toLocaleString()} ${article.devise}\nTon solde : ${compteActuel.diamants.toLocaleString()} ${article.devise}`
                }, { quoted: msg });
                return showMenuPrincipal(msg);
              }
              compteActuel.diamants -= article.prix;
            } else {
              if (compteActuel.rulith < article.prix) {
                await riza.sendMessage(m.chat, {
                  text: `❌ *SOLDE INSUFFISANT*\n\nPrix : ${article.prix.toLocaleString()} ${article.devise}\nTon solde : ${compteActuel.rulith.toLocaleString()} ${article.devise}`
                }, { quoted: msg });
                return showMenuPrincipal(msg);
              }
              compteActuel.rulith -= article.prix;
            }

            // Gérer stock
            if (article.stock !== undefined) {
              decrementerStock(categorieReelle, idReel);
            }

            // Taxes et revenus
            const taxe = ajouterTaxe(article.prix, article.devise, "achat", jid, article.nom);
            const revenu = article.prix - taxe;
            verserVente(revenu, article.devise, "vente", jid, article.nom);

            saveArgent(banque);

            // AJOUTER À L'INVENTAIRE
            let typeInventaire = "objets";
            if (["hermes", "hecate", "arès", "atlas", "ares"].includes(categorieReelle.toLowerCase())) {
              typeInventaire = "armes";
            } else if (categorieReelle === "vetements" || categorieReelle === "armures") {
              typeInventaire = "armures";
            } else if (categorieReelle === "potions" || categorieReelle === "consommables") {
              typeInventaire = "objets";
            }
            
            ajouterArticle(jid, { ...article, id: idReel }, typeInventaire);

            let messageSucces = `🎉 *ACHAT RÉUSSI !*\n══════════════════\n📦 ${article.nom}\n💸 ${article.prix.toLocaleString()} ${article.devise} débités`;
            
            if (article.stock !== undefined) {
              const boutiqueMaj = loadBoutique();
              const nouveauStock = boutiqueMaj.articles[categorieReelle]?.[idReel]?.stock || 0;
              messageSucces += `\n📦 Restant : ${nouveauStock}`;
            }

            messageSucces += `\n🎒 *Ajouté à ton inventaire !*\n`;
            messageSucces += `══════════════════`;

            await riza.sendMessage(m.chat, { text: messageSucces }, { quoted: msg });
            await showMenuPrincipal(msg);

          } else if (reponse === "non") {
            await riza.sendMessage(m.chat, { text: "❌ Achat annulé." }, { quoted: msg });
            await showMenuPrincipal(msg);
          } else {
            await showMenuPrincipal(msg);
          }
        }
        else if (currentStep.startsWith("conversion_")) {
          const type = currentStep.replace("conversion_", "");
          const isDiamantsVersRulith = type === "conversion_diamants_vers_rulith";
          const deviseSource = isDiamantsVersRulith ? "diamants" : "rulith";
          const deviseSourceSymbole = isDiamantsVersRulith ? "💎" : "Ru";
          const deviseCibleSymbole = isDiamantsVersRulith ? "Ru" : "💎";
          
          const compteActuel = initCompte(jid);
          const soldeSource = compteActuel[deviseSource] || 0;
          const soldeRu = compteActuel.rulith || 0;
          
          let montant = 0;
          
          if (reponse === "max") {
            montant = soldeSource;
          } else {
            montant = parseInt(reponse);
            if (isNaN(montant) || montant <= 0) {
              await riza.sendMessage(m.chat, {
                text: "❌ Montant invalide. Veuillez entrer un nombre positif."
              }, { quoted: msg });
              return processConversion(type, msg);
            }
          }
          
          if (montant > soldeSource) {
            await riza.sendMessage(m.chat, {
              text: `❌ *SOLDE INSUFFISANT*\n\nMontant demandé : ${montant.toLocaleString()} ${deviseSourceSymbole}\nSolde disponible : ${soldeSource.toLocaleString()} ${deviseSourceSymbole}`
            }, { quoted: msg });
            return processConversion(type, msg);
          }
          
          // Calcul du montant Ru impliqué pour déterminer la taxe
          let montantRuImplique = 0;
          if (isDiamantsVersRulith) {
            montantRuImplique = montant * 1000;
          } else {
            montantRuImplique = montant;
          }
          
          // Taxe de 1% sur le montant Ru impliqué
          const taxeRu = Math.ceil(montantRuImplique * 0.01);
          
          // Vérifier si le joueur a assez de Ru pour payer la taxe APRÈS conversion
          let soldeRuApresConversion = soldeRu;
          if (isDiamantsVersRulith) {
            soldeRuApresConversion += montant * 1000;
          } else {
            soldeRuApresConversion -= montant;
          }
          
          if (soldeRuApresConversion < taxeRu) {
            await riza.sendMessage(m.chat, {
              text: `❌ *TAXE INSUFFISANTE*\n\nTaxe de conversion : ${taxeRu} Ru (1% du montant)\nTon solde Ru après conversion : ${soldeRuApresConversion.toLocaleString()} Ru\n\nTu n'auras pas assez de Ru pour payer la taxe de conversion.`
            }, { quoted: msg });
            return processConversion(type, msg);
          }
          
          // VÉRIFICATION : Pour Ru→💎, s'assurer que le montant est un multiple de 1000
          if (!isDiamantsVersRulith && montant % 1000 !== 0) {
            await riza.sendMessage(m.chat, {
              text: `❌ *MONTANT INVALIDE*\n\nPour convertir des Ru en Diamants, le montant doit être un multiple de 1000.\nExemples : 1000, 2000, 5000, etc.`
            }, { quoted: msg });
            return processConversion(type, msg);
          }
          
          // Calcul de la conversion EXACTE
          let montantFinal = 0;
          if (isDiamantsVersRulith) {
            montantFinal = montant * 1000;
          } else {
            montantFinal = montant / 1000;
          }
          
          // Appliquer la conversion
          const banque = loadArgent();
          const compte = banque[jid];
          
          if (isDiamantsVersRulith) {
            compte.diamants -= montant;
            compte.rulith += montantFinal;
          } else {
            compte.rulith -= montant;
            compte.diamants += montantFinal;
          }
          
          // Déduire la taxe en Ru
          compte.rulith -= taxeRu;
          
          // Ajouter la taxe à Valoria
          ajouterTaxe(taxeRu, "Ru", "conversion", jid, `Taxe conversion ${deviseSourceSymbole}→${deviseCibleSymbole}`);
          
          saveArgent(banque);
          
          await riza.sendMessage(m.chat, {
            text: `💱 *CONVERSION RÉUSSIE !*\n══════════════════\n💸 Converti : ${montant.toLocaleString()} ${deviseSourceSymbole}\n💰 Reçu : ${montantFinal} ${deviseCibleSymbole}\n🏛️ Taxe de conversion : ${taxeRu} Ru (1%)\n\nNouveau solde :\n💎 ${banque[jid].diamants} Diamants\n💰 ${banque[jid].rulith.toLocaleString()} Rulith`
          }, { quoted: msg });
          
          await showMenuPrincipal(msg);
        }
      } catch (error) {
        console.error("Erreur boutique:", error);
        await riza.sendMessage(m.chat, { text: "❌ Erreur, retour au menu." }, { quoted: msg });
        await showMenuPrincipal(msg);
      }
    };

    riza.ev.on("messages.upsert", listener);
    await showMenuPrincipal();
  },

  async showInfosValoria(riza, m) {
    const boutique = loadBoutique();
    const valoria = boutique.valoria;
    
    let infosText = `🛠️ *TRÉSOR DE VALORIA*\n══════════════════\n`;
    infosText += `💎 ${valoria.diamants.toLocaleString()} Diamants\n`;
    infosText += `💰 ${valoria.rulith.toLocaleString()} Rulith\n\n`;
    infosText += `*La taxe de 1% sert à:*\n• Développer le royaume\n• Financer les événements\n• Soutenir les guildes\n`;
    infosText += `══════════════════`;

    await riza.sendMessage(m.chat, { text: infosText }, { quoted: m });
  }
};