// The interface's icons, placed by the sprite list. The art tools list where each
// icon is on its sheet (src/content/sprites.ts); this turns the list into the style
// sheet the interface's HTML relies on, so the HTML only names its icons by class
// and no style sheet keeps coordinates of its own. An icon's night version is the
// next row of its sprite, and the levels of the shield and sword are its frames.

import { SHEETS, SPRITES } from '../content/sprites.ts';

// A frame of a sprite, by number or by the name the list gives it, and its row
export interface Icon {
	sprite: string;
	frame?: number | string;
	row?: number;
}

// A rule of the style sheet: the elements it is for, the sprite whose sheet they
// show, and where on the sheet. Variants of an icon (by night, or at a level) only
// move it on the sheet an earlier rule gave it.
interface IconRule {
	selector: string;
	sheet?: string;
	at?: Icon;
}

function spriteOf(name: string) {
	const sprite = SPRITES[name];
	if (!sprite) {
		throw new Error('No sprite ' + name + ' in the sprite list');
	}
	return sprite;
}

function namesOf(sprite: string): string[] {
	return spriteOf(sprite).names ?? [];
}

// The sheet a sprite is on, as a CSS image
export function iconImage(sprite: string): string {
	return 'url(' + SHEETS[spriteOf(sprite).sheet].file + ')';
}

// Where a frame of a sprite is on its sheet, as a CSS background position
export function iconPosition({ sprite, frame = 0, row = 0 }: Icon): string {
	const s = spriteOf(sprite);
	const index = typeof frame === 'string' ? namesOf(sprite).indexOf(frame) : frame;
	if (index < 0 || index >= s.frames || row < 0 || row >= s.rows) {
		throw new Error('No frame ' + frame + ' in row ' + row + ' of ' + sprite);
	}
	return -(s.x + index * s.width) + 'px ' + -(s.y + row * s.height) + 'px';
}

const NIGHT = 1;

function rules(): IconRule[] {
	const list: IconRule[] = [];
	const icon = (selector: string, at: Icon) => list.push({ selector, sheet: at.sprite, at });
	const move = (selector: string, at: Icon) => list.push({ selector, at });

	// The save slots: their buttons, and the star of a game played past its ending
	list.push({ selector: '.buttons li', sheet: 'buttons' });
	for (const name of namesOf('buttons')) {
		move('.' + name, { sprite: 'buttons', frame: name });
	}
	icon('.star', { sprite: 'star' });

	// The menu button
	icon('.menuBtn', { sprite: 'menu' });
	icon('.menuBtn .nightSprite', { sprite: 'menu', row: NIGHT });

	// Hearts: an outline (gold for a big heart) by day and by night, and the red inside
	icon('.heart .mask, .bigheart .mask', { sprite: 'hearts', frame: 'heart' });
	move('.bigheart .mask', { sprite: 'hearts', frame: 'bigheart' });
	move('.heart .mask.nightSprite', { sprite: 'hearts', frame: 'heart', row: NIGHT });
	move('.bigheart .mask.nightSprite', { sprite: 'hearts', frame: 'bigheart', row: NIGHT });
	icon('.heart .bar, .bigheart .bar, .heart.full, .bigheart.full', { sprite: 'hearts', frame: 'fill' });

	// The shield and the sword: an outline, and the meter inside it that runs down
	// as they wear. Both grow with the level of the wood and the stone on the board.
	for (const [meter, material] of [['shield', 'wood'], ['sword', 'stone']]) {
		icon('.' + meter, { sprite: meter, row: 1 });
		icon('.' + meter + ' > div', { sprite: meter });
		for (let level = 2; level <= spriteOf(meter).frames; level++) {
			move('.' + material + level + ' .' + meter, { sprite: meter, frame: level - 1, row: 1 });
			move('.' + material + level + ' .' + meter + ' > div', { sprite: meter, frame: level - 1 });
		}
	}

	// The items in the inventory
	list.push({ selector: '.inventory .button div:nth-child(1)', sheet: 'items' });
	for (const name of namesOf('items')) {
		move('.button.' + name + ' div:nth-child(1)', { sprite: 'items', frame: name });
	}

	// The spells, and the lasting effects shown beside the magic button
	list.push({ selector: '.spell, .states > div', sheet: 'spells' });
	for (const name of namesOf('spells')) {
		move('.' + name, { sprite: 'spells', frame: name });
		move('.night .' + name, { sprite: 'spells', frame: name, row: NIGHT });
	}

	// The volume sliders
	icon('.volumeSlider', { sprite: 'volume.music' });
	icon('.volumeSlider .nightSprite', { sprite: 'volume.music', row: NIGHT });
	move('.effectsVolume.volumeSlider', { sprite: 'volume.effects' });
	move('.effectsVolume.volumeSlider .nightSprite', { sprite: 'volume.effects', row: NIGHT });

	return list;
}

// The style sheet, one rule to a line
export function iconStyles(): string {
	return rules().map(({ selector, sheet, at }) => {
		const declarations: string[] = [];
		if (sheet) {
			declarations.push('background-image: ' + iconImage(sheet) + ';');
		}
		if (at) {
			declarations.push('background-position: ' + iconPosition(at) + ';');
		}
		return selector + ' { ' + declarations.join(' ') + ' }';
	}).join('\n') + '\n';
}

// Adds the style sheet to the page, once
export function installIcons(document: Document): void {
	if (document.getElementById('iconStyles')) {
		return;
	}
	const style = document.createElement('style');
	style.id = 'iconStyles';
	style.textContent = iconStyles();
	document.head.appendChild(style);
}
