/**
 * SCRIPT DE TEST POUR VÉRIFIER QUE LE BOT FONCTIONNE
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 TEST DU BOT - VÉRIFICATION DES MODULES\n');
console.log('=' .repeat(50));

let erreurs = [];
let succes = [];

// Test 1: Vérifier que tous les fichiers requis existent
console.log('\n📁 Test 1: Vérification des fichiers...');
const fichiersRequis = [
    './lib/combatManager.js',
    './lib/dataManager.js',
    './lib/combatLogic.js',
    './lib/spatialSystem.js',
    './lib/esquiveSystem.js',
    './lib/combatValidator.js',
    './lib/damageCalculator.js',
    './lib/equipmentSystem.js',
    './lib/skillSystem.js',
    './lib/statusEffects.js',
    './lib/inactivitySystem.js',
    './lib/combatLogger.js',
    './lib/errorHandler.js',
    './lib/combatStats.js',
    './data/arenes_valoria.json',
    './data/rdm.txt',
    './data/glossaire_combat.txt'
];

fichiersRequis.forEach(fichier => {
    const chemin = path.join(__dirname, fichier);
    if (fs.existsSync(chemin)) {
        console.log(`  ✅ ${fichier}`);
        succes.push(`Fichier ${fichier} trouvé`);
    } else {
        console.log(`  ❌ ${fichier} MANQUANT!`);
        erreurs.push(`Fichier ${fichier} manquant`);
    }
});

// Test 2: Vérifier que les modules peuvent être chargés
console.log('\n📦 Test 2: Chargement des modules...');
const modules = [
    'combatManager',
    'dataManager',
    'combatLogic',
    'spatialSystem',
    'esquiveSystem',
    'combatValidator',
    'damageCalculator',
    'equipmentSystem',
    'skillSystem',
    'statusEffects',
    'inactivitySystem',
    'combatLogger',
    'errorHandler',
    'combatStats'
];

modules.forEach(module => {
    try {
        require(`./lib/${module}`);
        console.log(`  ✅ ${module}`);
        succes.push(`Module ${module} chargé`);
    } catch (error) {
        console.log(`  ❌ ${module}: ${error.message}`);
        erreurs.push(`Module ${module}: ${error.message}`);
    }
});

// Test 3: Vérifier les fonctions critiques
console.log('\n🔧 Test 3: Vérification des fonctions critiques...');
try {
    const dataManager = require('./lib/dataManager');
    
    // Test findArenaByGroupInfo
    const testGroupInfo = { subject: "Aire des braves" };
    const arena = dataManager.findArenaByGroupInfo(testGroupInfo);
    if (arena) {
        console.log(`  ✅ findArenaByGroupInfo fonctionne`);
        succes.push('findArenaByGroupInfo fonctionne');
    } else {
        console.log(`  ⚠️ findArenaByGroupInfo retourne null`);
    }
    
    // Test loadArenas
    const arenas = dataManager.loadArenas();
    if (Array.isArray(arenas) && arenas.length > 0) {
        console.log(`  ✅ loadArenas charge ${arenas.length} arènes`);
        succes.push(`${arenas.length} arènes chargées`);
    } else {
        console.log(`  ❌ loadArenas ne charge aucune arène`);
        erreurs.push('Aucune arène chargée');
    }
    
} catch (error) {
    console.log(`  ❌ Erreur lors du test des fonctions: ${error.message}`);
    erreurs.push(`Test fonctions: ${error.message}`);
}

// Test 4: Vérifier la syntaxe des fichiers JavaScript
console.log('\n📝 Test 4: Vérification de la syntaxe...');
const fichiersCritiques = [
    './lib/combatManager.js',
    './lib/dataManager.js'
];

fichiersCritiques.forEach(fichier => {
    try {
        const contenu = fs.readFileSync(path.join(__dirname, fichier), 'utf8');
        
        // Vérifications basiques
        const openBraces = (contenu.match(/{/g) || []).length;
        const closeBraces = (contenu.match(/}/g) || []).length;
        const openParens = (contenu.match(/\(/g) || []).length;
        const closeParens = (contenu.match(/\)/g) || []).length;
        const openBrackets = (contenu.match(/\[/g) || []).length;
        const closeBrackets = (contenu.match(/\]/g) || []).length;
        
        let syntaxOk = true;
        let problemes = [];
        
        if (openBraces !== closeBraces) {
            syntaxOk = false;
            problemes.push(`Accolades non équilibrées: ${openBraces} ouvertes, ${closeBraces} fermées`);
        }
        if (openParens !== closeParens) {
            syntaxOk = false;
            problemes.push(`Parenthèses non équilibrées: ${openParens} ouvertes, ${closeParens} fermées`);
        }
        if (openBrackets !== closeBrackets) {
            syntaxOk = false;
            problemes.push(`Crochets non équilibrés: ${openBrackets} ouverts, ${closeBrackets} fermés`);
        }
        
        if (syntaxOk) {
            console.log(`  ✅ ${fichier} - Syntaxe OK`);
            succes.push(`Syntaxe ${fichier} OK`);
        } else {
            console.log(`  ❌ ${fichier} - Problèmes de syntaxe:`);
            problemes.forEach(p => {
                console.log(`     ${p}`);
                erreurs.push(`${fichier}: ${p}`);
            });
        }
        
    } catch (error) {
        console.log(`  ❌ ${fichier}: ${error.message}`);
        erreurs.push(`Lecture ${fichier}: ${error.message}`);
    }
});

// Test 5: Vérifier les commandes
console.log('\n💬 Test 5: Vérification des commandes...');
const commandesP2 = [
    './commands/marche.js',
    './commands/messtats.js',
    './commands/utiliser.js',
    './commands/monarsenal.js'
];

commandesP2.forEach(commande => {
    const chemin = path.join(__dirname, commande);
    if (fs.existsSync(chemin)) {
        try {
            require(chemin);
            console.log(`  ✅ ${commande}`);
            succes.push(`Commande ${commande} OK`);
        } catch (error) {
            console.log(`  ❌ ${commande}: ${error.message}`);
            erreurs.push(`Commande ${commande}: ${error.message}`);
        }
    } else {
        console.log(`  ⚠️ ${commande} n'existe pas`);
    }
});

// RÉSUMÉ
console.log('\n' + '=' .repeat(50));
console.log('📊 RÉSUMÉ DES TESTS\n');

console.log(`✅ Succès: ${succes.length}`);
console.log(`❌ Erreurs: ${erreurs.length}`);

if (erreurs.length > 0) {
    console.log('\n🔴 ERREURS DÉTECTÉES:');
    erreurs.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
    });
    
    console.log('\n⚠️ LE BOT A DES PROBLÈMES QUI DOIVENT ÊTRE CORRIGÉS!');
} else {
    console.log('\n✅ TOUS LES TESTS SONT PASSÉS!');
    console.log('🎉 Le bot devrait fonctionner correctement.');
}

console.log('\n💡 Pour lancer le bot: npm start');
console.log('💡 Pour plus de détails, vérifiez les logs lors du démarrage.');

process.exit(erreurs.length > 0 ? 1 : 0);
