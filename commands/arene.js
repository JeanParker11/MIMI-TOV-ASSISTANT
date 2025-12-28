const fs = require('fs');
const path = require('path');
const geminiAI = require('../lib/geminiAI');

const ARENES_FILE = path.join(__dirname, '../data/Arènes.txt');

module.exports = {
  name: "arene",
  category: "UNIROLIST",
  description: "Consulte les informations sur les arènes via l'IA",
  allowedForAll: true,

  async execute(riza, m, args) {
    try {
      if (!fs.existsSync(ARENES_FILE)) {
        return await riza.sendMessage(m.chat, {
          text: "❌ Fichier des arènes introuvable."
        }, { quoted: m });
      }

      const arenesContent = fs.readFileSync(ARENES_FILE, 'utf-8');
      const query = args.join(' ').toLowerCase();

      let prompt;
      if (query) {
        prompt = `Tu es Mimi, l'assistante IA de UNIROLIST spécialisée dans l'univers Tales of Valoria.

FICHIER DES ARÈNES :
${arenesContent}

L'utilisateur demande des informations sur : "${query}"

INSTRUCTIONS :
- Trouve l'arène correspondante dans le fichier
- Présente les informations de façon claire et organisée
- Utilise des emojis pour rendre l'affichage agréable (⚔️, 🌿, 👑, etc.)
- Si l'arène n'existe pas, liste les arènes disponibles
- Sois concise mais complète

Réponds UNIQUEMENT en te basant sur les informations du fichier.`;
      } else {
        prompt = `Tu es Mimi, l'assistante IA de UNIROLIST spécialisée dans l'univers Tales of Valoria.

FICHIER DES ARÈNES :
${arenesContent}

L'utilisateur demande la liste des arènes disponibles.

INSTRUCTIONS :
- Liste toutes les arènes de façon organisée et attrayante
- Pour chaque arène, donne un bref aperçu (1-2 lignes)
- Utilise des emojis pour rendre l'affichage agréable
- Indique comment obtenir plus de détails sur une arène spécifique
- Sois claire et concise

Réponds UNIQUEMENT en te basant sur les informations du fichier.`;
      }

      await riza.sendMessage(m.chat, {
        text: "🔍 Consultation des arènes de Valoria..."
      }, { quoted: m });

      const response = await geminiAI.generateContent(prompt, {
        temperature: 0.3,
        maxOutputTokens: 2000
      });

      await riza.sendMessage(m.chat, {
        text: response
      }, { quoted: m });

    } catch (error) {
      console.error("❌ Erreur commande arene:", error);
      await riza.sendMessage(m.chat, {
        text: `❌ Erreur lors de la consultation des arènes.\n\nUtilisation :\n• \`!arene\` - Liste toutes les arènes\n• \`!arene sylvestre\` - Info sur une arène spécifique`
      }, { quoted: m });
    }
  }
};
