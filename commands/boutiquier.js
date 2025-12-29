const fs = require("fs");
const path = require("path");

// Chemin des fichiers JSON
const BOUTIQUE_PATH = path.join(__dirname, "../data/boutique.json");
const ARGENT_PATH = path.join(__dirname, "../data/banque.json");

// Charger la boutique
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
        "consommables": {},
        "hermes": {},
        "hecate": {},
        "arès": {},
        "atlas": {},
        "conversion": {}
      }
    };
    fs.writeFileSync(BOUTIQUE_PATH, JSON.stringify(structureInitiale, null, 2));
  }
  return JSON.parse(fs.readFileSync(BOUTIQUE_PATH));
}

// Sauvegarder la boutique
function saveBoutique(data) {
  fs.writeFileSync(BOUTIQUE_PATH, JSON.stringify(data, null, 2));
}

// Charger l'argent
function loadArgent() {
  if (!fs.existsSync(ARGENT_PATH)) {
    fs.writeFileSync(ARGENT_PATH, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(ARGENT_PATH));
}

// Normaliser les factions
function normaliserFaction(faction) {
  if (!faction) return "Non définie";
  const factionLower = faction.toLowerCase();
  if (factionLower.includes("herm") || factionLower.includes("hermes")) return "hermes";
  if (factionLower.includes("hecat") || factionLower.includes("hécat")) return "hecate";
  if (factionLower.includes("arès") || factionLower.includes("ares")) return "arès";
  if (factionLower.includes("atlas")) return "atlas";
  return faction.toLowerCase();
}

// Fonction pour trouver un article par son ID interne
function trouverArticleParIdInternal(articleId) {
  const boutique = loadBoutique();
  
  for (const [categorie, articles] of Object.entries(boutique.articles)) {
    for (const [key, article] of Object.entries(articles)) {
      // Vérifier si l'article a un champ id qui correspond
      if (article.id === articleId) {
        return { article, categorie, key };
      }
      // Vérifier aussi par la clé si pas d'id défini
      if (key === articleId) {
        return { article, categorie, key };
      }
    }
  }
  
  return null;
}

module.exports = {
  name: "boutiquier",
  category: "OWNER",
  description: "Gestion de la boutique Valoria (admin seulement)",
  onlyAdmin: true,
  allowedForAll: false,
  
  async execute(riza, m, args) {
    const sender = m.sender;
    const isGroup = m.chat.endsWith("@g.us");
    
    // Vérifier si l'utilisateur est admin ou propriétaire
    let isAdmin = false;
    if (isGroup) {
      try {
        const metadata = await riza.groupMetadata(m.chat);
        const admins = metadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
        isAdmin = admins.some(p => p.id === sender);
      } catch (err) {
        console.error("Erreur vérification admin:", err);
      }
    }
    
    // Vérifier si c'est le propriétaire
    const senderBase = sender.split("@")[0];
    const senderLid = `${senderBase}@lid`;
    const senderSw = `${senderBase}@s.whatsapp.net`;
    const isOwner = Array.isArray(global.owner)
      ? global.owner.includes(senderLid) || global.owner.includes(senderSw) || global.owner.includes(senderBase)
      : [senderLid, senderSw, senderBase].includes(global.owner?.toString());
    
    if (!isOwner && !isAdmin) {
      return riza.sendMessage(m.chat, {
        text: "❌ *ACCÈS REFUSÉ*\n\nCette commande est réservée aux administrateurs et propriétaires."
      }, { quoted: m });
    }
    
    const boutique = loadBoutique();
    const argent = loadArgent();
    
    let currentStep = "menu_principal";
    let lastMessage = null;
    let sessionActive = true;
    let tempData = {}; // Pour stocker des données temporaires pendant la création/modification
    
    const showMenuPrincipal = async (quotedMsg = m) => {
      if (!sessionActive) return;
      
      // Compter le nombre total d'articles
      let totalArticles = 0;
      const statsCategories = {};
      
      Object.entries(boutique.articles).forEach(([categorie, articles]) => {
        const count = Object.keys(articles).length;
        statsCategories[categorie] = count;
        totalArticles += count;
      });
      
      const menuText = `🛠️ *PANEL BOUTIQUIER - VALORIA*
══════════════════
1. 📦 Gérer les articles (${totalArticles})
2. 📊 Statistiques boutique
3. 💰 Gérer le trésor de Valoria
4. 📈 Transactions récentes
5. 🔧 Paramètres boutique
6. ❌ Quitter le panel

══════════════════
*Trésor Valoria :*
💎 ${boutique.valoria.diamants.toLocaleString()} Diamants
💰 ${boutique.valoria.rulith.toLocaleString()} Rulith

*Articles par catégorie :*
${Object.entries(statsCategories).map(([cat, count]) => `• ${cat}: ${count}`).join('\n')}
══════════════════
*Choisis une option (1-6) :*`;
      
      const message = await riza.sendMessage(m.chat, { text: menuText }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "menu_principal";
    };
    
    const showGestionArticles = async (quotedMsg) => {
      const categories = Object.keys(boutique.articles).sort();
      let texte = `📦 *GESTION DES ARTICLES*
══════════════════
*Catégories disponibles :*\n\n`;
      
      categories.forEach((categorie, index) => {
        const count = Object.keys(boutique.articles[categorie] || {}).length;
        texte += `${index + 1}. ${categorie.toUpperCase()} (${count} articles)\n`;
      });
      
      texte += `\n══════════════════\n`;
      texte += `7. ➕ Ajouter un nouvel article\n`;
      texte += `8. 🔍 Rechercher un article\n`;
      texte += `0. ↩️ Retour au menu\n`;
      texte += `══════════════════\n*Choisis une catégorie (1-${categories.length}) ou une option :*`;
      
      const message = await riza.sendMessage(m.chat, { text: texte }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "gestion_articles";
    };
    
    const showArticlesCategorie = async (categorie, quotedMsg) => {
      const articles = boutique.articles[categorie] || {};
      const articlesList = Object.entries(articles);
      
      if (articlesList.length === 0) {
        await riza.sendMessage(m.chat, {
          text: `📦 *${categorie.toUpperCase()}*\n\n❌ Aucun article dans cette catégorie.\n\nUtilise l'option "Ajouter un article" pour en créer un.`
        }, { quoted: quotedMsg });
        return showGestionArticles(quotedMsg);
      }
      
      let texte = `📦 *ARTICLES - ${categorie.toUpperCase()}*\n══════════════════\n\n`;
      
      articlesList.forEach(([key, article], index) => {
        const stockIndicator = article.stock !== undefined ? `📦${article.stock}` : "∞";
        const prix = `${article.prix.toLocaleString()} ${article.devise}`;
        const articleId = article.id || key;
        texte += `${index + 1}. ${article.nom}\n`;
        texte += `   📝 ID: ${articleId}\n`;
        texte += `   💸 ${prix} | ${stockIndicator}\n\n`;
      });
      
      texte += `══════════════════\n`;
      texte += `*Choisis un article (1-${articlesList.length}) :*\n`;
      texte += `Ou tape *0* pour retourner`;
      
      const message = await riza.sendMessage(m.chat, { text: texte }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = `articles_${categorie}`;
      tempData.currentCategorie = categorie;
      tempData.articlesList = articlesList;
    };
    
    const showDetailsArticle = async (articleKey, article, categorie, quotedMsg) => {
      const articleId = article.id || articleKey;
      
      let texte = `📋 *DÉTAILS DE L'ARTICLE*\n`;
      texte += `════════════════════\n`;
      texte += `📝 *Nom :* ${article.nom}\n`;
      texte += `🏷️ *ID :* ${articleId}\n`;
      texte += `🔑 *Clé :* ${articleKey}\n`;
      texte += `📂 *Catégorie :* ${categorie}\n`;
      texte += `💸 *Prix :* ${article.prix.toLocaleString()} ${article.devise}\n`;
      
      if (article.stock !== undefined) {
        texte += `📦 *Stock :* ${article.stock}\n`;
      } else {
        texte += `📦 *Stock :* Illimité\n`;
      }
      
      if (article.rang) texte += `🎯 *Rang :* ${article.rang}\n`;
      if (article.degats) texte += `⚔️ *Dégâts :* ${article.degats}\n`;
      if (article.poids) texte += `⚖️ *Poids :* ${article.poids}kg\n`;
      if (article.resistance) texte += `🛡️ *Résistance :* ${article.resistance}\n`;
      if (article.effets) texte += `✨ *Effets :* ${article.effets}\n`;
      if (article.malus) texte += `⚠️ *Malus :* ${article.malus}\n`;
      if (article.type) texte += `🔧 *Type :* ${article.type}\n`;
      if (article.description) texte += `📖 *Description :* ${article.description.substring(0, 100)}${article.description.length > 100 ? '...' : ''}\n`;
      if (article.image) texte += `🖼️ *Image :* ${article.image.substring(0, 50)}...\n`;
      if (article.createdAt) texte += `📅 *Créé le :* ${new Date(article.createdAt).toLocaleDateString('fr-FR')}\n`;
      
      texte += `════════════════════\n`;
      texte += `1. ✏️ Modifier l'article\n`;
      texte += `2. 📊 Modifier le stock\n`;
      texte += `3. 💰 Modifier le prix\n`;
      texte += `4. 🗑️ Supprimer l'article\n`;
      texte += `0. ↩️ Retour aux articles\n`;
      texte += `════════════════════\n*Choisis une option :*`;
      
      const message = await riza.sendMessage(m.chat, { text: texte }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = `details_${articleKey}`;
      tempData.currentArticle = article;
      tempData.currentArticleKey = articleKey;
    };
    
    const showAjoutArticle = async (quotedMsg) => {
      const categories = Object.keys(boutique.articles).sort();
      let texte = `➕ *AJOUTER UN NOUVEL ARTICLE*
══════════════════
*Choisis la catégorie :*\n\n`;
      
      categories.forEach((categorie, index) => {
        texte += `${index + 1}. ${categorie.toUpperCase()}\n`;
      });
      
      texte += `\n══════════════════\n`;
      texte += `*Entrez le numéro de la catégorie :*`;
      
      const message = await riza.sendMessage(m.chat, { text: texte }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "ajout_categorie";
    };
    
    // Écouteur pour les réponses
    const listener = async ({ messages }) => {
      if (!sessionActive) return;
      
      const msg = messages[0];
      if (!msg.message) return;
      
      const from = msg.key.participant || msg.key.remoteJid;
      if (from !== sender) return;
      
      const context = msg.message?.extendedTextMessage?.contextInfo;
      if (!context || context.stanzaId !== lastMessage?.key?.id) return;
      
      const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const reponse = content.trim();
      
      try {
        // MENU PRINCIPAL
        if (currentStep === "menu_principal") {
          if (reponse === "1") {
            await showGestionArticles(msg);
          } else if (reponse === "2") {
            await showStatistiques(msg);
          } else if (reponse === "3") {
            await showGestionTresor(msg);
          } else if (reponse === "4") {
            await showTransactionsRecent(msg);
          } else if (reponse === "5") {
            await showParametres(msg);
          } else if (reponse === "6") {
            sessionActive = false;
            riza.ev.off("messages.upsert", listener);
            await riza.sendMessage(m.chat, { text: "👋 Session boutiquier terminée." }, { quoted: msg });
          } else {
            await showMenuPrincipal(msg);
          }
        }
        
        // GESTION ARTICLES
        else if (currentStep === "gestion_articles") {
          if (reponse === "0") {
            await showMenuPrincipal(msg);
          } else if (reponse === "7") {
            await showAjoutArticle(msg);
          } else if (reponse === "8") {
            await rechercherArticle(msg);
          } else {
            const categories = Object.keys(boutique.articles).sort();
            const index = parseInt(reponse) - 1;
            if (index >= 0 && index < categories.length) {
              await showArticlesCategorie(categories[index], msg);
            } else {
              await showGestionArticles(msg);
            }
          }
        }
        
        // ARTICLES PAR CATÉGORIE
        else if (currentStep.startsWith("articles_")) {
          if (reponse === "0") {
            await showGestionArticles(msg);
          } else {
            const categorie = currentStep.replace("articles_", "");
            const articlesList = tempData.articlesList;
            const index = parseInt(reponse) - 1;
            
            if (index >= 0 && index < articlesList.length) {
              const [articleKey, article] = articlesList[index];
              await showDetailsArticle(articleKey, article, categorie, msg);
            } else {
              await showArticlesCategorie(categorie, msg);
            }
          }
        }
        
        // DÉTAILS ARTICLE
        else if (currentStep.startsWith("details_")) {
          const articleKey = currentStep.replace("details_", "");
          
          if (reponse === "0") {
            await showArticlesCategorie(tempData.currentCategorie, msg);
          } else if (reponse === "1") {
            await modifierArticle(msg, articleKey);
          } else if (reponse === "2") {
            await modifierStock(msg, articleKey);
          } else if (reponse === "3") {
            await modifierPrix(msg, articleKey);
          } else if (reponse === "4") {
            await supprimerArticle(msg, articleKey);
          }
        }
        
        // AJOUT CATÉGORIE
        else if (currentStep === "ajout_categorie") {
          const categories = Object.keys(boutique.articles).sort();
          const index = parseInt(reponse) - 1;
          
          if (index >= 0 && index < categories.length) {
            tempData.nouvelleCategorie = categories[index];
            await demanderIdArticle(msg);
          } else {
            await showAjoutArticle(msg);
          }
        }
        
        // DEMANDER ID ARTICLE (nouvelle étape pour correspondre à ta structure)
        else if (currentStep === "demander_id") {
          // Vérifier si l'ID existe déjà
          const existingArticle = trouverArticleParIdInternal(reponse);
          if (existingArticle) {
            await riza.sendMessage(m.chat, {
              text: `❌ Cet ID existe déjà dans la catégorie ${existingArticle.categorie}.\n\nVeuillez choisir un autre ID :`
            }, { quoted: msg });
            return demanderIdArticle(msg);
          }
          
          tempData.idArticle = reponse;
          await demanderNomArticle(msg);
        }
        
        // DEMANDER NOM ARTICLE
        else if (currentStep === "demander_nom") {
          if (reponse.length < 2) {
            await riza.sendMessage(m.chat, {
              text: "❌ Le nom doit contenir au moins 2 caractères."
            }, { quoted: msg });
            return demanderNomArticle(msg);
          }
          
          tempData.nomArticle = reponse;
          await demanderDescriptionArticle(msg);
        }
        
        // DEMANDER DESCRIPTION
        else if (currentStep === "demander_description") {
          tempData.descriptionArticle = reponse;
          await demanderPrixArticle(msg);
        }
        
        // DEMANDER PRIX
        else if (currentStep === "demander_prix") {
          const prix = parseInt(reponse);
          if (isNaN(prix) || prix <= 0) {
            await riza.sendMessage(m.chat, {
              text: "❌ Prix invalide. Entrez un nombre positif."
            }, { quoted: msg });
            return demanderPrixArticle(msg);
          }
          
          tempData.prixArticle = prix;
          await demanderDeviseArticle(msg);
        }
        
        // DEMANDER DEVISE
        else if (currentStep === "demander_devise") {
          if (!["💎", "Ru"].includes(reponse)) {
            await riza.sendMessage(m.chat, {
              text: "❌ Devise invalide. Choisissez 💎 (Diamants) ou Ru (Rulith)."
            }, { quoted: msg });
            return demanderDeviseArticle(msg);
          }
          
          tempData.deviseArticle = reponse;
          
          // Demander des champs spécifiques selon la catégorie
          const categorie = tempData.nouvelleCategorie;
          
          if (["hermes", "hecate", "arès", "atlas"].includes(categorie)) {
            await demanderTypeArticle(msg);
          } else if (["vetements", "armures"].includes(categorie)) {
            await demanderTypeArticle(msg);
          } else if (["potions", "consommables"].includes(categorie)) {
            await demanderTypeArticle(msg);
          } else {
            await demanderStockArticle(msg);
          }
        }
        
        // DEMANDER TYPE ARTICLE
        else if (currentStep === "demander_type") {
          tempData.typeArticle = reponse;
          
          const categorie = tempData.nouvelleCategorie;
          
          if (["hermes", "hecate", "arès", "atlas"].includes(categorie)) {
            await demanderRangArme(msg);
          } else if (["vetements", "armures"].includes(categorie)) {
            await demanderResistanceArmure(msg);
          } else if (["potions", "consommables"].includes(categorie)) {
            await demanderEffetsConsommable(msg);
          } else {
            await demanderStockArticle(msg);
          }
        }
        
        // DEMANDER RANG ARME
        else if (currentStep === "demander_rang") {
          if (!["S", "A", "B", "C", "D", "E"].includes(reponse.toUpperCase())) {
            await riza.sendMessage(m.chat, {
              text: "❌ Rang invalide. Choisissez S, A, B, C, D ou E."
            }, { quoted: msg });
            return demanderRangArme(msg);
          }
          
          tempData.rangArticle = reponse.toUpperCase();
          await demanderDegatsArme(msg);
        }
        
        // DEMANDER DÉGÂTS ARME
        else if (currentStep === "demander_degats") {
          tempData.degatsArticle = reponse;
          await demanderPoidsArticle(msg);
        }
        
        // DEMANDER POIDS
        else if (currentStep === "demander_poids") {
          const poids = parseFloat(reponse);
          if (isNaN(poids) || poids < 0) {
            await riza.sendMessage(m.chat, {
              text: "❌ Poids invalide. Entrez un nombre positif."
            }, { quoted: msg });
            return demanderPoidsArticle(msg);
          }
          
          tempData.poidsArticle = poids;
          await demanderStockArticle(msg);
        }
        
        // DEMANDER RÉSISTANCE ARMURE
        else if (currentStep === "demander_resistance") {
          tempData.resistanceArticle = reponse;
          await demanderEffetsArmure(msg);
        }
        
        // DEMANDER EFFETS ARMURE
        else if (currentStep === "demander_effets_armure") {
          tempData.effetsArticle = reponse;
          await demanderMalusArmure(msg);
        }
        
        // DEMANDER MALUS ARMURE
        else if (currentStep === "demander_malus") {
          tempData.malusArticle = reponse;
          await demanderStockArticle(msg);
        }
        
        // DEMANDER EFFETS CONSOMMABLE
        else if (currentStep === "demander_effets_consommable") {
          tempData.effetsArticle = reponse;
          await demanderStockArticle(msg);
        }
        
        // DEMANDER STOCK
        else if (currentStep === "demander_stock") {
          if (reponse.toLowerCase() === "infini" || reponse.toLowerCase() === "∞" || reponse === "0") {
            tempData.stockArticle = undefined;
          } else {
            const stock = parseInt(reponse);
            if (isNaN(stock) || stock < 0) {
              await riza.sendMessage(m.chat, {
                text: "❌ Stock invalide. Entrez un nombre positif, 'infini', '∞' ou '0'."
              }, { quoted: msg });
              return demanderStockArticle(msg);
            }
            tempData.stockArticle = stock;
          }
          
          await demanderImageArticle(msg);
        }
        
        // DEMANDER IMAGE
        else if (currentStep === "demander_image") {
          if (reponse.toLowerCase() === "non" || reponse === "0" || reponse === "") {
            tempData.imageArticle = null;
          } else {
            // Vérifier que c'est une URL valide
            try {
              new URL(reponse);
              tempData.imageArticle = reponse;
            } catch {
              await riza.sendMessage(m.chat, {
                text: "❌ URL invalide. Entrez une URL valide ou 'non' pour passer."
              }, { quoted: msg });
              return demanderImageArticle(msg);
            }
          }
          
          await confirmerAjoutArticle(msg);
        }
        
        // CONFIRMER AJOUT
        else if (currentStep === "confirmer_ajout") {
          if (reponse.toLowerCase() === "oui") {
            await creerArticle(msg);
          } else {
            await riza.sendMessage(m.chat, {
              text: "❌ Ajout annulé."
            }, { quoted: msg });
            await showGestionArticles(msg);
          }
        }
        
      } catch (error) {
        console.error("Erreur boutiquier:", error);
        await riza.sendMessage(m.chat, {
          text: "❌ Une erreur est survenue. Retour au menu principal."
        }, { quoted: msg });
        await showMenuPrincipal(msg);
      }
    };
    
    // Fonctions auxiliaires pour les étapes
    async function demanderIdArticle(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `🏷️ *ID DE L'ARTICLE*\n\nEntrez un ID unique pour l'article :\n\n*Exemple :* bouteille_verre ou potion_energie\n\n⚠️ Cet ID sera utilisé pour identifier l'article dans le système.`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_id";
    }
    
    async function demanderNomArticle(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `📝 *NOM DE L'ARTICLE*\n\nEntrez le nom de l'article :\n\n*Exemple :* Bouteille de Verre Vide`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_nom";
    }
    
    async function demanderDescriptionArticle(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `📖 *DESCRIPTION*\n\nEntrez la description de l'article :\n\n*Exemple :* Récipient en verre simple et solide, standard dans les villes valoriennes.`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_description";
    }
    
    async function demanderPrixArticle(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `💸 *PRIX*\n\nEntrez le prix de l'article :\n\n*Exemple :* 1000`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_prix";
    }
    
    async function demanderDeviseArticle(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `💰 *DEVISE*\n\nChoisissez la devise :\n💎 Pour les Diamants\nRu Pour les Rulith\n\n*Exemple :* Ru`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_devise";
    }
    
    async function demanderTypeArticle(quotedMsg) {
      const categorie = tempData.nouvelleCategorie;
      let exemple = "";
      
      if (["potions", "consommables"].includes(categorie)) {
        exemple = "*Exemple :* Récipient, Potion, Parchemin";
      } else if (["vetements", "armures"].includes(categorie)) {
        exemple = "*Exemple :* Armure légère, Robe, Bottes";
      } else if (["hermes", "hecate", "arès", "atlas"].includes(categorie)) {
        exemple = "*Exemple :* Épée, Arc, Bâton, Dague";
      }
      
      const message = await riza.sendMessage(m.chat, {
        text: `🔧 *TYPE*\n\nEntrez le type de l'article :\n\n${exemple}`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_type";
    }
    
    async function demanderRangArme(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `🎯 *RANG DE L'ARME*\n\nEntrez le rang (S, A, B, C, D, E) :\n\nS - Légendaire\nA - Épique\nB - Rare\nC - Commun\nD - Basique\nE - Faible`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_rang";
    }
    
    async function demanderDegatsArme(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `⚔️ *DÉGÂTS DE L'ARME*\n\nEntrez les dégâts :\n\n*Exemple :* 2d6+3 ou 10-15`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_degats";
    }
    
    async function demanderPoidsArticle(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `⚖️ *POIDS*\n\nEntrez le poids en kg :\n\n*Exemple :* 2.5`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_poids";
    }
    
    async function demanderResistanceArmure(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `🛡️ *RÉSISTANCE*\n\nEntrez la résistance de l'armure :\n\n*Exemple :* +3 CA ou Résistance feu`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_resistance";
    }
    
    async function demanderEffetsArmure(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `✨ *EFFETS*\n\nEntrez les effets de l'armure :\n\n*Exemple :* +1 Dex ou Vision nocturne`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_effets_armure";
    }
    
    async function demanderMalusArmure(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `⚠️ *MALUS*\n\nEntrez les malus de l'armure :\n\n*Exemple :* -1 Vitesse ou Aucun`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_malus";
    }
    
    async function demanderEffetsConsommable(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `✨ *EFFETS*\n\nEntrez les effets du consommable :\n\n*Exemple :* +10 PV pour 1 heure ou Permet de contenir 1 unité de liquide`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_effets_consommable";
    }
    
    async function demanderStockArticle(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `📦 *STOCK*\n\nEntrez la quantité en stock :\n\n*Exemple :* 20\nOu tapez "infini", "∞" ou "0" pour stock illimité`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_stock";
    }
    
    async function demanderImageArticle(quotedMsg) {
      const message = await riza.sendMessage(m.chat, {
        text: `🖼️ *IMAGE*\n\nEntrez l'URL de l'image :\n\n*Exemple :* https://files.catbox.moe/1002705617.jpg\nOu tapez "non" pour ne pas ajouter d'image`
      }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "demander_image";
    }
    
    async function confirmerAjoutArticle(quotedMsg) {
      let texte = `✅ *CONFIRMER L'AJOUT*\n══════════════════\n`;
      texte += `📝 *Nom :* ${tempData.nomArticle}\n`;
      texte += `🏷️ *ID :* ${tempData.idArticle}\n`;
      texte += `📂 *Catégorie :* ${tempData.nouvelleCategorie}\n`;
      texte += `💸 *Prix :* ${tempData.prixArticle} ${tempData.deviseArticle}\n`;
      texte += `📖 *Description :* ${tempData.descriptionArticle.substring(0, 50)}${tempData.descriptionArticle.length > 50 ? '...' : ''}\n`;
      
      if (tempData.typeArticle) texte += `🔧 *Type :* ${tempData.typeArticle}\n`;
      if (tempData.rangArticle) texte += `🎯 *Rang :* ${tempData.rangArticle}\n`;
      if (tempData.degatsArticle) texte += `⚔️ *Dégâts :* ${tempData.degatsArticle}\n`;
      if (tempData.poidsArticle) texte += `⚖️ *Poids :* ${tempData.poidsArticle}kg\n`;
      if (tempData.resistanceArticle) texte += `🛡️ *Résistance :* ${tempData.resistanceArticle}\n`;
      if (tempData.effetsArticle) texte += `✨ *Effets :* ${tempData.effetsArticle}\n`;
      if (tempData.malusArticle) texte += `⚠️ *Malus :* ${tempData.malusArticle}\n`;
      
      if (tempData.stockArticle !== undefined) {
        texte += `📦 *Stock :* ${tempData.stockArticle}\n`;
      } else {
        texte += `📦 *Stock :* Illimité\n`;
      }
      
      if (tempData.imageArticle) {
        texte += `🖼️ *Image :* Oui\n`;
      } else {
        texte += `🖼️ *Image :* Non\n`;
      }
      
      texte += `══════════════════\n`;
      texte += `*Confirmez-vous l'ajout ? (oui/non) :*`;
      
      const message = await riza.sendMessage(m.chat, { text: texte }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "confirmer_ajout";
    }
    
    async function creerArticle(quotedMsg) {
      const articleKey = tempData.idArticle;
      const article = {
        id: tempData.idArticle,
        nom: tempData.nomArticle,
        description: tempData.descriptionArticle,
        prix: tempData.prixArticle,
        devise: tempData.deviseArticle,
        image: tempData.imageArticle || null,
        createdAt: new Date().toISOString()
      };
      
      // Ajouter les champs spécifiques
      if (tempData.typeArticle) article.type = tempData.typeArticle;
      if (tempData.rangArticle) article.rang = tempData.rangArticle;
      if (tempData.degatsArticle) article.degats = tempData.degatsArticle;
      if (tempData.poidsArticle) article.poids = tempData.poidsArticle;
      if (tempData.resistanceArticle) article.resistance = tempData.resistanceArticle;
      if (tempData.effetsArticle) article.effets = tempData.effetsArticle;
      if (tempData.malusArticle) article.malus = tempData.malusArticle;
      if (tempData.stockArticle !== undefined) article.stock = tempData.stockArticle;
      
      // Ajouter à la boutique (utiliser l'ID comme clé)
      boutique.articles[tempData.nouvelleCategorie][articleKey] = article;
      saveBoutique(boutique);
      
      await riza.sendMessage(m.chat, {
        text: `✅ *ARTICLE AJOUTÉ !*\n══════════════════\n📝 ${tempData.nomArticle}\n🏷️ ID: ${tempData.idArticle}\n📂 Catégorie: ${tempData.nouvelleCategorie}\n💸 Prix: ${tempData.prixArticle} ${tempData.deviseArticle}\n\nL'article est maintenant disponible dans la boutique.`
      }, { quoted: quotedMsg });
      
      // Réinitialiser les données temporaires
      tempData = {};
      await showGestionArticles(quotedMsg);
    }
    
    async function modifierArticle(quotedMsg, articleKey) {
      const categorie = tempData.currentCategorie;
      const article = tempData.currentArticle;
      
      await riza.sendMessage(m.chat, {
        text: `✏️ *MODIFICATION D'ARTICLE*\n\nArticle: ${article.nom}\nID: ${article.id || articleKey}\n\nCette fonctionnalité sera disponible dans une prochaine mise à jour.\n\nPour modifier un article, supprimez-le et recréez-le avec les nouvelles valeurs.`
      }, { quoted: quotedMsg });
      
      await showDetailsArticle(articleKey, article, categorie, quotedMsg);
    }
    
    async function modifierStock(quotedMsg, articleKey) {
      const categorie = tempData.currentCategorie;
      const article = tempData.currentArticle;
      
      await riza.sendMessage(m.chat, {
        text: `📊 *MODIFICATION DU STOCK*\n\nArticle: ${article.nom}\nID: ${article.id || articleKey}\nStock actuel: ${article.stock !== undefined ? article.stock : "Illimité"}\n\nEntrez la nouvelle quantité de stock :\n(tapez "infini" pour stock illimité)`
      }, { quoted: quotedMsg });
      
      lastMessage = msg;
      currentStep = `modif_stock_${articleKey}`;
    }
    
    async function modifierPrix(quotedMsg, articleKey) {
      const categorie = tempData.currentCategorie;
      const article = tempData.currentArticle;
      
      await riza.sendMessage(m.chat, {
        text: `💰 *MODIFICATION DU PRIX*\n\nArticle: ${article.nom}\nID: ${article.id || articleKey}\nPrix actuel: ${article.prix} ${article.devise}\n\nEntrez le nouveau prix :`
      }, { quoted: quotedMsg });
      
      lastMessage = msg;
      currentStep = `modif_prix_${articleKey}`;
    }
    
    async function supprimerArticle(quotedMsg, articleKey) {
      const categorie = tempData.currentCategorie;
      const article = tempData.currentArticle;
      
      await riza.sendMessage(m.chat, {
        text: `🗑️ *SUPPRIMER L'ARTICLE*\n\n⚠️ *ATTENTION :* Cette action est irréversible !\n\nArticle: ${article.nom}\nID: ${article.id || articleKey}\nCatégorie: ${categorie}\n\n*Confirmez-vous la suppression ? (oui/non)*`
      }, { quoted: quotedMsg });
      
      lastMessage = msg;
      currentStep = `confirm_supp_${articleKey}`;
    }
    
    // Fonctions pour les autres menus (à compléter selon tes besoins)
    async function showStatistiques(quotedMsg) {
      const transactions = boutique.valoria.transactions;
      const totalTransactions = transactions.length;
      const transactions30j = transactions.filter(t => {
        const date = new Date(t.date);
        const now = new Date();
        return (now - date) <= 30 * 24 * 60 * 60 * 1000;
      }).length;
      
      let totalVentesDiamants = 0;
      let totalVentesRulith = 0;
      
      transactions.forEach(t => {
        if (t.type === "vente") {
          if (t.devise === "💎") totalVentesDiamants += t.montant;
          if (t.devise === "Ru") totalVentesRulith += t.montant;
        }
      });
      
      let texte = `📊 *STATISTIQUES BOUTIQUE*
══════════════════
*📈 VENTES TOTALES :*
💎 ${totalVentesDiamants.toLocaleString()} Diamants
💰 ${totalVentesRulith.toLocaleString()} Rulith

*🔄 TRANSACTIONS :*
📋 Total : ${totalTransactions}
📅 30 derniers jours : ${transactions30j}

*📦 ARTICLES TOTAUX :*
${Object.entries(boutique.articles).map(([cat, articles]) => 
  `• ${cat}: ${Object.keys(articles).length}`
).join('\n')}
══════════════════
*0.* ↩️ Retour au menu`;
      
      const message = await riza.sendMessage(m.chat, { text: texte }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "statistiques";
    }
    
    async function showGestionTresor(quotedMsg) {
      let texte = `💰 *GESTION DU TRÉSOR DE VALORIA*
══════════════════
*SOLDE ACTUEL :*
💎 ${boutique.valoria.diamants.toLocaleString()} Diamants
💰 ${boutique.valoria.rulith.toLocaleString()} Rulith

══════════════════
*0.* ↩️ Retour
══════════════════
*Cette fonctionnalité sera disponible dans une prochaine mise à jour.*`;
      
      const message = await riza.sendMessage(m.chat, { text: texte }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "gestion_tresor";
    }
    
    async function showTransactionsRecent(quotedMsg) {
      const transactions = boutique.valoria.transactions.slice(-10).reverse();
      
      if (transactions.length === 0) {
        await riza.sendMessage(m.chat, {
          text: `📈 *TRANSACTIONS RÉCENTES*\n\nAucune transaction enregistrée.`
        }, { quoted: quotedMsg });
        return showMenuPrincipal(quotedMsg);
      }
      
      let texte = `📈 *10 DERNIÈRES TRANSACTIONS*\n══════════════════\n\n`;
      
      transactions.forEach((t, index) => {
        const date = new Date(t.date).toLocaleDateString('fr-FR');
        const typeEmoji = t.type === "vente" ? "💰" : t.type === "taxe" ? "🏛️" : "🔄";
        texte += `${index + 1}. ${typeEmoji} ${t.type.toUpperCase()}\n`;
        texte += `   📅 ${date} | 👤 ${t.joueur?.split('@')[0] || 'Système'}\n`;
        texte += `   ${t.montant.toLocaleString()} ${t.devise}\n`;
        texte += `   📝 ${t.article || t.description}\n\n`;
      });
      
      texte += `══════════════════\n`;
      texte += `*0.* ↩️ Retour au menu`;
      
      const message = await riza.sendMessage(m.chat, { text: texte }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "transactions_recentes";
    }
    
    async function showParametres(quotedMsg) {
      let texte = `🔧 *PARAMÈTRES BOUTIQUE*
══════════════════
*TAXE ACTUELLE :* ${(boutique.settings.taxe_rate * 100).toFixed(1)}%

══════════════════
*0.* ↩️ Retour
══════════════════
*Cette fonctionnalité sera disponible dans une prochaine mise à jour.*`;
      
      const message = await riza.sendMessage(m.chat, { text: texte }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "parametres";
    }
    
    async function rechercherArticle(quotedMsg) {
      await riza.sendMessage(m.chat, {
        text: `🔍 *RECHERCHE D'ARTICLE*\n\nEntrez le nom ou l'ID de l'article à rechercher :`
      }, { quoted: quotedMsg });
      
      lastMessage = msg;
      currentStep = "recherche_article";
    }
    
    // Ajouter l'écouteur pour les réponses
    riza.ev.on("messages.upsert", listener);
    
    // Démarrer le menu principal
    await showMenuPrincipal();
  }
};