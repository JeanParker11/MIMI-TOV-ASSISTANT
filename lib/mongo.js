const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

const MediaSchema = new mongoose.Schema({
  chat: String,
  sender: String,
  type: { type: String },
  mimetype: String,
  caption: String,
  size: Number,
  sha256: String,
  createdAt: { type: Date, default: Date.now },
  data: Buffer,
});

let Media;

async function connectMongo() {
  if (!MONGODB_URI) {
    console.log('[Mongo] MONGODB_URI non défini. Mongo désactivé.');
    return null;
  }
  if (isConnected) return mongoose.connection;
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  isConnected = true;
  Media = mongoose.models.Media || mongoose.model('Media', MediaSchema);
  console.log('[Mongo] Connecté');
  return mongoose.connection;
}

function getModels() {
  if (!isConnected) return {};
  return { Media };
}

module.exports = { connectMongo, getModels };
