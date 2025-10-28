// ../lib/imageGenerator.js
const axios = require("axios");

/**
 * Génère une image à partir d’un prompt texte via l’API Flux de Siputzx.
 * @param {string} prompt - Le prompt textuel à illustrer.
 * @returns {Promise<Buffer>} - L’image générée sous forme de buffer.
 */
async function generateImageFromPrompt(prompt) {
  const url = `https://api.siputzx.my.id/api/ai/flux?prompt=${encodeURIComponent(prompt)}`;

  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: {
        accept: "*/*"
      }
    });

    if (!res.data || res.data.length < 1000) {
      throw new Error("Image invalide ou trop légère.");
    }

    return Buffer.from(res.data, "binary");
  } catch (error) {
    throw new Error(`Erreur lors de la génération de l'image : ${error.message}`);
  }
}

module.exports = { generateImageFromPrompt };