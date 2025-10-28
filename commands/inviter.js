const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");
const equipesPath = path.join(__dirname, "..", "data", "equipes.json");
const fichesPath = path.join(__dirname, "..", "data", "fiches.json");
const socialPath = path.join(__dirname, "..", "data", "social.json");

if (!fs.existsSync(fichesPath)) fs.writeFileSync(fichesPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(socialPath)) fs.writeFileSync(socialPath, JSON.stringify({}, null, 2));

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

// Fonction pour obtenir l'équipe d'un joueur (avec rétrocompatibilité)
function getEquipeDuJoueur(socials, joueur) {
  const fiche = socials[joueur];
  if (!fiche) return null;
  return fiche.equipe || fiche.guilde || null;
}

module.exports = {
  name: "inviter",
  category: "UNIROLIST",
  description: "Invite un joueur à rejoindre une équipe (avec validation)", // Description mise à jour
  allowPrivate: false,

  async execute(riza, m, args) {
    const sender = m.sender;
    const chat = m.chat;
    const groupMetadata = await riza.groupMetadata(chat);
    const admins = groupMetadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
    const isAdmin = admins.some(p => p.id === sender);

    // Charger les données
    const fiches = JSON.parse(fs.readFileSync(fichesPath));
    const socials = JSON.parse(fs.readFileSync(socialPath));

    // Vérifier si l'invitant a une fiche
    if (!fiches[sender] || !socials[sender]) {
      return riza.sendMessage(chat, {
        text: "❌ Vous devez avoir une fiche RP et sociale complète pour inviter quelqu'un.",
      }, { quoted: m });
    }

    // Identifier la cible mentionnée ou répondue
    const context = m.message?.extendedTextMessage?.contextInfo;
    const mention =
      context?.participant ||
      context?.remoteJid ||
      (m.mentionedJid && m.mentionedJid[0]);

    if (!mention) {
      return riza.sendMessage(chat, {
        text: "❌ Mentionne ou réponds au joueur que tu veux inviter.",
      }, { quoted: m });
    }

    const target = mention;

    // Vérifier si la cible a une fiche
    if (!fiches[target] || !socials[target]) {
      return riza.sendMessage(chat, {
        text: "❌ Ce joueur n'a pas de fiche RP et sociale complète. Il doit d'abord s'enregistrer.",
        mentions: [target]
      }, { quoted: m });
    }

    // Vérifier si la cible a déjà une équipe (avec rétrocompatibilité)
    const equipeCible = getEquipeDuJoueur(socials, target);
    if (equipeCible) {
      return riza.sendMessage(chat, {
        text: `❌ Ce joueur fait déjà partie de l'équipe *${equipeCible}*.`, // Message mis à jour
        mentions: [target]
      }, { quoted: m });
    }

    // Charger les équipes
    const equipes = getEquipesData(); // Utilise la fonction de rétrocompatibilité
    const equipe = Object.values(equipes).find(e => e.membres.includes(sender)); // Renommé de guilde à equipe
    const idEquipe = Object.keys(equipes).find(id => equipes[id] === equipe); // Renommé de idGuilde à idEquipe

    if (!equipe) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne fais partie d'aucune équipe.", // Message mis à jour
      }, { quoted: m });
    }

    const estChef = equipe.chef === sender; // Renommé de guilde à equipe
    if (!estChef && !isAdmin) {
      return riza.sendMessage(chat, {
        text: "❌ Seuls le chef ou un admin peuvent inviter des membres.", // Message gardé car pertinent
      }, { quoted: m });
    }

    // Si admin : ajout direct
    if (isAdmin) {
      if (equipe.membres.includes(target)) { // Renommé de guilde à equipe
        return riza.sendMessage(chat, {
          text: "ℹ️ Ce joueur est déjà dans l'équipe.", // Message mis à jour
        }, { quoted: m });
      }

      equipe.membres.push(target); // Renommé de guilde à equipe
      fs.writeFileSync(equipesPath, JSON.stringify(equipes, null, 2));

      // Mettre à jour la fiche sociale (priorité au nouveau champ "equipe")
      socials[target].equipe = equipe.nom; // Utilise le nouveau champ "equipe"
      // Garder l'ancien champ "guilde" pour la rétrocompatibilité si nécessaire
      if (!socials[target].guilde) {
        socials[target].guilde = equipe.nom;
      }
      fs.writeFileSync(socialPath, JSON.stringify(socials, null, 2));

      return riza.sendMessage(chat, {
        text: `✅ @${target.split("@")[0]} a été ajouté directement à l'équipe *${equipe.nom}*.`, // Message mis à jour
        mentions: [target]
      }, { quoted: m });
    }

    // Si chef, on propose à la cible
    await riza.sendMessage(chat, {
      text: `📨 @${target.split("@")[0]}, tu as été invité à rejoindre l'équipe *${equipe.nom}* par ton chef @${sender.split("@")[0]}.\n\nTape *accepter* ou *refuser*.`, // Message mis à jour
      mentions: [target, sender]
    }, { quoted: m });

    // 1️⃣ Attente réponse de la cible
    const waitForResponse = async () => {
      let validationAsked = false;
      let validationTimeout;

      const listener = async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        const from = msg.key.participant || msg.key.remoteJid;
        if (from !== target) return;

        const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const decision = content.trim().toLowerCase();

        if (!["accepter", "refuser"].includes(decision)) return;

        riza.ev.off("messages.upsert", listener);

        if (decision === "refuser") {
          return riza.sendMessage(chat, {
            text: `❌ @${target.split("@")[0]} a refusé de rejoindre l'équipe *${equipe.nom}*.`, // Message mis à jour
            mentions: [target]
          }, { quoted: msg });
        }

        // 2️⃣ Accepté → attente d'un admin
        validationAsked = true;
        const recap = `📋 *VALIDATION D'INVITATION*
━━━━━━━━━━━━━━━━━━
• Équipe : ${equipe.nom}"
• Chef : @${sender.split("@")[0]}
• Cible : @${target.split("@")[0]}

✍️ L'un des admins peut taper *valider* ou *refuser*.
━━━━━━━━━━━━━━━━━━`;

        const recapMessage = await riza.sendMessage(chat, {
          text: recap,
          mentions: [target, ...admins.map(a => a.id)]
        }, { quoted: msg });

        const adminValidation = async ({ messages }) => {
          if (!validationAsked) return;

          const msg2 = messages[0];
          if (!msg2.message) return;
          const from2 = msg2.key.participant || msg2.key.remoteJid;
          if (!admins.some(a => a.id === from2)) return;

          const contextInfo = msg2.message?.extendedTextMessage?.contextInfo;
          if (!contextInfo || contextInfo.stanzaId !== recapMessage.key.id) {
            return;
          }

          const content2 = msg2.message.conversation || msg2.message.extendedTextMessage?.text || "";
          const finalDecision = content2.trim().toLowerCase();

          if (!["valider", "refuser"].includes(finalDecision)) {
            await riza.sendMessage(chat, {
              text: "❌ Réponse invalide. Veuillez taper *valider* ou *refuser* en répondant au message de recap.",
              mentions: [from2]
            });
            return;
          }

          clearTimeout(validationTimeout);
          riza.ev.off("messages.upsert", adminValidation);
          validationAsked = false;

          if (finalDecision === "refuser") {
            return riza.sendMessage(chat, {
              text: `❌ Un administrateur a refusé l'ajout de @${target.split("@")[0]} dans l'équipe.`, // Message mis à jour
              mentions: [target]
            }, { quoted: msg2 });
          }

          // Vérifier une dernière fois avant l'ajout
          const equipesCheck = getEquipesData(); // Utilise la fonction de rétrocompatibilité
          const socialsCheck = JSON.parse(fs.readFileSync(socialPath));
          const equipeCheck = Object.values(equipesCheck).find(e => e.membres.includes(sender)); // Renommé de guildeCheck à equipeCheck

          if (!equipeCheck) {
            return riza.sendMessage(chat, {
              text: "❌ L'équipe n'existe plus ou vous n'en faites plus partie.", // Message mis à jour
            }, { quoted: msg2 });
          }

          if (equipeCheck.membres.includes(target)) { // Renommé de guildeCheck à equipeCheck
            return riza.sendMessage(chat, {
              text: "ℹ️ Ce joueur est déjà dans l'équipe.", // Message mis à jour
            }, { quoted: msg2 });
          }

          const equipeCibleCheck = getEquipeDuJoueur(socialsCheck, target);
          if (equipeCibleCheck) {
            return riza.sendMessage(chat, {
              text: `❌ Ce joueur fait déjà partie d'une autre équipe : ${equipeCibleCheck}`, // Message mis à jour
              mentions: [target]
            }, { quoted: msg2 });
          }

          // Ajouter le membre
          equipeCheck.membres.push(target); // Renommé de guildeCheck à equipeCheck
          fs.writeFileSync(equipesPath, JSON.stringify(equipesCheck, null, 2));

          // Mettre à jour la fiche sociale (priorité au nouveau champ "equipe")
          socialsCheck[target].equipe = equipeCheck.nom; // Utilise le nouveau champ "equipe"
          // Garder l'ancien champ "guilde" pour la rétrocompatibilité si nécessaire
          if (!socialsCheck[target].guilde) {
            socialsCheck[target].guilde = equipeCheck.nom;
          }
          fs.writeFileSync(socialPath, JSON.stringify(socialsCheck, null, 2));

          return riza.sendMessage(chat, {
            text: `✅ @${target.split("@")[0]} a rejoint l'équipe *${equipeCheck.nom}* avec validation admin.`, // Message mis à jour
            mentions: [target]
          }, { quoted: msg2 });
        };

        riza.ev.on("messages.upsert", adminValidation);

        // Timeout pour la validation admin
        validationTimeout = setTimeout(() => {
          if (validationAsked) {
            riza.ev.off("messages.upsert", adminValidation);
            validationAsked = false;
            riza.sendMessage(chat, {
              text: "⌛ Temps écoulé - L'invitation a été annulée car aucun admin n'a répondu à temps.",
              mentions: [sender]
            });
          }
        }, 120000);
      };

      riza.ev.on("messages.upsert", listener);
    };

    await waitForResponse();
  }
};