import { describe, expect, it } from 'vitest';
import { materialColour, VillageView } from '../src/render/village.ts';

// The village, without a canvas to draw on (as in these tests) and on a clock the test moves
function village() {
	const clock = { now: 0 };
	const canvas = { getContext: () => null };
	const view = new VillageView(canvas as unknown as HTMLCanvasElement, { width: 480, height: 110 }, () => clock.now);
	return { view, clock };
}

describe('the village', () => {
	it('raises a building out of the ground', () => {
		const { view, clock } = village();
		const house = {};
		view.add(house, { sprite: 'shack', row: 1, x: 100, standing: false });
		expect(view.placeOf(house)).toEqual({ left: 70, top: 110, width: 60, height: 80 });
		view.raise(house, 5000);
		clock.now = 2500;
		expect(view.placeOf(house)?.top).toBe(70);
		clock.now = 5000;
		expect(view.placeOf(house)?.top).toBe(30);
		// A building left half raised drops back
		view.sink(house);
		expect(view.placeOf(house)?.top).toBe(110);
	});

	it('brings up the bars of materials once some have come, and sinks them as the building rises', () => {
		const { view, clock } = village();
		const smithy = {};
		view.add(smithy, { sprite: 'blacksmith', row: 0, x: 200, standing: false });
		view.setCosts(smithy, [{ kind: 'wood', share: 0 }, { kind: 'stone', share: 0 }]);
		expect(view.barsOf(smithy)).toBeNull();
		expect(view.buildingAt(200, 95)).toBeNull();
		view.setCosts(smithy, [{ kind: 'wood', share: 0.5 }, { kind: 'stone', share: 0 }]);
		expect(view.barsOf(smithy)).toEqual({ left: 169, top: 90, width: 62, height: 22 });
		expect(view.buildingAt(200, 95)).toBe(smithy);
		view.raise(smithy, 5000);
		clock.now = 1800;
		expect(view.barsOf(smithy)?.top).toBeGreaterThan(110);
		expect(view.buildingAt(200, 95)).toBeNull();
	});

	it('lifts a building for its upgrade, which a click asks for, and sinks it as the upgrade rises', () => {
		const { view, clock } = village();
		const shack = {}, house = {};
		view.add(shack, { sprite: 'shack', row: 0, x: 30, standing: true });
		view.add(house, { sprite: 'shack', row: 1, x: 30, standing: false });
		expect(view.buildingAt(30, 60)).toBeNull();
		view.setUpgrade(shack, house);
		clock.now = 500;
		expect(view.placeOf(shack)?.top).toBe(10);
		expect(view.buildingAt(30, 60)).toBe(house);
		view.setSunk(shack, true);
		clock.now = 3000;
		expect(view.placeOf(shack)?.top).toBe(110);
		expect(view.buildingAt(30, 60)).toBeNull();
	});

	it('colours the materials by the level their tiles have reached', () => {
		expect(materialColour('wood', 1)).toBe('#7c5840');
		expect(materialColour('wood', 5)).toBe('#876c5b');
		expect(materialColour('wood', 9)).toBe('#ffd800');
		expect(materialColour('cloth', 3)).toBe('#853aff');
		expect(materialColour('lantern', 2)).toBe('#f29a3a');
	});
});
