// Omens: what kind of night is coming. At dusk the night director reads one
// (src/core/night.ts) and Sera tells the keeper before they choose a blessing.
// Hard omens come more often to a keeper ahead of the nights; a keeper who fell
// last night gets a quiet one. Names and Sera's words are in the locale files
// (OMEN_NAMES, OMEN_WORDS); what an omen does is described from its effects.

import type { OmenDef } from '../core/night.ts';

export const QUIET_OMEN = 'quiet';

export const OMENS = {
	quiet: { weight: 4, effects: [] },
	mist: {
		weight: 2, fromDay: 2,
		effects: [{ type: 'monsterHealth', scale: 1.1 }, { type: 'xp', scale: 1.3 }],
	},
	fallingStars: {
		weight: 1.5, fromDay: 2,
		effects: [{ type: 'loot', scale: 2 }],
	},
	crowNight: {
		weight: 2, fromDay: 3, hard: true,
		effects: [{ type: 'arrivals', monster: 'duskcrow', count: 2 }],
	},
	shadowTide: {
		weight: 1.5, fromDay: 4, hard: true,
		effects: [{ type: 'chainCall', waves: 2 }],
	},
	moonless: {
		weight: 1, fromDay: 8, hard: true,
		effects: [{ type: 'nightMoves', moves: 3 }, { type: 'xp', scale: 1.5 }],
	},
} satisfies Record<string, OmenDef>;
