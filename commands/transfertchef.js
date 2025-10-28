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
  name: "transfertchef",
  category: "UNIROLIST",
  description: "Transfère le rôle de chef d'équipe à un autre membre (validation requise)", // Description mise à jour
  allowPrivate: false,

  async execute(riza, m, args) {
    const sender = m.sender;
    const chat = m.chat;

    const groupMetadata = await riza.groupMetadata(chat);
    const admins = groupMetadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");

    const isAdmin = admins.some(p => p.id === sender);

    const context = m.message?.extendedTextMessage?.contextInfo;
    const mention =
      context?.participant ||
      context?.remoteJid ||
      (m.mentionedJid && m.mentionedJid[0]);

    if (!mention) {
      return riza.sendMessage(chat, {
        text: "❌ Mentionne le membre à qui tu veux transférer le rôle de chef.", // Message gardé car pertinent
      }, { quoted: m });
    }

    const target = mention;

    const equipes = getEquipesData(); // Utilise la fonction de rétrocompatibilité
    const equipe = Object.values(equipes).find(e => e.membres.includes(sender)); // Renommé de guilde à equipe
    const idEquipe = Object.keys(equipes).find(id => equipes[id] === equipe); // Renommé de idGuilde à idEquipe

    if (!equipe) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne fais partie d'aucune équipe.", // Message mis à jour
      }, { quoted: m });
    }

    if (equipe.chef !== sender) { // Renommé de guilde à equipe
      return riza.sendMessage(chat, {
        text: "❌ Seul le chef d'équipe peut transférer son rôle.", // Message mis à jour
      }, { quoted: m });
    }

    if (!equipe.membres.includes(target)) { // Renommé de guilde à equipe
      return riza.sendMessage(chat, {
        text: "❌ Le joueur mentionné ne fait pas partie de ton équipe.", // Message mis à jour
      }, { quoted: m });
    }

    if (target === sender) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne peux pas te transférer le rôle à toi-même.",
      }, { quoted: m });
    }

    const confirmationText = `📋 *TRANSFERT DE CHEF*
━━━━━━━━━━━━━━━━
👑 Équipe : *${equipe.nom}*"
🧑 Ancien chef : @${sender.split("@")[0]}
🎯 Nouveau chef proposé : @${target.split("@")[0]}

Un administrateur doit *valider* ou *refuser* ce transfert.
━━━━━━━━━━━━━━━━`;

    await riza.sendMessage(chat, {
      text: confirmationText,
      mentions: [sender, target, ...admins.map(a => a.id)]
    }, { quoted: m });

    // Écoute de la validation admin
    const validationListener = async ({ messages }) => {
      const msg2 = messages[0];
      if (!msg2.message) return;

      const from = msg2.key.participant || msg2.key.remoteJid;
      if (!admins.some(a => a.id === from)) return;

      const content = msg2.message.conversation || msg2.message.extendedTextMessage?.text || "";
      const decision = content.trim().toLowerCase();

      if (!["valider", "refuser"].includes(decision)) return;

      riza.ev.off("messages.upsert", validationListener);

      if (decision === "refuser") {
        return riza.sendMessage(chat, {
          text: `❌ Un administrateur a refusé le transfert de chef.`,
        }, { quoted: msg2 });
      }

      // Transfert accepté
      equipe.chef = target; // Renommé de guilde à equipe
      fs.writeFileSync(equipesPath, JSON.stringify(equipes, null, 2)); // Utilise equipesPath

      return riza.sendMessage(chat, {
        text: `✅ Le rôle de chef d'équipe a été transféré à @${target.split("@")[0]}.`, // Message mis à jour
        mentions: [target]
      }, { quoted: msg2 });
    };

    riza.ev.on("messages.upsert", validationListener);
  }
};