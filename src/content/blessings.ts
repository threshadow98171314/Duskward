// The blessings Sera can offer at dusk. Each is a gift for the coming night and a
// price paid for it; the stronger the gift, the heavier the price. Their names are
// in the locale files (BLESSING_NAMES), and what they do is described from the
// boons themselves, so the text always matches the numbers.
//
// The numbers were weighed against whole nights played out on the field (see the
// simulated nights in tests/simulation.test.ts): every move added to a night costs
// the keeper about as much as it brings in experience, while tougher monsters cost
// far more than they seem to, so they are only asked for the biggest gifts.

import type { BlessingDef } from '../core/blessings.ts';

export const BLESSINGS = {
	// A small kindness, free of charge
	lanternWard: {
		gift: [{ type: 'fill', what: 'ward' }, { type: 'nightMoves', moves: -1 }],
		price: [],
	},
	seraPrayer: {
		gift: [{ type: 'fill', what: 'health' }],
		price: [{ type: 'nightMoves', moves: 1 }],
	},
	steadyShield: {
		gift: [{ type: 'fill', what: 'shield' }],
		price: [{ type: 'nightMoves', moves: 1 }],
	},
	keenEdge: {
		gift: [{ type: 'fill', what: 'sword' }],
		price: [{ type: 'nightMoves', moves: 1 }],
	},
	afterglowSpring: {
		gift: [{ type: 'fill', what: 'gauge' }],
		price: [{ type: 'nightMoves', moves: 2 }],
		needs: { altar: true },
	},
	// Without shades, lampmoths and crows, the night would have to be won from the
	// tougher monsters the tiles call up, so it is shorter too
	stillNight: {
		gift: [{ type: 'calm' }, { type: 'nightMoves', moves: -5 }],
		price: [{ type: 'xp', scale: 0.5 }],
		needs: { day: 3 },
	},
	valor: {
		gift: [{ type: 'xp', scale: 2 }],
		price: [{ type: 'monsterHealth', scale: 1.2 }],
	},
	morningStar: {
		gift: [{ type: 'nightMoves', moves: -5 }],
		price: [{ type: 'monsterHealth', scale: 1.15 }],
	},
	fullArms: {
		gift: [{ type: 'fill', what: 'shield' }, { type: 'fill', what: 'sword' }, { type: 'fill', what: 'ward' }],
		price: [{ type: 'nightMoves', moves: 3 }],
		needs: { day: 4 },
	},
} satisfies Record<string, BlessingDef>;
