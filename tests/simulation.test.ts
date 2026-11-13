import { describe, expect, it } from 'vitest';
import { GEM, tileAt } from '../src/core/board.ts';
import { simulate } from '../src/core/simulate.ts';

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
