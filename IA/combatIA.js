const fs = require('fs');
const path = require('path');
const {
  getLimitesFaction,
  calculerResistanceZones,
  resoudreCorpsVsCorps,
  resoudreArmeContondante,
  resoudreArmeTranchante,
  resoudreArmePerforante,
  calculerDegatsPercussion,
  testEtourdissement,
  verifierEtatPeur
} = require('../lib/combatEngine');

const FICHES_PATH = path.join(__dirname, '../data/fiches.json');
const SOCIAL_PATH = path.join(__dirname, '../data/social.json');
const COMBATS_ACTIFS_PATH = path.join(__dirname, '../data/combats_actifs.json');
const ARMES_PATH = path.join(__dirname, '../data/armes.json');

/**
 * Charge les combats actifs
 */
function loadCombatsActifs() {
  if (!fs.existsSync(COMBATS_ACTIFS_PATH)) {
    fs.writeFileSync(COMBATS_ACTIFS_PATH, JSON.stringify({}, null, 2));
    return {};
  }
  return JSON.parse(fs.readFileSync(COMBATS_ACTIFS_PATH, 'utf-8'));
}

/**
 * Sauvegarde les combats actifs
 */
function saveCombatsActifs(data) {
  fs.writeFileSync(COMBATS_ACTIFS_PATH, JSON.stringify(data, null, 2));
}

/**
 * Module IA de gestion du combat
 * Surveille les messages de combat et assiste les modérateurs
 * @param {Object} conn - Instance WhatsApp
 * @param {Object} m - Message reçu
 * @param {string} messageType - Type de message
 */
async function combatIA(conn, m, messageType) {
  try {
    // Ne traiter que les messages texte
    if (!['conversation', 'extendedTextMessage'].includes(messageType)) {
      return;
    }

    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    if (!text || text.trim().length < 5) return;

    const lowerText = text.toLowerCase();
    const combatsActifs = loadCombatsActifs();
    const chatId = m.chat;

    // Détection de début de combat
    const debutCombatKeywords = [
      /^\s*\[combat\]/i,
      /^\s*\[duel\]/i,
      /^\s*\[arène\]/i,
      /je (lance|démarre|commence) (un|le) combat/i,
      /combat (commence|débute)/i
    ];

    const estDebutCombat = debutCombatKeywords.some(re => re.test(text));

    // Si un combat commence
    if (estDebutCombat && !combatsActifs[chatId]) {
      const fiches = JSON.parse(fs.readFileSync(FICHES_PATH, 'utf-8'));
      const socials = JSON.parse(fs.readFileSync(SOCIAL_PATH, 'utf-8'));
      const sender = m.sender;

      if (!fiches[sender] || !socials[sender]) {
        await conn.sendMessage(m.chat, {
          text: "⚠️ **SYSTÈME DE COMBAT**\n\nTu dois avoir une fiche enregistrée pour participer aux combats.\n\nUtilise `!fiche` pour vérifier."
        }, { quoted: m });
        return;
      }

      // Créer un nouveau combat
      const faction = socials[sender].faction;
      const limites = getLimitesFaction(faction);
      const forceMax = fiches[sender].stats?.force || 100;
      const resistances = calculerResistanceZones(forceMax, faction);

      combatsActifs[chatId] = {
        combattants: [sender],
        tour: 1,
        debutTimestamp: Date.now(),
        modePave: false,
        historique: []
      };

      saveCombatsActifs(combatsActifs);

      await conn.sendMessage(m.chat, {
        text: `⚔️ **COMBAT INITIÉ**\n\n` +
              `🎭 Combattant : @${sender.split('@')[0]}\n` +
              `🏛️ Faction : ${faction}\n` +
              `💪 Force Max : ${forceMax}\n` +
              `⚡ Vitesse Max : ${limites.vMax} m/s\n` +
              `🗡️ Coup Max : ${limites.coupMax} Rs\n` +
              `✨ Magie Max : ${limites.magieMax} PM\n\n` +
              `🛡️ **Résistances par zone :**\n` +
              `• Tête : ${resistances.tete} Rs\n` +
              `• Torse : ${resistances.torse} Rs\n` +
              `• Jambes : ${resistances.jambeG}/${resistances.jambeD} Rs\n` +
              `• Bras : ${resistances.brasG}/${resistances.brasD} Rs\n\n` +
              `📜 Le combat est lancé ! Que la meilleure stratégie l'emporte !`,
        mentions: [sender]
      }, { quoted: m });

      return;
    }

    // Détection d'attaque dans un combat actif
    const attaqueKeywords = [
      /j'attaque/i,
      /je frappe/i,
      /je donne un coup/i,
      /j'utilise.*Rs/i,
      /Force.*:\s*\d+/i,
      /Coup.*:\s*\d+/i
    ];

    const estAttaque = attaqueKeywords.some(re => re.test(text));

    if (estAttaque && combatsActifs[chatId]) {
      // Extraction de la force utilisée
      const forceMatch = text.match(/(\d+)\s*(Rs|PF|force)/i);
      
      if (forceMatch) {
        const forceUtilisee = parseInt(forceMatch[1]);
        const sender = m.sender;
        const fiches = JSON.parse(fs.readFileSync(FICHES_PATH, 'utf-8'));
        const socials = JSON.parse(fs.readFileSync(SOCIAL_PATH, 'utf-8'));
        const armes = JSON.parse(fs.readFileSync(ARMES_PATH, 'utf-8'));

        if (!fiches[sender] || !socials[sender]) return;

        const faction = socials[sender].faction;
        const limites = getLimitesFaction(faction);

        // Vérification de la validité de l'attaque
        if (forceUtilisee > limites.coupMax) {
          await conn.sendMessage(m.chat, {
            text: `⚠️ **ATTAQUE INVALIDE**\n\n` +
                  `@${sender.split('@')[0]}, ta faction (${faction}) ne peut pas investir plus de ${limites.coupMax} Rs par coup.\n\n` +
                  `Force utilisée : ${forceUtilisee} Rs\n` +
                  `Limite : ${limites.coupMax} Rs`,
            mentions: [sender]
          }, { quoted: m });
          return;
        }

        // ===== DÉTECTION AUTOMATIQUE D'ARMES =====
        let armeUtilisee = null;
        let armeId = null;
        
        // Scanner toutes les armes pour détecter une mention
        for (const [id, arme] of Object.entries(armes)) {
          const nomLower = arme.nom.toLowerCase();
          const textLower = lowerText;
          
          if (textLower.includes(nomLower)) {
            armeUtilisee = arme;
            armeId = id;
            break;
          }
        }
        
        // Si une arme est détectée, gérer l'usure
        if (armeUtilisee && armeId) {
          const usureActuelle = armeUtilisee.inventaire?.usure || armeUtilisee.resistance;
          
          // Calculer l'usure selon le type d'arme
          let perteUsure = 1;
          
          if (armeUtilisee.type === 'tranchant') {
            perteUsure = 1; // Les armes tranchantes s'usent normalement
          } else if (armeUtilisee.type === 'contondant') {
            if (forceUtilisee > 2 * usureActuelle) {
              // Surcharge : arme se brise
              armeUtilisee.inventaire.usure = 0;
              fs.writeFileSync(ARMES_PATH, JSON.stringify(armes, null, 2));
              
              await conn.sendMessage(m.chat, {
                text: `💔 **ARME BRISÉE !**\n\n` +
                      `@${sender.split('@')[0]}, ton arme **${armeUtilisee.nom}** s'est brisée par surcharge !\n\n` +
                      `Force utilisée : ${forceUtilisee} Rs\n` +
                      `Limite de l'arme : ${2 * usureActuelle} Rs`,
                mentions: [sender]
              }, { quoted: m });
              
              return;
            }
            perteUsure = 1;
          } else if (armeUtilisee.type === 'perforant') {
            // Pour les armes perforantes, l'usure dépend du résultat
            perteUsure = 1;
            
            // Gestion spéciale des munitions pour les arcs
            if (armeUtilisee.inventaire?.munitions !== undefined) {
              armeUtilisee.inventaire.munitions--;
              
              if (armeUtilisee.inventaire.munitions <= 0) {
                armeUtilisee.inventaire.usure = 0;
                fs.writeFileSync(ARMES_PATH, JSON.stringify(armes, null, 2));
                
                await conn.sendMessage(m.chat, {
                  text: `🏹 **MUNITIONS ÉPUISÉES !**\n\n` +
                        `@${sender.split('@')[0]}, ton **${armeUtilisee.nom}** n'a plus de munitions et se brise !`,
                  mentions: [sender]
                }, { quoted: m });
                
                return;
              }
            }
          }
          
          // Appliquer l'usure
          const nouvelleUsure = Math.max(0, usureActuelle - perteUsure);
          armeUtilisee.inventaire.usure = nouvelleUsure;
          
          // Sauvegarder
          armes[armeId] = armeUtilisee;
          fs.writeFileSync(ARMES_PATH, JSON.stringify(armes, null, 2));
          
          // Notification d'usure
          let notifUsure = '';
          if (nouvelleUsure === 0) {
            notifUsure = `\n\n💔 **ARME DÉTRUITE !** ${armeUtilisee.nom} est hors d'usage.`;
          } else if (nouvelleUsure <= armeUtilisee.resistance * 0.2) {
            notifUsure = `\n\n⚠️ **USURE CRITIQUE !** ${armeUtilisee.nom} : ${nouvelleUsure}/${armeUtilisee.resistance} Rs`;
          } else {
            notifUsure = `\n\n🔧 Usure : ${armeUtilisee.nom} ${nouvelleUsure}/${armeUtilisee.resistance} Rs`;
          }
          
          await conn.sendMessage(m.chat, {
            text: `⚔️ **ARME DÉTECTÉE**\n\n` +
                  `Arme : **${armeUtilisee.nom}** [${armeUtilisee.rang}]\n` +
                  `Type : ${armeUtilisee.type}\n` +
                  `Résistance : ${armeUtilisee.resistance} Rs${notifUsure}`,
            mentions: [sender]
          }, { quoted: m });
        }

        // Enregistrer l'attaque dans l'historique
        combatsActifs[chatId].historique.push({
          attaquant: sender,
          type: 'attaque',
          forceUtilisee,
          arme: armeUtilisee ? armeUtilisee.nom : 'Corps à corps',
          timestamp: Date.now(),
          messageId: m.key.id
        });

        saveCombatsActifs(combatsActifs);

        // Réaction automatique
        await conn.sendMessage(m.chat, {
          react: {
            text: "⚔️",
            key: m.key
          }
        });

        // Suggestions du modérateur IA
        await conn.sendMessage(m.chat, {
          text: `🤖 **ASSISTANT COMBAT**\n\n` +
                `Force investie : ${forceUtilisee} Rs\n` +
                `Faction : ${faction}\n\n` +
                `💡 **Rappel :**\n` +
                `• Coup critique : Force > Rs de la zone\n` +
                `• Parade : Force = Rs de la zone\n` +
                `• Coup faible : Force < Rs de la zone\n\n` +
                `🎯 Attendez la réponse du défenseur pour résoudre l'action.`
        }, { quoted: m });
      }
    }

    // Détection de fin de combat
    const finCombatKeywords = [
      /\[fin (du )?combat\]/i,
      /combat terminé/i,
      /je (me rends|abandonne)/i
    ];

    const estFinCombat = finCombatKeywords.some(re => re.test(text));

    if (estFinCombat && combatsActifs[chatId]) {
      const combat = combatsActifs[chatId];
      const duree = Math.round((Date.now() - combat.debutTimestamp) / 60000);

      await conn.sendMessage(m.chat, {
        text: `🏁 **COMBAT TERMINÉ**\n\n` +
              `⏱️ Durée : ${duree} minute(s)\n` +
              `📊 Tours joués : ${combat.tour}\n` +
              `📜 Actions enregistrées : ${combat.historique.length}\n\n` +
              `Merci pour ce beau combat ! 🎭`
      }, { quoted: m });

      // Supprimer le combat
      delete combatsActifs[chatId];
      saveCombatsActifs(combatsActifs);
    }

  } catch (error) {
    console.error("❌ Erreur combatIA:", error.message);
  }
}

module.exports = { combatIA };
