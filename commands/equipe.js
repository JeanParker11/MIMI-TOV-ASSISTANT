const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");
const equipesPath = path.join(__dirname, "..", "data", "equipes.json");

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
  // Migrer d'abord si nécessaire
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

module.exports = {
  name: "equipe", // Renommé de "guilde" à "equipe"
  category: "UNIROLIST",
  description: "Affiche les informations de ton équipe (ou celle d'un autre joueur)", // Description mise à jour

  async execute(riza, m, args) {
    const equipes = getEquipesData(); // Utilise la fonction de rétrocompatibilité

    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const mention =
      contextInfo?.participant ||
      contextInfo?.remoteJid ||
      (m.mentionedJid && m.mentionedJid[0]);

    const user = mention || m.sender;

    const equipe = Object.values(equipes).find(e => e.membres.includes(user)); // Renommé de guilde à equipe

    if (!equipe) {
      return riza.sendMessage(m.chat, {
        text: mention
          ? `❌ Ce joueur ne fait partie d'aucune équipe.` // Message mis à jour
          : `❌ Tu ne fais partie d'aucune équipe.`, // Message mis à jour
      }, { quoted: m });
    }

    const estChef = equipe.chef === user; // Renommé de guilde à equipe

    const texte = `👥 *ÉQUIPE : ${equipe.nom}*"
═══════════════
📜 *Description* : ${equipe.description || "Non fournie"}
🪧 *Devise/Emblème* : ${equipe.embleme || "Aucun"}
👑 *Chef d'équipe* : @${equipe.chef.split("@")[0]}"
👥 *Membres* (${equipe.membres.length}) :
${equipe.membres.map(m => `• @${m.split("@")[0]}`).join("\n")}

${estChef ? "🛡️ Tu es le chef de cette équipe." : ""}
═══════════════`;

    await riza.sendMessage(m.chat, {
      text: texte,
      mentions: equipe.membres, // Renommé de guilde à equipe
    }, { quoted: m });
  }
};