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

    // 5 emplacements pour corps selon le nouveau modèle
    const corps = fiche.corps || ["Rien", "Haut usé", "Rien", "Rien", "Pantalon usé"];
    const sorts = fiche.sorts || ["(vide)", "(vide)", "(vide)"];
    const cartes = fiche.cartes || ["(vide)", "(vide)", "(vide)"];
    const stats = fiche.stats || { force: "?", esprit: "?", pouvoir: "?" };
    const statsMax = fiche.statsMax || { force: stats.force, esprit: stats.esprit, pouvoir: stats.pouvoir };
    
    // Calculer l'état de fatigue basé sur la puissance restante
    let etat = "En pleine forme";
    const forceActuelle = parseInt(stats.force) || 0;
    const forceMax = parseInt(statsMax.force) || forceActuelle;
    const pouvoirActuel = parseInt(stats.pouvoir) || 0;
    const pouvoirMax = parseInt(statsMax.pouvoir) || pouvoirActuel;
    
    // Moyenne de puissance (Force + Pouvoir) / 2
    const puissanceActuelle = forceActuelle + pouvoirActuel;
    const puissanceMax = forceMax + pouvoirMax;
    const pourcentagePuissance = puissanceMax > 0 ? (puissanceActuelle / puissanceMax) * 100 : 100;
    
    if (pourcentagePuissance > 70) {
      etat = "En pleine forme";
    } else if (pourcentagePuissance >= 30) {
      etat = "En état de se battre";
    } else if (pourcentagePuissance >= 20) {
      etat = "Fatigué";
    } else {
      etat = "Hors d'état de se battre";
    }
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
- 🎩 Tête: ${corps[0] || "Rien"}
- 👕 Torse: ${corps[1] || "Haut usé"}
- 🤚 Bras: ${corps[2] || "Rien"}
- ⚔️ Taille: ${corps[3] || "Rien"}
- 👖 Jambes: ${corps[4] || "Pantalon usé"}

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
👊🏼• 𝗙𝗼𝗿𝗰𝗲 : ${stats.force || "?"}/${statsMax.force || "?"}
🧠• 𝗘𝘀𝗽𝗿𝗶𝘁 : ${stats.esprit || "?"}/${statsMax.esprit || "?"}
🌀• 𝗣𝗼𝘂𝘃𝗼𝗶𝗿 : ${stats.pouvoir || "?"}/${statsMax.pouvoir || "?"}

💫 𝗘𝘁𝗮𝘁 : ${etat} (${Math.round(pourcentagePuissance)}%)

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
Fiche validée par : *${validéePar}*

𝗧𝗮𝗹𝗲𝘀 𝗼𝗳 𝗩𝗮𝗹𝗼𝗿𝗶𝗮🍃`;

    return riza.sendMessage(m.chat, { text }, { quoted: m });
  }
};