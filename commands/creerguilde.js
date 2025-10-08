const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");
const fichesPath = path.join(__dirname, "..", "data", "fiches.json");
const socialPath = path.join(__dirname, "..", "data", "social.json");

if (!fs.existsSync(guildesPath)) fs.writeFileSync(guildesPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(fichesPath)) fs.writeFileSync(fichesPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(socialPath)) fs.writeFileSync(socialPath, JSON.stringify({}, null, 2));

module.exports = {
  name: "creerguilde",
  category: "UNIROLIST",
  description: "Permet à un joueur de proposer une nouvelle guilde (validation par admin).",
  onlyAdmin: true,

  async execute(riza, m) {
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const rawTarget =
      contextInfo?.participant ||
      contextInfo?.remoteJid ||
      (m.mentionedJid && m.mentionedJid[0]);

    if (!rawTarget) {
      return riza.sendMessage(m.chat, {
        text: "❌ Répondez au joueur ou mentionnez-le pour créer une guilde."
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
    const guildes = JSON.parse(fs.readFileSync(guildesPath));

    const questions = [
      { key: "nom", text: "🏰 Quel est le *nom de la guilde* à créer ?" },
      { key: "description", text: "📜 Donne une *description courte* de ta guilde." },
      { key: "embleme", text: "🪧 As-tu un *symbole ou devise* pour cette guilde ?" }
    ];

    const answers = {};
    let current = 0;
    let lastPlayerMessage = null;
    let validationAsked = false;
    let validationTimeout;
    let validationListener = null;

    await riza.sendMessage(m.chat, {
      text: `👋 Bonjour @${target.split("@")[0]} !

Tu veux fonder une *guilde* ? Super idée !

Réponds aux quelques questions ci-dessous. ⚠️ *Réponds en citant chaque message du bot*.

L'admin devra valider ta demande ✅.`,
      mentions: [target]
    }, { quoted: m });

    const askNext = async () => {
      if (current >= questions.length) {
        const nom = answers.nom?.trim() || "Guilde sans nom";
        
        // Vérifier si une guilde avec ce nom existe déjà
        if (Object.values(guildes).some(g => g.nom.toLowerCase() === nom.toLowerCase())) {
          await riza.sendMessage(m.chat, {
            text: `❌ Une guilde avec le nom "${nom}" existe déjà. Veuillez recommencer avec un nom différent.`,
            mentions: [target]
          }, { quoted: lastPlayerMessage });
          
          // Réinitialiser et recommencer depuis la question du nom
          answers.nom = undefined;
          answers.description = undefined;
          answers.embleme = undefined;
          current = 0;
          return askNext();
        }

        const recap = `📋 *NOUVELLE GUILDE EN ATTENTE*
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
            const nomGuilde = answers.nom.trim();

            guildes[target] = {
              chef: target,
              nom: nomGuilde,
              description: answers.description || "",
              embleme: answers.embleme || "",
              membres: [target],
              dateCreation: new Date().toISOString()
            };

            fs.writeFileSync(guildesPath, JSON.stringify(guildes, null, 2));
            
            // Mettre à jour la fiche sociale du joueur
            if (socials[target]) {
              socials[target].guilde = nomGuilde;
              fs.writeFileSync(socialPath, JSON.stringify(socials, null, 2));
            }

            return riza.sendMessage(m.chat, {
              text: `✅ Guilde *${nomGuilde}* créée et validée par ${m.pushName || "l'admin"}.`,
              mentions: [target, adminId]
            });
          } else {
            return riza.sendMessage(m.chat, {
              text: `❌ Demande de création de guilde refusée par l'admin.`,
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
        
        // Validation du nom de guilde (ne doit pas être vide)
        if (current === 0 && !reponse.trim()) {
          await riza.sendMessage(m.chat, {
            text: `❌ Le nom de la guilde ne peut pas être vide. Veuillez répondre à nouveau.`,
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