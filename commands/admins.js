module.exports = {
  name: "admins",
  keywords: [".admins", "!admins", "$admins"],
  description: "Liste les administrateurs du groupe",
  category: "Général",
  onlyAdmin: false,
  botAdmin: false,
  group: true,

  execute: async (conn, m, args) => {
    try {
      const metadata = await conn.groupMetadata(m.chat);
      const admins = metadata.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");

      if (admins.length === 0) {
        return await conn.sendMessage(m.chat, { text: "❌ Aucun admin trouvé." }, { quoted: m });
      }

      let msg = `👑 *Liste des admins (${admins.length})*\n`;
      for (const admin of admins) {
        const jid = admin.id;
        const userId = jid.split("@")[0];
        msg += `• @${userId}\n`;
      }

      await conn.sendMessage(m.chat, { text: msg, mentions: admins.map(a => a.id) }, { quoted: m });
    } catch (e) {
      await conn.sendMessage(m.chat, { text: `❌ Impossible d'obtenir la liste des admins.` }, { quoted: m });
    }
  }
};