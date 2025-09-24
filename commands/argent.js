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

function initSoldeSiNécessaire(jid) {
  const banque = loadArgent();
  if (!(jid in banque)) {
    banque[jid] = 0;
    saveArgent(banque);
  }
  return banque[jid];
}

module.exports = {
  name: "argent",
  category: "UNIROLIST",
  description: "Affiche ton solde ou celui d’un autre membre",
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

    const solde = initSoldeSiNécessaire(jid);
    const mentionText = jid === m.sender
      ? "💰 Ton solde actuel est"
      : `💰 Le solde de @${jid.split('@')[0]} est`;

    await riza.sendMessage(m.chat, {
      text: `${mentionText} : *${solde.toLocaleString()} 💎*`,
      mentions: [jid]
    }, { quoted: m });
  }
};