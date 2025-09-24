const fs = require("fs");
const path = require("path");

const guildesPath = path.join(__dirname, "..", "data", "guildes.json");
const fichesPath = path.join(__dirname, "..", "data", "fiches.json");
const socialPath = path.join(__dirname, "..", "data", "social.json");

if (!fs.existsSync(guildesPath)) fs.writeFileSync(guildesPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(fichesPath)) fs.writeFileSync(fichesPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(socialPath)) fs.writeFileSync(socialPath, JSON.stringify({}, null, 2));

module.exports = {
  name: "creerguilde",
  category: "UNIROLIST",
  description: "Permet à un joueur de proposer une nouvelle guilde (validation par admin).",
  onlyAdmin: true,

  async execute(riza, m) {
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const rawTarget =
      contextInfo?.participant ||
      contextInfo?.remoteJid ||
      (m.mentionedJid && m.mentionedJid[0]);

    if (!rawTarget) {
      return riza.sendMessage(m.chat, {
        text: "❌ Répondez au joueur ou mentionnez-le pour créer une guilde."
      }, { quoted: m });
    }

    const target = rawTarget;

    const fiches = JSON.parse(fs.readFileSync(fichesPath));
    const socials = JSON.parse(fs.readFileSync(socialPath));

    if (!fiches[target]) {
      return riza.sendMessage(m.chat, {
        text: "❌ Ce joueur n'a pas de fiche RP validée. Il doit d'abord en créer une."
      }, { quoted: m });
    }
    if (!socials[target]) {
      return riza.sendMessage(m.chat, {
        text: "❌ Ce joueur n'a pas de fiche sociale. Il doit d'abord en créer une."
      }, { quoted: m });
    }

    const adminId = m.sender;
    const guildes = JSON.parse(fs.readFileSync(guildesPath));

    const questions = [
      { key: "nom", text: "🏰 Quel est le *nom de la guilde* à créer ?" },
      { key: "description", text: "📜 Donne une *description courte* de ta guilde." },
      { key: "embleme", text: "🪧 As-tu un *symbole ou devise* pour cette guilde ?" }
    ];

    const answers = {};
    let current = 0;
    let lastBotMessage = null;

    await riza.sendMessage(m.chat, {
      text: `👋 Bonjour @${target.split("@")[0]} !

Tu veux fonder une *guilde* ? Super idée !

Réponds aux quelques questions ci-dessous. ⚠️ *Réponds en citant chaque message du bot*.

L’admin devra valider ta demande ✅.`,
      mentions: [target]
    }, { quoted: m });

    const askNext = async (quoteReplyTo = null) => {
      if (current >= questions.length) {
        const nom = answers.nom?.trim() || "Guilde sans nom";
        const recap = `📋 *NOUVELLE GUILDE EN ATTENTE*
════════════════════════
• 🏷️ Nom         : ${answers.nom || "?"}
• 📜 Description : ${answers.description || "(vide)"}
• 🪧 Emblème     : ${answers.embleme || "(aucun)"}

👑 Chef : @${target.split("@")[0]}
🛡️ L’admin @${adminId.split("@")[0]} peut taper *valider* ou *refuser*
════════════════════════`;

        await riza.sendMessage(m.chat, { text: recap, mentions: [adminId, target] });

        const validationListener = async ({ messages }) => {
          const msg = messages[0];
          if (!msg.message) return;

          const from = msg.key.participant || msg.key.remoteJid;
          if (from !== adminId) return;

          const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
          const decision = content.trim().toLowerCase();

          riza.ev.off("messages.upsert", validationListener);

          if (decision === "valider") {
            const nomGuilde = answers.nom.trim();

            if (Object.values(guildes).some(g => g.nom.toLowerCase() === nomGuilde.toLowerCase())) {
              return riza.sendMessage(m.chat, { text: "❌ Une guilde avec ce nom existe déjà." });
            }

            guildes[target] = {
              chef: target,
              nom: nomGuilde,
              description: answers.description || "",
              embleme: answers.embleme || "",
              membres: [target],
              dateCreation: new Date().toISOString()
            };

            fs.writeFileSync(guildesPath, JSON.stringify(guildes, null, 2));
            return riza.sendMessage(m.chat, {
              text: `✅ Guilde *${nomGuilde}* créée et validée par ${m.pushName}.`
            });
          } else if (decision === "refuser") {
            return riza.sendMessage(m.chat, { text: "❌ Demande de création de guilde refusée." });
          } else {
            return riza.sendMessage(m.chat, {
              text: "❌ Réponse invalide. Tapez *valider* ou *refuser*."
            });
          }
        };

        riza.ev.on("messages.upsert", validationListener);
        return;
      }

      const sent = await riza.sendMessage(m.chat, {
        text: `📌 ${questions[current].text}`,
        mentions: [target]
      }, quoteReplyTo ? { quoted: quoteReplyTo } : undefined);

      lastBotMessage = sent.key;

      const replyListener = async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.participant || msg.key.remoteJid;
        if (from !== target) return;

        const context = msg.message.extendedTextMessage?.contextInfo;
        const quotedMsgId = context?.stanzaId;

        if (!quotedMsgId || quotedMsgId !== lastBotMessage.id) return;

        const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        if (!content) return;

        riza.ev.off("messages.upsert", replyListener);

        answers[questions[current].key] = content.trim();
        current++;

        // 🔁 Prochaine question en citant cette réponse
        await askNext(msg);
      };

      riza.ev.on("messages.upsert", replyListener);
    };

    await askNext();
  }
};