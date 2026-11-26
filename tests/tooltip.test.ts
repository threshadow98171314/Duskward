import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TIP_DELAY_MS, Tooltips } from '../src/ui/tooltip.ts';

function point(target: Element, type: string, x = 10, y = 10, pointerType = 'mouse') {
	target.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerType }));
}

describe('tips under the mouse', () => {
	let tips: Tooltips;
	let heart: HTMLElement, sword: HTMLElement, canvas: HTMLElement;
	const box = () => document.querySelector('.tooltip') as HTMLElement;
	const text = () => box().classList.contains('hidden') ? null : box().textContent;

	beforeEach(() => {
		vi.useFakeTimers();
		document.body.innerHTML = '<div id="game"><div class="hearts"><div class="heart"></div></div>' +
			'<div class="sword"></div><canvas class="board"></canvas></div>';
		heart = document.querySelector('.heart') as HTMLElement;
		sword = document.querySelector('.sword') as HTMLElement;
		canvas = document.querySelector('.board') as HTMLElement;
		tips = new Tooltips(document.getElementById('game') as HTMLElement);
		let health = 20;
		tips.add('.hearts', (hearts) => ({ key: hearts, tip: { title: 'Health ' + health++, lines: ['Eat grain'] } }));
		tips.add('.sword', () => null);
		// A canvas tells its parts apart by where the mouse is: left or right half
		tips.add('.board', (_, x) => ({ key: x < 50 ? 'left' : 'right', tip: { title: x < 50 ? 'Left' : 'Right' }, delay: 1000 }));
	});

	afterEach(() => {
		tips.remove();
		vi.useRealTimers();
	});

	it('comes up once the mouse rests on something, as it is then, and follows the mouse', () => {
		point(heart, 'pointermove', 100, 50);
		vi.advanceTimersByTime(TIP_DELAY_MS - 1);
		expect(text()).toBeNull();
		vi.advanceTimersByTime(1);
		expect(text()).toBe('Health 21Eat grain');
		expect(box().querySelector('.tipTitle')?.textContent).toBe('Health 21');
		expect([box().style.left, box().style.top]).toEqual(['116px', '66px']);
		point(heart, 'pointermove', 120, 60);
		expect(text()).toBe('Health 22Eat grain');
		expect(box().style.left).toBe('136px');
		expect(tips.showing()?.title).toBe('Health 23');
	});

	it('goes when the mouse moves off it, and waits again over something else', () => {
		point(canvas, 'pointermove', 10);
		vi.advanceTimersByTime(TIP_DELAY_MS);
		expect(text()).toBeNull();
		vi.advanceTimersByTime(1000 - TIP_DELAY_MS);
		expect(text()).toBe('Left');
		point(canvas, 'pointermove', 80);
		expect(text()).toBeNull();
		vi.advanceTimersByTime(1000);
		expect(text()).toBe('Right');
		// The first finder that matches decides, even when it finds nothing
		point(sword, 'pointermove');
		expect(text()).toBeNull();
		vi.advanceTimersByTime(2000);
		expect(text()).toBeNull();
		point(heart, 'pointermove');
		point(document.getElementById('game') as HTMLElement, 'pointerleave');
		vi.advanceTimersByTime(2000);
		expect(text()).toBeNull();
	});

	it('goes when pressed, and stays away until the mouse moves on to something else', () => {
		point(canvas, 'pointermove', 10);
		vi.advanceTimersByTime(1000);
		expect(text()).toBe('Left');
		point(canvas, 'pointerdown', 10);
		expect(text()).toBeNull();
		point(canvas, 'pointermove', 12);
		vi.advanceTimersByTime(2000);
		expect(text()).toBeNull();
		point(canvas, 'pointermove', 80);
		vi.advanceTimersByTime(1000);
		expect(text()).toBe('Right');
	});

	it('comes up only for a mouse', () => {
		point(heart, 'pointermove', 10, 10, 'touch');
		vi.advanceTimersByTime(2000);
		expect(text()).toBeNull();
	});

	it('keeps inside the window, flipping to the other side of the mouse near an edge', () => {
		Object.defineProperty(box(), 'offsetWidth', { value: 200 });
		Object.defineProperty(box(), 'offsetHeight', { value: 50 });
		point(heart, 'pointermove', window.innerWidth - 50, window.innerHeight - 20);
		vi.advanceTimersByTime(TIP_DELAY_MS);
		expect(box().style.left).toBe(window.innerWidth - 50 - 16 - 200 + 'px');
		expect(box().style.top).toBe(window.innerHeight - 20 - 16 - 50 + 'px');
	});
});
