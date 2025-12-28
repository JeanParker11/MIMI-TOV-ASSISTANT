/**
 * SYSTÈME DE LOGS ET HISTORIQUE DE COMBAT
 * Enregistre toutes les actions pour analyse et replay
 */

const fs = require('fs');
const path = require('path');

class CombatLogger {
  constructor(combatId) {
    this.combatId = combatId;
    this.logs = [];
    this.startTime = Date.now();
    this.logPath = path.join(__dirname, '../logs/combats');
    
    // Créer le dossier logs s'il n'existe pas
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }
  
  /**
   * Enregistre une entrée dans les logs
   * @param {string} type - Type d'événement
   * @param {Object} data - Données de l'événement
   */
  log(type, data) {
    const entry = {
      timestamp: Date.now(),
      tour: data.tour || 0,
      type: type,
      data: data,
      temps_ecoule: Date.now() - this.startTime
    };
    
    this.logs.push(entry);
    
    // Écriture asynchrone pour ne pas bloquer
    this.writeToFile(entry);
    
    return entry;
  }
  
  /**
   * Log le début du combat
   */
  logCombatDebut(joueurs, arene) {
    return this.log('COMBAT_DEBUT', {
      joueurs: joueurs.map(j => ({
        id: j.id,
        pseudo: j.pseudo,
        faction: j.faction,
        stats_initiales: j.statsInitiales,
        position_initiale: j.position
      })),
      arene: {
        nom: arene.nom,
        dimensions: arene.dimensions,
        obstacles: arene.obstacles,
        aleas: arene.aleas
      },
      timestamp_debut: new Date().toISOString()
    });
  }
  
  /**
   * Log le début d'un tour
   */
  logTourDebut(tour, joueurActif, etat) {
    return this.log('TOUR_DEBUT', {
      tour: tour,
      joueur_actif: {
        id: joueurActif.id,
        pseudo: joueurActif.pseudo,
        pv: joueurActif.statsActuelles.pv,
        position: joueurActif.position,
        pm: joueurActif.points_mouvement.actuels,
        statuts: joueurActif.statuts
      },
      etat_global: etat
    });
  }
  
  /**
   * Log une action du joueur (pavé brut)
   */
  logActionJoueur(joueurId, pave, tour) {
    return this.log('ACTION_JOUEUR', {
      tour: tour,
      joueur_id: joueurId,
      pave_brut: pave,
      longueur: pave.length,
      mots_cles_detectes: this.extraireMosCles(pave)
    });
  }
  
  /**
   * Log la réponse de l'IA
   */
  logReponseIA(prompt, reponse, tour) {
    return this.log('REPONSE_IA', {
      tour: tour,
      prompt_longueur: prompt.length,
      reponse_brute: reponse,
      json_valide: this.validerJSON(reponse),
      temps_reponse: 0 // À calculer si on mesure le temps d'API
    });
  }
  
  /**
   * Log un déplacement
   */
  logDeplacement(joueur, positionDepart, positionArrivee, pmUtilises, chemin) {
    return this.log('DEPLACEMENT', {
      joueur: {
        id: joueur.id,
        pseudo: joueur.pseudo
      },
      position_depart: positionDepart,
      position_arrivee: positionArrivee,
      pm_utilises: pmUtilises,
      distance: chemin ? chemin.length - 1 : 0,
      chemin: chemin,
      succes: positionArrivee !== positionDepart
    });
  }
  
  /**
   * Log une attaque
   */
  logAttaque(attaquant, defenseur, details) {
    return this.log('ATTAQUE', {
      attaquant: {
        id: attaquant.id,
        pseudo: attaquant.pseudo,
        position: attaquant.position
      },
      defenseur: {
        id: defenseur.id,
        pseudo: defenseur.pseudo,
        position: defenseur.position,
        pv_avant: defenseur.statsActuelles.pv
      },
      details: {
        type_attaque: details.type_attaque,
        force_utilisee: details.force_utilisee,
        zone_cible: details.zone_cible,
        distance: details.distance,
        arme_utilisee: details.arme_utilisee,
        degats_infliges: details.degats_infliges,
        type_impact: details.type_impact, // critique, parade, faible
        effets_appliques: details.effets_appliques
      }
    });
  }
  
  /**
   * Log une esquive
   */
  logEsquive(defenseur, attaquant, resultat) {
    return this.log('ESQUIVE', {
      defenseur: {
        id: defenseur.id,
        pseudo: defenseur.pseudo
      },
      attaquant: {
        id: attaquant.id,
        pseudo: attaquant.pseudo
      },
      resultat: {
        succes: resultat.succes,
        type: resultat.type, // complete, partielle, impossible
        temps_esquive: resultat.temps_esquive,
        temps_impact: resultat.temps_impact,
        message: resultat.message
      }
    });
  }
  
  /**
   * Log l'utilisation d'une compétence
   */
  logCompetence(utilisateur, competence, cible, resultat) {
    return this.log('COMPETENCE', {
      utilisateur: {
        id: utilisateur.id,
        pseudo: utilisateur.pseudo
      },
      competence: {
        id: competence.id,
        nom: competence.nom,
        rang: competence.rang,
        cout: competence.cout
      },
      cible: cible ? {
        id: cible.id,
        pseudo: cible.pseudo
      } : null,
      resultat: resultat
    });
  }
  
  /**
   * Log un changement de statut
   */
  logStatut(joueur, statut, action) {
    return this.log('STATUT', {
      joueur: {
        id: joueur.id,
        pseudo: joueur.pseudo
      },
      statut: statut,
      action: action, // ajout, retrait, expiration
      statuts_actuels: joueur.statuts,
      effets: joueur.statuts_complexes || {}
    });
  }
  
  /**
   * Log une erreur
   */
  logErreur(erreur, contexte) {
    return this.log('ERREUR', {
      message: erreur.message || erreur,
      stack: erreur.stack,
      contexte: contexte,
      critique: contexte.critique || false
    });
  }
  
  /**
   * Log la fin du combat
   */
  logCombatFin(vainqueur, perdant, raison, statistiques) {
    const entry = this.log('COMBAT_FIN', {
      vainqueur: vainqueur ? {
        id: vainqueur.id,
        pseudo: vainqueur.pseudo,
        pv_restants: vainqueur.statsActuelles.pv
      } : null,
      perdant: perdant ? {
        id: perdant.id,
        pseudo: perdant.pseudo
      } : null,
      raison: raison, // KO, abandon, timeout, erreur
      duree_totale: Date.now() - this.startTime,
      nombre_tours: this.logs.filter(l => l.type === 'TOUR_DEBUT').length,
      statistiques: statistiques
    });
    
    // Sauvegarder le fichier complet
    this.sauvegarderHistorique();
    
    return entry;
  }
  
  /**
   * Extrait les mots-clés d'un pavé
   */
  extraireMosCles(pave) {
    const motsCles = [];
    const patterns = [
      { pattern: /je (me déplace|vais|cours|marche)/i, type: 'deplacement' },
      { pattern: /(frappe|attaque|coup|poing|pied)/i, type: 'attaque' },
      { pattern: /(esquive|évite|dodge)/i, type: 'esquive' },
      { pattern: /(lance|utilise|active) .*(compétence|sort|capacité)/i, type: 'competence' },
      { pattern: /(nord|sud|est|ouest|haut|bas)/i, type: 'direction' },
      { pattern: /\d+\s*(m|mètre|case)/i, type: 'distance' },
      { pattern: /(tête|torse|bras|jambe)/i, type: 'zone' }
    ];
    
    patterns.forEach(({ pattern, type }) => {
      if (pattern.test(pave)) {
        motsCles.push(type);
      }
    });
    
    return motsCles;
  }
  
  /**
   * Valide si une chaîne est du JSON valide
   */
  validerJSON(str) {
    try {
      JSON.parse(str.replace(/```json\n|```/g, ''));
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Écrit une entrée dans le fichier de log
   */
  writeToFile(entry) {
    const fileName = `combat_${this.combatId}_${new Date().toISOString().split('T')[0]}.jsonl`;
    const filePath = path.join(this.logPath, fileName);
    
    // Format JSONL (une ligne par entrée)
    const line = JSON.stringify(entry) + '\n';
    
    fs.appendFile(filePath, line, (err) => {
      if (err) {
        console.error('Erreur écriture log:', err);
      }
    });
  }
  
  /**
   * Sauvegarde l'historique complet
   */
  sauvegarderHistorique() {
    const fileName = `combat_${this.combatId}_complet.json`;
    const filePath = path.join(this.logPath, fileName);
    
    const historique = {
      combat_id: this.combatId,
      date: new Date().toISOString(),
      duree: Date.now() - this.startTime,
      nombre_entrees: this.logs.length,
      logs: this.logs
    };
    
    fs.writeFileSync(filePath, JSON.stringify(historique, null, 2));
    
    console.log(`📝 Historique sauvegardé: ${fileName}`);
  }
  
  /**
   * Génère des statistiques du combat
   */
  genererStatistiques() {
    const stats = {
      nombre_tours: 0,
      nombre_attaques: 0,
      nombre_esquives: 0,
      nombre_deplacements: 0,
      nombre_competences: 0,
      degats_totaux: 0,
      erreurs: 0,
      par_joueur: {}
    };
    
    this.logs.forEach(log => {
      switch (log.type) {
        case 'TOUR_DEBUT':
          stats.nombre_tours++;
          break;
        case 'ATTAQUE':
          stats.nombre_attaques++;
          stats.degats_totaux += log.data.details.degats_infliges || 0;
          break;
        case 'ESQUIVE':
          if (log.data.resultat.succes) stats.nombre_esquives++;
          break;
        case 'DEPLACEMENT':
          stats.nombre_deplacements++;
          break;
        case 'COMPETENCE':
          stats.nombre_competences++;
          break;
        case 'ERREUR':
          stats.erreurs++;
          break;
      }
    });
    
    return stats;
  }
  
  /**
   * Permet de rejouer le combat (replay)
   */
  obtenirReplay() {
    return {
      combat_id: this.combatId,
      duree: Date.now() - this.startTime,
      evenements: this.logs.map(log => ({
        temps: log.temps_ecoule,
        tour: log.data.tour,
        type: log.type,
        description: this.genererDescription(log)
      }))
    };
  }
  
  /**
   * Génère une description textuelle d'un log
   */
  genererDescription(log) {
    switch (log.type) {
      case 'DEPLACEMENT':
        return `${log.data.joueur.pseudo} se déplace de ${JSON.stringify(log.data.position_depart)} à ${JSON.stringify(log.data.position_arrivee)}`;
      case 'ATTAQUE':
        return `${log.data.attaquant.pseudo} attaque ${log.data.defenseur.pseudo} (${log.data.details.degats_infliges} dégâts)`;
      case 'ESQUIVE':
        return `${log.data.defenseur.pseudo} ${log.data.resultat.succes ? 'esquive' : 'échoue à esquiver'}`;
      default:
        return `${log.type}: ${JSON.stringify(log.data).substring(0, 100)}...`;
    }
  }
}

module.exports = CombatLogger;
