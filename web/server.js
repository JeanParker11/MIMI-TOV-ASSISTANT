require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const port = 3000;

const dataDir = path.join(__dirname, '..', 'data');
const pendingFichesPath = path.join(dataDir, 'pending_fiches.json');
const fichesPath = path.join(dataDir, 'fiches.json');
const usersPath = path.join(dataDir, 'users.json');

// S'assurer que les fichiers de données existent
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(pendingFichesPath)) fs.writeFileSync(pendingFichesPath, '[]');
if (!fs.existsSync(fichesPath)) fs.writeFileSync(fichesPath, '{}');
if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, '{}');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// Middleware pour vérifier l'authentification
function checkAuth(req, res, next) {
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.post('/register', (req, res) => {
    const newFiche = req.body;

    const force = parseInt(newFiche.force) || 0;
    const esprit = parseInt(newFiche.esprit) || 0;
    const pouvoir = parseInt(newFiche.pouvoir) || 0;
    const total = force + esprit + pouvoir;

    if (total !== 150) {
        return res.status(400).send('La somme des statistiques (force, esprit, pouvoir) doit être égale à 150.');
    }

    newFiche.id = Date.now().toString();

    fs.readFile(pendingFichesPath, (err, data) => {
        if (err) return res.status(500).send('Erreur serveur.');
        try {
            const pendingFiches = JSON.parse(data);
            pendingFiches.push(newFiche);
            fs.writeFile(pendingFichesPath, JSON.stringify(pendingFiches, null, 2), (err) => {
                if (err) return res.status(500).send('Erreur serveur.');
                res.send('Fiche soumise avec succès !');
            });
        } catch (e) {
            res.status(500).send('Erreur serveur : impossible de parser les données.');
        }
    });
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    fs.readFile(usersPath, (err, data) => {
        if (err) return res.status(500).send('Erreur serveur.');
        try {
            const users = JSON.parse(data);
            const hashedPassword = users[username];

            if (hashedPassword && bcrypt.compareSync(password, hashedPassword)) {
                req.session.isAuthenticated = true;
                res.redirect('/admin');
            } else {
                res.status(401).send('Nom d\'utilisateur ou mot de passe incorrect.');
            }
        } catch (e) {
            res.status(500).send('Erreur serveur : impossible de parser les données.');
        }
    });
});

app.get('/admin', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/admin/edit/:id', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'edit.html'));
});

app.get('/sheets', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'sheets.html'));
});

app.get('/api/pending-fiches', checkAuth, (req, res) => {
    fs.readFile(pendingFichesPath, (err, data) => {
        if (err) return res.status(500).send('Erreur serveur.');
        try {
            res.json(JSON.parse(data));
        } catch (e) {
            res.status(500).send('Erreur serveur : impossible de parser les données.');
        }
    });
});

app.get('/api/pending-fiches/:id', checkAuth, (req, res) => {
    const ficheId = req.params.id;
    fs.readFile(pendingFichesPath, (err, data) => {
        if (err) return res.status(500).send('Erreur serveur.');
        try {
            const pendingFiches = JSON.parse(data);
            const fiche = pendingFiches.find(f => f.id === ficheId);
            if (fiche) {
                res.json(fiche);
            } else {
                res.status(404).send('Fiche non trouvée.');
            }
        } catch (e) {
            res.status(500).send('Erreur serveur : impossible de parser les données.');
        }
    });
});

app.get('/api/fiches', (req, res) => {
    fs.readFile(fichesPath, (err, data) => {
        if (err) return res.status(500).send('Erreur serveur.');
        try {
            res.json(JSON.parse(data));
        } catch (e) {
            res.status(500).send('Erreur serveur : impossible de parser les données.');
        }
    });
});

app.post('/api/fiches/:id/approve', checkAuth, (req, res) => {
    const ficheId = req.params.id;

    fs.readFile(pendingFichesPath, (err, data) => {
        if (err) return res.status(500).send('Erreur serveur.');
        try {
            let pendingFiches = JSON.parse(data);
            const ficheToApprove = pendingFiches.find(f => f.id === ficheId);

            if (!ficheToApprove) {
                return res.status(404).send('Fiche non trouvée.');
            }

            fs.readFile(fichesPath, (err, data) => {
                if (err) return res.status(500).send('Erreur serveur.');
                try {
                    const fiches = JSON.parse(data);
                    const newFiche = {
                        [ficheToApprove.tel]: {
                            ...ficheToApprove,
                        }
                    }
                    delete newFiche[ficheToApprove.tel].id;
                    fiches[ficheToApprove.tel] = newFiche[ficheToApprove.tel];

                    fs.writeFile(fichesPath, JSON.stringify(fiches, null, 2), (err) => {
                        if (err) return res.status(500).send('Erreur serveur.');

                        pendingFiches = pendingFiches.filter(f => f.id !== ficheId);

                        fs.writeFile(pendingFichesPath, JSON.stringify(pendingFiches, null, 2), (err) => {
                            if (err) return res.status(500).send('Erreur serveur.');
                            res.sendStatus(200);
                        });
                    });
                } catch (e) {
                    res.status(500).send('Erreur serveur : impossible de parser les données.');
                }
            });
        } catch (e) {
            res.status(500).send('Erreur serveur : impossible de parser les données.');
        }
    });
});

app.post('/api/fiches/:id/reject', checkAuth, (req, res) => {
    const ficheId = req.params.id;

    fs.readFile(pendingFichesPath, (err, data) => {
        if (err) return res.status(500).send('Erreur serveur.');
        try {
            let pendingFiches = JSON.parse(data);
            pendingFiches = pendingFiches.filter(f => f.id !== ficheId);

            fs.writeFile(pendingFichesPath, JSON.stringify(pendingFiches, null, 2), (err) => {
                if (err) return res.status(500).send('Erreur serveur.');
                res.sendStatus(200);
            });
        } catch (e) {
            res.status(500).send('Erreur serveur : impossible de parser les données.');
        }
    });
});

app.post('/api/fiches/:id/edit', checkAuth, (req, res) => {
    const ficheId = req.params.id;
    const updatedFiche = req.body;

    fs.readFile(pendingFichesPath, (err, data) => {
        if (err) return res.status(500).send('Erreur serveur.');
        try {
            let pendingFiches = JSON.parse(data);
            const index = pendingFiches.findIndex(f => f.id === ficheId);

            if (index === -1) {
                return res.status(404).send('Fiche non trouvée.');
            }

            pendingFiches[index] = { ...pendingFiches[index], ...updatedFiche };

            fs.writeFile(pendingFichesPath, JSON.stringify(pendingFiches, null, 2), (err) => {
                if (err) return res.status(500).send('Erreur serveur.');
                res.sendStatus(200);
            });
        } catch (e) {
            res.status(500).send('Erreur serveur : impossible de parser les données.');
        }
    });
});

app.listen(port, () => {
  console.log(`UNIROLIST-LABS listening at http://localhost:${port}`);
});
