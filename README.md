# UNIROLIST-LABS

Ce projet est un bot WhatsApp multifonctionnel avec une interface web pour la gestion des fiches de personnages de jeu de rôle.

## Fonctionnalités

*   **Bot WhatsApp :** Un bot multifonctionnel pour interagir avec les joueurs.
*   **Site Web UNIROLIST-LABS :** Une interface web pour :
    *   Soumettre des fiches de personnage.
    *   Consulter les fiches approuvées.
    *   Un panneau d'administration pour gérer les soumissions.

## Installation

1.  Clonez le dépôt :
    ```bash
    git clone https://github.com/JeanParker11/MIMI-TOV-ASSISTANT.git
    ```
2.  Installez les dépendances :
    ```bash
    npm install
    ```
3.  Configurez vos variables d'environnement en créant un fichier `.env` à la racine du projet. Vous pouvez vous inspirer du fichier `.env.example` s'il existe.

## Création de l'administrateur

Pour utiliser le panneau d'administration du site web, vous devez d'abord créer un compte administrateur.

1.  Exécutez le script de configuration :
    ```bash
    node setup_admin.js
    ```
2.  Suivez les instructions pour entrer un nom d'utilisateur et un mot de passe.

## Démarrage

Pour démarrer le bot et le site web, exécutez la commande suivante :

```bash
npm start
```

Le site web sera accessible à l'adresse `http://localhost:3000`.
