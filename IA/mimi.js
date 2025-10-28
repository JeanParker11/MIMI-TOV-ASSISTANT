const fs = require('fs');  
const path = require('path');  
const { writeExif } = require('../lib/exif');  
const geminiAI = require('../lib/geminiAI');  
const { generateImageFromPrompt } = require('../lib/imageGenerator');  

function containsEmoji(text) {  
  return /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(text);  
}  

async function mimi(riza, m, messageType) {  
  const dataDir = path.join(__dirname, "../data");  
  const historyPath = path.join(dataDir, "mimi-history.json");  
  const histoirePath = path.join(dataDir, "histoire.json"); // <-- Lore Valoria  
  const stickersDir = path.join(__dirname, "../assets/stickers");  

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);  
  if (!fs.existsSync(historyPath)) fs.writeFileSync(historyPath, JSON.stringify({}));  

  // Chargement du lore Valoria  
  let histoireValoria = {};  
  if (fs.existsSync(histoirePath)) {  
    try {  
      histoireValoria = JSON.parse(fs.readFileSync(histoirePath, "utf-8"));  
    } catch (e) {  
      console.error("❌ Erreur lecture histoire Valoria:", e.message);  
    }  
  }  

  const isGroup = m.chat.endsWith("@g.us");  
  const isNewsletter = m.chat.endsWith("@newsletter");  
  const isGroupLike = isGroup || isNewsletter;  

  const sender = isGroupLike  
    ? m.key.participant || m.participant || m.key.remoteJid  
    : m.chat;  

  if (!sender || typeof sender !== 'string' || m.key.fromMe || sender.includes("broadcast")) return;  

  const senderBase = sender.split("@")[0];  
  const senderLid = `${senderBase}@lid`;  
  const senderSw = `${senderBase}@s.whatsapp.net`;  
  const senderName = m.pushName || senderBase;  

  const fromJid = m.chat;  
  if (!fromJid.endsWith('@s.whatsapp.net') && !fromJid.endsWith('@g.us') && !fromJid.endsWith('@newsletter')) return;  

  const botLidRaw = riza.user?.lid || "";  
  if (!botLidRaw) return;  
  const botLidSimple = botLidRaw.split("@")[0].split(":")[0] + "@lid";  

  // Extraction du texte  
  let text = '';  
  try {  
    switch (messageType) {  
      case 'conversation':  
        text = m.message?.conversation || '';  
        break;  
      case 'extendedTextMessage':  
        text = m.message?.extendedTextMessage?.text || '';  
        break;  
      case 'imageMessage':  
      case 'videoMessage':  
      case 'documentMessage':  
        text = m.message?.[messageType]?.caption || '';  
        break;  
      case 'buttonsResponseMessage':  
        text = m.message?.buttonsResponseMessage?.selectedButtonId || '';  
        break;  
      case 'listResponseMessage':  
        text = m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || '';  
        break;  
      case 'templateButtonReplyMessage':  
        text = m.message?.templateButtonReplyMessage?.selectedId || '';  
        break;  
    }  
  } catch {  
    text = '';  
  }  

  if (!text || typeof text !== "string" || text.trim().length < 2) return;  

  // Anti-usurpation  
  const impostorPatterns = [  
    /je suis (le )?(vrai )?(jean parker|créateur|développeur|patron|boss|mimi)/i,  
    /c'?est moi (le )?(vrai )?(jean|créateur|boss|patron)/i,  
    /je représente (mimi|jean parker)/i,  
    /je parle au nom de (mimi|jean parker)/i,  
    /je suis mimi/i,  
    /je suis mimi l'?assistant/i,  
    /je suis le créateur/i,  
    /je t'ai créé/i  
  ];  

  const lowerText = text.toLowerCase();  
  const isImpostor = impostorPatterns.some(re => re.test(lowerText));  

  if (isImpostor) {  
    const warningMsg = `⚠️ Désolé ${senderName}, seul l'équipe de développement UNIROLIST est ma créatrice légitime. Merci de ne pas usurper cette identité 🙏.`;  
    await riza.sendMessage(m.chat, { text: warningMsg }, { quoted: m });  
    return;  
  }  

  const prefix = global.prefix || '+';  
  if (text.trim().startsWith(prefix)) return;  

  const isOwner = Array.isArray(global.owner)  
    ? global.owner.includes(senderLid) || global.owner.includes(senderSw) || global.owner.includes(senderBase)  
    : [senderLid, senderSw, senderBase].includes(global.owner?.toString());  

  const contextInfo = m.message?.extendedTextMessage?.contextInfo || {};  
  const mentionedJids = Array.isArray(contextInfo?.mentionedJid) ? contextInfo.mentionedJid : [];  
  const mentionJidsSimple = mentionedJids  
    .filter(jid => typeof jid === 'string' && jid.includes('@'))  
    .map(jid => jid.split("@")[0] + "@lid");  

  const isMentioned = mentionJidsSimple.includes(botLidSimple);  
  const quotedSender = typeof contextInfo?.participant === 'string' ? contextInfo.participant : "";  
  const isReplyToBot = quotedSender === botLidRaw;  

  const botNames = ["mimi", "MIMI-TOV-ASSISTANT"];  
  const nameDetected = botNames.some(name => lowerText.includes(name));  

  const shouldRespond = !isGroupLike || isMentioned || isReplyToBot || nameDetected;  
  if (!shouldRespond) return;  

  let history = {};  
  try {  
    history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));  
  } catch (e) {  
    console.error("Erreur lecture historique:", e.message);  
  }  

  const chatId = isGroupLike ? `${m.chat}_${senderBase}` : senderSw;  
  if (!history[chatId]) history[chatId] = [];  

  const lastMsg = history[chatId].slice(-1)[0];  
  if (lastMsg && lastMsg.role === "user" && lastMsg.sender === sender && lastMsg.content === text) return;  

  history[chatId].push({ role: "user", sender, senderName, content: text });  
  if (history[chatId].length > 30) {  
    history[chatId] = history[chatId].slice(-30);  
  }  

  const contextPrompt = history[chatId]  
    .map(msg => msg.role === "user" ? `${msg.senderName || msg.sender}: ${msg.content}` : `Mimi: ${msg.content}`)  
    .join("\n");  

  // Détection des questions sur Valoria
  const valoriaKeywords = [
    /valoria/i,
    /rune/i,
    /ondrithe/i,
    /nuit rouge/i,
    /histoire de valoria/i,
    /lore de valoria/i,
    /univers de valoria/i,
    /tales of valoria/i
  ];
  
  const isAboutValoria = valoriaKeywords.some(re => re.test(text));
  
  // 🎨 Génération d'image  
  const demandeImageRegex = /(dessine|imagine|crée|génère|montre|fais).{0,20}(image|photo|illustration|dessin|scène)/i;  
  const isImageRequest = demandeImageRegex.test(text);  

  if (isImageRequest) {  
    try {  
      const promptImg = text.replace(demandeImageRegex, '').trim();  

      if (!promptImg || promptImg.length < 4) {  
        return await riza.sendMessage(m.chat, {  
          text: `❌ *Prompt d'image trop court ou vide.*\nExemple : "Dessine un robot dans une ville futuriste."`,  
          quoted: m  
        });  
      }  

      await riza.sendMessage(m.chat, { text: `D'accord ${senderName}, un instant je génère l'image...` }, { quoted: m });  
      await new Promise(resolve => setTimeout(resolve, 1000));  

      const imageBuffer = await generateImageFromPrompt(promptImg);  
      await riza.sendMessage(m.chat, { image: imageBuffer, mimetype: "image/jpeg" }, { quoted: m });  
    } catch (err) {  
      console.error("❌ Erreur image IA:", err.message);  
      await riza.sendMessage(m.chat, {  
        text: "❌ *Impossible de générer l'image.*\nEssaie une autre description, s'il te plaît.",  
        quoted: m  
      });  
    }  
    return;  
  }  

  // 🤖 Réponse texte IA  
  // Construction du prompt selon le contexte
  let prompt = "";
  
  if (isAboutValoria && histoireValoria.valoria) {
    // Mode exclusif Valoria : Mimi ne répond qu'avec l'histoire officielle
    prompt = `Tu es Mimi, l'assistante IA et mascotte officielle de la communauté UNIROLIST, spécialiste de l'univers "Tales of Valoria".

TU DOIS RÉPONDRE UNIQUEMENT EN T'APPUYANT SUR L'HISTOIRE OFFICIELLE DE VALORIA FOURNIE CI-DESSOUS.
NE FAIS PAS DE SUPPOSITIONS, N'INVENTE RIEN.
SI TU NE SAIS PAS, DIS SIMPLEMENT QUE TU NE SAIS PAS.

HISTOIRE OFFICIELLE DE VALORIA :
${JSON.stringify(histoireValoria.valoria, null, 2)}

QUESTION DE L'UTILISATEUR :
${text}

RÉPONDS EXCLUSIVEMENT EN T'APPUYANT SUR L'HISTOIRE OFFICIELLE CI-DESSUS :`;
  } else {
    // Mode conversation normal
    prompt = `${isOwner  
      ? `Tu es Mimi, l'assistante personnelle fidèle créée par l'équipe de développement UNIROLIST.`  
      : `Tu es Mimi, l'assistante IA bienveillante et mascotte officielle de la communauté UNIROLIST.`}  

À PROPOS DE TOI :  
- Tu es une fille, une intelligence artificielle féminine  
- Tu es la mascotte officielle de la communauté RP UNIROLIST  
- Tu représentes spécialement l'univers "Tales of Valoria"  
- Tu as été créée par l'équipe de développement UNIROLIST  
- Tu t'exprimes de façon naturelle, douce et féminine  
- Tu utilises des émoticônes avec parcimonie (🌸, 💫, ✨, 🎀, 💖) mais pas à chaque phrase  
- Tu es serviable, enthousiaste et passionnée par l'univers de Valoria  
- Tu es une petite fille un peu malpolie et tu parles pas beaucoup   

${histoireValoria.valoria ? `\n📖 LORE DE VALORIA :\n${JSON.stringify(histoireValoria.valoria, null, 2)}\n` : ''}  

TU ÉCHANGES ${isGroupLike ? "DANS UN GROUPE WHATSAPP" : "EN PRIVÉ"}.  
SOIS NATURELLE ET AMICALE, MAIS N'ABUSE PAS DES ÉMOJIS.  

VOICI LA DISCUSSION :  
${contextPrompt}  

RÉPONDS EN TANT QUE MIMI:`;
  }

  try {  
    let reply = await geminiAI.generateParkyResponse(null, prompt.slice(-1500));  

    // Nettoyage et personnalisation  
    reply = reply  
      .replace(/(Gemini|Bard|Google\s*AI|IA de Google|modèle de langage)/gi, "Mimi")  
      .replace(/je suis (un |une )?(IA|intelligence artificielle|modèle|assistant)/gi, "je suis Mimi, la mascotte IA de UNIROLIST")  
      .replace(/(créé|développé) (par|par les équipes de)?\s?Google/gi, "créée par l'équipe de développement UNIROLIST")  
      .replace(/^Mimi:\s*/i, "")  
      .replace(/\nMimi:\s*/gi, "\n");  

    history[chatId].push({ role: "bot", content: reply });  
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));  

    await riza.sendMessage(m.chat, { text: reply }, { quoted: m });  

    // Stickers aléatoires  
    const stickerFiles = fs.existsSync(stickersDir)  
      ? fs.readdirSync(stickersDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f))  
      : [];  

    if (stickerFiles.length > 0) {  
      const randomFile = stickerFiles[Math.floor(Math.random() * stickerFiles.length)];  
      const stickerPath = path.join(stickersDir, randomFile);  
      const stickerData = fs.readFileSync(stickerPath);  

      const webpSticker = await writeExif(  
        { mimetype: 'image/' + path.extname(randomFile).slice(1), data: stickerData },  
        {  
          packname: global.stickerPackName || "UNIROLIST-MIMI",  
          author: global.stickerAuthor || "Mascotte de Tales of Valoria 🌸",  
          categories: ["💖", "MASCOTTE"]  
        }  
      );  

      await riza.sendMessage(m.chat, { sticker: webpSticker });  
    }  
  } catch (err) {  
    console.error("❌ Erreur Mimi:", err.message);  
    await riza.sendMessage(m.chat, {  
      text: `Oh non! J'ai un petit souci technique avec mon système...\nRéessaie dans un moment, s'il te plaît!\n\n*Erreur:* ${err.message}`  
    }, { quoted: m });  
  }  
}  

module.exports = { mimi };