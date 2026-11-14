// Blessings Sera offers at dusk: a gift for the coming night, at a price. The
// stronger the gift, the heavier the price. A night's blessing boils down to a
// handful of modifiers the rest of the game applies as night falls and lasts.

import { createRandom } from './random.ts';

export type Fill = 'health' | 'shield' | 'sword' | 'ward' | 'gauge';

export type Boon =
	// Filled up as night falls
	| { type: 'fill'; what: Fill }
	// Moves added to the night (taken away if negative)
	| { type: 'nightMoves'; moves: number }
	| { type: 'monsterHealth'; scale: number }
	// Added to every blow a monster lands
	| { type: 'monsterDamage'; add: number }
	// How many monsters each gathered tile calls up
	| { type: 'spawns'; scale: number }
	| { type: 'xp'; scale: number }
	// No shades, lampmoths or dusk crows tonight
	| { type: 'calm' };

export interface BlessingDef {
	gift: Boon[];
	price: Boon[];
	// Only offered once these hold
	needs?: { altar?: boolean; day?: number };
}

export interface NightModifiers {
	fill: Fill[];
	nightMoves: number;
	monsterHealth: number;
	monsterDamage: number;
	spawns: number;
	xp: number;
	calm: boolean;
}

export function nightModifiers(blessing: BlessingDef | null | undefined): NightModifiers {
	const modifiers: NightModifiers = { fill: [], nightMoves: 0, monsterHealth: 1, monsterDamage: 0, spawns: 1, xp: 1, calm: false };
	for (const boon of blessing ? [...blessing.gift, ...blessing.price] : []) {
		switch (boon.type) {
			case 'fill':
				modifiers.fill.push(boon.what);
				break;
			case 'nightMoves':
				modifiers.nightMoves += boon.moves;
				break;
			case 'monsterHealth':
				modifiers.monsterHealth *= boon.scale;
				break;
			case 'monsterDamage':
				modifiers.monsterDamage += boon.add;
				break;
			case 'spawns':
				modifiers.spawns *= boon.scale;
				break;
			case 'xp':
				modifiers.xp *= boon.scale;
				break;
			case 'calm':
				modifiers.calm = true;
				break;
		}
	}
	return modifiers;
}

export interface Offering {
	day: number;
	// The game's own seed, so a day offers the same blessings however often it is played
	seed: number;
	altar: boolean;
}

// The blessings Sera offers this dusk: a few of those the village is ready for
export function offerBlessings(pool: Record<string, BlessingDef>, offering: Offering, count = 3): string[] {
	const ready = Object.keys(pool).filter((id) => {
		const needs = pool[id].needs ?? {};
		return (!needs.altar || offering.altar) && offering.day >= (needs.day ?? 0);
	});
	const random = createRandom((offering.seed ^ Math.imul(offering.day, 0x9e3779b1)) >>> 0);
	// Shuffle, then take the first few, kept in the order of the pool
	for (let i = ready.length - 1; i > 0; i--) {
		const j = random.int(i + 1);
		[ready[i], ready[j]] = [ready[j], ready[i]];
	}
	const chosen = new Set(ready.slice(0, count));
	return Object.keys(pool).filter((id) => chosen.has(id));
}
