const fs = require('fs');
const path = require('path');

const FICHES_PATH = path.join(__dirname, '../data/fiches.json');

function loadFiches() {
  if (!fs.existsSync(FICHES_PATH)) return {};
  return JSON.parse(fs.readFileSync(FICHES_PATH));
}

function saveFiches(fiches) {
  fs.writeFileSync(FICHES_PATH, JSON.stringify(fiches, null, 2));
}

function setValue(fiches, pseudo, category, key, value) {
  if (!fiches[pseudo]) return false;

  if (!category) {
    fiches[pseudo][key] = isNaN(value) ? value : Number(value);
    return true;
  }

  if (!fiches[pseudo][category]) return false;

  if (category === "stats") {
    fiches[pseudo][category][key] = isNaN(value) ? value : Number(value);
    return true;
  }

  if (category === "corps" || category === "sorts") {
    const index = Number(key);
    if (isNaN(index)) return false;
    if (!Array.isArray(fiches[pseudo][category])) return false;

    fiches[pseudo][category][index] = value;
    return true;
  }

  return false;
}

module.exports = {
  name: "efiche",
  category: "UNIROLIST",
  description: "Modifie un champ simple ou une catégorie spécifique dans une fiche joueur",
  onlyAdmin: true,   // <-- Ici, tu dis que cette commande est réservée aux admins dans groupe, sudo ou owner en privé
  async execute(riza, m, args) {
    if (args.length < 3) {
      return riza.sendMessage(m.chat, {
        text:
          `❌ Usage simplifié :\n` +
          `.efiche <pseudo> <champ> <valeur>\n` +
          `OU\n` +
          `.efiche <pseudo> <catégorie> <clé/index> <valeur>\n\n` +
          `Exemples :\n` +
          `.efiche jean pseudo Jean Parker\n` +
          `.efiche jean stats force 80\n` +
          `.efiche jean corps 0 "armure légère"\n` +
          `.efiche jean sorts 1 "Feu sacré"`,
      }, { quoted: m });
    }

    const fiches = loadFiches();

    const pseudo = args[0].toLowerCase();

    if (!fiches[pseudo]) {
      return riza.sendMessage(m.chat, { text: `❌ Fiche de "${pseudo}" introuvable.` }, { quoted: m });
    }

    let success = false;

    if (args.length === 3) {
      const champ = args[1];
      const valeur = args[2];
      success = setValue(fiches, pseudo, null, champ, valeur);
    } else if (args.length >= 4) {
      const categorie = args[1];
      const cle = args[2];
      const valeur = args.slice(3).join(' ');
      success = setValue(fiches, pseudo, categorie, cle, valeur);
    }

    if (!success) {
      return riza.sendMessage(m.chat, { text: `❌ Erreur : impossible de modifier la fiche avec ces paramètres.` }, { quoted: m });
    }

    saveFiches(fiches);

    await riza.sendMessage(m.chat, {
      text: `✅ Fiche mise à jour pour *${pseudo}*.`,
    }, { quoted: m });
  }
};