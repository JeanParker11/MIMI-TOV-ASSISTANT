module.exports = {
  name: "invite",
  keywords: [".invite"],
  description: "Génère le lien d’invitation du groupe",
  category: "Général",
  onlyAdmin: true,
  group: true,
  botAdmin: true, // <-- ICI : le bot doit être admin

  execute: async (conn, m) => {
    const code = await conn.groupInviteCode(m.chat);
    const link = `https://chat.whatsapp.com/${code}`;
    await conn.sendMessage(m.chat, { text: `🔗 Lien d'invitation : ${link}` }, { quoted: m });
  }
};