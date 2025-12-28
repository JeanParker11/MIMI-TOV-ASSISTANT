const fs = require('fs');
const { registerCommand } = require('./lib/commandHandler');

function loadCommands() {
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        try {
            const command = require(`./commands/${file}`);
            const commandName = command.name || command.nomCom;
            if (commandName && command.execute) {
                registerCommand({ nomCom: commandName, categorie: command.category, reaction: command.reaction }, command.execute);
            } else {
                console.log(`⚠️ Ignoré : ${file} (pas de nom ou de fonction execute)`);
            }
        } catch (e) {
            console.error(`❌ Erreur chargement commande ${file} :`, e);
        }
    }
}

module.exports = { loadCommands };