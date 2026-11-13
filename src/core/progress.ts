// The keeper's growth and what the village can build.

export const MAX_LEVEL = 26;

// Experience needed for the next level: 40, 160, 360, 640, 1000...
export function xpToLevel(level: number): number {
	return 40 * Math.pow(level, 2);
}

export function maxHealth(level: number): number {
	return 20 + 10 * level;
}

// Adds experience and levels up as many times as it covers. At the top level,
// experience stops just short of the next one.
export function gainXp(level: number, xp: number, amount: number): { level: number; xp: number; levelsGained: number } {
	xp += amount || 0;
	if (isNaN(xp)) {
		xp = 0;
	}
	let levelsGained = 0;
	while (xp >= xpToLevel(level)) {
		if (level >= MAX_LEVEL) {
			xp = xpToLevel(level) - 1;
		} else {
			xp -= xpToLevel(level);
			level++;
			levelsGained++;
		}
	}
	return { level, xp, levelsGained };
}

export interface BuildingRule {
	requiredLevel?: number;
	// In New Game+, this building comes after another building instead of at a level
	prestigeDependency?: string;
	requires?: string;
	replaces?: string;
}

export interface Village {
	level: number;
	prestige: number;
	hasBuilding(className: string): boolean;
}

export function canBuild(rule: BuildingRule, village: Village): boolean {
	if (village.prestige && rule.prestigeDependency && !village.hasBuilding(rule.prestigeDependency)) {
		return false;
	} else if (rule.requiredLevel != null && village.level < rule.requiredLevel) {
		return false;
	}
	if (rule.requires != null && !village.hasBuilding(rule.requires)) {
		return false;
	}
	if (rule.replaces != null && !village.hasBuilding(rule.replaces)) {
		return false;
	}
	return true;
}
