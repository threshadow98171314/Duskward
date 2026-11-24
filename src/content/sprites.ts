// Where every sprite the game draws by name is on the sprite sheets. The art tools
// write the list as they draw the sheets (tools/art/build.py), so it always matches
// the images: for each sprite, its sheet, where its first frame is, the size of a
// frame, and how many frames run across and rows run down. A sprite's rows are its
// animations, or its levels for a building.

import list from './sprites.json';

export interface SpriteSheet {
	// The image, from the root of the site
	file: string;
	width: number;
	height: number;
}

export interface Sprite {
	sheet: string;
	x: number;
	y: number;
	width: number;
	height: number;
	frames: number;
	rows: number;
}

export const SHEETS: Record<string, SpriteSheet> = list.sheets;
export const SPRITES: Record<string, Sprite> = list.sprites;
