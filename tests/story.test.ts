import { describe, expect, it } from 'vitest';
import en from '../src/app/locale/en.js';
import zhTW from '../src/app/locale/zh-TW.js';
import { CHAPTERS, CHARACTERS } from '../src/content/story.ts';
import { type Chapter, chaptersFor, choose, type Line, type StoryState } from '../src/core/story.ts';

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

	it('remembers choices as flags for later chapters', () => {
		const s = state();
		expect(chaptersFor(chapters, 'dayBreak', 1, s)).toEqual([]);
		choose(s, { say: 'travelerStay', set: { traveler: 'stayed' } });
		expect(chaptersFor(chapters, 'dayBreak', 1, s)).toEqual(['stayed']);
	});
});

describe('the story as written', () => {
	const lines = (all: Line[]): Line[] => all.flatMap((line) => [line, ...(line.choices ?? []).flatMap((c) => lines(c.reply ?? []))]);

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
