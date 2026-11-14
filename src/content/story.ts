// The story's chapters. Each is told once, when its event happens and its
// conditions hold. Lines name a character and a text id: the texts are in the
// locale files (STORY, or the older JOURNAL entries), and so are the characters'
// names (CHARACTER_NAMES).

import type { Chapter } from '../core/story.ts';

// Who can speak, and which picture on the portrait sheet is theirs
export const CHARACTERS = {
	sera: { portrait: 0 },
	keeper: { portrait: 1 },
	traveler: { portrait: 2 },
	envoy: { portrait: 3 },
} satisfies Record<string, { portrait: number }>;

// Sera's journal: one line by her, told after an event
function journal(on: string, say: string, options: Partial<Chapter> = {}): Chapter {
	return { on, lines: [{ who: 'sera', say }], delay: 1500, ...options };
}

// Her word on each day's dawn, after the "Day N" notice clears
const DAYS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 40];

const MONSTERS = ['zombie', 'rat', 'skeleton', 'hauntedArmour', 'lizardman', 'spider', 'earthElemental', 'fireElemental',
	'waterElemental', 'demon', 'warlock', 'imp', 'lich', 'shade', 'lampmoth', 'duskcrow', 'eclipsespawn'];

export const CHAPTERS: Record<string, Chapter> = {
	...Object.fromEntries(DAYS.map((day) => ['day' + day, journal('dayBreak', 'day' + day, { if: [{ arg: day }], delay: 3500 })])),

	// A traveler asks to stay. What the keeper decides comes back later.
	traveler: {
		on: 'dayBreak',
		if: [{ argAtLeast: 5 }],
		delay: 9000,
		lines: [
			{ who: 'sera', say: 'traveler1' },
			{ who: 'traveler', say: 'traveler2' },
			{
				who: 'sera', say: 'traveler3',
				choices: [
					{ say: 'travelerStay', set: { traveler: 'stayed' }, reply: [{ who: 'traveler', say: 'travelerThanks' }] },
					{ say: 'travelerLeave', set: { traveler: 'left' }, reply: [{ who: 'sera', say: 'travelerGone' }] },
				],
			},
		],
	},

	firstNight: journal('phaseChange', 'firstNight', { if: [{ arg: true }] }),
	firstDeath: journal('gameLoaded', 'firstDeath', { if: [{ count: 'DEATHS', atLeast: 1 }] }),
	level4: journal('levelUp', 'level4', { if: [{ arg: 4 }] }),
	level7: journal('levelUp', 'level7', { if: [{ arg: 7 }] }),
	level10: journal('levelUp', 'level10', { if: [{ arg: 10 }] }),
	firstShard: journal('lootGained', 'firstShard', { if: [{ arg: 'shard' }] }),
	dawnHeart: journal('lootGained', 'dawnHeart', { if: [{ arg: 'dawnHeart' }] }),
	magic: journal('enableMagic', 'magic'),
	firstDusk: journal('duskFall', 'firstDusk'),
	lighthouse: journal('buildingComplete', 'lighthouse', { if: [{ arg: 'lighthouse' }] }),
	altar: journal('buildingComplete', 'altar', { if: [{ arg: 'altar' }] }),
	firstPower: journal('powerCreated', 'firstPower'),
	skillReady: journal('gaugeFull', 'skillReady'),
	firstBounty: journal('bounty', 'firstBounty'),
	longChain: journal('chainCombo', 'longChain', { if: [{ argAtLeast: 6 }], delay: 0 }),
	dragon: journal('callDragon', 'dragon', { delay: 0 }),
	dragonDefeated: journal('dragonDefeated', 'dragonDefeated'),
	eclipse: journal('eclipseArrives', 'eclipse', { delay: 0 }),
	dawnHeartWaits: journal('dawnHeartWaits', 'dawnHeartWaits', { delay: 0 }),

	// The first time each kind of monster turns up, Sera says what it is
	...Object.fromEntries(MONSTERS.map((kind) => ['monster_' + kind, journal('monsterSpawned', 'monster_' + kind, { if: [{ arg: kind }] })])),
};
