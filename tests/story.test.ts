import { describe, expect, it } from 'vitest';
import en from '../src/app/locale/en.js';
import zhTW from '../src/app/locale/zh-TW.js';
import Content from '../src/app/gamecontent.js';
import GameState from '../src/app/gamestate.js';
import Story from '../src/app/story.js';
import { CHAPTERS, CHARACTERS, CONSEQUENCES } from '../src/content/story.ts';
import { type Chapter, chaptersFor, choose, consequences, type Line, type StoryState } from '../src/core/story.ts';

const state = (extra: Partial<StoryState> = {}): StoryState =>
	({ day: 1, level: 1, counts: {}, flags: {}, told: {}, ...extra });

describe('the story engine', () => {
	const chapters: Record<string, Chapter> = {
		dawn: { on: 'dayBreak', if: [{ arg: 3 }], lines: [] },
		later: { on: 'dayBreak', if: [{ argAtLeast: 5 }, { atLeastLevel: 4 }], lines: [] },
		stayed: { on: 'dayBreak', if: [{ flag: 'traveler', is: 'stayed' }], lines: [] },
		mourned: { on: 'gameLoaded', if: [{ count: 'DEATHS', atLeast: 1 }], lines: [] },
	};

	it('tells the chapters whose event happens and whose conditions hold', () => {
		expect(chaptersFor(chapters, 'dayBreak', 3, state())).toEqual(['dawn']);
		expect(chaptersFor(chapters, 'dayBreak', 6, state({ level: 3 }))).toEqual([]);
		expect(chaptersFor(chapters, 'dayBreak', 6, state({ level: 4 }))).toEqual(['later']);
		expect(chaptersFor(chapters, 'gameLoaded', undefined, state({ counts: { DEATHS: 1 } }))).toEqual(['mourned']);
	});

	it('tells each chapter once', () => {
		expect(chaptersFor(chapters, 'dayBreak', 3, state({ told: { dawn: true } }))).toEqual([]);
	});

	it('can ask for anything but one choice, and tell a chapter every time it comes up', () => {
		const ending: Record<string, Chapter> = {
			heart: { on: 'eclipseFalls', if: [{ flag: 'envoy', not: 'accepted' }], again: true, lines: [] },
		};
		expect(chaptersFor(ending, 'eclipseFalls', undefined, state())).toEqual(['heart']);
		expect(chaptersFor(ending, 'eclipseFalls', undefined, state({ told: { heart: true } }))).toEqual(['heart']);
		expect(chaptersFor(ending, 'eclipseFalls', undefined, state({ flags: { envoy: 'accepted' } }))).toEqual([]);
	});

	it('remembers choices as flags for later chapters', () => {
		const s = state();
		expect(chaptersFor(chapters, 'dayBreak', 1, s)).toEqual([]);
		choose(s, { say: 'travelerStay', set: { traveler: 'stayed' } });
		expect(chaptersFor(chapters, 'dayBreak', 1, s)).toEqual(['stayed']);
	});
});

describe('the story as written', () => {
	const lines = (all: Line[]): Line[] => all.flatMap((line) => [line, ...(line.choices ?? []).flatMap((c) => lines(c.reply ?? []))]);

	it('only starts on events the story listens to', () => {
		const events = new Set(Story.events());
		for (const [id, chapter] of Object.entries(CHAPTERS)) {
			expect(events, id + ' starts on ' + chapter.on).toContain(chapter.on);
		}
	});

	const endings = (chapters: string[]): unknown[] => chapters
		.flatMap((id) => lines(CHAPTERS[id].lines))
		.flatMap((line) => line.choices ?? [])
		.map((choice) => choice.set?.ending)
		.filter((ending) => ending !== undefined);

	it('asks what becomes of the Dawn Heart every time the Eclipse falls, offering the cult only to whoever bargained', () => {
		const offered = (flags: Record<string, string>): unknown[] => endings(chaptersFor(CHAPTERS, 'eclipseFalls', undefined,
			state({ flags, told: { heartChoice: true, heartChoiceCult: true } })));
		expect(offered({})).toEqual(['sky', 'valley']);
		expect(offered({ envoy: 'refused' })).toEqual(['sky', 'valley']);
		expect(offered({ envoy: 'accepted' })).toEqual(['sky', 'valley', 'cult']);
	});

	it('has pages in both languages for every ending a choice can lead to', () => {
		const all = [...new Set(endings(Object.keys(CHAPTERS)))] as string[];
		expect(all.sort()).toEqual(['cult', 'sky', 'valley']);
		for (const text of [zhTW, en] as { STORY_ENDINGS: Record<string, string[]> }[]) {
			for (const ending of all) {
				expect(text.STORY_ENDINGS[ending]?.length, ending).toBeGreaterThan(0);
			}
		}
	});

	it('keeps the old journal entries under the same names, so old saves remember them', () => {
		for (const id of ['day1', 'day40', 'firstNight', 'firstDeath', 'monster_zombie', 'monster_eclipsespawn', 'eclipse']) {
			expect(CHAPTERS, id).toHaveProperty([id]);
		}
	});

	it('has every line written in both languages, by someone with a name and a face', () => {
		for (const text of [zhTW, en] as { STORY: Record<string, string>; JOURNAL: Record<string, string>; CHARACTER_NAMES: Record<string, string> }[]) {
			for (const [id, chapter] of Object.entries(CHAPTERS)) {
				for (const line of lines(chapter.lines)) {
					expect(text.STORY[line.say] ?? text.JOURNAL[line.say], id + ': ' + line.say).toBeTypeOf('string');
					expect(CHARACTERS, line.who).toHaveProperty([line.who]);
					for (const choice of line.choices ?? []) {
						expect(text.STORY[choice.say], id + ': ' + choice.say).toBeTypeOf('string');
					}
				}
			}
			for (const who of Object.keys(CHARACTERS)) {
				expect(text.CHARACTER_NAMES[who], who).toBeTypeOf('string');
			}
		}
	});
});

describe('the consequences of choices', () => {
	it('follow from the flags the choices set', () => {
		expect(consequences(CONSEQUENCES, {})).toEqual([]);
		expect(consequences(CONSEQUENCES, { traveler: 'stayed' })).toEqual([{ type: 'nightfallSword', share: 0.5 }]);
		expect(consequences(CONSEQUENCES, { traveler: 'left', envoy: 'accepted' }).map((effect) => effect.type))
			.toEqual(['wardMax', 'bossHealth']);
	});

	it('shrink the ward for good once it is given to the cult', () => {
		GameState.create();
		const ward = GameState.maxWard();
		(GameState as unknown as { storyFlags: Record<string, string> }).storyFlags.envoy = 'accepted';
		expect(GameState.maxWard()).toBe(Math.max(0, ward - 5));
	});

	it('name every building the plan can offer, in both languages', () => {
		for (const text of [zhTW, en] as { BUILDING_NAMES: Record<string, string> }[]) {
			for (const building of Object.values(Content.BuildingType) as { className: string }[]) {
				const base = building.className.replace(/\d+$/, '');
				expect(text.BUILDING_NAMES[base], building.className).toBeTypeOf('string');
			}
		}
	});
});
