const fs = require("fs");
const path = require("path");

const BOUTIQUE_PATH = path.join(__dirname, "../data/boutique.json");
const ARGENT_PATH = path.join(__dirname, "../data/banque.json");
const FICHES_PATH = path.join(__dirname, "../data/fiches.json");
const SOCIAL_PATH = path.join(__dirname, "../data/social.json");
const IMAGES_DIR = path.join(__dirname, "../data/boutique_images");

function loadBoutique() {
  return JSON.parse(fs.readFileSync(BOUTIQUE_PATH));
}

function loadArgent() {
  return JSON.parse(fs.readFileSync(ARGENT_PATH));
}

function saveArgent(data) {
  fs.writeFileSync(ARGENT_PATH, JSON.stringify(data, null, 2));
}

function loadFiches() {
  return JSON.parse(fs.readFileSync(FICHES_PATH));
}

function loadSocial() {
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

function getImagePath(articleId) {
  return path.join(IMAGES_DIR, `${articleId}.jpg`);
}

function articleHasImage(articleId) {
  return fs.existsSync(getImagePath(articleId));
}

async function sendArticleWithImage(riza, chat, article, articleId, quotedMsg = null) {
  const imagePath = getImagePath(articleId);
  const stockText = article.stock !== undefined ? `📦 Stock: ${article.stock}` : '📦 Stock: Illimité';
  const caption = `🛒 *${article.nom}*\n\n📝 ${article.description}\n💸 Prix: ${article.prix.toLocaleString()} ${article.devise}\n${stockText}`;

  if (fs.existsSync(imagePath)) {
    await riza.sendMessage(chat, {
      image: fs.readFileSync(imagePath),
      caption: caption
    }, { quoted: quotedMsg });
  } else {
    await riza.sendMessage(chat, {
      text: caption
    }, { quoted: quotedMsg });
  }
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
}

function decrementerStock(categorie, articleId) {
  const boutique = loadBoutique();
  if (boutique.articles[categorie]?.[articleId]?.stock > 0) {
    boutique.articles[categorie][articleId].stock--;
    boutique.articles[categorie][articleId].updatedAt = new Date().toISOString();
    return true;
  }
  return false;
}

function trouverArticleParId(articleId) {
  const boutique = loadBoutique();
  for (const [categorie, articles] of Object.entries(boutique.articles)) {
    if (articles[articleId]) {
      return { article: articles[articleId], categorie: categorie };
    }
  }
  return null;
}

// Fonction pour normaliser le nom de faction
function normaliserFaction(faction) {
  if (!faction) return "non définie";
  
  return faction.toLowerCase()
    .replace(/è/g, 'e')
    .replace(/é/g, 'e')
    .replace(/ê/g, 'e')
    .replace(/à/g, 'a')
    .replace(/â/g, 'a')
    .trim();
}

// Fonction pour trouver la catégorie d'armes appropriée
function trouverCategorieArmes(factionJoueur) {
  const boutique = loadBoutique();
  const factionNormalisee = normaliserFaction(factionJoueur);
  
  // Essayer d'abord la catégorie spécifique à la faction
  const categorieSpecifique = `armes_${factionNormalisee}`;
  if (boutique.articles[categorieSpecifique] && Object.keys(boutique.articles[categorieSpecifique]).length > 0) {
    return categorieSpecifique;
  }
  
  // Essayer la catégorie générale "Armes" (avec A majuscule)
  if (boutique.articles["Armes"] && Object.keys(boutique.articles["Armes"]).length > 0) {
    return "Armes";
  }
  
  // Essayer la catégorie générale "armes" (avec a minuscule)
  if (boutique.articles["armes"] && Object.keys(boutique.articles["armes"]).length > 0) {
    return "armes";
  }
  
  return null;
}

// Fonction pour filtrer les armes par faction si nécessaire
function filtrerArmesParFaction(articles, factionJoueur) {
  const factionNormalisee = normaliserFaction(factionJoueur);
  const articlesFiltres = {};
  
  Object.entries(articles).forEach(([id, article]) => {
    // Si l'article n'a pas de faction spécifiée ou correspond à la faction du joueur
    if (!article.faction || normaliserFaction(article.faction) === factionNormalisee) {
      articlesFiltres[id] = article;
    }
  });
  
  return articlesFiltres;
}

module.exports = {
  name: "boutique",
  category: "UNIROLIST",
  description: "Boutique officielle Valoria - Acheter des articles",
  allowedForAll: true,

  async execute(riza, m, args) {
    const jid = m.sender;
    const fiches = loadFiches();
    const socials = loadSocial();

    if (!fiches[jid] || !socials[jid]) {
      return riza.sendMessage(m.chat, {
        text: "❌ *ACCÈS REFUSÉ*\n\nTu n'as pas encore de fiche enregistrée.\n\nUtilise `!enregistrer` avec un admin pour commencer !"
      }, { quoted: m });
    }

    const factionJoueur = socials[jid].faction || "Non définie";
    const compte = initCompte(jid);
    let lastMessage = null;
    let currentStep = "menu_principal";
    let sessionActive = true;

    const showMenuPrincipal = async (quotedMsg = m) => {
      if (!sessionActive) return;

      const compteActuel = initCompte(jid);
      const menuText = `🏪 *BOUTIQUE VALORIA* - ${factionJoueur}
══════════════════
1. 💱 Conversions
2. ⚔️ Armes de faction  
3. 🧬 Consommables
4. ✨ Runes
5. 💸 Mon solde
6. 🛠️ Infos Valoria
7. ❌ Quitter

💸 *Solde :*
💎 ${compteActuel.diamants.toLocaleString()} 
💰 ${compteActuel.rulith.toLocaleString()}
══════════════════
*Choisis (1-7) :*`;

      const menuMessage = await riza.sendMessage(m.chat, { text: menuText }, { quoted: quotedMsg });
      lastMessage = menuMessage;
      currentStep = "menu_principal";
    };

    const showArticles = async (categorie, titre, quotedMsg, articlesFiltres = null) => {
      const boutique = loadBoutique();
      let articles = articlesFiltres || boutique.articles[categorie] || {};
      
      let texte = `🛒 *${titre}*\n══════════════════\n`;
      
      // Cas spécial pour les conversions
      if (categorie === "conversion") {
        texte += `*1.* 💎 Diamants → Rulith\n`;
        texte += `   📝 Convertir des Diamants en Rulith\n\n`;
        texte += `*2.* 💰 Rulith → Diamants\n`;
        texte += `   📝 Convertir des Rulith en Diamants\n\n`;
      } else {
        // Affichage normal des articles
        Object.entries(articles).forEach(([id, article]) => {
          if (article.stock === undefined || article.stock > 0) {
            const stockText = article.stock !== undefined ? ` (${article.stock} disponible${article.stock > 1 ? 's' : ''})` : '';
            const imageIndicator = articleHasImage(id) ? " 🖼️" : "";
            texte += `*${id}.* ${article.nom}${stockText}${imageIndicator}\n`;
            texte += `   📝 ${article.description}\n`;
            if (article.prix) {
              texte += `   💸 ${article.prix.toLocaleString()} ${article.devise}\n`;
            }
            texte += `\n`;
          }
        });
      }

      // Vérifier s'il y a des articles
      if (categorie !== "conversion" && Object.keys(articles).length === 0) {
        texte += `Aucun article disponible dans cette catégorie.\n\n`;
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
      await sendArticleWithImage(riza, m.chat, article, articleId, quotedMsg);

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
*Taux de change :* 1💎 = 1,000 Ru
*Taxe Valoria :* 1%

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
            // NOUVELLE LOGIQUE : Trouver la bonne catégorie d'armes
            const categorieArmes = trouverCategorieArmes(factionJoueur);
            
            console.log(`Catégorie d'armes trouvée: ${categorieArmes}`); // Debug
            
            if (!categorieArmes) {
              await riza.sendMessage(m.chat, {
                text: `❌ *AUCUNE ARME DISPONIBLE*\n\nAucune arme n'est disponible pour la faction ${factionJoueur}.\n\nContacte un administrateur pour ajouter des armes.`
              }, { quoted: msg });
              return showMenuPrincipal(msg);
            }
            
            const boutique = loadBoutique();
            let articlesArmes = boutique.articles[categorieArmes];
            
            // Filtrer par faction si nécessaire (pour la catégorie générale "Armes")
            if (categorieArmes === "Armes" || categorieArmes === "armes") {
              articlesArmes = filtrerArmesParFaction(articlesArmes, factionJoueur);
            }
            
            if (Object.keys(articlesArmes).length === 0) {
              await riza.sendMessage(m.chat, {
                text: `❌ *AUCUNE ARME DISPONIBLE*\n\nAucune arme n'est disponible pour la faction ${factionJoueur}.\n\nContacte un administrateur pour ajouter des armes.`
              }, { quoted: msg });
              return showMenuPrincipal(msg);
            }
            
            await showArticles(categorieArmes, `⚔️ ARMES ${factionJoueur.toUpperCase()}`, msg, articlesArmes);
          }
          else if (reponse === "3") await showArticles("consommables", "🧬 CONSOMMABLES", msg);
          else if (reponse === "4") await showArticles("runes", "✨ RUNES", msg);
          else if (reponse === "5") {
            const compteActuel = initCompte(jid);
            await riza.sendMessage(m.chat, {
              text: `💸 *TON SOLDE*\n══════════════════\n💎 ${compteActuel.diamants.toLocaleString()} Diamants\n💰 ${compteActuel.rulith.toLocaleString()} Rulith`
            }, { quoted: msg });
            await showMenuPrincipal(msg);
          }
          else if (reponse === "6") {
            await this.showInfosValoria(riza, msg);
            await showMenuPrincipal(msg);
          }
          else if (reponse === "7") {
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
            } else {
              await processAchat(categorie, reponse, msg);
            }
          }
        }
        else if (currentStep.startsWith("confirmation_")) {
          if (reponse === "oui") {
            const [_, categorie, articleId] = currentStep.split('_');
            const boutique = loadBoutique();
            const article = boutique.articles[categorie]?.[articleId];
            
            if (!article) {
              await riza.sendMessage(m.chat, { text: "❌ Article introuvable." }, { quoted: msg });
              return showMenuPrincipal(msg);
            }

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
              compteActuel.diamants -= article.prix;
            } else {
              compteActuel.rulith -= article.prix;
            }

            // Gérer stock
            if (article.stock !== undefined) {
              decrementerStock(categorie, articleId);
            }

            // Taxes et revenus
            const taxe = ajouterTaxe(article.prix, article.devise, "achat", jid, article.nom);
            const revenu = article.prix - taxe;
            verserVente(revenu, article.devise, "vente", jid, article.nom);

            saveArgent(banque);

            let messageSucces = `🎉 *ACHAT RÉUSSI !*\n══════════════════\n📦 ${article.nom}\n💸 ${article.prix.toLocaleString()} ${article.devise} débités`;
            
            if (article.stock !== undefined) {
              const nouveauStock = boutique.articles[categorie][articleId].stock - 1;
              messageSucces += `\n📦 Restant : ${nouveauStock}`;
            }

            messageSucces += `\n══════════════════`;

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
          // ... (le reste du code reste identique)
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