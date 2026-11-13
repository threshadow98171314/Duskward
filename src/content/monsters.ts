// The monsters that come at night. Gathering tiles calls most of them up (see
// the nightEffect of each resource), lanterns draw lampmoths, the calls below
// bring the rest, and the dragon is called with its horn.
//
// Every monster walks towards the keeper until it can reach, then attacks. What
// else it does is made of parts: hitting up close, shooting from afar, casting
// spells on the board, or vanishing to the far side of the field. Speeds are in
// pixels per second; sizes are the sprite's, in pixels.

import type { MonsterDef } from '../core/field.ts';
import type { Call } from '../core/night.ts';

export const MONSTERS = {
	zombie: {
		sprite: 'zombie', width: 16, height: 32,
		health: 4, damage: 1, xp: 2, speed: 25,
		parts: [{ type: 'melee', hits: [1] }],
	},
	rat: {
		sprite: 'rat', width: 40, height: 13,
		health: 2, damage: 1, xp: 4, speed: 100,
		parts: [{ type: 'melee', hits: [1, 3] }],
	},
	skeleton: {
		sprite: 'skeleton', width: 27, height: 32,
		health: 1, damage: 3, xp: 3, speed: 40,
		parts: [{ type: 'ranged', range: 200, projectile: 'arrow' }],
	},
	hauntedArmour: {
		sprite: 'harmour', width: 70, height: 49, hitbox: 20, blade: true,
		health: 7, damage: 1, xp: 10, speed: 25,
		parts: [{ type: 'melee', hits: [1] }],
	},
	lizardman: {
		sprite: 'lizardman', width: 32, height: 35,
		health: 3, damage: 4, xp: 13, speed: 40,
		parts: [{ type: 'ranged', range: 200, projectile: 'arrow' }],
	},
	spider: {
		sprite: 'spider', width: 60, height: 38,
		health: 4, damage: 1, xp: 16, speed: 100,
		parts: [{ type: 'melee', hits: [1, 3] }],
	},
	earthElemental: {
		sprite: 'earthelemental', width: 58, height: 74,
		health: 24, damage: 1, xp: 20, speed: 25,
		parts: [{ type: 'melee', hits: [1] }],
	},
	fireElemental: {
		sprite: 'fireelemental', width: 30, height: 41,
		health: 12, damage: 4, xp: 27, speed: 40,
		parts: [{ type: 'ranged', range: 200, projectile: 'fireball', fire: true }],
	},
	waterElemental: {
		sprite: 'waterelemental', width: 53, height: 39, blade: true,
		health: 18, damage: 2, xp: 34, speed: 400 / 3,
		parts: [{ type: 'melee', hits: [1, 3] }],
	},
	demon: {
		sprite: 'demon', width: 72, height: 86,
		health: 45, damage: 3, xp: 35, speed: 25,
		parts: [{ type: 'melee', hits: [1] }],
	},
	warlock: {
		sprite: 'warlock', width: 24, height: 37,
		health: 18, damage: 5, xp: 43, speed: 40,
		parts: [{ type: 'ranged', range: 200, projectile: 'fireball' }],
	},
	imp: {
		sprite: 'imp', width: 30, height: 60,
		health: 36, damage: 2, xp: 52, speed: 400 / 3,
		parts: [{ type: 'melee', hits: [1, 3] }],
	},
	lich: {
		sprite: 'lich', width: 41, height: 60, hitbox: 5,
		health: 120, damage: 5, xp: 500, speed: 20,
		dropChance: 0.25, loot: 'callDragon',
		parts: [
			{ type: 'melee', hits: [1] },
			// Plants a powder keg on the board; counted in steps of 200 ms
			{ type: 'cast', spell: 'explosive', first: 16, every: 24 },
			{ type: 'teleport', first: 52, every: 80 },
		],
	},
	shade: {
		sprite: 'shade', width: 20, height: 34,
		health: 6, damage: 1, xp: 12, speed: 30,
		parts: [
			{ type: 'melee', hits: [1] },
			// Binds a tile on the board in shadow
			{ type: 'cast', spell: 'shadowBind', first: 8, every: 30 },
		],
	},
	lampmoth: {
		sprite: 'lampmoth', width: 18, height: 14, flying: true, prey: 'ward',
		health: 2, damage: 1, xp: 5, speed: 70,
		parts: [{ type: 'melee', hits: [1, 3] }],
	},
	duskcrow: {
		sprite: 'duskcrow', width: 24, height: 16, flying: true,
		health: 3, damage: 2, xp: 8, speed: 110,
		parts: [{ type: 'melee', hits: [1] }],
	},
} satisfies Record<string, MonsterDef>;

// Monsters that come for reasons other than the tiles gathered
export const CALLS: Call[] = [
	// Long chains at night cast long shadows
	{ monster: 'shade', when: 'chain', waves: 3 },
	// From the third night, crows gather at nightfall: two, then one more every four days, up to five
	{ monster: 'duskcrow', when: 'nightfall', fromDay: 3, flock: 2, growEvery: 4, most: 5 },
];

// The dragon is still its own entity (src/app/entity/monster/dragon.js) until it moves onto the field
export const MONSTER_IDS = [...Object.keys(MONSTERS), 'dragon'];

// What monsters' spells can do to the board (effects in src/core/board.ts)
export const BOARD_SPELLS = ['explosive', 'shadowBind'] as const;

// What gathering a tile can make the dragon do
export const DRAGON_ATTACKS = ['WingBuffet', 'IceBeam', 'FireBlast'] as const;
