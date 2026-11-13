// Seedable random numbers.
//
// The rules draw from this instead of Math.random, so the same seed always plays
// out the same way: tests can check exact outcomes, and a game can be replayed.
// The generator is mulberry32, which keeps its whole state in one 32-bit number.

export interface Random {
	// A number from 0 up to (but not including) 1, like Math.random()
	next(): number;
	// A whole number from 0 up to (but not including) max
	int(max: number): number;
	// The current state; createRandom(state) continues the same sequence
	readonly state: number;
}

export function createRandom(seed: number = randomSeed()): Random {
	let state = seed >>> 0;
	const next = () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	return {
		next,
		int: (max) => Math.floor(next() * max),
		get state() {
			return state;
		},
	};
}

export function randomSeed(): number {
	return Math.floor(Math.random() * 4294967296);
}
