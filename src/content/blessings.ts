// The blessings Sera can offer at dusk. Each is a gift for the coming night and a
// price paid for it; the stronger the gift, the heavier the price. Their names are
// in the locale files (BLESSING_NAMES), and what they do is described from the
// boons themselves, so the text always matches the numbers.

import type { BlessingDef } from '../core/blessings.ts';

export const BLESSINGS = {
	// A small kindness, free of charge
	lanternWard: {
		gift: [{ type: 'fill', what: 'ward' }],
		price: [],
	},
	seraPrayer: {
		gift: [{ type: 'fill', what: 'health' }],
		price: [{ type: 'nightMoves', moves: 3 }],
	},
	steadyShield: {
		gift: [{ type: 'fill', what: 'shield' }],
		price: [{ type: 'nightMoves', moves: 2 }],
	},
	keenEdge: {
		gift: [{ type: 'fill', what: 'sword' }],
		price: [{ type: 'monsterHealth', scale: 1.25 }],
	},
	afterglowSpring: {
		gift: [{ type: 'fill', what: 'gauge' }],
		price: [{ type: 'monsterDamage', add: 1 }],
		needs: { altar: true },
	},
	stillNight: {
		gift: [{ type: 'calm' }],
		price: [{ type: 'xp', scale: 0.5 }],
		needs: { day: 3 },
	},
	valor: {
		gift: [{ type: 'xp', scale: 2 }],
		price: [{ type: 'monsterHealth', scale: 1.5 }],
	},
	morningStar: {
		gift: [{ type: 'nightMoves', moves: -5 }],
		price: [{ type: 'spawns', scale: 2 }],
	},
	fullArms: {
		gift: [{ type: 'fill', what: 'shield' }, { type: 'fill', what: 'sword' }, { type: 'fill', what: 'ward' }],
		price: [{ type: 'spawns', scale: 2 }, { type: 'monsterHealth', scale: 1.25 }],
		needs: { day: 4 },
	},
} satisfies Record<string, BlessingDef>;
