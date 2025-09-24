const fs = require("fs");
const path = require("path");

const groupePath = path.join(__dirname, "..", "data", "groupe.json");

function loadGroupes() {
  if (!fs.existsSync(groupePath)) {
    fs.writeFileSync(groupePath, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(groupePath));
}

function saveGroupes(groupes) {
  fs.writeFileSync(groupePath, JSON.stringify(groupes, null, 2));
}

module.exports = {
  name: "interdire",
  description: "interdire un groupe à utiliser les commandes UNIROLIST",
  category: "Owner",
  allowedForAll: false,
  onlyOwner: true,
  async execute(riza, m) {
    if (!m.chat.endsWith("@g.us")) {
      return riza.sendMessage(m.chat, { text: "❌ Cette commande doit être utilisée dans un groupe." }, { quoted: m });
    }

    const jid = m.chat;
    let groupes = loadGroupes();

    if (!groupes.includes(jid)) {
      return riza.sendMessage(m.chat, { text: "⚠️ Ce groupe n'est pas dans la liste." }, { quoted: m });
    }

    groupes = groupes.filter(g => g !== jid);
    saveGroupes(groupes);

    await riza.sendMessage(m.chat, { text: `✅ Groupe retiré avec succès !\n\n*Ce groupe ne peut plus utiliser les commandes UNIROLIST*` }, { quoted: m });
  },
};