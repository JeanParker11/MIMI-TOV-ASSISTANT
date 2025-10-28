const fs = require('fs');
const path = require('path');

const FICHE_PATH = path.join(__dirname, '../data/fiches.json');
const ARGENT_PATH = path.join(__dirname, '../data/banque.json');
const SOCIAL_PATH = path.join(__dirname, '../data/social.json');
const PALMARES_PATH = path.join(__dirname, '../data/palmares.json');

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath));
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  name: "bannir",
  category: "UNIROLIST",
  description: "Supprime la fiche et l'argent d'un joueur",
  onlyOwner: false,
  onlySudo: true,
  onlyAdmin: true,
  allowedForAll: false,

  async execute(riza, m, args) {
    // 🔍 Récupération du JID de la cible (réponse > mention)
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const quotedParticipant = contextInfo?.participant || contextInfo?.remoteJid;
    const mentioned = m.mentionedJid?.[0];

    const targetJid = quotedParticipant || mentioned;

    if (!targetJid) {
      return riza.sendMessage(m.chat, {
        text: "❌ Utilisation : mentionnez ou répondez au message de la personne à bannir."
      }, { quoted: m });
    }

    const fiches = loadJson(FICHE_PATH);
    const banque = loadJson(ARGENT_PATH);
    const socials = loadJson(SOCIAL_PATH);
    const palmares = loadJson(PALMARES_PATH);

    let message = `👤 Joueur cible : @${targetJid.split("@")[0]}\n\n`;
    let modif = false;

    // Suppression de la fiche principale
    if (fiches[targetJid]) {
      delete fiches[targetJid];
      saveJson(FICHE_PATH, fiches);
      message += `✅ Fiche RP supprimée\n`;
      modif = true;
    }

    // Suppression de l'argent
    if (banque[targetJid]) {
      delete banque[targetJid];
      saveJson(ARGENT_PATH, banque);
      message += `💸 Argent supprimé\n`;
      modif = true;
    }

    // Suppression de la fiche sociale
    if (socials[targetJid]) {
      delete socials[targetJid];
      saveJson(SOCIAL_PATH, socials);
      message += `🗣️ Fiche sociale supprimée\n`;
      modif = true;
    }

    // Suppression du palmarès
    if (palmares[targetJid]) {
      delete palmares[targetJid];
      saveJson(PALMARES_PATH, palmares);
      message += `🏆 Palmarès supprimé\n`;
      modif = true;
    }

    if (!modif) {
      message += `❌ Aucun enregistrement trouvé pour ce joueur.`;
    } else {
      message += `\n🔨 Le joueur a été complètement banni de l'Unirolist.`;
    }

    await riza.sendMessage(m.chat, {
      text: message,
      mentions: [targetJid]
    }, { quoted: m });
  }
};