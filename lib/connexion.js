const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidDecode, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const { Boom } = require('@hapi/boom');

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

const pw = "parker";

const question = (text) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(text, ans => {
    rl.close();
    resolve(ans.trim());
  }));
};

async function askValidNumber() {
  while (true) {
    const input = await question(logPrompt("Entrez le numéro WhatsApp (ex: 22898133388): "));
    const cleaned = input.replace(/[^0-9]/g, '');
    if (!/^\d{8,15}$/.test(cleaned)) {
      logError("❌ Numéro invalide. Réessaie.");
      continue;
    }
    logInfo(`➡️ Numéro nettoyé : ${cleaned}`);
    return cleaned;
  }
}

async function startConnection() {
  const { state, saveCreds } = await useMultiFileAuthState("session");

  const sock = makeWASocket({
    logger: pino({ level: 'fatal', transport: { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname,time' } } }),
    printQRInTerminal: false,
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    markOnlineOnConnect: true,
    syncFullHistory: true,
    emitOwnEvents: true
  });

  if (!sock.authState.creds.registered) {
    const password = await question(logPrompt("Entrez le mot de passe: "));
    if (password !== pw) {
      logError("⛔ Mot de passe incorrect.");
      process.exit(1);
    }

    const phoneNumber = await askValidNumber();
    try {
      let code = await sock.requestPairingCode(phoneNumber);
      code = code?.match(/.{1,4}/g)?.join("-") || code;
      logPairingCode(code);
      logInfo("➡️ Saisis ce code dans WhatsApp.");
    } catch (err) {
      logError("❌ Erreur pairing code :\n" + (err?.message || err));
      process.exit(1);
    }
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
    if (connection === 'close') {
      switch (reason) {
        case DisconnectReason.badSession:
        case DisconnectReason.connectionClosed:
        case DisconnectReason.connectionLost:
        case DisconnectReason.connectionReplaced:
        case DisconnectReason.restartRequired:
        case DisconnectReason.timedOut:
          logWarning("🔁 Reconnexion en cours...");
          setTimeout(() => startConnection().catch(err => logError("❌ Reconnexion échouée:\n" + err.message)), 3000);
          break;
        case DisconnectReason.loggedOut:
          logError("🚪 Déconnecté (session terminée).");
          process.exit(0);
        default:
          logError(`❓ Déconnexion inattendue : ${reason}`);
          sock.end();
      }
    } else if (connection === 'open') {
      fancyStartLog("✅ Connexion établie !");
      const ownerJid = (Array.isArray(global.owner) ? global.owner[0] : global.owner) + "@s.whatsapp.net";
      sock.sendMessage(ownerJid, { text: getStartupMessage() });

      chargerRappels(sock);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {};
      return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
    }
    return jid;
  };

  sock.sendText = (jid, text, options = {}) =>
    sock.sendMessage(jid, { text, ...options });

  sock.downloadMediaMessage = async (msg) => {
    try {
      const content = msg?.msg || msg?.message?.[msg?.mtype] || msg?.message;
      const type = msg?.mtype?.replace(/Message/gi, '') || (content?.mimetype?.split('/')[0]);

      if (!content || !content.mediaKey) {
        throw new Error("⛔ Média invalide ou champ mediaKey manquant.");
      }

      const stream = await downloadContentFromMessage(content, type);
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      return Buffer.concat(chunks);
    } catch (e) {
      throw new Error(`❌ Échec téléchargement : ${e.message}`);
    }
  };

  return sock;
}

module.exports = startConnection;