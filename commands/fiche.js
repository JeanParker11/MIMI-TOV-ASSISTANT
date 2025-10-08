const fs = require('fs');
const path = require('path');
const fichesFile = path.join(__dirname, '../data/fiches.json');

if (!fs.existsSync(fichesFile)) {
  fs.writeFileSync(fichesFile, JSON.stringify({}, null, 2));
}

function loadFiches() {
  if (!fs.existsSync(fichesFile)) return {};
  const data = JSON.parse(fs.readFileSync(fichesFile));
  return migrerAnciennesFiches(data);
}

function migrerAnciennesFiches(fiches) {
  let miseAJour = false;
  
  for (const [jid, fiche] of Object.entries(fiches)) {
    // Si la fiche n'a pas de cartes (ancienne structure)
    if (fiche && !fiche.cartes) {
      fiches[jid] = {
        ...fiche,
        cartes: ["(vide)", "(vide)", "(vide)"]
      };
      miseAJour = true;
    }
  }
  
  if (miseAJour) {
    fs.writeFileSync(fichesFile, JSON.stringify(fiches, null, 2));
    console.log("[FICHES] Migration des fiches vers la nouvelle structure effectuée.");
  }
  
  return fiches;
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
  // Si c'est déjà un numéro formaté, on le retourne tel quel
  if (jid && jid.startsWith('+')) {
    return jid;
  }
  
  // Si c'est un JID WhatsApp, on extrait le numéro sans le "+" automatique
  const number = jid.replace(/[@].*/, ''); // Enlève @s.whatsapp.net ou @lid
  return number; // Retourne juste le numéro sans le "+"
}

module.exports = {
  name: "fiche",
  category: "UNIROLIST",
  description: "Affiche la fiche d'un joueur",
  allowedForAll: true,

  async execute(riza, m, args) {
    const fiches = loadFiches();
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

    // Correction : seulement 3 emplacements pour corps, sorts et cartes
    const corps = fiche.corps || ["(vide)", "(vide)", "(vide)"];
    const sorts = fiche.sorts || ["(vide)", "(vide)", "(vide)"];
    const cartes = fiche.cartes || ["(vide)", "(vide)", "(vide)"];
    const stats = fiche.stats || { force: "?", esprit: "?", pouvoir: "?" };
    const validéePar = fiche.validéePar || "(inconnu)";
    
    // Formatage correct du numéro sans ajout automatique de "+"
    let numero = "(non fourni)";
    if (fiche.tel && fiche.tel !== "(non fourni)") {
      numero = formatPhoneNumber(fiche.tel);
    }

    const text = `𝐓𝐎𝐕 : 𝐅𝐈𝐂𝐇𝐄 𝐃'𝐈𝐍𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍 🍃➕
═════════════════════
• Pseudonyme : ${fiche.pseudo || "(inconnu)"}
• Numéro de Téléphone : ${numero}
• Faction : ${fiche.faction || "(inconnue)"}

*Inventaire de corps*
════════════════
- 1️⃣: ${corps[0] || "(vide)"}
- 2️⃣: ${corps[1] || "(vide)"}
- 3️⃣: ${corps[2] || "(vide)"}

*Inventaire de sorts*
═════════════════
- 1️⃣: ${sorts[0] || "(vide)"}
- 2️⃣: ${sorts[1] || "(vide)"}
- 3️⃣: ${sorts[2] || "(vide)"}

*Cartes de personnages*
═════════════════
- 1️⃣: ${cartes[0] || "(vide)"}
- 2️⃣: ${cartes[1] || "(vide)"}
- 3️⃣: ${cartes[2] || "(vide)"}

𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗾𝘂𝗲𝘀
═════════════════
👊🏼• 𝗙𝗼𝗿𝗰𝗲 : ${stats.force || "?"}
🧠• 𝗘𝘀𝗽𝗿𝗶𝘁 : ${stats.esprit || "?"}
🌀• 𝗣𝗼𝘂𝘃𝗼𝗶𝗿 : ${stats.pouvoir || "?"}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
Fiche validée par : *${validéePar}*

𝗧𝗮𝗹𝗲𝘀 𝗼𝗳 𝗩𝗮𝗹𝗼𝗿𝗶𝗮🍃`;

    return riza.sendMessage(m.chat, { text }, { quoted: m });
  }
};