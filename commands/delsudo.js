const fs = require("fs");
const path = require("path");

const sudoFile = path.join(__dirname, "..", "data", "sudo.json");

const saveSudoList = (list) => {
  fs.writeFileSync(sudoFile, JSON.stringify(list, null, 2));
};

const loadSudoList = () => {
  try {
    return JSON.parse(fs.readFileSync(sudoFile));
  } catch {
    return [];
  }
};

module.exports = {
  name: "delsudo",
  description: "Retire un utilisateur de la liste sudo",
  category: "Owner",
  onlyOwner: true,        // <== Commande réservée au propriétaire
  allowedForAll: false,   // <== Par défaut false, mais optionnel

  execute: async (riza, m, args) => {
    // Récupération de la cible (réponse ou mention)
    const auteurRep = m.message?.extendedTextMessage?.contextInfo?.participant;

    const cible =
      auteurRep ||
      (args[0]?.includes("@") && `${args[0].replace("@", "")}@s.whatsapp.net`);

    if (!cible) {
      return riza.sendMessage(m.chat, {
        text: "❌ Veuillez répondre à un utilisateur ou le mentionner",
      }, { quoted: m });
    }

    const numero = cible.split("@")[0];
    const sudoList = loadSudoList();

    if (!sudoList.includes(numero)) {
      return riza.sendMessage(m.chat, {
        text: "ℹ️ Cet utilisateur n'est pas dans la liste sudo.",
      }, { quoted: m });
    }

    const nouvelleListe = sudoList.filter((n) => n !== numero);
    saveSudoList(nouvelleListe);

    await riza.sendMessage(m.chat, {
      text: `🗑️ L'utilisateur @${numero} a été retiré de la liste sudo.`,
      mentions: [cible],
    }, { quoted: m });
  }
};