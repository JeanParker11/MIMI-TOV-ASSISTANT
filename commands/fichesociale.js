const fs = require("fs");
const path = require("path");

const socialPath = path.join(__dirname, "..", "data", "social.json");
const guildesPath = path.join(__dirname, "..", "data", "guildes.json");
const equipesPath = path.join(__dirname, "..", "data", "equipes.json");

if (!fs.existsSync(socialPath)) {
  fs.writeFileSync(socialPath, JSON.stringify({}, null, 2));
}

// Fonction pour migrer les données de guildes vers equipes
function migrerGuildesVersEquipes() {
  if (fs.existsSync(guildesPath) && !fs.existsSync(equipesPath)) {
    const guildesData = JSON.parse(fs.readFileSync(guildesPath));
    fs.writeFileSync(equipesPath, JSON.stringify(guildesData, null, 2));
    console.log("✅ Migration des guildes vers equipes effectuée");
  }
}

// Fonction pour obtenir les données d'équipes (avec rétrocompatibilité)
function getEquipesData() {
  migrerGuildesVersEquipes();
  
  if (fs.existsSync(equipesPath)) {
    return JSON.parse(fs.readFileSync(equipesPath));
  } else if (fs.existsSync(guildesPath)) {
    return JSON.parse(fs.readFileSync(guildesPath));
  } else {
    fs.writeFileSync(equipesPath, JSON.stringify({}, null, 2));
    return {};
  }
}

// Fonction pour obtenir l'équipe d'un joueur (avec rétrocompatibilité)
function getEquipeDuJoueur(fiche) {
  return fiche.equipe || fiche.guilde || null;
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
    const equipes = getEquipesData();
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
      coequipiers,
      reputation
    } = fiche;

    // Obtenir l'équipe avec rétrocompatibilité
    const equipe = getEquipeDuJoueur(fiche);

    // Vérifier si le joueur est chef d'équipe
    let statutEquipe = "";
    if (equipe) {
      const equipeInfo = Object.values(equipes).find(e => e.nom === equipe);
      if (equipeInfo && equipeInfo.chef === target) {
        statutEquipe = " (Chef)";
      }
    }

    const msg = `📖 *Fiche d'État Social*
═════════════════
👤 *Nom* : ${nom}
🏳️ *Faction* : ${faction}
🏷️ *Surnom/Titre* : ${surnom || "(aucun)"}
🛡️ *Grade* : ${grade || "Aventurier"}
🎖️ *Titre honorifique* : ${titre_honorifique || "(aucun)"}
👥 *Équipe* : ${equipe ? `${equipe}${statutEquipe}` : "(aucune)"}
👥 *Coéquipiers* : ${coequipiers?.length ? coequipiers.join(", ") : "(aucun)"}
═════════════════
📊 *Réputation* :
👥 Civils : ${reputation?.peuple ?? 0}%
🏛️ Autorités : ${reputation?.autorites ?? 0}%
═════════════════`;

    await riza.sendMessage(m.chat, {
      text: msg,
      mentions: [target],
    }, { quoted: m });
  }
};