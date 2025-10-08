const fs = require('fs');
const path = require('path');

const RAPPEL_PATH = path.join(__dirname, '../data/rappels.json');
if (!fs.existsSync(RAPPEL_PATH)) fs.writeFileSync(RAPPEL_PATH, '[]');

// ⏰ Chargement et activation des rappels
function chargerRappels(riza) {
  let rappels = [];
  try {
    rappels = JSON.parse(fs.readFileSync(RAPPEL_PATH));
  } catch (err) {
    console.error("❌ Erreur lecture rappels.json :", err);
    rappels = [];
  }

  const now = Date.now();

  for (const rappel of rappels) {
    const delay = rappel.time - now;
    if (delay <= 0) continue;

    setTimeout(async () => {
      try {
        const metadata = await riza.groupMetadata(rappel.chatId);
        const participants = metadata.participants.map(p => p.id);

        await riza.sendMessage(rappel.chatId, {
          text: `📢 *ÉVÉNEMENT PROGRAMMÉ !*\n\n${rappel.message}`,
          mentions: participants
        });

        // Supprimer le rappel envoyé
        const restants = rappels.filter(r =>
          r.time !== rappel.time ||
          r.chatId !== rappel.chatId ||
          r.message !== rappel.message
        );
        fs.writeFileSync(RAPPEL_PATH, JSON.stringify(restants, null, 2));
      } catch (err) {
        console.error("❌ Erreur envoi du rappel :", err);
      }
    }, delay);
  }
}

module.exports = {
  name: "rappel",
  category: "Général",
  desc: "⏰ Planifie un rappel dans un groupe où le bot est déjà.",
  usage: ".rappel 18:00 | 1203xxxxx@g.us | message",
  onlyAdmin: false,
  chargerRappels,

  async execute(riza, m, args) {
    const text = args.join(" ");
    if (!text.includes("|") || text.split("|").length < 3) {
      return riza.sendMessage(m.chat, {
        text: "❌ Format invalide.\n✅ Exemple : `.rappel 18:00 | 1203xxxxx@g.us | message`"
      }, { quoted: m });
    }

    const [heurePart, groupJid, messageEvent] = text.split("|").map(x => x.trim());
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
        text: "🚫 Tu ne peux pas programmer un rappel dans le passé."
      }, { quoted: m });
    }

    // Vérifie si le bot est dans le groupe
    const groups = await riza.groupFetchAllParticipating();
    if (!groups[groupJid]) {
      return riza.sendMessage(m.chat, {
        text: "❌ Le bot n’est pas dans ce groupe ou le JID est invalide."
      }, { quoted: m });
    }

    const nomGroupe = groups[groupJid].subject;

    const rappel = {
      chatId: groupJid,
      time: target.getTime(),
      message: messageEvent
    };

    let rappels = [];
    try {
      rappels = JSON.parse(fs.readFileSync(RAPPEL_PATH));
    } catch (err) {
      rappels = [];
    }

    rappels.push(rappel);
    fs.writeFileSync(RAPPEL_PATH, JSON.stringify(rappels, null, 2));

    await riza.sendMessage(m.chat, {
      text: `✅ *Rappel enregistré !*\n\n🕐 *Heure :* ${heurePart}\n👥 *Groupe :* ${nomGroupe}\n💬 *Message :* ${messageEvent}`
    }, { quoted: m });

    chargerRappels(riza); // ⏱️ Active le rappel
  }
};