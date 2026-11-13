// Checks that the content fits together: names are unique, everything refers to
// things that exist, and numbers are in range. The game checks its content when
// it loads, so a mistake in a data file stops it right away with a clear message.

import type { BuildingDef, Effect, ItemDef, LootRarity, ResourceDef, SkillDef, SpellDef, StateEffectDef, Use } from './types.ts';

export interface Content {
	resources: Record<string, ResourceDef>;
	buildings: Record<string, BuildingDef>;
	items: Record<string, ItemDef>;
	lootRarity: LootRarity;
	lootPools: Record<string, string[]>;
	spells: Record<string, SpellDef>;
	skills: Record<string, SkillDef>;
	stateEffects: Record<string, StateEffectDef>;
	monsters: readonly string[];
	dragonAttacks: readonly string[];
}

// Returns every problem found; an empty list means the content is sound
export function validateContent(content: Content): string[] {
	const problems: string[] = [];
	const problem = (where: string, what: string) => problems.push(where + ': ' + what);

	const resources = Object.entries(content.resources);
	const resourceNames = new Set(resources.map(([, r]) => r.className));
	const buildings = Object.entries(content.buildings);
	const buildingNames = new Set(buildings.map(([, b]) => b.className));
	const monsters = new Set(content.monsters);

	unique(resources.map(([, r]) => r.className), 'resource', problem);
	unique(resources.map(([, r]) => r.char), 'resource code', problem);
	unique(buildings.map(([, b]) => b.className), 'building', problem);

	for (const [key, resource] of resources) {
		const where = 'resource ' + key;
		if (resource.char.length !== 1) {
			problem(where, `code "${resource.char}" should be one letter`);
		}
		const conditions = Object.keys(resource.nightEffect);
		conditions.forEach((condition, i) => {
			if (condition === 'default' ? i !== conditions.length - 1 : !buildingNames.has(condition)) {
				problem(where, condition === 'default' ? "'default' night effect should come last" : 'night effect for unknown building ' + condition);
			}
			const effect = resource.nightEffect[condition];
			const [kind, monster] = effect.split(':');
			if (kind === 'spawn' ? !monsters.has(monster) : !['shield', 'sword', 'dawn'].includes(effect)) {
				problem(where, 'unknown night effect ' + effect);
			}
		});
		if (resource.dragonEffect !== undefined && !content.dragonAttacks.includes(resource.dragonEffect)) {
			problem(where, 'unknown dragon attack ' + resource.dragonEffect);
		}
		for (const [building, multiplier] of Object.entries(resource.multipliers)) {
			if (!buildingNames.has(building)) {
				problem(where, 'multiplier for unknown building ' + building);
			}
			if (!(multiplier > 0)) {
				problem(where, `multiplier ${multiplier} for ${building} should be above zero`);
			}
		}
	}

	for (const [key, building] of buildings) {
		const where = 'building ' + key;
		for (const [resource, blocks] of Object.entries(building.cost)) {
			if (!resourceNames.has(resource)) {
				problem(where, 'costs unknown resource ' + resource);
			}
			if (!Number.isInteger(blocks) || blocks < 1) {
				problem(where, `costs ${blocks} ${resource}; costs are whole blocks`);
			}
		}
		for (const field of ['replaces', 'requires', 'prestigeDependency'] as const) {
			const other = building[field];
			if (other !== undefined && !buildingNames.has(other)) {
				problem(where, `${field} unknown building ${other}`);
			}
		}
		if (building.replaces === building.className) {
			problem(where, 'replaces itself');
		}
		if (building.tileMod !== undefined && !resourceNames.has(building.tileMod)) {
			problem(where, 'changes unknown tiles ' + building.tileMod);
		}
		if (building.tileLevel !== undefined && building.tileMod === undefined) {
			problem(where, 'has a tile level but no tiles to change');
		}
		if (!Number.isInteger(building.requiredLevel) || building.requiredLevel < 1) {
			problem(where, 'required level should be a whole number from 1');
		}
		if (building.onBuilt?.type === 'stockpile' && (building.onBuilt.rows < 1 || building.onBuilt.columns < 1)) {
			problem(where, 'stockpile should have room');
		}
	}
	// Upgrades must lead back to a building that stands on its own
	for (const [key, building] of buildings) {
		const seen = new Set<string>();
		let current: BuildingDef | undefined = building;
		while (current?.replaces !== undefined && !seen.has(current.className)) {
			seen.add(current.className);
			const replaced: string = current.replaces;
			current = buildings.find(([, b]) => b.className === replaced)?.[1];
		}
		if (current !== undefined && current.replaces !== undefined) {
			problem('building ' + key, 'upgrades in a circle');
		}
	}

	const items = new Set(Object.keys(content.items));
	const rarities = Object.entries(content.lootRarity);
	rarities.forEach(([rarity, chance], i) => {
		if (!(chance > 0 && chance <= 1) || (i > 0 && chance <= rarities[i - 1][1])) {
			problem('loot rarity ' + rarity, 'chances should rise from above 0 up to 1');
		}
		const pool = content.lootPools[rarity];
		if (pool === undefined || pool.length === 0) {
			problem('loot rarity ' + rarity, 'has no items');
		}
	});
	if (rarities.length > 0 && rarities[rarities.length - 1][1] !== 1) {
		problem('loot rarity', 'the last rarity should catch every roll (1)');
	}
	for (const [rarity, pool] of Object.entries(content.lootPools)) {
		if (content.lootRarity[rarity] === undefined) {
			problem('loot pool ' + rarity, 'has no chance of dropping');
		}
		for (const item of pool) {
			if (!items.has(item)) {
				problem('loot pool ' + rarity, 'unknown item ' + item);
			}
		}
	}

	const checkUse = (where: string, use: Use) => {
		for (const effect of Array.isArray(use) ? use : [...use.day, ...use.night]) {
			checkEffect(where, effect, content, problem);
		}
	};
	for (const [name, item] of Object.entries(content.items)) {
		checkUse('item ' + name, item.use);
	}
	for (const [name, spell] of Object.entries(content.spells)) {
		checkUse('spell ' + name, spell.use);
	}
	for (const [name, skill] of Object.entries(content.skills)) {
		checkUse('skill ' + name, skill.use);
		if (!Number.isInteger(skill.level) || skill.level < 1) {
			problem('skill ' + name, 'level should be a whole number from 1');
		}
	}
	unique(Object.values(content.skills).map((skill) => String(skill.level)), 'skill level', problem);
	for (const [name, effect] of Object.entries(content.stateEffects)) {
		if (!(effect.duration > 0)) {
			problem('state effect ' + name, 'should last a while');
		}
	}

	return problems;
}

function checkEffect(where: string, effect: Effect, content: Content, problem: (where: string, what: string) => void) {
	switch (effect.type) {
		case 'heal':
		case 'gainMana':
			if (!(effect.share > 0 && effect.share <= 1)) {
				problem(where, `${effect.type} share ${effect.share} should be above 0, up to 1`);
			}
			break;
		case 'damageAll':
		case 'harvestEach':
			if (!(effect.amount > 0)) {
				problem(where, effect.type + ' amount should be above zero');
			}
			break;
		case 'extendDay':
			if (!(effect.moves > 0)) {
				problem(where, 'extendDay should add moves');
			}
			break;
		case 'stateEffect':
			if (content.stateEffects[effect.effect] === undefined) {
				problem(where, 'unknown state effect ' + effect.effect);
			}
			break;
		case 'cue':
			if (effect.name === '') {
				problem(where, 'cue without a name');
			}
			break;
	}
}

function unique(names: string[], what: string, problem: (where: string, what: string) => void) {
	const seen = new Set<string>();
	for (const name of names) {
		if (seen.has(name)) {
			problem(what + ' ' + name, 'is defined twice');
		}
		seen.add(name);
	}
}
