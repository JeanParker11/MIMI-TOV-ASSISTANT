const fs = require("fs");
const path = require("path");

const BOUTIQUE_PATH = path.join(__dirname, "../data/boutique.json");

function loadBoutique() {
  if (!fs.existsSync(BOUTIQUE_PATH)) {
    // Créer une structure boutique par défaut si elle n'existe pas
    const structureDefaut = {
      valoria: {
        diamants: 0,
        rulith: 0,
        transactions: []
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

module.exports = {
  name: "caisse",
  category: "UNIROLIST",
  description: "Voir le trésor de Valoria",
  allowedForAll: false,

  async execute(riza, m, args) {
    const boutique = loadBoutique();
    const valoria = boutique.valoria || { diamants: 0, rulith: 0, transactions: [] };

    // Calculer les statistiques
    const transactions = valoria.transactions || [];
    const aujourdHui = new Date().toDateString();
    
    let revenusAujourdhui = {
      diamants: 0,
      rulith: 0
    };
    
    let revenusMois = {
      diamants: 0,
      rulith: 0
    };
    
    const moisActuel = new Date().getMonth();
    const anneeActuelle = new Date().getFullYear();

    transactions.forEach(trans => {
      const dateTrans = new Date(trans.date);
      
      // Revenus aujourd'hui
      if (dateTrans.toDateString() === aujourdHui) {
        if (trans.devise === "💎") {
          revenusAujourdhui.diamants += trans.montant;
        } else {
          revenusAujourdhui.rulith += trans.montant;
        }
      }
      
      // Revenus ce mois-ci
      if (dateTrans.getMonth() === moisActuel && dateTrans.getFullYear() === anneeActuelle) {
        if (trans.devise === "💎") {
          revenusMois.diamants += trans.montant;
        } else {
          revenusMois.rulith += trans.montant;
        }
      }
    });

    let texte = `🏛️ *TRÉSOR DE VALORIA* 🏛️\n`;
    texte += `═══════════════════\n\n`;
    
    // Solde actuel
    texte += `💰 *SOLDE ACTUEL*\n`;
    texte += `💎 Diamants: ${valoria.diamants?.toLocaleString() || 0}\n`;
    texte += `💰 Rulith: ${valoria.rulith?.toLocaleString() || 0}\n\n`;
    
    // Revenus du jour
    texte += `📊 *REVENUS AUJOURD'HUI*\n`;
    texte += `💎 Diamants: +${revenusAujourdhui.diamants.toLocaleString()}\n`;
    texte += `💰 Rulith: +${revenusAujourdhui.rulith.toLocaleString()}\n\n`;
    
    // Revenus du mois
    texte += `📈 *REVENUS CE MOIS*\n`;
    texte += `💎 Diamants: +${revenusMois.diamants.toLocaleString()}\n`;
    texte += `💰 Rulith: +${revenusMois.rulith.toLocaleString()}\n\n`;
    
    // Dernières transactions
    texte += `📋 *5 DERNIÈRES TRANSACTIONS*\n`;
    texte += `════════════════════\n`;
    
    const dernieresTransactions = transactions.slice(-5).reverse();
    
    if (dernieresTransactions.length === 0) {
      texte += `Aucune transaction enregistrée.\n`;
    } else {
      dernieresTransactions.forEach(trans => {
        const date = new Date(trans.date);
        const dateFormatee = date.toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        const typeIcon = getIconForType(trans.type);
        const joueurAbrege = trans.joueur ? trans.joueur.slice(0, 8) + '...' : 'Système';
        
        texte += `${typeIcon} ${dateFormatee}\n`;
        texte += `   ${trans.montant.toLocaleString()} ${trans.devise}\n`;
        texte += `   ${joueurAbrege} - ${trans.description || trans.article}\n\n`;
      });
    }
    
    texte += `═══════════════════\n`;
    texte += `💡 *Le trésor de Valoria sert à financer les événements et le développement du royaume.*`;

    await riza.sendMessage(m.chat, { text: texte }, { quoted: m });
  }
};

// Fonction pour obtenir l'icône selon le type de transaction
function getIconForType(type) {
  const icons = {
    'vente': '🛒',
    'taxe': '💸',
    'facturation': '📋',
    'conversion': '💱',
    'achat': '🛍️',
    'default': '💰'
  };
  
  return icons[type] || icons.default;
}