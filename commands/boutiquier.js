const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

const BOUTIQUE_PATH = path.join(__dirname, "../data/boutique.json");
const ARGENT_PATH = path.join(__dirname, "../data/banque.json");
const IMAGES_DIR = path.join(__dirname, "../data/boutique_images");

// Initialiser la boutique si elle n'existe pas
function initializeBoutique() {
  if (!fs.existsSync(BOUTIQUE_PATH)) {
    const dataInitiale = {
      articles: {
        conversion: {
          "1": {
            "nom": "💎 Diamants → Rulith",
            "description": "Convertir des Diamants en Rulith (taux: 1💎 = 1,000Ru)",
            "type": "conversion"
          },
          "2": {
            "nom": "💰 Rulith → Diamants", 
            "description": "Convertir des Rulith en Diamants (taux: 1,000Ru = 1💎)",
            "type": "conversion"
          }
        }
      },
      valoria: { 
        diamants: 0, 
        rulith: 0, 
        transactions: [] 
      },
      settings: { 
        taxe_rate: 0.01, 
        taux_change: 1000 
      }
    };
    fs.writeFileSync(BOUTIQUE_PATH, JSON.stringify(dataInitiale, null, 2));
  }
}

// Appeler l'initialisation au chargement du module
initializeBoutique();

function loadBoutique() {
  const data = JSON.parse(fs.readFileSync(BOUTIQUE_PATH));
  
  // S'assurer que valoria existe
  if (!data.valoria) {
    data.valoria = { diamants: 0, rulith: 0, transactions: [] };
  }
  
  // S'assurer que les propriétés de valoria existent
  if (typeof data.valoria.diamants === 'undefined') data.valoria.diamants = 0;
  if (typeof data.valoria.rulith === 'undefined') data.valoria.rulith = 0;
  if (!Array.isArray(data.valoria.transactions)) data.valoria.transactions = [];
  
  // S'assurer que settings existe
  if (!data.settings) {
    data.settings = { taxe_rate: 0.01, taux_change: 1000 };
  }
  
  return data;
}

function saveBoutique(data) {
  fs.writeFileSync(BOUTIQUE_PATH, JSON.stringify(data, null, 2));
}

function getImagePath(articleId) {
  return path.join(IMAGES_DIR, `${articleId}.jpg`);
}

function articleHasImage(articleId) {
  return fs.existsSync(getImagePath(articleId));
}

async function saveArticleImage(articleId, imageMessage) {
  try {
    const imageBuffer = await downloadMediaMessage(imageMessage, "buffer", {});
    fs.writeFileSync(getImagePath(articleId), imageBuffer);
    return true;
  } catch (error) {
    console.error("Erreur sauvegarde image:", error);
    return false;
  }
}

function deleteArticleImage(articleId) {
  try {
    if (articleHasImage(articleId)) {
      fs.unlinkSync(getImagePath(articleId));
    }
    return true;
  } catch (error) {
    console.error("Erreur suppression image:", error);
    return false;
  }
}

// Fonction pour générer des IDs simples numérotés
function genererNouvelId(categorie) {
  const boutique = loadBoutique();
  const articles = boutique.articles[categorie] || {};
  const ids = Object.keys(articles).filter(id => !isNaN(id));
  
  if (ids.length === 0) return "1";
  
  const maxId = Math.max(...ids.map(id => parseInt(id)));
  return (maxId + 1).toString();
}

// Fonction pour lister tous les articles avec numérotation simple
function listerTousArticles() {
  const boutique = loadBoutique();
  const articlesListe = [];
  
  // S'assurer que articles existe
  if (!boutique.articles) {
    boutique.articles = {};
    saveBoutique(boutique);
  }
  
  Object.entries(boutique.articles).forEach(([categorie, articles]) => {
    // Trier les IDs numériquement
    const idsTries = Object.keys(articles)
      .filter(id => !isNaN(id))
      .sort((a, b) => parseInt(a) - parseInt(b));
    
    idsTries.forEach((id, index) => {
      articlesListe.push({
        numero: index + 1,
        id: id,
        categorie: categorie,
        article: articles[id]
      });
    });
  });
  
  return articlesListe;
}

// Fonction pour trouver un article par son numéro global
function trouverArticleParNumeroGlobal(numero) {
  const articlesListe = listerTousArticles();
  return articlesListe[numero - 1] || null;
}

module.exports = {
  name: "boutiquier",
  category: "Unirolist",
  description: "Administration de la boutique Valoria",
  allowedAdmins: true,

  async execute(riza, m, args) {
    const adminId = m.sender;
    let lastMessage = null;
    let currentStep = "menu_admin";
    let sessionActive = true;
    let waitingForImage = false;
    let currentArticleData = null;
    let ajoutListener = null;
    let adminListener = null;

    const cleanUpListeners = () => {
      if (ajoutListener) {
        riza.ev.off("messages.upsert", ajoutListener);
        ajoutListener = null;
      }
      if (adminListener) {
        riza.ev.off("messages.upsert", adminListener);
        adminListener = null;
      }
    };

    const showMenuAdmin = async (quotedMsg = m) => {
      if (!sessionActive) return;

      const boutique = loadBoutique();
      
      // Valeurs par défaut sécurisées
      const diamants = boutique.valoria?.diamants || 0;
      const rulith = boutique.valoria?.rulith || 0;
      
      const menuText = `🛠️ *ADMIN BOUTIQUE VALORIA*
══════════════════
1. 📦 Gérer articles
2. ➕ Ajouter article  
3. 🗑️ Supprimer article
4. 📊 Stats Valoria
5. 🖼️ Gérer images
6. ❌ Quitter admin

💸 *Trésor :*
💎 ${diamants.toLocaleString()}
💰 ${rulith.toLocaleString()}
══════════════════
*Choisis (1-6) :*`;

      const menuMsg = await riza.sendMessage(m.chat, { text: menuText }, { quoted: quotedMsg });
      lastMessage = menuMsg;
      currentStep = "menu_admin";
    };

    const showGestionArticles = async (quotedMsg) => {
      const boutique = loadBoutique();
      let texte = `📦 *GESTION ARTICLES*\n══════════════════\n`;
      
      let compteurGlobal = 1;
      const articlesListe = [];
      
      // Vérifier que articles existe
      if (!boutique.articles || Object.keys(boutique.articles).length === 0) {
        texte += `\nAucun article dans la boutique.\n`;
      } else {
        Object.entries(boutique.articles).forEach(([categorie, articles]) => {
          texte += `\n*${categorie.toUpperCase()}:*\n`;
          
          // Trier les IDs numériquement
          const idsTries = Object.keys(articles)
            .filter(id => !isNaN(id))
            .sort((a, b) => parseInt(a) - parseInt(b));
          
          if (idsTries.length === 0) {
            texte += `  Aucun article dans cette catégorie.\n`;
          } else {
            idsTries.forEach((id, index) => {
              const article = articles[id];
              const numero = index + 1;
              const stockText = article.stock !== undefined ? ` - Stock: ${article.stock}` : '';
              const imageIndicator = articleHasImage(id) ? " 🖼️" : "";
              
              texte += `  ${numero}. ${article.nom}${imageIndicator} - ${article.prix?.toLocaleString() || 'N/A'} ${article.devise || ''}${stockText}\n`;
              
              articlesListe.push({
                numeroGlobal: compteurGlobal,
                id: id,
                categorie: categorie,
                article: article
              });
              
              compteurGlobal++;
            });
          }
        });
      }

      texte += `\n══════════════════\n`;
      texte += `Pour modifier/supprimer un article, utilise :\n`;
      texte += `*modifier [numéro]*\n`;
      texte += `*supprimer [numéro]*\n`;
      texte += `*image [numéro]*\n\n`;
      texte += `*ajouter* - Nouvel article\n`;
      texte += `*retour* - Menu admin\n`;
      texte += `══════════════════`;

      const msg = await riza.sendMessage(m.chat, { text: texte }, { quoted: quotedMsg });
      lastMessage = msg;
      currentStep = "gestion_articles";
    };

    const ajouterArticle = async (quotedMsg) => {
      const questions = [
        "📝 *Nom de l'article :*",
        "📋 *Description :*", 
        "💰 *Prix :*",
        "💸 *Devise (💎/Ru) :*",
        "👤 *Type (arme/consommable/rune) :*",
        "🏛️ *Faction (toutes/Hermès/Hécates/Arès/Atlas) :*",
        "📦 *Stock (laisser vide pour illimité) :*",
        "🖼️ *Envoyer une image maintenant (répondre par 'oui' ou 'non') :*"
      ];

      let reponses = {};
      let etape = 0;

      const poserQuestion = async () => {
        if (etape >= questions.length) {
          // Créer l'article
          const boutique = loadBoutique();
          const categorie = reponses.type === "arme" ? `armes_${reponses.faction.toLowerCase().replace('è', 'e').replace('é', 'e')}` : reponses.type + 's';
          
          // S'assurer que la catégorie existe
          if (!boutique.articles) {
            boutique.articles = {};
          }
          if (!boutique.articles[categorie]) {
            boutique.articles[categorie] = {};
          }

          // Générer un ID simple numéroté
          const nouvelleId = genererNouvelId(categorie);

          boutique.articles[categorie][nouvelleId] = {
            nom: reponses.nom,
            description: reponses.description,
            prix: parseInt(reponses.prix),
            devise: reponses.devise,
            type: reponses.type,
            faction: reponses.faction,
            stock: reponses.stock ? parseInt(reponses.stock) : undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          saveBoutique(boutique);

          let confirmationText = `✅ *ARTICLE AJOUTÉ !*\n══════════════════\n📦 ${reponses.nom}\n💸 ${parseInt(reponses.prix).toLocaleString()} ${reponses.devise}\n📦 Stock: ${reponses.stock || 'Illimité'}\n🔢 Numéro: ${nouvelleId}`;

          if (reponses.image === "non") {
            confirmationText += `\n\n🖼️ *Pas d'image ajoutée*\nUtilise *image ${nouvelleId}* pour ajouter une image plus tard.`;
          }

          confirmationText += `\n══════════════════`;

          await riza.sendMessage(m.chat, {
            text: confirmationText
          }, { quoted: lastMessage });

          // Si l'admin veut ajouter une image
          if (reponses.image === "oui") {
            currentArticleData = { id: nouvelleId, nom: reponses.nom };
            waitingForImage = true;
            await riza.sendMessage(m.chat, {
              text: `🖼️ *AJOUT D'IMAGE*\n\nEnvoie maintenant l'image pour *${reponses.nom}* :`
            }, { quoted: lastMessage });
          } else {
            cleanUpListeners();
            return showMenuAdmin(lastMessage);
          }
        } else {
          const questionMsg = await riza.sendMessage(m.chat, {
            text: questions[etape]
          }, { quoted: etape === 0 ? quotedMsg : lastMessage });

          lastMessage = questionMsg;
          currentStep = `ajout_${etape}`;
        }
      };

      await poserQuestion();

      // Écouteur pour l'ajout
      ajoutListener = async ({ messages }) => {
        if (waitingForImage) return;

        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.participant || msg.key.remoteJid;
        if (from !== adminId) return;

        const context = msg.message?.extendedTextMessage?.contextInfo;
        if (!context || context.stanzaId !== lastMessage?.key?.id) return;

        const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!content) return;

        const champs = ["nom", "description", "prix", "devise", "type", "faction", "stock", "image"];
        reponses[champs[etape]] = content.trim();
        etape++;

        riza.ev.off("messages.upsert", ajoutListener);
        await poserQuestion();
        riza.ev.on("messages.upsert", ajoutListener);
      };

      riza.ev.on("messages.upsert", ajoutListener);
    };

    // Écouteur admin principal
    adminListener = async ({ messages }) => {
      if (!sessionActive) return;

      const msg = messages[0];
      if (!msg.message) return;

      const from = msg.key.participant || msg.key.remoteJid;
      if (from !== adminId) return;

      // Gestion des images
      if (waitingForImage && msg.message.imageMessage) {
        try {
          const success = await saveArticleImage(currentArticleData.id, msg);
          if (success) {
            await riza.sendMessage(m.chat, {
              text: `✅ *IMAGE AJOUTÉE !*\n\nL'image a été associée à *${currentArticleData.nom}*`
            }, { quoted: msg });
          } else {
            await riza.sendMessage(m.chat, {
              text: "❌ *ERREUR*\n\nImpossible de sauvegarder l'image."
            }, { quoted: msg });
          }
          waitingForImage = false;
          currentArticleData = null;
          cleanUpListeners();
          return showMenuAdmin(msg);
        } catch (error) {
          console.error("Erreur image:", error);
          await riza.sendMessage(m.chat, {
            text: "❌ Erreur lors du traitement de l'image."
          }, { quoted: msg });
          waitingForImage = false;
          currentArticleData = null;
          cleanUpListeners();
          return showMenuAdmin(msg);
        }
      }

      const context = msg.message?.extendedTextMessage?.contextInfo;
      if (!context || context.stanzaId !== lastMessage?.key?.id) return;

      const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const reponse = content.trim().toLowerCase();

      try {
        if (currentStep === "menu_admin") {
          if (reponse === "1") {
            await showGestionArticles(msg);
          }
          else if (reponse === "2") {
            await ajouterArticle(msg);
          }
          else if (reponse === "4") {
            await this.showInfosValoria(riza, msg);
            await showMenuAdmin(msg);
          }
          else if (reponse === "5") {
            await this.gererImages(riza, msg);
          }
          else if (reponse === "6") {
            sessionActive = false;
            cleanUpListeners();
            await riza.sendMessage(m.chat, { text: "👋 Session admin terminée" }, { quoted: msg });
            return;
          }
          else {
            await showMenuAdmin(msg);
          }
        }
        else if (currentStep === "gestion_articles") {
          if (reponse === "retour") {
            await showMenuAdmin(msg);
          }
          else if (reponse === "ajouter") {
            await ajouterArticle(msg);
          }
          else if (reponse.startsWith("image ")) {
            const numero = reponse.split(" ")[1];
            await this.gererImageArticle(riza, msg, numero);
          }
          else if (reponse.startsWith("supprimer ")) {
            const numero = reponse.split(" ")[1];
            await this.supprimerArticle(riza, msg, numero);
          }
          else {
            await showGestionArticles(msg);
          }
        }
      } catch (error) {
        console.error("Erreur admin:", error);
        await riza.sendMessage(m.chat, { text: "❌ Erreur admin" }, { quoted: msg });
        await showMenuAdmin(msg);
      }
    };

    riza.ev.on("messages.upsert", adminListener);
    await showMenuAdmin();
  },

  async gererImages(riza, m) {
    const boutique = loadBoutique();
    let texte = `🖼️ *GESTION DES IMAGES*\n══════════════════\n`;
    
    let hasImages = false;
    const articlesListe = listerTousArticles();
    
    articlesListe.forEach(item => {
      if (articleHasImage(item.id)) {
        hasImages = true;
        texte += `📷 ${item.numero}. ${item.article.nom}\n`;
      }
    });

    if (!hasImages) {
      texte += `Aucune image d'article.\n`;
    }

    texte += `\n══════════════════\n`;
    texte += `*image [numéro]* - Gérer image d'un article\n`;
    texte += `*retour* - Menu admin\n`;
    texte += `══════════════════`;

    const msg = await riza.sendMessage(m.chat, { text: texte }, { quoted: m });
    lastMessage = msg;
    currentStep = "gerer_images";
  },

  async gererImageArticle(riza, m, numero) {
    const resultat = trouverArticleParNumeroGlobal(parseInt(numero));
    if (!resultat) {
      await riza.sendMessage(m.chat, { text: "❌ Article introuvable." }, { quoted: m });
      return this.showMenuAdmin(m);
    }

    const { article, id, categorie } = resultat;
    const hasImage = articleHasImage(id);
    
    let texte = `🖼️ *GESTION IMAGE*\n══════════════════\n`;
    texte += `📦 ${article.nom} (N°${numero})\n`;
    texte += `📝 ${article.description}\n\n`;

    if (hasImage) {
      // Afficher l'image actuelle
      const imagePath = getImagePath(id);
      await riza.sendMessage(m.chat, {
        image: fs.readFileSync(imagePath),
        caption: `*Image actuelle de ${article.nom}*`
      }, { quoted: m });

      texte += `✅ *Image présente*\n\n`;
      texte += `*changer* - Remplacer l'image\n`;
      texte += `*supprimer* - Supprimer l'image\n`;
    } else {
      texte += `❌ *Aucune image*\n\n`;
      texte += `*ajouter* - Ajouter une image\n`;
    }

    texte += `*retour* - Menu précédent\n`;
    texte += `══════════════════`;

    const msg = await riza.sendMessage(m.chat, { text: texte }, { quoted: m });
    lastMessage = msg;
    currentStep = `gerer_image_${id}`;
    
    // Écouteur pour la gestion d'image
    const imageListener = async ({ messages }) => {
      const msgRep = messages[0];
      if (!msgRep.message) return;

      const from = msgRep.key.participant || msgRep.key.remoteJid;
      if (from !== m.sender) return;

      const content = msgRep.message.conversation || msgRep.message.extendedTextMessage?.text || "";
      const reponse = content.trim().toLowerCase();

      if (reponse === "retour") {
        riza.ev.off("messages.upsert", imageListener);
        await this.gererImages(riza, m);
        return;
      }
      else if (reponse === "ajouter" || reponse === "changer") {
        currentArticleData = { id: id, nom: article.nom };
        waitingForImage = true;
        await riza.sendMessage(m.chat, {
          text: `🖼️ Envoie la nouvelle image pour *${article.nom}* :`
        }, { quoted: msgRep });
        riza.ev.off("messages.upsert", imageListener);
      }
      else if (reponse === "supprimer" && hasImage) {
        deleteArticleImage(id);
        await riza.sendMessage(m.chat, {
          text: `✅ Image supprimée pour *${article.nom}*`
        }, { quoted: msgRep });
        riza.ev.off("messages.upsert", imageListener);
        await this.gererImages(riza, m);
        return;
      }
    };

    riza.ev.on("messages.upsert", imageListener);
  },

  async supprimerArticle(riza, m, numero) {
    const resultat = trouverArticleParNumeroGlobal(parseInt(numero));
    if (!resultat) {
      await riza.sendMessage(m.chat, { text: "❌ Article introuvable." }, { quoted: m });
      return this.showMenuAdmin(m);
    }

    const { article, id, categorie } = resultat;
    
    const msg = await riza.sendMessage(m.chat, {
      text: `🗑️ *SUPPRIMER ARTICLE*\n══════════════════\n📦 ${article.nom} (N°${numero})\n💸 ${article.prix?.toLocaleString() || 'N/A'} ${article.devise || ''}\n\n⚠️ *Confirmer la suppression ?*\nTape *oui* ou *non* :`
    }, { quoted: m });

    lastMessage = msg;
    currentStep = `supprimer_${id}`;

    const supprimerListener = async ({ messages }) => {
      const msgRep = messages[0];
      if (!msgRep.message) return;

      const from = msgRep.key.participant || msgRep.key.remoteJid;
      if (from !== m.sender) return;

      const content = msgRep.message.conversation || msgRep.message.extendedTextMessage?.text || "";
      const reponse = content.trim().toLowerCase();

      if (reponse === "oui") {
        const boutique = loadBoutique();
        delete boutique.articles[categorie][id];
        
        // Supprimer l'image associée
        deleteArticleImage(id);
        
        saveBoutique(boutique);
        
        await riza.sendMessage(m.chat, {
          text: `✅ *ARTICLE SUPPRIMÉ !*\n\n${article.nom} a été supprimé de la boutique.`
        }, { quoted: msgRep });
        riza.ev.off("messages.upsert", supprimerListener);
        await this.showGestionArticles(m);
        return;
      } else if (reponse === "non") {
        await riza.sendMessage(m.chat, {
          text: "❌ Suppression annulée."
        }, { quoted: msgRep });
        riza.ev.off("messages.upsert", supprimerListener);
        await this.showGestionArticles(m);
        return;
      }
    };

    riza.ev.on("messages.upsert", supprimerListener);
  },

  async showInfosValoria(riza, m) {
    const boutique = loadBoutique();
    const valoria = boutique.valoria || { diamants: 0, rulith: 0, transactions: [] };
    
    let infosText = `📊 *STATISTIQUES VALORIA*\n══════════════════\n`;
    infosText += `💎 ${valoria.diamants.toLocaleString()} Diamants\n`;
    infosText += `💰 ${valoria.rulith.toLocaleString()} Rulith\n\n`;
    
    if (valoria.transactions && valoria.transactions.length > 0) {
      infosText += `*Dernières transactions:*\n`;
      valoria.transactions.slice(-10).forEach(trans => {
        infosText += `• ${trans.joueur?.split('@')[0] || 'Système'}: ${trans.montant.toLocaleString()} ${trans.devise} - ${trans.article || trans.description}\n`;
      });
    } else {
      infosText += `Aucune transaction enregistrée.\n`;
    }
    
    infosText += `══════════════════`;

    await riza.sendMessage(m.chat, { text: infosText }, { quoted: m });
  }
};