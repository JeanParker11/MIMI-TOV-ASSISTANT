const express = require('express');
const { getPairingCode } = require('./state');

const app = express();
app.use(express.json());

app.get('/', (_req, res) => {
  res.type('html').send(`
    <html>
      <head><title>MIMI Console</title></head>
      <body style="font-family: sans-serif; padding: 20px;">
        <h1>MIMI-TOV-ASSISTANT • Console</h1>
        <p>Statut: <b>OK</b></p>
        <h2>Code de pairage WhatsApp</h2>
        <pre style="font-size: 24px; padding: 12px; background:#f4f4f4;">${getPairingCode() || 'Pas encore généré'}</pre>
        <p>Définissez la variable d’environnement <code>WA_PHONE_NUMBER</code> avec votre numéro (ex: 22898133388) pour générer un code de pairage automatiquement au démarrage si la session n’est pas encore enregistrée.</p>
      </body>
    </html>
  `);
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/pairing', (_req, res) => res.json({ pairingCode: getPairingCode() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[WEB] Console démarrée sur port ${PORT}`);
});
