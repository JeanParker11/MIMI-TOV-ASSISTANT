/**
 * SYSTÈME DE CALCUL DE DÉGÂTS PV RÉEL
 * Calcule les dégâts infligés aux points de vie selon les mécaniques de combat
 */

/**
 * Calcule les dégâts PV de base selon la force et la résistance
 * @param {number} forceImpact - Force totale de l'impact (force + bonus arme)
 * @param {number} resistanceZone - Résistance de la zone touchée
 * @param {string} typeImpact - 'critique', 'parade', 'faible'
 * @returns {number} - Dégâts PV à infliger
 */
function calculerDegatsBase(forceImpact, resistanceZone, typeImpact) {
    if (typeImpact === 'faible') {
        // Coup faible : pas de dégâts au défenseur
        return 0;
    }
    
    if (typeImpact === 'parade') {
        // Parade : pas de dégâts PV directs
        return 0;
    }
    
    if (typeImpact === 'critique') {
        // Coup critique : la différence entre force et résistance
        const degatsBase = forceImpact - resistanceZone;
        
        // Minimum 1 dégât si coup critique validé
        return Math.max(1, degatsBase);
    }
    
    return 0;
}

/**
 * Applique les modificateurs de zone aux dégâts
 * @param {number} degatsBase - Dégâts de base
 * @param {string} zone - Zone touchée (tete, torse, bras, jambes)
 * @returns {number} - Dégâts modifiés
 */
function appliquerModificateurZone(degatsBase, zone) {
    const modificateurs = {
        'tete': 1.5,    // +50% de dégâts (zone critique)
        'torse': 1.0,   // Dégâts normaux
        'bras': 0.75,   // -25% de dégâts
        'jambes': 0.85  // -15% de dégâts
    };
    
    const modificateur = modificateurs[zone] || 1.0;
    return Math.round(degatsBase * modificateur);
}

/**
 * Calcule les dégâts selon le type d'arme
 * @param {Object} arme - Objet arme avec type et propriétés
 * @param {number} degatsBase - Dégâts de base
 * @param {number} resistanceZone - Résistance de la zone
 * @returns {Object} - {degats: number, effets: Array}
 */
function calculerDegatsArme(arme, degatsBase, resistanceZone) {
    if (!arme) {
        return {
            degats: degatsBase,
            effets: []
        };
    }
    
    let degatsFinaux = degatsBase;
    let effets = [];
    
    switch (arme.type) {
        case 'contondante':
            // Armes contondantes : bonus contre armure lourde
            if (resistanceZone > 30) {
                degatsFinaux = Math.round(degatsBase * 1.2);
            }
            // Chance d'étourdissement
            if (Math.random() < 0.15) {
                effets.push('etourdissement_possible');
            }
            break;
            
        case 'tranchante':
            // Armes tranchantes : pénétration partielle
            const penetration = arme.penetration || 0.1;
            const resistanceEffective = resistanceZone * (1 - penetration);
            degatsFinaux = Math.round(degatsBase * (1 + penetration));
            
            // Saignement probable
            if (degatsFinaux > 0) {
                effets.push('saignement');
            }
            break;
            
        case 'perforante':
            // Armes perforantes : ignore une partie de l'armure
            const ignoranceArmure = 0.3; // Ignore 30% de la résistance
            degatsFinaux = Math.round(degatsBase * (1 + ignoranceArmure));
            
            // Hémorragie si dégâts importants
            if (degatsFinaux > 15) {
                effets.push('hemorragie_possible');
            }
            break;
            
        case 'magique':
            // Armes magiques : dégâts élémentaires
            degatsFinaux = degatsBase;
            if (arme.element) {
                effets.push(`degats_${arme.element}`);
            }
            break;
    }
    
    // Bonus de Rs de l'arme
    if (arme.rs) {
        degatsFinaux += Math.round(arme.rs * 0.1);
    }
    
    return {
        degats: degatsFinaux,
        effets: effets
    };
}

/**
 * Calcule les dégâts de recul pour l'attaquant (coup faible)
 * @param {number} forceUtilisee - Force utilisée par l'attaquant
 * @param {number} resistanceZone - Résistance de la zone ciblée
 * @returns {number} - Dégâts de recul
 */
function calculerDegatsRecul(forceUtilisee, resistanceZone) {
    // L'attaquant subit la différence
    const difference = resistanceZone - forceUtilisee;
    
    // 50% de la différence en dégâts de recul
    return Math.round(difference * 0.5);
}

/**
 * Calcule les dégâts PV complets avec tous les modificateurs
 * @param {Object} params - Paramètres du calcul
 * @returns {Object} - Résultat complet du calcul
 */
function calculerDegatsPV(params) {
    const {
        forceUtilisee,
        resistanceZone,
        zoneCible,
        arme = null,
        typeAttaque = 'corps',
        faction = null,
        eveilActif = false,
        statuts = []
    } = params;
    
    // 1. Déterminer le type d'impact
    let typeImpact;
    let forceImpact = forceUtilisee;
    
    // Ajouter la Rs de l'arme si présente
    if (arme && arme.rs) {
        forceImpact += arme.rs;
    }
    
    if (forceImpact > resistanceZone) {
        typeImpact = 'critique';
    } else if (forceImpact === resistanceZone) {
        typeImpact = 'parade';
    } else {
        typeImpact = 'faible';
    }
    
    // 2. Calculer les dégâts de base
    let degatsBase = calculerDegatsBase(forceImpact, resistanceZone, typeImpact);
    
    // 3. Appliquer le modificateur de zone
    let degatsZone = appliquerModificateurZone(degatsBase, zoneCible);
    
    // 4. Appliquer les modificateurs d'arme
    let resultArme = { degats: degatsZone, effets: [] };
    if (arme) {
        resultArme = calculerDegatsArme(arme, degatsZone, resistanceZone);
    }
    
    // 5. Appliquer les modificateurs de faction/éveil
    let degatsFinaux = resultArme.degats;
    
    // Arès en éveil : +10% de dégâts
    if (eveilActif && faction === 'ares') {
        degatsFinaux = Math.round(degatsFinaux * 1.1);
    }
    
    // Atlas : -10% de dégâts subis (résistance naturelle)
    if (faction === 'atlas' && typeImpact === 'critique') {
        degatsFinaux = Math.round(degatsFinaux * 0.9);
    }
    
    // 6. Appliquer les statuts
    if (statuts.includes('Affaibli')) {
        degatsFinaux = Math.round(degatsFinaux * 0.8);
    }
    
    // 7. Calculer les dégâts de recul si coup faible
    let degatsRecul = 0;
    if (typeImpact === 'faible') {
        degatsRecul = calculerDegatsRecul(forceUtilisee, resistanceZone);
    }
    
    // 8. Construire le résultat final
    return {
        succes: typeImpact === 'critique',
        typeImpact: typeImpact,
        degatsDefenseur: Math.max(0, degatsFinaux),
        degatsAttaquant: degatsRecul,
        effets: resultArme.effets,
        details: {
            forceUtilisee: forceUtilisee,
            forceImpact: forceImpact,
            resistanceZone: resistanceZone,
            zoneCible: zoneCible,
            degatsBase: degatsBase,
            degatsZone: degatsZone,
            degatsArme: resultArme.degats,
            degatsFinaux: degatsFinaux
        },
        message: genererMessageDegats(typeImpact, degatsFinaux, degatsRecul, zoneCible)
    };
}

/**
 * Génère un message descriptif pour les dégâts
 * @param {string} typeImpact - Type d'impact
 * @param {number} degatsDefenseur - Dégâts au défenseur
 * @param {number} degatsAttaquant - Dégâts à l'attaquant
 * @param {string} zone - Zone touchée
 * @returns {string} - Message descriptif
 */
function genererMessageDegats(typeImpact, degatsDefenseur, degatsAttaquant, zone) {
    const zones = {
        'tete': 'la tête',
        'torse': 'le torse',
        'bras': 'le bras',
        'jambes': 'la jambe'
    };
    
    const zoneNom = zones[zone] || 'le corps';
    
    switch (typeImpact) {
        case 'critique':
            return `💥 Coup critique sur ${zoneNom} ! ${degatsDefenseur} dégâts infligés !`;
        case 'parade':
            return `🛡️ Parade parfaite ! Aucun dégât mais fatigue accumulée.`;
        case 'faible':
            return `💫 Coup trop faible ! L'attaquant subit ${degatsAttaquant} dégâts de recul !`;
        default:
            return `Impact sur ${zoneNom}.`;
    }
}

/**
 * Calcule les dégâts de projection contre obstacle
 * @param {number} vitesseProjection - Vitesse en m/s
 * @param {number} forceProjection - Force en Rs
 * @param {number} resistanceObstacle - Résistance de l'obstacle
 * @returns {Object} - Dégâts et effets
 */
function calculerDegatsProjection(vitesseProjection, forceProjection, resistanceObstacle) {
    // Seuils minimums : 5 m/s et 7 Rs
    if (vitesseProjection < 5 || forceProjection < 7) {
        return {
            degats: 0,
            effets: [],
            message: "Projection trop faible pour causer des dégâts"
        };
    }
    
    // 50% de la résistance de l'obstacle en dégâts
    const degatsBase = Math.round(resistanceObstacle * 0.5);
    
    // Bonus selon la vitesse
    let multiplicateur = 1;
    if (vitesseProjection >= 10) {
        multiplicateur = 1.5;
    } else if (vitesseProjection >= 7) {
        multiplicateur = 1.2;
    }
    
    const degatsFinaux = Math.round(degatsBase * multiplicateur);
    
    const effets = [];
    if (degatsFinaux > 20) {
        effets.push('etourdissement');
    }
    if (vitesseProjection >= 10) {
        effets.push('souffle_coupe');
    }
    
    return {
        degats: degatsFinaux,
        effets: effets,
        message: `💥 Projection violente ! ${degatsFinaux} dégâts de percussion !`
    };
}

module.exports = {
    calculerDegatsBase,
    appliquerModificateurZone,
    calculerDegatsArme,
    calculerDegatsRecul,
    calculerDegatsPV,
    calculerDegatsProjection,
    genererMessageDegats
};
