import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EventManager from '../src/app/eventmanager.js';
import GameBoard from '../src/app/gameboard.js';
import Graphics from '../src/app/graphics/graphics.js';
import Hints from '../src/app/hints.js';

describe('hints for a player who has stopped', () => {
	let movable: boolean;
	let move: [{ row: number; column: number }, { row: number; column: number }] | null;
	let drawn: unknown[][];

	beforeEach(() => {
		vi.useFakeTimers();
		movable = true;
		move = [{ row: 2, column: 3 }, { row: 2, column: 4 }];
		drawn = [];
		vi.spyOn(GameBoard, 'hint').mockImplementation(() => move);
		vi.spyOn(Graphics, 'hintMove').mockImplementation((...cells: unknown[]) => { drawn.push(cells); });
		EventManager.init();
		Hints.init({ canMove: () => movable });
	});

	afterEach(() => {
		Hints.setDelay(null);
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('points out a move after ten seconds without one, and takes it away once the player does something', () => {
		vi.advanceTimersByTime(9750);
		expect(drawn).toEqual([]);
		vi.advanceTimersByTime(250);
		expect(drawn).toEqual([[{ row: 2, column: 3 }, { row: 2, column: 4 }]]);
		expect(Hints.showing()).toBe(true);
		// Pressing the board takes it away, and the wait starts over
		Hints.rest();
		expect(drawn[1]).toEqual([null]);
		vi.advanceTimersByTime(9750);
		expect(drawn).toHaveLength(2);
		vi.advanceTimersByTime(250);
		expect(drawn).toHaveLength(3);
		// So does a move
		EventManager.trigger('tilesSwapped', [true]);
		expect(drawn[3]).toEqual([null]);
	});

	it('waits while the player could not move, and starts over once they can', () => {
		movable = false;
		vi.advanceTimersByTime(30000);
		expect(drawn).toEqual([]);
		movable = true;
		vi.advanceTimersByTime(9750);
		expect(drawn).toEqual([]);
		vi.advanceTimersByTime(250);
		expect(drawn).toHaveLength(1);
		// A chain or a choice takes it away
		movable = false;
		vi.advanceTimersByTime(250);
		expect(drawn[1]).toEqual([null]);
	});

	it('points out another move when the board changes under it, and none when there is none', () => {
		vi.advanceTimersByTime(10000);
		move = [{ row: 5, column: 0 }, { row: 6, column: 0 }];
		EventManager.trigger('drawEffect', [{ row: 2, column: 3, effectType: 'shadowBind' }]);
		expect(drawn[1]).toEqual([{ row: 5, column: 0 }, { row: 6, column: 0 }]);
		move = null;
		EventManager.trigger('drawEffect', [{ row: 5, column: 0, effectType: 'shadowBind' }]);
		expect(drawn[2]).toEqual([null]);
		vi.advanceTimersByTime(20000);
		expect(drawn).toHaveLength(3);
	});

	it('can be made to come sooner', () => {
		Hints.setDelay(3000);
		vi.advanceTimersByTime(3000);
		expect(drawn).toHaveLength(1);
	});
});
