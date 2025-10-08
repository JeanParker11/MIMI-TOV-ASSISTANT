const fs = require('fs');
const path = require('path');

const PANTHEON_PATH = path.join(__dirname, '../data/pantheon.json');

function loadPantheon() {
  if (!fs.existsSync(PANTHEON_PATH)) return {};
  return JSON.parse(fs.readFileSync(PANTHEON_PATH));
}

module.exports = {
  name: "pantheon",
  category: "UNIROLIST",
  description: "Affiche le Panthéon des champions de la communauté",

  // Permissions (ici accessible à tous par défaut)
  allowedForAll: true,  // Ou false si tu veux restreindre, dans ce cas, ajoute onlyOwner/onlySudo/onlyAdmin

  async execute(riza, m, args) {
    const pantheon = loadPantheon();
    if (Object.keys(pantheon).length === 0) {
      return riza.sendMessage(m.chat, { text: "Le Panthéon est vide pour le moment." }, { quoted: m });
    }

    let message = '🔥 𝗧𝗛𝗘 𝗕𝗥𝗔𝗩𝗘\'𝗦 𝗣𝗔𝗡𝗧𝗛𝗘𝗢𝗡 🔥\n\n';

    for (const [pseudo, info] of Object.entries(pantheon)) {
      message += `• ${pseudo} - ${info.titre || "Champion"} (${info.date || "date inconnue"})\n`;
    }

    await riza.sendMessage(m.chat, { text: message.trim() }, { quoted: m });
  }
};