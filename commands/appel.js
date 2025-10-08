module.exports = {
  name: "appel",
  category: "Général",
  onlyAdmin: true,
  description: "Mentionne tous les membres du groupe avec un format élégant et numéroté",
  usage: ".appel [message]",
  keywords: [],

  async execute(riza, m, args) {
    if (!m.chat.endsWith("@g.us")) {
      return riza.sendMessage(m.chat, {
        text: "❌ Cette commande doit être utilisée dans un groupe.",
      }, { quoted: m });
    }

    const metadata = await riza.groupMetadata(m.chat);
    const groupName = metadata.subject || "Groupe";
    const members = metadata.participants;

    if (!members.length) {
      return riza.sendMessage(m.chat, {
        text: "❌ Aucun membre trouvé dans ce groupe.",
      }, { quoted: m });
    }

    const mentions = members.map(p => p.id);
    const tags = members.map((p, i) => `${i + 1}. @${p.id.split("@")[0]}`).join("\n");

    const botName = global.botname || "BOT";
    const botVersion = global.botversion || "";
    const userText = args.join(" ").trim();

    const header = `╔═━\n     ${groupName}\n╚═━`;

    const annonce = userText
      ? `\n\n📢 *Annonce :*\n${userText}`
      : "";

    const memberList = `\n\n👥 *Membres tagués :*\n${tags}`;

    const footer = `\n\n❖════════════════❖\n🤖${botName} ${botVersion}`;

    const finalMessage = `${header}${annonce}${memberList}${footer}`;

    await riza.sendMessage(m.chat, {
      text: finalMessage,
      mentions
    }, { quoted: m });
  }
};