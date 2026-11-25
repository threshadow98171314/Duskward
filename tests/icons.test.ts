import { describe, expect, it } from 'vitest';
import { SHEETS, SPRITES } from '../src/content/sprites.ts';
import { iconPosition, iconStyles, installIcons } from '../src/ui/icons.ts';

// The style sheet as selector => declarations
function styles(): Map<string, string> {
	return new Map(iconStyles().trim().split('\n').map((line) => {
		const [selector, rest] = line.split(' { ');
		return [selector, rest.replace(/ }$/, '')];
	}));
}

describe('the interface icons', () => {
	it('are placed by frame and row, or by the name of a frame', () => {
		expect(iconPosition({ sprite: 'buttons', frame: 'cancel' })).toBe('-28px -60px');
		expect(iconPosition({ sprite: 'shield', frame: 2, row: 1 })).toBe('-60px -30px');
		expect(iconPosition({ sprite: 'items', frame: 'dawnHeart' })).toBe('-168px -335px');
		expect(iconPosition({ sprite: 'menu' })).toBe('0px -362px');
		expect(() => iconPosition({ sprite: 'spells', frame: 'fireball' })).toThrow('No frame');
		expect(() => iconPosition({ sprite: 'hearts', row: 2 })).toThrow('No frame');
	});

	it('take the sheet from the sprite list, and move on it for each variant', () => {
		const rules = styles();
		expect(rules.get('.menuBtn')).toBe('background-image: url(img/icons.png); background-position: 0px -362px;');
		expect(rules.get('.menuBtn .nightSprite')).toBe('background-image: url(img/icons.png); background-position: 0px -402px;');
		expect(rules.get('.buttons li')).toBe('background-image: url(img/icons.png);');
		expect(rules.get('.delete')).toBe('background-position: -112px -60px;');
		expect(rules.get('.night .frozen')).toBe('background-position: -160px -834px;');
		expect(rules.get('.effectsVolume.volumeSlider .nightSprite')).toBe('background-position: 0px -634px;');
	});

	it('follow the shield and the sword through every level of wood and stone', () => {
		const rules = styles();
		expect(rules.get('.shield')).toContain('background-position: 0px -30px;');
		expect(rules.get('.shield > div')).toContain('background-position: 0px 0px;');
		expect(rules.get('.wood9 .shield')).toBe('background-position: -240px -30px;');
		expect(rules.get('.stone4 .sword > div')).toBe('background-position: -90px -951px;');
		expect(rules.has('.wood10 .shield')).toBe(false);
	});

	it('have an icon for every item, spell and lasting effect', () => {
		const rules = styles();
		for (const name of SPRITES.items.names ?? []) {
			expect(rules.has('.button.' + name + ' div:nth-child(1)'), name).toBe(true);
		}
		for (const name of ['resetBoard', 'haste', 'freezeTime', 'phaseChange', 'frozen']) {
			expect(rules.has('.' + name), name).toBe(true);
			expect(rules.has('.night .' + name), name).toBe(true);
		}
	});

	it('stay on their sheets', () => {
		for (const line of iconStyles().trim().split('\n')) {
			const at = /background-position: (-?\d+)px (-?\d+)px/.exec(line);
			if (at) {
				expect(-Number(at[1]), line).toBeLessThan(SHEETS.icons.width);
				expect(-Number(at[2]), line).toBeLessThan(SHEETS.icons.height);
			}
		}
	});

	it('are added to the page once', () => {
		installIcons(document);
		installIcons(document);
		const sheets = document.querySelectorAll('style#iconStyles');
		expect(sheets).toHaveLength(1);
		expect(sheets[0].textContent).toContain('.heart .bar, .bigheart .bar, .heart.full, .bigheart.full');
	});
});
