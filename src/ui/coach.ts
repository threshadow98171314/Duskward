// The ring the tutorial draws around what it points at. The target is given as a
// function that says where on the screen it is now (or null, to hide the ring), and
// the ring follows it every frame, keeping up with what moves, such as the sun, and
// with the page being resized or scaled.

import { element } from './dom.ts';

export interface ScreenRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

// The ring stands this far out from what it surrounds
const MARGIN = 4;

// The smallest box that holds all the given ones; null if there are none
export function around(rects: (ScreenRect | null)[]): ScreenRect | null {
	const all = rects.filter((rect): rect is ScreenRect => rect !== null);
	if (all.length === 0) {
		return null;
	}
	const left = Math.min(...all.map((rect) => rect.left));
	const top = Math.min(...all.map((rect) => rect.top));
	const right = Math.max(...all.map((rect) => rect.left + rect.width));
	const bottom = Math.max(...all.map((rect) => rect.top + rect.height));
	return { left, top, width: right - left, height: bottom - top };
}

export class CoachRing {
	private readonly ring: HTMLElement;
	private target: (() => ScreenRect | null) | null = null;
	private frame = 0;

	constructor(document: Document) {
		this.ring = element('div', 'coachRing hidden');
		document.body.append(this.ring);
	}

	// Puts the ring around a target from now on; null takes it away
	follow(target: (() => ScreenRect | null) | null): void {
		cancelAnimationFrame(this.frame);
		this.target = target;
		if (target === null) {
			this.ring.classList.add('hidden');
			return;
		}
		const step = () => {
			this.place();
			this.frame = requestAnimationFrame(step);
		};
		step();
	}

	// Moves the ring around where its target is now
	place(): void {
		const rect = this.target?.() ?? null;
		if (rect === null) {
			this.ring.classList.add('hidden');
			return;
		}
		this.ring.style.left = rect.left - MARGIN + 'px';
		this.ring.style.top = rect.top - MARGIN + 'px';
		this.ring.style.width = rect.width + 2 * MARGIN + 'px';
		this.ring.style.height = rect.height + 2 * MARGIN + 'px';
		this.ring.classList.remove('hidden');
	}

	remove(): void {
		cancelAnimationFrame(this.frame);
		this.ring.remove();
	}
}
