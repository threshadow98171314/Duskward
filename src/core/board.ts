// Board rules: swapping, matching, chains, power tiles and refilling.
//
// The board is a grid of resource tiles, one character per kind of resource (the
// `char` of each resource type in gamecontent.js). Nothing here touches the screen
// or uses timers: each function changes the board it is given and reports what
// happened, and the caller animates it. A swap is settled one wave of matches at a
// time, because the world reacts between waves, e.g. by spawning monsters at night.

import type { Random } from './random.ts';

export type Tile = string;
export type EffectType = 'lanternPower' | 'sunPower' | 'shadowBind' | 'explosive';

export interface Position {
	row: number;
	column: number;
}

export interface Effect {
	type: EffectType;
	// Swaps left before the effect wears off; only counts down for effects that are not permanent
	duration: number;
}

export interface Board {
	readonly rows: number;
	readonly columns: number;
	// Row by row: the tile at (row, column) is tiles[row * columns + column]. null is an empty cell.
	tiles: (Tile | null)[];
	effects: (Effect | null)[];
	// Power tiles earned by big matches, placed once the new tiles have landed
	pendingPowers: (Position & { type: EffectType })[];
	// Waves of matches so far in the current move
	chain: number;
}

// How likely each kind of tile is to appear, e.g. { g: 2, w: 2, s: 2 }
export type TileWeights = Record<Tile, number>;

export interface WaveContext {
	weights: TileWeights;
	// Whether big matches drop gems: only by day, once magic is unlocked
	gems: boolean;
}

export interface Wave {
	// Power tiles placed on the tiles that landed in the previous wave
	placed: (Position & { type: EffectType })[];
	matched: boolean;
	// Cleared tiles, in the order they cleared; tile is null for tiles destroyed without being gathered
	removed: (Position & { tile: Tile | null })[];
	// New tiles dropped in at the top of each column
	added: (Position & { tile: Tile })[];
	// Tiles gathered, by kind
	gathered: Record<Tile, number>;
	// The chain this wave reached; when nothing matched, the chain the move ended with
	chain: number;
	gauge: number;
	// Effects set off by clearing their tiles
	bursts: (Position & { type: EffectType })[];
	// Shadow binds lifted because a neighbour was cleared
	released: Position[];
}

export const GEM: Tile = 'm';
export const EXPLOSION_DAMAGE = 30;

const GAUGE_PER_EXTRA_TILE = 5;
const GAUGE_PER_CHAIN = 10;

const EFFECTS: Record<EffectType, { duration: number; permanent: boolean; immovable: boolean }> = {
	// Left by clearing four tiles at once; gathers its row and column when matched
	lanternPower: { duration: 0, permanent: true, immovable: false },
	// Left by clearing five or more at once; gathers every tile of its kind when matched
	sunPower: { duration: 0, permanent: true, immovable: false },
	// Cast by shades at night; the tile cannot move until a neighbour is cleared
	shadowBind: { duration: 0, permanent: true, immovable: true },
	// Planted by liches; destroys the tiles around it, along with anything gathered there
	explosive: { duration: 5, permanent: false, immovable: false },
};

export function createBoard(rows: number, columns: number): Board {
	return {
		rows,
		columns,
		tiles: new Array<Tile | null>(rows * columns).fill(null),
		effects: new Array<Effect | null>(rows * columns).fill(null),
		pendingPowers: [],
		chain: 0,
	};
}

export function tileAt(board: Board, row: number, column: number): Tile | null {
	return board.tiles[row * board.columns + column];
}

export function effectAt(board: Board, row: number, column: number): Effect | null {
	return board.effects[row * board.columns + column];
}

// Empties the board and fills it again. Each tile is less likely to repeat what is
// already to its left and above, so the board rarely starts with matches.
export function fillBoard(board: Board, weights: TileWeights, random: Random): void {
	board.effects.fill(null);
	board.pendingPowers = [];
	board.chain = 0;
	board.tiles.fill(null);
	for (let column = 0; column < board.columns; column++) {
		for (let row = 0; row < board.rows; row++) {
			const counts = { ...weights };
			if (column > 0) {
				const left = tileAt(board, row, column - 1)!;
				counts[left]--;
				if (column > 1 && tileAt(board, row, column - 2) === left) {
					counts[left]--;
				}
			}
			if (row > 0) {
				const above = tileAt(board, row - 1, column)!;
				counts[above]--;
				if (row > 1 && tileAt(board, row - 2, column) === above) {
					counts[above]--;
				}
			}
			board.tiles[row * board.columns + column] = pickTile(counts, random);
		}
	}
}

export function swapTiles(board: Board, a: Position, b: Position): void {
	const i = a.row * board.columns + a.column;
	const j = b.row * board.columns + b.column;
	[board.tiles[i], board.tiles[j]] = [board.tiles[j], board.tiles[i]];
	[board.effects[i], board.effects[j]] = [board.effects[j], board.effects[i]];
}

export function isBound(board: Board, position: Position): boolean {
	const effect = effectAt(board, position.row, position.column);
	return effect !== null && EFFECTS[effect.type].immovable;
}

// Puts an effect on a tile, unless the tile already has one. Returns whether it was placed.
export function addEffect(board: Board, position: Position, type: EffectType): boolean {
	const i = position.row * board.columns + position.column;
	if (board.effects[i] !== null) {
		return false;
	}
	board.effects[i] = { type, duration: EFFECTS[type].duration };
	return true;
}

// Counts down effects that wear off, after a move that made matches. Returns the ones that ended.
export function expireEffects(board: Board): (Position & { type: EffectType })[] {
	const ended: (Position & { type: EffectType })[] = [];
	board.effects.forEach((effect, i) => {
		if (effect !== null && !EFFECTS[effect.type].permanent && --effect.duration <= 0) {
			board.effects[i] = null;
			ended.push({ ...position(board, i), type: effect.type });
		}
	});
	return ended;
}

// Lifts every shadow bind, e.g. at daybreak. Returns where they were.
export function releaseAllBinds(board: Board): Position[] {
	const released: Position[] = [];
	board.effects.forEach((effect, i) => {
		if (effect !== null && EFFECTS[effect.type].immovable) {
			board.effects[i] = null;
			released.push(position(board, i));
		}
	});
	return released;
}

export function findTiles(board: Board, tile: Tile): Position[] {
	return columnOrder(board).filter((i) => board.tiles[i] === tile).map((i) => position(board, i));
}

// Whether any swap the player can make (bound tiles cannot move) would make a match
export function movesAvailable(board: Board): boolean {
	for (let row = 0; row < board.rows; row++) {
		for (let column = 0; column < board.columns; column++) {
			for (const [dr, dc] of [[0, 1], [1, 0]]) {
				const a = { row, column };
				const b = { row: row + dr, column: column + dc };
				if (b.row >= board.rows || b.column >= board.columns || isBound(board, a) || isBound(board, b) ||
						tileAt(board, a.row, a.column) === tileAt(board, b.row, b.column)) {
					continue;
				}
				swapTiles(board, a, b);
				const matches = inLine(board, a) || inLine(board, b);
				swapTiles(board, a, b);
				if (matches) {
					return true;
				}
			}
		}
	}
	return false;
}

// Settles one wave: places pending power tiles, clears every line of three or more,
// sets off effects on the cleared tiles, and drops new tiles in from the top.
export function resolveWave(board: Board, context: WaveContext, random: Random): Wave {
	const placed = board.pendingPowers.filter((power) => addEffect(board, power, power.type));
	board.pendingPowers = [];

	const wave: Wave = {
		placed,
		matched: false,
		removed: [],
		added: [],
		gathered: {},
		chain: board.chain,
		gauge: 0,
		bursts: [],
		released: [],
	};

	// Find the lines: columns first, then rows
	const marked = new Set<number>();
	const gemsInColumn = new Map<number, number>();
	const powers: { column: number; length: number }[] = [];
	const lines = [...findLines(board, true), ...findLines(board, false)];
	for (const line of lines) {
		line.cells.forEach((i) => marked.add(i));
		wave.gauge += GAUGE_PER_EXTRA_TILE * (line.cells.length - 3);
		if (line.cells.length > 3) {
			// A big line in a column rewards that column; a big line in a row, a random column along it
			const cell = line.vertical ? line.cells[0] : line.cells[random.int(line.cells.length)];
			const column = cell % board.columns;
			gemsInColumn.set(column, (gemsInColumn.get(column) ?? 0) + 1);
			powers.push({ column, length: line.cells.length });
		}
	}
	if (lines.length === 0) {
		board.chain = 0;
		return wave;
	}

	wave.matched = true;
	wave.chain = ++board.chain;

	// Clear the matched tiles. A tile gathered here can still be destroyed by an
	// explosion later in the wave, which takes back what it gathered ('-').
	const cleared = new Map<number, Tile | '-'>();
	const gather = (i: number, tile: Tile) => {
		wave.gathered[tile] = (wave.gathered[tile] ?? 0) + 1;
		cleared.set(i, tile);
		board.tiles[i] = null;
		wave.removed.push({ ...position(board, i), tile });
		setOff(i, tile);
	};
	const setOff = (i: number, tile: Tile) => {
		const effect = board.effects[i];
		board.effects[i] = null;
		if (effect === null) {
			return;
		}
		wave.bursts.push({ ...position(board, i), type: effect.type });
		for (const target of effectTargets(board, effect.type, i, tile)) {
			if (target.collect) {
				const collected = board.tiles[target.cell];
				if (collected !== null && !cleared.has(target.cell)) {
					gather(target.cell, collected);
				}
				continue;
			}
			board.tiles[target.cell] = null;
			board.effects[target.cell] = null;
			const before = cleared.get(target.cell);
			if (before === undefined) {
				cleared.set(target.cell, '-');
				wave.removed.push({ ...position(board, target.cell), tile: null });
			} else if (before !== '-') {
				cleared.set(target.cell, '-');
				wave.gathered[before]--;
			}
		}
	};
	for (const i of columnOrder(board)) {
		const tile = board.tiles[i];
		if (marked.has(i) && tile !== null) {
			gather(i, tile);
		}
	}

	// Clearing a tile frees shadow-bound neighbours
	for (const i of [...cleared.keys()].sort((a, b) => columnIndex(board, a) - columnIndex(board, b))) {
		const { row, column } = position(board, i);
		for (const [r, c] of [[row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]]) {
			if (r >= 0 && r < board.rows && c >= 0 && c < board.columns && isBound(board, { row: r, column: c })) {
				board.effects[r * board.columns + c] = null;
				wave.released.push({ row: r, column: c });
			}
		}
	}

	// Let the remaining tiles fall, then drop new ones in at the top
	for (let column = 0; column < board.columns; column++) {
		const kept: { tile: Tile; effect: Effect | null }[] = [];
		for (let row = 0; row < board.rows; row++) {
			const tile = tileAt(board, row, column);
			if (tile !== null) {
				kept.push({ tile, effect: effectAt(board, row, column) });
			}
		}
		const needed = board.rows - kept.length;
		if (needed === 0) {
			continue;
		}
		const gems = context.gems ? (gemsInColumn.get(column) ?? 0) : 0;
		const fresh: Tile[] = [];
		for (let row = needed - 1; row >= 0; row--) {
			fresh[row] = row < gems ? GEM : pickTile({ ...context.weights }, random);
			wave.added.push({ row, column, tile: fresh[row] });
		}
		for (let row = 0; row < board.rows; row++) {
			const i = row * board.columns + column;
			board.tiles[i] = row < needed ? fresh[row] : kept[row - needed].tile;
			board.effects[i] = row < needed ? null : kept[row - needed].effect;
		}
		// Big lines leave a power tile on one of the new tiles in their column
		powers.filter((power) => power.column === column).forEach((power, k) => {
			if (needed - 1 - k >= 0) {
				board.pendingPowers.push({
					row: needed - 1 - k,
					column,
					type: power.length >= 5 ? 'sunPower' : 'lanternPower',
				});
			}
		});
	}

	if (wave.chain > 1) {
		wave.gauge += GAUGE_PER_CHAIN * (wave.chain - 1);
	}
	return wave;
}

function position(board: Board, i: number): Position {
	return { row: Math.floor(i / board.columns), column: i % board.columns };
}

// The original game kept the board column by column, and several orders still follow that
function columnIndex(board: Board, i: number): number {
	return (i % board.columns) * board.rows + Math.floor(i / board.columns);
}

function columnOrder(board: Board): number[] {
	const order: number[] = [];
	for (let column = 0; column < board.columns; column++) {
		for (let row = 0; row < board.rows; row++) {
			order.push(row * board.columns + column);
		}
	}
	return order;
}

// Every run of three or more matching tiles, down each column or along each row
function findLines(board: Board, vertical: boolean): { cells: number[]; vertical: boolean }[] {
	const lines: { cells: number[]; vertical: boolean }[] = [];
	const outer = vertical ? board.columns : board.rows;
	const inner = vertical ? board.rows : board.columns;
	for (let a = 0; a < outer; a++) {
		let run: number[] = [];
		for (let b = 0; b <= inner; b++) {
			const i = b === inner ? -1 : vertical ? b * board.columns + a : a * board.columns + b;
			if (i >= 0 && run.length > 0 && board.tiles[i] !== null && board.tiles[i] === board.tiles[run[0]]) {
				run.push(i);
				continue;
			}
			if (run.length >= 3) {
				lines.push({ cells: run, vertical });
			}
			run = i >= 0 && board.tiles[i] !== null ? [i] : [];
		}
	}
	return lines;
}

function inLine(board: Board, { row, column }: Position): boolean {
	const tile = tileAt(board, row, column);
	const count = (dr: number, dc: number) => {
		let n = 0;
		for (let r = row + dr, c = column + dc;
			r >= 0 && r < board.rows && c >= 0 && c < board.columns && tileAt(board, r, c) === tile;
			r += dr, c += dc) {
			n++;
		}
		return n;
	};
	return 1 + count(0, -1) + count(0, 1) >= 3 || 1 + count(-1, 0) + count(1, 0) >= 3;
}

function effectTargets(board: Board, type: EffectType, i: number, tile: Tile): { cell: number; collect: boolean }[] {
	const { row, column } = position(board, i);
	switch (type) {
		case 'lanternPower': {
			const cells: number[] = [];
			for (let r = 0; r < board.rows; r++) {
				cells.push(r * board.columns + column);
			}
			for (let c = 0; c < board.columns; c++) {
				cells.push(row * board.columns + c);
			}
			return cells.map((cell) => ({ cell, collect: true }));
		}
		case 'sunPower':
			return columnOrder(board).filter((cell) => board.tiles[cell] === tile).map((cell) => ({ cell, collect: true }));
		case 'explosive': {
			const cells: number[] = [];
			for (let r = row - 1; r <= row + 1; r++) {
				for (let c = column - 1; c <= column + 1; c++) {
					if (r >= 0 && r < board.rows && c >= 0 && c < board.columns) {
						cells.push(r * board.columns + c);
					}
				}
			}
			return cells.map((cell) => ({ cell, collect: false }));
		}
		case 'shadowBind':
			return [];
	}
}

function pickTile(counts: TileWeights, random: Random): Tile {
	let total = 0;
	for (const tile in counts) {
		counts[tile] = Math.max(0, counts[tile]);
		total += counts[tile];
	}
	const r = random.next();
	let baseline = 0;
	let picked = '';
	for (const tile in counts) {
		picked = tile;
		const chance = counts[tile] / total;
		if (r < baseline + chance) {
			break;
		}
		baseline += chance;
	}
	return picked;
}
