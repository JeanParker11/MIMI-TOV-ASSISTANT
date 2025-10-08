const fs = require("fs");
const path = require("path");

const sudoFile = path.join(__dirname, "..", "data", "sudo.json");

const loadSudoList = () => {
  try {
    return JSON.parse(fs.readFileSync(sudoFile, "utf8"));
  } catch {
    return [];
  }
};

// Nettoie un numéro : supprime caractères invisibles, espaces, etc.
const cleanNumber = (num) => {
  return num
    .normalize("NFKD")
    .replace(/[\u2066-\u2069]/g, "")
    .replace(/\s+/g, "")
    .replace(/\D/g, "");
};

module.exports = {
  name: "sudolist",
  description: "Affiche la liste des utilisateurs sudo",
  category: "Owner",

  // Permissions
  allowedForAll: false,
  onlyOwner: true,
  onlySudo: false,
  onlyAdmin: false,

  execute: async (riza, m) => {
    const sudoList = loadSudoList();

    if (sudoList.length === 0) {
      return riza.sendMessage(m.chat, {
        text: "📭 Aucun utilisateur sudo enregistré.",
      }, { quoted: m });
    }

    const cleanedList = sudoList.map(cleanNumber);
    const text = `🛡️ *Liste des utilisateurs sudo :*\n\n` +
      cleanedList.map((num, i) => `${i + 1}. @${num}`).join("\n");
    const mentions = cleanedList.map((num) => `${num}@s.whatsapp.net`);

    await riza.sendMessage(m.chat, {
      text,
      mentions,
    }, { quoted: m });
  }
};