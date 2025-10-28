const fs = require("fs");
const path = require("path");

const fichesPath = path.join(__dirname, "..", "data", "fiches.json");
const socialPath = path.join(__dirname, "..", "data", "social.json");

if (!fs.existsSync(fichesPath)) fs.writeFileSync(fichesPath, JSON.stringify({}, null, 2));
if (!fs.existsSync(socialPath)) fs.writeFileSync(socialPath, JSON.stringify({}, null, 2));

function validerFaction(factionReponse) {
  const factionsValides = ["hermès", "hecate", "arès", "atlas", "hermes", "hecaté", "ares", "hécates", "hécate"];
  const factionLower = factionReponse.toLowerCase();
  
  if (!factionsValides.includes(factionLower)) {
    return { valide: false, faction: null };
  }
  
  if (factionLower.includes("herm")) return { valide: true, faction: "Hermès" };
  if (factionLower.includes("hecat") || factionLower.includes("hécat")) return { valide: true, faction: "Hécates" };
  if (factionLower.includes("arès") || factionLower.includes("ares")) return { valide: true, faction: "Arès" };
  if (factionLower.includes("atlas")) return { valide: true, faction: "Atlas" };
  
  return { valide: false, faction: null };
}

module.exports = {
  name: "modifiche",
  category: "Unirolist",
  description: "Modifie la fiche d'un joueur",
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
    
    if (!fiches[target]) {
      return riza.sendMessage(m.chat, {  
        text: "❌ Cette personne n'est pas encore enregistrée. Utilisez la commande 'enregistrer' pour créer sa fiche."  
      }, { quoted: m });  
    }

    const fiche = fiches[target];
    const adminId = m.sender;

    // Afficher la fiche actuelle
    const recapActuel = `📋 *FICHE ACTUELLE* - @${target.split("@")[0]}

👤 *Pseudonyme* : ${fiche.pseudo}
📱 *Téléphone* : ${fiche.tel}
🏳️ *Faction* : ${fiche.faction}

💪 *Stats* :
   • Force : ${fiche.stats.force}
   • Esprit : ${fiche.stats.esprit}
   • Pouvoir : ${fiche.stats.pouvoir}

🎽 *Équipement de corps* :
   1️⃣: ${fiche.corps[0] || "(vide)"}
   2️⃣: ${fiche.corps[1] || "(vide)"}
   3️⃣: ${fiche.corps[2] || "(vide)"}

🔮 *Sorts* :
   1️⃣: ${fiche.sorts[0] || "(vide)"}
   2️⃣: ${fiche.sorts[1] || "(vide)"}
   3️⃣: ${fiche.sorts[2] || "(vide)"}

🃏 *Cartes* :
   1️⃣: ${fiche.cartes[0] || "(vide)"}
   2️⃣: ${fiche.cartes[1] || "(vide)"}
   3️⃣: ${fiche.cartes[2] || "(vide)"}

━━━━━━━━━━━━━━━━━━━━
Choisissez ce que vous voulez modifier :

1. Pseudonyme
2. Téléphone
3. Faction
4. Stats (Force, Esprit, Pouvoir)
5. Équipement de corps
6. Sorts
7. Cartes

Répondez avec le *numéro* correspondant.`;

    await riza.sendMessage(m.chat, { 
      text: recapActuel,
      mentions: [target]
    }, { quoted: m });

    let etape = "choix_categorie";
    let categorie = "";
    let sousEtape = 0;
    const modifications = {};

    const listener = async ({ messages }) => {  
      const msg = messages[0];  
      if (!msg.message) return;  

      const from = msg.key.participant || msg.key.remoteJid;  
      if (from !== adminId) return;  

      const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";  
      if (!content) return;  

      const reponse = content.trim();

      try {
        if (etape === "choix_categorie") {
          const choix = parseInt(reponse);
          if (isNaN(choix) || choix < 1 || choix > 7) {
            await riza.sendMessage(m.chat, { 
              text: "❌ Choix invalide. Veuillez répondre avec un nombre entre 1 et 7."
            });
            return;
          }

          const categories = {
            1: "pseudo",
            2: "tel", 
            3: "faction",
            4: "stats",
            5: "corps",
            6: "sorts",
            7: "cartes"
          };

          categorie = categories[choix];
          
          switch(categorie) {
            case "pseudo":
              await riza.sendMessage(m.chat, { 
                text: "✍️ Entrez le nouveau *pseudonyme* :"
              }, { quoted: msg });
              etape = "modification_simple";
              break;

            case "tel":
              await riza.sendMessage(m.chat, { 
                text: "📱 Entrez le nouveau *numéro de téléphone* :"
              }, { quoted: msg });
              etape = "modification_simple";
              break;

            case "faction":
              await riza.sendMessage(m.chat, { 
                text: "🏳️ Entrez la nouvelle *faction* :\n\nChoix disponibles :\n• Hermès\n• Hécates\n• Arès\n• Atlas"
              }, { quoted: msg });
              etape = "modification_faction";
              break;

            case "stats":
              await riza.sendMessage(m.chat, { 
                text: `💪 Entrez la nouvelle *force physique* :\n\nStat actuelle : ${fiche.stats.force}\n(La somme des 3 stats doit faire 150)`
              }, { quoted: msg });
              etape = "modification_stats";
              sousEtape = 1;
              break;

            case "corps":
              await riza.sendMessage(m.chat, { 
                text: `🎽 Modification de l'*équipement de corps* :\n\n1️⃣: ${fiche.corps[0] || "(vide)"}\n2️⃣: ${fiche.corps[1] || "(vide)"}\n3️⃣: ${fiche.corps[2] || "(vide)"}\n\nRépondez avec le numéro de l'emplacement à modifier (1-3) :`
              }, { quoted: msg });
              etape = "choix_emplacement_corps";
              break;

            case "sorts":
              await riza.sendMessage(m.chat, { 
                text: `🔮 Modification des *sorts* :\n\n1️⃣: ${fiche.sorts[0] || "(vide)"}\n2️⃣: ${fiche.sorts[1] || "(vide)"}\n3️⃣: ${fiche.sorts[2] || "(vide)"}\n\nRépondez avec le numéro de l'emplacement à modifier (1-3) :`
              }, { quoted: msg });
              etape = "choix_emplacement_sorts";
              break;

            case "cartes":
              await riza.sendMessage(m.chat, { 
                text: `🃏 Modification des *cartes* :\n\n1️⃣: ${fiche.cartes[0] || "(vide)"}\n2️⃣: ${fiche.cartes[1] || "(vide)"}\n3️⃣: ${fiche.cartes[2] || "(vide)"}\n\nRépondez avec le numéro de l'emplacement à modifier (1-3) :`
              }, { quoted: msg });
              etape = "choix_emplacement_cartes";
              break;
          }

        } else if (etape === "modification_simple") {
          modifications[categorie] = reponse;
          await confirmerModification(msg);

        } else if (etape === "modification_faction") {
          const validationFaction = validerFaction(reponse);
          if (!validationFaction.valide) {
            await riza.sendMessage(m.chat, { 
              text: "❌ Faction invalide. Les factions disponibles sont : Hermès, Hécates, Arès, Atlas. Veuillez réessayer :"
            }, { quoted: msg });
            return;
          }
          modifications.faction = validationFaction.faction;
          await confirmerModification(msg);

        } else if (etape === "modification_stats") {
          const valeur = parseInt(reponse);
          if (isNaN(valeur) || valeur < 0) {
            await riza.sendMessage(m.chat, { 
              text: "❌ Valeur invalide. Veuillez entrer un nombre positif :"
            }, { quoted: msg });
            return;
          }

          if (sousEtape === 1) {
            modifications.force = valeur;
            const reste = 150 - valeur;
            await riza.sendMessage(m.chat, { 
              text: `🧠 Entrez le nouvel *esprit* :\n\nStat actuelle : ${fiche.stats.esprit}\n(Reste : ${reste})`
            }, { quoted: msg });
            sousEtape = 2;
          } else if (sousEtape === 2) {
            modifications.esprit = valeur;
            const force = modifications.force || parseInt(fiche.stats.force);
            const reste = 150 - force - valeur;
            await riza.sendMessage(m.chat, { 
              text: `🌀 Entrez le nouveau *pouvoir* :\n\nStat actuelle : ${fiche.stats.pouvoir}\n(Reste : ${reste})`
            }, { quoted: msg });
            sousEtape = 3;
          } else if (sousEtape === 3) {
            modifications.pouvoir = valeur;
            
            // Vérification de la somme
            const force = modifications.force || parseInt(fiche.stats.force);
            const esprit = modifications.esprit || parseInt(fiche.stats.esprit);
            const pouvoir = modifications.pouvoir || parseInt(fiche.stats.pouvoir);
            const total = force + esprit + pouvoir;

            if (total !== 150) {
              await riza.sendMessage(m.chat, { 
                text: `❌ La somme des stats (${total}) ne fait pas 150. Veuillez recommencer la modification des stats.`
              }, { quoted: msg });
              etape = "choix_categorie";
              return await redemarrerModification(msg);
            }

            await confirmerModification(msg);
          }

        } else if (etape.startsWith("choix_emplacement_")) {
          const choix = parseInt(reponse);
          if (isNaN(choix) || choix < 1 || choix > 3) {
            await riza.sendMessage(m.chat, { 
              text: "❌ Choix invalide. Veuillez répondre avec un nombre entre 1 et 3."
            }, { quoted: msg });
            return;
          }

          const type = etape.replace("choix_emplacement_", "");
          modifications.emplacement = choix - 1;
          modifications.type = type;

          const valeurActuelle = fiche[type][choix - 1] || "(vide)";
          await riza.sendMessage(m.chat, { 
            text: `Entrez la nouvelle valeur pour l'emplacement ${choix} :\n\nValeur actuelle : ${valeurActuelle}\n\n(Entrez "vide" pour vider l'emplacement)`
          }, { quoted: msg });
          etape = "modification_emplacement";

        } else if (etape === "modification_emplacement") {
          const valeur = reponse.toLowerCase() === "vide" ? "" : reponse;
          modifications[modifications.type] = fiche[modifications.type].map((item, index) => 
            index === modifications.emplacement ? valeur : item
          );
          await confirmerModification(msg);

        } else if (etape === "confirmation") {
          if (reponse.toLowerCase() === "oui") {
            // Appliquer les modifications
            if (modifications.pseudo) fiche.pseudo = modifications.pseudo;
            if (modifications.tel) fiche.tel = modifications.tel;
            if (modifications.faction) fiche.faction = modifications.faction;
            
            if (modifications.force || modifications.esprit || modifications.pouvoir) {
              fiche.stats = {
                force: modifications.force?.toString() || fiche.stats.force,
                esprit: modifications.esprit?.toString() || fiche.stats.esprit,
                pouvoir: modifications.pouvoir?.toString() || fiche.stats.pouvoir
              };
            }
            
            if (modifications.corps) fiche.corps = modifications.corps;
            if (modifications.sorts) fiche.sorts = modifications.sorts;
            if (modifications.cartes) fiche.cartes = modifications.cartes;

            // Mettre à jour le fichier
            fiches[target] = fiche;
            fs.writeFileSync(fichesPath, JSON.stringify(fiches, null, 2));

            // Mettre à jour la fiche sociale si le pseudo ou la faction a changé
            if (modifications.pseudo || modifications.faction) {
              const socials = JSON.parse(fs.readFileSync(socialPath));
              if (socials[target]) {
                if (modifications.pseudo) socials[target].nom = modifications.pseudo;
                if (modifications.faction) socials[target].faction = modifications.faction;
                fs.writeFileSync(socialPath, JSON.stringify(socials, null, 2));
              }
            }

            riza.ev.off("messages.upsert", listener);
            await riza.sendMessage(m.chat, { 
              text: `✅ Fiche de @${target.split("@")[0]} modifiée avec succès !`,
              mentions: [target]
            });

          } else if (reponse.toLowerCase() === "non") {
            riza.ev.off("messages.upsert", listener);
            await riza.sendMessage(m.chat, { 
              text: "❌ Modification annulée."
            });
          } else {
            await riza.sendMessage(m.chat, { 
              text: "❌ Réponse invalide. Répondez par *oui* ou *non* :"
            }, { quoted: msg });
          }
        }

      } catch (error) {
        console.error(error);
        await riza.sendMessage(m.chat, { 
          text: "❌ Une erreur s'est produite lors de la modification."
        });
      }
    };

    riza.ev.on("messages.upsert", listener);

    async function confirmerModification(msg) {
      let resume = "📝 *RÉSUMÉ DES MODIFICATIONS*\n\n";
      
      if (modifications.pseudo) resume += `• Pseudonyme : ${modifications.pseudo}\n`;
      if (modifications.tel) resume += `• Téléphone : ${modifications.tel}\n`;
      if (modifications.faction) resume += `• Faction : ${modifications.faction}\n`;
      if (modifications.force || modifications.esprit || modifications.pouvoir) {
        resume += `• Stats : \n  - Force : ${modifications.force || fiche.stats.force}\n  - Esprit : ${modifications.esprit || fiche.stats.esprit}\n  - Pouvoir : ${modifications.pouvoir || fiche.stats.pouvoir}\n`;
      }
      if (modifications.corps) {
        resume += `• Équipement corps : \n`;
        modifications.corps.forEach((item, index) => {
          resume += `  ${index + 1}️⃣: ${item || "(vide)"}\n`;
        });
      }
      if (modifications.sorts) {
        resume += `• Sorts : \n`;
        modifications.sorts.forEach((item, index) => {
          resume += `  ${index + 1}️⃣: ${item || "(vide)"}\n`;
        });
      }
      if (modifications.cartes) {
        resume += `• Cartes : \n`;
        modifications.cartes.forEach((item, index) => {
          resume += `  ${index + 1}️⃣: ${item || "(vide)"}\n`;
        });
      }

      resume += "\nConfirmez-vous ces modifications ? (oui/non)";
      
      etape = "confirmation";
      await riza.sendMessage(m.chat, { 
        text: resume
      }, { quoted: msg });
    }

    async function redemarrerModification(msg) {
      await riza.sendMessage(m.chat, { 
        text: "🔄 Retour au menu principal de modification.\n\nChoisissez ce que vous voulez modifier :\n\n1. Pseudonyme\n2. Téléphone\n3. Faction\n4. Stats\n5. Équipement de corps\n6. Sorts\n7. Cartes"
      }, { quoted: msg });
      etape = "choix_categorie";
      categorie = "";
      sousEtape = 0;
      modifications = {};
    }
  }
};