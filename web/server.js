require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const settings = require('../settings');

const app = express();
const port = 3000;

const dataDir = path.join(__dirname, '..', 'data');
const pendingFichesPath = path.join(dataDir, 'pending_fiches.json');
const fichesPath = path.join(dataDir, 'fiches.json');
const usersPath = path.join(dataDir, 'users.json');
const playerUsersPath = path.join(dataDir, 'player_users.json');
const palmaresPath = path.join(dataDir, 'palmares.json');
const banquePath = path.join(dataDir, 'banque.json');
const socialPath = path.join(dataDir, 'social.json');

// S'assurer que les fichiers de données existent
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(pendingFichesPath)) fs.writeFileSync(pendingFichesPath, '[]');
if (!fs.existsSync(fichesPath)) fs.writeFileSync(fichesPath, '{}');
if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, '{}');
if (!fs.existsSync(playerUsersPath)) fs.writeFileSync(playerUsersPath, '{}');
if (!fs.existsSync(palmaresPath)) fs.writeFileSync(palmaresPath, '{}');
if (!fs.existsSync(banquePath)) fs.writeFileSync(banquePath, '{}');
if (!fs.existsSync(socialPath)) fs.writeFileSync(socialPath, '{}');


// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Mettre à true en production avec HTTPS
}));

// --- Middleware d'Authentification ---
function checkAdminAuth(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect('/login');
  }
}

function checkPlayerAuth(req, res, next) {
    if (req.session.isPlayer) {
      next();
    } else {
      res.redirect('/login-player');
    }
}

// --- Routes Générales ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/sheets', (req, res) => res.sendFile(path.join(__dirname, 'views', 'sheets.html')));

// --- Routes Administrateur ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/admin', checkAdminAuth, (req, res) => res.sendFile(path.join(__dirname, 'views', 'admin.html')));
app.get('/admin/edit/:id', checkAdminAuth, (req, res) => res.sendFile(path.join(__dirname, 'views', 'edit.html')));

// --- Routes Joueur ---
app.get('/login-player', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login-player.html')));
app.get('/register-player', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register-player.html')));
app.get('/dashboard', checkPlayerAuth, (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));

app.get('/logout-player', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


// --- Logique d'Authentification ---
app.post('/login', (req, res) => {
    // ... (logique admin existante)
});

app.post('/register-player', (req, res) => {
    const { tel, password } = req.body;
    fs.readFile(fichesPath, 'utf-8', (err, fichesData) => {
        if (err) return res.status(500).send("Erreur serveur.");
        try {
            const fiches = JSON.parse(fichesData);
            if (!fiches[tel]) {
                return res.status(400).send("Aucune fiche de personnage approuvée n'est associée à ce numéro.");
            }

            fs.readFile(playerUsersPath, 'utf-8', (err, usersData) => {
                if (err) return res.status(500).send("Erreur serveur.");
                try {
                    const users = JSON.parse(usersData);
                    if (users[tel]) {
                        return res.status(400).send("Un compte existe déjà pour ce numéro.");
                    }
                    const hashedPassword = bcrypt.hashSync(password, 10);
                    users[tel] = hashedPassword;
                    fs.writeFile(playerUsersPath, JSON.stringify(users, null, 2), (err) => {
                        if (err) return res.status(500).send("Erreur lors de la création du compte.");
                        res.redirect('/login-player');
                    });
                } catch (e) {
                    res.status(500).send("Erreur lors de l'analyse des données utilisateur.");
                }
            });
        } catch (e) {
            res.status(500).send("Erreur lors de l'analyse des fiches.");
        }
    });
});

app.post('/login-player', (req, res) => {
    const { tel, password } = req.body;
    fs.readFile(playerUsersPath, 'utf-8', (err, usersData) => {
        if (err) return res.status(500).send("Erreur serveur.");
        try {
            const users = JSON.parse(usersData);
            const hashedPassword = users[tel];
            if (hashedPassword && bcrypt.compareSync(password, hashedPassword)) {
                req.session.isPlayer = true;
                req.session.playerTel = tel;
                res.redirect('/dashboard');
            } else {
                res.status(401).send("Numéro de téléphone ou mot de passe incorrect.");
            }
        } catch (e) {
            res.status(500).send("Erreur lors de l'analyse des données utilisateur.");
        }
    });
});

// --- API ---

app.get('/api/settings', (req, res) => {
    res.json({
        imgthumb: settings.imgthumb
    });
});

app.get('/api/player-dashboard', checkPlayerAuth, (req, res) => {
    const tel = req.session.playerTel;
    try {
        const fiches = JSON.parse(fs.readFileSync(fichesPath, 'utf-8'));
        const palmares = JSON.parse(fs.readFileSync(palmaresPath, 'utf-8'));
        const banque = JSON.parse(fs.readFileSync(banquePath, 'utf-8'));
        const social = JSON.parse(fs.readFileSync(socialPath, 'utf-8'));

        res.json({
            fiche: fiches[tel] || {},
            palmares: palmares[tel] || null,
            banque: banque[tel] || null,
            social: social[tel] || null
        });
    } catch (error) {
        res.status(500).send("Erreur lors de la récupération des données.");
    }
});


// ... (autres routes et API)

app.listen(port, () => {
  console.log(`UNIROLIST-LABS listening at http://localhost:${port}`);
});
