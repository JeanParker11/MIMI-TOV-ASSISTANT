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
  name: "payer",
  category: "UNIROLIST",
  description: "Verse des 💎 à un membre enregistré",
  onlyAdmin: true,

  async execute(riza, m, args) {
    const target = m.mentionedJid?.[0] ||
                   m.message?.extendedTextMessage?.contextInfo?.participant;

    if (!target) {
      return riza.sendMessage(m.chat, {
        text: "❌ Mentionne ou répond à un joueur pour lui payer des 💎."
      }, { quoted: m });
    }

    const montant = parseInt(args.find(a => /^\d+$/.test(a)));

    if (!montant || montant <= 0) {
      return riza.sendMessage(m.chat, {
        text: "❌ Indique un montant valide à transférer (ex: .payer @membre 1000)"
      }, { quoted: m });
    }

    const fiches = loadFiches();

    if (!fiches[target]) {
      return riza.sendMessage(m.chat, {
        text: `❌ @${target.split("@")[0]} n'a pas de fiche enregistrée, impossible de payer.`,
        mentions: [target]
      }, { quoted: m });
    }

    const sender = m.key.participant || m.key.remoteJid;
    const banque = loadArgent();

    if (!banque[target]) banque[target] = 0;
    if (!banque[sender]) banque[sender] = 0;

    const isOwner = Array.isArray(global.owner)
      ? global.owner.includes(sender) || global.owner.includes(sender.split("@")[0]) || global.owner.includes(`${sender.split("@")[0]}@lid`)
      : [sender, sender.split("@")[0], `${sender.split("@")[0]}@lid`].includes(global.owner?.toString());

    const sudoList = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/sudo.json"), "utf-8"));
    const isSudo = sudoList.includes(sender) || sudoList.includes(sender.split("@")[0]) || sudoList.includes(`${sender.split("@")[0]}@lid`);

    const isAdmin = m.key.fromMe || isSudo || isOwner;

    // 💰 Vérifie que l'utilisateur a assez d'argent (sauf si admin/sudo)
    if (!isAdmin && banque[sender] < montant) {
      return riza.sendMessage(m.chat, {
        text: "❌ Tu n'as pas assez de 💎 pour effectuer ce paiement."
      }, { quoted: m });
    }

    // 💸 Retire les 💎 au sender sauf s'il est admin
    if (!isAdmin) banque[sender] -= montant;

    // ➕ Ajoute les 💎 au receveur
    banque[target] += montant;

    saveArgent(banque);

    await riza.sendMessage(m.chat, {
      text: `✅ @${target.split("@")[0]} a reçu ${montant.toLocaleString()} 💎 !`,
      mentions: [target]
    }, { quoted: m });
  }
};