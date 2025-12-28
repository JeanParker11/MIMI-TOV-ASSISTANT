const fs = require('fs');
const path = require('path');

// Le seul lien vers le reste du projet : l'IA
const geminiAI = require(path.join(__dirname, '../lib/geminiAI.js'));

async function processLogFile(filePath) {
    console.log(`
--- Lancement de l'analyse pour : ${filePath} ---
`);

    try {
        // 1. Lecture du fichier
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Fichier non trouvé : ${absolutePath}`);
        }
        const rawLogText = fs.readFileSync(absolutePath, 'utf8');
        console.log("Fichier lu avec succès.");

        // 2. Préparation et appel de l'IA
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

        console.log("Envoi de la requête à l'IA... (cela peut prendre du temps)");
        const aiResultText = await geminiAI.generateContent(analysisPrompt, { maxOutputTokens: 8192 });
        const cleanResult = aiResultText.replace(/```json|```/g, '').trim();
        const combatData = JSON.parse(cleanResult);
        console.log(`IA a retourné ${combatData.length} tours de combat structurés.`);

        // 3. Sauvegarde des données
        const historyFilePath = path.join(__dirname, '../data/historique_combats.json');
        let history = [];
        if (fs.existsSync(historyFilePath)) {
            history = JSON.parse(fs.readFileSync(historyFilePath, 'utf8'));
        }
        history.push(...combatData);
        fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2));

        console.log(`✅ Analyse terminée ! Les données ont été ajoutées à l'historique.`);

    } catch (e) {
        console.error("❌ Une erreur est survenue durant le processus :", e.message);
    }
}

// Exécution du script
const fileName = process.argv[2];
if (!fileName) {
    console.error("Erreur: Veuillez fournir un nom de fichier en argument.");
    process.exit(1);
}

processLogFile(fileName);
