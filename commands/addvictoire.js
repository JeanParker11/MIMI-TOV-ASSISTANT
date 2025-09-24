const fs = require("fs");
const path = require("path");

const PALMARES_PATH = path.join(__dirname, "../data/palmares.json");

function loadPalmares() {
  if (!fs.existsSync(PALMARES_PATH)) return {};
  return JSON.parse(fs.readFileSync(PALMARES_PATH, "utf-8"));
}

function savePalmares(data) {
  fs.writeFileSync(PALMARES_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  name: "addvictoire",
  category: "UNIROLIST",
  description: "Ajoute 1 victoire à un joueur",
  onlyAdmin: true,

  async execute(riza, m) {
    const target = m.mentionedJid?.[0] ||
                   m.message?.extendedTextMessage?.contextInfo?.participant;

    if (!target) {
      return riza.sendMessage(m.chat, {
        text: "❌ Mentionne ou répond à un joueur pour lui ajouter une victoire."
      }, { quoted: m });
    }

    const palmares = loadPalmares();
    if (!palmares[target]) {
      palmares[target] = { victoires: 0, defaites: 0, nuls: 0 };
    }

    palmares[target].victoires += 1;
    savePalmares(palmares);

    await riza.sendMessage(m.chat, {
      text: `✅ 1 victoire ajoutée à @${target.split("@")[0]}`,
      mentions: [target]
    }, { quoted: m });
  }
};