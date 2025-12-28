const { getArmesDisponibles, calculerStatsArme } = require('../lib/equipementManager');
const fs = require('fs');
const path = require('path');

const SOCIAL_PATH = path.join(__dirname, '../data/social.json');
const FICHES_PATH = path.join(__dirname, '../data/fiches.json');
const ARMES_PATH = path.join(__dirname, '../data/armes.json');

module.exports = {
  name: "arsenal",
  category: "UNIROLIST",
  description: "Affiche l'arsenal complet des armes disponibles",
  allowedForAll: true,

  async execute(riza, m, args) {
    const jid = m.sender;

    // Vérifications de base
    const fiches = JSON.parse(fs.readFileSync(FICHES_PATH, 'utf-8'));
    const socials = JSON.parse(fs.readFileSync(SOCIAL_PATH, 'utf-8'));

    if (!fiches[jid] || !socials[jid]) {
      return riza.sendMessage(m.chat, {
        text: "❌ **ACCÈS REFUSÉ**\n\nTu dois avoir une fiche enregistrée pour consulter l'arsenal."
      }, { quoted: m });
    }

    const faction = socials[jid].faction;

    // Si un argument est fourni, afficher les détails d'une arme spécifique
    if (args.length > 0) {
      const nomRecherche = args.join(' ').toLowerCase();
      const armes = JSON.parse(fs.readFileSync(ARMES_PATH, 'utf-8'));

      let armeId = null;
      let arme = null;

      for (const [id, a] of Object.entries(armes)) {
        if (a.nom.toLowerCase().includes(nomRecherche) || id.toLowerCase().includes(nomRecherche)) {
          armeId = id;
          arme = a;
          break;
        }
      }

      if (!arme) {
        return riza.sendMessage(m.chat, {
          text: `❌ **ARME INTROUVABLE**\n\nAucune arme ne correspond à "${args.join(' ')}".`
        }, { quoted: m });
      }

      const stats = calculerStatsArme(arme);
      const compatible = require('../lib/equipementManager').verifierEquipement(faction, arme.faction);
      const iconeCompatible = compatible ? "✅" : "❌";

      let message = `⚔️ **${arme.nom}**\n`;
      message += `━━━━━━━━━━━━━━━━━━\n`;
      message += `🏆 **Grade** : ${arme.rang}\n`;
      message += `⚙️ **Type** : ${arme.type}\n`;
      message += `🛡️ **Résistance** : ${arme.resistance} Rs\n`;
      message += `🎯 **Pénétration** : ${stats.penetrationArmure}%\n`;
      message += `💰 **Valeur** : ${arme.valeur} 💎\n\n`;

      // Factions autorisées
      const allowed = Array.isArray(arme.faction.allowed) ? arme.faction.allowed : [arme.faction.allowed];
      const excluded = Array.isArray(arme.faction.excluded) ? arme.faction.excluded : [];

      if (allowed.some(f => f.toLowerCase() === 'toutes')) {
        message += `🏛️ **Factions** : Toutes`;
        if (excluded.length > 0) {
          message += ` (sauf ${excluded.join(', ')})`;
        }
      } else {
        message += `🏛️ **Factions** : ${allowed.join(', ')}`;
      }

      message += `\n${iconeCompatible} **Compatible avec ${faction}**\n\n`;

      // Inventaire
      if (arme.inventaire) {
        const pourcentage = Math.round((arme.inventaire.actuel / arme.inventaire.max_global) * 100);
        message += `📦 **Stock** : ${arme.inventaire.actuel}/${arme.inventaire.max_global} (${pourcentage}%)\n\n`;
      }

      // Capacité
      if (arme.capacite) {
        message += `✨ **Capacité** : ${arme.capacite.nom}\n`;
        message += `   └ Type : ${arme.capacite.type}\n`;
        message += `   └ ${arme.capacite.description}\n\n`;
      }

      // Description
      message += `📝 **Description**\n${arme.description}\n`;
      message += `━━━━━━━━━━━━━━━━━━`;

      return riza.sendMessage(m.chat, { text: message }, { quoted: m });
    }

    // Afficher l'arsenal complet pour la faction
    const armesDisponibles = getArmesDisponibles(faction);

    if (armesDisponibles.length === 0) {
      return riza.sendMessage(m.chat, {
        text: `❌ **ARSENAL VIDE**\n\nAucune arme n'est disponible pour ta faction (${faction}).`
      }, { quoted: m });
    }

    let message = `⚔️ **ARSENAL DE ${faction.toUpperCase()}**\n`;
    message += `━━━━━━━━━━━━━━━━━━\n`;
    message += `📊 ${armesDisponibles.length} arme(s) disponible(s)\n\n`;

    // Grouper par type
    const parType = {};
    for (const arme of armesDisponibles) {
      if (!parType[arme.type]) parType[arme.type] = [];
      parType[arme.type].push(arme);
    }

    const ordreTypes = ['tranchant', 'contondant', 'perforant', 'magique'];
    const iconesTypes = {
      'tranchant': '🗡️',
      'contondant': '🔨',
      'perforant': '🏹',
      'magique': '✨'
    };

    for (const type of ordreTypes) {
      if (!parType[type]) continue;

      const icone = iconesTypes[type] || '⚔️';
      message += `${icone} **${type.toUpperCase()}**\n`;

      // Trier par rang (S > A > B > C > D > E)
      const ordreRangs = ['S', 'A', 'B', 'C', 'D', 'E'];
      const armesTrie = parType[type].sort((a, b) => {
        return ordreRangs.indexOf(a.rang) - ordreRangs.indexOf(b.rang);
      });

      for (const arme of armesTrie) {
        const dispo = arme.inventaire ? `(${arme.inventaire.actuel})` : '';
        message += `  • [${arme.rang}] ${arme.nom} ${dispo}\n`;
      }

      message += `\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━\n`;
    message += `💡 **Détails :** \`!arsenal [nom_arme]\`\n`;
    message += `⚔️ **Équiper :** \`!equiper [nom_arme]\``;

    return riza.sendMessage(m.chat, { text: message }, { quoted: m });
  }
};
