/**
 * SYSTÈME D'EFFETS DE STATUT
 * Gère tous les effets de statut élémentaires et autres altérations
 */

// Définition des effets élémentaires
const EFFETS_ELEMENTAIRES = {
  'Ignis': {
    nom: 'Brûlure',
    emoji: '🔥',
    degats_par_tour: 2,
    duree_base: 3,
    effet_secondaire: 'precision_reduite',
    description: 'Inflige 2 PV par tour et perturbe la précision',
    interaction: {
      'Sylvae': 'amplification', // Végétal amplifie le feu
      'Glacis': 'annulation'     // Glace annule le feu
    }
  },
  
  'Glacis': {
    nom: 'Gel',
    emoji: '❄️',
    ralentissement_vitesse: 1,
    duree_base: 2,
    effet_secondaire: 'gel_complet',
    description: 'Ralentit de -1 la vitesse, peut figer complètement',
    interaction: {
      'eau': 'gel_instantane',    // Si mouillé = figé 3 tours
      'Ignis': 'annulation'        // Feu annule la glace
    },
    resistance_faction: {
      'Atlas': 0.5  // Atlas résiste mieux au gel
    }
  },
  
  'Fulmis': {
    nom: 'Charge électrique',
    emoji: '⚡',
    degats_par_tour: 3,
    nombre_tours: 3,
    degats_total: 9,
    description: 'Inflige 3 PV par tour pendant 3 tours',
    interaction: {
      'eau': 'amplification',  // Si mouillé: 5 dégâts/tour au lieu de 3
      'metal': 'conduction'    // Se propage aux alliés proches avec armure métal
    }
  },
  
  'Sylvae': {
    nom: 'Empoisonnement végétal',
    emoji: '🌿',
    effet: 'vulnerabilite_feu',
    description: 'Réduit à 0 la tolérance au feu',
    duree_base: 4
  },
  
  'Aeris': {
    nom: 'Dispersion',
    emoji: '🌪️',
    effet: 'propagation',
    description: 'Propage et disperse les autres éléments',
    portee_propagation: 2  // 2 mètres autour
  }
};

// Autres effets de statut
const AUTRES_STATUTS = {
  'Paralysie': {
    emoji: '⚡',
    duree_base: 2,
    effet: 'annule_actions',
    description: 'Annule actions et déplacements pendant 2 tours',
    declencheurs: ['attaque_foudre', 'objet_paralysant', 'competence']
  },
  
  'Peur': {
    emoji: '😱',
    precision_malus: 0.5,  // -50% précision
    chance_fuite: 0.3,      // 30% de fuir au lieu d'attaquer
    duree_base: 2,
    description: 'Réduit la précision de 50% et peut causer la fuite'
  },
  
  'Souffle_coupe': {
    emoji: '💨',
    tours_skip: 1,
    description: 'Skip le prochain tour',
    declencheurs: ['projection_violente', 'coup_critique_torse']
  },
  
  'Saignement': {
    emoji: '🩸',
    degats_par_tour: 1,
    duree_base: 3,
    aggravation: true,  // Peut devenir hémorragie
    description: 'Perd 1 PV par tour, peut s\'aggraver'
  },
  
  'Hemorragie': {
    emoji: '🩸🩸',
    degats_par_tour: 3,
    duree_base: 5,
    fatal: true,  // Peut être mortel si non soigné
    description: 'Perd 3 PV par tour, potentiellement fatal'
  },
  
  'Etourdissement': {
    emoji: '💫',
    tours_skip: 1,
    defense_malus: 0.5,
    description: 'Skip 1 tour et défense réduite de 50%'
  },
  
  'Aveuglement': {
    emoji: '🌑',
    precision_malus: 0.8,  // -80% précision
    duree_base: 2,
    description: 'Précision réduite de 80%'
  },
  
  'Affaibli': {
    emoji: '🤒',
    stats_malus: 0.2,  // -20% sur toutes les stats
    duree_base: 3,
    description: 'Toutes les stats réduites de 20%'
  },
  
  'Immobilise': {
    emoji: '🔒',
    pm_disponibles: 0,
    duree_base: 2,
    description: 'Ne peut pas se déplacer'
  },
  
  'Silence': {
    emoji: '🤐',
    bloque_competences: true,
    duree_base: 2,
    description: 'Ne peut pas utiliser de compétences'
  }
};

/**
 * Applique un effet élémentaire à une cible
 * @param {Object} cible - Cible de l'effet
 * @param {string} element - Type d'élément
 * @param {number} intensite - Intensité de l'effet (1-3)
 * @param {Object} contexte - Contexte du combat
 * @returns {Object} - Résultat de l'application
 */
function appliquerEffetElementaire(cible, element, intensite = 1, contexte = {}) {
  const effet = EFFETS_ELEMENTAIRES[element];
  if (!effet) {
    return { succes: false, message: `Élément ${element} inconnu` };
  }
  
  // Initialiser les statuts élémentaires si nécessaire
  if (!cible.statuts_elementaires) {
    cible.statuts_elementaires = {};
  }
  
  // Vérifier les interactions
  let modificateur = 1;
  let message_interaction = '';
  
  // Interaction avec l'eau (pour Fulmis et Glacis)
  if (contexte.cible_mouillee || cible.statuts.includes('Mouillé')) {
    if (element === 'Fulmis') {
      modificateur = 1.67; // 5/3 pour passer de 3 à 5 dégâts
      message_interaction = ' (amplifié par l\'eau)';
    } else if (element === 'Glacis') {
      // Gel instantané
      cible.statuts.push('Figé');
      cible.tours_fige = 3;
      message_interaction = ' et fige la cible!';
    }
  }
  
  // Interaction entre éléments
  for (const [autreElement, statut] of Object.entries(cible.statuts_elementaires)) {
    if (statut.actif) {
      const interaction = effet.interaction?.[autreElement];
      if (interaction === 'annulation') {
        // Les deux effets s'annulent
        delete cible.statuts_elementaires[autreElement];
        delete cible.statuts_elementaires[element];
        return {
          succes: true,
          message: `${effet.emoji} ${effet.nom} et ${EFFETS_ELEMENTAIRES[autreElement].nom} s'annulent mutuellement!`
        };
      } else if (interaction === 'amplification') {
        modificateur *= 1.5;
        message_interaction = ' (effet amplifié)';
      }
    }
  }
  
  // Résistance de faction
  if (effet.resistance_faction && cible.faction) {
    const resistance = effet.resistance_faction[cible.faction];
    if (resistance) {
      modificateur *= resistance;
      message_interaction += ` (résistance ${cible.faction})`;
    }
  }
  
  // Appliquer l'effet
  cible.statuts_elementaires[element] = {
    actif: true,
    intensite: intensite,
    tours_restants: Math.ceil(effet.duree_base * intensite),
    degats_par_tour: Math.ceil((effet.degats_par_tour || 0) * modificateur),
    effet_applique: effet
  };
  
  // Ajouter au tableau de statuts pour l'affichage
  if (!cible.statuts.includes(element)) {
    cible.statuts.push(element);
  }
  
  return {
    succes: true,
    message: `${effet.emoji} ${effet.nom} appliqué${message_interaction}!`,
    duree: cible.statuts_elementaires[element].tours_restants,
    degats_prevus: cible.statuts_elementaires[element].degats_par_tour
  };
}

/**
 * Applique un statut non-élémentaire
 * @param {Object} cible - Cible du statut
 * @param {string} statut - Nom du statut
 * @param {number} duree - Durée en tours (optionnel)
 * @returns {Object} - Résultat
 */
function appliquerStatut(cible, statut, duree = null) {
  const effet = AUTRES_STATUTS[statut];
  if (!effet) {
    return { succes: false, message: `Statut ${statut} inconnu` };
  }
  
  // Vérifier si déjà présent
  if (cible.statuts.includes(statut)) {
    return { 
      succes: false, 
      message: `${effet.emoji} ${statut} déjà actif` 
    };
  }
  
  // Initialiser les statuts complexes si nécessaire
  if (!cible.statuts_complexes) {
    cible.statuts_complexes = {};
  }
  
  // Appliquer le statut
  cible.statuts.push(statut);
  cible.statuts_complexes[statut] = {
    actif: true,
    tours_restants: duree || effet.duree_base || 1,
    effet: effet
  };
  
  // Appliquer les effets immédiats
  let effets_immediats = [];
  
  if (effet.tours_skip) {
    cible.tours_a_skip = (cible.tours_a_skip || 0) + effet.tours_skip;
    effets_immediats.push(`skip ${effet.tours_skip} tour(s)`);
  }
  
  if (effet.precision_malus) {
    cible.modificateurs_precision = (cible.modificateurs_precision || 1) * (1 - effet.precision_malus);
    effets_immediats.push(`précision -${effet.precision_malus * 100}%`);
  }
  
  if (effet.defense_malus) {
    cible.modificateurs_defense = (cible.modificateurs_defense || 1) * (1 - effet.defense_malus);
    effets_immediats.push(`défense -${effet.defense_malus * 100}%`);
  }
  
  if (effet.pm_disponibles === 0) {
    cible.points_mouvement.actuels = 0;
    effets_immediats.push('immobilisé');
  }
  
  if (effet.bloque_competences) {
    cible.peut_utiliser_competences = false;
    effets_immediats.push('compétences bloquées');
  }
  
  return {
    succes: true,
    message: `${effet.emoji} ${statut} appliqué! (${effet.description})`,
    effets_immediats: effets_immediats,
    duree: cible.statuts_complexes[statut].tours_restants
  };
}

/**
 * Traite les effets de statut à chaque tour
 * @param {Object} joueur - Joueur affecté
 * @returns {Object} - Résumé des effets appliqués
 */
function traiterEffetsStatut(joueur) {
  const resultats = {
    degats_totaux: 0,
    messages: [],
    statuts_expires: []
  };
  
  // Traiter les effets élémentaires
  if (joueur.statuts_elementaires) {
    for (const [element, statut] of Object.entries(joueur.statuts_elementaires)) {
      if (!statut.actif) continue;
      
      // Appliquer les dégâts
      if (statut.degats_par_tour > 0) {
        joueur.statsActuelles.pv -= statut.degats_par_tour;
        resultats.degats_totaux += statut.degats_par_tour;
        resultats.messages.push(
          `${statut.effet_applique.emoji} ${statut.effet_applique.nom}: -${statut.degats_par_tour} PV`
        );
      }
      
      // Réduire la durée
      statut.tours_restants--;
      
      // Vérifier l'expiration
      if (statut.tours_restants <= 0) {
        statut.actif = false;
        resultats.statuts_expires.push(element);
        
        // Retirer du tableau de statuts
        const index = joueur.statuts.indexOf(element);
        if (index > -1) {
          joueur.statuts.splice(index, 1);
        }
      }
    }
  }
  
  // Traiter les autres statuts
  if (joueur.statuts_complexes) {
    for (const [nom, statut] of Object.entries(joueur.statuts_complexes)) {
      if (!statut.actif) continue;
      
      const effet = statut.effet;
      
      // Appliquer les dégâts continus
      if (effet.degats_par_tour) {
        joueur.statsActuelles.pv -= effet.degats_par_tour;
        resultats.degats_totaux += effet.degats_par_tour;
        resultats.messages.push(
          `${effet.emoji} ${nom}: -${effet.degats_par_tour} PV`
        );
      }
      
      // Vérifier l'aggravation (saignement -> hémorragie)
      if (nom === 'Saignement' && effet.aggravation && Math.random() < 0.2) {
        appliquerStatut(joueur, 'Hemorragie');
        resultats.messages.push('🩸 Saignement aggravé en hémorragie!');
      }
      
      // Réduire la durée
      statut.tours_restants--;
      
      // Vérifier l'expiration
      if (statut.tours_restants <= 0) {
        statut.actif = false;
        resultats.statuts_expires.push(nom);
        
        // Retirer du tableau de statuts
        const index = joueur.statuts.indexOf(nom);
        if (index > -1) {
          joueur.statuts.splice(index, 1);
        }
        
        // Restaurer les modificateurs
        if (effet.precision_malus) {
          joueur.modificateurs_precision = (joueur.modificateurs_precision || 1) / (1 - effet.precision_malus);
        }
        if (effet.defense_malus) {
          joueur.modificateurs_defense = (joueur.modificateurs_defense || 1) / (1 - effet.defense_malus);
        }
        if (effet.bloque_competences) {
          joueur.peut_utiliser_competences = true;
        }
      }
    }
  }
  
  // Gérer les tours à skip
  if (joueur.tours_a_skip > 0) {
    joueur.tours_a_skip--;
    resultats.skip_tour = true;
    resultats.messages.push('⏭️ Tour sauté (étourdi/souffle coupé)');
  }
  
  return resultats;
}

/**
 * Vérifie si un joueur peut agir selon ses statuts
 * @param {Object} joueur - Joueur à vérifier
 * @returns {Object} - {peut_agir: boolean, raison: string}
 */
function verifierCapaciteAction(joueur) {
  // Vérifier paralysie
  if (joueur.statuts.includes('Paralysie') || joueur.statuts.includes('Paralysé')) {
    return {
      peut_agir: false,
      raison: '⚡ Paralysé - ne peut pas agir'
    };
  }
  
  // Vérifier gel complet
  if (joueur.statuts.includes('Figé')) {
    return {
      peut_agir: false,
      raison: '❄️ Complètement gelé - ne peut pas agir'
    };
  }
  
  // Vérifier étourdissement
  if (joueur.tours_a_skip > 0) {
    return {
      peut_agir: false,
      raison: '💫 Étourdi/Souffle coupé - tour sauté'
    };
  }
  
  // Vérifier peur (peut fuir)
  if (joueur.statuts.includes('Peur') && Math.random() < 0.3) {
    return {
      peut_agir: false,
      raison: '😱 Trop effrayé pour agir - fuit le combat!'
    };
  }
  
  return { peut_agir: true };
}

module.exports = {
  EFFETS_ELEMENTAIRES,
  AUTRES_STATUTS,
  appliquerEffetElementaire,
  appliquerStatut,
  traiterEffetsStatut,
  verifierCapaciteAction
};
