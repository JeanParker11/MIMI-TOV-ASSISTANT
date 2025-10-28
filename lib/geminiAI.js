const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

class GeminiAIService {
  constructor() {
    this.apiKey = global.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    this.model = "gemini-2.0-flash-exp";

    if (!this.apiKey || this.apiKey === "AIzaSyDipWRFerNNmOy_bcKjWKjjgKjjJgKjjgK") {
      console.warn("⚠️ Clé API Gemini par défaut utilisée. Configurez votre propre clé pour de meilleures performances.");
    }

    try {
      this.ai = new GoogleGenAI({
        apiKey: this.apiKey,
        baseUrl: "https://generativelanguage.googleapis.com"
      });
      console.log("✅ Gemini AI initialisé avec @google/genai");
    } catch (error) {
      console.error("❌ Erreur initialisation Gemini AI:", error.message);
      this.ai = null;
    }
  }

  async generateContent(prompt, options = {}) {
    if (!this.ai) throw new Error("Gemini AI non initialisé");

    try {
      const defaultOptions = {
        model: this.model,
        contents: prompt,
        generationConfig: {
          temperature: options.temperature || 0.7,
          topK: options.topK || 40,
          topP: options.topP || 0.95,
          maxOutputTokens: options.maxOutputTokens || 1024,
          candidateCount: 1
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
        ]
      };

      console.log(`📤 Prompt Gemini (${this.model}):`, prompt.substring(0, 80) + "...");
      const response = await this.ai.models.generateContent(defaultOptions);

      if (response && response.text) {
        console.log("✅ Réponse Gemini AI reçue");
        return response.text;
      } else {
        throw new Error("Réponse invalide de Gemini AI");
      }
    } catch (error) {
      console.error("❌ Erreur Gemini AI:", error.message);
      return await this.fallbackToOldAPI(prompt);
    }
  }

  async fallbackToOldAPI(prompt) {
    try {
      console.log("🔄 Tentative fallback vers ancienne API...");

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        }
      );

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log("✅ Fallback réussi avec ancienne API");
        return response.data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("Réponse invalide de l'ancienne API");
      }
    } catch (fallbackError) {
      console.error("❌ Erreur fallback API:", fallbackError.message);
      return await this.externalFallback(prompt);
    }
  }

  async externalFallback(prompt) {
    try {
      console.log("🔄 Tentative fallback externe...");
      const encodedPrompt = encodeURIComponent(prompt);

      const response = await axios.get(`https://apis.davidcyriltech.my.id/ai/chatbot?query=${encodedPrompt}`, {
        timeout: 10000
      });

      if (response.data?.success && response.data.result) {
        console.log("✅ Fallback externe réussi");
        return response.data.result;
      }
    } catch (externalError) {
      console.error("❌ Erreur fallback externe:", externalError.message);
    }

    return "🤖 Désolé, j'ai un petit souci technique avec Gemini AI. Réessaie plus tard ! 😅";
  }

  async generateQuizContent(userMessage, type = 'create') {
    let prompt;

    if (type === 'create') {
      prompt = `Tu es PARKY, assistant IA spécialisé dans les quiz manga/anime, propulsé par Gemini AI ${this.model}. Tu fais partie du bot ${global.botname} créé par ${global.ownername}.

L'utilisateur souhaite créer un quiz : "${userMessage}"

Donne une seule question formatée ainsi :
Question: ...
Options:
a) ...
b) ...
c) ...
d) ...
Réponse: ...`;
    } else if (type === 'verify') {
      prompt = `Tu es PARKY, IA experte en manga/anime propulsée par PARKY AI ${this.model}. Tu fais partie du bot ${global.botname} créé par ${global.ownername}.
L'utilisateur te demande de vérifier ce quiz : "${userMessage}"

Analyse :

- Clarté de la question
- Cohérence des options
- Validité de la bonne réponse
- Correction d’éventuelles erreurs

Réponds en français avec des suggestions si nécessaire.`;
    } else {
      prompt = `Tu es PARKY, IA amicale spécialisée dans les quiz manga/anime. L'utilisateur dit : "${userMessage}". Réponds naturellement et en français.`;
    }

    return await this.generateContent(prompt, {
      temperature: 0.8,
      maxOutputTokens: 1500
    });
  }

  async generateParkyResponse(userMessage, overridePrompt = null) {
    const prompt = overridePrompt || `Tu es Parky, assistant IA créé par Jean Parker. Tu as la personnalité de Ayanokoji Kiyotaka. L'utilisateur dit : "${userMessage}". Réponds de façon naturelle, concise et amicale.`;

    return await this.generateContent(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1200
    });
  }

  isAvailable() {
    return this.ai !== null && this.apiKey && this.apiKey !== "AIzaSyDipWRFerNNmOy_bcKjWKjjgKjjJgKjjgK";
  }

  getInfo() {
    return {
      library: "@google/genai",
      model: this.model,
      available: this.isAvailable(),
      apiKeyConfigured: this.apiKey !== "AIzaSyDipWRFerNNmOy_bcKjWKjjgKjjJgKjjgK",
      version: "0.3.0"
    };
  }
}

const geminiAI = new GeminiAIService();
module.exports = geminiAI;