#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DATA_DIR = path.join(__dirname, '..', 'data');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI manquant');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('[Migrate] Connecté à Mongo');

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const name = path.basename(file, '.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.warn(`[Migrate] JSON invalide: ${file}`);
      continue;
    }

    const col = mongoose.connection.collection(name);
    if (Array.isArray(data)) {
      if (data.length === 0) continue;
      await col.deleteMany({});
      await col.insertMany(data.map(doc => ({ ...doc })));
      console.log(`[Migrate] ${name}: ${data.length} documents importés`);
    } else if (data && typeof data === 'object') {
      const entries = Object.entries(data).map(([k, v]) => ({ _id: k, ...v }));
      if (entries.length === 0) continue;
      await col.deleteMany({});
      await col.insertMany(entries);
      console.log(`[Migrate] ${name}: ${entries.length} documents importés`);
    } else {
      console.log(`[Migrate] ${name}: type non supporté, ignoré`);
    }
  }

  await mongoose.disconnect();
  console.log('[Migrate] Terminé');
}

main().catch(err => {
  console.error('[Migrate] Erreur:', err);
  process.exit(1);
});
