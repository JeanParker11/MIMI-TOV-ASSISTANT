const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidDecode, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const { setPairingCode } = require('../web/state');

const {
  logError,
  logInfo,
  logWarning,
  logPairingCode,
  logPrompt,
  fancyStartLog
} = require('./logger');

const getStartupMessage = require('./startupMessage');
const { chargerRappels } = require('../commands/rappel');

// Mode non interactif pour déploiements (Render, etc.)
const WA_PHONE_NUMBER = process.env.WA_PHONE_NUMBER || null;

// Configuration pino plus détaillée
const logger = pino({ 
  level: 'silent',
  transport: { 
    target: 'pino-pretty', 
    options: { 
      colorize: true, 
      ignore: 'pid,hostname',
      translateTime: 'HH:MM:ss',
      levelFirst: true
    } 
  } 
});

// Plus d'entrées interactives: toutes les infos proviennent des variables d'environnement

async function startConnection() {
  try {
    logInfo("🔄 Initialisation de la connexion...");
    const { state, saveCreds } = await useMultiFileAuthState("session");
    logger.debug("✅ État d'authentification chargé");

    const sock = makeWASocket({
      logger: logger,
      printQRInTerminal: false,
      auth: state,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      markOnlineOnConnect: true,
      syncFullHistory: true,
      emitOwnEvents: true
    });

    logger.debug("✅ Socket Baileys créé");

    if (!sock.authState.creds.registered) {
      logger.info("📱 Appareil non enregistré, démarrage du processus de pairing (mode non interactif)...");
      const cleaned = (WA_PHONE_NUMBER || '').replace(/[^0-9]/g, '');
      if (!cleaned || !/^\d{8,15}$/.test(cleaned)) {
        logWarning("⚠️ WA_PHONE_NUMBER non défini ou invalide. La console web exposera le code quand un numéro sera fourni.");
      } else {
        try {
          logger.debug(`📞 Demande de pairing code pour le numéro: ${cleaned}`);
          let code = await sock.requestPairingCode(cleaned);
          code = code?.match(/.{1,4}/g)?.join("-") || code;
          setPairingCode(code);
          logPairingCode(code);
          logInfo("➡️ Saisis ce code dans WhatsApp.");
          logger.debug("✅ Pairing code généré avec succès");
        } catch (err) {
          logError("❌ Erreur pairing code :");
          logger.error(err, "Détails de l'erreur pairing code");
        }
      }
    } else {
      logger.info("✅ Appareil déjà enregistré");
    }

    sock.ev.on("connection.update", ({ connection, lastDisconnect, qr, isNewLogin, receivedPendingNotifications }) => {
      logger.debug({ 
        connection, 
        qr: qr ? 'QR reçu' : 'pas de QR',
        isNewLogin,
        receivedPendingNotifications 
      }, "📡 Mise à jour de connexion");
      
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      
      if (connection === 'close') {
        logger.error({ reason, lastDisconnect }, "🔌 Connexion fermée - Détails complets");
        
        switch (reason) {
          case DisconnectReason.badSession:
            logError("📛 Session corrompue - Supprime le dossier session et relance");
            logger.error("Détails session corrompue:", lastDisconnect);
            break;
          case DisconnectReason.connectionClosed:
            logError("🔗 Connexion fermée par le serveur");
            break;
          case DisconnectReason.connectionLost:
            logError("📡 Connexion perdue (problème réseau)");
            break;
          case DisconnectReason.connectionReplaced:
            logError("🔄 Connexion remplacée (autre appareil connecté)");
            break;
          case DisconnectReason.restartRequired:
            logError("🔄 Redémarrage requis");
            break;
          case DisconnectReason.timedOut:
            logError("⏰ Timeout de connexion");
            break;
          case DisconnectReason.loggedOut:
            logError("🚪 Déconnecté (session terminée) - Supprime le dossier session");
            break;
          default:
            logError(`❓ Déconnexion inattendue : ${reason}`);
            logger.error("Détails déconnexion inattendue:", lastDisconnect);
        }
        
        logWarning("🔌 Connexion fermée. Aucune reconnexion automatique.");
        // Ne pas exit en plateforme sans TTY; laisser l'orchestrateur relancer si besoin
      } else if (connection === 'open') {
        fancyStartLog("✅ Connexion établie !");
        logger.info("🚀 Connexion WhatsApp établie avec succès");
        
        try {
          const ownerJid = (Array.isArray(global.owner) ? global.owner[0] : global.owner) + "@s.whatsapp.net";
          sock.sendMessage(ownerJid, { text: getStartupMessage() });
          logger.debug("✅ Message de démarrage envoyé au propriétaire");
        } catch (err) {
          logger.error(err, "❌ Erreur lors de l'envoi du message de démarrage");
        }

        try {
          chargerRappels(sock);
          logger.debug("✅ Rappels chargés avec succès");
        } catch (err) {
          logger.error(err, "❌ Erreur lors du chargement des rappels");
        }
      } else if (connection === 'connecting') {
        logger.debug("🔄 Connexion en cours...");
      }
    });

    // Gestion des erreurs globales non capturées
    sock.ev.on("error", (error) => {
      logger.error(error, "🚨 Erreur globale de l'événement Baileys");
    });

    sock.ev.on("creds.update", () => {
      logger.debug("💾 Mise à jour des credentials");
      saveCreds();
    });

    // Gestion des messages
    sock.ev.on("messages.upsert", ({ messages, type }) => {
      logger.debug({ messageCount: messages?.length, type }, "📨 Messages reçus");
    });

    sock.ev.on("messages.update", (updates) => {
      logger.debug({ updateCount: updates?.length }, "✏️ Messages mis à jour");
    });

    // Gestion des contacts
    sock.ev.on("contacts.update", (updates) => {
      logger.debug({ contactCount: updates?.length }, "👥 Contacts mis à jour");
    });

    sock.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {};
        return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
      }
      return jid;
    };

    sock.sendText = (jid, text, options = {}) => {
      logger.debug({ jid, textLength: text.length }, "📤 Envoi de message texte");
      return sock.sendMessage(jid, { text, ...options });
    };

    sock.downloadMediaMessage = async (msg) => {
      try {
        logger.debug("📥 Début du téléchargement de média");
        const content = msg?.msg || msg?.message?.[msg?.mtype] || msg?.message;
        const type = msg?.mtype?.replace(/Message/gi, '') || (content?.mimetype?.split('/')[0]);

        if (!content || !content.mediaKey) {
          throw new Error("⛔ Média invalide ou champ mediaKey manquant.");
        }

        logger.debug({ type, mimetype: content.mimetype }, "📥 Téléchargement média");
        const stream = await downloadContentFromMessage(content, type);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const result = Buffer.concat(chunks);
        logger.debug(`✅ Média téléchargé (${result.length} bytes)`);
        return result;
      } catch (e) {
        logger.error(e, "❌ Échec téléchargement média");
        throw new Error(`❌ Échec téléchargement : ${e.message}`);
      }
    };

    // Gestion des erreurs non capturées au niveau process
    process.on('uncaughtException', (error) => {
      logger.error(error, "💥 ERREUR NON CAPTURÉE - Arrêt du processus");
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, "⚠️ PROMESSE NON GÉRÉE - Arrêt du processus");
      process.exit(1);
    });

    return sock;

  } catch (error) {
    logger.error(error, "💥 ERREUR CRITIQUE lors du démarrage de la connexion");
    process.exit(1);
  }
}

module.exports = startConnection;