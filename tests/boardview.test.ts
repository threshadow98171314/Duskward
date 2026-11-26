import { describe, expect, it } from 'vitest';
import { BoardView } from '../src/render/board.ts';

// The view, without a canvas to draw on (as in these tests) and on a clock the test moves
function boardView() {
	const clock = { now: 0 };
	const canvas = { getContext: () => null, getBoundingClientRect: () => ({ left: 100, top: 50, width: 484, height: 484 }) };
	const view = new BoardView(canvas as unknown as HTMLCanvasElement, { rows: 8, columns: 8, cell: 60, pad: 2, scale: 1 },
		() => clock.now);
	return { view, clock };
}

describe('the board view', () => {
	it('draws a tile on its way to where it is headed', () => {
		const { view, clock } = boardView();
		const tile = view.add('grain', 3, 2, -5);
		view.slide(tile, 3, 2, 100, 200);
		expect(tile).toMatchObject({ row: 3, column: 2 });
		expect(view.positionOf(tile)).toEqual({ x: 2, y: -5 });
		clock.now = 200;
		expect(view.positionOf(tile)).toEqual({ x: 2, y: -1 });
		clock.now = 300;
		expect(view.positionOf(tile)).toEqual({ x: 2, y: 3 });
	});

	it('lets a tile fade away, then forgets it', () => {
		const { view, clock } = boardView();
		const tile = view.add('wood', 0, 0);
		view.fade(tile, 200);
		clock.now = 199;
		view.draw();
		expect(view.tiles).toContain(tile);
		clock.now = 200;
		view.draw();
		expect(view.tiles).not.toContain(tile);
	});

	it('flips the tiles over when night falls', () => {
		const { view, clock } = boardView();
		expect(view.side()).toEqual({ night: false, turn: 1 });
		view.setNight(true);
		clock.now = 125;
		expect(view.side().night).toBe(false);
		expect(view.side().turn).toBeCloseTo(Math.SQRT1_2);
		clock.now = 375;
		expect(view.side().night).toBe(true);
		clock.now = 500;
		expect(view.side()).toEqual({ night: true, turn: 1 });
		// Loading into the night needs no flip
		const { view: loaded } = boardView();
		loaded.setNight(true, false);
		expect(loaded.side()).toEqual({ night: true, turn: 1 });
	});

	it('draws each kind of tile for its side, its level and the dragon fight', () => {
		const { view } = boardView();
		expect(view.picture('stone', false)).toMatchObject({ sprite: { x: 52, y: 0 }, row: 0 });
		view.levels = { stone: 4, grain: 9 };
		expect(view.picture('stone', true)).toMatchObject({ sprite: { x: 52, y: 467 }, row: 3 });
		// No level beyond the pictures there are
		expect(view.picture('grain', false)?.row).toBe(3);
		view.dragonFight = true;
		expect(view.picture('grain', true)).toMatchObject({ sprite: { x: 0, y: 936 }, row: 0 });
		expect(view.picture('grain', false)?.sprite.y).toBe(0);
		expect(view.picture('stone', true)?.sprite.y).toBe(467);
	});

	it('nudges the two tiles of a move pointed out towards each other, twice, then rests', () => {
		const { view, clock } = boardView();
		const left = view.add('grain', 2, 3), right = view.add('wood', 2, 4), other = view.add('stone', 5, 5);
		view.hint({ row: 2, column: 3 }, { row: 2, column: 4 });
		expect(view.isHinted(left) && view.isHinted(right)).toBe(true);
		expect(view.isHinted(other)).toBe(false);
		// A quarter of the way into a nudge it is furthest out: 0.12 of a cell
		clock.now = 200;
		expect(view.nudgeOf(left).x).toBeCloseTo(0.12);
		expect(view.nudgeOf(right).x).toBeCloseTo(-0.12);
		expect(view.nudgeOf(left).y).toBe(0);
		expect(view.nudgeOf(other)).toEqual({ x: 0, y: 0 });
		clock.now = 400;
		expect(view.nudgeOf(left).x).toBeCloseTo(0);
		clock.now = 600;
		expect(view.nudgeOf(left).x).toBeCloseTo(0.12);
		// Then it rests until the next round
		clock.now = 1000;
		expect(view.nudgeOf(left).x).toBe(0);
		clock.now = 1800;
		expect(view.nudgeOf(left).x).toBeCloseTo(0.12);
		// A tile fading away is no longer part of it, and the hint can be taken away
		view.fade(right, 200);
		expect(view.isHinted(right)).toBe(false);
		view.hint(null);
		expect(view.nudgeOf(left)).toEqual({ x: 0, y: 0 });
	});

	it('says where a cell is on the screen', () => {
		const { view } = boardView();
		// The canvas is laid out at 484 pixels from (100, 50), just as large as it is drawn
		expect(view.clientRectOf({ row: 1, column: 2 })).toEqual({ left: 100 + 2 + 120, top: 50 + 2 + 60, width: 60, height: 60 });
	});

	it('finds the cell under the pointer', () => {
		const { view } = boardView();
		expect(view.cellAt(2, 2)).toEqual({ row: 0, column: 0 });
		expect(view.cellAt(61, 125)).toEqual({ row: 2, column: 0 });
		expect(view.cellAt(481, 481)).toEqual({ row: 7, column: 7 });
		expect(view.cellAt(1, 30)).toBeNull();
		expect(view.cellAt(483, 30)).toBeNull();
		expect(view.cellAtClient(100 + 62 + 30, 50 + 2 + 30)).toEqual({ row: 0, column: 1 });
	});
});
