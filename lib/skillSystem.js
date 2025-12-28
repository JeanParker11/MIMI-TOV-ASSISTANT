/**
 * SYSTÈME DE GESTION DES COMPÉTENCES ACTIVES
 * Gère l'utilisation, le chargement et les effets des compétences
 */

const fs = require('fs');
const path = require('path');

// Temps de chargement et durée d'effet par rang
const SKILL_TIMINGS = {
  'E': { chargement: 1, effet: 1, utilisable_debut: true },
  'D': { chargement: 2, effet: 1, utilisable_debut: false },
  'C': { chargement: 3, effet: 1, utilisable_debut: false },
  'B': { chargement: 4, effet: 2, utilisable_debut: false },
  'A': { chargement: 5, effet: 2, utilisable_debut: false },
  'S': { chargement: 6, effet: 3, utilisable_debut: true }
};

// Types d'effets recensés dans les compétences
const TYPES_EFFETS = {
  // Effets offensifs
  'degats_direct': 'Inflige des dégâts directs',
  'degats_continu': 'Inflige des dégâts sur plusieurs tours',
  'degats_zone': 'Inflige des dégâts dans une zone',
  'degats_elementaire': 'Inflige des dégâts élémentaires',
  'vol_vie': 'Vole des PV à la cible',
  'execution': 'Tue instantanément si conditions remplies',
  
  // Effets défensifs
  'bouclier': 'Crée un bouclier protecteur',
  'esquive': 'Augmente les chances d\'esquive',
  'contre_attaque': 'Permet de contre-attaquer',
  'immunite': 'Immunité à certains effets',
  'regeneration': 'Régénère des PV',
  'armure_bonus': 'Augmente la résistance',
  
  // Effets de contrôle
  'etourdissement': 'Étourdit la cible',
  'paralysie': 'Paralyse la cible',
  'silence': 'Empêche l\'utilisation de compétences',
  'ralentissement': 'Réduit la vitesse',
  'immobilisation': 'Empêche le mouvement',
  'peur': 'Inflige la peur',
  
  // Effets de buff
  'augmentation_force': 'Augmente la force',
  'augmentation_vitesse': 'Augmente la vitesse',
  'augmentation_esprit': 'Augmente l\'esprit',
  'augmentation_precision': 'Augmente la précision',
  'invisibilite': 'Rend invisible',
  'camouflage': 'Camouflage partiel',
  
  // Effets de debuff
  'reduction_force': 'Réduit la force',
  'reduction_vitesse': 'Réduit la vitesse',
  'reduction_resistance': 'Réduit la résistance',
  'aveuglement': 'Réduit la précision',
  'affaiblissement': 'Affaiblit globalement',
  
  // Effets de déplacement
  'teleportation': 'Téléportation instantanée',
  'dash': 'Déplacement rapide',
  'projection': 'Projette la cible',
  'attraction': 'Attire la cible',
  'bond': 'Permet de bondir',
  'escalade': 'Permet de grimper',
  
  // Effets spéciaux
  'transformation': 'Change de forme',
  'invocation': 'Invoque une entité',
  'piege': 'Pose un piège',
  'illusion': 'Crée une illusion',
  'copie': 'Copie une capacité',
  'sacrifice': 'Sacrifie des ressources pour un effet',
  
  // Effets élémentaires
  'brulure': 'Inflige brûlure (Ignis)',
  'gel': 'Inflige gel (Glacis)',
  'electrocution': 'Inflige charge électrique (Fulmis)',
  'empoisonnement': 'Inflige poison (Sylvaë)',
  'dispersion': 'Disperse les effets (Aeris)'
};

// Coûts moyens estimés par rang
const COUTS_MOYENS = {
  'E': { pm: 2, esprit: 5, pf: 3 },
  'D': { pm: 4, esprit: 10, pf: 5 },
  'C': { pm: 6, esprit: 15, pf: 8 },
  'B': { pm: 8, esprit: 20, pf: 12 },
  'A': { pm: 10, esprit: 30, pf: 15 },
  'S': { pm: 15, esprit: 50, pf: 20 }
};

/**
 * Charge toutes les compétences actives
 * @returns {Object} - Dictionnaire des compétences
 */
function chargerCompetencesActives() {
  const activesPath = path.join(__dirname, '../data/competences/actives.json');
  
  if (!fs.existsSync(activesPath)) {
    console.error("Fichier actives.json introuvable!");
    return {};
  }
  
  return JSON.parse(fs.readFileSync(activesPath, 'utf8'));
}

/**
 * Recherche une compétence par son nom ou description
 * @param {string} texte - Texte de l'action du joueur
 * @param {Array} competencesDisponibles - Liste des compétences du joueur
 * @returns {Object|null} - Compétence trouvée ou null
 */
function detecterCompetence(texte, competencesDisponibles) {
  const texteLower = texte.toLowerCase();
  const allCompetences = chargerCompetencesActives();
  
  // Recherche exacte par nom
  for (const comp of competencesDisponibles) {
    const competence = allCompetences[comp.id];
    if (!competence) continue;
    
    if (texteLower.includes(competence.nom.toLowerCase())) {
      return competence;
    }
    
    // Recherche par mots-clés dans la description
    const motsCles = competence.description.toLowerCase().split(' ')
      .filter(mot => mot.length > 4);
    
    let correspondances = 0;
    for (const mot of motsCles) {
      if (texteLower.includes(mot)) {
        correspondances++;
      }
    }
    
    // Si au moins 30% des mots-clés correspondent
    if (correspondances >= motsCles.length * 0.3) {
      return competence;
    }
  }
  
  return null;
}

/**
 * Vérifie si une compétence peut être utilisée
 * @param {Object} competence - Compétence à vérifier
 * @param {Object} utilisateur - Joueur utilisant la compétence
 * @param {number} tourActuel - Numéro du tour actuel
 * @returns {Object} - {possible: boolean, raison: string}
 */
function verifierUtilisationCompetence(competence, utilisateur, tourActuel) {
  const timing = SKILL_TIMINGS[competence.rang];
  
  // Vérifier si utilisable au début
  if (tourActuel === 1 && !timing.utilisable_debut) {
    return {
      possible: false,
      raison: `Les compétences de rang ${competence.rang} ne peuvent pas être utilisées au premier tour`
    };
  }
  
  // Vérifier le chargement
  if (utilisateur.competences_en_chargement) {
    const charge = utilisateur.competences_en_chargement[competence.id];
    if (charge && charge.tours_restants > 0) {
      return {
        possible: false,
        raison: `Compétence en chargement (${charge.tours_restants} tours restants)`
      };
    }
  }
  
  // Vérifier les coûts
  const couts = competence.cout || COUTS_MOYENS[competence.rang];
  
  if (couts.pm && utilisateur.points_mouvement.actuels < couts.pm) {
    return {
      possible: false,
      raison: `PM insuffisants (${couts.pm} requis, ${utilisateur.points_mouvement.actuels} disponibles)`
    };
  }
  
  if (couts.esprit && utilisateur.statsActuelles.esprit < couts.esprit) {
    return {
      possible: false,
      raison: `Esprit insuffisant (${couts.esprit} requis, ${utilisateur.statsActuelles.esprit} disponible)`
    };
  }
  
  if (couts.pf && utilisateur.statsActuelles.pf < couts.pf) {
    return {
      possible: false,
      raison: `Force insuffisante (${couts.pf} requis, ${utilisateur.statsActuelles.pf} disponible)`
    };
  }
  
  // Vérifier les conditions spécifiques
  if (competence.mecanique && competence.mecanique.condition) {
    const condition = competence.mecanique.condition;
    
    // Conditions de PV
    if (condition.pv_min && utilisateur.statsActuelles.pv < condition.pv_min) {
      return {
        possible: false,
        raison: `PV insuffisants (min ${condition.pv_min})`
      };
    }
    
    if (condition.pv_max && utilisateur.statsActuelles.pv > condition.pv_max) {
      return {
        possible: false,
        raison: `PV trop élevés (max ${condition.pv_max})`
      };
    }
    
    // Conditions de statut
    if (condition.statut_requis && !utilisateur.statuts.includes(condition.statut_requis)) {
      return {
        possible: false,
        raison: `Statut requis: ${condition.statut_requis}`
      };
    }
  }
  
  return { possible: true };
}

/**
 * Active une compétence
 * @param {Object} competence - Compétence à activer
 * @param {Object} utilisateur - Joueur utilisant la compétence
 * @param {Object} cible - Cible de la compétence (peut être null)
 * @param {Object} combat - État du combat
 * @returns {Object} - Résultat de l'activation
 */
function activerCompetence(competence, utilisateur, cible, combat) {
  const result = {
    succes: false,
    effets: [],
    degats: 0,
    message: "",
    cout_paye: {}
  };
  
  // Payer les coûts
  const couts = competence.cout || COUTS_MOYENS[competence.rang];
  
  if (couts.pm) {
    utilisateur.points_mouvement.actuels -= couts.pm;
    result.cout_paye.pm = couts.pm;
  }
  
  if (couts.esprit) {
    utilisateur.statsActuelles.esprit -= couts.esprit;
    result.cout_paye.esprit = couts.esprit;
  }
  
  if (couts.pf) {
    utilisateur.statsActuelles.pf -= couts.pf;
    result.cout_paye.pf = couts.pf;
  }
  
  // Vérifier le taux de réussite
  const tauxReussite = competence.taux_reussite || 100;
  if (Math.random() * 100 > tauxReussite) {
    result.message = `❌ ${competence.nom} a échoué!`;
    return result;
  }
  
  // Appliquer les effets
  const effet = competence.mecanique?.effet;
  if (!effet) {
    result.message = `⚠️ ${competence.nom} n'a pas d'effet défini`;
    return result;
  }
  
  result.succes = true;
  
  // Traiter selon le type d'effet
  switch (effet.type) {
    case 'degats':
    case 'degats_direct':
      result.degats = effet.valeur || 10;
      if (cible) {
        cible.statsActuelles.pv -= result.degats;
      }
      result.message = `💥 ${competence.nom} inflige ${result.degats} dégâts!`;
      break;
      
    case 'soin':
    case 'regeneration':
      const soin = effet.valeur || 10;
      utilisateur.statsActuelles.pv = Math.min(
        utilisateur.statsActuelles.pv + soin,
        utilisateur.statsInitiales.pv
      );
      result.message = `💚 ${competence.nom} restaure ${soin} PV!`;
      break;
      
    case 'bouclier':
      if (!utilisateur.boucliers) utilisateur.boucliers = [];
      utilisateur.boucliers.push({
        nom: competence.nom,
        absorption: effet.valeur || 20,
        tours_restants: SKILL_TIMINGS[competence.rang].effet
      });
      result.message = `🛡️ ${competence.nom} crée un bouclier de ${effet.valeur} points!`;
      break;
      
    case 'etourdissement':
      if (cible && !cible.statuts.includes('Étourdi')) {
        cible.statuts.push('Étourdi');
        cible.tours_etourdissement = effet.duree || 1;
      }
      result.message = `💫 ${competence.nom} étourdit la cible!`;
      break;
      
    case 'paralysie':
      if (cible && !cible.statuts.includes('Paralysé')) {
        cible.statuts.push('Paralysé');
        cible.tours_paralysie = effet.duree || 2;
      }
      result.message = `⚡ ${competence.nom} paralyse la cible!`;
      break;
      
    case 'augmentation_force':
      const bonusForce = effet.valeur || 5;
      utilisateur.statsActuelles.pf += bonusForce;
      result.message = `💪 ${competence.nom} augmente la force de ${bonusForce}!`;
      break;
      
    case 'augmentation_vitesse':
      const bonusVitesse = effet.valeur || 3;
      utilisateur.statsActuelles.vitesse += bonusVitesse;
      utilisateur.points_mouvement.actuels += Math.floor(bonusVitesse / 2);
      result.message = `⚡ ${competence.nom} augmente la vitesse de ${bonusVitesse}!`;
      break;
      
    case 'teleportation':
      if (effet.position_cible) {
        utilisateur.position = effet.position_cible;
        result.message = `🌀 ${competence.nom} téléporte l'utilisateur!`;
      }
      break;
      
    case 'invisibilite':
    case 'camouflage':
      if (!utilisateur.statuts.includes('Invisible')) {
        utilisateur.statuts.push('Invisible');
        utilisateur.tours_invisibilite = SKILL_TIMINGS[competence.rang].effet;
      }
      result.message = `👻 ${competence.nom} rend invisible!`;
      break;
      
    case 'brulure':
      if (cible) {
        appliquerStatutElementaire(cible, 'Ignis', effet.duree || 3);
        result.message = `🔥 ${competence.nom} inflige brûlure!`;
      }
      break;
      
    case 'gel':
      if (cible) {
        appliquerStatutElementaire(cible, 'Glacis', effet.duree || 2);
        result.message = `❄️ ${competence.nom} gèle la cible!`;
      }
      break;
      
    default:
      result.message = `✨ ${competence.nom} activée avec succès!`;
  }
  
  // Marquer la compétence comme utilisée et en chargement
  if (!utilisateur.competences_en_chargement) {
    utilisateur.competences_en_chargement = {};
  }
  
  utilisateur.competences_en_chargement[competence.id] = {
    tours_restants: SKILL_TIMINGS[competence.rang].chargement,
    effet_actif: SKILL_TIMINGS[competence.rang].effet
  };
  
  result.effets.push(effet.type);
  
  return result;
}

/**
 * Applique un statut élémentaire
 * @param {Object} cible - Cible du statut
 * @param {string} element - Type d'élément
 * @param {number} duree - Durée en tours
 */
function appliquerStatutElementaire(cible, element, duree) {
  if (!cible.statuts_elementaires) {
    cible.statuts_elementaires = {};
  }
  
  cible.statuts_elementaires[element] = {
    tours_restants: duree,
    intensite: 1
  };
  
  // Ajouter au tableau de statuts pour l'affichage
  if (!cible.statuts.includes(element)) {
    cible.statuts.push(element);
  }
}

/**
 * Met à jour les compétences en chargement à chaque tour
 * @param {Object} joueur - Joueur à mettre à jour
 */
function mettreAJourChargements(joueur) {
  if (!joueur.competences_en_chargement) return;
  
  for (const [id, charge] of Object.entries(joueur.competences_en_chargement)) {
    if (charge.tours_restants > 0) {
      charge.tours_restants--;
    }
    
    if (charge.effet_actif > 0) {
      charge.effet_actif--;
    }
    
    // Supprimer si terminé
    if (charge.tours_restants === 0 && charge.effet_actif === 0) {
      delete joueur.competences_en_chargement[id];
    }
  }
}

/**
 * Obtient la liste des compétences utilisables
 * @param {Object} joueur - Joueur
 * @param {number} tourActuel - Tour actuel
 * @returns {Array} - Liste des compétences utilisables
 */
function obtenirCompetencesUtilisables(joueur, tourActuel) {
  const utilisables = [];
  const allCompetences = chargerCompetencesActives();
  
  if (!joueur.competences) return utilisables;
  
  for (const comp of joueur.competences) {
    const competence = allCompetences[comp.id];
    if (!competence) continue;
    
    const verif = verifierUtilisationCompetence(competence, joueur, tourActuel);
    if (verif.possible) {
      utilisables.push({
        ...competence,
        utilisations_restantes: comp.utilisations_restantes
      });
    }
  }
  
  return utilisables;
}

module.exports = {
  SKILL_TIMINGS,
  TYPES_EFFETS,
  COUTS_MOYENS,
  chargerCompetencesActives,
  detecterCompetence,
  verifierUtilisationCompetence,
  activerCompetence,
  appliquerStatutElementaire,
  mettreAJourChargements,
  obtenirCompetencesUtilisables
};
