# Poke Games

Collection de mini-jeux Pokémon : **Connections**, **Types Pokémon** et **Forêt 3D**.

Le mode Connections est inspiré du jeu **Connections** (NYT).

## Fonctionnalités

### Poké Connections
- Grille 4×4 avec 16 Pokémon (sprites + noms)
- 4 catégories à découvrir (types, génération, starters, légendaires, etc.)
- Données chargées depuis [PokéAPI](https://pokeapi.co/)
- Sélection par clic, validation, mélange, 4 erreurs max
- Groupes trouvés affichés en lignes colorées en haut, grille restante en bas
- Sélection des générations incluses (I à VIII)
- Cache local pour accélérer les prochaines parties

### Types Pokémon (mini-jeu)
- Deux types aléatoires à deviner (ou un seul badge si mono-type)
- Réponse en français ou anglais, avec autocomplétion
- 3 vies par manche, bouton « Aucun » si aucune combinaison n'existe
- Révélation des Pokémon valides en fin de manche

### Cizayox 3D
Un second mini-site dans `cizayox-3d/` : explorez une petite forêt en 3D avec **Cizayox**.

- **ZQSD** / flèches pour se déplacer
- **Espace** pour sauter
- Arbres, rochers, buissons et collisions simples

## Lancer le jeu

Ouvrez un serveur local (requis pour les modules ES) :

```bash
# Avec Python
python -m http.server 8080

# Ou avec Node (si installé)
npx serve .
```

Puis ouvrez [http://localhost:8080](http://localhost:8080) dans votre navigateur.

La forêt 3D est accessible via l'onglet **Forêt 3D** ou directement sur [http://localhost:8080/cizayox-3d/](http://localhost:8080/cizayox-3d/).

## Comment jouer (Connections)

1. Cliquez sur 4 Pokémon que vous pensez partager un lien commun
2. Appuyez sur **Regrouper**
3. Une bonne réponse verrouille le groupe et affiche la catégorie
4. Trouvez les 4 groupes avant d'épuiser vos 4 erreurs