import { describe, expect, it } from 'vitest';
import en from '../src/app/locale/en.js';
import zhTW from '../src/app/locale/zh-TW.js';
import { BLESSINGS } from '../src/content/blessings.ts';
import { OMENS, QUIET_OMEN } from '../src/content/omens.ts';
import { type BlessingDef, nightModifiers, offerBlessings } from '../src/core/blessings.ts';
import { type OmenDef, readOmen } from '../src/core/night.ts';

const pool = BLESSINGS as Record<string, BlessingDef>;

describe('blessings', () => {
	it('sum up the gift and the price of a night', () => {
		expect(nightModifiers(pool.fullArms)).toEqual({
			fill: ['shield', 'sword', 'ward'], nightMoves: 3, monsterHealth: 1, monsterDamage: 0, spawns: 1, xp: 1, calm: false,
			loot: 1, arrivals: [], chainCall: null,
		});
		// An omen adds to the blessing
		expect(nightModifiers(pool.valor, (OMENS as Record<string, OmenDef>).moonless.effects))
			.toMatchObject({ xp: 3, monsterHealth: 1.2, monsterDamage: 0, nightMoves: 3 });
		expect(nightModifiers(pool.stillNight)).toMatchObject({ calm: true, nightMoves: -5, xp: 0.5 });
		expect(nightModifiers(null)).toMatchObject({ fill: [], nightMoves: 0, monsterHealth: 1, spawns: 1, xp: 1, calm: false });
	});

	it('are offered three at a time, the same ones for the same day of the same game', () => {
		const offer = (day: number, seed = 42, altar = true) => offerBlessings(pool, { day, seed, altar });
		expect(offer(5)).toHaveLength(3);
		expect(offer(5)).toEqual(offer(5));
		const days = Array.from({ length: 20 }, (_, i) => offer(i + 5).join());
		expect(new Set(days).size).toBeGreaterThan(5);
	});

	it('wait until the village is ready for them', () => {
		for (let day = 1; day <= 40; day++) {
			const early = offerBlessings(pool, { day: Math.min(day, 2), seed: day, altar: false });
			expect(early).not.toContain('afterglowSpring');
			expect(early).not.toContain('stillNight');
			expect(early).not.toContain('fullArms');
		}
	});

	it('all have names in both languages', () => {
		for (const text of [zhTW, en] as { BLESSING_NAMES: Record<string, string> }[]) {
			for (const id of Object.keys(pool)) {
				expect(text.BLESSING_NAMES[id], id).toBeTypeOf('string');
			}
		}
	});
});

describe('the night director', () => {
	const omens = OMENS as Record<string, OmenDef>;
	const read = (day: number, level: number, seed: number, fellLastNight = false) =>
		readOmen(omens, { day, seed, level, fellLastNight, quiet: QUIET_OMEN });

	it('keeps the night after a fall quiet', () => {
		for (let seed = 0; seed < 50; seed++) {
			expect(read(10, 5, seed, true)).toBe('quiet');
		}
	});

	it('reads the same omen for the same day of the same game', () => {
		expect(read(9, 4, 123)).toBe(read(9, 4, 123));
	});

	it('waits for the right day before the harder omens', () => {
		for (let seed = 0; seed < 200; seed++) {
			expect(read(1, 1, seed)).toBe('quiet');
			expect(['quiet', 'mist', 'fallingStars']).toContain(read(2, 1, seed));
		}
	});

	it('sends harder nights to a keeper ahead of them', () => {
		const hard = (level: number) => Array.from({ length: 400 }, (_, seed) => read(12, level, seed))
			.filter((id) => omens[id].hard).length;
		expect(hard(12)).toBeGreaterThan(hard(2) * 1.5);
	});
});
