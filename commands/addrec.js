const fs = require("fs");
const path = require("path");

const rewardsPath = path.join(__dirname, "..", "data", "recompense.json");

module.exports = {
  name: "addreward",
  description: "Ajouter une récompense au fichier recompense.json",
  category: "Owner",
  onlyOwner: true,
  usage: ".addreward <service>|<email>|<password>",
  async execute(riza, m, args) {
    if (args.length === 0) {
      return riza.sendMessage(m.chat, { text: `❌ Usage : ${this.usage}` }, { quoted: m });
    }

    const input = args.join(" ").split("|");
    if (input.length < 3) {
      return riza.sendMessage(m.chat, { text: `❌ Format invalide. Utilise :\n${this.usage}` }, { quoted: m });
    }

    const [service, email, password] = input.map(s => s.trim());

    if (!service || !email || !password) {
      return riza.sendMessage(m.chat, { text: `❌ Tous les champs doivent être remplis.` }, { quoted: m });
    }

    let rewards = [];
    if (fs.existsSync(rewardsPath)) {
      try {
        rewards = JSON.parse(fs.readFileSync(rewardsPath));
        if (!Array.isArray(rewards)) rewards = [];
      } catch {
        rewards = [];
      }
    }

    rewards.push({ service, email, password });

    fs.writeFileSync(rewardsPath, JSON.stringify(rewards, null, 2));

    await riza.sendMessage(m.chat, { text: `✅ Récompense ajoutée pour le service ${service}.` }, { quoted: m });
  },
};