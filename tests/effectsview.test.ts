import { describe, expect, it } from 'vitest';
import { SPRITES } from '../src/content/sprites.ts';
import { EffectsView } from '../src/render/effects.ts';

// The effects, without a canvas to draw on (as in these tests), on a clock the test moves
function effectsView() {
	const clock = { now: 0 };
	const canvas = { getContext: () => null };
	const view = new EffectsView(canvas as unknown as HTMLCanvasElement, {
		width: 484, world: { height: 110 }, board: { top: 112, rows: 8, columns: 8, cell: 60, pad: 2 },
	}, () => clock.now, () => 1);
	return { view, clock };
}

describe('the effects', () => {
	it('play out over their own time, then are forgotten', () => {
		const { view, clock } = effectsView();
		view.lanternBurst(3, 5);
		view.loot('dawnHeart', 200);
		expect(view.effects.map((effect) => effect.kind)).toEqual(['row', 'column', 'loot']);
		clock.now = 350;
		expect(view.progress(view.effects[0], clock.now)).toBeCloseTo(0.5);
		clock.now = 700;
		view.draw();
		expect(view.effects.map((effect) => effect.kind)).toEqual(['loot']);
		clock.now = 1500;
		view.draw();
		expect(view.effects).toEqual([]);
	});

	it('shake the board hardest at first, and leave it still once it is over', () => {
		const { view, clock } = effectsView();
		const moves: [number, number][] = [];
		view.onShake = (dx, dy) => moves.push([dx, dy]);
		view.shake(4, 400);
		view.draw();
		clock.now = 200;
		view.draw();
		clock.now = 400;
		view.draw();
		view.draw();
		expect(moves).toEqual([[4, 4], [1, 1], [0, 0]]);
	});

	it('let a stronger shake take over a weaker one, but not the other way round', () => {
		const { view, clock } = effectsView();
		view.shake(2, 400);
		view.shake(5, 400);
		expect(view.strengthAt(0)).toBe(5);
		clock.now = 100;
		view.shake(1, 400);
		expect(view.strengthAt(100)).toBeCloseTo(5 * 0.75 * 0.75);
	});

	it('find the icon of each item by its name', () => {
		expect(SPRITES.items.names?.indexOf('healthPotion')).toBe(0);
		expect(SPRITES.items.names?.indexOf('dawnHeart')).toBe(6);
	});
});
