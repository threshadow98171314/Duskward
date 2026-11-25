// The magic button beside the board, filling with mana and glowing once it is full.
// Pressed, it opens into the spells around it, if there is mana enough for one, and
// pressing a spell casts it; pressing anything else closes it. Beside it, the lasting
// effects of spells and skills, each flashing as it runs out.

import { element, onPress, pressedIn, settle } from './dom.ts';

const SHOW_MS = 100;
// The spells fade before they are put away
const CLOSE_MS = 200;
// A lasting effect flashes for its last few seconds
const EXPIRING_MS = 3000;

export class MagicMenu {
	private magic: HTMLElement | null = null;
	private spells: HTMLElement | null = null;
	private open = false;
	private putAway = 0;

	constructor(
		private readonly board: HTMLElement,
		private readonly spellNames: string[],
		// Whether there is mana enough to cast a spell
		private readonly canCast: () => boolean,
		private readonly onCast: (spell: string) => void,
	) {}

	// The mana: the button fills up, and glows once it is full. The button comes up
	// the first time.
	setMana(current: number, total: number): void {
		const button = this.button();
		button.classList.toggle('full', current === total);
		(button.querySelector(':scope > .inner > div') as HTMLElement).style.height = Math.ceil(current / total * 100) + '%';
	}

	// Something else was pressed: the spells close
	close(): void {
		this.toggle(null);
	}

	isOpen(): boolean {
		return this.open;
	}

	// Opens the spells around the button, or closes them
	private toggle(button: HTMLElement | null): void {
		let wasOpen = false;
		if (this.open) {
			wasOpen = button !== null && button.classList.contains('open');
			this.magic?.querySelectorAll('.button.open').forEach((open) => open.classList.remove('open'));
			const spells = this.spellList();
			this.putAway = window.setTimeout(() => spells.remove(), CLOSE_MS);
			this.open = false;
		}
		if (button !== null && !wasOpen && this.canCast()) {
			clearTimeout(this.putAway);
			const spells = this.spellList();
			button.append(spells);
			settle(spells);
			button.classList.add('open');
			this.open = true;
		}
	}

	private button(): HTMLElement {
		if (this.magic === null) {
			const magic = this.magic = element('div', 'hidden magic',
				element('div', 'button litBorder', element('div', 'inner', element('div'))));
			this.board.append(magic);
			setTimeout(() => magic.classList.remove('hidden'), SHOW_MS);
			onPress(magic, (event) => {
				const button = pressedIn(magic, event, '.button');
				if (button === null) {
					return;
				}
				const spell = pressedIn(magic, event, '.spell');
				if (spell !== null) {
					// The spells fading away cannot be cast
					if (!this.open) {
						return false;
					}
					this.onCast(spell.dataset.spell ?? '');
				}
				this.toggle(button);
				return false;
			});
		}
		return this.magic.querySelector(':scope > .button') as HTMLElement;
	}

	private spellList(): HTMLElement {
		if (this.spells === null) {
			this.spells = element('div', 'spells', ...this.spellNames.map((name) => {
				const spell = element('div', name + ' litBorder spell');
				spell.dataset.spell = name;
				return spell;
			}));
		}
		return this.spells;
	}
}

// The lasting effects beside the magic button
export class LastingEffects {
	private column: HTMLElement | null = null;

	constructor(private readonly board: HTMLElement) {}

	// An effect starts, or starts over: its icon shows until it is over, flashing at the end
	add(className: string, duration: number): void {
		const column = this.states();
		column.querySelector(':scope > .' + className)?.remove();
		const icon = element('div', className);
		column.append(icon);
		setTimeout(() => icon.classList.add('expiring'), duration - EXPIRING_MS);
		setTimeout(() => icon.remove(), duration);
	}

	// An effect is cut short
	remove(className: string): void {
		this.states().querySelector(':scope > .' + className)?.remove();
	}

	private states(): HTMLElement {
		if (this.column === null) {
			this.column = element('div', 'states');
			this.board.append(this.column);
		}
		return this.column;
	}
}
