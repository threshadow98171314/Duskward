import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EventManager from '../src/app/eventmanager.js';
import Content from '../src/app/gamecontent.js';
import GameState from '../src/app/gamestate.js';
import Graphics from '../src/app/graphics/graphics.js';
import Plan from '../src/app/plan.js';
import TextStore from '../src/app/textStore.js';

// The game's state, as far as the plan reads it
const state = GameState as unknown as { buildings: object[]; dayNumber: number };

// A building as the plan reads it: what it is, whether it stands, and what it still needs
function building(className: string, missing: Record<string, number>, built = false) {
	return { options: { type: Content.getBuildingType(className) }, requiredResources: missing, built, obsolete: false };
}

describe("the morning's building plan", () => {
	beforeEach(() => {
		const texts = new TextStore('zh-TW');
		vi.spyOn(Graphics, 'getText').mockImplementation((...args: unknown[]) => texts.get(...(args as [string])));
		vi.useFakeTimers();
		document.body.innerHTML = '<div id="gameContainer"></div>';
		EventManager.init();
		GameState.create();
		Plan.init();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('says which materials are not on the board yet, and what brings them', () => {
		const smithy = building('blacksmith', { wood: 2, clay: 2 });
		expect(Plan.costText(smithy)).toBe('木材 ×2、陶土 ×2（要先蓋製磚坊）');
		state.buildings.push(building('bricklayer', {}, true));
		expect(Plan.costText(smithy)).toBe('木材 ×2、陶土 ×2');
		expect(Plan.costText(building('sawmill', { stone: 0, cloth: 0 }))).toBe('材料已經備齊');
	});

	it('does not ask on the very first morning, and asks from the next one on', () => {
		state.buildings.push(building('bricklayer', { stone: 5, wood: 5 }), building('weaver', { stone: 5, wood: 5 }));
		const held = vi.fn();
		EventManager.bind('hold', held);
		EventManager.trigger('dayBreak', [1]);
		vi.advanceTimersByTime(6000);
		expect(document.querySelector('.buildPlan')).toBeNull();
		expect(held).not.toHaveBeenCalled();

		state.dayNumber = 2;
		EventManager.trigger('dayBreak', [2]);
		vi.advanceTimersByTime(6000);
		expect(document.querySelector('.buildPlan')).not.toBeNull();
		expect(held).toHaveBeenCalledTimes(1);
	});
});
