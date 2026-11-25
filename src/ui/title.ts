// The title screen: a slot for each saved game, showing the keeper's hearts and the
// day they reached (with a star for a game played past its ending), and buttons to
// copy the save out as a code or to delete it; an empty slot can bring a code in.
// Those buttons turn the slot over, and its back shows the code or takes it. Pressing
// a slot anywhere else starts that game, and the screen fades away.

import { element, onPress } from './dom.ts';
import { heartsFor } from './status.ts';

// A saved game, as its slot shows it
export interface SavedGame {
	maxHealth: number;
	day: number;
	prestiged: boolean;
}

export interface TitleTexts {
	newGame: string;
	import: string;
	export: string;
	delete: string;
	confirm: string;
	cancel: string;
	importCode: string;
	exportCode: string;
	areYouSure: string;
	importInvalid: string;
	day: (day: number) => string;
}

export interface TitleActions {
	choose(slot: number): void;
	exportCode(slot: number): string;
	// The game answers with replace() if the code held a save, else rejectImport()
	importCode(slot: number, code: string): void;
	remove(slot: number): void;
}

interface SlotButton {
	name: string;
	title: string;
	press: () => void;
}

// A slot takes this long to turn over, and the screen to fade
const FLIP_MS = 500;
const FADE_MS = 1000;
const TAP = ['click', 'touchstart'];

export class TitleScreen {
	private list: HTMLElement | null = null;

	constructor(
		private readonly screen: HTMLElement,
		private readonly texts: TitleTexts,
		private readonly actions: TitleActions,
	) {}

	// The game is ready: the spinner goes, and the subtitle and the slots come up.
	// Null is an empty slot.
	show(subtitle: string, slots: (SavedGame | null)[]): void {
		this.screen.querySelector('.saveSpinner')?.classList.add('hidden');
		if (this.screen.querySelector('.subtitle') === null) {
			this.screen.append(element('div', 'subtitle', subtitle));
		}
		this.list = element('ul', 'saveSlots', ...slots.map((saved, index) => this.slot(saved, index)));
		this.screen.append(this.list);
	}

	// A slot shows its game again, once a code was brought into it or it was deleted
	replace(index: number, saved: SavedGame | null): void {
		this.list?.children[index]?.replaceWith(this.slot(saved, index));
	}

	// The code brought in held no save: the slot says so, and keeps it to be fixed
	rejectImport(index: number): void {
		const label = this.list?.children[index]?.querySelector('.labelText');
		if (label) {
			label.textContent = this.texts.importInvalid;
		}
	}

	// The game is slow to load: a word about it, and a way to play without the music
	longLoad(text: string, noMusic: string, href: string): void {
		const link = element('a', 'nomusic', noMusic);
		link.href = href;
		this.screen.append(element('div', 'longload', text, link));
	}

	private slot(saved: SavedGame | null, index: number): HTMLElement {
		const front = element('div', 'slotSide');
		const back = element('div', 'infoSide');
		const slot = element('div', 'saveSlot', front, back);
		if (saved === null) {
			slot.classList.add('empty');
			front.append(this.texts.newGame);
			front.append(this.buttons([{ name: 'import', title: this.texts.import, press: () => this.bringIn(slot, back, index) }]));
		} else {
			const hearts = heartsFor(saved.maxHealth);
			for (let i = 0; i < hearts.total; i++) {
				front.append(element('div', 'full ' + (i < hearts.big ? 'bigheart' : 'heart'), element('div', 'mask')));
			}
			const day = element('div', 'day', this.texts.day(saved.day));
			if (saved.prestiged) {
				day.prepend(element('div', 'star'));
			}
			front.append(day, this.buttons([
				{ name: 'export', title: this.texts.export, press: () => this.copyOut(slot, back, index) },
				{ name: 'delete', title: this.texts.delete, press: () => this.askToDelete(slot, back, index) },
			]));
		}
		// The back only shows a code; pressing it starts nothing
		onPress(slot, (event) => {
			if (event.target instanceof Element && event.target.closest('.infoSide') !== null) {
				return;
			}
			this.actions.choose(index);
			this.screen.classList.add('hidden');
			setTimeout(() => this.screen.remove(), FADE_MS);
		}, TAP);
		return slot;
	}

	private buttons(buttons: SlotButton[]): HTMLElement {
		return element('ul', 'buttons', ...buttons.map(({ name, title, press }) => {
			const button = element('li', name);
			button.title = title;
			onPress(button, () => {
				press();
				return false;
			}, TAP);
			return button;
		}));
	}

	// The back of an empty slot takes a code to bring in
	private bringIn(slot: HTMLElement, back: HTMLElement, index: number): void {
		slot.classList.add('bigView', 'flipped');
		const code = element('textarea', 'exportCode');
		back.append(element('div', 'labelText', this.texts.importCode), code, this.buttons([
			{ name: 'confirm', title: this.texts.confirm, press: () => this.actions.importCode(index, code.value) },
			{ name: 'cancel', title: this.texts.cancel, press: () => this.turnBack(slot, back) },
		]));
	}

	// The back shows the save as a code to copy
	private copyOut(slot: HTMLElement, back: HTMLElement, index: number): void {
		slot.classList.add('bigView', 'flipped');
		const code = element('textarea', 'exportCode');
		code.value = this.actions.exportCode(index);
		code.readOnly = true;
		back.append(element('div', 'labelText', this.texts.exportCode), code, this.buttons([
			{ name: 'confirm', title: this.texts.confirm, press: () => this.turnBack(slot, back) },
		]));
	}

	private askToDelete(slot: HTMLElement, back: HTMLElement, index: number): void {
		slot.classList.add('confirmDelete', 'flipped');
		back.append(element('div', 'confirmText', this.texts.areYouSure), this.buttons([
			{ name: 'confirm', title: this.texts.confirm, press: () => {
				this.actions.remove(index);
				this.replace(index, null);
			} },
			{ name: 'cancel', title: this.texts.cancel, press: () => this.turnBack(slot, back) },
		]));
	}

	// The slot turns back over, and its back is cleared once it is out of sight
	private turnBack(slot: HTMLElement, back: HTMLElement): void {
		const empty = slot.classList.contains('empty');
		slot.classList.remove('flipped');
		setTimeout(() => {
			back.replaceChildren();
			slot.className = 'saveSlot' + (empty ? ' empty' : '');
		}, FLIP_MS);
	}
}
