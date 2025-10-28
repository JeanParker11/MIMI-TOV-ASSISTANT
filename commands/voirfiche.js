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
    console.log("[VOIRFICHE] Migration des fiches vers la nouvelle structure effectuée.");
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

function getJidFromMention(mentionedJid) {
  if (!mentionedJid || !Array.isArray(mentionedJid)) return null;
  
  // Retourne le premier JID mentionné qui n'est pas le bot
  for (const jid of mentionedJid) {
    if (jid && !jid.includes('status')) {
      return jid;
    }
  }
  return null;
}

module.exports = {
  name: "voirfiche",
  category: "UNIROLIST",
  description: "Affiche la fiche d'un joueur (Admin seulement) - Répondre/Mentionner",
  onlyAdmin: true,
  allowPrivate: true,

  async execute(riza, m, args) {
    const fiches = loadFiches();
    
    if (Object.keys(fiches).length === 0) {
      return riza.sendMessage(m.chat, { 
        text: "❌ Aucune fiche enregistrée dans la base de données." 
      }, { quoted: m });
    }

    let targetJid = null;

    // 1. Vérification si réponse à un message
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    if (contextInfo?.participant) {
      targetJid = contextInfo.participant;
    }

    // 2. Vérification des mentions
    if (!targetJid && m.mentionedJid && m.mentionedJid.length > 0) {
      const mentionedJid = getJidFromMention(m.mentionedJid);
      if (mentionedJid && fiches[mentionedJid]) {
        targetJid = mentionedJid;
      }
    }

    // 3. Si aucune cible trouvée, demander de répondre ou mentionner
    if (!targetJid) {
      return riza.sendMessage(m.chat, { 
        text: `🔍 *VOIR FICHE - MODE ADMIN*

Pour voir la fiche d'un joueur :
• 📩 *Répondre* à un message du joueur avec !voirfiche
• 👤 *Mentionner* le joueur : !voirfiche @joueur

Exemples :
- Répondre à un message de DarkKnight avec "!voirfiche"
- Écrire "!voirfiche @DarkKnight"` 
      }, { quoted: m });
    }

    // Vérifier si le joueur cible a une fiche
    if (!fiches[targetJid]) {
      return riza.sendMessage(m.chat, { 
        text: "❌ Ce joueur n'a pas de fiche enregistrée." 
      }, { quoted: m });
    }

    // Afficher la fiche de la cible trouvée
    const fiche = fiches[targetJid];

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
══════════════════
- 1️⃣: ${corps[0] || "(vide)"}
- 2️⃣: ${corps[1] || "(vide)"}
- 3️⃣: ${corps[2] || "(vide)"}

*Inventaire de sorts*
══════════════════
- 1️⃣: ${sorts[0] || "(vide)"}
- 2️⃣: ${sorts[1] || "(vide)"}
- 3️⃣: ${sorts[2] || "(vide)"}

*Cartes de personnages*
══════════════════
- 1️⃣: ${cartes[0] || "(vide)"}
- 2️⃣: ${cartes[1] || "(vide)"}
- 3️⃣: ${cartes[2] || "(vide)"}

𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗾𝘂𝗲𝘀
══════════════════
👊🏼• 𝗙𝗼𝗿𝗰𝗲 : ${stats.force || "?"}
🧠• 𝗘𝘀𝗽𝗿𝗶𝘁 : ${stats.esprit || "?"}
🌀• 𝗣𝗼𝘂𝘃𝗼𝗶𝗿 : ${stats.pouvoir || "?"}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
Fiche validée par : *${validéePar}*

[🔍 Commande admin - Tales of Valoria 🍃]`;

    return riza.sendMessage(m.chat, { text }, { quoted: m });
  }
};