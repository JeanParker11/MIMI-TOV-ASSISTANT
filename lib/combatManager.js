const combatLogic = require('./combatLogic');
const geminiAI = require('./geminiAI');
const fs = require('fs');
const spatialSystem = require('./spatialSystem');
const esquiveSystem = require('./esquiveSystem');
const combatValidator = require('./combatValidator');
const damageCalculator = require('./damageCalculator');
const equipmentSystem = require('./equipmentSystem');
const skillSystem = require('./skillSystem');
const statusEffects = require('./statusEffects');
const { inactivityManager, gererJoueurInactif } = require('./inactivitySystem');

// Nouveaux systèmes P2
const CombatLogger = require('./combatLogger');
const errorHandler = require('./errorHandler');
const combatStats = require('./combatStats');

const dataManager = require('./dataManager');

// Charger les données nécessaires au démarrage
const rdmTemplate = fs.readFileSync('./data/rdm.txt', 'utf8').split('Exemple rempli')[0];
const glossaireCombat = fs.readFileSync('./data/glossaire_combat.txt', 'utf8');
const arenesData = JSON.parse(fs.readFileSync('./data/arenes_valoria.json', 'utf8'));

let activeCombats = {};

async function initierCombat(combatId, joueur1, joueur2, groupInfo, sock, chatId) {
    try {
        // Récupérer l'arène depuis groupInfo (avec fallback automatique sur Aire des Braves)
        let areneDuCombat = dataManager.findArenaByGroupInfo(groupInfo);
        
        if (!areneDuCombat) {
            console.log("⚠️ Arène non trouvée, utilisation de l'aire des braves par défaut");
            areneDuCombat = arenesData.find(a => a.nom === "Aire des braves") || arenesData[0];
        }
        
        // Initialiser les positions des joueurs selon l'arène
        if (areneDuCombat.position_depart) {
            joueur1.position = areneDuCombat.position_depart.joueur1;
            joueur2.position = areneDuCombat.position_depart.joueur2;
        }
        
        // Réinitialiser les PM au début du combat
        joueur1.points_mouvement.actuels = joueur1.points_mouvement.max;
        joueur2.points_mouvement.actuels = joueur2.points_mouvement.max;

        const combatState = {
            id: combatId,
            joueurs: [joueur1, joueur2],
            tour: 1,
            joueurActif: joueur1,
            p1_action_pavé: null,
            arene: areneDuCombat,
            graceUtilisee: { [joueur1.id]: false, [joueur2.id]: false },
            jetonsInactivite: { [joueur1.id]: 0, [joueur2.id]: 0 },
            chatId: chatId,
            sock: sock
        };
        
        // Initialiser le logger
        combatState.logger = new CombatLogger(combatId);
        combatState.logger.logCombatDebut(combatState.joueurs, areneDuCombat);
        
        activeCombats[combatId] = combatState;
        
        const distance = spatialSystem.calculerDistanceArrondie(joueur1.position, joueur2.position);
        
        let messageDebut = `🥊 **LE COMBAT COMMENCE !** 🥊\n\n`;
        messageDebut += `👤 ${joueur1.pseudo} (${joueur1.faction}) VS ${joueur2.pseudo} (${joueur2.faction})\n`;
        messageDebut += `🏟️ **Lieu :** ${areneDuCombat.nom}\n`;
        messageDebut += `📏 **Distance initiale :** ${distance}m\n`;
        messageDebut += `📍 **Positions :**\n`;
        messageDebut += `   • ${joueur1.pseudo}: (${joueur1.position.x}, ${joueur1.position.y}, ${joueur1.position.z})\n`;
        messageDebut += `   • ${joueur2.pseudo}: (${joueur2.position.x}, ${joueur2.position.y}, ${joueur2.position.z})`;
        
        await sock.sendMessage(chatId, { text: messageDebut });

        demarrerTour(combatState, sock);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du combat:', error);
        
        // Ne pas utiliser combatState dans le catch car il pourrait ne pas être défini
        if (typeof combatState !== 'undefined') {
            await errorHandler.handleError(error, {
                combat: combatState,
                action: 'INIT_COMBAT'
            });
        }
        
        await sock.sendMessage(chatId, { 
            text: '❌ Erreur lors de l\'initialisation du combat. Veuillez réessayer.' 
        });
    }
}

async function demarrerTour(combat, sock) {
    try {
        const [p1, p2] = combat.joueurs;
        const joueurActif = combat.joueurActif;
        const adversaire = p1.id === joueurActif.id ? p2 : p1;
        
        // Logger le début du tour
        if (combat.logger) {
            combat.logger.logTourDebut(combat.tour, joueurActif, {
                joueurs: combat.joueurs.map(j => ({
                    id: j.id,
                    pv: j.statsActuelles.pv,
                    position: j.position,
                    statuts: j.statuts
                }))
            });
        }
        
        // Traiter les effets de statut au début du tour
        const effetsJoueur = statusEffects.traiterEffetsStatut(joueurActif);
        const effetsAdversaire = statusEffects.traiterEffetsStatut(adversaire);
    
    // Afficher les effets de statut s'il y en a
    if (effetsJoueur.messages.length > 0 || effetsAdversaire.messages.length > 0) {
        let messageStatuts = "🔮 **Effets de statut:**\n";
        if (effetsJoueur.messages.length > 0) {
            messageStatuts += `${joueurActif.pseudo}: ${effetsJoueur.messages.join(', ')}\n`;
        }
        if (effetsAdversaire.messages.length > 0) {
            messageStatuts += `${adversaire.pseudo}: ${effetsAdversaire.messages.join(', ')}\n`;
        }
        await sock.sendMessage(combat.chatId, { text: messageStatuts });
    }
    
    // Vérifier si le joueur peut agir
    const capaciteAction = statusEffects.verifierCapaciteAction(joueurActif);
    if (!capaciteAction.peut_agir) {
        await sock.sendMessage(combat.chatId, { 
            text: `${capaciteAction.raison}\n${joueurActif.pseudo} passe son tour.` 
        });
        combat.tour++;
        combat.joueurActif = adversaire;
        demarrerTour(combat, sock);
        return;
    }
    
    // Réinitialiser les PM au début du tour
    joueurActif.points_mouvement.actuels = joueurActif.points_mouvement.max;
    adversaire.points_mouvement.actuels = adversaire.points_mouvement.max;
    
    // Mettre à jour les chargements de compétences
    skillSystem.mettreAJourChargements(joueurActif);
    skillSystem.mettreAJourChargements(adversaire);

    const distance = spatialSystem.calculerDistanceArrondie(joueurActif.position, adversaire.position);

    const startMessage = await sock.sendMessage(combat.chatId, {
        text: `⚔️ **Tour ${combat.tour} - ${joueurActif.pseudo}**\n\n` +
              `📍 Position: (${joueurActif.position.x}, ${joueurActif.position.y}, ${joueurActif.position.z})\n` +
              `🏃 PM disponibles: ${joueurActif.points_mouvement.actuels}/${joueurActif.points_mouvement.max}\n` +
              `📏 Distance adversaire: ${distance}m\n\n` +
              `@${joueurActif.id.split('@')[0]} - Vous avez 10 minutes pour répondre.`,
        mentions: [joueurActif.id]
    });

    combatState.messageToReplyId = startMessage.key.id;

    // Démarrer le système d'inactivité (6 minutes + 1 minute de grâce)
    inactivityManager.startTimer(
        combat.id,
        joueurActif.id,
        (playerId, raison) => {
            // Callback en cas de timeout
            const resultatInactivite = gererJoueurInactif(joueurActif, raison);
            sock.sendMessage(combat.chatId, { text: resultatInactivite.message });
            
            // Passer au tour suivant
            combat.tour++;
            combat.joueurActif = adversaire;
            demarrerTour(combat, sock);
        },
        (chatId, message) => {
            // Fonction pour envoyer les messages d'avertissement
            sock.sendMessage(chatId, message);
        }
    );

        combatState.timers = [];
        
    } catch (error) {
        console.error('❌ Erreur dans demarrerTour:', error);
        
        // Tenter de récupérer avec errorHandler
        const recovery = await errorHandler.handleError(error, {
            combat: combat,
            joueur: combat.joueurActif,
            action: 'DEMARRER_TOUR'
        });
        
        if (recovery.recovered) {
            console.log('✅ Récupération réussie, tour suivant...');
            combat.tour++;
            combat.joueurActif = combat.joueurs.find(j => j.id !== combat.joueurActif.id);
            demarrerTour(combat, sock);
        } else {
            await sock.sendMessage(combat.chatId, { 
                text: '❌ Erreur critique dans le tour. Combat interrompu.' 
            });
            
            // Logger l'erreur
            if (combat.logger) {
                combat.logger.logErreur(error, { critique: true });
            }
        }
    }
}

function gererTempsEcoule(joueurEnRetard, combatState, sock) {
    // Cette fonction n'est plus utilisée avec le nouveau système d'inactivité
    combatState.timers.forEach(timer => clearTimeout(timer));

    sock.sendMessage(combatState.chatId, { text: `${joueurEnRetard.pseudo} est immobile. L'adversaire peut en profiter.` });

    if (combatState.graceUtilisee[joueurEnRetard.id] === false) {
        sock.sendMessage(combatState.chatId, { text: "Une période de grâce de 60 secondes commence." });
        combatState.graceUtilisee[joueurEnRetard.id] = true;
        const MINUTEUR_GRACE = setTimeout(() => {
            sanctionnerInactivite(joueurEnRetard, combatState, sock)
        }, 60000);
        combatState.timers = [MINUTEUR_GRACE];
    } else {
        sock.sendMessage(combatState.chatId, { text: "Période de grâce déjà utilisée. Sanction appliquée." });
        sanctionnerInactivite(joueurEnRetard, combatState, sock)
    }
}

function sanctionnerInactivite(joueurEnRetard, combatState, sock) {
    combatState.jetonsInactivite[joueurEnRetard.id]++;
    sock.sendMessage(combatState.chatId, { text: `${joueurEnRetard.pseudo} reçoit 1 jeton d'inactivité. Total : ${combatState.jetonsInactivite[joueurEnRetard.id]}` });

    if (combatState.jetonsInactivite[joueurEnRetard.id] >= 3) {
        const vainqueur = combatState.joueurs.find(j => j.id !== joueurEnRetard.id);
        declarerForfait(joueurEnRetard, vainqueur, combatState, sock);
    } else {
        const adversaire = combatState.joueurs.find(j => j.id !== joueurEnRetard.id);
        combatState.joueurActif = adversaire;
        demarrerTour(combatState, sock);
    }
}

function declarerForfait(perdant, gagnant, combatState, sock) {
    endCombat(combatState, gagnant, perdant, sock, "Forfait par inactivité");
}

async function handleCombatReply(message, sock) {
    try {
        const combat = Object.values(activeCombats).find(c => c.messageToReplyId === message.quoted.id);
        if (!combat) return;

        // Arrêter le timer d'inactivité
        if (combat.timers) {
            combat.timers.forEach(timer => clearTimeout(timer));
        }
        inactivityManager.stopTimer(combat.id, combat.joueurActif.id);

        const joueurActuel = combat.joueurActif;
        if (message.sender !== joueurActuel.id) {
            return; // Ce n'est pas le tour de ce joueur
        }

        // Logger l'action du joueur
        if (combat.logger) {
            combat.logger.logActionJoueur(joueurActuel.id, message.body, combat.tour);
        }

        combatLogic.appliquerEffetHemorragie(joueurActuel);
        if (joueurActuel.statsActuelles.pv <= 0) {
            const winner = combat.joueurs.find(p => p.id !== joueurActuel.id);
            endCombat(combat, winner, joueurActuel, sock, "Mort par hémorragie");
            return;
        }

        if (combat.joueurActif.id === combat.joueurs[0].id) { // Tour du joueur 1
            combat.p1_action_pavé = message.body;
            const adversaire = combat.joueurs[1];
            combat.joueurActif = adversaire;
            demarrerTour(combat, sock);
            
            if (adversaire.id === 'ai_opponent') {
                const aiAction = require('./aiOpponent').getAIAction(combat);
                await processTurn(combat, aiAction, sock);
            }
            
        } else { // Tour du joueur 2
            const p2_pavé = message.body;
            await processTurn(combat, p2_pavé, sock);
        }
        
    } catch (error) {
        console.error('❌ Erreur dans handleCombatReply:', error);
        
        const recovery = await errorHandler.handleError(error, {
            combat: combat,
            action: 'HANDLE_REPLY'
        });
        
        if (!recovery.recovered) {
            await sock.sendMessage(combat.chatId, { 
                text: '❌ Erreur lors du traitement de votre action. Veuillez réessayer.' 
            });
        }
    }
}

async function processTurn(combat, p2_pavé, sock) {
    await sock.sendMessage(combat.chatId, { text: `Analyse du tour ${combat.tour} par l'IA... ⏳` });

    const [p1, p2] = combat.joueurs;
    
    // Logger le pavé du joueur 2
    if (combat.logger) {
        combat.logger.logActionJoueur(p2.id, p2_pavé, combat.tour);
    }
    
    // Activation automatique de l'éveil au tour 3
    const combatEngine = require('./combatEngine');
    const eveilP1 = combatEngine.activerEveil(p1, combat.tour);
    const eveilP2 = combatEngine.activerEveil(p2, combat.tour);
    
    // Notifier l'activation de l'éveil
    if (combat.tour === 3) {
        await sock.sendMessage(combat.chatId, { 
            text: `🔥 **ÉTAT D'ÉVEIL ACTIVÉ !** 🔥\n\n` +
                  `${p1.pseudo} (${p1.faction}) entre en éveil !\n` +
                  `${p2.pseudo} (${p2.faction}) entre en éveil !\n\n` +
                  `Les capacités spéciales sont maintenant actives pour les 2 prochains tours.`
        });
    } else if (combat.tour === 5) {
        await sock.sendMessage(combat.chatId, { 
            text: `⚡ Les effets d'éveil se dissipent...`
        });
    }
    const analysisPrompt = `
            Tu es un arbitre de combat expert et logique. Analyse le tour de jeu suivant en te basant STRICTEMENT sur le glossaire fourni.

            --- GLOSSAIRE DE COMBAT ---
            ${glossaireCombat}
            ---------------------------

            CONTEXTE:
            - Arène: ${combat.arene.nom} (${combat.arene.dimensions.x_max}x${combat.arene.dimensions.y_max}x${combat.arene.dimensions.z_max}m)
            - Tour: ${combat.tour}
            - Éveil actif: ${combat.tour >= 3 && combat.tour <= 4 ? 'OUI' : 'NON'}
            
            JOUEUR 1 (${p1.pseudo}):
            - Faction: ${p1.faction}
            - PV: ${p1.statsActuelles.pv}/100
            - PF (Force): ${p1.statsActuelles.pf}/${p1.statsInitiales.force}
            - PM (Points Mouvement): ${p1.points_mouvement.actuels}/${p1.points_mouvement.max}
            - Position: (${p1.position.x}, ${p1.position.y}, ${p1.position.z})
            - Vitesse: ${p1.statsActuelles.vitesse} m/s
            - Statuts: ${p1.statuts.join(', ') || 'Aucun'}
            - Équipement: ${JSON.stringify(p1.equipement || 'Aucun')}
            
            JOUEUR 2 (${p2.pseudo}):
            - Faction: ${p2.faction}
            - PV: ${p2.statsActuelles.pv}/100
            - PF (Force): ${p2.statsActuelles.pf}/${p2.statsInitiales.force}
            - PM (Points Mouvement): ${p2.points_mouvement.actuels}/${p2.points_mouvement.max}
            - Position: (${p2.position.x}, ${p2.position.y}, ${p2.position.z})
            - Vitesse: ${p2.statsActuelles.vitesse} m/s
            - Statuts: ${p2.statuts.join(', ') || 'Aucun'}
            - Équipement: ${JSON.stringify(p2.equipement || 'Aucun')}

            DISTANCE ACTUELLE: ${spatialSystem.calculerDistanceArrondie(p1.position, p2.position)}m

            ACTIONS DÉCLARÉES:
            - Action de ${p1.pseudo}: "${combat.p1_action_pavé}"
            - Action de ${p2.pseudo}: "${p2_pavé}"

            INSTRUCTIONS CRITIQUES:
            1. Analyse d'abord les DÉPLACEMENTS décrits par les joueurs
               - Identifie les coordonnées cibles (x, y, z)
               - Exemple: "Je me déplace vers le poteau au centre" → analyser où se trouve ce poteau
               - Si aucune coordonnée claire, estime selon la description
            
            2. Pour chaque ATTAQUE:
               - Vérifie la PORTÉE selon la distance
               - Types de portée:
                 * Corps à corps (poing): Distance = 0 (même case)
                 * Coup de pied: Distance = 1m
                 * Arme de mêlée: Distance 0-2m
                 * Arme à distance: Variable selon l'arme
               - Détermine la force utilisée (1-10), la zone ciblée, la vitesse de l'attaque (en m/s)
               - Note si le défenseur est "en action" (attaque simultanée = pénalité esquive)
            
            3. ESQUIVE AUTOMATIQUE:
               - Si l'attaque est dans la portée, calcule si le défenseur peut esquiver
               - Temps de réaction du défenseur (selon vitesse)
               - Temps d'impact = Distance / VitesseAttaque
            
            4. Structure JSON à retourner:
            {
              "resultat_tour": [
                {
                  "type": "DEPLACEMENT",
                  "joueur_id": "<id>",
                  "position_actuelle": {"x": X, "y": Y, "z": Z},
                  "position_cible": {"x": X2, "y": Y2, "z": Z2},
                  "description": "Description du déplacement",
                  "pm_utilises": <nombre>
                },
                {
                  "type": "ATTAQUE",
                  "attaquant_id": "<id>",
                  "defenseur_id": "<id>",
                  "action_nom": "Type d'attaque",
                  "forceUtilisee": <nombre>,
                  "zoneCible": "tete|torse|bras|jambes",
                  "distance": <nombre en mètres>,
                  "vitesse_attaque": <nombre en m/s>,
                  "portee_valide": <boolean>,
                  "esquive_tentee": <boolean>,
                  "esquive_reussie": <boolean>,
                  "degats": <nombre>,
                  "effet": "saignement|etourdissement|aucun"
                }
              ]
            }
        `;

    try {
        const tourResultRaw = await geminiAI.generateContent(analysisPrompt);
        const tourResultBrut = JSON.parse(tourResultRaw.replace(/```json\n|```/g, ''));
        
        // VALIDATION DE LA RÉPONSE IA
        const validation = combatValidator.validerTourIA(tourResultBrut, combat);
        
        if (!validation.valide && validation.erreurs.length > 0) {
            console.error("❌ Erreurs de validation IA:", validation.erreurs);
            await sock.sendMessage(combat.chatId, { 
                text: `⚠️ Problèmes détectés dans l'analyse :\n${validation.erreurs.join('\n')}`
            });
            
            // Si les erreurs sont critiques, arrêter le traitement
            if (validation.erreurs.some(err => err.includes('CRITIQUE'))) {
                throw new Error('Validation IA échouée: ' + validation.erreurs.join(', '));
            }
        }
        
        // Utiliser le résultat corrigé/validé
        const tourResult = validation.resultat_corrige || tourResultBrut;
        
        let recapTechnique = "";
        let deplacementsEffectues = [];

        for (const res of tourResult.resultat_tour) {
            // === TRAITEMENT DES DÉPLACEMENTS ===
            if (res.type === 'DEPLACEMENT') {
                const joueur = combat.joueurs.find(p => p.id === res.joueur_id);
                const positionCible = res.position_cible;
                
                const deplacement = spatialSystem.tenterDeplacement(joueur, positionCible, combat.arene);
                
                if (deplacement.succes) {
                    recapTechnique += `📍 ${joueur.pseudo} se déplace vers (${positionCible.x}, ${positionCible.y}, ${positionCible.z}). Coût: ${deplacement.pm_utilises} PM. `;
                    deplacementsEffectues.push({
                        joueur: joueur.pseudo,
                        ancienne: res.position_actuelle,
                        nouvelle: positionCible,
                        cout: deplacement.pm_utilises
                    });
                    
                    // Logger le déplacement
                    if (combat.logger) {
                        combat.logger.logDeplacement(joueur, res.position_actuelle, positionCible, deplacement.pm_utilises, deplacement.chemin);
                    }
                } else {
                    recapTechnique += `❌ ${joueur.pseudo} ne peut pas se déplacer: ${deplacement.message} `;
                }
            }
            
            // === TRAITEMENT DES ATTAQUES ===
            else if (res.type === 'ATTAQUE') {
                const attaquant = combat.joueurs.find(p => p.id === res.attaquant_id);
                const defenseur = combat.joueurs.find(p => p.id === res.defenseur_id);

                // Marquer l'attaquant en action
                attaquant.actionEnCours = true;

                // Vérifier la portée
                if (!res.portee_valide) {
                    recapTechnique += `❌ ${attaquant.pseudo}: Attaque hors de portée (${res.distance}m). `;
                    continue;
                }

                // Tentative d'esquive automatique
                const action = {
                    vitesseAttaque: res.vitesse_attaque || 10,
                    nom: res.action_nom
                };
                
                const esquiveResult = esquiveSystem.esquiveComplete(
                    attaquant, 
                    defenseur, 
                    action, 
                    { 
                        distance: res.distance,
                        actionEnCours: defenseur.actionEnCours 
                    }
                );

                if (esquiveResult.succes && !esquiveResult.impossible) {
                    recapTechnique += `✓ ${defenseur.pseudo} esquive l'attaque de ${attaquant.pseudo}! (${esquiveResult.message}) `;
                    
                    // Logger l'esquive
                    if (combat.logger) {
                        combat.logger.logEsquive(defenseur, attaquant, esquiveResult);
                    }
                    
                    continue;
                }

                // L'attaque touche - CALCUL DE DÉGÂTS RÉEL
                const resistanceZone = defenseur.resistances[res.zoneCible] || defenseur.resistances.torse;
                
                const calculDegats = damageCalculator.calculerDegatsPV({
                    forceUtilisee: res.forceUtilisee || 5,
                    resistanceZone: resistanceZone,
                    zoneCible: res.zoneCible || 'torse',
                    arme: attaquant.equipement?.arme || null,
                    typeAttaque: res.action_nom || 'corps',
                    faction: defenseur.faction?.toLowerCase(),
                    eveilActif: defenseur.eveilActif || false,
                    statuts: defenseur.statuts || []
                });
                
                // Appliquer les dégâts calculés
                if (calculDegats.degatsDefenseur > 0) {
                    defenseur.statsActuelles.pv -= calculDegats.degatsDefenseur;
                    recapTechnique += calculDegats.message + ' ';
                    
                    // Logger l'attaque
                    if (combat.logger) {
                        combat.logger.logAttaque(attaquant, defenseur, {
                            type_attaque: res.action_nom || 'corps',
                            force_utilisee: res.forceUtilisee,
                            zone_cible: res.zoneCible || 'torse',
                            distance: res.distance,
                            arme_utilisee: attaquant.equipement?.arme?.nom || 'Aucune',
                            degats_infliges: calculDegats.degatsDefenseur,
                            type_impact: calculDegats.typeImpact || 'normal',
                            effets_appliques: calculDegats.effets || []
                        });
                    }
                    
                    // Appliquer les effets
                    for (const effet of calculDegats.effets) {
                        if (effet === 'saignement') {
                            combatLogic.appliquerSaignement(defenseur);
                            recapTechnique += `🩸 Saignement appliqué. `;
                        } else if (effet === 'etourdissement_possible' && Math.random() < 0.3) {
                            if (!defenseur.statuts.includes('Étourdi')) {
                                defenseur.statuts.push('Étourdi');
                                recapTechnique += `💫 ${defenseur.pseudo} est étourdi! `;
                            }
                        } else if (effet === 'hemorragie_possible' && Math.random() < 0.2) {
                            if (!defenseur.statuts.includes('Hémorragie')) {
                                defenseur.statuts.push('Hémorragie');
                                recapTechnique += `🩸🩸 Hémorragie grave! `;
                            }
                        }
                    }
                } else if (calculDegats.typeImpact === 'parade') {
                    // Parade : fatigue et usure de résistance
                    defenseur.statsActuelles.pf -= Math.min(5, res.forceUtilisee);
                    defenseur.resistances[res.zoneCible] -= 1;
                    recapTechnique += calculDegats.message + ' ';
                } else if (calculDegats.typeImpact === 'faible') {
                    // Coup faible : dégâts de recul à l'attaquant
                    if (calculDegats.degatsAttaquant > 0) {
                        attaquant.statsActuelles.pv -= calculDegats.degatsAttaquant;
                        attaquant.statsActuelles.esprit -= Math.round(attaquant.statsInitiales.esprit * 0.1);
                        recapTechnique += calculDegats.message + ' ';
                    }
                }
            }
        }

        const narrationPrompt = `Tu es un narrateur de combat épique. Résume ce qui s'est passé : ${recapTechnique}`;
        const narrationFinale = await geminiAI.generateContent(narrationPrompt);
        await sock.sendMessage(combat.chatId, { text: narrationFinale });

        const perdant1 = combat.joueurs.find(p => p.statsActuelles.pv <= 0);
        if (perdant1) {
            const gagnant1 = combat.joueurs.find(p => p.id !== perdant1.id);
            endCombat(combat, gagnant1, perdant1, sock);
            return;
        }

        // Affichage détaillé de l'état après le tour
        // Charger l'équipement des joueurs
        const equipementP1 = equipmentSystem.obtenirEquipementJoueur(p1.id);
        const equipementP2 = equipmentSystem.obtenirEquipementJoueur(p2.id);
        
        // Obtenir les compétences utilisables
        const competencesP1 = skillSystem.obtenirCompetencesUtilisables(p1, combat.tour);
        const competencesP2 = skillSystem.obtenirCompetencesUtilisables(p2, combat.tour);
        
        const distance = spatialSystem.calculerDistanceArrondie(p1.position, p2.position);
        const etat = `📊 **État après Tour ${combat.tour}**\n\n` +
                     `👤 **${p1.pseudo}** (${p1.faction})\n` +
                     `   • PV: ${p1.statsActuelles.pv}/100 | PF: ${p1.statsActuelles.pf}/${p1.statsInitiales.force}\n` +
                     `   • Position: (${p1.position.x}, ${p1.position.y}, ${p1.position.z})\n` +
                     `   • PM restants: ${p1.points_mouvement.actuels}/${p1.points_mouvement.max}\n` +
                     `   • Statuts: ${p1.statuts.join(', ') || 'Aucun'}\n` +
                     `   • Armes équipées: ${equipementP1.main_droite?.nom || 'Aucune'} (D), ${equipementP1.main_gauche?.nom || 'Aucune'} (G)\n` +
                     `   • Compétences disponibles: ${competencesP1.map(c => c.nom).join(', ') || 'Aucune'}\n\n` +
                     `👤 **${p2.pseudo}** (${p2.faction})\n` +
                     `   • PV: ${p2.statsActuelles.pv}/100 | PF: ${p2.statsActuelles.pf}/${p2.statsInitiales.force}\n` +
                     `   • Position: (${p2.position.x}, ${p2.position.y}, ${p2.position.z})\n` +
                     `   • PM restants: ${p2.points_mouvement.actuels}/${p2.points_mouvement.max}\n` +
                     `   • Statuts: ${p2.statuts.join(', ') || 'Aucun'}\n` +
                     `   • Armes équipées: ${equipementP2.main_droite?.nom || 'Aucune'} (D), ${equipementP2.main_gauche?.nom || 'Aucune'} (G)\n` +
                     `   • Compétences disponibles: ${competencesP2.map(c => c.nom).join(', ') || 'Aucune'}\n\n` +
                     `📏 **Distance entre combattants:** ${distance}m`;
        
        await sock.sendMessage(combat.chatId, { text: etat });

        combat.tour++;
        combat.joueurActif = p1;
        combat.p1_action_pavé = null;
        const perdant2 = combat.joueurs.find(p => p.statsActuelles.pv <= 0);
        if (perdant2) {
            const gagnant2 = combat.joueurs.find(p => p.statsActuelles.pv > 0);
            
            // Message de victoire
            let messageVictoire = `🏆 **VICTOIRE DE ${gagnant2.pseudo.toUpperCase()}!**\n`;
            messageVictoire += `💀 ${perdant2.pseudo} est KO!\n\n`;
            
            // Calculer les récompenses
            let recompenseVainqueur = 1; // +1 diamant de base
            let recompenseVaincu = 0;     // Rien par défaut
            
            // Bonus spéciaux selon l'arène
            if (combat.arene && combat.arene.nom) {
                if (combat.arene.nom.toLowerCase().includes('meryss') || 
                    combat.arene.nom.toLowerCase().includes('mer')) {
                    recompenseVainqueur = 3; // Bonus Meryss Arena
                    recompenseVaincu = 1;
                    messageVictoire += `🌊 Bonus Meryss Arena appliqué!\n`;
                } else if (combat.arene.nom.toLowerCase().includes('rois braves')) {
                    recompenseVainqueur = 5; // Bonus finale
                    recompenseVaincu = 2;
                    messageVictoire += `👑 Bonus Arène des Rois Braves!\n`;
                }
            }
            
            // Bonus de performance exceptionnelle
            const pvRestants = gagnant2.statsActuelles.pv;
            if (pvRestants >= 80) {
                recompenseVainqueur += 2;
                messageVictoire += `⭐ Victoire écrasante! Bonus +2 diamants\n`;
            } else if (pvRestants >= 50) {
                recompenseVainqueur += 1;
                messageVictoire += `✨ Belle victoire! Bonus +1 diamant\n`;
            }
            
            // Afficher les récompenses
            messageVictoire += `\n💎 **Récompenses:**\n`;
            messageVictoire += `• ${gagnant2.pseudo}: +${recompenseVainqueur} diamant${recompenseVainqueur > 1 ? 's' : ''}\n`;
            if (recompenseVaincu > 0) {
                messageVictoire += `• ${perdant2.pseudo}: +${recompenseVaincu} diamant${recompenseVaincu > 1 ? 's' : ''}\n`;
            }
            
            await sock.sendMessage(combat.chatId, { text: messageVictoire });
            
            // Mettre à jour le palmarès
            dataManager.updatePalmares([
                { id: gagnant2.id, resultat: 'victoire' },
                { id: perdant2.id, resultat: 'defaite' }
            ]);
            
            // Mettre à jour la banque (diamants)
            const transactions = [
                { id: gagnant2.id, currency: 'diamants', amount: recompenseVainqueur }
            ];
            
            if (recompenseVaincu > 0) {
                transactions.push({ id: perdant2.id, currency: 'diamants', amount: recompenseVaincu });
            }
            
            dataManager.updateCurrency(transactions);
            
            delete activeCombats[combat.id];
            return;
        }

        demarrerTour(combat, sock);

    } catch (e) {
        console.error("Erreur IA pendant l'analyse du tour:", e);
        
        // Logger l'erreur
        if (combat.logger) {
            combat.logger.logErreur(e, { 
                contexte: 'PROCESS_TURN',
                tour: combat.tour,
                critique: false 
            });
        }
        
        // Tenter de récupérer
        const recovery = await errorHandler.handleError(e, {
            combat: combat,
            action: 'PROCESS_TURN',
            rawResponse: e.message?.includes('JSON') ? e.message : null
        });
        
        if (recovery.recovered) {
            // Si récupération réussie, continuer avec les données récupérées
            if (recovery.action === 'SKIP_TURN') {
                await sock.sendMessage(combat.chatId, { 
                    text: "⚠️ Tour sauté suite à une erreur. Passage au tour suivant." 
                });
                combat.tour++;
                combat.joueurActif = p1;
                demarrerTour(combat, sock);
            }
        } else {
            await sock.sendMessage(combat.chatId, { 
                text: "🤖 L'IA a rencontré un problème critique. Combat interrompu." 
            });
        }
    }
}

async function endCombat(combatState, winner, loser, sock, reason) {
    try {
        // Logger la fin du combat
        if (combatState.logger) {
            const stats = combatState.logger.genererStatistiques();
            combatState.logger.logCombatFin(winner, loser, reason, stats);
        }
        
        // Mettre à jour les statistiques
        if (winner && loser) {
            combatStats.updateCombatStats({
                vainqueur: winner,
                perdant: loser,
                combat: combatState,
                logger: combatState.logger
            });
        }
        
        // Nettoyer le système d'inactivité
        inactivityManager.cleanupCombat(combatState.id);
        
        if (winner && loser) {
            dataManager.updatePalmares([
                { id: winner.id, resultat: 'victoire' },
                { id: loser.id, resultat: 'defaite' }
            ]);
            dataManager.updateCurrency([
                { id: winner.id, currency: 'diamants', amount: 1 }
            ]);

        const finalComment = reason || `Victoire de ${winner.pseudo} sur ${loser.pseudo}`;

        const rdm = rdmTemplate
            .replace(/📊 𝗠𝗮𝘁𝗰𝗵 𝗥𝗲𝘀𝘂𝗹𝘁𝘀 :.*/s, `📊 𝗠𝗮𝘁𝗰𝗵 𝗥𝗲𝘀𝘂𝗹𝘁𝘀 : ${finalComment}`)
            .replace(/👤 𝗣𝗲𝗿𝘁𝗲 𝗱𝗲𝘀 𝗝𝗼𝘂𝗲𝘂𝗿𝘀 :.*/, '👤 𝗣𝗲𝗿𝘁𝗲 𝗱𝗲𝘀 𝗝𝗼𝘂𝗲𝘂𝗿𝘀 : Aucune')
            .replace(/🔢•𝗦𝗰𝗼𝗿𝗲 :.*/, `🔢•𝗦𝗰𝗼𝗿𝗲 : K.O.`)
            .replace(/🏟•𝗔𝗿𝗲𝗻𝗮 :.*/, `🏟•𝗔𝗿𝗲𝗻𝗮 : ${combatState.arene.nom}`)
            .replace(/👤•𝗠𝗼𝗱𝗲́𝗿𝗮𝘁𝗲𝘂𝗿\(𝘀\) :.*/, `👤•𝗠𝗼𝗱𝗲́𝗿𝗮𝘁𝗲𝘂𝗿(𝘀) : Parky-Bot`)
            .replace(/💰•𝗥𝗲́𝗰𝗼𝗺𝗽𝗲𝗻𝘀𝗲\(𝘀\) 𝗴𝗮𝗴𝗻𝗮𝗻𝘁 :.*/, `💰•𝗥𝗲́𝗰𝗼𝗺𝗽𝗲𝗻𝘀𝗲(𝘀) 𝗴𝗮𝗴𝗻𝗮𝗻𝘁 : 1 💎`)
            .replace(/💰•𝗥𝗲́𝗰𝗼𝗺𝗽𝗲𝗻𝘀𝗲\(𝘀\) 𝗽𝗲𝗿𝗱𝗮𝗻𝘁 :.*/, `💰•𝗥𝗲́𝗰𝗼𝗺𝗽𝗲𝗻𝘀𝗲(𝘀) 𝗽𝗲𝗿𝗱𝗮𝗻𝘁 : 0`);

        await sock.sendMessage(combatState.chatId, { text: rdm, mentions: [winner.id, loser.id] });
    } else {
        dataManager.updatePalmares(combatState.joueurs.map(p => ({ id: p.id, resultat: 'nul' })));
        const rdm = rdmTemplate
            .replace('Victoire pure et brut de l’Atlas Zaraki Vernesis sur l’Arès Kuroro Lucifer. Comme quoi les poings parlent mieux que les reins. (le commentaire de l\'arbitre)', `Match nul après ${combatState.tour} tours.`)
            .replace('Rien', 'Aucune')
            .replace('2-0', 'N/A')
            .replace('Oreki', 'Le Bot') // Placeholder pour le modérateur
            .replace('1 💎', '0 RU')
            .replace('0', '0 RU');
        await sock.sendMessage(combatState.chatId, { text: rdm });
    }

        delete activeCombats[combatState.id];
        
    } catch (error) {
        console.error('❌ Erreur dans endCombat:', error);
        
        // Au minimum, supprimer le combat de la liste active
        if (combatState && combatState.id) {
            delete activeCombats[combatState.id];
        }
        
        await sock.sendMessage(combatState.chatId, { 
            text: '❌ Erreur lors de la finalisation du combat.' 
        });
    }
}


module.exports = {
    initierCombat,
    handleCombatReply
};