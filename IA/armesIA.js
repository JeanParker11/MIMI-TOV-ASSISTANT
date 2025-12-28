const fs = require('fs');
const path = require('path');
const { verifierEquipement, getArmesDisponibles, calculerStatsArme } = require('../lib/equipementManager');

const FICHES_PATH = path.join(__dirname, '../data/fiches.json');
const SOCIAL_PATH = path.join(__dirname, '../data/social.json');
const ARMES_PATH = path.join(__dirname, '../data/armes.json');

/**
 * Module IA de gestion des armes
 * Surveille les questions et commandes liées aux armes
 * @param {Object} conn - Instance WhatsApp
 * @param {Object} m - Message reçu
 * @param {string} messageType - Type de message
 */
async function armesIA(conn, m, messageType) {
  try {
    // Ne traiter que les messages texte
    if (!['conversation', 'extendedTextMessage'].includes(messageType)) {
      return;
    }

    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    if (!text || text.trim().length < 5) return;

    const lowerText = text.toLowerCase();
    const sender = m.sender;

    // Ignorer si c'est une commande (commence par ! ou .)
    if (text.trim().match(/^[!.]/)) return;

    // Détection de questions sur les armes disponibles
    const questionsArmesDisponibles = [
      /quelles? armes? (puis-je|je peux|peut-on|disponible)/i,
      /armes? de ma faction/i,
      /liste (des |d')?armes?/i,
      /armes? pour (hermès|hermes|ares|arès|hecate|hécate|atlas)/i,
      /armes? compatible/i
    ];

    const estQuestionArmes = questionsArmesDisponibles.some(re => re.test(text));

    if (estQuestionArmes) {
      const fiches = JSON.parse(fs.readFileSync(FICHES_PATH, 'utf-8'));
      const socials = JSON.parse(fs.readFileSync(SOCIAL_PATH, 'utf-8'));

      if (!fiches[sender] || !socials[sender]) {
        await conn.sendMessage(m.chat, {
          text: "⚠️ **SYSTÈME D'ARMES**\n\nTu dois avoir une fiche enregistrée pour consulter les armes.\n\nUtilise `!fiche` pour vérifier."
        }, { quoted: m });
        return;
      }

      const faction = socials[sender].faction;
      const armesDisponibles = getArmesDisponibles(faction);

      if (armesDisponibles.length === 0) {
        await conn.sendMessage(m.chat, {
          text: `⚔️ **ARMES DISPONIBLES**\n\n` +
                `❌ Aucune arme n'est actuellement disponible pour ta faction (${faction}).\n\n` +
                `Contacte un administrateur pour ajouter des armes à l'arsenal.`
        }, { quoted: m });
        return;
      }

      // Grouper par type
      const parType = {};
      for (const arme of armesDisponibles) {
        if (!parType[arme.type]) parType[arme.type] = [];
        parType[arme.type].push(arme);
      }

      let message = `⚔️ **ARMES DISPONIBLES**\n`;
      message += `🏛️ Faction : ${faction}\n\n`;

      for (const [type, armes] of Object.entries(parType)) {
        message += `━━━ ${type.toUpperCase()} ━━━\n`;
        for (const arme of armes.slice(0, 5)) { // Limiter à 5 par type
          const dispo = arme.inventaire ? `(${arme.inventaire.actuel} dispo)` : '';
          message += `• **${arme.nom}** [${arme.stats.grade}] ${dispo}\n`;
          message += `  └ Rs: ${arme.resistance} | Pén: ${arme.stats.penetrationArmure}%\n`;
        }
        message += `\n`;
      }

      message += `💡 Utilise \`!boutique\` pour acheter des armes.`;

      await conn.sendMessage(m.chat, {
        text: message
      }, { quoted: m });

      return;
    }

    // Détection de questions sur les statistiques d'armes
    const questionsStatsArmes = [
      /c'est quoi (le |la )?grade (des |d')?armes?/i,
      /(comment|que) fonctionne (la |les )?pénétration/i,
      /pénétration d'armure/i,
      /résistance (des |d')?armes?/i,
      /différence entre grade/i
    ];

    const estQuestionStats = questionsStatsArmes.some(re => re.test(text));

    if (estQuestionStats) {
      await conn.sendMessage(m.chat, {
        text: `📊 **SYSTÈME DE GRADES D'ARMES**\n\n` +
              `Les armes sont classées par grade selon leur résistance (Rs) :\n\n` +
              `🔸 **Grade E** [1-5 Rs]\n` +
              `   └ Pénétration : 10%\n\n` +
              `🔹 **Grade D** [6-15 Rs]\n` +
              `   └ Pénétration : 25%\n\n` +
              `🟦 **Grade C** [16-25 Rs]\n` +
              `   └ Pénétration : 40%\n\n` +
              `🟪 **Grade B** [26-35 Rs]\n` +
              `   └ Pénétration : 60%\n\n` +
              `🟥 **Grade A** [36-45 Rs]\n` +
              `   └ Pénétration : 80%\n\n` +
              `⭐ **Grade S** [46-100 Rs]\n` +
              `   └ Pénétration : 100%\n\n` +
              `💡 **Pénétration d'Armure :**\n` +
              `Ce pourcentage indique quelle part de la résistance de la zone ciblée est ignorée.\n\n` +
              `Exemple : Une épée Grade B (60%) contre une zone de 20 Rs → Rs effective = 8 Rs`
      }, { quoted: m });

      return;
    }

    // Détection de questions sur les types d'armes
    const questionsTypesArmes = [
      /différence entre (contondant|tranchant|perforant)/i,
      /(c'est quoi|qu'est-ce qu'une) arme (contondante|tranchante|perforante)/i,
      /types? d'armes?/i,
      /(épée|masse|lance|hache|dague) (c'est|est) (quel|quoi)/i
    ];

    const estQuestionTypes = questionsTypesArmes.some(re => re.test(text));

    if (estQuestionTypes) {
      await conn.sendMessage(m.chat, {
        text: `⚔️ **TYPES D'ARMES**\n\n` +
              `🔨 **CONTONDANTES** (Masses, Marteaux)\n` +
              `• Effet "Écrasement" : +20% dégâts\n` +
              `• Spécialité : Projections et étourdissements\n\n` +
              `🗡️ **TRANCHANTES** (Épées, Haches)\n` +
              `• Pénétration d'armure selon le grade\n` +
              `• Effet "Saignement" : -5% PV max/tour\n` +
              `• Effet "Hémorragie" : après 3 saignements\n\n` +
              `🏹 **PERFORANTES** (Lances, Dagues, Projectiles)\n` +
              `• Condition : Force > 10% Rs de la zone\n` +
              `• Peut ricocher, se planter ou se briser\n` +
              `• Perforation = coup critique\n\n` +
              `💡 Chaque type a ses avantages selon la situation !`
      }, { quoted: m });

      return;
    }

    // Détection de questions sur l'équipement
    const questionsEquipement = [
      /comment (équiper|mettre) une arme/i,
      /équiper (une |mon )?arme/i,
      /changer (d'|de )arme/i,
      /retirer (une |mon )?arme/i
    ];

    const estQuestionEquipement = questionsEquipement.some(re => re.test(text));

    if (estQuestionEquipement) {
      await conn.sendMessage(m.chat, {
        text: `🎒 **GESTION D'ÉQUIPEMENT**\n\n` +
              `📌 **Équiper une arme :**\n` +
              `Utilise la commande \`!equiper [nom_arme]\`\n` +
              `Tu as 3 emplacements pour les armes.\n\n` +
              `📌 **Retirer une arme :**\n` +
              `Utilise \`!retirer [numéro_emplacement]\`\n\n` +
              `📌 **Voir ton équipement :**\n` +
              `Utilise \`!fiche\` pour voir tes armes actuelles.\n\n` +
              `⚠️ **Important :**\n` +
              `• Certaines armes sont réservées à des factions\n` +
              `• Les armes ont un stock limité\n` +
              `• Tu dois acheter les armes à la boutique d'abord`
      }, { quoted: m });

      return;
    }

  } catch (error) {
    console.error("❌ Erreur armesIA:", error.message);
  }
}

module.exports = { armesIA };
