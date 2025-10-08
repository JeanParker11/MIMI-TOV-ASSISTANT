const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");
const fichesPath = path.join(__dirname, "..", "data", "fiches.json");
const socialPath = path.join(__dirname, "..", "data", "social.json");

if (!fs.existsSync(guildesPath)) fs.writeFileSync(guildesPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(fichesPath)) fs.writeFileSync(fichesPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(socialPath)) fs.writeFileSync(socialPath, JSON.stringify({}, null, 2));

module.exports = {
  name: "inviter",
  category: "UNIROLIST",
  description: "Invite un joueur à rejoindre une guilde (avec validation)",
  allowPrivate: false,

  async execute(riza, m, args) {
    const sender = m.sender;
    const chat = m.chat;
    const groupMetadata = await riza.groupMetadata(chat);
    const admins = groupMetadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
    const isAdmin = admins.some(p => p.id === sender);

    // Charger les données
    const fiches = JSON.parse(fs.readFileSync(fichesPath));
    const socials = JSON.parse(fs.readFileSync(socialPath));

    // Vérifier si l'invitant a une fiche
    if (!fiches[sender] || !socials[sender]) {
      return riza.sendMessage(chat, {
        text: "❌ Vous devez avoir une fiche RP et sociale complète pour inviter quelqu'un.",
      }, { quoted: m });
    }

    // Identifier la cible mentionnée ou répondue
    const context = m.message?.extendedTextMessage?.contextInfo;
    const mention =
      context?.participant ||
      context?.remoteJid ||
      (m.mentionedJid && m.mentionedJid[0]);

    if (!mention) {
      return riza.sendMessage(chat, {
        text: "❌ Mentionne ou réponds au joueur que tu veux inviter.",
      }, { quoted: m });
    }

    const target = mention;

    // Vérifier si la cible a une fiche
    if (!fiches[target] || !socials[target]) {
      return riza.sendMessage(chat, {
        text: "❌ Ce joueur n'a pas de fiche RP et sociale complète. Il doit d'abord s'enregistrer.",
        mentions: [target]
      }, { quoted: m });
    }

    // Vérifier si la cible a déjà une guilde
    if (socials[target].guilde) {
      return riza.sendMessage(chat, {
        text: `❌ Ce joueur fait déjà partie de la guilde *${socials[target].guilde}*.`,
        mentions: [target]
      }, { quoted: m });
    }

    // Charger les guildes
    const guildes = JSON.parse(fs.readFileSync(guildesPath));
    const guilde = Object.values(guildes).find(g => g.membres.includes(sender));
    const idGuilde = Object.keys(guildes).find(id => guildes[id] === guilde);

    if (!guilde) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne fais partie d'aucune guilde.",
      }, { quoted: m });
    }

    const estChef = guilde.chef === sender;
    if (!estChef && !isAdmin) {
      return riza.sendMessage(chat, {
        text: "❌ Seuls le chef ou un admin peuvent inviter des membres.",
      }, { quoted: m });
    }

    // Si admin : ajout direct
    if (isAdmin) {
      if (guilde.membres.includes(target)) {
        return riza.sendMessage(chat, {
          text: "ℹ️ Ce joueur est déjà dans la guilde.",
        }, { quoted: m });
      }

      guilde.membres.push(target);
      fs.writeFileSync(guildesPath, JSON.stringify(guildes, null, 2));

      // Mettre à jour la fiche sociale
      socials[target].guilde = guilde.nom;
      fs.writeFileSync(socialPath, JSON.stringify(socials, null, 2));

      return riza.sendMessage(chat, {
        text: `✅ @${target.split("@")[0]} a été ajouté directement à la guilde *${guilde.nom}*.`,
        mentions: [target]
      }, { quoted: m });
    }

    // Si chef, on propose à la cible
    await riza.sendMessage(chat, {
      text: `📨 @${target.split("@")[0]}, tu as été invité à rejoindre la guilde *${guilde.nom}* par ton chef @${sender.split("@")[0]}.\n\nTape *accepter* ou *refuser*.`,
      mentions: [target, sender]
    }, { quoted: m });

    // 1️⃣ Attente réponse de la cible
    const waitForResponse = async () => {
      let validationAsked = false;
      let validationTimeout;

      const listener = async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        const from = msg.key.participant || msg.key.remoteJid;
        if (from !== target) return;

        const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const decision = content.trim().toLowerCase();

        if (!["accepter", "refuser"].includes(decision)) return;

        riza.ev.off("messages.upsert", listener);

        if (decision === "refuser") {
          return riza.sendMessage(chat, {
            text: `❌ @${target.split("@")[0]} a refusé de rejoindre la guilde *${guilde.nom}*.`,
            mentions: [target]
          }, { quoted: msg });
        }

        // 2️⃣ Accepté → attente d'un admin
        validationAsked = true;
        const recap = `📋 *VALIDATION D'INVITATION*
━━━━━━━━━━━━━━━━━━
• Guilde : ${guilde.nom}
• Chef : @${sender.split("@")[0]}
• Cible : @${target.split("@")[0]}

✍️ L'un des admins peut taper *valider* ou *refuser*.
━━━━━━━━━━━━━━━━━━`;

        const recapMessage = await riza.sendMessage(chat, {
          text: recap,
          mentions: [target, ...admins.map(a => a.id)]
        }, { quoted: msg });

        const adminValidation = async ({ messages }) => {
          if (!validationAsked) return;

          const msg2 = messages[0];
          if (!msg2.message) return;
          const from2 = msg2.key.participant || msg2.key.remoteJid;
          if (!admins.some(a => a.id === from2)) return;

          const contextInfo = msg2.message?.extendedTextMessage?.contextInfo;
          if (!contextInfo || contextInfo.stanzaId !== recapMessage.key.id) {
            return;
          }

          const content2 = msg2.message.conversation || msg2.message.extendedTextMessage?.text || "";
          const finalDecision = content2.trim().toLowerCase();

          if (!["valider", "refuser"].includes(finalDecision)) {
            await riza.sendMessage(chat, {
              text: "❌ Réponse invalide. Veuillez taper *valider* ou *refuser* en répondant au message de recap.",
              mentions: [from2]
            });
            return;
          }

          clearTimeout(validationTimeout);
          riza.ev.off("messages.upsert", adminValidation);
          validationAsked = false;

          if (finalDecision === "refuser") {
            return riza.sendMessage(chat, {
              text: `❌ Un administrateur a refusé l'ajout de @${target.split("@")[0]} dans la guilde.`,
              mentions: [target]
            }, { quoted: msg2 });
          }

          // Vérifier une dernière fois avant l'ajout
          const guildesCheck = JSON.parse(fs.readFileSync(guildesPath));
          const socialsCheck = JSON.parse(fs.readFileSync(socialPath));
          const guildeCheck = Object.values(guildesCheck).find(g => g.membres.includes(sender));

          if (!guildeCheck) {
            return riza.sendMessage(chat, {
              text: "❌ La guilde n'existe plus ou vous n'en faites plus partie.",
            }, { quoted: msg2 });
          }

          if (guildeCheck.membres.includes(target)) {
            return riza.sendMessage(chat, {
              text: "ℹ️ Ce joueur est déjà dans la guilde.",
            }, { quoted: msg2 });
          }

          if (socialsCheck[target]?.guilde) {
            return riza.sendMessage(chat, {
              text: `❌ Ce joueur fait déjà partie d'une autre guilde : ${socialsCheck[target].guilde}`,
              mentions: [target]
            }, { quoted: msg2 });
          }

          // Ajouter le membre
          guildeCheck.membres.push(target);
          fs.writeFileSync(guildesPath, JSON.stringify(guildesCheck, null, 2));

          // Mettre à jour la fiche sociale
          socialsCheck[target].guilde = guildeCheck.nom;
          fs.writeFileSync(socialPath, JSON.stringify(socialsCheck, null, 2));

          return riza.sendMessage(chat, {
            text: `✅ @${target.split("@")[0]} a rejoint la guilde *${guildeCheck.nom}* avec validation admin.`,
            mentions: [target]
          }, { quoted: msg2 });
        };

        riza.ev.on("messages.upsert", adminValidation);

        // Timeout pour la validation admin
        validationTimeout = setTimeout(() => {
          if (validationAsked) {
            riza.ev.off("messages.upsert", adminValidation);
            validationAsked = false;
            riza.sendMessage(chat, {
              text: "⌛ Temps écoulé - L'invitation a été annulée car aucun admin n'a répondu à temps.",
              mentions: [sender]
            });
          }
        }, 120000);
      };

      riza.ev.on("messages.upsert", listener);
    };

    await waitForResponse();
  }
};