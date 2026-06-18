# Modèle 3D de Cizayox

## Format recommandé

**`.glb`** (GLTF binaire) — c'est le meilleur choix pour le web :
- un seul fichier (modèle + textures incluses)
- chargement direct dans Three.js
- léger et rapide

## Formats acceptés (à convertir en GLB)

| Format | Note |
|--------|------|
| `.gltf` + `.bin` + textures | OK si vous gardez tous les fichiers ensemble |
| `.fbx` | Convertir en GLB (Blender, [gltf.report](https://gltf.report/), etc.) |
| `.obj` + `.mtl` + textures | Convertir en GLB |

## Installation

1. Placez votre fichier dans ce dossier, par exemple : `cizayox-3d/models/pokemon_sv_scizor.glb`
2. Le jeu cherche d'abord `pokemon_sv_scizor.glb`, puis `cizayox.glb`
3. Rafraîchissez la page — le jeu chargera automatiquement votre modèle

Si le fichier est absent ou invalide, le modèle 3D low-poly intégré est utilisé à la place.

## Conseils

- Orientez le modèle face à **+Z** (direction « avant » du jeu)
- Hauteur cible : environ **2 à 3 unités** (le jeu ajuste l'échelle automatiquement)
- Privilégiez un modèle de moins de 5 Mo pour un chargement fluide
