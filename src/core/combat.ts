// Combat numbers: how hard the keeper and the monsters hit, and how damage is
// soaked up. When attacks happen is still up to the world, for now.

// New Game+ makes monsters tougher with every round
const PRESTIGE_MULTIPLIER = 0.5;

// The keeper's bare-handed damage: 1 until level 7, then a point every three levels
export function strength(level: number): number {
	return level < 7 ? 1 : Math.floor((level - 1) / 3);
}

// Sword charges come from stone matched at night; the blacksmith's level sets
// how many the keeper can hold and how hard each one hits.
// highestLevel is the blacksmith's tile level, or 1 without one.
export function maxSword(highestLevel: number): number {
	// 3, 3, 3, 5, 5, 5, 7, 7, 7...
	return 3 + Math.floor((highestLevel - 1) / 3) * 2;
}

export function swordDamage(highestLevel: number): number {
	// 1, 2, 3, 3, 4, 5, 5, 6, 7... on top of the keeper's strength
	return 1 + (highestLevel - 1) - Math.floor((highestLevel - 1) / 3);
}

// Shield charges come from wood matched at night; the sawmill's level sets how many
export function maxShield(highestLevel: number): number {
	return 3 * highestLevel;
}

// One blow from the keeper. A sword charge, if there is one, is spent on it.
export function heroDamage(level: number, swordCharges: number, highestStoneLevel: number): { damage: number; usesSword: boolean } {
	if (swordCharges > 0) {
		return { damage: swordDamage(highestStoneLevel) + strength(level), usesSword: true };
	}
	return { damage: strength(level), usesSword: false };
}

export interface Defences {
	health: number;
	ward: number;
	shield: number;
	// Frozen by the dragon's ice: every blow lands at half strength
	frozen: boolean;
}

// A blow against the keeper: the ward raised at dusk takes it first, then the shield.
export function absorb(damage: number, defences: Defences): Defences & { warded: number; blocked: number } {
	let { health, ward, shield } = defences;
	if (health <= 0) {
		return { ...defences, warded: 0, blocked: 0 };
	}
	if (defences.frozen) {
		damage /= 2;
	}
	const warded = Math.min(damage, ward);
	ward -= warded;
	damage -= warded;
	const blocked = Math.min(damage, shield);
	shield -= blocked;
	damage -= blocked;
	health = Math.max(0, health - damage);
	return { health, ward, shield, frozen: defences.frozen, warded, blocked };
}

export function monsterMultiplier(prestige: number): number {
	return prestige * PRESTIGE_MULTIPLIER + 1;
}

export function dragonMultiplier(prestige: number): number {
	return (prestige + 1) * PRESTIGE_MULTIPLIER;
}

// A monster's health or damage: its base, scaled for New Game+, and halved in casual mode
export function monsterStat(base: number, multiplier: number, casual: boolean): number {
	const value = base * multiplier;
	return casual ? Math.ceil(value / 2) : value;
}
