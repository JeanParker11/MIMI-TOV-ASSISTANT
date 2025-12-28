module.exports = {
  name: "refuser",
  category: "Uniro",
  reaction: "❌",
  execute: async (dest, zk, commandeOptions) => {
    const { repondre, nomAuteurMessage, auteurMessage } = commandeOptions;

    const challenge = combatManager.findChallengeByChallenged(auteurMessage);

    if (!challenge) {
      return repondre("Vous n'avez aucun défi en attente.");
    }

    // Annoncer le refus
    const message = `❌ Le défi a été refusé. ❌

` +
                    `*${challenge.challengedPseudo}* a refusé le combat contre *${challenge.challengerPseudo}*.`;

    await zk.sendMessage(dest, { text: message, mentions: [challenge.challengerId, challenge.challengedId] });

    // Supprimer le défi
    combatManager.removeChallenge(challenge.challigerId, challenge.challengedId);

  }
};