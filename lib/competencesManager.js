const fs = require('fs');
const path = require('path');

const COMPETENCES_ACTIVES_PATH = path.join(__dirname, '../data/competences/actives.json');
const COMPETENCES_PASSIVES_PATH = path.join(__dirname, '../data/competences/passives.json');
const FICHES_PATH = path.join(__dirname, '../data/fiches.json');
const SOCIAL_PATH = path.join(__dirname, '../data/social.json');

// Dictionnaires de chances de réussite et d'utilisations par rang
const CHANCES_REUSSITE_PAR_RANG = {
  'E': 20,
  'D': 40,
  'C': 60,
  'B': 70,
  'A': 80,
  'S': 90
};

const UTILISATIONS_PAR_RANG = {
  'E': 3,
  'D': 6,
  'C': 12,
  'B': 24,
  'A': 48,
  'S': 96
};

const DUREE_RUNES_PAR_RANG = {
  'E': 7 * 24 * 60 * 60 * 1000, // 1 semaine en ms
  'D': 14 * 24 * 60 * 60 * 1000, // 2 semaines
  'C': 30 * 24 * 60 * 60 * 1000, // 1 mois
  'B': 60 * 24 * 60 * 60 * 1000, // 2 mois
  'A': 120 * 24 * 60 * 60 * 1000, // 4 mois
  'S': 240 * 24 * 60 * 60 * 1000 // 8 mois
};

/**
 * Charge toutes les compétences (actives + passives)
 */
function loadCompendiumComplet() {
  const actives = JSON.parse(fs.readFileSync(COMPETENCES_ACTIVES_PATH, 'utf-8'));
  const passives = JSON.parse(fs.readFileSync(COMPETENCES_PASSIVES_PATH, 'utf-8'));
  
  return {
    actives,
    passives,
    complet: { ...actives, ...passives }
  };
}

/**
 * Crée une table de correspondance nom -> ID pour les compétences actives
 */
function creerTableCorrespondance(actives) {
  const table = {};
  
  for (const [id, competence] of Object.entries(actives)) {
    const nomLower = competence.nom.toLowerCase();
    table[nomLower] = id;
  }
  
  return table;
}

/**
 * Vérifie si une faction peut utiliser une compétence
 */
function verifierFactionCompatible(factionJoueur, competenceFaction) {
  const allowed = Array.isArray(competenceFaction.allowed) 
    ? competenceFaction.allowed 
    : [competenceFaction.allowed];
  
  const excluded = Array.isArray(competenceFaction.excluded)
    ? competenceFaction.excluded
    : [];
  
  // Normaliser la faction du joueur
  const factionNorm = factionJoueur.toLowerCase();
  
  // Vérifier si exclu
  if (excluded.some(f => f.toLowerCase() === factionNorm)) {
    return false;
  }
  
  // Vérifier si autorisé
  if (allowed.some(f => f.toLowerCase() === 'toutes')) {
    return true;
  }
  
  return allowed.some(f => f.toLowerCase() === factionNorm);
}

/**
 * Vérifie le jet de réussite d'une compétence
 */
function verifierReussite(competence) {
  // Si override de taux de réussite
  if (competence.mecanique?.taux_reussite_override !== undefined) {
    const jet = Math.random() * 100;
    return jet <= competence.mecanique.taux_reussite_override;
  }
  
  // Sinon utiliser le rang
  const chanceBase = CHANCES_REUSSITE_PAR_RANG[competence.rang];
  
  if (!chanceBase) {
    return true; // Succès automatique si pas de rang
  }
  
  const jet = Math.random() * 100;
  return jet <= chanceBase;
}

/**
 * Calcule le coût en Mana d'une compétence pour une faction donnée
 */
function calculerCoutMana(competence, faction) {
  const cout = competence.mecanique?.cout;
  
  if (!cout) return 0;
  
  if (cout.type === 'mana') {
    // Coût par faction
    if (cout.valeur_faction) {
      return cout.valeur_faction[faction] || cout.valeur_min || 0;
    }
    
    // Coût fixe
    if (cout.valeur) {
      return cout.valeur;
    }
    
    // Coût minimum
    if (cout.valeur_min) {
      return cout.valeur_min;
    }
  }
  
  return 0;
}

/**
 * Récupère les compétences d'un joueur (armes + armures + runes)
 */
function getCompetencesJoueur(jid) {
  const fiches = JSON.parse(fs.readFileSync(FICHES_PATH, 'utf-8'));
  const fiche = fiches[jid];
  
  if (!fiche) {
    return {
      actives: [],
      passives: [],
      runes: []
    };
  }
  
  return {
    actives: fiche.competences_actives || [],
    passives: fiche.competences_passives || [],
    runes: fiche.competences_runes || []
  };
}

/**
 * Ajoute une compétence de rune à un joueur
 */
function ajouterCompetenceRune(jid, competenceId, rang) {
  const fiches = JSON.parse(fs.readFileSync(FICHES_PATH, 'utf-8'));
  
  if (!fiches[jid]) {
    return {
      success: false,
      message: "❌ Fiche introuvable."
    };
  }
  
  // Initialiser les runes si nécessaire
  if (!fiches[jid].competences_runes) {
    fiches[jid].competences_runes = [];
  }
  
  // Vérifier la limite de 3 runes
  if (fiches[jid].competences_runes.length >= 3) {
    return {
      success: false,
      message: "❌ **LIMITE ATTEINTE**\n\nTu as déjà 3 compétences de runes. Utilise `!oublier_rune [nom]` pour en libérer une."
    };
  }
  
  // Calculer la date d'expiration
  const dateAcquisition = new Date();
  const duree = DUREE_RUNES_PAR_RANG[rang];
  const dateExpiration = new Date(dateAcquisition.getTime() + duree);
  
  // Ajouter la rune
  fiches[jid].competences_runes.push({
    id: competenceId,
    rang,
    date_acquisition: dateAcquisition.toISOString(),
    date_expiration: dateExpiration.toISOString()
  });
  
  // Sauvegarder
  fs.writeFileSync(FICHES_PATH, JSON.stringify(fiches, null, 2));
  
  const dureeTexte = {
    'E': '1 semaine',
    'D': '2 semaines',
    'C': '1 mois',
    'B': '2 mois',
    'A': '4 mois',
    'S': '8 mois'
  }[rang];
  
  return {
    success: true,
    message: `✅ **COMPÉTENCE ACQUISE**\n\nTu as appris la compétence de rang ${rang}.\nElle expirera dans ${dureeTexte}.`
  };
}

/**
 * Retire une compétence de rune d'un joueur
 */
function retirerCompetenceRune(jid, competenceId) {
  const fiches = JSON.parse(fs.readFileSync(FICHES_PATH, 'utf-8'));
  
  if (!fiches[jid] || !fiches[jid].competences_runes) {
    return {
      success: false,
      message: "❌ Aucune compétence de rune trouvée."
    };
  }
  
  const index = fiches[jid].competences_runes.findIndex(r => r.id === competenceId);
  
  if (index === -1) {
    return {
      success: false,
      message: "❌ Cette compétence n'est pas dans tes runes."
    };
  }
  
  fiches[jid].competences_runes.splice(index, 1);
  fs.writeFileSync(FICHES_PATH, JSON.stringify(fiches, null, 2));
  
  return {
    success: true,
    message: "✅ Compétence de rune retirée avec succès."
  };
}

/**
 * Vérifie et supprime les compétences de runes expirées
 */
function verifierExpirationRunes() {
  const fiches = JSON.parse(fs.readFileSync(FICHES_PATH, 'utf-8'));
  const maintenant = new Date();
  let expirationsDetectees = [];
  
  for (const [jid, fiche] of Object.entries(fiches)) {
    if (!fiche.competences_runes) continue;
    
    const runesRestantes = [];
    
    for (const rune of fiche.competences_runes) {
      const dateExpiration = new Date(rune.date_expiration);
      
      if (dateExpiration <= maintenant) {
        // Rune expirée
        expirationsDetectees.push({
          jid,
          competenceId: rune.id,
          rang: rune.rang
        });
      } else {
        // Rune encore valide
        runesRestantes.push(rune);
      }
    }
    
    fiche.competences_runes = runesRestantes;
  }
  
  if (expirationsDetectees.length > 0) {
    fs.writeFileSync(FICHES_PATH, JSON.stringify(fiches, null, 2));
  }
  
  return expirationsDetectees;
}

/**
 * Récupère une compétence par son nom (recherche insensible à la casse)
 */
function trouverCompetenceParNom(nom, compendium) {
  const nomLower = nom.toLowerCase().trim();
  
  for (const [id, competence] of Object.entries(compendium.complet)) {
    if (competence.nom.toLowerCase() === nomLower) {
      return { id, competence };
    }
  }
  
  return null;
}

/**
 * Consomme une utilisation d'une compétence active
 */
function consommerUtilisation(jid, competenceId, combatActifId) {
  // Cette fonction sera appelée pendant un combat
  // Elle doit tracker les utilisations dans data/combats_actifs.json
  const COMBATS_PATH = path.join(__dirname, '../data/combats_actifs.json');
  
  if (!fs.existsSync(COMBATS_PATH)) {
    fs.writeFileSync(COMBATS_PATH, JSON.stringify({}, null, 2));
  }
  
  const combats = JSON.parse(fs.readFileSync(COMBATS_PATH, 'utf-8'));
  
  if (!combats[combatActifId]) {
    return { success: false, message: "Combat introuvable" };
  }
  
  // Initialiser le tracker d'utilisations si nécessaire
  if (!combats[combatActifId].utilisations_competences) {
    combats[combatActifId].utilisations_competences = {};
  }
  
  if (!combats[combatActifId].utilisations_competences[jid]) {
    combats[combatActifId].utilisations_competences[jid] = {};
  }
  
  const utilisations = combats[combatActifId].utilisations_competences[jid];
  
  if (!utilisations[competenceId]) {
    utilisations[competenceId] = 0;
  }
  
  utilisations[competenceId]++;
  
  fs.writeFileSync(COMBATS_PATH, JSON.stringify(combats, null, 2));
  
  return { success: true };
}

module.exports = {
  loadCompendiumComplet,
  creerTableCorrespondance,
  verifierFactionCompatible,
  verifierReussite,
  calculerCoutMana,
  getCompetencesJoueur,
  ajouterCompetenceRune,
  retirerCompetenceRune,
  verifierExpirationRunes,
  trouverCompetenceParNom,
  consommerUtilisation,
  CHANCES_REUSSITE_PAR_RANG,
  UTILISATIONS_PAR_RANG,
  DUREE_RUNES_PAR_RANG
};
