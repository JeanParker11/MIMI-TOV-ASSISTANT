const figlet = require('figlet');
const gradient = require('gradient-string');
const chalk = require('chalk');
const ora = require('ora').default;
const boxen = require('boxen');

function fancyStartLog(status = "Connexion réussie") {
  console.clear();

  // Utilisation automatique de global.botname
  const botName = "MIMI";
  const ownerName = global.ownername || "?";
  const botVersion = global.botversion || "?";

  const spinner = ora({
    text: chalk.cyan('🚀 Démarrage de ') + chalk.bold(botName) + chalk.cyan('...'),
    spinner: 'dots'
  }).start();

  spinner.succeed(chalk.green(`✅ ${botName} prêt !`));

  const ascii = figlet.textSync(botName, { font: 'Slant' });
  const asciiColored = gradient.atlas.multiline(ascii);

  const infoBox = boxen(
    `
${chalk.bold("👤 Créateur")} : ${chalk.yellow(ownerName)}
${chalk.bold("🤖 Bot")}      : ${chalk.yellow(botName)}
${chalk.bold("📱 Version")}  : ${chalk.yellow(botVersion)}
${chalk.bold("📡 Statut")}   : ${chalk.green(status)}
`.trim(),
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      dimBorder: true,
      title: chalk.cyan.bold(`📢 ${botName} STATUS`),
      titleAlignment: 'center'
    }
  );

  console.log(asciiColored);
  console.log(infoBox);
}

// Logs stylisés
function logInfo(msg) {
  console.log(chalk.blueBright(`ℹ️ ${msg}`));
}

function logSuccess(msg) {
  console.log(chalk.greenBright(`✅ ${msg}`));
}

function logError(msg) {
  console.log(chalk.redBright(`❌ ${msg}`));
}

function logWarning(msg) {
  console.log(chalk.keyword('orange')(`⚠️ ${msg}`));
}

function logPrompt(msg) {
  return chalk.magentaBright(`📝 ${msg} `);
}

function logPairingCode(code) {
  const botName = global.botname || "PARKY-MD";
  
  console.log(
    boxen(`${chalk.bold.green("📲 Code d'appariement :")} ${chalk.yellowBright(code)}`, {
      padding: 1,
      borderStyle: 'double',
      borderColor: 'green',
      align: 'center',
      title: chalk.green.bold(`${botName} - PAIRING`)
    })
  );
}

// Nouvelle fonction pour afficher le message de démarrage complet
function displayFullStartup() {
  const botName = global.botname || "PARKY-MD";
  const commandsDir = './commands';
  
  try {
    const pluginCount = fs.existsSync(commandsDir)
      ? fs.readdirSync(commandsDir).filter(f => f.endsWith('.js')).length
      : 0;

    const parametres = global.parametres && Object.keys(global.parametres).length > 0
      ? Object.entries(global.parametres)
          .map(([name, active]) => `• ${name} : ${active ? "✅" : "❌"}`)
          .join('\n')
      : "⚠️ Aucune fonctionnalité active.";

    const startupBox = boxen(
      `
┏━━━━━━━━━━━━━━━━━⊷
┃ 𖦹 ${botName}
┣━━━━━━━━━━━━━━━━━⊷
┃ 𖦹 *Créateur* : ${global.ownername || "Inconnu"}
┃ 𖦹 *Prefix* : [ ${global.prefix || "."} ]
┃ 𖦹 *Plugins* : ${pluginCount}
┃ 𖦹 *Version* : ${global.botversion || "1.0.0"}
┗━━━━━━━━━━━━━━━━━⊷

🔧 *Paramètres* 🔧

${parametres}
`.trim(),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'blue',
        title: chalk.blue.bold(`🚀 ${botName} - DÉMARRAGE`),
        titleAlignment: 'center'
      }
    );

    console.log(startupBox);
  } catch (error) {
    logError(`Erreur lors de l'affichage du démarrage: ${error.message}`);
  }
}

module.exports = {
  fancyStartLog,
  logInfo,
  logSuccess,
  logError,
  logWarning,
  logPrompt,
  logPairingCode,
  displayFullStartup
};