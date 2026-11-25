import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Inventory } from '../src/ui/inventory.ts';
import { LastingEffects, MagicMenu } from '../src/ui/magic.ts';
import { SkillBar } from '../src/ui/skills.ts';

function board(): HTMLElement {
	document.body.innerHTML = '<div class="gameBoard"></div>';
	return document.querySelector('.gameBoard') as HTMLElement;
}

// Presses an element as the mouse would; whether the press went on to the page
function press(target: Element, type = 'mousedown'): boolean {
	let reachedPage = false;
	const onPage = () => {
		reachedPage = true;
	};
	document.body.addEventListener(type, onPage);
	target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
	document.body.removeEventListener(type, onPage);
	return reachedPage;
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('the inventory', () => {
	it('fades in with a button for each item, a pip for each one held', () => {
		const used: string[] = [];
		const inventory = new Inventory(board(), (item) => used.push(item));
		inventory.set('healthPotion', 2, false);
		inventory.set('dawnHeart', 1, true);
		const row = document.querySelector('.inventory') as HTMLElement;
		expect(row.className).toBe('hidden inventory litBorder');
		vi.advanceTimersByTime(100);
		expect(row.className).toBe('inventory litBorder');
		const [potion, heart] = [...row.children] as HTMLElement[];
		expect(potion.className).toBe('button litBorder healthPotion charge_2');
		expect(potion.children).toHaveLength(4);
		expect(heart.className).toBe('button litBorder dawnHeart large charge_1');
		expect(heart.children).toHaveLength(2);
		inventory.set('healthPotion', 1, false);
		expect(potion.className).toBe('button litBorder healthPotion charge_1');
	});

	it('uses an item pressed, and keeps the press to itself', () => {
		const used: string[] = [];
		const inventory = new Inventory(board(), (item) => used.push(item));
		inventory.set('bomb', 1, false);
		const bomb = document.querySelector('.button.bomb') as HTMLElement;
		expect(press(bomb.firstElementChild as Element)).toBe(false);
		expect(press(bomb, 'touchstart')).toBe(false);
		expect(used).toEqual(['bomb', 'bomb']);
		// Between the buttons, the press goes on
		expect(press(document.querySelector('.inventory') as Element)).toBe(true);
		expect(used).toHaveLength(2);
	});
});

describe('the magic button', () => {
	function magic(mana = { enough: true }) {
		const cast: string[] = [];
		const menu = new MagicMenu(board(), ['resetBoard', 'haste'], () => mana.enough, (spell) => cast.push(spell));
		menu.setMana(4, 10);
		return { menu, cast, button: document.querySelector('.magic > .button') as HTMLElement };
	}

	it('fills with mana, and glows once it is full', () => {
		const { menu, button } = magic();
		expect((button.querySelector('.inner > div') as HTMLElement).style.height).toBe('40%');
		expect(button.classList.contains('full')).toBe(false);
		menu.setMana(10, 10);
		expect(button.classList.contains('full')).toBe(true);
		expect(document.querySelector('.magic')?.className).toBe('hidden magic');
		vi.advanceTimersByTime(100);
		expect(document.querySelector('.magic')?.className).toBe('magic');
	});

	it('opens into the spells, casts the one pressed, and closes', () => {
		const { menu, cast, button } = magic();
		expect(press(button)).toBe(false);
		expect(menu.isOpen()).toBe(true);
		expect(button.className).toBe('button litBorder open');
		const haste = button.querySelector('.spell.haste') as HTMLElement;
		press(haste);
		expect(cast).toEqual(['haste']);
		expect(menu.isOpen()).toBe(false);
		// The spells fade before they are put away, and cannot be cast meanwhile
		press(haste);
		expect(cast).toEqual(['haste']);
		vi.advanceTimersByTime(200);
		expect(button.querySelector('.spells')).toBeNull();
	});

	it('stays shut without mana for a spell, and closes when something else is pressed', () => {
		const mana = { enough: false };
		const { menu, button } = magic(mana);
		press(button);
		expect(menu.isOpen()).toBe(false);
		mana.enough = true;
		press(button);
		expect(menu.isOpen()).toBe(true);
		menu.close();
		expect(button.classList.contains('open')).toBe(false);
	});

	it('keeps its spells when it opens again while they fade', () => {
		const { menu, button } = magic();
		press(button);
		menu.close();
		vi.advanceTimersByTime(100);
		press(button);
		vi.advanceTimersByTime(200);
		expect(menu.isOpen()).toBe(true);
		expect(button.querySelectorAll('.spells > .spell')).toHaveLength(2);
	});
});

describe('the lasting effects', () => {
	it('show while they last, flashing for the last three seconds, and start over when renewed', () => {
		const effects = new LastingEffects(board());
		effects.add('haste', 10000);
		const states = document.querySelector('.states') as HTMLElement;
		vi.advanceTimersByTime(7000);
		expect(states.querySelector('.haste')?.className).toBe('haste expiring');
		effects.add('haste', 10000);
		expect(states.children).toHaveLength(1);
		expect(states.querySelector('.haste')?.className).toBe('haste');
		effects.add('frozen', 8000);
		effects.remove('frozen');
		expect(states.querySelector('.frozen')).toBeNull();
		vi.advanceTimersByTime(10000);
		expect(states.children).toHaveLength(0);
	});
});

describe('the dusk skills', () => {
	it('show the skills that can be cast, ready once the gauge is full', () => {
		const cast: string[] = [];
		const skills = new SkillBar(board(), (skill) => cast.push(skill));
		skills.setGauge(3, 10);
		expect(document.querySelector('.duskSkills')).toBeNull();
		skills.setSkills([{ name: 'dawnlight', label: 'Dawnlight' }, { name: 'timelamp', label: 'Timelamp' }]);
		const bar = document.querySelector('.duskSkills') as HTMLElement;
		vi.advanceTimersByTime(100);
		expect(bar.className).toBe('duskSkills');
		expect([...bar.querySelectorAll('.skill')].map((skill) => skill.textContent)).toEqual(['Dawnlight', 'Timelamp']);
		skills.setGauge(10, 10);
		expect((bar.querySelector('.duskGauge .fill') as HTMLElement).style.height).toBe('100%');
		expect(bar.classList.contains('ready')).toBe(true);
		expect(press(bar.querySelector('.skill.timelamp') as Element, 'click')).toBe(false);
		expect(cast).toEqual(['timelamp']);
	});
});
