const fs = require('fs');
const path = require('path');
const geminiAI = require('../lib/geminiAI');

const COMBAT_FILE = path.join(__dirname, '../data/Combat.txt');
const PHYSIQUE_FILE = path.join(__dirname, '../data/Physique_combat.txt');

module.exports = {
  name: "combat",
  category: "UNIROLIST",
  description: "Guide complet des mécaniques de combat via l'IA",
  allowedForAll: true,

  async execute(riza, m, args) {
    try {
      if (!fs.existsSync(COMBAT_FILE)) {
        return await riza.sendMessage(m.chat, {
          text: "❌ Fichier de combat introuvable."
        }, { quoted: m });
      }

      const combatContent = fs.readFileSync(COMBAT_FILE, 'utf-8');
      let physiqueContent = "";

      if (fs.existsSync(PHYSIQUE_FILE)) {
        physiqueContent = fs.readFileSync(PHYSIQUE_FILE, 'utf-8');
      }

      const query = args.join(' ').toLowerCase();

      let prompt;
      if (query) {
        prompt = `Tu es Mimi, l'assistante IA de UNIROLIST spécialisée dans l'univers Tales of Valoria.

FICHIER DES MÉCANIQUES DE COMBAT :
${combatContent}

${physiqueContent ? `FICHIER DE LA PHYSIQUE DE COMBAT :\n${physiqueContent}\n` : ''}

L'utilisateur pose cette question sur le combat : "${query}"

INSTRUCTIONS :
- Réponds de façon claire et précise à sa question
- Utilise des exemples concrets si nécessaire
- Organise l'information avec des emojis (⚔️, 🛡️, ⚡, 💪, 🔮)
- Si la question concerne plusieurs aspects, structure ta réponse
- Cite les règles exactes du fichier
- Sois pédagogue et concise

Réponds UNIQUEMENT en te basant sur les fichiers fournis.`;
      } else {
        prompt = `Tu es Mimi, l'assistante IA de UNIROLIST spécialisée dans l'univers Tales of Valoria.

FICHIER DES MÉCANIQUES DE COMBAT :
${combatContent}

${physiqueContent ? `FICHIER DE LA PHYSIQUE DE COMBAT :\n${physiqueContent}\n` : ''}

L'utilisateur demande un aperçu du système de combat.

INSTRUCTIONS :
- Présente les concepts principaux du système de combat de Valoria
- Organise l'information par thèmes (Factions, Vitesse, Force, Magie, Armes, États, etc.)
- Utilise des emojis pour rendre l'affichage agréable
- Donne des exemples concrets
- Indique comment obtenir des détails sur un aspect spécifique
- Sois claire mais pas trop longue

Réponds UNIQUEMENT en te basant sur les fichiers fournis.`;
      }

      await riza.sendMessage(m.chat, {
        text: "⚔️ Consultation du guide de combat..."
      }, { quoted: m });

      const response = await geminiAI.generateContent(prompt, {
        temperature: 0.3,
        maxOutputTokens: 3000
      });

      await riza.sendMessage(m.chat, {
        text: response
      }, { quoted: m });

    } catch (error) {
      console.error("❌ Erreur commande combat:", error);
      await riza.sendMessage(m.chat, {
        text: `❌ Erreur lors de la consultation du guide de combat.\n\nUtilisation :\n• \`!combat\` - Aperçu général\n• \`!combat vitesse\` - Info sur un aspect spécifique\n• \`!combat hermès\` - Info sur une faction`
      }, { quoted: m });
    }
  }
};

const factions = {
  "Hermès": {
    description: "Rapides et agiles",
    vitesse_max: "9 m/s",
    coup_max: "7 Rs",
    magie_max: "7 PM",
    bonus: "Spécialistes de la vitesse et précision",
    malus: "-10% sur toutes les Rs finales"
  },
  "Atlas": {
    description: "Experts en destruction",
    vitesse_max: "7 m/s",
    coup_max: "9 Rs",
    magie_max: "7 PM",
    bonus: "+15% sur toutes les Rs finales",
    malus: "Vitesse réduite"
  },
  "Hécate": {
    description: "Maîtres de la magie et des invocations",
    vitesse_max: "7 m/s",
    coup_max: "7 Rs",
    magie_max: "9 PM",
    bonus: "Manipulation magique avancée",
    malus: "Corps-à-corps limité"
  },
  "Arès": {
    description: "Polyvalents, sans avantage particulier",
    vitesse_max: "8 m/s",
    coup_max: "8 Rs",
    magie_max: "8 PM",
    bonus: "Équilibrés dans tous les domaines",
    malus: "Aucun"
  }
};

const armesTypes = {
  "Contondantes": {
    exemples: "Masses, Marteaux",
    effets: [
      "Effet 'Écrasement' : +20% dégâts de percussion",
      "Provoquent facilement projections",
      "Tests d'étourdissement favorisés"
    ]
  },
  "Tranchantes": {
    exemples: "Épées, Haches",
    effets: [
      "Pénétration d'Armure selon grade",
      "Effet 'Saignement' : -5% PV au tour suivant",
      "Effet 'Hémorragie' : après 3 saignements"
    ],
    penetration: {
      "E [1-5 Rs]": "10%",
      "D [6-15 Rs]": "25%",
      "C [16-25 Rs]": "40%",
      "B [26-35 Rs]": "60%",
      "A [36-45 Rs]": "80%",
      "S [46-100 Rs]": "100%"
    }
  },
  "Perforantes": {
    exemples: "Lances, Dagues, Projectiles",
    effets: [
      "Condition : Force > Rs_Zone × 0.10",
      "Perforation si Force > Rs_Zone",
      "Implantation si Force = Rs_Zone",
      "Rupture si Force < Rs_Zone"
    ]
  }
};

module.exports = {
  name: "combat",
  category: "UNIROLIST",
  description: "Guide complet des mécaniques de combat de Valoria",
  allowedForAll: true,

  async execute(riza, m, args) {
    let lastMessage = null;
    let currentStep = "menu_principal";
    let sessionActive = true;

    const showMenuPrincipal = async (quotedMsg = m) => {
      if (!sessionActive) return;

      const menuText = `⚔️ *GUIDE DE COMBAT VALORIA* ⚔️
══════════════════
1. 🎭 Les Factions
2. ⚡ Vitesse & Réaction
3. 💪 Force & Résistance
4. 🔮 Magie
5. 🗡️ Types d'Armes
6. 🛡️ Équipement Zonal
7. 🌟 L'Éveil
8. ⚠️ États Spéciaux
9. 📜 Règles de Duel
10. ❌ Quitter
══════════════════
*Choisis une section (1-10) :*`;

      const menuMessage = await riza.sendMessage(m.chat, { text: menuText }, { quoted: quotedMsg });
      lastMessage = menuMessage;
      currentStep = "menu_principal";
    };

    const showFactions = async (quotedMsg) => {
      let text = `🎭 *LES FACTIONS DE VALORIA*\n══════════════════\n\n`;

      Object.keys(factions).forEach((nom, index) => {
        const f = factions[nom];
        text += `*${index + 1}. ${nom}* - ${f.description}\n`;
        text += `   ⚡ Vitesse max : ${f.vitesse_max}\n`;
        text += `   💪 Coup max : ${f.coup_max}\n`;
        text += `   🔮 Magie max : ${f.magie_max}\n`;
        text += `   ✅ Bonus : ${f.bonus}\n`;
        text += `   ⚠️ ${f.malus}\n\n`;
      });

      text += `══════════════════\n*0.* ↩️ Retour`;

      const message = await riza.sendMessage(m.chat, { text: text }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "factions";
    };

    const showVitesse = async (quotedMsg) => {
      const text = `⚡ *VITESSE & TEMPS DE RÉACTION*
══════════════════

📊 *Tableau des Vitesses :*

| Faction | V max | Conso |
|---------|-------|-------|
| Hermès  | 9 m/s | 9 Pf  |
| Arès    | 8 m/s | 8 Pf  |
| Hécate  | 7 m/s | 7 Pf  |
| Atlas   | 7 m/s | 7 Pf  |

⏱️ *Temps de Réaction :*

9 m/s → 0,2 s
8 m/s → 0,3 s
7 m/s → 0,4 s
6 m/s → 0,5 s
5 m/s → 0,6 s

💡 Plus votre vitesse est élevée, plus votre temps de réaction est court.

🎯 *Esquive :*
Réussite si :
Temps_Réaction + Temps_Mouvement < Temps_Impact

⚠️ Pénalité si "En Action" (doublée sauf Hermès en Éveil)

══════════════════
*0.* ↩️ Retour`;

      const message = await riza.sendMessage(m.chat, { text: text }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "vitesse";
    };

    const showForce = async (quotedMsg) => {
      const text = `💪 *FORCE & RÉSISTANCE*
══════════════════

📊 *Tableau des Coups :*

| Faction | Coup max | Conso |
|---------|----------|-------|
| Atlas   | 9 Rs     | 9 Pf  |
| Arès    | 8 Rs     | 8 Pf  |
| Hécate  | 7 Rs     | 7 Pf  |
| Hermès  | 7 Rs     | 7 Pf  |

🛡️ *Résistance par Zone :*

• Torse : 35% de Force max
• Tête : 20%
• Chaque Jambe : 15%
• Chaque Bras : 7.5%

🎯 *Modificateurs de Faction :*
• Atlas : +15% sur toutes Rs
• Hermès : -10% sur toutes Rs

⚔️ *Interactions Corps vs Corps :*

• Force > Rs_Zone : Coup Critique
  → Dégâts aux PV
  → Test d'étourdissement possible

• Force = Rs_Zone : Parade
  → Pas de dégâts PV
  → Rs_Zone baisse de 1
  → Les deux perdent la Force utilisée

• Force < Rs_Zone : Coup Faible
  → Dégâts de recul à l'attaquant
  → Perte d'Esprit

══════════════════
*0.* ↩️ Retour`;

      const message = await riza.sendMessage(m.chat, { text: text }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "force";
    };

    const showMagie = async (quotedMsg) => {
      const text = `🔮 *LA MAGIE*
══════════════════

📊 *Tableau de la Magie :*

| Faction | Magie max | Conso |
|---------|-----------|-------|
| Hécate  | 9 PM      | 9 PM  |
| Arès    | 8 PM      | 8 PM  |
| Atlas   | 7 PM      | 7 PM  |
| Hermès  | 7 PM      | 7 PM  |

✨ *Fonctionnement :*

• Chaque sort coûte des Points de Magie (PM)
• Portée = Puissance du sort en mètres
• Hécate : Spécialiste de la magie

💫 *Exemple :*
Un sort de 7 Rs aura une portée de 7 mètres

⚠️ *Restrictions :*
• Sorts prédéfinis par les Runes
• Limites par faction

══════════════════
*0.* ↩️ Retour`;

      const message = await riza.sendMessage(m.chat, { text: text }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "magie";
    };

    const showArmes = async (quotedMsg) => {
      let text = `🗡️ *TYPES D'ARMES*\n══════════════════\n\n`;

      Object.keys(armesTypes).forEach((type) => {
        const arme = armesTypes[type];
        text += `*${type}*\n`;
        text += `📌 Exemples : ${arme.exemples}\n\n`;
        text += `⚙️ Effets :\n`;
        arme.effets.forEach(effet => {
          text += `  • ${effet}\n`;
        });

        if (arme.penetration) {
          text += `\n🎯 Pénétration d'Armure :\n`;
          Object.keys(arme.penetration).forEach(grade => {
            text += `  • Grade ${grade} : ${arme.penetration[grade]}\n`;
          });
        }
        text += `\n`;
      });

      text += `══════════════════\n*0.* ↩️ Retour`;

      const message = await riza.sendMessage(m.chat, { text: text }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "armes";
    };

    const showEquipement = async (quotedMsg) => {
      const text = `🛡️ *ÉQUIPEMENT ZONAL*
══════════════════

📦 *5 Emplacements :*

1. Tête (Casques)
2. Torse (Plastrons)
3. Bras (Brassards)
4. Jambes (Jambières)
5. Pieds (Bottes)

🔢 *Calcul de Rs Totale :*
Rs_Totale = Rs_Base + Rs_Équipement

⚙️ *Durabilité :*
• La Rs de l'équipement = ses PV
• L'équipement s'use au lieu du personnage
• Parade : -1 Rs d'usure
• Rs ≤ 0 : Équipement brisé

💥 *Destruction :*
Quand un équipement se brise :
• Retiré instantanément
• Rs_Totale retombe à Rs_Base
• Crée une faille en combat

🎯 *Stratégie :*
• Protéger les zones vulnérables
• Cibler les zones non équipées
• Gérer la durabilité

══════════════════
*0.* ↩️ Retour`;

      const message = await riza.sendMessage(m.chat, { text: text }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "equipement";
    };

    const showEveil = async (quotedMsg) => {
      const text = `🌟 *L'ÉVEIL*
══════════════════

⏰ *Activation :*
• Début du 3ème tour
• Durée : 2 tours (tours 3 et 4)

✨ *Effets par Faction :*

⚒️ *Atlas :*
• Coup max → 11 PF
• Double l'usure des armes en parade

⚡ *Hermès :*
• +2 m/s en Vitesse
• 1ère esquive/tour ignore pénalité d'action

⚔️ *Arès :*
• Régénère 25% des PF perdus
• Rs_Zone stable (pas de baisse en parade)

🔮 *Hécate :*
• Coût des sorts -2 PM
• Sorts offensifs drainent 5% Esprit cible

💫 *Stratégie :*
L'Éveil peut renverser un combat !

══════════════════
*0.* ↩️ Retour`;

      const message = await riza.sendMessage(m.chat, { text: text }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "eveil";
    };

    const showEtats = async (quotedMsg) => {
      const text = `⚠️ *ÉTATS SPÉCIAUX*
══════════════════

😵 *Étourdissement :*

Déclencheurs :
• Coup au point sensible : 50%+ chance
• 3 coups critiques : automatique
• Si Esprit ≤ 20 : chances doublées

Points Sensibles :
• Crâne (tempes)
• Gorge
• Plexus solaire
• Seins (femmes)
• Genoux, Côtes
• Poignets, Chevilles
• Appareil reproducteur

🩸 *Saignement :*
• Armes tranchantes
• -5% PV max au tour suivant
• 3 saignements → Hémorragie

💀 *Hémorragie :*
• -10% PV actuels à chaque action
• Permanent jusqu'à fin de combat
• Ne peut être soigné

😨 *La Peur :*
• Si Esprit ≤ 10%
• Toutes offensives à 20% efficacité
• Désir de survivre

💥 *Dégâts de Percussion :*
• Projection contre surface
• 50% de la Rs de la structure
• Minimum : 5 m/s et 7 Rs

══════════════════
*0.* ↩️ Retour`;

      const message = await riza.sendMessage(m.chat, { text: text }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "etats";
    };

    const showRegles = async (quotedMsg) => {
      const text = `📜 *RÈGLES DE DUEL*
══════════════════

🎯 *Prémices :*
• Accord des deux parties
• Distance initiale : 15 mètres
• Joueur 1 commence
• 2 pavés = 1 tour de jeu
• Max : 6 tours (avec pavé J2)

⏱️ *Latence :*
• 6 minutes de rédaction
• +2 minutes relecture
• Total : 8 minutes/pavé

🚫 *INTERDICTIONS FORMELLES :*

❌ *Godmoding :*
Forcer le jeu ou contrôler l'adversaire

❌ *Metagaming :*
Utiliser infos hors portée

❌ *Time's up :*
Dépasser 8 minutes = immobile
→ Subit les assauts

⚖️ *Sanctions :*
• Perte de points/Ruliths
• Exclusion temporaire
• Exclusion définitive (grave)

══════════════════
*0.* ↩️ Retour`;

      const message = await riza.sendMessage(m.chat, { text: text }, { quoted: quotedMsg });
      lastMessage = message;
      currentStep = "regles";
    };

    const listener = async ({ messages }) => {
      if (!sessionActive) return;

      const msg = messages[0];
      if (!msg.message) return;

      const from = msg.key.participant || msg.key.remoteJid;
      if (from !== m.sender) return;

      const context = msg.message?.extendedTextMessage?.contextInfo;
      if (!context || context.stanzaId !== lastMessage?.key?.id) return;

      const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      const reponse = content.trim().toLowerCase();

      try {
        if (currentStep === "menu_principal") {
          switch(reponse) {
            case "1": await showFactions(msg); break;
            case "2": await showVitesse(msg); break;
            case "3": await showForce(msg); break;
            case "4": await showMagie(msg); break;
            case "5": await showArmes(msg); break;
            case "6": await showEquipement(msg); break;
            case "7": await showEveil(msg); break;
            case "8": await showEtats(msg); break;
            case "9": await showRegles(msg); break;
            case "10":
              sessionActive = false;
              riza.ev.off("messages.upsert", listener);
              await riza.sendMessage(m.chat, { text: "👋 Bon combat !" }, { quoted: msg });
              break;
            default:
              await showMenuPrincipal(msg);
          }
        } else {
          if (reponse === "0") {
            await showMenuPrincipal(msg);
          } else {
            await showMenuPrincipal(msg);
          }
        }
      } catch (error) {
        console.error("Erreur combat:", error);
        await riza.sendMessage(m.chat, { text: "❌ Erreur, retour au menu." }, { quoted: msg });
        await showMenuPrincipal(msg);
      }
    };

    riza.ev.on("messages.upsert", listener);
    await showMenuPrincipal();
  }
};
