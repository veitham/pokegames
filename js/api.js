import { GENERATION_MAX_ID } from './types.js';

const API_BASE = 'https://pokeapi.co/api/v2';
const CACHE_PREFIX = 'poke-connections-cache-v5-fr-gen-';

/** @returns {string} */
export function getSpriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

/** @param {number} id */
export function getGeneration(id) {
  if (id <= 151) return 1;
  if (id <= 251) return 2;
  if (id <= 386) return 3;
  if (id <= 493) return 4;
  if (id <= 649) return 5;
  if (id <= 721) return 6;
  if (id <= 809) return 7;
  if (id <= 905) return 8;
  return 9;
}

/** @param {number} generation */
export function getIdRangeForGeneration(generation) {
  const max = GENERATION_MAX_ID[generation];
  const min = generation === 1 ? 1 : GENERATION_MAX_ID[generation - 1] + 1;
  return { min, max, count: max - min + 1 };
}

/** @param {number} generation */
function getCacheKey(generation) {
  return `${CACHE_PREFIX}${generation}`;
}

/** @param {number} generation @param {import('./types.js').Pokemon[]} cached */
function saveGenerationCache(generation, cached) {
  try {
    localStorage.setItem(getCacheKey(generation), JSON.stringify(cached));
  } catch {
    /* ignore quota errors */
  }
}

/** @param {number} generation @returns {import('./types.js').Pokemon[] | null} */
function loadGenerationCache(generation) {
  try {
    const raw = localStorage.getItem(getCacheKey(generation));
    if (!raw) return null;
    const data = JSON.parse(raw);
    const { count } = getIdRangeForGeneration(generation);
    if (!Array.isArray(data) || data.length < count) return null;
    return data;
  } catch {
    return null;
  }
}

/** @param {{ names: { language: { name: string }, name: string }[] }} species */
function getFrenchName(species) {
  const fr = species.names.find((n) => n.language.name === 'fr');
  return fr?.name ?? null;
}

/** @param {number} id @returns {Promise<import('./types.js').Pokemon>} */
async function fetchPokemon(id) {
  const [pokeRes, speciesRes] = await Promise.all([
    fetch(`${API_BASE}/pokemon/${id}`),
    fetch(`${API_BASE}/pokemon-species/${id}`),
  ]);
  if (!pokeRes.ok) throw new Error(`Pokémon #${id} introuvable`);
  const data = await pokeRes.json();
  const species = speciesRes.ok ? await speciesRes.json() : null;
  const frenchName = species ? getFrenchName(species) : null;

  return {
    id: data.id,
    name: frenchName ?? data.name.replace(/-/g, ' '),
    types: data.types.map((t) => t.type.name),
    sprite: getSpriteUrl(data.id),
    generation: getGeneration(data.id),
  };
}

/**
 * @param {number} generation
 * @param {(loaded: number) => void} [onGenProgress]
 * @returns {Promise<import('./types.js').Pokemon[]>}
 */
async function loadGeneration(generation, onGenProgress) {
  const cached = loadGenerationCache(generation);
  if (cached) {
    onGenProgress?.(cached.length);
    return cached;
  }

  const { min, max } = getIdRangeForGeneration(generation);
  const batchSize = 20;
  const results = [];

  for (let start = min; start <= max; start += batchSize) {
    const end = Math.min(start + batchSize - 1, max);
    const batch = [];
    for (let id = start; id <= end; id++) batch.push(fetchPokemon(id));
    const fetched = await Promise.all(batch);
    results.push(...fetched);
    onGenProgress?.(results.length);
  }

  results.sort((a, b) => a.id - b.id);
  saveGenerationCache(generation, results);
  return results;
}

/**
 * @param {number[]} selectedGenerations
 * @param {(loaded: number, total: number) => void} [onProgress]
 * @returns {Promise<import('./types.js').Pokemon[]>}
 */
export async function loadPokemonPool(selectedGenerations, onProgress) {
  const generations = [...selectedGenerations].sort((a, b) => a - b);
  const total = generations.reduce(
    (sum, gen) => sum + getIdRangeForGeneration(gen).count,
    0
  );
  let loaded = 0;
  const results = [];

  for (const generation of generations) {
    const genPokemon = await loadGeneration(generation, (genLoaded) => {
      onProgress?.(loaded + genLoaded, total);
    });
    loaded += genPokemon.length;
    results.push(...genPokemon);
    onProgress?.(loaded, total);
  }

  return results.sort((a, b) => a.id - b.id);
}
