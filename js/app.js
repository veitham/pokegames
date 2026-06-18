import { loadPokemonPool } from './api.js';
import { generatePuzzle } from './puzzle.js';
import { Game } from './game.js';
import { DEFAULT_SELECTED_GENERATIONS } from './types.js';
import { typeGame } from './type-game.js';

/** @type {import('./types.js').Pokemon[]} */
let pokemonPool = [];

/** @type {Game | null} */
let game = null;

/** @type {number[]} */
let activeGenerations = [...DEFAULT_SELECTED_GENERATIONS];

const $ = (sel) => document.querySelector(sel);

const loadingEl = $('#loading');
const loadingProgressEl = $('#loading-progress');
const gameEl = $('#game');
const boardEl = $('#board');
const solvedRowsEl = $('#solved-rows');
const mistakesEl = $('#mistakes');
const genFiltersEl = $('#gen-filters');
const btnApplyGens = $('#btn-apply-gens');
const controlsEl = document.querySelector('.controls');
const hintEl = $('#hint');
const gameEndEl = $('#game-end');
const gameEndTitleEl = $('#game-end-title');
const gameEndMessageEl = $('#game-end-message');
const btnSubmit = $('#btn-submit');
const btnDeselect = $('#btn-deselect');
const btnShuffle = $('#btn-shuffle');
const btnNew = $('#btn-new');
const btnRestart = $('#btn-restart');
const headerSubtitleEl = $('#header-subtitle');
const appNavEl = document.querySelector('.app-nav');
const typeGameViewEl = $('#type-game-view');

/** @type {'connections' | 'type-game'} */
let activeView = 'connections';

/** @type {boolean} */
let typeGameReady = false;

function showLoading() {
  loadingEl?.classList.remove('hidden');
  gameEl?.classList.add('hidden');
  typeGameViewEl?.classList.add('hidden');
}

function hideLoading() {
  loadingEl?.classList.add('hidden');
  if (activeView === 'connections') {
    gameEl?.classList.remove('hidden');
    typeGameViewEl?.classList.add('hidden');
  } else {
    gameEl?.classList.add('hidden');
    typeGameViewEl?.classList.remove('hidden');
  }
}

function formatName(name) {
  return name;
}

/** @param {import('./types.js').CategoryGroup} group @param {{ revealed?: boolean }} [opts] */
function renderSolvedRow(group, { revealed = false } = {}) {
  const classes = ['solved-row', `solved-row--difficulty-${group.difficulty}`];
  if (revealed) classes.push('solved-row--revealed');

  return `
    <div class="${classes.join(' ')}" role="row">
      <p class="solved-row__label">
        ${group.label}
        ${revealed ? '<span class="solved-row__badge">Réponse</span>' : ''}
      </p>
      <div class="solved-row__tiles">
        ${group.pokemon
          .map(
            (pokemon) => `
              <div class="solved-row__cell">
                <img
                  class="solved-row__sprite"
                  src="${pokemon.sprite}"
                  alt="${formatName(pokemon.name)}"
                />
              </div>
            `
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderTile(pokemon, { selected }) {
  const classes = ['tile'];
  if (selected) classes.push('tile--selected');

  return `
    <button
      type="button"
      class="${classes.join(' ')}"
      data-id="${pokemon.id}"
      aria-pressed="${selected}"
    >
      <img
        class="tile__sprite"
        src="${pokemon.sprite}"
        alt="${formatName(pokemon.name)}"
        loading="lazy"
      />
    </button>
  `;
}

function renderMistakes() {
  if (!game || !mistakesEl) return;
  const dots = mistakesEl.querySelectorAll('.mistakes__dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('mistakes__dot--lost', i >= game.mistakesLeft);
  });
}

function getGroupsToDisplay() {
  if (!game) return [];

  if (game.isOver) {
    return [...game.puzzle.groups].sort((a, b) => a.difficulty - b.difficulty);
  }

  return game.solvedGroups;
}

function renderSolvedRows() {
  if (!game || !solvedRowsEl) return;

  const groups = getGroupsToDisplay();
  solvedRowsEl.innerHTML = groups
    .map((group) =>
      renderSolvedRow(group, {
        revealed: game.isOver && game.endReason === 'lost' && !game.userSolvedGroupIds.has(group.id),
      })
    )
    .join('');
}

function renderBoard() {
  if (!game || !boardEl) return;

  const selected = game.selectedIds;
  const activeTiles = game.activeTiles;

  if (activeTiles.length === 0 || game.isOver) {
    boardEl.innerHTML = '';
    boardEl.classList.add('board--empty');
  } else {
    boardEl.classList.remove('board--empty');
    boardEl.innerHTML = activeTiles
      .map((pokemon) =>
        renderTile(pokemon, { selected: selected.has(pokemon.id) })
      )
      .join('');

    boardEl.querySelectorAll('.tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        const id = Number(tile.getAttribute('data-id'));
        game?.toggleSelect(id);
        updateUI();
      });
    });
  }

  btnSubmit.disabled = selected.size !== 4 || game.isOver;
}

function renderGameEnd() {
  if (!game || !gameEndEl) return;

  if (!game.isOver) {
    gameEndEl.classList.add('hidden');
    controlsEl?.classList.remove('hidden');
    hintEl?.classList.remove('hidden');
    btnShuffle?.removeAttribute('disabled');
    return;
  }

  controlsEl?.classList.add('hidden');
  hintEl?.classList.add('hidden');
  btnShuffle?.setAttribute('disabled', 'true');
  gameEndEl.classList.remove('hidden');

  if (game.endReason === 'won') {
    gameEndTitleEl.textContent = 'Bravo !';
    gameEndMessageEl.textContent =
      'Vous avez trouvé les quatre catégories. Vous êtes un vrai Maître Pokémon !';
  } else {
    gameEndTitleEl.textContent = 'Partie terminée';
    gameEndMessageEl.textContent =
      'Plus d\'essais disponibles. Voici les quatre catégories de cette partie :';
  }
}

function updateUI() {
  renderMistakes();
  renderSolvedRows();
  renderBoard();
  renderGameEnd();
}

function shakeTiles(ids) {
  ids.forEach((id) => {
    const el = boardEl?.querySelector(`.tile[data-id="${id}"]`);
    if (!el) return;
    el.classList.add('tile--shake');
    setTimeout(() => el.classList.remove('tile--shake'), 500);
  });
}

function handleSubmit() {
  if (!game) return;
  const submittedIds = [...game.selectedIds];
  const result = game.submit();

  if (result.success && result.group) {
    updateUI();
    return;
  }

  if (!result.success) {
    shakeTiles(submittedIds);
    updateUI();

    if (result.oneAway && !result.gameLost) {
      flashHint('Un Pokémon de trop… Vous y êtes presque !');
    }

    if (result.gameLost) {
      revealAllGroups();
      updateUI();
    }
  }
}

function revealAllGroups() {
  if (!game) return;
  game.puzzle.groups.forEach((group) => {
    if (!game.solvedGroups.find((g) => g.id === group.id)) {
      game.solvedGroups.push(group);
    }
  });
}

function flashHint(message) {
  if (!hintEl) return;
  const original = hintEl.textContent;
  hintEl.textContent = message;
  hintEl.style.color = '#f0ad4e';
  setTimeout(() => {
    hintEl.textContent = original;
    hintEl.style.color = '';
  }, 2500);
}

function startNewGame() {
  const puzzle = generatePuzzle(pokemonPool);
  game = new Game(puzzle);
  updateUI();
}

function getCheckedGenerations() {
  if (!genFiltersEl) return [...activeGenerations];
  return [...genFiltersEl.querySelectorAll('input:checked')]
    .map((input) => Number(input.value))
    .sort((a, b) => a - b);
}

function setCheckedGenerations(generations) {
  if (!genFiltersEl) return;
  const set = new Set(generations);
  genFiltersEl.querySelectorAll('input').forEach((input) => {
    input.checked = set.has(Number(input.value));
  });
}

function generationsEqual(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

async function loadPoolForGenerations(generations) {
  showLoading();
  activeGenerations = [...generations];

  try {
    pokemonPool = await loadPokemonPool(activeGenerations, (loaded, total) => {
      if (loadingProgressEl) {
        loadingProgressEl.textContent = `${loaded} / ${total}`;
      }
    });
    hideLoading();
    startNewGame();
  } catch (err) {
    if (loadingProgressEl) {
      loadingProgressEl.textContent = 'Erreur de chargement';
    }
    console.error(err);
    alert('Impossible de charger les Pokémon. Vérifiez votre connexion internet.');
  }
}

function applyGenerationSelection() {
  const selected = getCheckedGenerations();

  if (selected.length === 0) {
    flashHint('Sélectionnez au moins une génération.');
    setCheckedGenerations(activeGenerations);
    return;
  }

  if (generationsEqual(selected, activeGenerations)) {
    flashHint('Cette sélection est déjà active.');
    return;
  }

  loadPoolForGenerations(selected);
}

async function initTypeGameView() {
  if (!typeGameViewEl) return;

  activeView = 'type-game';
  loadingEl?.classList.add('hidden');
  gameEl?.classList.add('hidden');
  typeGameViewEl.classList.remove('hidden');

  const renderTypeGame = () => {
    typeGame.render(typeGameViewEl, {
      onSubmit: renderTypeGame,
      onNew: renderTypeGame,
    });
  };

  if (typeGameReady) {
    renderTypeGame();
    return;
  }

  typeGame.isLoading = true;
  renderTypeGame();

  try {
    await typeGame.init((loaded, total) => {
      const progressEl = typeGameViewEl.querySelector('#type-game-progress');
      if (progressEl) progressEl.textContent = `${loaded} / ${total}`;
    });
    typeGameReady = true;
    renderTypeGame();
  } catch (err) {
    console.error(err);
    typeGameViewEl.innerHTML = `
      <p class="type-game__feedback type-game__feedback--incorrect">
        Impossible de charger les données Pokémon. Vérifiez votre connexion internet.
      </p>
    `;
  }
}

/** @param {'connections' | 'type-game'} view */
function switchView(view) {
  activeView = view;

  appNavEl?.querySelectorAll('.app-nav__tab[data-view]').forEach((tab) => {
    const isActive = tab.getAttribute('data-view') === view;
    tab.classList.toggle('app-nav__tab--active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  if (view === 'connections') {
    headerSubtitleEl.textContent =
      'Trouvez les groupes de quatre Pokémon qui partagent un lien commun.';
    typeGameViewEl?.classList.add('hidden');
    if (pokemonPool.length > 0) {
      loadingEl?.classList.add('hidden');
      gameEl?.classList.remove('hidden');
    }
    return;
  }

  headerSubtitleEl.textContent =
    'Trouvez un Pokémon possédant exactement la combinaison de types affichée.';
  initTypeGameView();
}

appNavEl?.querySelectorAll('.app-nav__tab[data-view]').forEach((tab) => {
  tab.addEventListener('click', () => {
    const view = tab.getAttribute('data-view');
    if (view === 'connections' || view === 'type-game') {
      switchView(view);
    }
  });
});

async function init() {
  setCheckedGenerations(DEFAULT_SELECTED_GENERATIONS);
  await loadPoolForGenerations(DEFAULT_SELECTED_GENERATIONS);
}

btnSubmit?.addEventListener('click', handleSubmit);
btnDeselect?.addEventListener('click', () => {
  game?.deselectAll();
  updateUI();
});
btnShuffle?.addEventListener('click', () => {
  if (game?.isOver) return;
  game?.shuffle();
  updateUI();
});
btnNew?.addEventListener('click', startNewGame);
btnRestart?.addEventListener('click', startNewGame);

btnApplyGens?.addEventListener('click', applyGenerationSelection);

init();
