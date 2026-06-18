import { MAX_MISTAKES, SELECTION_SIZE } from './types.js';
import { findMatchingGroup, isOneAway } from './puzzle.js';

export class Game {
  /** @param {import('./types.js').Puzzle} puzzle */
  constructor(puzzle) {
    this.puzzle = puzzle;
    this.remainingTiles = [...puzzle.tiles];
    this.solvedGroups = [];
    this.selectedIds = new Set();
    this.mistakesLeft = MAX_MISTAKES;
    this.isOver = false;
    this.endReason = null;
    /** @type {Set<string>} */
    this.userSolvedGroupIds = new Set();
    this.lastFeedback = null;
  }

  /** @returns {import('./types.js').Pokemon[]} */
  get activeTiles() {
    const solvedIds = new Set(this.solvedGroups.flatMap((g) => g.pokemon.map((p) => p.id)));
    return this.remainingTiles.filter((p) => !solvedIds.has(p.id));
  }

  /** @param {number} id */
  toggleSelect(id) {
    if (this.isOver) return;
    const solvedIds = new Set(this.solvedGroups.flatMap((g) => g.pokemon.map((p) => p.id)));
    if (solvedIds.has(id)) return;

    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else if (this.selectedIds.size < SELECTION_SIZE) {
      this.selectedIds.add(id);
    }
  }

  deselectAll() {
    this.selectedIds.clear();
  }

  /** @returns {{ success: boolean, group?: import('./types.js').CategoryGroup, oneAway?: boolean, gameWon?: boolean, gameLost?: boolean }} */
  submit() {
    if (this.isOver || this.selectedIds.size !== SELECTION_SIZE) {
      return { success: false };
    }

    const selected = [...this.selectedIds];
    const group = findMatchingGroup(selected, this.puzzle.groups);

    if (group && !this.solvedGroups.find((g) => g.id === group.id)) {
      this.solvedGroups.push(group);
      this.userSolvedGroupIds.add(group.id);
      this.selectedIds.clear();
      this.lastFeedback = { type: 'success', group };

      if (this.solvedGroups.length === 4) {
        this.isOver = true;
        this.endReason = 'won';
        return { success: true, group, gameWon: true };
      }
      return { success: true, group };
    }

    const oneAway = isOneAway(selected, this.puzzle.groups.filter(
      (g) => !this.solvedGroups.find((s) => s.id === g.id)
    ));

    this.mistakesLeft -= 1;
    this.selectedIds.clear();
    this.lastFeedback = { type: 'error', oneAway };

    if (this.mistakesLeft <= 0) {
      this.isOver = true;
      this.endReason = 'lost';
      return { success: false, oneAway, gameLost: true };
    }

    return { success: false, oneAway };
  }

  shuffle() {
    const active = this.activeTiles;
    const solvedIds = new Set(this.solvedGroups.flatMap((g) => g.pokemon.map((p) => p.id)));
    const inactive = this.remainingTiles.filter((p) => solvedIds.has(p.id));
    const shuffled = [...active].sort(() => Math.random() - 0.5);
    this.remainingTiles = [...shuffled, ...inactive];
  }
}
