module.exports = {
  name: "lid",
  category: "Général",
  description: "Affiche le LID (identifiant WhatsApp) d’un utilisateur",
  allowedForAll: true,

  async execute(riza, m) {
    let target;

    if (m.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      target = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
    } else if (m.message.extendedTextMessage?.contextInfo?.participant) {
      target = m.message.extendedTextMessage.contextInfo.participant;
    } else {
      target = m.key.participant || m.key.remoteJid;
    }

    await riza.sendMessage(m.chat, {
      text: `🔎 *Identifiant complet (LID)* :\n\`\`\`${target}\`\`\``
    }, { quoted: m });
  }
};