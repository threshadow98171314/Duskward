import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Content from '../src/app/gamecontent.js';
import GameState from '../src/app/gamestate.js';
import Graphics from '../src/app/graphics/graphics.js';
import Tips from '../src/app/graphics/tips.js';
import TextStore from '../src/app/textStore.js';
import { ITEMS } from '../src/content/items.ts';
import { SKILLS, SPELLS } from '../src/content/magic.ts';

// The game's state, as far as the tips read it
const state = GameState as unknown as {
	buildings: object[]; stores: object[]; prioritizedBuilding: string | null;
};

function speak(locale: string) {
	const texts = new TextStore(locale);
	vi.spyOn(Graphics, 'getText').mockImplementation((...args: unknown[]) => texts.get(...(args as [string])));
}

function building(className: string, missing: Record<string, number>, built = false) {
	return { options: { type: Content.getBuildingType(className) }, requiredResources: missing, built, obsolete: false };
}

function block(kind: string, quantity: number) {
	return { options: { type: Content.getResourceType(kind) }, max: 30, quantity: () => quantity };
}

describe('the tips under the mouse', () => {
	beforeEach(() => {
		GameState.create();
		speak('zh-TW');
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('fills in the numbers of every item, spell and skill, in both languages', () => {
		expect(Tips.numbersOf(ITEMS.bomb.use)).toEqual([20]);
		expect(Tips.numbersOf(ITEMS.healthPotion.use)).toEqual([50]);
		expect(Tips.numbersOf(SPELLS.haste.use)).toEqual([30]);
		// By night before by day
		expect(Tips.numbersOf(SKILLS.timelamp.use)).toEqual([10, 5]);
		expect(Tips.numbersOf(SKILLS.dawnlight.use)).toEqual([10, 2]);
		for (const locale of ['zh-TW', 'en']) {
			const texts = new TextStore(locale);
			for (const [group, defs] of [['ITEM', ITEMS], ['SPELL', SPELLS], ['SKILL', SKILLS]] as const) {
				for (const [name, def] of Object.entries(defs)) {
					const words = (texts.get(group + '_TEXTS') as Record<string, string>)[name];
					expect(words, locale + ' ' + group + ' ' + name).toBeTruthy();
					const wanted = new Set([...words.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1])));
					expect(Math.max(-1, ...wanted) < Tips.numbersOf((def as { use: never }).use).length, locale + ' ' + name).toBe(true);
				}
			}
			for (const name of Object.keys(ITEMS)) {
				expect((texts.get('ITEM_NAMES') as Record<string, string>)[name], name).toBeTruthy();
			}
			for (const name of Object.keys(SPELLS)) {
				expect((texts.get('SPELL_NAMES') as Record<string, string>)[name], name).toBeTruthy();
			}
		}
	});

	it('says what a tile does by day and at night, the time it is now first', () => {
		expect(Tips.tileTip('g', null, false)).toEqual({ title: '麥穗', lines: ['白天：回復生命', '夜裡：引來蹣跚影'] });
		expect(Tips.tileTip('g', null, true)?.lines).toEqual(['夜裡：引來蹣跚影', '白天：回復生命']);
		expect(Tips.tileTip('w', null, false)?.lines).toEqual(['白天：送進材料堆，用來蓋房子', '夜裡：把盾補滿']);
		expect(Tips.tileTip('f', null, false)?.lines[1]).toBe('夜裡：讓天亮得更快，但會引來燈蛾');
		// What a tile calls up at night changes with the buildings
		state.buildings.push(building('bricklayer2', {}, true));
		expect(Tips.tileTip('c', null, false)?.lines[1]).toBe('夜裡：引來織夜蛛');
		const lantern = Tips.tileTip('s', { type: 'lanternPower', duration: 0 }, false);
		expect(lantern?.title).toBe('石材・燈籠方塊');
		expect(lantern?.lines[2]).toBe('消掉時，同一排和同一列的方塊一起收集。');
		expect(Tips.tileTip('g', { type: 'explosive', duration: 3 }, false)?.lines[2]).toBe(
			'消掉它會爆炸，炸毀周圍的方塊，你也會受到 30 點傷害。再走 3 步就會熄掉。');
	});

	it("says how far along a building's materials are, what is missing from the board, and whether it comes first", () => {
		const smithy = building('blacksmith', { wood: 1, clay: 2 });
		expect(Tips.buildingTip(smithy, null)).toEqual({
			title: '鐵匠舖',
			lines: ['木材 1／2、陶土 0／2（要先蓋製磚坊）', '劍更利：能裝的格數更多，每一擊也更痛。升級後每塊石材收得更多。', '點一下進度條，可以指定先蓋它。'],
		});
		state.prioritizedBuilding = 'blacksmith';
		expect(Tips.buildingTip(smithy, null).lines[2]).toBe('已指定先蓋；再點一下就取消。');
		// The one the keeper works towards next, with what is on its way to it
		const bricklayer = building('bricklayer', { stone: 4, wood: 5 });
		Tips.init({
			plan: () => ({ next: bricklayer, bars: [{ kind: 'stone', blocks: 5, share: 0.2, waiting: 0.3 }, { kind: 'wood', blocks: 5, share: 0, waiting: 0 }] }),
		});
		const next = Tips.buildingTip(bricklayer, null);
		expect(next.title).toBe('製磚坊（下一棟）');
		expect(next.lines.slice(0, 2)).toEqual(['石材 1／5、木材 0／5', '正在送來：石材 1.5 格']);
		// One that stands says what it does, and how to ask for its upgrade if it is lifted for one
		expect(Tips.buildingTip(building('weaver', {}, true), building('weaver2', { wood: 3 }))).toEqual({
			title: '織布坊', lines: ['盤面上會出現布匹。升級後，每塊布匹收得更多，夜裡引來的怪物也更強。', '點一下，可以指定先升級它。'],
		});
		expect(Tips.buildingTip(building('bricklayer3', {}, true), null).title).toBe('製磚坊（3 級）');
	});

	it('says what the stockpile holds', () => {
		expect(Tips.stockpileTip().lines[0]).toBe('還是空的。白天消掉木材、石材這些方塊，就會送進這裡。');
		state.stores.push(block('stone', 30), block('wood', 12), block('stone', 15));
		expect(Tips.stockpileTip().lines[0]).toBe('石材 1.5 格、木材 0.4 格');
		expect(Tips.stockpileTip().lines[1]).toBe('一格裝滿 30 份，守暮人就會搬去蓋房子。最多放 9 格，再多就會擠掉最舊的一格。');
	});

	it('says how long is left of the day or the night', () => {
		let clock = { night: false, dusk: false, left: 12, held: false };
		Tips.init({ clock: () => clock });
		expect(Tips.clockTip()).toEqual({ title: '白天還剩 12 步', lines: ['每交換一次方塊走一步；最後 5 步是黃昏。'] });
		clock = { night: false, dusk: true, left: 3, held: false };
		expect(Tips.clockTip()?.title).toBe('黃昏：白天還剩 3 步');
		clock = { night: true, dusk: false, left: 7, held: false };
		expect(Tips.clockTip()?.title).toBe('夜晚還剩 7 步');
		clock = { night: true, dusk: false, left: 7, held: true };
		expect(Tips.clockTip()?.title).toBe('天亮不了');
	});

	it('speaks English with English lists', () => {
		speak('en');
		state.stores.push(block('stone', 45), block('wood', 6));
		expect(Tips.stockpileTip().lines[0]).toBe('stone 1.5 blocks, wood 0.2 blocks');
		expect(Tips.tileTip('l', null, false)?.lines).toEqual(['By day: goes to the stockpile, for building', 'At night: calls up the Candlebone Archer']);
	});
});
