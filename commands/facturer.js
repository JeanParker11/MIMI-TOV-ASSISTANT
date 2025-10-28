const fs = require("fs");
const path = require("path");

const ARGENT_PATH = path.join(__dirname, "../data/banque.json");
const FICHES_PATH = path.join(__dirname, "../data/fiches.json");
const BOUTIQUE_PATH = path.join(__dirname, "../data/boutique.json");

function loadArgent() {
  if (!fs.existsSync(ARGENT_PATH)) return {};
  const data = JSON.parse(fs.readFileSync(ARGENT_PATH));
  return migrerAnciennesDonnees(data);
}

function migrerAnciennesDonnees(banque) {
  let miseAJour = false;
  
  for (const [jid, solde] of Object.entries(banque)) {
    if (typeof solde === 'number') {
      banque[jid] = {
        diamants: solde,
        rulith: 0,
        totalDiamantsRecus: solde,
        totalRulithRecus: 0
      };
      miseAJour = true;
    }
  }
  
  if (miseAJour) {
    saveArgent(banque);
    console.log("[FACTURER] Migration des données vers la nouvelle structure effectuée.");
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

function loadBoutique() {
  if (!fs.existsSync(BOUTIQUE_PATH)) {
    const structureDefaut = {
      valoria: {
        diamants: 0,
        rulith: 0
      }
    };
    saveBoutique(structureDefaut);
    return structureDefaut;
  }
  return JSON.parse(fs.readFileSync(BOUTIQUE_PATH));
}

function saveBoutique(data) {
  fs.writeFileSync(BOUTIQUE_PATH, JSON.stringify(data, null, 2));
}

// Ajouter au trésor Valoria
function ajouterAuTresorValoria(montant, devise) {
  const boutique = loadBoutique();
  
  if (!boutique.valoria) {
    boutique.valoria = {
      diamants: 0,
      rulith: 0
    };
  }
  
  if (devise === "diamants") {
    boutique.valoria.diamants += montant;
  } else {
    boutique.valoria.rulith += montant;
  }
  
  saveBoutique(boutique);
}

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
  name: "facturer",
  category: "UNIROLIST",
  description: "Retire des 💎 ou des Ru à un membre enregistré (facturation)",
  onlyAdmin: true,

  async execute(riza, m, args) {
    const target = m.mentionedJid?.[0] ||
                   m.message?.extendedTextMessage?.contextInfo?.participant;

    if (!target) {
      return riza.sendMessage(m.chat, {
        text: "❌ Mentionne ou répond à un joueur pour effectuer une facturation."
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
        text: `❌ Indique un montant valide à facturer (ex: .facturer @membre 1000 ${symbole})`
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
        text: `❌ @${target.split("@")[0]} n'a pas de fiche enregistrée, impossible de facturer.`,
        mentions: [target]
      }, { quoted: m });
    }

    const banque = loadArgent();
    const compteTarget = initCompteSiNécessaire(banque, target);

    if (compteTarget[devise] < montant) {
      return riza.sendMessage(m.chat, {
        text: `❌ @${target.split("@")[0]} n'a pas assez de ${symbole} pour cette facture.`,
        mentions: [target]
      }, { quoted: m });
    }

    // 💸 Retirer l'argent du membre
    compteTarget[devise] -= montant;

    // 💰 Ajouter au trésor de Valoria
    ajouterAuTresorValoria(montant, devise);

    // 💾 Sauvegarder
    saveArgent(banque);

    await riza.sendMessage(m.chat, {
      text: `✅ Une facture de ${montant.toLocaleString()} ${symbole} a été prélevée à @${target.split("@")[0]}`,
      mentions: [target]
    }, { quoted: m });
  }
};