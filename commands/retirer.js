const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");

if (!fs.existsSync(guildesPath)) fs.writeFileSync(guildesPath, JSON.stringify({}, null, 2));

module.exports = {
  name: "retirer",
  category: "UNIROLIST",
  description: "Exclut un membre d'une guilde (avec validation si chef)",
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
        text: "❌ Mentionne ou réponds au joueur que tu veux retirer.",
      }, { quoted: m });
    }

    const target = mention;

    // Charger les guildes
    const guildes = JSON.parse(fs.readFileSync(guildesPath));
    const guilde = Object.values(guildes).find(g => g.membres.includes(target));
    const idGuilde = Object.keys(guildes).find(id => guildes[id] === guilde);

    if (!guilde) {
      return riza.sendMessage(chat, {
        text: "❌ Ce joueur n’appartient à aucune guilde.",
      }, { quoted: m });
    }

    const estChef = guilde.chef === sender;
    if (!estChef && !isAdmin) {
      return riza.sendMessage(chat, {
        text: "❌ Seuls le chef de guilde ou un admin peuvent retirer un membre.",
      }, { quoted: m });
    }

    if (target === guilde.chef) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne peux pas retirer le chef de la guilde.",
      }, { quoted: m });
    }

    if (isAdmin) {
      // Retrait immédiat
      guilde.membres = guilde.membres.filter(m => m !== target);
      fs.writeFileSync(guildesPath, JSON.stringify(guildes, null, 2));

      return riza.sendMessage(chat, {
        text: `✅ @${target.split("@")[0]} a été retiré de la guilde *${guilde.nom}*.`,
        mentions: [target]
      }, { quoted: m });
    }

    // Si chef, demande de validation
    const recap = `📋 *DEMANDE DE RETRAIT*
━━━━━━━━━━━━━━━━━━
• Guilde : ${guilde.nom}
• Chef : @${sender.split("@")[0]}
• Cible : @${target.split("@")[0]}

✍️ Un admin peut taper *valider* ou *refuser*.
━━━━━━━━━━━━━━━━━━`;

    await riza.sendMessage(chat, {
      text: recap,
      mentions: [sender, target, ...admins.map(a => a.id)]
    }, { quoted: m });

    const validationListener = async ({ messages }) => {
      const msg2 = messages[0];
      if (!msg2.message) return;
      const from = msg2.key.participant || msg2.key.remoteJid;
      if (!admins.some(a => a.id === from)) return;

      const content2 = msg2.message.conversation || msg2.message.extendedTextMessage?.text || "";
      const decision = content2.trim().toLowerCase();

      if (!["valider", "refuser"].includes(decision)) return;

      riza.ev.off("messages.upsert", validationListener);

      if (decision === "refuser") {
        return riza.sendMessage(chat, {
          text: `❌ Un administrateur a refusé le retrait de @${target.split("@")[0]}.`,
          mentions: [target]
        }, { quoted: msg2 });
      }

      guilde.membres = guilde.membres.filter(m => m !== target);
      fs.writeFileSync(guildesPath, JSON.stringify(guildes, null, 2));

      return riza.sendMessage(chat, {
        text: `✅ @${target.split("@")[0]} a été retiré de la guilde *${guilde.nom}*.`,
        mentions: [target]
      }, { quoted: msg2 });
    };

    riza.ev.on("messages.upsert", validationListener);
  }
};