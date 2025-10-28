const fs = require("fs");
const path = require("path");

const PALMARES_PATH = path.join(__dirname, "../data/palmares.json");

function loadPalmares() {
  if (!fs.existsSync(PALMARES_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(PALMARES_PATH, "utf-8"));
  } catch (e) {
    console.error("❌ Erreur lecture palmares.json :", e.message);
    return {};
  }
}

module.exports = {
  name: "monpalmares",
  category: "UNIROLIST",
  description: "Affiche ton propre palmarès",
  allowedForAll: true,

  async execute(riza, m) {
    const palmares = loadPalmares();
    const sender = m.sender;

    const stats = palmares[sender];
    if (!stats) {
      return riza.sendMessage(m.chat, {
        text: "📭 Tu n'as pas encore de palmarès enregistré.",
      }, { quoted: m });
    }

    const message = `🏅 *Ton Palmarès personnel* :

🥇 Victoires : ${stats.victoires || 0}
🥈 Défaites : ${stats.defaites || 0}
🥉 Nuls     : ${stats.nuls || 0}`;

    await riza.sendMessage(m.chat, { text: message }, { quoted: m });
  }
};