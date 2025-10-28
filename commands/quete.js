const fs = require('fs');
const path = require('path');

const QUETE_PATH = path.join(__dirname, '../data/quetes.json');
if (!fs.existsSync(QUETE_PATH)) fs.writeFileSync(QUETE_PATH, '[]');

// 🔧 Groupe par défaut où les quêtes seront annoncées :
const GROUPE_QUETE_JID = global.QUETE_GROUP_JID; // ← à modifier

function chargerQuetes(riza) {
  let quetes = [];
  try {
    quetes = JSON.parse(fs.readFileSync(QUETE_PATH));
  } catch (err) {
    console.error("❌ Erreur lecture quetes.json :", err);
    quetes = [];
  }

  const now = Date.now();

  for (const q of quetes) {
    const delay = q.time - now;
    if (delay <= 0) continue;

    setTimeout(async () => {
      try {
        const metadata = await riza.groupMetadata(GROUPE_QUETE_JID);
        const participants = metadata.participants.map(p => p.id);

        await riza.sendMessage(GROUPE_QUETE_JID, {
          text: `🧙 *QUÊTE DU JOUR !*\n\n${q.message}`,
          mentions: participants
        });

        // Supprimer la quête après exécution
        const restantes = quetes.filter(qq =>
          qq.time !== q.time || qq.message !== q.message
        );
        fs.writeFileSync(QUETE_PATH, JSON.stringify(restantes, null, 2));
      } catch (err) {
        console.error("❌ Erreur envoi de la quête :", err);
      }
    }, delay);
  }
}

module.exports = {
  name: "quete",
  category: "UNIROLIST",
  desc: "⏳ Programme une quête pour le groupe RP",
  usage: ".quête 21:00 | message de la quête",
  onlyAdmin: true,
  allowPrivate: true,
  chargerQuetes,

  async execute(riza, m, args) {
    const texte = args.join(" ");
    if (!texte.includes("|")) {
      return riza.sendMessage(m.chat, {
        text: "❌ Format invalide.\n📌 Exemple : `.quête 20:00 | Invasion des orcs au nord !`"
      }, { quoted: m });
    }

    const [heurePart, messageQuete] = texte.split("|").map(x => x.trim());
    const [hh, mm] = heurePart.split(":").map(Number);

    if (isNaN(hh) || isNaN(mm) || hh > 23 || mm > 59) {
      return riza.sendMessage(m.chat, {
        text: "⛔ Heure invalide ! Format attendu : `HH:mm`"
      }, { quoted: m });
    }

    const now = new Date();
    const target = new Date();
    target.setHours(hh);
    target.setMinutes(mm);
    target.setSeconds(0);
    target.setMilliseconds(0);

    if (target < now) {
      return riza.sendMessage(m.chat, {
        text: "🚫 Tu ne peux pas programmer une quête dans le passé."
      }, { quoted: m });
    }

    const quete = {
      time: target.getTime(),
      message: messageQuete
    };

    let quetes = [];
    try {
      quetes = JSON.parse(fs.readFileSync(QUETE_PATH));
    } catch (err) {
      quetes = [];
    }

    quetes.push(quete);
    fs.writeFileSync(QUETE_PATH, JSON.stringify(quetes, null, 2));

    const heureFormat = `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;

    await riza.sendMessage(m.chat, {
      text: `✅ *Quête enregistrée !*\n\n🕐 *Heure :* ${heureFormat}\n📌 *Groupe :* ${GROUPE_QUETE_JID}\n💬 *Quête :* ${messageQuete}`
    }, { quoted: m });

    chargerQuetes(riza); // Activation
  }
};