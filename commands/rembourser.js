const fs = require("fs");
const path = require("path");

const ARGENT_PATH = path.join(__dirname, "../data/banque.json");
const PRETS_PATH = path.join(__dirname, "../data/prets.json");

function loadArgent() {
  if (!fs.existsSync(ARGENT_PATH)) return {};
  return JSON.parse(fs.readFileSync(ARGENT_PATH));
}

function saveArgent(data) {
  fs.writeFileSync(ARGENT_PATH, JSON.stringify(data, null, 2));
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
  name: "rembourser",
  category: "UNIROLIST",
  description: "Rembourser un prêt à un autre joueur",
  allowedForAll: true,

  async execute(riza, m, args) {
    const prets = loadPrets();
    const sender = m.sender;

    // Trouver les prêts où l'utilisateur est emprunteur
    let mesPrets = [];

    Object.entries(prets).forEach(([preteur, listePrets]) => {
      Object.entries(listePrets).forEach(([pretId, pret]) => {
        if (pret.emprunteur === sender && pret.statut === "en_cours") {
          mesPrets.push({
            preteur: preteur,
            pretId: pretId,
            ...pret
          });
        }
      });
    });

    if (mesPrets.length === 0) {
      return riza.sendMessage(m.chat, {
        text: "💰 *REMBOURSEMENT*\n══════════════════\n❌ Tu n'as aucun prêt en cours à rembourser."
      }, { quoted: m });
    }

    let texte = `💰 *MES PRÊTS À REMBOURSER*\n══════════════════\n\n`;

    mesPrets.forEach((pret, index) => {
      const dateEcheance = new Date(pret.dateEcheance);
      const aujourdhui = new Date();
      const joursRestants = Math.ceil((dateEcheance - aujourdhui) / (1000 * 60 * 60 * 24));
      
      texte += `${index + 1}. *${pret.montant.toLocaleString()} ${pret.symbole}*\n`;
      texte += `   👤 À: @${pret.preteur.split("@")[0]}\n`;
      texte += `   📅 Échéance: ${dateEcheance.toLocaleDateString()}\n`;
      texte += `   ⏰ Jours restants: ${joursRestants > 0 ? joursRestants : 'DÉPASSÉ'}\n\n`;
    });

    texte += `══════════════════\n*Choisis le prêt à rembourser (1-${mesPrets.length}) :*`;

    const menuMsg = await riza.sendMessage(m.chat, { text: texte }, { quoted: m });
    let lastMessage = menuMsg;
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
      const choix = parseInt(content.trim()) - 1;

      if (choix >= 0 && choix < mesPrets.length) {
        const pretSelectionne = mesPrets[choix];
        await effectuerRemboursement(riza, msg, pretSelectionne);
      } else {
        await riza.sendMessage(m.chat, {
          text: "❌ Choix invalide. Remboursement annulé."
        }, { quoted: msg });
      }

      sessionActive = false;
      riza.ev.off("messages.upsert", listener);
    };

    riza.ev.on("messages.upsert", listener);
  }
};

// Fonction pour effectuer le remboursement
async function effectuerRemboursement(riza, m, pret) {
  const banque = loadArgent();
  const compteEmprunteur = initCompteSiNécessaire(banque, m.sender);
  const comptePreteur = initCompteSiNécessaire(banque, pret.preteur);

  // Vérifier que l'emprunteur a assez d'argent
  if (compteEmprunteur[pret.devise] < pret.montantRestant) {
    return riza.sendMessage(m.chat, {
      text: `❌ Tu n'as pas assez de ${pret.symbole} pour rembourser ce prêt.\n\nSolde nécessaire: ${pret.montantRestant.toLocaleString()} ${pret.symbole}\nTon solde: ${compteEmprunteur[pret.devise].toLocaleString()} ${pret.symbole}`
    }, { quoted: m });
  }

  // Effectuer le remboursement
  compteEmprunteur[pret.devise] -= pret.montantRestant;
  comptePreteur[pret.devise] += pret.montantRestant;

  // Marquer le prêt comme remboursé
  const prets = loadPrets();
  prets[pret.preteur][pret.pretId].statut = "rembourse";
  prets[pret.preteur][pret.pretId].dateRemboursement = new Date().toISOString();

  saveArgent(banque);
  savePrets(prets);

  await riza.sendMessage(m.chat, {
    text: `✅ *PRÊT REMBOURSÉ*\n══════════════════\n💸 *Montant:* ${pret.montantRestant.toLocaleString()} ${pret.symbole}\n👤 *À:* @${pret.preteur.split("@")[0]}\n📅 *Prêt émis le:* ${new Date(pret.dateEmission).toLocaleDateString()}\n\n🎉 Remboursement effectué avec succès !`,
    mentions: [pret.preteur]
  }, { quoted: m });
}