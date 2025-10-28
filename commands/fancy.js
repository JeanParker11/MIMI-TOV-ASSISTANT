const { fancyStyles } = require("../lib/fancyText");

module.exports = {
  name: "fancy",
  category: "Général",
  description: "Transforme un texte avec un style fancy (ex: gothic, bold)",
  usage: "<style> <texte>",
  allowedForAll: true,

  execute: async (riza, m, args) => {
    const prefix = global.prefix || ".";

    // Fonction de transformation
    const transformText = (txt, map) => [...txt].map(c => map[c] || c).join("");

    // Si aucun argument → affiche tous les styles avec aperçu
    if (args.length === 0) {
      const previewWord = "parky";
      const stylesList = Object.entries(fancyStyles)
        .map(([name, styleMap]) => {
          const preview = transformText(previewWord, styleMap);
          return `⬡ *${name}* : ${preview}`;
        })
        .join("\n");

      const message = `🌟 *Styles fancy disponibles* :

${stylesList}

📌 *Utilisation* : \`${prefix}fancy <style> <texte>\`

📍 *Exemple* : \`${prefix}fancy bold bonjour tout le monde\``;

      return await riza.sendMessage(m.chat, { text: message }, { quoted: m });
    }

    // Si style mais pas de texte
    if (args.length < 2) {
      return await riza.sendMessage(
        m.chat,
        {
          text: `❌ Veuillez fournir à la fois un *style* et un *texte*.\n\n📌 *Exemple* : \`${prefix}fancy gothic salut\``
        },
        { quoted: m }
      );
    }

    const styleName = args.shift().toLowerCase();
    const text = args.join(" ");

    if (!fancyStyles[styleName]) {
      const stylesList = Object.entries(fancyStyles)
        .map(([name, styleMap]) => {
          const preview = transformText("parky", styleMap);
          return `⬡ *${name}* : ${preview}`;
        })
        .join("\n");

      return await riza.sendMessage(
        m.chat,
        {
          text: `❌ *Style inconnu* : \`${styleName}\`\n\n✅ *Styles disponibles* :\n${stylesList}`
        },
        { quoted: m }
      );
    }

    const styleMap = fancyStyles[styleName];
    const transformed = transformText(text, styleMap);

    await riza.sendMessage(m.chat, { text: transformed }, { quoted: m });
  }
};