import {
  ALL_TYPE_IDS,
  challengeToKey,
  normalizeName,
  typesMatchChallenge,
  typesToKey,
} from './pokemon-types.js';

const API_BASE = 'https://pokeapi.co/api/v2';
const CACHE_KEY = 'poke-type-game-cache-v2';
const BATCH_SIZE = 40;

/** @typedef {{ id: number, speciesId: number, nameEn: string, nameFr: string, types: string[] }} TypeGameEntry */

/** @typedef {{ entries: TypeGameEntry[], comboExists: string[], nameToTypeSets: Record<string, string[]> }} TypeGameCache */

/** @param {string} url */
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

/** @returns {Promise<{ name: string, url: string }[]>} */
async function fetchAllPokemonRefs() {
  const refs = [];
  let url = `${API_BASE}/pokemon?limit=100`;

  while (url) {
    const data = await fetchJson(url);
    refs.push(...data.results);
    url = data.next;
  }

  return refs;
}

/** @type {Map<string, { id: number, nameFr: string | null, nameEn: string }>} */
const speciesCache = new Map();

/** @param {string} speciesUrl */
async function getSpeciesInfo(speciesUrl) {
  if (speciesCache.has(speciesUrl)) return speciesCache.get(speciesUrl);

  const data = await fetchJson(speciesUrl);
  const nameFr = data.names.find((n) => n.language.name === 'fr')?.name ?? null;
  const nameEn = data.names.find((n) => n.language.name === 'en')?.name ?? data.name;
  const info = { id: data.id, nameFr, nameEn };
  speciesCache.set(speciesUrl, info);
  return info;
}

/**
 * @param {{ name: string, url: string }} ref
 * @returns {Promise<TypeGameEntry | null>}
 */
async function fetchPokemonEntry(ref) {
  try {
    const data = await fetchJson(ref.url);
    const species = await getSpeciesInfo(data.species.url);
    const types = data.types
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name);

    return {
      id: data.id,
      speciesId: species.id,
      nameEn: data.name,
      nameFr: species.nameFr ?? species.nameEn,
      types,
    };
  } catch {
    return null;
  }
}

/**
 * @param {TypeGameEntry[]} entries
 * @returns {{ comboExists: Set<string>, nameToTypeSets: Map<string, Set<string>> }}
 */
function buildIndexes(entries) {
  const comboExists = new Set();
  const nameToTypeSets = new Map();

  for (const entry of entries) {
    const typeKey = typesToKey(entry.types);
    comboExists.add(typeKey);

    const aliases = new Set([
      normalizeName(entry.nameEn),
      normalizeName(entry.nameEn.replace(/-/g, ' ')),
      normalizeName(entry.nameFr),
    ]);

    for (const alias of aliases) {
      if (!alias) continue;
      if (!nameToTypeSets.has(alias)) nameToTypeSets.set(alias, new Set());
      nameToTypeSets.get(alias).add(typeKey);
    }
  }

  return { comboExists, nameToTypeSets };
}

/** @param {TypeGameCache} cache */
function serializeCache(cache) {
  return JSON.stringify(cache);
}

/** @returns {TypeGameCache | null} */
function loadStoredCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.entries?.length || !data.comboExists || !data.nameToTypeSets) return null;
    return data;
  } catch {
    return null;
  }
}

/** @param {TypeGameCache} cache */
function saveStoredCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, serializeCache(cache));
  } catch {
    /* ignore quota errors */
  }
}

/** @type {TypeGameCache | null} */
let runtimeCache = null;

/** @typedef {{ comboExists: Set<string>, nameToTypeSets: Map<string, Set<string>>, entries: TypeGameEntry[] }} RuntimeTypeGameCache */

/** @param {TypeGameCache} stored */
function hydrateCache(stored) {
  return {
    entries: stored.entries,
    comboExists: new Set(stored.comboExists),
    nameToTypeSets: new Map(
      Object.entries(stored.nameToTypeSets).map(([name, keys]) => [name, new Set(keys)])
    ),
  };
}

/**
 * @param {(loaded: number, total: number) => void} [onProgress]
 * @returns {Promise<RuntimeTypeGameCache>}
 */
export async function loadTypeGameCache(onProgress) {
  if (runtimeCache) return runtimeCache;

  const stored = loadStoredCache();
  if (stored) {
    runtimeCache = hydrateCache(stored);
    onProgress?.(stored.entries.length, stored.entries.length);
    return runtimeCache;
  }

  const refs = await fetchAllPokemonRefs();
  const total = refs.length;
  const entries = [];

  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = refs.slice(i, i + BATCH_SIZE);
    const fetched = await Promise.all(batch.map(fetchPokemonEntry));
    entries.push(...fetched.filter(Boolean));
    onProgress?.(Math.min(i + BATCH_SIZE, total), total);
  }

  const { comboExists, nameToTypeSets } = buildIndexes(entries);

  const serializable = {
    entries,
    comboExists: [...comboExists],
    nameToTypeSets: Object.fromEntries(
      [...nameToTypeSets.entries()].map(([name, keys]) => [name, [...keys]])
    ),
  };

  saveStoredCache(serializable);
  runtimeCache = hydrateCache(serializable);
  return runtimeCache;
}

/**
 * @param {RuntimeTypeGameCache} cache
 * @param {string} typeA
 * @param {string} typeB
 * @returns {boolean}
 */
export function comboExists(cache, typeA, typeB) {
  return cache.comboExists.has(challengeToKey(typeA, typeB));
}

/**
 * @param {RuntimeTypeGameCache} cache
 * @param {string} answer
 * @returns {TypeGameEntry | null}
 */
export function lookupPokemonByName(cache, answer) {
  const normalized = normalizeName(answer);
  if (!normalized) return null;

  const matches = cache.entries.filter((entry) => {
    const aliases = [
      normalizeName(entry.nameEn),
      normalizeName(entry.nameEn.replace(/-/g, ' ')),
      normalizeName(entry.nameFr),
    ];
    return aliases.includes(normalized);
  });

  if (!matches.length) return null;

  const byTypes = new Map();
  for (const entry of matches) {
    const key = typesToKey(entry.types);
    const existing = byTypes.get(key);
    if (!existing || entry.id < existing.id) {
      byTypes.set(key, entry);
    }
  }

  const unique = [...byTypes.values()];
  return unique.sort((a, b) => a.id - b.id)[0];
}

/**
 * @param {RuntimeTypeGameCache} cache
 * @param {string} answer
 * @param {string} typeA
 * @param {string} typeB
 * @returns {boolean}
 */
export function validatePokemonAnswer(cache, answer, typeA, typeB) {
  const expectedKey = challengeToKey(typeA, typeB);
  const normalized = normalizeName(answer);
  if (!normalized) return false;

  const typeSets = cache.nameToTypeSets.get(normalized);
  if (!typeSets) return false;

  return typeSets.has(expectedKey);
}

/**
 * @param {RuntimeTypeGameCache} cache
 * @param {string} typeA
 * @param {string} typeB
 * @returns {boolean}
 */
export function validateNoneAnswer(cache, typeA, typeB) {
  return !comboExists(cache, typeA, typeB);
}

/**
 * @param {RuntimeTypeGameCache} cache
 * @param {string} typeA
 * @param {string} typeB
 * @returns {TypeGameEntry[]}
 */
export function getMatchingPokemon(cache, typeA, typeB) {
  const matches = cache.entries.filter((entry) =>
    typesMatchChallenge(entry.types, typeA, typeB)
  );

  const bySpecies = new Map();
  for (const entry of matches) {
    const existing = bySpecies.get(entry.speciesId);
    if (!existing || entry.id < existing.id) {
      bySpecies.set(entry.speciesId, entry);
    }
  }

  return [...bySpecies.values()].sort((a, b) => a.id - b.id);
}

/**
 * @param {RuntimeTypeGameCache} cache
 * @param {string} answer
 * @param {string} typeA
 * @param {string} typeB
 * @returns {TypeGameEntry[]}
 */
export function lookupWinningEntries(cache, answer, typeA, typeB) {
  const normalized = normalizeName(answer);
  if (!normalized) return [];

  return cache.entries.filter((entry) => {
    if (!typesMatchChallenge(entry.types, typeA, typeB)) return false;
    const aliases = [
      normalizeName(entry.nameEn),
      normalizeName(entry.nameEn.replace(/-/g, ' ')),
      normalizeName(entry.nameFr),
    ];
    return aliases.includes(normalized);
  });
}

/** @type {WeakMap<RuntimeTypeGameCache, TypeGameEntry[]>} */
const speciesIndexCache = new WeakMap();

/** @param {RuntimeTypeGameCache} cache @returns {TypeGameEntry[]} */
function getSpeciesIndex(cache) {
  const cached = speciesIndexCache.get(cache);
  if (cached) return cached;

  const bySpecies = new Map();
  for (const entry of cache.entries) {
    const existing = bySpecies.get(entry.speciesId);
    if (!existing || entry.id < existing.id) {
      bySpecies.set(entry.speciesId, entry);
    }
  }

  const index = [...bySpecies.values()].sort((a, b) =>
    a.nameFr.localeCompare(b.nameFr, 'fr')
  );
  speciesIndexCache.set(cache, index);
  return index;
}

/** @param {TypeGameEntry} entry @returns {string[]} */
function getSearchKeys(entry) {
  return [
    normalizeName(entry.nameFr),
    normalizeName(entry.nameEn),
    normalizeName(entry.nameEn.replace(/-/g, ' ')),
  ];
}

/**
 * @param {RuntimeTypeGameCache} cache
 * @param {string} query
 * @param {number} [limit]
 * @returns {TypeGameEntry[]}
 */
export function searchPokemonSuggestions(cache, query, limit = 8) {
  const normalized = normalizeName(query);
  if (!normalized) return [];

  const index = getSpeciesIndex(cache);
  /** @type {{ entry: TypeGameEntry, startsWith: boolean }[]} */
  const matches = [];

  for (const entry of index) {
    const keys = getSearchKeys(entry);
    if (!keys.some((key) => key.includes(normalized))) continue;
    matches.push({
      entry,
      startsWith: keys.some((key) => key.startsWith(normalized)),
    });
  }

  return matches
    .sort((a, b) => {
      if (a.startsWith !== b.startsWith) return a.startsWith ? -1 : 1;
      return a.entry.nameFr.localeCompare(b.entry.nameFr, 'fr');
    })
    .slice(0, limit)
    .map((m) => m.entry);
}

/** @returns {[string, string]} */
export function pickRandomTypePair() {
  const typeA = ALL_TYPE_IDS[Math.floor(Math.random() * ALL_TYPE_IDS.length)];
  const typeB = ALL_TYPE_IDS[Math.floor(Math.random() * ALL_TYPE_IDS.length)];
  return [typeA, typeB];
}
