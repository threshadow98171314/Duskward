import { afterEach, expect, it, vi } from 'vitest';
import EventManager from '../src/app/eventmanager.js';
import Content from '../src/app/gamecontent.js';
import GameState from '../src/app/gamestate.js';
import Loot from '../src/app/loot.js';

afterEach(() => {
	vi.restoreAllMocks();
});

// Opens a chest with the given random rolls: shard, rarity, then the item in the pool
function open(rolls: number[]): string {
	EventManager.init();
	GameState.create();
	Loot.init();
	let found = '';
	EventManager.bind('lootGained', (name: string) => { found = name; });
	const random = vi.spyOn(Math, 'random');
	rolls.forEach((roll) => random.mockReturnValueOnce(roll));
	EventManager.trigger('pickupLoot', [{ options: {}, gone: false }, 1]);
	return found;
}

it('picks evenly within a loot pool, however many items it holds', () => {
	const pools = Content.lootPools as Record<string, string[]>;
	const common = pools.common;
	pools.common = ['healthPotion', 'manaPotion', 'bomb'];
	try {
		expect(open([0.99, 0.9, 0.1])).toBe('healthPotion');
		expect(open([0.99, 0.9, 0.5])).toBe('manaPotion');
		// The original compared against "11" / 3 here and never reached the last item
		expect(open([0.99, 0.9, 0.7])).toBe('bomb');
	} finally {
		pools.common = common;
	}
});

it('picks the rarity first', () => {
	expect(open([0.99, 0.05, 0])).toBe('bomb');
	expect(open([0.99, 0.2, 0])).toBe('equipment');
	expect(open([0.99, 0.5, 0])).toBe('healthPotion');
});
