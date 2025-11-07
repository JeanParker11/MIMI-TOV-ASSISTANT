const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const dataFolder = path.join(__dirname, '..', 'data');
const sudoPath = path.join(dataFolder, 'sudo.json');
const groupePath = path.join(dataFolder, 'groupe.json');

/**
 * Charge un fichier JSON en toute sécurité.
 * @param {string} filePath - Le chemin vers le fichier JSON.
 * @param {any} defaultValue - La valeur par défaut à retourner en cas d'erreur.
 * @returns {any} Les données JSON parsées ou la valeur par défaut.
 */
function loadJSON(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(rawData);
    }
  } catch (e) {
    console.error(chalk.red(`❌ Erreur de lecture du fichier ${path.basename(filePath)}:`), e.message);
  }
  return defaultValue;
}

let sudoList = loadJSON(sudoPath, []);
let unirolistGroups = loadJSON(groupePath, []);

/**
 * Surveille les changements d'un fichier et recharge les données.
 * @param {string} filePath - Le chemin du fichier à surveiller.
 * @param {string} name - Le nom des données pour les logs.
 * @param {function} onLoad - La fonction de callback pour mettre à jour les données.
 */
function watchFile(filePath, name, onLoad) {
  fs.watchFile(filePath, () => {
    console.log(chalk.yellow(`🔄 ${name} modifié, rechargement...`));
    onLoad();
  });
}

watchFile(sudoPath, 'sudo.json', () => {
  sudoList = loadJSON(sudoPath, []);
});

watchFile(groupePath, 'groupe.json', () => {
  unirolistGroups = loadJSON(groupePath, []);
});

module.exports = {
  getSudoList: () => sudoList,
  getUnirolistGroups: () => unirolistGroups,
};
