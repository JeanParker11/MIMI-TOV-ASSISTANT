module.exports = {
  name: "adddefaite",
  category: "UNIROLIST",
  description: "Ajoute 1 défaite à un joueur",
  onlyAdmin: true,

  async execute(riza, m) {
    const target = m.mentionedJid?.[0] ||
                   m.message?.extendedTextMessage?.contextInfo?.participant;

    if (!target) {
      return riza.sendMessage(m.chat, {
        text: "❌ Mentionne ou répond à un joueur pour lui ajouter une défaite."
      }, { quoted: m });
    }

    const fs = require("fs");
    const path = require("path");
    const palmaresPath = path.join(__dirname, "../data/palmares.json");

    const palmares = fs.existsSync(palmaresPath)
      ? JSON.parse(fs.readFileSync(palmaresPath))
      : {};

    if (!palmares[target]) {
      palmares[target] = { victoires: 0, defaites: 0, nuls: 0 };
    }

    palmares[target].defaites += 1;
    fs.writeFileSync(palmaresPath, JSON.stringify(palmares, null, 2));

    await riza.sendMessage(m.chat, {
      text: `⚠️ 1 défaite ajoutée à @${target.split("@")[0]}`,
      mentions: [target]
    }, { quoted: m });
  }
};