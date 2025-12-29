const fs = require("fs");
const path = require("path");

const MATCHS_PATH = path.join(__dirname, "../data/matchs.json");
const PARIS_PATH = path.join(__dirname, "../data/paris.json");
const ARGENT_PATH = path.join(__dirname, "../data/banque.json");

// Charger les données
function loadMatchs() {
    if (!fs.existsSync(MATCHS_PATH)) {
        fs.writeFileSync(MATCHS_PATH, JSON.stringify({ actifs: [], termines: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(MATCHS_PATH, "utf-8"));
}

function saveMatchs(data) {
    fs.writeFileSync(MATCHS_PATH, JSON.stringify(data, null, 2));
}

function loadParis() {
    if (!fs.existsSync(PARIS_PATH)) {
        fs.writeFileSync(PARIS_PATH, JSON.stringify({ matchs: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(PARIS_PATH, "utf-8"));
}

function saveParis(data) {
    fs.writeFileSync(PARIS_PATH, JSON.stringify(data, null, 2));
}

function loadArgent() {
    if (!fs.existsSync(ARGENT_PATH)) {
        fs.writeFileSync(ARGENT_PATH, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(ARGENT_PATH, "utf-8"));
}

function saveArgent(data) {
    fs.writeFileSync(ARGENT_PATH, JSON.stringify(data, null, 2));
}

// Générer un ID unique
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

module.exports = {
    name: "pronostics",
    category: "UNIROLIST",
    description: "Administration des paris - Créer/gérer/matchs et désigner les gagnants",
    onlyAdmin: true,
    keywords: ["pronostics", "parisadmin"],

    async execute(riza, m, args) {
        const jid = m.sender;
        
        let sessionActive = true;
        let currentStep = "menu_principal";
        let selectedMatch = null;
        let lastMessage = null;
        let creationData = {};

        // Menu principal admin
        const showMenuAdmin = async (quotedMsg = m) => {
            const matchs = loadMatchs();
            
            const menuText = `⚙️ *ADMINISTRATION DES PARIS* ⚙️
═══════════════════
📊 *Statistiques :*
🏆 Matchs actifs : ${matchs.actifs.length}
✅ Matchs terminés : ${matchs.termines.length}

═══════════════════
1. 🆕 Créer un nouveau match
2. 📋 Lister les matchs actifs
3. 🏁 Désigner un gagnant
4. 📊 Voir les paris d'un match
5. ❌ Annuler un match
6. 🔄 Retour au menu principal
7. 🚪 Quitter l'admin

═══════════════════
*Choisis une option (1-7) :*`;

            const menuMessage = await riza.sendMessage(m.chat, { text: menuText }, { quoted: quotedMsg });
            lastMessage = menuMessage;
            currentStep = "menu_principal";
        };

        // Créer un nouveau match avec questions interactives
        const creerNouveauMatch = async (quotedMsg) => {
            creationData = {};
            
            const askEquipe1 = async () => {
                const questionText = `🆕 *CRÉATION D'UN NOUVEAU MATCH* 🆕
════════════════════
*Étape 1/10 : Première équipe/joueur*

🔵 Entrez le nom de la première équipe ou joueur :
*Exemples :*
• Togo
• Real Madrid
• Joueur1 (pour un duel)
• Quête du Dragon
════════════════════
*Tapez \`annuler\` pour abandonner*`;

                const message = await riza.sendMessage(m.chat, { text: questionText }, { quoted: quotedMsg });
                lastMessage = message;
                currentStep = "creation_equipe1";
            };

            await askEquipe1();
        };

        // Lister les matchs actifs
        const listerMatchsActifs = async (quotedMsg) => {
            const matchs = loadMatchs();
            
            if (matchs.actifs.length === 0) {
                await riza.sendMessage(m.chat, {
                    text: "📭 *AUCUN MATCH ACTIF*\n\nIl n'y a pas de matchs actifs pour le moment."
                }, { quoted: quotedMsg });
                return showMenuAdmin(quotedMsg);
            }

            let matchsText = `📋 *MATCHS ACTIFS* 📋\n══════════════════\n\n`;
            
            matchs.actifs.forEach((match, index) => {
                const paris = loadParis();
                const matchParis = paris.matchs.find(p => p.matchId === match.id);
                const nbParis = matchParis ? Object.keys(matchParis.parieurs).length : 0;
                const totalMises = matchParis ? Object.values(matchParis.parieurs).reduce((sum, p) => sum + p.montant, 0) : 0;
                
                matchsText += `*${index + 1}.* ${match.equipe1} 🆚 ${match.equipe2}\n`;
                matchsText += `   🆔 ID : ${match.id}\n`;
                matchsText += `   📅 ${match.date} à ${match.heureLimite}\n`;
                matchsText += `   🎯 Cotes : ${match.cote1}/${match.coteNul || "N/A"}/${match.cote2}\n`;
                matchsText += `   👥 Paris : ${nbParis} joueurs (${totalMises} 💎)\n\n`;
            });

            matchsText += `══════════════════\n`;
            matchsText += `*Entrez le numéro pour plus d'options (1-${matchs.actifs.length}) :*\n`;
            matchsText += `*Ou tapez* \`0\` *pour revenir*`;

            const message = await riza.sendMessage(m.chat, { text: matchsText }, { quoted: quotedMsg });
            lastMessage = message;
            currentStep = "selection_match_admin";
        };

        // Voir les détails d'un match (admin)
        const showDetailsMatchAdmin = async (match, quotedMsg) => {
            const paris = loadParis();
            const matchParis = paris.matchs.find(p => p.matchId === match.id) || { parieurs: {} };
            
            let detailsText = `📊 *DÉTAILS DU MATCH* 📊\n`;
            detailsText += `══════════════════\n`;
            detailsText += `🏆 ${match.equipe1} 🆚 ${match.equipe2}\n`;
            detailsText += `🆔 ID : ${match.id}\n`;
            detailsText += `📅 ${match.date} à ${match.heureLimite}\n`;
            detailsText += `🏟️ Type : ${match.type}\n`;
            detailsText += `🎯 Cotes : ${match.equipe1} (${match.cote1}) | ${match.coteNul ? `Nul (${match.coteNul}) | ` : ""}${match.equipe2} (${match.cote2})\n`;
            detailsText += `💰 Mises : ${match.miseMin} - ${match.miseMax}\n\n`;
            
            // Statistiques des paris
            let stats = {
                [match.equipe1]: { joueurs: 0, montant: 0 },
                "Nul": { joueurs: 0, montant: 0 },
                [match.equipe2]: { joueurs: 0, montant: 0 }
            };
            
            Object.values(matchParis.parieurs).forEach(pari => {
                if (stats[pari.equipe]) {
                    stats[pari.equipe].joueurs++;
                    stats[pari.equipe].montant += pari.montant;
                }
            });
            
            detailsText += `📈 *STATISTIQUES DES PARIS :*\n`;
            detailsText += `• ${match.equipe1} : ${stats[match.equipe1].joueurs} joueurs (${stats[match.equipe1].montant} 💎)\n`;
            if (match.coteNul) detailsText += `• Match nul : ${stats["Nul"].joueurs} joueurs (${stats["Nul"].montant} 💎)\n`;
            detailsText += `• ${match.equipe2} : ${stats[match.equipe2].joueurs} joueurs (${stats[match.equipe2].montant} 💎)\n`;
            detailsText += `• Total : ${Object.keys(matchParis.parieurs).length} joueurs\n`;
            detailsText += `• Montant total : ${Object.values(stats).reduce((sum, s) => sum + s.montant, 0)} 💎\n\n`;
            
            detailsText += `══════════════════\n`;
            detailsText += `1. 🏁 Désigner le gagnant\n`;
            detailsText += `2. 👥 Voir la liste des parieurs\n`;
            detailsText += `3. ❌ Annuler ce match\n`;
            detailsText += `0. ↩️ Retour à la liste\n\n`;
            detailsText += `*Choisis une option :*`;

            const message = await riza.sendMessage(m.chat, { text: detailsText }, { quoted: quotedMsg });
            lastMessage = message;
            currentStep = "details_match_admin";
            selectedMatch = match;
        };

        // Désigner un gagnant
        const designerGagnant = async (match, quotedMsg) => {
            const gagnantText = `🏁 *DÉSIGNER LE GAGNANT* 🏁\n`;
            gagnantText += `══════════════════\n`;
            gagnantText += `🏆 Match : ${match.equipe1} 🆚 ${match.equipe2}\n\n`;
            gagnantText += `*Options disponibles :*\n`;
            gagnantText += `1. 🏆 ${match.equipe1} gagne\n`;
            if (match.coteNul) gagnantText += `2. ⚪ Match nul\n`;
            gagnantText += `${match.coteNul ? '3' : '2'}. 🏆 ${match.equipe2} gagne\n`;
            gagnantText += `0. ↩️ Annuler\n\n`;
            gagnantText += `*Choisis le résultat :*`;

            const message = await riza.sendMessage(m.chat, { text: gagnantText }, { quoted: quotedMsg });
            lastMessage = message;
            currentStep = "designer_gagnant";
            selectedMatch = match;
        };

        // Traiter les gains
        const traiterGains = async (match, resultat, quotedMsg) => {
            const paris = loadParis();
            const banque = loadArgent();
            const matchParis = paris.matchs.find(p => p.matchId === match.id);
            
            if (!matchParis || !matchParis.parieurs) {
                await riza.sendMessage(m.chat, {
                    text: "❌ Aucun pari enregistré pour ce match."
                }, { quoted: quotedMsg });
                return showMenuAdmin(quotedMsg);
            }

            let gagnants = [];
            let perdants = [];
            let totalGains = 0;
            let totalPertes = 0;

            // Identifier gagnants et perdants
            Object.entries(matchParis.parieurs).forEach(([jidPari, pari]) => {
                if (pari.equipe === resultat) {
                    // Gagnant
                    const gains = Math.round(pari.montant * pari.cote);
                    gagnants.push({
                        jid: jidPari,
                        montant: pari.montant,
                        devise: pari.devise,
                        cote: pari.cote,
                        gains: gains
                    });
                    totalGains += gains;
                    
                    // Créditer le joueur
                    if (!banque[jidPari]) banque[jidPari] = { diamants: 0, rulith: 0 };
                    if (pari.devise === "💎") {
                        banque[jidPari].diamants += gains;
                    } else {
                        banque[jidPari].rulith += gains;
                    }
                    
                    // Marquer comme gagnant
                    pari.gagnant = true;
                    pari.gains = gains;
                    
                } else {
                    // Perdant
                    perdants.push({
                        jid: jidPari,
                        montant: pari.montant,
                        devise: pari.devise
                    });
                    totalPertes += pari.montant;
                    
                    // Marquer comme perdant
                    pari.gagnant = false;
                    pari.gains = 0;
                }
            });

            // Sauvegarder les modifications
            saveArgent(banque);
            saveParis(paris);

            // Déplacer le match vers terminés
            const matchs = loadMatchs();
            const index = matchs.actifs.findIndex(m => m.id === match.id);
            if (index !== -1) {
                const matchTermine = matchs.actifs.splice(index, 1)[0];
                matchTermine.resultat = resultat;
                matchTermine.dateFin = new Date().toISOString();
                matchTermine.gagnants = gagnants.length;
                matchTermine.perdants = perdants.length;
                matchTermine.totalGains = totalGains;
                matchTermine.totalPertes = totalPertes;
                matchs.termines.unshift(matchTermine);
                saveMatchs(matchs);
            }

            // Générer le rapport
            let rapport = `✅ *GAINS DISTRIBUÉS !* ✅\n`;
            rapport += `══════════════════\n`;
            rapport += `🏆 Résultat : ${resultat}\n\n`;
            rapport += `📊 *BILAN :*\n`;
            rapport += `• Gagnants : ${gagnants.length} joueurs\n`;
            rapport += `• Gains distribués : ${totalGains}\n`;
            rapport += `• Perdants : ${perdants.length} joueurs\n`;
            rapport += `• Mises perdues : ${totalPertes}\n`;
            rapport += `• Bénéfice système : ${totalPertes - totalGains}\n\n`;
            
            if (gagnants.length > 0) {
                rapport += `🎉 *TOP 5 GAGNANTS :*\n`;
                gagnants.sort((a, b) => b.gains - a.gains).slice(0, 5).forEach((g, i) => {
                    const username = g.jid.split('@')[0];
                    rapport += `${i + 1}. @${username} : +${g.gains} ${g.devise} (x${g.cote})\n`;
                });
            }
            
            rapport += `\n══════════════════\n`;
            rapport += `💎 Les gains ont été crédités sur les comptes des gagnants !`;

            // Envoyer le rapport
            await riza.sendMessage(m.chat, { text: rapport }, { quoted: quotedMsg });
            
            // Mentionner les gagnants si possible
            if (gagnants.length > 0) {
                const mentions = gagnants.slice(0, 5).map(g => g.jid);
                await riza.sendMessage(m.chat, {
                    text: `🎉 Félicitations aux gagnants ! 🎉`,
                    mentions
                });
            }

            await showMenuAdmin(quotedMsg);
        };

        // Voir la liste des parieurs
        const voirParieurs = async (match, quotedMsg) => {
            const paris = loadParis();
            const matchParis = paris.matchs.find(p => p.matchId === match.id);
            
            if (!matchParis || Object.keys(matchParis.parieurs).length === 0) {
                await riza.sendMessage(m.chat, {
                    text: "❌ Aucun parieur pour ce match."
                }, { quoted: quotedMsg });
                return showDetailsMatchAdmin(match, quotedMsg);
            }

            let parieursText = `👥 *PARIEURS - ${match.equipe1} 🆚 ${match.equipe2}* 👥\n`;
            parieursText += `══════════════════\n\n`;
            
            Object.entries(matchParis.parieurs).forEach(([jidPari, pari], index) => {
                const username = jidPari.split('@')[0];
                parieursText += `*${index + 1}.* @${username}\n`;
                parieursText += `   🎯 Pari : ${pari.equipe}\n`;
                parieursText += `   💰 Mise : ${pari.montant} ${pari.devise}\n`;
                parieursText += `   🎯 Cote : ${pari.cote}\n`;
                parieursText += `   💎 Gain potentiel : ${Math.round(pari.montant * pari.cote)} ${pari.devise}\n\n`;
            });

            parieursText += `════════════════════\n`;
            parieursText += `📊 Total : ${Object.keys(matchParis.parieurs).length} parieurs`;

            const message = await riza.sendMessage(m.chat, { text: parieursText }, { quoted: quotedMsg });
            lastMessage = message;
        };

        // Annuler un match
        const annulerMatch = async (match, quotedMsg) => {
            const annulationText = `❌ *ANNULATION DU MATCH* ❌\n`;
            annulationText += `════════════════════\n`;
            annulationText += `🏆 ${match.equipe1} 🆚 ${match.equipe2}\n\n`;
            annulationText += `⚠️ *ATTENTION :* Cette action est irréversible !\n`;
            annulationText += `• Tous les paris seront remboursés\n`;
            annulationText += `• Le match sera supprimé\n\n`;
            annulationText += `*Confirmez l'annulation ?*\n`;
            annulationText += `Tapez \`oui\` pour confirmer\n`;
            annulationText += `Tapez \`non\` pour annuler`;

            const message = await riza.sendMessage(m.chat, { text: annulationText }, { quoted: quotedMsg });
            lastMessage = message;
            currentStep = "confirmation_annulation";
            selectedMatch = match;
        };

        // Écouteur admin
        const listener = async ({ messages }) => {
            if (!sessionActive) return;

            const msg = messages[0];
            if (!msg.message) return;

            const from = msg.key.participant || msg.key.remoteJid;
            if (from !== jid) return;

            const context = msg.message?.extendedTextMessage?.contextInfo;
            if (!context || context.stanzaId !== lastMessage?.key?.id) return;

            const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            const reponse = content.trim();

            try {
                if (currentStep === "menu_principal") {
                    if (reponse === "1") {
                        await creerNouveauMatch(msg);
                    }
                    else if (reponse === "2") {
                        await listerMatchsActifs(msg);
                    }
                    else if (reponse === "3") {
                        // Désigner un gagnant directement
                        const matchs = loadMatchs();
                        if (matchs.actifs.length === 0) {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Aucun match actif. Créez d'abord un match."
                            }, { quoted: msg });
                            return showMenuAdmin(msg);
                        }
                        await listerMatchsActifs(msg);
                        currentStep = "selection_gagnant";
                    }
                    else if (reponse === "4") {
                        // Voir les paris d'un match
                        const matchs = loadMatchs();
                        if (matchs.actifs.length === 0) {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Aucun match actif."
                            }, { quoted: msg });
                            return showMenuAdmin(msg);
                        }
                        await listerMatchsActifs(msg);
                        currentStep = "selection_paris";
                    }
                    else if (reponse === "5") {
                         // Annuler un match
                        const matchs = loadMatchs();
                        if (matchs.actifs.length === 0) {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Aucun match à annuler."
                            }, { quoted: msg });
                            return showMenuAdmin(msg);
                        }
                        await listerMatchsActifs(msg);
                        currentStep = "selection_annulation";
                    }
                    else if (reponse === "6") {
                        await showMenuAdmin(msg);
                    }
                    else if (reponse === "7") {
                        sessionActive = false;
                        riza.ev.off("messages.upsert", listener);
                        await riza.sendMessage(m.chat, { text: "👋 Administration des paris terminée." }, { quoted: msg });
                    }
                    else {
                        await showMenuAdmin(msg);
                    }
                }
                else if (currentStep.startsWith("creation_")) {
                    if (reponse.toLowerCase() === "annuler") {
                        await riza.sendMessage(m.chat, {
                            text: "❌ Création du match annulée."
                        }, { quoted: msg });
                        return showMenuAdmin(msg);
                    }

                    if (currentStep === "creation_equipe1") {
                        if (!reponse || reponse.length < 2) {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Nom invalide. Veuillez entrer un nom d'au moins 2 caractères."
                            }, { quoted: msg });
                            return;
                        }
                        creationData.equipe1 = reponse;
                        
                        const questionText = `✅ *Équipe 1 enregistrée : ${reponse}*\n\n`;
                        questionText += `🆕 *CRÉATION D'UN NOUVEAU MATCH* 🆕\n`;
                        questionText += `═══════════════════\n`;
                        questionText += `*Étape 2/10 : Deuxième équipe/joueur*\n\n`;
                        questionText += `🔴 Entrez le nom de la deuxième équipe ou joueur :\n`;
                        questionText += `═══════════════════\n`;
                        questionText += `*Tapez \`annuler\` pour abandonner*`;

                        const message = await riza.sendMessage(m.chat, { text: questionText }, { quoted: msg });
                        lastMessage = message;
                        currentStep = "creation_equipe2";
                    }
                    else if (currentStep === "creation_equipe2") {
                        if (!reponse || reponse.length < 2) {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Nom invalide. Veuillez entrer un nom d'au moins 2 caractères."
                            }, { quoted: msg });
                            return;
                        }
                        creationData.equipe2 = reponse;
                        
                        const questionText = `✅ *Équipe 2 enregistrée : ${reponse}*\n\n`;
                        questionText += `🆕 *CRÉATION D'UN NOUVEAU MATCH* 🆕\n`;
                        questionText += `════════════════════\n`;
                        questionText += `*Étape 3/10 : Type de match*\n\n`;
                        questionText += `🏟️ Choisissez le type de match :\n`;
                        questionText += `1. International (match entre pays)\n`;
                        questionText += `2. Clubs (match entre clubs)\n`;
                        questionText += `3. Duel (combat 1vs1)\n`;
                        questionText += `4. Quête (gagnant d'une quête)\n`;
                        questionText += `5. Événement (autre type)\n\n`;
                        questionText += `════════════════════\n`;
                        questionText += `*Entrez le numéro (1-5) :*\n`;
                        questionText += `*Tapez \`annuler\` pour abandonner*`;

                        const message = await riza.sendMessage(m.chat, { text: questionText }, { quoted: msg });
                        lastMessage = message;
                        currentStep = "creation_type";
                    }
                    else if (currentStep === "creation_type") {
                        const typeNum = parseInt(reponse);
                        const types = {
                            1: "International",
                            2: "Clubs",
                            3: "Duel",
                            4: "Quête",
                            5: "Événement"
                        };
                        
                        if (typeNum < 1 || typeNum > 5 || isNaN(typeNum)) {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Option invalide. Veuillez entrer un nombre entre 1 et 5."
                            }, { quoted: msg });
                            return;
                        }
                        
                        creationData.type = types[typeNum];
                        
                        const questionText = `✅ *Type enregistré : ${creationData.type}*\n\n`;
                        questionText += `🆕 *CRÉATION D'UN NOUVEAU MATCH* 🆕\n`;
                        questionText += `═══════════════════\n`;
                        questionText += `*Étape 4/10 : Date du match*\n\n`;
                        questionText += `📅 Entrez la date du match :\n`;
                        questionText += `*Format :* JJ/MM/AAAA ou JJ-MM-AAAA\n`;
                        questionText += `*Exemples :* 15/01/2024 ou 20-03-2024\n\n`;
                        questionText += `═══════════════════\n`;
                        questionText += `*Tapez \`annuler\` pour abandonner*`;

                        const message = await riza.sendMessage(m.chat, { text: questionText }, { quoted: msg });
                        lastMessage = message;
                        currentStep = "creation_date";
                    }
                    else if (currentStep === "creation_date") {
                        // Validation simple de la date
                        const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
                        const match = reponse.match(dateRegex);
                        
                        if (!match) {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Format de date invalide. Utilisez JJ/MM/AAAA ou JJ-MM-AAAA."
                            }, { quoted: msg });
                            return;
                        }
                        
                        const [_, jour, mois, annee] = match;
                        creationData.date = `${jour}/${mois}/${annee}`;
                        
                        const questionText = `✅ *Date enregistrée : ${creationData.date}*\n\n`;
                        questionText += `🆕 *CRÉATION D'UN NOUVEAU MATCH* 🆕\n`;
                        questionText += `═══════════════════\n`;
                        questionText += `*Étape 5/10 : Heure limite des paris*\n\n`;
                        questionText += `⏰ Entrez l'heure limite pour parier :\n`;
                        questionText += `*Format :* HH:MM (24h)\n`;
                        questionText += `*Exemples :* 20:00, 15:30, 22:45\n\n`;
                        questionText += `═══════════════════\n`;
                        questionText += `*Tapez \`annuler\` pour abandonner*`;

                        const message = await riza.sendMessage(m.chat, { text: questionText }, { quoted: msg });
                        lastMessage = message;
                        currentStep = "creation_heure";
                    }
                    else if (currentStep === "creation_heure") {
                        const heureRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
                        if (!heureRegex.test(reponse)) {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Format d'heure invalide. Utilisez HH:MM (ex: 20:00)."
                            }, { quoted: msg });
                            return;
                        }
                        
                        creationData.heure = reponse;
                        
                        const questionText = `✅ *Heure enregistrée : ${creationData.heure}*\n\n`;
                        questionText += `🆕 *CRÉATION D'UN NOUVEAU MATCH* 🆕\n`;
                        questionText += `═══════════════════\n`;
                        questionText += `*Étape 6/10 : Cote de ${creationData.equipe1}*\n\n`;
                        questionText += `🎯 Entrez la cote pour ${creationData.equipe1} :\n`;
                        questionText += `*Exemples :* 1.5 (favori), 2.0 (équilibré), 3.5 (outsider)\n\n`;
                        questionText += `═══════════════════\n`;
                        questionText += `*Tapez \`annuler\` pour abandonner*`;

                        const message = await riza.sendMessage(m.chat, { text: questionText }, { quoted: msg });
                        lastMessage = message;
                        currentStep = "creation_cote1";
                    }
                    else if (currentStep === "creation_cote1") {
                        const cote = parseFloat(reponse);
                        if (isNaN(cote) || cote < 1.01 || cote > 100) {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Cote invalide. Entrez un nombre entre 1.01 et 100."
                            }, { quoted: msg });
                            return;
                        }
                        
                        creationData.cote1 = cote;
                        
                        const questionText = `✅ *Cote ${creationData.equipe1} enregistrée : ${cote}*\n\n`;
                        questionText += `🆕 *CRÉATION D'UN NOUVEAU MATCH* 🆕\n`;
                        questionText += `══════════════════\n`;
                        questionText += `*Étape 7/10 : Cote pour match nul*\n\n`;
                        questionText += `⚪ Voulez-vous autoriser les paris sur le match nul ?\n`;
                        questionText += `1. Oui, ajouter une cote pour le nul\n`;
                        questionText += `2. Non, pas de pari nul (pour les duels)\n\n`;
                        questionText += `══════════════════\n`;
                        questionText += `*Entrez 1 ou 2 :*\n`;
                        questionText += `*Tapez \`annuler\` pour abandonner*`;

                        const message = await riza.sendMessage(m.chat, { text: questionText }, { quoted: msg });
                        lastMessage = message;
                        currentStep = "creation_cote_nul_choice";
                    }
                    else if (currentStep === "creation_cote_nul_choice") {
                        if (reponse === "1") {
                            const questionText = `✅ *Option : Avec cote nul*\n\n`;
                            questionText += `🆕 *CRÉATION D'UN NOUVEAU MATCH* 🆕\n`;
                            questionText += `═════════════════\n`;
                            questionText += `*Étape 7b/10 : Cote pour match nul*\n\n`;
                            questionText += `⚪ Entrez la cote pour le match nul :\n`;
                            questionText += `*Exemples :* 2.5, 3.0, 3.2\n\n`;
                            questionText += `═════════════════\n`;
                            questionText += `*Tapez \`annuler\` pour abandonner*`;

                            const message = await riza.sendMessage(m.chat, { text: questionText }, { quoted: msg });
                            lastMessage = message;
                            currentStep = "creation_cote_nul";
                        } else if (reponse === "2") {
                            creationData.coteNul = null;
                            
                            const questionText = `✅ *Option : Sans cote nul*\n\n`;
                            questionText += `🆕 *CRÉATION D'UN NOUVEAU MATCH* 🆕\n`;
                            questionText += `═══════════════\n`;
                            questionText += `*Étape 8/10 : Cote de ${creationData.equipe2}*\n\n`;
                            questionText += `🎯 Entrez la cote pour ${creationData.equipe2} :\n`;
                            questionText += `*Exemples :* 1.5 (favori), 2.0 (équilibré), 3.5 (outsider)\n\n`;
                            questionText += `═══════════════\n`;
                            questionText += `*Tapez \`annuler\` pour abandonner*`;

                            const message = await riza.sendMessage(m.chat, { text: questionText }, { quoted: msg });
                            lastMessage = message;
                            currentStep = "creation_cote2";
                        } else {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Option invalide. Entrez 1 ou 2."
                            }, { quoted: msg });
                            return;
                        }
                    }
                    else if (currentStep === "creation_cote_nul") {
                        const coteNul = parseFloat(reponse);
                        if (isNaN(coteNul) || coteNul < 1.01 || coteNul > 100) {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Cote invalide. Entrez un nombre entre 1.01 et 100."
                            }, { quoted: msg });
                            return;
                        }
                        
                        creationData.coteNul = coteNul;
                        
                        const questionText = `✅ *Cote nul enregistrée : ${coteNul}*\n\n`;
                        questionText += `🆕 *CRÉATION D'UN NOUVEAU MATCH* 🆕\n`;
                        questionText += `═════════════════\n`;
                        questionText += `*Étape 8/10 : Cote de ${creationData.equipe2}*\n\n`;
                        questionText += `🎯 Entrez la cote pour ${creationData.equipe2} :\n`;
                        questionText += `*Exemples :* 1.5 (favori), 2.0 (équilibré), 3.5 (outsider)\n\n`;
                        questionText += `═════════════════\n`;
                        questionText += `*Tapez \`annuler\` pour abandonner*`;

                        const message = await riza.sendMessage(m.chat, { text: questionText }, { quoted: msg });
                        lastMessage = message;
                        currentStep = "creation_cote2";
                    }
                    else if (currentStep === "creation_cote2") {
                        const cote = parseFloat(reponse);
                        if (isNaN(cote) || cote < 1.01 || cote > 100) {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Cote invalide. Entrez un nombre entre 1.01 et 100."
                            }, { quoted: msg });
                            return;
                        }
                        
                        creationData.cote2 = cote;
                        
                        const questionText = `✅ *Cote ${creationData.equipe2} enregistrée : ${cote}*\n\n`;
                        questionText += `🆕 *CRÉATION D'UN NOUVEAU MATCH* 🆕\n`;
                        questionText += `═════════════════\n`;
                        questionText += `*Étape 9/10 : Mise minimale*\n\n`;
                        questionText += `💰 Entrez la mise minimale (en Diamants) :\n`;
                        questionText += `*Exemples :* 100 (débutants), 500 (intermédiaires), 1000 (experts)\n\n`;
                        questionText += `═════════════════\n`;
                        questionText += `*Tapez \`annuler\` pour abandonner*`;

                        const message = await riza.sendMessage(m.chat, { text: questionText }, { quoted: msg });
                        lastMessage = message;
                        currentStep = "creation_mise_min";
                    }
                    else if (currentStep === "creation_mise_min") {
                        const miseMin = parseInt(reponse);
                        if (isNaN(miseMin) || miseMin < 1 || miseMin > 100000) {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Mise minimale invalide. Entrez un nombre entre 1 et 100000."
                            }, { quoted: msg });
                            return;
                        }
                        
                        creationData.miseMin = miseMin;
                        
                        const questionText = `✅ *Mise minimale enregistrée : ${miseMin} 💎*\n\n`;
                        questionText += `🆕 *CRÉATION D'UN NOUVEAU MATCH* 🆕\n`;
                        questionText += `══════════════════\n`;
                        questionText += `*Étape 10/10 : Mise maximale*\n\n`;
                        questionText += `💰 Entrez la mise maximale (en Diamants) :\n`;
                        questionText += `*Doit être supérieure à la mise minimale (${miseMin})*\n`;
                        questionText += `*Exemples :* 5000, 10000, 50000\n\n`;
                        questionText += `══════════════════\n`;
                        questionText += `*Tapez \`annuler\` pour abandonner*`;

                        const message = await riza.sendMessage(m.chat, { text: questionText }, { quoted: msg });
                        lastMessage = message;
                        currentStep = "creation_mise_max";
                    }
                    else if (currentStep === "creation_mise_max") {
                        const miseMax = parseInt(reponse);
                        if (isNaN(miseMax) || miseMax < creationData.miseMin || miseMax > 1000000) {
                            await riza.sendMessage(m.chat, {
                                text: `❌ Mise maximale invalide. Doit être entre ${creationData.miseMin} et 1000000.`
                            }, { quoted: msg });
                            return;
                        }
                        
                        creationData.miseMax = miseMax;
                        
                        // Afficher la confirmation
                        let confirmationText = `✅ *TOUTES LES INFORMATIONS SONT ENREGISTRÉES !* ✅\n`;
                        confirmationText += `════════════════\n`;
                        confirmationText += `🏆 *${creationData.equipe1} 🆚 ${creationData.equipe2}*\n\n`;
                        confirmationText += `📋 *Récapitulatif :*\n`;
                        confirmationText += `• Type : ${creationData.type}\n`;
                        confirmationText += `• Date : ${creationData.date}\n`;
                        confirmationText += `• Heure limite : ${creationData.heure}\n`;
                        confirmationText += `• Cotes : ${creationData.equipe1} (${creationData.cote1})`;
                        
                        if (creationData.coteNul) {
                            confirmationText += ` | Nul (${creationData.coteNul})`;
                        }
                        
                        confirmationText += ` | ${creationData.equipe2} (${creationData.cote2})\n`;
                        confirmationText += `• Mises : ${creationData.miseMin} - ${creationData.miseMax} 💎\n\n`;
                        
                        confirmationText += `═════════════════\n`;
                        confirmationText += `*Ce match est-il correct ?*\n`;
                        confirmationText += `Tapez \`oui\` pour confirmer\n`;
                        confirmationText += `Tapez \`non\` pour recommencer\n`;
                        confirmationText += `Tapez \`annuler\` pour abandonner`;

                        const message = await riza.sendMessage(m.chat, { text: confirmationText }, { quoted: msg });
                        lastMessage = message;
                        currentStep = "confirmation_creation";
                    }
                    else if (currentStep === "confirmation_creation") {
                        if (reponse.toLowerCase() === "oui") {
                            // Créer le match
                            const nouveauMatch = {
                                id: generateId(),
                                equipe1: creationData.equipe1,
                                equipe2: creationData.equipe2,
                                type: creationData.type,
                                date: creationData.date,
                                heureLimite: creationData.heure,
                                cote1: creationData.cote1,
                                coteNul: creationData.coteNul,
                                cote2: creationData.cote2,
                                miseMin: creationData.miseMin,
                                miseMax: creationData.miseMax,
                                created: new Date().toISOString(),
                                createdBy: jid
                            };
                            
                            const matchs = loadMatchs();
                            matchs.actifs.push(nouveauMatch);
                            saveMatchs(matchs);
                            
                            await riza.sendMessage(m.chat, {
                                text: `✅ *MATCH CRÉÉ AVEC SUCCÈS !* ✅\n\n🏆 ${creationData.equipe1} 🆚 ${creationData.equipe2}\n📅 ${creationData.date} à ${creationData.heure}\n🎯 Cotes : ${creationData.cote1}/${creationData.coteNul || "N/A"}/${creationData.cote2}\n💰 Mises : ${creationData.miseMin}-${creationData.miseMax} 💎\n\n🆔 ID : ${nouveauMatch.id}`
                            }, { quoted: msg });
                            
                            await showMenuAdmin(msg);
                            
                        } else if (reponse.toLowerCase() === "non") {
                            // Recommencer
                            await riza.sendMessage(m.chat, {
                                text: "🔄 Recommençons la création du match..."
                            }, { quoted: msg });
                            await creerNouveauMatch(msg);
                        } else if (reponse.toLowerCase() === "annuler") {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Création du match annulée."
                            }, { quoted: msg });
                            await showMenuAdmin(msg);
                        } else {
                            await riza.sendMessage(m.chat, {
                                text: "❌ Réponse invalide. Tapez 'oui', 'non' ou 'annuler'."
                            }, { quoted: msg });
                            return;
                        }
                    }
                }
                else if (currentStep === "selection_match_admin" || 
                         currentStep === "selection_gagnant" || 
                         currentStep === "selection_paris" || 
                         currentStep === "selection_annulation") {
                    
                    if (reponse === "0") {
                        await showMenuAdmin(msg);
                    } else {
                        const matchs = loadMatchs();
                        const index = parseInt(reponse) - 1;
                        
                        if (index >= 0 && index < matchs.actifs.length) {
                            const match = matchs.actifs[index];
                            
                            if (currentStep === "selection_gagnant") {
                                await designerGagnant(match, msg);
                            } else if (currentStep === "selection_paris") {
                                await voirParieurs(match, msg);
                            } else if (currentStep === "selection_annulation") {
                                await annulerMatch(match, msg);
                            } else {
                                await showDetailsMatchAdmin(match, msg);
                            }
                        } else {
                            await listerMatchsActifs(msg);
                        }
                    }
                }
                else if (currentStep === "details_match_admin") {
                    if (reponse === "0") {
                        await listerMatchsActifs(msg);
                    } else if (reponse === "1") {
                        await designerGagnant(selectedMatch, msg);
                    } else if (reponse === "2") {
                        await voirParieurs(selectedMatch, msg);
                    } else if (reponse === "3") {
                        await annulerMatch(selectedMatch, msg);
                    } else {
                        await showDetailsMatchAdmin(selectedMatch, msg);
                    }
                }
                else if (currentStep === "designer_gagnant") {
                    if (reponse === "0") {
                        await showDetailsMatchAdmin(selectedMatch, msg);
                    } else {
                        let resultat = null;
                        
                        if (reponse === "1") resultat = selectedMatch.equipe1;
                        else if (reponse === "2" && selectedMatch.coteNul) resultat = "Nul";
                        else if ((reponse === "2" && !selectedMatch.coteNul) || 
                                 (reponse === "3" && selectedMatch.coteNul)) resultat = selectedMatch.equipe2;
                        
                        if (resultat) {
                            await traiterGains(selectedMatch, resultat, msg);
                        } else {
                            await designerGagnant(selectedMatch, msg);
                        }
                    }
                }
                else if (currentStep === "confirmation_annulation") {
                    if (reponse.toLowerCase() === "oui") {
                        // Rembourser tous les paris
                        const paris = loadParis();
                        const banque = loadArgent();
                        const matchParis = paris.matchs.find(p => p.matchId === selectedMatch.id);
                        
                        if (matchParis && matchParis.parieurs) {
                            Object.entries(matchParis.parieurs).forEach(([jidPari, pari]) => {
                                if (!banque[jidPari]) banque[jidPari] = { diamants: 0, rulith: 0 };
                                if (pari.devise === "💎") {
                                    banque[jidPari].diamants += pari.montant;
                                } else {
                                    banque[jidPari].rulith += pari.montant;
                                }
                            });
                            saveArgent(banque);
                            
                            // Supprimer les paris du match
                            paris.matchs = paris.matchs.filter(p => p.matchId !== selectedMatch.id);
                            saveParis(paris);
                        }
                        
                        // Supprimer le match
                        const matchs = loadMatchs();
                        matchs.actifs = matchs.actifs.filter(m => m.id !== selectedMatch.id);
                        saveMatchs(matchs);
                        
                        await riza.sendMessage(m.chat, {
                            text: `✅ *MATCH ANNULÉ ET PARIS REMBOURSÉS*\n\n🏆 ${selectedMatch.equipe1} 🆚 ${selectedMatch.equipe2}\n💰 Tous les paris ont été remboursés.`
                        }, { quoted: msg });
                        
                        await showMenuAdmin(msg);
                        
                    } else if (reponse.toLowerCase() === "non") {
                        await showDetailsMatchAdmin(selectedMatch, msg);
                    } else {
                        await annulerMatch(selectedMatch, msg);
                    }
                }
                
            } catch (error) {
                console.error("Erreur dans pronostics:", error);
                await riza.sendMessage(m.chat, {
                    text: "❌ Une erreur est survenue. Retour au menu admin."
                }, { quoted: msg });
                await showMenuAdmin(msg);
            }
        };

        // Démarrer la session admin
        riza.ev.on("messages.upsert", listener);
        await showMenuAdmin();
    }
};