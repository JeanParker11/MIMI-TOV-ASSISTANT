const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment-timezone');
const { getContentType } = require('@whiskeysockets/baileys');
const { applyFancyStyle, fancyStyles } = require('./fancyText');

async function smsg(conn, m, store) {
  try {
    m.id = m.key.id;
    m.isBaileys = m.id?.startsWith('BAE5') && m.id.length === 16;
    m.chat = m.key.remoteJid;
    m.fromMe = m.key.fromMe;
    m.isGroup = m.chat.endsWith('@g.us');
    m.sender = conn.decodeJid(m.fromMe ? conn.user.id : m.key.participant || m.chat);

    const msg = m.message || {};
    m.mtype = getContentType(msg);
    m.msg = m.mtype === "viewOnceMessage"
      ? msg[m.mtype].message[getContentType(msg[m.mtype].message)]
      : msg[m.mtype];

    m.text =
      m.msg?.text ||
      m.msg?.caption ||
      msg?.conversation ||
      msg?.extendedTextMessage?.text ||
      msg?.imageMessage?.caption ||
      msg?.videoMessage?.caption ||
      msg?.documentMessage?.caption ||
      msg?.listResponseMessage?.singleSelectReply?.selectedRowId ||
      msg?.buttonsResponseMessage?.selectedButtonId ||
      msg?.templateButtonReplyMessage?.selectedId ||
      "";

    // 🔁 quoted (message cité)
    const quoted = m.msg?.contextInfo?.quotedMessage;
    if (quoted) {
      const type = getContentType(quoted);
      const qMsg = quoted[type];
      m.quoted = {
        type,
        id: m.msg.contextInfo.stanzaId,
        sender: conn.decodeJid(m.msg.contextInfo.participant),
        fromMe: conn.decodeJid(m.msg.contextInfo.participant) === conn.user.jid,
        message: quoted,
        text:
          qMsg?.text ||
          qMsg?.caption ||
          qMsg?.conversation ||
          "",
        key: {
          id: m.msg.contextInfo.stanzaId,
          fromMe: conn.decodeJid(m.msg.contextInfo.participant) === conn.user.jid,
          remoteJid: m.chat,
          participant: m.msg.contextInfo.participant,
        }
      };
    } else {
      m.quoted = null;
    }

    m.wasReplied = !!m.quoted;
    return m;

  } catch (err) {
    console.error("❌ Erreur smsg :", err.message);
    return m;
  }
}

// 📦 Fonctions utilitaires

function formatDate(tz = "Africa/Lome", format = "DD/MM/YYYY HH:mm:ss") {
  return moment().tz(tz).format(format);
}

async function getBuffer(url, options = {}) {
  try {
    const res = await axios.get(url, {
      headers: { 'DNT': 1, 'Upgrade-Insecure-Request': 1 },
      responseType: 'arraybuffer',
      ...options,
    });
    return res.data;
  } catch (err) {
    throw new Error(`❌ Impossible de récupérer le buffer : ${err.message}`);
  }
}

function generateMessageTag() {
  const tag = Math.floor(Math.random() * 10000).toString();
  return `message-${tag}`;
}

function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`❌ Erreur lecture JSON (${filePath}) :`, e.message);
    return {};
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`❌ Erreur écriture JSON (${filePath}) :`, e.message);
  }
}

function randomId(length = 6) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

function getExtension(fileName = "") {
  const ext = path.extname(fileName || "").toLowerCase();
  return ext.startsWith('.') ? ext.slice(1) : ext;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toFancy(text, style = "gothic") {
  if (typeof text !== "string") return text;
  return applyFancyStyle(text, style);
}

// ✅ Exportation
module.exports = {
  smsg,
  formatDate,
  getBuffer,
  generateMessageTag,
  readJSON,
  writeJSON,
  randomId,
  getExtension,
  sleep,
  delay: sleep,
  toFancy,
  fancyStyles,
};