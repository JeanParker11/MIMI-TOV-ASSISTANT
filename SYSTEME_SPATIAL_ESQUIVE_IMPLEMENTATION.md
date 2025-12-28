# 🗺️ SYSTÈME DE REPÉRAGE SPATIAL 3D & ESQUIVE - IMPLÉMENTATION COMPLÈTE

## 📅 Date de création
26 Octobre 2025 - 03:17 UTC

---

## 📋 RÉSUMÉ

Le système de repérage spatial 3D et d'esquive complet a été **entièrement implémenté**. Les joueurs peuvent maintenant se déplacer sur une grille tactique, les attaques respectent les portées, et les esquives sont calculées en temps réel selon la physique.

**Échelle : 1 case = 1 mètre**

---

## 🎮 SYSTÈMES IMPLÉMENTÉS

### 1. **SYSTÈME DE REPÉRAGE 3D** (`lib/spatialSystem.js`)

#### **Coordonnées et Positions**
```javascript
position: {
    x: 5,  // Axe horizontal (Ouest/Est)
    y: 20, // Axe horizontal (Sud/Nord)
    z: 0   // Axe vertical (Hauteur/Altitude, sol = 0)
}
```

#### **Fonctions Principales**

##### A. Calcul de Distance
```javascript
calculerDistance3D(pos1, pos2)
// Formule : √((x2-x1)² + (y2-y1)² + (z2-z1)²)
// Retour : Distance en mètres (décimal)

calculerDistanceArrondie(pos1, pos2)
// Retour : Distance arrondie en cases (entier)
```

##### B. Points de Mouvement (PM)
```javascript
calculerPointsMouvementMax(vitesse)
// Vitesse 9 → 9 PM par tour
// Vitesse 8 → 8 PM par tour
// etc.

calculerCoutDeplacement(chemin)
// Mouvement horizontal : 1 PM par case
// Mouvement vertical : 2 PM par case
```

##### C. Pathfinding A*
```javascript
trouverChemin(depart, arrivee, arene)
// Trouve le chemin optimal en évitant les obstacles
// Utilise l'algorithme A* en 3D
// Retourne : Array de positions [{x,y,z}, ...] ou null
```

##### D. Gestion des Obstacles
```javascript
estAccessible(position, arene)
// Vérifie : dans limites ET pas d'obstacle
// Retour : boolean

estObstacle(position, obstacles)
// Vérifie si position occupée par obstacle
```

##### E. Validation de Portée
```javascript
verifierPortee(attaquant, cible, portee)
// Vérifie si distance respecte portee.min et portee.max
// Retourne : {valide, distance, message}
```

---

### 2. **SYSTÈME D'ESQUIVE COMPLET** (`lib/esquiveSystem.js`)

#### **Principe Fondamental**
```
FORMULE D'OR : Temps_Esquive_Total < Temps_Impact
```

#### **A. Calcul du Temps d'Impact**
```javascript
calculerTempsImpact(distance, vitesseAttaque)
// Formule : Temps = Distance (m) / Vitesse_Attaque (m/s)

// Exemple :
// Distance : 5m, Vitesse attaque : 10 m/s
// → Temps d'impact = 0.5 secondes
```

#### **B. Calcul du Temps de Réaction**
```javascript
obtenirTempsReactionBase(vitesse)
// Barème selon vitesse du défenseur :
// Vitesse 9 → 0.2s
// Vitesse 8 → 0.3s
// Vitesse 7 → 0.4s
// Vitesse 6 → 0.5s
// Vitesse 5 → 0.6s
// Vitesse ≤4 → 0.7s

calculerTempsReaction(defenseur, contexte)
// Applique modificateurs :
// - En action : x2 (temps doublé)
// - Éveil Hermès Hawkeye : x0.5 (divisé par 2)
// - Debuff Arès Ascendence : +0.1s par stack
```

#### **C. Calcul du Temps de Mouvement**
```javascript
calculerTempsMouvementEsquive(distanceEsquive, vitesseDeplacement)
// Formule : Temps = Distance_Esquive (m) / Vitesse_Déplacement (m/s)
// Distance esquive par défaut : 1m

// Exemple :
// Vitesse déplacement : 8 m/s
// → Temps mouvement = 1/8 = 0.125s
```

#### **D. Verdict Final**
```javascript
esquiveComplete(attaquant, defenseur, action, contexte)
// 1. Calcule Temps_Impact
// 2. Calcule Temps_Reaction + Temps_Mouvement
// 3. Compare : Si Total < Impact → ESQUIVE RÉUSSIE

// Retourne :
{
    succes: boolean,
    tempsImpact: number,
    tempsEsquiveTotal: number,
    details: {...},
    message: string
}
```

---

### 3. **ARÈNES CONFIGURÉES** (`data/arenes.json`)

#### **6 Arènes Créées**

##### A. **Arène du Titan** 🏛️
```json
{
    "dimensions": {"x_max": 40, "y_max": 40, "z_max": 10},
    "obstacles": [
        "5 poteaux métalliques (hauteur 5-8m)",
        "Poteau central (20, 20) hauteur 8m"
    ],
    "proprietes": {
        "sol": "dur_metallique",
        "type_deplacement_favorise": "contournement_vertical"
    }
}
```
**Particularité :** Oblige à contourner ou grimper les poteaux

##### B. **Arène Sylvestre** 🌳
```json
{
    "dimensions": {"x_max": 35, "y_max": 35, "z_max": 8},
    "obstacles": [
        "4 arbres (hauteur 6m)",
        "3 buissons (ralentissent)"
    ],
    "proprietes": {
        "visibilite": "limitee",
        "cout_deplacement_buisson": 2
    }
}
```
**Particularité :** Couverture naturelle, visibilité réduite

##### C. **Sanctuaire de Neige** ❄️
```json
{
    "dimensions": {"x_max": 30, "y_max": 30, "z_max": 6},
    "proprietes": {
        "sol": "glace",
        "malus_vitesse": 0.8,
        "risque_glissade": true
    }
}
```
**Particularité :** Sol glissant, risque de glissade

##### D. **Arène Standard** ⚔️
```json
{
    "dimensions": {"x_max": 30, "y_max": 30, "z_max": 5},
    "obstacles": [],
    "proprietes": {
        "visibilite": "parfaite"
    }
}
```
**Particularité :** Combat pur sans obstacles

##### E. **Fosse de Lave** 🌋
```json
{
    "obstacles": [
        "Zones de lave (dégâts 20 PV)",
        "Plateformes en hauteur (z=2)"
    ],
    "aleas": [
        {"type": "contact_lave", "degats": 20},
        {"type": "projection_lave", "degats": 30}
    ]
}
```
**Particularité :** Zones mortelles, nécessite sauts

##### F. **Labyrinthe des Ruines** 🏚️
```json
{
    "dimensions": {"x_max": 40, "y_max": 40, "z_max": 7},
    "obstacles": [
        "Murs de ruines (hauteur 4m)",
        "Passages étroits"
    ],
    "proprietes": {
        "visibilite": "faible",
        "passages_etroits": true
    }
}
```
**Particularité :** Embuscades, navigation complexe

---

## 🔧 INTÉGRATION DANS LE COMBAT

### **Modifications de `combatLogic.js`**

#### Initialisation du Combattant
```javascript
initCombattant(playerId, fiche, positionInitiale) {
    return {
        // ... stats existantes ...
        position: positionInitiale || {x: 0, y: 0, z: 0},
        points_mouvement: {
            actuels: calculerPointsMouvementMax(vitesse),
            max: calculerPointsMouvementMax(vitesse)
        },
        actionEnCours: false,
        // ...
    };
}
```

### **Modifications de `combatManager.js`**

#### A. Initialisation du Combat
```javascript
initierCombat(combatId, joueur1, joueur2, groupInfo, sock, chatId) {
    // Récupère l'arène avec dimensions et obstacles
    let areneDuCombat = arenesData.arene_standard;
    
    // Positionne les joueurs
    joueur1.position = areneDuCombat.position_depart.joueur1;
    joueur2.position = areneDuCombat.position_depart.joueur2;
    
    // Affiche distance initiale
    const distance = calculerDistanceArrondie(j1.position, j2.position);
}
```

#### B. Début de Tour
```javascript
demarrerTour(combatState, sock) {
    // Réinitialise PM
    joueurActif.points_mouvement.actuels = max;
    joueurActif.actionEnCours = false;
    
    // Affiche : Position, PM, Distance
}
```

#### C. Traitement des Actions
```javascript
processTurn(combat, p2_pavé, sock) {
    // 1. DÉPLACEMENTS
    if (res.type === 'DEPLACEMENT') {
        const deplacement = spatialSystem.tenterDeplacement(
            joueur, 
            positionCible, 
            combat.arene
        );
        // Consomme les PM, met à jour position
    }
    
    // 2. ATTAQUES
    else if (res.type === 'ATTAQUE') {
        // Vérifie portée
        // Tente esquive automatique
        const esquiveResult = esquiveSystem.esquiveComplete(...);
        
        if (esquiveResult.succes) {
            // Attaque esquivée
        } else {
            // Applique dégâts
        }
    }
}
```

---

## 📊 FLUX D'UN TOUR DE COMBAT

### **Étape 1 : Début du Tour**
```
1. Réinitialisation des PM du joueur actif
2. Affichage :
   - Position actuelle (x, y, z)
   - PM disponibles
   - Distance avec adversaire
```

### **Étape 2 : Déclaration d'Action (Joueur)**
```
Le joueur déclare son action en langage naturel :
- "Je me déplace vers le poteau au centre puis frappe"
- "Je cours vers lui et donne un coup de pied"
- "Je recule de 3 cases et lance un sort"
```

### **Étape 3 : Analyse IA**
```
L'IA Gemini analyse et extrait :
1. DÉPLACEMENTS :
   - Position cible (x, y, z)
   - Description
   
2. ATTAQUES :
   - Type d'attaque
   - Force utilisée
   - Zone ciblée
   - Vitesse de l'attaque (m/s)
```

### **Étape 4 : Validation & Exécution**
```
A. DÉPLACEMENTS :
   ✓ Chemin existe ? (pathfinding A*)
   ✓ PM suffisants ?
   → Mise à jour position et consommation PM

B. ATTAQUES :
   ✓ Portée respectée ?
   ✓ Esquive réussie ? (calcul temps)
   → Application dégâts ou esquive
```

### **Étape 5 : Affichage Résultat**
```
1. Narration épique (IA)
2. État détaillé :
   - PV/PF de chaque joueur
   - Positions mises à jour
   - PM restants
   - Distance actuelle
   - Statuts (saignement, étourdi, etc.)
```

---

## 💡 EXEMPLES CONCRETS

### **Exemple 1 : Déplacement Simple**

**Action joueur :**
> "Je cours vers mon adversaire"

**Traitement :**
```javascript
Position actuelle : (5, 20, 0)
Position adversaire : (35, 20, 0)
Distance : 30m

Chemin trouvé : 30 cases horizontales
Coût : 30 PM
PM disponibles : 9 PM

RÉSULTAT : ❌ PM insuffisants
→ Se déplace seulement de 9m vers (14, 20, 0)
```

### **Exemple 2 : Attaque avec Esquive**

**Situation :**
```javascript
Attaquant : Position (10, 20, 0)
Défenseur : Position (11, 20, 0)
Distance : 1m

Attaque : Coup de pied (vitesse 8 m/s)
```

**Calculs :**
```javascript
// ATTAQUANT
Temps_Impact = 1m / 8 m/s = 0.125s

// DÉFENSEUR (Vitesse 9)
Temps_Réaction = 0.2s (base vitesse 9)
Temps_Mouvement = 1m / 9 m/s = 0.111s
Temps_Total = 0.2 + 0.111 = 0.311s

// VERDICT
0.311s > 0.125s → ❌ ESQUIVE ÉCHOUÉE
→ L'attaque touche
```

### **Exemple 3 : Esquive Réussie avec Éveil**

**Situation :**
```javascript
Défenseur Hermès en ÉVEIL (Hawkeye actif)
Vitesse : 9
Temps_Réaction_Base : 0.2s
Hawkeye : x0.5 → 0.1s

Attaque à 3m, vitesse 10 m/s
```

**Calculs :**
```javascript
Temps_Impact = 3m / 10 m/s = 0.3s

Temps_Réaction = 0.1s (Hawkeye)
Temps_Mouvement = 1m / 9 m/s = 0.111s
Temps_Total = 0.211s

// VERDICT
0.211s < 0.3s → ✅ ESQUIVE RÉUSSIE !
Marge : 0.089s
```

---

## 🎯 RÈGLES DE PORTÉE SPÉCIFIQUES

### **Corps à Corps**
```javascript
// Coups de poing, coudes, tête
portee: {min: 0, max: 0}
// Doit être dans la MÊME CASE (x, y, z identiques)
```

### **Coups de Pied**
```javascript
portee: {min: 0, max: 1}
// Case adjacente (1m de distance)
```

### **Armes de Mêlée**
```javascript
// Épée, hache, lance
portee: {min: 0, max: 2}
```

### **Armes à Distance**
```javascript
// Arc
portee: {min: 4, max: 20}
// NE PEUT PAS attaquer en corps à corps

// Sorts magiques
portee: {min: 1, max: 9}
// Variable selon PM investis
```

---

## 📈 AVANTAGES TACTIQUES PAR ARÈNE

| Arène | Faction Favorisée | Raison |
|-------|-------------------|--------|
| **Titan** | Hermès, Hécate | Agilité pour grimper poteaux |
| **Sylvestre** | Hécate | Magie végétale, couverture |
| **Sanctuaire Neige** | Atlas | Peu affecté par glace |
| **Standard** | Arès | Combat équilibré |
| **Fosse Lave** | Hécate | Sorts à distance |
| **Labyrinthe** | Hermès | Vitesse, embuscades |

---

## ✅ CHECKLIST D'IMPLÉMENTATION

### **Systèmes de Base**
- ✅ Coordonnées 3D (x, y, z)
- ✅ Calcul distance euclidienne
- ✅ Points de Mouvement (PM)
- ✅ Pathfinding A* en 3D
- ✅ Gestion obstacles
- ✅ Vérification portée

### **Système d'Esquive**
- ✅ Temps d'impact
- ✅ Temps de réaction (avec barème)
- ✅ Temps de mouvement
- ✅ Formule verdict (temps total < impact)
- ✅ Modificateurs (en action, éveil)
- ✅ Conditions spéciales (étourdi, immobilisé)

### **Arènes**
- ✅ 6 arènes configurées
- ✅ Dimensions 3D
- ✅ Positions de départ
- ✅ Obstacles avec coordonnées
- ✅ Propriétés spécifiques
- ✅ Aléas d'arène

### **Intégration Combat**
- ✅ Initialisation avec positions
- ✅ Réinitialisation PM par tour
- ✅ Affichage positions/distances
- ✅ Traitement déplacements IA
- ✅ Validation portée automatique
- ✅ Esquive automatique
- ✅ État détaillé après tour

---

## 🚀 UTILISATION

### **Pour le Bot (Automatique)**
Le bot interprète automatiquement les descriptions naturelles :
- "Je cours vers lui" → Calcule chemin optimal
- "Je recule de 3 mètres" → Déplacement inverse
- "Je grimpe sur le poteau" → Mouvement vertical (z+)
- "Je frappe sa tête" → Vérifie portée, calcule esquive

### **Pour les Joueurs (Langage Naturel)**
Les joueurs n'ont AUCUNE commande à apprendre :
```
❌ PAS DE : /move 10 20 0
❌ PAS DE : /attack pied

✅ JUSTE : "Je me rapproche et donne un coup de pied dans ses jambes"
✅ L'IA analyse et exécute
```

---

## 📝 FICHIERS CRÉÉS/MODIFIÉS

### **Nouveaux Fichiers**
1. `lib/spatialSystem.js` - Système de repérage 3D (317 lignes)
2. `lib/esquiveSystem.js` - Système d'esquive complet (197 lignes)
3. `data/arenes.json` - Configuration des 6 arènes
4. `SYSTEME_SPATIAL_ESQUIVE_IMPLEMENTATION.md` - Cette documentation

### **Fichiers Modifiés**
1. `lib/combatLogic.js` - Ajout position, PM, imports
2. `lib/combatManager.js` - Intégration complète déplacements/esquive

---

## 🎓 FORMULES RÉCAPITULATIVES

### **Distance 3D**
```
D = √((x₂-x₁)² + (y₂-y₁)² + (z₂-z₁)²)
```

### **Temps d'Impact**
```
T_impact = Distance / Vitesse_Attaque
```

### **Temps d'Esquive**
```
T_esquive = T_réaction + T_mouvement
T_réaction = T_base × Modificateur_Action
T_mouvement = Distance_Esquive / Vitesse_Déplacement
```

### **Verdict Esquive**
```
SI T_esquive < T_impact ALORS
    Esquive_Réussie = TRUE
SINON
    Esquive_Réussie = FALSE
```

---

**Système spatial 3D et esquive implémenté avec succès ! 🗺️⚡**

---

**Auteur :** UNIROLIST Dev Team  
**Version :** 1.0.0  
**Date :** 26 Octobre 2025  
**Échelle :** 1 case = 1 mètre
