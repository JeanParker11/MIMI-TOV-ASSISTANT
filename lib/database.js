const fs = require('fs');
const path = require('path');

/**
 * 🗄️ Gestionnaire de base de données JSON simple et robuste
 * Toutes les données sont sauvegardées automatiquement
 */
class Database {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.ensureDataDirectory();
    
    // Cache pour améliorer les performances
    this.cache = new Map();
    
    // Auto-save toutes les 30 secondes
    setInterval(() => this.saveAll(), 3600000);
    
    console.log('📊 Base de données initialisée');
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  getFilePath(collection) {
    return path.join(this.dataDir, `${collection}.json`);
  }

  /**
   * Lire une collection
   */
  read(collection) {
    try {
      // Vérifier le cache d'abord
      if (this.cache.has(collection)) {
        return this.cache.get(collection);
      }

      const filePath = this.getFilePath(collection);
      
      if (!fs.existsSync(filePath)) {
        // Créer le fichier s'il n'existe pas
        const defaultData = collection.includes('pending') ? [] : {};
        this.write(collection, defaultData);
        return defaultData;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Mettre en cache
      this.cache.set(collection, data);
      
      return data;
    } catch (error) {
      console.error(`❌ Erreur lecture ${collection}:`, error.message);
      const defaultData = collection.includes('pending') ? [] : {};
      this.cache.set(collection, defaultData);
      return defaultData;
    }
  }

  /**
   * Écrire dans une collection
   */
  write(collection, data) {
    try {
      const filePath = this.getFilePath(collection);
      
      // Backup avant écriture
      if (fs.existsSync(filePath)) {
        const backupPath = filePath + '.backup';
        fs.copyFileSync(filePath, backupPath);
      }

      // Écrire les données
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      // Mettre à jour le cache
      this.cache.set(collection, data);
      
      console.log(`💾 ${collection} sauvegardé`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur écriture ${collection}:`, error.message);
      return false;
    }
  }

  /**
   * Ajouter un élément à une collection array
   */
  push(collection, item) {
    const data = this.read(collection);
    if (Array.isArray(data)) {
      data.push(item);
      return this.write(collection, data);
    }
    return false;
  }

  /**
   * Supprimer un élément d'une collection array
   */
  remove(collection, predicate) {
    const data = this.read(collection);
    if (Array.isArray(data)) {
      const index = data.findIndex(predicate);
      if (index !== -1) {
        data.splice(index, 1);
        return this.write(collection, data);
      }
    }
    return false;
  }

  /**
   * Mettre à jour un élément dans une collection object
   */
  update(collection, key, value) {
    const data = this.read(collection);
    if (typeof data === 'object' && !Array.isArray(data)) {
      data[key] = value;
      return this.write(collection, data);
    }
    return false;
  }

  /**
   * Supprimer une clé d'une collection object
   */
  delete(collection, key) {
    const data = this.read(collection);
    if (typeof data === 'object' && !Array.isArray(data)) {
      delete data[key];
      return this.write(collection, data);
    }
    return false;
  }

  /**
   * Rechercher dans une collection
   */
  find(collection, predicate) {
    const data = this.read(collection);
    if (Array.isArray(data)) {
      return data.filter(predicate);
    }
    return [];
  }

  /**
   * Trouver un élément dans une collection
   */
  findOne(collection, predicate) {
    const data = this.read(collection);
    if (Array.isArray(data)) {
      return data.find(predicate);
    }
    return null;
  }

  /**
   * Compter les éléments
   */
  count(collection, predicate = null) {
    const data = this.read(collection);
    if (Array.isArray(data)) {
      return predicate ? data.filter(predicate).length : data.length;
    }
    if (typeof data === 'object') {
      return Object.keys(data).length;
    }
    return 0;
  }

  /**
   * Sauvegarder toutes les collections en cache
   */
  saveAll() {
    let saved = 0;
    for (const [collection, data] of this.cache.entries()) {
      if (this.write(collection, data)) {
        saved++;
      }
    }
    if (saved > 0) {
      console.log(`💾 ${saved} collection(s) sauvegardée(s)`);
    }
  }

  /**
   * Obtenir des statistiques
   */
  getStats() {
    const stats = {};
    
    // Quiz validés
    stats.totalQuestions = this.count('quizz');
    stats.totalImageQuestions = this.count('quizz_image');
    
    // Quiz en attente
    stats.pendingQuestions = this.count('quizz_pending');
    stats.pendingImageQuestions = this.count('quizz_image_pending');
    
    // Utilisateurs
    stats.totalUsers = this.count('users');
    
    // Batailles
    stats.totalBattles = this.count('battle');
    
    return stats;
  }

  /**
   * Nettoyer les fichiers de backup anciens
   */
  cleanupBackups() {
    try {
      const files = fs.readdirSync(this.dataDir);
      const backupFiles = files.filter(f => f.endsWith('.backup'));
      
      backupFiles.forEach(file => {
        const filePath = path.join(this.dataDir, file);
        const stats = fs.statSync(filePath);
        const age = Date.now() - stats.mtime.getTime();
        
        // Supprimer les backups de plus de 24h
        if (age > 24 * 60 * 60 * 1000) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Backup supprimé: ${file}`);
        }
      });
    } catch (error) {
      console.error('❌ Erreur nettoyage backups:', error.message);
    }
  }

  /**
   * Créer une sauvegarde complète
   */
  createFullBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(this.dataDir, `backup-${timestamp}`);
      
      fs.mkdirSync(backupDir, { recursive: true });
      
      const files = fs.readdirSync(this.dataDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      jsonFiles.forEach(file => {
        const sourcePath = path.join(this.dataDir, file);
        const destPath = path.join(backupDir, file);
        fs.copyFileSync(sourcePath, destPath);
      });
      
      console.log(`📦 Sauvegarde complète créée: ${backupDir}`);
      return backupDir;
    } catch (error) {
      console.error('❌ Erreur sauvegarde complète:', error.message);
      return null;
    }
  }
}

// Instance singleton
const db = new Database();

// Nettoyage automatique des backups au démarrage
db.cleanupBackups();

// Sauvegarde complète quotidienne
setInterval(() => {
  db.createFullBackup();
}, 24 * 60 * 60 * 1000);

module.exports = db;