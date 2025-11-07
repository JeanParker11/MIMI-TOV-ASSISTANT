const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let waSocket;

async function startWhatsAppConnection(socket) {
  if (waSocket) {
    socket.emit('status', 'Une connexion est déjà en cours.');
    return;
  }

  const { state, saveCreds } = await useMultiFileAuthState("session");

  waSocket = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
  });

  waSocket.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect.error).output.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        // Tentez de reconnecter ou informez l'utilisateur
      }
      io.emit('status', 'Déconnecté');
      waSocket = null;
    } else if (connection === 'open') {
      io.emit('status', 'Connecté');
    }
  });

  waSocket.ev.on("creds.update", saveCreds);

  return waSocket;
}

io.on('connection', (socket) => {
  console.log('Client connecté');

  socket.on('request-pairing-code', async (data) => {
    if (!waSocket) {
      await startWhatsAppConnection(socket);
    }

    if (!waSocket.authState.creds.registered) {
      try {
        const code = await waSocket.requestPairingCode(data.phoneNumber);
        socket.emit('pairing-code', { code: code.match(/.{1,4}/g).join('-') });
      } catch (error) {
        socket.emit('error', 'Erreur lors de la génération du code d\'appairage.');
      }
    } else {
      socket.emit('status', 'Déjà connecté');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});
