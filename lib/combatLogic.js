const fs = require('fs');
const path = require('path');
const spatialSystem = require('./spatialSystem');
const esquiveSystem = require('./esquiveSystem');

// --- PARSING DES REGLES ---

function parseFactionRules() {
    // Cette fonction est un placeholder. Les règles sont codées en dur pour l'instant.
    return {
        Hermes: { vitesse: { max: 9 }, force: { max: 7 }, magie: { max: 7 } },
        Ares:   { vitesse: { max: 8 }, force: { max: 8 }, magie: { max: 8 } },
        Hecate: { vitesse: { max: 7 }, force: { max: 7 }, magie: { max: 9 } },
        Atlas:  { vitesse: { max: 7 }, force: { max: 9 }, magie: { max: 7 } },
    };
}

const REGLES_FACTIONS = parseFactionRules();

const combatLogic = {

    initCombattant(playerId, fiche, positionInitiale = null) {
        const faction = fiche.faction;
        const stats = {
            force: parseInt(fiche.stats.force, 10),
            esprit: parseInt(fiche.stats.esprit, 10),
            pouvoir: parseInt(fiche.stats.pouvoir, 10),
        };

        let resistances = {
            tete: Math.round(stats.force * 0.20),
            torse: Math.round(stats.force * 0.35),
            jambes: Math.round(stats.force * 0.15),
            bras: Math.round(stats.force * 0.075),
        };

        if (faction === 'Atlas') {
            for (const zone in resistances) { resistances[zone] = Math.round(resistances[zone] * 1.15); }
        } else if (faction === 'Hermès') {
            for (const zone in resistances) { resistances[zone] = Math.round(resistances[zone] * 0.90); }
        }

        const factionRules = REGLES_FACTIONS[faction] || REGLES_FACTIONS['Ares'];
        const vitesseMax = factionRules.vitesse.max;

        return {
          id: playerId,
          pseudo: fiche.pseudo,
          faction: faction,
          statsInitiales: { ...stats, coupMax: factionRules.force.max },
          resistances: resistances,
          statsActuelles: {
            pv: 100,
            pf: stats.force,
            pm: stats.pouvoir,
            esprit: stats.esprit,
            vitesse: vitesseMax,
          },
          position: positionInitiale || { x: 0, y: 0, z: 0 },
          points_mouvement: {
            actuels: spatialSystem.calculerPointsMouvementMax(vitesseMax),
            max: spatialSystem.calculerPointsMouvementMax(vitesseMax)
          },
          etat: "normal",
          actionEnCours: false,
          eveilActif: false,
          tourEveil: 0,
          eveilDebuffs: {}, // Pour Arès Ascendence
          statuts: []
        };
    },

    appliquerEffetHemorragie(joueur) {
        if (joueur.statuts.includes("Hémorragie")) {
            const degatsHemorragie = Math.round(joueur.statsActuelles.pv * 0.10);
            joueur.statsActuelles.pv -= degatsHemorragie;
            // AjouterAuLogDeCombat(joueur.nom + " perd " + degatsHemorragie + " PV à cause de l'hémorragie.")
        }
    },

    resoudreImpact(combatState, attaquant, defenseur, action) {
        // ... calculs des dégâts de base, esquive, etc. ...
    
        // --- LOGIQUE D'ALÉA D'ARÈNE ---
        // On vérifie si l'arène existe et si l'action peut déclencher un aléa.
        if (combatState.arene && action.tags.includes('projection')) {
            
            // On cherche un aléa de type "projection_obstacle" dans l'arène actuelle
            const aleaObstacle = combatState.arene.aleas.find(a => a.type === 'projection_obstacle');
            
            if (aleaObstacle) {
                const degatsSupplementaires = aleaObstacle.resistance_obstacle || 10;
                defenseur.pv -= degatsSupplementaires;
                
                // On ajoute un message spécifique au log du combat
                combatState.log.push(
                    `${attaquant.nom} projette ${defenseur.nom} contre un ${aleaObstacle.nom_obstacle} ! ` +
                    `Il subit ${degatsSupplementaires} dégâts supplémentaires.`
                );
            }
        }
        // --- FIN DE LA LOGIQUE D'ALÉA ---
    
        return combatState;
    },

    appliquerSaignement(joueur) {
        let saignementCount = 0;
        joueur.statuts.forEach(statut => {
            if (statut === 'Saignement') {
                saignementCount++;
            }
        });

        if (saignementCount >= 2) {
            // Remove all saignement statuses
            joueur.statuts = joueur.statuts.filter(statut => statut !== 'Saignement');
            joueur.statuts.push('Hémorragie');
        } else {
            joueur.statuts.push('Saignement');
        }
    }
};

module.exports = combatLogic;
