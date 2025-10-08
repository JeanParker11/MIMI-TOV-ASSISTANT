const fs = require('fs');
const path = require('path');

const ARGENT_PATH = path.join(__dirname, '../data/banque.json');
const FICHES_PATH = path.join(__dirname, '../data/fiches.json');

function loadArgent() {
  if (!fs.existsSync(ARGENT_PATH)) return {};
  const data = JSON.parse(fs.readFileSync(ARGENT_PATH));
  
  // Migration des anciennes données vers la nouvelle structure
  return migrerAnciennesDonnees(data);
}

function migrerAnciennesDonnees(banque) {
  let miseAJour = false;
  
  for (const [jid, solde] of Object.entries(banque)) {
    // Si c'est l'ancien format (nombre uniquement)
    if (typeof solde === 'number') {
      banque[jid] = {
        diamants: solde,
        rulith: 0
      };
      miseAJour = true;
    }
  }
  
  if (miseAJour) {
    saveArgent(banque);
    console.log("[BANQUE] Migration des données vers la nouvelle structure effectuée.");
  }
  
  return banque;
}

function saveArgent(data) {
  fs.writeFileSync(ARGENT_PATH, JSON.stringify(data, null, 2));
}

function loadFiches() {
  if (!fs.existsSync(FICHES_PATH)) return {};
  return JSON.parse(fs.readFileSync(FICHES_PATH));
}

function formaterSolde(compte) {
  const diamants = compte.diamants || 0;
  const rulith = compte.rulith || 0;
  
  let texte = '';
  
  if (diamants > 0 && rulith > 0) {
    texte = `${diamants.toLocaleString()} 💎 | ${rulith.toLocaleString()} Ru`;
  } else if (diamants > 0) {
    texte = `${diamants.toLocaleString()} 💎`;
  } else if (rulith > 0) {
    texte = `${rulith.toLocaleString()} Ru`;
  } else {
    texte = `0 💎 | 0 Ru`;
  }
  
  return texte;
}

function calculerTotal(compte) {
  const diamants = compte.diamants || 0;
  const rulith = compte.rulith || 0;
  // Conversion en diamants pour le classement
  return diamants + (rulith / 1000);
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
      banque[jid] = {
        diamants: 0,
        rulith: 0
      };
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
  allowedForAll: false,

  async execute(riza, m, args) {
    initBanque();

    const argent = loadArgent();
    if (Object.keys(argent).length === 0) {
      return riza.sendMessage(m.chat, { text: "❌ Aucun solde enregistré." }, { quoted: m });
    }

    // Trier les joueurs par richesse totale (diamants + rulith convertis)
    const joueursTries = Object.entries(argent)
      .filter(([jid, compte]) => (compte.diamants || 0) > 0 || (compte.rulith || 0) > 0)
      .sort(([, compteA], [, compteB]) => calculerTotal(compteB) - calculerTotal(compteA));

    if (joueursTries.length === 0) {
      return riza.sendMessage(m.chat, { text: "❌ Aucun solde positif enregistré." }, { quoted: m });
    }

    let message = '💰 𝗦𝗢𝗟𝗗𝗘𝗦 𝗗𝗘𝗦 𝗠𝗘𝗠𝗕𝗥𝗘𝗦 💰\n\n';
    message += '💫 *Équivalence :* 1 💎 = 1,000 Ru\n\n';
    
    const mentions = [];
    let rang = 1;

    for (const [jid, compte] of joueursTries) {
      const soldeFormate = formaterSolde(compte);
      
      message += `🏦 *${rang}.* @${jid.split('@')[0]}\n`;
      message += `   💰 Solde : ${soldeFormate}\n\n`;
      
      mentions.push(jid);
      rang++;
    }

    await riza.sendMessage(m.chat, {
      text: message.trim(),
      mentions
    }, { quoted: m });
  },

  initBanque,
  loadArgent
};