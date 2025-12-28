/**
 * SYSTÈME DE GESTION DE L'INACTIVITÉ
 * Gère les timeouts et les actions automatiques en cas d'inactivité
 */

class InactivityManager {
  constructor() {
    this.timers = new Map(); // Map des timers par combat
    this.warnings = new Map(); // Map des avertissements envoyés
    this.TIMEOUT_DURATION = 6 * 60 * 1000; // 6 minutes
    this.GRACE_PERIOD = 60 * 1000; // 1 minute supplémentaire
    this.WARNING_TIMES = [3 * 60 * 1000, 2 * 60 * 1000, 60 * 1000]; // 3min, 2min, 1min
  }
  
  /**
   * Démarre le timer d'inactivité pour un joueur
   * @param {string} combatId - ID du combat
   * @param {string} playerId - ID du joueur
   * @param {Function} onTimeout - Callback en cas de timeout
   * @param {Function} sendMessage - Fonction pour envoyer des messages
   */
  startTimer(combatId, playerId, onTimeout, sendMessage) {
    const timerId = `${combatId}_${playerId}`;
    
    // Annuler le timer existant s'il y en a un
    this.stopTimer(combatId, playerId);
    
    // Réinitialiser les avertissements
    this.warnings.set(timerId, {
      sent3min: false,
      sent2min: false,
      sent1min: false,
      graceUsed: false
    });
    
    // Créer le timer principal
    const mainTimer = {
      startTime: Date.now(),
      combatId,
      playerId,
      warnings: [],
      graceTimer: null
    };
    
    // Programmer les avertissements
    mainTimer.warning3min = setTimeout(() => {
      this.sendWarning(combatId, playerId, 3, sendMessage);
    }, this.WARNING_TIMES[0]);
    
    mainTimer.warning2min = setTimeout(() => {
      this.sendWarning(combatId, playerId, 2, sendMessage);
    }, this.WARNING_TIMES[1]);
    
    mainTimer.warning1min = setTimeout(() => {
      this.sendWarning(combatId, playerId, 1, sendMessage);
    }, this.WARNING_TIMES[2]);
    
    // Timer principal (6 minutes)
    mainTimer.timeout = setTimeout(() => {
      this.handleTimeout(combatId, playerId, onTimeout, sendMessage);
    }, this.TIMEOUT_DURATION);
    
    this.timers.set(timerId, mainTimer);
    
    return timerId;
  }
  
  /**
   * Arrête le timer d'inactivité
   * @param {string} combatId - ID du combat
   * @param {string} playerId - ID du joueur
   */
  stopTimer(combatId, playerId) {
    const timerId = `${combatId}_${playerId}`;
    const timer = this.timers.get(timerId);
    
    if (timer) {
      // Annuler tous les timeouts
      clearTimeout(timer.warning3min);
      clearTimeout(timer.warning2min);
      clearTimeout(timer.warning1min);
      clearTimeout(timer.timeout);
      clearTimeout(timer.graceTimer);
      
      this.timers.delete(timerId);
      this.warnings.delete(timerId);
    }
  }
  
  /**
   * Réinitialise le timer (appelé quand le joueur répond)
   * @param {string} combatId - ID du combat
   * @param {string} playerId - ID du joueur
   * @param {Function} onTimeout - Callback en cas de timeout
   * @param {Function} sendMessage - Fonction pour envoyer des messages
   */
  resetTimer(combatId, playerId, onTimeout, sendMessage) {
    this.stopTimer(combatId, playerId);
    return this.startTimer(combatId, playerId, onTimeout, sendMessage);
  }
  
  /**
   * Envoie un avertissement
   * @param {string} combatId - ID du combat
   * @param {string} playerId - ID du joueur
   * @param {number} minutesLeft - Minutes restantes
   * @param {Function} sendMessage - Fonction pour envoyer des messages
   */
  sendWarning(combatId, playerId, minutesLeft, sendMessage) {
    const timerId = `${combatId}_${playerId}`;
    const warnings = this.warnings.get(timerId);
    
    if (!warnings) return;
    
    let emoji = '⏰';
    let urgence = '';
    
    switch(minutesLeft) {
      case 3:
        if (warnings.sent3min) return;
        warnings.sent3min = true;
        emoji = '⏰';
        urgence = '';
        break;
      case 2:
        if (warnings.sent2min) return;
        warnings.sent2min = true;
        emoji = '⚠️';
        urgence = '**ATTENTION** ';
        break;
      case 1:
        if (warnings.sent1min) return;
        warnings.sent1min = true;
        emoji = '🚨';
        urgence = '**URGENT** ';
        break;
    }
    
    const message = `${emoji} ${urgence}@${playerId} - Il vous reste ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} pour jouer votre tour!`;
    
    sendMessage(combatId, { 
      text: message,
      mentions: [playerId]
    });
  }
  
  /**
   * Gère le timeout
   * @param {string} combatId - ID du combat
   * @param {string} playerId - ID du joueur
   * @param {Function} onTimeout - Callback en cas de timeout
   * @param {Function} sendMessage - Fonction pour envoyer des messages
   */
  handleTimeout(combatId, playerId, onTimeout, sendMessage) {
    const timerId = `${combatId}_${playerId}`;
    const warnings = this.warnings.get(timerId);
    
    if (!warnings || warnings.graceUsed) {
      // Timeout définitif
      sendMessage(combatId, {
        text: `⏱️ **TEMPS ÉCOULÉ** - @${playerId} n'a pas joué dans le temps imparti.\n\n` +
              `Le joueur est considéré comme **immobile** ce tour:\n` +
              `• Toutes les actions en cours sont annulées\n` +
              `• Les attaques contre lui réussissent automatiquement\n` +
              `• Aucune esquive n'est possible`
      });
      
      // Appeler le callback de timeout
      onTimeout(playerId, 'timeout_definitif');
      
      this.stopTimer(combatId, playerId);
    } else {
      // Accorder la minute de grâce (une fois par combat)
      warnings.graceUsed = true;
      
      sendMessage(combatId, {
        text: `🕐 **MINUTE DE GRÂCE ACTIVÉE** pour @${playerId}\n` +
              `⚠️ C'est votre dernière chance! (utilisable une seule fois par combat)`,
        mentions: [playerId]
      });
      
      // Timer de grâce
      const timer = this.timers.get(timerId);
      if (timer) {
        timer.graceTimer = setTimeout(() => {
          this.handleTimeout(combatId, playerId, onTimeout, sendMessage);
        }, this.GRACE_PERIOD);
      }
    }
  }
  
  /**
   * Obtient le temps restant pour un joueur
   * @param {string} combatId - ID du combat
   * @param {string} playerId - ID du joueur
   * @returns {number|null} - Temps restant en millisecondes
   */
  getTimeRemaining(combatId, playerId) {
    const timerId = `${combatId}_${playerId}`;
    const timer = this.timers.get(timerId);
    
    if (!timer) return null;
    
    const elapsed = Date.now() - timer.startTime;
    const remaining = this.TIMEOUT_DURATION - elapsed;
    
    return Math.max(0, remaining);
  }
  
  /**
   * Nettoie tous les timers d'un combat
   * @param {string} combatId - ID du combat
   */
  cleanupCombat(combatId) {
    for (const [timerId, timer] of this.timers.entries()) {
      if (timer.combatId === combatId) {
        this.stopTimer(timer.combatId, timer.playerId);
      }
    }
  }
}

// Instance singleton
const inactivityManager = new InactivityManager();

/**
 * Gère l'inactivité d'un joueur dans le combat
 * @param {Object} joueur - Joueur inactif
 * @param {string} raison - Raison de l'inactivité
 */
function gererJoueurInactif(joueur, raison) {
  // Annuler toutes les actions en cours
  joueur.actionEnCours = null;
  joueur.competences_en_chargement = {};
  
  // Le joueur ne peut pas esquiver
  joueur.peut_esquiver = false;
  
  // Réduire sa défense
  joueur.defense_reduite = true;
  
  // Marquer comme inactif
  joueur.statuts.push('Inactif');
  
  // Log
  console.log(`⏱️ Joueur ${joueur.pseudo} marqué comme inactif (${raison})`);
  
  return {
    message: `${joueur.pseudo} n'a pas réagi à temps et reste immobile!`,
    effets: ['immobilite', 'defense_nulle', 'esquive_impossible']
  };
}

module.exports = {
  inactivityManager,
  gererJoueurInactif
};
