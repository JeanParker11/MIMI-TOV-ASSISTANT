# MIMI-TOV-ASSISTANT (PARKY-MD)

Assistant multifonction pour WhatsApp et Telegram, centré sur l’univers RP "Tales of Valoria" et la communauté UNIROLIST. Le bot embarque une IA (Mimi) pour la conversation, des commandes de gestion RP (fiches, palmarès, guildes, boutique, quêtes), des outils d’administration et une intégration Telegram.


## Sommaire
- **[Caractéristiques principales](#caractéristiques-principales)**
- **[Architecture du projet](#architecture-du-projet)**
- **[Prérequis](#prérequis)**
- **[Installation](#installation)**
- **[Configuration](#configuration)**
- **[Lancement](#lancement)**
- **[Variables d’environnement](#variables-denvironnement)**
- **[Données et persistance](#données-et-persistance)**
- **[Commandes principales](#commandes-principales)**
- **[IA et génération d’images](#ia-et-génération-dimages)**
- **[Déploiement](#déploiement)**
- **[Sécurité](#sécurité)**
- **[Licence](#licence)**


## Caractéristiques principales
- **WhatsApp Bot (Baileys)**: gestion des messages, groupes, réactions, plugins dynamiques (`@whiskeysockets/baileys`).
- **Telegram Bot (Telegraf)**: exécution en parallèle via `telegram/index.js`.
- **IA conversationnelle Mimi**: réponses contextuelles et ciblées sur l’univers Valoria via `lib/geminiAI.js` et `IA/mimi.js`.
- **Système de plugins/commandes**: nombreuses commandes sous `commands/` (fiches, palmarès, boutique, quêtes, admin, etc.).
- **Système de suggestions de commandes**: correction et suggestion des commandes proches (`IA/suggestions.js`).
- **Mode maintenance**: blocage global des commandes non-owners avec message enrichi (`IA/maintenance.js`).
- **Journaux détaillés**: logs lisibles via `pino-pretty`, messages colorisés (`lib/logger.js`).
- **Hot reload**: rechargement des modules et paramètres (`lib/watcher.js`, watch de `settings.js`, `parametres.json`).
- **Stockage JSON**: données persistées dans `data/` (fiches, boutique, quêtes, etc.).


## Architecture du projet
- **`index.js`**: point d’entrée. Initialise settings, Telegram, connexion WhatsApp (`lib/connexion.js`), écoute des événements (messages, réactions), maintenance, IA et plugins.
- **`settings.js`**: configuration globale (owner, nom du bot, préfixe, images, clés), synchronisation et watch de `data/parametres.json` pour activer/désactiver des IA.
- **`IA/`**:
  - `index.js`: charge dynamiquement les modules IA et exécute ceux activés dans `global.parametres`.
  - `mimi.js`: IA principale (conversation, lore Valoria, génération de stickers).
  - `suggestions.js`: suggère une commande si l’utilisateur se trompe.
  - `maintenance.js`: bloque les commandes si la maintenance est active.
- **`commands/`**: commandes du bot (ex: `aide.js`, `enregistrer.js`, `admins.js`, `boutique.js`, `inviter.js`, etc.).
- **`lib/`**: utilitaires (connexion, base de données JSON, EXIF stickers, génération de texte/fancy, plugins, image generator, etc.).
- **`data/`**: fichiers JSON persistants (fiches, palmarès, boutique, quêtes, histoire Valoria, etc.).
- **`telegram/`**: bot Telegram (`telegram/index.js`, commandes et utilitaires spécifiques).
- **`render.yaml`**: configuration de déploiement (Render).
- **`assets/`**: ressources diverses (stickers…).
- **`Consignes.txt`**: spécifications des menus Boutique (Acheter/Vendre/Convertir) et logiques métier.


## Prérequis
- **Node.js >= 16**
- Un compte WhatsApp et la possibilité de scanner un QR Code au premier démarrage.
- (Optionnel) Un bot Telegram (token via BotFather).


## Installation
```bash
# Cloner le dépôt
git clone https://github.com/JeanParker11/PARKY-MD.git
cd PARKY-MD

# Installer les dépendances
npm install
```


## Configuration
- Ouvrir `settings.js` et ajuster au besoin:
  - **`global.owner`**, **`global.sudo`**, **`global.botname`**, **`global.prefix`**
  - Liens groupe/chaîne, pack stickers, etc.
  - Par défaut, des clés de démonstration existent: configurez plutôt les variables d’environnement.
- Les IA actives sont synchronisées avec `data/parametres.json` (créé/complété automatiquement). Vous pouvez y désactiver des IA en plaçant `false` sur la clé correspondante (ex: `"MIMI": true`).

Exemple minimal de `data/parametres.json`:
```json
{
  "MIMI": true,
  "SUGGESTIONS": true,
  "MAINTENANCE": false
}
```


## Lancement
- **WhatsApp (mode normal)**
```bash
npm start
```
- **WhatsApp (mode dev avec nodemon)**
```bash
npm run dev
```
- **Telegram uniquement**
```bash
npm run telegram
```
Au premier lancement WhatsApp, scannez le QR Code dans la console. Le bot affichera les logs d’initialisation et commencera à écouter les messages.


## Variables d’environnement
Pour éviter de modifier `settings.js`, réglez ces variables:
- **`GEMINI_API_KEY`**: clé Google Generative AI (utilisée par `lib/geminiAI.js`).
- **`TELEGRAM_BOT_TOKEN`**: token du bot Telegram.
- **`TELEGRAM_ADMIN_ID`**: identifiant numérique d’un admin Telegram.

Sur Render (`render.yaml`):
- Les variables `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_ID` doivent être définies dans le dashboard (sync: false).


## Données et persistance
- Le dossier `data/` contient les fichiers JSON utilisés par les commandes et l’IA:
  - **`fiches.json`**: fiches des joueurs.
  - **`palmares.json`**: victoires/défaites/nuls.
  - **`boutique.json`**: inventaire et prix.
  - **`quetes.json`**, **`rappels.json`**, **`groupe.json`**, etc.
  - **`histoire.json`**: lore Valoria (consommé par `IA/mimi.js`).
  - **`mimi-history.json`**: contexte conversationnel persistant par utilisateur/conversation.
- Les fichiers sont créés au besoin. Vous pouvez les sauvegarder/archiver (voir `global.BACKUP_PATH`).


## Commandes principales
Le préfixe par défaut est défini dans `settings.js` (ex: `!`). Quelques exemples:
- **`!aide`** (`commands/aide.js`): liste toutes les commandes disponibles avec permissions.
- **`!enregistrer`** (`commands/enregistrer.js`) [admin]: workflow guidé pour créer la fiche d’un joueur, validation par admin, statistiques qui doivent totaliser 150.
- **`!admins`** (`commands/admins.js`) [groupe]: mentionne les admins du groupe courant.
- **Boutique** (`commands/boutique.js`, `commands/boutiquier.js`, `commands/facturer.js`, etc.): achats, ventes, conversions RU↔gemmes selon les consignes de `Consignes.txt`.
- **Guildes** (`creerguilde.js`, `modifguilde.js`, `dissouguilde.js`, `rejoindre.js`, `quitter.js`, `transfertchef.js`…): gestion des guildes.
- **Quêtes** (`quete.js`, `voirquete.js`, `suppquete.js`…): gestion des quêtes et rappels.
- **Sudo/Owner/Admin** (`setsudo.js`, `delsudo.js`, `resetsudo.js`, `autoriser.js`, `interdire.js`, `bannir.js`…): contrôles avancés.

Astuce: Si vous tapez une commande inconnue, l’IA de suggestions proposera une correction probable.


## IA et génération d’images
- **Conversation Mimi** (`IA/mimi.js`):
  - Détecte le contexte (privé/groupe/chaîne) et répond si mentionnée, citée ou appelée par nom.
  - Mode Valoria strict si la question porte sur le lore (utilise exclusivement `data/histoire.json`).
  - Historise les échanges par conversation dans `data/mimi-history.json`.
  - Peut envoyer aléatoirement un sticker préparé depuis `assets/stickers/` avec métadonnées (`lib/exif.js`).
- **Génération d’images** (`lib/imageGenerator.js`): commande naturelle dans vos messages (ex: "Dessine/Imagine/Fais … une image …").
- **Gemini** (`lib/geminiAI.js`): wrapper sur l’API Google Generative AI.


## Déploiement
- Fichier `render.yaml` prêt pour Render:
  - **build**: `npm install`
  - **start**: `node index.js`
  - Variables d’environnement non synchronisées (à définir dans le dashboard Render).


## Sécurité
- Ne laissez pas de clés sensibles en clair dans `settings.js`. Utilisez les variables d’environnement.
- Restreignez les commandes sensibles aux rôles appropriés (owner, sudo, admin).
- Surveillez la taille et l’accès au dossier `data/` (contient des informations de joueurs).


## Licence
- Licence: `ISC` (voir `package.json`).
