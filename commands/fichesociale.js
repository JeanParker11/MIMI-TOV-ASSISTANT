const fs = require("fs");
const path = require("path");

const socialPath = path.join(__dirname, "..", "data", "social.json");

if (!fs.existsSync(socialPath)) {
  fs.writeFileSync(socialPath, JSON.stringify({}, null, 2));
}

module.exports = {
  name: "fichesociale",
  category: "UNIROLIST",
  description: "Affiche la fiche sociale d’un joueur",
  allowedForAll: true,

  async execute(riza, m, args) {
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const mention = contextInfo?.mentionedJid?.[0];
    const target = mention || m.sender;

    const socials = JSON.parse(fs.readFileSync(socialPath));
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
      equipe,
      coequipiers,
      reputation
    } = fiche;

    const msg = `📖 *Fiche d'État Social*
═══════
👤 *Nom* : ${nom}
🏳️ *Faction* : ${faction}
🏷️ *Surnom/Titre* : ${surnom || "(aucun)"}
🛡️ *Grade* : ${grade || "Aventurier"}
🎖️ *Titre honorifique* : ${titre_honorifique || "(aucun)"}
🤝 *Équipe* : ${equipe || "(aucune)"}
👥 *Coéquipiers* : ${coequipiers.length ? coequipiers.join(", ") : "(aucun)"}
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