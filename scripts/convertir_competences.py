"""
Script de conversion massive des compétences depuis les fichiers sources
vers actives.json et passives.json
"""
import json
import os
import re

# Chemins
COMPETENCES_DIR = r"c:\Users\Kouad\Downloads\unirolist\Compétences"
OUTPUT_ACTIVES = r"c:\Users\Kouad\Downloads\unirolist\data\competences\actives.json"
OUTPUT_PASSIVES = r"c:\Users\Kouad\Downloads\unirolist\data\competences\passives.json"

# Charger les fichiers existants
with open(OUTPUT_ACTIVES, 'r', encoding='utf-8') as f:
    actives = json.load(f)

with open(OUTPUT_PASSIVES, 'r', encoding='utf-8') as f:
    passives = json.load(f)

# Compteurs
compteur_actives = len(actives)
compteur_passives = len(passives)

print(f"📊 État initial:")
print(f"   Actives: {compteur_actives}")
print(f"   Passives: {compteur_passives}")
print(f"   Total: {compteur_actives + compteur_passives}")
print()

# Fonction pour créer un ID unique
def creer_id(nom, rang, categorie):
    # Nettoyer le nom
    nom_clean = nom.lower()
    nom_clean = re.sub(r'[àáâãäå]', 'a', nom_clean)
    nom_clean = re.sub(r'[èéêë]', 'e', nom_clean)
    nom_clean = re.sub(r'[ìíîï]', 'i', nom_clean)
    nom_clean = re.sub(r'[òóôõö]', 'o', nom_clean)
    nom_clean = re.sub(r'[ùúûü]', 'u', nom_clean)
    nom_clean = re.sub(r'[ç]', 'c', nom_clean)
    nom_clean = re.sub(r'[^\w\s]', '', nom_clean)
    nom_clean = '_'.join(nom_clean.split())
    
    # Ajouter suffixe de rang si nécessaire
    if rang != 'E':
        nom_clean += f"_{rang.lower()}"
    
    return nom_clean

# Fonction pour parser les factions
def parser_factions(texte):
    # Chercher les patterns de factions
    if "Hécate uniquement" in texte or "(Hécate" in texte:
        return {"allowed": ["Hécate"], "excluded": ["Arès", "Hermès", "Atlas"]}
    elif "Toutes les factions" in texte or "Toutes" in texte:
        return {"allowed": ["Toutes"], "excluded": []}
    elif "Arès" in texte and "Hermès" in texte and "Atlas" in texte:
        return {"allowed": ["Arès", "Hermès", "Atlas"], "excluded": ["Hécate"]}
    else:
        # Par défaut toutes les factions
        return {"allowed": ["Toutes"], "excluded": []}

# Fonction pour extraire le coût
def extraire_cout(texte):
    match = re.search(r'(\d+)\s*(?:Points?|PM|Points de Mana)', texte, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return 5  # Valeur par défaut

print("🔄 Début de la conversion...")
print()

# Sauvegarder
with open(OUTPUT_ACTIVES, 'w', encoding='utf-8') as f:
    json.dump(actives, f, ensure_ascii=False, indent=2)

with open(OUTPUT_PASSIVES, 'w', encoding='utf-8') as f:
    json.dump(passives, f, ensure_ascii=False, indent=2)

print()
print(f"✅ Conversion terminée!")
print(f"   Actives: {len(actives)} (+{len(actives) - compteur_actives})")
print(f"   Passives: {len(passives)} (+{len(passives) - compteur_passives})")
print(f"   Total: {len(actives) + len(passives)}")
