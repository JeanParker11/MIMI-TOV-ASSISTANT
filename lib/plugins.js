const fs = require("fs");
const path = require("path");

const commands = new Map();
const groupCache = new Map();

const categoryEmojis = {
  "UNIROLIST": "🌍",
  "GENERAL": "🐼",
  "OWNER": "🩵",
  "AUTRES": "👻",
  "JEUX": "🎮"
};

// 🔤 Fonction de normalisation (accents, caractères spéciaux, etc.)
function normalizeCommand(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .trim()
    .toLowerCase();
}

function normalizeCategory(str) {
  return str
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, "")
    .trim()
    .toUpperCase();
}

// 🔁 Chargement des plugins
const pluginFolder = path.join(__dirname, "..", "commands");
const commandFiles = fs.readdirSync(pluginFolder).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  try {
    const command = require(path.join(pluginFolder, file));
    if (command.name && typeof command.execute === "function") {
      const normalizedName = normalizeCommand(command.name);
      command.category = normalizeCategory(command.category || "AUTRES");
      commands.set(normalizedName, command);
      console.log(`✅ Commande chargée : ${command.name}`);
    } else {
      console.warn(`⚠️ Ignoré : ${file} (pas de nom ou de fonction execute)`);
    }
  } catch (e) {
    console.error(`❌ Erreur chargement commande ${file} :`, e);
  }
}

// 🧩 Chargement JSON helpers
const loadJSON = (file) => {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "..", "data", file), "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error(`❌ Erreur lecture fichier ${file} :`, e.message);
    return Array.isArray(file) ? [] : {};
  }
};

const loadSudoList = () => loadJSON("sudo.json");
const loadUnirolistGroups = () => loadJSON("groupe.json");

let unirolistGroups = [];

async function getGroupMetadataSafe(sock, groupId) {
  if (groupCache.has(groupId)) return groupCache.get(groupId);

  try {
    const metadata = await sock.groupMetadata(groupId);
    groupCache.set(groupId, metadata);
    setTimeout(() => groupCache.delete(groupId), 30000);
    return metadata;
  } catch (err) {
    console.error("❌ Erreur récupération groupMetadata :", err.message || err);
    throw new Error("Rate limit ou groupe inaccessible.");
  }
}

// --- TA FONCTION sendQuoted EXACTEMENT COMME FOURNIE ---
async function sendQuoted(riza, chatId, text, m) {
  const originalMessage = m.message.ephemeralMessage?.message || m.message;
  try {
    await riza.sendMessage(chatId, { text }, {
      quoted: {
        key: {
          remoteJid: m.key.remoteJid,
          fromMe: m.key.fromMe,
          id: m.key.id,
          participant: m.key.participant || m.participant
        },
        message: originalMessage
      }
    });
  } catch (err) {
    console.error("⚠️ Erreur lors du reply, envoi simple sans quote :", err.message);
    await riza.sendMessage(chatId, {
      text: `👤 @${(m.sender || m.key.participant || '').split('@')[0]}\n\n${text}`,
      mentions: [m.sender || m.key.participant]
    });
  }
}

// 📌 Handler principal

module.exports = async (riza, m, chatUpdate, store) => {
  try {
    if (!m.message) return;

    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message.imageMessage?.caption ||
      m.message.videoMessage?.caption ||
      m.text || "";

    if (!text) return;

    const sender = m.key.participant || m.key.remoteJid || riza.user?.id || "";
    const senderBase = sender.split("@")[0];
    const senderLid = `${senderBase}@lid`;
    const senderSw = `${senderBase}@s.whatsapp.net`;

    const isOwner = Array.isArray(global.owner)
      ? global.owner.includes(senderLid) || global.owner.includes(senderSw) || global.owner.includes(senderBase)
      : [senderLid, senderSw, senderBase].includes(global.owner?.toString());

    const sudoList = loadSudoList();
    const isSudo = sudoList.includes(senderLid) || sudoList.includes(senderSw) || sudoList.includes(senderBase);

    let isAdmin = false;
    let isBotAdmin = false;
    const isGroup = m.chat.endsWith("@g.us");

    if (isGroup) {
      try {
        const metadata = await getGroupMetadataSafe(riza, m.chat);
        const admins = metadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
        isAdmin = admins.some(p => p.id === sender);
        isBotAdmin = admins.some(p => p.id === riza.user?.id);
      } catch {
        return sendQuoted(riza, m.chat, "⚠️ Impossible de vérifier les droits du groupe pour l'instant.", m);
      }
    }

    unirolistGroups = loadUnirolistGroups();

    // 📌 Commandes sans préfixe (par mot-clé)
    for (const [name, command] of commands.entries()) {
      if (!command.keywords || !Array.isArray(command.keywords)) continue;
      if (command.keywords.some(k => text.trim().startsWith(k))) {
        try {
          const args = text.trim().slice(command.keywords[0].length).trim().split(/ +/);
          console.log(`[KEYWORD] ${name} utilisé par ${senderBase}`);
          await command.execute(riza, m, args, chatUpdate, store);
        } catch (err) {
          console.error(`❌ Erreur exécution sans préfixe ${name} :`, err);
        }
        return;
      }
    }

    if (!global.prefix) {
      console.warn("⚠️ Le préfixe global n'est pas défini !");
      return;
    }

    if (text.startsWith(global.prefix)) {
      const args = text.slice(global.prefix.length).trim().split(/ +/);
      const rawCommand = args.shift();
      const commandName = normalizeCommand(rawCommand);
      const command = commands.get(commandName);

      if (!command) return;

      // UNIROLIST : contrôle accès groupe ou autorisation privée
      if (command.category === "UNIROLIST") {
        if (!isGroup) {
          if (!command.allowPrivate) {
            return sendQuoted(riza, m.chat, "❌ Cette commande doit être utilisée dans un groupe UNIROLIST.", m);
          }
        } else {
          if (!unirolistGroups.includes(m.chat)) {
            return sendQuoted(riza, m.chat, "❌ Cette commande n'est pas activée dans ce groupe.", m);
          }
        }
      }

      // 🔐 Permissions
      if (!isOwner && !command.allowedForAll) {
        if (command.onlyOwner)
          return sendQuoted(riza, m.chat, "❌ Seul le propriétaire peut utiliser cette commande.", m);

        if (command.onlySudo && !isSudo)
          return sendQuoted(riza, m.chat, "❌ Seuls les sudo peuvent utiliser cette commande.", m);

        if (command.onlyAdmin && isGroup && !isAdmin && !isSudo)
          return sendQuoted(riza, m.chat, "❌ Seuls les admins peuvent utiliser cette commande.", m);

        if (command.botAdmin && isGroup && !isBotAdmin)
          return sendQuoted(riza, m.chat, "❌ Le bot doit être admin pour cette commande.", m);

        if (!isGroup && (command.onlyAdmin || command.onlySudo || command.botAdmin))
          return sendQuoted(riza, m.chat, "❌ Cette commande est réservée aux groupes.", m);
      }

      const emoji = categoryEmojis[command.category || "AUTRES"] || "🩵";
      console.log(`[PLUGIN] ${command.name} | 🧑: ${senderBase} | 💬: ${m.chat}`);

      try {
        await riza.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
      } catch {}

      try {
        await command.execute(riza, m, args, chatUpdate, store);
        await riza.sendMessage(m.chat, { react: { text: "", key: m.key } });
      } catch (err) {
        console.error("❌ Erreur exécution commande :", err);
        await riza.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
      }
    }
  } catch (e) {
    console.error("❌ Erreur globale handler :", e);
    try {
      await riza.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
    } catch (_) {}
  }
};

// Exporte tout pour suggestion.js
module.exports.commands = commands;
module.exports.normalizeCommand = normalizeCommand;