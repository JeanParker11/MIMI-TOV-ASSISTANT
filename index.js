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

// 🔧 Obtenir le nom lisible d’un utilisateur/groupe
const getDisplayName = async (sock, jid) => {
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
};

async function main() {
  try {
    fancyStartLog();

    const sock = await startConnection();
    sock.contacts = sock.contacts || {};
    sock.groupMetadata = sock.groupMetadata || {};

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
      chargerRappels(sock);
    } catch (e) {
      logError("❌ Erreur chargement rappels : " + e.message);
    }

    // 📥 Réception des messages
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

        mek.message = mek.message?.ephemeralMessage?.message || mek.message;

        let m;
        try {
          m = await smsg(sock, mek);
        } catch (e) {
          logError(`❌ Message illisible de ${mek.key?.remoteJid} : ${e.message}`);
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

        console.log(
          chalk.greenBright("📥 Message reçu") +
          ` de ${chalk.yellow(senderName)} dans ${chalk.cyan(chatName)} (${chalk.magenta(msgType)}) : ${chalk.white(contentPreview)}`
        );

        try {
          await maintenance(sock, m);
        } catch (e) {
          if (e.message.includes("⛔ Maintenance active")) return;
          logError("❌ Erreur maintenance.js : " + (e.stack || e.message));
          return;
        }

        await handleAllIA(sock, m);
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
    setTimeout(() => main(), 5000);
  }
}

// 🧠 Lancer le bot
main().catch(err => {
  logError("❌ Erreur lors de l'initialisation :\n" + (err?.stack || err));
  setTimeout(() => main(), 5000);
});

// 🔁 Hot reload
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  logInfo(`🛠 Mise à jour détectée : ${__filename}`);
  delete require.cache[file];
  require(file);
});