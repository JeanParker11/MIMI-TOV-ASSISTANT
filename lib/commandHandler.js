const fs = require('fs');
const commands = {};

function registerCommand(commandInfo, handler) {
    commands[commandInfo.nomCom] = {
        ...commandInfo,
        handler
    };
}

async function handleCommand(message, sock) {
    const [commandName, ...args] = message.body.slice(1).trim().split(/ +/);
    const command = commands[commandName];

    if (command) {
        const commandOptions = {
            repondre: (text) => sock.sendMessage(message.chat, { text }),
            nomAuteurMessage: message.pushName,
            auteurMessage: message.sender,
            args
        };
        await command.handler(message.chat, sock, commandOptions);
    }
}

function loadCommands() {
    const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`../commands/${file}`);
        const commandName = command.name || command.nomCom;
        if (commandName && command.execute) {
            registerCommand({ nomCom: commandName, categorie: command.category, reaction: command.reaction }, command.execute);
        } else {
            console.log(`⚠️ Ignoré : ${file} (pas de nom ou de fonction execute)`);
        }
    }
}

module.exports = {
    registerCommand,
    handleCommand,
    loadCommands,
    commands
};