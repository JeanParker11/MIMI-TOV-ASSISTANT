const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");

if (!fs.existsSync(guildesPath)) fs.writeFileSync(guildesPath, JSON.stringify({}, null, 2));

module.exports = {
  name: "guilde",
  category: "UNIROLIST",
  description: "Affiche les informations de ta guilde (ou celle d’un autre joueur)",

  async execute(riza, m, args) {
    const guildes = JSON.parse(fs.readFileSync(guildesPath));

    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const mention =
      contextInfo?.participant ||
      contextInfo?.remoteJid ||
      (m.mentionedJid && m.mentionedJid[0]);

    const user = mention || m.sender;

    const guilde = Object.values(guildes).find(g => g.membres.includes(user));

    if (!guilde) {
      return riza.sendMessage(m.chat, {
        text: mention
          ? `❌ Ce joueur ne fait partie d’aucune guilde.`
          : `❌ Tu ne fais partie d’aucune guilde.`,
      }, { quoted: m });
    }

    const estChef = guilde.chef === user;

    const texte = `🏰 *GUILDE : ${guilde.nom}*
═══════════════
📜 *Description* : ${guilde.description || "Non fournie"}
🪧 *Devise/Emblème* : ${guilde.embleme || "Aucun"}
👑 *Chef de guilde* : @${guilde.chef.split("@")[0]}
👥 *Membres* (${guilde.membres.length}) :
${guilde.membres.map(m => `• @${m.split("@")[0]}`).join("\n")}

${estChef ? "🛡️ Tu es le chef de cette guilde." : ""}
═══════════════`;

    await riza.sendMessage(m.chat, {
      text: texte,
      mentions: guilde.membres,
    }, { quoted: m });
  }
};