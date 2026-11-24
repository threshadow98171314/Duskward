import { describe, expect, it } from 'vitest';
import { breathShape, DragonView } from '../src/render/dragon.ts';

// The dragon on its side of a field 484 wide with the ground at 110, on a clock the test moves
function dragonView(facesRight = false) {
	const clock = { now: 0 };
	const view = new DragonView(facesRight ? 50 : 434, facesRight, 110, () => clock.now);
	return { view, clock };
}

describe('the dragon', () => {
	it('flies down out of the sky to the ground in its own time', () => {
		const { view, clock } = dragonView();
		view.fly(200);
		expect(view.bodyAt(clock.now)).toEqual({ x: 332, y: 110 - 164 - 200 });
		view.descend(1000);
		clock.now = 500;
		expect(view.bodyAt(clock.now).y).toBeCloseTo(110 - 164 - 50);
		clock.now = 1000;
		expect(view.bodyAt(clock.now)).toEqual({ x: 332, y: -54 });
	});

	it('eases from one posture into the next, and takes up a new one from wherever it has got to', () => {
		const { view, clock } = dragonView();
		expect(view.turnsAt(0)).toEqual([{ r: 80, t: -10 }, { r: 15, t: -10 }, { r: -50, t: -10 }, { r: -50, t: -10 }]);
		view.pose('windup', 500);
		clock.now = 250;
		// Three quarters of the way there by half its time
		expect(view.turnsAt(clock.now)[0].r).toBeCloseTo(80 + 20 * 0.75);
		view.pose('roar', 500);
		expect(view.turnsAt(clock.now)[0].r).toBeCloseTo(95);
		clock.now = 750;
		expect(view.turnsAt(clock.now)[0]).toEqual({ r: 40, t: -14 });
		// Taking up the posture it is in already changes nothing
		clock.now = 800;
		view.pose('roar', 500);
		expect(view.turnsAt(clock.now)[0]).toEqual({ r: 40, t: -14 });
	});

	it('faces right on the left of the field, its neck and head turned the other way', () => {
		const { view } = dragonView(true);
		expect(view.turnsAt(0)).toEqual([{ r: -80, t: 10 }, { r: -15, t: 10 }, { r: 50, t: 10 }, { r: 50, t: 10 }]);
	});

	it('turns its head so that its breath goes over the top of the keeper, whichever way it faces', () => {
		for (const facesRight of [false, true]) {
			const { view } = dragonView(facesRight);
			const keeperX = facesRight ? 300 : 150;
			view.pose('aim', 0, keeperX);
			const mouth = view.mouth(0);
			expect(Math.cos(mouth.angle) > 0).toBe(facesRight);
			const along = (keeperX - mouth.x) / Math.cos(mouth.angle);
			expect(Math.abs(mouth.y + along * Math.sin(mouth.angle) - (110 - 32))).toBeLessThan(8);
		}
	});

	it('opens and closes its jaws a step at a time, at first two at once when quick', () => {
		const { view } = dragonView();
		view.pose('roar', 500);
		view.stepJaw();
		expect(view.jaws()).toBe(1);
		view.stepJaw();
		view.stepJaw();
		expect(view.jaws()).toBe(2);
		view.pose('bite', 200);
		view.stepJaw();
		expect(view.jaws()).toBe(0);
		view.pose('shoot', 200);
		view.stepJaw();
		expect(view.jaws()).toBe(2);
	});

	it('gathers its breath into a ball, then breathes ice out as a thinning beam and fire as a flying ball', () => {
		expect(breathShape('ice', 375, 100)).toEqual({ ahead: 0, length: 15, height: 15 });
		expect(breathShape('fire', 750, 100)).toEqual({ ahead: 0, length: 30, height: 30 });
		expect(breathShape('ice', 875, 100)).toEqual({ ahead: 92.5, length: 215, height: 15 });
		expect(breathShape('fire', 875, 100)).toEqual({ ahead: 50, length: 30, height: 20 });
		expect(breathShape('fire', 1000, 100)).toBeNull();
	});

	it('comes apart from the head down, then bursts from its body and is gone', () => {
		for (const facesRight of [false, true]) {
			const { view } = dragonView(facesRight);
			const head = view.explode(3);
			const neck = view.explode(2);
			// The head is out ahead of the neck, the way the dragon faces
			expect(head.x > neck.x).toBe(facesRight);
			const body = view.bodyAt(0);
			expect(view.vanish()).toEqual({ x: body.x + (facesRight ? 130 : 70), y: body.y + 110 });
		}
	});
});
