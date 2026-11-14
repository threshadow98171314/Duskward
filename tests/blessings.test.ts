import { describe, expect, it } from 'vitest';
import en from '../src/app/locale/en.js';
import zhTW from '../src/app/locale/zh-TW.js';
import { BLESSINGS } from '../src/content/blessings.ts';
import { type BlessingDef, nightModifiers, offerBlessings } from '../src/core/blessings.ts';

const pool = BLESSINGS as Record<string, BlessingDef>;

describe('blessings', () => {
	it('sum up the gift and the price of a night', () => {
		expect(nightModifiers(pool.fullArms)).toEqual({
			fill: ['shield', 'sword', 'ward'], nightMoves: 0, monsterHealth: 1.25, monsterDamage: 0, spawns: 2, xp: 1, calm: false,
		});
		expect(nightModifiers(pool.morningStar)).toMatchObject({ nightMoves: -5, spawns: 2 });
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
