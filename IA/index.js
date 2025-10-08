const fs = require('fs');
const path = require('path');

const iaFolder = __dirname;
const IAHandlers = [];

// Fonction utilitaire pour récupérer le type de message WhatsApp (ex: conversation, imageMessage, etc.)
function getMessageType(m) {
  if (!m.message) return null;
  return Object.keys(m.message)[0];
}

// Chargement dynamique des modules IA dans ce dossier (sauf index.js)
fs.readdirSync(iaFolder)
  .filter(f => f.endsWith('.js') && f !== 'index.js')
  .forEach(f => {
    const modulePath = path.join(iaFolder, f);
    try {
      const module = require(modulePath);

      // Si export = fonction unique, on ajoute une entrée avec le nom du fichier
      // Sinon, on récupère toutes les fonctions exportées
      const functions = typeof module === 'function'
        ? [{ name: path.basename(f, '.js').toUpperCase(), fn: module }]
        : Object.entries(module)
            .filter(([_, fn]) => typeof fn === 'function')
            .map(([name, fn]) => ({
              name: name.toUpperCase(),
              fn
            }));

      IAHandlers.push(...functions);
    } catch (err) {
      console.error(`❌ Erreur chargement IA '${f}' :`, err.message);
    }
  });

/**
 * Exécute toutes les IA activées dans global.parametres
 * @param {*} conn - instance WhatsApp
 * @param {*} m - message reçu
 */
module.exports = async function handleAllIA(conn, m) {
  if (!global.parametres || typeof global.parametres !== 'object') {
    console.warn("⚠️ global.parametres non défini ou invalide");
    return;
  }

  const messageType = getMessageType(m);

  for (const { name, fn } of IAHandlers) {
    if (!global.parametres[name]) continue;

    try {
      // On passe l'instance, le message, et le type de message
      await fn(conn, m, messageType);
    } catch (e) {
      console.error(`❌ Erreur IA (${name}) :`, e.stack || e.message);
    }
  }
};