// 🟩 Initialisation
require('./lib/watcher');
require('./settings');
// require('./telegram/index');
require('./web/server');

const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const chalk = require('chalk');
const crypto = require('crypto');

const { smsg } = require('./lib/fonction');
global.smsg = smsg;

const {
  fancyStartLog,
  logInfo,
  logError,
  logWarning,
  logDebug
} = require('./lib/logger');

const maintenance = require('./IA/maintenance');
const handleAllIA = require('./IA');
const { chargerRappels } = require('./commands/rappel');
const startConnection = require('./lib/connexion');
const { connectMongo, getModels } = require('./lib/mongo');

// Configuration logger détaillée
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

// 🔧 Obtenir le nom lisible d'un utilisateur/groupe
const getDisplayName = async (sock, jid) => {
  try {
    if (!jid) return 'Inconnu';
    if (jid.endsWith('@g.us')) {
      if (!sock.groupMetadata[jid]) {
        try {
          logger.debug({ jid }, "📊 Récupération des métadonnées du groupe");
          const metadata = await sock.groupMetadata(jid);
          sock.groupMetadata[jid] = metadata;
        } catch (e) {
          logger.warn({ jid, error: e.message }, "❌ Impossible de récupérer les métadonnées du groupe");
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
    logger.error({ jid, error: err.message }, "❌ Erreur dans getDisplayName");
    return jid?.split('@')[0] || 'Inconnu';
  }
};

async function main() {
  try {
    logger.info("🚀 Démarrage de l'application principale");
    fancyStartLog();

    // Connexion Mongo (optionnelle)
    await connectMongo().catch(() => {});

    const sock = await startConnection();
    logger.debug("✅ Connexion WhatsApp établie avec succès");
    
    sock.contacts = sock.contacts || {};
    sock.groupMetadata = sock.groupMetadata || {};

    // 📞 Gestion des mises à jour de contacts
    sock.ev.on("contacts.update", updates => {
      try {
        logger.debug({ updateCount: updates.length }, "👥 Mise à jour des contacts");
        for (let update of updates) {
          const id = update.id;
          sock.contacts[id] = { ...(sock.contacts[id] || {}), ...update };
        }
        logger.debug("✅ Contacts mis à jour avec succès");
      } catch (e) {
        logger.error(e, "❌ Erreur mise à jour des contacts");
      }
    });

    // ⏰ Chargement des rappels
    try {
      logger.debug("🕐 Chargement des rappels...");
      chargerRappels(sock);
      logger.debug("✅ Rappels chargés avec succès");
    } catch (e) {
      logger.error(e, "❌ Erreur chargement rappels");
    }

    // 📥 Réception des messages
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      try {
        logger.debug({ messageCount: messages?.length, type }, "📨 Messages reçus (upsert)");
        
        const mek = messages?.[0];
        if (!mek?.message) {
          logger.debug("📨 Message vide ignoré");
          return;
        }
        
        if (mek.key?.remoteJid === 'status@broadcast') {
          logger.debug("📢 Message status ignoré");
          return;
        }

        // GESTION CHAÎNES
        if (mek.key.remoteJid?.endsWith("@newsletter")) {
          const newsletterJid = mek.key.remoteJid;
          const messageContent = mek.message?.conversation || mek.message?.extendedTextMessage?.text || "[Message chaîne]";
          
          logger.info({ 
            newsletterJid, 
            content: messageContent 
          }, "📰 Message chaîne reçu");
          
          console.log(
            chalk.magentaBright("📰 Message chaîne :"),
            chalk.yellow(newsletterJid),
            "\nContenu :",
            chalk.white(messageContent)
          );
          return;
        }

        mek.message = mek.message?.ephemeralMessage?.message || mek.message;

        let m;
        try {
          m = await smsg(sock, mek);
          logger.debug({ messageId: m.key?.id }, "✅ Message converti avec smsg");
        } catch (e) {
          logger.error({ 
            jid: mek.key?.remoteJid, 
            error: e.message 
          }, "❌ Message illisible");
          return;
        }

        const senderJid = m.sender || m.key?.participant || m.key?.remoteJid;
        const chatJid = m.chat || m.key?.remoteJid;

        const senderName = await getDisplayName(sock, senderJid);
        const chatName = await getDisplayName(sock, chatJid);
        const msgType = Object.keys(m.message || {})[0] || "unknown";

        const contentPreview =
          m.text ||
          m.message?.conversation ||
          m.message?.extendedTextMessage?.text ||
          m.message?.imageMessage?.caption ||
          m.message?.videoMessage?.caption ||
          '[Contenu non affichable]';

        logger.info({
          sender: senderJid,
          chat: chatJid,
          senderName,
          chatName,
          messageType: msgType,
          content: contentPreview.substring(0, 100) // Limiter la longueur pour les logs
        }, "📥 Message traité");

        console.log(
          chalk.greenBright("📥 Message reçu") +
          ` de ${chalk.yellow(senderName)} dans ${chalk.cyan(chatName)} (${chalk.magenta(msgType)}) : ${chalk.white(contentPreview)}`
        );

        // Sauvegarde média (Mongo)
        try {
          if (process.env.SAVE_MEDIA === 'true') {
            const { Media } = getModels();
            const mediaTypes = ['imageMessage', 'videoMessage', 'documentMessage'];
            if (Media && mediaTypes.includes(m.mtype)) {
              const buf = await sock.downloadMediaMessage(m);
              const meta = m.message?.[m.mtype] || m.msg || {};
              const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
              await Media.create({
                chat: chatJid,
                sender: senderJid,
                type: m.mtype.replace('Message',''),
                mimetype: meta.mimetype || null,
                caption: meta.caption || null,
                size: buf.length,
                sha256,
                data: buf,
              });
              logger.debug({ messageId: m.key?.id }, "💾 Média enregistré en base");
            }
          }
        } catch (e) {
          logger.error(e, "❌ Erreur sauvegarde média");
        }

        // 🛠️ Maintenance
        try {
          logger.debug("🔧 Vérification maintenance...");
          await maintenance(sock, m);
          logger.debug("✅ Maintenance vérifiée");
        } catch (e) {
          if (e.message.includes("⛔ Maintenance active")) {
            logger.debug("🔧 Maintenance active - message ignoré");
            return;
          }
          logger.error(e, "❌ Erreur maintenance.js");
          return;
        }

        // 🤖 IA
        try {
          logger.debug("🧠 Traitement par l'IA...");
          await handleAllIA(sock, m);
          logger.debug("✅ IA traitée");
        } catch (e) {
          logger.error(e, "❌ Erreur handleAllIA");
        }

        // 🔌 Plugins
        try {
          logger.debug("🔌 Chargement des plugins...");
          require('./lib/plugins')(sock, m, messages);
          logger.debug("✅ Plugins chargés");
        } catch (e) {
          logger.error(e, "❌ Erreur plugins");
        }

      } catch (err) {
        logger.error(err, "❌ Erreur critique dans messages.upsert");
      }
    });

    // 💟 GESTION DES RÉACTIONS
    sock.ev.on("messages.reaction", async (reactionEvent) => {
      try {
        const reactions = Array.isArray(reactionEvent) ? reactionEvent : [reactionEvent];
        logger.debug({ reactionCount: reactions.length }, "💟 Réactions reçues");

        for (const reaction of reactions) {
          const { key, reaction: emoji, sender } = reaction;
          const chat = key.remoteJid;
          const reactedMsgId = key.id;

          const chatName = await getDisplayName(sock, chat);
          const senderName = await getDisplayName(sock, sender);

          const type = chat.endsWith("@g.us")
            ? "👥 Groupe"
            : chat.endsWith("@newsletter")
            ? "📢 Chaîne"
            : "💬 Privé";

          logger.info({
            chat,
            sender,
            emoji,
            messageId: reactedMsgId,
            type
          }, "💟 Réaction traitée");

          console.log(
            chalk.magentaBright("💟 Réaction détectée :"),
            chalk.white(`${emoji} par ${senderName}`),
            `dans ${chalk.yellow(chatName)} (${type})`,
            `→ ID msg: ${chalk.gray(reactedMsgId)}`
          );
        }
      } catch (err) {
        logger.error(err, "❌ Erreur gestion des réactions");
      }
    });

    // 📤 Messages envoyés
    const originalSendMessage = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, content, options = {}) => {
      try {
        const name = await getDisplayName(sock, jid);
        const msgType = Object.keys(content || {})[0] || 'unknown';
        const preview =
          content?.text ||
          content?.caption ||
          content?.extendedTextMessage?.text ||
          '[Contenu non affichable]';

        logger.info({
          jid,
          recipient: name,
          messageType: msgType,
          content: preview.substring(0, 100)
        }, "📤 Message envoyé");

        console.log(
          chalk.blueBright("📤 Message envoyé") +
          ` à ${chalk.cyan(name)} (${chalk.magenta(msgType)}) : ${chalk.white(preview)}`
        );

        const result = await originalSendMessage(jid, content, options);
        logger.debug({ jid, messageId: result?.key?.id }, "✅ Message envoyé avec succès");
        return result;
        
      } catch (err) {
        logger.error({ jid, error: err.message }, "❌ Erreur sendMessage");
        throw err;
      }
    };

    // 🚨 Gestion des erreurs globales
    sock.ev.on("error", (error) => {
      logger.error(error, "🚨 Erreur globale de l'événement Baileys");
    });

    // 💾 Gestion des mises à jour de credentials
    sock.ev.on("creds.update", () => {
      logger.debug("💾 Mise à jour des credentials");
    });

    // 🛑 Gestion des erreurs non capturées
    process.on('uncaughtException', (error) => {
      logger.error(error, "💥 ERREUR NON CAPTURÉE - Arrêt du processus");
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, "⚠️ PROMESSE NON GÉRÉE - Arrêt du processus");
      process.exit(1);
    });

    logger.info("✅ Application principale démarrée avec succès");

  } catch (err) {
    logger.error(err, "❌ Erreur critique dans main()");
    logError("💥 Arrêt de l'application suite à une erreur critique");
    process.exit(1);
  }
}

// 🧠 Lancer le bot
main().catch(err => {
  logger.error(err, "❌ Erreur lors de l'initialisation");
  logError("💥 Échec du démarrage de l'application");
  process.exit(1);
});

// 🔁 Hot reload
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  try {
    fs.unwatchFile(file);
    logger.info(`🛠 Mise à jour détectée : ${__filename}`);
    logInfo(`🛠 Mise à jour détectée : ${path.basename(__filename)}`);
    delete require.cache[file];
    require(file);
  } catch (err) {
    logger.error(err, "❌ Erreur lors du hot reload");
  }
});

// Log au démarrage
logger.info("🔧 Module principal chargé");