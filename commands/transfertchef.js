const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");

if (!fs.existsSync(guildesPath)) fs.writeFileSync(guildesPath, JSON.stringify({}, null, 2));

module.exports = {
  name: "transfertchef",
  category: "UNIROLIST",
  description: "Transfère le rôle de chef de guilde à un autre membre (validation requise)",
  allowPrivate: false,

  async execute(riza, m, args) {
    const sender = m.sender;
    const chat = m.chat;

    const groupMetadata = await riza.groupMetadata(chat);
    const admins = groupMetadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");

    const isAdmin = admins.some(p => p.id === sender);

    const context = m.message?.extendedTextMessage?.contextInfo;
    const mention =
      context?.participant ||
      context?.remoteJid ||
      (m.mentionedJid && m.mentionedJid[0]);

    if (!mention) {
      return riza.sendMessage(chat, {
        text: "❌ Mentionne le membre à qui tu veux transférer le rôle de chef.",
      }, { quoted: m });
    }

    const target = mention;

    const guildes = JSON.parse(fs.readFileSync(guildesPath));
    const guilde = Object.values(guildes).find(g => g.membres.includes(sender));
    const idGuilde = Object.keys(guildes).find(id => guildes[id] === guilde);

    if (!guilde) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne fais partie d’aucune guilde.",
      }, { quoted: m });
    }

    if (guilde.chef !== sender) {
      return riza.sendMessage(chat, {
        text: "❌ Seul le chef de guilde peut transférer son rôle.",
      }, { quoted: m });
    }

    if (!guilde.membres.includes(target)) {
      return riza.sendMessage(chat, {
        text: "❌ Le joueur mentionné ne fait pas partie de ta guilde.",
      }, { quoted: m });
    }

    if (target === sender) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne peux pas te transférer le rôle à toi-même.",
      }, { quoted: m });
    }

    const confirmationText = `📋 *TRANSFERT DE CHEF*
━━━━━━━━━━━━━━━━
👑 Guilde : *${guilde.nom}*
🧑 Ancien chef : @${sender.split("@")[0]}
🎯 Nouveau chef proposé : @${target.split("@")[0]}

Un administrateur doit *valider* ou *refuser* ce transfert.
━━━━━━━━━━━━━━━━`;

    await riza.sendMessage(chat, {
      text: confirmationText,
      mentions: [sender, target, ...admins.map(a => a.id)]
    }, { quoted: m });

    // Écoute de la validation admin
    const validationListener = async ({ messages }) => {
      const msg2 = messages[0];
      if (!msg2.message) return;

      const from = msg2.key.participant || msg2.key.remoteJid;
      if (!admins.some(a => a.id === from)) return;

      const content = msg2.message.conversation || msg2.message.extendedTextMessage?.text || "";
      const decision = content.trim().toLowerCase();

      if (!["valider", "refuser"].includes(decision)) return;

      riza.ev.off("messages.upsert", validationListener);

      if (decision === "refuser") {
        return riza.sendMessage(chat, {
          text: `❌ Un administrateur a refusé le transfert de chef.`,
        }, { quoted: msg2 });
      }

      // Transfert accepté
      guilde.chef = target;
      fs.writeFileSync(guildesPath, JSON.stringify(guildes, null, 2));

      return riza.sendMessage(chat, {
        text: `✅ Le rôle de chef de guilde a été transféré à @${target.split("@")[0]}.`,
        mentions: [target]
      }, { quoted: msg2 });
    };

    riza.ev.on("messages.upsert", validationListener);
  }
};