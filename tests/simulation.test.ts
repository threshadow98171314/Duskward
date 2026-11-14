import { describe, expect, it } from 'vitest';
import { BLESSINGS } from '../src/content/blessings.ts';
import { CALLS, MONSTERS } from '../src/content/monsters.ts';
import { OMENS } from '../src/content/omens.ts';
import { type BlessingDef, type Boon, type NightModifiers, nightModifiers } from '../src/core/blessings.ts';
import { GEM, tileAt } from '../src/core/board.ts';
import type { MonsterDef } from '../src/core/field.ts';
import { type Keeper, type NightStage, simulate, simulateFight, simulateNight } from '../src/core/simulate.ts';

// The tiles on the board as the village grows: brick layer (clay), weaver (cloth), lighthouse (lantern)
const STAGES = {
	'3 kinds': { g: 2, w: 2, s: 2 },
	'4 kinds': { g: 2, w: 2, s: 2, c: 2 },
	'5 kinds': { g: 2, w: 2, s: 2, c: 2, l: 2 },
	'6 kinds': { g: 2, w: 2, s: 2, c: 2, l: 2, f: 1 },
};

describe('simulated play', () => {
	it('plays the same game for the same seed', () => {
		const once = simulate({ seed: 7, moves: 300, weights: STAGES['4 kinds'] });
		expect(simulate({ seed: 7, moves: 300, weights: STAGES['4 kinds'] })).toEqual(once);
		expect(simulate({ seed: 8, moves: 300, weights: STAGES['4 kinds'] })).not.toEqual(once);
	});

	it('leaves the board full and settled after every move', () => {
		for (const [stage, weights] of Object.entries(STAGES)) {
			const allowed = new Set([...Object.keys(weights), GEM]);
			simulate({
				seed: 3,
				moves: 500,
				weights,
				onMove: (board) => {
					expect(board.tiles.every((tile) => tile !== null && allowed.has(tile)), stage).toBe(true);
					for (let row = 0; row < board.rows; row++) {
						for (let column = 0; column < board.columns; column++) {
							const tile = tileAt(board, row, column);
							const across = column + 2 < board.columns && tile === tileAt(board, row, column + 1) &&
								tile === tileAt(board, row, column + 2);
							const down = row + 2 < board.rows && tile === tileAt(board, row + 1, column) &&
								tile === tileAt(board, row + 2, column);
							expect(across || down, stage + ' at ' + row + ',' + column).toBe(false);
						}
					}
				},
			});
		}
	});

	// How the board plays at each stage of the village. When a rule or a number
	// changes, this snapshot shows what that does to chains, gains and power tiles;
	// update it with `npx vitest run -u` once the change is intended.
	it('plays out like this at each stage of the village', () => {
		const report = Object.fromEntries(Object.entries(STAGES).map(([stage, weights]) =>
			[stage, simulate({ seed: 1, moves: 2000, weights })]));
		expect(report).toMatchSnapshot();
	});
});

// Each monster against a fully armed keeper of about the level that first meets it.
// Like the board report, the snapshot shows what a change to a monster does.
const MEETINGS: [string, string[], Keeper][] = [
	['a shambler', ['zombie'], { level: 1, stoneLevel: 1, woodLevel: 1 }],
	['three shamblers', ['zombie', 'zombie', 'zombie'], { level: 1, stoneLevel: 1, woodLevel: 1 }],
	['a gnawer', ['rat'], { level: 2, stoneLevel: 1, woodLevel: 1 }],
	['an archer', ['skeleton'], { level: 2, stoneLevel: 1, woodLevel: 1 }],
	['vacant mail', ['hauntedArmour'], { level: 4, stoneLevel: 2, woodLevel: 2 }],
	['a marsh lurker', ['lizardman'], { level: 4, stoneLevel: 2, woodLevel: 2 }],
	['a nightweaver', ['spider'], { level: 4, stoneLevel: 2, woodLevel: 2 }],
	['a dusk golem', ['earthElemental'], { level: 7, stoneLevel: 4, woodLevel: 4 }],
	['an ember wisp', ['fireElemental'], { level: 7, stoneLevel: 4, woodLevel: 4 }],
	['a mist wraith', ['waterElemental'], { level: 7, stoneLevel: 4, woodLevel: 4 }],
	['a night terror', ['demon'], { level: 10, stoneLevel: 6, woodLevel: 6 }],
	['a cultist', ['warlock'], { level: 10, stoneLevel: 6, woodLevel: 6 }],
	['a shadowbat', ['imp'], { level: 10, stoneLevel: 6, woodLevel: 6 }],
	['the hierophant', ['lich'], { level: 12, stoneLevel: 8, woodLevel: 8 }],
	['a shade', ['shade'], { level: 3, stoneLevel: 1, woodLevel: 1 }],
	['a lampmoth', ['lampmoth'], { level: 4, stoneLevel: 2, woodLevel: 2 }],
	['a flock of three crows', ['duskcrow', 'duskcrow', 'duskcrow'], { level: 4, stoneLevel: 2, woodLevel: 2 }],
];

describe('simulated fights', () => {
	it('play out like this for each monster', () => {
		const report = Object.fromEntries(MEETINGS.map(([name, kinds, keeper]) =>
			[name, simulateFight(kinds.map((kind) => ({ kind, def: MONSTERS[kind as keyof typeof MONSTERS] as MonsterDef })), keeper)]));
		expect(report).toMatchSnapshot();
	});
});

// Where the village might stand on a few nights: a keeper a little ahead of the
// level the nights expect, the buildings that decide what the tiles call up, and
// the ward the lighthouse allows
const NIGHTS: Record<string, NightStage> = {
	'night 2': {
		day: 2, level: 1, stoneLevel: 1, woodLevel: 1, wardMax: 5,
		weights: STAGES['4 kinds'], spawns: { g: 'zombie', c: 'rat' },
	},
	'night 8': {
		day: 8, level: 4, stoneLevel: 2, woodLevel: 2, wardMax: 10,
		weights: STAGES['5 kinds'], spawns: { g: 'hauntedArmour', c: 'spider', l: 'lizardman' },
	},
	'night 16': {
		day: 16, level: 7, stoneLevel: 4, woodLevel: 4, wardMax: 15,
		weights: STAGES['6 kinds'], spawns: { g: 'earthElemental', c: 'waterElemental', l: 'fireElemental' },
	},
	'night 25': {
		day: 25, level: 10, stoneLevel: 6, woodLevel: 6, wardMax: 20,
		weights: STAGES['6 kinds'], spawns: { g: 'demon', c: 'imp', l: 'warlock' },
	},
};

const playNight = (seed: number, stage: NightStage, night: NightModifiers) =>
	simulateNight(seed, { stage, night, monsters: MONSTERS as Record<string, MonsterDef>, calls: CALLS });

describe('simulated nights', () => {
	it('play the same night for the same seed, and last until the dawn', () => {
		const once = playNight(5, NIGHTS['night 8'], nightModifiers(null));
		expect(playNight(5, NIGHTS['night 8'], nightModifiers(null))).toEqual(once);
		expect(playNight(6, NIGHTS['night 8'], nightModifiers(null))).not.toEqual(once);
		expect(once.monsters).toBeGreaterThanOrEqual(15);
		expect(once.xp).toBeGreaterThan(0);
	});

	// What a night costs with each blessing and omen: the damage that gets past the
	// ward and the shield over the whole night, as a share of the keeper's health, and
	// the experience it brings, on average over a few nights. Spells, items and skills
	// are left out, so the cost runs high; what matters is how the choices compare.
	// The cult's bargain is here too: tonight if accepted or refused, and every night
	// after with the ward it took. Every choice plays the same nights.
	it('cost this much with each blessing, omen and bargain', () => {
		const SEEDS = 24;
		const choices: Record<string, { night: NightModifiers; wardLost?: number }> = { plain: { night: nightModifiers(null) } };
		for (const [id, blessing] of Object.entries(BLESSINGS as Record<string, BlessingDef>)) {
			choices[id] = { night: nightModifiers(blessing) };
		}
		for (const [id, omen] of Object.entries(OMENS as Record<string, { effects: Boon[] }>)) {
			if (id !== 'quiet') {
				choices['omen ' + id] = { night: nightModifiers(null, omen.effects) };
			}
		}
		choices['cult accepted, tonight'] = { night: nightModifiers(null, [{ type: 'calm' }, { type: 'nightMoves', moves: -5 }]) };
		choices['cult refused, tonight'] = { night: nightModifiers(null, [{ type: 'arrivals', monster: 'warlock', count: 1 }]) };
		choices['cult accepted, after'] = { night: nightModifiers(null), wardLost: 10 };
		const report = Object.fromEntries(Object.entries(choices).map(([name, choice]) => [name, Object.fromEntries(
			Object.entries(NIGHTS).map(([when, stage]) => {
				const health = 20 + 10 * stage.level;
				let cost = 0, xp = 0;
				for (let seed = 1; seed <= SEEDS; seed++) {
					const night = playNight(seed * 7919, { ...stage, wardMax: Math.max(0, stage.wardMax - (choice.wardLost ?? 0)) },
						choice.night);
					cost += night.damageTaken / health;
					xp += night.xp;
				}
				return [when, Math.round(cost / SEEDS * 100) + '% / ' + Math.round(xp / SEEDS) + ' xp'];
			}))]));
		expect(report).toMatchSnapshot();
	}, 60_000);
});
