const fs = require('fs');
const path = require('path');

const FICHES_PATH = path.join(__dirname, '../data/fiches.json');

function loadFiches() {
  if (!fs.existsSync(FICHES_PATH)) return {};
  return JSON.parse(fs.readFileSync(FICHES_PATH));
}

module.exports = {
  name: "ficheliste",
  category: "UNIROLIST",
  description: "Mentionne tous les joueurs ayant une fiche par faction",
  allowedForAll: true,

  async execute(riza, m, args) {
    const fiches = loadFiches();

    if (Object.keys(fiches).length === 0) {
      return riza.sendMessage(m.chat, { text: "❌ Aucune fiche enregistrée." }, { quoted: m });
    }

    const factions = {};
    const mentions = [];

    for (const [jid, fiche] of Object.entries(fiches)) {
      const faction = fiche.faction || "Inconnue";
      if (!factions[faction]) factions[faction] = [];
      factions[faction].push(jid);
      mentions.push(jid);
    }

    let message = '';

    for (const [faction, jids] of Object.entries(factions)) {
      message += `🛡️ *${faction.toUpperCase()}*\n`;
      message += jids.map(jid => `➤ @${jid.split('@')[0]}`).join('\n') + '\n\n';
    }

    return riza.sendMessage(m.chat, {
      text: message.trim(),
      mentions
    }, { quoted: m });
  }
};