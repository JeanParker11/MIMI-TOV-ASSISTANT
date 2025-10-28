const fs = require('fs');
const path = require('path');

const PALMARES_PATH = path.join(__dirname, '../data/palmares.json');

function loadPalmares() {
  if (!fs.existsSync(PALMARES_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(PALMARES_PATH, 'utf-8'));
  } catch (e) {
    console.error("❌ Erreur lecture palmares.json :", e.message);
    return {};
  }
}

module.exports = {
  name: "palmares",
  category: "UNIROLIST",
  description: "Affiche le palmarès (victoires, défaites, nuls) des joueurs",
  allowedForAll: true,

  async execute(riza, m, args) {
    const palmares = loadPalmares();
    const joueurs = Object.entries(palmares);

    if (joueurs.length === 0) {
      return riza.sendMessage(m.chat, {
        text: "📭 Aucun palmarès disponible pour le moment."
      }, { quoted: m });
    }

    // Tri décroissant par nombre de victoires
    const classement = joueurs.sort(([, a], [, b]) => (b.victoires || 0) - (a.victoires || 0));

    let message = '🏆 𝗣𝗔𝗟𝗠𝗔𝗥𝗘𝗦 𝗗𝗘 𝗟𝗔 𝗖𝗢𝗠𝗠𝗨𝗡𝗔𝗨𝗧𝗘 𝗨𝗡𝗜𝗥𝗢𝗟𝗜𝗦𝗧\n\n';
    const mentions = [];

    for (let i = 0; i < classement.length; i++) {
      const [jid, stats] = classement[i];
      const tag = `@${jid.split('@')[0]}`;
      mentions.push(jid);

      message += `🔹 ${i + 1}. ${tag}\n`;
      message += `   🥇 Victoires : ${stats.victoires || 0}\n`;
      message += `   🥈 Défaites : ${stats.defaites || 0}\n`;
      message += `   🥉 Nuls     : ${stats.nuls || 0}\n\n`;
    }

    await riza.sendMessage(
      m.chat,
      { text: message.trim(), mentions },
      { quoted: m }
    );
  }
};