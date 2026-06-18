import { getSpriteUrl } from './api.js';
import {
  TYPE_COLORS,
  TYPE_DISPLAY_FR,
} from './pokemon-types.js';
import {
  comboExists,
  getMatchingPokemon,
  loadTypeGameCache,
  lookupPokemonByName,
  lookupWinningEntries,
  pickRandomTypePair,
  searchPokemonSuggestions,
  validateNoneAnswer,
  validatePokemonAnswer,
} from './type-game-cache.js';

/** @typedef {import('./type-game-cache.js').RuntimeTypeGameCache} RuntimeTypeGameCache */
/** @typedef {import('./type-game-cache.js').TypeGameEntry} TypeGameEntry */

/** @typedef {{ entry: TypeGameEntry, displayName: string }} TypeGameGuess */

const MAX_LIVES = 3;
const SUGGESTION_LIMIT = 8;

/** @param {string} str */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {TypeGameEntry} entry
 * @param {number} index
 * @returns {string}
 */
function renderSuggestionItem(entry, index) {
  const enLabel = entry.nameEn.replace(/-/g, ' ');
  return `
    <button
      type="button"
      class="type-game__suggestion"
      data-name="${escapeHtml(entry.nameFr)}"
      data-index="${index}"
      role="option"
    >
      <img
        class="type-game__suggestion-sprite"
        src="${getSpriteUrl(entry.id)}"
        alt=""
        loading="lazy"
      />
      <span class="type-game__suggestion-text">
        <span class="type-game__suggestion-name">${escapeHtml(entry.nameFr)}</span>
        <span class="type-game__suggestion-en">${escapeHtml(enLabel)}</span>
      </span>
    </button>
  `;
}

/**
 * @param {string} typeId
 * @param {{ small?: boolean }} [opts]
 * @returns {string}
 */
function renderTypeBadge(typeId, { small = false } = {}) {
  const label = TYPE_DISPLAY_FR[typeId] ?? typeId;
  const color = TYPE_COLORS[typeId] ?? '#888';
  const sizeClass = small ? ' type-badge--sm' : '';
  return `<span class="type-badge type-badge--ds${sizeClass}" style="--type-color: ${color}">${label}</span>`;
}

/**
 * @param {string[]} types
 * @param {{ small?: boolean }} [opts]
 * @returns {string}
 */
function renderTypeBadges(types, opts = {}) {
  return types.map((type) => renderTypeBadge(type, opts)).join('');
}

/**
 * @param {TypeGameGuess} guess
 * @returns {string}
 */
function renderGuessCard(guess) {
  return `
    <div class="type-game__guess">
      <img
        class="type-game__guess-sprite"
        src="${getSpriteUrl(guess.entry.id)}"
        alt="${guess.displayName}"
        loading="lazy"
      />
      <div class="type-game__guess-info">
        <p class="type-game__guess-name">${guess.displayName}</p>
        <div class="type-game__guess-types">
          ${renderTypeBadges(guess.entry.types, { small: true })}
        </div>
      </div>
    </div>
  `;
}

/**
 * @param {TypeGameEntry} entry
 * @returns {string}
 */
function renderRevealCard(entry) {
  return `
    <div class="type-game__reveal-card">
      <img
        class="type-game__reveal-sprite"
        src="${getSpriteUrl(entry.id)}"
        alt="${entry.nameFr}"
        loading="lazy"
      />
      <p class="type-game__reveal-name">${entry.nameFr}</p>
    </div>
  `;
}

/**
 * @param {number} livesLeft
 * @returns {string}
 */
function renderLives(livesLeft) {
  const dots = Array.from({ length: MAX_LIVES }, (_, i) => {
    const lost = i >= livesLeft;
    return `<span class="type-game__life-dot${lost ? ' type-game__life-dot--lost' : ''}"></span>`;
  }).join('');

  return `
    <div class="type-game__lives">
      <span class="type-game__lives-label">Vies restantes :</span>
      <div class="type-game__lives-dots">${dots}</div>
    </div>
  `;
}

export class TypeGame {
  /** @type {RuntimeTypeGameCache | null} */
  cache = null;

  /** @type {string} */
  typeA = 'fire';

  /** @type {string} */
  typeB = 'water';

  /** @type {'idle' | 'correct' | 'incorrect'} */
  feedbackState = 'idle';

  /** @type {string} */
  feedbackMessage = '';

  /** @type {boolean} */
  isLoading = false;

  /** @type {TypeGameGuess[]} */
  guesses = [];

  /** @type {number} */
  livesLeft = MAX_LIVES;

  /** @type {boolean} */
  isOver = false;

  /** @type {'won' | 'lost' | null} */
  endReason = null;

  /** @type {Set<number>} */
  excludedSpeciesIds = new Set();

  /** @type {string} */
  inputValue = '';

  /** @param {(loaded: number, total: number) => void} [onProgress] */
  async init(onProgress) {
    if (this.cache) return;
    this.isLoading = true;
    try {
      this.cache = await loadTypeGameCache(onProgress);
      this.newChallenge();
    } finally {
      this.isLoading = false;
    }
  }

  newChallenge() {
    [this.typeA, this.typeB] = pickRandomTypePair();
    this.feedbackState = 'idle';
    this.feedbackMessage = '';
    this.guesses = [];
    this.livesLeft = MAX_LIVES;
    this.isOver = false;
    this.endReason = null;
    this.excludedSpeciesIds = new Set();
    this.inputValue = '';
  }

  /** @param {boolean} correct @param {string} [answer] @param {boolean} [isNone] */
  finishRound(correct, answer = '', isNone = false) {
    if (correct) {
      this.isOver = true;
      this.endReason = 'won';
      if (!isNone && answer.trim() && this.cache) {
        const winners = lookupWinningEntries(this.cache, answer, this.typeA, this.typeB);
        for (const entry of winners) {
          this.excludedSpeciesIds.add(entry.speciesId);
        }
      }
      return;
    }

    this.livesLeft -= 1;
    if (this.livesLeft <= 0) {
      this.isOver = true;
      this.endReason = 'lost';
    }
  }

  /** @returns {TypeGameEntry[]} */
  getRevealPokemon() {
    if (!this.cache || !this.isOver) return [];

    const matching = getMatchingPokemon(this.cache, this.typeA, this.typeB);

    if (this.endReason === 'won') {
      return matching.filter((entry) => !this.excludedSpeciesIds.has(entry.speciesId));
    }

    return matching;
  }

  /**
   * @param {string} answer
   * @param {{ isNone?: boolean }} [opts]
   * @returns {{ correct: boolean, message: string }}
   */
  submit(answer, { isNone = false } = {}) {
    if (!this.cache) {
      return { correct: false, message: 'Le jeu n\'est pas encore chargé.' };
    }

    if (this.isOver) {
      return { correct: false, message: 'La manche est terminée.' };
    }

    const typeLabel = `${TYPE_DISPLAY_FR[this.typeA]} + ${TYPE_DISPLAY_FR[this.typeB]}`;
    let correct = false;

    if (isNone) {
      correct = validateNoneAnswer(this.cache, this.typeA, this.typeB);
      this.feedbackState = correct ? 'correct' : 'incorrect';
      this.feedbackMessage = correct
        ? 'Exact ! Aucun Pokémon ne possède cette combinaison de types.'
        : 'Incorrect — au moins un Pokémon correspond à cette combinaison.';
      this.finishRound(correct, '', true);
      if (correct || this.isOver) this.inputValue = '';
      return { correct, message: this.feedbackMessage };
    }

    if (!answer.trim()) {
      this.feedbackState = 'incorrect';
      this.feedbackMessage = 'Entrez le nom d\'un Pokémon ou cliquez sur « Aucun ».';
      return { correct: false, message: this.feedbackMessage };
    }

    const trimmed = answer.trim();
    const entry = lookupPokemonByName(this.cache, trimmed);
    if (entry) {
      const alreadyGuessed = this.guesses.some((g) => g.entry.id === entry.id);
      if (!alreadyGuessed) {
        this.guesses.push({
          entry,
          displayName: entry.nameFr,
        });
      }
    }

    correct = validatePokemonAnswer(this.cache, trimmed, this.typeA, this.typeB);
    this.feedbackState = correct ? 'correct' : 'incorrect';

    if (correct) {
      this.feedbackMessage = `Bravo ! « ${trimmed} » possède bien les types ${typeLabel}.`;
    } else if (!entry) {
      this.feedbackMessage = `Incorrect — « ${trimmed} » n'est pas reconnu.`;
    } else {
      this.feedbackMessage = `Incorrect — « ${trimmed} » ne correspond pas exactement à ${typeLabel}.`;
    }

    this.finishRound(correct, trimmed);
    if (correct || this.isOver) {
      this.inputValue = '';
    } else {
      this.inputValue = trimmed;
    }
    return { correct, message: this.feedbackMessage };
  }

  /** @returns {boolean} */
  get hasMatchingPokemon() {
    if (!this.cache) return true;
    return comboExists(this.cache, this.typeA, this.typeB);
  }

  /**
   * @param {HTMLElement} root
   * @param {{ onSubmit?: () => void, onNew?: () => void }} [handlers]
   */
  render(root, handlers = {}) {
    if (this.isLoading) {
      root.innerHTML = `
        <div class="type-game-loading">
          <div class="loading__spinner"></div>
          <p class="loading__text">Construction du cache Pokémon…</p>
          <p class="loading__progress" id="type-game-progress">0 / …</p>
        </div>
      `;
      return;
    }

    const feedbackClass =
      this.feedbackState === 'correct'
        ? 'type-game__feedback--correct'
        : this.feedbackState === 'incorrect'
          ? 'type-game__feedback--incorrect'
          : '';

    const revealPokemon = this.getRevealPokemon();
    const revealTitle =
      this.endReason === 'won'
        ? 'Autres Pokémon possibles'
        : 'Pokémon correspondants';

    root.innerHTML = `
      <div class="type-game">
        <p class="type-game__intro">
          Trouvez un Pokémon possédant <strong>exactement</strong> ces types
          (nom français ou anglais accepté).
        </p>

        ${renderLives(this.livesLeft)}

        <div class="type-game__challenge" aria-live="polite">
          <p class="type-game__challenge-label">Types demandés</p>
          <div class="type-game__types">
            ${renderTypeBadge(this.typeA)}
            ${
              this.typeA !== this.typeB
                ? `<span class="type-game__plus" aria-hidden="true">+</span>${renderTypeBadge(this.typeB)}`
                : ''
            }
          </div>
        </div>

        <form class="type-game__form" id="type-game-form">
          <label class="type-game__label" for="type-game-answer">Votre réponse</label>
          <div class="type-game__input-wrap">
            <input
              type="text"
              id="type-game-answer"
              class="type-game__input"
              placeholder="Ex. Dracaufeu, Charizard…"
              autocomplete="off"
              spellcheck="false"
              value="${escapeHtml(this.inputValue)}"
              ${this.isOver ? 'disabled' : ''}
              aria-autocomplete="list"
              aria-controls="type-game-suggestions"
              aria-expanded="false"
            />
            <div
              id="type-game-suggestions"
              class="type-game__suggestions hidden"
              role="listbox"
              aria-label="Suggestions de Pokémon"
            ></div>
          </div>
          <div class="type-game__actions">
            <button type="submit" class="btn btn--primary" ${this.isOver ? 'disabled' : ''}>Valider</button>
            <button type="button" class="btn btn--secondary" id="type-game-none" ${this.isOver ? 'disabled' : ''}>Aucun</button>
            <button type="button" class="btn btn--ghost" id="type-game-new">Nouvelle combinaison</button>
          </div>
        </form>

        ${
          this.feedbackMessage
            ? `<p class="type-game__feedback ${feedbackClass}" role="status">${this.feedbackMessage}</p>`
            : '<p class="type-game__feedback type-game__feedback--empty" aria-hidden="true"></p>'
        }

        ${
          !this.isOver && this.guesses.length
            ? `
              <section class="type-game__guesses" aria-label="Vos propositions">
                <p class="type-game__guesses-label">Vos propositions</p>
                <div class="type-game__guesses-list">
                  ${this.guesses.map(renderGuessCard).join('')}
                </div>
              </section>
            `
            : ''
        }

        ${
          this.isOver
            ? `
              <section class="type-game__reveal" aria-label="${revealTitle}">
                <p class="type-game__reveal-title">${revealTitle}</p>
                ${
                  revealPokemon.length
                    ? `<div class="type-game__reveal-grid">${revealPokemon.map(renderRevealCard).join('')}</div>`
                    : `<p class="type-game__reveal-empty">Aucun autre Pokémon ne correspond à cette combinaison.</p>`
                }
              </section>
            `
            : ''
        }
      </div>
    `;

    const form = root.querySelector('#type-game-form');
    const input = root.querySelector('#type-game-answer');
    const btnNone = root.querySelector('#type-game-none');
    const btnNew = root.querySelector('#type-game-new');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.isOver) return;
      const value = input instanceof HTMLInputElement ? input.value : '';
      this.submit(value);
      handlers.onSubmit?.();
      this.render(root, handlers);
    });

    btnNone?.addEventListener('click', () => {
      if (this.isOver) return;
      this.submit('', { isNone: true });
      handlers.onSubmit?.();
      this.render(root, handlers);
    });

    btnNew?.addEventListener('click', () => {
      this.newChallenge();
      handlers.onNew?.();
      this.render(root, handlers);
      root.querySelector('#type-game-answer')?.focus();
    });

    if (!this.isOver && input instanceof HTMLInputElement) {
      this.wireAutocomplete(input, root, handlers);
      input.focus();
      if (this.feedbackState !== 'idle') input.select();
    }
  }

  /**
   * @param {HTMLInputElement} input
   * @param {HTMLElement} root
   * @param {{ onSubmit?: () => void }} handlers
   */
  wireAutocomplete(input, root, handlers) {
    const dropdown = root.querySelector('#type-game-suggestions');
    if (!dropdown || !this.cache) return;

    /** @type {TypeGameEntry[]} */
    let currentSuggestions = [];
    /** @type {number} */
    let activeIndex = -1;

    const hideDropdown = () => {
      dropdown.classList.add('hidden');
      input.setAttribute('aria-expanded', 'false');
      activeIndex = -1;
    };

    const showDropdown = () => {
      if (currentSuggestions.length) {
        dropdown.classList.remove('hidden');
        input.setAttribute('aria-expanded', 'true');
      } else {
        hideDropdown();
      }
    };

    const updateActiveItem = () => {
      dropdown.querySelectorAll('.type-game__suggestion').forEach((el, i) => {
        el.classList.toggle('type-game__suggestion--active', i === activeIndex);
      });
    };

    const selectSuggestion = (/** @type {string} */ name) => {
      this.inputValue = name;
      input.value = name;
      hideDropdown();
      input.focus();
    };

    const refreshSuggestions = () => {
      this.inputValue = input.value;
      currentSuggestions = searchPokemonSuggestions(this.cache, input.value, SUGGESTION_LIMIT);
      activeIndex = -1;

      if (!input.value.trim() || !currentSuggestions.length) {
        dropdown.innerHTML = '';
        hideDropdown();
        return;
      }

      dropdown.innerHTML = currentSuggestions
        .map((entry, index) => renderSuggestionItem(entry, index))
        .join('');
      showDropdown();
    };

    input.addEventListener('input', refreshSuggestions);

    input.addEventListener('focus', () => {
      refreshSuggestions();
    });

    input.addEventListener('blur', () => {
      setTimeout(hideDropdown, 150);
    });

    input.addEventListener('keydown', (e) => {
      if (dropdown.classList.contains('hidden') || !currentSuggestions.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, currentSuggestions.length - 1);
        updateActiveItem();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActiveItem();
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        selectSuggestion(currentSuggestions[activeIndex].nameFr);
      } else if (e.key === 'Escape') {
        hideDropdown();
      }
    });

    dropdown.addEventListener('mousedown', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('.type-game__suggestion') : null;
      if (!btn) return;
      e.preventDefault();
      const name = btn.getAttribute('data-name');
      if (name) selectSuggestion(name);
    });
  }
}

export const typeGame = new TypeGame();
