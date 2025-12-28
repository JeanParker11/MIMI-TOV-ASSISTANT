module.exports = {
  name: "archiver",
  category: "Administration",
  reaction: "🗄️",
  execute: async (dest, zk, commandeOptions) => {
    const { repondre, arg } = commandeOptions;

    if (!arg || arg.length === 0) {
      return repondre("Veuillez spécifier le chemin du fichier à archiver depuis la racine du projet. Exemple : `!archiver discussions/log1.txt`");
    }

    const filePath = arg.join(' ');
    const absolutePath = path.resolve(filePath);

    try {
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Fichier non trouvé : ${absolutePath}`);
      }

      await repondre(`Lecture du fichier d'archive : ${filePath}...`);
      const rawLogText = fs.readFileSync(absolutePath, 'utf8');

      await repondre(`Fichier lu. Lancement de l'analyse par l'IA pour extraire les données de combat. Cette opération peut prendre du temps... ⏳`);

      const analysisPrompt = `
        Tu es un archiviste expert des combats roleplay de l'univers de Valoria. Voici une transcription brute d'une discussion de combat. Ton travail est de la lire, d'ignorer le 'bruit' (salutations, messages hors-sujet) et d'extraire les données structurées du combat.
        TÂCHES:
        1. Identifie les combattants principaux.
        2. Regroupe les messages par "tour de jeu". Un tour contient généralement un pavé de chaque joueur et parfois des messages de modération ou un emoji "next".
        3. Pour chaque tour, identifie l'action de chaque joueur.
        4. Si tu trouves des débats ou des décisions (ex: "non, ça c'est du godmoding"), extrais la règle ou la décision qui a été prise.
        5. Structure chaque tour dans un objet JSON.
        TRANSCRIPTION BRUTE:
        ${rawLogText}
        INSTRUCTIONS FINALES:
        Retourne UNIQUEMENT un tableau d'objets JSON, un pour chaque tour. Ne fournis aucune explication ou texte supplémentaire en dehors du JSON.
      `;

      const aiResultText = await geminiAI.generateContent(analysisPrompt, { maxOutputTokens: 8192 });
      const cleanResult = aiResultText.replace(/```json|```/g, '').trim();
      const combatData = JSON.parse(cleanResult);

      const historyFilePath = path.join(__dirname, '../data/historique_combats.json');
      let history = [];
      if (fs.existsSync(historyFilePath)) {
          history = JSON.parse(fs.readFileSync(historyFilePath, 'utf8'));
      }
      history.push(...combatData);
      fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2));

      await repondre(`✅ Analyse terminée ! ${combatData.length} tours de combat ont été extraits et ajoutés à l'historique.`);

    } catch (e) {
      console.error("Erreur lors de l'archivage:", e);
      await repondre(`Une erreur est survenue durant le processus d'archivage. Vérifiez le nom du fichier ou le contenu. Erreur : ${e.message}`);
    }
  }
};