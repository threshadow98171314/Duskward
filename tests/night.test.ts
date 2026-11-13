import { expect, it } from 'vitest';
import { CALLS } from '../src/content/monsters.ts';
import { chainCalls, nightfallCalls } from '../src/core/night.ts';

it('calls a shade when a night chain reaches three waves, once', () => {
	expect(chainCalls(CALLS, 2)).toEqual([]);
	expect(chainCalls(CALLS, 3)).toEqual(['shade']);
	expect(chainCalls(CALLS, 4)).toEqual([]);
});

it('gathers a growing flock of crows at nightfall from the third day', () => {
	const crows = (day: number) => nightfallCalls(CALLS, day).find((call) => call.monster === 'duskcrow')?.count ?? 0;
	expect([1, 2, 3, 6, 7, 11, 15, 40].map(crows)).toEqual([0, 0, 2, 2, 3, 4, 5, 5]);
});
