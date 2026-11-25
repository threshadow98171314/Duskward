// The items the keeper carries, as buttons beside the board: each with its icon,
// and a pip for each one held (a large item, of which there is only ever one, has
// none). The inventory fades in the first time there is something in it; pressing
// a button uses one of that item.

import { element, onPress, pressedIn } from './dom.ts';

const SHOW_MS = 100;

export class Inventory {
	private row: HTMLElement | null = null;

	constructor(private readonly board: HTMLElement, private readonly onUse: (item: string) => void) {}

	// How many of an item the keeper holds; its button comes up the first time
	set(item: string, count: number, large: boolean): void {
		const row = this.inventory();
		let button = row.querySelector<HTMLElement>(':scope > .button.' + item);
		if (button === null) {
			button = element('div', 'button litBorder ' + item, element('div'), element('div'));
			if (large) {
				button.classList.add('large');
			} else {
				button.append(element('div'), element('div'));
			}
			button.dataset.item = item;
			row.append(button);
		}
		button.classList.remove('charge_0', 'charge_1', 'charge_2', 'charge_3');
		button.classList.add('charge_' + count);
	}

	private inventory(): HTMLElement {
		if (this.row === null) {
			const row = this.row = element('div', 'hidden inventory litBorder');
			this.board.append(row);
			setTimeout(() => row.classList.remove('hidden'), SHOW_MS);
			onPress(row, (event) => {
				const button = pressedIn(row, event, '.button');
				if (button === null) {
					return;
				}
				this.onUse(button.dataset.item ?? '');
				return false;
			});
		}
		return this.row;
	}
}
