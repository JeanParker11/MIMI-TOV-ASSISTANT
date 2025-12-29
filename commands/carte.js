const axios = require("axios");

module.exports = {
  name: "carte",
  category: "UNIROLIST",
  description: "Affiche la carte interactive de Valoria",
  allowedForAll: true,

  async execute(riza, m, args) {
    const jid = m.sender;
    const imageUrl = "https://files.catbox.moe/50zhmd.jpg";
    let sessionActive = true;

    const menuPrincipal = `🗺️ *EXPLORATION DE VALORIA*
═════════════════
1. 🏰 Villes & Structures
2. 🌍 Régions Géographiques
3. ⛏️ Mines & Ressources
4. ⛩️ Sanctuaires Sacrés
5. ⚠️ Indicateur de Danger (IDV)
6. 🌊 Mers, Lacs & Détroits

❌ Tapez *quitter* pour fermer.
═════════════════
_Répondez avec un numéro pour voir les détails._`;

    // 1. ENVOI DE L'IMAGE AVEC LE MENU
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      await riza.sendMessage(m.chat, { 
        image: buffer, 
        caption: menuPrincipal 
      }, { quoted: m });
    } catch (e) {
      console.error("Erreur image carte:", e);
      return riza.sendMessage(m.chat, { text: "❌ Erreur de chargement de l'image." });
    }

    // 2. GESTIONNAIRE AMÉLIORÉ
    const listener = async ({ messages }) => {
      if (!sessionActive) return;
      const msg = messages[0];
      if (!msg.message) return;

      const from = msg.key.participant || msg.key.remoteJid;
      if (from !== jid) return; // Seul celui qui a tapé .carte peut répondre

      const content = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim().toLowerCase();

      // GESTION DU QUITTER
      if (content === "quitter" || content === "❌") {
        sessionActive = false;
        riza.ev.off("messages.upsert", listener);
        return await riza.sendMessage(m.chat, { text: "👋 Atlas refermé." }, { quoted: msg });
      }

      // GESTION DU RETOUR (0)
      if (content === "0") {
        return await riza.sendMessage(m.chat, { text: "⬆️ *Veuillez choisir une option (1-6) dans le menu sous la carte.*" }, { quoted: msg });
      }

      let texteDetail = "";
      switch (content) {
        case "1":
          texteDetail = `🏰 *VILLES DE VALORIA*\n\n📍 *Eldoria* (IDV 3%) : Capitale.\n📍 *Ikna* (IDV 46%) : Nécropole.\n📍 *Melnah* (IDV 29%) : Mines d'or.\n📍 *Neive* (IDV 41%) : Hiver éternel.`;
          break;
        case "2":
          texteDetail = `🌍 *RÉGIONS GÉOGRAPHIQUES*\n\n🌲 *Forêt Fantôme* (IDV 58%)\n🏜️ *Désert Oublié* (IDV 62%)\n🔥 *Ishvar* (IDV 51%) : Volcan.\n🍃 *Slothful Domain* (IDV 17%) : Paisible.`;
          break;
        case "3":
          texteDetail = `⛏️ *MINES & RESSOURCES*\n\n🪨 *Fer* : 29,500 Kg/mois\n🟡 *Or* : 620 Kg/mois\n💎 *Diamant* : 75 Kg/mois\n♦️ *Rubis* : 280 Kg/mois`;
          break;
        case "4":
          texteDetail = `⛩️ *SANCTUAIRES*\n\n🌀 *Englouti* (63%)\n❄️ *Neive* (58%)\n🔥 *Ishvar* (52%)\n🌿 *Sylvestre* (19%)`;
          break;
        case "5":
          texteDetail = `⚠️ *DANGERS (IDV)*\n\n🔴 *EXTRÊME* : Shaddath (72%)\n🟠 *HAUT* : Désert Oublié (62%), Nid de Dragons (61%)\n🟢 *BAS* : Eldoria (3%)`;
          break;
        case "6":
          texteDetail = `🌊 *EAUX DE VALORIA*\n\n⚓ *Mer Équinoxe* (56%)\n🌀 *Bassin Passeuse* (57%)\n💧 *Lac Aetheria* (27%)`;
          break;
        default:
          return; // Ignore les autres messages
      }

      // Envoi du détail avec bouton retour
      await riza.sendMessage(m.chat, { 
        text: `${texteDetail}\n\n══════════════\n↩️ Tapez *0* pour revenir au menu.` 
      }, { quoted: msg });
    };

    riza.ev.on("messages.upsert", listener);

    // Désactivation automatique après 5 minutes d'inactivité
    setTimeout(() => {
      if (sessionActive) {
        sessionActive = false;
        riza.ev.off("messages.upsert", listener);
      }
    }, 300000);
  }
};
