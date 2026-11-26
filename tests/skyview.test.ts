import { describe, expect, it } from 'vitest';
import { SkyView } from '../src/render/sky.ts';

// The sky, without a canvas to draw on (as in these tests) and on a clock the test moves
function skyView() {
	const clock = { now: 0 };
	const canvas = { getContext: () => null };
	const view = new SkyView(canvas as unknown as HTMLCanvasElement, { width: 480, height: 110 }, () => clock.now);
	return { view, clock };
}

describe('the sky', () => {
	it('keeps the sun below the horizon until it rises, then moves it there in its own time', () => {
		const { view, clock } = skyView();
		expect(view.sun()).toMatchObject({ x: 15, y: 120, shown: false });
		view.showSun(0, 0);
		view.moveSun(15, 28, 500);
		clock.now = 250;
		expect(view.sun()).toMatchObject({ x: 15, y: 74, shown: true });
		clock.now = 500;
		expect(view.sun()).toMatchObject({ x: 15, y: 28 });
		// A move that takes no time is there at once
		view.moveSun(240, 0, 0);
		expect(view.sun()).toMatchObject({ x: 240, y: 0 });
	});

	it('shows the bite out of the sun, and never out of the moon', () => {
		const { view } = skyView();
		view.setBite(0.4);
		view.showSun(0, 2);
		expect(view.sun()).toMatchObject({ face: 0, frame: 2, bite: 0.4 });
		view.showSun(1, 0);
		expect(view.sun()).toMatchObject({ face: 1, bite: 0 });
	});

	it('lets the clouds drift across, coming round again once they are off the sky', () => {
		const { view } = skyView();
		expect(view.cloudAt(0, 0)).toEqual({ x: 60, y: 6 });
		expect(view.cloudAt(0, 10000)).toEqual({ x: 90, y: 6 });
		// Off the right edge, a cloud comes back in from the left
		const lap = (480 + 64 + 64 - (60 + 64)) / 3 * 1000;
		expect(view.cloudAt(0, lap).x).toBeCloseTo(0);
		// Lower clouds, nearer, drift faster
		expect(view.cloudAt(3, 1000).x - view.cloudAt(3, 0).x).toBeGreaterThan(view.cloudAt(0, 1000).x - view.cloudAt(0, 0).x);
	});

	it('lets night and dusk fall slowly, unless they are simply so', () => {
		const { view, clock } = skyView();
		expect(view.nightness()).toBe(0);
		view.setNight(true);
		clock.now = 700;
		expect(view.nightness()).toBeCloseTo(0.5);
		clock.now = 1400;
		expect(view.nightness()).toBe(1);
		view.setDusk(true, false);
		expect(view.duskness()).toBe(1);
		view.setDusk(false);
		clock.now = 2100;
		expect(view.duskness()).toBeCloseTo(0.5);
	});

	it('tells whether a point falls on the sun or moon, once it is up', () => {
		const { view } = skyView();
		expect(view.sunAt(15, 120)).toBe(false);
		view.showSun(0, 0);
		view.moveSun(240, 10, 0);
		// The sun is 30 across, with its top at 10
		expect(view.sunAt(240, 25)).toBe(true);
		expect(view.sunAt(254, 39)).toBe(true);
		expect(view.sunAt(256, 25)).toBe(false);
		expect(view.sunAt(240, 41)).toBe(false);
	});
});
