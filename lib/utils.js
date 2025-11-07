/**
 * Obtenir le nom lisible d’un utilisateur ou d’un groupe.
 * @param {object} sock - L'instance de connexion Baileys.
 * @param {string} jid - Le JID de l'utilisateur ou du groupe.
 * @returns {string} Le nom lisible.
 */
async function getDisplayName(sock, jid) {
  try {
    if (!jid) return 'Inconnu';
    if (jid.endsWith('@g.us')) {
      if (!sock.groupMetadata[jid]) {
        try {
          const metadata = await sock.groupMetadata(jid);
          sock.groupMetadata[jid] = metadata;
        } catch (e) {
          return jid.split('@')[0];
        }
      }
      return sock.groupMetadata[jid]?.subject || jid.split('@')[0];
    }
    const contact = sock.contacts?.[jid];
    return (
      contact?.name ||
      contact?.notify ||
      jid.split("@")[0]
    );
  } catch (err) {
    return jid?.split('@')[0] || 'Inconnu';
  }
}

module.exports = { getDisplayName };
