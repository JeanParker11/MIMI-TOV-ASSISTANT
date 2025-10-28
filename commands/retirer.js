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
  name: "retirer",
  category: "UNIROLIST",
  description: "Exclut un membre d'une équipe (avec validation si chef)", // Description mise à jour
  allowPrivate: false,

  async execute(riza, m, args) {
    const sender = m.sender;
    const chat = m.chat;
    const groupMetadata = await riza.groupMetadata(chat);
    const admins = groupMetadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
    const isAdmin = admins.some(p => p.id === sender);

    // Identifier la cible mentionnée ou répondue
    const context = m.message?.extendedTextMessage?.contextInfo;
    const mention =
      context?.participant ||
      context?.remoteJid ||
      (m.mentionedJid && m.mentionedJid[0]);

    if (!mention) {
      return riza.sendMessage(chat, {
        text: "❌ Mentionne ou réponds au joueur que tu veux retirer.",
      }, { quoted: m });
    }

    const target = mention;

    // Charger les équipes
    const equipes = getEquipesData(); // Utilise la fonction de rétrocompatibilité
    const equipe = Object.values(equipes).find(e => e.membres.includes(target)); // Renommé de guilde à equipe
    const idEquipe = Object.keys(equipes).find(id => equipes[id] === equipe); // Renommé de idGuilde à idEquipe

    if (!equipe) {
      return riza.sendMessage(chat, {
        text: "❌ Ce joueur n'appartient à aucune équipe.", // Message mis à jour
      }, { quoted: m });
    }

    const estChef = equipe.chef === sender; // Renommé de guilde à equipe
    if (!estChef && !isAdmin) {
      return riza.sendMessage(chat, {
        text: "❌ Seuls le chef d'équipe ou un admin peuvent retirer un membre.", // Message mis à jour
      }, { quoted: m });
    }

    if (target === equipe.chef) { // Renommé de guilde à equipe
      return riza.sendMessage(chat, {
        text: "❌ Tu ne peux pas retirer le chef de l'équipe.", // Message mis à jour
      }, { quoted: m });
    }

    if (isAdmin) {
      // Retrait immédiat
      equipe.membres = equipe.membres.filter(m => m !== target); // Renommé de guilde à equipe
      fs.writeFileSync(equipesPath, JSON.stringify(equipes, null, 2)); // Utilise equipesPath

      return riza.sendMessage(chat, {
        text: `✅ @${target.split("@")[0]} a été retiré de l'équipe *${equipe.nom}*.`, // Message mis à jour
        mentions: [target]
      }, { quoted: m });
    }

    // Si chef, demande de validation
    const recap = `📋 *DEMANDE DE RETRAIT*
━━━━━━━━━━━━━━━━━━
• Équipe : ${equipe.nom} // Renommé de "Guilde" à "Équipe"
• Chef : @${sender.split("@")[0]}
• Cible : @${target.split("@")[0]}

✍️ Un admin peut taper *valider* ou *refuser*.
━━━━━━━━━━━━━━━━━━`;

    await riza.sendMessage(chat, {
      text: recap,
      mentions: [sender, target, ...admins.map(a => a.id)]
    }, { quoted: m });

    const validationListener = async ({ messages }) => {
      const msg2 = messages[0];
      if (!msg2.message) return;
      const from = msg2.key.participant || msg2.key.remoteJid;
      if (!admins.some(a => a.id === from)) return;

      const content2 = msg2.message.conversation || msg2.message.extendedTextMessage?.text || "";
      const decision = content2.trim().toLowerCase();

      if (!["valider", "refuser"].includes(decision)) return;

      riza.ev.off("messages.upsert", validationListener);

      if (decision === "refuser") {
        return riza.sendMessage(chat, {
          text: `❌ Un administrateur a refusé le retrait de @${target.split("@")[0]}.`,
          mentions: [target]
        }, { quoted: msg2 });
      }

      equipe.membres = equipe.membres.filter(m => m !== target); // Renommé de guilde à equipe
      fs.writeFileSync(equipesPath, JSON.stringify(equipes, null, 2)); // Utilise equipesPath

      return riza.sendMessage(chat, {
        text: `✅ @${target.split("@")[0]} a été retiré de l'équipe *${equipe.nom}*.`, // Message mis à jour
        mentions: [target]
      }, { quoted: msg2 });
    };

    riza.ev.on("messages.upsert", validationListener);
  }
};