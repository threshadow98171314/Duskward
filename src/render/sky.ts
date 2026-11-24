// The sky over the village, drawn on a canvas behind everything else in the world:
// its colours by day and by night, the stars, the glow of dusk, the sun or the
// moon (with the bite the Eclipse has taken out of the sun), clouds drifting across
// it, the distant mountains the sun sets behind and the nearer hills at their feet,
// and the lights the village keeps burning through the night. Night and dusk fade in
// and out; the game says where the sun or moon is headed.

import { SHEETS, SPRITES } from '../content/sprites.ts';

export interface SkySize {
	width: number;
	height: number;
}

interface Motion {
	from: number;
	to: number;
	start: number;
	duration: number;
}

const FADE_MS = 1400;
const DAY_SKY = [188, 221, 233];
const NIGHT_SKY = [26, 20, 51];
// The bite out of the sun: a disc of the Eclipse's black creeping across its face
const BITE_RADIUS = 11;
// The village's lights: a small window and its glow, a little above the ground
const LIGHT_SIZE = 4;
const LIGHT_HEIGHT = 12;
const FLICKER_MS = 2800;
const FLICKER_SPREAD_MS = 700;
// The clouds: which picture, how high, how fast they drift (px/s) and where they start;
// the higher ones, further off, drift slower
const CLOUDS = [
	{ frame: 2, y: 6, speed: 3, from: 60 },
	{ frame: 0, y: 14, speed: 4.5, from: 300 },
	{ frame: 1, y: 24, speed: 6, from: 170 },
	{ frame: 0, y: 34, speed: 8, from: 420 },
];
// By night the clouds all but fade
const NIGHT_CLOUDS = 0.35;
// The ridges along the bottom of the sky, far to near
const RIDGES = ['mountains', 'hills'];

function clamp(t: number): number {
	return Math.min(1, Math.max(0, t));
}

function at(motion: Motion, now: number): number {
	const t = motion.duration <= 0 ? (now >= motion.start ? 1 : 0) : clamp((now - motion.start) / motion.duration);
	return motion.from + (motion.to - motion.from) * t;
}

function mix(a: number[], b: number[], t: number): string {
	return 'rgb(' + a.map((value, i) => Math.round(value + (b[i] - value) * t)).join(', ') + ')';
}

export class SkyView {
	// Called before every frame, to catch up with the page
	beforeDraw: (() => void) | null = null;

	private readonly ctx: CanvasRenderingContext2D | null;
	private readonly ratio: number;
	private readonly images: Record<string, HTMLImageElement> = {};
	private night = false;
	private nightSince = -Infinity;
	private dusk = false;
	private duskSince = -Infinity;
	private sunX: Motion;
	private sunY: Motion;
	private face = 0;
	private frameNumber = 0;
	private shown = false;
	private bite = 0;
	private lights: number[] = [];
	// The ridges, tiled across the sky by day and darkened for the night
	private readonly strips: Record<string, { day: CanvasImageSource; night: CanvasImageSource }> = {};
	private frame = 0;

	constructor(
		canvas: HTMLCanvasElement,
		readonly size: SkySize,
		private readonly now: () => number = () => performance.now(),
	) {
		this.ratio = Math.max(1, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
		// Below the horizon until it rises
		const sunWidth = SPRITES.sun?.width ?? 30;
		this.sunX = { from: sunWidth / 2, to: sunWidth / 2, start: 0, duration: 0 };
		this.sunY = { from: size.height + 10, to: size.height + 10, start: 0, duration: 0 };
		this.ctx = canvas.getContext('2d');
		if (this.ctx !== null) {
			canvas.width = Math.round(size.width * this.ratio);
			canvas.height = Math.round(size.height * this.ratio);
			canvas.style.width = size.width + 'px';
			canvas.style.height = size.height + 'px';
			for (const name of ['sun', 'stars', 'clouds', ...RIDGES]) {
				this.sheet(SPRITES[name]?.sheet);
			}
		}
	}

	setNight(night: boolean, fade = true): void {
		if (night !== this.night) {
			this.night = night;
			this.nightSince = fade ? this.now() : -Infinity;
		}
	}

	setDusk(dusk: boolean, fade = true): void {
		if (dusk !== this.dusk) {
			this.dusk = dusk;
			this.duskSince = fade ? this.now() : -Infinity;
		}
	}

	// Sends the sun (or moon) to a point: x is its middle, y its top; it takes a while, or none
	moveSun(x: number, y: number, duration: number): void {
		const now = this.now();
		this.sunX = { from: at(this.sunX, now), to: x, start: now, duration };
		this.sunY = { from: at(this.sunY, now), to: y, start: now, duration };
	}

	// Which face shows (0 the sun, 1 the moon) and its frame
	showSun(face: number, frame: number): void {
		this.face = face;
		this.frameNumber = frame;
		this.shown = true;
	}

	// How much of the sun the Eclipse has eaten, from 0 to 1
	setBite(bite: number): void {
		this.bite = bite;
	}

	// Where the village's buildings stand, each keeping a light burning at night
	setLights(xs: number[]): void {
		this.lights = xs.slice();
	}

	// Where the village's lights burn
	lightsAt(): number[] {
		return this.lights.slice();
	}

	// Where a cloud is now: its left edge, wrapping round once it has drifted off the sky
	cloudAt(index: number, now: number): { x: number; y: number } {
		const cloud = CLOUDS[index];
		const width = SPRITES.clouds?.width ?? 0;
		const span = this.size.width + width;
		const along = ((cloud.from + width + cloud.speed * now / 1000) % span + span) % span;
		return { x: along - width, y: cloud.y };
	}

	// How far night has fallen, and dusk: from 0 to 1
	nightness(): number {
		const t = clamp((this.now() - this.nightSince) / FADE_MS);
		return this.night ? t : 1 - t;
	}

	duskness(): number {
		const t = clamp((this.now() - this.duskSince) / FADE_MS);
		return this.dusk ? t : 1 - t;
	}

	// Where the sun or moon is drawn now, and what of it
	sun(): { x: number; y: number; face: number; frame: number; bite: number; shown: boolean } {
		const now = this.now();
		return {
			x: at(this.sunX, now), y: at(this.sunY, now), face: this.face, frame: this.frameNumber,
			bite: this.face === 0 ? this.bite : 0, shown: this.shown,
		};
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
		const { width, height } = this.size;
		const night = this.nightness();
		ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
		ctx.imageSmoothingEnabled = false;
		ctx.globalAlpha = 1;

		// The sky, its glow towards the horizon, and the stars by night
		ctx.fillStyle = mix(DAY_SKY, NIGHT_SKY, night);
		ctx.fillRect(0, 0, width, height);
		this.fillGlow(ctx, 0.3, 'rgba(255, 236, 205, 0.75)', 1 - night);
		const stars = this.ready(SPRITES.stars?.sheet);
		if (stars !== null && night > 0) {
			const pattern = ctx.createPattern(stars, 'repeat');
			if (pattern !== null) {
				ctx.globalAlpha = night;
				ctx.fillStyle = pattern;
				ctx.fillRect(0, 0, width, height);
				ctx.globalAlpha = 1;
			}
		}
		this.fillGlow(ctx, 0.4, 'rgba(74, 50, 110, 0.6)', night);

		// Dusk sets the sky on fire
		const dusk = this.duskness();
		if (dusk > 0) {
			const glow = ctx.createLinearGradient(0, 0, 0, height);
			glow.addColorStop(0, '#6b4a8c');
			glow.addColorStop(0.45, '#c8607a');
			glow.addColorStop(0.8, '#f29a3a');
			glow.addColorStop(1, '#ffd27a');
			ctx.globalAlpha = 0.85 * dusk;
			ctx.fillStyle = glow;
			ctx.fillRect(0, 0, width, height);
			ctx.globalAlpha = 1;
		}

		this.drawSun(ctx, now);
		this.drawClouds(ctx, now, night);
		for (const ridge of RIDGES) {
			this.drawRidge(ctx, ridge, night);
		}
		this.drawLights(ctx, now, night);
	}

	// A glow rising from the horizon, from part of the way down the sky
	private fillGlow(ctx: CanvasRenderingContext2D, from: number, colour: string, alpha: number): void {
		if (alpha <= 0) {
			return;
		}
		const glow = ctx.createLinearGradient(0, 0, 0, this.size.height);
		glow.addColorStop(from, colour.replace(/[\d.]+\)$/, '0)'));
		glow.addColorStop(1, colour);
		ctx.globalAlpha = alpha;
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, this.size.width, this.size.height);
		ctx.globalAlpha = 1;
	}

	private drawSun(ctx: CanvasRenderingContext2D, now: number): void {
		const sprite = SPRITES.sun;
		const sheet = this.ready(sprite?.sheet);
		if (!this.shown || sprite === undefined || sheet === null) {
			return;
		}
		const x = at(this.sunX, now) - sprite.width / 2, y = at(this.sunY, now);
		const row = Math.min(this.face, sprite.rows - 1), frame = this.frameNumber % sprite.frames;
		ctx.drawImage(sheet, sprite.x + frame * sprite.width, sprite.y + row * sprite.height, sprite.width, sprite.height,
			x, y, sprite.width, sprite.height);
		if (this.face === 0 && this.bite > 0) {
			const cx = x + sprite.width / 2, cy = y + sprite.height / 2;
			ctx.save();
			ctx.beginPath();
			ctx.arc(cx, cy, BITE_RADIUS, 0, 2 * Math.PI);
			ctx.clip();
			const bx = cx + 2 * BITE_RADIUS * (1 - this.bite);
			ctx.fillStyle = '#2a1438';
			ctx.beginPath();
			ctx.arc(bx, cy, BITE_RADIUS - 0.5, 0, 2 * Math.PI);
			ctx.fill();
			ctx.fillStyle = '#07040d';
			ctx.beginPath();
			ctx.arc(bx, cy, BITE_RADIUS - 1.5, 0, 2 * Math.PI);
			ctx.fill();
			ctx.restore();
		}
	}

	private drawClouds(ctx: CanvasRenderingContext2D, now: number, night: number): void {
		const sprite = SPRITES.clouds;
		const sheet = this.ready(sprite?.sheet);
		if (sprite === undefined || sheet === null) {
			return;
		}
		ctx.globalAlpha = 1 - (1 - NIGHT_CLOUDS) * night;
		CLOUDS.forEach((cloud, i) => {
			const place = this.cloudAt(i, now);
			ctx.drawImage(sheet, sprite.x + cloud.frame * sprite.width, sprite.y, sprite.width, sprite.height,
				Math.round(place.x), place.y, sprite.width, sprite.height);
		});
		ctx.globalAlpha = 1;
	}

	// A ridge along the bottom of the sky, darkening as night falls
	private drawRidge(ctx: CanvasRenderingContext2D, name: string, night: number): void {
		const strip = this.ridgeStrips(name);
		const sprite = SPRITES[name];
		if (strip === null || sprite === undefined) {
			return;
		}
		const top = this.size.height - sprite.height;
		if (night < 1) {
			ctx.drawImage(strip.day, 0, top);
		}
		if (night > 0) {
			ctx.globalAlpha = night;
			ctx.drawImage(strip.night, 0, top);
			ctx.globalAlpha = 1;
		}
	}

	private drawLights(ctx: CanvasRenderingContext2D, now: number, night: number): void {
		if (night <= 0) {
			return;
		}
		const top = this.size.height - LIGHT_HEIGHT - LIGHT_SIZE;
		this.lights.forEach((x, i) => {
			// Each flickers in its own time
			const t = ((now + i * FLICKER_SPREAD_MS) % (2 * FLICKER_MS)) / FLICKER_MS;
			const swing = t < 1 ? t : 2 - t;
			const flicker = 1 - 0.45 * (1 - Math.cos(Math.PI * swing)) / 2;
			ctx.globalAlpha = night * flicker;
			const glow = ctx.createRadialGradient(x, top + LIGHT_SIZE / 2, 0, x, top + LIGHT_SIZE / 2, 9);
			glow.addColorStop(0, 'rgba(255, 170, 70, 0.5)');
			glow.addColorStop(1, 'rgba(255, 170, 70, 0)');
			ctx.fillStyle = glow;
			ctx.fillRect(x - 9, top + LIGHT_SIZE / 2 - 9, 18, 18);
			ctx.fillStyle = '#ffd27a';
			ctx.fillRect(Math.round(x - LIGHT_SIZE / 2), top, LIGHT_SIZE, LIGHT_SIZE);
		});
		ctx.globalAlpha = 1;
	}

	// A ridge tiled across the sky, once by day and once darkened for the night
	private ridgeStrips(name: string): { day: CanvasImageSource; night: CanvasImageSource } | null {
		if (this.strips[name] !== undefined) {
			return this.strips[name];
		}
		const sprite = SPRITES[name];
		const image = this.ready(sprite?.sheet);
		if (sprite === undefined || image === null || typeof document === 'undefined') {
			return null;
		}
		const strip = (darken: boolean): HTMLCanvasElement => {
			const canvas = document.createElement('canvas');
			canvas.width = this.size.width;
			canvas.height = sprite.height;
			const ctx = canvas.getContext('2d');
			if (ctx !== null) {
				ctx.imageSmoothingEnabled = false;
				for (let x = 0; x < this.size.width; x += sprite.width) {
					ctx.drawImage(image, sprite.x, sprite.y, sprite.width, sprite.height, x, 0, sprite.width, sprite.height);
				}
				if (darken) {
					// Only where the ridge is, so the sky shows above it
					ctx.globalCompositeOperation = 'source-atop';
					ctx.fillStyle = 'rgba(20, 16, 34, 0.62)';
					ctx.fillRect(0, 0, canvas.width, canvas.height);
				}
			}
			return canvas;
		};
		this.strips[name] = { day: strip(false), night: strip(true) };
		return this.strips[name];
	}

	// A sheet once it has loaded, or null
	private ready(name: string | undefined): HTMLImageElement | null {
		const image = this.sheet(name);
		return image !== undefined && image.complete && image.naturalWidth > 0 ? image : null;
	}

	private sheet(name: string | undefined): HTMLImageElement | undefined {
		if (name === undefined) {
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
