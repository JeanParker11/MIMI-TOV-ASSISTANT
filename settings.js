const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// 📌 Infos globales
global.owner = ["22896896296", "57312647610606@lid","267967489163401@lid","22898224802","2250170353986"];
global.sudo = ["22898133388"];
global.ownername = '𝙹𝚎𝚊𝚗 𝙿𝚊𝚛𝚔𝚎𝚛 🐼';
global.botname = '𝙼𝙸𝙼𝙸-𝚃𝙾𝚅-𝙰𝚂𝚂𝙸𝚂𝚃𝙰𝙽𝚃';
global.botversion = '1.0.0';
global.prefix = "!";
global.stickerPackName = "𝙼𝙸𝙼𝙸";
global.stickerAuthor = "𝙹𝚎𝚊𝚗 𝙿𝚊𝚛𝚔𝚎𝚛 🐼";
global.imgthumb = "https://files.catbox.moe/9h4sys.jpg";
global.menuGroupLink = "https://chat.whatsapp.com/LwkMUc4eoF50OhoKCYYZAf";
global.QUETE_GROUP_JID = "120363366068015316@g.us";
global.menuNewsletterJid = "";
global.menuNewsletterName = "‣ᴜɴɪʀᴏʟɪꜱᴛ 🍃";
global.menuChannelLink = "https://whatsapp.com/channel/0029VbB8HEnGZNCkf0BPG01o";

// 🔥 Configuration Gemini AI
global.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCt-XKn9vTftIR2v9O0vfYR5G2DaOBAz1M";

// 📱 Configuration Telegram
global.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7383402260:AAFktvtrk2Bao6LlIXoPUNnROZsxVhnpyTE";
global.TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID || 1849519763;
global.TELEGRAM_OWNER = [1849519763];

// 📦 Configuration de sauvegarde
global.BACKUP_ZIP_NAME = "Données UNIROLIST";
global.BACKUP_PATH = "./data";

// 📁 Chemins
const dataFolder = path.join(__dirname, "data");
const paramPath = path.join(dataFolder, "parametres.json");
const iaFolder = path.join(__dirname, "IA");

// 📦 Dossier data
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

// 🔄 Chargement des paramètres
function loadParams() {
  try {
    if (fs.existsSync(paramPath)) {
      return JSON.parse(fs.readFileSync(paramPath, 'utf-8'));
    }
  } catch (e) {
    console.error(chalk.red("❌ Erreur lecture parametres.json :"), e.message);
  }
  return {};
}

// 💾 Sauvegarde des paramètres
function saveParams(params) {
  try {
    fs.writeFileSync(paramPath, JSON.stringify(params, null, 2));
  } catch (e) {
    console.error(chalk.red("❌ Erreur écriture parametres.json :"), e.message);
  }
}

// 🔍 Chargement des IA
let iaFunctions = [];
try {
  iaFunctions = fs.readdirSync(iaFolder)
    .filter(f => f.endsWith(".js") && f !== "index.js")
    .map(f => path.basename(f, ".js").toUpperCase());
} catch (e) {
  console.error(chalk.red("❌ Erreur lecture dossier IA :"), e.message);
}

// ⚙️ Synchronisation des paramètres
let existingParams = loadParams();
let updated = false;
for (const ia of iaFunctions) {
  if (!Object.prototype.hasOwnProperty.call(existingParams, ia)) {
    existingParams[ia] = true;
    updated = true;
  }
}
if (updated) saveParams(existingParams);
global.parametres = existingParams;

// 🔁 Watch parametres.json
fs.watchFile(paramPath, () => {
  console.log(chalk.yellow("🔄 parametres.json modifié, rechargement..."));
  global.parametres = loadParams();
});

// 📊 Affichage de configuration
console.log(chalk.cyan("🔧 Configuration PARKY-MD chargée:"));
console.log(chalk.green(`   📱 Bot: ${global.botname} v${global.botversion}`));
console.log(chalk.green(`   👤 Créateur: ${global.ownername}`));
console.log(chalk.green(`   🖼️ Image Menu: ${global.imgthumb}`));
console.log(chalk.green(`   📍 Groupe Quête: ${global.QUETE_GROUP_JID}`));
console.log(chalk.green(`   🤖 Gemini AI: ${global.GEMINI_API_KEY && global.GEMINI_API_KEY !== "AIzaSyDipWRFerNNmOy_bcKjWKjjgKjjJgKjjgK" ? '✅ Configuré' : '⚠️ Clé par défaut'}`));
console.log(chalk.green(`   📱 Telegram: ${global.TELEGRAM_BOT_TOKEN !== '7856983867:AAETSwPXwQh-5m0gViewTeSAwWgM0D7137Q' ? '✅ Configuré' : '⚠️ Token par défaut'}`));
console.log(chalk.green(`   ⚙️ IA Actives: ${iaFunctions.length} fonctions chargées`));

// 🔁 Auto-reload du fichier settings
const file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`🔄 Fichier mis à jour : '${__filename}'`));
  delete require.cache[file];
  require(file);
});

// 📝 Export pour les autres modules
module.exports = {
  owner: global.owner,
  sudo: global.sudo,
  ownername: global.ownername,
  botname: global.botname,
  botversion: global.botversion,
  prefix: global.prefix,
  stickerPackName: global.stickerPackName,
  stickerAuthor: global.stickerAuthor,
  imgthumb: global.imgthumb,
  GEMINI_API_KEY: global.GEMINI_API_KEY,
  TELEGRAM_BOT_TOKEN: global.TELEGRAM_BOT_TOKEN,
  TELEGRAM_ADMIN_ID: global.TELEGRAM_ADMIN_ID,
  parametres: global.parametres
};