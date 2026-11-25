import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceFlights } from '../src/ui/flights.ts';
import { Notices } from '../src/ui/notices.ts';
import { heartShares, heartsFor, StatusBar } from '../src/ui/status.ts';

// A board with the world in it, as the game lays them out
function page() {
	document.body.innerHTML = '<div class="gameBoard"><div class="world"></div></div>';
	const board = document.querySelector('.gameBoard') as HTMLElement;
	const world = document.querySelector('.world') as HTMLElement;
	return { board, world, status: new StatusBar(board, world) };
}

const widthOf = (element: Element | null | undefined) => (element as HTMLElement).style.width;

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('the keeper’s status', () => {
	it('takes a heart for every ten health, big hearts past fourteen', () => {
		expect(heartsFor(30)).toEqual({ total: 3, big: 0 });
		expect(heartsFor(25)).toEqual({ total: 3, big: 0 });
		expect(heartsFor(170)).toEqual({ total: 14, big: 3 });
	});

	it('fills the hearts from the last one back, a big one holding twice as much', () => {
		expect(heartShares(25, { total: 3, big: 0 })).toEqual([0.5, 1, 1]);
		expect(heartShares(0, { total: 2, big: 0 })).toEqual([0, 0]);
		expect(heartShares(30, { total: 3, big: 1 })).toEqual([0.5, 1, 1]);
	});

	it('pops up new hearts one after another, each as full as it is', () => {
		const { board, status } = page();
		status.setHealth(25, 30);
		const hearts = [...board.querySelectorAll('.statusContainer > .hearts > div')];
		expect(hearts.map((heart) => heart.className)).toEqual(['heart prepop', 'heart prepop', 'heart prepop']);
		expect(hearts.map((heart) => widthOf(heart.querySelector('.bar')))).toEqual(['50%', '100%', '100%']);
		vi.advanceTimersByTime(100);
		expect(board.querySelectorAll('.hearts > .prepop')).toHaveLength(1);
		vi.advanceTimersByTime(100);
		expect(board.querySelectorAll('.hearts > .prepop')).toHaveLength(0);
		status.setHealth(0, 30);
		expect(hearts.every((heart) => heart.classList.contains('empty'))).toBe(true);
		expect(status.numHearts()).toBe(3);
	});

	it('turns the first hearts big once there are too many', () => {
		const { board, status } = page();
		status.setHealth(160, 160);
		const hearts = [...board.querySelectorAll('.hearts > div')];
		expect(hearts).toHaveLength(14);
		expect(hearts.slice(0, 3).map((heart) => heart.classList.contains('bigheart'))).toEqual([true, true, false]);
	});

	it('shows the shield beside the hearts once it holds something, and puts it away once it is gone', () => {
		const { board, status } = page();
		status.setHealth(10, 10);
		status.setShield(3, 4);
		const shield = board.querySelector('.statusContainer > .shield') as HTMLElement;
		expect(shield.previousElementSibling?.className).toBe('hearts');
		expect(shield.classList.contains('prepop')).toBe(true);
		expect(widthOf(shield.firstElementChild)).toBe('75%');
		vi.advanceTimersByTime(100);
		expect(shield.className).toBe('shield');
		status.setShield(0, 4);
		expect(shield.className).toBe('shield hidden');
		expect(widthOf(shield.firstElementChild)).toBe('0%');
		vi.advanceTimersByTime(300);
		expect(shield.className).toBe('shield prepop');
	});

	it('fills the experience bar, and shows it a moment later', () => {
		const { board, status } = page();
		status.setExperience(3, 12);
		const bar = board.querySelector('.xpBar') as HTMLElement;
		expect(bar.className).toBe('xpBar litBorder hidden');
		expect((bar.querySelector('.fill') as HTMLElement).style.height).toBe('25%');
		vi.advanceTimersByTime(100);
		expect(bar.className).toBe('xpBar litBorder');
		expect(bar.querySelector('.fill')?.className).toBe('fill');
	});

	it('shows the ward only while some of it is left', () => {
		const { board, status } = page();
		status.setWard(6, 8);
		const ward = board.querySelector('.statusContainer > .ward') as HTMLElement;
		expect(ward.className).toBe('ward');
		expect((ward.querySelector('.fill') as HTMLElement).style.height).toBe('75%');
		expect(ward.querySelector('.wardValue')?.textContent).toBe('6');
		status.setWard(0, 8);
		expect(ward.className).toBe('ward hidden');
	});

	it('shows tonight’s omen and blessing until they are cleared', () => {
		const { board, status } = page();
		status.showBadge('Red moon', 'Tonight: Ember');
		expect(board.querySelector('.blessingBadge')?.textContent).toBe('Red moonTonight: Ember');
		status.showBadge('Still night', null);
		expect([...board.querySelectorAll('.blessingBadge > div')].map((line) => line.className)).toEqual(['badgeOmen']);
		status.clearBadge();
		expect(board.querySelector('.blessingBadge')).toBeNull();
	});

	it('slides a boss’s health bar in over the world, and away once it is beaten', () => {
		const { world, status } = page();
		status.setBossHealth(0, 0);
		expect(world.querySelector('.bossHealth')).toBeNull();
		status.setBossHealth(30, 40);
		const bar = world.querySelector('.bossHealth') as HTMLElement;
		expect(bar.className).toBe('bossHealth');
		expect(widthOf(bar.firstElementChild)).toBe('75%');
		status.setBossHealth(0, 40);
		expect(bar.className).toBe('bossHealth noshow');
		// A boss beaten for good leaves no bar behind
		status.setBossHealth(0, 0);
		vi.advanceTimersByTime(1000);
		expect(world.querySelector('.bossHealth')).toBeNull();
	});
});

describe('the notices', () => {
	it('show the day a moment after it breaks, then fade it away', () => {
		const { board, world } = page();
		const notices = new Notices(world, board);
		notices.dayBreak('Day 3');
		expect(world.querySelector('.dayNotifier')).toBeNull();
		vi.advanceTimersByTime(1400);
		expect(world.querySelector('.dayNotifier')?.textContent).toBe('Day 3');
		vi.advanceTimersByTime(1600);
		expect(world.querySelector('.dayNotifier')?.className).toBe('dayNotifier hidden');
		vi.advanceTimersByTime(500);
		expect(world.querySelector('.dayNotifier')).toBeNull();
	});

	it('show dusk falling at once', () => {
		const { board, world } = page();
		new Notices(world, board).dusk('Dusk');
		expect(world.querySelector('.duskNotifier')?.textContent).toBe('Dusk');
		vi.advanceTimersByTime(2500);
		expect(world.querySelector('.duskNotifier')).toBeNull();
	});

	it('keep one chain pop-up at a time, and bounties for their own time', () => {
		const { board, world } = page();
		const notices = new Notices(world, board);
		notices.chainCombo('Chain 2');
		notices.chainCombo('Chain 3');
		expect([...board.querySelectorAll('.chainPopup')].map((popup) => popup.textContent)).toEqual(['Chain 3']);
		notices.bounty('Bounty');
		vi.advanceTimersByTime(1200);
		expect(board.querySelector('.chainPopup')).toBeNull();
		expect(board.querySelector('.bountyPopup')).not.toBeNull();
		vi.advanceTimersByTime(800);
		expect(board.querySelector('.bountyPopup')).toBeNull();
	});
});

describe('the resources flying off the board', () => {
	it('fly from the middle of a cell to where they go, shrinking, and are used again', () => {
		const { board } = page();
		const flights = new ResourceFlights(board, 60);
		flights.send(2, 3, 'wood', [32, -20]);
		const square = board.querySelector('.resourceEffect') as HTMLElement;
		expect(square.className).toBe('resourceEffect wood');
		expect(square.style.transform).toBe('translate3d(32px, -20px, 0px) scale(0.2)');
		vi.advanceTimersByTime(700);
		expect(square.className).toBe('resourceEffect pooled');
		flights.send(0, 0, 'grain', [-20, 10]);
		expect(board.querySelectorAll('.resourceEffect')).toHaveLength(1);
		expect(square.className).toBe('resourceEffect grain');
	});
});
