/**
 * SYSTÈME DE REPÉRAGE SPATIAL 3D - VALORIA
 * Gère le positionnement, les distances, et les déplacements sur la grille de combat
 * Échelle : 1 case = 1 mètre
 */

/**
 * Calcule la distance euclidienne 3D entre deux positions
 * @param {Object} pos1 - {x, y, z}
 * @param {Object} pos2 - {x, y, z}
 * @returns {number} - Distance en mètres
 */
function calculerDistance3D(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Arrondit la distance à l'entier le plus proche
 * @param {Object} pos1 - {x, y, z}
 * @param {Object} pos2 - {x, y, z}
 * @returns {number} - Distance arrondie en cases
 */
function calculerDistanceArrondie(pos1, pos2) {
  return Math.round(calculerDistance3D(pos1, pos2));
}

/**
 * Calcule le coût en PM d'un déplacement
 * @param {Array} chemin - Tableau de positions [{x, y, z}, ...]
 * @returns {number} - Coût en Points de Mouvement
 */
function calculerCoutDeplacement(chemin) {
  if (!chemin || chemin.length < 2) return 0;
  
  let cout = 0;
  
  for (let i = 1; i < chemin.length; i++) {
    const prev = chemin[i - 1];
    const curr = chemin[i];
    
    // Mouvement vertical coûte 2 PM par case
    if (curr.z !== prev.z) {
      cout += 2;
    } else {
      // Mouvement horizontal coûte 1 PM par case
      cout += 1;
    }
  }
  
  return cout;
}

/**
 * Vérifie si une position est dans les limites de l'arène
 * @param {Object} position - {x, y, z}
 * @param {Object} dimensions - {x_max, y_max, z_max}
 * @returns {boolean}
 */
function estDansLimites(position, dimensions) {
  return (
    position.x >= 0 && position.x < dimensions.x_max &&
    position.y >= 0 && position.y < dimensions.y_max &&
    position.z >= 0 && position.z < dimensions.z_max
  );
}

/**
 * Vérifie si une position est occupée par un obstacle
 * @param {Object} position - {x, y, z}
 * @param {Array} obstacles - [{x, y, z}, ...]
 * @returns {boolean}
 */
function estObstacle(position, obstacles) {
  if (!obstacles || obstacles.length === 0) return false;
  
  return obstacles.some(obs => 
    obs.x === position.x && 
    obs.y === position.y && 
    obs.z === position.z
  );
}

/**
 * Vérifie si une case est accessible (dans les limites et sans obstacle)
 * @param {Object} position - {x, y, z}
 * @param {Object} arene - Objet arène avec dimensions et obstacles
 * @returns {boolean}
 */
function estAccessible(position, arene) {
  return (
    estDansLimites(position, arene.dimensions) &&
    !estObstacle(position, arene.obstacles)
  );
}

/**
 * Obtient les cases adjacentes à une position (6 directions en 3D)
 * @param {Object} position - {x, y, z}
 * @returns {Array} - Tableau de positions adjacentes
 */
function obtenirCasesAdjacentes(position) {
  return [
    { x: position.x + 1, y: position.y, z: position.z }, // Est
    { x: position.x - 1, y: position.y, z: position.z }, // Ouest
    { x: position.x, y: position.y + 1, z: position.z }, // Nord
    { x: position.x, y: position.y - 1, z: position.z }, // Sud
    { x: position.x, y: position.y, z: position.z + 1 }, // Haut
    { x: position.x, y: position.y, z: position.z - 1 }  // Bas
  ];
}

/**
 * Pathfinding simple A* en 3D
 * @param {Object} depart - Position de départ {x, y, z}
 * @param {Object} arrivee - Position d'arrivée {x, y, z}
 * @param {Object} arene - Objet arène
 * @returns {Array|null} - Chemin trouvé ou null
 */
function trouverChemin(depart, arrivee, arene) {
  // Vérifier que départ et arrivée sont valides
  if (!estAccessible(depart, arene) || !estAccessible(arrivee, arene)) {
    return null;
  }
  
  // Si déjà à destination
  if (depart.x === arrivee.x && depart.y === arrivee.y && depart.z === arrivee.z) {
    return [depart];
  }
  
  const openSet = [depart];
  const closedSet = [];
  const gScore = new Map(); // Coût réel depuis le départ
  const fScore = new Map(); // Coût estimé total
  const cameFrom = new Map(); // Pour reconstruire le chemin
  
  const posKey = (pos) => `${pos.x},${pos.y},${pos.z}`;
  
  gScore.set(posKey(depart), 0);
  fScore.set(posKey(depart), calculerDistance3D(depart, arrivee));
  
  while (openSet.length > 0) {
    // Trouver le nœud avec le meilleur fScore
    let current = openSet[0];
    let currentIdx = 0;
    
    for (let i = 1; i < openSet.length; i++) {
      if (fScore.get(posKey(openSet[i])) < fScore.get(posKey(current))) {
        current = openSet[i];
        currentIdx = i;
      }
    }
    
    // Si on a atteint la destination
    if (current.x === arrivee.x && current.y === arrivee.y && current.z === arrivee.z) {
      // Reconstruire le chemin
      const chemin = [current];
      let key = posKey(current);
      
      while (cameFrom.has(key)) {
        const prev = cameFrom.get(key);
        chemin.unshift(prev);
        key = posKey(prev);
      }
      
      return chemin;
    }
    
    // Retirer current de openSet et l'ajouter à closedSet
    openSet.splice(currentIdx, 1);
    closedSet.push(current);
    
    // Explorer les voisins
    const voisins = obtenirCasesAdjacentes(current);
    
    for (const voisin of voisins) {
      // Ignorer si hors limites, obstacle, ou déjà évalué
      if (!estAccessible(voisin, arene)) continue;
      
      const voisinKey = posKey(voisin);
      if (closedSet.some(pos => posKey(pos) === voisinKey)) continue;
      
      // Calculer le coût pour atteindre ce voisin
      const coutMouvement = (voisin.z !== current.z) ? 2 : 1;
      const tentativeGScore = gScore.get(posKey(current)) + coutMouvement;
      
      // Si ce voisin n'est pas dans openSet, l'ajouter
      if (!openSet.some(pos => posKey(pos) === voisinKey)) {
        openSet.push(voisin);
      } else if (tentativeGScore >= (gScore.get(voisinKey) || Infinity)) {
        continue; // Ce n'est pas un meilleur chemin
      }
      
      // Ce chemin est le meilleur jusqu'à présent
      cameFrom.set(voisinKey, current);
      gScore.set(voisinKey, tentativeGScore);
      fScore.set(voisinKey, tentativeGScore + calculerDistance3D(voisin, arrivee));
    }
  }
  
  // Aucun chemin trouvé
  return null;
}

/**
 * Tente un déplacement pour un joueur
 * @param {Object} joueur - Objet joueur
 * @param {Object} positionCible - {x, y, z}
 * @param {Object} arene - Objet arène
 * @returns {Object} - {succes: boolean, message: string, coutPM: number}
 */
function tenterDeplacement(joueur, positionCible, arene) {
  // Vérifier que la position cible est accessible
  if (!estAccessible(positionCible, arene)) {
    return {
      succes: false,
      message: "Position inaccessible (hors limites ou obstacle).",
      coutPM: 0
    };
  }
  
  // Trouver le chemin
  const chemin = trouverChemin(joueur.position, positionCible, arene);
  
  if (!chemin) {
    return {
      succes: false,
      message: "Chemin bloqué par des obstacles.",
      coutPM: 0
    };
  }
  
  // Calculer le coût
  const coutPM = calculerCoutDeplacement(chemin);
  
  // Vérifier les PM disponibles
  if (coutPM > joueur.points_mouvement.actuels) {
    return {
      succes: false,
      message: `Points de Mouvement insuffisants. Coût : ${coutPM} PM, Disponible : ${joueur.points_mouvement.actuels} PM.`,
      coutPM: coutPM
    };
  }
  
  // Déplacement réussi
  joueur.position = positionCible;
  joueur.points_mouvement.actuels -= coutPM;
  
  return {
    succes: true,
    message: `Déplacement effectué (${coutPM} PM). Position : (${positionCible.x}, ${positionCible.y}, ${positionCible.z}).`,
    coutPM: coutPM,
    chemin: chemin
  };
}

/**
 * Initialise les points de mouvement selon la vitesse
 * @param {number} vitesse - Statistique vitesse (1-10)
 * @returns {number} - PM maximum
 */
function calculerPointsMouvementMax(vitesse) {
  // La vitesse correspond au nombre de cases/mètres par tour
  return Math.max(1, Math.floor(vitesse));
}

/**
 * Vérifie si une portée d'action est respectée
 * @param {Object} attaquant - Position attaquant
 * @param {Object} cible - Position cible
 * @param {Object} portee - {min: number, max: number}
 * @returns {Object} - {valide: boolean, distance: number, message: string}
 */
function verifierPortee(attaquant, cible, portee) {
  const distance = calculerDistanceArrondie(attaquant, cible);
  
  if (distance > portee.max) {
    return {
      valide: false,
      distance: distance,
      message: `Cible trop loin. Distance : ${distance}m / Portée max : ${portee.max}m`
    };
  }
  
  if (distance < portee.min) {
    return {
      valide: false,
      distance: distance,
      message: `Cible trop proche. Distance : ${distance}m / Portée min : ${portee.min}m`
    };
  }
  
  return {
    valide: true,
    distance: distance,
    message: `Portée valide (${distance}m).`
  };
}

module.exports = {
  calculerDistance3D,
  calculerDistanceArrondie,
  calculerCoutDeplacement,
  estDansLimites,
  estObstacle,
  estAccessible,
  obtenirCasesAdjacentes,
  trouverChemin,
  tenterDeplacement,
  calculerPointsMouvementMax,
  verifierPortee
};
