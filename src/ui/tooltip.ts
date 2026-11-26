// Tips under the mouse: rest the mouse on something for a moment and a small box
// says what it is. Each part of the page that has tips gets a finder: given the
// element under the mouse (and where the mouse is, for a canvas), it tells what is
// there, as a key to tell it from what was there before, and its tip. The tip
// follows the mouse while it stays on the same thing, and goes when the mouse moves
// off it, presses it or leaves the page; after a press it stays away until the
// mouse moves on to something else. Only a mouse brings tips up: a finger has no
// hover, and a tap is a move in the game.

import { element } from './dom.ts';

// A tip: a heading, and a few lines under it
export interface Tip {
	title: string;
	lines?: string[];
}

export interface Found {
	key: unknown;
	tip: Tip;
	// How long the mouse rests before this tip comes up, if not the usual while
	delay?: number;
}

export type Finder = (target: HTMLElement, clientX: number, clientY: number) => Found | null;

export const TIP_DELAY_MS = 400;
// The box keeps this far below and to the right of the mouse, and inside the window
const OFFSET = 16;
const MARGIN = 4;

export class Tooltips {
	private readonly finders: { selector: string; find: Finder }[] = [];
	private readonly box: HTMLElement;
	private readonly listening = new AbortController();
	private current: unknown = null;
	private shown = false;
	private timer = 0;
	private pressed: unknown = null;
	private last: { x: number; y: number; target: HTMLElement | null } = { x: 0, y: 0, target: null };

	constructor(private readonly root: HTMLElement) {
		this.box = element('div', 'tooltip hidden');
		this.box.setAttribute('role', 'tooltip');
		root.ownerDocument.body.append(this.box);
		const signal = this.listening.signal;
		root.addEventListener('pointermove', (event) => this.move(event), { signal });
		root.addEventListener('pointerdown', () => this.press(), { signal, capture: true });
		root.addEventListener('pointerleave', () => this.leave(), { signal });
	}

	// Finds tips inside elements that match a selector. The first finder added whose
	// selector matches decides, even when it finds nothing there.
	add(selector: string, find: Finder): void {
		this.finders.push({ selector, find });
	}

	// The tip on screen, if there is one
	showing(): Tip | null {
		return this.shown ? this.tipOf(this.last.target) : null;
	}

	hide(): void {
		clearTimeout(this.timer);
		this.shown = false;
		this.current = null;
		this.box.classList.add('hidden');
	}

	remove(): void {
		this.hide();
		this.listening.abort();
		this.box.remove();
	}

	private find(target: HTMLElement | null, x: number, y: number): Found | null {
		for (const { selector, find } of this.finders) {
			const part = target?.closest<HTMLElement>(selector);
			if (part) {
				return find(part, x, y);
			}
		}
		return null;
	}

	private tipOf(target: HTMLElement | null): Tip | null {
		return this.find(target, this.last.x, this.last.y)?.tip ?? null;
	}

	private move(event: PointerEvent): void {
		if (event.pointerType !== 'mouse' || !(event.target instanceof HTMLElement)) {
			return;
		}
		this.last = { x: event.clientX, y: event.clientY, target: event.target };
		const found = this.find(event.target, event.clientX, event.clientY);
		if (found === null || found.key === this.pressed) {
			if (found === null) {
				this.pressed = null;
			}
			this.hide();
			return;
		}
		this.pressed = null;
		if (found.key !== this.current) {
			this.hide();
			this.current = found.key;
			this.timer = window.setTimeout(() => this.show(), found.delay ?? TIP_DELAY_MS);
		} else if (this.shown) {
			this.render(found.tip);
			this.place();
		}
	}

	// The mouse has rested: what is under it now, as it is now
	private show(): void {
		const found = this.find(this.last.target, this.last.x, this.last.y);
		if (found === null || found.key !== this.current) {
			this.hide();
			return;
		}
		this.render(found.tip);
		this.box.classList.remove('hidden');
		this.shown = true;
		this.place();
	}

	private press(): void {
		this.pressed = this.current;
		this.hide();
	}

	private leave(): void {
		this.pressed = null;
		this.hide();
	}

	private render(tip: Tip): void {
		this.box.replaceChildren(element('div', 'tipTitle', tip.title),
			...(tip.lines ?? []).map((line) => element('div', 'tipLine', line)));
	}

	// Below and to the right of the mouse; flipped to the other side near the edges
	private place(): void {
		const view = this.root.ownerDocument.defaultView;
		const width = this.box.offsetWidth, height = this.box.offsetHeight;
		let left = this.last.x + OFFSET, top = this.last.y + OFFSET;
		if (view !== null && left + width + MARGIN > view.innerWidth) {
			left = this.last.x - OFFSET - width;
		}
		if (view !== null && top + height + MARGIN > view.innerHeight) {
			top = this.last.y - OFFSET - height;
		}
		this.box.style.left = Math.max(MARGIN, left) + 'px';
		this.box.style.top = Math.max(MARGIN, top) + 'px';
	}
}
