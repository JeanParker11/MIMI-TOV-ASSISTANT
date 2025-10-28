const fs = require('fs');

function getStartupMessage() {
  const commandsDir = './commands';
  const pluginCount = fs.existsSync(commandsDir)
    ? fs.readdirSync(commandsDir).filter(f => f.endsWith('.js')).length
    : 0;

  const parametres = global.parametres && Object.keys(global.parametres).length > 0
    ? Object.entries(global.parametres)
        .map(([name, active]) => `• ${name} : ${active ? "✅" : "❌"}`)
        .join('\n')
    : "⚠️ Aucune fonctionnalité active.";

  return `
┏━━━━━━━━━━━━━━━━━⊷
┃ 𖦹 ${global.botname || "Bot"}
┣━━━━━━━━━━━━━━━━━⊷
┃ 𖦹 *Créateur* : ${global.ownername || "Inconnu"}
┃ 𖦹 *Prefix* : [ ${global.prefix || "."} ]
┃ 𖦹 *Plugins* : ${pluginCount}
┃ 𖦹 *Version* : ${global.botversion || "1.0.0"}
┗━━━━━━━━━━━━━━━━━⊷

🔧 *Paramètres* 🔧

${parametres}
`.trim();
}

module.exports = getStartupMessage;