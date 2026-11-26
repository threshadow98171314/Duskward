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
	// Dusk crystal shards needed before it appears
	requiredGems?: number;
}

export interface Village {
	level: number;
	prestige: number;
	gems?: number;
	hasBuilding(className: string): boolean;
}

// A building waiting to be raised, as the keeper weighs it: lower priorities come
// first, and costs are in full blocks of each material, in all and still missing
export interface Site {
	priority: number;
	cost: Record<string, number>;
	missing: Record<string, number>;
}

// One bar of a building's materials: how many blocks it takes, the share of them
// delivered, and the share more on its way to it
export interface Bar {
	kind: string;
	blocks: number;
	share: number;
	waiting: number;
}

// The building the keeper works towards next, as the keeper chooses its work: one
// with everything delivered is raised first; then the one the keeper was asked to
// see to first; then the first of those that come first by priority
export function nextSite<T extends Site>(sites: readonly T[], asked: T | null = null): T | null {
	const ready = sites.find((site) => Object.values(site.missing).every((missing) => missing <= 0));
	if (ready !== undefined) {
		return ready;
	}
	if (asked !== null && sites.includes(asked)) {
		return asked;
	}
	return sites.reduce<T | null>((best, site) => best === null || site.priority < best.priority ? site : best, null);
}

// The bars of a building's materials. On its way: the blocks of each kind in the
// stockpile or on the keeper's back, a block part full counting in part, up to what
// the building still needs.
export function siteBars(site: Site, onItsWay: Record<string, number> = {}): Bar[] {
	return Object.keys(site.cost).filter((kind) => site.cost[kind] > 0).map((kind) => {
		const blocks = site.cost[kind];
		const missing = Math.min(blocks, Math.max(0, site.missing[kind] ?? 0));
		const waiting = Math.min(missing, Math.max(0, onItsWay[kind] ?? 0));
		return { kind, blocks, share: (blocks - missing) / blocks, waiting: waiting / blocks };
	});
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
	if (rule.requiredGems != null && (village.gems ?? 0) < rule.requiredGems) {
		return false;
	}
	return true;
}
