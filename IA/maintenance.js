const axios = require("axios");

module.exports = async function maintenance(conn, m) {
  if (!global.parametres?.MAINTENANCE) return;

  const sender = m.key.participant || m.key.remoteJid || "";
  const senderBase = sender.split("@")[0];
  const owner = Array.isArray(global.owner) ? global.owner : [global.owner];

  const isOwner = owner.some(o => {
    const base = o.toString().split("@")[0];
    return base === senderBase;
  });

  if (isOwner) return;

  const text =
    m.message?.conversation ||
    m.message?.extendedTextMessage?.text ||
    m.message?.imageMessage?.caption ||
    m.message?.videoMessage?.caption ||
    "";

  if (!text || typeof text !== "string") return;

  const prefix = global.prefix || ".";
  if (!text.trim().startsWith(prefix)) return;

  const botName = global.botname || "ᴘᴀʀᴋʏ-ᴍᴅ";
  const siteLink = global.menuGroupLink || "https://chat.whatsapp.com";

  // ✅ Liens d’images aléatoires
  const imageLinks = [
    "https://files.catbox.moe/3jkulg.jpeg",
    "https://files.catbox.moe/l3x9kg.jpeg",
    "https://files.catbox.moe/qhykjo.jpeg"
  ];
  const randomImageUrl = imageLinks[Math.floor(Math.random() * imageLinks.length)];

  const maintenanceMessage = `
┏━━━━━━━━━━━━━━━━━━┓
     ⬡⬡⬡ MAINTENANCE ⬡⬡⬡
┗━━━━━━━━━━━━━━━━━━┛

📢 Hey toi ! Le bot est actuellement en phase de mise à jour ou d’amélioration.

⏳ Merci de patienter pendant que nous rendons ${botName} encore plus performant !

🔒 Toutes les commandes sont temporairement désactivées.

🔁 Reviens un peu plus tard, promis ce sera top ! 😄

— Ton fidèle bot, ${botName} 🤖
  `;

  try {
    const imageBuffer = (await axios.get(randomImageUrl, { responseType: 'arraybuffer' })).data;

    await conn.sendMessage(m.chat, {
      text: maintenanceMessage.trim(),
      contextInfo: {
        externalAdReply: {
          title: `${botName} - Maintenance en cours`,
          body: "Reviens bientôt pour profiter des nouveautés !",
          thumbnail: imageBuffer,
          mediaType: 1,
          renderLargerThumbnail: true,
          sourceUrl: siteLink,
          mediaUrl: siteLink
        }
      }
    }, { quoted: m });

  } catch (err) {
    console.error("Erreur envoi message de maintenance enrichi:", err);
    await conn.sendMessage(m.chat, { text: maintenanceMessage.trim() }, { quoted: m });
  }

  throw new Error("⛔ Maintenance active : commande bloquée.");
};