/**
 * Script pour convertir les références temporelles en tours dans actives.json
 * Conversion: 
 * - 1 tour = ~10 secondes de temps réel
 * - 1 minute = 6 tours
 * - Les durées sont arrondies au tour supérieur
 */

const fs = require('fs');
const path = require('path');

// Charger le fichier
const activesPath = path.join(__dirname, '../data/competences/actives.json');
const actives = JSON.parse(fs.readFileSync(activesPath, 'utf8'));

// Fonction de conversion temps -> tours
function convertTimeToTurns(value, unit) {
  switch(unit) {
    case 'secondes':
    case 'seconds':
      return Math.max(1, Math.ceil(value / 10)); // 1 tour = 10 secondes
    case 'minutes':
    case 'minute':
      return Math.ceil(value * 6); // 1 minute = 6 tours
    case 'heures':
    case 'heure':
    case 'hours':
    case 'hour':
      return Math.ceil(value * 360); // 1 heure = 360 tours
    default:
      return value; // Déjà en tours ou valeur inconnue
  }
}

// Fonction pour traiter récursivement un objet
function processObject(obj, path = '') {
  if (!obj || typeof obj !== 'object') return obj;
  
  for (const key in obj) {
    const currentPath = path ? `${path}.${key}` : key;
    
    // Traiter les clés spécifiques connues
    if (key === 'duree_secondes' || key === 'duree_seconds') {
      const tours = convertTimeToTurns(obj[key], 'secondes');
      delete obj[key];
      obj['duree_tours'] = tours;
      console.log(`Converti ${currentPath}: ${obj[key]} secondes → ${tours} tours`);
    }
    else if (key === 'duree_minutes' || key === 'duree_minute') {
      const tours = convertTimeToTurns(obj[key], 'minutes');
      delete obj[key];
      obj['duree_tours'] = tours;
      console.log(`Converti ${currentPath}: ${obj[key]} minutes → ${tours} tours`);
    }
    else if (key === 'valeur_par_minute') {
      // Convertir en valeur par tour
      const valeurParTour = Math.ceil(obj[key] / 6);
      delete obj[key];
      obj['valeur_par_tour'] = valeurParTour;
      console.log(`Converti ${currentPath}: ${obj[key]} par minute → ${valeurParTour} par tour`);
    }
    else if (key === 'valeur_par_seconde') {
      // Convertir en valeur par tour
      const valeurParTour = Math.ceil(obj[key] * 10);
      delete obj[key];
      obj['valeur_par_tour'] = valeurParTour;
      console.log(`Converti ${currentPath}: ${obj[key]} par seconde → ${valeurParTour} par tour`);
    }
    else if (key === 'description' && typeof obj[key] === 'string') {
      // Remplacer les références temporelles dans les descriptions
      let desc = obj[key];
      
      // Patterns de remplacement
      const replacements = [
        { pattern: /(\d+)\s*secondes?/gi, replace: (match, num) => `${convertTimeToTurns(parseInt(num), 'secondes')} tour(s)` },
        { pattern: /(\d+)\s*minutes?/gi, replace: (match, num) => `${convertTimeToTurns(parseInt(num), 'minutes')} tours` },
        { pattern: /(\d+)\s*heures?/gi, replace: (match, num) => `${convertTimeToTurns(parseInt(num), 'heures')} tours` },
        { pattern: /par\s+minute/gi, replace: 'par tour' },
        { pattern: /par\s+seconde/gi, replace: 'tous les tours' },
        { pattern: /pendant\s+(\d+)\s*s(?:ec)?/gi, replace: (match, num) => `pendant ${convertTimeToTurns(parseInt(num), 'secondes')} tour(s)` },
        { pattern: /après\s+(\d+)\s*s(?:ec)?/gi, replace: (match, num) => `après ${convertTimeToTurns(parseInt(num), 'secondes')} tour(s)` }
      ];
      
      for (const {pattern, replace} of replacements) {
        const newDesc = desc.replace(pattern, replace);
        if (newDesc !== desc) {
          console.log(`Modifié description dans ${currentPath}`);
          desc = newDesc;
        }
      }
      
      obj[key] = desc;
    }
    else if (typeof obj[key] === 'object') {
      // Récursion pour les objets imbriqués
      obj[key] = processObject(obj[key], currentPath);
    }
  }
  
  return obj;
}

// Traiter toutes les compétences
console.log('=== Début de la conversion ===\n');

for (const compId in actives) {
  console.log(`Traitement de: ${compId}`);
  actives[compId] = processObject(actives[compId], compId);
  
  // Ajouter les informations de chargement selon le rang
  const rang = actives[compId].rang;
  if (rang && !actives[compId].temps_chargement) {
    const tempsChargement = {
      'E': { chargement: 1, effet: 1 },
      'D': { chargement: 2, effet: 1 },
      'C': { chargement: 3, effet: 1 },
      'B': { chargement: 4, effet: 2 },
      'A': { chargement: 5, effet: 2 },
      'S': { chargement: 6, effet: 3 }
    };
    
    if (tempsChargement[rang]) {
      actives[compId].temps_chargement = tempsChargement[rang];
      console.log(`  → Ajouté temps de chargement pour rang ${rang}`);
    }
  }
}

// Sauvegarder le fichier modifié
const backupPath = activesPath.replace('.json', '_backup.json');
fs.writeFileSync(backupPath, fs.readFileSync(activesPath)); // Backup
fs.writeFileSync(activesPath, JSON.stringify(actives, null, 2));

console.log('\n=== Conversion terminée ===');
console.log(`Fichier original sauvegardé dans: ${backupPath}`);
console.log(`Fichier converti: ${activesPath}`);
