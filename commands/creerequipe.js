const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");
const equipesPath = path.join(__dirname, "..", "data", "equipes.json");
const fichesPath = path.join(__dirname, "..", "data", "fiches.json");
const socialPath = path.join(__dirname, "..", "data", "social.json");

if (!fs.existsSync(fichesPath)) fs.writeFileSync(fichesPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(socialPath)) fs.writeFileSync(socialPath, JSON.stringify({}, null, 2));

// Fonction pour migrer les données de guildes vers equipes
function migrerGuildesVersEquipes() {
  if (fs.existsSync(guildesPath) && !fs.existsSync(equipesPath)) {
    const guildesData = JSON.parse(fs.readFileSync(guildesPath));
    fs.writeFileSync(equipesPath, JSON.stringify(guildesData, null, 2));
    console.log("✅ Migration des guildes vers equipes effectuée");
  }
}

// Fonction pour obtenir les données d'équipes (avec rétrocompatibilité)
function getEquipesData() {
  // Migrer d'abord si nécessaire
  migrerGuildesVersEquipes();
  
  if (fs.existsSync(equipesPath)) {
    return JSON.parse(fs.readFileSync(equipesPath));
  } else if (fs.existsSync(guildesPath)) {
    return JSON.parse(fs.readFileSync(guildesPath));
  } else {
    fs.writeFileSync(equipesPath, JSON.stringify({}, null, 2));
    return {};
  }
}

module.exports = {
  name: "creerequipe", // Renommé de "creerguilde" à "creerequipe"
  category: "UNIROLIST",
  description: "Permet à un joueur de proposer une nouvelle équipe (validation par admin).", // Description mise à jour
  onlyAdmin: true,

  async execute(riza, m) {
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const rawTarget =
      contextInfo?.participant ||
      contextInfo?.remoteJid ||
      (m.mentionedJid && m.mentionedJid[0]);

    if (!rawTarget) {
      return riza.sendMessage(m.chat, {
        text: "❌ Répondez au joueur ou mentionnez-le pour créer une équipe." // Message mis à jour
      }, { quoted: m });
    }

    const target = rawTarget;

    const fiches = JSON.parse(fs.readFileSync(fichesPath));
    const socials = JSON.parse(fs.readFileSync(socialPath));

    if (!fiches[target]) {
      return riza.sendMessage(m.chat, {
        text: "❌ Ce joueur n'a pas de fiche RP validée. Il doit d'abord en créer une."
      }, { quoted: m });
    }
    if (!socials[target]) {
      return riza.sendMessage(m.chat, {
        text: "❌ Ce joueur n'a pas de fiche sociale. Il doit d'abord en créer une."
      }, { quoted: m });
    }

    const adminId = m.sender;
    const equipes = getEquipesData(); // Utilise la fonction de rétrocompatibilité

    const questions = [
      { key: "nom", text: "👥 Quel est le *nom de l'équipe* à créer ?" }, // Message mis à jour
      { key: "description", text: "📜 Donne une *description courte* de ton équipe." }, // Message mis à jour
      { key: "embleme", text: "🪧 As-tu un *symbole ou devise* pour cette équipe ?" } // Message mis à jour
    ];

    const answers = {};
    let current = 0;
    let lastPlayerMessage = null;
    let validationAsked = false;
    let validationTimeout;
    let validationListener = null;

    await riza.sendMessage(m.chat, {
      text: `👋 Bonjour @${target.split("@")[0]} !

Tu veux fonder une *équipe* ? Super idée !

Réponds aux quelques questions ci-dessous. ⚠️ *Réponds en citant chaque message du bot*.

L'admin devra valider ta demande ✅.`,
      mentions: [target]
    }, { quoted: m });

    const askNext = async () => {
      if (current >= questions.length) {
        const nom = answers.nom?.trim() || "Équipe sans nom"; // Message mis à jour
        
        // Vérifier si une équipe avec ce nom existe déjà
        if (Object.values(equipes).some(e => e.nom.toLowerCase() === nom.toLowerCase())) { // Renommé de guildes à equipes
          await riza.sendMessage(m.chat, {
            text: `❌ Une équipe avec le nom "${nom}" existe déjà. Veuillez recommencer avec un nom différent.`, // Message mis à jour
            mentions: [target]
          }, { quoted: lastPlayerMessage });
          
          // Réinitialiser et recommencer depuis la question du nom
          answers.nom = undefined;
          answers.description = undefined;
          answers.embleme = undefined;
          current = 0;
          return askNext();
        }

        const recap = `📋 *NOUVELLE ÉQUIPE EN ATTENTE*
════════════════
• 🏷️ Nom         : ${answers.nom || "?"}
• 📜 Description : ${answers.description || "(vide)"}
• 🪧 Emblème     : ${answers.embleme || "(aucun)"}

👑 Chef : @${target.split("@")[0]}
🛡️ L'admin @${adminId.split("@")[0]} peut taper *valider* ou *refuser*
════════════════`;

        validationAsked = true;
        const recapMessage = await riza.sendMessage(m.chat, { 
          text: recap, 
          mentions: [adminId, target] 
        });

        lastPlayerMessage = recapMessage;

        // Définir le listener de validation
        validationListener = async ({ messages }) => {
          if (!validationAsked) return;

          const msg = messages[0];
          if (!msg.message) return;

          const from = msg.key.participant || msg.key.remoteJid;
          if (from !== adminId) return;

          const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
          if (!contextInfo || contextInfo.stanzaId !== recapMessage.key.id) {
            return;
          }

          const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
          const decision = content.trim().toLowerCase();

          if (!['valider', 'refuser'].includes(decision)) {
            // Réponse invalide - on envoie un message d'erreur mais on NE DÉTACHE PAS le listener
            await riza.sendMessage(m.chat, {
              text: "❌ Réponse invalide. Veuillez taper *valider* ou *refuser* en répondant au message de recap.",
              mentions: [adminId]
            });
            return; // IMPORTANT: on return sans détacher le listener
          }

          // Si on arrive ici, la réponse est valide
          clearTimeout(validationTimeout);
          if (validationListener) {
            riza.ev.off("messages.upsert", validationListener);
          }
          validationAsked = false;

          if (decision === "valider") {
            const nomEquipe = answers.nom.trim(); // Renommé de nomGuilde à nomEquipe

            equipes[target] = { // Renommé de guildes à equipes
              chef: target,
              nom: nomEquipe,
              description: answers.description || "",
              embleme: answers.embleme || "",
              membres: [target],
              dateCreation: new Date().toISOString()
            };

            fs.writeFileSync(equipesPath, JSON.stringify(equipes, null, 2)); // Utilise equipesPath
            
            // Mettre à jour la fiche sociale du joueur (priorité au nouveau champ "equipe")
            if (socials[target]) {
              socials[target].equipe = nomEquipe; // Utilise le nouveau champ "equipe"
              // Garder l'ancien champ "guilde" pour la rétrocompatibilité si nécessaire
              if (!socials[target].guilde) {
                socials[target].guilde = nomEquipe;
              }
              fs.writeFileSync(socialPath, JSON.stringify(socials, null, 2));
            }

            return riza.sendMessage(m.chat, {
              text: `✅ Équipe *${nomEquipe}* créée et validée par ${m.pushName || "l'admin"}.`, // Message mis à jour
              mentions: [target, adminId]
            });
          } else {
            return riza.sendMessage(m.chat, {
              text: `❌ Demande de création d'équipe refusée par l'admin.`, // Message mis à jour
              mentions: [target, adminId]
            });
          }
        };

        // Attacher le listener
        riza.ev.on("messages.upsert", validationListener);

        validationTimeout = setTimeout(() => {
          if (validationAsked) {
            if (validationListener) {
              riza.ev.off("messages.upsert", validationListener);
            }
            validationAsked = false;
            riza.sendMessage(m.chat, {
              text: "⌛ Temps écoulé - La validation a été annulée car l'admin n'a pas répondu à temps.",
              mentions: [adminId]
            });
          }
        }, 120000);

        return;
      }

      // Si c'est la première question, on cite le message initial de l'admin
      // Sinon, on cite le dernier message du joueur
      const quotedMessage = current === 0 ? m : lastPlayerMessage;

      const questionMessage = await riza.sendMessage(m.chat, {
        text: `📌 ${questions[current].text}`,
        mentions: [target]
      }, { quoted: quotedMessage });

      const replyListener = async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.participant || msg.key.remoteJid;
        if (from !== target) return;

        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        if (!contextInfo || contextInfo.stanzaId !== questionMessage.key.id) {
          return;
        }

        const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!content) return;

        riza.ev.off("messages.upsert", replyListener);

        const reponse = content.trim();
        
        // Validation du nom d'équipe (ne doit pas être vide)
        if (current === 0 && !reponse.trim()) {
          await riza.sendMessage(m.chat, {
            text: `❌ Le nom de l'équipe ne peut pas être vide. Veuillez répondre à nouveau.`, // Message mis à jour
            mentions: [target]
          }, { quoted: msg });
          
          lastPlayerMessage = msg;
          await askNext();
          return;
        }

        answers[questions[current].key] = reponse;
        lastPlayerMessage = msg;
        current++;
        await askNext();
      };

      riza.ev.on("messages.upsert", replyListener);
    };

    await askNext();
  }
};