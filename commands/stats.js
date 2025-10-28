const fs = require("fs");
const path = require("path");

const FICHES_PATH = path.join(__dirname, "../data/fiches.json");

function loadFiches() {
  return JSON.parse(fs.readFileSync(FICHES_PATH));
}

// Fonction pour obtenir les vitesses par faction
function getVitesseFaction(faction) {
  const vitesses = {
    "hermes": "9m/s - 0.2s",
    "hermès": "9m/s - 0.2s",
    "arès": "08 m/s - 0.3s", 
    "ares": "08 m/s - 0.3s",
    "atlas": "07 m/s - 0.4s",
    "hécates": "07 m/s - 0.4s"
  };
  
  return vitesses[faction.toLowerCase()] || "Vitesse non définie";
}

// Fonction pour rechercher un joueur par pseudo
function trouverJoueurParPseudo(fiches, pseudoRecherche) {
  return Object.entries(fiches).find(([jid, fiche]) => {
    const pseudo = fiche.pseudo || "";
    return pseudo.toLowerCase().includes(pseudoRecherche.toLowerCase());
  });
}

module.exports = {
  name: "stats",
  category: "UNIROLIST", 
  description: "Affiche les statistiques combinées des joueurs par pseudo",
  onlyAdmin: true,

  async execute(riza, m, args) {
    if (args.length === 0) {
      return riza.sendMessage(m.chat, {
        text: "❌ *UTILISATION*\n\nUtilisez la commande avec les pseudos des joueurs :\n`!stats Regulus Lone DEVIL`\n\n*Exemple :* `!stats Regulus de Valor Lone Tecraso`"
      }, { quoted: m });
    }

    const fiches = loadFiches();
    
    let statsText = `⚡ *𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗤𝗨𝗘𝗦* ⚡\n════════════════\n\n`;

    // Rechercher chaque joueur par pseudo
    for (const pseudoRecherche of args) {
      const joueurTrouve = trouverJoueurParPseudo(fiches, pseudoRecherche);
      
      if (!joueurTrouve) {
        statsText += `❌ *Joueur non trouvé:* ${pseudoRecherche}\n\n`;
        continue;
      }

      const [jid, fiche] = joueurTrouve;
      const faction = fiche.faction || "Non définie";
      const vitesse = getVitesseFaction(faction);
      const pseudo = fiche.pseudo || "Sans pseudo";
      const stats = fiche.stats || { force: 0, esprit: 0, pouvoir: 0 };
      
      statsText += `*𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗾𝘂𝗲𝘀* (${pseudo})\n`;
      statsText += `${faction.charAt(0).toUpperCase() + faction.slice(1)} (${vitesse})\n`;
      statsText += `═══════════\n`;
      statsText += `👊🏼• 𝗙𝗼𝗿𝗰𝗲 : ${stats.force || 0}\n`;
      statsText += `🧠• 𝗘𝘀𝗽𝗿𝗶𝘁 : ${stats.esprit || 0}\n`;
      statsText += `🌀• 𝗣𝗼𝘂𝘃𝗼𝗶𝗿 : ${stats.pouvoir || 0}\n\n`;
    }

    await riza.sendMessage(m.chat, { 
      text: statsText 
    }, { quoted: m });
  }
};