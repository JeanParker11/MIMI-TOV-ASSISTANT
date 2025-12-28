/**
 * SYSTÈME DE GESTION D'ERREURS ROBUSTE
 * Récupération gracieuse et continuité du combat
 */

const fs = require('fs');
const path = require('path');

class CombatErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxRetries = 3;
    this.errorPath = path.join(__dirname, '../logs/errors');
    
    // Créer le dossier errors s'il n'existe pas
    if (!fs.existsSync(this.errorPath)) {
      fs.mkdirSync(this.errorPath, { recursive: true });
    }
  }
  
  /**
   * Gère une erreur avec tentative de récupération
   * @param {Error} error - L'erreur capturée
   * @param {Object} context - Contexte de l'erreur
   * @param {Function} recoveryFn - Fonction de récupération
   * @returns {Object} - Résultat de la récupération
   */
  async handleError(error, context, recoveryFn = null) {
    // Logger l'erreur
    this.logError(error, context);
    
    // Classifier l'erreur
    const errorType = this.classifyError(error);
    
    // Tenter la récupération selon le type
    let result = {
      recovered: false,
      action: null,
      message: null
    };
    
    switch (errorType) {
      case 'IA_PARSE_ERROR':
        result = await this.recoverFromIAError(error, context);
        break;
        
      case 'VALIDATION_ERROR':
        result = await this.recoverFromValidationError(error, context);
        break;
        
      case 'NETWORK_ERROR':
        result = await this.recoverFromNetworkError(error, context, recoveryFn);
        break;
        
      case 'STATE_ERROR':
        result = await this.recoverFromStateError(error, context);
        break;
        
      case 'TIMEOUT_ERROR':
        result = await this.recoverFromTimeout(error, context);
        break;
        
      default:
        result = await this.defaultRecovery(error, context);
    }
    
    // Si récupération personnalisée fournie
    if (!result.recovered && recoveryFn) {
      try {
        result = await recoveryFn(error, context);
      } catch (recoveryError) {
        this.logError(recoveryError, { ...context, recovery_failed: true });
      }
    }
    
    return result;
  }
  
  /**
   * Classifie le type d'erreur
   */
  classifyError(error) {
    const message = error.message || '';
    
    if (message.includes('JSON') || message.includes('parse')) {
      return 'IA_PARSE_ERROR';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION_ERROR';
    }
    if (message.includes('network') || message.includes('ECONNREFUSED')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('state') || message.includes('undefined')) {
      return 'STATE_ERROR';
    }
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return 'TIMEOUT_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }
  
  /**
   * Récupération d'une erreur de parsing IA
   */
  async recoverFromIAError(error, context) {
    console.log('🔧 Tentative de récupération d\'erreur IA...');
    
    // Essayer de nettoyer et re-parser
    if (context.rawResponse) {
      try {
        // Tentative 1: Nettoyer les backticks et espaces
        let cleaned = context.rawResponse
          .replace(/```json\n?/g, '')
          .replace(/```/g, '')
          .trim();
        
        const parsed = JSON.parse(cleaned);
        
        return {
          recovered: true,
          action: 'IA_RESPONSE_CLEANED',
          data: parsed,
          message: 'Réponse IA nettoyée et parsée avec succès'
        };
      } catch {
        // Tentative 2: Extraire le JSON avec regex
        const jsonMatch = context.rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              recovered: true,
              action: 'IA_RESPONSE_EXTRACTED',
              data: parsed,
              message: 'JSON extrait de la réponse IA'
            };
          } catch {}
        }
      }
    }
    
    // Si échec, créer une réponse par défaut
    return {
      recovered: true,
      action: 'DEFAULT_IA_RESPONSE',
      data: {
        resultat_tour: [{
          type: 'PASSE',
          joueur_id: context.joueur_id,
          message: 'Tour passé suite à une erreur IA'
        }]
      },
      message: 'Réponse par défaut générée'
    };
  }
  
  /**
   * Récupération d'une erreur de validation
   */
  async recoverFromValidationError(error, context) {
    console.log('🔧 Correction des données invalides...');
    
    const data = context.data || {};
    const corrections = {};
    
    // Corriger les positions hors limites
    if (data.position && context.arene) {
      const dims = context.arene.dimensions;
      corrections.position = {
        x: Math.max(0, Math.min(data.position.x, dims.x_max)),
        y: Math.max(0, Math.min(data.position.y, dims.y_max)),
        z: Math.max(0, Math.min(data.position.z, dims.z_max))
      };
    }
    
    // Corriger la force excessive
    if (data.forceUtilisee && context.joueur) {
      const maxForce = context.joueur.statsInitiales.coupMax || 
                       context.joueur.statsInitiales.force;
      corrections.forceUtilisee = Math.min(data.forceUtilisee, maxForce);
    }
    
    // Corriger les PM négatifs
    if (context.joueur && context.joueur.points_mouvement) {
      if (context.joueur.points_mouvement.actuels < 0) {
        context.joueur.points_mouvement.actuels = 0;
      }
    }
    
    return {
      recovered: true,
      action: 'DATA_CORRECTED',
      data: { ...data, ...corrections },
      message: 'Données corrigées automatiquement'
    };
  }
  
  /**
   * Récupération d'une erreur réseau
   */
  async recoverFromNetworkError(error, context, retryFn) {
    console.log('🔧 Problème réseau détecté, nouvelle tentative...');
    
    for (let i = 1; i <= this.maxRetries; i++) {
      console.log(`  Tentative ${i}/${this.maxRetries}...`);
      
      // Attendre avant de réessayer (backoff exponentiel)
      await this.sleep(Math.pow(2, i) * 1000);
      
      try {
        if (retryFn) {
          const result = await retryFn();
          return {
            recovered: true,
            action: 'NETWORK_RETRY_SUCCESS',
            data: result,
            message: `Succès après ${i} tentative(s)`
          };
        }
      } catch (retryError) {
        if (i === this.maxRetries) {
          return {
            recovered: false,
            action: 'NETWORK_RETRY_FAILED',
            message: `Échec après ${this.maxRetries} tentatives`
          };
        }
      }
    }
    
    return {
      recovered: false,
      action: 'NETWORK_ERROR_UNRECOVERABLE',
      message: 'Erreur réseau non récupérable'
    };
  }
  
  /**
   * Récupération d'une erreur d'état
   */
  async recoverFromStateError(error, context) {
    console.log('🔧 Réparation de l\'état du combat...');
    
    const combat = context.combat;
    if (!combat) {
      return {
        recovered: false,
        action: 'NO_COMBAT_STATE',
        message: 'État du combat introuvable'
      };
    }
    
    // Vérifier et réparer les propriétés essentielles
    const repairs = [];
    
    // Réparer les joueurs
    if (!combat.joueurs || combat.joueurs.length !== 2) {
      return {
        recovered: false,
        action: 'INVALID_PLAYERS',
        message: 'Joueurs invalides, impossible de continuer'
      };
    }
    
    combat.joueurs.forEach(joueur => {
      // Réparer les stats manquantes
      if (!joueur.statsActuelles) {
        joueur.statsActuelles = { ...joueur.statsInitiales };
        repairs.push('stats_actuelles');
      }
      
      // Réparer les PM
      if (!joueur.points_mouvement) {
        joueur.points_mouvement = {
          actuels: 5,
          max: 5
        };
        repairs.push('points_mouvement');
      }
      
      // Réparer la position
      if (!joueur.position) {
        joueur.position = { x: 0, y: 0, z: 0 };
        repairs.push('position');
      }
      
      // Réparer les statuts
      if (!Array.isArray(joueur.statuts)) {
        joueur.statuts = [];
        repairs.push('statuts');
      }
    });
    
    // Réparer le tour
    if (typeof combat.tour !== 'number') {
      combat.tour = 1;
      repairs.push('tour');
    }
    
    // Réparer le joueur actif
    if (!combat.joueurActif) {
      combat.joueurActif = combat.joueurs[0];
      repairs.push('joueur_actif');
    }
    
    return {
      recovered: true,
      action: 'STATE_REPAIRED',
      data: combat,
      repairs: repairs,
      message: `État réparé: ${repairs.join(', ')}`
    };
  }
  
  /**
   * Récupération d'un timeout
   */
  async recoverFromTimeout(error, context) {
    console.log('🔧 Timeout détecté, action par défaut...');
    
    const joueur = context.joueur;
    if (!joueur) {
      return {
        recovered: false,
        action: 'NO_PLAYER_CONTEXT',
        message: 'Contexte joueur manquant'
      };
    }
    
    // Action par défaut : défense
    return {
      recovered: true,
      action: 'DEFAULT_DEFENSE',
      data: {
        type: 'DEFENSE',
        joueur_id: joueur.id,
        message: `${joueur.pseudo} se met en position défensive (timeout)`
      },
      message: 'Action défensive par défaut appliquée'
    };
  }
  
  /**
   * Récupération par défaut
   */
  async defaultRecovery(error, context) {
    console.log('🔧 Tentative de récupération générique...');
    
    // Sauvegarder l'état pour analyse
    this.saveErrorState(error, context);
    
    // Si c'est pendant un tour, passer au suivant
    if (context.combat && context.combat.tour) {
      return {
        recovered: true,
        action: 'SKIP_TURN',
        message: 'Tour sauté suite à une erreur'
      };
    }
    
    return {
      recovered: false,
      action: 'UNRECOVERABLE',
      message: 'Erreur non récupérable'
    };
  }
  
  /**
   * Enregistre une erreur
   */
  logError(error, context) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      type: this.classifyError(error),
      message: error.message,
      stack: error.stack,
      context: {
        combat_id: context.combat?.id,
        tour: context.combat?.tour,
        joueur_id: context.joueur?.id,
        action: context.action
      }
    };
    
    this.errorLog.push(errorEntry);
    
    // Écrire dans le fichier
    const fileName = `errors_${new Date().toISOString().split('T')[0]}.jsonl`;
    const filePath = path.join(this.errorPath, fileName);
    
    fs.appendFileSync(filePath, JSON.stringify(errorEntry) + '\n');
    
    // Log console en développement
    if (process.env.NODE_ENV !== 'production') {
      console.error('❌ Erreur capturée:', errorEntry);
    }
  }
  
  /**
   * Sauvegarde l'état lors d'une erreur
   */
  saveErrorState(error, context) {
    const stateFile = `error_state_${Date.now()}.json`;
    const filePath = path.join(this.errorPath, stateFile);
    
    const state = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack
      },
      context: context,
      recovery_attempted: true
    };
    
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    
    console.log(`📁 État sauvegardé: ${stateFile}`);
  }
  
  /**
   * Fonction utilitaire de sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Obtient un résumé des erreurs
   */
  getErrorSummary() {
    const summary = {
      total: this.errorLog.length,
      by_type: {},
      last_errors: this.errorLog.slice(-5)
    };
    
    this.errorLog.forEach(error => {
      summary.by_type[error.type] = (summary.by_type[error.type] || 0) + 1;
    });
    
    return summary;
  }
}

// Instance singleton
const errorHandler = new CombatErrorHandler();

module.exports = errorHandler;
