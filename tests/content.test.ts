import { describe, expect, it } from 'vitest';
import ActionFactory from '../src/app/action/actionfactory.js';
import MonsterFactory from '../src/app/entity/monster/monsterfactory.js';
import Content from '../src/app/gamecontent.js';
import Sprites from '../src/app/graphics/sprites.js';

interface BuildingType {
	className: string;
	spriteName: string;
	cost: Record<string, number>;
	replaces?: string;
	prestigeDependency?: string;
}

interface ResourceType {
	char: string;
	className: string;
	nightEffect?: Record<string, string>;
	dragonEffect?: string;
	multipliers?: Record<string, number>;
}

type MonsterClass = { prototype: { options?: { spriteName?: string } } };

const buildings = Object.values(Content.BuildingType) as BuildingType[];
const resources = Object.values(Content.ResourceType) as ResourceType[];
const buildingNames = new Set(buildings.map((b) => b.className));
const monsters = MonsterFactory._monsters() as Record<string, MonsterClass>;
const actions = ActionFactory._actions() as Record<string, unknown>;

describe('game content', () => {
	it('has unique names', () => {
		expect(buildingNames.size).toBe(buildings.length);
		expect(new Set(resources.map((r) => r.className)).size).toBe(resources.length);
		expect(new Set(resources.map((r) => r.char)).size).toBe(resources.length);
	});

	it('prices buildings in existing resources', () => {
		for (const building of buildings) {
			for (const resource of Object.keys(building.cost)) {
				expect(Content.getResourceType(resource), building.className + ' costs ' + resource).not.toBeNull();
			}
		}
	});

	it('only refers to existing buildings', () => {
		for (const building of buildings) {
			for (const other of [building.replaces, building.prestigeDependency]) {
				if (other !== undefined) {
					expect(buildingNames, building.className + ' -> ' + other).toContain(other);
				}
			}
		}
		for (const resource of resources) {
			for (const building of Object.keys(resource.multipliers ?? {})) {
				expect(buildingNames, resource.className + ' multiplier').toContain(building);
			}
		}
	});

	it('spawns existing monsters and dragon attacks at night', () => {
		for (const resource of resources) {
			for (const effect of Object.values(resource.nightEffect ?? {})) {
				const [kind, name] = effect.split(':');
				if (kind === 'spawn') {
					expect(monsters, resource.className + ' spawns ' + name).toHaveProperty([name]);
				}
			}
			if (resource.dragonEffect) {
				expect(actions, resource.className + ' dragon effect').toHaveProperty([resource.dragonEffect]);
			}
		}
	});

	it('fills loot pools with existing loot', () => {
		for (const [rarity, pool] of Object.entries(Content.lootPools)) {
			for (const loot of pool) {
				expect(Content.LootType, rarity + ' loot').toHaveProperty([loot]);
			}
		}
	});

	it('draws buildings and monsters with existing sprites', () => {
		for (const building of buildings) {
			expect(Sprites.getFilename(building.spriteName), building.className).not.toBeNull();
		}
		for (const [name, monster] of Object.entries(monsters)) {
			const spriteName = monster.prototype.options?.spriteName;
			expect(spriteName, name).toBeTypeOf('string');
			expect(Sprites.getFilename(spriteName), name).not.toBeNull();
		}
	});
});
