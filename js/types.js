/** @typedef {{ id: number, name: string, types: string[], sprite: string, generation: number }} Pokemon */

/** @typedef {{ id: string, label: string, description: string, filter: (p: Pokemon) => boolean, difficulty: 1|2|3|4, color: string }} CategoryTemplate */

/** @typedef {{ id: string, label: string, description: string, difficulty: 1|2|3|4, color: string, pokemon: Pokemon[] }} CategoryGroup */

/** @typedef {{ groups: CategoryGroup[], tiles: Pokemon[] }} Puzzle */

export const MAX_MISTAKES = 4;
export const SELECTION_SIZE = 4;

/** @type {Record<number, number>} Dernière espèce nationale par génération */
export const GENERATION_MAX_ID = {
  1: 151,
  2: 251,
  3: 386,
  4: 493,
  5: 649,
  6: 721,
  7: 809,
  8: 905,
  9: 1025,
};

export const AVAILABLE_GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8];

/** @type {Record<number, string>} */
export const GENERATION_LABELS = {
  1: 'Kanto',
  2: 'Johto',
  3: 'Hoenn',
  4: 'Sinnoh',
  5: 'Unys',
  6: 'Kalos',
  7: 'Alola',
  8: 'Galar',
};

export const DEFAULT_SELECTED_GENERATIONS = [1, 2, 3, 4, 5];
