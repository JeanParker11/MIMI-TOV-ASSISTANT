// commands/quêtes.js
const fs = require("fs");
const path = require("path");
const QUETES_PATH = path.join(__dirname, "../data/quetes.json");

if (!fs.existsSync(QUETES_PATH)) fs.writeFileSync(QUETES_PATH, "[]");

module.exports = {
  name: "voirquete",
  category: "UNIROLIST",
  desc: "📜 Voir les quêtes programmées",
  onlyAdmin: true,
  allowPrivate: true,
  async execute(conn, m) {
    const quetes = JSON.parse(fs.readFileSync(QUETES_PATH, "utf-8"));

    if (!quetes.length) {
      return conn.sendMessage(m.chat, {
        text: "📭 Aucune quête programmée pour le moment."
      }, { quoted: m });
    }

    let texte = `📜 *Quêtes programmées :*\n\n`;
    for (const [i, q] of quetes.entries()) {
      const date = new Date(q.time);
      texte += `*${i + 1}.* 🕐 ${date.toLocaleString("fr-FR")} - 💬 ${q.message.slice(0, 50)}\n`;
    }

    await conn.sendMessage(m.chat, { text: texte.trim() }, { quoted: m });
  }
};