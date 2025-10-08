const fs = require("fs");
const path = require("path");

const PALMARES_PATH = path.join(__dirname, "../data/palmares.json");
const FICHES_PATH = path.join(__dirname, "../data/fiches.json");

function loadFiches() {
  if (!fs.existsSync(FICHES_PATH)) return {};
  return JSON.parse(fs.readFileSync(FICHES_PATH));
}

function loadPalmares() {
  if (!fs.existsSync(PALMARES_PATH)) return {};
  return JSON.parse(fs.readFileSync(PALMARES_PATH));
}

function savePalmares(data) {
  fs.writeFileSync(PALMARES_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  name: "adddefaite",
  category: "UNIROLIST",
  description: "Ajoute 1 défaite à un joueur",
  onlyAdmin: true,

  async execute(riza, m) {
    const target = m.mentionedJid?.[0] ||
                   m.message?.extendedTextMessage?.contextInfo?.participant;

    if (!target) {
      return riza.sendMessage(m.chat, {
        text: "❌ Mentionne ou répond à un joueur pour lui ajouter une défaite."
      }, { quoted: m });
    }

    const fiches = loadFiches();

    // Vérification que le joueur a une fiche enregistrée
    if (!fiches[target]) {
      return riza.sendMessage(m.chat, {
        text: `❌ @${target.split("@")[0]} n'a pas de fiche enregistrée, impossible d'ajouter une défaite.`,
        mentions: [target]
      }, { quoted: m });
    }

    const palmares = loadPalmares();

    if (!palmares[target]) {
      palmares[target] = { victoires: 0, defaites: 0, nuls: 0 };
    }

    palmares[target].defaites += 1;
    savePalmares(palmares);

    await riza.sendMessage(m.chat, {
      text: `⚠️ 1 défaite ajoutée à @${target.split("@")[0]}`,
      mentions: [target]
    }, { quoted: m });
  }
};