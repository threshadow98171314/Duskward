// Plays the board without a screen, to see how the rules work out over many moves:
// how long chains run, how often the board runs out of moves, how much a move
// gathers, and how often power tiles turn up. The player picks among the swaps
// that make a match at random, and the same seed always plays the same game.

import { type Board, createBoard, fillBoard, resolveWave, swapTiles, type TileWeights, validMoves } from './board.ts';
import { createRandom } from './random.ts';

export interface SimulationOptions {
	seed: number;
	moves: number;
	weights: TileWeights;
	rows?: number;
	columns?: number;
	// Called after every move has settled, e.g. to check the board
	onMove?: (board: Board) => void;
}

export interface SimulationReport {
	moves: number;
	waves: number;
	// Waves per move
	chains: { median: number; p90: number; p99: number; max: number };
	// Times the board had no move left and was filled again
	reshuffles: number;
	// Tiles gathered per move, on average, and in all by kind
	gatheredPerMove: number;
	gathered: Record<string, number>;
	// Power tiles earned per 100 moves
	lanternsPer100: number;
	sunsPer100: number;
}

export function simulate(options: SimulationOptions): SimulationReport {
	const tiles = createRandom(options.seed);
	const player = createRandom(options.seed ^ 0x5eed);
	const board = createBoard(options.rows ?? 8, options.columns ?? 8);
	const context = { weights: options.weights, gems: false };
	fillBoard(board, options.weights, tiles);

	const chains: number[] = [];
	const gathered: Record<string, number> = {};
	let waves = 0, reshuffles = 0, lanterns = 0, suns = 0;
	for (let move = 0; move < options.moves; move++) {
		let moves = validMoves(board);
		if (moves.length === 0) {
			reshuffles++;
			fillBoard(board, options.weights, tiles);
			moves = validMoves(board);
		}
		const [a, b] = moves[player.int(moves.length)];
		swapTiles(board, a, b);
		let chain = 0;
		for (let wave = resolveWave(board, context, tiles); wave.matched; wave = resolveWave(board, context, tiles)) {
			chain = wave.chain;
			waves++;
			for (const [tile, count] of Object.entries(wave.gathered)) {
				gathered[tile] = (gathered[tile] ?? 0) + count;
			}
			for (const power of board.pendingPowers) {
				if (power.type === 'sunPower') {
					suns++;
				} else {
					lanterns++;
				}
			}
		}
		chains.push(chain);
		options.onMove?.(board);
	}

	chains.sort((x, y) => x - y);
	const percentile = (p: number) => chains[Math.min(chains.length - 1, Math.floor(chains.length * p))];
	const total = Object.values(gathered).reduce((sum, n) => sum + n, 0);
	const round = (n: number) => Math.round(n * 10) / 10;
	return {
		moves: options.moves,
		waves,
		chains: { median: percentile(0.5), p90: percentile(0.9), p99: percentile(0.99), max: chains[chains.length - 1] },
		reshuffles,
		gatheredPerMove: round(total / options.moves),
		gathered: Object.fromEntries(Object.entries(gathered).sort()),
		lanternsPer100: round(lanterns / options.moves * 100),
		sunsPer100: round(suns / options.moves * 100),
	};
}
