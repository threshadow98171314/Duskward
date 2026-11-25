import { describe, expect, it } from 'vitest';
import { materialColour, pileLayout, VillageView } from '../src/render/village.ts';

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

	it('stacks the stockpile as the page did: the bottom row from the right, rows not yet full at the left', () => {
		const places = (count: number, width: number, height: number) =>
			pileLayout(count, width, height).map((place) => [place.left, place.top]);
		expect(places(4, 30, 30)).toEqual([[20, 20], [10, 20], [0, 20], [0, 10]]);
		expect(places(5, 30, 30)).toEqual([[20, 20], [10, 20], [0, 20], [10, 10], [0, 10]]);
		expect(places(7, 50, 40)).toEqual([[40, 30], [30, 30], [20, 30], [10, 30], [0, 30], [10, 20], [0, 20]]);
	});

	it('grows the stockpile with the level of the grain', () => {
		const { view, clock } = village();
		expect(view.pileFrame()).toEqual({ left: 14, top: 75, width: 30, height: 30 });
		view.levels = { grain: 4 };
		view.draw();
		clock.now = 100;
		expect(view.pileFrame()).toEqual({ left: 9, top: 71, width: 40, height: 35 });
		clock.now = 200;
		expect(view.pileFrame()).toEqual({ left: 4, top: 67, width: 50, height: 40 });
	});

	it('brings the stockpile in slowly once there is one, and takes it away quickly while a building rises over it', () => {
		const { view, clock } = village();
		expect(view.pileShownAt()).toBe(0);
		view.stockpile = [];
		view.draw();
		clock.now = 700;
		expect(view.pileShownAt()).toBeCloseTo(0.5);
		clock.now = 1400;
		view.hidePile(true);
		clock.now = 1500;
		expect(view.pileShownAt()).toBeCloseTo(0.5);
		clock.now = 1600;
		expect(view.pileShownAt()).toBe(0);
		view.hidePile(false);
		clock.now = 3000;
		expect(view.pileShownAt()).toBe(1);
	});

	it('fills a block as it gets more, over a moment', () => {
		const { view, clock } = village();
		const block = { key: {}, kind: 'wood', share: 0.5 };
		expect(view.fillOf(block)).toBe(0.5);
		clock.now = 1000;
		expect(view.fillOf({ ...block, share: 1 })).toBe(0.5);
		clock.now = 1150;
		expect(view.fillOf({ ...block, share: 1 })).toBeCloseTo(0.75);
		clock.now = 1300;
		expect(view.fillOf({ ...block, share: 1 })).toBe(1);
	});

	it('gathers the duskshards in the tower, one row of the sprite for each number of them', () => {
		const { view, clock } = village();
		expect(view.shardsAt()).toBeNull();
		view.setShards(3, 330);
		clock.now = 450;
		expect(view.shardsAt()).toEqual({ row: 2, frame: 2, left: 324, top: 35 });
		view.setShards(6, 330);
		expect(view.shardsAt()?.row).toBe(3);
	});
});
