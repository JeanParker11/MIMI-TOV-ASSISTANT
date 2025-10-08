const fs = require("fs");
const path = require("path");

const fichesPath = path.join(__dirname, "..", "data", "fiches.json");
const socialPath = path.join(__dirname, "..", "data", "social.json");

module.exports = {
  name: "modifiche",
  category: "UNIROLIST",
  description: "Modifie la fiche d'un joueur existant",
  onlyAdmin: true,

  async execute(riza, m, args) {
    const contextInfo = m.message?.extendedTextMessage?.contextInfo;
    const rawTarget =
      contextInfo?.participant ||
      contextInfo?.remoteJid ||
      (m.mentionedJid && m.mentionedJid[0]);

    if (!rawTarget) {  
      return riza.sendMessage(m.chat, {  
        text: "❌ Répondez au joueur ou mentionnez-le pour modifier sa fiche."  
      }, { quoted: m });  
    }  

    const target = rawTarget;  
    const fiches = JSON.parse(fs.readFileSync(fichesPath));  
    
    // Vérifier si la personne existe
    if (!fiches[target]) {
      return riza.sendMessage(m.chat, {  
        text: "❌ Cette personne n'est pas encore enregistrée. Utilisez la commande 'enregistrer' pour créer sa fiche."  
      }, { quoted: m });  
    }

    const ficheExistante = fiches[target];
    
    // Afficher le menu de modification
    const menuModification = `📝 *MENU DE MODIFICATION*

═════════════════
Fiche de : @${target.split("@")[0]}
Pseudo actuel : ${ficheExistante.pseudo}
Faction actuelle : ${ficheExistante.faction}

Que souhaitez-vous modifier ?

1. 🔤 *Pseudo* : "${ficheExistante.pseudo}"
2. 📱 *Numéro de téléphone* : "${ficheExistante.tel}"
3. 🏳️ *Faction* : "${ficheExistante.faction}"
4. 💪 *Stats - Force* : ${ficheExistante.stats.force}
5. 🧠 *Stats - Esprit* : ${ficheExistante.stats.esprit}
6. 🌀 *Stats - Pouvoir* : ${ficheExistante.stats.pouvoir}
7. ⚔️ *Corps* (3 emplacements)
8. 🔮 *Sorts* (3 emplacements)
9. 📊 *Tout réinitialiser les stats*

Répondez avec le *numéro* de ce que vous voulez modifier (1-9)
ou tapez "annuler" pour arrêter.`;

    await riza.sendMessage(m.chat, { 
      text: menuModification,
      mentions: [target]
    }, { quoted: m });

    let modificationEnCours = true;
    let attenteChoix = true;

    const choixListener = async ({ messages }) => {  
      if (!attenteChoix) return;

      const msg = messages[0];  
      if (!msg.message) return;  

      const from = msg.key.participant || msg.key.remoteJid;  
      if (from !== m.sender) return; // Seul l'admin peut modifier

      const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
      const choix = content.trim().toLowerCase();  

      if (choix === "annuler") {
        attenteChoix = false;
        modificationEnCours = false;
        riza.ev.off("messages.upsert", choixListener);
        return riza.sendMessage(m.chat, { 
          text: "❌ Modification annulée."
        });
      }

      const numeroChoix = parseInt(choix);
      
      if (isNaN(numeroChoix) || numeroChoix < 1 || numeroChoix > 9) {
        return riza.sendMessage(m.chat, { 
          text: "❌ Choix invalide. Veuillez répondre avec un nombre entre 1 et 9, ou \"annuler\"."
        });
      }

      attenteChoix = false;
      riza.ev.off("messages.upsert", choixListener);

      // Traitement selon le choix
      switch (numeroChoix) {
        case 1:
          await modifierPseudo(riza, m, target, fiches, ficheExistante);
          break;
        case 2:
          await modifierTelephone(riza, m, target, fiches, ficheExistante);
          break;
        case 3:
          await modifierFaction(riza, m, target, fiches, ficheExistante);
          break;
        case 4:
        case 5:
        case 6:
          await modifierStat(riza, m, target, fiches, ficheExistante, numeroChoix);
          break;
        case 7:
          await modifierCorps(riza, m, target, fiches, ficheExistante);
          break;
        case 8:
          await modifierSorts(riza, m, target, fiches, ficheExistante);
          break;
        case 9:
          await reinitialiserStats(riza, m, target, fiches, ficheExistante);
          break;
      }
    };  

    riza.ev.on("messages.upsert", choixListener);

    // Timeout après 2 minutes
    setTimeout(() => {
      if (attenteChoix) {
        riza.ev.off("messages.upsert", choixListener);
        attenteChoix = false;
        modificationEnCours = false;
        riza.sendMessage(m.chat, {
          text: "⌛ Temps écoulé - Modification annulée."
        });
      }
    }, 120000);
  }
};

// Fonction pour modifier le pseudo
async function modifierPseudo(riza, m, target, fiches, ficheExistante) {
  await riza.sendMessage(m.chat, { 
    text: `✍️ Entrez le nouveau *pseudo* pour @${target.split("@")[0]} :\n\nActuel : "${ficheExistante.pseudo}"`
  });

  const reponseListener = async ({ messages }) => {  
    const msg = messages[0];  
    if (!msg.message) return;  

    const from = msg.key.participant || msg.key.remoteJid;  
    if (from !== m.sender) return;

    const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
    const nouveauPseudo = content.trim();  

    if (!nouveauPseudo) {
      return riza.sendMessage(m.chat, { 
        text: "❌ Pseudo invalide. Veuillez entrer un pseudo valide."
      });
    }

    riza.ev.off("messages.upsert", reponseListener);

    // Mettre à jour la fiche
    fiches[target].pseudo = nouveauPseudo;
    
    // Mettre à jour aussi la fiche sociale si elle existe
    try {
      const socials = JSON.parse(fs.readFileSync(socialPath));
      if (socials[target]) {
        socials[target].nom = nouveauPseudo;
        fs.writeFileSync(socialPath, JSON.stringify(socials, null, 2));
      }
    } catch (error) {
      console.log("Aucune fiche sociale trouvée pour cet utilisateur");
    }

    fs.writeFileSync(fichesPath, JSON.stringify(fiches, null, 2));

    await riza.sendMessage(m.chat, { 
      text: `✅ Pseudo modifié avec succès !\n\nNouveau pseudo : "${nouveauPseudo}"`
    });
  };  

  riza.ev.on("messages.upsert", reponseListener);
}

// Fonction pour modifier le téléphone
async function modifierTelephone(riza, m, target, fiches, ficheExistante) {
  await riza.sendMessage(m.chat, { 
    text: `📱 Entrez le nouveau *numéro de téléphone* pour @${target.split("@")[0]} :\n\nActuel : "${ficheExistante.tel}"`
  });

  const reponseListener = async ({ messages }) => {  
    const msg = messages[0];  
    if (!msg.message) return;  

    const from = msg.key.participant || msg.key.remoteJid;  
    if (from !== m.sender) return;

    const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
    const nouveauTel = content.trim();  

    if (!nouveauTel) {
      return riza.sendMessage(m.chat, { 
        text: "❌ Numéro invalide. Veuillez entrer un numéro valide."
      });
    }

    riza.ev.off("messages.upsert", reponseListener);

    fiches[target].tel = nouveauTel;
    fs.writeFileSync(fichesPath, JSON.stringify(fiches, null, 2));

    await riza.sendMessage(m.chat, { 
      text: `✅ Numéro de téléphone modifié avec succès !\n\nNouveau numéro : "${nouveauTel}"`
    });
  };  

  riza.ev.on("messages.upsert", reponseListener);
}

// Fonction pour modifier la faction
async function modifierFaction(riza, m, target, fiches, ficheExistante) {
  await riza.sendMessage(m.chat, { 
    text: `🏳️ Entrez la nouvelle *faction* pour @${target.split("@")[0]} :\n\nActuelle : "${ficheExistante.faction}"\n\nChoix disponibles :\n• Hermès\n• Hécates\n• Arès\n• Atlas`
  });

  const reponseListener = async ({ messages }) => {  
    const msg = messages[0];  
    if (!msg.message) return;  

    const from = msg.key.participant || msg.key.remoteJid;  
    if (from !== m.sender) return;

    const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
    const nouvelleFaction = content.trim();  

    // Validation de la faction
    const factionsValides = ["hermès", "hecate", "arès", "atlas", "hermes", "hecaté", "ares", "hécates"];
    const factionLower = nouvelleFaction.toLowerCase();
    
    if (!factionsValides.includes(factionLower)) {
      return riza.sendMessage(m.chat, { 
        text: "❌ Faction invalide. Les factions disponibles sont : Hermès, Hécates, Arès, Atlas."
      });
    }

    riza.ev.off("messages.upsert", reponseListener);

    // Normalisation
    let factionNormalisee = "";
    if (factionLower.includes("herm")) factionNormalisee = "Hermès";
    else if (factionLower.includes("hecat")) factionNormalisee = "Hécates";
    else if (factionLower.includes("arès") || factionLower.includes("ares")) factionNormalisee = "Arès";
    else if (factionLower.includes("atlas")) factionNormalisee = "Atlas";

    fiches[target].faction = factionNormalisee;
    
    // Mettre à jour aussi la fiche sociale si elle existe
    try {
      const socials = JSON.parse(fs.readFileSync(socialPath));
      if (socials[target]) {
        socials[target].faction = factionNormalisee;
        fs.writeFileSync(socialPath, JSON.stringify(socials, null, 2));
      }
    } catch (error) {
      console.log("Aucune fiche sociale trouvée pour cet utilisateur");
    }

    fs.writeFileSync(fichesPath, JSON.stringify(fiches, null, 2));

    await riza.sendMessage(m.chat, { 
      text: `✅ Faction modifiée avec succès !\n\nNouvelle faction : "${factionNormalisee}"`
    });
  };  

  riza.ev.on("messages.upsert", reponseListener);
}

// Fonction pour modifier une stat
async function modifierStat(riza, m, target, fiches, ficheExistante, choix) {
  const stats = { 4: "force", 5: "esprit", 6: "pouvoir" };
  const statNom = stats[choix];
  const emojis = { force: "💪", esprit: "🧠", pouvoir: "🌀" };
  
  const totalActuel = parseInt(ficheExistante.stats.force) + 
                     parseInt(ficheExistante.stats.esprit) + 
                     parseInt(ficheExistante.stats.pouvoir);
  const autresStats = totalActuel - parseInt(ficheExistante.stats[statNom]);

  await riza.sendMessage(m.chat, { 
    text: `${emojis[statNom]} Entrez la nouvelle valeur pour *${statNom}* :\n\nActuelle : ${ficheExistante.stats[statNom]}\nValeur maximale possible : ${150 - autresStats}`
  });

  const reponseListener = async ({ messages }) => {  
    const msg = messages[0];  
    if (!msg.message) return;  

    const from = msg.key.participant || msg.key.remoteJid;  
    if (from !== m.sender) return;

    const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
    const nouvelleValeur = parseInt(content.trim());  

    if (isNaN(nouvelleValeur) || nouvelleValeur < 0) {
      return riza.sendMessage(m.chat, { 
        text: "❌ Valeur invalide. Veuillez entrer un nombre positif."
      });
    }

    // Calcul du nouveau total
    const nouveauxAutresStats = totalActuel - parseInt(ficheExistante.stats[statNom]);
    const nouveauTotal = nouveauxAutresStats + nouvelleValeur;

    if (nouveauTotal > 150) {
      return riza.sendMessage(m.chat, { 
        text: `❌ La somme des stats dépasserait 150. Maximum possible : ${150 - nouveauxAutresStats}`
      });
    }

    riza.ev.off("messages.upsert", reponseListener);

    fiches[target].stats[statNom] = nouvelleValeur.toString();
    fs.writeFileSync(fichesPath, JSON.stringify(fiches, null, 2));

    await riza.sendMessage(m.chat, { 
      text: `✅ ${statNom} modifié avec succès !\n\nNouvelle valeur : ${nouvelleValeur}\nNouveau total : ${nouveauTotal}/150`
    });
  };  

  riza.ev.on("messages.upsert", reponseListener);
}

// Fonction pour modifier les corps
async function modifierCorps(riza, m, target, fiches, ficheExistante) {
  let modificationActive = true;
  let corps = [...ficheExistante.corps]; // Copie du tableau

  const afficherMenuCorps = async () => {
    const menuCorps = `⚔️ *MODIFICATION DES CORPS*

═════════════════
Corps actuels :
1️⃣ ${corps[0] || "(vide)"}
2️⃣ ${corps[1] || "(vide)"}
3️⃣ ${corps[2] || "(vide)"}

Options :
• Tapez le *numéro* (1-3) pour modifier un emplacement
• Tapez "supprimer X" pour vider un emplacement
• Tapez "terminer" pour sauvegarder`;

    await riza.sendMessage(m.chat, { text: menuCorps });
  };

  await afficherMenuCorps();

  const corpsListener = async ({ messages }) => {  
    if (!modificationActive) return;

    const msg = messages[0];  
    if (!msg.message) return;  

    const from = msg.key.participant || msg.key.remoteJid;  
    if (from !== m.sender) return;

    const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
    const commande = content.trim().toLowerCase();  

    if (commande === "terminer") {
      modificationActive = false;
      riza.ev.off("messages.upsert", corpsListener);
      
      fiches[target].corps = corps;
      fs.writeFileSync(fichesPath, JSON.stringify(fiches, null, 2));

      return riza.sendMessage(m.chat, { 
        text: "✅ Corps modifiés avec succès !"
      });
    }

    if (commande.startsWith("supprimer ")) {
      const numero = parseInt(commande.split(" ")[1]);
      if (numero >= 1 && numero <= 3) {
        corps[numero - 1] = "";
        await riza.sendMessage(m.chat, { 
          text: `✅ Emplacement ${numero} vidé.`
        });
        await afficherMenuCorps();
      }
      return;
    }

    const numeroEmplacement = parseInt(commande);
    if (numeroEmplacement >= 1 && numeroEmplacement <= 3) {
      await riza.sendMessage(m.chat, { 
        text: `✍️ Entrez le nouveau corps pour l'emplacement ${numeroEmplacement} :\n\nActuel : "${corps[numeroEmplacement - 1] || "(vide)"}"`
      });

      const reponseListener = async ({ messages }) => {  
        const msgReponse = messages[0];  
        if (!msgReponse.message) return;  

        const fromReponse = msgReponse.key.participant || msgReponse.key.remoteJid;  
        if (fromReponse !== m.sender) return;

        const contentReponse = msgReponse.message.conversation || msgReponse.message.extendedTextMessage?.text || "";  
        const nouveauCorps = contentReponse.trim();  

        riza.ev.off("messages.upsert", reponseListener);

        corps[numeroEmplacement - 1] = nouveauCorps;
        
        await riza.sendMessage(m.chat, { 
          text: `✅ Emplacement ${numeroEmplacement} modifié !`
        });
        await afficherMenuCorps();
      };  

      riza.ev.on("messages.upsert", reponseListener);
    }
  };  

  riza.ev.on("messages.upsert", corpsListener);
}

// Fonction pour modifier les sorts (similaire aux corps)
async function modifierSorts(riza, m, target, fiches, ficheExistante) {
  let modificationActive = true;
  let sorts = [...ficheExistante.sorts];

  const afficherMenuSorts = async () => {
    const menuSorts = `🔮 *MODIFICATION DES SORTS*

═════════════════
Sorts actuels :
1️⃣ ${sorts[0] || "(vide)"}
2️⃣ ${sorts[1] || "(vide)"}
3️⃣ ${sorts[2] || "(vide)"}

Options :
• Tapez le *numéro* (1-3) pour modifier un emplacement
• Tapez "supprimer X" pour vider un emplacement
• Tapez "terminer" pour sauvegarder`;

    await riza.sendMessage(m.chat, { text: menuSorts });
  };

  await afficherMenuSorts();

  const sortsListener = async ({ messages }) => {  
    if (!modificationActive) return;

    const msg = messages[0];  
    if (!msg.message) return;  

    const from = msg.key.participant || msg.key.remoteJid;  
    if (from !== m.sender) return;

    const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
    const commande = content.trim().toLowerCase();  

    if (commande === "terminer") {
      modificationActive = false;
      riza.ev.off("messages.upsert", sortsListener);
      
      fiches[target].sorts = sorts;
      fs.writeFileSync(fichesPath, JSON.stringify(fiches, null, 2));

      return riza.sendMessage(m.chat, { 
        text: "✅ Sorts modifiés avec succès !"
      });
    }

    if (commande.startsWith("supprimer ")) {
      const numero = parseInt(commande.split(" ")[1]);
      if (numero >= 1 && numero <= 3) {
        sorts[numero - 1] = "";
        await riza.sendMessage(m.chat, { 
          text: `✅ Emplacement ${numero} vidé.`
        });
        await afficherMenuSorts();
      }
      return;
    }

    const numeroEmplacement = parseInt(commande);
    if (numeroEmplacement >= 1 && numeroEmplacement <= 3) {
      await riza.sendMessage(m.chat, { 
        text: `✍️ Entrez le nouveau sort pour l'emplacement ${numeroEmplacement} :\n\nActuel : "${sorts[numeroEmplacement - 1] || "(vide)"}"`
      });

      const reponseListener = async ({ messages }) => {  
        const msgReponse = messages[0];  
        if (!msgReponse.message) return;  

        const fromReponse = msgReponse.key.participant || msgReponse.key.remoteJid;  
        if (fromReponse !== m.sender) return;

        const contentReponse = msgReponse.message.conversation || msgReponse.message.extendedTextMessage?.text || "";  
        const nouveauSort = contentReponse.trim();  

        riza.ev.off("messages.upsert", reponseListener);

        sorts[numeroEmplacement - 1] = nouveauSort;
        
        await riza.sendMessage(m.chat, { 
          text: `✅ Emplacement ${numeroEmplacement} modifié !`
        });
        await afficherMenuSorts();
      };  

      riza.ev.on("messages.upsert", reponseListener);
    }
  };  

  riza.ev.on("messages.upsert", sortsListener);
}

// Fonction pour réinitialiser les stats
async function reinitialiserStats(riza, m, target, fiches, ficheExistante) {
  await riza.sendMessage(m.chat, { 
    text: `⚠️ *RÉINITIALISATION DES STATS*

Êtes-vous sûr de vouloir réinitialiser toutes les stats à 0 ?
Cela remettra : Force=0, Esprit=0, Pouvoir=0

Tapez "OUI" pour confirmer ou "NON" pour annuler.`
  });

  const confirmationListener = async ({ messages }) => {  
    const msg = messages[0];  
    if (!msg.message) return;  

    const from = msg.key.participant || msg.key.remoteJid;  
    if (from !== m.sender) return;

    const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
    const confirmation = content.trim().toUpperCase();  

    riza.ev.off("messages.upsert", confirmationListener);

    if (confirmation === "OUI") {
      fiches[target].stats = {
        force: "0",
        esprit: "0",
        pouvoir: "0"
      };
      fs.writeFileSync(fichesPath, JSON.stringify(fiches, null, 2));

      await riza.sendMessage(m.chat, { 
        text: "✅ Stats réinitialisées avec succès ! Toutes les stats sont maintenant à 0."
      });
    } else {
      await riza.sendMessage(m.chat, { 
        text: "❌ Réinitialisation annulée."
      });
    }
  };  

  riza.ev.on("messages.upsert", confirmationListener);
}