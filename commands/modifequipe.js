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
  name: "modifequipe", // Renommé de "modifguilde" à "modifequipe"
  category: "UNIROLIST",
  description: "Propose une modification du nom, de la description ou de l'emblème de l'équipe.", // Description mise à jour
  allowPrivate: false,

  async execute(riza, m, args) {
    const sender = m.sender;
    const chat = m.chat;
    const isGroup = chat.endsWith("@g.us");

    if (!isGroup) {
      return riza.sendMessage(chat, {
        text: "❌ Cette commande ne peut être utilisée qu'en groupe UNIROLIST.",
      }, { quoted: m });
    }

    const groupMetadata = await riza.groupMetadata(chat);
    const admins = groupMetadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
    const isAdmin = admins.some(p => p.id === sender);

    let equipes = {};
    try {
      equipes = getEquipesData(); // Utilise la fonction de rétrocompatibilité
    } catch (e) {
      return riza.sendMessage(chat, {
        text: "❌ Impossible de lire les données d'équipe.", // Message mis à jour
      }, { quoted: m });
    }

    const equipe = Object.values(equipes).find(e => Array.isArray(e.membres) && e.membres.includes(sender)); // Renommé de guilde à equipe
    if (!equipe) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne fais partie d'aucune équipe.", // Message mis à jour
      }, { quoted: m });
    }

    const estChef = equipe.chef === sender; // Renommé de guilde à equipe
    if (!estChef && !isAdmin) {
      return riza.sendMessage(chat, {
        text: "❌ Seuls le chef d'équipe ou un administrateur peuvent modifier une équipe.", // Message mis à jour
      }, { quoted: m });
    }

    const [champ, ...valeurArr] = args;
    const valeur = valeurArr.join(" ").trim();

    if (!champ || !valeur || !["nom", "description", "embleme"].includes(champ)) {
      return riza.sendMessage(chat, {
        text: "❌ Utilisation : `.modifequipe nom|description|embleme nouvelle_valeur`", // Message mis à jour
      }, { quoted: m });
    }

    const idEquipe = Object.keys(equipes).find(id => equipes[id] === equipe); // Renommé de idGuilde à idEquipe

    if (isAdmin) {
      equipe[champ] = valeur; // Renommé de guilde à equipe
      fs.writeFileSync(equipesPath, JSON.stringify(equipes, null, 2)); // Utilise equipesPath
      return riza.sendMessage(chat, {
        text: `✅ Champ *${champ}* modifié immédiatement par un administrateur.`,
      }, { quoted: m });
    }

    // Si chef, nécessite validation par un admin
    const recap = `📋 *MODIFICATION D'ÉQUIPE À VALIDER* // Renommé
━━━━━━━━━━━━━━━━━━
👥 *Équipe* : ${equipe.nom}"
👑 *Chef* : @${equipe.chef.split("@")[0]} // Reste chef
✍️ *Proposé par* : @${sender.split("@")[0]}

🔁 *Changement demandé* :
• Champ : ${champ}
• Ancien : ${equipe[champ] || "(vide)"} // Renommé de guilde à equipe
• Nouveau : ${valeur}

✅ Tape *valider* pour accepter ou *refuser* pour annuler.
━━━━━━━━━━━━━━━━━━`;

    await riza.sendMessage(chat, {
      text: recap,
      mentions: [sender, ...admins.map(a => a.id)]
    }, { quoted: m });

    const validationListener = async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message) return;

      const from = msg.key.participant || msg.key.remoteJid;
      if (!admins.some(a => a.id === from)) return;

      const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const decision = content.trim().toLowerCase();

      if (!["valider", "refuser"].includes(decision)) return;

      riza.ev.off("messages.upsert", validationListener);

      if (decision === "valider") {
        equipe[champ] = valeur; // Renommé de guilde à equipe
        fs.writeFileSync(equipesPath, JSON.stringify(equipes, null, 2)); // Utilise equipesPath
        await riza.sendMessage(chat, {
          text: `✅ Modification validée : *${champ}* mis à jour.`,
          mentions: [equipe.chef] // Renommé de guilde.chef à equipe.chef
        }, { quoted: msg });
      } else {
        await riza.sendMessage(chat, {
          text: `❌ Modification annulée par un administrateur.`,
          mentions: [equipe.chef] // Renommé de guilde.chef à equipe.chef
        }, { quoted: msg });
      }
    };

    riza.ev.on("messages.upsert", validationListener);
  }
};