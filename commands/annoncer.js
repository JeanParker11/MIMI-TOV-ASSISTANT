const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");

if (!fs.existsSync(guildesPath)) fs.writeFileSync(guildesPath, JSON.stringify({}, null, 2));

module.exports = {
  name: "annoncer",
  category: "UNIROLIST",
  description: "Envoie une annonce à tous les membres de la guilde",
  allowPrivate: false,

  async execute(riza, m, args) {
    const sender = m.sender;
    const chat = m.chat;

    const groupMetadata = await riza.groupMetadata(chat);
    const admins = groupMetadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
    const isAdmin = admins.some(p => p.id === sender);

    const guildes = JSON.parse(fs.readFileSync(guildesPath));
    const guilde = Object.values(guildes).find(g => g.membres.includes(sender));

    if (!guilde) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne fais partie d’aucune guilde.",
      }, { quoted: m });
    }

    const estChef = guilde.chef === sender;

    if (!isAdmin && !estChef) {
      return riza.sendMessage(chat, {
        text: "❌ Seul le chef de guilde ou un admin peut envoyer une annonce.",
      }, { quoted: m });
    }

    const annonce = args.join(" ");
    if (!annonce) {
      return riza.sendMessage(chat, {
        text: "❌ Écris le message de l’annonce après la commande.",
      }, { quoted: m });
    }

    const mentions = guilde.membres;

    const texte = `📣 *Annonce de la Guilde : ${guilde.nom}*\n━━━━━━━━━━━\n👑 Chef : @${guilde.chef.split("@")[0]}\n📨 Envoyée par : @${sender.split("@")[0]}\n\n🗣️ *Message :*\n${annonce}\n━━━━━━━━━━━━`;

    await riza.sendMessage(chat, {
      text: texte,
      mentions
    }, { quoted: m });
  }
};