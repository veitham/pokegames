/** @type {readonly string[]} */
export const ALL_TYPE_IDS = [
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
];

/** @type {Record<string, string>} */
export const TYPE_DISPLAY_FR = {
  normal: 'Normal',
  fire: 'Feu',
  water: 'Eau',
  grass: 'Plante',
  electric: 'Électrik',
  ice: 'Glace',
  fighting: 'Combat',
  poison: 'Poison',
  ground: 'Sol',
  flying: 'Vol',
  psychic: 'Psy',
  bug: 'Insecte',
  rock: 'Roche',
  ghost: 'Spectre',
  dragon: 'Dragon',
  dark: 'Ténèbres',
  steel: 'Acier',
  fairy: 'Fée',
};

/** @type {Record<string, string>} */
export const TYPE_COLORS = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
  fairy: '#ee99ac',
};

/**
 * @param {string} name
 * @returns {string}
 */
export function normalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * @param {string[]} types
 * @returns {string}
 */
export function typesToKey(types) {
  const sorted = [...types].sort();
  if (sorted.length === 1) return sorted[0];
  return sorted.join('+');
}

/**
 * @param {string} typeA
 * @param {string} typeB
 * @returns {string}
 */
export function challengeToKey(typeA, typeB) {
  if (typeA === typeB) return typeA;
  return [typeA, typeB].sort().join('+');
}

/**
 * @param {string[]} pokemonTypes
 * @param {string} typeA
 * @param {string} typeB
 * @returns {boolean}
 */
export function typesMatchChallenge(pokemonTypes, typeA, typeB) {
  return typesToKey(pokemonTypes) === challengeToKey(typeA, typeB);
}
