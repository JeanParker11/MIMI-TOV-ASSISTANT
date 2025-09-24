const fs = require('fs');
const path = require('path');

const paramPath = path.join(__dirname, '..', 'data', 'parametres.json');

function saveParams(params) {
  fs.writeFileSync(paramPath, JSON.stringify(params, null, 2));
}

module.exports = {
  name: 'param',
  description: 'Afficher, activer ou désactiver les paramètres IA',
  category: 'Owner',
  onlyOwner: true,
  allowedForAll: false,

  async execute(riza, m, args) {
    let params = global.parametres || {};

    if (!args.length) {
      let list = '🔧 *Paramètres IA actuels* 🔧\n\n';
      for (const [key, value] of Object.entries(params)) {
        list += `• ${key} : ${value ? '✅ Activé' : '❌ Désactivé'}\n`;
      }
      return riza.sendMessage(m.chat, { text: list.trim() }, { quoted: m });
    }

    const paramName = args[0].toUpperCase();
    const action = args[1]?.toLowerCase();

    if (!(paramName in params)) {
      return riza.sendMessage(m.chat, { text: `❌ Le paramètre *${paramName}* n'existe pas.` }, { quoted: m });
    }

    if (action === 'on') {
      params[paramName] = true;
    } else if (action === 'off') {
      params[paramName] = false;
    } else {
      return riza.sendMessage(m.chat, { text: `❌ Syntaxe invalide. Utilise :\n.param ${paramName} on\n.param ${paramName} off` }, { quoted: m });
    }

    // Met à jour global.parametres ET sauvegarde
    global.parametres = params;
    saveParams(params);

    return riza.sendMessage(m.chat, { text: `⚙️ Paramètre *${paramName}* ${action === 'on' ? 'activé' : 'désactivé'}.` }, { quoted: m });
  }
};