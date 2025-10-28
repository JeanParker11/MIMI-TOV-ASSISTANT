const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * 🔁 Rafraîchir un module sans perturber les autres
 * @param {string} filePath - Chemin absolu du fichier à rafraîchir
 */
function reloadModule(filePath) {
  try {
    delete require.cache[require.resolve(filePath)];
    require(filePath);
    console.log(chalk.greenBright(`✅ Rechargé: ${filePath}`));
  } catch (err) {
    console.log(chalk.redBright(`❌ Erreur dans ${filePath}:\n${err.message}`));
  }
}

/**
 * 📁 Watch récursif de tous les fichiers JS du projet
 * @param {string} dir - Dossier à scanner
 */
function watchAllFiles(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((dirent) => {
    const fullPath = path.join(dir, dirent.name);

    // Ignore node_modules et les fichiers cachés
    if (fullPath.includes('node_modules') || dirent.name.startsWith('.')) return;

    if (dirent.isDirectory()) {
      watchAllFiles(fullPath); // Recurse dans les dossiers
    } else if (dirent.isFile() && fullPath.endsWith('.js')) {
      fs.watchFile(fullPath, { interval: 300 }, (curr, prev) => {
        if (curr.mtime <= prev.mtime) return;
        reloadModule(fullPath);
      });
    }
  });
}

// 🔄 Démarre le watcher
const rootPath = path.resolve(); // Racine du projet
watchAllFiles(rootPath);

console.log(chalk.blueBright(`👀 Watcher actif sur tous les fichiers JS (hors node_modules) dans: ${rootPath}`));