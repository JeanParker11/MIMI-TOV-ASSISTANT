const combatLogic = require('./combatLogic');

function createAIOpponent(fiche) {
    const combattant = combatLogic.initCombattant('ai_opponent', fiche);
    combattant.pseudo = 'Adversaire IA';
    return combattant;
}

function getAIAcion(combatState) {
    const aiPlayer = combatState.joueurs.find(p => p.id === 'ai_opponent');
    const humanPlayer = combatState.joueurs.find(p => p.id !== 'ai_opponent');

    // Logique IA très simple : attaque toujours le torse avec une force de 10
    return {
        action: 'ATTAQUE',
        attaquant_id: aiPlayer.id,
        defenseur_id: humanPlayer.id,
        forceUtilisee: 10,
        zoneCible: 'torse',
        distance_attaque: 1,
        vitesse_attaque: 5
    };
}

module.exports = {
    createAIOpponent,
    getAIAcion
};