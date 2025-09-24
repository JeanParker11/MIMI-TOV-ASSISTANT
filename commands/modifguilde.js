const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");

if (!fs.existsSync(guildesPath)) fs.writeFileSync(guildesPath, JSON.stringify({}, null, 2));

module.exports = {
  name: "modifguilde",
  category: "UNIROLIST",
  description: "Propose une modification du nom, de la description ou de l’emblème de la guilde.",
  allowPrivate: false,

  async execute(riza, m, args) {
    const sender = m.sender;
    const chat = m.chat;
    const isGroup = chat.endsWith("@g.us");

    if (!isGroup) {
      return riza.sendMessage(chat, {
        text: "❌ Cette commande ne peut être utilisée qu'en groupe UNIROLIST.",
      }, { quoted: m });
    }

    const groupMetadata = await riza.groupMetadata(chat);
    const admins = groupMetadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
    const isAdmin = admins.some(p => p.id === sender);

    let guildes = {};
    try {
      guildes = JSON.parse(fs.readFileSync(guildesPath));
    } catch (e) {
      return riza.sendMessage(chat, {
        text: "❌ Impossible de lire les données de guilde.",
      }, { quoted: m });
    }

    const guilde = Object.values(guildes).find(g => Array.isArray(g.membres) && g.membres.includes(sender));
    if (!guilde) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne fais partie d’aucune guilde.",
      }, { quoted: m });
    }

    const estChef = guilde.chef === sender;
    if (!estChef && !isAdmin) {
      return riza.sendMessage(chat, {
        text: "❌ Seuls le chef de guilde ou un administrateur peuvent modifier une guilde.",
      }, { quoted: m });
    }

    const [champ, ...valeurArr] = args;
    const valeur = valeurArr.join(" ").trim();

    if (!champ || !valeur || !["nom", "description", "embleme"].includes(champ)) {
      return riza.sendMessage(chat, {
        text: "❌ Utilisation : `.modifguilde nom|description|embleme nouvelle_valeur`",
      }, { quoted: m });
    }

    const idGuilde = Object.keys(guildes).find(id => guildes[id] === guilde);

    if (isAdmin) {
      guilde[champ] = valeur;
      fs.writeFileSync(guildesPath, JSON.stringify(guildes, null, 2));
      return riza.sendMessage(chat, {
        text: `✅ Champ *${champ}* modifié immédiatement par un administrateur.`,
      }, { quoted: m });
    }

    // Si chef, nécessite validation par un admin
    const recap = `📋 *MODIFICATION DE GUILDE À VALIDER*
━━━━━━━━━━━━━━━━━━
🏰 *Guilde* : ${guilde.nom}
👑 *Chef* : @${guilde.chef.split("@")[0]}
✍️ *Proposé par* : @${sender.split("@")[0]}

🔁 *Changement demandé* :
• Champ : ${champ}
• Ancien : ${guilde[champ] || "(vide)"}
• Nouveau : ${valeur}

✅ Tape *valider* pour accepter ou *refuser* pour annuler.
━━━━━━━━━━━━━━━━━━`;

    await riza.sendMessage(chat, {
      text: recap,
      mentions: [sender, ...admins.map(a => a.id)]
    }, { quoted: m });

    const validationListener = async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message) return;

      const from = msg.key.participant || msg.key.remoteJid;
      if (!admins.some(a => a.id === from)) return;

      const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const decision = content.trim().toLowerCase();

      if (!["valider", "refuser"].includes(decision)) return;

      riza.ev.off("messages.upsert", validationListener);

      if (decision === "valider") {
        guilde[champ] = valeur;
        fs.writeFileSync(guildesPath, JSON.stringify(guildes, null, 2));
        await riza.sendMessage(chat, {
          text: `✅ Modification validée : *${champ}* mis à jour.`,
          mentions: [guilde.chef]
        }, { quoted: msg });
      } else {
        await riza.sendMessage(chat, {
          text: `❌ Modification annulée par un administrateur.`,
          mentions: [guilde.chef]
        }, { quoted: msg });
      }
    };

    riza.ev.on("messages.upsert", validationListener);
  }
};