// The end of the game, once the last ending is told: everything the keeper did,
// counted up, and the choice to play on, or to begin again knowing what they know
// (new game plus). It comes down over the page, and goes back up once chosen.

import { element, onPress, settle } from './dom.ts';

export interface EndTexts {
	clear: string;
	continue: string;
	newGamePlus: string;
}

const TAP = ['click', 'touchstart'];

export class EndScreen {
	private panel: HTMLElement | null = null;

	constructor(
		private readonly page: HTMLElement,
		private readonly texts: EndTexts,
		private readonly onContinue: () => void,
		private readonly onNewGamePlus: () => void,
	) {}

	// Comes down with the counts of the game, each with its label
	show(counts: [string, string | number][]): void {
		const panel = this.endGame();
		(panel.querySelector('ul.counts') as HTMLElement).replaceChildren(...counts.map(([label, value]) =>
			element('li', '', element('span', '', String(label)), element('span', '', String(value)))));
		panel.classList.add('down');
	}

	hide(): void {
		this.panel?.classList.remove('down');
	}

	private endGame(): HTMLElement {
		if (this.panel === null) {
			const playOn = element('li', '', this.texts.continue);
			const again = element('li', '', this.texts.newGamePlus);
			onPress(playOn, () => this.onContinue(), TAP);
			onPress(again, () => this.onNewGamePlus(), TAP);
			const panel = this.panel = element('div', '',
				element('h2', '', this.texts.clear), element('ul', 'menu', playOn, again), element('ul', 'counts'));
			panel.id = 'endGame';
			this.page.append(panel);
			settle(panel);
		}
		return this.panel;
	}
}
