module.exports = {
  name: "modifier",
  category: "UNIROLIST",
  description: "Modifie la fiche d'un joueur existant",
  onlyAdmin: true,

  async execute(riza, m, args) {
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const rawTarget = contextInfo?.participant || contextInfo?.remoteJid || (m.mentionedJid && m.mentionedJid[0]);

    if (!rawTarget) {
      return riza.sendMessage(m.chat, {
        text: "❌ Répondez au joueur ou mentionnez-le pour modifier sa fiche."
      }, { quoted: m });
    }

    const target = rawTarget;
    const fiches = JSON.parse(fs.readFileSync(fichesPath));
    
    if (!fiches[target]) {
      return riza.sendMessage(m.chat, {
        text: "❌ Ce joueur n'a pas de fiche existante. Utilisez 'enregistrer' pour créer une nouvelle fiche."
      }, { quoted: m });
    }

    // Menu interactif des modifications possibles
    const modificationOptions = `
📝 *MENU MODIFICATION* - Que souhaitez-vous modifier ?

1. Pseudo
2. Faction
3. Corps de combat
4. Sorts
5. Stats
6. Tout réinitialiser

Répondez avec le numéro correspondant ou "annuler" pour quitter.`;

    await riza.sendMessage(m.chat, {
      text: modificationOptions,
      mentions: [m.sender]
    }, { quoted: m });

    // Écoute de la réponse
    const choiceListener = async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message || msg.key.remoteJid !== m.chat) return;

      const from = msg.key.participant || msg.key.remoteJid;
      if (from !== m.sender) return;

      const choice = msg.message.conversation?.toLowerCase()?.trim();
      
      riza.ev.off("messages.upsert", choiceListener);

      if (choice === "annuler") {
        return riza.sendMessage(m.chat, { text: "❌ Modification annulée." }, { quoted: m });
      }

      switch(choice) {
        case "1":
          await modifyField(target, "pseudo", "Entrez le nouveau pseudo :");
          break;
        case "2":
          await modifyField(target, "faction", "Entrez la nouvelle faction :");
          break;
        case "3":
          await modifyCorps(target);
          break;
        case "4":
          await modifySorts(target);
          break;
        case "5":
          await modifyStats(target);
          break;
        case "6":
          await resetFiche(target);
          break;
        default:
          riza.sendMessage(m.chat, { text: "❌ Choix invalide. Utilisez la commande à nouveau." }, { quoted: m });
      }
    };

    riza.ev.on("messages.upsert", choiceListener);
  }
};

// Fonctions helper pour les modifications
async function modifyField(target, field, prompt) {
  // Implémentation similaire au système d'enregistrement
  // Mais ne modifie qu'un seul champ
}

async function modifyCorps(target) {
  // Logique pour modifier les corps un par un
}

async function modifySorts(target) {
  // Logique pour modifier les sorts un par un
}

async function modifyStats(target) {
  // Vérification que la somme = 150
}

async function resetFiche(target) {
  // Réinitialisation complète (garder seulement le JID)
}