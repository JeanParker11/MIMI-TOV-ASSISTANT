const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");
const equipesPath = path.join(__dirname, "..", "data", "equipes.json");

// Fonction pour migrer les données de guildes vers equipes
function migrerGuildesVersEquipes() {
  if (fs.existsSync(guildesPath) && !fs.existsSync(equipesPath)) {
    const guildesData = JSON.parse(fs.readFileSync(guildesPath));
    fs.writeFileSync(equipesPath, JSON.stringify(guildesData, null, 2));
    console.log("✅ Migration des guildes vers equipes effectuée");
  }
}

// Fonction pour obtenir les données d'équipes (avec rétrocompatibilité)
function getEquipesData() {
  // Migrer d'abord si nécessaire
  migrerGuildesVersEquipes();
  
  if (fs.existsSync(equipesPath)) {
    return JSON.parse(fs.readFileSync(equipesPath));
  } else if (fs.existsSync(guildesPath)) {
    return JSON.parse(fs.readFileSync(guildesPath));
  } else {
    fs.writeFileSync(equipesPath, JSON.stringify({}, null, 2));
    return {};
  }
}

module.exports = {
  name: "annoncer",
  category: "UNIROLIST",
  description: "Envoie une annonce à tous les membres de l'équipe", // Description mise à jour
  allowPrivate: false,

  async execute(riza, m, args) {
    const sender = m.sender;
    const chat = m.chat;

    const groupMetadata = await riza.groupMetadata(chat);
    const admins = groupMetadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
    const isAdmin = admins.some(p => p.id === sender);

    const equipes = getEquipesData(); // Utilise la fonction de rétrocompatibilité
    const equipe = Object.values(equipes).find(e => e.membres.includes(sender)); // Renommé de guilde à equipe

    if (!equipe) {
      return riza.sendMessage(chat, {
        text: "❌ Tu ne fais partie d'aucune équipe.", // Message mis à jour
      }, { quoted: m });
    }

    const estChef = equipe.chef === sender; // Renommé de guilde à equipe

    if (!isAdmin && !estChef) {
      return riza.sendMessage(chat, {
        text: "❌ Seul le chef d'équipe ou un admin peut envoyer une annonce.", // Message mis à jour
      }, { quoted: m });
    }

    const annonce = args.join(" ");
    if (!annonce) {
      return riza.sendMessage(chat, {
        text: "❌ Écris le message de l'annonce après la commande.",
      }, { quoted: m });
    }

    const mentions = equipe.membres; // Renommé de guilde à equipe

    const texte = `📣 *Annonce de l'Équipe : ${equipe.nom}*\n━━━━━━━━━━━\n👑 Chef : @${equipe.chef.split("@")[0]}\n📨 Envoyée par : @${sender.split("@")[0]}\n\n🗣️ *Message :*\n${annonce}\n━━━━━━━━━━━━`;

    await riza.sendMessage(chat, {
      text: texte,
      mentions
    }, { quoted: m });
  }
};