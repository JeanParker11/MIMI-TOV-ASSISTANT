const fs = require("fs");
const path = require("path");

const fichesPath = path.join(__dirname, "..", "data", "fiches.json");
const palmaresPath = path.join(__dirname, "..", "data", "palmares.json");
const socialPath = path.join(__dirname, "..", "data", "social.json");

if (!fs.existsSync(fichesPath)) fs.writeFileSync(fichesPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(palmaresPath)) fs.writeFileSync(palmaresPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(socialPath)) fs.writeFileSync(socialPath, JSON.stringify({}, null, 2));

function addToPalmares(jid) {
  const palmares = JSON.parse(fs.readFileSync(palmaresPath));
  if (!palmares[jid]) {
    palmares[jid] = { victoires: 0, defaites: 0, nuls: 0 };
    fs.writeFileSync(palmaresPath, JSON.stringify(palmares, null, 2));
  }
}

function initSocialFiche(jid, pseudo, faction) {
  const socials = JSON.parse(fs.readFileSync(socialPath));
  if (!socials[jid]) {
    socials[jid] = {
      nom: pseudo || "Inconnu",
      faction: faction || "Non défini",
      surnom: "",
      grade: "Aventurier",
      titre_honorifique: "",
      guilde: "",
      coequipiers: [],
      reputation: {
        peuple: 0,
        autorites: 0
      }
    };
    fs.writeFileSync(socialPath, JSON.stringify(socials, null, 2));
  }
}

module.exports = {
  name: "enregistrer",
  category: "UNIROLIST",
  description: "Commence la création d'une fiche d'un joueur",
  onlyAdmin: true,

  async execute(riza, m, args) {
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const rawTarget =
      contextInfo?.participant ||
      contextInfo?.remoteJid ||
      (m.mentionedJid && m.mentionedJid[0]);

    if (!rawTarget) {  
      return riza.sendMessage(m.chat, {  
        text: "❌ Répondez au joueur ou mentionnez-le pour démarrer l'enregistrement."  
      }, { quoted: m });  
    }  

    const target = rawTarget;  
    const fiches = JSON.parse(fs.readFileSync(fichesPath));  
    
    // Vérifier si la personne est déjà enregistrée
    if (fiches[target]) {
      return riza.sendMessage(m.chat, {  
        text: "❌ Cette personne est déjà enregistrée. Utilisez la commande 'modifier' pour changer sa fiche."  
      }, { quoted: m });  
    }

    const adminId = m.sender;  
    fiches[target] = { tel: target };  

    const questions = [  
      { key: "pseudo", text: "✨ Salut ! Pour commencer, quel *pseudo* veux-tu utiliser dans le RP ?" },  
      { key: "tel", text: "📱 Peux-tu me donner ton *numéro de téléphone* (format international) ?" },  
      { key: "faction", text: "🏳️ Tu appartiens à quelle *faction* ?" },  
      { key: "corps1", text: "⚔️ C'est quoi ton *premier corps* de combat ou spécialité ? (répondre 'non' si tu n'en veux pas)" },  
      { key: "corps2", text: "⚔️ Et ton *deuxième corps* ? (répondre 'non' pour arrêter)" },  
      { key: "corps3", text: "⚔️ Tu veux ajouter un *troisième corps* ? (répondre 'non' pour arrêter)" },  
      { key: "corps4", text: "⚔️ Et un *quatrième corps* ? (répondre 'non' pour arrêter)" },  
      { key: "sort1", text: "🔮 Dis-moi un *premier sort* que ton personnage maîtrise. (répondre 'non' si tu n'en veux pas)" },  
      { key: "sort2", text: "🔮 Un *deuxième sort* peut-être ? (répondre 'non' pour arrêter)" },  
      { key: "sort3", text: "🔮 Tu veux ajouter un *troisième sort* ? (répondre 'non' pour arrêter)" },  
      { key: "sort4", text: "🔮 Et un *quatrième sort* ? (répondre 'non' pour arrêter)" },  
      { key: "force", text: "💪 Sur une échelle RP, quelle est sa *force physique* ? (la somme des 3 stats doit faire 150)" },  
      { key: "esprit", text: "🧠 Et son *intelligence ou esprit* ?" },  
      { key: "pouvoir", text: "🌀 Enfin, quel est son *niveau de pouvoir ou énergie* ?" }  
    ];  

    const answers = {};  
    let current = 0;  
    let lastResponse = m;  
    let validationAsked = false;
    let validationTimeout;

    await riza.sendMessage(m.chat, {  
      text: `👋 Bonjour @${target.split("@")[0]} !

Tu es sur le point de remplir ta fiche personnage pour le RP 🧙‍♂️.

✍️ Réponds aux questions une par une. Si tu veux laisser une réponse vide, tape 'passer' ou 'non'.

⚠️ Pour les stats (force, esprit, pouvoir), la somme doit faire exactement 150.

Une fois terminé, l'admin validera ta fiche manuellement ✅.`,
      mentions: [target]
    }, { quoted: m });

    const askNext = async () => {  
      // Gestion spéciale pour les corps
      if (current === 3 && (!answers.corps1 || ['non', 'passer'].includes(answers.corps1.toLowerCase()))) {
        current = 7; // Saute directement aux sorts
      } else if (current === 4 && (!answers.corps2 || ['non', 'passer'].includes(answers.corps2.toLowerCase()))) {
        current = 7; // Saute directement aux sorts
      } else if (current === 5 && (!answers.corps3 || ['non', 'passer'].includes(answers.corps3.toLowerCase()))) {
        current = 7; // Saute directement aux sorts
      } else if (current === 6 && (!answers.corps4 || ['non', 'passer'].includes(answers.corps4.toLowerCase()))) {
        current = 7; // Passe aux sorts
      }
      
      // Gestion spéciale pour les sorts
      if (current === 7 && (!answers.sort1 || ['non', 'passer'].includes(answers.sort1.toLowerCase()))) {
        current = 11; // Saute directement aux stats
      } else if (current === 8 && (!answers.sort2 || ['non', 'passer'].includes(answers.sort2.toLowerCase()))) {
        current = 11; // Saute directement aux stats
      } else if (current === 9 && (!answers.sort3 || ['non', 'passer'].includes(answers.sort3.toLowerCase()))) {
        current = 11; // Saute directement aux stats
      } else if (current === 10 && (!answers.sort4 || ['non', 'passer'].includes(answers.sort4.toLowerCase()))) {
        current = 11; // Passe aux stats
      }

      // Gestion spéciale pour les stats
      if (current === 12) { // Esprit
        const reste = 150 - (parseInt(answers.force) || 0);
        questions[current].text = `🧠 Et son *intelligence ou esprit* ? (reste: ${reste})`;
      } else if (current === 13) { // Pouvoir
        const reste = 150 - (parseInt(answers.force) || 0) - (parseInt(answers.esprit) || 0);
        questions[current].text = `🌀 Enfin, quel est son *niveau de pouvoir ou énergie* ? (reste: ${reste})`;
      }

      if (current >= questions.length) {  
        // Vérification des stats
        const force = parseInt(answers.force) || 0;
        const esprit = parseInt(answers.esprit) || 0;
        const pouvoir = parseInt(answers.pouvoir) || 0;
        const totalStats = force + esprit + pouvoir;

        if (totalStats !== 150) {
          await riza.sendMessage(m.chat, {  
            text: `❌ La somme des stats (${totalStats}) ne fait pas 150. Veuillez recommencer la saisie des stats.`,
            mentions: [target]
          }, { quoted: lastResponse });
          
          // Réinitialiser les stats
          answers.force = undefined;
          answers.esprit = undefined;
          answers.pouvoir = undefined;
          current = 11; // Retour à la première stat
          return askNext();
        }

        const corps = [answers.corps1, answers.corps2, answers.corps3, answers.corps4]
          .filter(x => x && !['non', 'passer'].includes(x.toLowerCase()))
          .map(x => x || "(vide)");  
        
        const sorts = [answers.sort1, answers.sort2, answers.sort3, answers.sort4]
          .filter(x => x && !['non', 'passer'].includes(x.toLowerCase()))
          .map(x => x || "(vide)");  

        const stats = {  
          force: answers.force || "0",  
          esprit: answers.esprit || "0",  
          pouvoir: answers.pouvoir || "0"  
        };  

        const recap = `📋 *FICHE EN ATTENTE DE VALIDATION*

═════════════════
• Pseudonyme : ${answers.pseudo || "(inconnu)"}
• Numéro     : ${answers.tel || "(non fourni)"}
• Faction    : ${answers.faction || "(inconnue)"}

𝗖𝗼𝗿𝗽𝘀 :
${corps.map((c, i) => `${i+1}️⃣ ${c}`).join('\n') || "Aucun corps spécifié"}

𝗦𝗼𝗿𝘁𝘀 :
${sorts.map((s, i) => `${i+1}️⃣ ${s}`).join('\n') || "Aucun sort spécifié"}

𝗦𝘁𝗮𝘁𝘀 :
👊 ${stats.force} | 🧠 ${stats.esprit} | 🌀 ${stats.pouvoir} (Total: ${parseInt(stats.force) + parseInt(stats.esprit) + parseInt(stats.pouvoir)})

L'admin @${adminId.split("@")[0]} peut taper *valider* ou *refuser*.
══════════════════`;

        validationAsked = true;
        await riza.sendMessage(m.chat, { text: recap, mentions: [adminId] });  

        const validationListener = async ({ messages }) => {  
          if (!validationAsked) return;

          const msg = messages[0];  
          if (!msg.message) return;  

          const from = msg.key.participant || msg.key.remoteJid;  
          if (from !== adminId) return;  

          const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
          const decision = content.trim().toLowerCase();  

          if (!['valider', 'refuser'].includes(decision)) {
            await riza.sendMessage(m.chat, { 
              text: "❌ Réponse invalide. Veuillez taper *valider* ou *refuser*.",
              mentions: [adminId]
            });
            return;
          }

          clearTimeout(validationTimeout);
          riza.ev.off("messages.upsert", validationListener);  
          validationAsked = false;

          if (decision === "valider") {  
            fiches[target] = {  
              pseudo: answers.pseudo || "(inconnu)",  
              tel: answers.tel || "(non fourni)",  
              faction: answers.faction || "(inconnue)",  
              corps,  
              sorts,  
              stats,  
              validéePar: m.pushName || "Admin"  
            };  

            fs.writeFileSync(fichesPath, JSON.stringify(fiches, null, 2));  
            addToPalmares(target);  
            initSocialFiche(target, answers.pseudo, answers.faction);

            return riza.sendMessage(m.chat, { 
              text: `✅ Fiche enregistrée et validée par ${m.pushName}`,
              mentions: [target, adminId]
            });  
          } else {  
            return riza.sendMessage(m.chat, { 
              text: `❌ Fiche refusée par l'admin. Rien n'a été enregistré.`,
              mentions: [target, adminId]
            });  
          }  
        };  

        riza.ev.on("messages.upsert", validationListener);  

        // Timeout après 2 minutes
        validationTimeout = setTimeout(() => {
          if (validationAsked) {
            riza.ev.off("messages.upsert", validationListener);
            validationAsked = false;
            riza.sendMessage(m.chat, {
              text: "⌛ Temps écoulé - La validation a été annulée car l'admin n'a pas répondu à temps.",
              mentions: [adminId]
            });
          }
        }, 120000);
        
        return;  
      }  

      await riza.sendMessage(m.chat, {  
        text: `📌 ${questions[current].text}`,  
        mentions: [target]  
      }, { quoted: lastResponse });  

      const replyListener = async ({ messages }) => {  
        const msg = messages[0];  
        if (!msg.message) return;  

        const from = msg.key.participant || msg.key.remoteJid;  
        if (from !== target) return;  

        const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
        if (!content) return;  

        riza.ev.off("messages.upsert", replyListener);  

        const reponse = content.trim();
        answers[questions[current].key] = ['non', 'passer'].includes(reponse.toLowerCase()) ? "" : reponse;
        lastResponse = msg;  
        current++;  
        await askNext();  
      };  

      riza.ev.on("messages.upsert", replyListener);  
    };  

    await askNext();
  }
};