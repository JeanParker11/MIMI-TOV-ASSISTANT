/**
 * SYSTÈME DE GESTION DES ÉQUIPEMENTS
 * Gère les armes, armures, durabilité et effets
 */

const fs = require('fs');
const path = require('path');

// Grades et leurs plages de stats
const GRADES = {
  E: { min: 1, max: 5 },
  D: { min: 6, max: 15 },
  C: { min: 15, max: 25 },
  B: { min: 26, max: 35 },
  A: { min: 36, max: 45 },
  S: { min: 46, max: 100 }
};

// Statuts de durabilité
const STATUTS_DURABILITE = {
  NEUF: { min: 91, max: 100, label: "Neuf", modificateur: 1.0 },
  PRESQUE_NEUF: { min: 70, max: 90, label: "Presque neuf", modificateur: 0.95 },
  BON_ETAT: { min: 30, max: 69, label: "Bon état", modificateur: 0.85 },
  USE: { min: 1, max: 29, label: "Usé", modificateur: 0.7 },
  CASSE: { min: 0, max: 0, label: "Cassé", modificateur: 0 }
};

/**
 * Calcule le statut de durabilité d'un équipement
 * @param {number} durabiliteActuelle - Durabilité actuelle
 * @param {number} durabiliteMax - Durabilité maximale
 * @returns {Object} - Statut avec label et modificateur
 */
function getStatutDurabilite(durabiliteActuelle, durabiliteMax) {
  const pourcentage = (durabiliteActuelle / durabiliteMax) * 100;
  
  for (const [key, statut] of Object.entries(STATUTS_DURABILITE)) {
    if (pourcentage >= statut.min && pourcentage <= statut.max) {
      return statut;
    }
  }
  
  return STATUTS_DURABILITE.CASSE;
}

/**
 * Applique l'usure à une arme selon l'utilisation
 * @param {Object} arme - Objet arme
 * @param {number} forceUtilisee - Force utilisée dans l'attaque
 * @param {number} resistanceCible - Résistance de la cible
 * @returns {Object} - Résultat de l'usure
 */
function appliquerUsureArme(arme, forceUtilisee, resistanceCible) {
  const result = {
    arme_brisee: false,
    usure_appliquee: 0,
    message: ""
  };
  
  // Vérification de surcharge (Force > 2 * Rs_Arme)
  if (forceUtilisee > 2 * arme.rs) {
    arme.durabilite_actuelle = 0;
    result.arme_brisee = true;
    result.message = `⚠️ ${arme.nom} se brise sous la force excessive!`;
    return result;
  }
  
  // Résolution selon la résistance
  if (arme.rs < resistanceCible) {
    // Arme trop faible - se brise
    arme.durabilite_actuelle = 0;
    result.arme_brisee = true;
    result.message = `💔 ${arme.nom} se brise contre la résistance!`;
  } else if (arme.rs > resistanceCible) {
    // Arme supérieure - perd 1 Rs d'usure
    arme.durabilite_actuelle = Math.max(0, arme.durabilite_actuelle - 1);
    result.usure_appliquee = 1;
    result.message = `⚔️ ${arme.nom} s'use légèrement (-1 durabilité)`;
  } else {
    // Égalité - perd 2 Rs d'usure
    arme.durabilite_actuelle = Math.max(0, arme.durabilite_actuelle - 2);
    result.usure_appliquee = 2;
    result.message = `⚔️ ${arme.nom} s'use (-2 durabilité)`;
  }
  
  // Vérifier si l'arme est cassée après usure
  if (arme.durabilite_actuelle === 0 && !result.arme_brisee) {
    result.arme_brisee = true;
    result.message += ` et se casse!`;
  }
  
  return result;
}

/**
 * Applique l'usure à une armure quand elle est touchée
 * @param {Object} armure - Objet armure
 * @param {number} forceImpact - Force de l'impact
 * @returns {Object} - Résultat de l'usure
 */
function appliquerUsureArmure(armure, forceImpact) {
  const result = {
    armure_brisee: false,
    usure_appliquee: 0,
    message: ""
  };
  
  // L'armure perd de la durabilité selon l'impact
  let usure = 1;
  
  if (forceImpact > armure.rs) {
    // Impact supérieur à la résistance : usure accrue
    usure = Math.ceil((forceImpact - armure.rs) / 10) + 1;
  }
  
  armure.durabilite_actuelle = Math.max(0, armure.durabilite_actuelle - usure);
  result.usure_appliquee = usure;
  
  if (armure.durabilite_actuelle === 0) {
    result.armure_brisee = true;
    result.message = `💔 ${armure.nom} se brise!`;
  } else {
    const statut = getStatutDurabilite(armure.durabilite_actuelle, armure.durabilite_max);
    result.message = `🛡️ ${armure.nom} absorbe l'impact (-${usure} durabilité, état: ${statut.label})`;
  }
  
  return result;
}

/**
 * Calcule les bonus d'une arme selon son état et son grade
 * @param {Object} arme - Objet arme
 * @returns {Object} - Bonus calculés
 */
function calculerBonusArme(arme) {
  const statut = getStatutDurabilite(arme.durabilite_actuelle, arme.durabilite_max);
  
  const bonus = {
    rs_effectif: Math.floor(arme.rs * statut.modificateur),
    degats_bonus: 0,
    effets: []
  };
  
  // Bonus selon le type d'arme
  switch (arme.type) {
    case 'contondante':
      bonus.degats_bonus = Math.floor(arme.rs * 0.15);
      bonus.effets.push('chance_etourdissement');
      break;
      
    case 'tranchante':
      bonus.degats_bonus = Math.floor(arme.rs * 0.2);
      bonus.effets.push('saignement');
      break;
      
    case 'perforante':
      bonus.degats_bonus = Math.floor(arme.rs * 0.25);
      bonus.effets.push('penetration_armure');
      break;
      
    case 'magique':
      bonus.degats_bonus = Math.floor(arme.rs * 0.1);
      if (arme.element) {
        bonus.effets.push(`degats_${arme.element}`);
      }
      break;
  }
  
  // Bonus selon le grade
  const gradeMultiplier = {
    'S': 1.5,
    'A': 1.3,
    'B': 1.15,
    'C': 1.0,
    'D': 0.9,
    'E': 0.8
  };
  
  bonus.degats_bonus = Math.floor(bonus.degats_bonus * (gradeMultiplier[arme.grade] || 1));
  
  return bonus;
}

/**
 * Calcule la résistance effective d'une armure
 * @param {Object} armure - Objet armure
 * @returns {number} - Résistance effective
 */
function calculerResistanceArmure(armure) {
  const statut = getStatutDurabilite(armure.durabilite_actuelle, armure.durabilite_max);
  return Math.floor(armure.rs * statut.modificateur);
}

/**
 * Vérifie si un joueur possède une arme spécifique
 * @param {string} userId - ID du joueur
 * @param {string} nomArme - Nom de l'arme
 * @returns {Object|null} - Arme si trouvée, null sinon
 */
function verifierPossessionArme(userId, nomArme) {
  const inventairePath = path.join(__dirname, '../data/inventaires.json');
  
  if (!fs.existsSync(inventairePath)) {
    return null;
  }
  
  const inventaires = JSON.parse(fs.readFileSync(inventairePath, 'utf8'));
  
  if (!inventaires[userId]) {
    return null;
  }
  
  const inventory = inventaires[userId];
  
  // Vérifier dans l'équipement actuel
  if (inventory.equipement_actuel.main_droite === nomArme || 
      inventory.equipement_actuel.main_gauche === nomArme) {
    // Trouver l'objet arme complet
    return inventory.armes.find(a => a.nom === nomArme);
  }
  
  return null;
}

/**
 * Obtient l'équipement complet d'un joueur
 * @param {string} userId - ID du joueur
 * @returns {Object} - Équipement complet avec détails
 */
function obtenirEquipementJoueur(userId) {
  const inventairePath = path.join(__dirname, '../data/inventaires.json');
  
  const equipement = {
    main_droite: null,
    main_gauche: null,
    armures: {
      tete: null,
      torse: null,
      bras: null,
      jambes: null
    },
    bonus_total: {
      resistance: {
        tete: 0,
        torse: 0,
        bras: 0,
        jambes: 0
      },
      degats: 0,
      effets: []
    }
  };
  
  if (!fs.existsSync(inventairePath)) {
    return equipement;
  }
  
  const inventaires = JSON.parse(fs.readFileSync(inventairePath, 'utf8'));
  
  if (!inventaires[userId]) {
    return equipement;
  }
  
  const inventory = inventaires[userId];
  
  // Récupérer les armes équipées
  if (inventory.equipement_actuel.main_droite) {
    equipement.main_droite = inventory.armes.find(
      a => a.nom === inventory.equipement_actuel.main_droite
    );
    
    if (equipement.main_droite) {
      const bonus = calculerBonusArme(equipement.main_droite);
      equipement.bonus_total.degats += bonus.degats_bonus;
      equipement.bonus_total.effets.push(...bonus.effets);
    }
  }
  
  if (inventory.equipement_actuel.main_gauche) {
    equipement.main_gauche = inventory.armes.find(
      a => a.nom === inventory.equipement_actuel.main_gauche
    );
    
    if (equipement.main_gauche) {
      const bonus = calculerBonusArme(equipement.main_gauche);
      equipement.bonus_total.degats += bonus.degats_bonus;
      equipement.bonus_total.effets.push(...bonus.effets);
    }
  }
  
  // Récupérer les armures équipées
  const zones = ['tete', 'torse', 'bras', 'jambes'];
  
  zones.forEach(zone => {
    if (inventory.equipement_actuel[zone]) {
      const armure = inventory.armures.find(
        a => a.nom === inventory.equipement_actuel[zone] && a.zone === zone
      );
      
      if (armure) {
        equipement.armures[zone] = armure;
        equipement.bonus_total.resistance[zone] += calculerResistanceArmure(armure);
      }
    }
  });
  
  return equipement;
}

/**
 * Détermine quelle main utilise le joueur pour une action
 * @param {string} texteAction - Texte de l'action du joueur
 * @param {Object} equipement - Équipement du joueur
 * @returns {string} - 'droite', 'gauche' ou 'aucune'
 */
function determinerMainUtilisee(texteAction, equipement) {
  const texteLower = texteAction.toLowerCase();
  
  // Recherche explicite de la main
  if (texteLower.includes('main droite') || texteLower.includes('droite')) {
    return 'droite';
  }
  
  if (texteLower.includes('main gauche') || texteLower.includes('gauche')) {
    return 'gauche';
  }
  
  // Si une arme est mentionnée
  if (equipement.main_droite && texteLower.includes(equipement.main_droite.nom.toLowerCase())) {
    return 'droite';
  }
  
  if (equipement.main_gauche && texteLower.includes(equipement.main_gauche.nom.toLowerCase())) {
    return 'gauche';
  }
  
  // Par défaut, utiliser la main dominante (droite) si équipée
  if (equipement.main_droite) {
    return 'droite';
  }
  
  if (equipement.main_gauche) {
    return 'gauche';
  }
  
  return 'aucune';
}

/**
 * Sauvegarde les changements d'équipement
 * @param {string} userId - ID du joueur
 * @param {Object} equipementModifie - Équipement modifié
 */
function sauvegarderEquipement(userId, equipementModifie) {
  const inventairePath = path.join(__dirname, '../data/inventaires.json');
  
  let inventaires = {};
  if (fs.existsSync(inventairePath)) {
    inventaires = JSON.parse(fs.readFileSync(inventairePath, 'utf8'));
  }
  
  if (!inventaires[userId]) {
    inventaires[userId] = {
      armes: [],
      armures: [],
      equipement_actuel: {
        main_droite: null,
        main_gauche: null,
        tete: null,
        torse: null,
        bras: null,
        jambes: null
      }
    };
  }
  
  // Mettre à jour les armes avec leur nouvelle durabilité
  if (equipementModifie.main_droite) {
    const index = inventaires[userId].armes.findIndex(
      a => a.nom === equipementModifie.main_droite.nom
    );
    if (index !== -1) {
      inventaires[userId].armes[index] = equipementModifie.main_droite;
    }
  }
  
  if (equipementModifie.main_gauche) {
    const index = inventaires[userId].armes.findIndex(
      a => a.nom === equipementModifie.main_gauche.nom
    );
    if (index !== -1) {
      inventaires[userId].armes[index] = equipementModifie.main_gauche;
    }
  }
  
  // Mettre à jour les armures
  ['tete', 'torse', 'bras', 'jambes'].forEach(zone => {
    if (equipementModifie.armures[zone]) {
      const index = inventaires[userId].armures.findIndex(
        a => a.nom === equipementModifie.armures[zone].nom
      );
      if (index !== -1) {
        inventaires[userId].armures[index] = equipementModifie.armures[zone];
      }
    }
  });
  
  fs.writeFileSync(inventairePath, JSON.stringify(inventaires, null, 2));
}

module.exports = {
  GRADES,
  STATUTS_DURABILITE,
  getStatutDurabilite,
  appliquerUsureArme,
  appliquerUsureArmure,
  calculerBonusArme,
  calculerResistanceArmure,
  verifierPossessionArme,
  obtenirEquipementJoueur,
  determinerMainUtilisee,
  sauvegarderEquipement
};
