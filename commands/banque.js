const fs = require('fs');
const path = require('path');

const ARGENT_PATH = path.join(__dirname, '../data/banque.json');
const FICHES_PATH = path.join(__dirname, '../data/fiches.json');

function loadArgent() {
  if (!fs.existsSync(ARGENT_PATH)) return {};
  return JSON.parse(fs.readFileSync(ARGENT_PATH));
}

function saveArgent(data) {
  fs.writeFileSync(ARGENT_PATH, JSON.stringify(data, null, 2));
}

function loadFiches() {
  if (!fs.existsSync(FICHES_PATH)) return {};
  return JSON.parse(fs.readFileSync(FICHES_PATH));
}

/**
 * Initialise la banque en ajoutant un solde à tout utilisateur ayant une fiche mais pas encore de compte.
 */
function initBanque() {
  const fiches = loadFiches();
  const banque = loadArgent();

  let updated = false;

  for (const jid of Object.keys(fiches)) {
    if (!(jid in banque)) {
      banque[jid] = 0; // solde initial
      updated = true;
    }
  }

  if (updated) {
    saveArgent(banque);
    console.log("[BANQUE] Banque mise à jour avec les nouveaux inscrits.");
  }
}

module.exports = {
  name: "banque",
  category: "UNIROLIST",
  description: "Affiche l'argent disponible pour chaque membre (mention)",
  allowedForAll: true,

  async execute(riza, m, args) {
    initBanque();

    const argent = loadArgent();
    if (Object.keys(argent).length === 0) {
      return riza.sendMessage(m.chat, { text: "❌ Aucun solde enregistré." }, { quoted: m });
    }

    let message = '💎 𝗦𝗢𝗟𝗗𝗘 𝗗𝗘𝗦 𝗠𝗘𝗠𝗕𝗥𝗘𝗦 💎\n\n';
    const mentions = [];

    for (const [jid, montant] of Object.entries(argent)) {
      message += `• @${jid.split('@')[0]} : ${montant.toLocaleString()} 💎\n`;
      mentions.push(jid);
    }

    await riza.sendMessage(m.chat, {
      text: message.trim(),
      mentions
    }, { quoted: m });
  },

  initBanque,
};