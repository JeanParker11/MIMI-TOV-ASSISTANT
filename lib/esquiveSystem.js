/**
 * SYSTÈME D'ESQUIVE COMPLET - VALORIA
 * Gère les calculs de temps de réaction, temps de mouvement et validation d'esquive
 * Basé sur la physique réelle avec timing précis
 */

const spatialSystem = require('./spatialSystem');

/**
 * Obtient le temps de réaction de base selon la vitesse
 * @param {number} vitesse - Statistique vitesse (1-10)
 * @returns {number} - Temps en secondes
 */
function obtenirTempsReactionBase(vitesse) {
  const tempsReaction = {
    9: 0.2,
    8: 0.3,
    7: 0.4,
    6: 0.5,
    5: 0.6
  };
  
  return tempsReaction[vitesse] || 0.7; // <=4 = 0.7s
}

/**
 * Calcule la vitesse de déplacement réelle en m/s
 * @param {Object} statsDefenseur - Stats du défenseur
 * @returns {number} - Vitesse en m/s
 */
function calculerVitesseDeplacementReelle(statsDefenseur) {
  // Formule basique : la vitesse représente les m/s
  // Peut être ajustée avec d'autres stats (Force, etc.)
  const vitesse = statsDefenseur.vitesse || 5;
  
  // Vitesse de déplacement = stat vitesse en m/s
  return Math.max(1, vitesse);
}

/**
 * Calcule le temps d'impact de l'attaque
 * @param {number} distance - Distance en mètres
 * @param {number} vitesseAttaque - Vitesse de l'attaque en m/s
 * @returns {number} - Temps d'impact en secondes
 */
function calculerTempsImpact(distance, vitesseAttaque) {
  if (vitesseAttaque <= 0) return 0;
  return distance / vitesseAttaque;
}

/**
 * Calcule le temps de mouvement d'esquive
 * @param {number} distanceEsquive - Distance à parcourir pour esquiver (généralement 1m)
 * @param {number} vitesseDeplacement - Vitesse de déplacement en m/s
 * @returns {number} - Temps de mouvement en secondes
 */
function calculerTempsMouvementEsquive(distanceEsquive, vitesseDeplacement) {
  if (vitesseDeplacement <= 0) return Infinity;
  return distanceEsquive / vitesseDeplacement;
}

/**
 * Calcule le temps de réaction final avec modificateurs
 * @param {Object} defenseur - Objet défenseur
 * @param {Object} contexte - {actionEnCours: boolean, eveilActif: boolean, etc.}
 * @returns {number} - Temps de réaction en secondes
 */
function calculerTempsReaction(defenseur, contexte = {}) {
  const vitesse = defenseur.statsActuelles?.vitesse || 5;
  let tempsBase = obtenirTempsReactionBase(vitesse);
  
  // Pénalité "En Action" : temps de réaction doublé
  if (contexte.actionEnCours) {
    tempsBase *= 2;
  }
  
  // Bonus d'éveil Hermès : Hawkeye (réduit de moitié)
  if (defenseur.eveilActif && defenseur.faction === 'Hermès') {
    const combatEngine = require('./combatEngine');
    const effetsEveil = combatEngine.appliquerEffetsEveil(defenseur, 'temps_reaction', {
      champVisionDegage: contexte.champVisionDegage !== false,
      postureEquilibree: contexte.postureEquilibree !== false
    });
    
    if (effetsEveil.modifie) {
      tempsBase *= effetsEveil.multiplicateurTempsReaction;
    }
  }
  
  // Debuff Arès Ascendence
  if (contexte.attaquantId && defenseur.eveilDebuffs) {
    const debuff = defenseur.eveilDebuffs[contexte.attaquantId] || 0;
    if (debuff > 0) {
      tempsBase += debuff * 0.1; // +0.1s par stack
    }
  }
  
  return tempsBase;
}

/**
 * Calcule le temps total d'esquive du défenseur
 * @param {Object} defenseur - Objet défenseur
 * @param {Object} contexte - Contexte de l'esquive
 * @returns {Object} - {tempsTotal: number, tempsReaction: number, tempsMouvement: number}
 */
function calculerTempsEsquiveTotal(defenseur, contexte = {}) {
  // Temps de réaction
  const tempsReaction = calculerTempsReaction(defenseur, contexte);
  
  // Temps de mouvement
  const distanceEsquive = contexte.distanceEsquive || 1; // Par défaut 1m
  const vitesseDeplacement = calculerVitesseDeplacementReelle(defenseur.statsActuelles || {});
  const tempsMouvement = calculerTempsMouvementEsquive(distanceEsquive, vitesseDeplacement);
  
  const tempsTotal = tempsReaction + tempsMouvement;
  
  return {
    tempsTotal: tempsTotal,
    tempsReaction: tempsReaction,
    tempsMouvement: tempsMouvement,
    vitesseDeplacement: vitesseDeplacement
  };
}

/**
 * Tente une esquive complète
 * @param {Object} attaquant - Objet attaquant
 * @param {Object} defenseur - Objet défenseur
 * @param {Object} action - Action/Arme utilisée avec vitesseAttaque
 * @param {Object} contexte - Contexte additionnel
 * @returns {Object} - Résultat de l'esquive
 */
function tenterEsquive(attaquant, defenseur, action, contexte = {}) {
  // 1. Calculer la distance entre attaquant et défenseur
  const distance = contexte.distance || spatialSystem.calculerDistanceArrondie(
    attaquant.position, 
    defenseur.position
  );
  
  // 2. Obtenir la vitesse de l'attaque
  const vitesseAttaque = action.vitesseAttaque || action.vitesse_attaque || 10; // m/s par défaut
  
  // 3. Calculer le temps d'impact
  const tempsImpact = calculerTempsImpact(distance, vitesseAttaque);
  
  // 4. Calculer le temps d'esquive total du défenseur
  const esquiveData = calculerTempsEsquiveTotal(defenseur, {
    actionEnCours: contexte.actionEnCours || false,
    champVisionDegage: contexte.champVisionDegage !== false,
    postureEquilibree: contexte.postureEquilibree !== false,
    attaquantId: attaquant.id,
    distanceEsquive: 1
  });
  
  // 5. LE VERDICT : Comparer les temps
  const esquiveReussie = esquiveData.tempsTotal < tempsImpact;
  
  // 6. Construire le résultat détaillé
  const resultat = {
    succes: esquiveReussie,
    tempsImpact: tempsImpact,
    tempsEsquiveTotal: esquiveData.tempsTotal,
    details: {
      distance: distance,
      vitesseAttaque: vitesseAttaque,
      tempsReaction: esquiveData.tempsReaction,
      tempsMouvement: esquiveData.tempsMouvement,
      vitesseDeplacement: esquiveData.vitesseDeplacement,
      margeTemps: tempsImpact - esquiveData.tempsTotal
    },
    message: esquiveReussie 
      ? `✓ Esquive réussie ! (Marge : ${(tempsImpact - esquiveData.tempsTotal).toFixed(2)}s)`
      : `✗ Esquive échouée ! (Trop lent de ${(esquiveData.tempsTotal - tempsImpact).toFixed(2)}s)`
  };
  
  return resultat;
}

/**
 * Vérifie les conditions spéciales d'esquive impossible
 * @param {Object} defenseur - Objet défenseur
 * @param {Object} action - Action utilisée
 * @returns {Object} - {possible: boolean, raison: string}
 */
function verifierConditionsEsquive(defenseur, action) {
  // Étourdi : impossible d'esquiver
  if (defenseur.statuts && defenseur.statuts.includes('Étourdi')) {
    return {
      possible: false,
      raison: "Le défenseur est étourdi et ne peut pas esquiver."
    };
  }
  
  // Immobilisé : impossible d'esquiver
  if (defenseur.statuts && defenseur.statuts.includes('Immobilisé')) {
    return {
      possible: false,
      raison: "Le défenseur est immobilisé."
    };
  }
  
  // Attaque trop rapide ou à bout portant
  if (action.esquiveImpossible) {
    return {
      possible: false,
      raison: "Cette attaque ne peut pas être esquivée."
    };
  }
  
  return {
    possible: true,
    raison: ""
  };
}

/**
 * Système d'esquive complet avec toutes les vérifications
 * @param {Object} attaquant - Objet attaquant
 * @param {Object} defenseur - Objet défenseur
 * @param {Object} action - Action/Arme utilisée
 * @param {Object} contexte - Contexte additionnel
 * @returns {Object} - Résultat complet
 */
function esquiveComplete(attaquant, defenseur, action, contexte = {}) {
  // Vérifier si l'esquive est possible
  const conditions = verifierConditionsEsquive(defenseur, action);
  
  if (!conditions.possible) {
    return {
      succes: false,
      impossible: true,
      message: conditions.raison,
      details: {}
    };
  }
  
  // Tenter l'esquive
  return tenterEsquive(attaquant, defenseur, action, contexte);
}

/**
 * Calcule le bonus de précision selon la distance et la portée optimale
 * @param {number} distance - Distance actuelle
 * @param {Object} arme - Objet arme avec porteeOptimale
 * @returns {number} - Modificateur de précision (1 = normal, <1 = malus, >1 = bonus)
 */
function calculerModificateurPrecision(distance, arme) {
  if (!arme.porteeOptimale) return 1;
  
  const porteeOpt = arme.porteeOptimale;
  
  // À portée optimale : bonus de précision
  if (distance >= porteeOpt.min && distance <= porteeOpt.max) {
    return 1.2; // +20% de précision
  }
  
  // Trop loin : malus
  if (distance > porteeOpt.max) {
    const malus = Math.min(0.5, 1 - (distance - porteeOpt.max) * 0.1);
    return Math.max(0.5, malus); // Minimum 50%
  }
  
  // Trop près : léger malus
  if (distance < porteeOpt.min) {
    return 0.85; // -15%
  }
  
  return 1;
}

module.exports = {
  obtenirTempsReactionBase,
  calculerVitesseDeplacementReelle,
  calculerTempsImpact,
  calculerTempsMouvementEsquive,
  calculerTempsReaction,
  calculerTempsEsquiveTotal,
  tenterEsquive,
  verifierConditionsEsquive,
  esquiveComplete,
  calculerModificateurPrecision
};
