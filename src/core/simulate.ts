// Plays the board without a screen, to see how the rules work out over many moves:
// how long chains run, how often the board runs out of moves, how much a move
// gathers, how often power tiles turn up, and how often a move earns a bounty (as
// if by day). The player picks among the swaps that make a match at random, and
// the same seed always plays the same game. It also stages fights on the field,
// to see how long a monster takes to beat and what it costs the keeper, and plays
// whole nights, to see what a blessing or an omen does to one.

import type { NightModifiers } from './blessings.ts';
import { type Board, createBoard, fillBoard, type Position, resolveWave, swapTiles, type TileWeights, validMoves } from './board.ts';
import { absorb, heroDamage, maxShield, maxSword, WARD_BITE } from './combat.ts';
import { createField, type FieldHost, living, type MonsterDef, spawn, tick } from './field.ts';
import { bounty } from './harvest.ts';
import { type Call, chainCalls, nightfallCalls } from './night.ts';
import { maxHealth } from './progress.ts';
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
	// Moves that gathered enough kinds for a bounty, per 100 moves, and the extra tiles bounties added per move
	bountiesPer100: number;
	bountyPerMove: number;
}

export function simulate(options: SimulationOptions): SimulationReport {
	const tiles = createRandom(options.seed);
	const player = createRandom(options.seed ^ 0x5eed);
	const board = createBoard(options.rows ?? 8, options.columns ?? 8);
	const context = { weights: options.weights, gems: false };
	fillBoard(board, options.weights, tiles);

	const chains: number[] = [];
	const gathered: Record<string, number> = {};
	let waves = 0, reshuffles = 0, lanterns = 0, suns = 0, bounties = 0, bountyTiles = 0;
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
		const gatheredThisMove: Record<string, number> = {};
		for (let wave = resolveWave(board, context, tiles); wave.matched; wave = resolveWave(board, context, tiles)) {
			chain = wave.chain;
			waves++;
			for (const [tile, count] of Object.entries(wave.gathered)) {
				gathered[tile] = (gathered[tile] ?? 0) + count;
				gatheredThisMove[tile] = (gatheredThisMove[tile] ?? 0) + count;
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
		const earned = bounty(gatheredThisMove);
		if (earned !== null) {
			bounties++;
			bountyTiles += Object.values(earned.extra).reduce((sum, n) => sum + n, 0);
		}
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
		bountiesPer100: round(bounties / options.moves * 100),
		bountyPerMove: round(bountyTiles / options.moves),
	};
}

export interface Keeper {
	level: number;
	// The highest level of the stone and wood tiles, which set the sword and the shield
	stoneLevel: number;
	woodLevel: number;
}

export interface FightReport {
	won: boolean;
	seconds: number;
	damageTaken: number;
	healthLeft: number;
}

// One keeper, fully armed, against monsters that come from the right, until one side
// falls (or two minutes pass)
export function simulateFight(monsters: { kind: string; def: MonsterDef }[], keeper: Keeper): FightReport {
	const field = createField(480);
	field.night = true;
	let health = maxHealth(keeper.level);
	let sword = maxSword(keeper.stoneLevel);
	let shield = maxShield(keeper.woodLevel);
	const start = health;
	const host: FieldHost = {
		keeperAlive: () => health > 0,
		keeperBlow: () => {
			const blow = heroDamage(keeper.level, sword, keeper.stoneLevel);
			const sharp = sword > 0;
			if (blow.usesSword) {
				sword--;
			}
			return { damage: blow.damage, sharp };
		},
		hurtKeeper: (damage) => {
			const result = absorb(damage, { health, ward: 0, shield, frozen: false });
			health = result.health;
			shield = result.shield;
		},
		nextTask: () => null,
	};
	for (const monster of monsters) {
		spawn(field, monster.kind, monster.def, 'right');
	}
	while (field.time < 120_000 && health > 0 && field.monsters.length > 0) {
		tick(field, host);
	}
	return {
		won: health > 0 && field.monsters.length === 0,
		seconds: field.time / 1000,
		damageTaken: Math.round((start - health) * 10) / 10,
		healthLeft: health,
	};
}

// Where the village stands on a night: the keeper, the tiles on the board, and the
// monster each kind of tile calls up at night (by tile code; the buildings decide)
export interface NightStage {
	day: number;
	level: number;
	stoneLevel: number;
	woodLevel: number;
	wardMax: number;
	weights: TileWeights;
	spawns: Record<string, string>;
}

export interface NightSetup {
	stage: NightStage;
	night: NightModifiers;
	monsters: Record<string, MonsterDef>;
	calls: Call[];
	// Sword charges filled at nightfall, as a share of the sword (the traveler's blades)
	nightfallSword?: number;
	// Called after every move has played out, e.g. to follow the night
	onMove?: (state: { move: number; gathered: string[]; called: string[]; health: number; sword: number; shield: number;
		ward: number; time: number; seconds: number }) => void;
}

export interface NightReport {
	// Whether the keeper would have lived to see the dawn
	survived: boolean;
	// All the damage that got past the ward and the shield, over the whole night
	damageTaken: number;
	seconds: number;
	moves: number;
	monsters: number;
	xp: number;
}

const NIGHT_MOVES = 15;
const NIGHT_FIELD = 480;
// After a move the player watches it settle, then waits for the keeper to clear the
// field before the next one, but only so long
const SETTLE_MS = 2000;
const PATIENCE_MS = 30_000;
// Health enough to last any night
const UNHURT = 1e6;
// A night that has not ended by then is given up on
const NIGHT_LIMIT_MS = 600_000;

// One night, as a careful player plays it: they wait for the field to clear before
// the next move, and pick the move by how they expect it to play out (the tiles
// that will drop in are anyone's guess), arming the keeper when the sword or
// shield runs low, calling up only a few monsters at a time and lighting lanterns.
// As in the game, gathered tiles call up monsters or arm the keeper, lanterns
// bring the dawn closer and draw lampmoths, long chains call shades, and crows and
// the omen's arrivals come at nightfall. The night ends once enough monsters have
// fallen and lanterns have been lit. The keeper starts it unhurt, with the ward
// raised at dusk and no sword or shield, and fights on to the dawn whatever it
// costs, so that a night's cost can be told even when it would have been too much
// (spells, items and skills, which help in the game, are left out).
export function simulateNight(seed: number, setup: NightSetup): NightReport {
	const { stage, night } = setup;
	const tiles = createRandom(seed);
	const player = createRandom(seed ^ 0x5eed);
	const sides = createRandom(seed ^ 0x51de);
	const board = createBoard(8, 8);
	const context = { weights: stage.weights, gems: false };
	fillBoard(board, stage.weights, tiles);

	const field = createField(NIGHT_FIELD);
	field.night = true;
	const start = maxHealth(stage.level);
	let health = UNHURT;
	let ward = stage.wardMax;
	let sword = Math.ceil(maxSword(stage.stoneLevel) * (setup.nightfallSword ?? 0));
	let shield = 0;
	for (const what of night.fill) {
		if (what === 'shield') {
			shield = maxShield(stage.woodLevel);
		} else if (what === 'sword') {
			sword = maxSword(stage.stoneLevel);
		} else if (what === 'ward') {
			ward = stage.wardMax;
		}
	}
	const host: FieldHost = {
		keeperAlive: () => true,
		keeperBlow: () => {
			const blow = heroDamage(stage.level, sword, stage.stoneLevel);
			const sharp = sword > 0;
			if (blow.usesSword) {
				sword--;
			}
			return { damage: blow.damage, sharp };
		},
		hurtKeeper: (damage, _by, prey) => {
			if (prey === 'ward' && ward > 0) {
				ward = Math.max(0, ward - damage * WARD_BITE);
				return;
			}
			const result = absorb(damage, { health, ward, shield, frozen: false });
			health = result.health;
			ward = result.ward;
			shield = result.shield;
		},
		nextTask: () => null,
	};

	let time = 0, xp = 0, moves = 0, monsters = 0;
	const length = Math.max(5, NIGHT_MOVES + night.nightMoves);
	// How much the player wants a move, by what they expect it to gather: each kind
	// of tile once for every wave that gathers it
	const worth = (expected: string[]): number => {
		const callers = expected.filter((kind) => stage.spawns[kind]).length;
		return (expected.includes('s') && sword < maxSword(stage.stoneLevel) / 2 ? 3 : 0) +
			(expected.includes('w') && shield < maxShield(stage.woodLevel) / 2 ? 2 : 0) +
			expected.filter((kind) => kind === 'f').length * 1.5 +
			(callers === 0 ? 0 : callers <= 2 ? 1 : -1.5 * (callers - 2));
	};
	// The best move, ties broken at random
	const pick = (worths: number[]): number => {
		const best = Math.max(...worths);
		const ties = worths.flatMap((value, i) => value === best ? [i] : []);
		return ties[player.int(ties.length)];
	};
	let called: string[] = [];
	const call = (kind: string, count: number) => {
		called.push(kind);
		spawn(field, kind, setup.monsters[kind], sides.next() < 0.5 ? 'left' : 'right',
			{ tiles: count, healthScale: night.monsterHealth, damageBonus: night.monsterDamage });
		monsters++;
	};
	const run = () => {
		const settled = field.time + SETTLE_MS;
		const patience = field.time + PATIENCE_MS;
		while (time < length && field.time < patience && (field.time < settled || living(field).length > 0)) {
			for (const event of tick(field, host)) {
				if (event.type === 'monsterGone' && !event.monster.wiped) {
					xp += Math.max(1, Math.round(event.monster.xp * night.xp));
					time++;
				}
			}
		}
	};

	for (const arrival of night.arrivals) {
		for (let i = 0; i < arrival.count; i++) {
			call(arrival.monster, 3);
		}
	}
	if (!night.calm) {
		for (const arrival of nightfallCalls(setup.calls, stage.day)) {
			for (let i = 0; i < arrival.count; i++) {
				call(arrival.monster, 3);
			}
		}
	}
	while (time < length && field.time < NIGHT_LIMIT_MS) {
		let options = validMoves(board);
		if (options.length === 0) {
			fillBoard(board, stage.weights, tiles);
			options = validMoves(board);
		}
		const [a, b] = options[pick(options.map((move) => worth(foresee(board, move, context, moves))))];
		swapTiles(board, a, b);
		moves++;
		called = [];
		const gathered: string[] = [];
		for (let wave = resolveWave(board, context, tiles); wave.matched; wave = resolveWave(board, context, tiles)) {
			for (const [tile, count] of Object.entries(wave.gathered)) {
				gathered.push(tile + count);
				if (tile === 'w') {
					shield = maxShield(stage.woodLevel);
				} else if (tile === 's') {
					sword = maxSword(stage.stoneLevel);
				} else if (tile === 'f') {
					time++;
					if (!night.calm) {
						call('lampmoth', count);
					}
				} else if (stage.spawns[tile]) {
					for (let copy = 0; copy < night.spawns; copy++) {
						call(stage.spawns[tile], count);
					}
				}
			}
			if (!night.calm && wave.chain > 1) {
				const calls = chainCalls(setup.calls, wave.chain);
				if (night.chainCall === wave.chain && !calls.includes('shade')) {
					calls.push('shade');
				}
				for (const kind of calls) {
					call(kind, wave.chain);
				}
			}
		}
		run();
		setup.onMove?.({ move: moves, gathered, called, health: start - (UNHURT - health), sword, shield, ward, time,
			seconds: field.time / 1000 });
	}
	const damageTaken = UNHURT - health;
	return {
		survived: damageTaken < start && time >= length,
		damageTaken: Math.round(damageTaken * 10) / 10,
		seconds: Math.round(field.time / 100) / 10,
		moves,
		monsters,
		xp,
	};
}

// What a move might gather, played out on a copy of the board with a guess at the
// tiles that drop in: the kind of each tile gathered, once for every wave
function foresee(board: Board, [a, b]: [Position, Position], context: { weights: TileWeights; gems: boolean }, guess: number): string[] {
	const copy: Board = {
		...board,
		tiles: [...board.tiles],
		effects: board.effects.map((effect) => effect && { ...effect }),
		pendingPowers: board.pendingPowers.map((power) => ({ ...power })),
	};
	const random = createRandom(guess);
	swapTiles(copy, a, b);
	const kinds: string[] = [];
	for (let wave = resolveWave(copy, context, random); wave.matched; wave = resolveWave(copy, context, random)) {
		kinds.push(...Object.keys(wave.gathered));
	}
	return kinds;
}
