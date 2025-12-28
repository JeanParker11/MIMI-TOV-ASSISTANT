/**
 * SYSTÈME DE VALIDATION DES RÉPONSES IA
 * Vérifie la cohérence et la légalité des actions proposées par l'IA
 */

const spatialSystem = require('./spatialSystem');

/**
 * Valide une position pour s'assurer qu'elle est dans les limites de l'arène
 * @param {Object} position - {x, y, z}
 * @param {Object} arene - Objet arène avec dimensions
 * @returns {Object} - {valide: boolean, erreur: string}
 */
function validerPosition(position, arene) {
    if (!position || typeof position.x !== 'number' || 
        typeof position.y !== 'number' || typeof position.z !== 'number') {
        return {
            valide: false,
            erreur: "Position invalide ou manquante"
        };
    }
    
    if (!spatialSystem.estDansLimites(position, arene.dimensions)) {
        return {
            valide: false,
            erreur: `Position hors limites (${position.x},${position.y},${position.z}). Max: ${arene.dimensions.x_max}x${arene.dimensions.y_max}x${arene.dimensions.z_max}`
        };
    }
    
    if (spatialSystem.estObstacle(position, arene.obstacles)) {
        return {
            valide: false,
            erreur: `Position occupée par un obstacle`
        };
    }
    
    return { valide: true };
}

/**
 * Valide un déplacement proposé par l'IA
 * @param {Object} deplacement - Objet déplacement de l'IA
 * @param {Object} joueur - Joueur qui se déplace
 * @param {Object} arene - Arène de combat
 * @returns {Object} - {valide: boolean, erreur: string, corrige: Object}
 */
function validerDeplacement(deplacement, joueur, arene) {
    // Vérifier la structure
    if (!deplacement || deplacement.type !== 'DEPLACEMENT') {
        return {
            valide: false,
            erreur: "Structure de déplacement invalide"
        };
    }
    
    // Vérifier que c'est le bon joueur
    if (deplacement.joueur_id !== joueur.id) {
        return {
            valide: false,
            erreur: `ID joueur incorrect (${deplacement.joueur_id} != ${joueur.id})`
        };
    }
    
    // Vérifier la position actuelle
    const posActuelle = deplacement.position_actuelle || joueur.position;
    if (posActuelle.x !== joueur.position.x || 
        posActuelle.y !== joueur.position.y || 
        posActuelle.z !== joueur.position.z) {
        console.warn("⚠️ Position actuelle incorrecte, correction automatique");
        deplacement.position_actuelle = joueur.position;
    }
    
    // Vérifier la position cible
    const validationCible = validerPosition(deplacement.position_cible, arene);
    if (!validationCible.valide) {
        return {
            valide: false,
            erreur: `Position cible invalide: ${validationCible.erreur}`
        };
    }
    
    // Vérifier qu'un chemin existe
    const chemin = spatialSystem.trouverChemin(
        joueur.position, 
        deplacement.position_cible, 
        arene
    );
    
    if (!chemin) {
        return {
            valide: false,
            erreur: "Aucun chemin valide vers la position cible"
        };
    }
    
    // Calculer le coût réel
    const coutReel = spatialSystem.calculerCoutDeplacement(chemin);
    
    // Vérifier les PM
    if (coutReel > joueur.points_mouvement.actuels) {
        // Proposer une correction : aller aussi loin que possible
        const pmDisponibles = joueur.points_mouvement.actuels;
        let cheminPartiel = [chemin[0]];
        let coutPartiel = 0;
        
        for (let i = 1; i < chemin.length; i++) {
            const coutEtape = (chemin[i].z !== chemin[i-1].z) ? 2 : 1;
            if (coutPartiel + coutEtape <= pmDisponibles) {
                cheminPartiel.push(chemin[i]);
                coutPartiel += coutEtape;
            } else {
                break;
            }
        }
        
        return {
            valide: false,
            erreur: `PM insuffisants (${coutReel} requis, ${pmDisponibles} disponibles)`,
            corrige: {
                ...deplacement,
                position_cible: cheminPartiel[cheminPartiel.length - 1],
                pm_utilises: coutPartiel,
                note: "Déplacement partiel effectué"
            }
        };
    }
    
    // Tout est valide
    return {
        valide: true,
        pm_utilises: coutReel,
        chemin: chemin
    };
}

/**
 * Valide une attaque proposée par l'IA
 * @param {Object} attaque - Objet attaque de l'IA
 * @param {Object} attaquant - Joueur attaquant
 * @param {Object} defenseur - Joueur défenseur
 * @param {Object} combat - État du combat
 * @returns {Object} - {valide: boolean, erreur: string, corrige: Object}
 */
function validerAttaque(attaque, attaquant, defenseur, combat) {
    // Vérifier la structure
    if (!attaque || attaque.type !== 'ATTAQUE') {
        return {
            valide: false,
            erreur: "Structure d'attaque invalide"
        };
    }
    
    // Vérifier les IDs
    if (attaque.attaquant_id !== attaquant.id) {
        return {
            valide: false,
            erreur: `ID attaquant incorrect`
        };
    }
    
    if (attaque.defenseur_id !== defenseur.id) {
        return {
            valide: false,
            erreur: `ID défenseur incorrect`
        };
    }
    
    // Vérifier la force utilisée
    const forceMax = attaquant.statsInitiales.coupMax || attaquant.statsInitiales.force;
    if (attaque.forceUtilisee > forceMax) {
        console.warn(`⚠️ Force excessive (${attaque.forceUtilisee} > ${forceMax}), correction automatique`);
        attaque.forceUtilisee = forceMax;
    }
    
    if (attaque.forceUtilisee < 1) {
        attaque.forceUtilisee = 1;
    }
    
    // Vérifier la zone ciblée
    const zonesValides = ['tete', 'torse', 'bras', 'jambes'];
    if (!zonesValides.includes(attaque.zoneCible)) {
        console.warn(`⚠️ Zone invalide (${attaque.zoneCible}), défaut sur torse`);
        attaque.zoneCible = 'torse';
    }
    
    // Calculer la distance réelle
    const distanceReelle = spatialSystem.calculerDistanceArrondie(
        attaquant.position,
        defenseur.position
    );
    
    // Vérifier la portée selon le type d'attaque
    let porteeValide = false;
    let messagePortee = "";
    
    const actionNom = (attaque.action_nom || "").toLowerCase();
    
    // Règles de portée spécifiques
    if (actionNom.includes('poing') || actionNom.includes('coude') || 
        actionNom.includes('tête') || actionNom.includes('genou')) {
        // Corps à corps strict : distance = 0
        porteeValide = (distanceReelle === 0);
        if (!porteeValide) {
            messagePortee = `Corps à corps nécessite distance 0 (actuelle: ${distanceReelle}m)`;
        }
    } else if (actionNom.includes('pied')) {
        // Coup de pied : distance 0 ou 1
        porteeValide = (distanceReelle <= 1);
        if (!porteeValide) {
            messagePortee = `Coup de pied portée max 1m (actuelle: ${distanceReelle}m)`;
        }
    } else if (attaquant.equipement?.arme) {
        // Arme équipée : vérifier sa portée
        const arme = attaquant.equipement.arme;
        if (arme.portee) {
            porteeValide = (distanceReelle >= arme.portee.min && 
                          distanceReelle <= arme.portee.max);
            if (!porteeValide) {
                messagePortee = `Arme ${arme.nom} portée ${arme.portee.min}-${arme.portee.max}m (actuelle: ${distanceReelle}m)`;
            }
        }
    } else {
        // Par défaut : attaque de mêlée générique
        porteeValide = (distanceReelle <= 2);
        if (!porteeValide) {
            messagePortee = `Attaque hors de portée (max 2m, actuelle: ${distanceReelle}m)`;
        }
    }
    
    if (!porteeValide) {
        return {
            valide: false,
            erreur: messagePortee,
            distance_reelle: distanceReelle
        };
    }
    
    // Corriger la distance dans l'objet attaque
    attaque.distance = distanceReelle;
    attaque.portee_valide = true;
    
    // Vérifier/corriger la vitesse d'attaque
    if (!attaque.vitesse_attaque || attaque.vitesse_attaque <= 0) {
        // Vitesse par défaut selon le type d'attaque
        if (actionNom.includes('poing')) {
            attaque.vitesse_attaque = 10; // m/s
        } else if (actionNom.includes('pied')) {
            attaque.vitesse_attaque = 8;
        } else if (attaquant.equipement?.arme) {
            attaque.vitesse_attaque = attaquant.equipement.arme.vitesse_attaque || 5;
        } else {
            attaque.vitesse_attaque = 7; // Défaut
        }
    }
    
    return {
        valide: true,
        attaque_corrigee: attaque
    };
}

/**
 * Valide une réponse complète de l'IA pour un tour
 * @param {Object} tourResult - Résultat parsé de l'IA
 * @param {Object} combat - État du combat
 * @returns {Object} - {valide: boolean, erreurs: Array, resultat_corrige: Object}
 */
function validerTourIA(tourResult, combat) {
    const erreurs = [];
    const resultat_corrige = {
        resultat_tour: []
    };
    
    // Vérifier la structure de base
    if (!tourResult || !tourResult.resultat_tour || !Array.isArray(tourResult.resultat_tour)) {
        return {
            valide: false,
            erreurs: ["Structure de réponse IA invalide"],
            resultat_corrige: null
        };
    }
    
    const [p1, p2] = combat.joueurs;
    const joueurActif = combat.joueurActif;
    const adversaire = p1.id === joueurActif.id ? p2 : p1;
    
    // Traiter chaque action
    for (const action of tourResult.resultat_tour) {
        if (action.type === 'DEPLACEMENT') {
            const joueur = action.joueur_id === p1.id ? p1 : p2;
            const validation = validerDeplacement(action, joueur, combat.arene);
            
            if (validation.valide) {
                action.pm_utilises = validation.pm_utilises;
                action.chemin = validation.chemin;
                resultat_corrige.resultat_tour.push(action);
            } else if (validation.corrige) {
                console.warn(`⚠️ Déplacement corrigé: ${validation.erreur}`);
                resultat_corrige.resultat_tour.push(validation.corrige);
            } else {
                erreurs.push(`Déplacement invalide: ${validation.erreur}`);
            }
        } 
        else if (action.type === 'ATTAQUE') {
            const attaquant = action.attaquant_id === p1.id ? p1 : p2;
            const defenseur = action.defenseur_id === p1.id ? p1 : p2;
            
            const validation = validerAttaque(action, attaquant, defenseur, combat);
            
            if (validation.valide) {
                resultat_corrige.resultat_tour.push(validation.attaque_corrigee || action);
            } else {
                erreurs.push(`Attaque invalide: ${validation.erreur}`);
                // On peut quand même ajouter une version "échec" de l'attaque
                action.portee_valide = false;
                action.degats = 0;
                action.esquive_reussie = false;
                action.note_validation = validation.erreur;
                resultat_corrige.resultat_tour.push(action);
            }
        }
        else {
            console.warn(`⚠️ Type d'action inconnu: ${action.type}`);
        }
    }
    
    return {
        valide: erreurs.length === 0,
        erreurs: erreurs,
        resultat_corrige: resultat_corrige
    };
}

/**
 * Vérifie les limites de faction pour les stats
 * @param {Object} joueur - Joueur à vérifier
 * @param {Object} limitesFaction - Limites selon la faction
 * @returns {Object} - {valide: boolean, violations: Array}
 */
function validerStatsFaction(joueur, limitesFaction) {
    const violations = [];
    
    if (joueur.statsActuelles.vitesse > limitesFaction.vitesse.max) {
        violations.push(`Vitesse ${joueur.statsActuelles.vitesse} > max ${limitesFaction.vitesse.max}`);
        joueur.statsActuelles.vitesse = limitesFaction.vitesse.max;
    }
    
    if (joueur.statsActuelles.pf > limitesFaction.force.max) {
        violations.push(`Force ${joueur.statsActuelles.pf} > max ${limitesFaction.force.max}`);
        joueur.statsActuelles.pf = limitesFaction.force.max;
    }
    
    return {
        valide: violations.length === 0,
        violations: violations
    };
}

module.exports = {
    validerPosition,
    validerDeplacement,
    validerAttaque,
    validerTourIA,
    validerStatsFaction
};
