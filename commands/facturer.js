const fs = require("fs");
const path = require("path");

const ARGENT_PATH = path.join(__dirname, "../data/banque.json");
const FICHES_PATH = path.join(__dirname, "../data/fiches.json");

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

module.exports = {
  name: "facturer",
  category: "UNIROLIST",
  description: "Retire des 💎 à un membre enregistré (facturation)",
  onlyAdmin: true,

  async execute(riza, m, args) {
    const target = m.mentionedJid?.[0] ||
                   m.message?.extendedTextMessage?.contextInfo?.participant;

    if (!target) {
      return riza.sendMessage(m.chat, {
        text: "❌ Mentionne ou répond à un joueur pour lui facturer des 💎."
      }, { quoted: m });
    }

    const montant = parseInt(args.find(a => /^\d+$/.test(a)));

    if (!montant || montant <= 0) {
      return riza.sendMessage(m.chat, {
        text: "❌ Indique un montant valide à facturer (ex: .facturer @membre 1000)"
      }, { quoted: m });
    }

    const fiches = loadFiches();

    if (!fiches[target]) {
      return riza.sendMessage(m.chat, {
        text: `❌ @${target.split("@")[0]} n'a pas de fiche enregistrée, impossible de facturer.`,
        mentions: [target]
      }, { quoted: m });
    }

    const banque = loadArgent();
    if (!banque[target]) banque[target] = 0;

    if (banque[target] < montant) {
      return riza.sendMessage(m.chat, {
        text: `❌ @${target.split("@")[0]} n'a pas assez de 💎 pour cette facture.`,
        mentions: [target]
      }, { quoted: m });
    }

    // 💸 Retirer les 💎 du membre
    banque[target] -= montant;

    // 💾 Sauvegarder
    saveArgent(banque);

    await riza.sendMessage(m.chat, {
      text: `✅ Une facture de ${montant.toLocaleString()} 💎 a été prélevée à @${target.split("@")[0]}`,
      mentions: [target]
    }, { quoted: m });
  }
};