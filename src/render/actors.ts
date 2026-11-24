// The field's figures, drawn on a canvas in front of the village: the keeper (and
// the block they carry), the monsters with their health bars and, for a while,
// their bodies, the chests, and the arrows and fireballs in flight; and behind them
// all, the boss in the sky while it is out (src/render/eclipse.ts). The field says
// where everyone is after each tick and what frame they are in; the view glides
// them there in time for the next tick.

import { TICK_MS } from '../core/field.ts';
import { SHEETS, SPRITES } from '../content/sprites.ts';
import { materialColour } from './village.ts';

export interface ActorsSize {
	width: number;
	height: number;
}

// Where a figure is, what it is doing (the row of its sprite) and its frame
export interface Pose {
	x: number;
	row: number;
	frame: number;
}

interface Motion {
	from: number;
	to: number;
	start: number;
	duration: number;
}

interface Figure {
	sprite: string;
	x: Motion;
	row: number;
	frame: number;
	// Flying monsters keep above the ground
	lift: number;
	// Hidden while a monster vanishes to the far side of the field; fading once buried
	alpha: Motion;
	// A monster's health, from 0 to 1, and its bar, gone once it falls
	health: number | null;
	bar: Motion;
	opened: boolean;
	buried: boolean;
}

interface Flight {
	kind: string;
	from: number;
	to: number;
	start: number;
}

const FADE_MS = 1400;
const HIDE_MS = 200;
// Further than this in one tick, the field moved someone without walking them
const JUMP = 60;
const CORPSE_MS = 5000;
// Health bars sit this far above a monster's head
const BAR_ABOVE = 15;
const BAR_WIDTH = 32;
const BAR_HEIGHT = 5;
const FLYING_LIFT = 24;
// Arrows and fireballs: a second in the air, rising this high from this far off the ground
const FLIGHT_MS = 1000;
const FLIGHT_BASE = 20;
const FLIGHT_RISE = 75;
const ARROW_LENGTH = 8;
// The block the keeper carries: its place on the keeper's sprite, and its size
const HELD = { right: 5, top: 6, size: 10 };

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

export class ActorsView {
	// The level of each kind of tile, for the colour of a carried block
	levels: Record<string, number> = {};
	// Called before every frame, to catch up with the page
	beforeDraw: (() => void) | null = null;
	// The boss in the sky while it is out, in front of the village but behind everyone
	boss: { draw(ctx: CanvasRenderingContext2D): void } | null = null;

	private readonly ctx: CanvasRenderingContext2D | null;
	private readonly ratio: number;
	private readonly images: Record<string, HTMLImageElement> = {};
	private keeper: Figure | null = null;
	private held: { kind: string; fill: number } | null = null;
	private readonly monsters = new Map<object, Figure>();
	private readonly chests = new Map<object, Figure>();
	private readonly flights: Flight[] = [];
	private night = false;
	private nightSince = -Infinity;
	private frame = 0;

	constructor(
		canvas: HTMLCanvasElement,
		readonly size: ActorsSize,
		private readonly now: () => number = () => performance.now(),
	) {
		this.ratio = Math.max(1, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
		this.ctx = canvas.getContext('2d');
		if (this.ctx !== null) {
			canvas.width = Math.round(size.width * this.ratio);
			canvas.height = Math.round(size.height * this.ratio);
			canvas.style.width = size.width + 'px';
			canvas.style.height = size.height + 'px';
			for (const name of ['dude', 'dudenight', 'treasurechest', 'fireball']) {
				this.sheet(SPRITES[name]?.sheet);
			}
		}
	}

	// The keeper, where the field has them, and the block they carry, if any
	setKeeper(pose: Pose, held: { kind: string; fill: number } | null): void {
		if (this.keeper === null) {
			this.keeper = this.figure('dude', pose.x);
		}
		this.pose(this.keeper, pose);
		this.held = held;
	}

	addMonster(key: object, sprite: string, x: number, flying: boolean): void {
		const figure = this.figure(sprite, x);
		figure.lift = flying ? FLYING_LIFT : 0;
		figure.health = 1;
		this.monsters.set(key, figure);
		this.sheet(SPRITES[sprite]?.sheet);
	}

	updateMonster(key: object, pose: Pose, health: number, hidden: boolean): void {
		const figure = this.monsters.get(key);
		if (figure === undefined) {
			return;
		}
		this.pose(figure, pose);
		figure.health = health;
		const now = this.now();
		const visible = hidden ? 0 : 1;
		if (figure.alpha.to !== visible) {
			figure.alpha = { from: at(figure.alpha, now), to: visible, start: now, duration: HIDE_MS };
		}
	}

	// A monster falls: its health bar goes
	killMonster(key: object): void {
		const figure = this.monsters.get(key);
		if (figure !== undefined) {
			figure.bar = { from: at(figure.bar, this.now()), to: 0, start: this.now(), duration: HIDE_MS };
		}
	}

	// A fallen monster is gone from the field; its body stays a while, then fades
	buryMonster(key: object): void {
		const figure = this.monsters.get(key);
		if (figure !== undefined) {
			const now = this.now();
			figure.alpha = { from: at(figure.alpha, now), to: 0, start: now + CORPSE_MS, duration: HIDE_MS };
			figure.buried = true;
		}
	}

	addChest(key: object, x: number): void {
		this.chests.set(key, this.figure('treasurechest', x));
	}

	openChest(key: object): void {
		const chest = this.chests.get(key);
		if (chest !== undefined) {
			chest.opened = true;
		}
	}

	shoot(kind: string, from: number, to: number): void {
		this.flights.push({ kind, from, to, start: this.now() });
	}

	// Daybreak: the monsters, their bodies and the chests are gone
	clear(): void {
		this.monsters.clear();
		this.chests.clear();
		this.flights.length = 0;
	}

	setNight(night: boolean, fade = true): void {
		if (night !== this.night) {
			this.night = night;
			this.nightSince = fade ? this.now() : -Infinity;
		}
	}

	nightness(): number {
		const t = clamp((this.now() - this.nightSince) / FADE_MS);
		return this.night ? t : 1 - t;
	}

	// Where a monster is drawn now, how visible, and its health bar (for tests)
	monsterAt(key: object): { x: number; alpha: number; bar: number } | null {
		const figure = this.monsters.get(key);
		if (figure === undefined) {
			return null;
		}
		const now = this.now();
		return { x: at(figure.x, now), alpha: at(figure.alpha, now), bar: at(figure.bar, now) };
	}

	keeperX(): number | null {
		return this.keeper === null ? null : at(this.keeper.x, this.now());
	}

	// Where an arrow or fireball is in its flight: x, height off the ground and its tilt
	flightAt(flight: { from: number; to: number; start: number }, now: number): { x: number; y: number; angle: number } | null {
		const t = (now - flight.start) / FLIGHT_MS;
		if (t < 0 || t >= 1) {
			return null;
		}
		const x = flight.from + (flight.to - flight.from) * t;
		// Up to the top of the arc, slowing; then down again, quickening
		const height = t < 0.5 ? 1 - (1 - 2 * t) ** 2 : 1 - (2 * t - 1) ** 2;
		const y = this.size.height - FLIGHT_BASE - FLIGHT_RISE * height;
		const tilt = Math.PI / 4 * (t < 0.5 ? 1 - 2 * t : -(2 * t - 1));
		return { x, y, angle: flight.to > flight.from ? -tilt : tilt };
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
		// Bodies that have faded away are forgotten
		for (const [key, figure] of this.monsters) {
			if (figure.buried && now >= figure.alpha.start + figure.alpha.duration) {
				this.monsters.delete(key);
			}
		}
		const ctx = this.ctx;
		if (ctx === null) {
			return;
		}
		ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
		ctx.clearRect(0, 0, this.size.width, this.size.height);
		ctx.imageSmoothingEnabled = false;
		const night = this.nightness();
		this.boss?.draw(ctx);

		// Chests only show at night, which is the only time they lie about
		if (night > 0) {
			ctx.globalAlpha = night;
			for (const chest of this.chests.values()) {
				this.drawFigure(ctx, chest, chest.opened ? 1 : 0, 0, now);
			}
		}
		for (const monster of this.monsters.values()) {
			const alpha = at(monster.alpha, now);
			if (alpha <= 0) {
				continue;
			}
			ctx.globalAlpha = alpha;
			const top = this.drawFigure(ctx, monster, monster.row, monster.frame, now);
			const bar = at(monster.bar, now);
			if (monster.health !== null && bar > 0 && top !== null) {
				ctx.globalAlpha = alpha * bar;
				this.drawHealth(ctx, at(monster.x, now), top - BAR_ABOVE, monster.health);
			}
		}
		ctx.globalAlpha = 1;
		this.drawFlights(ctx, now);
		if (this.keeper !== null) {
			// By night the keeper wears their night sprite, fading in over the day one
			const top = this.drawFigure(ctx, this.keeper, this.keeper.row, this.keeper.frame, now);
			if (night > 0) {
				ctx.globalAlpha = night;
				this.drawFigure(ctx, { ...this.keeper, sprite: 'dudenight' }, this.keeper.row, this.keeper.frame, now);
				ctx.globalAlpha = 1;
			}
			if (this.held !== null && top !== null) {
				this.drawHeld(ctx, at(this.keeper.x, now), top, this.keeper.frame);
			}
		}
		ctx.globalAlpha = 1;
	}

	private figure(sprite: string, x: number): Figure {
		return {
			sprite, x: still(x), row: 0, frame: 0, lift: 0, alpha: still(1), health: null, bar: still(1), opened: false, buried: false,
		};
	}

	// Glides a figure to where the field has it, arriving as the next tick comes
	private pose(figure: Figure, pose: Pose): void {
		const now = this.now();
		const from = at(figure.x, now);
		figure.x = Math.abs(pose.x - from) > JUMP ? still(pose.x) : { from, to: pose.x, start: now, duration: TICK_MS };
		figure.row = pose.row;
		figure.frame = pose.frame;
	}

	// Draws a figure standing on the ground (or flying above it); returns the top of its sprite
	private drawFigure(ctx: CanvasRenderingContext2D, figure: Figure, row: number, frame: number, now: number): number | null {
		const sprite = SPRITES[figure.sprite];
		const sheet = this.ready(sprite?.sheet);
		if (sprite === undefined || sheet === null) {
			return null;
		}
		const left = Math.round(at(figure.x, now) - sprite.width / 2);
		const top = this.size.height - figure.lift - sprite.height;
		ctx.drawImage(sheet, sprite.x + (frame % sprite.frames) * sprite.width, sprite.y + Math.min(row, sprite.rows - 1) * sprite.height,
			sprite.width, sprite.height, left, top, sprite.width, sprite.height);
		return top;
	}

	private drawHealth(ctx: CanvasRenderingContext2D, x: number, top: number, health: number): void {
		const left = Math.round(x - BAR_WIDTH / 2);
		ctx.fillStyle = 'white';
		ctx.fillRect(left, top, BAR_WIDTH, 1);
		ctx.fillRect(left, top + BAR_HEIGHT - 1, BAR_WIDTH, 1);
		ctx.fillRect(left, top, 1, BAR_HEIGHT);
		ctx.fillRect(left + BAR_WIDTH - 1, top, 1, BAR_HEIGHT);
		ctx.fillRect(left + 1, top + 1, Math.round((BAR_WIDTH - 2) * clamp(health)), BAR_HEIGHT - 2);
	}

	// The block over the keeper's shoulder, bobbing as they walk; it fills from the right
	private drawHeld(ctx: CanvasRenderingContext2D, x: number, top: number, frame: number): void {
		const sprite = SPRITES.dude;
		if (sprite === undefined || this.held === null) {
			return;
		}
		const bob = frame === 1 ? 1 : frame === 3 ? -1 : 0;
		const left = Math.round(x - sprite.width / 2) + sprite.width - HELD.right - HELD.size;
		const y = top + HELD.top + bob;
		const inner = HELD.size - 2;
		ctx.fillStyle = 'black';
		ctx.fillRect(left, y, HELD.size, 1);
		ctx.fillRect(left, y + HELD.size - 1, HELD.size, 1);
		ctx.fillRect(left, y, 1, HELD.size);
		ctx.fillRect(left + HELD.size - 1, y, 1, HELD.size);
		const fill = Math.round(inner * clamp(this.held.fill));
		ctx.fillStyle = materialColour(this.held.kind, this.levels[this.held.kind] ?? 1);
		ctx.fillRect(left + 1 + inner - fill, y + 1, fill, inner);
	}

	private drawFlights(ctx: CanvasRenderingContext2D, now: number): void {
		for (let i = this.flights.length - 1; i >= 0; i--) {
			const flight = this.flights[i];
			const place = this.flightAt(flight, now);
			if (place === null) {
				if (now >= flight.start + FLIGHT_MS) {
					this.flights.splice(i, 1);
				}
				continue;
			}
			ctx.save();
			ctx.translate(place.x, place.y);
			ctx.rotate(place.angle);
			const sprite = SPRITES.fireball;
			const sheet = this.ready(sprite?.sheet);
			if (flight.kind === 'fireball' && sprite !== undefined && sheet !== null) {
				const facing = flight.to > flight.from ? 1 : 0;
				ctx.drawImage(sheet, sprite.x + facing * sprite.width, sprite.y, sprite.width, sprite.height,
					-sprite.width / 2, -sprite.height, sprite.width, sprite.height);
			} else {
				ctx.fillStyle = 'white';
				ctx.fillRect(-ARROW_LENGTH / 2, -1, ARROW_LENGTH, 1);
			}
			ctx.restore();
		}
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
