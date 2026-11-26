// The board, drawn on a canvas. The game says what happens to each tile (it is
// placed, slides to another cell, fades away, gains or loses a power) and the view
// animates it, so it knows nothing of the rules. Tiles are drawn from the sprite
// list with their day or night side up, and flip over when night falls or the day
// breaks; power tiles, shadow binds and the selected tile are drawn over them. A
// move the game points out nudges its two tiles towards each other.

import { SHEETS, SPRITES, type Sprite } from '../content/sprites.ts';

export interface BoardLayout {
	rows: number;
	columns: number;
	// The size of a cell and the gap around the grid, in CSS pixels
	cell: number;
	pad: number;
	// How much bigger than on a desktop a tile is drawn (tiles are bigger on phones)
	scale: number;
}

export interface Cell {
	row: number;
	column: number;
}

// A value on its way from one number to another, over a while
interface Motion {
	from: number;
	to: number;
	start: number;
	duration: number;
}

// A tile as drawn. Its row and column are where it is headed; x and y are where it
// is drawn on the way there, in cells.
export interface DrawnTile extends Cell {
	kind: string;
	effects: Set<string>;
	x: Motion;
	y: Motion;
	// Fading away; the tile is dropped once it is gone
	fade: Motion | null;
}

// A tile's picture and the border around it, at desktop size
const PICTURE = 52;
const BOX = 56;
const BORDER = 2;
// Power tiles and binds are drawn this far inside the cell
const INSET = 4;
const FLIP_MS = 500;
const BORDER_MS = 1400;
const KIND_FADE_MS = 200;
const EXPLOSION_MS = 400;
// A move pointed out: its two tiles nudge towards each other twice, then rest, over
// and over, with a light rim pulsing around them
const NUDGE_MS = 1600;
const NUDGE = 0.12;
const HINT_RIM = '#e0862a';
// The kinds whose night side changes while the dragon is out
const DRAGON_KINDS = new Set(['grain', 'clay', 'cloth']);
const SELECT_BORDER = 'img/select-border.png';
// The warm palette of the page: behind each side of a tile, and its border by day and night
const DAY_FILL = '#fffaf0';
const NIGHT_FILL = '#241c3a';
const DAY_BORDER = [59, 42, 63];
const NIGHT_BORDER = [233, 220, 196];

function clamp(t: number): number {
	return Math.min(1, Math.max(0, t));
}

function at(motion: Motion, now: number): number {
	const t = motion.duration <= 0 ? (now >= motion.start ? 1 : 0) : clamp((now - motion.start) / motion.duration);
	return motion.from + (motion.to - motion.from) * t;
}

function still(value: number): Motion {
	return { from: value, to: value, start: 0, duration: 0 };
}

// Swells and fades back, once a period
function pulse(now: number, period: number): number {
	return 0.55 + 0.45 * (1 - Math.cos(2 * Math.PI * now / period)) / 2;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

export class BoardView {
	readonly tiles: DrawnTile[] = [];
	// The level of each kind of tile, and whether the dragon fight has changed the night side
	levels: Record<string, number> = {};
	dragonFight = false;
	// Called before every frame, to catch up with the page
	beforeDraw: (() => void) | null = null;

	private readonly ctx: CanvasRenderingContext2D | null;
	private readonly ratio: number;
	private readonly images: Record<string, HTMLImageElement> = {};
	private night = false;
	private nightSince = -Infinity;
	private readonly kindAlpha: Record<string, Motion> = {};
	private selected: DrawnTile | null = null;
	private hinted: { a: Cell; b: Cell; since: number } | null = null;
	private readonly explosions: { cell: Cell; start: number }[] = [];
	private frame = 0;

	constructor(
		private readonly canvas: HTMLCanvasElement,
		readonly layout: BoardLayout,
		private readonly now: () => number = () => performance.now(),
	) {
		this.ratio = Math.max(1, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
		this.ctx = canvas.getContext('2d');
		if (this.ctx !== null) {
			const width = this.width(), height = this.height();
			canvas.width = Math.round(width * this.ratio);
			canvas.height = Math.round(height * this.ratio);
			canvas.style.width = width + 'px';
			canvas.style.height = height + 'px';
			// Load the tiles' sheets now, so the first frames have pictures to draw
			for (const [name, sprite] of Object.entries(SPRITES)) {
				if (name.startsWith('tile.')) {
					this.sheet(sprite.sheet);
				}
			}
			this.images.select = this.load(SELECT_BORDER);
		}
	}

	// A tile placed at a cell; it shows at fromRow (above the board, to drop in) until it slides
	add(kind: string, row: number, column: number, fromRow = row): DrawnTile {
		const tile: DrawnTile = { kind, row, column, effects: new Set(), x: still(column), y: still(fromRow), fade: null };
		this.tiles.push(tile);
		return tile;
	}

	// Sends a tile to a cell: it waits a while where it is, then slides there
	slide(tile: DrawnTile, row: number, column: number, delay: number, duration: number): void {
		const now = this.now();
		tile.x = { from: at(tile.x, now), to: column, start: now + delay, duration };
		tile.y = { from: at(tile.y, now), to: row, start: now + delay, duration };
		tile.row = row;
		tile.column = column;
	}

	fade(tile: DrawnTile, duration: number): void {
		tile.fade = { from: 1, to: 0, start: this.now(), duration };
		if (this.selected === tile) {
			this.selected = null;
		}
	}

	setEffect(tile: DrawnTile, effect: string, on: boolean): void {
		if (on) {
			tile.effects.add(effect);
		} else {
			tile.effects.delete(effect);
		}
	}

	select(tile: DrawnTile | null): void {
		this.selected = tile;
	}

	// Points out a move: the tiles in these two cells nudge towards each other until
	// the hint is taken away (with null)
	hint(a: Cell | null, b: Cell | null = null): void {
		this.hinted = a !== null && b !== null ? { a: { ...a }, b: { ...b }, since: this.now() } : null;
	}

	// How far a tile is nudged now, in cells, by the move pointed out
	nudgeOf(tile: DrawnTile, now = this.now()): { x: number; y: number } {
		const hint = this.hinted;
		if (hint === null || tile.fade !== null) {
			return { x: 0, y: 0 };
		}
		const at = (cell: Cell) => tile.row === cell.row && tile.column === cell.column;
		const towards = at(hint.a) ? hint.b : at(hint.b) ? hint.a : null;
		if (towards === null) {
			return { x: 0, y: 0 };
		}
		// Two quick nudges in the first half of each round, then a rest
		const t = ((now - hint.since) % NUDGE_MS) / NUDGE_MS;
		const amount = t < 0.5 ? NUDGE * Math.abs(Math.sin(t * 4 * Math.PI)) : 0;
		return { x: (towards.column - tile.column) * amount, y: (towards.row - tile.row) * amount };
	}

	// Whether a tile is part of the move pointed out
	isHinted(tile: DrawnTile): boolean {
		const hint = this.hinted;
		return hint !== null && tile.fade === null && [hint.a, hint.b].some((cell) => cell.row === tile.row && cell.column === tile.column);
	}

	// Tiles of these kinds fade out (while their pictures change), or back in
	hideKinds(kinds: string[]): void {
		this.fadeKinds(kinds, 0);
	}

	showKinds(kinds: string[]): void {
		this.fadeKinds(kinds, 1);
	}

	// Night falls or the day breaks; the tiles flip over, unless the change should simply be so
	setNight(night: boolean, flip = true): void {
		if (night !== this.night) {
			this.night = night;
			this.nightSince = flip ? this.now() : -Infinity;
		}
	}

	explode(cell: Cell): void {
		this.explosions.push({ cell, start: this.now() });
	}

	// The cell at a point on the canvas, in CSS pixels from its top left corner
	cellAt(x: number, y: number): Cell | null {
		const { rows, columns, cell, pad } = this.layout;
		const column = Math.floor((x - pad) / cell), row = Math.floor((y - pad) / cell);
		return row >= 0 && row < rows && column >= 0 && column < columns ? { row, column } : null;
	}

	// The cell under a point on the screen
	cellAtClient(clientX: number, clientY: number): Cell | null {
		const rect = this.canvas.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) {
			return null;
		}
		return this.cellAt((clientX - rect.left) * this.width() / rect.width, (clientY - rect.top) * this.height() / rect.height);
	}

	// Where a tile is drawn now, in cells
	positionOf(tile: DrawnTile): { x: number; y: number } {
		const now = this.now();
		return { x: at(tile.x, now), y: at(tile.y, now) };
	}

	// The side that is up, and how far round it has turned (1 flat, 0 edge on)
	side(): { night: boolean; turn: number } {
		const p = clamp((this.now() - this.nightSince) / FLIP_MS);
		return { night: p < 0.5 ? !this.night : this.night, turn: Math.abs(Math.cos(Math.PI * p)) };
	}

	// A kind of tile's picture for one side: its sprite, and the row for its level
	picture(kind: string, night: boolean): { sprite: Sprite; row: number } | null {
		if (night && this.dragonFight && DRAGON_KINDS.has(kind)) {
			const sprite = SPRITES['tile.' + kind + '.dragon'];
			return sprite === undefined ? null : { sprite, row: 0 };
		}
		const sprite = SPRITES['tile.' + kind + (night ? '.night' : '')];
		if (sprite === undefined) {
			return null;
		}
		return { sprite, row: Math.min(Math.max(1, this.levels[kind] ?? 1), sprite.rows) - 1 };
	}

	start(): void {
		this.stop();
		const step = () => {
			this.draw();
			this.frame = requestAnimationFrame(step);
		};
		this.frame = requestAnimationFrame(step);
	}

	stop(): void {
		cancelAnimationFrame(this.frame);
	}

	draw(): void {
		const now = this.now();
		this.forgetGone(now);
		this.beforeDraw?.();
		const ctx = this.ctx;
		if (ctx === null) {
			return;
		}
		const { rows, columns, cell, pad } = this.layout;
		ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
		ctx.clearRect(0, 0, this.width(), this.height());
		ctx.imageSmoothingEnabled = false;

		// Tiles dropping in from above the board only show once they are on it
		ctx.save();
		ctx.beginPath();
		ctx.rect(pad, pad, columns * cell, rows * cell);
		ctx.clip();
		const side = this.side();
		const q = clamp((now - this.nightSince) / BORDER_MS);
		const toNight = this.night ? q : 1 - q;
		const border = 'rgb(' + DAY_BORDER.map((day, i) => Math.round(day + (NIGHT_BORDER[i] - day) * toNight)).join(', ') + ')';
		for (const tile of this.tiles) {
			this.drawTile(ctx, tile, now, side, border);
		}
		ctx.restore();
		this.drawExplosions(ctx, now);
	}

	private drawTile(ctx: CanvasRenderingContext2D, tile: DrawnTile, now: number, side: { night: boolean; turn: number },
		border: string): void {
		const { cell, pad, scale } = this.layout;
		const alpha = (tile.fade === null ? 1 : at(tile.fade, now)) * (this.kindAlpha[tile.kind] ? at(this.kindAlpha[tile.kind], now) : 1);
		if (alpha <= 0) {
			return;
		}
		const nudge = this.nudgeOf(tile, now);
		const left = pad + (at(tile.x, now) + nudge.x) * cell, top = pad + (at(tile.y, now) + nudge.y) * cell;
		ctx.globalAlpha = alpha;

		// The tile itself turns over at nightfall and daybreak
		ctx.save();
		ctx.translate(left + cell / 2, top + cell / 2);
		ctx.scale(side.turn * scale, scale);
		const picture = this.picture(tile.kind, side.night);
		const sheet = picture === null ? undefined : this.sheet(picture.sprite.sheet);
		ctx.fillStyle = side.night ? NIGHT_FILL : DAY_FILL;
		roundedRect(ctx, -PICTURE / 2, -PICTURE / 2, PICTURE, PICTURE, 2);
		ctx.fill();
		if (picture !== null && sheet !== undefined && sheet.complete && sheet.naturalWidth > 0) {
			const { sprite, row } = picture;
			ctx.save();
			ctx.clip();
			ctx.drawImage(sheet, sprite.x, sprite.y + row * sprite.height, sprite.width, sprite.height,
				-PICTURE / 2, -PICTURE / 2, PICTURE, PICTURE);
			if (tile.effects.has('explosive')) {
				// A powder keg glows red, on and off
				const glow = ctx.createRadialGradient(0, 0, PICTURE * 0.15, 0, 0, PICTURE * 0.7);
				glow.addColorStop(0, 'rgba(255, 0, 0, 0)');
				glow.addColorStop(1, 'rgba(255, 0, 0, 0.9)');
				ctx.globalAlpha = alpha * pulse(now, 500);
				ctx.fillStyle = glow;
				ctx.fillRect(-PICTURE / 2, -PICTURE / 2, PICTURE, PICTURE);
				ctx.globalAlpha = alpha;
			}
			ctx.restore();
		}
		ctx.lineWidth = BORDER;
		ctx.strokeStyle = border;
		roundedRect(ctx, -BOX / 2 + BORDER / 2, -BOX / 2 + BORDER / 2, BOX - BORDER, BOX - BORDER, 4 - BORDER / 2);
		ctx.stroke();
		ctx.restore();

		// Powers and binds lie on the cell and do not turn with it
		const x = left + INSET, y = top + INSET, size = cell - 2 * INSET;
		if (tile.effects.has('shadowBind')) {
			this.drawBind(ctx, x, y, size, alpha);
		}
		if (tile.effects.has('lanternPower')) {
			this.drawLantern(ctx, x, y, size, alpha * pulse(now, 1200));
		}
		if (tile.effects.has('sunPower')) {
			this.drawSun(ctx, x, y, size, alpha * pulse(now, 800));
		}
		if (this.isHinted(tile)) {
			const box = BOX * scale;
			ctx.globalAlpha = alpha * pulse(now, 800);
			ctx.strokeStyle = HINT_RIM;
			ctx.lineWidth = 3;
			roundedRect(ctx, left + (cell - box) / 2 - 1.5, top + (cell - box) / 2 - 1.5, box + 3, box + 3, 6);
			ctx.stroke();
		}
		const select = this.images.select;
		if (tile === this.selected && select !== undefined && select.complete && select.naturalWidth > 0) {
			ctx.globalAlpha = alpha;
			ctx.imageSmoothingEnabled = true;
			ctx.drawImage(select, left, top, cell, cell);
			ctx.imageSmoothingEnabled = false;
		}
		ctx.globalAlpha = 1;
	}

	// A lantern tile: an orange rim with light pooling inside it
	private drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number): void {
		ctx.save();
		ctx.globalAlpha = alpha;
		roundedRect(ctx, x, y, size, size, 6);
		ctx.clip();
		const glow = ctx.createRadialGradient(x + size / 2, y + size / 2, size * 0.15, x + size / 2, y + size / 2, size * 0.75);
		glow.addColorStop(0, 'rgba(255, 196, 64, 0)');
		glow.addColorStop(1, 'rgba(255, 196, 64, 0.75)');
		ctx.fillStyle = glow;
		ctx.fillRect(x, y, size, size);
		// Half of the stroke falls outside the clip, leaving a rim inside the cell
		ctx.lineWidth = 6;
		ctx.strokeStyle = '#f29a3a';
		ctx.stroke();
		ctx.restore();
	}

	// A sun tile: a golden rim that shines out, and light at its heart
	private drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number): void {
		ctx.save();
		ctx.globalAlpha = alpha;
		const light = ctx.createRadialGradient(x + size / 2, y + size / 2, 0, x + size / 2, y + size / 2, size * 0.5);
		light.addColorStop(0, 'rgba(255, 246, 228, 0.55)');
		light.addColorStop(1, 'rgba(255, 210, 92, 0)');
		roundedRect(ctx, x + 1.5, y + 1.5, size - 3, size - 3, 5);
		ctx.fillStyle = light;
		ctx.fill();
		ctx.shadowColor = 'rgba(255, 210, 92, 0.9)';
		ctx.shadowBlur = 14;
		ctx.lineWidth = 3;
		ctx.strokeStyle = '#ffd25c';
		ctx.stroke();
		ctx.restore();
	}

	// A shadow bind: dark stripes across the cell
	private drawBind(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number): void {
		ctx.save();
		ctx.globalAlpha = alpha;
		roundedRect(ctx, x, y, size, size, 6);
		ctx.clip();
		ctx.fillStyle = 'rgba(36, 20, 52, 0.7)';
		ctx.fillRect(x, y, size, size);
		ctx.strokeStyle = 'rgba(96, 66, 128, 0.7)';
		ctx.lineWidth = 3;
		ctx.beginPath();
		for (let d = -size; d < size; d += 9 * Math.SQRT2) {
			ctx.moveTo(x + d, y);
			ctx.lineTo(x + d + size, y + size);
		}
		ctx.stroke();
		roundedRect(ctx, x, y, size, size, 6);
		ctx.lineWidth = 4;
		ctx.strokeStyle = '#2a1838';
		ctx.stroke();
		ctx.restore();
	}

	// A powder keg going off: a red ring that swells and fades
	private drawExplosions(ctx: CanvasRenderingContext2D, now: number): void {
		const { cell, pad } = this.layout;
		for (let i = this.explosions.length - 1; i >= 0; i--) {
			const { cell: spot, start } = this.explosions[i];
			const t = clamp((now - start) / EXPLOSION_MS);
			if (t >= 1) {
				this.explosions.splice(i, 1);
				continue;
			}
			const eased = 1 - (1 - t) * (1 - t);
			ctx.globalAlpha = 1 - eased;
			ctx.fillStyle = 'red';
			ctx.beginPath();
			ctx.arc(pad + spot.column * cell + cell / 2, pad + spot.row * cell + cell / 2, 5 + 85 * eased, 0, 2 * Math.PI);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}

	private fadeKinds(kinds: string[], to: number): void {
		const now = this.now();
		for (const kind of kinds) {
			const from = this.kindAlpha[kind] ? at(this.kindAlpha[kind], now) : 1;
			this.kindAlpha[kind] = { from, to, start: now, duration: KIND_FADE_MS };
		}
	}

	// Tiles that have faded away are dropped
	private forgetGone(now: number): void {
		for (let i = this.tiles.length - 1; i >= 0; i--) {
			const fade = this.tiles[i].fade;
			if (fade !== null && now >= fade.start + fade.duration) {
				this.tiles.splice(i, 1);
			}
		}
	}

	// A sprite sheet, loaded the first time it is needed
	private sheet(name: string): HTMLImageElement | undefined {
		if (this.images[name] === undefined && SHEETS[name] !== undefined) {
			this.images[name] = this.load(SHEETS[name].file);
		}
		return this.images[name];
	}

	private load(file: string): HTMLImageElement {
		const image = new Image();
		image.src = file;
		return image;
	}

	private width(): number {
		return this.layout.columns * this.layout.cell + 2 * this.layout.pad;
	}

	private height(): number {
		return this.layout.rows * this.layout.cell + 2 * this.layout.pad;
	}
}
