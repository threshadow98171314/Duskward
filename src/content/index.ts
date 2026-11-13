// All of the game's content, checked when the game loads.

import { BUILDINGS } from './buildings.ts';
import { ITEMS, LOOT_POOLS, LOOT_RARITY } from './items.ts';
import { SKILLS, SPELLS, STATE_EFFECTS } from './magic.ts';
import { BOSSES } from './bosses.ts';
import { BOARD_SPELLS, CALLS, MONSTERS } from './monsters.ts';
import { RESOURCES } from './resources.ts';
import { type Content, validateContent } from './validate.ts';

export const CONTENT: Content = {
	resources: RESOURCES,
	buildings: BUILDINGS,
	items: ITEMS,
	lootRarity: LOOT_RARITY,
	lootPools: LOOT_POOLS,
	spells: SPELLS,
	skills: SKILLS,
	stateEffects: STATE_EFFECTS,
	// Every monster, bosses included
	monsters: [...Object.keys(MONSTERS), ...Object.keys(BOSSES)],
	monsterDefs: MONSTERS,
	calls: CALLS,
	boardSpells: BOARD_SPELLS,
	bosses: BOSSES,
};

// Stops the game with every problem listed, rather than failing somewhere later
export function checkContent(content: Content = CONTENT): Content {
	const problems = validateContent(content);
	if (problems.length > 0) {
		throw new Error('The game content has problems:\n' + problems.join('\n'));
	}
	return content;
}
