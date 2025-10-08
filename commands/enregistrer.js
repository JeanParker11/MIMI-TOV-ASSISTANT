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

function validerFaction(factionReponse) {
  const factionsValides = ["hermès", "hecate", "arès", "atlas", "hermes", "hecaté", "ares", "hécates", "hécate"];
  const factionLower = factionReponse.toLowerCase();
  
  if (!factionsValides.includes(factionLower)) {
    return { valide: false, faction: null };
  }
  
  // Normalisation avec correction de Hécates
  if (factionLower.includes("herm")) return { valide: true, faction: "Hermès" };
  if (factionLower.includes("hecat") || factionLower.includes("hécat")) return { valide: true, faction: "Hécates" };
  if (factionLower.includes("arès") || factionLower.includes("ares")) return { valide: true, faction: "Arès" };
  if (factionLower.includes("atlas")) return { valide: true, faction: "Atlas" };
  
  return { valide: false, faction: null };
}

module.exports = {
  name: "enregistrer",
  category: "Unirolist",
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
      { key: "faction", text: "🏳️ Tu appartiens à quelle *faction* ?\n\nChoix disponibles :\n• Hermès\n• Hécates\n• Arès\n• Atlas" },  
      { key: "force", text: "💪 Sur une échelle RP, quelle est sa *force physique* ? (la somme des 3 stats doit faire 150)" },  
      { key: "esprit", text: "🧠 Et son *intelligence ou esprit* ?" },  
      { key: "pouvoir", text: "🌀 Enfin, quel est son *niveau de pouvoir ou énergie* ?" }  
    ];  

    const answers = {};  
    let current = 0;  
    let lastPlayerMessage = null;
    let validationAsked = false;
    let validationTimeout;

    await riza.sendMessage(m.chat, {  
      text: `👋 Bonjour @${target.split("@")[0]} !

Tu es sur le point de remplir ta fiche personnage pour le RP 🧙‍♂️.

✍️ Réponds aux questions une par une en *répondant directement* au message de la question.

⚠️ Pour les stats (force, esprit, pouvoir), la somme doit faire exactement 150.

🏳️ Les factions disponibles sont : Hermès, Hécates, Arès, Atlas

⚔️ Pour le premier enregistrement, le corps imposé est "Ensemble Usé (Défense : 0)"

Une fois terminé, l'admin validera ta fiche manuellement ✅.`,
      mentions: [target]
    }, { quoted: m });

    const askNext = async () => {  
      // Gestion spéciale pour les stats
      if (current === 3) { // Question sur la force
        questions[3].text = "💪 Sur une échelle RP, quelle est sa *force physique* ? (la somme des 3 stats doit faire 150)";
      } else if (current === 4) { // Question sur l'esprit
        const force = parseInt(answers.force) || 0;
        const reste = 150 - force;
        questions[4].text = `🧠 Et son *intelligence ou esprit* ? (reste: ${reste})`;
      } else if (current === 5) { // Question sur le pouvoir
        const force = parseInt(answers.force) || 0;
        const esprit = parseInt(answers.esprit) || 0;
        const reste = 150 - force - esprit;
        questions[5].text = `🌀 Enfin, quel est son *niveau de pouvoir ou énergie* ? (reste: ${reste})`;
      }

      if (current >= questions.length) {  
        // Vérification finale des stats seulement
        const force = parseInt(answers.force) || 0;
        const esprit = parseInt(answers.esprit) || 0;
        const pouvoir = parseInt(answers.pouvoir) || 0;
        const totalStats = force + esprit + pouvoir;

        if (totalStats !== 150) {
          await riza.sendMessage(m.chat, {  
            text: `❌ La somme des stats (${totalStats}) ne fait pas 150. Veuillez recommencer la saisie des stats.`,
            mentions: [target]
          }, { quoted: lastPlayerMessage });
          
          answers.force = undefined;
          answers.esprit = undefined;
          answers.pouvoir = undefined;
          current = 3;
          return askNext();
        }

        // Corps imposé pour premier enregistrement
        const corps = ["Ensemble Usé (Défense : 0)", "", ""];
        const sorts = ["", "", ""];
        const cartes = ["", "", ""];

        const stats = {  
          force: answers.force || "0",  
          esprit: answers.esprit || "0",  
          pouvoir: answers.pouvoir || "0"  
        };  

        const recap = `𝐓𝐎𝐕 : 𝐅𝐈𝐂𝐇𝐄 𝐃'𝐈𝐍𝐒𝐂𝐑𝐈𝐏𝐓𝐈𝐎𝐍 🍃➕
════════════════════════
• Pseudonyme : ${answers.pseudo || "(inconnu)"}
• Numéro de Téléphone : ${answers.tel || "(non fourni)"}
• Faction : ${answers.faction || "(inconnue)"}

*Inventaire de corps*
═
- 1️⃣: Ensemble Usé (Défense : 0)
- 2️⃣: (vide)
- 3️⃣: (vide)

*Inventaire de sorts*
═
- 1️⃣: (vide)
- 2️⃣: (vide)
- 3️⃣: (vide)

*Cartes de personnages*
═
- 1️⃣: (vide)
- 2️⃣: (vide)
- 3️⃣: (vide)

𝗦𝘁𝗮𝘁𝗶𝘀𝘁𝗶𝗾𝘂𝗲𝘀
═
👊🏼• 𝗙𝗼𝗿𝗰𝗲 : ${stats.force}
🧠• 𝗘𝘀𝗽𝗿𝗶𝘁 : ${stats.esprit}
🌀• 𝗣𝗼𝘂𝘃𝗼𝗶𝗿 : ${stats.pouvoir}

▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
Fiche validée par : 

L'admin @${adminId.split("@")[0]} peut taper *valider* ou *refuser*.
══════════════════`;

        validationAsked = true;
        const recapMessage = await riza.sendMessage(m.chat, { text: recap, mentions: [adminId] });  
        lastPlayerMessage = recapMessage;

        const validationListener = async ({ messages }) => {  
          if (!validationAsked) return;

          const msg = messages[0];  
          if (!msg.message) return;  

          const from = msg.key.participant || msg.key.remoteJid;  
          if (from !== adminId) return;  

          const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
          if (!contextInfo || contextInfo.stanzaId !== recapMessage.key.id) {
            return;
          }

          const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
          const decision = content.trim().toLowerCase();  

          if (!['valider', 'refuser'].includes(decision)) {
            await riza.sendMessage(m.chat, { 
              text: "❌ Réponse invalide. Veuillez taper *valider* ou *refuser* en répondant au message de recap.",
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
              cartes,
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

      // Si c'est la première question, on cite le message initial de l'admin
      // Sinon, on cite le dernier message du joueur
      const quotedMessage = current === 0 ? m : lastPlayerMessage;

      const questionMessage = await riza.sendMessage(m.chat, {  
        text: `📌 ${questions[current].text}`,  
        mentions: [target]  
      }, { quoted: quotedMessage });  

      const replyListener = async ({ messages }) => {  
        const msg = messages[0];  
        if (!msg.message) return;  

        const from = msg.key.participant || msg.key.remoteJid;  
        if (from !== target) return;  

        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
        if (!contextInfo || contextInfo.stanzaId !== questionMessage.key.id) {
          return;
        }

        const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
        if (!content) return;  

        riza.ev.off("messages.upsert", replyListener);  

        const reponse = content.trim();
        
        // VÉRIFICATION ET CORRECTION DE LA FACTION
        if (current === 2) { // Si c'est la question sur la faction
          const validationFaction = validerFaction(reponse);
          if (!validationFaction.valide) {
            await riza.sendMessage(m.chat, {  
              text: `❌ Faction invalide. Les factions disponibles sont : Hermès, Hécates, Arès, Atlas. Veuillez répondre à nouveau.`,
              mentions: [target]
            }, { quoted: msg });
            
            // Redemande la même question en citant la réponse incorrecte
            lastPlayerMessage = msg;
            await askNext();
            return;
          } else {
            answers.faction = validationFaction.faction; // Utilise la faction normalisée
          }
        } else {
          answers[questions[current].key] = reponse;
        }
        
        lastPlayerMessage = msg;  
        current++;  
        await askNext();  
      };  

      riza.ev.on("messages.upsert", replyListener);  
    };  

    await askNext();
  }
};