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

function savePalmares(data) {
  fs.writeFileSync(PALMARES_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  name: "modifpalmares",
  category: "UNIROLIST",
  description: "Modifie le palmarès d’un joueur (victoires, defaites ou nuls)",
  onlyAdmin: true,

  async execute(riza, m, args) {
    const target = m.mentionedJid?.[0] ||
                   m.message?.extendedTextMessage?.contextInfo?.participant;

    if (!target) {
      return riza.sendMessage(m.chat, {
        text: "❌ Mentionne ou répond à un joueur pour modifier son palmarès.",
      }, { quoted: m });
    }

    const [champ, valeurBrute] = args;
    if (!champ || !valeurBrute) {
      return riza.sendMessage(m.chat, {
        text: `❌ Syntaxe incorrecte.\nExemple : *.modifpalmares @user victoires 5*`,
      }, { quoted: m });
    }

    const champValide = ["victoires", "defaites", "nuls"];
    if (!champValide.includes(champ.toLowerCase())) {
      return riza.sendMessage(m.chat, {
        text: `❌ Statut invalide. Choisis parmi : ${champValide.join(", ")}`,
      }, { quoted: m });
    }

    const nombre = parseInt(valeurBrute);
    if (isNaN(nombre) || nombre < 0) {
      return riza.sendMessage(m.chat, {
        text: "❌ Nombre invalide. Donne un entier positif.",
      }, { quoted: m });
    }

    const palmares = loadPalmares();
    if (!palmares[target]) {
      palmares[target] = { victoires: 0, defaites: 0, nuls: 0 };
    }

    palmares[target][champ.toLowerCase()] = nombre;
    savePalmares(palmares);

    const recap = `🎯 *Mise à jour du palmarès de @${target.split("@")[0]} !* :

🥇 Victoires : ${palmares[target].victoires}
🥈 Défaites : ${palmares[target].defaites}
🥉 Nuls     : ${palmares[target].nuls}`;

    return riza.sendMessage(m.chat, {
      text: recap,
      mentions: [target],
    }, { quoted: m });
  },
};