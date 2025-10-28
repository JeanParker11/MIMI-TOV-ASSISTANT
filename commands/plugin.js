const fs = require("fs");
const path = require("path");

module.exports = {
  name: "plugin",
  category: "Owner",
  onlyOwner: true,
  desc: "Gérer les plugins dynamiquement (add, remove, show)",
  async execute(riza, m, args) {
    const subcmd = args[0]?.toLowerCase();
    const pluginName = args[1]?.replace(/[^a-zA-Z0-9_\-]/g, ""); // sécurise le nom

    if (!subcmd || !["add", "remove", "show"].includes(subcmd)) {
      return riza.sendMessage(m.chat, {
        text:
          "📦 *Utilisation* :\n\n" +
          "`.plugin add <nom>` (répond à un fichier .js ou code)\n" +
          "`.plugin remove <nom>`\n" +
          "`.plugin show <nom>`",
      }, { quoted: m });
    }

    const pluginPath = path.join(__dirname, `${pluginName}.js`);

    // 📥 AJOUT PLUGIN
    if (subcmd === "add") {
      let code = "";

      if (m.quoted?.message?.documentMessage?.mimetype === "text/javascript") {
        try {
          const buffer = await riza.downloadMediaMessage(m.quoted);
          code = buffer.toString("utf-8");
        } catch {
          return riza.sendMessage(m.chat, {
            text: "❌ Erreur de téléchargement du fichier.",
          }, { quoted: m });
        }
      } else {
        code = args.slice(2).join(" ");
        if (!code.includes("module.exports")) {
          return riza.sendMessage(m.chat, {
            text: "❌ Envoie un code valide contenant `module.exports`, ou répond à un fichier `.js`.",
          }, { quoted: m });
        }
      }

      try {
        fs.writeFileSync(pluginPath, code);
        return riza.sendMessage(m.chat, {
          text: `✅ Plugin *${pluginName}.js* ajouté avec succès.`,
        }, { quoted: m });
      } catch (e) {
        return riza.sendMessage(m.chat, {
          text: `❌ Erreur d’écriture :\n${e.message}`,
        }, { quoted: m });
      }
    }

    // 🗑️ SUPPRESSION PLUGIN
    if (subcmd === "remove") {
      if (!fs.existsSync(pluginPath)) {
        return riza.sendMessage(m.chat, {
          text: `❌ Plugin *${pluginName}.js* introuvable.`,
        }, { quoted: m });
      }

      try {
        fs.unlinkSync(pluginPath);
        return riza.sendMessage(m.chat, {
          text: `🗑️ Plugin *${pluginName}.js* supprimé avec succès.`,
        }, { quoted: m });
      } catch (e) {
        return riza.sendMessage(m.chat, {
          text: `❌ Erreur suppression :\n${e.message}`,
        }, { quoted: m });
      }
    }

    // 📄 AFFICHAGE PLUGIN
    if (subcmd === "show") {
      if (!fs.existsSync(pluginPath)) {
        return riza.sendMessage(m.chat, {
          text: `❌ Plugin *${pluginName}.js* introuvable.`,
        }, { quoted: m });
      }

      try {
        const content = fs.readFileSync(pluginPath, "utf-8");

        // Envoie en document si trop long (évite crash)
        if (content.length > 4000) {
          return riza.sendMessage(m.chat, {
            document: Buffer.from(content),
            fileName: `${pluginName}.js`,
            mimetype: "text/javascript",
            caption: `📄 Plugin *${pluginName}.js*`,
          }, { quoted: m });
        }

        return riza.sendMessage(m.chat, {
          text: `📄 *${pluginName}.js* :\n\n\`\`\`js\n${content}\n\`\`\``,
        }, { quoted: m });
      } catch (e) {
        return riza.sendMessage(m.chat, {
          text: `❌ Erreur lecture :\n${e.message}`,
        }, { quoted: m });
      }
    }
  },
};