// gameboard.js keeps the board for the game and turns what src/core/board.ts reports
// into the events and draw requests the rest of the game listens for, in the order the
// original module triggered them. Before it moved onto the core, this same test drove
// the original module and matched it move for move on these games.
import { expect, it, vi } from 'vitest';
import Engine from '../src/app/engine.js';
import EventManager from '../src/app/eventmanager.js';
import GameBoard from '../src/app/gameboard.js';
import Content from '../src/app/gamecontent.js';
import GameState from '../src/app/gamestate.js';
import {
	addEffect, type Board, createBoard, type EffectType, expireEffects, isBound, resolveWave, swapTiles, validMoves,
} from '../src/core/board.ts';
import { createRandom } from '../src/core/random.ts';

type Recorded = [string, ...unknown[]];
const char = (className: string) => (Content.getResourceType(className) as { char: string }).char;
const EFFECT_TYPES: EffectType[] = ['lanternPower', 'sunPower', 'explosive', 'shadowBind'];
const WATCHED = ['tilesCleared', 'chainCombo', 'gaugeGain', 'lanternBurst', 'sunBurst', 'tileExplode', 'hurtDude',
	'drawEffect', 'drawRemoveEffect', 'powerCreated', 'tilesSwapped'];

it('reports every move the way the original board module did', () => {
	let waves = 0, moves = 0, bursts = 0;
	for (let game = 0; game < 60; game++) {
		// The module, driven the way the engine drives it
		EventManager.init();
		GameState.create();
		const seeded = createRandom(game * 7919 + 1);
		GameBoard.init({ random: seeded });
		let callback: (() => void) | null = null;
		(Engine as unknown as { setGraphicsCallback: (cb: () => void) => void }).setGraphicsCallback = (cb) => { callback = cb; };
		const recorded: Recorded[] = [];
		EventManager.bind('draw', (kind: string, data: unknown) => recorded.push(['draw:' + kind, data]));
		for (const name of WATCHED) {
			EventManager.bind(name, (...args: unknown[]) => recorded.push([name, ...args]));
		}
		let noMoves = false;
		EventManager.bind('noMoreMoves', () => { noMoves = true; });
		EventManager.trigger('refreshBoard');
		const run = () => { while (callback) { const cb: () => void = callback; callback = null; cb(); } };
		run();
		const fill = recorded.find(([kind]) => kind === 'draw:board.fill')![1] as string;

		// The core, from the same board and the same point in the random sequence
		const board: Board = createBoard(8, 8);
		fill.split('X').slice(0, 8).forEach((column, c) => [...column].forEach((tile, r) => { board.tiles[r * 8 + c] = tile; }));
		const random = createRandom(seeded.state);
		const choices = createRandom(game);

		for (let move = 0; move < 40 && !noMoves; move++) {
			// Now and then, put an effect on a random tile
			if (choices.next() < 0.3) {
				const row = choices.int(8), column = choices.int(8);
				const type = EFFECT_TYPES[choices.int(EFFECT_TYPES.length)];
				recorded.length = 0;
				EventManager.trigger('createTileEffect', [row, column, type]);
				const placed = addEffect(board, { row, column }, type);
				expect(recorded.length > 0, 'effect placed').toBe(placed);
			}
			// Swap a random pair, as long as neither tile is bound
			const a = { row: choices.int(8), column: choices.int(8) };
			const b = choices.next() < 0.5 ? { row: a.row, column: a.column + 1 } : { row: a.row + 1, column: a.column };
			if (b.row > 7 || b.column > 7 || GameBoard.isBound(a.row, a.column) || GameBoard.isBound(b.row, b.column)) {
				continue;
			}
			expect(isBound(board, a) || isBound(board, b)).toBe(false);
			moves++;

			recorded.length = 0;
			GameBoard.switchTiles({ row: a.row, col: a.column }, { row: b.row, col: b.column });
			run();
			if (noMoves) {
				break;
			}

			// The same move in the core, written out as the events the original triggers
			const expected: Recorded[] = [];
			const side = a.column < 4 ? 'left' : 'right';
			swapTiles(board, a, b);
			let first = true;
			for (;;) {
				const pending = board.pendingPowers.length > 0;
				const wave = resolveWave(board, { weights: { g: 2, w: 2, s: 2 }, gems: false }, random);
				wave.placed.forEach((p) => expected.push(['drawEffect', { row: p.row, column: p.column, effectType: p.type }]));
				if (pending) {
					expected.push(['powerCreated']);
				}
				if (!wave.matched) {
					if (first) {
						swapTiles(board, a, b);
					} else {
						expireEffects(board).forEach((e) =>
							expected.push(['drawRemoveEffect', { row: e.row, column: e.column, effectType: e.type }]));
					}
					expected.push(['tilesSwapped', !first]);
					break;
				}
				waves++;
				for (const burst of wave.bursts) {
					bursts++;
					if (burst.type === 'lanternPower') expected.push(['lanternBurst', { row: burst.row, column: burst.column }]);
					if (burst.type === 'sunPower') expected.push(['sunBurst', { row: burst.row, column: burst.column }]);
					if (burst.type === 'explosive') {
						expected.push(['hurtDude', 30], ['tileExplode', { row: burst.row, column: burst.column }]);
					}
				}
				wave.released.forEach((p) =>
					expected.push(['drawRemoveEffect', { row: p.row, column: p.column, effectType: 'shadowBind' }]));
				expected.push(['draw:board.match', {
					removed: wave.removed.map((t) => ({ row: t.row, col: t.column, tile: t.tile })),
					added: wave.added.map((t) => ({ row: t.row, col: t.column, char: t.tile })),
				}]);
				expected.push(['tilesCleared', wave.gathered, side, first]);
				if (wave.chain > 1) expected.push(['chainCombo', wave.chain]);
				if (wave.gauge > 0) expected.push(['gaugeGain', wave.gauge]);
				first = false;
			}

			// Bring the module's events into the same shape
			const actual = recorded.filter(([kind]) => kind !== 'draw:board.swap').map(([kind, ...args]): Recorded => {
				if (kind === 'draw:board.match') {
					const data = args[0] as { removed: { position: { row: number; col: number }; type: { char: string } | null }[];
						added: unknown[] };
					return [kind, {
						removed: data.removed.map((t) => ({ row: t.position.row, col: t.position.col, tile: t.type ? t.type.char : null })),
						added: data.added,
					}];
				}
				if (kind === 'tilesCleared') {
					const gathered: Record<string, number> = {};
					for (const [className, n] of Object.entries(args[0] as Record<string, number>)) gathered[char(className)] = n;
					return [kind, gathered, args[1], args[2]];
				}
				return [kind, ...args];
			});
			// Listeners bound in init run first, so the module expires effects before 'tilesSwapped' is recorded
			const order = (events: Recorded[]) => [
				...events.filter(([kind]) => kind !== 'drawRemoveEffect' && kind !== 'tilesSwapped'),
				...events.filter(([kind]) => kind === 'drawRemoveEffect').sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))),
				...events.filter(([kind]) => kind === 'tilesSwapped'),
			];
			expect(order(actual), 'game ' + game + ', move ' + move).toEqual(order(expected));
		}
	}
	expect(moves).toBeGreaterThan(1000);
	expect(waves).toBeGreaterThan(300);
	expect(bursts).toBeGreaterThan(30);
});

it('fast-forwards the rest of a chain once hurried, until the move is over', () => {
	let checked = 0;
	for (let game = 0; game < 30 && checked < 3; game++) {
		EventManager.init();
		GameState.create();
		GameBoard.init({ random: createRandom(game + 1) });
		let callback: (() => void) | null = null;
		(Engine as unknown as { setGraphicsCallback: (cb: () => void) => void }).setGraphicsCallback = (cb) => { callback = cb; };
		const step = () => { const cb: (() => void) | null = callback; callback = null; cb?.(); return cb !== null; };
		const waves: { chain: number; hurried: boolean }[] = [];
		EventManager.bind('draw', (kind: string, data: unknown) => {
			if (kind === 'board.match') waves.push(data as { chain: number; hurried: boolean });
		});
		EventManager.trigger('refreshBoard');
		while (step());
		// The module prints its board for debugging; read a move off it
		const swapSomething = () => {
			const rows: string[] = [];
			const log = vi.spyOn(console, 'log').mockImplementation((line: string) => { rows.push(line); });
			(window as unknown as { tiles: () => void }).tiles();
			log.mockRestore();
			const board: Board = createBoard(8, 8);
			rows.forEach((line, r) => [...line].forEach((tile, c) => { board.tiles[r * 8 + c] = tile; }));
			const [a, b] = validMoves(board, 1)[0];
			GameBoard.switchTiles({ row: a.row, col: a.column }, { row: b.row, col: b.column });
		};

		swapSomething();
		// Settle the first wave, then hurry the rest
		while (waves.length === 0 && step());
		GameBoard.hurry();
		while (step());
		if (waves.length < 2) {
			continue;
		}
		expect(waves.map((wave) => wave.chain)).toEqual(waves.map((_, i) => i + 1));
		expect(waves.map((wave) => wave.hurried)).toEqual(waves.map((_, i) => i > 0));

		// The next move plays at its own pace again
		waves.length = 0;
		swapSomething();
		while (step());
		expect(waves[0]).toMatchObject({ chain: 1, hurried: false });
		checked++;
	}
	expect(checked).toBe(3);
});
