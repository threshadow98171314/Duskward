import { describe, expect, it } from 'vitest';
import {
	addEffect,
	type Board,
	createBoard,
	effectAt,
	expireEffects,
	fillBoard,
	GEM,
	isBound,
	movesAvailable,
	releaseAllBinds,
	resolveWave,
	swapTiles,
	tileAt,
	type WaveContext,
} from '../src/core/board.ts';
import { createRandom } from '../src/core/random.ts';

// New tiles are all 'x', so nothing cascades unless a test lines up x's on purpose
const onlyX: WaveContext = { weights: { x: 1 }, gems: false };

function boardOf(rows: string[]): Board {
	const board = createBoard(rows.length, rows[0].length);
	rows.forEach((line, row) => [...line].forEach((tile, column) => {
		board.tiles[row * board.columns + column] = tile;
	}));
	return board;
}

function rowsOf(board: Board): string[] {
	return Array.from({ length: board.rows }, (_, row) =>
		Array.from({ length: board.columns }, (_, column) => tileAt(board, row, column) ?? '.').join(''));
}

function hasLine(board: Board): boolean {
	const rows = rowsOf(board);
	const columns = Array.from({ length: board.columns }, (_, c) => rows.map((r) => r[c]).join(''));
	return [...rows, ...columns].some((line) => /(.)\1\1/.test(line));
}

describe('fillBoard', () => {
	it('fills the same way for the same seed', () => {
		const a = createBoard(8, 8);
		const b = createBoard(8, 8);
		fillBoard(a, { g: 2, w: 2, s: 2 }, createRandom(5));
		fillBoard(b, { g: 2, w: 2, s: 2 }, createRandom(5));
		expect(rowsOf(a)).toEqual(rowsOf(b));
	});

	it('never starts with a line of three', () => {
		for (let seed = 0; seed < 200; seed++) {
			const board = createBoard(8, 8);
			fillBoard(board, { g: 2, w: 2, s: 2, c: 2, l: 2, f: 1 }, createRandom(seed));
			expect(hasLine(board), 'seed ' + seed).toBe(false);
		}
	});
});

describe('resolveWave', () => {
	it('clears a line, gathers it, and drops new tiles in from the top', () => {
		const board = boardOf([
			'abca',
			'bcab',
			'gggc',
			'abca',
		]);
		const wave = resolveWave(board, onlyX, createRandom(1));
		expect(wave.matched).toBe(true);
		expect(wave.gathered).toEqual({ g: 3 });
		expect(wave.removed).toEqual([
			{ row: 2, column: 0, tile: 'g' },
			{ row: 2, column: 1, tile: 'g' },
			{ row: 2, column: 2, tile: 'g' },
		]);
		expect(wave.added).toEqual([
			{ row: 0, column: 0, tile: 'x' },
			{ row: 0, column: 1, tile: 'x' },
			{ row: 0, column: 2, tile: 'x' },
		]);
		expect(rowsOf(board)).toEqual([
			'xxxa',
			'abcb',
			'bcac',
			'abca',
		]);
		expect(wave.chain).toBe(1);
		expect(wave.gauge).toBe(0);
	});

	it('counts chains across waves and ends them when nothing matches', () => {
		const board = boardOf([
			'abca',
			'bcab',
			'gggc',
			'abca',
		]);
		resolveWave(board, onlyX, createRandom(1));
		// The new x's line up and clear in a second wave
		const mixed: WaveContext = { weights: { y: 1, z: 1 }, gems: false };
		const second = resolveWave(board, mixed, createRandom(2));
		expect(second.chain).toBe(2);
		expect(second.gathered).toEqual({ x: 3 });
		expect(second.gauge).toBe(10);
		let wave = second;
		let matchedWaves = 2;
		while (wave.matched && matchedWaves < 20) {
			wave = resolveWave(board, mixed, createRandom(matchedWaves));
			matchedWaves += wave.matched ? 1 : 0;
		}
		expect(wave.matched).toBe(false);
		expect(wave.chain).toBe(matchedWaves);
		expect(board.chain).toBe(0);
	});

	it('settles long chains: from the seventh wave, new tiles stay out of line when they can', () => {
		// The cell left of "aa" fills second; an 'a' there would complete a line
		const weights = { a: 1, b: 1, c: 1 };
		let early = 0;
		for (let seed = 0; seed < 50; seed++) {
			for (const chain of [0, 6]) {
				const board = boardOf(['xbc', 'xaa', 'xcb', 'bac']);
				board.chain = chain;
				resolveWave(board, { weights, gems: false }, createRandom(seed));
				if (chain === 6) {
					expect(hasLine(board), 'seed ' + seed).toBe(false);
				} else if (hasLine(board)) {
					early++;
				}
			}
		}
		// Early in a chain, new tiles still land in line as often as chance has it
		expect(early).toBeGreaterThan(5);
	});

	it('turns a line of four into a lantern, and a gem by day', () => {
		const board = boardOf([
			'abca',
			'gggg',
			'cabc',
		]);
		const wave = resolveWave(board, { weights: { x: 1 }, gems: true }, createRandom(3));
		expect(wave.gauge).toBe(5);
		// The gem and the lantern both go to one random column along the line
		const gems = wave.added.filter((tile) => tile.tile === GEM);
		expect(gems).toHaveLength(1);
		const lantern = { row: 0, column: gems[0].column, type: 'lanternPower' };
		expect(board.pendingPowers).toEqual([lantern]);
		// It is placed once the new tiles have landed, at the start of the next wave
		expect(resolveWave(board, onlyX, createRandom(3)).placed).toEqual([lantern]);
	});

	it('turns a line of five into a sun', () => {
		const board = boardOf([
			'abcab',
			'sssss',
			'bcabc',
		]);
		const wave = resolveWave(board, onlyX, createRandom(1));
		expect(wave.gauge).toBe(10);
		expect(board.pendingPowers).toEqual([expect.objectContaining({ type: 'sunPower' })]);
	});

	it('leaves no gems at night', () => {
		const board = boardOf([
			'abca',
			'gggg',
			'cabc',
		]);
		const wave = resolveWave(board, { weights: { x: 1 }, gems: false }, createRandom(3));
		expect(wave.added.some((tile) => tile.tile === GEM)).toBe(false);
	});

	it('gathers the row and column of a matched lantern', () => {
		const board = boardOf([
			'abcd',
			'bcda',
			'gggb',
			'dabc',
		]);
		addEffect(board, { row: 2, column: 1 }, 'lanternPower');
		const wave = resolveWave(board, onlyX, createRandom(1));
		expect(wave.bursts).toEqual([{ row: 2, column: 1, type: 'lanternPower' }]);
		// Column 1 (b, c, a) plus row 2 (g, g, g, b)
		expect(wave.gathered).toEqual({ g: 3, b: 2, c: 1, a: 1 });
		expect(wave.removed).toHaveLength(7);
	});

	it('gathers every tile of its kind with a matched sun', () => {
		const board = boardOf([
			'gbcg',
			'bcda',
			'sssb',
			'dsbg',
		]);
		addEffect(board, { row: 2, column: 0 }, 'sunPower');
		const wave = resolveWave(board, onlyX, createRandom(1));
		expect(wave.gathered).toEqual({ s: 4 });
	});

	it('blows up the tiles around an explosive, taking back what they gathered', () => {
		const board = boardOf([
			'abcd',
			'bcda',
			'gggb',
			'dabc',
		]);
		addEffect(board, { row: 2, column: 0 }, 'explosive');
		const wave = resolveWave(board, onlyX, createRandom(1));
		expect(wave.bursts).toEqual([{ row: 2, column: 0, type: 'explosive' }]);
		// Tiles clear column by column, so the explosion takes back (2,0), which it sat on,
		// and destroys (2,1) before it is gathered, along with its other neighbours.
		// Only (2,2) is still gathered when the wave ends.
		expect(wave.gathered).toEqual({ g: 1 });
		expect(wave.removed.filter((tile) => tile.tile === null).map(({ row, column }) => [row, column]))
			.toEqual([[1, 0], [1, 1], [2, 1], [3, 0], [3, 1]]);
	});

	it('sets off effects inside other effects', () => {
		const board = boardOf([
			'abcd',
			'bcda',
			'gggb',
			'dabc',
		]);
		addEffect(board, { row: 2, column: 1 }, 'lanternPower');
		addEffect(board, { row: 0, column: 1 }, 'sunPower');
		const wave = resolveWave(board, onlyX, createRandom(1));
		expect(wave.bursts.map((burst) => burst.type)).toEqual(['lanternPower', 'sunPower']);
	});

	it('moves effects down with their tiles', () => {
		const board = boardOf([
			'abca',
			'bcab',
			'gggc',
			'abca',
		]);
		addEffect(board, { row: 0, column: 0 }, 'explosive');
		resolveWave(board, onlyX, createRandom(1));
		expect(effectAt(board, 1, 0)?.type).toBe('explosive');
		expect(effectAt(board, 0, 0)).toBeNull();
	});
});

describe('shadow binds', () => {
	it('hold a tile until a neighbour is cleared', () => {
		const board = boardOf([
			'abca',
			'bcab',
			'gggc',
			'abca',
		]);
		addEffect(board, { row: 1, column: 1 }, 'shadowBind');
		expect(isBound(board, { row: 1, column: 1 })).toBe(true);
		const wave = resolveWave(board, onlyX, createRandom(1));
		expect(wave.released).toEqual([{ row: 1, column: 1 }]);
		// The tile fell a row and is free again
		expect(isBound(board, { row: 2, column: 1 })).toBe(false);
	});

	it('all lift at once', () => {
		const board = boardOf(['ab', 'ba']);
		addEffect(board, { row: 0, column: 0 }, 'shadowBind');
		addEffect(board, { row: 1, column: 1 }, 'explosive');
		expect(releaseAllBinds(board)).toEqual([{ row: 0, column: 0 }]);
		expect(effectAt(board, 1, 1)?.type).toBe('explosive');
	});
});

describe('effects', () => {
	it('do not stack on one tile', () => {
		const board = boardOf(['ab', 'ba']);
		expect(addEffect(board, { row: 0, column: 0 }, 'explosive')).toBe(true);
		expect(addEffect(board, { row: 0, column: 0 }, 'lanternPower')).toBe(false);
	});

	it('wear off after enough moves, unless permanent', () => {
		const board = boardOf(['ab', 'ba']);
		addEffect(board, { row: 0, column: 0 }, 'explosive');
		addEffect(board, { row: 1, column: 1 }, 'lanternPower');
		for (let move = 1; move < 5; move++) {
			expect(expireEffects(board), 'move ' + move).toEqual([]);
		}
		expect(expireEffects(board)).toEqual([{ row: 0, column: 0, type: 'explosive' }]);
		expect(effectAt(board, 1, 1)?.type).toBe('lanternPower');
	});

	it('move with their tiles when swapped', () => {
		const board = boardOf(['ab', 'ba']);
		addEffect(board, { row: 0, column: 0 }, 'explosive');
		swapTiles(board, { row: 0, column: 0 }, { row: 0, column: 1 });
		expect(rowsOf(board)).toEqual(['ba', 'ba']);
		expect(effectAt(board, 0, 1)?.type).toBe('explosive');
	});
});

describe('movesAvailable', () => {
	it('finds a swap that makes a line', () => {
		expect(movesAvailable(boardOf([
			'abab',
			'baba',
			'abaa',
			'baba',
		]))).toBe(true);
	});

	it('finds none on a board without one', () => {
		expect(movesAvailable(boardOf([
			'abcd',
			'cdab',
			'abcd',
			'cdab',
		]))).toBe(false);
	});

	it('does not count swaps of bound tiles', () => {
		// The only move is swapping the last two tiles of the top row
		const board = boardOf([
			'aaba',
			'cdef',
			'ghci',
		]);
		expect(movesAvailable(board)).toBe(true);
		addEffect(board, { row: 0, column: 3 }, 'shadowBind');
		expect(movesAvailable(board)).toBe(false);
	});
});
