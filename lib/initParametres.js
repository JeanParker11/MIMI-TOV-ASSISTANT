const fs = require("fs");
const path = require("path");

const iaPath = path.join(__dirname, "../ia");
const paramFile = path.join(__dirname, "../data/parametres.json");

function loadFunctionsFromIA() {
  const fonctions = new Set();

  fs.readdirSync(iaPath)
    .filter(f => f.endsWith(".js") && f !== "index.js")
    .forEach(file => {
      const mod = require(path.join(iaPath, file));
      const fns = typeof mod === "function"
        ? [mod]
        : Object.entries(mod).filter(([_, v]) => typeof v === "function");

      for (const [name] of fns) {
        fonctions.add(name.toUpperCase());
      }
    });

  return [...fonctions];
}

function initParametres() {
  let saved = {};
  try {
    saved = JSON.parse(fs.readFileSync(paramFile));
  } catch {
    console.warn("⚠️ parametres.json introuvable, création...");
  }

  const iaFunctions = loadFunctionsFromIA();
  const result = {};

  for (const fn of iaFunctions) {
    result[fn] = fn in saved ? saved[fn] : true;
  }

  fs.writeFileSync(paramFile, JSON.stringify(result, null, 2));
  global.parametres = result;
}

module.exports = initParametres;