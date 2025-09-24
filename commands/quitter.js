const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");

if (!fs.existsSync(guildesPath)) fs.writeFileSync(guildesPath, JSON.stringify({}, null, 2));

module.exports = {
  name: "quitter",
  category: "UNIROLIST",
  description: "Quitte ta guilde (avec confirmation admin)",
  allowPrivate: false,

  async execute(riza, m) {
    const sender = m.sender;
    const chat = m.chat;

    const guildes = JSON.parse(fs.readFileSync(guildesPath));
    const guilde = Object.values(guildes).find(g => g.membres.includes(sender));
    const idGuilde = Object.keys(guildes).find(k => guildes[k] === guilde);

    if (!guilde) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne fais partie d’aucune guilde.",
      }, { quoted: m });
    }

    if (guilde.chef === sender) {
      return riza.sendMessage(chat, {
        text: "❌ Tu es le chef de la guilde. Transfère ton rôle avant de quitter.",
      }, { quoted: m });
    }

    const groupMetadata = await riza.groupMetadata(chat);
    const admins = groupMetadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");

    await riza.sendMessage(chat, {
      text: `⚠️ Es-tu sûr de vouloir quitter la guilde *${guilde.nom}* ?\n\nTape *oui* pour confirmer ou *non* pour annuler.`,
    }, { quoted: m });

    const playerConfirm = async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message) return;

      const from = msg.key.participant || msg.key.remoteJid;
      if (from !== sender) return;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const response = text.trim().toLowerCase();

      if (!["oui", "non"].includes(response)) return;

      riza.ev.off("messages.upsert", playerConfirm);

      if (response === "non") {
        return riza.sendMessage(chat, {
          text: "❌ Opération annulée. Tu restes dans ta guilde.",
        }, { quoted: msg });
      }

      const recap = `📋 *DEMANDE DE QUITTER LA GUILDE*
━━━━━━━━━━━━━━━━━━━━
👤 Joueur : @${sender.split("@")[0]}
🏰 Guilde : *${guilde.nom}*

Un administrateur doit taper *valider* ou *refuser* pour approuver la sortie.
━━━━━━━━━━━━━━━━━━━━`;

      await riza.sendMessage(chat, {
        text: recap,
        mentions: [sender, ...admins.map(a => a.id)],
      }, { quoted: msg });

      const adminConfirm = async ({ messages }) => {
        const msg2 = messages[0];
        if (!msg2.message) return;

        const from = msg2.key.participant || msg2.key.remoteJid;
        if (!admins.some(a => a.id === from)) return;

        const content = msg2.message.conversation || msg2.message.extendedTextMessage?.text || "";
        const decision = content.trim().toLowerCase();

        if (!["valider", "refuser"].includes(decision)) return;

        riza.ev.off("messages.upsert", adminConfirm);

        if (decision === "refuser") {
          return riza.sendMessage(chat, {
            text: `❌ Un administrateur a refusé la demande de @${sender.split("@")[0]}.`,
            mentions: [sender]
          }, { quoted: msg2 });
        }

        // Retirer le joueur
        guilde.membres = guilde.membres.filter(jid => jid !== sender);
        fs.writeFileSync(guildesPath, JSON.stringify(guildes, null, 2));

        return riza.sendMessage(chat, {
          text: `✅ @${sender.split("@")[0]} a quitté la guilde *${guilde.nom}*.`,
          mentions: [sender]
        }, { quoted: msg2 });
      };

      riza.ev.on("messages.upsert", adminConfirm);
    };

    riza.ev.on("messages.upsert", playerConfirm);
  }
};