// The field in front of the village, where the keeper works by day and fights by
// night. Positions are in pixels from the left edge of the world, and time passes
// in ticks of 100 ms, as the game loop runs: everyone moves a little every tick,
// and every other tick takes a step, deciding what to do next or playing the next
// frame of what they are doing. Blows land on particular frames, so an attack
// takes four steps and its first blow lands on the second.
//
// Nothing here touches the screen. The game reads the actors after every tick to
// draw them, and turns the events a tick returns into sounds and effects. The
// keeper's health and gear belong to the game, so the field asks its host when the
// keeper strikes or is hurt, and by day what the keeper should work on next.

import { monsterStat } from './combat.ts';

export const TICK_MS = 100;
export const FRAMES = 4;
// The stockpile the keeper carries blocks from
export const STOCKPILE = 50;
// How long the keeper hammers at a building before it stands
export const BUILD_MS = 5000;

const TICKS_PER_STEP = 2;
const KEEPER_SPEED = 50;
const KEEPER_WIDTH = 34;
// Chasing stops short of the edges of the world, and nobody attacks from right at the edge
const CHASE_MARGIN = 30;
const EDGE = 10;
// Projectiles fly for a second and hit whoever is still close to where they were aimed
const FLIGHT_MS = 1000;
const MISS_DISTANCE = 5;
// The keeper rests a moment after opening a chest
const REST_MS = 1500;
const PUSH_SPEED = 1000;

export type Part =
	// Hits on these frames of a four-frame attack
	| { type: 'melee'; hits: number[] }
	| { type: 'ranged'; range: number; projectile: string; fire?: boolean }
	// Counted in steps
	| { type: 'cast'; spell: string; first: number; every: number }
	| { type: 'teleport'; first: number; every: number };

export interface MonsterDef {
	sprite: string;
	width: number;
	height: number;
	// The part of the sprite that can be hit, when narrower than the sprite
	hitbox?: number;
	health: number;
	damage: number;
	xp: number;
	// Pixels per second
	speed: number;
	// Hits with a blade rather than a club (it sounds different)
	blade?: boolean;
	// Flies above the ground (it is drawn higher)
	flying?: boolean;
	// What its blows go for first: lampmoths eat the ward
	prey?: 'ward';
	parts: Part[];
	// Chance of a chest per tile that called the monster up; always drops loot if set
	dropChance?: number;
	loot?: string;
}

export type Facing = 'left' | 'right';

export type Activity =
	| { type: 'idle' }
	// Walks to a spot or a chest, or after another actor until it can reach them
	| { type: 'move'; to: number; chase?: number; reach?: number; chest?: number }
	| { type: 'strike'; target: number; hits: number[] }
	| { type: 'shoot'; target: number }
	| { type: 'cast'; spell: string }
	| { type: 'teleport' }
	| { type: 'die' }
	| { type: 'open'; chest: number }
	| { type: 'climb'; done: boolean }
	| { type: 'hammer'; until: number }
	// Thrown back by a wing buffet
	| { type: 'pushed'; to: number };

export interface Actor {
	id: number;
	// 'keeper', or the monster's id in the content
	kind: string;
	x: number;
	// How wide the actor is for reaching and being reached
	width: number;
	speed: number;
	hp: number;
	maxHp: number;
	damage: number;
	xp: number;
	facing: Facing;
	activity: Activity;
	frame: number;
	// Mid-teleport
	hidden: boolean;
	// Finished dying, or wiped out; gone actors are removed after the tick
	gone: boolean;
	// Killed by something other than a fight: no experience
	wiped: boolean;
	// Steps until each timed part comes round again, by part type
	cooldowns: Record<string, number>;
	// The tiles that called the monster up, for the chance of loot
	tiles: number;
	def?: MonsterDef;
}

export interface Chest {
	id: number;
	x: number;
}

export interface Projectile {
	id: number;
	from: number;
	to: number;
	target: number;
	shooter: number;
	damage: number;
	kind: string;
	fire: boolean;
	lands: number;
}

// One of a boss's attacks. Times are from the start of the attack: when it lands,
// and when the boss is ready for the next one.
export interface StrikeDef {
	lands: number;
	ends: number;
	damage?: number;
	// Hits with the boss's own damage, which grows in New Game+
	scaled?: boolean;
	// Only lands if the keeper is this close, edge to edge
	within?: number;
	freeze?: boolean;
	// Throws the keeper this far away from the boss, unless the keeper is frozen
	push?: number;
	// Leaves fire on the ground where the keeper stands
	burn?: { width: number; damage: number; every: number; lasts: number };
	// Blows out every fire on the field
	clearsFire?: boolean;
	// What the blow goes for first
	prey?: 'ward';
	// Calls up monsters
	summon?: { monster: string; count: number };
	// Binds this many tiles on the board in shadow
	bind?: number;
}

export interface BossDef {
	sprite: string;
	width: number;
	health: number;
	damage: number;
	// Taken off every blow it receives
	hardness: number;
	xp: number;
	// How long it takes to arrive before it can fight, and to die
	landing: number;
	dying: number;
	// What it does when no attack is waiting: one strike if the keeper is close, another if not
	close: string;
	far: string;
	closeGap: number;
	strikes: Record<string, StrikeDef>;
	// Left behind when it falls
	loot?: string;
	// Hangs in the sky, out of the keeper's reach
	aloft?: boolean;
	// While it is out, the night does not move on
	holdsNight?: boolean;
}

export interface Boss {
	id: number;
	kind: string;
	def: BossDef;
	x: number;
	hp: number;
	maxHp: number;
	damage: number;
	state: 'landing' | 'ready' | 'striking' | 'dying';
	// When the current state began
	since: number;
	strike: string | null;
	landed: boolean;
	// Attacks the keeper's tiles provoked, waiting their turn
	queue: string[];
}

// Fire left burning on the ground
export interface Fire {
	id: number;
	x: number;
	width: number;
	damage: number;
	every: number;
	until: number;
	next: number;
}

// What the keeper does by day
export type Task =
	// Fetch a block from the stockpile and carry it to a building
	| { type: 'carry'; to: number; block: unknown; building: unknown }
	// Hammer at a building until it stands
	| { type: 'build'; at: number; building: unknown };

export interface FieldHost {
	keeperAlive(): boolean;
	// The keeper's next blow; it may use up a charge of the sword
	keeperBlow(): { damage: number; sharp: boolean };
	hurtKeeper(damage: number, by: string, prey?: 'ward'): void;
	// By day, what the keeper should work on next, if anything
	nextTask(): Task | null;
}

export type FieldEvent =
	| { type: 'cue'; name: string }
	| { type: 'shot'; projectile: Projectile }
	| { type: 'spell'; spell: string; by: number }
	| { type: 'monsterGone'; monster: Actor }
	| { type: 'chestOpened'; chest: Chest }
	| { type: 'pickedUp'; task: Task }
	| { type: 'delivered'; task: Task }
	| { type: 'hammering'; task: Task }
	| { type: 'built'; task: Task }
	// Night fell or the keeper was called away: a carried block goes back, a building sinks
	| { type: 'abandoned'; task: Task; carrying: boolean }
	| { type: 'keeperDied' }
	| { type: 'bossStrike'; boss: Boss; strike: string }
	| { type: 'strikeLands'; boss: Boss; strike: string; hit: boolean }
	| { type: 'bossDying'; boss: Boss }
	| { type: 'bossGone'; boss: Boss }
	| { type: 'freezeKeeper' }
	| { type: 'thaw' }
	| { type: 'fireLit'; fire: Fire }
	| { type: 'fireOut'; fire: Fire }
	| { type: 'summon'; monster: string; count: number };

interface Errand {
	task: Task;
	stage: 'fetch' | 'deliver' | 'walk' | 'hammer';
}

export interface Field {
	width: number;
	time: number;
	ticks: number;
	night: boolean;
	keeper: Actor;
	monsters: Actor[];
	chests: Chest[];
	projectiles: Projectile[];
	boss: Boss | null;
	fires: Fire[];
	errand: Errand | null;
	// Spell and skill effects
	haste: boolean;
	timeStopped: boolean;
	keeperFrozen: boolean;
	restUntil: number;
	casual: boolean;
	keeperDead: boolean;
	nextId: number;
}

export function createField(width: number, keeperX = width / 2): Field {
	return {
		width,
		time: 0,
		ticks: 0,
		night: false,
		keeper: actor(1, 'keeper', keeperX, KEEPER_WIDTH, KEEPER_SPEED),
		monsters: [],
		chests: [],
		projectiles: [],
		boss: null,
		fires: [],
		errand: null,
		haste: false,
		timeStopped: false,
		keeperFrozen: false,
		restUntil: 0,
		casual: false,
		keeperDead: false,
		nextId: 2,
	};
}

function actor(id: number, kind: string, x: number, width: number, speed: number): Actor {
	return {
		id, kind, x, width, speed, hp: 1, maxHp: 1, damage: 0, xp: 0, facing: 'right',
		activity: { type: 'idle' }, frame: 0, hidden: false, gone: false, wiped: false, cooldowns: {}, tiles: 0,
	};
}

// The keeper climbs up into the world at the start of the game
export function climbIn(field: Field): void {
	start(field.keeper, { type: 'climb', done: false });
}

// A monster arrives from just past one edge of the world
export function spawn(field: Field, kind: string, def: MonsterDef, side: Facing,
	options: { multiplier?: number; tiles?: number; healthScale?: number; damageBonus?: number } = {}): Actor {
	const multiplier = options.multiplier ?? 1;
	const x = side === 'left' ? -def.width : field.width + def.width;
	const monster = actor(field.nextId++, kind, x, def.hitbox ?? def.width, def.speed);
	monster.def = def;
	monster.hp = monster.maxHp = Math.max(1, Math.round(monsterStat(def.health, multiplier, field.casual) * (options.healthScale ?? 1)));
	monster.damage = monsterStat(def.damage, multiplier, field.casual) + (options.damageBonus ?? 0);
	monster.xp = def.xp;
	monster.tiles = options.tiles ?? 3;
	monster.facing = side === 'left' ? 'right' : 'left';
	for (const part of def.parts) {
		if (part.type === 'cast' || part.type === 'teleport') {
			monster.cooldowns[part.type] = part.first;
		}
	}
	field.monsters.push(monster);
	return monster;
}

export function addChest(field: Field, x: number): Chest {
	const chest = { id: field.nextId++, x: Math.min(field.width - 20, Math.max(20, x)) };
	field.chests.push(chest);
	return chest;
}

export function removeChest(field: Field, id: number): void {
	field.chests = field.chests.filter((chest) => chest.id !== id);
}

export function hurtMonster(monster: Actor, damage: number, events: FieldEvent[] = []): void {
	if (monster.hp <= 0) {
		return;
	}
	monster.hp = Math.max(0, monster.hp - damage);
	if (monster.hp === 0) {
		start(monster, { type: 'die' });
		events.push({ type: 'cue', name: 'death' });
	}
}

// Damages every monster, as a bomb or the dawnlight does; those killed give no experience
export function damageAll(field: Field, damage: number): FieldEvent[] {
	const events: FieldEvent[] = [];
	for (const monster of living(field)) {
		hurtMonster(monster, damage, events);
		if (monster.hp === 0) {
			monster.wiped = true;
		}
	}
	hurtBoss(field, damage, events);
	return events;
}

// Every monster falls at once, e.g. when the keeper levels up
export function wipeOut(field: Field): Actor[] {
	const wiped = living(field);
	for (const monster of wiped) {
		monster.wiped = true;
		monster.hp = 0;
		start(monster, { type: 'die' });
	}
	return wiped;
}

// Night falls or day breaks: the keeper drops what they were doing
export function setNight(field: Field, night: boolean): FieldEvent[] {
	field.night = night;
	const events = abandon(field);
	if (!night) {
		// Monsters and chests do not survive the daylight
		field.monsters = [];
		field.projectiles = [];
		field.chests = [];
		field.boss = null;
		field.fires = [];
	}
	return events;
}

// The keeper stops what they are doing, e.g. on levelling up
export function interrupt(field: Field): FieldEvent[] {
	return abandon(field);
}

function abandon(field: Field): FieldEvent[] {
	const events: FieldEvent[] = [];
	if (field.errand !== null) {
		events.push({ type: 'abandoned', task: field.errand.task, carrying: field.errand.stage === 'deliver' });
		field.errand = null;
	}
	const keeper = field.keeper;
	if (keeper.activity.type !== 'die' && keeper.activity.type !== 'climb') {
		start(keeper, { type: 'idle' });
	}
	return events;
}

// A wing buffet throws the keeper back
export function push(field: Field, distance: number): void {
	const keeper = field.keeper;
	const to = Math.min(field.width - EDGE, Math.max(EDGE, keeper.x + distance));
	field.errand = null;
	start(keeper, { type: 'pushed', to });
}

export function living(field: Field): Actor[] {
	return field.monsters.filter((monster) => monster.hp > 0);
}

// Moves time on by one tick of the game loop
export function tick(field: Field, host: FieldHost): FieldEvent[] {
	const events: FieldEvent[] = [];
	field.time += TICK_MS;
	const step = field.ticks % TICKS_PER_STEP === 0;
	field.ticks++;

	const keeper = field.keeper;
	const keeperBusy = field.keeperFrozen || field.time < field.restUntil;
	if (!keeperBusy) {
		moveActor(field, keeper, keeperSpeed(field), events);
		if (keeper.activity.type === 'hammer' && field.time >= keeper.activity.until) {
			finishBuilding(field, events);
		}
	}
	if (!field.timeStopped) {
		for (const monster of field.monsters) {
			moveActor(field, monster, monster.speed, events);
		}
	}

	if (!keeperBusy && (step || field.haste)) {
		stepKeeper(field, host, events);
	}
	if (step && !field.timeStopped) {
		for (const monster of field.monsters) {
			stepMonster(field, monster, host, events);
		}
	}
	land(field, host, events);
	runBoss(field, host, events, step);
	burn(field, host, events);

	for (const monster of field.monsters) {
		if (monster.gone) {
			events.push({ type: 'monsterGone', monster });
		}
	}
	field.monsters = field.monsters.filter((monster) => !monster.gone);
	return events;
}

function keeperSpeed(field: Field): number {
	return field.haste ? KEEPER_SPEED * 4 : KEEPER_SPEED;
}

function start(subject: Actor, activity: Activity): void {
	subject.activity = activity;
	subject.frame = 0;
}

function reach(a: { width: number }, b: { width: number }): number {
	return a.width / 2 + b.width / 2;
}

function inReach(a: Actor, b: { x: number; width: number }): boolean {
	return Math.abs(a.x - b.x) <= reach(a, b);
}

// How far apart two actors are, edge to edge
function gap(a: Actor, b: { x: number; width: number }): number {
	return Math.max(0, Math.abs(a.x - b.x) - reach(a, b));
}

// What the keeper can fight: monsters, and anything else on the field
function foes(field: Field): { id: number; x: number; width: number }[] {
	return [
		...living(field).map((monster) => ({ id: monster.id, x: monster.x, width: monster.width })),
		...(field.boss !== null && !field.boss.def.aloft && (field.boss.state === 'ready' || field.boss.state === 'striking')
			? [{ id: field.boss.id, x: field.boss.x, width: field.boss.def.width }] : []),
	];
}

function moveActor(field: Field, subject: Actor, speed: number, events: FieldEvent[]): void {
	const activity = subject.activity;
	if (activity.type === 'pushed') {
		subject.x = toward(subject.x, activity.to, PUSH_SPEED * TICK_MS / 1000);
		if (subject.x === activity.to) {
			start(subject, { type: 'idle' });
		}
		return;
	}
	if (activity.type !== 'move') {
		return;
	}
	let to = activity.to;
	let range = 0;
	let target: { x: number; width: number } | undefined;
	if (activity.chase !== undefined) {
		target = activity.chase === field.keeper.id ? field.keeper : foes(field).find((foe) => foe.id === activity.chase);
		if (target === undefined) {
			start(subject, { type: 'idle' });
			return;
		}
		range = activity.reach ?? reach(subject, target);
		// Head for the target, but no closer to the edges than the chase margin, and
		// stop as soon as the target is within reach
		to = Math.min(field.width - CHASE_MARGIN, Math.max(CHASE_MARGIN, target.x));
		const reachedFrom = target.x + (subject.x < target.x ? -range : range);
		if (Math.abs(subject.x - target.x) > range && Math.abs(reachedFrom - subject.x) < Math.abs(to - subject.x)) {
			to = reachedFrom;
		}
	}
	if (to !== subject.x) {
		subject.facing = to > subject.x ? 'right' : 'left';
	}
	subject.x = toward(subject.x, to, speed * TICK_MS / 1000);
	const arrived = subject.x === to;
	const reached = target !== undefined && subject.x > EDGE && subject.x < field.width - EDGE &&
		Math.abs(subject.x - target.x) <= range;
	if (arrived || reached) {
		start(subject, { type: 'idle' });
		if (subject === field.keeper) {
			arrive(field, events);
		}
	}
}

function toward(from: number, to: number, distance: number): number {
	return Math.abs(to - from) <= distance ? to : from + Math.sign(to - from) * distance;
}

function advance(subject: Actor): void {
	subject.frame = (subject.frame + 1) % FRAMES;
}

function face(subject: Actor, x: number): void {
	subject.facing = subject.x < x ? 'right' : 'left';
}

// The keeper takes their turn: decides what to do when idle, or plays the next frame
function stepKeeper(field: Field, host: FieldHost, events: FieldEvent[]): void {
	const keeper = field.keeper;
	if (field.keeperDead) {
		return;
	}
	if (keeper.activity.type !== 'die' && !host.keeperAlive()) {
		events.push(...abandon(field));
		start(keeper, { type: 'die' });
		events.push({ type: 'cue', name: 'death' });
		return;
	}
	if (keeper.activity.type === 'idle' && decideKeeper(field, host, events)) {
		actKeeper(field, host, events);
		return;
	}
	advance(keeper);
	actKeeper(field, host, events);
}

// Starts something new for an idle keeper; returns whether there was anything to do
function decideKeeper(field: Field, host: FieldHost, events: FieldEvent[]): boolean {
	const keeper = field.keeper;
	if (!field.night) {
		const task = host.nextTask();
		if (task === null) {
			return false;
		}
		if (task.type === 'carry') {
			field.errand = { task, stage: 'fetch' };
			start(keeper, { type: 'move', to: STOCKPILE });
		} else {
			field.errand = { task, stage: 'walk' };
			start(keeper, { type: 'move', to: task.at });
		}
		// Already there: get on with it
		if (keeper.x === (keeper.activity as { to: number }).to) {
			start(keeper, { type: 'idle' });
			arrive(field, events);
		}
		return true;
	}
	const foe = closest(keeper, foes(field));
	if (foe !== undefined) {
		if (inReach(keeper, foe)) {
			face(keeper, foe.x);
			start(keeper, { type: 'strike', target: foe.id, hits: [1] });
		} else {
			start(keeper, { type: 'move', to: foe.x, chase: foe.id });
		}
		return true;
	}
	const chest = closest(keeper, field.chests.map((c) => ({ ...c, width: CHEST_WIDTH })));
	if (chest !== undefined) {
		if (keeper.x === chest.x) {
			start(keeper, { type: 'open', chest: chest.id });
		} else {
			start(keeper, { type: 'move', to: chest.x, chest: chest.id });
		}
		return true;
	}
	return false;
}

const CHEST_WIDTH = 26;

function closest<T extends { x: number; width: number }>(from: Actor, things: T[]): T | undefined {
	let best: T | undefined;
	for (const thing of things) {
		if (best === undefined || gap(from, thing) < gap(from, best)) {
			best = thing;
		}
	}
	return best;
}

function actKeeper(field: Field, host: FieldHost, events: FieldEvent[]): void {
	const keeper = field.keeper;
	const activity = keeper.activity;
	switch (activity.type) {
		case 'strike':
			if (activity.hits.includes(keeper.frame)) {
				const blow = host.keeperBlow();
				events.push({ type: 'cue', name: blow.sharp ? 'sharpHit' : 'bluntHit' });
				const monster = living(field).find((m) => m.id === activity.target);
				if (monster !== undefined) {
					hurtMonster(monster, blow.damage, events);
				} else if (field.boss !== null && field.boss.id === activity.target) {
					hurtBoss(field, blow.damage, events);
				}
			}
			if (keeper.frame === FRAMES - 1) {
				start(keeper, { type: 'idle' });
			}
			break;
		case 'move':
			// Every few steps, check whether something closer needs dealing with
			if (field.night && keeper.frame === FRAMES - 1) {
				retarget(field);
			}
			break;
		case 'open':
			if (keeper.frame === FRAMES - 1) {
				const chest = field.chests.find((c) => c.id === activity.chest);
				if (chest !== undefined) {
					events.push({ type: 'chestOpened', chest });
				}
				field.restUntil = field.time + REST_MS;
				start(keeper, { type: 'idle' });
			}
			break;
		case 'climb':
			if (keeper.frame === 0 && activity.done) {
				start(keeper, { type: 'idle' });
			} else if (keeper.frame === FRAMES - 1) {
				activity.done = true;
			}
			break;
		case 'hammer':
			if (keeper.frame === FRAMES - 1) {
				events.push({ type: 'cue', name: 'bluntHit' });
			}
			break;
		case 'die':
			if (keeper.frame === FRAMES - 1) {
				field.keeperDead = true;
				events.push({ type: 'keeperDied' });
			}
			break;
	}
}

function retarget(field: Field): void {
	const keeper = field.keeper;
	const activity = keeper.activity;
	if (activity.type !== 'move') {
		return;
	}
	const foe = closest(keeper, foes(field));
	const chest = foe === undefined ? closest(keeper, field.chests.map((c) => ({ ...c, width: CHEST_WIDTH }))) : undefined;
	if (foe === undefined && chest === undefined) {
		start(keeper, { type: 'idle' });
	} else if (foe !== undefined && activity.chase !== foe.id) {
		start(keeper, { type: 'move', to: foe.x, chase: foe.id });
	} else if (chest !== undefined && activity.chest !== chest.id) {
		start(keeper, { type: 'move', to: chest.x, chest: chest.id });
	}
}

// The keeper got where an errand was taking them
function arrive(field: Field, events: FieldEvent[]): void {
	const errand = field.errand;
	if (errand === null) {
		return;
	}
	const task = errand.task;
	if (errand.stage === 'fetch' && task.type === 'carry') {
		errand.stage = 'deliver';
		events.push({ type: 'pickedUp', task });
		start(field.keeper, { type: 'move', to: task.to });
	} else if (errand.stage === 'deliver') {
		events.push({ type: 'delivered', task });
		field.errand = null;
	} else if (errand.stage === 'walk') {
		errand.stage = 'hammer';
		events.push({ type: 'hammering', task });
		start(field.keeper, { type: 'hammer', until: field.time + BUILD_MS });
	}
}

function finishBuilding(field: Field, events: FieldEvent[]): void {
	if (field.errand !== null) {
		events.push({ type: 'built', task: field.errand.task });
		field.errand = null;
	}
	start(field.keeper, { type: 'idle' });
}

// A monster takes its turn
function stepMonster(field: Field, monster: Actor, host: FieldHost, events: FieldEvent[]): void {
	if (monster.activity.type === 'die') {
		advance(monster);
		if (monster.frame === FRAMES - 1) {
			monster.gone = true;
		}
		return;
	}
	const def = monster.def!;
	// Spells and teleports come round on their own time, whatever the monster is doing
	const timed = def.parts.find((part) => part.type === 'cast' && monster.cooldowns.cast-- === 0) ??
		def.parts.find((part) => part.type === 'teleport' && monster.cooldowns.teleport-- === 0);
	if (timed !== undefined && (timed.type === 'cast' || timed.type === 'teleport')) {
		monster.cooldowns[timed.type] = timed.every;
		start(monster, timed.type === 'cast' ? { type: 'cast', spell: timed.spell } : { type: 'teleport' });
		actMonster(field, monster, host, events);
		return;
	}
	if (monster.activity.type === 'idle') {
		decideMonster(field, monster);
		actMonster(field, monster, host, events);
		return;
	}
	advance(monster);
	actMonster(field, monster, host, events);
}

function attackPart(def: MonsterDef): Part {
	return def.parts.find((part) => part.type === 'melee' || part.type === 'ranged')!;
}

function decideMonster(field: Field, monster: Actor): void {
	const keeper = field.keeper;
	const attack = attackPart(monster.def!);
	const ranged = attack.type === 'ranged';
	const inRange = ranged
		? monster.x > EDGE && monster.x < field.width - EDGE && Math.abs(monster.x - keeper.x) <= attack.range
		: inReach(monster, keeper);
	if (!inRange) {
		start(monster, { type: 'move', to: keeper.x, chase: keeper.id, reach: ranged ? attack.range : undefined });
	} else {
		face(monster, keeper.x);
		start(monster, ranged ? { type: 'shoot', target: keeper.id } : { type: 'strike', target: keeper.id, hits: attack.type === 'melee' ? attack.hits : [1] });
	}
}

function actMonster(field: Field, monster: Actor, host: FieldHost, events: FieldEvent[]): void {
	const activity = monster.activity;
	const def = monster.def!;
	switch (activity.type) {
		case 'strike':
			if (activity.hits.includes(monster.frame)) {
				host.hurtKeeper(monster.damage, monster.kind, def.prey);
				events.push({ type: 'cue', name: def.blade ? 'sharpHit' : 'bluntHit' });
			}
			if (monster.frame === FRAMES - 1) {
				start(monster, { type: 'idle' });
			}
			break;
		case 'shoot':
			if (monster.frame === FRAMES - 1) {
				const attack = attackPart(def);
				const fire = attack.type === 'ranged' && attack.fire === true;
				events.push({ type: 'cue', name: fire ? 'shootFire' : 'shoot' });
				const projectile: Projectile = {
					id: field.nextId++,
					from: monster.x,
					to: field.keeper.x,
					target: field.keeper.id,
					shooter: monster.id,
					damage: monster.damage,
					kind: attack.type === 'ranged' ? attack.projectile : 'arrow',
					fire,
					lands: field.time + FLIGHT_MS,
				};
				field.projectiles.push(projectile);
				events.push({ type: 'shot', projectile });
				start(monster, { type: 'idle' });
			}
			break;
		case 'cast':
			if (monster.frame === FRAMES - 1) {
				events.push({ type: 'spell', spell: activity.spell, by: monster.id });
				start(monster, { type: 'idle' });
			}
			break;
		case 'teleport':
			if (monster.frame === 0) {
				monster.hidden = true;
				events.push({ type: 'cue', name: 'teleport' });
			} else if (monster.frame === 2) {
				// Reappear on the far side from the keeper
				monster.x = field.keeper.x < field.width / 2 ? field.width - CHASE_MARGIN : CHASE_MARGIN;
			} else if (monster.frame === FRAMES - 1) {
				monster.hidden = false;
				start(monster, { type: 'idle' });
			}
			break;
	}
}

// Projectiles that have flown their course hit, if the keeper is still where they were aimed
function land(field: Field, host: FieldHost, events: FieldEvent[]): void {
	const landed = field.projectiles.filter((p) => p.lands <= field.time);
	field.projectiles = field.projectiles.filter((p) => p.lands > field.time);
	for (const projectile of landed) {
		if (Math.abs(projectile.to - field.keeper.x) <= MISS_DISTANCE) {
			const shooter = field.monsters.find((m) => m.id === projectile.shooter);
			events.push({ type: 'cue', name: projectile.fire ? 'explodeFire' : 'sharpHit' });
			host.hurtKeeper(projectile.damage, shooter?.kind ?? 'unknown');
		}
	}
}

// Whether the keeper is carrying a block, for drawing
export function carrying(field: Field): boolean {
	return field.errand !== null && field.errand.stage === 'deliver';
}

// A boss arrives: it takes a while to land before it can fight or be fought
export function callBoss(field: Field, kind: string, def: BossDef, x: number, multiplier = 1): Boss {
	field.boss = {
		id: field.nextId++,
		kind,
		def,
		x,
		hp: monsterStat(def.health, multiplier, field.casual),
		maxHp: monsterStat(def.health, multiplier, field.casual),
		damage: monsterStat(def.damage, multiplier, field.casual),
		state: 'landing',
		since: field.time,
		strike: null,
		landed: false,
		queue: [],
	};
	return field.boss;
}

// The keeper's tiles provoke one of the boss's attacks, which waits its turn
export function provoke(field: Field, strike: string): void {
	if (field.boss !== null && field.boss.state !== 'dying' && field.boss.def.strikes[strike] !== undefined) {
		field.boss.queue.push(strike);
	}
}

export function hurtBoss(field: Field, damage: number, events: FieldEvent[] = []): void {
	const boss = field.boss;
	if (boss === null || boss.state === 'dying') {
		return;
	}
	boss.hp = Math.max(0, boss.hp - Math.max(0, damage - boss.def.hardness));
	if (boss.hp === 0) {
		boss.state = 'dying';
		boss.since = field.time;
		events.push({ type: 'bossDying', boss });
	}
}

function runBoss(field: Field, host: FieldHost, events: FieldEvent[], step: boolean): void {
	const boss = field.boss;
	if (boss === null) {
		return;
	}
	const elapsed = field.time - boss.since;
	if (boss.state === 'dying') {
		if (elapsed >= boss.def.dying) {
			field.boss = null;
			events.push({ type: 'bossGone', boss });
		}
		return;
	}
	if (boss.state === 'landing') {
		if (elapsed >= boss.def.landing) {
			boss.state = 'ready';
			boss.since = field.time;
		}
		return;
	}
	if (boss.state === 'striking') {
		const strike = boss.def.strikes[boss.strike!];
		if (!boss.landed && elapsed >= strike.lands) {
			boss.landed = true;
			landStrike(field, boss, strike, host, events);
		}
		if (elapsed >= strike.ends) {
			boss.state = 'ready';
			boss.since = field.time;
			boss.strike = null;
		}
		return;
	}
	// Ready: like everyone else, the boss decides on its steps
	if (step) {
		const close = gap(field.keeper, { x: boss.x, width: boss.def.width }) < boss.def.closeGap;
		boss.strike = boss.queue.shift() ?? (close ? boss.def.close : boss.def.far);
		boss.state = 'striking';
		boss.since = field.time;
		boss.landed = false;
		events.push({ type: 'bossStrike', boss, strike: boss.strike });
	}
}

function landStrike(field: Field, boss: Boss, strike: StrikeDef, host: FieldHost, events: FieldEvent[]): void {
	const keeper = field.keeper;
	const hit = strike.within === undefined || gap(keeper, { x: boss.x, width: boss.def.width }) < strike.within;
	events.push({ type: 'strikeLands', boss, strike: boss.strike!, hit });
	if (!hit) {
		return;
	}
	const damage = strike.scaled ? boss.damage : strike.damage;
	if (damage !== undefined) {
		host.hurtKeeper(damage, boss.kind, strike.prey);
	}
	if (strike.summon !== undefined) {
		events.push({ type: 'summon', monster: strike.summon.monster, count: strike.summon.count });
	}
	for (let i = 0; i < (strike.bind ?? 0); i++) {
		events.push({ type: 'spell', spell: 'shadowBind', by: boss.id });
	}
	if (strike.freeze) {
		events.push({ type: 'freezeKeeper' });
	}
	if (strike.push !== undefined && !field.keeperFrozen) {
		push(field, keeper.x < boss.x ? -strike.push : strike.push);
	}
	if (strike.burn !== undefined) {
		const fire: Fire = {
			id: field.nextId++,
			x: keeper.x,
			width: strike.burn.width,
			damage: strike.burn.damage,
			every: strike.burn.every,
			until: field.time + strike.burn.lasts,
			next: field.time,
		};
		field.fires.push(fire);
		events.push({ type: 'fireLit', fire });
	}
	if (strike.clearsFire) {
		for (const fire of field.fires) {
			events.push({ type: 'fireOut', fire });
		}
		field.fires = [];
	}
}

// Fires burn the keeper while the keeper stands in them, and melt the dragon's ice
function burn(field: Field, host: FieldHost, events: FieldEvent[]): void {
	for (const fire of field.fires) {
		if (fire.until <= field.time) {
			events.push({ type: 'fireOut', fire });
		} else if (Math.abs(field.keeper.x - fire.x) < fire.width / 2 && fire.next <= field.time) {
			fire.next = field.time + fire.every;
			events.push({ type: 'cue', name: 'burn' });
			host.hurtKeeper(fire.damage, field.boss?.kind ?? 'fire');
			if (field.keeperFrozen) {
				events.push({ type: 'thaw' });
			}
		}
	}
	field.fires = field.fires.filter((fire) => fire.until > field.time);
}
