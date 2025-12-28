const fs = require('fs');
const path = require('path');
const geminiAI = require('../lib/geminiAI');

const CONSIGNES_FILE = path.join(__dirname, '../data/Consignes.txt');

module.exports = {
  name: "regles",
  category: "UNIROLIST",
  description: "Consulte les règles et consignes via l'IA",
  allowedForAll: true,

  async execute(riza, m, args) {
    try {
      // Lire le fichier des consignes
      if (!fs.existsSync(CONSIGNES_FILE)) {
        return await riza.sendMessage(m.chat, {
          text: "❌ Fichier des consignes introuvable."
        }, { quoted: m });
      }

      const consignesContent = fs.readFileSync(CONSIGNES_FILE, 'utf-8');
      const query = args.join(' ').toLowerCase();

      let prompt;
      if (query) {
        prompt = `Tu es Mimi, l'assistante IA de UNIROLIST spécialisée dans l'univers Tales of Valoria.

FICHIER DES CONSIGNES ET RÈGLES :
${consignesContent}

L'utilisateur demande : "${query}"

INSTRUCTIONS :
- Réponds précisément à sa question en te basant sur les consignes
- Sois claire et pédagogue
- Utilise des emojis appropriés (📜, ⚠️, ✅, 💰)
- Donne des exemples si nécessaire
- Structure ta réponse si elle comporte plusieurs parties

Réponds UNIQUEMENT en te basant sur le fichier des consignes.`;
      } else {
        prompt = `Tu es Mimi, l'assistante IA de UNIROLIST spécialisée dans l'univers Tales of Valoria.

FICHIER DES CONSIGNES ET RÈGLES :
${consignesContent}

L'utilisateur demande un aperçu des règles et consignes.

INSTRUCTIONS :
- Présente les principales sections des consignes
- Organise l'information de façon claire et hiérarchique
- Utilise des emojis pour rendre l'affichage agréable
- Mets en avant les points importants
- Indique comment obtenir plus de détails
- Sois concise mais complète

Réponds UNIQUEMENT en te basant sur le fichier des consignes.`;
      }

      // Message de chargement
      await riza.sendMessage(m.chat, {
        text: "📜 Consultation des règles..."
      }, { quoted: m });

      // Générer la réponse avec l'IA
      const response = await geminiAI.generateContent(prompt, {
        temperature: 0.3,
        maxOutputTokens: 2500
      });

      // Envoyer la réponse
      await riza.sendMessage(m.chat, {
        text: response
      }, { quoted: m });

    } catch (error) {
      console.error("❌ Erreur commande regles:", error);
      await riza.sendMessage(m.chat, {
        text: `❌ Erreur lors de la consultation des règles.\n\nUtilisation :\n• \`!regles\` - Vue d'ensemble\n• \`!regles boutique\` - Règles spécifiques`
      }, { quoted: m });
    }
  }
};
