// The village, drawn on a canvas in the world: its buildings rising out of the
// ground as the keeper raises them, lifted a little while an upgrade waits for its
// materials and sinking away once the upgrade rises, the bars of materials
// delivered to buildings yet to be raised, the outline of the building the keeper
// works towards next where it will stand, and the star over the building the
// keeper sees to first; also the stockpile of materials at the left, and the
// duskshards gathered in the tower. By night the buildings and the stockpile fade
// into the dark. The game says what happens to each building; the view animates it.

import { SHEETS, SPRITES } from '../content/sprites.ts';

export interface VillageSize {
	width: number;
	height: number;
}

// One kind of material a building needs, and the share of it delivered so far. A bar
// can be split into the blocks it takes, and show a share more that is on its way.
export interface Cost {
	kind: string;
	share: number;
	blocks?: number;
	waiting?: number;
}

// A block in the stockpile: what it holds, and how full it is (from 0 to 1)
export interface StoredBlock {
	key: object;
	kind: string;
	share: number;
}

// The frame of the stockpile: its left, how far its bottom is off the ground, and
// the size of the inside
interface PileBox {
	left: number;
	bottom: number;
	width: number;
	height: number;
}

interface Motion {
	from: number;
	to: number;
	start: number;
	duration: number;
}

// A building as drawn. Rise is how far it stands out of the ground (0 underground,
// its full height once raised); lift moves it up for an upgrade, or down as it sinks.
interface Drawn {
	sprite: string;
	row: number;
	x: number;
	rise: Motion;
	lift: Motion;
	// Bars of materials, for a building not raised yet
	costs: Cost[] | null;
	barsShownSince: number | null;
	barsSink: Motion;
	// The building that will replace this one, while it is lifted for it
	upgrade: object | null;
	sunk: boolean;
}

const FADE_MS = 1400;
const LIFT = 20;
const LIFT_MS = 500;
const SINK_MS = 2500;
const BARS_SINK_MS = 1800;
// The bars panel: just above the ground once something is delivered, or from the
// start for the building the keeper works towards next. What is on its way to a
// building shows in between what is delivered and what is still missing.
const BARS_SHOW = 20;
const BARS_HEIGHT = 18;
const BARS_BORDER = 2;
// The bars sit on a light panel, like the tiles on the board, so that what is
// missing shows against it as well as what is there
const BARS_PANEL = '#fffaf0';
const PANEL_ALPHA = 0.85;
const MISSING_ALPHA = 0.18;
const WAITING_ALPHA = 0.65;
// The building the keeper works towards next shows faintly where it will stand
const OUTLINE_ALPHA = 0.4;
const STAR_TOP = 10;
const STAR_FRAME_MS = 200;
// A block in the stockpile, with its border; it fills or empties over a moment
const BLOCK = 10;
const FILL_MS = 300;
// The stockpile grows with the level of the grain, from three blocks across and down
// to five across and four down; its frame takes a moment to grow
const PILES: PileBox[] = [
	{ left: 14, bottom: 3, width: 3 * BLOCK, height: 3 * BLOCK },
	{ left: 14, bottom: 3, width: 3 * BLOCK, height: 4 * BLOCK },
	{ left: 9, bottom: 3, width: 4 * BLOCK, height: 4 * BLOCK },
	{ left: 4, bottom: 1, width: 5 * BLOCK, height: 4 * BLOCK },
];
const PILE_GROW_MS = 200;
// It comes into view slowly, and goes quickly while a building is raised over it
const PILE_HIDE_MS = 200;
// The duskshards float this far below the top of the world, in the tower's lantern room
const SHARDS_TOP = 35;
const SHARD_FRAME_MS = 200;
// The colour of each kind of material, by the level its tiles have reached
const MATERIALS: Record<string, [number, string][]> = {
	grain: [[1, '#ffe97f']],
	wood: [[1, '#7c5840'], [4, '#876c5b'], [7, '#ffd800']],
	stone: [[1, '#999999'], [4, '#135468'], [7, '#0097fe']],
	clay: [[1, '#c65645']],
	cloth: [[1, '#edc842'], [3, '#853aff']],
	lantern: [[1, '#f29a3a']],
	// Not a material, but its tiles' bits fly too
	mana: [[1, '#a77bd6']],
};

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

// Where each block goes in the stockpile, from the inside of its frame. As the page
// once laid them out, upside down: the rows fill from the bottom up, each from right
// to left, and a row that is not full yet keeps to the left.
export function pileLayout(count: number, width: number, height: number): { left: number; top: number }[] {
	const columns = Math.max(1, Math.floor(width / BLOCK + 1e-6));
	const places: { left: number; top: number }[] = [];
	for (let i = 0; i < count; i++) {
		const row = Math.floor(i / columns);
		const inRow = Math.min(columns, count - row * columns);
		places.push({ left: (inRow - 1 - (i % columns)) * BLOCK, top: height - (row + 1) * BLOCK });
	}
	return places;
}

// Where each segment of a bar goes, one for each block it takes, a gap between
// them; a bar with too many blocks to tell apart is left whole
export function segments(width: number, blocks: number, gap = 1): { left: number; width: number }[] {
	const count = Math.max(1, Math.floor(blocks));
	const step = (width + gap) / count;
	if (count === 1 || step - gap < 2) {
		return [{ left: 0, width }];
	}
	return Array.from({ length: count }, (_, i) => {
		const left = Math.round(i * step);
		return { left, width: Math.round((i + 1) * step) - gap - left };
	});
}

// The frame of the stockpile for a level of the grain
function pileFor(level: number): PileBox {
	return PILES[Math.min(Math.max(Math.floor(level), 1), PILES.length) - 1];
}

// A one pixel border just inside a box, in the current colour
function border(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): void {
	ctx.fillRect(left, top, width, 1);
	ctx.fillRect(left, top + height - 1, width, 1);
	ctx.fillRect(left, top + 1, 1, height - 2);
	ctx.fillRect(left + width - 1, top + 1, 1, height - 2);
}

// The colour of a kind of material for the level its tiles are at
export function materialColour(kind: string, level: number): string {
	let colour = '#999999';
	for (const [from, value] of MATERIALS[kind] ?? []) {
		if (level >= from) {
			colour = value;
		}
	}
	return colour;
}

export class VillageView {
	// The level of each kind of tile, for the colours of the materials
	levels: Record<string, number> = {};
	// The blocks in the stockpile, oldest first; null while the village has none
	stockpile: StoredBlock[] | null = null;
	// Called before every frame, to catch up with the page
	beforeDraw: (() => void) | null = null;

	private readonly ctx: CanvasRenderingContext2D | null;
	private readonly ratio: number;
	private readonly images: Record<string, HTMLImageElement> = {};
	private readonly buildings = new Map<object, Drawn>();
	private priority: object | null = null;
	private next: object | null = null;
	private nextOutlined = false;
	private night = false;
	private nightSince = -Infinity;
	private frame = 0;
	private pileThere = false;
	private pileHidden = false;
	private pileShown: Motion = still(0);
	private pileFrom: PileBox = PILES[0];
	private pileTo: PileBox = PILES[0];
	private pileSince = -Infinity;
	private readonly fills = new WeakMap<object, Motion>();
	private shards = { count: 0, x: 0 };

	constructor(
		private readonly canvas: HTMLCanvasElement,
		readonly size: VillageSize,
		private readonly now: () => number = () => performance.now(),
	) {
		this.ratio = Math.max(1, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
		this.ctx = canvas.getContext('2d');
		if (this.ctx !== null) {
			canvas.width = Math.round(size.width * this.ratio);
			canvas.height = Math.round(size.height * this.ratio);
			canvas.style.width = size.width + 'px';
			canvas.style.height = size.height + 'px';
		}
	}

	// A building appears: standing if it has been raised, otherwise still underground
	add(key: object, building: { sprite: string; row: number; x: number; standing: boolean }): void {
		const height = SPRITES[building.sprite]?.height ?? 0;
		this.buildings.set(key, {
			sprite: building.sprite, row: building.row, x: building.x,
			rise: still(building.standing ? height : 0), lift: still(0),
			costs: building.standing ? null : [], barsShownSince: null, barsSink: still(0), upgrade: null, sunk: false,
		});
		this.sheet(SPRITES[building.sprite]?.sheet);
	}

	remove(key: object): void {
		this.buildings.delete(key);
		if (this.priority === key) {
			this.priority = null;
		}
		if (this.next === key) {
			this.next = null;
		}
	}

	// The materials delivered so far; the bars come up once there are any
	setCosts(key: object, costs: Cost[]): void {
		const building = this.buildings.get(key);
		if (building === undefined || building.costs === null) {
			return;
		}
		building.costs = costs.map((cost) => ({ ...cost }));
		if (building.barsShownSince === null && costs.some((cost) => cost.share > 0)) {
			building.barsShownSince = this.now();
		}
	}

	// The building the keeper works towards next: its bars are up from the start, and
	// while it waits underground its outline shows where it will stand, unless the
	// building it upgrades stands there. The bars of one no longer next go down again
	// if nothing has been delivered to it.
	setNext(key: object | null, outline = true): void {
		this.nextOutlined = outline;
		if (key === this.next) {
			return;
		}
		const before = this.next === null ? undefined : this.buildings.get(this.next);
		if (before !== undefined && before.costs !== null && !before.costs.some((cost) => cost.share > 0)) {
			before.barsShownSince = null;
		}
		this.next = key;
		const building = key === null ? undefined : this.buildings.get(key);
		if (building !== undefined && building.costs !== null && building.barsShownSince === null) {
			building.barsShownSince = this.now();
		}
	}

	// Where the outline of the building the keeper works towards next is drawn: where
	// it will stand, while it waits underground; null for any other building
	outlineOf(key: object): { left: number; top: number; width: number; height: number } | null {
		const building = this.buildings.get(key);
		const sprite = building === undefined ? undefined : SPRITES[building.sprite];
		if (key !== this.next || !this.nextOutlined || building === undefined || sprite === undefined ||
				building.costs === null || building.rise.to > 0 || building.sunk) {
			return null;
		}
		return { left: building.x - sprite.width / 2, top: this.size.height - sprite.height, width: sprite.width, height: sprite.height };
	}

	// A building lifts while the one that will replace it gathers its materials
	setUpgrade(key: object, upgrade: object | null): void {
		const building = this.buildings.get(key);
		if (building !== undefined && building.upgrade !== upgrade) {
			building.upgrade = upgrade;
			this.settle(building);
		}
	}

	// The keeper raises a building out of the ground; its bars sink away as it rises
	raise(key: object, duration: number): void {
		const building = this.buildings.get(key);
		if (building === undefined) {
			return;
		}
		const now = this.now();
		const height = SPRITES[building.sprite]?.height ?? 0;
		building.rise = { from: at(building.rise, now), to: height, start: now, duration };
		building.barsSink = { from: at(building.barsSink, now), to: height + BARS_SHOW, start: now, duration: BARS_SINK_MS };
	}

	// A building left half raised drops back into the ground
	sink(key: object): void {
		const building = this.buildings.get(key);
		if (building !== undefined) {
			building.rise = still(0);
			building.barsSink = still(0);
		}
	}

	// The building done with its bars (it has been raised)
	raised(key: object): void {
		const building = this.buildings.get(key);
		if (building !== undefined) {
			building.costs = null;
		}
	}

	// A building being replaced sinks into the ground as its upgrade rises, or comes back up
	setSunk(key: object, sunk: boolean): void {
		const building = this.buildings.get(key);
		if (building !== undefined) {
			building.sunk = sunk;
			this.settle(building);
		}
	}

	setPriority(key: object | null): void {
		this.priority = key;
	}

	// The stockpile goes while a building is raised over it, and comes back once it stands
	hidePile(hidden: boolean): void {
		if (hidden !== this.pileHidden) {
			this.pileHidden = hidden;
			const now = this.now();
			this.pileShown = { from: at(this.pileShown, now), to: hidden ? 0 : 1, start: now, duration: hidden ? PILE_HIDE_MS : FADE_MS };
		}
	}

	// The duskshards found so far, gathered in the tower that stands at x
	setShards(count: number, x: number): void {
		this.shards = { count, x };
		if (count > 0) {
			this.sheet(SPRITES.gem?.sheet);
		}
	}

	// How the shards show now: which row of their sprite (one for each number of
	// shards) and which frame as they bob, and where; null without any
	shardsAt(now = this.now()): { row: number; frame: number; left: number; top: number } | null {
		const sprite = SPRITES.gem;
		if (this.shards.count <= 0 || sprite === undefined) {
			return null;
		}
		return {
			row: Math.min(this.shards.count, sprite.rows) - 1,
			frame: Math.floor(now / SHARD_FRAME_MS) % sprite.frames,
			left: Math.round(this.shards.x - sprite.width / 2),
			top: SHARDS_TOP,
		};
	}

	// The frame of the stockpile now, from its outside left and top (its border is a
	// pixel wide), and the size of its inside
	pileFrame(now = this.now()): { left: number; top: number; width: number; height: number } {
		const t = clamp((now - this.pileSince) / PILE_GROW_MS);
		const mix = (key: keyof PileBox) => this.pileFrom[key] + (this.pileTo[key] - this.pileFrom[key]) * t;
		const height = mix('height');
		return { left: mix('left'), top: this.size.height - mix('bottom') - height - 2, width: mix('width'), height };
	}

	// How visible the stockpile is, from 0 to 1, before night falls on it
	pileShownAt(now = this.now()): number {
		return this.stockpile === null ? 0 : clamp(at(this.pileShown, now));
	}

	// How full a block shows: a change in what it holds fills or empties it over a moment
	fillOf(block: StoredBlock, now = this.now()): number {
		let fill = this.fills.get(block.key);
		if (fill === undefined) {
			fill = still(block.share);
			this.fills.set(block.key, fill);
		} else if (fill.to !== block.share) {
			fill = { from: at(fill, now), to: block.share, start: now, duration: FILL_MS };
			this.fills.set(block.key, fill);
		}
		return clamp(at(fill, now));
	}

	setNight(night: boolean, fade = true): void {
		if (night !== this.night) {
			this.night = night;
			this.nightSince = fade ? this.now() : -Infinity;
		}
	}

	// How far night has fallen, from 0 to 1
	nightness(): number {
		const t = clamp((this.now() - this.nightSince) / FADE_MS);
		return this.night ? t : 1 - t;
	}

	// Where a building is drawn now: its left, top and size, in pixels in the world
	placeOf(key: object): { left: number; top: number; width: number; height: number } | null {
		const building = this.buildings.get(key);
		const sprite = building === undefined ? undefined : SPRITES[building.sprite];
		if (building === undefined || sprite === undefined) {
			return null;
		}
		const now = this.now();
		const bottom = this.size.height + sprite.height - at(building.rise, now) - at(building.lift, now);
		return { left: building.x - sprite.width / 2, top: bottom - sprite.height, width: sprite.width, height: sprite.height };
	}

	// Where a building's bars are drawn now, if they are up
	barsOf(key: object): { left: number; top: number; width: number; height: number } | null {
		const building = this.buildings.get(key);
		const place = this.placeOf(key);
		if (building === undefined || place === null || building.costs === null || building.barsShownSince === null) {
			return null;
		}
		const top = place.top - BARS_SHOW + at(building.barsSink, this.now());
		return { left: place.left - 1, top, width: place.width + 2, height: BARS_HEIGHT + 2 * BARS_BORDER };
	}

	// What a point in the world falls on: the building whose bars are there, or the
	// upgrade of a building lifted for one
	buildingAt(x: number, y: number): object | null {
		const inside = (box: { left: number; top: number; width: number; height: number } | null) =>
			box !== null && x >= box.left && x < box.left + box.width && y >= box.top && y < box.top + box.height &&
			y < this.size.height;
		for (const [key] of this.buildings) {
			if (inside(this.barsOf(key))) {
				return key;
			}
		}
		for (const [key, building] of this.buildings) {
			if (building.upgrade !== null && !building.sunk && inside(this.placeOf(key))) {
				return building.upgrade;
			}
		}
		return null;
	}

	// The cell under a point on the screen
	buildingAtClient(clientX: number, clientY: number): object | null {
		const rect = this.canvas.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) {
			return null;
		}
		return this.buildingAt((clientX - rect.left) * this.size.width / rect.width,
			(clientY - rect.top) * this.size.height / rect.height);
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
		this.beforeDraw?.();
		const now = this.now();
		this.followPile(now);
		const ctx = this.ctx;
		if (ctx === null) {
			return;
		}
		const day = 1 - this.nightness();
		ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
		ctx.clearRect(0, 0, this.size.width, this.size.height);
		ctx.imageSmoothingEnabled = false;
		if (day > 0) {
			ctx.globalAlpha = day;
			for (const [key, building] of this.buildings) {
				this.drawBuilding(ctx, key, building);
			}
			this.drawOutline(ctx, now, day);
			this.drawPile(ctx, now, day);
			for (const [key, building] of this.buildings) {
				this.drawBars(ctx, key, building, now, day);
			}
			ctx.globalAlpha = day;
			this.drawStar(ctx, now);
		}
		// The shards stay in sight when the tower fades into the night
		ctx.globalAlpha = 1;
		this.drawShards(ctx, now);
	}

	// The stockpile fades in when the village first has one, and its frame grows to
	// the size the level of the grain gives it
	private followPile(now: number): void {
		const there = this.stockpile !== null;
		if (there && !this.pileThere) {
			this.pileShown = { from: 0, to: this.pileHidden ? 0 : 1, start: now, duration: FADE_MS };
		}
		this.pileThere = there;
		const to = pileFor(this.levels.grain ?? 1);
		if (to !== this.pileTo) {
			const frame = this.pileFrame(now);
			this.pileFrom = { left: frame.left, bottom: this.size.height - frame.top - frame.height - 2, width: frame.width, height: frame.height };
			this.pileTo = to;
			this.pileSince = now;
		}
	}

	// The frame of the stockpile, and each block in it filled as far as it holds
	private drawPile(ctx: CanvasRenderingContext2D, now: number, day: number): void {
		const blocks = this.stockpile;
		const alpha = day * this.pileShownAt(now);
		if (blocks === null || alpha <= 0) {
			return;
		}
		ctx.globalAlpha = alpha;
		const frame = this.pileFrame(now);
		ctx.fillStyle = 'black';
		border(ctx, frame.left, frame.top, frame.width + 2, frame.height + 2);
		const places = pileLayout(blocks.length, frame.width, frame.height);
		blocks.forEach((block, i) => {
			const left = frame.left + 1 + places[i].left;
			const top = frame.top + 1 + places[i].top;
			ctx.fillStyle = 'black';
			border(ctx, left, top, BLOCK, BLOCK);
			ctx.fillStyle = materialColour(block.kind, this.levels[block.kind] ?? 1);
			ctx.fillRect(left + 1, top + 1, (BLOCK - 2) * this.fillOf(block, now), BLOCK - 2);
		});
	}

	// The shards gathered in the tower, bobbing
	private drawShards(ctx: CanvasRenderingContext2D, now: number): void {
		const shards = this.shardsAt(now);
		const sprite = SPRITES.gem;
		const sheet = this.ready(sprite?.sheet);
		if (shards === null || sprite === undefined || sheet === null) {
			return;
		}
		ctx.drawImage(sheet, sprite.x + shards.frame * sprite.width, sprite.y + shards.row * sprite.height,
			sprite.width, sprite.height, shards.left, shards.top, sprite.width, sprite.height);
	}

	private drawBuilding(ctx: CanvasRenderingContext2D, key: object, building: Drawn): void {
		const sprite = SPRITES[building.sprite];
		const sheet = this.ready(sprite?.sheet);
		const place = this.placeOf(key);
		if (sprite === undefined || sheet === null || place === null || place.top >= this.size.height) {
			return;
		}
		const row = Math.min(building.row, sprite.rows - 1);
		ctx.drawImage(sheet, sprite.x, sprite.y + row * sprite.height, sprite.width, sprite.height,
			place.left, place.top, sprite.width, sprite.height);
	}

	// The building the keeper works towards next, faintly where it will stand; it comes
	// into view with its bars
	private drawOutline(ctx: CanvasRenderingContext2D, now: number, day: number): void {
		const building = this.next === null ? undefined : this.buildings.get(this.next);
		const place = this.next === null ? null : this.outlineOf(this.next);
		const sprite = building === undefined ? undefined : SPRITES[building.sprite];
		const sheet = this.ready(sprite?.sheet);
		if (building === undefined || place === null || sprite === undefined || sheet === null) {
			return;
		}
		const row = Math.min(building.row, sprite.rows - 1);
		ctx.globalAlpha = day * OUTLINE_ALPHA * clamp((now - (building.barsShownSince ?? now)) / FADE_MS);
		ctx.drawImage(sheet, sprite.x, sprite.y + row * sprite.height, sprite.width, sprite.height,
			place.left, place.top, sprite.width, sprite.height);
	}

	// One bar for each kind of material, split into the blocks it takes: what is
	// delivered filled in its colour, and what is on its way less strongly
	private drawBars(ctx: CanvasRenderingContext2D, key: object, building: Drawn, now: number, day: number): void {
		const bars = this.barsOf(key);
		if (bars === null || building.costs === null || building.costs.length === 0 || building.barsShownSince === null) {
			return;
		}
		const alpha = day * clamp((now - building.barsShownSince) / FADE_MS);
		ctx.globalAlpha = alpha;
		ctx.fillStyle = 'black';
		ctx.fillRect(bars.left, bars.top, bars.width, BARS_BORDER);
		ctx.fillRect(bars.left, bars.top + bars.height - BARS_BORDER, bars.width, BARS_BORDER);
		ctx.fillRect(bars.left, bars.top, BARS_BORDER, bars.height);
		ctx.fillRect(bars.left + bars.width - BARS_BORDER, bars.top, BARS_BORDER, bars.height);
		const inner = { left: bars.left + BARS_BORDER, top: bars.top + BARS_BORDER, width: bars.width - 2 * BARS_BORDER };
		ctx.fillStyle = BARS_PANEL;
		ctx.globalAlpha = alpha * PANEL_ALPHA;
		ctx.fillRect(inner.left, inner.top, inner.width, BARS_HEIGHT);
		const height = BARS_HEIGHT / building.costs.length;
		building.costs.forEach((cost, i) => {
			const colour = materialColour(cost.kind, this.levels[cost.kind] ?? 1);
			let top = Math.round(inner.top + i * height);
			const bottom = Math.round(inner.top + (i + 1) * height);
			// A line between one material and the next, as dark as the border
			if (i > 0) {
				ctx.fillStyle = 'black';
				ctx.globalAlpha = alpha;
				ctx.fillRect(inner.left, top, inner.width, 1);
				top++;
			}
			const parts = segments(inner.width, cost.blocks ?? 1);
			const delivered = clamp(cost.share);
			const coming = clamp(delivered + (cost.waiting ?? 0));
			parts.forEach((part, j) => {
				const left = inner.left + part.left;
				const full = clamp(delivered * parts.length - j);
				const reached = clamp(coming * parts.length - j);
				ctx.fillStyle = colour;
				ctx.globalAlpha = alpha * MISSING_ALPHA;
				ctx.fillRect(left, top, part.width, bottom - top);
				if (reached > full) {
					ctx.globalAlpha = alpha * WAITING_ALPHA;
					ctx.fillRect(left + part.width * full, top, part.width * (reached - full), bottom - top);
				}
				ctx.globalAlpha = alpha;
				ctx.fillRect(left, top, part.width * full, bottom - top);
				// A line between one block and the next, as dark as the border
				if (j > 0) {
					ctx.fillStyle = 'black';
					ctx.fillRect(left - 1, top, 1, bottom - top);
				}
			});
		});
	}

	// The star over the building the keeper sees to first, twinkling
	private drawStar(ctx: CanvasRenderingContext2D, now: number): void {
		const building = this.priority === null ? undefined : this.buildings.get(this.priority);
		const sprite = SPRITES.star;
		const sheet = this.ready(sprite?.sheet);
		if (building === undefined || sprite === undefined || sheet === null) {
			return;
		}
		const frame = Math.floor(now / STAR_FRAME_MS) % sprite.frames;
		ctx.drawImage(sheet, sprite.x + frame * sprite.width, sprite.y, sprite.width, sprite.height,
			Math.round(building.x - sprite.width / 2), STAR_TOP, sprite.width, sprite.height);
	}

	// A building rests where it should: sunk away, lifted for its upgrade, or on the ground
	private settle(building: Drawn): void {
		const now = this.now();
		const height = SPRITES[building.sprite]?.height ?? 0;
		const to = building.sunk ? -height : building.upgrade !== null ? LIFT : 0;
		building.lift = { from: at(building.lift, now), to, start: now, duration: building.sunk ? SINK_MS : LIFT_MS };
	}

	private ready(name: string | undefined): HTMLImageElement | null {
		const image = this.sheet(name);
		return image !== undefined && image.complete && image.naturalWidth > 0 ? image : null;
	}

	private sheet(name: string | undefined): HTMLImageElement | undefined {
		if (name === undefined || this.ctx === null) {
			return undefined;
		}
		if (this.images[name] === undefined && SHEETS[name] !== undefined) {
			const image = new Image();
			image.src = SHEETS[name].file;
			this.images[name] = image;
		}
		return this.images[name];
	}
}
