const { getDevice } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'appareil',
  category: 'GENERAL',
  keywords: ['.device'],
  onlyOwner: false,
  onlySudo: false,
  onlyAdmin: false,
  botAdmin: false,
  allowedForAll: true,

  async execute(riza, m, args) {
    const remoteJid = m.key.remoteJid;

    try {
      const quotedMessage = m.quoted?.key?.id || m.message?.extendedTextMessage?.contextInfo?.stanzaId;

      if (!quotedMessage) {
        return await riza.sendMessage(remoteJid, {
          text: '❌ Tu dois répondre à un message pour identifier le type d’appareil.',
        }, { quoted: m });
      }

      const device = getDevice(quotedMessage);
      const msg = `_L’utilisateur ciblé utilise un appareil : *${device}*_`;

      await riza.sendMessage(remoteJid, { text: msg }, { quoted: m });

    } catch (error) {
      await riza.sendMessage(remoteJid, {
        text: `_Erreur : impossible d’obtenir les infos de l’appareil. ${error.message}_`,
      }, { quoted: m });
    }
  }
};