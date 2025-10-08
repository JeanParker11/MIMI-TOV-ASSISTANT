const { commands, normalizeCommand } = require("../lib/plugins");
const prefix = global.prefix || ".";

// 📏 Calcul de la distance de Levenshtein
function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] =
        a[i - 1] === b[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j - 1] + 1
            );
    }
  }

  return matrix[a.length][b.length];
}

// 🔍 Suggère la commande la plus proche
function suggestClosestCommand(input, commands) {
  let minDistance = Infinity;
  let suggestion = null;

  for (const cmd of commands.keys()) {
    const distance = levenshteinDistance(input, cmd);
    if (distance < minDistance) {
      minDistance = distance;
      suggestion = cmd;
    }
  }

  return minDistance <= 3 ? suggestion : null;
}

module.exports = async function (conn, m) {
  if (!m.message || typeof commands !== "object") return;

  const originalMessage = m.message.ephemeralMessage?.message || m.message;

  const text =
    originalMessage.conversation ||
    originalMessage.extendedTextMessage?.text ||
    originalMessage.imageMessage?.caption ||
    originalMessage.videoMessage?.caption ||
    m.text || "";

  if (!text.startsWith(prefix)) return;

  const args = text.slice(prefix.length).trim().split(/\s+/);
  const rawCommand = args.shift();
  const normalizedCommand = normalizeCommand(rawCommand);

  // ✅ Si la commande normalisée existe, pas besoin de suggestion
  if (commands.has(normalizedCommand)) return;

  const suggestion = suggestClosestCommand(normalizedCommand, commands);

  const response = suggestion
    ? `🤖 *Commande inconnue* : \`${prefix}${rawCommand}\`\n\n🐼 Tu voulais dire : *${prefix}${suggestion}* ?`
    : `🤖 *Commande inconnue* : \`${prefix}${rawCommand}\`\n\n📖 Tape \`${prefix}menu\` pour voir les commandes disponibles.`;

  try {
    await conn.sendMessage(
      m.chat,
      { text: response },
      {
        quoted: {
          key: {
            remoteJid: m.key.remoteJid,
            fromMe: m.key.fromMe,
            id: m.key.id,
            participant: m.key.participant || m.participant
          },
          message: originalMessage
        }
      }
    );
  } catch (err) {
    console.error("⚠️ Erreur lors du reply, envoi simple sans quote :", err.message);
    await conn.sendMessage(
      m.chat,
      {
        text: `👤 @${(m.sender || m.key.participant || '').split('@')[0]}\n\n${response}`,
        mentions: [m.sender || m.key.participant]
      }
    );
  }
};