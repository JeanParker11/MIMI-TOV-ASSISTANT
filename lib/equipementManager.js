const fs = require('fs');
const path = require('path');

const ARMES_PATH = path.join(__dirname, '../data/armes.json');
const FICHES_PATH = path.join(__dirname, '../data/fiches.json');
const SOCIAL_PATH = path.join(__dirname, '../data/social.json');

/**
 * Charge la base de données des armes
 */
function loadArmes() {
  if (!fs.existsSync(ARMES_PATH)) {
    fs.writeFileSync(ARMES_PATH, JSON.stringify({}, null, 2));
    return {};
  }
  return JSON.parse(fs.readFileSync(ARMES_PATH, 'utf-8'));
}

/**
 * Sauvegarde la base de données des armes
 */
function saveArmes(data) {
  fs.writeFileSync(ARMES_PATH, JSON.stringify(data, null, 2));
}

/**
 * Charge les fiches des joueurs
 */
function loadFiches() {
  if (!fs.existsSync(FICHES_PATH)) return {};
  return JSON.parse(fs.readFileSync(FICHES_PATH, 'utf-8'));
}

/**
 * Charge les données sociales (faction)
 */
function loadSocial() {
  if (!fs.existsSync(SOCIAL_PATH)) return {};
  return JSON.parse(fs.readFileSync(SOCIAL_PATH, 'utf-8'));
}

/**
 * Normalise le nom d'une faction
 */
function normaliserFaction(faction) {
  if (!faction || typeof faction !== 'string') return 'inconnue';
  
  return faction.toLowerCase()
    .replace(/è/g, 'e')
    .replace(/é/g, 'e')
    .replace(/ê/g, 'e')
    .replace(/à/g, 'a')
    .replace(/â/g, 'a')
    .trim();
}

/**
 * Vérifie si un joueur peut équiper une arme
 * @param {string} factionDuJoueur - Faction du joueur
 * @param {Object} factionDeLarme - Objet faction de l'arme {allowed: [], excluded: []}
 * @returns {boolean} - true si autorisé, false sinon
 */
function verifierEquipement(factionDuJoueur, factionDeLarme) {
  const factionJoueurNorm = normaliserFaction(factionDuJoueur);
  
  // Vérification de la structure
  if (!factionDeLarme || !factionDeLarme.allowed) {
    return false;
  }

  const allowed = Array.isArray(factionDeLarme.allowed) 
    ? factionDeLarme.allowed 
    : [factionDeLarme.allowed];
  const excluded = Array.isArray(factionDeLarme.excluded) 
    ? factionDeLarme.excluded 
    : [];

  // Cas 1 : L'arme est universelle ("Toutes")
  if (allowed.some(f => normaliserFaction(f) === 'toutes')) {
    // Vérifier si le joueur est spécifiquement exclu
    if (excluded.some(f => normaliserFaction(f) === factionJoueurNorm)) {
      return false; // Accès refusé, car exclu
    }
    return true; // Accès autorisé, car universel et non exclu
  }

  // Cas 2 : L'arme est réservée à des factions spécifiques
  if (allowed.some(f => normaliserFaction(f) === factionJoueurNorm)) {
    return true; // Accès autorisé, car listé
  }

  return false; // Accès refusé, car non listé
}

/**
 * Calcule les statistiques d'une arme selon sa résistance
 * @param {Object} arme - L'objet arme
 * @returns {Object} - Statistiques calculées
 */
function calculerStatsArme(arme) {
  const rs = arme.resistance || 0;
  let grade = 'E';
  let penetrationArmure = 10;

  // Détermination du grade et de la pénétration d'armure
  if (rs >= 1 && rs <= 5) {
    grade = 'E';
    penetrationArmure = 10;
  } else if (rs >= 6 && rs <= 15) {
    grade = 'D';
    penetrationArmure = 25;
  } else if (rs >= 16 && rs <= 25) {
    grade = 'C';
    penetrationArmure = 40;
  } else if (rs >= 26 && rs <= 35) {
    grade = 'B';
    penetrationArmure = 60;
  } else if (rs >= 36 && rs <= 45) {
    grade = 'A';
    penetrationArmure = 80;
  } else if (rs >= 46 && rs <= 100) {
    grade = 'S';
    penetrationArmure = 100;
  }

  return {
    grade,
    penetrationArmure,
    resistance: rs
  };
}

/**
 * Équipe une arme à un joueur
 * @param {string} jid - JID du joueur
 * @param {string} armeId - ID de l'arme
 * @param {number} emplacementIndex - Index de l'emplacement (0, 1, ou 2)
 * @returns {Object} - {success: boolean, message: string}
 */
function equiperArme(jid, armeId, emplacementIndex = 0) {
  try {
    const armes = loadArmes();
    const fiches = loadFiches();
    const socials = loadSocial();

    // Vérifications
    if (!fiches[jid]) {
      return { success: false, message: "❌ Aucune fiche trouvée pour ce joueur." };
    }

    if (!socials[jid]) {
      return { success: false, message: "❌ Aucune donnée sociale trouvée." };
    }

    const arme = armes[armeId];
    if (!arme) {
      return { success: false, message: "❌ Arme introuvable." };
    }

    const factionJoueur = socials[jid].faction;
    
    // Vérification des permissions
    if (!verifierEquipement(factionJoueur, arme.faction)) {
      return { 
        success: false, 
        message: `❌ Votre faction (${factionJoueur}) ne peut pas utiliser cette arme.` 
      };
    }

    // Vérification de l'inventaire
    if (arme.inventaire && arme.inventaire.actuel <= 0) {
      return { success: false, message: "❌ Cette arme n'est plus disponible en stock." };
    }

    // Équiper l'arme
    if (!fiches[jid].corps) {
      fiches[jid].corps = ["(vide)", "(vide)", "(vide)"];
    }

    if (emplacementIndex < 0 || emplacementIndex > 2) {
      emplacementIndex = 0;
    }

    fiches[jid].corps[emplacementIndex] = `${arme.nom} [${arme.rang}]`;

    // Sauvegarder
    fs.writeFileSync(FICHES_PATH, JSON.stringify(fiches, null, 2));

    // Décrémenter l'inventaire si applicable
    if (arme.inventaire && arme.inventaire.actuel > 0) {
      arme.inventaire.actuel--;
      saveArmes(armes);
    }

    const stats = calculerStatsArme(arme);

    return {
      success: true,
      message: `✅ **${arme.nom}** équipée !\n\n` +
               `📊 **Grade**: ${stats.grade}\n` +
               `🛡️ **Résistance**: ${stats.resistance} Rs\n` +
               `⚔️ **Type**: ${arme.type}\n` +
               `🎯 **Pénétration d'armure**: ${stats.penetrationArmure}%`,
      arme: arme,
      stats: stats
    };

  } catch (error) {
    console.error("❌ Erreur equiperArme:", error);
    return { success: false, message: "❌ Erreur lors de l'équipement de l'arme." };
  }
}

/**
 * Retire une arme d'un joueur
 * @param {string} jid - JID du joueur
 * @param {number} emplacementIndex - Index de l'emplacement (0, 1, ou 2)
 * @returns {Object} - {success: boolean, message: string}
 */
function retirerArme(jid, emplacementIndex = 0) {
  try {
    const fiches = loadFiches();

    if (!fiches[jid]) {
      return { success: false, message: "❌ Aucune fiche trouvée pour ce joueur." };
    }

    if (!fiches[jid].corps || !fiches[jid].corps[emplacementIndex]) {
      return { success: false, message: "❌ Aucune arme à cet emplacement." };
    }

    const armeRetiree = fiches[jid].corps[emplacementIndex];
    fiches[jid].corps[emplacementIndex] = "(vide)";

    fs.writeFileSync(FICHES_PATH, JSON.stringify(fiches, null, 2));

    return {
      success: true,
      message: `✅ **${armeRetiree}** retirée de l'emplacement ${emplacementIndex + 1}.`
    };

  } catch (error) {
    console.error("❌ Erreur retirerArme:", error);
    return { success: false, message: "❌ Erreur lors du retrait de l'arme." };
  }
}

/**
 * Obtient toutes les armes disponibles pour une faction
 * @param {string} faction - Nom de la faction
 * @returns {Array} - Liste des armes disponibles
 */
function getArmesDisponibles(faction) {
  const armes = loadArmes();
  const armesDisponibles = [];

  for (const [id, arme] of Object.entries(armes)) {
    if (verifierEquipement(faction, arme.faction)) {
      armesDisponibles.push({
        id,
        ...arme,
        stats: calculerStatsArme(arme)
      });
    }
  }

  return armesDisponibles;
}

module.exports = {
  loadArmes,
  saveArmes,
  verifierEquipement,
  calculerStatsArme,
  equiperArme,
  retirerArme,
  getArmesDisponibles,
  normaliserFaction
};
