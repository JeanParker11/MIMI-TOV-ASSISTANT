const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");
const equipesPath = path.join(__dirname, "..", "data", "equipes.json");
const socialPath = path.join(__dirname, "..", "data", "social.json");

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

// Fonction pour retirer l'équipe de toutes les fiches sociales des membres
function retirerEquipeDesFichesSociales(nomEquipe) {
  if (!fs.existsSync(socialPath)) return;
  
  const socials = JSON.parse(fs.readFileSync(socialPath));
  let membresAffectes = 0;
  
  // Parcourir toutes les fiches sociales
  Object.keys(socials).forEach(jid => {
    const fiche = socials[jid];
    
    // Support rétrocompatibilité guilde/equipe
    if (fiche.equipe === nomEquipe || fiche.guilde === nomEquipe) {
      // Retirer l'équipe/guilde
      delete fiche.equipe;
      delete fiche.guilde;
      
      // Optionnel : vider aussi les coéquipiers
      if (fiche.coequipiers && Array.isArray(fiche.coequipiers)) {
        fiche.coequipiers = [];
      }
      
      membresAffectes++;
    }
  });
  
  if (membresAffectes > 0) {
    fs.writeFileSync(socialPath, JSON.stringify(socials, null, 2));
    console.log(`✅ ${membresAffectes} fiches sociales mises à jour après dissolution de ${nomEquipe}`);
  }
  
  return membresAffectes;
}

module.exports = {
  name: "dissoudreéquipe",
  category: "UNIROLIST",
  description: "Dissout entièrement l'équipe (chef + admin requis)",
  allowPrivate: false,

  async execute(riza, m) {
    const sender = m.sender;
    const chat = m.chat;

    const equipes = getEquipesData();
    const equipe = Object.values(equipes).find(e => e.chef === sender);
    const idEquipe = Object.keys(equipes).find(k => equipes[k] === equipe);

    if (!equipe) {
      return riza.sendMessage(chat, {
        text: "❌ Tu n'es pas chef d'une équipe.",
      }, { quoted: m });
    }

    const groupMetadata = await riza.groupMetadata(chat);
    const admins = groupMetadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");

    await riza.sendMessage(chat, {
      text: `⚠️ Tu es sur le point de *dissoudre* l'équipe *${equipe.nom}*.\n\nCette action est irréversible et affectera tous les membres.\n\nConfirme avec *oui* ou *non*.`,
    }, { quoted: m });

    const confirmChef = async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message) return;

      const from = msg.key.participant || msg.key.remoteJid;
      if (from !== sender) return;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const response = text.trim().toLowerCase();

      if (!["oui", "non"].includes(response)) return;

      riza.ev.off("messages.upsert", confirmChef);

      if (response === "non") {
        return riza.sendMessage(chat, {
          text: "❌ Opération annulée.",
        }, { quoted: msg });
      }

      // Demande de validation à un admin
      const validationMsg = `🛑 *DISSOLUTION D'ÉQUIPE EN ATTENTE*
━━━━━━━━━━━━━━━━━━━━
👑 Chef : @${sender.split("@")[0]}
👥 Équipe : *${equipe.nom}*
👥 Membres affectés : ${equipe.membres?.length || 1}

⚠️ Un *admin du groupe* doit taper *valider* ou *refuser* pour confirmer la dissolution.
━━━━━━━━━━━━━━━━━━━━`;

      await riza.sendMessage(chat, {
        text: validationMsg,
        mentions: [sender, ...admins.map(a => a.id)]
      }, { quoted: msg });

      const adminValidation = async ({ messages }) => {
        const msg2 = messages[0];
        if (!msg2.message) return;

        const adminSender = msg2.key.participant || msg2.key.remoteJid;
        if (!admins.some(a => a.id === adminSender)) return;

        const text2 = msg2.message.conversation || msg2.message.extendedTextMessage?.text || "";
        const decision = text2.trim().toLowerCase();

        if (!["valider", "refuser"].includes(decision)) return;

        riza.ev.off("messages.upsert", adminValidation);

        if (decision === "refuser") {
          return riza.sendMessage(chat, {
            text: "❌ Un administrateur a refusé la dissolution.",
          }, { quoted: msg2 });
        }

        try {
          // 1. Retirer l'équipe de toutes les fiches sociales
          const membresAffectes = retirerEquipeDesFichesSociales(equipe.nom);
          
          // 2. Supprimer l'équipe
          delete equipes[idEquipe];
          fs.writeFileSync(equipesPath, JSON.stringify(equipes, null, 2));

          return riza.sendMessage(chat, {
            text: `✅ L'équipe *${equipe.nom}* a été dissoute.\n📝 ${membresAffectes} fiches sociales mises à jour.`,
          }, { quoted: msg2 });
          
        } catch (error) {
          console.error("Erreur lors de la dissolution:", error);
          return riza.sendMessage(chat, {
            text: "❌ Erreur lors de la dissolution de l'équipe.",
          }, { quoted: msg2 });
        }
      };

      riza.ev.on("messages.upsert", adminValidation);
    };

    riza.ev.on("messages.upsert", confirmChef);
  }
};