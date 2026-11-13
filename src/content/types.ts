// The shape of the game's content. The data itself lives in the other files of
// src/content, and validate.ts checks it fits together when the game loads.

// Where gathered tiles fly on screen: a point, the side the swap was on, or the sword meter
export type EffectDestination = [number, number] | 'side' | 'sword';

export interface ResourceDef {
	// The tile's code on the board
	char: string;
	className: string;
	// What gathering the tile does at night, by the building that decides it.
	// Checked in order, so 'default' comes last. Effects: 'spawn:<monster>',
	// 'shield', 'sword' or 'dawn'.
	nightEffect: Record<string, string>;
	// What it makes the dragon do while the dragon is out
	dragonEffect?: string;
	// A monster that gathering it at night draws in, besides its night effect
	attracts?: string;
	// Store multipliers, by building
	multipliers: Record<string, number>;
	effectDest: { day: EffectDestination; night: EffectDestination };
}

export type BuildingEffect =
	// A bigger stockpile, in blocks
	| { type: 'stockpile'; rows: number; columns: number }
	| { type: 'enableMagic' }
	| { type: 'wardCapacity' }
	| { type: 'enableSkills' };

export interface BuildingDef {
	className: string;
	spriteName: string;
	// Where it stands, in pixels from the left of the world
	position: number;
	// Full blocks of each resource
	cost: Record<string, number>;
	requiredLevel: number;
	// In New Game+, this building comes after another building instead of at a level
	prestigeDependency?: string;
	// Another building that has to stand first
	requires?: string;
	// The building this one upgrades
	replaces?: string;
	// Dusk crystal shards needed before it appears
	requiredGems?: number;
	// Changes the look of these tiles, to this level
	tileMod?: string;
	tileLevel?: number;
	// The keeper builds lower numbers first
	priority: number;
	// The keeper's home: the stockpile sits in it
	isBase?: boolean;
	animationFrames?: number;
	defaultAnimation?: number;
	onBuilt?: BuildingEffect;
}

// What items, spells and skills do
export type Effect =
	// Heals or restores mana by a share of the maximum
	| { type: 'heal'; share: number }
	| { type: 'gainMana'; share: number }
	| { type: 'damageAll'; amount: number }
	| { type: 'fillEquipment' }
	| { type: 'fillWard' }
	| { type: 'callDragon' }
	| { type: 'callEclipse' }
	| { type: 'refreshBoard' }
	// Turns day to night or night to day
	| { type: 'phaseChange' }
	| { type: 'stateEffect'; effect: string }
	// Gives some of every resource the village can gather
	| { type: 'harvestEach'; amount: number }
	| { type: 'extendDay'; moves: number }
	// Plays the named sound or flourish
	| { type: 'cue'; name: string };

// The same effects at any time, or different ones by day and by night
export type Use = Effect[] | { day: Effect[]; night: Effect[] };

export interface ItemDef {
	// Only one fits, in the large slot
	large?: boolean;
	use: Use;
}

export interface SpellDef {
	use: Use;
}

export interface SkillDef {
	// The altar level that unlocks it
	level: number;
	use: Use;
}

export interface StateEffectDef {
	className: string;
	// In milliseconds
	duration: number;
	// The keeper is encased in ice and cannot act
	freezesKeeper?: boolean;
}

// Chances of each rarity, checked in order: a roll below the first number is rare, and so on
export type LootRarity = Record<string, number>;
