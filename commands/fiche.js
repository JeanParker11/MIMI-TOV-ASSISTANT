const fs = require('fs');
const path = require('path');
const fichesFile = path.join(__dirname, '../data/fiches.json');

if (!fs.existsSync(fichesFile)) {
  fs.writeFileSync(fichesFile, JSON.stringify({}, null, 2));
}

function findFicheMatch(fiches, partialName) {
  const lowerPartial = partialName.toLowerCase();
  for (const key of Object.keys(fiches)) {
    if ((fiches[key].pseudo || "").toLowerCase().includes(lowerPartial)) {
      return key;
    }
  }
  return null;
}

function formatPhoneNumber(jid) {
  const number = jid.replace(/[@].*/, ''); // Enlève @s.whatsapp.net ou @lid
  return `+${number}`;
}

module.exports = {
  name: "fiche",
  category: "UNIROLIST",
  description: "Affiche la fiche d’un joueur",
  allowedForAll: true,

  async execute(riza, m, args) {
    const fiches = JSON.parse(fs.readFileSync(fichesFile));
    let fiche = null;

    if (args[0]) {
      const partialName = args.join(" ").toLowerCase();
      const matchedKey = findFicheMatch(fiches, partialName);
      if (!matchedKey) {
        return riza.sendMessage(m.chat, { text: `❌ Aucune fiche trouvée pour "${args.join(" ")}"` }, { quoted: m });
      }
      fiche = fiches[matchedKey];
    } else {
      const sender = m.sender;
      const [info] = await riza.onWhatsApp(sender);
      const trueJid = info?.jid || sender;
      fiche = fiches[trueJid];

      if (!fiche) {
        return riza.sendMessage(m.chat, {
          text: "❌ Aucune fiche trouvée pour vous.\n\nDemandez à un admin de vous enregistrer avec la commande `!enregistrer`."
        }, { quoted: m });
      }
    }

    const corps = fiche.corps || ["(vide)", "(vide)", "(vide)", "(vide)"];
    const sorts = fiche.sorts || ["(vide)", "(vide)", "(vide)", "(vide)"];
    const stats = fiche.stats || { force: "?", esprit: "?", pouvoir: "?" };
    const validéePar = fiche.validéePar || "(inconnu)";
    const numero = formatPhoneNumber(fiche.tel || "");

    const text = `𝐓𝐎𝐕 : 𝐅𝐈𝐂𝐇𝐄 𝐃'𝐈𝐍𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍 🍃➕
════════════════════════
• Pseudonyme : ${fiche.pseudo || "(inconnu)"}
• Numéro de Téléphone : ${numero || "(inconnu)"}
• Faction : ${fiche.faction || "(inconnue)"}

𝗜𝗻𝘃𝗲𝗻𝘁𝗮𝗶𝗿𝗲 𝗱𝗲 𝗰𝗼𝗿𝗽𝘀
═
- 1️⃣: ${corps[0]}
- 2️⃣: ${corps[1]}
- 3️⃣: ${corps[2]}
- 4️⃣: ${corps[3]}

𝗜𝗻𝘃𝗲𝗻𝘁𝗮𝗶𝗿𝗲 𝗱𝗲 𝘀𝗼𝗿𝘁𝘀
═
- 1️⃣: ${sorts[0]}
- 2️⃣: ${sorts[1]}
- 3️⃣: ${sorts[2]}
- 4️⃣: ${sorts[3]}

𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗾𝘂𝗲𝘀
═
👊🏼• 𝗙𝗼𝗿𝗰𝗲 : ${stats.force}
🧠• 𝗘𝘀𝗽𝗿𝗶𝘁 : ${stats.esprit}
🌀• 𝗣𝗼𝘂𝘃𝗼𝗶𝗿 : ${stats.pouvoir}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
Fiche validée par : *${validéePar}*

𝗧𝗮𝗹𝗲𝘀 𝗼𝗳 𝗩𝗮𝗹𝗼𝗿𝗶𝗮🍃`;

    return riza.sendMessage(m.chat, { text }, { quoted: m });
  }
};