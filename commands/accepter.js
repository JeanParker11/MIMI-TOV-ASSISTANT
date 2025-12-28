module.exports = {
  name: "accepter",
  category: "Uniro",
  reaction: "✅",
  execute: async (dest, zk, commandeOptions) => {
    const { repondre, nomAuteurMessage, auteurMessage } = commandeOptions;

    const authorId = auteurMessage;

    // Chercher d'abord un défi 1v1
    const challenge1v1 = combatManager.findChallengeByChallenged(authorId);
    if (challenge1v1) {
      const message = `🔥 Le défi a été accepté ! 🔥\n\n` +
                      `*${challenge1v1.challengerPseudo}* vs *${challenge1v1.challengedPseudo}*\n\n` +
                      `Le combat commence maintenant !`;

      await zk.sendMessage(dest, { text: message, mentions: [challenge1v1.challengerId, challenge1v1.challengedId] });
      const combat = combatManager.startCombat(challenge1v1);
      // TODO: Démarrer la logique de combat et le minuteur de session
      repondre(`[LOGIC] Combat 1v1 ${combat.id} démarré.`);
      return;
    }

    // Sinon, chercher un défi de groupe
    const groupChallenge = combatManager.findGroupChallengeByParticipant(authorId);
    if (groupChallenge) {
      combatManager.updateParticipantStatus(groupChallenge.id, authorId, 'ACCEPTED');
      
      await repondre(`*${nomAuteurMessage}* a accepté le combat Free for All !`);

      const allAccepted = groupChallenge.participants.every(p => p.status === 'ACCEPTED');

      if (allAccepted) {
          const participantNames = groupChallenge.participants.map(p => `*${p.pseudo}*`).join(' vs ');
          const message = `🔥 Tous les participants ont accepté ! 🔥\n\n` +
                          `Le combat Free for All entre ${participantNames} commence !`;
          await zk.sendMessage(dest, { text: message, mentions: groupChallenge.participants.map(p => p.id) });
          
          const combat = combatManager.startGroupCombat(groupChallenge);
          // TODO: Démarrer la logique de combat et le minuteur de session
          repondre(`[LOGIC] Combat FFA ${combat.id} démarré.`);
      } else {
          const pendingParticipants = groupChallenge.participants.filter(p => p.status === 'PENDING');
          const pendingNames = pendingParticipants.map(p => p.pseudo).join(', ');
          repondre(`En attente de : ${pendingNames}.`);
      }
      return;
    }

    return repondre("Vous n'avez aucun défi en attente.");
  }
};
