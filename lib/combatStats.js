/**
 * SYSTÈME DE STATISTIQUES DE COMBAT
 * Collecte et analyse les données de combat
 */

const fs = require('fs');
const path = require('path');

class CombatStatistics {
  constructor() {
    this.statsPath = path.join(__dirname, '../data/statistics.json');
    this.stats = this.loadStats();
  }
  
  /**
   * Charge les statistiques existantes
   */
  loadStats() {
    if (fs.existsSync(this.statsPath)) {
      return JSON.parse(fs.readFileSync(this.statsPath, 'utf8'));
    }
    return {};
  }
  
  /**
   * Sauvegarde les statistiques
   */
  saveStats() {
    fs.writeFileSync(this.statsPath, JSON.stringify(this.stats, null, 2));
  }
  
  /**
   * Initialise les stats d'un joueur
   */
  initPlayerStats(playerId) {
    if (!this.stats[playerId]) {
      this.stats[playerId] = {
        general: {
          combats_total: 0,
          victoires: 0,
          defaites: 0,
          nuls: 0,
          abandons: 0,
          taux_victoire: 0,
          serie_actuelle: 0,
          meilleure_serie: 0
        },
        offensif: {
          degats_total_infliges: 0,
          degats_moyen_par_combat: 0,
          degats_max_un_coup: 0,
          coups_critiques: 0,
          coups_faibles: 0,
          parades_subies: 0,
          attaques_totales: 0,
          precision: 0
        },
        defensif: {
          degats_total_subis: 0,
          degats_moyen_par_combat: 0,
          esquives_reussies: 0,
          esquives_tentees: 0,
          taux_esquive: 0,
          parades_reussies: 0,
          coups_bloques: 0
        },
        tactique: {
          distance_parcourue_totale: 0,
          distance_moyenne_par_combat: 0,
          pm_utilises_total: 0,
          competences_utilisees: 0,
          objets_utilises: 0,
          tours_joues: 0,
          temps_moyen_par_tour: 0
        },
        par_faction: {
          hermes: { victoires: 0, defaites: 0 },
          hecate: { victoires: 0, defaites: 0 },
          ares: { victoires: 0, defaites: 0 },
          atlas: { victoires: 0, defaites: 0 }
        },
        par_arene: {},
        records: {
          victoire_plus_rapide: null, // en tours
          combat_plus_long: null,
          pv_restants_max: 0,
          degats_un_tour_max: 0,
          esquives_consecutives_max: 0
        },
        achievements: []
      };
    }
    return this.stats[playerId];
  }
  
  /**
   * Met à jour les stats après un combat
   */
  updateCombatStats(combatData) {
    const { vainqueur, perdant, combat, logger } = combatData;
    
    // Stats du vainqueur
    if (vainqueur) {
      this.updatePlayerCombatStats(vainqueur.id, true, combat, logger);
    }
    
    // Stats du perdant
    if (perdant) {
      this.updatePlayerCombatStats(perdant.id, false, combat, logger);
    }
    
    // Vérifier les achievements
    if (vainqueur) {
      this.checkAchievements(vainqueur.id);
    }
    if (perdant) {
      this.checkAchievements(perdant.id);
    }
    
    this.saveStats();
  }
  
  /**
   * Met à jour les stats d'un joueur pour un combat
   */
  updatePlayerCombatStats(playerId, isVictory, combat, logger) {
    const stats = this.initPlayerStats(playerId);
    
    // Stats générales
    stats.general.combats_total++;
    if (isVictory) {
      stats.general.victoires++;
      stats.general.serie_actuelle++;
      if (stats.general.serie_actuelle > stats.general.meilleure_serie) {
        stats.general.meilleure_serie = stats.general.serie_actuelle;
      }
    } else {
      stats.general.defaites++;
      stats.general.serie_actuelle = 0;
    }
    stats.general.taux_victoire = Math.round(
      (stats.general.victoires / stats.general.combats_total) * 100
    );
    
    // Analyser les logs si disponibles
    if (logger && logger.logs) {
      this.analyzeLogsForStats(playerId, logger.logs, isVictory);
    }
    
    // Stats par faction
    const adversaire = combat.joueurs.find(j => j.id !== playerId);
    if (adversaire && adversaire.faction) {
      const faction = adversaire.faction.toLowerCase();
      if (stats.par_faction[faction]) {
        if (isVictory) {
          stats.par_faction[faction].victoires++;
        } else {
          stats.par_faction[faction].defaites++;
        }
      }
    }
    
    // Stats par arène
    if (combat.arene && combat.arene.nom) {
      const areneNom = combat.arene.nom;
      if (!stats.par_arene[areneNom]) {
        stats.par_arene[areneNom] = { victoires: 0, defaites: 0 };
      }
      if (isVictory) {
        stats.par_arene[areneNom].victoires++;
      } else {
        stats.par_arene[areneNom].defaites++;
      }
    }
    
    // Records
    const joueur = combat.joueurs.find(j => j.id === playerId);
    if (joueur && isVictory) {
      const pvRestants = joueur.statsActuelles.pv;
      if (pvRestants > stats.records.pv_restants_max) {
        stats.records.pv_restants_max = pvRestants;
      }
      
      const nombreTours = combat.tour;
      if (!stats.records.victoire_plus_rapide || 
          nombreTours < stats.records.victoire_plus_rapide) {
        stats.records.victoire_plus_rapide = nombreTours;
      }
    }
    
    if (combat.tour > (stats.records.combat_plus_long || 0)) {
      stats.records.combat_plus_long = combat.tour;
    }
  }
  
  /**
   * Analyse les logs pour extraire des stats détaillées
   */
  analyzeLogsForStats(playerId, logs, isVictory) {
    const stats = this.stats[playerId];
    let degatsInfliges = 0;
    let degatsSubis = 0;
    let distanceParcourue = 0;
    let pmUtilises = 0;
    let esquivesReussies = 0;
    let esquivesTentees = 0;
    let attaques = 0;
    let coupsReussis = 0;
    
    logs.forEach(log => {
      switch (log.type) {
        case 'ATTAQUE':
          if (log.data.attaquant.id === playerId) {
            attaques++;
            degatsInfliges += log.data.details.degats_infliges || 0;
            if (log.data.details.degats_infliges > 0) {
              coupsReussis++;
            }
            
            // Tracker les types de coups
            if (log.data.details.type_impact === 'critique') {
              stats.offensif.coups_critiques++;
            } else if (log.data.details.type_impact === 'faible') {
              stats.offensif.coups_faibles++;
            } else if (log.data.details.type_impact === 'parade') {
              stats.offensif.parades_subies++;
            }
            
            // Record de dégâts max
            if (log.data.details.degats_infliges > stats.offensif.degats_max_un_coup) {
              stats.offensif.degats_max_un_coup = log.data.details.degats_infliges;
            }
          } else if (log.data.defenseur.id === playerId) {
            degatsSubis += log.data.details.degats_infliges || 0;
          }
          break;
          
        case 'ESQUIVE':
          if (log.data.defenseur.id === playerId) {
            esquivesTentees++;
            if (log.data.resultat.succes) {
              esquivesReussies++;
            }
          }
          break;
          
        case 'DEPLACEMENT':
          if (log.data.joueur.id === playerId) {
            distanceParcourue += log.data.distance || 0;
            pmUtilises += log.data.pm_utilises || 0;
          }
          break;
          
        case 'COMPETENCE':
          if (log.data.utilisateur.id === playerId) {
            stats.tactique.competences_utilisees++;
          }
          break;
      }
    });
    
    // Mettre à jour les stats cumulatives
    stats.offensif.degats_total_infliges += degatsInfliges;
    stats.offensif.attaques_totales += attaques;
    if (attaques > 0) {
      stats.offensif.precision = Math.round((coupsReussis / attaques) * 100);
    }
    
    stats.defensif.degats_total_subis += degatsSubis;
    stats.defensif.esquives_reussies += esquivesReussies;
    stats.defensif.esquives_tentees += esquivesTentees;
    if (esquivesTentees > 0) {
      stats.defensif.taux_esquive = Math.round(
        (stats.defensif.esquives_reussies / stats.defensif.esquives_tentees) * 100
      );
    }
    
    stats.tactique.distance_parcourue_totale += distanceParcourue;
    stats.tactique.pm_utilises_total += pmUtilises;
    
    // Calculer les moyennes
    const combats = stats.general.combats_total;
    if (combats > 0) {
      stats.offensif.degats_moyen_par_combat = Math.round(
        stats.offensif.degats_total_infliges / combats
      );
      stats.defensif.degats_moyen_par_combat = Math.round(
        stats.defensif.degats_total_subis / combats
      );
      stats.tactique.distance_moyenne_par_combat = Math.round(
        stats.tactique.distance_parcourue_totale / combats
      );
    }
  }
  
  /**
   * Vérifie et attribue les achievements
   */
  checkAchievements(playerId) {
    const stats = this.stats[playerId];
    const achievements = stats.achievements || [];
    
    const possibleAchievements = [
      {
        id: 'first_blood',
        nom: 'Premier Sang',
        condition: () => stats.general.victoires >= 1,
        description: 'Remporter votre premier combat'
      },
      {
        id: 'veteran',
        nom: 'Vétéran',
        condition: () => stats.general.combats_total >= 10,
        description: 'Participer à 10 combats'
      },
      {
        id: 'champion',
        nom: 'Champion',
        condition: () => stats.general.victoires >= 25,
        description: 'Remporter 25 victoires'
      },
      {
        id: 'invincible',
        nom: 'Invincible',
        condition: () => stats.general.meilleure_serie >= 10,
        description: 'Gagner 10 combats d\'affilée'
      },
      {
        id: 'perfect',
        nom: 'Victoire Parfaite',
        condition: () => stats.records.pv_restants_max >= 95,
        description: 'Gagner avec 95+ PV restants'
      },
      {
        id: 'speedrun',
        nom: 'Speedrun',
        condition: () => stats.records.victoire_plus_rapide && 
                        stats.records.victoire_plus_rapide <= 3,
        description: 'Gagner en 3 tours ou moins'
      },
      {
        id: 'tank',
        nom: 'Tank',
        condition: () => stats.defensif.degats_total_subis >= 1000,
        description: 'Subir 1000 points de dégâts au total'
      },
      {
        id: 'assassin',
        nom: 'Assassin',
        condition: () => stats.offensif.degats_max_un_coup >= 50,
        description: 'Infliger 50+ dégâts en un coup'
      },
      {
        id: 'dodger',
        nom: 'Insaisissable',
        condition: () => stats.defensif.taux_esquive >= 75 && 
                        stats.defensif.esquives_tentees >= 10,
        description: 'Maintenir 75% de taux d\'esquive (min 10 tentatives)'
      },
      {
        id: 'sniper',
        nom: 'Tireur d\'élite',
        condition: () => stats.offensif.precision >= 90 && 
                        stats.offensif.attaques_totales >= 20,
        description: '90% de précision (min 20 attaques)'
      }
    ];
    
    possibleAchievements.forEach(achievement => {
      if (!achievements.find(a => a.id === achievement.id)) {
        if (achievement.condition()) {
          achievements.push({
            id: achievement.id,
            nom: achievement.nom,
            description: achievement.description,
            date_obtention: new Date().toISOString()
          });
          
          console.log(`🏆 Achievement débloqué: ${achievement.nom}!`);
        }
      }
    });
    
    stats.achievements = achievements;
  }
  
  /**
   * Obtient le profil statistique d'un joueur
   */
  getPlayerProfile(playerId) {
    const stats = this.stats[playerId];
    if (!stats) {
      return null;
    }
    
    return {
      resume: {
        combats: stats.general.combats_total,
        victoires: stats.general.victoires,
        taux_victoire: stats.general.taux_victoire + '%',
        serie_actuelle: stats.general.serie_actuelle
      },
      combat: {
        degats_moyens: stats.offensif.degats_moyen_par_combat,
        precision: stats.offensif.precision + '%',
        taux_esquive: stats.defensif.taux_esquive + '%',
        distance_moyenne: stats.tactique.distance_moyenne_par_combat + 'm'
      },
      records: stats.records,
      achievements: stats.achievements.length,
      titre: this.getPlayerTitle(stats)
    };
  }
  
  /**
   * Détermine le titre d'un joueur selon ses stats
   */
  getPlayerTitle(stats) {
    const victoires = stats.general.victoires;
    const tauxVictoire = stats.general.taux_victoire;
    
    if (victoires >= 100 && tauxVictoire >= 70) return '👑 Légende';
    if (victoires >= 50 && tauxVictoire >= 60) return '⚔️ Maître d\'Armes';
    if (victoires >= 25) return '🗡️ Guerrier Vétéran';
    if (victoires >= 10) return '🛡️ Combattant Aguerri';
    if (victoires >= 5) return '⚔️ Apprenti Guerrier';
    if (victoires >= 1) return '🗡️ Novice';
    return '👤 Recrue';
  }
  
  /**
   * Génère un rapport de combat détaillé
   */
  generateCombatReport(combatId, logger) {
    const stats = logger.genererStatistiques();
    
    return {
      id: combatId,
      duree: logger.logs[logger.logs.length - 1]?.temps_ecoule || 0,
      tours: stats.nombre_tours,
      actions: {
        attaques: stats.nombre_attaques,
        esquives: stats.nombre_esquives,
        deplacements: stats.nombre_deplacements,
        competences: stats.nombre_competences
      },
      degats_total: stats.degats_totaux,
      erreurs: stats.erreurs,
      mvp: this.determineMVP(logger.logs)
    };
  }
  
  /**
   * Détermine le MVP du combat
   */
  determineMVP(logs) {
    const scores = {};
    
    logs.forEach(log => {
      if (log.type === 'ATTAQUE' && log.data.details.degats_infliges > 0) {
        const id = log.data.attaquant.id;
        scores[id] = (scores[id] || 0) + log.data.details.degats_infliges;
      }
    });
    
    let mvp = null;
    let maxScore = 0;
    
    Object.entries(scores).forEach(([id, score]) => {
      if (score > maxScore) {
        maxScore = score;
        mvp = id;
      }
    });
    
    return mvp;
  }
}

// Instance singleton
const combatStats = new CombatStatistics();

module.exports = combatStats;
