const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");

if (!fs.existsSync(guildesPath)) fs.writeFileSync(guildesPath, JSON.stringify({}, null, 2));

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

    // Charger les guildes
    const guildes = JSON.parse(fs.readFileSync(guildesPath));
    const guilde = Object.values(guildes).find(g => g.membres.includes(sender));
    const idGuilde = Object.keys(guildes).find(id => guildes[id] === guilde);

    if (!guilde) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne fais partie d’aucune guilde.",
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

        // 2️⃣ Accepté → attente d’un admin
        const recap = `📋 *VALIDATION D’INVITATION*
━━━━━━━━━━━━━━━━━━
• Guilde : ${guilde.nom}
• Chef : @${sender.split("@")[0]}
• Cible : @${target.split("@")[0]}

✍️ L’un des admins peut taper *valider* ou *refuser*.
━━━━━━━━━━━━━━━━━━`;

        await riza.sendMessage(chat, {
          text: recap,
          mentions: [target, ...admins.map(a => a.id)]
        }, { quoted: msg });

        const adminValidation = async ({ messages }) => {
          const msg2 = messages[0];
          if (!msg2.message) return;
          const from2 = msg2.key.participant || msg2.key.remoteJid;
          if (!admins.some(a => a.id === from2)) return;

          const content2 = msg2.message.conversation || msg2.message.extendedTextMessage?.text || "";
          const finalDecision = content2.trim().toLowerCase();

          if (!["valider", "refuser"].includes(finalDecision)) return;

          riza.ev.off("messages.upsert", adminValidation);

          if (finalDecision === "refuser") {
            return riza.sendMessage(chat, {
              text: `❌ Un administrateur a refusé l’ajout de @${target.split("@")[0]} dans la guilde.`,
              mentions: [target]
            }, { quoted: msg2 });
          }

          if (guilde.membres.includes(target)) {
            return riza.sendMessage(chat, {
              text: "ℹ️ Ce joueur est déjà dans la guilde.",
            }, { quoted: msg2 });
          }

          guilde.membres.push(target);
          fs.writeFileSync(guildesPath, JSON.stringify(guildes, null, 2));

          return riza.sendMessage(chat, {
            text: `✅ @${target.split("@")[0]} a rejoint la guilde *${guilde.nom}* avec validation admin.`,
            mentions: [target]
          }, { quoted: msg2 });
        };

        riza.ev.on("messages.upsert", adminValidation);
      };

      riza.ev.on("messages.upsert", listener);
    };

    await waitForResponse();
  }
};