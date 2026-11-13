// What gathered tiles do. By day they feed the village: grain heals the keeper,
// gems give mana, and everything else goes to the stores, multiplied by the
// buildings that work it. By night they arm the keeper or call up monsters. At
// dusk, everything cleared also strengthens the ward for the coming night. A move
// that gathers many kinds by day earns a bounty on top.

export interface ResourceRule {
	className: string;
	// What the resource does at night, by the building that changes it; 'default' applies otherwise
	nightEffect?: Record<string, string>;
	// While a boss is out, the attack gathering it provokes, by boss
	provokes?: Record<string, string>;
	// While a boss is out, the damage each tile of it deals the boss, by boss
	wounds?: Record<string, number>;
	// Store multipliers, by building
	multipliers?: Record<string, number>;
	// A monster that gathering it at night draws in, besides its night effect
	attracts?: string;
}

export interface HarvestSituation {
	night: boolean;
	dusk: boolean;
	// While day turns to night or back, gathered tiles count as daytime gains
	inTransition: boolean;
	// The boss that is out, if any
	boss: string | null;
	// Whether a building stands; with current, only if it has not been replaced by an upgrade
	hasBuilding(className: string, current?: boolean): boolean;
	// The debug multiplier for daytime gains
	multiplier: number;
}

export type HarvestEffect =
	| { type: 'ward'; amount: number }
	| { type: 'spawn'; monster: string; tiles: number }
	| { type: 'provoke'; strike: string }
	| { type: 'wound'; amount: number }
	| { type: 'shield' }
	| { type: 'sword' }
	| { type: 'dawn' }
	| { type: 'heal'; amount: number }
	| { type: 'mana'; amount: number }
	| { type: 'store'; resource: string; amount: number };

// The ward raised at dusk by everything cleared at once; null when it is not dusk
export function duskWard(gathered: Record<string, number>, situation: HarvestSituation): number | null {
	if (!situation.dusk || situation.inTransition) {
		return null;
	}
	return Object.values(gathered).reduce((sum, n) => sum + n, 0);
}

// What one kind of gathered tile does. An effect can change the situation, e.g.
// lanterns can bring the dawn, so the next kind should be read against a fresh one.
export function harvestResource(
	className: string,
	count: number,
	situation: HarvestSituation,
	rule: (className: string) => ResourceRule,
): HarvestEffect | null {
	const resource = rule(className);
	if (situation.night && !situation.inTransition) {
		const effect = nightEffect(resource, situation);
		return effect === null ? null : toNightEffect(effect, count);
	}
	let amount = count;
	for (const [building, multiplier] of Object.entries(resource.multipliers ?? {})) {
		if (situation.hasBuilding(building, true)) {
			amount *= multiplier;
		}
	}
	amount *= situation.multiplier;
	if (className === 'grain') {
		return { type: 'heal', amount };
	} else if (className === 'mana') {
		return { type: 'mana', amount };
	}
	return { type: 'store', resource: className, amount };
}

// A move that gathers four or more kinds of resource by day earns a bounty: half as
// much again of each kind it gathered for every kind past three. Gems are not a
// resource here, so leave them out of what is passed in.
export const BOUNTY_KINDS = 4;
export const BOUNTY_PER_KIND = 0.5;

export interface Bounty {
	kinds: number;
	percent: number;
	// Extra tiles of each kind, to be harvested like the ones the move gathered
	extra: Record<string, number>;
}

export function bounty(gathered: Record<string, number>): Bounty | null {
	const kinds = Object.keys(gathered).filter((kind) => gathered[kind] > 0);
	if (kinds.length < BOUNTY_KINDS) {
		return null;
	}
	const rate = BOUNTY_PER_KIND * (kinds.length - BOUNTY_KINDS + 1);
	const extra: Record<string, number> = {};
	for (const kind of kinds) {
		const amount = Math.floor(gathered[kind] * rate);
		if (amount > 0) {
			extra[kind] = amount;
		}
	}
	return { kinds: kinds.length, percent: Math.round(rate * 100), extra };
}

// A monster drawn in by what was gathered at night, as lanterns draw lampmoths
export function attracted(
	className: string,
	situation: HarvestSituation,
	rule: (className: string) => ResourceRule,
): string | null {
	if (!situation.night || situation.inTransition || situation.boss !== null) {
		return null;
	}
	return rule(className).attracts ?? null;
}

// Everything a wave gathered, for a situation that stays the same throughout
export function harvest(
	gathered: Record<string, number>,
	situation: HarvestSituation,
	rule: (className: string) => ResourceRule,
): HarvestEffect[] {
	const effects: HarvestEffect[] = [];
	const ward = duskWard(gathered, situation);
	if (ward !== null) {
		effects.push({ type: 'ward', amount: ward });
	}
	for (const [className, count] of Object.entries(gathered)) {
		const effect = harvestResource(className, count, situation, rule);
		if (effect !== null) {
			effects.push(effect);
		}
	}
	return effects;
}

function nightEffect(resource: ResourceRule, situation: HarvestSituation): string | null {
	if (situation.boss !== null && resource.wounds?.[situation.boss] !== undefined) {
		return 'wound:' + resource.wounds[situation.boss];
	}
	if (situation.boss !== null && resource.provokes?.[situation.boss] !== undefined) {
		return 'provoke:' + resource.provokes[situation.boss];
	}
	for (const [building, effect] of Object.entries(resource.nightEffect ?? {})) {
		if (building === 'default' || situation.hasBuilding(building)) {
			return effect;
		}
	}
	return null;
}

function toNightEffect(effect: string, tiles: number): HarvestEffect {
	const [kind, name] = effect.split(':');
	switch (kind) {
		case 'spawn':
			return { type: 'spawn', monster: name, tiles };
		case 'provoke':
			return { type: 'provoke', strike: name };
		case 'wound':
			return { type: 'wound', amount: Number(name) * tiles };
		case 'shield':
		case 'sword':
		case 'dawn':
			return { type: kind };
		default:
			throw new Error('Unknown night effect: ' + effect);
	}
}
