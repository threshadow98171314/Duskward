import { afterEach, describe, expect, it } from 'vitest';
import { around, CoachRing } from '../src/ui/coach.ts';

describe('the ring around what the tutorial points at', () => {
	let ring: CoachRing;

	afterEach(() => {
		ring.remove();
	});

	it('stands a little out from its target, and follows it as it moves', () => {
		ring = new CoachRing(document);
		const element = document.querySelector('.coachRing') as HTMLElement;
		let target: { left: number; top: number; width: number; height: number } | null = { left: 100, top: 50, width: 60, height: 30 };
		ring.follow(() => target);
		expect(element.className).toBe('coachRing');
		expect([element.style.left, element.style.top, element.style.width, element.style.height]).toEqual(['96px', '46px', '68px', '38px']);
		target = { left: 200, top: 50, width: 60, height: 30 };
		ring.place();
		expect(element.style.left).toBe('196px');
		// Out of sight while its target is nowhere, and gone once there is none
		target = null;
		ring.place();
		expect(element.classList.contains('hidden')).toBe(true);
		target = { left: 0, top: 0, width: 10, height: 10 };
		ring.place();
		expect(element.classList.contains('hidden')).toBe(false);
		ring.follow(null);
		expect(element.classList.contains('hidden')).toBe(true);
	});

	it('can go around several things at once', () => {
		ring = new CoachRing(document);
		expect(around([{ left: 10, top: 20, width: 30, height: 30 }, null, { left: 40, top: 15, width: 30, height: 30 }]))
			.toEqual({ left: 10, top: 15, width: 60, height: 35 });
		expect(around([null])).toBeNull();
	});
});
