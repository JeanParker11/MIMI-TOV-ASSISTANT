# ⚔️ SYSTÈME DE COMPÉTENCES - UNIROLIST

## 📅 Date : 23 Octobre 2025

---

## 🎯 **STRUCTURE DU SYSTÈME**

### **Types de Compétences**
1. **Actives** : Nécessitent mention explicite dans le message du joueur
2. **Passives** : S'activent automatiquement quand conditions remplies

### **Catégories**
1. **Offensives** : Attaque, dégâts
2. **Défensives** : Protection, soin, résistance
3. **Mixtes** : Tout ce qui n'est ni offensif ni défensif (utilitaires, etc.)

---

## 📊 **SYSTÈME DE RANGS**

### **Utilisations par Rang (Actives)**
| Rang | Utilisations | Taux Réussite |
|------|--------------|---------------|
| E    | 3            | 20%           |
| D    | 6            | 40%           |
| C    | 12           | 60%           |
| B    | 24           | 70%           |
| A    | 48           | 80%           |
| S    | 96           | 90%           |

### **Durée des Runes (Compétences Temporaires)**
| Rang | Durée      |
|------|------------|
| E    | 1 semaine  |
| D    | 2 semaines |
| C    | 1 mois     |
| B    | 2 mois     |
| A    | 4 mois     |
| S    | 8 mois     |

**Limite :** Maximum **3 compétences de runes** par joueur

---

## 📁 **STRUCTURE DES FICHIERS**

### **data/competences/**
```
data/
  competences/
    actives.json    # Toutes les compétences actives
    passives.json   # Toutes les compétences passives
```

### **Structure d'une Compétence Active**
```json
{
  "id": "identifiant_unique",
  "nom": "Nom Lisible",
  "rang": "E|D|C|B|A|S",
  "type": "active",
  "categorie": "offensif|defensif|mixte",
  "faction": {
    "allowed": ["Arès", "Hermès", "Atlas"],
    "excluded": ["Hécate"]
  },
  "utilisations_par_rang": 3,
  "taux_reussite": 20,
  "description": "Description complète",
  "mecanique": {
    "declencheur": "commande_utilisateur",
    "condition": {
      "objet_requis": "arme_equipee"
    },
    "effet": {
      "type": "buff_stat",
      "stat": "force",
      "valeur": 10
    },
    "cout": {
      "type": "mana",
      "valeur_faction": {
        "Arès": 8,
        "Hermès": 7,
        "Atlas": 7
      }
    }
  }
}
```

### **Structure d'une Compétence Passive**
```json
{
  "id": "identifiant_unique",
  "nom": "Nom Lisible",
  "rang": "E|D|C|B|A|S",
  "type": "passive",
  "categorie": "offensif|defensif|mixte",
  "faction": {
    "allowed": ["Toutes"],
    "excluded": []
  },
  "taux_reussite": 20,
  "description": "Description complète",
  "mecanique": {
    "declencheur": "debut_tour_joueur|verification_continue|quand_attaque_recue|permanent",
    "condition": {
      "stat": "pv_pourcentage",
      "operateur": "<",
      "valeur": 25
    },
    "effet": {
      "type": "soin_pv|buff_stat|reduction_degats",
      "valeur": 5
    },
    "cout": null
  }
}
```

---

## 🔧 **FONCTIONS DU GESTIONNAIRE**

### **lib/competencesManager.js**

#### **Chargement**
```javascript
const { loadCompendiumComplet } = require('./lib/competencesManager');

const compendium = loadCompendiumComplet();
// { actives: {...}, passives: {...}, complet: {...} }
```

#### **Vérification de Faction**
```javascript
const { verifierFactionCompatible } = require('./lib/competencesManager');

const autorise = verifierFactionCompatible('Hermès', competence.faction);
```

#### **Jet de Réussite**
```javascript
const { verifierReussite } = require('./lib/competencesManager');

const reussit = verifierReussite(competence);
// true/false selon le rang et le jet aléatoire
```

#### **Calcul du Coût Mana**
```javascript
const { calculerCoutMana } = require('./lib/competencesManager');

const cout = calculerCoutMana(competence, 'Arès');
// Retourne le coût en Mana pour la faction
```

#### **Gestion des Runes**
```javascript
const { ajouterCompetenceRune } = require('./lib/competencesManager');

const resultat = ajouterCompetenceRune(jid, 'regeneration_pv_rune_e', 'E');
// { success: true/false, message: "..." }
```

#### **Vérification d'Expiration**
```javascript
const { verifierExpirationRunes } = require('./lib/competencesManager');

const expirees = verifierExpirationRunes();
// Retourne la liste des runes expirées
```

---

## 🎮 **UTILISATION EN JEU**

### **Activer une Compétence Active**
Le joueur doit **mentionner explicitement** la compétence dans son message :

```
"J'utilise Poing de braise avec 8 points de Mana sur le torse !"
```

Le bot :
1. Détecte le nom "Poing de braise"
2. Vérifie si le joueur possède cette compétence
3. Vérifie le coût en Mana (8 pour Arès)
4. Consomme le Mana
5. Lance le jet de réussite (40% pour rang D)
6. Applique l'effet si réussite

### **Notification Compétence Passive**
Lorsqu'une passive s'active, le bot envoie :

```
✨ COMPÉTENCE PASSIVE ACTIVÉE

Fureur du Blessé
→ +10 Force (PV < 25%)
```

---

## 📋 **COMPÉTENCES CRÉÉES**

### **Actives Offensives**
- ✅ Canalisation énergétique (E)
- ✅ Renforcement énergétique (E)
- ✅ Expulsion énergétique (E) - Hécate
- ✅ Cercle de répulsion (E) - Hécate
- ✅ Poing de braise (D)
- ✅ Scalpel de Fournaise (D)
- ✅ Lame incendiaire (D) - Hécate
- ✅ Éclat du brasier (D) - Hécate

### **Actives Défensives**
- ✅ Canalisation énergétique (E)
- ✅ Exosquelette 1 (E)
- ✅ Cercle de protection (E) - Hécate
- ✅ Dôme protecteur (E) - Hécate
- ✅ Rempart de Cendre (D)
- ✅ Étreinte ardente (D)
- ✅ Guérison (D) - Hécate

### **Passives**
- ✅ Régénération Mineure (E)
- ✅ Fureur du Blessé (C)
- ✅ Réflexes Augmentés (B) - Hermès
- ✅ Armure Naturelle (A) - Atlas
- ✅ Esquive Instinctive (S) - Hermès
- ✅ Rage du Berserker (B)
- ✅ Absorption Magique (A) - Hécate
- ✅ Contre-Attaque (C) - Arès
- ✅ Endurance Titanesque (S) - Atlas
- ✅ Concentration Arcanique (A) - Hécate

---

## 📝 **TYPES D'EFFETS DISPONIBLES**

### **Offensifs**
- `degats_feu` : Dégâts de feu
- `degats_magiques` : Dégâts magiques
- `projectile_magique` : Projectile magique
- `projectile_multiple` : Plusieurs projectiles
- `projectile_explosif` : Projectile avec explosion
- `buff_stat` : Augmente une statistique
- `buff_arme` : Améliore l'arme
- `buff_degats` : Augmente les dégâts

### **Défensifs**
- `soin_pv` : Soigne des PV
- `buff_defense` : Augmente défense
- `armure_energetique` : Crée une armure
- `bouclier_frontal` : Bouclier devant
- `bouclier_spherique` : Bouclier 360°
- `mur_defensif` : Crée un mur
- `aura_defensive` : Aura protectrice
- `reduction_degats` : Réduit dégâts reçus
- `esquive_automatique` : Esquive auto

### **Mixtes**
- `zone_repulsion` : Repousse ennemis
- `conversion_degats_mana` : Convertit dégâts en Mana
- `attaque_automatique` : Contre-attaque
- `reduction_cout_mana` : Réduit coûts

---

## 🚀 **PROCHAINES ÉTAPES**

### **1. Compléter le Compendium**
Il reste **~240 compétences** à convertir depuis les fichiers sources :

**Fichiers à convertir :**
- Techniques Offensives : D (16), C (10), B (8), A (3), S (3)
- Techniques Défensives : D (16), C (10), B (8), A (2), S (2)
- Techniques Mixtes : E (50), D (50), C (35), B (19), A (5), S (5)

### **2. Créer les Commandes**
- `!competences` - Liste les compétences du joueur
- `!utiliser [nom]` - Utilise une compétence active
- `!apprendre_rune [nom]` - Apprend une rune
- `!oublier_rune [nom]` - Oublie une rune
- `!compendium [rang]` - Affiche les compétences par rang

### **3. Intégrer avec le Combat**
- Détecter les mentions de compétences dans `IA/combatIA.js`
- Vérifier les conditions et coûts
- Appliquer les effets
- Notifier les passives

### **4. Système de Cooldown**
- Tracker les utilisations par combat
- Bloquer si limite atteinte
- Reset en fin de combat

---

## ⚙️ **INTÉGRATION AVEC LES ARMES**

Les armes peuvent avoir des compétences actives via le champ `capacite_active_id` :

```json
{
  "nom": "CRYONIA ❄️",
  "capacite_active_id": "souffle_glace_1"
}
```

Le bot charge automatiquement cette compétence quand l'arme est équipée.

---

## 💾 **STOCKAGE DANS LA FICHE JOUEUR**

### **Structure**
```json
{
  "pseudo": "JoueurX",
  "faction": "Arès",
  "competences_actives": ["canalisation_energetique_off", "poing_braise_d"],
  "competences_passives": ["fureur_du_blesse"],
  "competences_runes": [
    {
      "id": "regeneration_pv_rune_e",
      "rang": "E",
      "date_acquisition": "2025-10-23T04:00:00Z",
      "date_expiration": "2025-10-30T04:00:00Z"
    }
  ]
}
```

---

## 🔍 **RECHERCHE DE COMPÉTENCES**

Le bot crée automatiquement une table de correspondance :
- "poing de braise" → `poing_braise_d`
- "guérison" → `guerison_d`
- "cercle de protection" → `cercle_protection`

Insensible à la casse et aux accents.

---

## ✅ **ÉTAT ACTUEL**

**Fichiers créés :**
- ✅ `data/competences/actives.json` (16 exemples)
- ✅ `data/competences/passives.json` (10 exemples)
- ✅ `lib/competencesManager.js` (gestionnaire complet)

**Statut :** Base fonctionnelle créée. Prêt pour ajout massif des ~240 compétences restantes.

---

**Document créé le :** 23 Octobre 2025
**Version :** 1.0.0
