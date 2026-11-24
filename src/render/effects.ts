// Effects over the world and the board, drawn on a canvas in front of both: the
// bands of light when a lantern tile bursts, the board lighting up when a sun tile
// does, the beam of a level gained, the blast of a bomb, the loot found in a chest,
// the rays and the drops of shadow of the Eclipse's strikes, the dragon's fireballs
// and the flashes of what it blows up (and of itself, blown apart), the bits flying
// off cleared tiles, sparks, smoke and dust, and the whole board shaking when
// something big goes off. Each effect plays out over its own time and
// is then forgotten. By night the ground lies in the dark, but for the light of the
// keeper's lantern and of the village's windows.

import { SHEETS, SPRITES } from '../content/sprites.ts';
import { materialColour } from './village.ts';

export interface EffectsLayout {
	width: number;
	// The world, from the top of the canvas; the board's grid starts below it
	world: { height: number };
	board: { top: number; rows: number; columns: number; cell: number; pad: number };
}

// A point over the world or the board
export interface Point {
	x: number;
	y: number;
}

// Black light from the Eclipse, or lantern light piercing it
export type RayLook = 'black' | 'lantern';

export type Effect =
	| { kind: 'row' | 'column'; index: number; start: number }
	| { kind: 'board'; start: number }
	| { kind: 'beam'; x: number; start: number }
	| { kind: 'blast'; x: number; start: number }
	| { kind: 'loot'; name: string; x: number; start: number }
	| { kind: 'ray'; look: RayLook; from: Point; to: Point; start: number; lasts: number }
	| { kind: 'drops'; xs: number[]; y: number; start: number }
	| { kind: 'flash'; x: number; y: number; from: number; to: number; start: number; lasts: number }
	| { kind: 'bolt'; sprite: string; from: Point; to: Point; start: number; lasts: number };

// How long each kind of effect lasts, but for those that last as long as they are told
const LASTS: Record<Exclude<Effect['kind'], 'ray' | 'flash' | 'bolt'>, number> = {
	row: 700, column: 700, board: 700, beam: 1000, blast: 800, loot: 1500, drops: 700,
};
// The beam of a level gained grows down the sky, holds, then spreads across it and fades
const BEAM_GROW_MS = 200;
const BEAM_SPREAD_FROM = 500;
// A bomb's blast fills a circle this wide, centred on the ground under the keeper
const BLAST_RADIUS = 350;
// Loot shows above the chest it came from, and drifts up as it fades
const LOOT_ABOVE = 35;
const LOOT_RISE = 10;
const LOOT_FADE_MS = 300;
// A ray's colours from end to end, how thick it is, and its glow
const RAYS: Record<RayLook, { from: string; to: string; width: number; glow: string; blur: number }> = {
	black: { from: '#2a1438', to: '#7c5696', width: 3, glow: 'rgba(184, 148, 204, 0.8)', blur: 8 },
	lantern: { from: '#ffe9a0', to: 'rgba(255, 233, 160, 0.2)', width: 4, glow: 'rgba(255, 210, 92, 0.8)', blur: 10 },
};
// Drops of shadow fall this far, faster as they go, fading
const DROP_FALL = 40;
// Particles in the air at most, the oldest giving way
const MOST_PARTICLES = 400;
// The dark of night, deepest at the ground; and how far lights reach into it
const NIGHT_FADE_MS = 1400;
const DARKNESS = 0.62;
const DARK_FROM = 0.25;
const LANTERN_REACH = 72;
const WINDOW_REACH = 26;

// Something giving light at night, in the world: where it is and how far it reaches
export interface Light {
	x: number;
	y: number;
	reach: number;
}

// A bit flying off something: where and when it set off, its speed (px/s), how hard
// it falls (px/s²), its colour and size, and how long it lasts
export interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	gravity: number;
	born: number;
	life: number;
	colour: string;
	size: number;
}

// How a spray of particles flies: how many, how fast, for how long, how they fall,
// and how far they lean upwards (0 every way, 1 all up)
export interface Spray {
	count: number;
	speed: number;
	life: number;
	gravity: number;
	size: number;
	upward: number;
}

function clamp(t: number): number {
	return Math.min(1, Math.max(0, t));
}

function easeOut(t: number): number {
	return 1 - (1 - t) * (1 - t);
}

function lastsOf(effect: Effect): number {
	return 'lasts' in effect ? effect.lasts : LASTS[effect.kind];
}

export class EffectsView {
	// Called with how far to move the board while it shakes (0, 0 once it is still)
	onShake: ((dx: number, dy: number) => void) | null = null;

	private readonly ctx: CanvasRenderingContext2D | null;
	private readonly ratio: number;
	private readonly images: Record<string, HTMLImageElement> = {};
	readonly effects: Effect[] = [];
	// The level of each kind of tile, for the colours of the bits off cleared tiles
	levels: Record<string, number> = {};
	readonly particles: Particle[] = [];
	// Called before every frame, to catch up with the page
	beforeDraw: (() => void) | null = null;
	// Where the keeper is, and the village's buildings with their windows lit at night
	keeper: number | null = null;
	windows: number[] = [];
	private night = false;
	private nightSince = -Infinity;
	private dark: HTMLCanvasElement | null = null;
	private shaking: { start: number; duration: number; strength: number } | null = null;
	private frame = 0;

	constructor(
		canvas: HTMLCanvasElement,
		readonly layout: EffectsLayout,
		private readonly now: () => number = () => performance.now(),
		private readonly random: () => number = Math.random,
	) {
		this.ratio = Math.max(1, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
		this.ctx = canvas.getContext('2d');
		if (this.ctx !== null) {
			const height = this.height();
			canvas.width = Math.round(layout.width * this.ratio);
			canvas.height = Math.round(height * this.ratio);
			canvas.style.width = layout.width + 'px';
			canvas.style.height = height + 'px';
			this.sheet(SPRITES.items?.sheet);
		}
	}

	// A lantern tile burst: light runs along its row and down its column
	lanternBurst(row: number, column: number): void {
		const start = this.now();
		this.effects.push({ kind: 'row', index: row, start }, { kind: 'column', index: column, start });
	}

	sunBurst(): void {
		this.effects.push({ kind: 'board', start: this.now() });
	}

	levelBeam(x: number): void {
		this.effects.push({ kind: 'beam', x, start: this.now() });
	}

	blast(x: number): void {
		this.effects.push({ kind: 'blast', x, start: this.now() });
	}

	loot(name: string, x: number): void {
		this.effects.push({ kind: 'loot', name, x, start: this.now() });
	}

	// A ray of light between two points, for a while
	ray(look: RayLook, from: Point, to: Point, lasts: number): void {
		this.effects.push({ kind: 'ray', look, from, to, start: this.now(), lasts });
	}

	// Drops of shadow falling from a height, one at each place along it
	shadowRain(xs: number[], y: number): void {
		this.effects.push({ kind: 'drops', xs, y, start: this.now() });
	}

	// A white flash swelling from one size to another and fading, within the world
	flash(x: number, y: number, from: number, to: number, lasts: number): void {
		this.effects.push({ kind: 'flash', x, y, from, to, start: this.now(), lasts });
	}

	// Something flying straight from one point to another, turned the way it flies
	bolt(sprite: string, from: Point, to: Point, lasts: number): void {
		this.sheet(SPRITES[sprite]?.sheet);
		this.effects.push({ kind: 'bolt', sprite, from, to, start: this.now(), lasts });
	}

	// Particles from a point, in a colour
	spray(x: number, y: number, colour: string, spray: Spray): void {
		const born = this.now();
		for (let i = 0; i < spray.count; i++) {
			const angle = -Math.PI / 2 + (this.random() * 2 - 1) * Math.PI * (1 - spray.upward / 2);
			const speed = spray.speed * (0.4 + 0.6 * this.random());
			this.particles.push({
				x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, gravity: spray.gravity,
				born, life: spray.life * (0.7 + 0.3 * this.random()), colour, size: spray.size,
			});
		}
		if (this.particles.length > MOST_PARTICLES) {
			this.particles.splice(0, this.particles.length - MOST_PARTICLES);
		}
	}

	// Bits of a cleared tile fly off its cell, in the colour of what it gave
	tileBits(row: number, column: number, kind: string, count: number): void {
		const { board } = this.layout;
		this.spray(board.pad + (column + 0.5) * board.cell, board.top + board.pad + (row + 0.5) * board.cell,
			materialColour(kind, this.levels[kind] ?? 1), { count, speed: 160, life: 450, gravity: 500, size: 3, upward: 0.6 });
	}

	// Sparks where the keeper's blow lands
	sparks(x: number): void {
		this.spray(x, this.layout.world.height - 18, '#fff3c4', { count: 6, speed: 140, life: 220, gravity: 0, size: 2, upward: 0 });
	}

	// A fallen monster's last breath of shadow
	smoke(x: number): void {
		this.spray(x, this.layout.world.height - 12, 'rgba(48, 32, 72, 0.85)',
			{ count: 12, speed: 45, life: 800, gravity: -30, size: 4, upward: 0.8 });
	}

	// Dust along the foot of a building that has just stood up
	dust(x: number, width: number): void {
		for (let i = 0; i < 5; i++) {
			this.spray(x - width / 2 + width * (i + 0.5) / 5, this.layout.world.height - 2, '#c9b28a',
				{ count: 3, speed: 50, life: 700, gravity: 40, size: 3, upward: 0.9 });
		}
	}

	// Where a particle is now, and how much of it is left (from 1 to 0), or null once gone
	particleAt(particle: Particle, now: number): { x: number; y: number; left: number } | null {
		const age = now - particle.born;
		if (age >= particle.life) {
			return null;
		}
		const s = age / 1000;
		return {
			x: particle.x + particle.vx * s,
			y: particle.y + particle.vy * s + particle.gravity * s * s / 2,
			left: 1 - age / particle.life,
		};
	}

	setNight(night: boolean, fade = true): void {
		if (night !== this.night) {
			this.night = night;
			this.nightSince = fade ? this.now() : -Infinity;
		}
	}

	// How far night has fallen, from 0 to 1
	nightness(): number {
		const t = clamp((this.now() - this.nightSince) / NIGHT_FADE_MS);
		return this.night ? t : 1 - t;
	}

	// The lights in the world now: the keeper's lantern, flickering a little, and the windows
	lights(now: number): Light[] {
		const ground = this.layout.world.height;
		const lights: Light[] = this.windows.map((x) => ({ x, y: ground - 14, reach: WINDOW_REACH }));
		if (this.keeper !== null) {
			const flicker = 1 + 0.04 * Math.sin(now / 90) + 0.03 * Math.sin(now / 37);
			lights.push({ x: this.keeper, y: ground - 20, reach: LANTERN_REACH * flicker });
		}
		return lights;
	}

	// Shakes the board, hardest at first; a stronger shake takes over a weaker one
	shake(strength: number, duration: number): void {
		const now = this.now();
		if (this.shaking === null || this.strengthAt(now) <= strength) {
			this.shaking = { start: now, duration, strength };
		}
	}

	// How far the board may move now, in pixels either way
	strengthAt(now: number): number {
		if (this.shaking === null) {
			return 0;
		}
		const t = (now - this.shaking.start) / this.shaking.duration;
		return t >= 1 ? 0 : this.shaking.strength * (1 - t) * (1 - t);
	}

	// How far into its time an effect is, from 0 to 1, or null once it is over
	progress(effect: Effect, now: number): number | null {
		const t = (now - effect.start) / lastsOf(effect);
		return t >= 1 ? null : clamp(t);
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
		for (let i = this.effects.length - 1; i >= 0; i--) {
			if (this.progress(this.effects[i], now) === null) {
				this.effects.splice(i, 1);
			}
		}
		for (let i = this.particles.length - 1; i >= 0; i--) {
			if (this.particleAt(this.particles[i], now) === null) {
				this.particles.splice(i, 1);
			}
		}
		this.applyShake(now);
		const ctx = this.ctx;
		if (ctx === null) {
			return;
		}
		ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
		ctx.clearRect(0, 0, this.layout.width, this.height());
		ctx.imageSmoothingEnabled = false;
		this.drawDarkness(ctx, now);
		for (const effect of this.effects) {
			const t = this.progress(effect, now);
			if (t !== null) {
				ctx.save();
				this.drawEffect(ctx, effect, t);
				ctx.restore();
			}
		}
		for (const particle of this.particles) {
			const place = this.particleAt(particle, now);
			if (place !== null) {
				ctx.globalAlpha = place.left;
				ctx.fillStyle = particle.colour;
				ctx.fillRect(Math.round(place.x - particle.size / 2), Math.round(place.y - particle.size / 2), particle.size, particle.size);
			}
		}
		ctx.globalAlpha = 1;
	}

	// The dark of night over the ground, with pools of light cut out of it. It is drawn
	// on a canvas of its own first, so cutting the light out leaves the rest alone.
	private drawDarkness(ctx: CanvasRenderingContext2D, now: number): void {
		const night = this.nightness();
		if (night <= 0 || typeof document === 'undefined') {
			return;
		}
		const { width } = this.layout, height = this.layout.world.height;
		if (this.dark === null) {
			this.dark = document.createElement('canvas');
			this.dark.width = Math.round(width * this.ratio);
			this.dark.height = Math.round(height * this.ratio);
		}
		const dark = this.dark.getContext('2d');
		if (dark === null) {
			return;
		}
		dark.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
		dark.globalCompositeOperation = 'source-over';
		dark.clearRect(0, 0, width, height);
		const shade = dark.createLinearGradient(0, 0, 0, height);
		shade.addColorStop(DARK_FROM, 'rgba(8, 5, 18, 0)');
		shade.addColorStop(1, `rgba(8, 5, 18, ${DARKNESS * night})`);
		dark.fillStyle = shade;
		dark.fillRect(0, 0, width, height);
		dark.globalCompositeOperation = 'destination-out';
		for (const light of this.lights(now)) {
			const pool = dark.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.reach);
			pool.addColorStop(0, 'rgba(0, 0, 0, 1)');
			pool.addColorStop(0.55, 'rgba(0, 0, 0, 0.75)');
			pool.addColorStop(1, 'rgba(0, 0, 0, 0)');
			dark.fillStyle = pool;
			dark.fillRect(light.x - light.reach, light.y - light.reach, light.reach * 2, light.reach * 2);
		}
		ctx.drawImage(this.dark, 0, 0, width, height);
		// A warm glow around the lantern itself
		if (this.keeper !== null) {
			const lantern = this.lights(now)[this.windows.length];
			const glow = ctx.createRadialGradient(lantern.x, lantern.y, 0, lantern.x, lantern.y, lantern.reach * 0.6);
			glow.addColorStop(0, `rgba(255, 196, 110, ${0.16 * night})`);
			glow.addColorStop(1, 'rgba(255, 196, 110, 0)');
			ctx.fillStyle = glow;
			ctx.fillRect(lantern.x - lantern.reach, lantern.y - lantern.reach, lantern.reach * 2, lantern.reach * 2);
		}
	}

	private applyShake(now: number): void {
		const strength = this.strengthAt(now);
		if (strength > 0) {
			this.onShake?.(Math.round((this.random() * 2 - 1) * strength), Math.round((this.random() * 2 - 1) * strength));
		} else if (this.shaking !== null) {
			this.shaking = null;
			this.onShake?.(0, 0);
		}
	}

	private drawEffect(ctx: CanvasRenderingContext2D, effect: Effect, t: number): void {
		const { board, world } = this.layout;
		const gridLeft = board.pad, gridTop = board.top + board.pad;
		const gridWidth = board.columns * board.cell, gridHeight = board.rows * board.cell;
		switch (effect.kind) {
			case 'row':
			case 'column': {
				ctx.globalAlpha = 1 - easeOut(t);
				const along = effect.kind === 'row';
				const at = (along ? gridTop : gridLeft) + effect.index * board.cell;
				const light = along ? ctx.createLinearGradient(0, at, 0, at + board.cell)
					: ctx.createLinearGradient(at, 0, at + board.cell, 0);
				light.addColorStop(0, 'rgba(255, 210, 92, 0)');
				light.addColorStop(0.5, 'rgba(255, 236, 160, 0.9)');
				light.addColorStop(1, 'rgba(255, 210, 92, 0)');
				ctx.fillStyle = light;
				if (along) {
					ctx.fillRect(gridLeft, at, gridWidth, board.cell);
				} else {
					ctx.fillRect(at, gridTop, board.cell, gridHeight);
				}
				break;
			}
			case 'board': {
				ctx.globalAlpha = 1 - easeOut(t);
				const cx = gridLeft + gridWidth / 2, cy = gridTop + gridHeight / 2;
				const light = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(gridWidth, gridHeight) / 2);
				light.addColorStop(0, 'rgba(255, 246, 228, 0.95)');
				light.addColorStop(0.5, 'rgba(255, 210, 92, 0.6)');
				light.addColorStop(0.8, 'rgba(255, 210, 92, 0)');
				ctx.fillStyle = light;
				ctx.fillRect(gridLeft, gridTop, gridWidth, gridHeight);
				break;
			}
			case 'beam': {
				const ms = t * LASTS.beam;
				const height = world.height * easeOut(clamp(ms / BEAM_GROW_MS));
				const spread = easeOut(clamp((ms - BEAM_SPREAD_FROM) / (LASTS.beam - BEAM_SPREAD_FROM)));
				const left = (effect.x - 1) * (1 - spread);
				const width = 2 + (this.layout.width - 2) * spread;
				ctx.globalAlpha = 1 - spread;
				ctx.fillStyle = 'white';
				ctx.fillRect(left, 0, width, height);
				break;
			}
			case 'blast': {
				const grow = easeOut(t);
				ctx.beginPath();
				ctx.rect(0, 0, this.layout.width, world.height);
				ctx.clip();
				ctx.globalAlpha = 1 - grow;
				ctx.fillStyle = 'white';
				ctx.beginPath();
				ctx.arc(effect.x, world.height, BLAST_RADIUS * grow, 0, 2 * Math.PI);
				ctx.fill();
				break;
			}
			case 'loot': {
				const sprite = SPRITES.items;
				const sheet = this.ready(sprite?.sheet);
				const frame = sprite?.names?.indexOf(effect.name) ?? -1;
				if (sprite === undefined || sheet === null || frame < 0) {
					break;
				}
				const fade = clamp((t * LASTS.loot - (LASTS.loot - LOOT_FADE_MS)) / LOOT_FADE_MS);
				ctx.globalAlpha = 1 - fade;
				ctx.drawImage(sheet, sprite.x + frame * sprite.width, sprite.y, sprite.width, sprite.height,
					Math.round(effect.x - sprite.width / 2), Math.round(world.height - LOOT_ABOVE - sprite.height - LOOT_RISE * fade),
					sprite.width, sprite.height);
				break;
			}
			case 'ray': {
				const look = RAYS[effect.look];
				const { from, to } = effect;
				const light = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
				light.addColorStop(0, look.from);
				light.addColorStop(1, look.to);
				ctx.strokeStyle = light;
				ctx.lineWidth = look.width;
				// Shadows are not scaled with the rest of the canvas
				ctx.shadowColor = look.glow;
				ctx.shadowBlur = look.blur * this.ratio;
				ctx.beginPath();
				ctx.moveTo(from.x, from.y);
				ctx.lineTo(to.x, to.y);
				ctx.stroke();
				break;
			}
			case 'drops': {
				const fall = t * t;
				ctx.globalAlpha = 1 - 0.8 * fall;
				ctx.fillStyle = '#3a2350';
				ctx.shadowColor = '#b894cc';
				ctx.shadowBlur = 3 * this.ratio;
				ctx.beginPath();
				for (const x of effect.xs) {
					ctx.roundRect(x - 2, effect.y + DROP_FALL * fall, 4, 8, 2);
				}
				ctx.fill();
				break;
			}
			case 'flash': {
				const grow = easeOut(t);
				ctx.beginPath();
				ctx.rect(0, 0, this.layout.width, world.height);
				ctx.clip();
				ctx.globalAlpha = 1 - grow;
				ctx.fillStyle = 'white';
				ctx.beginPath();
				ctx.arc(effect.x, effect.y, effect.from + (effect.to - effect.from) * grow, 0, 2 * Math.PI);
				ctx.fill();
				break;
			}
			case 'bolt': {
				const sprite = SPRITES[effect.sprite];
				const sheet = this.ready(sprite?.sheet);
				if (sprite === undefined || sheet === null) {
					break;
				}
				const { from, to } = effect;
				const angle = Math.atan2(to.y - from.y, to.x - from.x);
				// Its first frame flies left, its second right
				const right = Math.abs(angle) <= Math.PI / 2 ? 1 : 0;
				ctx.translate(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
				ctx.rotate(right ? angle : angle - Math.PI);
				ctx.drawImage(sheet, sprite.x + right * sprite.width, sprite.y, sprite.width, sprite.height,
					-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
				break;
			}
		}
	}

	private height(): number {
		const { board } = this.layout;
		return board.top + board.rows * board.cell + 2 * board.pad;
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
