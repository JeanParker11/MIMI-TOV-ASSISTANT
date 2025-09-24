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
  name: "setsudo",
  description: "Ajoute un utilisateur à la liste sudo",
  category: "Owner",

  // Gestion des accès
  allowedForAll: false,
  onlyOwner: true,
  onlySudo: false,
  onlyAdmin: false,

  execute: async (riza, m, args) => {
    const auteurRep =
      m.message?.extendedTextMessage?.contextInfo?.participant;

    const cible =
      auteurRep ||
      (args[0]?.includes("@") && `${args[0].replace("@", "")}@s.whatsapp.net`);

    if (!cible) {
      return riza.sendMessage(m.chat, {
        text: "❌ Veuillez répondre à un utilisateur ou le mentionner.",
      }, { quoted: m });
    }

    const numero = cible.split("@")[0];
    const sudoList = loadSudoList();

    if (sudoList.includes(numero)) {
      return riza.sendMessage(m.chat, {
        text: "ℹ️ Cet utilisateur est déjà sudo.",
      }, { quoted: m });
    }

    sudoList.push(numero);
    saveSudoList(sudoList);

    await riza.sendMessage(m.chat, {
      text: `✅ L'utilisateur @${numero} a été ajouté à la liste sudo.`,
      mentions: [cible],
    }, { quoted: m });
  }
};