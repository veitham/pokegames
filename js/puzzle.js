import { SELECTION_SIZE } from './types.js';

const STARTERS_KANTO = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
const LEGENDARIES_KANTO = new Set([144, 145, 146, 150, 151]);
const EEVEELUTIONS = new Set([133, 134, 135, 136, 196, 197, 470, 471, 700]);
const FOSSILS = new Set([138, 139, 140, 141, 142, 345, 346, 347, 348]);
const BABY_POKEMON = new Set([172, 173, 174, 175, 236, 238, 239, 240]);

const TYPE_LABELS = {
  fire: 'Type Feu',
  water: 'Type Eau',
  grass: 'Type Plante',
  electric: 'Type Électrik',
  psychic: 'Type Psy',
  fighting: 'Type Combat',
  poison: 'Type Poison',
  ground: 'Type Sol',
  flying: 'Type Vol',
  bug: 'Type Insecte',
  rock: 'Type Roche',
  ghost: 'Type Spectre',
  dragon: 'Type Dragon',
  ice: 'Type Glace',
  normal: 'Type Normal',
};

/** @type {import('./types.js').CategoryTemplate[]} */
const CATEGORY_TEMPLATES = [
  ...Object.entries(TYPE_LABELS).map(([type, label]) => ({
    id: `type-${type}`,
    label,
    description: `Quatre Pokémon de type ${label.replace('Type ', '')}`,
    filter: (/** @type {import('./types.js').Pokemon} */ p) => p.types.includes(type),
    difficulty: /** @type {const} */ (1),
    color: '#4a9fd4',
  })),
  {
    id: 'gen-1',
    label: 'Génération I',
    description: 'Les 151 premiers Pokémon',
    filter: (p) => p.generation === 1,
    difficulty: 2,
    color: '#5cb85c',
  },
  {
    id: 'gen-2',
    label: 'Génération II',
    description: 'Pokémon de Johto',
    filter: (p) => p.generation === 2,
    difficulty: 2,
    color: '#5cb85c',
  },
  {
    id: 'gen-3',
    label: 'Génération III',
    description: 'Pokémon de Hoenn',
    filter: (p) => p.generation === 3,
    difficulty: 2,
    color: '#5cb85c',
  },
  {
    id: 'gen-4',
    label: 'Génération IV',
    description: 'Pokémon de Sinnoh',
    filter: (p) => p.generation === 4,
    difficulty: 2,
    color: '#5cb85c',
  },
  {
    id: 'gen-5',
    label: 'Génération V',
    description: 'Pokémon d\'Unys',
    filter: (p) => p.generation === 5,
    difficulty: 2,
    color: '#5cb85c',
  },
  {
    id: 'gen-6',
    label: 'Génération VI',
    description: 'Pokémon de Kalos',
    filter: (p) => p.generation === 6,
    difficulty: 2,
    color: '#5cb85c',
  },
  {
    id: 'gen-7',
    label: 'Génération VII',
    description: 'Pokémon d\'Alola',
    filter: (p) => p.generation === 7,
    difficulty: 2,
    color: '#5cb85c',
  },
  {
    id: 'gen-8',
    label: 'Génération VIII',
    description: 'Pokémon de Galar',
    filter: (p) => p.generation === 8,
    difficulty: 2,
    color: '#5cb85c',
  },
  {
    id: 'starters-kanto',
    label: 'Starters de Kanto',
    description: 'Bulbizarre, Salamèche, Carapuce et leurs évolutions',
    filter: (p) => STARTERS_KANTO.has(p.id),
    difficulty: 2,
    color: '#5cb85c',
  },
  {
    id: 'legendaries-kanto',
    label: 'Légendaires de Kanto',
    description: 'Artikodin, Électhor, Sulfura, Mewtwo et Mew',
    filter: (p) => LEGENDARIES_KANTO.has(p.id),
    difficulty: 3,
    color: '#f0ad4e',
  },
  {
    id: 'eeveelutions',
    label: 'Évolutions d\'Évoli',
    description: 'Toutes les évolutions d\'Évoli',
    filter: (p) => EEVEELUTIONS.has(p.id),
    difficulty: 3,
    color: '#f0ad4e',
  },
  {
    id: 'fossils',
    label: 'Fossiles',
    description: 'Pokémon ressuscités à partir de fossiles',
    filter: (p) => FOSSILS.has(p.id),
    difficulty: 3,
    color: '#f0ad4e',
  },
  {
    id: 'baby-pokemon',
    label: 'Bébés Pokémon',
    description: 'Pré-évolutions introduites à Johto',
    filter: (p) => BABY_POKEMON.has(p.id),
    difficulty: 4,
    color: '#9b59b6',
  },
];

/** @template T @param {T[]} arr */
function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * @param {import('./types.js').Pokemon[]} pool
 * @param {import('./types.js').CategoryTemplate[]} templates
 * @returns {import('./types.js').CategoryGroup[] | null}
 */
function tryBuildPuzzle(pool, templates) {
  const usedIds = new Set();
  const groups = [];

  for (const template of templates) {
    const candidates = pool.filter((p) => !usedIds.has(p.id) && template.filter(p));
    if (candidates.length < SELECTION_SIZE) return null;

    const selected = shuffle(candidates).slice(0, SELECTION_SIZE);
    selected.forEach((p) => usedIds.add(p.id));

    groups.push({
      id: template.id,
      label: template.label,
      description: template.description,
      difficulty: template.difficulty,
      color: template.color,
      pokemon: selected,
    });
  }

  return groups;
}

/** @param {import('./types.js').Pokemon[]} pool */
function getGenerationsInPool(pool) {
  return new Set(pool.map((p) => p.generation));
}

/**
 * @param {import('./types.js').CategoryTemplate} template
 * @param {import('./types.js').Pokemon[]} pool
 */
function isCategoryEligible(template, pool) {
  const matches = pool.filter(template.filter);
  if (matches.length < SELECTION_SIZE) return false;

  if (template.id.startsWith('gen-')) {
    const genNum = Number(template.id.slice(4));
    if (!getGenerationsInPool(pool).has(genNum)) return false;
    return pool.length - matches.length >= SELECTION_SIZE;
  }

  return true;
}

/** @param {import('./types.js').CategoryTemplate[]} templates */
function pickRandomTemplate(templates) {
  if (!templates.length) return null;
  return shuffle(templates)[0];
}

/**
 * @param {import('./types.js').Pokemon[]} pool
 * @returns {import('./types.js').Puzzle}
 */
export function generatePuzzle(pool) {
  const eligible = CATEGORY_TEMPLATES.filter((t) => isCategoryEligible(t, pool));

  const byDifficulty = {
    1: eligible.filter((t) => t.difficulty === 1),
    2: eligible.filter((t) => t.difficulty === 2),
    3: eligible.filter((t) => t.difficulty === 3),
    4: eligible.filter((t) => t.difficulty === 4),
  };

  for (let attempt = 0; attempt < 200; attempt++) {
    const templates = attempt < 80
      ? [1, 2, 3, 4]
          .map((difficulty) => pickRandomTemplate(byDifficulty[difficulty]))
          .filter(Boolean)
      : shuffle(eligible).slice(0, 4);

    if (templates.length < 4) continue;

    const groups = tryBuildPuzzle(pool, templates);
    if (groups) {
      return { groups, tiles: shuffle(groups.flatMap((g) => g.pokemon)) };
    }
  }

  return generateFallbackPuzzle(pool);
}

/** @param {import('./types.js').Pokemon[]} pool */
function generateFallbackPuzzle(pool) {
  const fire = pool.filter((p) => p.types.includes('fire')).slice(0, 4);
  const water = pool.filter((p) => p.types.includes('water') && !fire.find((f) => f.id === p.id)).slice(0, 4);
  const grass = pool.filter((p) => p.types.includes('grass') && !fire.find((f) => f.id === p.id) && !water.find((w) => w.id === p.id)).slice(0, 4);
  const electric = pool.filter((p) => p.types.includes('electric') && !fire.find((f) => f.id === p.id) && !water.find((w) => w.id === p.id) && !grass.find((g) => g.id === p.id)).slice(0, 4);

  const groups = [
    { id: 'type-fire', label: 'Type Feu', description: '', difficulty: /** @type {const} */ (1), color: '#4a9fd4', pokemon: fire },
    { id: 'type-water', label: 'Type Eau', description: '', difficulty: /** @type {const} */ (2), color: '#5cb85c', pokemon: water },
    { id: 'type-grass', label: 'Type Plante', description: '', difficulty: /** @type {const} */ (3), color: '#f0ad4e', pokemon: grass },
    { id: 'type-electric', label: 'Type Électrik', description: '', difficulty: /** @type {const} */ (4), color: '#9b59b6', pokemon: electric },
  ];

  return { groups, tiles: shuffle(groups.flatMap((g) => g.pokemon)) };
}

/** @param {number[]} selectedIds @param {import('./types.js').CategoryGroup[]} groups */
export function findMatchingGroup(selectedIds, groups) {
  const sorted = [...selectedIds].sort((a, b) => a - b).join(',');
  return groups.find((g) => {
    const groupIds = g.pokemon.map((p) => p.id).sort((a, b) => a - b).join(',');
    return groupIds === sorted;
  }) ?? null;
}

/** @param {number[]} selectedIds @param {import('./types.js').CategoryGroup[]} groups */
export function isOneAway(selectedIds, groups) {
  return groups.some((g) => {
    const groupIds = new Set(g.pokemon.map((p) => p.id));
    const matches = selectedIds.filter((id) => groupIds.has(id)).length;
    return matches === 3;
  });
}
