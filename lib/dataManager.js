const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../');

/**
 * Lit un fichier JSON de manière sécurisée.
 * @param {string} fileName - Le nom du fichier (ex: 'banque.json').
 * @returns {object} - Les données parsées.
 */
function readData(fileName) {
    const filePath = path.join(dataDir, fileName);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
        return {};
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Écrit des données dans un fichier JSON.
 * @param {string} fileName - Le nom du fichier.
 * @param {object} data - Les données à écrire.
 */
function writeData(fileName, data) {
    const filePath = path.join(dataDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Nettoie une chaîne de caractères pour faciliter la comparaison.
 * @param {string} text Le texte à nettoyer.
 * @returns {string} Le texte nettoyé.
 */
function nettoyerTexte(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        // Expression régulière pour enlever la plupart des symboles et emojis
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .replace(/[^\w\sàâçéèêëîïôûùüÿ]/gi, '') // Garde les caractères alphanumériques et accentués
        .trim();
}

/**
 * Trouve une arène basée sur les informations du groupe
 * @param {Object} groupInfo - Les informations du groupe (nom, description, etc.)
 * @returns {Object|null} L'arène trouvée ou null
 */
function findArenaByGroupInfo(groupInfo) {
    try {
        const arenas = loadArenas();
        if (!groupInfo || !groupInfo.subject) return null;
        
        const groupName = nettoyerTexte(groupInfo.subject);
        
        // Chercher une correspondance exacte ou partielle
        for (const arena of arenas) {
            const arenaName = nettoyerTexte(arena.nom);
            
            // Vérifier le nom principal
            if (groupName.includes(arenaName) || arenaName.includes(groupName)) {
                console.log(`✅ Arène trouvée: ${arena.nom}`);
                return arena;
            }
            
            // Vérifier les noms alternatifs
            if (arena.nom_alternatifs && Array.isArray(arena.nom_alternatifs)) {
                for (const altName of arena.nom_alternatifs) {
                    const cleanAltName = nettoyerTexte(altName);
                    if (groupName.includes(cleanAltName) || cleanAltName.includes(groupName)) {
                        console.log(`✅ Arène trouvée via nom alternatif: ${arena.nom}`);
                        return arena;
                    }
                }
            }
        }
        
        console.log(`⚠️ Aucune arène trouvée pour: ${groupInfo.subject}`);
        return null;
        
    } catch (error) {
        console.error('Erreur lors de la recherche d\'arène:', error);
        return null;
    }
}

/**
 * Charge toutes les arènes depuis arenes_valoria.json
 * @returns {Array} Un tableau contenant toutes les arènes
 */
function loadArenas() {
    try {
        const arenasPath = path.join(__dirname, '../data/arenes_valoria.json');
        const arenasObject = JSON.parse(fs.readFileSync(arenasPath, 'utf8'));
        // Convertir l'objet en tableau
        return Object.values(arenasObject);
    } catch (error) {
        console.error("Erreur lors du chargement des arènes:", error);
        return [];
    }
}

/**
 * Trouve une arène correspondant aux informations d'un groupe WhatsApp.
 * @param {object} groupInfo - Objet contenant { nom, description }.
 * @returns {object|null} L'objet de l'arène trouvée ou null.
 */
function findArenaByGroupInfo(groupInfo) {
    // 1. Charger toutes les arènes depuis arenes_valoria.json
    const allArenas = loadArenas();
    
    // 2. Nettoyer les infos du groupe une seule fois
    const groupNameClean = nettoyerTexte(groupInfo?.nom || '');
    const groupDescClean = nettoyerTexte(groupInfo?.description || '');
    const groupTextToSearch = groupNameClean + ' ' + groupDescClean;
    
    // Si pas d'info de groupe, retourner l'arène par défaut
    if (!groupTextToSearch.trim()) {
        console.log("⚠️ Aucune info de groupe, utilisation de l'Aire des Braves par défaut");
        return allArenas.aire_des_braves || null;
    }

    // 3. Chercher une correspondance dans toutes les arènes
    for (const [arenaId, arena] of Object.entries(allArenas)) {
        // Vérifier le nom principal
        const arenaNameClean = nettoyerTexte(arena.nom);
        
        if (groupTextToSearch.includes(arenaNameClean) || 
            arenaNameClean.includes(groupNameClean) ||
            arenaNameClean.includes(groupDescClean)) {
            console.log(`✅ Arène détectée: ${arena.nom}`);
            return arena;
        }
        
        // Vérifier les noms alternatifs
        if (arena.nom_alternatifs && Array.isArray(arena.nom_alternatifs)) {
            for (const altName of arena.nom_alternatifs) {
                const altNameClean = nettoyerTexte(altName);
                if (groupTextToSearch.includes(altNameClean) ||
                    altNameClean.includes(groupNameClean) ||
                    altNameClean.includes(groupDescClean)) {
                    console.log(`✅ Arène détectée via nom alternatif: ${arena.nom}`);
                    return arena;
                }
            }
        }
        
        // Vérifier des mots-clés spécifiques
        const keywords = {
            'arene_sylvestre': ['sylvestre', 'foret', 'poteaux bois'],
            'aire_des_braves': ['braves', 'chevaliers', 'chateau'],
            'meryss_arena': ['meryss', 'mer', 'eau', 'galets'],
            'sanctuaire_neive': ['neive', 'neige', 'froid', 'hypothermie', 'sanctuaire'],
            'arene_titan': ['titan', 'gaia', 'souterrain', 'marbre'],
            'arene_rois_braves': ['rois braves', 'finalistes', 'champions']
        };
        
        if (keywords[arenaId]) {
            for (const keyword of keywords[arenaId]) {
                if (groupTextToSearch.includes(keyword)) {
                    console.log(`✅ Arène détectée via mot-clé '${keyword}': ${arena.nom}`);
                    return arena;
                }
            }
        }
    }
    
    // 4. Aucune correspondance trouvée, retourner l'arène par défaut
    console.log("⚠️ Aucune arène correspondante, utilisation de l'Aire des Braves par défaut");
    return allArenas.aire_des_braves || null;
}


const dataManager = {
    /**
     * Met à jour le palmarès d'un ou plusieurs joueurs.
     * @param {Array<{id: string, resultat: 'victoire'|'defaite'|'nul'}>} updates - Tableau des mises à jour.
     */
    updatePalmares(updates) {
        const palmares = readData('palmares.json');
        updates.forEach(({ id, resultat }) => {
            if (!palmares[id]) {
                palmares[id] = { victoires: 0, defaites: 0, nuls: 0 };
            }
            if (resultat === 'victoire') palmares[id].victoires++;
            else if (resultat === 'defaite') palmares[id].defaites++;
            else if (resultat === 'nul') palmares[id].nuls++;
        });
        writeData('palmares.json', palmares);
        console.log("🏅 Palmarès mis à jour.");
    },

    /**
     * Met à jour la banque d'un ou plusieurs joueurs.
     * @param {Array<{id: string, currency: 'diamants'|'rulith', amount: number}>} transactions - Tableau des transactions.
     */
    updateCurrency(transactions) {
        const banque = readData('banque.json');
        transactions.forEach(({ id, currency, amount }) => {
            if (!banque[id]) {
                banque[id] = { diamants: 0, rulith: 0 };
            }
            banque[id][currency] = (banque[id][currency] || 0) + amount;
        });
        writeData('banque.json', banque);
        console.log("💰 Banque mise à jour.");
    },
    findArenaByGroupInfo,
    loadArenas
};

module.exports = dataManager;
