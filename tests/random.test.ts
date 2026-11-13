import { describe, expect, it } from 'vitest';
import { createRandom } from '../src/core/random.ts';

const take = (seed: number, count: number) => {
	const random = createRandom(seed);
	return Array.from({ length: count }, () => random.next());
};

describe('createRandom', () => {
	it('repeats the same sequence for the same seed', () => {
		expect(take(42, 20)).toEqual(take(42, 20));
	});

	it('gives different sequences for different seeds', () => {
		expect(take(1, 20)).not.toEqual(take(2, 20));
	});

	it('continues a sequence from its saved state', () => {
		const random = createRandom(7);
		random.next();
		random.next();
		const resumed = createRandom(random.state);
		expect(resumed.next()).toBe(random.next());
	});

	it('stays within range and spreads evenly', () => {
		const random = createRandom(123);
		const buckets = [0, 0, 0, 0];
		for (let i = 0; i < 20000; i++) {
			const value = random.next();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
			buckets[random.int(4)]++;
		}
		for (const count of buckets) {
			expect(count).toBeGreaterThan(4500);
			expect(count).toBeLessThan(5500);
		}
	});
});
