const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");

if (!fs.existsSync(guildesPath)) fs.writeFileSync(guildesPath, JSON.stringify({}, null, 2));

module.exports = {
  name: "dissouguilde",
  category: "UNIROLIST",
  description: "Dissout entièrement la guilde (chef + admin requis)",
  allowPrivate: false,

  async execute(riza, m) {
    const sender = m.sender;
    const chat = m.chat;

    const guildes = JSON.parse(fs.readFileSync(guildesPath));
    const guilde = Object.values(guildes).find(g => g.chef === sender);
    const idGuilde = Object.keys(guildes).find(k => guildes[k] === guilde);

    if (!guilde) {
      return riza.sendMessage(chat, {
        text: "❌ Tu n'es pas chef d'une guilde.",
      }, { quoted: m });
    }

    const groupMetadata = await riza.groupMetadata(chat);
    const admins = groupMetadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");

    await riza.sendMessage(chat, {
      text: `⚠️ Tu es sur le point de *dissoudre* la guilde *${guilde.nom}*.\n\nConfirme avec *oui* ou *non*.`,
    }, { quoted: m });

    const confirmChef = async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message) return;

      const from = msg.key.participant || msg.key.remoteJid;
      if (from !== sender) return;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const response = text.trim().toLowerCase();

      if (!["oui", "non"].includes(response)) return;

      riza.ev.off("messages.upsert", confirmChef);

      if (response === "non") {
        return riza.sendMessage(chat, {
          text: "❌ Opération annulée.",
        }, { quoted: msg });
      }

      // Demande de validation à un admin
      const validationMsg = `🛑 *DISSOLUTION DE GUILDE EN ATTENTE*
━━━━━━━━━━━━━━━━━━━━
👑 Chef : @${sender.split("@")[0]}
🏰 Guilde : *${guilde.nom}*

⚠️ Un *admin du groupe* doit taper *valider* ou *refuser* pour confirmer la dissolution.
━━━━━━━━━━━━━━━━━━━━`;

      await riza.sendMessage(chat, {
        text: validationMsg,
        mentions: [sender, ...admins.map(a => a.id)]
      }, { quoted: msg });

      const adminValidation = async ({ messages }) => {
        const msg2 = messages[0];
        if (!msg2.message) return;

        const adminSender = msg2.key.participant || msg2.key.remoteJid;
        if (!admins.some(a => a.id === adminSender)) return;

        const text2 = msg2.message.conversation || msg2.message.extendedTextMessage?.text || "";
        const decision = text2.trim().toLowerCase();

        if (!["valider", "refuser"].includes(decision)) return;

        riza.ev.off("messages.upsert", adminValidation);

        if (decision === "refuser") {
          return riza.sendMessage(chat, {
            text: "❌ Un administrateur a refusé la dissolution.",
          }, { quoted: msg2 });
        }

        // Suppression de la guilde
        delete guildes[idGuilde];
        fs.writeFileSync(guildesPath, JSON.stringify(guildes, null, 2));

        return riza.sendMessage(chat, {
          text: `✅ La guilde *${guilde.nom}* a été dissoute.`,
        }, { quoted: msg2 });
      };

      riza.ev.on("messages.upsert", adminValidation);
    };

    riza.ev.on("messages.upsert", confirmChef);
  }
};