const fs = require("fs");
const path = require("path");

const ARGENT_PATH = path.join(__dirname, "../data/banque.json");
const FICHES_PATH = path.join(__dirname, "../data/fiches.json");
const PRETS_PATH = path.join(__dirname, "../data/prets.json");

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

function loadPrets() {
  if (!fs.existsSync(PRETS_PATH)) return {};
  return JSON.parse(fs.readFileSync(PRETS_PATH));
}

function savePrets(data) {
  fs.writeFileSync(PRETS_PATH, JSON.stringify(data, null, 2));
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
  name: "transfert",
  category: "UNIROLIST",
  description: "Transférer des 💎 ou des Ru à un autre joueur (prêt ou don)",
  allowedForAll: true,

  async execute(riza, m, args) {
    const target = m.mentionedJid?.[0] ||
                   m.message?.extendedTextMessage?.contextInfo?.participant;

    if (!target) {
      return riza.sendMessage(m.chat, {
        text: `💰 *TRANSFERT ENTRE JOUEURS*\n══════════════════\n❌ Mentionne ou répond à un joueur pour effectuer un transfert.\n\n*Exemple:* !transfert 1000 ru`
      }, { quoted: m });
    }

    const sender = m.sender;
    
    // Empêcher les transferts à soi-même
    if (target === sender) {
      return riza.sendMessage(m.chat, {
        text: "❌ Tu ne peux pas te transférer de l'argent à toi-même."
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
        text: `💰 *TRANSFERT ENTRE JOUEURS*\n══════════════════\n❌ Indique un montant valide.\n\n*Exemples:*\n!transfert 1000 ru\n!transfert 50 diamants\n\n*Devises disponibles:*\n💎 Diamants\n💰 Rulith (Ru)`
      }, { quoted: m });
    }

    const montant = parseInt(montantMatch[0]);

    if (montant <= 0) {
      return riza.sendMessage(m.chat, {
        text: "❌ Le montant doit être supérieur à 0."
      }, { quoted: m });
    }

    // Vérifier que le montant n'est pas trop élevé
    if (montant > 1000000 && devise === "rulith") {
      return riza.sendMessage(m.chat, {
        text: "❌ Le transfert maximum est de 1,000,000 Rulith."
      }, { quoted: m });
    }

    if (montant > 1000 && devise === "diamants") {
      return riza.sendMessage(m.chat, {
        text: "❌ Le transfert maximum est de 1,000 Diamants."
      }, { quoted: m });
    }

    const fiches = loadFiches();

    // Vérifier que l'envoyeur a une fiche
    if (!fiches[sender]) {
      return riza.sendMessage(m.chat, {
        text: "❌ Tu n'as pas de fiche enregistrée. Utilise `!enregistrer` avec un admin pour commencer."
      }, { quoted: m });
    }

    // Vérifier que le receveur a une fiche
    if (!fiches[target]) {
      return riza.sendMessage(m.chat, {
        text: `❌ @${target.split("@")[0]} n'a pas de fiche enregistrée, impossible de transférer.`,
        mentions: [target]
      }, { quoted: m });
    }

    const banque = loadArgent();

    // Initialisation des comptes
    const compteSender = initCompteSiNécessaire(banque, sender);
    const compteTarget = initCompteSiNécessaire(banque, target);

    // Vérifier que l'envoyeur a assez d'argent
    if (compteSender[devise] < montant) {
      return riza.sendMessage(m.chat, {
        text: `❌ Tu n'as pas assez de ${symbole} pour ce transfert.\n\nTon solde: ${compteSender[devise].toLocaleString()} ${symbole}`
      }, { quoted: m });
    }

    // Menu de choix : prêt ou don
    const menuTransfert = await riza.sendMessage(m.chat, {
      text: `💰 *TYPE DE TRANSFERT*\n══════════════════\n*Montant:* ${montant.toLocaleString()} ${symbole}\n*À:* @${target.split("@")[0]}\n\n*Choisis le type:*\n1. 🎁 *DON* (transfert définitif)\n2. 📝 *PRÊT* (avec remboursement)\n\n0. ❌ Annuler\n══════════════════\n*Choisis (1-2) :*`,
      mentions: [target]
    }, { quoted: m });

    let lastMessage = menuTransfert;
    let sessionActive = true;

    const listener = async ({ messages }) => {
      if (!sessionActive) return;

      const msg = messages[0];
      if (!msg.message) return;

      const from = msg.key.participant || msg.key.remoteJid;
      if (from !== sender) return;

      const context = msg.message?.extendedTextMessage?.contextInfo;
      if (!context || context.stanzaId !== lastMessage?.key?.id) return;

      const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const choix = content.trim();

      try {
        if (choix === "0") {
          await riza.sendMessage(m.chat, {
            text: "❌ Transfert annulé."
          }, { quoted: msg });
          sessionActive = false;
          riza.ev.off("messages.upsert", listener);
          return;
        }

        if (choix === "1") {
          // TRANSFERT DON
          await effectuerDon(riza, msg, sender, target, montant, devise, symbole);
          sessionActive = false;
          riza.ev.off("messages.upsert", listener);
          
        } else if (choix === "2") {
          // TRANSFERT PRÊT
          await demanderDetailsPret(riza, msg, sender, target, montant, devise, symbole);
          
        } else {
          await riza.sendMessage(m.chat, {
            text: "❌ Choix invalide. Transfert annulé."
          }, { quoted: msg });
          sessionActive = false;
          riza.ev.off("messages.upsert", listener);
        }
      } catch (error) {
        console.error("Erreur transfert:", error);
        await riza.sendMessage(m.chat, {
          text: "❌ Erreur lors du transfert."
        }, { quoted: msg });
        sessionActive = false;
        riza.ev.off("messages.upsert", listener);
      }
    };

    riza.ev.on("messages.upsert", listener);
  }
};

// Fonction pour effectuer un don
async function effectuerDon(riza, m, sender, target, montant, devise, symbole) {
  const banque = loadArgent();
  const compteSender = banque[sender];
  const compteTarget = banque[target];

  // Retirer l'argent de l'envoyeur
  compteSender[devise] -= montant;
  
  // Ajouter l'argent au receveur
  compteTarget[devise] += montant;
  
  // Mise à jour des totaux reçus
  if (devise === "diamants") {
    compteTarget.totalDiamantsRecus += montant;
  } else {
    compteTarget.totalRulithRecus += montant;
  }

  saveArgent(banque);

  await riza.sendMessage(m.chat, {
    text: `🎁 *DON EFFECTUÉ*\n══════════════════\n👤 *De:* @${sender.split("@")[0]}\n🎯 *À:* @${target.split("@")[0]}\n💸 *Montant:* ${montant.toLocaleString()} ${symbole}\n📋 *Type:* Don définitif\n\n✅ Transfert réussi !`,
    mentions: [sender, target]
  }, { quoted: m });
}

// Fonction pour demander les détails d'un prêt
async function demanderDetailsPret(riza, m, sender, target, montant, devise, symbole) {
  const detailsPretMsg = await riza.sendMessage(m.chat, {
    text: `📝 *DÉTAILS DU PRÊT*\n══════════════════\n*Montant:* ${montant.toLocaleString()} ${symbole}\n*À:* @${target.split("@")[0]}\n\n*Entrez le délai de remboursement (en jours) :*\n\n*Exemples:*\n- 7 (1 semaine)\n- 30 (1 mois)\n- 90 (3 mois)\n══════════════════\n*Délai en jours :*`,
    mentions: [target]
  }, { quoted: m });

  let lastMessage = detailsPretMsg;
  let sessionActive = true;

  const pretListener = async ({ messages }) => {
    if (!sessionActive) return;

    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.participant || msg.key.remoteJid;
    if (from !== sender) return;

    const context = msg.message?.extendedTextMessage?.contextInfo;
    if (!context || context.stanzaId !== lastMessage?.key?.id) return;

    const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    const delaiJours = parseInt(content.trim());

    if (isNaN(delaiJours) || delaiJours <= 0) {
      await riza.sendMessage(m.chat, {
        text: "❌ Délai invalide. Prêt annulé."
      }, { quoted: msg });
      sessionActive = false;
      riza.ev.off("messages.upsert", pretListener);
      return;
    }

    // Calculer la date d'échéance
    const dateEmission = new Date();
    const dateEcheance = new Date();
    dateEcheance.setDate(dateEcheance.getDate() + delaiJours);

    // Enregistrer le prêt
    const prets = loadPrets();
    const pretId = Date.now().toString();
    
    if (!prets[sender]) prets[sender] = {};
    
    prets[sender][pretId] = {
      emprunteur: target,
      montant: montant,
      devise: devise,
      symbole: symbole,
      dateEmission: dateEmission.toISOString(),
      dateEcheance: dateEcheance.toISOString(),
      delaiJours: delaiJours,
      statut: "en_cours",
      montantRestant: montant
    };

    savePrets(prets);

    // Effectuer le transfert
    const banque = loadArgent();
    const compteSender = banque[sender];
    const compteTarget = banque[target];

    compteSender[devise] -= montant;
    compteTarget[devise] += montant;
    
    if (devise === "diamants") {
      compteTarget.totalDiamantsRecus += montant;
    } else {
      compteTarget.totalRulithRecus += montant;
    }

    saveArgent(banque);

    await riza.sendMessage(m.chat, {
      text: `📝 *PRÊT ENREGISTRÉ*\n══════════════════\n👤 *Prêteur:* @${sender.split("@")[0]}\n🎯 *Emprunteur:* @${target.split("@")[0]}\n💸 *Montant:* ${montant.toLocaleString()} ${symbole}\n📅 *Échéance:* ${dateEcheance.toLocaleDateString()}\n⏰ *Délai:* ${delaiJours} jours\n\n⚠️ *Rappel:* Le remboursement devra être effectué avant la date d'échéance.`,
      mentions: [sender, target]
    }, { quoted: msg });

    sessionActive = false;
    riza.ev.off("messages.upsert", pretListener);
  };

  riza.ev.on("messages.upsert", pretListener);
}