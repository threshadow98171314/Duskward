import { describe, expect, it } from 'vitest';
import { SHEETS, SPRITES } from '../src/content/sprites.ts';

const images = import.meta.glob<string>('../public/img/*.png', { query: '?inline', import: 'default', eager: true });

// The size an image says it is, from its PNG header
function pngSize(file: string): { width: number; height: number } {
	const bytes = atob(images['../public/' + file].split(',')[1]);
	const word = (at: number) => ((bytes.charCodeAt(at) << 24) | (bytes.charCodeAt(at + 1) << 16) |
		(bytes.charCodeAt(at + 2) << 8) | bytes.charCodeAt(at + 3)) >>> 0;
	return { width: word(16), height: word(20) };
}

describe('the sprite list', () => {
	it('matches the sheets the art tools drew', () => {
		for (const [name, sheet] of Object.entries(SHEETS)) {
			expect(pngSize(sheet.file), name).toEqual({ width: sheet.width, height: sheet.height });
		}
	});

	it('has the sprites the game draws by name', () => {
		for (const name of ['dude', 'dudenight', 'sun', 'star', 'gem', 'treasurechest', 'dragon', 'dragonhead', 'dragoneffects', 'portrait']) {
			expect(SPRITES, name).toHaveProperty([name]);
		}
		for (const tile of ['grain', 'wood', 'stone', 'clay', 'cloth', 'mana', 'lantern']) {
			expect(SPRITES, tile).toHaveProperty(['tile.' + tile]);
			expect(SPRITES, tile).toHaveProperty(['tile.' + tile + '.night']);
		}
	});
});
