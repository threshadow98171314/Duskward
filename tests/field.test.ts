import { describe, expect, it } from 'vitest';
import { MONSTERS } from '../src/content/monsters.ts';
import {
	addChest, BUILD_MS, carrying, climbIn, createField, damageAll, type Field, type FieldEvent, type FieldHost,
	type MonsterDef, push, setNight, spawn, STOCKPILE, type Task, tick, TICK_MS, wipeOut,
} from '../src/core/field.ts';

const WIDTH = 480;

interface Log {
	hurts: { time: number; damage: number; by: string }[];
	blows: number[];
	events: { time: number; event: FieldEvent }[];
}

function setup(options: { night?: boolean; keeperX?: number; tasks?: Task[]; alive?: () => boolean } = {}) {
	const field = createField(WIDTH, options.keeperX);
	field.night = options.night ?? true;
	const log: Log = { hurts: [], blows: [], events: [] };
	const tasks = [...(options.tasks ?? [])];
	const host: FieldHost = {
		keeperAlive: options.alive ?? (() => true),
		keeperBlow: () => {
			log.blows.push(field.time);
			return { damage: 1, sharp: false };
		},
		hurtKeeper: (damage, by) => log.hurts.push({ time: field.time, damage, by }),
		nextTask: () => tasks.shift() ?? null,
	};
	const run = (ms: number) => {
		for (let t = 0; t < ms; t += TICK_MS) {
			for (const event of tick(field, host)) {
				log.events.push({ time: field.time, event });
			}
		}
	};
	const events = (type: FieldEvent['type']) => log.events.filter(({ event }) => event.type === type);
	return { field, host, log, run, events };
}

const def = (id: keyof typeof MONSTERS) => MONSTERS[id] as MonsterDef;

describe('monsters', () => {
	it('walk up to the keeper at their own speed', () => {
		const { field, run } = setup();
		field.keeperFrozen = true;
		const zombie = spawn(field, 'zombie', def('zombie'), 'right');
		expect(zombie.x).toBe(WIDTH + 16);
		expect(zombie.facing).toBe('left');
		run(1000);
		// It decides to walk on its first tick, then covers 25 pixels a second
		expect(zombie.x).toBe(WIDTH + 16 - 2.5 * 9);
	});

	it('strike once every four steps, the first blow landing a step in', () => {
		const { field, log, run } = setup();
		field.keeperFrozen = true;
		const zombie = spawn(field, 'zombie', def('zombie'), 'right');
		zombie.x = field.keeper.x + 26;
		run(2400);
		const times = log.hurts.map((hurt) => hurt.time);
		expect(times.length).toBe(3);
		expect(times[1] - times[0]).toBe(800);
		expect(times[2] - times[1]).toBe(800);
		expect(log.hurts[0]).toMatchObject({ damage: 1, by: 'zombie' });
	});

	it('with a flurry, strike twice every four steps', () => {
		const { field, log, run } = setup();
		field.keeperFrozen = true;
		const rat = spawn(field, 'rat', def('rat'), 'left');
		rat.x = field.keeper.x - 30;
		run(1600);
		const times = log.hurts.map((hurt) => hurt.time);
		expect(times.length).toBe(4);
		expect(times[1] - times[0]).toBe(400);
		expect(times[2] - times[0]).toBe(800);
	});

	it('shoot from afar, and miss a keeper who has moved', () => {
		const { field, log, run, events } = setup();
		field.keeperFrozen = true;
		const skeleton = spawn(field, 'skeleton', def('skeleton'), 'right');
		run(4000);
		// Stops within range, inside the world
		expect(field.keeper.x - skeleton.x).toBeGreaterThanOrEqual(-200);
		expect(skeleton.x).toBeLessThan(WIDTH - 10);
		const shots = events('shot');
		expect(shots.length).toBeGreaterThan(0);
		const firstShot = shots[0].time;
		expect(log.hurts[0].time).toBe(firstShot + 1000);
		expect(log.hurts[0].damage).toBe(3);

		// Sidestep the next arrow
		const hurts = log.hurts.length;
		const shotsBefore = events('shot').length;
		while (events('shot').length === shotsBefore) {
			run(TICK_MS);
		}
		field.keeper.x -= 6;
		run(1000);
		expect(log.hurts.length).toBe(hurts);
	});

	it('cast spells and teleport on their own schedule', () => {
		const { field, run, events } = setup();
		field.keeperFrozen = true;
		field.keeper.x = 100;
		const lich = spawn(field, 'lich', def('lich'), 'right');
		lich.x = 400;
		// The first spell starts on the seventeenth step and lands three steps later;
		// the next starts twenty-five steps after the first
		run(200 * 19);
		expect(events('spell')).toEqual([]);
		run(200);
		expect(events('spell').length).toBe(1);
		expect(events('spell')[0].event).toMatchObject({ spell: 'explosive', by: lich.id });
		run(200 * 25);
		expect(events('spell').length).toBe(2);
		// The teleport starts on the fifty-fifth step (the timer skips steps that cast) and
		// takes it to the far side of the keeper
		run(200 * 11);
		expect(lich.hidden).toBe(true);
		expect(lich.x).toBeLessThan(400);
		run(200);
		expect(lich.x).toBe(WIDTH - 30);
		run(200);
		expect(lich.hidden).toBe(false);
		expect(events('cue').some(({ event }) => event.type === 'cue' && event.name === 'teleport')).toBe(true);
	});
});

describe('the keeper at night', () => {
	it('chases the closest monster and strikes until it falls', () => {
		const { field, log, run, events } = setup();
		const near = spawn(field, 'zombie', def('zombie'), 'right');
		near.x = 300;
		const far = spawn(field, 'zombie', def('zombie'), 'left');
		far.x = 100;
		far.speed = 0;
		near.speed = 0;
		run(800);
		expect(field.keeper.facing).toBe('right');
		run(4000);
		expect(log.blows.length).toBeGreaterThanOrEqual(4);
		const gone = events('monsterGone');
		expect(gone.length).toBe(1);
		expect(gone[0].event).toMatchObject({ monster: { id: near.id, wiped: false, xp: 2 } });
		expect(field.monsters).toEqual([far]);
	});

	it('opens chests once the monsters are gone, then rests a moment', () => {
		const { field, run, events } = setup();
		const chest = addChest(field, 300);
		run(3000);
		const opened = events('chestOpened');
		expect(opened.length).toBe(1);
		expect(opened[0].event).toMatchObject({ chest: { id: chest.id } });
		expect(field.keeper.x).toBe(300);
		expect(field.restUntil).toBe(opened[0].time + 1500);
	});

	it('falls when out of health, and the field tells the game', () => {
		let alive = true;
		const { field, run, events } = setup({ alive: () => alive });
		run(400);
		alive = false;
		run(1000);
		expect(field.keeper.activity.type).toBe('die');
		expect(events('keeperDied').length).toBe(1);
	});

	it('fights whatever else is on the field too', () => {
		const { field, run } = setup();
		let health = 3;
		field.outsiders.push({ id: 99, x: () => 330, width: () => 60, alive: () => health > 0, hurt: (n) => { health -= n; } });
		run(4000);
		expect(health).toBe(0);
	});
});

describe('the keeper by day', () => {
	it('fetches a block from the stockpile and carries it to a building', () => {
		const task: Task = { type: 'carry', to: 300, block: 'stone', building: 'blacksmith' };
		const { field, run, events } = setup({ night: false, tasks: [task] });
		run(200);
		expect(field.keeper.activity).toMatchObject({ type: 'move', to: STOCKPILE });
		run(6000);
		expect(events('pickedUp').length).toBe(1);
		expect(carrying(field)).toBe(true);
		run(6000);
		expect(events('delivered')[0].event).toMatchObject({ task });
		expect(field.keeper.x).toBe(300);
		expect(carrying(field)).toBe(false);
	});

	it('hammers at a building until it stands', () => {
		const task: Task = { type: 'build', at: 260, building: 'weaver' };
		const { field, run, events } = setup({ night: false, tasks: [task] });
		run(1000);
		const started = events('hammering')[0].time;
		run(BUILD_MS + 400);
		expect(events('built')[0].time).toBe(started + BUILD_MS);
		expect(events('cue').length).toBeGreaterThan(5);
		expect(field.keeper.activity.type).toBe('idle');
	});

	it('drops everything when night falls', () => {
		const task: Task = { type: 'carry', to: 400, block: 'wood', building: 'sawmill' };
		const { field, run } = setup({ night: false, tasks: [task] });
		run(5000);
		expect(carrying(field)).toBe(true);
		expect(setNight(field, true)).toEqual([{ type: 'abandoned', task, carrying: true }]);
		expect(field.errand).toBeNull();
	});

	it('climbs into the world at the start', () => {
		const { field, run } = setup({ night: false });
		climbIn(field);
		run(600);
		expect(field.keeper.activity.type).toBe('climb');
		run(400);
		expect(field.keeper.activity.type).toBe('idle');
	});
});

describe('effects on the field', () => {
	it('haste makes the keeper four times as quick', () => {
		const { field, run } = setup({ night: false, tasks: [{ type: 'build', at: 440, building: 'altar' }] });
		field.haste = true;
		run(1000);
		// Decides on the first tick, then covers 20 pixels a tick
		expect(field.keeper.x).toBe(240 + 20 * 9);
	});

	it('stopped time holds the monsters where they are', () => {
		const { field, log, run } = setup();
		field.keeperFrozen = true;
		field.timeStopped = true;
		const zombie = spawn(field, 'zombie', def('zombie'), 'right');
		zombie.x = field.keeper.x + 26;
		run(2000);
		expect(log.hurts).toEqual([]);
		expect(zombie.x).toBe(field.keeper.x + 26);
	});

	it('bombs and level-ups kill without a fight', () => {
		const { field, run, events } = setup();
		field.keeperFrozen = true;
		const weak = spawn(field, 'rat', def('rat'), 'left');
		const strong = spawn(field, 'demon', def('demon'), 'right');
		damageAll(field, 20);
		expect(weak.wiped).toBe(true);
		expect(strong.hp).toBe(25);
		wipeOut(field);
		run(800);
		expect(events('monsterGone').map(({ event }) => event.type === 'monsterGone' && event.monster.wiped)).toEqual([true, true]);
		expect(field.monsters).toEqual([]);
	});

	it('a wing buffet throws the keeper back', () => {
		const { field, run } = setup();
		push(field, -150);
		run(200);
		expect(field.keeper.x).toBe(90);
		push(field, -150);
		run(200);
		expect(field.keeper.x).toBe(10);
	});

	it('monsters and chests do not last into the day', () => {
		const { field } = setup();
		spawn(field, 'zombie', def('zombie'), 'right');
		addChest(field, 100);
		setNight(field, false);
		expect(field.monsters).toEqual([]);
		expect(field.chests).toEqual([]);
	});
});

it('plays out the same way every time', () => {
	const play = (): Field => {
		const { field, run } = setup();
		for (const id of ['zombie', 'rat', 'skeleton', 'lich'] as const) {
			spawn(field, id, def(id), id === 'rat' ? 'left' : 'right');
		}
		run(20000);
		return field;
	};
	expect(JSON.stringify(play())).toBe(JSON.stringify(play()));
});
