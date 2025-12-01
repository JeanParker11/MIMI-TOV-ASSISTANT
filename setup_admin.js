const readline = require('readline');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const path = require('path');

const usersPath = path.join(__dirname, 'data', 'users.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Entrez le nom d\'utilisateur de l\'administrateur : ', (username) => {
  rl.question('Entrez le mot de passe de l\'administrateur : ', (password) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    fs.readFile(usersPath, (err, data) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Erreur lors de la lecture du fichier des utilisateurs :', err);
        rl.close();
        return;
      }

      const users = data ? JSON.parse(data) : {};
      users[username] = hash;

      fs.writeFile(usersPath, JSON.stringify(users, null, 2), (err) => {
        if (err) {
          console.error('Erreur lors de l\'enregistrement de l\'utilisateur :', err);
        } else {
          console.log(`L'utilisateur administrateur "${username}" a été créé avec succès.`);
        }
        rl.close();
      });
    });
  });
});
