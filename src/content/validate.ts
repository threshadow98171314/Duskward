// Checks that the content fits together: names are unique, everything refers to
// things that exist, and numbers are in range. The game checks its content when
// it loads, so a mistake in a data file stops it right away with a clear message.

import type { BuildingDef, Effect, ItemDef, LootRarity, ResourceDef, SkillDef, SpellDef, StateEffectDef, Use } from './types.ts';
import type { BlessingDef } from '../core/blessings.ts';
import type { BossDef, MonsterDef } from '../core/field.ts';
import type { Call } from '../core/night.ts';

export interface Content {
	resources: Record<string, ResourceDef>;
	buildings: Record<string, BuildingDef>;
	items: Record<string, ItemDef>;
	lootRarity: LootRarity;
	lootPools: Record<string, string[]>;
	spells: Record<string, SpellDef>;
	skills: Record<string, SkillDef>;
	stateEffects: Record<string, StateEffectDef>;
	// Every monster that can be called up: those on the field, and the dragon
	monsters: readonly string[];
	monsterDefs: Record<string, MonsterDef>;
	calls: Call[];
	// What spells can do to the board
	boardSpells: readonly string[];
	bosses: Record<string, BossDef>;
	blessings: Record<string, BlessingDef>;
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
		if (resource.attracts !== undefined && !monsters.has(resource.attracts)) {
			problem(where, 'draws unknown monster ' + resource.attracts);
		}
		for (const [boss, strike] of Object.entries(resource.provokes ?? {})) {
			if (content.bosses[boss]?.strikes[strike] === undefined) {
				problem(where, `provokes unknown attack ${strike} of ${boss}`);
			}
		}
		for (const [boss, amount] of Object.entries(resource.wounds ?? {})) {
			if (content.bosses[boss] === undefined || !(amount > 0)) {
				problem(where, 'wounds unknown boss ' + boss);
			}
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

	for (const [name, monster] of Object.entries(content.monsterDefs)) {
		const where = 'monster ' + name;
		for (const stat of ['health', 'damage', 'xp', 'speed', 'width', 'height'] as const) {
			if (!(monster[stat] > 0)) {
				problem(where, stat + ' should be above zero');
			}
		}
		const attacks = monster.parts.filter((part) => part.type === 'melee' || part.type === 'ranged');
		if (attacks.length !== 1) {
			problem(where, 'should have one way to attack, melee or ranged');
		}
		for (const part of monster.parts) {
			if (part.type === 'melee' && (part.hits.length === 0 || part.hits.some((frame) => frame < 0 || frame > 3))) {
				problem(where, 'melee hits should land on frames 0 to 3');
			}
			if (part.type === 'cast' && !content.boardSpells.includes(part.spell)) {
				problem(where, 'casts unknown spell ' + part.spell);
			}
			if ((part.type === 'cast' || part.type === 'teleport') && !(part.first >= 0 && part.every > 0)) {
				problem(where, part.type + ' should come round after a while');
			}
		}
		if (monster.loot !== undefined && content.items[monster.loot] === undefined) {
			problem(where, 'drops unknown item ' + monster.loot);
		}
	}
	for (const [name, boss] of Object.entries(content.bosses)) {
		const where = 'boss ' + name;
		for (const strike of [boss.close, boss.far]) {
			if (boss.strikes[strike] === undefined) {
				problem(where, 'falls back on unknown strike ' + strike);
			}
		}
		for (const [strikeName, strike] of Object.entries(boss.strikes)) {
			if (!(strike.lands >= 0 && strike.ends >= strike.lands)) {
				problem(where, strikeName + ' should land before it ends');
			}
			if (strike.summon !== undefined && !monsters.has(strike.summon.monster)) {
				problem(where, strikeName + ' summons unknown monster ' + strike.summon.monster);
			}
		}
		if (boss.loot !== undefined && content.items[boss.loot] === undefined) {
			problem(where, 'drops unknown item ' + boss.loot);
		}
	}
	const fills = ['health', 'shield', 'sword', 'ward', 'gauge'];
	for (const [name, blessing] of Object.entries(content.blessings)) {
		const where = 'blessing ' + name;
		if (blessing.gift.length === 0) {
			problem(where, 'gives nothing');
		}
		for (const boon of [...blessing.gift, ...blessing.price]) {
			if (boon.type === 'fill' && !fills.includes(boon.what)) {
				problem(where, 'fills unknown ' + boon.what);
			} else if (boon.type === 'nightMoves' && !Number.isInteger(boon.moves)) {
				problem(where, 'changes the night by part of a move');
			} else if ((boon.type === 'monsterHealth' || boon.type === 'spawns' || boon.type === 'xp') && !(boon.scale > 0)) {
				problem(where, boon.type + ' should scale by more than zero');
			} else if (boon.type === 'spawns' && !Number.isInteger(boon.scale)) {
				problem(where, 'spawns should scale by whole monsters');
			}
		}
	}
	for (const call of content.calls) {
		const where = 'call for ' + call.monster;
		if (!monsters.has(call.monster)) {
			problem(where, 'unknown monster');
		}
		if (call.when === 'chain' ? !(call.waves >= 2) : !(call.fromDay >= 1 && call.flock >= 1 && call.growEvery >= 1 && call.most >= call.flock)) {
			problem(where, 'numbers out of range');
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
