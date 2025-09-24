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
  name: "autoriser",
  description: "Autorise un groupe à utiliser les commandes UNIROLIST",
  category: "Owner",
  allowedForAll: false,
  onlyOwner: true,
  async execute(riza, m) {
    if (!m.chat.endsWith("@g.us")) {
      return riza.sendMessage(m.chat, { text: "❌ Cette commande doit être utilisée dans un groupe." }, { quoted: m });
    }

    const jid = m.chat;
    let groupes = loadGroupes();

    if (groupes.includes(jid)) {
      return riza.sendMessage(m.chat, { text: "✅ Ce groupe est déjà dans la liste." }, { quoted: m });
    }

    groupes.push(jid);
    saveGroupes(groupes);

    await riza.sendMessage(m.chat, { text: `✅ Groupe ajouté avec succès !\n\n*Essayer une commande UNIROLIST*` }, { quoted: m });
  },
};