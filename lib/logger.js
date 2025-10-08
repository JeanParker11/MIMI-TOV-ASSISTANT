const figlet = require('figlet');
const gradient = require('gradient-string');
const chalk = require('chalk');
const ora = require('ora').default;
const boxen = require('boxen');

function fancyStartLog(status = "Connexion réussie") {
  console.clear();

  const spinner = ora({
    text: chalk.cyan('🚀 Démarrage de ') + chalk.bold('PARKY-MD') + chalk.cyan('...'),
    spinner: 'dots'
  }).start();

  spinner.succeed(chalk.green('✅ PARKY-MD prêt !'));

  const ascii = figlet.textSync("PARKY-MD", { font: 'Slant' });
  const asciiColored = gradient.atlas.multiline(ascii);

  const infoBox = boxen(
    `
${chalk.bold("👤 Créateur")} : ${chalk.yellow(global.ownername || "?")}
${chalk.bold("🤖 Bot")}      : ${chalk.yellow(global.botname || "?")}
${chalk.bold("📱 Version")}  : ${chalk.yellow(global.botversion || "?")}
${chalk.bold("📡 Statut")}   : ${chalk.green(status)}
`.trim(),
    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      dimBorder: true,
      title: chalk.cyan.bold('📢 PARKY-MD STATUS'),
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
  console.log(
    boxen(`${chalk.bold.green("📲 Code d'appariement :")} ${chalk.yellowBright(code)}`, {
      padding: 1,
      borderStyle: 'double',
      borderColor: 'green',
      align: 'center',
      title: chalk.green.bold('PAIRING-CODE')
    })
  );
}

module.exports = {
  fancyStartLog,
  logInfo,
  logSuccess,
  logError,
  logWarning,
  logPrompt,
  logPairingCode
};