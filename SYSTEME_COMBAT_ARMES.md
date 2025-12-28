# 🗡️ SYSTÈME DE COMBAT ET D'ARMES - UNIROLIST

## 📦 Fichiers Créés

### **Bibliothèques (lib/)**
1. **`equipementManager.js`** - Gestion de l'équipement et des armes
2. **`combatEngine.js`** - Moteur de physique de combat

### **Modules IA (IA/)**
3. **`combatIA.js`** - Assistant IA pour les combats
4. **`armesIA.js`** - Assistant IA pour les questions sur les armes

### **Commandes (commands/)**
5. **`equiper.js`** - Équiper une arme
6. **`desarmer.js`** - Retirer une arme
7. **`arsenal.js`** - Consulter l'arsenal disponible
8. **`analyser.js`** - Analyser des actions de combat (admin)

### **Données (data/)**
9. **`armes.json`** - Base de données des armes (10 armes d'exemple)
10. **`combats_actifs.json`** - Suivi des combats en cours

### **Fichiers GitHub Intégrés**
- `commands/arene.js`
- `commands/caisse.js`
- `commands/regles.js`
- `commands/rembourser.js`
- `commands/stats.js`
- `commands/transfert.js`
- `commands/combat.js` (mis à jour)

---

## 🎮 FONCTIONNALITÉS

### **1. SYSTÈME D'ARMES**

#### **Structure des Armes**
```json
{
  "nom": "Lame de l'Aube",
  "faction": {
    "allowed": ["Hécate", "Arès"],
    "excluded": []
  },
  "rang": "S",
  "type": "tranchant",
  "resistance": 85,
  "capacite": {
    "nom": "Éclat Solaire",
    "type": "active",
    "description": "..."
  },
  "inventaire": {
    "actuel": 1,
    "max_global": 5
  },
  "valeur": 1200
}
```

#### **Grades d'Armes**
- **Grade E** [1-5 Rs] → Pénétration 10%
- **Grade D** [6-15 Rs] → Pénétration 25%
- **Grade C** [16-25 Rs] → Pénétration 40%
- **Grade B** [26-35 Rs] → Pénétration 60%
- **Grade A** [36-45 Rs] → Pénétration 80%
- **Grade S** [46-100 Rs] → Pénétration 100%

#### **Types d'Armes**
- **🔨 Contondantes** : +20% dégâts d'écrasement
- **🗡️ Tranchantes** : Pénétration d'armure + saignement
- **🏹 Perforantes** : Perforation/implantation/ricochet
- **✨ Magiques** : Effets spéciaux

---

### **2. PHYSIQUE DE COMBAT**

#### **Limites par Faction**
| Faction | Vitesse Max | Coup Max | Magie Max |
|---------|-------------|----------|-----------|
| Hermès  | 9 m/s       | 7 Rs     | 7 PM      |
| Arès    | 8 m/s       | 8 Rs     | 8 PM      |
| Hécate  | 7 m/s       | 7 Rs     | 9 PM      |
| Atlas   | 7 m/s       | 9 Rs     | 7 PM      |

#### **Résistances par Zone**
- **Tête** : 20% de la Force max
- **Torse** : 35% de la Force max
- **Jambes** : 15% de la Force max (chaque)
- **Bras** : 7.5% de la Force max (chaque)

**Modificateurs :**
- **Atlas** : +15% sur toutes les Rs
- **Hermès** : -10% sur toutes les Rs

#### **Résolution Corps vs Corps**
1. **Coup Critique** (Force > Rs) : Dégâts aux PV, test étourdissement
2. **Parade** (Force = Rs) : Aucun dégât, Rs baisse de 1
3. **Coup Faible** (Force < Rs) : Dégâts de recul à l'attaquant

#### **Étourdissement**
- **Coup critique** : 20% de chance (40% si Esprit ≤ 20)
- **Point sensible** : 50% de chance (90% si Esprit ≤ 20)
- **3 coups critiques** : Étourdissement automatique

#### **État de Peur**
Si Esprit ≤ 10% : Offensives réduites à 20%

---

### **3. COMMANDES UTILISATEURS**

#### **`!equiper [nom_arme] [emplacement]`**
Équipe une arme dans un emplacement (1, 2 ou 3)
```
!equiper Lame de l'Aube 1
!equiper Couteau de Voyageur
```

#### **`!desarmer [emplacement]`**
Retire une arme d'un emplacement
```
!desarmer 1
!desarmer 2
```

#### **`!arsenal [nom_arme]`**
Consulte l'arsenal disponible ou les détails d'une arme
```
!arsenal
!arsenal Lame de l'Aube
```

---

### **4. COMMANDES ADMIN**

#### **`!analyser corps @attaquant @defenseur zone force`**
Analyse un combat corps à corps
```
!analyser corps @alice @bob tete 8
```

#### **`!analyser contondant rsArme rsCible force`**
Analyse une attaque avec arme contondante
```
!analyser contondant 40 30 7
```

#### **`!analyser tranchant rsArme rsZone grade force`**
Analyse une attaque avec arme tranchante
```
!analyser tranchant 35 25 B 6
```

#### **`!analyser perforant rsArme rsZone force`**
Analyse une attaque avec arme perforante
```
!analyser perforant 20 30 8
```

#### **`!analyser rs @joueur`**
Affiche les résistances d'un joueur
```
!analyser rs @alice
```

---

### **5. MODULES IA**

#### **Combat IA**
- Détecte automatiquement les débuts de combat
- Valide les attaques (limites de faction)
- Enregistre l'historique des actions
- Propose des suggestions aux modérateurs
- Détecte la fin des combats

#### **Armes IA**
- Répond aux questions sur les armes
- Explique les grades et types
- Affiche les armes compatibles avec une faction
- Guide pour l'équipement

**Activation dans `data/parametres.json` :**
```json
{
  "COMBATIA": true,
  "ARMESIA": true
}
```

---

## 🔧 INTÉGRATION

### **Vérification d'Équipement**
```javascript
const { verifierEquipement } = require('./lib/equipementManager');

// Vérifie si une faction peut équiper une arme
const autorise = verifierEquipement('Hermès', arme.faction);
```

### **Calcul de Combat**
```javascript
const { resoudreCorpsVsCorps } = require('./lib/combatEngine');

// Résout un combat
const resultat = resoudreCorpsVsCorps(forceUtilisee, rsZone, factionAtt, factionDef);
console.log(resultat.type); // 'critique', 'parade', 'faible'
```

### **Statistiques d'Armes**
```javascript
const { calculerStatsArme } = require('./lib/equipementManager');

const stats = calculerStatsArme(arme);
console.log(stats.grade); // E, D, C, B, A, S
console.log(stats.penetrationArmure); // 10, 25, 40, 60, 80, 100
```

---

## 📚 DOCUMENTATION UTILISÉE

### **Fichiers de Référence**
- `data/Physique_combat.txt` - Règles physiques détaillées
- `Combat.txt` - Mécanismes de gameplay
- `Armes/Logique_armes.txt` - Système d'équipement
- `Arènes.txt` - Configuration des arènes

### **Structure des Factions**
Basée sur la logique existante dans `commands/boutique.js` et les fichiers de données sociales.

---

## ✅ COMPATIBILITÉ

Le système est **100% compatible** avec :
- ✅ Système de fiches existant
- ✅ Système économique (banque/boutique)
- ✅ Système de guildes
- ✅ Modules IA existants (Mimi, Suggestions, Maintenance)
- ✅ Toutes les commandes actuelles

**Aucune modification destructrice** n'a été apportée aux fichiers existants.

---

## 🚀 PROCHAINES ÉTAPES

1. **Tester les commandes** (`!equiper`, `!arsenal`, `!analyser`)
2. **Ajouter plus d'armes** dans `data/armes.json`
3. **Intégrer avec la boutique** pour l'achat d'armes
4. **Créer des quêtes** pour obtenir des armes rares
5. **Implémenter le système d'arènes** complet
6. **Ajouter des effets de capacités** d'armes en combat

---

## 📝 NOTES IMPORTANTES

- Les modules IA sont **activés par défaut** dans `parametres.json`
- Le système respecte la **logique de faction** pour l'équipement
- Les **résistances sont calculées dynamiquement** selon les stats
- Le système est **extensible** : facile d'ajouter de nouvelles armes
- **10 armes d'exemple** sont déjà disponibles dans la base

---

**Créé le :** 22 Octobre 2025
**Auteur :** UNIROLIST Dev Team
**Version :** 1.0.0
