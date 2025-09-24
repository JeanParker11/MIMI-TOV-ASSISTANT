module.exports = {
  name: "rejoindre",
  alias: ["join", "joindre"],
  category: "Owner",
  desc: "Permet au bot de rejoindre un groupe via un lien d'invitation.",
  usage: ".rejoindre <lien du groupe>",
  onlyOwner: true, // ou mets onlySudo: true si tu veux autoriser les sudo aussi

  async execute(riza, m, args) {
    const reply = (text) => riza.sendMessage(m.chat, { text }, { quoted: m });

    if (!args[0]) return reply("❌ Donne un lien d'invitation WhatsApp.");

    const inviteRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/;
    const match = args[0].match(inviteRegex);

    if (!match) return reply("❌ Lien invalide. Exemple attendu : https://chat.whatsapp.com/XXXXXXXXXXXXXX");

    const inviteCode = match[1];

    try {
      await riza.groupAcceptInvite(inviteCode);
      reply("✅ J'ai rejoint le groupe avec succès !");
    } catch (err) {
      console.error("❌ Erreur lors de la tentative de rejoindre le groupe :", err);
      reply("❌ Impossible de rejoindre le groupe. Lien invalide ou erreur.");
    }
  }
};