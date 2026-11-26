// The story on screen, one box at a time: the pages of the opening and the ending,
// over the whole game; Sera's journal entries; and lines of dialogue, each beside
// the speaker's portrait. A box waits its turn behind the ones before it. A line goes
// away by itself after a while, or when it is pressed; a line that asks the keeper to
// choose waits, and holds the game, until an answer is pressed. The tutorial's boxes
// wait their turn too, and stay up, without holding the game, until what they ask is done.

import { element, onPress, pressedIn, settle } from './dom.ts';
import { iconImage, iconPosition } from './icons.ts';

// A line of dialogue: who says it and their portrait (a frame of the portrait sheet),
// what they say, and the answers to choose from, if any
export interface DialogueLine {
	speaker: string;
	portrait: number;
	text: string;
	choices?: string[];
}

// A box of the tutorial: a line of dialogue that stays up until what it asks is done.
// One that asks nothing has a button to go on; every one has a button that stops
// the tutorial. It sits over the world, or below, at the bottom of the board, out
// of the way of what it points at in the world.
export interface CoachLine {
	speaker: string;
	portrait: number;
	text: string;
	next?: string;
	skip: string;
	below?: boolean;
}

// How a box of the tutorial went: its buttons, or closed by the game
export type CoachEnd = 'next' | 'skip' | 'closed';

export interface StoryOptions {
	tapToContinue: string;
	// How long a line stays up for each character, on top of a few seconds
	msPerCharacter: number;
	// The game waits while the keeper chooses
	hold: () => void;
	letGo: () => void;
}

const FADE_MS = 500;
const SHOWN_MS = 6000;
const TAP = ['click', 'touchstart'];

export class StoryBoxes {
	private readonly queue: ((done: () => void) => void)[] = [];
	private readonly boxes = new Set<HTMLElement>();
	private readonly timers = new Set<number>();
	private busy = false;
	// Bumped when everything is cleared away, so nothing left over carries on
	private round = 0;

	constructor(private readonly parent: HTMLElement, private readonly options: StoryOptions) {}

	// Shows something once what was shown before it is done
	enqueue(show: (done: () => void) => void): void {
		this.queue.push(show);
		this.next();
	}

	// Pages over the whole game, turned by pressing it; done after the last one
	intro(pages: string[], done: () => void, className = ''): void {
		let page = 0;
		const text = element('div', 'storyText', pages[0] ?? '');
		const box = this.show(element('div', ('storyIntro hidden ' + className).trim(),
			text, element('div', 'storyHint', this.options.tapToContinue)));
		const listening = new AbortController();
		onPress(box, () => {
			page++;
			if (page >= pages.length) {
				listening.abort();
				this.fadeOut(box, done);
			} else {
				text.classList.add('hidden');
				this.later(() => {
					text.textContent = pages[page] ?? '';
					text.classList.remove('hidden');
				}, FADE_MS);
			}
			return false;
		}, TAP, listening.signal);
		this.fadeIn(box);
	}

	// A journal entry from Sera
	journal(speaker: string, text: string, done: () => void): void {
		const box = this.show(element('div', 'journal hidden',
			element('div', 'journalSpeaker', speaker), element('div', 'journalText', text)));
		this.closeInTime(box, text, done);
		this.fadeIn(box);
	}

	// A line of dialogue; done with the number of the answer chosen, or null
	line(line: DialogueLine, done: (choice: number | null) => void): void {
		const portrait = element('div', 'dialoguePortrait');
		portrait.style.backgroundImage = iconImage('portrait');
		portrait.style.backgroundPosition = iconPosition({ sprite: 'portrait', frame: line.portrait });
		const body = element('div', 'dialogueBody',
			element('div', 'journalSpeaker', line.speaker), element('div', 'journalText', line.text));
		const box = this.show(element('div', 'journal dialogue hidden', portrait, body));
		const choices = line.choices ?? [];
		if (choices.length === 0) {
			this.closeInTime(box, line.text, () => done(null));
		} else {
			this.options.hold();
			body.append(element('div', 'dialogueChoices', ...choices.map((say, i) => {
				const answer = element('div', 'dialogueChoice litBorder', say);
				answer.dataset.choice = String(i);
				return answer;
			})));
			const listening = new AbortController();
			onPress(box, (event) => {
				const answer = pressedIn(box, event, '.dialogueChoice');
				if (answer !== null) {
					listening.abort();
					this.options.letGo();
					this.fadeOut(box, () => done(Number(answer.dataset.choice)));
				}
				return false;
			}, TAP, listening.signal);
		}
		this.fadeIn(box);
	}

	// A box of the tutorial; done says how it went. Returns what closes it, for the
	// game to call once what it asks is done.
	coach(line: CoachLine, done: (end: CoachEnd) => void): () => void {
		const portrait = element('div', 'dialoguePortrait');
		portrait.style.backgroundImage = iconImage('portrait');
		portrait.style.backgroundPosition = iconPosition({ sprite: 'portrait', frame: line.portrait });
		const buttons = element('div', 'coachButtons');
		if (line.next !== undefined) {
			buttons.append(element('div', 'coachNext litBorder', line.next));
		}
		buttons.append(element('div', 'coachSkip', line.skip));
		const body = element('div', 'dialogueBody',
			element('div', 'journalSpeaker', line.speaker), element('div', 'journalText', line.text), buttons);
		const box = this.show(element('div', 'journal dialogue coach hidden' + (line.below ? ' below' : ''), portrait, body));
		const listening = new AbortController();
		let closed = false;
		const close = (end: CoachEnd) => {
			if (!closed) {
				closed = true;
				listening.abort();
				this.fadeOut(box, () => done(end));
			}
		};
		onPress(box, (event) => {
			if (pressedIn(box, event, '.coachNext') !== null) {
				close('next');
			} else if (pressedIn(box, event, '.coachSkip') !== null) {
				close('skip');
			}
			return false;
		}, TAP, listening.signal);
		this.fadeIn(box);
		return () => close('closed');
	}

	// Forgets what waits its turn, and takes away whatever is on screen
	clear(): void {
		this.round++;
		this.queue.length = 0;
		this.busy = false;
		this.timers.forEach((timer) => clearTimeout(timer));
		this.timers.clear();
		this.boxes.forEach((box) => box.remove());
		this.boxes.clear();
	}

	private next(): void {
		if (this.busy || this.queue.length === 0) {
			return;
		}
		const show = this.queue.shift() as (done: () => void) => void;
		this.busy = true;
		const round = this.round;
		show(() => {
			if (round === this.round) {
				this.busy = false;
				this.next();
			}
		});
	}

	// A box goes away after a while, the longer the more it says, or when pressed
	private closeInTime(box: HTMLElement, text: string, done: () => void): void {
		const listening = new AbortController();
		const close = () => {
			listening.abort();
			clearTimeout(timer);
			this.timers.delete(timer);
			this.fadeOut(box, done);
		};
		const timer = this.later(close, SHOWN_MS + text.length * this.options.msPerCharacter);
		onPress(box, () => {
			close();
			return false;
		}, TAP, listening.signal);
	}

	private show(box: HTMLElement): HTMLElement {
		this.boxes.add(box);
		this.parent.append(box);
		return box;
	}

	private fadeIn(box: HTMLElement): void {
		settle(box);
		box.classList.remove('hidden');
	}

	private fadeOut(box: HTMLElement, done: () => void): void {
		box.classList.add('hidden');
		this.later(() => {
			box.remove();
			this.boxes.delete(box);
			done();
		}, FADE_MS);
	}

	// Runs something after a while, unless everything has been cleared away by then
	private later(run: () => void, ms: number): number {
		const round = this.round;
		const timer = window.setTimeout(() => {
			this.timers.delete(timer);
			if (round === this.round) {
				run();
			}
		}, ms);
		this.timers.add(timer);
		return timer;
	}
}
