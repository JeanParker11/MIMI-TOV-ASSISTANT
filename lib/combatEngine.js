const fs = require('fs');
const path = require('path');

const FICHES_PATH = path.join(__dirname, '../data/fiches.json');
const SOCIAL_PATH = path.join(__dirname, '../data/social.json');

/**
 * Charge les données nécessaires au combat
 */
function loadCombatData() {
  const fiches = JSON.parse(fs.readFileSync(FICHES_PATH, 'utf-8'));
  const socials = JSON.parse(fs.readFileSync(SOCIAL_PATH, 'utf-8'));
  return { fiches, socials };
}

/**
 * Normalise le nom d'une faction
 */
function normaliserFaction(faction) {
  if (!faction) return 'ares';
  return faction.toLowerCase()
    .replace(/è/g, 'e')
    .replace(/é/g, 'e')
    .replace(/ê/g, 'e')
    .replace(/à/g, 'a')
    .replace(/â/g, 'a')
    .trim();
}

/**
 * Obtient les limites maximales par faction
 * @param {string} faction - Nom de la faction
 * @returns {Object} - {vMax, coupMax, magieMax}
 */
function getLimitesFaction(faction) {
  const factionNorm = normaliserFaction(faction);
  
  const limites = {
    'hermes': { vMax: 9, coupMax: 7, magieMax: 7 },
    'ares': { vMax: 8, coupMax: 8, magieMax: 8 },
    'hecate': { vMax: 7, coupMax: 7, magieMax: 9 },
    'atlas': { vMax: 7, coupMax: 9, magieMax: 7 }
  };

  return limites[factionNorm] || limites['ares'];
}

/**
 * Calcule la résistance par zone corporelle
 * @param {number} forceMax - Force maximale du personnage
 * @param {string} faction - Faction du personnage
 * @returns {Object} - {tete, torse, jambeG, jambeD, brasG, brasD}
 */
function calculerResistanceZones(forceMax, faction) {
  const factionNorm = normaliserFaction(faction);
  
  // Calcul de base (en pourcentage de la Force max)
  let rs = {
    tete: Math.round(forceMax * 0.20),
    torse: Math.round(forceMax * 0.35),
    jambeG: Math.round(forceMax * 0.15),
    jambeD: Math.round(forceMax * 0.15),
    brasG: Math.round(forceMax * 0.075),
    brasD: Math.round(forceMax * 0.075)
  };

  // Modificateurs de faction
  if (factionNorm === 'atlas') {
    // Atlas : +15% sur toutes les Rs
    for (const zone in rs) {
      rs[zone] = Math.round(rs[zone] * 1.15);
    }
  } else if (factionNorm === 'hermes') {
    // Hermès : -10% sur toutes les Rs
    for (const zone in rs) {
      rs[zone] = Math.round(rs[zone] * 0.90);
    }
  }

  return rs;
}

/**
 * Calcule le temps de réaction selon la vitesse
 * @param {number} vitesse - Vitesse en m/s
 * @returns {number} - Temps de réaction en secondes
 */
function calculerTempsReaction(vitesse) {
  const tempsReaction = {
    9: 0.2,
    8: 0.3,
    7: 0.4,
    6: 0.5,
    5: 0.6
  };
  return tempsReaction[vitesse] || 0.7;
}

/**
 * Résout un combat Corps vs Corps
 * @param {number} forceUtilisee - Force investie dans l'attaque
 * @param {number} rsZone - Résistance de la zone ciblée
 * @param {string} attaquantFaction - Faction de l'attaquant
 * @param {string} defenseurFaction - Faction du défenseur
 * @returns {Object} - Résultat du combat
 */
function resoudreCorpsVsCorps(forceUtilisee, rsZone, attaquantFaction, defenseurFaction) {
  let resultat = {
    type: '',
    degatsDefenseur: 0,
    pertePFAttaquant: forceUtilisee,
    pertePFDefenseur: forceUtilisee,
    degradationRs: 0,
    degatsRecul: 0,
    testEtourdissement: false,
    coupCritique: false
  };

  // Coup critique (Force > Rs)
  if (forceUtilisee > rsZone) {
    resultat.type = 'critique';
    resultat.degatsDefenseur = forceUtilisee;
    resultat.coupCritique = true;
    
    // Test d'étourdissement si coup >= 7
    if (forceUtilisee >= 7) {
      resultat.testEtourdissement = true;
    }
  }
  // Parade réussie (Force = Rs)
  else if (forceUtilisee === rsZone) {
    resultat.type = 'parade';
    resultat.degatsDefenseur = 0;
    
    // La Rs baisse de 1 (sauf pour Arès en Éveil)
    if (normaliserFaction(defenseurFaction) !== 'ares') {
      resultat.degradationRs = 1;
    }
  }
  // Coup faible (Force < Rs)
  else {
    resultat.type = 'faible';
    resultat.degatsDefenseur = 0;
    resultat.degatsRecul = rsZone - forceUtilisee;
  }

  return resultat;
}

/**
 * Résout un combat Arme Contondante
 * @param {number} forceUtilisee - Force investie
 * @param {number} rsArme - Résistance de l'arme
 * @param {number} rsCible - Résistance de la cible
 * @returns {Object} - Résultat du combat
 */
function resoudreArmeContondante(forceUtilisee, rsArme, rsCible) {
  let resultat = {
    type: '',
    armeBrisee: false,
    degats: 0,
    degatsRecul: 0,
    usureArme: 0
  };

  // Étape 1 : Vérification de surcharge
  if (forceUtilisee > 2 * rsArme) {
    resultat.type = 'surcharge';
    resultat.armeBrisee = true;
    return resultat;
  }

  // Étape 2 : Résolution de l'impact
  if (rsArme < rsCible) {
    // Arme trop faible
    resultat.type = 'arme_faible';
    resultat.armeBrisee = true;
    resultat.degatsRecul = rsCible - rsArme;
  } else if (rsArme > rsCible) {
    // Arme supérieure
    resultat.type = 'arme_superieure';
    resultat.degats = rsArme + forceUtilisee;
    resultat.usureArme = 1;
    
    // Effet "Écrasement" : +20% de la Rs de l'arme
    resultat.degats += Math.round(rsArme * 0.20);
  } else {
    // Égalité
    resultat.type = 'egalite';
    resultat.usureArme = 2;
  }

  return resultat;
}

/**
 * Résout un combat Arme Tranchante
 * @param {number} forceUtilisee - Force investie
 * @param {number} rsArme - Résistance de l'arme
 * @param {number} rsZone - Résistance de la zone ciblée
 * @param {string} gradeArme - Grade de l'arme (E, D, C, B, A, S)
 * @returns {Object} - Résultat du combat
 */
function resoudreArmeTranchante(forceUtilisee, rsArme, rsZone, gradeArme) {
  // Pénétration d'armure selon le grade
  const penetration = {
    'E': 0.10,
    'D': 0.25,
    'C': 0.40,
    'B': 0.60,
    'A': 0.80,
    'S': 1.00
  };

  const penCoef = penetration[gradeArme.toUpperCase()] || 0.10;
  const rsEffective = Math.round(rsZone * (1 - penCoef));

  let resultat = {
    type: '',
    degats: 0,
    saignement: false,
    hemorragie: false,
    penCoef: penCoef
  };

  const forceImpact = forceUtilisee + rsArme;

  if (forceImpact > rsEffective) {
    resultat.type = 'critique';
    resultat.degats = forceImpact;
    resultat.saignement = true; // 5% des PV max au prochain tour
  } else if (forceImpact === rsEffective) {
    resultat.type = 'parade';
    resultat.degats = Math.round(forceImpact * 0.5);
  } else {
    resultat.type = 'faible';
    resultat.degats = 0;
  }

  return resultat;
}

/**
 * Résout un combat Arme Perforante
 * @param {number} forceUtilisee - Force investie
 * @param {number} rsArme - Résistance de l'arme
 * @param {number} rsZone - Résistance de la zone ciblée
 * @returns {Object} - Résultat du combat
 */
function resoudreArmePerforante(forceUtilisee, rsArme, rsZone) {
  let resultat = {
    type: '',
    degats: 0,
    ricochet: false,
    implantation: false,
    armeBrisee: false
  };

  const forceImpact = forceUtilisee + rsArme;

  // Condition d'engagement : Force > 10% de Rs_Zone
  if (forceImpact <= rsZone * 0.10) {
    resultat.type = 'ricochet';
    resultat.ricochet = true;
    resultat.degats = 0;
    return resultat;
  }

  // Résolution
  if (forceImpact > rsZone) {
    // Perforation
    resultat.type = 'perforation';
    resultat.degats = forceImpact;
  } else if (forceImpact === rsZone) {
    // Implantation
    resultat.type = 'implantation';
    resultat.implantation = true;
    resultat.degats = forceUtilisee;
  } else {
    // Rupture
    resultat.type = 'rupture';
    resultat.armeBrisee = true;
    resultat.degats = Math.round(rsArme * 0.10); // Dégâts de percussion
  }

  return resultat;
}

/**
 * Calcule les dégâts de percussion (projection)
 * @param {number} vitesse - Vitesse de projection en m/s
 * @param {number} force - Force de projection en Rs
 * @param {number} rsStructure - Résistance de la structure percutée
 * @returns {Object} - Résultat
 */
function calculerDegatsPercussion(vitesse, force, rsStructure) {
  let resultat = {
    applicable: false,
    degats: 0
  };

  // Minimums requis : 5 m/s et 7 Rs
  if (vitesse >= 5 && force >= 7) {
    resultat.applicable = true;
    resultat.degats = Math.round(rsStructure * 0.50); // 50% de la structure
  }

  return resultat;
}

/**
 * Test d'étourdissement
 * @param {number} esprit - Points d'esprit du défenseur
 * @param {boolean} coupCritique - Si c'est un coup critique
 * @param {boolean} pointSensible - Si c'est un point sensible
 * @param {number} coupsCritiquesRecus - Nombre de coups critiques déjà reçus
 * @returns {Object} - {etourdi: boolean, duree: number, chance: number}
 */
function testEtourdissement(esprit, coupCritique, pointSensible, coupsCritiquesRecus = 0) {
  let chance = 0;
  let duree = 0;
  let etourdi = false;

  if (pointSensible) {
    // Point sensible : 50% de base
    chance = esprit <= 20 ? 90 : 50;
    duree = 1;
    
    // Si c'est le deuxième coup sur le même point sensible
    if (coupsCritiquesRecus >= 1) {
      duree = 2;
      etourdi = true;
    } else {
      etourdi = Math.random() * 100 < chance;
    }
  } else if (coupCritique) {
    // Coup critique : 20% de base
    chance = esprit <= 20 ? 40 : 20;
    
    // Troisième coup critique automatique
    if (coupsCritiquesRecus >= 2) {
      etourdi = true;
      duree = 1;
    } else {
      etourdi = Math.random() * 100 < chance;
      duree = etourdi ? 1 : 0;
    }
  }

  return { etourdi, duree, chance };
}

/**
 * Vérifie l'état de peur
 * @param {number} espritActuel - Points d'esprit actuels
 * @param {number} espritMax - Points d'esprit maximum
 * @returns {Object} - {enPeur: boolean, reductionOffensive: number}
 */
function verifierEtatPeur(espritActuel, espritMax) {
  const pourcentage = (espritActuel / espritMax) * 100;
  
  if (pourcentage <= 10) {
    return {
      enPeur: true,
      reductionOffensive: 0.80 // Les offensives ne fonctionnent qu'à 20%
    };
  }

  return {
    enPeur: false,
    reductionOffensive: 0
  };
}

/**
 * Active l'éveil d'un combattant au tour 3
 * @param {Object} combattant - Objet du combattant
 * @param {number} tourActuel - Numéro du tour actuel
 * @returns {Object} - État de l'éveil
 */
function activerEveil(combattant, tourActuel) {
  const factionNorm = normaliserFaction(combattant.faction);
  
  // L'éveil commence au tour 3 et dure 2 tours (tours 3 et 4)
  if (tourActuel >= 3 && tourActuel <= 4) {
    combattant.eveilActif = true;
    combattant.tourEveil = tourActuel - 2; // Tour 1 ou 2 de l'éveil
    
    return {
      actif: true,
      faction: factionNorm,
      tourEveil: combattant.tourEveil
    };
  } else if (tourActuel > 4) {
    combattant.eveilActif = false;
    combattant.tourEveil = 0;
    
    // Nettoyer les effets d'éveil spécifiques
    if (factionNorm === 'ares' && combattant.eveilDebuffs) {
      combattant.eveilDebuffs = {}; // Reset des debuffs Ascendence
    }
  }
  
  return {
    actif: combattant.eveilActif || false,
    faction: factionNorm,
    tourEveil: combattant.tourEveil || 0
  };
}

/**
 * Applique les effets d'éveil selon la faction
 * @param {Object} combattant - Combattant en éveil
 * @param {string} contexte - Contexte d'application ('temps_reaction', 'attaque', 'defense', etc.)
 * @param {Object} data - Données contextuelles
 * @returns {Object} - Modifications à appliquer
 */
function appliquerEffetsEveil(combattant, contexte, data = {}) {
  if (!combattant.eveilActif) {
    return { modifie: false };
  }
  
  const factionNorm = normaliserFaction(combattant.faction);
  
  switch (factionNorm) {
    case 'hermes':
      // Hawkeye : Temps de réaction réduit de moitié
      if (contexte === 'temps_reaction' && data.champVisionDegage && data.postureEquilibree) {
        return {
          modifie: true,
          multiplicateurTempsReaction: 0.5
        };
      }
      break;
      
    case 'hecate':
      // Arcane Void : Annulation/réduction d'attaque magique
      if (contexte === 'defense_magie' && data.attaqueMagique) {
        const coutMana = data.coutSortEnnemi || 5;
        return {
          modifie: true,
          type: 'annulation_magie',
          coutMana: coutMana,
          reductionMin: 50,
          reductionMax: 100
        };
      }
      break;
      
    case 'ares':
      // Ascendence : +0.1s temps de réaction ennemi par coup réussi (max 3)
      if (contexte === 'coup_reussi') {
        if (!combattant.eveilDebuffs) {
          combattant.eveilDebuffs = {};
        }
        const cibleId = data.adversaireId;
        if (!combattant.eveilDebuffs[cibleId]) {
          combattant.eveilDebuffs[cibleId] = 0;
        }
        if (combattant.eveilDebuffs[cibleId] < 3) {
          combattant.eveilDebuffs[cibleId]++;
          return {
            modifie: true,
            debuffTempsReaction: combattant.eveilDebuffs[cibleId] * 0.1
          };
        }
      } else if (contexte === 'obtenir_debuff' && data.attaquantId) {
        const debuff = combattant.eveilDebuffs?.[data.attaquantId] || 0;
        return {
          modifie: debuff > 0,
          debuffTempsReaction: debuff * 0.1
        };
      }
      break;
      
    case 'atlas':
      // Colossus Inertia : Super armure contre attaques ≤ 15Rs
      if (contexte === 'encaissement_attaque') {
        const forceAttaque = data.forceAttaque || 0;
        if (forceAttaque <= 15) {
          return {
            modifie: true,
            immuniteInterruption: true,
            immuniteProjection: true,
            superArmure: true
          };
        }
      }
      break;
  }
  
  return { modifie: false };
}

/**
 * Calcule le temps de réaction avec effets d'éveil
 * @param {number} vitesse - Vitesse en m/s
 * @param {Object} combattant - Objet du combattant (optionnel)
 * @param {Object} data - Données contextuelles
 * @returns {number} - Temps de réaction final en secondes
 */
function calculerTempsReactionAvecEveil(vitesse, combattant = null, data = {}) {
  let tempsBase = calculerTempsReaction(vitesse);
  
  if (combattant && combattant.eveilActif) {
    const effetsEveil = appliquerEffetsEveil(combattant, 'temps_reaction', data);
    if (effetsEveil.modifie) {
      tempsBase *= effetsEveil.multiplicateurTempsReaction;
    }
    
    // Vérifier si le combattant subit un debuff Ascendence
    if (data.attaquantId) {
      const debuffCheck = appliquerEffetsEveil(combattant, 'obtenir_debuff', data);
      if (debuffCheck.modifie) {
        tempsBase += debuffCheck.debuffTempsReaction;
      }
    }
  }
  
  return tempsBase;
}

module.exports = {
  loadCombatData,
  normaliserFaction,
  getLimitesFaction,
  calculerResistanceZones,
  calculerTempsReaction,
  calculerTempsReactionAvecEveil,
  resoudreCorpsVsCorps,
  resoudreArmeContondante,
  resoudreArmeTranchante,
  resoudreArmePerforante,
  calculerDegatsPercussion,
  testEtourdissement,
  verifierEtatPeur,
  activerEveil,
  appliquerEffetsEveil
};
