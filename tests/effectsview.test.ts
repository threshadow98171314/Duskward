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

	it('send rays for as long as each is told, and drops of shadow for their own time', () => {
		const { view, clock } = effectsView();
		view.ray('black', { x: 242, y: 38 }, { x: 100, y: 96 }, 300);
		view.ray('lantern', { x: 242, y: 38 }, { x: 250, y: 110 }, 400);
		view.shadowRain([228, 242, 256], 66);
		clock.now = 300;
		view.draw();
		expect(view.effects).toMatchObject([{ kind: 'ray', look: 'lantern' }, { kind: 'drops' }]);
		expect(view.progress(view.effects[0], clock.now)).toBeCloseTo(0.75);
		clock.now = 400;
		view.draw();
		expect(view.effects.map((effect) => effect.kind)).toEqual(['drops']);
		clock.now = 700;
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

	it('throw particles that fly, fall and fade, and keep only so many', () => {
		const { view, clock } = effectsView();
		// With the test's random numbers, a spray leaning all up flies straight sideways at full speed
		view.spray(100, 50, 'red', { count: 1, speed: 100, life: 1000, gravity: 200, size: 2, upward: 1 });
		const [bit] = view.particles;
		clock.now = 500;
		expect(view.particleAt(bit, clock.now)).toEqual({ x: 150, y: 75, left: 0.5 });
		clock.now = 1000;
		view.draw();
		expect(view.particles).toEqual([]);
		view.spray(0, 0, 'red', { count: 450, speed: 10, life: 1000, gravity: 0, size: 2, upward: 0 });
		expect(view.particles).toHaveLength(400);
	});

	it('send the bits of a cleared tile off from the middle of its cell', () => {
		const { view } = effectsView();
		view.tileBits(3, 5, 'wood', 4);
		expect(view.particles).toHaveLength(4);
		expect(view.particles[0]).toMatchObject({ x: 332, y: 324, colour: '#7c5840' });
	});

	it('let night fall over the ground, lit by the keeper’s lantern and the village’s windows', () => {
		const { view, clock } = effectsView();
		view.setNight(true);
		clock.now = 700;
		expect(view.nightness()).toBeCloseTo(0.5);
		view.windows = [30, 150];
		expect(view.lights(clock.now)).toEqual([{ x: 30, y: 96, reach: 26 }, { x: 150, y: 96, reach: 26 }]);
		view.keeper = 240;
		const lantern = view.lights(clock.now)[2];
		expect(lantern).toMatchObject({ x: 240, y: 90 });
		// The lantern flickers, but only a little
		expect(lantern.reach).toBeGreaterThan(72 * 0.9);
		expect(lantern.reach).toBeLessThan(72 * 1.1);
	});

	it('find the icon of each item by its name', () => {
		expect(SPRITES.items.names?.indexOf('healthPotion')).toBe(0);
		expect(SPRITES.items.names?.indexOf('dawnHeart')).toBe(6);
	});
});
