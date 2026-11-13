import { describe, expect, it } from 'vitest';
import ActionFactory from '../src/app/action/actionfactory.js';
import MonsterFactory from '../src/app/entity/monster/monsterfactory.js';
import Content from '../src/app/gamecontent.js';
import Sprites from '../src/app/graphics/sprites.js';
import { CONTENT, checkContent } from '../src/content/index.ts';
import type { Content as GameContent } from '../src/content/validate.ts';
import { validateContent } from '../src/content/validate.ts';

type MonsterClass = { prototype: { options?: { spriteName?: string } } };

const monsters = MonsterFactory._monsters() as Record<string, MonsterClass>;
const actions = ActionFactory._actions() as Record<string, unknown>;

// A copy of the content to break on purpose
function broken(change: (content: GameContent) => void): string[] {
	const content = structuredClone(CONTENT) as GameContent;
	change(content);
	return validateContent(content);
}

describe('game content', () => {
	it('passes its own checks', () => {
		expect(validateContent(CONTENT)).toEqual([]);
		expect(() => checkContent()).not.toThrow();
	});

	it('catches names used twice', () => {
		expect(broken((c) => { c.resources.Wood.char = 'g'; })).toContain('resource code g: is defined twice');
		expect(broken((c) => { c.buildings.House.className = 'shack'; })).toContain('building shack: is defined twice');
	});

	it('catches references to things that do not exist', () => {
		expect(broken((c) => { c.buildings.BrickLayer.cost = { gold: 2 }; })).toContain('building BrickLayer: costs unknown resource gold');
		expect(broken((c) => { c.buildings.Altar.requires = 'temple'; })).toContain('building Altar: requires unknown building temple');
		expect(broken((c) => { c.resources.Grain.nightEffect.default = 'spawn:dodo'; }))
			.toContain('resource Grain: unknown night effect spawn:dodo');
		expect(broken((c) => { c.lootPools.rare = ['crown']; })).toContain('loot pool rare: unknown item crown');
		expect(broken((c) => { c.skills.timelamp.use = [{ type: 'stateEffect', effect: 'sleep' }]; }))
			.toContain('skill timelamp: unknown state effect sleep');
	});

	it('catches numbers out of range and rules out of order', () => {
		expect(broken((c) => { c.buildings.Weaver.cost = { stone: 1.5 }; }))
			.toContain('building Weaver: costs 1.5 stone; costs are whole blocks');
		expect(broken((c) => { c.lootRarity.common = 0.9; })).toContain('loot rarity: the last rarity should catch every roll (1)');
		expect(broken((c) => { c.resources.Clay.nightEffect = { default: 'spawn:rat', bricklayer2: 'spawn:spider' }; }))
			.toContain("resource Clay: 'default' night effect should come last");
		expect(broken((c) => { c.buildings.Shack.replaces = 'castle'; })).toContain('building Shack: upgrades in a circle');
	});

	it('stops the game with every problem listed', () => {
		const content = structuredClone(CONTENT) as GameContent;
		content.lootPools.rare = ['crown'];
		content.buildings.Altar.requires = 'temple';
		expect(() => checkContent(content)).toThrow('building Altar: requires unknown building temple');
		expect(() => checkContent(content)).toThrow('loot pool rare: unknown item crown');
	});

	it('only names monsters and dragon attacks the game has', () => {
		expect(Object.keys(monsters).sort()).toEqual([...CONTENT.monsters].sort());
		for (const attack of CONTENT.dragonAttacks) {
			expect(actions, attack).toHaveProperty([attack]);
		}
	});

	it('draws buildings and monsters with existing sprites', () => {
		for (const building of Object.values(Content.BuildingType) as { className: string; spriteName: string }[]) {
			expect(Sprites.getFilename(building.spriteName), building.className).not.toBeNull();
		}
		for (const [name, monster] of Object.entries(monsters)) {
			const spriteName = monster.prototype.options?.spriteName;
			expect(spriteName, name).toBeTypeOf('string');
			expect(Sprites.getFilename(spriteName), name).not.toBeNull();
		}
	});
});
