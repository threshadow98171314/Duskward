// The village, drawn on a canvas in the world: its buildings rising out of the
// ground as the keeper raises them, lifted a little while an upgrade waits for its
// materials and sinking away once the upgrade rises, the bars of materials
// delivered to buildings yet to be raised, and the star over the building the
// keeper sees to first. By night the buildings fade into the dark. The game says
// what happens to each building; the view animates it.

import { SHEETS, SPRITES } from '../content/sprites.ts';

export interface VillageSize {
	width: number;
	height: number;
}

// One kind of material a building needs, and the share of it delivered so far
export interface Cost {
	kind: string;
	share: number;
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
// The bars panel: just above the ground once something is delivered
const BARS_SHOW = 20;
const BARS_HEIGHT = 18;
const BARS_BORDER = 2;
const STAR_TOP = 10;
const STAR_FRAME_MS = 200;
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
	// Called before every frame, to catch up with the page
	beforeDraw: (() => void) | null = null;

	private readonly ctx: CanvasRenderingContext2D | null;
	private readonly ratio: number;
	private readonly images: Record<string, HTMLImageElement> = {};
	private readonly buildings = new Map<object, Drawn>();
	private priority: object | null = null;
	private night = false;
	private nightSince = -Infinity;
	private frame = 0;

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

	// A building lifts while the one that will replace it gathers its materials
	setUpgrade(key: object, upgrade: object | null): void {
		const building = this.buildings.get(key);
		if (building !== undefined) {
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
		const ctx = this.ctx;
		if (ctx === null) {
			return;
		}
		const now = this.now();
		const day = 1 - this.nightness();
		ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
		ctx.clearRect(0, 0, this.size.width, this.size.height);
		ctx.imageSmoothingEnabled = false;
		if (day <= 0) {
			return;
		}
		ctx.globalAlpha = day;
		for (const [key, building] of this.buildings) {
			this.drawBuilding(ctx, key, building);
		}
		for (const [key, building] of this.buildings) {
			this.drawBars(ctx, key, building, now, day);
		}
		ctx.globalAlpha = day;
		this.drawStar(ctx, now);
		ctx.globalAlpha = 1;
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

	// One bar for each kind of material, the delivered share filled in its colour
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
		const height = BARS_HEIGHT / building.costs.length;
		building.costs.forEach((cost, i) => {
			const colour = materialColour(cost.kind, this.levels[cost.kind] ?? 1);
			const top = inner.top + i * height;
			// What is still missing shows faintly in the same colour
			ctx.fillStyle = colour;
			ctx.globalAlpha = alpha * 0.2;
			ctx.fillRect(inner.left, top, inner.width, height);
			ctx.globalAlpha = alpha;
			ctx.fillRect(inner.left, top, inner.width * clamp(cost.share), height);
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
