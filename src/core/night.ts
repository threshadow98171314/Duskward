// What the night holds beyond the tiles the keeper gathers. Calls bring monsters
// for other reasons: a long chain calls up a shade, and crows gather at nightfall
// once the village is big enough to be noticed (src/content/monsters.ts). And each
// dusk, the night director reads an omen for the coming night (src/content/omens.ts).

import type { Boon } from './blessings.ts';
import { createRandom } from './random.ts';

export type Call =
	// A chain at night reaching this many waves calls the monster, once per move
	| { monster: string; when: 'chain'; waves: number }
	// At nightfall from this day on, a flock that grows by one every few days, up to a limit
	| { monster: string; when: 'nightfall'; fromDay: number; flock: number; growEvery: number; most: number };

export function chainCalls(calls: Call[], waves: number): string[] {
	return calls.filter((call) => call.when === 'chain' && call.waves === waves).map((call) => call.monster);
}

export function nightfallCalls(calls: Call[], day: number): { monster: string; count: number }[] {
	const arrivals: { monster: string; count: number }[] = [];
	for (const call of calls) {
		if (call.when === 'nightfall' && day >= call.fromDay) {
			arrivals.push({
				monster: call.monster,
				count: Math.min(call.most, call.flock + Math.floor((day - call.fromDay) / call.growEvery)),
			});
		}
	}
	return arrivals;
}

export interface OmenDef {
	weight: number;
	fromDay?: number;
	// Comes more often to a keeper ahead of the nights, less to one behind them
	hard?: boolean;
	effects: Boon[];
}

export interface Reading {
	day: number;
	seed: number;
	level: number;
	// The keeper fell last night: tonight is kept quiet
	fellLastNight: boolean;
	quiet: string;
}

// How far the keeper is ahead of the level the nights expect by now
export function strength(day: number, level: number): number {
	return level - (1 + Math.floor(day / 3));
}

// The night director: the omen for the coming night, the same for the same day of the same game
export function readOmen(omens: Record<string, OmenDef>, reading: Reading): string {
	if (reading.fellLastNight) {
		return reading.quiet;
	}
	const ahead = strength(reading.day, reading.level);
	const weights = Object.entries(omens).map(([id, omen]): [string, number] => {
		if (reading.day < (omen.fromDay ?? 0)) {
			return [id, 0];
		}
		const lean = omen.hard ? (ahead >= 2 ? 2 : ahead <= -1 ? 0.5 : 1) : (ahead <= -1 ? 2 : 1);
		return [id, omen.weight * lean];
	});
	const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
	const random = createRandom((reading.seed ^ Math.imul(reading.day + 7, 0x85ebca6b)) >>> 0);
	let roll = random.next() * total;
	for (const [id, weight] of weights) {
		roll -= weight;
		if (roll < 0) {
			return id;
		}
	}
	return reading.quiet;
}
