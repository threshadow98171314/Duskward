import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EventManager from '../src/app/eventmanager.js';
import Content from '../src/app/gamecontent.js';
import GameBoard from '../src/app/gameboard.js';
import GameState from '../src/app/gamestate.js';
import BoardGraphics from '../src/app/graphics/gameboard.js';
import Graphics from '../src/app/graphics/graphics.js';
import StoryGraphics from '../src/app/graphics/story.js';
import WorldGraphics from '../src/app/graphics/world.js';
import TextStore from '../src/app/textStore.js';
import Tutorial from '../src/app/tutorial.js';

// The game's state, as far as the tutorial reads it
const state = GameState as unknown as { storySeen: Record<string, boolean>; storyLog: unknown[][] };

const texts = new TextStore('zh-TW');
const say = (key: string, ...args: unknown[]) => texts.get(key, ...(args as [])) as string;
const story = (id: string) => (texts.get('STORY') as Record<string, string>)[id] ?? (texts.get('JOURNAL') as Record<string, string>)[id];

const box = () => document.querySelector('#gameContainer > .journal') as HTMLElement | null;
const words = () => box()?.querySelector('.journalText')?.textContent ?? null;
const ring = () => document.querySelector('.coachRing') as HTMLElement;

function press(selector: string) {
	(box()?.querySelector(selector) as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
	// The box fades away before the next one comes up
	vi.advanceTimersByTime(500);
}

describe('the first day, shown step by step', () => {
	let hinted: unknown[][];
	let clock: { night: boolean; dusk: boolean; left: number; held: boolean };
	const bricklayer = { options: { type: Content.getBuildingType('bricklayer') } };

	beforeEach(() => {
		vi.useFakeTimers();
		document.body.innerHTML = '<div id="gameContainer"></div><div class="hearts"></div><canvas class="boardCanvas"></canvas>';
		vi.spyOn(Graphics, 'getText').mockImplementation((...args: unknown[]) => texts.get(...(args as [string])));
		vi.spyOn(Graphics, 'getLocale').mockReturnValue('zh-TW');
		hinted = [];
		vi.spyOn(GameBoard, 'hint').mockReturnValue([{ row: 2, column: 3 }, { row: 2, column: 4 }]);
		vi.spyOn(Graphics, 'hintMove').mockImplementation((...cells: unknown[]) => { hinted.push(cells); });
		vi.spyOn(BoardGraphics, 'cellRect').mockImplementation((cell: { row: number; column: number }) =>
			({ left: cell.column * 50, top: cell.row * 50, width: 50, height: 50 }));
		const toClient = (box: unknown) => box as { left: number; top: number; width: number; height: number };
		vi.spyOn(WorldGraphics, 'village').mockReturnValue({
			pileShownAt: () => 1, pileFrame: () => ({ left: 14, top: 75, width: 30, height: 30 }), toClient,
			barsOf: () => ({ left: 59, top: 90, width: 62, height: 22 }), outlineOf: () => ({ left: 60, top: 30, width: 60, height: 80 }),
		} as never);
		vi.spyOn(WorldGraphics, 'sky').mockReturnValue({ sun: () => ({ shown: true, x: 100, y: 10 }) } as never);
		clock = { night: false, dusk: false, left: 12, held: false };
		EventManager.init();
		StoryGraphics.init();
		Tutorial.init({ plan: () => ({ next: bricklayer, bars: [] }), clock: () => clock });
	});

	afterEach(() => {
		Tutorial.stop();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	// A new game: the opening has been told, and Sera asks
	function newGame() {
		GameState.create();
		EventManager.trigger('gameLoaded');
	}

	function answer(choice: number) {
		(box()?.querySelector('.dialogueChoice[data-choice="' + choice + '"]') as HTMLElement)
			.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		vi.advanceTimersByTime(500);
	}

	it('asks a new keeper first, and goes through the day and the night with them', () => {
		newGame();
		expect(words()).toBe(story('tutorialAsk'));
		// It takes the place of the first morning's journal entry
		expect(state.storySeen.day1).toBe(true);
		expect(state.storyLog).toContainEqual(['day1', 1]);
		answer(0);
		expect(words()).toBe(story('tutorialStart'));
		vi.advanceTimersByTime(20000);

		// Swap two tiles: the two to try nudge, ringed, until a move makes a line
		expect(Tutorial.step()).toBe('match');
		expect(words()).toBe(say('TUTORIAL_MATCH'));
		expect(box()?.querySelector('.coachNext')).toBeNull();
		expect(hinted).toEqual([[{ row: 2, column: 3 }, { row: 2, column: 4 }]]);
		expect([ring().style.left, ring().style.top, ring().style.width, ring().style.height]).toEqual(['146px', '96px', '108px', '58px']);
		vi.advanceTimersByTime(60000);
		expect(Tutorial.step()).toBe('match');
		EventManager.trigger('tilesCleared', [{ wood: 3 }, 'left', false]);
		expect(Tutorial.step()).toBe('match');
		EventManager.trigger('tilesCleared', [{ wood: 3 }, 'left', true]);
		vi.advanceTimersByTime(500);
		expect(hinted[1]).toEqual([null]);

		// The steps that only tell go on with their button
		expect(Tutorial.step()).toBe('hunger');
		expect(words()).toBe(say('TUTORIAL_HUNGER'));
		press('.coachNext');
		expect(Tutorial.step()).toBe('stockpile');
		expect(box()?.classList.contains('below')).toBe(true);
		expect(ring().style.left).toBe('10px');
		press('.coachNext');
		expect(Tutorial.step()).toBe('building');
		expect(words()).toBe(say('TUTORIAL_BUILDING', '製磚坊'));
		// Asking for the building first does as well as the button
		EventManager.trigger('prioritize');
		vi.advanceTimersByTime(500);
		expect(Tutorial.step()).toBe('sun');
		expect(words()).toBe(say('TUTORIAL_SUN', 12));
		press('.coachNext');

		// Then it waits for the night
		expect(Tutorial.step()).toBe('night');
		expect(box()).toBeNull();
		expect(ring().classList.contains('hidden')).toBe(true);
		EventManager.trigger('phaseChange', [true]);
		expect(words()).toBe(say('TUTORIAL_NIGHT'));
		press('.coachNext');
		expect(words()).toBe(say('TUTORIAL_END'));
		press('.coachNext');
		expect(Tutorial.step()).toBeNull();
		expect(box()).toBeNull();
	});

	it('tells a keeper who needs no showing around what the first morning brings', () => {
		newGame();
		answer(1);
		expect(words()).toBe(story('day1'));
		vi.advanceTimersByTime(30000);
		expect(box()).toBeNull();
		expect(Tutorial.step()).toBeNull();
	});

	it('stops when asked to', () => {
		newGame();
		answer(0);
		vi.advanceTimersByTime(20000);
		EventManager.trigger('tilesCleared', [{}, 'left', true]);
		vi.advanceTimersByTime(500);
		press('.coachSkip');
		expect(Tutorial.step()).toBeNull();
		expect(box()).toBeNull();
		EventManager.trigger('phaseChange', [true]);
		expect(box()).toBeNull();
	});

	it('goes on to the night once the day is over, whatever step it was on', () => {
		newGame();
		answer(0);
		vi.advanceTimersByTime(20000);
		EventManager.trigger('phaseChange', [true]);
		vi.advanceTimersByTime(500);
		expect(Tutorial.step()).toBe('night');
		expect(words()).toBe(say('TUTORIAL_NIGHT'));
		expect(hinted[1]).toEqual([null]);
	});

	it('does not ask in a game that has been loaded', () => {
		EventManager.trigger('gameLoaded');
		vi.advanceTimersByTime(30000);
		expect(box()).toBeNull();
	});
});
