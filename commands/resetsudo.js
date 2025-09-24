const fs = require("fs");
const path = require("path");

const sudoFile = path.join(__dirname, "..", "data", "sudo.json");

const saveSudoList = (list) => {
  fs.writeFileSync(sudoFile, JSON.stringify(list, null, 2));
};

module.exports = {
  name: "resetsudo",
  description: "Réinitialise la liste des utilisateurs sudo",
  category: "Owner",

  // Permissions
  allowedForAll: false,
  onlyOwner: true,     // ✅ Seul le propriétaire peut réinitialiser
  onlySudo: false,
  onlyAdmin: false,

  execute: async (riza, m, args) => {
    saveSudoList([]);

    await riza.sendMessage(m.chat, {
      text: "🧹 La liste des sudo a été entièrement réinitialisée.",
    }, { quoted: m });
  }
};