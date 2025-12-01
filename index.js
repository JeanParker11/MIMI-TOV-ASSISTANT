// [file name]: index.js
// [file content begin]
// 🟩 Initialisation
require('./lib/watcher');
require('./settings');
require('./telegram/index');

const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const chalk = require('chalk');

const { smsg } = require('./lib/fonction');
global.smsg = smsg;

const {
  fancyStartLog,
  logInfo,
  logError,
} = require('./lib/logger');

const maintenance = require('./IA/maintenance');
const handleAllIA = require('./IA');
const { chargerRappels } = require('./commands/rappel');
const startConnection = require('./lib/connexion');
const { getDisplayName } = require('./lib/utils');

async function main() {
  try {
    // Affiche un message de démarrage stylisé
    fancyStartLog();

    // Initialise la connexion WhatsApp
    const sock = await startConnection();
    sock.contacts = sock.contacts || {};
    sock.groupMetadata = sock.groupMetadata || {};

    // Gère la mise à jour des contacts
    sock.ev.on("contacts.update", updates => {
      try {
        for (let update of updates) {
          const id = update.id;
          sock.contacts[id] = { ...(sock.contacts[id] || {}), ...update };
        }
      } catch (e) {
        logError("❌ Erreur mise à jour des contacts : " + e.message);
      }
    });

    try {
      // Charge les rappels programmés
      chargerRappels(sock);
    } catch (e) {
      logError("❌ Erreur chargement rappels : " + e.message);
    }

    // 📥 Gère la réception des nouveaux messages
    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        const mek = messages?.[0];
        if (!mek?.message || mek.key?.remoteJid === 'status@broadcast') return;

        // GESTION CHAÎNES
        if (mek.key.remoteJid?.endsWith("@newsletter")) {
          const newsletterJid = mek.key.remoteJid;
          const messageContent = mek.message?.conversation || mek.message?.extendedTextMessage?.text || "[Message chaîne]";
          console.log(
            chalk.magentaBright("📰 Message chaîne :"),
            chalk.yellow(newsletterJid),
            "\nContenu :",
            chalk.white(messageContent)
          );
          return;
        }

        // Standardise le format du message
        mek.message = mek.message?.ephemeralMessage?.message || mek.message;

        let m;
        try {
          // Enrichit l'objet message avec des informations supplémentaires
          m = await smsg(sock, mek);
        } catch (e) {
          logError(`❌ Message illisible de ${mek.key?.remoteJid} : ${e.message}`);
          return;
        }

        // Récupère les identifiants de l'expéditeur et de la conversation
        const senderJid = m.sender || m.key?.participant || m.key?.remoteJid;
        const chatJid = m.chat || m.key?.remoteJid;

        // Récupère les noms pour l'affichage
        const senderName = await getDisplayName(sock, senderJid);
        const chatName = await getDisplayName(sock, chatJid);
        const msgType = Object.keys(m.message || {})[0] || "unknown";

        // Crée un aperçu du contenu du message pour le journal
        const contentPreview =
          m.text ||
          m.message?.conversation ||
          m.message?.extendedTextMessage?.text ||
          m.message?.imageMessage?.caption ||
          m.message?.videoMessage?.caption ||
          '[Contenu non affichable]';

        // Affiche le message reçu dans la console
        console.log(
          chalk.greenBright("📥 Message reçu") +
          ` de ${chalk.yellow(senderName)} dans ${chalk.cyan(chatName)} (${chalk.magenta(msgType)}) : ${chalk.white(contentPreview)}`
        );

        try {
          // Vérifie si le mode maintenance est actif
          await maintenance(sock, m);
        } catch (e) {
          if (e.message.includes("⛔ Maintenance active")) return;
          logError("❌ Erreur maintenance.js : " + (e.stack || e.message));
          return;
        }

        // Traite le message avec les IA
        await handleAllIA(sock, m);
        // Traite le message avec les plugins (commandes)
        require('./lib/plugins')(sock, m, messages);

      } catch (err) {
        logError("❌ Erreur messages.upsert:\n" + (err?.stack || err.message));
      }
    });

    // 💟 GESTION DES RÉACTIONS
    sock.ev.on("messages.reaction", async (reactionEvent) => {
      try {
        const reactions = Array.isArray(reactionEvent) ? reactionEvent : [reactionEvent];

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

          console.log(
            chalk.magentaBright("💟 Réaction détectée :"),
            chalk.white(`${emoji} par ${senderName}`),
            `dans ${chalk.yellow(chatName)} (${type})`,
            `→ ID msg: ${chalk.gray(reactedMsgId)}`
          );
        }
      } catch (err) {
        logError("❌ Erreur gestion des réactions : " + (err?.stack || err.message));
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

        console.log(
          chalk.blueBright("📤 Message envoyé") +
          ` à ${chalk.cyan(name)} (${chalk.magenta(msgType)}) : ${chalk.white(preview)}`
        );

        return await originalSendMessage(jid, content, options);
      } catch (err) {
        logError("❌ Erreur sendMessage:\n" + (err?.stack || err.message));
      }
    };

  } catch (err) {
    logError("❌ Erreur critique dans main() :\n" + (err?.stack || err.message));
  }
}

// 🧠 Lancer le bot
main().catch(err => {
  logError("❌ Erreur lors de l'initialisation :\n" + (err?.stack || err));
});

// 🔁 Hot reload
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  logInfo(`🛠 Mise à jour détectée : ${__filename}`);
  delete require.cache[file];
  require(file);
});

// Surveillance mémoire
setInterval(() => {
  const used = process.memoryUsage();
  logInfo(`💾 Mémoire: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
}, 60000);
// [file content end]