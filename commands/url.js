const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

module.exports = {
  name: "url",
  category: "Général",
  description: "Convertit une image/vidéo/audio en URL (Catbox).",
  onlyAdmin: true,
  async execute(riza, m, args) {
    let filePath = null;

    try {
      const quoted =
        m.message?.extendedTextMessage?.contextInfo?.quotedMessage || m.message;

      // Détecte le type
      let type = null;
      if (quoted.imageMessage) type = "image";
      else if (quoted.videoMessage) type = "video";
      else if (quoted.audioMessage) type = "audio";

      if (!type) {
        await riza.sendMessage(m.chat, {
          text: "⚠️ Réponds à une image, une vidéo ou un audio pour obtenir son URL."
        }, { quoted: m });
        return;
      }

      // Message initial (pour édition)
      const sentMsg = await riza.sendMessage(m.chat, {
        text: "⬇️ Téléchargement du média..."
      }, { quoted: m });

      // Téléchargement du média depuis WhatsApp
      const stream = await downloadContentFromMessage(quoted[`${type}Message`], type);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      // Prépare dossier temporaire et écrit le fichier
      const tempDir = path.join(__dirname, "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const ext = type === "image" ? "jpg" : type === "video" ? "mp4" : "mp3";
      filePath = path.join(tempDir, `media_${Date.now()}.${ext}`);
      fs.writeFileSync(filePath, buffer);

      // Edit message -> uploading
      await riza.sendMessage(m.chat, {
        edit: sentMsg.key,
        text: "☁️ Envoi vers l'hébergeur..."
      });

      // Upload vers Catbox
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", fs.createReadStream(filePath));

      const upload = await axios.post("https://catbox.moe/user/api.php", form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 120000
      });

      const url = upload.data;

      // Édite le message initial pour afficher le résultat
      await riza.sendMessage(m.chat, {
        edit: sentMsg.key,
        text: `✅ URL générée :\n${url}`
      });

    } catch (err) {
      console.error("❌ Erreur commande url :", err);
      try {
        await riza.sendMessage(m.chat, {
          text: "❌ Erreur lors de la génération de l'URL : " + (err.message || err)
        }, { quoted: m });
      } catch (_) {}
    } finally {
      // Nettoyage
      try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.warn("⚠️ Impossible de supprimer le fichier temporaire :", e.message || e);
      }
    }
  }
};