const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: "annonce",
  category: "Général",
  onlyAdmin: true,
  group: true,
  description: "Annonce à tous avec mention invisible, même sur média cité",

  async execute(conn, m, args) {
    try {
      if (!m.isGroup) {
        return conn.sendMessage(m.chat, { text: "❌ Utilisable uniquement en groupe." }, { quoted: m });
      }

      const metadata = await conn.groupMetadata(m.chat);
      const mentionedJid = metadata.participants.map(p => p.id);
      const contextInfo = { mentionedJid };

      // 🎯 Si message cité
      if (m.quoted && m.quoted.message) {
        const { type, message, text } = m.quoted;
        let content = {};

        if (["imageMessage", "videoMessage", "documentMessage"].includes(type)) {
          const mediaType = type.replace("Message", ""); // 'image', 'video', 'document'
          const stream = await downloadContentFromMessage(message[type], mediaType);
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          const buffer = Buffer.concat(chunks);

          content = {
            [mediaType]: buffer,
            mimetype: message[type].mimetype,
            caption: text || "📢 Annonce",
            contextInfo
          };

          if (type === "documentMessage") {
            content.fileName = message[type]?.fileName || "document";
          }

        } else {
          // Si c’est un message texte ou autre
          content = {
            text: text || "📢 Annonce : Lisez attentivement ce message !",
            contextInfo
          };
        }

        return await conn.sendMessage(m.chat, content, { quoted: m });
      }

      // 🗣️ Si pas de message cité, on utilise le texte donné
      const txt = args.join(" ").trim();
      if (!txt) {
        return conn.sendMessage(m.chat, {
          text: "❌ Réponds à un message ou écris un texte à envoyer."
        }, { quoted: m });
      }

      await conn.sendMessage(m.chat, {
        text: txt,
        contextInfo
      }, { quoted: m });

    } catch (err) {
      console.error("❌ Erreur commande annonce :", err);
      await conn.sendMessage(m.chat, {
        text: "❌ Impossible d'envoyer l'annonce."
      }, { quoted: m });
    }
  }
};