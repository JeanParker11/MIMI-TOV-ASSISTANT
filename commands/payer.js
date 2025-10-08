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

// Structure de données pour gérer les deux devises
function initCompteSiNécessaire(banque, jid) {
  if (!banque[jid]) {
    banque[jid] = {
      diamants: 0,
      rulith: 0,
      totalDiamantsRecus: 0,
      totalRulithRecus: 0
    };
  }
  return banque[jid];
}

module.exports = {
  name: "payer",
  category: "UNIROLIST",
  description: "Verse des 💎 ou des Ru à un membre enregistré",
  onlyAdmin: true,

  async execute(riza, m, args) {
    const target = m.mentionedJid?.[0] ||
                   m.message?.extendedTextMessage?.contextInfo?.participant;

    if (!target) {
      return riza.sendMessage(m.chat, {
        text: "❌ Mentionne ou répond à un joueur pour effectuer un paiement."
      }, { quoted: m });
    }

    // Détection de la devise
    const texte = args.join(" ").toLowerCase();
    let devise = "diamants";
    let symbole = "💎";
    
    if (texte.includes("ru") || texte.includes("rulith")) {
      devise = "rulith";
      symbole = "Ru";
    }

    // Extraction du montant
    const montantMatch = texte.match(/\d+/);
    if (!montantMatch) {
      return riza.sendMessage(m.chat, {
        text: `❌ Indique un montant valide à transférer (ex: .payer @membre 1000 ${symbole})`
      }, { quoted: m });
    }

    const montant = parseInt(montantMatch[0]);

    if (montant <= 0) {
      return riza.sendMessage(m.chat, {
        text: "❌ Le montant doit être supérieur à 0."
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

    // Initialisation des comptes si nécessaire
    const compteSender = initCompteSiNécessaire(banque, sender);
    const compteTarget = initCompteSiNécessaire(banque, target);

    const isOwner = Array.isArray(global.owner)
      ? global.owner.includes(sender) || global.owner.includes(sender.split("@")[0]) || global.owner.includes(`${sender.split("@")[0]}@lid`)
      : [sender, sender.split("@")[0], `${sender.split("@")[0]}@lid`].includes(global.owner?.toString());

    const sudoList = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/sudo.json"), "utf-8"));
    const isSudo = sudoList.includes(sender) || sudoList.includes(sender.split("@")[0]) || sudoList.includes(`${sender.split("@")[0]}@lid`);

    const isAdmin = m.key.fromMe || isSudo || isOwner;

    // 💰 Vérifie que l'utilisateur a assez d'argent (sauf si admin/sudo)
    if (!isAdmin && compteSender[devise] < montant) {
      return riza.sendMessage(m.chat, {
        text: `❌ Tu n'as pas assez de ${symbole} pour effectuer ce paiement.`
      }, { quoted: m });
    }

    // 💸 Retire l'argent au sender sauf s'il est admin
    if (!isAdmin) {
      compteSender[devise] -= montant;
    }

    // ➕ Ajoute l'argent au receveur
    compteTarget[devise] += montant;
    
    // 📊 Mise à jour des totaux reçus
    if (devise === "diamants") {
      compteTarget.totalDiamantsRecus += montant;
    } else {
      compteTarget.totalRulithRecus += montant;
    }

    saveArgent(banque);

    await riza.sendMessage(m.chat, {
      text: `✅ @${target.split("@")[0]} a reçu ${montant.toLocaleString()} ${symbole} !`,
      mentions: [target]
    }, { quoted: m });
  }
};