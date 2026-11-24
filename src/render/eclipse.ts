// The Eclipse as drawn: a black sun ringed with stolen light in the middle of the
// sky, breathing a glow; brightening as it gazes or flares, dimming as it eclipses
// the board, flinching when lantern light pierces it, and breaking apart in the end.
// It is drawn in front of the village, behind the keeper and the monsters
// (src/render/actors.ts); the rays and the shadow of its strikes fly over the world
// with the effects (src/render/effects.ts).

export type Mood = 'gazing' | 'flare' | 'darken' | 'struck';

// How it looks at a moment: how big (1 its size), how solid, how bright and how colourful
export interface Look {
	scale: number;
	alpha: number;
	brightness: number;
	saturation: number;
}

const RADIUS = 32;
// The black disc ringed with light: where each colour lies, as a share of the distance
// from its middle to the corner of the square around it, and how solid it is there
const RING: [number, number[], number][] = [
	[0, [7, 4, 13], 1],
	[0.56, [7, 4, 13], 1],
	[0.62, [42, 20, 56], 1],
	[0.67, [255, 210, 92], 0.95],
	[0.72, [242, 154, 58], 0.4],
	[0.78, [242, 154, 58], 0],
];
const GLOW = [242, 154, 58];
const APPEAR_MS = 600;
const FADE_IN_MS = 1500;
const MOOD_MS = 300;
const BREAK_MS = 3500;
const PULSE_MS = 3000;
// Its moods, each later one showing over the earlier ones while both last; how bright
// and how colourful each makes it, and how it shrinks when struck
const MOODS: Mood[] = ['gazing', 'flare', 'darken', 'struck'];
const BRIGHTNESS: Record<Mood, number> = { gazing: 1.6, flare: 1.6, darken: 0.5, struck: 2.2 };
const SATURATION: Record<Mood, number> = { gazing: 1, flare: 1, darken: 0.4, struck: 1 };
const STRUCK_SCALE = 0.92;
// Breaking apart, it swells to this much more than its size and burns this much brighter
const BREAK_SWELL = 1.4;
const BREAK_BRIGHTNESS = 2;

function clamp(t: number): number {
	return Math.min(1, Math.max(0, t));
}

function easeOut(t: number): number {
	return 1 - (1 - t) * (1 - t);
}

// A colour as it looks: greyer or more colourful, then brighter or darker
function lit(rgb: number[], alpha: number, look: Look): string {
	const grey = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
	const [r, g, b] = rgb.map((value) => Math.min(255, Math.max(0, Math.round((grey + (value - grey) * look.saturation) * look.brightness))));
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export class EclipseView {
	private readonly appeared: number;
	private readonly moods = new Map<Mood, { start: number; lasts: number }>();
	private breaking: number | null = null;

	constructor(readonly centre: { x: number; y: number }, private readonly now: () => number = () => performance.now()) {
		this.appeared = now();
	}

	// It gazes, flares, darkens or flinches for a while, then settles again
	feel(kind: Mood, lasts: number): void {
		this.moods.set(kind, { start: this.now(), lasts });
	}

	breakApart(): void {
		this.breaking = this.now();
	}

	// How it looks at a moment: growing out of a speck as it comes down, easing into
	// each mood and out of it again, and swelling and fading as it breaks apart
	look(now: number): Look {
		const since = now - this.appeared;
		const look = { scale: 0.3 + 0.7 * easeOut(clamp(since / APPEAR_MS)), alpha: clamp(since / FADE_IN_MS), brightness: 1, saturation: 1 };
		for (const kind of MOODS) {
			const mood = this.moods.get(kind);
			if (mood === undefined) {
				continue;
			}
			const t = now - mood.start;
			const into = clamp(t / MOOD_MS) * (1 - clamp((t - mood.lasts) / MOOD_MS));
			look.brightness += (BRIGHTNESS[kind] - look.brightness) * into;
			look.saturation += (SATURATION[kind] - look.saturation) * into;
			if (kind === 'struck') {
				look.scale *= 1 + (STRUCK_SCALE - 1) * into;
			}
		}
		if (this.breaking !== null) {
			const t = clamp((now - this.breaking) / BREAK_MS);
			const eased = t * t;
			look.scale *= 1 + BREAK_SWELL * eased;
			look.alpha *= 1 - eased;
			look.brightness += BREAK_BRIGHTNESS * t;
		}
		return look;
	}

	draw(ctx: CanvasRenderingContext2D): void {
		const now = this.now();
		const look = this.look(now);
		if (look.alpha <= 0) {
			return;
		}
		const { x, y } = this.centre;
		const radius = RADIUS * look.scale;
		ctx.save();
		ctx.globalAlpha = look.alpha;
		// Its glow breathes in and out
		const breath = (1 - Math.cos(2 * Math.PI * now / PULSE_MS)) / 2;
		const reach = radius * (1.6 + 0.35 * breath);
		const glow = ctx.createRadialGradient(x, y, radius * 0.8, x, y, reach);
		glow.addColorStop(0, lit(GLOW, 0.45 + 0.25 * breath, look));
		glow.addColorStop(1, lit(GLOW, 0, look));
		ctx.fillStyle = glow;
		ctx.beginPath();
		ctx.arc(x, y, reach, 0, 2 * Math.PI);
		ctx.fill();
		const body = ctx.createRadialGradient(x, y, 0, x, y, radius * Math.SQRT2);
		for (const [at, rgb, alpha] of RING) {
			body.addColorStop(at, lit(rgb, alpha, look));
		}
		ctx.fillStyle = body;
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, 2 * Math.PI);
		ctx.fill();
		ctx.restore();
	}
}
