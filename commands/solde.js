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
    console.log("[ARGENT] Migration des données vers la nouvelle structure effectuée.");
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

function initCompteSiNécessaire(jid) {
  const banque = loadArgent();
  if (!banque[jid]) {
    banque[jid] = {
      diamants: 0,
      rulith: 0
    };
    saveArgent(banque);
  }
  return banque[jid];
}

module.exports = {
  name: "solde",
  category: "UNIROLIST",
  description: "Affiche ton solde ou celui d'un autre membre",
  allowedForAll: true,

  async execute(riza, m, args) {
    const mentionné = m.mentionedJid && m.mentionedJid[0];
    const jid = mentionné || m.sender;

    const fiches = loadFiches();

    // ❌ Si l'utilisateur n'a pas de fiche enregistrée
    if (!fiches[jid]) {
      const mentionText = jid === m.sender
        ? "❌ Tu n'as pas encore de fiche.\n\nCommence ton enregistrement auprès d'un administrateur pour commencer ton aventure !"
        : `❌ @${jid.split('@')[0]} n'a pas encore de fiche enregistrée.`;
        
      return riza.sendMessage(m.chat, {
        text: mentionText,
        mentions: mentionné ? [mentionné] : []
      }, { quoted: m });
    }

    const compte = initCompteSiNécessaire(jid);
    const diamants = compte.diamants || 0;
    const rulith = compte.rulith || 0;
    
    const mentionText = jid === m.sender
      ? "💰 *TON SOLDE ACTUEL*"
      : `💰 *SOLDE DE @${jid.split('@')[0]}*`;

    let soldeText = '';
    
    if (diamants > 0 && rulith > 0) {
      soldeText = `${diamants.toLocaleString()} 💎 | ${rulith.toLocaleString()} Ru`;
    } else if (diamants > 0) {
      soldeText = `${diamants.toLocaleString()} 💎`;
    } else if (rulith > 0) {
      soldeText = `${rulith.toLocaleString()} Ru`;
    } else {
      soldeText = `0 💎 | 0 Ru`;
    }

    const text = `${mentionText}

💎 Diamants : ${diamants.toLocaleString()} 💎
💰 Rulith    : ${rulith.toLocaleString()} Ru`;

    await riza.sendMessage(m.chat, {
      text: text,
      mentions: [jid]
    }, { quoted: m });
  }
};