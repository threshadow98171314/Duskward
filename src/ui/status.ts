// The keeper's status beside the board: hearts for their health, the shield and the
// sword as they wear down, the experience bar, the ward raised at dusk, and tonight's
// omen and blessing; also the health bar of a boss, over the world. The game says
// what each one is now; this keeps the HTML in step, with the classes the style
// sheets know. Most pieces are made the first time they are needed.

import { element, settle } from './dom.ts';

const HEALTH_PER_HEART = 10;
// More hearts than this become big ones, worth two each
const MOST_HEARTS = 14;
// New hearts pop up one after another
const HEART_POP_MS = 100;
// A meter that empties disappears; it pops up again once it is filled
const METER_POP_MS = 100;
const METER_GONE_MS = 300;
const XP_SHOW_MS = 100;
const BOSS_GONE_MS = 1000;

// How many hearts health up to this much takes, and how many of them are big
export function heartsFor(maxHealth: number): { total: number; big: number } {
	const total = Math.ceil(maxHealth / HEALTH_PER_HEART);
	return total > MOST_HEARTS ? { total: MOST_HEARTS, big: total - MOST_HEARTS } : { total, big: 0 };
}

// How full each heart is, from the first, from 0 to 1. The big ones come first, and
// health fills the hearts from the last one back.
export function heartShares(health: number, hearts: { total: number; big: number }): number[] {
	const shares = new Array<number>(hearts.total).fill(0);
	for (let i = hearts.total; i > 0; i--) {
		const holds = i <= hearts.big ? 2 * HEALTH_PER_HEART : HEALTH_PER_HEART;
		const share = Math.min(health, holds);
		shares[i - 1] = share > 0 ? share / holds : 0;
		health -= Math.max(0, share);
	}
	return shares;
}

type Meter = 'shield' | 'sword';

// What the status shows now, each as how much out of how much, once it has been set
export interface Shown {
	health?: [number, number];
	shield?: [number, number];
	sword?: [number, number];
	experience?: [number, number];
	ward?: [number, number];
}

export class StatusBar {
	// For the tips under the mouse
	readonly shown: Shown = {};
	private hearts = { total: 0, big: 0 };
	private container: HTMLElement | null = null;
	private badge: HTMLElement | null = null;
	private boss: HTMLElement | null = null;

	// The board holds the status and the experience bar; the world, a boss's health
	constructor(private readonly board: HTMLElement, private readonly world: HTMLElement) {}

	// How many hearts there are
	numHearts(): number {
		return this.hearts.total;
	}

	// The keeper's health, in hearts. Hearts gained pop up one after another.
	setHealth(health: number, maxHealth: number): void {
		this.shown.health = [health, maxHealth];
		this.hearts = heartsFor(maxHealth);
		const row = this.heartsRow();
		while (row.children.length < this.hearts.total) {
			row.append(element('div', 'heart prepop',
				element('div', 'mask'), element('div', 'mask nightSprite'), element('div', 'bar')));
		}
		heartShares(health, this.hearts).forEach((share, i) => {
			const heart = row.children[i] as HTMLElement;
			if (i < this.hearts.big) {
				heart.classList.replace('heart', 'bigheart');
			}
			heart.classList.toggle('empty', share <= 0);
			(heart.querySelector('.bar') as HTMLElement).style.width = share * 100 + '%';
		});
		row.querySelectorAll<HTMLElement>('.prepop').forEach((heart, i) => {
			setTimeout(() => {
				if (heart.classList.contains('prepop')) {
					row.append(heart);
					heart.classList.remove('prepop');
				}
			}, i * HEART_POP_MS);
		});
	}

	// What is left of the shield, or of the sword, out of what it holds when whole
	setShield(amount: number, max: number): void {
		this.setMeter('shield', amount, max);
	}

	setSword(amount: number, max: number): void {
		this.setMeter('sword', amount, max);
	}

	// The experience bar fills towards the next level
	setExperience(xp: number, toLevel: number): void {
		this.shown.experience = [xp, toLevel];
		let bar = this.board.querySelector<HTMLElement>(':scope > .xpBar');
		if (bar === null) {
			bar = element('div', 'xpBar litBorder hidden',
				element('div', 'mask'), element('div', 'nightSprite'), element('div', 'fill hidden'));
			this.board.append(bar);
		}
		const shown = bar;
		const fill = shown.querySelector('.fill') as HTMLElement;
		fill.style.height = xp / toLevel * 100 + '%';
		setTimeout(() => {
			shown.classList.remove('hidden');
			fill.classList.remove('hidden');
		}, XP_SHOW_MS);
	}

	// The ward raised at dusk: how much of it is left, shown only while there is any
	setWard(current: number, max: number): void {
		this.shown.ward = [current, max];
		const status = this.status();
		let ward = status.querySelector<HTMLElement>(':scope > .ward');
		if (ward === null) {
			ward = element('div', 'ward hidden', element('div', 'fill'), element('div', 'wardValue'));
			status.append(ward);
		}
		(ward.querySelector('.fill') as HTMLElement).style.height = (max > 0 ? current / max * 100 : 0) + '%';
		(ward.querySelector('.wardValue') as HTMLElement).textContent = String(current);
		ward.classList.toggle('hidden', !(current > 0));
	}

	// Tonight's omen, and the blessing taken for the night if there is one
	showBadge(omen: string, blessing: string | null): void {
		if (this.badge === null) {
			this.badge = element('div', 'blessingBadge');
			this.status().append(this.badge);
		}
		this.badge.replaceChildren(element('div', 'badgeOmen', omen));
		if (blessing !== null) {
			this.badge.append(element('div', 'badgeBlessing', blessing));
		}
	}

	clearBadge(): void {
		this.badge?.remove();
		this.badge = null;
	}

	// The health bar of a boss slides in over the world, and away once it is beaten
	setBossHealth(hp: number, max: number): void {
		if (this.boss === null) {
			if (hp <= 0) {
				return;
			}
			this.boss = element('div', 'bossHealth noshow', element('div'));
			this.world.append(this.boss);
			settle(this.boss);
			this.boss.classList.remove('noshow');
		}
		(this.boss.firstElementChild as HTMLElement).style.width = (max > 0 ? hp / max * 100 : 0) + '%';
		if (hp <= 0) {
			const beaten = this.boss;
			beaten.classList.add('noshow');
			this.boss = null;
			setTimeout(() => beaten.remove(), BOSS_GONE_MS);
		}
	}

	// The status, beside the board, and its row of hearts
	private status(): HTMLElement {
		if (this.container === null) {
			this.container = element('div', 'statusContainer', element('div', 'hearts'));
			this.board.append(this.container);
		}
		return this.container;
	}

	private heartsRow(): HTMLElement {
		return this.status().querySelector('.hearts') as HTMLElement;
	}

	// A meter sits after the hearts. It pops up once it holds something, and goes
	// away once it is empty, ready to pop up again.
	private setMeter(kind: Meter, amount: number, max: number): void {
		this.shown[kind] = [amount, max];
		let meter = this.status().querySelector<HTMLElement>(':scope > .' + kind);
		if (meter === null) {
			meter = element('div', kind + ' prepop', element('div'));
			this.heartsRow().after(meter);
		}
		const shown = meter;
		const fill = shown.firstElementChild as HTMLElement;
		if (amount > 0) {
			if (shown.classList.contains('prepop')) {
				setTimeout(() => {
					this.heartsRow().after(shown);
					shown.classList.remove('prepop');
				}, METER_POP_MS);
			}
			fill.style.width = amount / max * 100 + '%';
		} else {
			fill.style.width = '0%';
			shown.classList.add('hidden');
			setTimeout(() => {
				shown.classList.add('prepop');
				shown.classList.remove('hidden');
			}, METER_GONE_MS);
		}
	}
}
