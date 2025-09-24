// commands/delquête.js
const fs = require("fs");
const path = require("path");
const QUETES_PATH = path.join(__dirname, "../data/quetes.json");

module.exports = {
  name: "suppquete",
  category: "UNIROLIST",
  desc: " Supprimer une quête programmée",
  usage: ".delquête <numéro>",
  onlyAdmin: true,
  allowPrivate: true,

  async execute(conn, m, args) {
    const quetes = JSON.parse(fs.readFileSync(QUETES_PATH, "utf-8"));
    if (!quetes.length) {
      return conn.sendMessage(m.chat, {
        text: "❌ Aucune quête à supprimer."
      }, { quoted: m });
    }

    const index = parseInt(args[0]) - 1;
    if (isNaN(index) || index < 0 || index >= quetes.length) {
      return conn.sendMessage(m.chat, {
        text: "❌ Numéro de quête invalide.\nUtilise `.quêtes` pour voir la liste."
      }, { quoted: m });
    }

    const supprimée = quetes.splice(index, 1)[0];
    fs.writeFileSync(QUETES_PATH, JSON.stringify(quetes, null, 2));

    return conn.sendMessage(m.chat, {
      text: `✅ Quête supprimée :\n\n🕐 ${new Date(supprimée.time).toLocaleString("fr-FR")}\n💬 ${supprimée.message}`
    }, { quoted: m });
  }
};