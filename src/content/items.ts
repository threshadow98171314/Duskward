// Items found in the chests monsters drop, and how often each turns up.

import type { ItemDef, LootRarity } from './types.ts';

export const ITEMS = {
	healthPotion: {
		use: [{ type: 'heal', share: 0.5 }, { type: 'cue', name: 'heal' }],
	},
	manaPotion: {
		use: [{ type: 'gainMana', share: 0.5 }],
	},
	bomb: {
		use: [{ type: 'damageAll', amount: 20 }, { type: 'cue', name: 'bomb' }],
	},
	equipment: {
		use: [{ type: 'fillEquipment' }],
	},
	callDragon: {
		large: true,
		use: [{ type: 'callDragon' }],
	},
	// Left by the Fallen Dawnwyrm. At night, it calls down the Eclipse.
	dawnHeart: {
		large: true,
		use: [{ type: 'callEclipse' }],
	},
} satisfies Record<string, ItemDef>;

// A chest holds an item from one pool, picked by rarity, then evenly within the pool
export const LOOT_RARITY: LootRarity = {
	rare: 0.10,
	uncommon: 0.35,
	common: 1,
};

export const LOOT_POOLS: Record<string, string[]> = {
	rare: ['bomb'],
	uncommon: ['equipment'],
	common: ['healthPotion'],
};
