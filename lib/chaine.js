// lib/chaine.js

const globalConfig = global;
const newsletterJid = globalConfig.menuNewsletterJid || "120363400129137847@newsletter";
const newsletterName = globalConfig.menuNewsletterName || "🍃‣UNIROLIST";
const channelSourceUrl = globalConfig.menuChannelLink || "https://whatsapp.com/channel/0029VbB8oYs6LwHdYRLglh17";

/**
 * Ajoute le contexte "chaîne" à un message WhatsApp (contextInfo, sourceUrl)
 * @param {object} messagePayload Objet message WhatsApp (ex: { text: "..." })
 * @returns {object} messagePayload enrichi
 */
function enrichWithChannelContext(messagePayload) {
  if (!messagePayload.contextInfo) {
    messagePayload.contextInfo = {
      forwardingScore: 9,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid,
        newsletterName,
      },
    };
    messagePayload.sourceUrl = channelSourceUrl;
  }
  return messagePayload;
}

/**
 * Prépare un message cité fiable, compatible avec tout type de message.
 * @param {object} m Message original reçu (Baileys message)
 * @param {boolean} noQuote Si true, ne cite pas le message (par défaut false pour citer)
 * @returns {object|undefined} Objet quoted message compatible ou undefined (pas de citation)
 */
function getQuotedMessageForChannel(m, noQuote = false) {
  if (noQuote) return undefined;

  // Récupérer le contenu réel du message (gérer ephemeralMessage)
  let originalMsg = m.message?.ephemeralMessage?.message || m.message;
  if (!originalMsg) return undefined;

  // Identifier le premier type de message (clé du message)
  const messageTypes = Object.keys(originalMsg).filter(
    (k) => k !== "contextInfo" && k !== "edit" && k !== "senderKeyDistributionMessage"
  );
  if (messageTypes.length === 0) return undefined;

  // Prendre le premier type (ex: "conversation", "imageMessage", "videoMessage", etc.)
  const firstType = messageTypes[0];
  const content = originalMsg[firstType];

  // Forcer fromMe à false pour bien citer un message reçu d’un autre (utilisateur)
  // IMPORTANT pour que la citation fonctionne correctement
  return {
    key: {
      remoteJid: m.key.remoteJid,
      fromMe: false,
      id: m.key.id,
      participant: m.key.participant || m.participant,
    },
    message: {
      [firstType]: content,
      ...(originalMsg.contextInfo ? { contextInfo: originalMsg.contextInfo } : {}),
    },
  };
}

module.exports = {
  enrichWithChannelContext,
  getQuotedMessageForChannel,
};