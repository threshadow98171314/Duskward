import { describe, expect, it } from 'vitest';
import Content from '../src/app/gamecontent.js';
import { absorb, dragonMultiplier, heroDamage, maxShield, maxSword, monsterMultiplier, monsterStat, strength, swordDamage }
	from '../src/core/combat.ts';
import { advanceClock, createClock, extendDay, startPhase } from '../src/core/day.ts';
import { harvest, type HarvestSituation, type ResourceRule } from '../src/core/harvest.ts';
import { canBuild, gainXp, MAX_LEVEL, maxHealth, xpToLevel } from '../src/core/progress.ts';

const lengths = { dayMoves: 20, nightMoves: 15 };

describe('the clock', () => {
	it('falls to dusk for the last five moves of the day', () => {
		const clock = createClock();
		expect(advanceClock(clock, lengths, 14)).toEqual({ over: false, duskChanged: false });
		expect(advanceClock(clock, lengths, 1)).toEqual({ over: false, duskChanged: true });
		expect(clock.dusk).toBe(true);
		expect(advanceClock(clock, lengths, 4)).toEqual({ over: false, duskChanged: false });
		expect(advanceClock(clock, lengths, 1).over).toBe(true);
	});

	it('runs nights for fifteen moves, without dusk', () => {
		const clock = createClock();
		advanceClock(clock, lengths, 16);
		expect(startPhase(clock, lengths, true)).toBe(true);
		expect(clock).toEqual({ night: true, position: 0, dusk: false });
		expect(advanceClock(clock, lengths, 14).over).toBe(false);
		expect(advanceClock(clock, lengths, 1).over).toBe(true);
	});

	it('can turn the day back, lifting dusk', () => {
		const clock = createClock();
		advanceClock(clock, lengths, 17);
		expect(extendDay(clock, lengths, 5)).toBe(true);
		expect(clock).toEqual({ night: false, position: 12, dusk: false });
		expect(extendDay(clock, lengths, 50)).toBe(false);
		expect(clock.position).toBe(0);
	});

	it('cannot turn the night back', () => {
		const clock = createClock();
		startPhase(clock, lengths, true);
		advanceClock(clock, lengths, 4);
		expect(extendDay(clock, lengths, 3)).toBe(false);
		expect(clock.position).toBe(4);
	});
});

describe('harvest', () => {
	const resources = (className: string) => Content.getResourceType(className) as ResourceRule;
	const situation = (overrides: Partial<HarvestSituation> = {}, buildings: string[] = []): HarvestSituation => ({
		night: false,
		dusk: false,
		inTransition: false,
		dragon: false,
		hasBuilding: (name) => buildings.includes(name),
		multiplier: 1,
		...overrides,
	});

	it('heals, adds mana and fills the stores by day', () => {
		expect(harvest({ grain: 3, mana: 1, wood: 4 }, situation(), resources)).toEqual([
			{ type: 'heal', amount: 3 },
			{ type: 'mana', amount: 1 },
			{ type: 'store', resource: 'wood', amount: 4 },
		]);
	});

	it('multiplies by the buildings that work a resource', () => {
		expect(harvest({ wood: 4, grain: 3 }, situation({}, ['sawmill3', 'house']), resources)).toEqual([
			{ type: 'store', resource: 'wood', amount: 8 },
			{ type: 'heal', amount: 6 },
		]);
		expect(harvest({ wood: 2 }, situation({ multiplier: 10 }), resources)).toEqual([
			{ type: 'store', resource: 'wood', amount: 20 },
		]);
	});

	it('only counts buildings that have not been upgraded away', () => {
		const village = situation({}, ['sawmill3']);
		village.hasBuilding = (name, current) => name === 'sawmill3' && !current;
		expect(harvest({ wood: 4 }, village, resources)).toEqual([{ type: 'store', resource: 'wood', amount: 4 }]);
	});

	it('arms the keeper and calls monsters by night', () => {
		expect(harvest({ wood: 3, stone: 3, grain: 4, clay: 3 }, situation({ night: true }), resources)).toEqual([
			{ type: 'shield' },
			{ type: 'sword' },
			{ type: 'spawn', monster: 'zombie', tiles: 4 },
			{ type: 'spawn', monster: 'rat', tiles: 3 },
		]);
	});

	it('calls tougher monsters as the village grows', () => {
		expect(harvest({ grain: 3, clay: 3 }, situation({ night: true }, ['house', 'fort', 'bricklayer3']), resources)).toEqual([
			{ type: 'spawn', monster: 'earthElemental', tiles: 3 },
			{ type: 'spawn', monster: 'waterElemental', tiles: 3 },
		]);
	});

	it('brings the dawn closer with lanterns', () => {
		expect(harvest({ lantern: 3 }, situation({ night: true }), resources)).toEqual([{ type: 'dawn' }]);
	});

	it('turns gathered tiles into dragon attacks while the dragon is out', () => {
		expect(harvest({ grain: 3, wood: 3 }, situation({ night: true, dragon: true }), resources)).toEqual([
			{ type: 'dragon', attack: 'WingBuffet' },
			{ type: 'shield' },
		]);
	});

	it('raises the ward with everything cleared at dusk', () => {
		expect(harvest({ grain: 3, wood: 4 }, situation({ dusk: true }), resources)[0]).toEqual({ type: 'ward', amount: 7 });
	});

	it('counts tiles cleared while day turns to night as daytime gains', () => {
		expect(harvest({ wood: 3 }, situation({ night: true, dusk: true, inTransition: true }), resources)).toEqual([
			{ type: 'store', resource: 'wood', amount: 3 },
		]);
	});
});

describe('progress', () => {
	it('needs more experience for every level', () => {
		expect([1, 2, 3, 10].map(xpToLevel)).toEqual([40, 160, 360, 4000]);
		expect(maxHealth(1)).toBe(30);
	});

	it('levels up as many times as the experience covers', () => {
		expect(gainXp(1, 30, 20)).toEqual({ level: 2, xp: 10, levelsGained: 1 });
		expect(gainXp(1, 0, 40 + 160 + 5)).toEqual({ level: 3, xp: 5, levelsGained: 2 });
		expect(gainXp(4, 10, 0)).toEqual({ level: 4, xp: 10, levelsGained: 0 });
	});

	it('stops just short of the level after the last', () => {
		expect(gainXp(MAX_LEVEL, 0, 1e9)).toEqual({ level: MAX_LEVEL, xp: xpToLevel(MAX_LEVEL) - 1, levelsGained: 0 });
	});

	it('unlocks buildings by level, and in New Game+ also by another building', () => {
		const village = (level: number, prestige: number, buildings: string[] = []) =>
			({ level, prestige, hasBuilding: (name: string) => buildings.includes(name) });
		const house = { requiredLevel: 4, prestigeDependency: 'blacksmith', replaces: 'shack' };
		expect(canBuild(house, village(3, 0, ['shack']))).toBe(false);
		expect(canBuild(house, village(4, 0, ['shack']))).toBe(true);
		expect(canBuild(house, village(4, 0))).toBe(false);
		// New Game+ keeps the keeper's level, so in practice the building is what holds it back
		expect(canBuild(house, village(4, 1, ['shack']))).toBe(false);
		expect(canBuild(house, village(4, 1, ['shack', 'blacksmith']))).toBe(true);
		expect(canBuild(house, village(3, 1, ['shack', 'blacksmith']))).toBe(false);
		expect(canBuild({ requires: 'tower' }, village(9, 0, ['tower']))).toBe(true);
	});
});

describe('combat', () => {
	it('lets the keeper hit harder with levels and a sword', () => {
		expect([1, 6, 7, 10, 13].map(strength)).toEqual([1, 1, 2, 3, 4]);
		expect(heroDamage(1, 0, 1)).toEqual({ damage: 1, usesSword: false });
		expect(heroDamage(10, 2, 4)).toEqual({ damage: 3 + 3, usesSword: true });
	});

	it('scales sword and shield charges with the smiths', () => {
		expect([1, 3, 4, 7].map(maxSword)).toEqual([3, 3, 5, 7]);
		expect([1, 2, 3, 4, 5].map(swordDamage)).toEqual([1, 2, 3, 3, 4]);
		expect(maxShield(2)).toBe(6);
	});

	it('takes blows on the ward first, then the shield', () => {
		expect(absorb(10, { health: 30, ward: 4, shield: 3, frozen: false }))
			.toEqual({ health: 27, ward: 0, shield: 0, frozen: false, warded: 4, blocked: 3 });
		expect(absorb(2, { health: 30, ward: 4, shield: 3, frozen: false }))
			.toEqual({ health: 30, ward: 2, shield: 3, frozen: false, warded: 2, blocked: 0 });
		expect(absorb(100, { health: 5, ward: 0, shield: 0, frozen: false }).health).toBe(0);
	});

	it('halves blows while frozen', () => {
		expect(absorb(10, { health: 30, ward: 0, shield: 0, frozen: true }).health).toBe(25);
	});

	it('does nothing to a fallen keeper', () => {
		expect(absorb(10, { health: 0, ward: 4, shield: 3, frozen: false })).toMatchObject({ ward: 4, shield: 3 });
	});

	it('makes monsters tougher in New Game+ and softer in casual mode', () => {
		expect(monsterMultiplier(0)).toBe(1);
		expect(monsterMultiplier(2)).toBe(2);
		expect(dragonMultiplier(1)).toBe(1);
		expect(monsterStat(5, 1.5, false)).toBe(7.5);
		expect(monsterStat(5, 1, true)).toBe(3);
	});
});
