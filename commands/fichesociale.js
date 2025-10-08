const fs = require("fs");
const path = require("path");

const socialPath = path.join(__dirname, "..", "data", "social.json");
const guildesPath = path.join(__dirname, "..", "data", "guildes.json");

if (!fs.existsSync(socialPath)) {
  fs.writeFileSync(socialPath, JSON.stringify({}, null, 2));
}
if (!fs.existsSync(guildesPath)) {
  fs.writeFileSync(guildesPath, JSON.stringify({}, null, 2));
}

module.exports = {
  name: "fichesociale",
  category: "UNIROLIST",
  description: "Affiche la fiche sociale d'un joueur",
  allowedForAll: true,

  async execute(riza, m, args) {
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const mention = contextInfo?.mentionedJid?.[0];
    const target = mention || m.sender;

    const socials = JSON.parse(fs.readFileSync(socialPath));
    const guildes = JSON.parse(fs.readFileSync(guildesPath));
    const fiche = socials[target];

    if (!fiche) {
      return riza.sendMessage(m.chat, {
        text: `❌ Aucune fiche sociale trouvée pour ce joueur.`,
      }, { quoted: m });
    }

    const {
      nom,
      faction,
      surnom,
      grade,
      titre_honorifique,
      guilde,
      coequipiers,
      reputation
    } = fiche;

    // Vérifier si le joueur est chef de guilde
    let statutGuilde = "";
    if (guilde) {
      const guildeInfo = Object.values(guildes).find(g => g.nom === guilde);
      if (guildeInfo && guildeInfo.chef === target) {
        statutGuilde = " (Chef)";
      }
    }

    const msg = `📖 *Fiche d'État Social*
═══════
👤 *Nom* : ${nom}
🏳️ *Faction* : ${faction}
🏷️ *Surnom/Titre* : ${surnom || "(aucun)"}
🛡️ *Grade* : ${grade || "Aventurier"}
🎖️ *Titre honorifique* : ${titre_honorifique || "(aucun)"}
🏰 *Guilde* : ${guilde ? `${guilde}${statutGuilde}` : "(aucune)"}
👥 *Coéquipiers* : ${coequipiers?.length ? coequipiers.join(", ") : "(aucun)"}
═══════
📊 *Réputation* :
👥 Civils : ${reputation?.peuple ?? 0}%
🏛️ Autorités : ${reputation?.autorites ?? 0}%
═══════`;

    await riza.sendMessage(m.chat, {
      text: msg,
      mentions: [target],
    }, { quoted: m });
  }
};