import { describe, expect, it } from 'vitest';
import { GEM, tileAt } from '../src/core/board.ts';
import { MONSTERS } from '../src/content/monsters.ts';
import type { MonsterDef } from '../src/core/field.ts';
import { type Keeper, simulate, simulateFight } from '../src/core/simulate.ts';

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
