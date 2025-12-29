const fs = require("fs");
const path = require("path");

const PARIS_PATH = path.join(__dirname, "../data/paris.json");
const ARGENT_PATH = path.join(__dirname, "../data/banque.json");
const MATCHS_PATH = path.join(__dirname, "../data/matchs.json");

// Charger les données
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

function loadMatchs() {
    if (!fs.existsSync(MATCHS_PATH)) {
        fs.writeFileSync(MATCHS_PATH, JSON.stringify({ actifs: [], termines: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(MATCHS_PATH, "utf-8"));
}

function saveMatchs(data) {
    fs.writeFileSync(MATCHS_PATH, JSON.stringify(data, null, 2));
}

// Vérifier si le joueur a un compte
function initCompte(jid) {
    const banque = loadArgent();
    if (!banque[jid]) {
        banque[jid] = { diamants: 0, rulith: 0 };
        saveArgent(banque);
    }
    return banque[jid];
}

module.exports = {
    name: "parier",
    category: "UNIROLIST",
    description: "Système de paris sur les matchs et événements",
    allowedForAll: true,
    keywords: ["parier", "pari"],

    async execute(riza, m, args) {
        const jid = m.sender;
        const compte = initCompte(jid);
        
        let sessionActive = true;
        let currentStep = "menu_principal";
        let selectedMatch = null;
        let selectedTeam = null;
        let betAmount = 0;
        let matchsData = null;
        let lastMessage = null;

        // Afficher le menu principal
        const showMenuPrincipal = async (quotedMsg = m) => {
            if (!sessionActive) return;

            const matchs = loadMatchs();
            const paris = loadParis();
            const mesParisActifs = paris.matchs.filter(p => 
                p.parieurs && p.parieurs[jid] && matchs.actifs.some(m => m.id === p.matchId)
            ).length;

            const matchsTerminesAvecMesParis = paris.matchs.filter(p => 
                p.parieurs && p.parieurs[jid] && matchs.termines.some(m => m.id === p.matchId)
            ).length;

            const menuText = `🎲 *SYSTÈME DE PARIS* 🎲
══════════════════
💸 *Ton solde :*
💎 ${compte.diamants.toLocaleString()} Diamants
💰 ${compte.rulith.toLocaleString()} Rulith

📊 *Statistiques :*
🎯 Paris actifs : ${mesParisActifs}
🏆 Matchs terminés : ${matchsTerminesAvecMesParis}

══════════════════
1. 🏆 Voir les matchs disponibles
2. 🎯 Mes paris en cours
3. 📈 Mes paris terminés
4. 💰 Choisir devise (💎/Ru)
5. ❌ Quitter

══════════════════
*Choisis une option (1-5) :*`;

            const menuMessage = await riza.sendMessage(m.chat, { text: menuText }, { quoted: quotedMsg });
            lastMessage = menuMessage;
            currentStep = "menu_principal";
        };

        // Afficher les matchs disponibles
        const showMatchsDisponibles = async (quotedMsg) => {
            const matchs = loadMatchs();
            
            if (matchs.actifs.length === 0) {
                await riza.sendMessage(m.chat, {
                    text: "❌ *AUCUN MATCH DISPONIBLE*\n\nIl n'y a pas de matchs ouverts aux paris pour le moment.\n\nUn administrateur doit créer un match avec la commande *!pronostics*"
                }, { quoted: quotedMsg });
                return showMenuPrincipal(quotedMsg);
            }

            let matchsText = `🏆 *MATCHS DISPONIBLES POUR LES PARIS* 🏆\n════════════════════════════\n\n`;
            
            matchs.actifs.forEach((match, index) => {
                matchsText += `*${index + 1}.* ${match.equipe1} 🆚 ${match.equipe2}\n`;
                matchsText += `   📅 Date : ${match.date}\n`;
                matchsText += `   🏟️ Type : ${match.type}\n`;
                matchsText += `   🎯 Cotes : ${match.equipe1} (${match.cote1}) | Nul (${match.coteNul || "N/A"}) | ${match.equipe2} (${match.cote2})\n`;
                matchsText += `   💰 Mise min : ${match.miseMin} - Mise max : ${match.miseMax}\n`;
                matchsText += `   ⏰ Fermeture : ${match.heureLimite}\n\n`;
            });

            matchsText += `════════════════════════════\n`;
            matchsText += `*Entrez le numéro du match (1-${matchs.actifs.length}) :*\n`;
            matchsText += `*Ou tapez* \`0\` *pour revenir*`;

            const message = await riza.sendMessage(m.chat, { text: matchsText }, { quoted: quotedMsg });
            lastMessage = message;
            currentStep = "selection_match";
            matchsData = matchs;
        };

        // Afficher les détails d'un match
        const showDetailsMatch = async (match, quotedMsg) => {
            const paris = loadParis();
            const matchParis = paris.matchs.find(p => p.matchId === match.id) || {
                matchId: match.id,
                parieurs: {}
            };

            let detailsText = `🏆 *${match.equipe1} 🆚 ${match.equipe2}* 🏆\n`;
            detailsText += `════════════════════════════\n`;
            detailsText += `📅 ${match.date}\n`;
            detailsText += `🏟️ ${match.type}\n`;
            detailsText += `⏰ Fermeture des paris : ${match.heureLimite}\n\n`;
            
            detailsText += `🎯 *COTES DISPONIBLES :*\n`;
            detailsText += `• ${match.equipe1} : ${match.cote1}\n`;
            if (match.coteNul) detailsText += `• Match nul : ${match.coteNul}\n`;
            detailsText += `• ${match.equipe2} : ${match.cote2}\n\n`;
            
            detailsText += `💰 *LIMITES DE MISE :*\n`;
            detailsText += `Minimum : ${match.miseMin}\n`;
            detailsText += `Maximum : ${match.miseMax}\n\n`;
            
            detailsText += `📊 *PARIS ACTUELS :*\n`;
            let total1 = 0, totalNul = 0, total2 = 0;
            
            Object.values(matchParis.parieurs).forEach(pari => {
                if (pari.equipe === match.equipe1) total1 += pari.montant;
                else if (pari.equipe === "Nul") totalNul += pari.montant;
                else if (pari.equipe === match.equipe2) total2 += pari.montant;
            });
            
            detailsText += `• ${match.equipe1} : ${total1} 💎\n`;
            if (match.coteNul) detailsText += `• Match nul : ${totalNul} 💎\n`;
            detailsText += `• ${match.equipe2} : ${total2} 💎\n\n`;
            
            detailsText += `════════════════════════════\n`;
            detailsText += `1. 🔵 Parier sur ${match.equipe1}\n`;
            if (match.coteNul) detailsText += `2. ⚪ Parier sur match nul\n`;
            detailsText += `${match.coteNul ? '3' : '2'}. 🔴 Parier sur ${match.equipe2}\n`;
            detailsText += `0. ↩️ Retour aux matchs\n\n`;
            detailsText += `*Choisis une option :*`;

            const message = await riza.sendMessage(m.chat, { text: detailsText }, { quoted: quotedMsg });
            lastMessage = message;
            currentStep = "details_match";
            selectedMatch = match;
        };

        // Afficher mes paris en cours
        const showMesParisEnCours = async (quotedMsg) => {
            const matchs = loadMatchs();
            const paris = loadParis();
            
            const mesParis = paris.matchs.filter(p => 
                p.parieurs && p.parieurs[jid] && matchs.actifs.some(m => m.id === p.matchId)
            );

            if (mesParis.length === 0) {
                await riza.sendMessage(m.chat, {
                    text: "📭 *AUCUN PARI EN COURS*\n\nTu n'as pas de paris actifs pour le moment.\n\nVa dans *🏆 Voir les matchs disponibles* pour parier !"
                }, { quoted: quotedMsg });
                return showMenuPrincipal(quotedMsg);
            }

            let parisText = `🎯 *MES PARIS EN COURS* 🎯\n════════════════════════\n\n`;
            
            mesParis.forEach((pariData, index) => {
                const match = matchs.actifs.find(m => m.id === pariData.matchId);
                const monPari = pariData.parieurs[jid];
                
                if (match && monPari) {
                    parisText += `*${index + 1}.* ${match.equipe1} 🆚 ${match.equipe2}\n`;
                    parisText += `   🏆 Ton pari : ${monPari.equipe}\n`;
                    parisText += `   💰 Mise : ${monPari.montant} ${monPari.devise}\n`;
                    parisText += `   🎯 Cote : ${monPari.cote}\n`;
                    parisText += `   💎 Gain potentiel : ${Math.round(monPari.montant * monPari.cote)} ${monPari.devise}\n`;
                    parisText += `   ⏰ Fermeture : ${match.heureLimite}\n\n`;
                }
            });

            parisText += `════════════════════════\n`;
            parisText += `*Tapez* \`0\` *pour revenir au menu*`;

            await riza.sendMessage(m.chat, { text: parisText }, { quoted: quotedMsg });
            await showMenuPrincipal(quotedMsg);
        };

        // Afficher mes paris terminés
        const showMesParisTermines = async (quotedMsg) => {
            const matchs = loadMatchs();
            const paris = loadParis();
            
            const mesParisTermines = paris.matchs.filter(p => 
                p.parieurs && p.parieurs[jid] && matchs.termines.some(m => m.id === p.matchId)
            );

            if (mesParisTermines.length === 0) {
                await riza.sendMessage(m.chat, {
                    text: "📭 *AUCUN PARI TERMINÉ*\n\nTu n'as pas encore participé à des paris terminés.\n\nLes gains apparaîtront ici après la fin des matchs !"
                }, { quoted: quotedMsg });
                return showMenuPrincipal(quotedMsg);
            }

            let parisText = `🏆 *MES PARIS TERMINÉS* 🏆\n════════════════════════\n\n`;
            let totalGagnes = 0;
            let totalPerdus = 0;
            
            mesParisTermines.forEach((pariData, index) => {
                const match = matchs.termines.find(m => m.id === pariData.matchId);
                const monPari = pariData.parieurs[jid];
                
                if (match && monPari) {
                    parisText += `*${index + 1}.* ${match.equipe1} 🆚 ${match.equipe2}\n`;
                    parisText += `   🏆 Ton pari : ${monPari.equipe}\n`;
                    parisText += `   🏁 Résultat : ${match.resultat || "Non défini"}\n`;
                    
                    if (monPari.gagnant !== undefined) {
                        if (monPari.gagnant) {
                            parisText += `   ✅ *GAGNÉ* : +${monPari.gains || 0} ${monPari.devise}\n`;
                            totalGagnes += monPari.gains || 0;
                        } else {
                            parisText += `   ❌ *PERDU* : -${monPari.montant} ${monPari.devise}\n`;
                            totalPerdus += monPari.montant;
                        }
                    } else {
                        parisText += `   ⏳ *En attente de calcul*\n`;
                    }
                    
                    parisText += `\n`;
                }
            });

            parisText += `════════════════════════\n`;
            parisText += `📊 *BILAN TOTAL :*\n`;
            parisText += `💰 Gains : ${totalGagnes}\n`;
            parisText += `💸 Pertes : ${totalPerdus}\n`;
            parisText += `📈 Solde net : ${totalGagnes - totalPerdus}\n`;
            parisText += `════════════════════════\n`;
            parisText += `*Tapez* \`0\` *pour revenir au menu*`;

            await riza.sendMessage(m.chat, { text: parisText }, { quoted: quotedMsg });
            await showMenuPrincipal(quotedMsg);
        };

        // Choisir la devise
        const showChoixDevise = async (quotedMsg) => {
            const compteActuel = initCompte(jid);
            
            const deviseText = `💰 *CHOISIS TA DEVISE* 💰\n════════════════════════\n\n`;
            deviseText += `*SOLDES DISPONIBLES :*\n`;
            deviseText += `💎 Diamants : ${compteActuel.diamants.toLocaleString()}\n`;
            deviseText += `💰 Rulith : ${compteActuel.rulith.toLocaleString()}\n\n`;
            deviseText += `════════════════════════\n`;
            deviseText += `1. 💎 Utiliser les Diamants\n`;
            deviseText += `2. 💰 Utiliser les Rulith\n`;
            deviseText += `0. ↩️ Retour au menu\n\n`;
            deviseText += `*Choisis une option :*`;

            const message = await riza.sendMessage(m.chat, { text: deviseText }, { quoted: quotedMsg });
            lastMessage = message;
            currentStep = "choix_devise";
        };

        // Processus de pari
        const processPari = async (equipe, quotedMsg) => {
            selectedTeam = equipe;
            
            // Trouver la cote correspondante
            let cote = selectedMatch.cote1;
            if (equipe === "Nul") cote = selectedMatch.coteNul;
            else if (equipe === selectedMatch.equipe2) cote = selectedMatch.cote2;
            
            const compteActuel = initCompte(jid);
            const devise = currentStep.includes("diamants") ? "💎" : "Ru";
            const solde = devise === "💎" ? compteActuel.diamants : compteActuel.rulith;
            
            const pariText = `🎯 *PARI SUR ${equipe.toUpperCase()}* 🎯\n`;
            pariText += `════════════════════════\n`;
            pariText += `🏆 Match : ${selectedMatch.equipe1} 🆚 ${selectedMatch.equipe2}\n`;
            pariText += `🎯 Cote : ${cote}\n`;
            pariText += `💰 Solde disponible : ${solde.toLocaleString()} ${devise}\n`;
            pariText += `📊 Mise min : ${selectedMatch.miseMin} ${devise}\n`;
            pariText += `📈 Mise max : ${selectedMatch.miseMax} ${devise}\n\n`;
            pariText += `💎 *Gain potentiel :*\n`;
            pariText += `• Mise 100 ${devise} → ${Math.round(100 * cote)} ${devise}\n`;
            pariText += `• Mise 500 ${devise} → ${Math.round(500 * cote)} ${devise}\n`;
            pariText += `• Mise 1000 ${devise} → ${Math.round(1000 * cote)} ${devise}\n\n`;
            pariText += `════════════════════════\n`;
            pariText += `*Entrez le montant à miser :*\n`;
            pariText += `*Exemple :* 500\n`;
            pariText += `*Ou tapez* \`max\` *pour miser tout ton solde*\n`;
            pariText += `*Ou* \`0\` *pour annuler*`;

            const message = await riza.sendMessage(m.chat, { text: pariText }, { quoted: quotedMsg });
            lastMessage = message;
            currentStep = `montant_pari_${devise}`;
        };

        // Confirmer le pari
        const confirmerPari = async (montant, devise, quotedMsg) => {
            const cote = selectedTeam === selectedMatch.equipe1 ? selectedMatch.cote1 :
                        selectedTeam === "Nul" ? selectedMatch.coteNul :
                        selectedMatch.cote2;
            
            const gainPotentiel = Math.round(montant * cote);
            
            const confirmationText = `✅ *CONFIRMER LE PARI ?* ✅\n`;
            confirmationText += `════════════════════════\n`;
            confirmationText += `🏆 Match : ${selectedMatch.equipe1} 🆚 ${selectedMatch.equipe2}\n`;
            confirmationText += `🎯 Ton pari : ${selectedTeam}\n`;
            confirmationText += `📊 Cote : ${cote}\n`;
            confirmationText += `💰 Mise : ${montant.toLocaleString()} ${devise}\n`;
            confirmationText += `💎 Gain potentiel : ${gainPotentiel.toLocaleString()} ${devise}\n\n`;
            confirmationText += `════════════════════════\n`;
            confirmationText += `*Tapez* \`oui\` *pour confirmer*\n`;
            confirmationText += `*Tapez* \`non\` *pour annuler*`;

            const message = await riza.sendMessage(m.chat, { text: confirmationText }, { quoted: quotedMsg });
            lastMessage = message;
            currentStep = `confirmation_pari_${devise}_${montant}`;
            betAmount = montant;
        };

        // Écouteur des messages
        const listener = async ({ messages }) => {
            if (!sessionActive) return;

            const msg = messages[0];
            if (!msg.message) return;

            const from = msg.key.participant || msg.key.remoteJid;
            if (from !== jid) return;

            const context = msg.message?.extendedTextMessage?.contextInfo;
            if (!context || context.stanzaId !== lastMessage?.key?.id) return;

            const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            const reponse = content.trim().toLowerCase();

            try {
                if (currentStep === "menu_principal") {
                    if (reponse === "1") {
                        await showMatchsDisponibles(msg);
                    }
                    else if (reponse === "2") {
                        await showMesParisEnCours(msg);
                    }
                    else if (reponse === "3") {
                        await showMesParisTermines(msg);
                    }
                    else if (reponse === "4") {
                        await showChoixDevise(msg);
                    }
                    else if (reponse === "5") {
                        sessionActive = false;
                        riza.ev.off("messages.upsert", listener);
                        await riza.sendMessage(m.chat, { text: "👋 À bientôt dans les paris !" }, { quoted: msg });
                    }
                    else {
                        await showMenuPrincipal(msg);
                    }
                }
                else if (currentStep === "selection_match") {
                    if (reponse === "0") {
                        await showMenuPrincipal(msg);
                    } else {
                        const index = parseInt(reponse) - 1;
                        if (index >= 0 && index < matchsData.actifs.length) {
                            await showDetailsMatch(matchsData.actifs[index], msg);
                        } else {
                            await showMatchsDisponibles(msg);
                        }
                    }
                }
                else if (currentStep === "details_match") {
                    if (reponse === "0") {
                        await showMatchsDisponibles(msg);
                    } else if (reponse === "1") {
                        await processPari(selectedMatch.equipe1, msg);
                    } else if (reponse === "2" && selectedMatch.coteNul) {
                        await processPari("Nul", msg);
                    } else if ((reponse === "2" && !selectedMatch.coteNul) || (reponse === "3" && selectedMatch.coteNul)) {
                        await processPari(selectedMatch.equipe2, msg);
                    } else {
                        await showDetailsMatch(selectedMatch, msg);
                    }
                }
                else if (currentStep === "choix_devise") {
                    if (reponse === "0") {
                        await showMenuPrincipal(msg);
                    } else if (reponse === "1") {
                        currentStep = "details_match_diamants";
                        await showDetailsMatch(selectedMatch, msg);
                    } else if (reponse === "2") {
                        currentStep = "details_match_rulith";
                        await showDetailsMatch(selectedMatch, msg);
                    } else {
                        await showChoixDevise(msg);
                    }
                }
                else if (currentStep.startsWith("montant_pari_")) {
                    if (reponse === "0") {
                        await showDetailsMatch(selectedMatch, msg);
                    } else {
                        const devise = currentStep.replace("montant_pari_", "");
                        const compteActuel = initCompte(jid);
                        const solde = devise === "💎" ? compteActuel.diamants : compteActuel.rulith;
                        
                        let montant = 0;
                        
                        if (reponse === "max") {
                            montant = solde;
                        } else {
                            montant = parseInt(reponse);
                            if (isNaN(montant) || montant <= 0) {
                                await riza.sendMessage(m.chat, {
                                    text: "❌ Montant invalide. Veuillez entrer un nombre positif."
                                }, { quoted: msg });
                                return processPari(selectedTeam, msg);
                            }
                        }
                        
                        // Vérifier les limites
                        if (montant < selectedMatch.miseMin) {
                            await riza.sendMessage(m.chat, {
                                text: `❌ Mise trop faible !\nMinimum : ${selectedMatch.miseMin} ${devise}`
                            }, { quoted: msg });
                            return processPari(selectedTeam, msg);
                        }
                        
                        if (montant > selectedMatch.miseMax) {
                            await riza.sendMessage(m.chat, {
                                text: `❌ Mise trop élevée !\nMaximum : ${selectedMatch.miseMax} ${devise}`
                            }, { quoted: msg });
                            return processPari(selectedTeam, msg);
                        }
                        
                        if (montant > solde) {
                            await riza.sendMessage(m.chat, {
                                text: `❌ Solde insuffisant !\nSolde disponible : ${solde} ${devise}`
                            }, { quoted: msg });
                            return processPari(selectedTeam, msg);
                        }
                        
                        await confirmerPari(montant, devise, msg);
                    }
                }
                else if (currentStep.startsWith("confirmation_pari_")) {
                    if (reponse === "oui") {
                        // Récupérer les données
                        const parts = currentStep.split('_');
                        const devise = parts[2];
                        const montant = parseInt(parts[3]);
                        
                        const cote = selectedTeam === selectedMatch.equipe1 ? selectedMatch.cote1 :
                                    selectedTeam === "Nul" ? selectedMatch.coteNul :
                                    selectedMatch.cote2;
                        
                        // Débiter le compte
                        const banque = loadArgent();
                        if (devise === "💎") {
                            banque[jid].diamants -= montant;
                        } else {
                            banque[jid].rulith -= montant;
                        }
                        saveArgent(banque);
                        
                        // Enregistrer le pari
                        const paris = loadParis();
                        let matchParis = paris.matchs.find(p => p.matchId === selectedMatch.id);
                        
                        if (!matchParis) {
                            matchParis = {
                                matchId: selectedMatch.id,
                                parieurs: {}
                            };
                            paris.matchs.push(matchParis);
                        }
                        
                        matchParis.parieurs[jid] = {
                            equipe: selectedTeam,
                            montant: montant,
                            devise: devise,
                            cote: cote,
                            date: new Date().toISOString(),
                            gainPotentiel: Math.round(montant * cote)
                        };
                        
                        saveParis(paris);
                        
                        // Confirmation
                        await riza.sendMessage(m.chat, {
                            text: `🎉 *PARI ENREGISTRÉ !* 🎉\n════════════════════════\n🏆 ${selectedMatch.equipe1} 🆚 ${selectedMatch.equipe2}\n🎯 Pari : ${selectedTeam}\n💰 Mise : ${montant} ${devise}\n🎯 Cote : ${cote}\n💎 Gain potentiel : ${Math.round(montant * cote)} ${devise}\n\n📊 Les gains seront crédités après la fin du match !`
                        }, { quoted: msg });
                        
                        await showMenuPrincipal(msg);
                        
                    } else if (reponse === "non") {
                        await riza.sendMessage(m.chat, {
                            text: "❌ Pari annulé."
                        }, { quoted: msg });
                        await showMenuPrincipal(msg);
                    } else {
                        await showMenuPrincipal(msg);
                    }
                }
                
            } catch (error) {
                console.error("Erreur dans parier:", error);
                await riza.sendMessage(m.chat, {
                    text: "❌ Une erreur est survenue. Retour au menu principal."
                }, { quoted: msg });
                await showMenuPrincipal(msg);
            }
        };

        // Démarrer la session
        riza.ev.on("messages.upsert", listener);
        await showMenuPrincipal();
    }
};