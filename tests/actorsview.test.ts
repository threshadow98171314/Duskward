import { describe, expect, it } from 'vitest';
import { ActorsView } from '../src/render/actors.ts';

// The figures, without a canvas to draw on (as in these tests) and on a clock the test moves
function actorsView() {
	const clock = { now: 0 };
	const canvas = { getContext: () => null };
	const view = new ActorsView(canvas as unknown as HTMLCanvasElement, { width: 480, height: 110 }, () => clock.now);
	return { view, clock };
}

describe('the field as drawn', () => {
	it('glides the keeper to where the field has them, in time for the next tick', () => {
		const { view, clock } = actorsView();
		view.setKeeper({ x: 100, row: 0, frame: 0 }, null);
		expect(view.keeperX()).toBe(100);
		view.setKeeper({ x: 110, row: 1, frame: 1 }, null);
		clock.now = 50;
		expect(view.keeperX()).toBe(105);
		clock.now = 100;
		expect(view.keeperX()).toBe(110);
		// Moved further than anyone walks in a tick: there at once
		view.setKeeper({ x: 400, row: 0, frame: 0 }, null);
		expect(view.keeperX()).toBe(400);
	});

	it('takes the health bar of a fallen monster away, and its body once it has lain a while', () => {
		const { view, clock } = actorsView();
		const zombie = {};
		view.addMonster(zombie, 'zombie', 300, false);
		view.updateMonster(zombie, { x: 300, row: 1, frame: 0 }, 0.5, false);
		expect(view.monsterAt(zombie)).toEqual({ x: 300, alpha: 1, bar: 1 });
		view.killMonster(zombie);
		clock.now = 200;
		expect(view.monsterAt(zombie)?.bar).toBe(0);
		view.buryMonster(zombie);
		clock.now = 5300;
		expect(view.monsterAt(zombie)?.alpha).toBeCloseTo(0.5);
		clock.now = 5400;
		view.draw();
		expect(view.monsterAt(zombie)).toBeNull();
	});

	it('hides a monster while it vanishes to the far side of the field', () => {
		const { view, clock } = actorsView();
		const shade = {};
		view.addMonster(shade, 'shade', 100, false);
		view.updateMonster(shade, { x: 100, row: 1, frame: 0 }, 1, true);
		clock.now = 200;
		expect(view.monsterAt(shade)?.alpha).toBe(0);
		view.updateMonster(shade, { x: 380, row: 2, frame: 0 }, 1, false);
		clock.now = 400;
		expect(view.monsterAt(shade)).toEqual({ x: 380, alpha: 1, bar: 1 });
	});

	it('flies an arrow up to the top of its arc and down again, tilting as it goes', () => {
		const { view } = actorsView();
		const shot = { from: 100, to: 300, start: 0 };
		expect(view.flightAt(shot, 0)).toEqual({ x: 100, y: 90, angle: -Math.PI / 4 });
		expect(view.flightAt(shot, 500)).toMatchObject({ x: 200, y: 15 });
		expect(view.flightAt(shot, 500)?.angle).toBeCloseTo(0);
		expect(view.flightAt(shot, 999)?.angle).toBeCloseTo(Math.PI / 4, 1);
		expect(view.flightAt(shot, 1000)).toBeNull();
		// Shot the other way, it tilts the other way
		expect(view.flightAt({ from: 300, to: 100, start: 0 }, 0)?.angle).toBe(Math.PI / 4);
	});

	it('clears the monsters, chests and fires away at daybreak', () => {
		const { view } = actorsView();
		const rat = {}, chest = {};
		view.addMonster(rat, 'rat', 50, false);
		view.addChest(chest, 60);
		view.fires = [120, 200];
		view.clear();
		expect(view.monsterAt(rat)).toBeNull();
		expect(view.fires).toEqual([]);
	});
});
