// The keeper's records, opened from the menu: the journal, every chapter told so far
// to read again, and the bestiary, every monster met with what Sera said of it. A
// record opens over the game, and closes with its button; the list scrolls, and
// nothing behind it reacts while it is open.

import { element, onPress, settle } from './dom.ts';
import { iconImage, iconPosition } from './icons.ts';
import { SPRITES } from '../content/sprites.ts';

// A chapter in the journal: the day it was told, and its lines
export interface JournalEntry {
	day: string;
	lines: { who: string; say: string }[];
}

// A monster in the bestiary. One not met yet is only a shadow, with no name.
export interface BestiaryEntry {
	known: boolean;
	name: string;
	stats: string;
	line: string;
	// Its picture: a frame of its sprite, or a boss's own picture from the style sheet
	sprite?: string;
	boss?: string;
}

const FADE_MS = 500;
const TAP = ['click', 'touchstart'];
// A picture is at most this big
const PICTURE = 56;

// Opens a record over the game; onClose once it is closed
export function openRecord(parent: HTMLElement, title: string, list: HTMLElement, close: string, onClose: () => void): HTMLElement {
	list.classList.add('recordsList');
	const button = element('div', 'recordsClose litBorder', close);
	const panel = element('div', 'records hidden', element('div', 'recordsTitle', title), list, button);
	const listening = new AbortController();
	onPress(button, () => {
		if (listening.signal.aborted) {
			return false;
		}
		listening.abort();
		panel.classList.add('hidden');
		setTimeout(() => panel.remove(), FADE_MS);
		onClose();
		return false;
	}, TAP);
	// Scrolling the list is fine; nothing behind it reacts
	for (const type of TAP) {
		panel.addEventListener(type, (event) => event.stopPropagation(), { signal: listening.signal });
	}
	parent.append(panel);
	settle(panel);
	panel.classList.remove('hidden');
	return panel;
}

// The journal's chapters, newest first
export function journalList(entries: JournalEntry[], empty: string): HTMLElement {
	if (entries.length === 0) {
		return element('div', '', element('div', 'recordsEmpty', empty));
	}
	return element('div', '', ...entries.map((entry) => element('div', 'recordsEntry',
		element('div', 'recordsDay', entry.day),
		...entry.lines.map((line) => element('div', 'recordsLine', element('b', '', line.who + '：'), element('span', '', line.say))))));
}

// The bestiary's monsters, then its bosses
export function bestiaryList(entries: BestiaryEntry[]): HTMLElement {
	return element('div', '', ...entries.map((entry) => {
		const text = element('div', 'recordsText', element('div', 'recordsName', entry.known ? entry.name : '？？？'));
		if (entry.known) {
			text.append(element('div', 'recordsStats', entry.stats), element('div', 'recordsLine', entry.line));
		}
		return element('div', 'recordsEntry recordsMonster' + (entry.known ? '' : ' unknown'), picture(entry), text);
	}));
}

// A monster's picture: walking, from its sprite, made small enough to fit
function picture(entry: BestiaryEntry): HTMLElement {
	if (entry.boss !== undefined) {
		return element('div', 'recordsPicture boss ' + entry.boss);
	}
	const frame = entry.known && entry.sprite !== undefined ? SPRITES[entry.sprite] : undefined;
	if (frame === undefined || entry.sprite === undefined) {
		return element('div', 'recordsPicture');
	}
	const sprite = element('div', 'recordsSprite');
	sprite.style.width = frame.width + 'px';
	sprite.style.height = frame.height + 'px';
	sprite.style.backgroundImage = iconImage(entry.sprite);
	sprite.style.backgroundPosition = iconPosition({ sprite: entry.sprite, row: 1 });
	sprite.style.transform = 'scale(' + Math.min(1, PICTURE / Math.max(frame.width, frame.height)) + ')';
	return element('div', 'recordsPicture', sprite);
}
