// Words that come up for a moment: over the world as day breaks or dusk falls, and
// over the board for a chain of matches or a bounty paid out

import { element } from './dom.ts';

// The day's number comes up once the sun has risen, stays a while, then fades
const DAY_AFTER_MS = 1400;
const DAY_FADES_AT_MS = 3000;
const DUSK_FADES_AT_MS = 2000;
const FADE_MS = 500;
const CHAIN_MS = 1200;
const BOUNTY_MS = 2000;

export class Notices {
	private chain: HTMLElement | null = null;

	constructor(private readonly world: HTMLElement, private readonly board: HTMLElement) {}

	// The number of the day that has broken
	dayBreak(text: string): void {
		this.over(this.world, element('div', 'dayNotifier', text), DAY_AFTER_MS, DAY_FADES_AT_MS);
	}

	// Dusk has fallen
	dusk(text: string): void {
		this.over(this.world, element('div', 'dayNotifier duskNotifier', text), 0, DUSK_FADES_AT_MS);
	}

	// A chain of matches; a longer one takes the place of the one before
	chainCombo(text: string): void {
		this.chain?.remove();
		const popup = this.chain = element('div', 'chainPopup', text);
		this.board.append(popup);
		setTimeout(() => {
			popup.remove();
			if (this.chain === popup) {
				this.chain = null;
			}
		}, CHAIN_MS);
	}

	// A bounty paid out for the tiles of a match
	bounty(text: string): void {
		const popup = element('div', 'bountyPopup', text);
		this.board.append(popup);
		setTimeout(() => popup.remove(), BOUNTY_MS);
	}

	// Shows a notice after a while, then fades it away by the time given
	private over(parent: HTMLElement, notice: HTMLElement, after: number, fadesAt: number): void {
		const show = () => parent.append(notice);
		if (after > 0) {
			setTimeout(show, after);
		} else {
			show();
		}
		setTimeout(() => notice.classList.add('hidden'), fadesAt);
		setTimeout(() => notice.remove(), fadesAt + FADE_MS);
	}
}
