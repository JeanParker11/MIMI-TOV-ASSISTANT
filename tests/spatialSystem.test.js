/**
 * Tests unitaires pour spatialSystem.js
 */

const spatialSystem = require('../lib/spatialSystem');
const assert = require('assert');

describe('SpatialSystem Tests', () => {
  
  describe('calculerDistance3D', () => {
    it('devrait calculer la distance correctement', () => {
      const pos1 = { x: 0, y: 0, z: 0 };
      const pos2 = { x: 3, y: 4, z: 0 };
      const distance = spatialSystem.calculerDistance3D(pos1, pos2);
      assert.strictEqual(distance, 5);
    });
    
    it('devrait gérer la distance en 3D', () => {
      const pos1 = { x: 0, y: 0, z: 0 };
      const pos2 = { x: 2, y: 2, z: 2 };
      const distance = spatialSystem.calculerDistance3D(pos1, pos2);
      assert.strictEqual(Math.round(distance * 100) / 100, 3.46);
    });
  });
  
  describe('calculerDistanceArrondie', () => {
    it('devrait arrondir à l\'entier le plus proche', () => {
      const pos1 = { x: 0, y: 0, z: 0 };
      const pos2 = { x: 3.2, y: 4.1, z: 0 };
      const distance = spatialSystem.calculerDistanceArrondie(pos1, pos2);
      assert.strictEqual(distance, 5);
    });
  });
  
  describe('estDansLimites', () => {
    const dimensions = { x_max: 10, y_max: 10, z_max: 5 };
    
    it('devrait accepter une position valide', () => {
      const position = { x: 5, y: 5, z: 2 };
      assert.strictEqual(spatialSystem.estDansLimites(position, dimensions), true);
    });
    
    it('devrait rejeter une position hors limites X', () => {
      const position = { x: 11, y: 5, z: 2 };
      assert.strictEqual(spatialSystem.estDansLimites(position, dimensions), false);
    });
    
    it('devrait rejeter une position négative', () => {
      const position = { x: -1, y: 5, z: 2 };
      assert.strictEqual(spatialSystem.estDansLimites(position, dimensions), false);
    });
  });
  
  describe('estObstacle', () => {
    const obstacles = [
      { x: 5, y: 5, z: 0 },
      { x: 3, y: 3, z: 1 }
    ];
    
    it('devrait détecter un obstacle', () => {
      const position = { x: 5, y: 5, z: 0 };
      assert.strictEqual(spatialSystem.estObstacle(position, obstacles), true);
    });
    
    it('devrait accepter une position libre', () => {
      const position = { x: 2, y: 2, z: 0 };
      assert.strictEqual(spatialSystem.estObstacle(position, obstacles), false);
    });
  });
  
  describe('calculerCoutDeplacement', () => {
    it('devrait calculer le coût horizontal', () => {
      const chemin = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 }
      ];
      const cout = spatialSystem.calculerCoutDeplacement(chemin);
      assert.strictEqual(cout, 2); // 2 déplacements horizontaux
    });
    
    it('devrait doubler le coût pour changement de niveau', () => {
      const chemin = [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 1, y: 0, z: 1 }
      ];
      const cout = spatialSystem.calculerCoutDeplacement(chemin);
      assert.strictEqual(cout, 3); // 2 PM pour monter + 1 PM horizontal
    });
  });
  
  describe('verifierPortee', () => {
    const attaquant = { x: 0, y: 0, z: 0 };
    const defenseur = { x: 1, y: 0, z: 0 };
    
    it('devrait valider un coup de poing à distance 0', () => {
      const attaquantProche = { x: 1, y: 0, z: 0 };
      const result = spatialSystem.verifierPortee(attaquantProche, defenseur, 'poing');
      assert.strictEqual(result.valide, true);
    });
    
    it('devrait rejeter un coup de poing à distance 1', () => {
      const result = spatialSystem.verifierPortee(attaquant, defenseur, 'poing');
      assert.strictEqual(result.valide, false);
      assert(result.message.includes('0m'));
    });
    
    it('devrait valider un coup de pied à distance 1', () => {
      const result = spatialSystem.verifierPortee(attaquant, defenseur, 'pied');
      assert.strictEqual(result.valide, true);
    });
    
    it('devrait gérer les armes avec portée', () => {
      const defenseurLoin = { x: 3, y: 0, z: 0 };
      const result = spatialSystem.verifierPortee(
        attaquant, 
        defenseurLoin, 
        'arme',
        { portee: { min: 2, max: 5 } }
      );
      assert.strictEqual(result.valide, true);
    });
  });
  
  describe('trouverChemin (A*)', () => {
    const arene = {
      dimensions: { x_max: 10, y_max: 10, z_max: 2 },
      obstacles: [
        { x: 2, y: 1, z: 0 },
        { x: 2, y: 2, z: 0 },
        { x: 2, y: 3, z: 0 }
      ]
    };
    
    it('devrait trouver un chemin simple', () => {
      const depart = { x: 0, y: 0, z: 0 };
      const arrivee = { x: 3, y: 0, z: 0 };
      const chemin = spatialSystem.trouverChemin(depart, arrivee, arene);
      
      assert(chemin !== null);
      assert.strictEqual(chemin[0].x, 0);
      assert.strictEqual(chemin[chemin.length - 1].x, 3);
    });
    
    it('devrait contourner les obstacles', () => {
      const depart = { x: 1, y: 2, z: 0 };
      const arrivee = { x: 3, y: 2, z: 0 };
      const chemin = spatialSystem.trouverChemin(depart, arrivee, arene);
      
      assert(chemin !== null);
      // Vérifie qu'aucun point du chemin n'est un obstacle
      chemin.forEach(pos => {
        assert.strictEqual(spatialSystem.estObstacle(pos, arene.obstacles), false);
      });
    });
    
    it('devrait retourner null si pas de chemin', () => {
      const areneBloquee = {
        dimensions: { x_max: 5, y_max: 5, z_max: 1 },
        obstacles: [
          // Mur complet bloquant le passage
          { x: 2, y: 0, z: 0 },
          { x: 2, y: 1, z: 0 },
          { x: 2, y: 2, z: 0 },
          { x: 2, y: 3, z: 0 },
          { x: 2, y: 4, z: 0 }
        ]
      };
      
      const depart = { x: 0, y: 2, z: 0 };
      const arrivee = { x: 4, y: 2, z: 0 };
      const chemin = spatialSystem.trouverChemin(depart, arrivee, areneBloquee);
      
      assert.strictEqual(chemin, null);
    });
  });
  
  describe('tenterDeplacement', () => {
    const arene = {
      dimensions: { x_max: 10, y_max: 10, z_max: 2 },
      obstacles: []
    };
    
    it('devrait permettre un déplacement valide', () => {
      const joueur = {
        position: { x: 0, y: 0, z: 0 },
        points_mouvement: { actuels: 5, max: 5 }
      };
      const cible = { x: 3, y: 0, z: 0 };
      
      const result = spatialSystem.tenterDeplacement(joueur, cible, arene);
      
      assert.strictEqual(result.succes, true);
      assert.strictEqual(result.pm_utilises, 3);
      assert.strictEqual(joueur.position.x, 3);
      assert.strictEqual(joueur.points_mouvement.actuels, 2);
    });
    
    it('devrait refuser si PM insuffisants', () => {
      const joueur = {
        position: { x: 0, y: 0, z: 0 },
        points_mouvement: { actuels: 2, max: 5 }
      };
      const cible = { x: 5, y: 0, z: 0 };
      
      const result = spatialSystem.tenterDeplacement(joueur, cible, arene);
      
      assert.strictEqual(result.succes, false);
      assert(result.message.includes('PM insuffisants'));
      assert.strictEqual(joueur.position.x, 0); // Position inchangée
    });
  });
});

// Lancer les tests
if (require.main === module) {
  console.log('🧪 Lancement des tests spatialSystem...\n');
  
  let totalTests = 0;
  let testsReussis = 0;
  let testsEchoues = 0;
  
  Object.entries(describe.tests).forEach(([suiteName, suite]) => {
    console.log(`📦 ${suiteName}`);
    
    Object.entries(suite).forEach(([testName, test]) => {
      totalTests++;
      try {
        test();
        console.log(`  ✅ ${testName}`);
        testsReussis++;
      } catch (error) {
        console.log(`  ❌ ${testName}`);
        console.log(`     ${error.message}`);
        testsEchoues++;
      }
    });
    
    console.log('');
  });
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total: ${totalTests} tests`);
  console.log(`✅ Réussis: ${testsReussis}`);
  console.log(`❌ Échoués: ${testsEchoues}`);
  console.log(`Taux de réussite: ${Math.round(testsReussis/totalTests*100)}%`);
}

// Framework de test minimal
const describe = (() => {
  const tests = {};
  let currentSuite = null;
  
  return {
    tests,
    fn: (name, fn) => {
      tests[name] = {};
      currentSuite = name;
      fn();
      currentSuite = null;
    },
    it: (name, fn) => {
      if (currentSuite) {
        tests[currentSuite][name] = fn;
      }
    }
  };
})();

function describe(name, fn) {
  describe.fn(name, fn);
}

function it(name, fn) {
  describe.it(name, fn);
}

module.exports = { describe, it };
