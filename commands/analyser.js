const {
  resoudreCorpsVsCorps,
  resoudreArmeContondante,
  resoudreArmeTranchante,
  resoudreArmePerforante,
  calculerResistanceZones,
  getLimitesFaction
} = require('../lib/combatEngine');
const fs = require('fs');
const path = require('path');

const FICHES_PATH = path.join(__dirname, '../data/fiches.json');
const SOCIAL_PATH = path.join(__dirname, '../data/social.json');

module.exports = {
  name: "analyser",
  category: "UNIROLIST",
  description: "Analyse une action de combat (modérateurs)",
  onlyAdmin: true,

  async execute(riza, m, args) {
    if (args.length === 0) {
      return riza.sendMessage(m.chat, {
        text: `🔍 **ANALYSEUR DE COMBAT**\n\n` +
              `**Syntaxes disponibles :**\n\n` +
              `1️⃣ **Corps vs Corps**\n` +
              `   \`!analyser corps @attaquant @defenseur zone force\`\n` +
              `   Ex: \`!analyser corps @alice @bob tete 8\`\n\n` +
              `2️⃣ **Arme Contondante**\n` +
              `   \`!analyser contondant rsArme rsCible force\`\n` +
              `   Ex: \`!analyser contondant 40 30 7\`\n\n` +
              `3️⃣ **Arme Tranchante**\n` +
              `   \`!analyser tranchant rsArme rsZone grade force\`\n` +
              `   Ex: \`!analyser tranchant 35 25 B 6\`\n\n` +
              `4️⃣ **Arme Perforante**\n` +
              `   \`!analyser perforant rsArme rsZone force\`\n` +
              `   Ex: \`!analyser perforant 20 30 8\`\n\n` +
              `5️⃣ **Résistances d'un joueur**\n` +
              `   \`!analyser rs @joueur\`\n` +
              `   Ex: \`!analyser rs @alice\``
      }, { quoted: m });
    }

    const type = args[0].toLowerCase();

    // ANALYSE CORPS VS CORPS
    if (type === 'corps') {
      if (args.length < 5) {
        return riza.sendMessage(m.chat, {
          text: "❌ **Syntaxe invalide**\n\n`!analyser corps @attaquant @defenseur zone force`"
        }, { quoted: m });
      }

      const mentions = m.mentionedJid || [];
      if (mentions.length < 2) {
        return riza.sendMessage(m.chat, {
          text: "❌ **Mentions manquantes**\n\nTu dois mentionner l'attaquant ET le défenseur."
        }, { quoted: m });
      }

      const attaquantJid = mentions[0];
      const defenseurJid = mentions[1];
      const zone = args[3].toLowerCase();
      const force = parseInt(args[4]);

      if (isNaN(force)) {
        return riza.sendMessage(m.chat, {
          text: "❌ **Force invalide**\n\nLa force doit être un nombre."
        }, { quoted: m });
      }

      const fiches = JSON.parse(fs.readFileSync(FICHES_PATH, 'utf-8'));
      const socials = JSON.parse(fs.readFileSync(SOCIAL_PATH, 'utf-8'));

      if (!fiches[defenseurJid] || !socials[defenseurJid]) {
        return riza.sendMessage(m.chat, {
          text: "❌ Le défenseur n'a pas de fiche."
        }, { quoted: m });
      }

      const factionDef = socials[defenseurJid].faction;
      const forceMaxDef = fiches[defenseurJid].stats?.force || 100;
      const resistances = calculerResistanceZones(forceMaxDef, factionDef);

      const zonesMap = {
        'tete': resistances.tete,
        'torse': resistances.torse,
        'jambeg': resistances.jambeG,
        'jambed': resistances.jambeD,
        'brasg': resistances.brasG,
        'brasd': resistances.brasD
      };

      const rsZone = zonesMap[zone];
      if (!rsZone) {
        return riza.sendMessage(m.chat, {
          text: `❌ **Zone invalide**\n\nZones: tete, torse, jambeG, jambeD, brasG, brasD`
        }, { quoted: m });
      }

      const factionAtt = socials[attaquantJid]?.faction || 'Arès';
      const resultat = resoudreCorpsVsCorps(force, rsZone, factionAtt, factionDef);

      let message = `🥊 **ANALYSE CORPS VS CORPS**\n`;
      message += `━━━━━━━━━━━━━━━━━━\n`;
      message += `👊 Attaquant : @${attaquantJid.split('@')[0]}\n`;
      message += `🛡️ Défenseur : @${defenseurJid.split('@')[0]}\n`;
      message += `🎯 Zone : ${zone}\n`;
      message += `💥 Force : ${force} Rs\n`;
      message += `🛡️ Rs Zone : ${rsZone} Rs\n\n`;
      message += `📊 **RÉSULTAT : ${resultat.type.toUpperCase()}**\n\n`;

      if (resultat.type === 'critique') {
        message += `✅ **Coup critique !**\n`;
        message += `• Dégâts au défenseur : ${resultat.degatsDefenseur} PV\n`;
        message += `• Perte PF attaquant : ${resultat.pertePFAttaquant}\n`;
        message += `• Perte PF défenseur : ${resultat.pertePFDefenseur}\n`;
        if (resultat.testEtourdissement) {
          message += `⚠️ Test d'étourdissement requis !\n`;
        }
      } else if (resultat.type === 'parade') {
        message += `🛡️ **Parade réussie !**\n`;
        message += `• Aucun dégât\n`;
        message += `• Perte PF attaquant : ${resultat.pertePFAttaquant}\n`;
        message += `• Perte PF défenseur : ${resultat.pertePFDefenseur}\n`;
        message += `• Dégradation Rs : -${resultat.degradationRs}\n`;
      } else {
        message += `❌ **Coup faible**\n`;
        message += `• Dégâts de recul à l'attaquant : ${resultat.degatsRecul}\n`;
        message += `• Perte PF attaquant : ${resultat.pertePFAttaquant}\n`;
        message += `• Perte PF défenseur : ${resultat.pertePFDefenseur}\n`;
      }

      return riza.sendMessage(m.chat, {
        text: message,
        mentions: [attaquantJid, defenseurJid]
      }, { quoted: m });
    }

    // ANALYSE ARME CONTONDANTE
    if (type === 'contondant') {
      if (args.length < 4) {
        return riza.sendMessage(m.chat, {
          text: "❌ **Syntaxe invalide**\n\n`!analyser contondant rsArme rsCible force`"
        }, { quoted: m });
      }

      const rsArme = parseInt(args[1]);
      const rsCible = parseInt(args[2]);
      const force = parseInt(args[3]);

      const resultat = resoudreArmeContondante(force, rsArme, rsCible);

      let message = `🔨 **ANALYSE ARME CONTONDANTE**\n`;
      message += `━━━━━━━━━━━━━━━━━━\n`;
      message += `⚙️ Rs Arme : ${rsArme} Rs\n`;
      message += `🎯 Rs Cible : ${rsCible} Rs\n`;
      message += `💥 Force : ${force} Rs\n\n`;
      message += `📊 **RÉSULTAT : ${resultat.type.toUpperCase()}**\n\n`;

      if (resultat.armeBrisee) {
        message += `💔 **Arme brisée !**\n`;
        if (resultat.degatsRecul > 0) {
          message += `• Dégâts recul : ${resultat.degatsRecul}\n`;
        }
      } else {
        message += `• Dégâts : ${resultat.degats}\n`;
        message += `• Usure arme : -${resultat.usureArme} Rs\n`;
      }

      return riza.sendMessage(m.chat, { text: message }, { quoted: m });
    }

    // ANALYSE ARME TRANCHANTE
    if (type === 'tranchant') {
      if (args.length < 5) {
        return riza.sendMessage(m.chat, {
          text: "❌ **Syntaxe invalide**\n\n`!analyser tranchant rsArme rsZone grade force`"
        }, { quoted: m });
      }

      const rsArme = parseInt(args[1]);
      const rsZone = parseInt(args[2]);
      const grade = args[3].toUpperCase();
      const force = parseInt(args[4]);

      const resultat = resoudreArmeTranchante(force, rsArme, rsZone, grade);

      let message = `🗡️ **ANALYSE ARME TRANCHANTE**\n`;
      message += `━━━━━━━━━━━━━━━━━━\n`;
      message += `⚙️ Rs Arme : ${rsArme} Rs\n`;
      message += `🛡️ Rs Zone : ${rsZone} Rs\n`;
      message += `🏆 Grade : ${grade}\n`;
      message += `💥 Force : ${force} Rs\n`;
      message += `🎯 Pénétration : ${resultat.penCoef * 100}%\n`;
      message += `🛡️ Rs Effective : ${Math.round(rsZone * (1 - resultat.penCoef))} Rs\n\n`;
      message += `📊 **RÉSULTAT : ${resultat.type.toUpperCase()}**\n\n`;
      message += `• Dégâts : ${resultat.degats}\n`;
      if (resultat.saignement) {
        message += `🩸 **Saignement actif !** (-5% PV max/tour)\n`;
      }

      return riza.sendMessage(m.chat, { text: message }, { quoted: m });
    }

    // ANALYSE ARME PERFORANTE
    if (type === 'perforant') {
      if (args.length < 4) {
        return riza.sendMessage(m.chat, {
          text: "❌ **Syntaxe invalide**\n\n`!analyser perforant rsArme rsZone force`"
        }, { quoted: m });
      }

      const rsArme = parseInt(args[1]);
      const rsZone = parseInt(args[2]);
      const force = parseInt(args[3]);

      const resultat = resoudreArmePerforante(force, rsArme, rsZone);

      let message = `🏹 **ANALYSE ARME PERFORANTE**\n`;
      message += `━━━━━━━━━━━━━━━━━━\n`;
      message += `⚙️ Rs Arme : ${rsArme} Rs\n`;
      message += `🛡️ Rs Zone : ${rsZone} Rs\n`;
      message += `💥 Force : ${force} Rs\n`;
      message += `🎯 Force Impact : ${force + rsArme} Rs\n\n`;
      message += `📊 **RÉSULTAT : ${resultat.type.toUpperCase()}**\n\n`;

      if (resultat.ricochet) {
        message += `⚠️ **Ricochet !** (Force < 10% Rs)\n`;
      } else if (resultat.implantation) {
        message += `📌 **Implantation !** Arme plantée.\n`;
        message += `• Dégâts : ${resultat.degats}\n`;
      } else if (resultat.armeBrisee) {
        message += `💔 **Arme brisée !**\n`;
        message += `• Dégâts percussion : ${resultat.degats}\n`;
      } else {
        message += `✅ **Perforation !**\n`;
        message += `• Dégâts : ${resultat.degats}\n`;
      }

      return riza.sendMessage(m.chat, { text: message }, { quoted: m });
    }

    // ANALYSE RÉSISTANCES
    if (type === 'rs') {
      const mentions = m.mentionedJid || [];
      if (mentions.length === 0) {
        return riza.sendMessage(m.chat, {
          text: "❌ **Syntaxe invalide**\n\n`!analyser rs @joueur`"
        }, { quoted: m });
      }

      const jid = mentions[0];
      const fiches = JSON.parse(fs.readFileSync(FICHES_PATH, 'utf-8'));
      const socials = JSON.parse(fs.readFileSync(SOCIAL_PATH, 'utf-8'));

      if (!fiches[jid] || !socials[jid]) {
        return riza.sendMessage(m.chat, {
          text: "❌ Ce joueur n'a pas de fiche."
        }, { quoted: m });
      }

      const faction = socials[jid].faction;
      const forceMax = fiches[jid].stats?.force || 100;
      const limites = getLimitesFaction(faction);
      const resistances = calculerResistanceZones(forceMax, faction);

      let message = `🛡️ **RÉSISTANCES DE @${jid.split('@')[0]}**\n`;
      message += `━━━━━━━━━━━━━━━━━━\n`;
      message += `🏛️ Faction : ${faction}\n`;
      message += `💪 Force Max : ${forceMax}\n`;
      message += `⚡ Vitesse Max : ${limites.vMax} m/s\n`;
      message += `🗡️ Coup Max : ${limites.coupMax} Rs\n`;
      message += `✨ Magie Max : ${limites.magieMax} PM\n\n`;
      message += `🛡️ **RÉSISTANCES PAR ZONE**\n`;
      message += `• Tête : ${resistances.tete} Rs\n`;
      message += `• Torse : ${resistances.torse} Rs\n`;
      message += `• Jambe G : ${resistances.jambeG} Rs\n`;
      message += `• Jambe D : ${resistances.jambeD} Rs\n`;
      message += `• Bras G : ${resistances.brasG} Rs\n`;
      message += `• Bras D : ${resistances.brasD} Rs\n`;

      return riza.sendMessage(m.chat, {
        text: message,
        mentions: [jid]
      }, { quoted: m });
    }

    return riza.sendMessage(m.chat, {
      text: "❌ **Type d'analyse invalide**\n\nTypes: corps, contondant, tranchant, perforant, rs"
    }, { quoted: m });
  }
};
