// The Fallen Dawnwyrm as drawn: its body, standing or beating its wings; its neck of
// three segments and its head, each turned and pushed out along the one before it,
// easing from one posture to the next; its jaws opening and closing; and the ice or
// fire it gathers in its mouth and breathes out. It comes down out of the sky, faces
// right when it lands on the left of the field, and comes apart a piece at a time
// at the end. It is drawn in front of the village, behind the keeper and the
// monsters (src/render/actors.ts); what it does and when is up to the field
// (src/core/field.ts).

import { SHEETS, SPRITES } from '../content/sprites.ts';

export interface Point {
	x: number;
	y: number;
}

// How a segment turns (degrees, clockwise) and how far it is then pushed along its turn
export interface Turn {
	r: number;
	t: number;
}

export type Breath = 'ice' | 'fire';

type Jaw = 'open' | 'close' | 'open-fast' | 'close-fast';
type Pair = [number, number];

// Each posture: how the jaws go, how the segments of the neck turn from the body out,
// and how the head turns, unless it turns to face the keeper. They are given for the
// dragon facing left, and mirrored when it faces right.
const POSTURES = {
	stretch: ['close', [0, -10], [0, -10], [0, -10], [0, -10]],
	idle: ['close', [80, -10], [15, -10], [-50, -10], [-50, -10]],
	windup: ['close', [100, -14], [20, -14], [-100, -10], [-19, -10]],
	roar: ['open', [40, -14], [0, -14], [0, -14], [-22, -8]],
	aim: ['close', [80, -10], [15, -10], [-50, -10], ['target', -10]],
	aimClose: ['close-fast', [80, -10], [15, -10], [-50, -10], ['target', -10]],
	aimOpen: ['open', [80, -10], [15, -10], [-50, -10], ['target', -10]],
	shoot: ['open-fast', [80, -10], [15, -10], [-50, -10], ['target', -5]],
	aimbite: ['open', [80, -17], [-30, -15], [-30, -15], ['target', -10]],
	bite: ['close-fast', [65, -17], [-62, -17], [-23, -15], ['target', -15]],
	thrashup: ['open', [20, -10], [20, -10], [20, -10], [20, -10]],
	thrashdown: ['open', [-20, -10], [-20, -10], [-20, -10], [-20, -10]],
} satisfies Record<string, [Jaw, Pair, Pair, Pair, [number | 'target', number]]>;

export type Posture = keyof typeof POSTURES;

const BODY = { width: 204, height: 164 };
// Rows of the body's sheet for each way it faces: standing, flying, landing, and the
// two halves of a wing buffet
const ROWS = 5;
const NECK = 24;
const HEAD = { width: 81, height: 30 };
const JAW_FRAMES = 3;
// Where the neck meets the body, from the side the dragon faces
const MOUNT: Point = { x: 20, y: 97 };
// Where the head sits on the last segment of the neck, facing left and facing right
const HEAD_AT: Record<'left' | 'right', Point> = { left: { x: -30, y: -6 }, right: { x: -29, y: -6 } };
// Where its breath gathers, by the mouth of the head facing left and facing right
const MOUTH: Record<'left' | 'right', Point> = { left: { x: -13, y: 19 }, right: { x: 84, y: 19 } };
// The head turns to the top of the keeper
const KEEPER_HEIGHT = 32;
// Its breath gathers into a ball for a while, then goes; ice streams out this far
const GATHER_MS = 750;
const BREATH_MS = 1000;
const BALL = 30;
const ICE_REACH = 400;
// When it breaks apart, the last of it bursts from here on the body, facing left and right
const BURST_AT: Record<'left' | 'right', Point> = { left: { x: 70, y: 110 }, right: { x: 130, y: 110 } };

interface Motion {
	from: number;
	to: number;
	start: number;
	duration: number;
}

type Matrix = [number, number, number, number, number, number];

function clamp(t: number): number {
	return Math.min(1, Math.max(0, t));
}

function easeOut(t: number): number {
	return 1 - (1 - t) * (1 - t);
}

function ease(t: number): number {
	return t * t * (3 - 2 * t);
}

function still(value: number): Motion {
	return { from: value, to: value, start: 0, duration: 0 };
}

function at(motion: Motion, now: number): number {
	if (motion.duration <= 0 || now >= motion.start + motion.duration) {
		return motion.to;
	}
	return motion.from + (motion.to - motion.from) * easeOut(clamp((now - motion.start) / motion.duration));
}

function multiply(m: Matrix, n: Matrix): Matrix {
	return [
		m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
		m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
		m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
	];
}

function translation(x: number, y: number): Matrix {
	return [1, 0, 0, 1, x, y];
}

function rotation(degrees: number): Matrix {
	const angle = degrees * Math.PI / 180;
	return [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0];
}

function apply(m: Matrix, point: Point): Point {
	return { x: m[0] * point.x + m[2] * point.y + m[4], y: m[1] * point.x + m[3] * point.y + m[5] };
}

// A segment turned about its middle, then pushed out along its turn
function turned(turn: Turn, middle: Point): Matrix {
	return [translation(middle.x, middle.y), rotation(turn.r), translation(turn.t, 0), translation(-middle.x, -middle.y)]
		.reduce(multiply);
}

// An angle in degrees, brought round to between -180 and 180
function wrapped(degrees: number): number {
	return degrees - 360 * Math.round(degrees / 360);
}

// The ball of breath at a moment after it began to gather: how far ahead of the mouth
// its middle is, how long and how tall it is; null once it has gone. Ice streams out
// as a beam, thinning as it goes; fire flies off as a flattening ball, as far as it
// reaches.
export function breathShape(kind: Breath, since: number, reach: number): { ahead: number; length: number; height: number } | null {
	if (since < 0 || since >= BREATH_MS) {
		return null;
	}
	if (since < GATHER_MS) {
		const size = BALL * ease(since / GATHER_MS);
		return { ahead: 0, length: size, height: size };
	}
	const out = ease((since - GATHER_MS) / (BREATH_MS - GATHER_MS));
	if (kind === 'ice') {
		const length = BALL + (ICE_REACH - BALL) * out;
		return { ahead: (length - BALL) / 2, length, height: BALL * (1 - out) };
	}
	return { ahead: reach * out, length: BALL, height: BALL - 20 * out };
}

export class DragonView {
	private posture: Posture | null = null;
	private readonly turns: { r: Motion; t: Motion }[] = [];
	private row = 0;
	private frame = 0;
	private jawFrame = 0;
	private jaw: { goal: 'open' | 'close'; step: number } | null = null;
	private mount: Point = MOUNT;
	private lift: Motion = still(0);
	private breath: { kind: Breath; start: number; reach: number } | null = null;
	// The segments of the neck and the head, and then the body, once blown apart
	private readonly gone = [false, false, false, false];
	private vanished = false;
	private image: HTMLImageElement | null = null;

	constructor(
		// Where the middle of it stands, which way it faces, and where the ground is
		readonly x: number,
		readonly facesRight: boolean,
		readonly ground: number,
		private readonly now: () => number = () => performance.now(),
	) {
		for (let i = 0; i < 4; i++) {
			this.turns.push({ r: still(0), t: still(0) });
		}
		this.pose('idle');
	}

	// Eases into a posture over a while (at once without one), the head turning to the
	// keeper where the posture says so. Taking up the posture it is in already does nothing.
	pose(name: Posture, duration = 0, keeperX = this.x): void {
		if (name === this.posture) {
			return;
		}
		this.posture = name;
		const [jaw, first, second, third, [head, push]] = POSTURES[name];
		const side = this.facesRight ? -1 : 1;
		const goals: Turn[] = [first, second, third].map(([r, t]) => ({ r: side * r, t: side * t }));
		goals.push({ r: head === 'target' ? this.aim(goals, keeperX) : side * head, t: side * push });
		const now = this.now();
		goals.forEach((goal, i) => {
			const turn = this.turns[i];
			turn.r = { from: at(turn.r, now), to: goal.r, start: now, duration };
			turn.t = { from: at(turn.t, now), to: goal.t, start: now, duration };
		});
		this.jaw = { goal: jaw.startsWith('open') ? 'open' : 'close', step: jaw.endsWith('-fast') ? 2 : 1 };
	}

	// How each segment of the neck and the head is turned now
	turnsAt(now: number): Turn[] {
		return this.turns.map((turn) => ({ r: at(turn.r, now), t: at(turn.t, now) }));
	}

	// The body shows a frame of one of its rows (given facing left)
	setBody(row: number, frame: number): void {
		this.row = row;
		this.frame = frame;
	}

	// The jaws move a step towards open or closed as the body moves a frame; two steps
	// at first when they go quickly
	stepJaw(): void {
		if (this.jaw === null) {
			return;
		}
		const { goal, step } = this.jaw;
		this.jawFrame = goal === 'open' ? Math.min(JAW_FRAMES - 1, this.jawFrame + step) : Math.max(0, this.jawFrame - step);
		this.jaw = this.jawFrame === (goal === 'open' ? JAW_FRAMES - 1 : 0) ? null : { goal, step: 1 };
	}

	jaws(): number {
		return this.jawFrame;
	}

	// Where the neck meets the body, as it moves with the wings; null puts it back
	mountAt(point: Point | null): void {
		this.mount = point ?? MOUNT;
	}

	// High in the sky, then coming down to the ground in its own time
	fly(height: number): void {
		this.lift = still(height);
	}

	descend(duration: number): void {
		this.lift = { from: at(this.lift, this.now()), to: 0, start: this.now(), duration };
	}

	// Where the body is drawn now
	bodyAt(now: number): Point {
		return { x: this.x - BODY.width / 2, y: this.ground - BODY.height - at(this.lift, now) };
	}

	// Ice or fire gathers in its mouth, then goes out, fire as far as it reaches
	breathe(kind: Breath, reach: number): void {
		this.breath = { kind, start: this.now(), reach };
	}

	stopBreath(): void {
		this.breath = null;
	}

	// Where its breath comes out of its mouth now, and which way it goes (radians)
	mouth(now = this.now()): Point & { angle: number } {
		const head = this.frames(now)[3];
		const point = apply(head, MOUTH[this.side()]);
		const ahead = apply(head, { x: MOUTH[this.side()].x + (this.facesRight ? 1 : -1), y: MOUTH[this.side()].y });
		return { ...point, angle: Math.atan2(ahead.y - point.y, ahead.x - point.x) };
	}

	// A segment of the neck (0 at the body, 3 the head) is blown apart; where it was
	explode(segment: number): Point {
		this.gone[segment] = true;
		if (segment === 3) {
			this.breath = null;
		}
		const middle = segment === 3 ? { x: HEAD.width / 2, y: HEAD.height / 2 } : { x: NECK / 2, y: NECK / 2 };
		return apply(this.frames(this.now())[segment], middle);
	}

	// The last of it bursts and is gone; where it burst
	vanish(): Point {
		this.vanished = true;
		this.gone.fill(true);
		this.breath = null;
		const body = this.bodyAt(this.now());
		const burst = BURST_AT[this.side()];
		return { x: body.x + burst.x, y: body.y + burst.y };
	}

	draw(ctx: CanvasRenderingContext2D): void {
		if (this.vanished) {
			return;
		}
		const sheet = this.sheet();
		const body = SPRITES.dragon, neck = SPRITES.dragonneck, head = SPRITES.dragonhead;
		if (sheet === null || body === undefined || neck === undefined || head === undefined) {
			return;
		}
		const now = this.now();
		const place = this.bodyAt(now);
		const right = this.facesRight ? 1 : 0;
		ctx.save();
		ctx.drawImage(sheet, body.x + this.frame * body.width, body.y + (this.row + right * ROWS) * body.height, body.width, body.height,
			Math.round(place.x), Math.round(place.y), body.width, body.height);
		// The neck and the head turn, so they are smoothed as the page used to smooth them
		ctx.imageSmoothingEnabled = true;
		this.frames(now).forEach((frame, i) => {
			if (this.gone[i]) {
				return;
			}
			ctx.save();
			ctx.transform(...frame);
			if (i < 3) {
				ctx.drawImage(sheet, neck.x, neck.y + right * neck.height, neck.width, neck.height, 0, 0, neck.width, neck.height);
			} else {
				ctx.drawImage(sheet, head.x + this.jawFrame * head.width, head.y + right * head.height, head.width, head.height,
					0, 0, head.width, head.height);
				this.drawBreath(ctx, now);
			}
			ctx.restore();
		});
		ctx.restore();
	}

	// Where each segment of the neck and the head is drawn: turned about its middle and
	// pushed out along its turn, each from where the one before it is
	private frames(now: number): Matrix[] {
		const turns = this.turnsAt(now);
		return this.chain(turns, this.bodyAt(now));
	}

	private chain(turns: Turn[], body: Point): Matrix[] {
		const middle = { x: NECK / 2, y: NECK / 2 };
		const mountX = this.facesRight ? BODY.width - NECK - this.mount.x : this.mount.x;
		const frames: Matrix[] = [];
		let frame = multiply(translation(body.x, body.y), translation(mountX, this.mount.y));
		for (let i = 0; i < 3; i++) {
			frame = multiply(frame, turned(turns[i], middle));
			frames.push(frame);
		}
		const headAt = HEAD_AT[this.side()];
		frames.push(multiply(multiply(frame, translation(headAt.x, headAt.y)), turned(turns[3], { x: HEAD.width / 2, y: HEAD.height / 2 })));
		return frames;
	}

	// How the head must turn on the neck so its mouth faces the top of the keeper, with
	// the neck turned as it will be
	private aim(neck: Turn[], keeperX: number): number {
		const frames = this.chain([...neck, { r: 0, t: 0 }], this.bodyAt(Infinity));
		const headAt = HEAD_AT[this.side()];
		const pivot = apply(frames[2], { x: headAt.x + HEAD.width / 2, y: headAt.y + HEAD.height / 2 });
		const dx = keeperX - pivot.x, dy = this.ground - KEEPER_HEIGHT - pivot.y;
		const facing = this.facesRight ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx);
		const neckTurn = neck.reduce((sum, turn) => sum + turn.r, 0);
		return wrapped(facing * 180 / Math.PI - neckTurn);
	}

	private drawBreath(ctx: CanvasRenderingContext2D, now: number): void {
		if (this.breath === null) {
			return;
		}
		const shape = breathShape(this.breath.kind, now - this.breath.start, this.breath.reach);
		if (shape === null || shape.height <= 0) {
			return;
		}
		const mouth = MOUTH[this.side()];
		ctx.translate(mouth.x, mouth.y);
		ctx.scale(this.facesRight ? 1 : -1, 1);
		ctx.fillStyle = 'white';
		ctx.beginPath();
		ctx.ellipse(shape.ahead, 0, shape.length / 2, shape.height / 2, 0, 0, 2 * Math.PI);
		ctx.fill();
	}

	private side(): 'left' | 'right' {
		return this.facesRight ? 'right' : 'left';
	}

	private sheet(): HTMLImageElement | null {
		const name = SPRITES.dragon?.sheet;
		if (name === undefined || SHEETS[name] === undefined || typeof Image === 'undefined') {
			return null;
		}
		if (this.image === null) {
			this.image = new Image();
			this.image.src = SHEETS[name].file;
		}
		return this.image.complete && this.image.naturalWidth > 0 ? this.image : null;
	}
}
