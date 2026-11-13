// What gathered tiles do. By day they feed the village: grain heals the keeper,
// gems give mana, and everything else goes to the stores, multiplied by the
// buildings that work it. By night they arm the keeper or call up monsters. At
// dusk, everything cleared also strengthens the ward for the coming night.

export interface ResourceRule {
	className: string;
	// What the resource does at night, by the building that changes it; 'default' applies otherwise
	nightEffect?: Record<string, string>;
	// What it makes the dragon do while the dragon is out
	dragonEffect?: string;
	// Store multipliers, by building
	multipliers?: Record<string, number>;
}

export interface HarvestSituation {
	night: boolean;
	dusk: boolean;
	// While day turns to night or back, gathered tiles count as daytime gains
	inTransition: boolean;
	dragon: boolean;
	// Whether a building stands; with current, only if it has not been replaced by an upgrade
	hasBuilding(className: string, current?: boolean): boolean;
	// The debug multiplier for daytime gains
	multiplier: number;
}

export type HarvestEffect =
	| { type: 'ward'; amount: number }
	| { type: 'spawn'; monster: string; tiles: number }
	| { type: 'dragon'; attack: string }
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
	if (situation.dragon && resource.dragonEffect) {
		return 'dragon:' + resource.dragonEffect;
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
		case 'dragon':
			return { type: 'dragon', attack: name };
		case 'shield':
		case 'sword':
		case 'dawn':
			return { type: kind };
		default:
			throw new Error('Unknown night effect: ' + effect);
	}
}
